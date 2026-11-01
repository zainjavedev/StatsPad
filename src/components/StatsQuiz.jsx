'use client';
import React, { useCallback, useEffect, useState } from 'react';
import { ArrowRight, Check, Copy, RotateCcw, X } from 'lucide-react';
import { loadQuizData, makeRound } from '../lib/quiz';
import { espnLogoUrl } from '../lib/teams';
import GamesNav from './GamesNav';

/* Stats Quiz (/play/quiz): ten questions about this season, answer explained after each one, best score kept on this device. */

const BEST = 'statspad-quiz-best';
const face = id => `https://a.espncdn.com/combiner/i?img=/i/headshots/nba/players/full/${id}.png&w=96&h=70`;
const readBest = () => { try { return Number(localStorage.getItem(BEST)) || 0; } catch { return 0; } };

function Option({option, index, state, onPick}) {
  return <button type="button" className={`qz-option ${state}${option.number ? ' is-number' : ''}`} onClick={() => onPick(index)} disabled={state !== 'idle'} style={{'--i': index}}>
    {option.face && <span className="qz-face"><img src={face(option.face)} alt="" loading="lazy"/></span>}
    {option.logo && <span className="qz-face is-logo"><img src={espnLogoUrl(option.logo)} alt="" loading="lazy"/></span>}
    <span className="qz-label"><b>{option.label}</b>{option.sub && <small>{option.sub}</small>}</span>
    {state === 'right' && <Check size={18} className="qz-mark"/>}
    {state === 'wrong' && <X size={18} className="qz-mark"/>}
  </button>;
}

export default function StatsQuiz() {
  const [data, setData] = useState(null), [round, setRound] = useState(null), [step, setStep] = useState(0), [picked, setPicked] = useState(null);
  const [results, setResults] = useState([]), [best, setBest] = useState(0), [copied, setCopied] = useState(false);
  useEffect(() => { setBest(readBest()); loadQuizData().then(found => { setData(found); setRound(makeRound(found)); }); }, []);

  const question = round?.[step], done = round && step >= round.length, score = results.filter(Boolean).length;
  const choose = useCallback(index => {
    if (!question || picked !== null) return;
    setPicked(index); setResults(now => [...now, index === question.answer]);
  }, [question, picked]);
  const next = useCallback(() => { setPicked(null); setStep(now => now + 1); window.scrollTo({top: 0, behavior: 'smooth'}); }, []);
  const again = () => { setRound(makeRound(data)); setStep(0); setPicked(null); setResults([]); setCopied(false); };

  /* Keys 1-4 answer, Enter moves on. */
  useEffect(() => {
    const onKey = event => {
      if (event.target.closest?.('input,textarea')) return;
      if (picked === null && /^[1-4]$/.test(event.key) && question?.options[Number(event.key) - 1]) choose(Number(event.key) - 1);
      else if (picked !== null && event.key === 'Enter') next();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [picked, question, choose, next]);

  useEffect(() => {
    if (!done || score <= best) return;
    setBest(score);
    try { localStorage.setItem(BEST, String(score)); } catch { /* private mode */ }
  }, [done, score, best]);

  const copy = () => navigator.clipboard?.writeText(`StatsPads Stats Quiz: ${score}/${round.length}\n${results.map(right => (right ? '🟩' : '🟥')).join('')}\nstatspads.com/play/quiz`)
    .then(() => { setCopied(true); setTimeout(() => setCopied(false), 1600); }).catch(() => {});

  return <main className="qz">
    <GamesNav active="/play/quiz"/>
    <div className="qz-top">
      <div><h1>Stats quiz</h1><p>Ten questions about this season. Who did that, who leads what, whose numbers are whose.</p></div>
      {best > 0 && <span className="qz-best">Best <b>{best}/10</b></span>}
    </div>

    {!round ? <div className="qz-card qz-skeleton" aria-busy="true"/> : !round.length ? <p className="qz-note">The season is too young for a quiz yet. Check back after a few more games.</p> : done ? <section className="qz-card qz-done">
      <span className="qz-kicker">Final score</span>
      <b className="qz-score">{score}<small>/{round.length}</small></b>
      <p>{score === round.length ? 'Perfect. You know this season cold.' : score >= 7 ? 'Strong. You have been watching.' : score >= 4 ? 'Not bad. The answers are all on the site.' : 'Rough one. Time to catch up on the season.'}</p>
      <div className="qz-strip" aria-label={`${score} right, ${round.length - score} wrong`}>{results.map((right, index) => <i key={index} className={right ? 'right' : 'wrong'}/>)}</div>
      <div className="qz-actions">
        <button type="button" className="qz-primary" onClick={again}><RotateCcw size={17}/> Play again</button>
        <button type="button" className="qz-ghost" onClick={copy}>{copied ? <Check size={17}/> : <Copy size={17}/>} {copied ? 'Copied' : 'Copy result'}</button>
      </div>
    </section> : <>
      <div className="qz-progress"><span>Question <b>{step + 1}</b> of {round.length}</span><span className="qz-dots" aria-hidden="true">{round.map((_, index) => <i key={index} className={index < results.length ? (results[index] ? 'right' : 'wrong') : index === step ? 'now' : ''}/>)}</span></div>
      <section className="qz-card" key={step}>
        <span className="qz-kicker">{question.kind}</span>
        <h2>{question.prompt}</h2>
        {question.detail && <p className="qz-detail">{question.face && <img src={face(question.face)} alt=""/>}{question.detail}</p>}
        <div className={`qz-options${question.options.length === 2 ? ' is-pair' : ''}${question.options[0]?.number ? ' is-numbers' : ''}`}>
          {question.options.map((option, index) => <Option key={option.key} option={option} index={index} onPick={choose}
            state={picked === null ? 'idle' : index === question.answer ? 'right' : index === picked ? 'wrong' : 'out'}/>)}
        </div>
        {picked !== null && <div className={`qz-answer ${picked === question.answer ? 'right' : 'wrong'}`}>
          <p><b>{picked === question.answer ? 'Right.' : 'Not quite.'}</b> {question.explain} {question.path && <a href={question.path}>See more</a>}</p>
          <button type="button" className="qz-primary" onClick={next}>{step + 1 === round.length ? 'See score' : 'Next question'} <ArrowRight size={17}/></button>
        </div>}
      </section>
    </>}
  </main>;
}
