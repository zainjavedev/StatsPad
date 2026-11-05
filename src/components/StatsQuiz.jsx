'use client';
import React, { useCallback, useEffect, useState } from 'react';
import { ArrowRight, Check, Copy, RotateCcw, X } from 'lucide-react';
import { loadQuizData, makeRound, questionKey } from '../lib/quiz';
import { readAlerts } from '../lib/alerts';
import { espnLogoUrl } from '../lib/teams';
import GameHead from './GamesNav';
import ShareSheet from './ShareSheet';
import { SignInBar, goSignIn } from './PlayGame';

/* Stats Quiz (/play/quiz): ten questions about this season, answer explained after each one, best score kept on this device.
   Signed-out visitors see the question with the answers locked behind sign-in. A question once shown is never asked again
   on this device until every question has been seen. */

const BEST = 'statspad-quiz-best', SEEN = 'statspad-quiz-seen';
const face = id => `https://a.espncdn.com/combiner/i?img=/i/headshots/nba/players/full/${id}.png&w=520&h=380`;
const readBest = () => { try { return Number(localStorage.getItem(BEST)) || 0; } catch { return 0; } };
const readSeen = () => { try { return new Set(JSON.parse(localStorage.getItem(SEEN)) || []); } catch { return new Set(); } };
const writeSeen = seen => { try { localStorage.setItem(SEEN, JSON.stringify([...seen].slice(-1500))); } catch { /* private mode */ } };

/* A fresh round that skips seen questions; once they run short, the slate is wiped and it starts over. */
function freshRound(data) {
  let seen = readSeen(), round = makeRound(data, seen);
  if (round.length < 10 && seen.size) { seen = new Set(); writeSeen(seen); round = makeRound(data, seen); }
  return round;
}

/* A player answer is a tall card (headshot on his team's colour, name under it); a team answer shows its logo; a number is just the number. */
function Option({option, index, state, onPick, still}) {
  const mark = state === 'right' ? <Check size={18} className="qz-mark"/> : state === 'wrong' ? <X size={18} className="qz-mark"/> : null;
  const kind = option.face ? ' is-player' : option.logo ? ' is-team' : option.number ? ' is-number' : '';
  return <button type="button" className={`qz-option ${state}${kind}`} onClick={() => onPick(index)} disabled={state !== 'idle'} style={{'--i': index, '--team': option.color || '#3b3b45'}}>
    <kbd>{index + 1}</kbd>
    {option.face && <span className="qz-photo"><img src={face(option.face)} alt="" loading={still ? 'eager' : 'lazy'} crossOrigin={still ? 'anonymous' : undefined}/></span>}
    {option.logo && <span className="qz-logo"><img src={espnLogoUrl(option.logo)} alt="" loading={still ? 'eager' : 'lazy'} crossOrigin={still ? 'anonymous' : undefined}/></span>}
    <span className="qz-label"><b>{option.label}</b>{option.sub && <small>{option.sub}</small>}</span>
    {mark}
  </button>;
}

/* Share pictures are the quiz as it looks on the site (same card, same answer tiles), framed like a screenshot, buttons left out. */
function Frame({note, children}, ref) {
  return <div className="qx" ref={ref}>
    <div className="qx-top"><b>Stats quiz</b><span>{note}</span></div>
    {children}
    <p className="qx-foot"><b>statspads.com/play/quiz</b><span>NBA 2026-27</span></p>
  </div>;
}
const ShotFrame = React.forwardRef(Frame);

/* The question with its choices, no answer. */
const QuizPoster = React.forwardRef(function QuizPoster({question, step, total}, ref) {
  return <ShotFrame ref={ref} note={`Question ${step + 1} of ${total} · answer in the replies`}>
    <section className="qz-card">
      <h2>{question.prompt}</h2>
      {question.detail && <p className="qz-detail">{question.detail}</p>}
      <div className={`qz-options${question.options.length === 2 ? ' is-pair' : ''}${question.options[0]?.face ? ' is-players' : ''}`}>
        {question.options.map((option, index) => <Option key={option.key} option={option} index={index} state="idle" onPick={() => {}} still/>)}
      </div>
    </section>
  </ShotFrame>;
});

const verdict = (score, total) => (score === total ? 'Perfect. You know this season cold.' : score >= 7 ? 'Strong. You have been watching.' : score >= 4 ? 'Not bad. The answers are all on the site.' : 'Rough one. Time to catch up on the season.');

/* The final score screen. */
const ScorePoster = React.forwardRef(function ScorePoster({round, results}, ref) {
  const score = results.filter(Boolean).length;
  return <ShotFrame ref={ref} note="Can you beat it?">
    <section className="qz-card qz-done">
      <b className="qz-score">{score}<small>/{round.length}</small></b>
      <p>{verdict(score, round.length)}</p>
      <div className="qz-strip">{results.map((right, index) => <i key={index} className={right ? 'right' : 'wrong'}/>)}</div>
    </section>
  </ShotFrame>;
});

export default function StatsQuiz() {
  const [data, setData] = useState(null), [round, setRound] = useState(null), [step, setStep] = useState(0), [picked, setPicked] = useState(null);
  const [results, setResults] = useState([]), [best, setBest] = useState(0), [copied, setCopied] = useState(false), [sharing, setSharing] = useState(false), [auth, setAuth] = useState('checking');
  useEffect(() => {
    setBest(readBest()); setAuth(readAlerts().email ? 'in' : 'out');
    loadQuizData().then(found => { setData(found); setRound(freshRound(found)); });
  }, []);

  const question = round?.[step], done = round && step >= round.length, score = results.filter(Boolean).length;
  /* Shown once means seen, for signed-in players. */
  useEffect(() => {
    if (!question || auth !== 'in') return;
    const seen = readSeen(); seen.add(questionKey(question)); writeSeen(seen);
  }, [question, auth]);

  const choose = useCallback(index => {
    if (auth === 'out') { goSignIn('/play/quiz'); return; }
    if (!question || picked !== null) return;
    setPicked(index); setResults(now => [...now, index === question.answer]);
  }, [question, picked, auth]);
  const next = useCallback(() => { setPicked(null); setStep(now => now + 1); window.scrollTo({top: 0, behavior: 'smooth'}); }, []);
  const again = () => { setRound(freshRound(data)); setStep(0); setPicked(null); setResults([]); setCopied(false); };

  /* Keys 1-4 answer, Enter moves on. */
  useEffect(() => {
    const onKey = event => {
      if (sharing || auth !== 'in' || event.target.closest?.('input,textarea')) return;
      if (picked === null && /^[1-4]$/.test(event.key) && question?.options[Number(event.key) - 1]) choose(Number(event.key) - 1);
      else if (picked !== null && event.key === 'Enter') next();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [picked, question, choose, next, sharing, auth]);

  useEffect(() => {
    if (!done || score <= best) return;
    setBest(score);
    try { localStorage.setItem(BEST, String(score)); } catch { /* private mode */ }
  }, [done, score, best]);

  const copy = () => navigator.clipboard?.writeText(`StatsPads Stats Quiz: ${score}/${round.length}\n${results.map(right => (right ? '🟩' : '🟥')).join('')}\nstatspads.com/play/quiz`)
    .then(() => { setCopied(true); setTimeout(() => setCopied(false), 1600); }).catch(() => {});

  return <main className="qz">
    <GameHead title="Stats quiz"
      extra={best > 0 && <span className="qz-best">Best <b>{best}/10</b></span>} onShare={done || (question && picked === null) ? () => setSharing(true) : null}/>

    {!round ? <div className="qz-card qz-skeleton" aria-busy="true"/> : !round.length ? <p className="qz-note">The season is too young for a quiz yet. Check back after a few more games.</p> : done ? <section className="qz-card qz-done">
      <b className="qz-score">{score}<small>/{round.length}</small></b>
      <p>{verdict(score, round.length)}</p>
      <div className="qz-strip" aria-label={`${score} right, ${round.length - score} wrong`}>{results.map((right, index) => <i key={index} className={right ? 'right' : 'wrong'}/>)}</div>
      <div className="qz-actions">
        <button type="button" className="qz-primary" onClick={again}><RotateCcw size={17}/> Play again</button>
        <button type="button" className="qz-ghost" onClick={copy}>{copied ? <Check size={17}/> : <Copy size={17}/>} {copied ? 'Copied' : 'Copy result'}</button>
      </div>
    </section> : <>
      <div className="qz-progress"><span>Question <b>{step + 1}</b> of {round.length}</span><span className="qz-dots" aria-hidden="true">{round.map((_, index) => <i key={index} className={index < results.length ? (results[index] ? 'right' : 'wrong') : index === step ? 'now' : ''}/>)}</span></div>
      <section className="qz-card" key={step}>
        <h2>{question.prompt}</h2>
        {question.detail && <p className="qz-detail">{question.detail}</p>}
        <div className={`qz-options${question.options.length === 2 ? ' is-pair' : ''}${question.options[0]?.face ? ' is-players' : ''}`}>
          {question.options.map((option, index) => <Option key={option.key} option={option} index={index} onPick={choose}
            state={picked === null ? 'idle' : index === question.answer ? 'right' : index === picked ? 'wrong' : 'out'}/>)}
        </div>
        {auth === 'out' && <SignInBar back="/play/quiz" title="Know the answer?" line="Sign in to play. Questions you have had are never repeated."/>}
        {picked !== null && <div className={`qz-answer ${picked === question.answer ? 'right' : 'wrong'}`}>
          <p><b>{picked === question.answer ? 'Right.' : 'Not quite.'}</b> {question.explain} {question.path && <a href={question.path}>See more</a>}</p>
          <button type="button" className="qz-primary" onClick={next}>{step + 1 === round.length ? 'See score' : 'Next question'} <ArrowRight size={17}/></button>
        </div>}
      </section>
    </>}
    {sharing && done && <ShareSheet width={1600} ready onClose={() => setSharing(false)} filename="stats-quiz-score" title="Stats quiz" text={`I got ${score}/${round.length} on the StatsPads NBA Stats Quiz. Can you beat it?`} url={`${location.origin}/play/quiz`}>
      {ref => <ScorePoster ref={ref} round={round} results={results}/>}
    </ShareSheet>}
    {sharing && question && <ShareSheet width={1600} ready onClose={() => setSharing(false)} filename="stats-quiz" title="Stats quiz" text={`${question.prompt} ${question.options.map((option, index) => `${'ABCD'[index]}) ${option.label}`).join(' ')}`} url={`${location.origin}/play/quiz`}>
      {ref => <QuizPoster ref={ref} question={question} step={step} total={round.length}/>}
    </ShareSheet>}
  </main>;
}
