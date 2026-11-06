'use client';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowRight, Check, Copy, RotateCcw } from 'lucide-react';
import { GROUP_NAME, STATS, dayPairs, loadBlindData, today, wins } from '../lib/blind';
import { readAlerts } from '../lib/alerts';
import { espnHeadshotUrl, espnLogoUrl } from '../lib/teams';
import { playerUrl } from '../lib/routes';
import GameHead from './GamesNav';
import { SignInBar, goSignIn } from './PlayGame';
import { useSignedIn } from '../lib/signin';

/* Blind test (/play/blind): two season lines, names hidden, pick who is better, then the reveal. No right or wrong: some
   pairs are what they look like, some are built to surprise (src/lib/blind.js). Ten pairs a round, the same pairs for
   everyone on a given day, and after each pick the share of fans who picked the same. */

const ROUND = 10;
const lastLine = player => (player.lastPpg != null ? `${player.lastPpg.toFixed(1)} PPG last season` : player.rookie ? 'Rookie' : 'Barely played last season');

function verdict(pair, pickedId) {
  const known = pair.sides.find(side => side.id === pair.known), other = pair.sides.find(side => side.id !== pair.known);
  const pickedKnown = pickedId === known.id;
  if (pair.surprise) return pickedKnown
    ? {tone: 'twist', head: `That was ${known.name}.`, line: `The surprise: ${other.name} beat him on ${wins(other, known)} of 6 stats this season.`}
    : {tone: 'surprise', head: `Surprise! You picked ${other.name} over ${known.name}.`, line: `${other.name}'s numbers really are that good this season.`};
  return pickedKnown
    ? {tone: 'plain', head: `No surprise. That was ${known.name}.`, line: `The bigger name, and the better numbers.`}
    : {tone: 'bold', head: `Bold. You picked ${other.name} over ${known.name}.`, line: `${known.name} was ahead on ${wins(known, other)} of 6 stats.`};
}

/* One side: a silhouette until the pick, then the face, name and team. */
function Side({player, label, shown, picked}) {
  return <div className={`bt-side${picked ? ' picked' : ''}${shown ? ' shown' : ''}`}>
    <span className="bt-face">
      {shown ? <img src={espnHeadshotUrl(player.id)} alt=""/> : <svg viewBox="0 0 100 120" aria-hidden="true"><circle cx="50" cy="34" r="20"/><path d="M14 120c0-33 14-50 36-50s36 17 36 50z"/></svg>}
      {!shown && <b>{label}</b>}
    </span>
    {shown ? <a className="bt-name" href={playerUrl(player.name)}><b>{player.name}</b><small><img src={espnLogoUrl(player.team)} alt=""/>{player.team} · {lastLine(player)}</small></a>
      : <span className="bt-name"><b>Player {label}</b><small>{player.gp} games · {player.mpg.toFixed(1)} min</small></span>}
  </div>;
}

export default function BlindTest() {
  const [pairs, setPairs] = useState(null), [start, setStart] = useState(0), [step, setStep] = useState(0);
  const [picks, setPicks] = useState([]), [split, setSplit] = useState(null), [copied, setCopied] = useState(false);
  const auth = useSignedIn(), pending = useRef(null);
  useEffect(() => {
    loadBlindData().then(data => setPairs(dayPairs(data, today())));
  }, []);

  const round = useMemo(() => {
    if (!pairs?.length) return [];
    return Array.from({length: Math.min(ROUND, pairs.length)}, (_, index) => pairs[(start + index) % pairs.length]);
  }, [pairs, start]);
  const pair = round[step], done = round.length > 0 && step >= round.length, picked = picks[step];

  const choose = useCallback(index => {
    if (auth === 'out') { pending.current = index; goSignIn('/play/blind', {title: 'Which one would you take?', line: 'One tap with Google. Then see who they were and how other fans voted.'}); return; }
    if (!pair || picked) return;
    const choice = pair.sides[index];
    setPicks(now => [...now, {pair, id: choice.id}]);
    setSplit(null);
    fetch('/api/blind', {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({token: readAlerts().email || '', pair: pair.key, pick: choice.id})})
      .then(response => (response.ok ? response.json() : 'none')).then(setSplit).catch(() => setSplit('none'));
  }, [auth, pair, picked]);
  useEffect(() => {
    if (auth !== 'in' || pending.current === null) return;
    const index = pending.current;
    pending.current = null;
    choose(index);
  }, [auth, choose]);
  const next = useCallback(() => { setStep(now => now + 1); setSplit(null); window.scrollTo({top: 0, behavior: 'smooth'}); }, []);
  const again = () => { setStart(now => now + ROUND); setStep(0); setPicks([]); setSplit(null); setCopied(false); };

  /* A and B (or 1 and 2) pick, Enter moves on. */
  useEffect(() => {
    const onKey = event => {
      if (auth !== 'in' || event.target.closest?.('input,textarea')) return;
      if (!picked && pair && /^[ab12]$/i.test(event.key)) choose(/^[a1]$/i.test(event.key) ? 0 : 1);
      else if (picked && event.key === 'Enter') next();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [auth, pair, picked, choose, next]);

  const surprises = picks.filter(entry => entry.pair.surprise), backed = surprises.filter(entry => entry.id !== entry.pair.known).length;
  const copy = () => navigator.clipboard?.writeText(`StatsPads Blind test: I backed the lesser-known player in ${backed} of ${surprises.length} surprise pairs\n${picks.map(entry => (entry.pair.surprise ? (entry.id !== entry.pair.known ? '🟨' : '⬛') : '⬜')).join('')}\nstatspads.com/play/blind`)
    .then(() => { setCopied(true); setTimeout(() => setCopied(false), 1600); }).catch(() => {});

  const result = picked ? verdict(pair, picked.id) : null;
  return <main className="qz bt">
    <GameHead title="Blind test"/>

    {!pairs ? <div className="qz-card qz-skeleton" aria-busy="true"/> : !round.length ? <p className="qz-note">Not enough games played yet to build fair pairs. Check back in a few days.</p> : done ? <section className="qz-card qz-done bt-done">
      <b className="qz-score">{backed}<small>/{surprises.length}</small></b>
      <p>{surprises.length ? `You backed the lesser-known player in ${backed} of the ${surprises.length} surprise pairs.` : 'No surprise pairs this round.'} {backed >= 3 ? 'You read numbers, not names.' : backed ? 'Names pull hard.' : 'You trusted the big names every time.'}</p>
      <ol className="bt-recap">{picks.map((entry, index) => {
        const mine = entry.pair.sides.find(side => side.id === entry.id), other = entry.pair.sides.find(side => side.id !== entry.id);
        return <li key={index} className={entry.pair.surprise ? 'is-surprise' : ''}><b>{mine.name}</b><span>over {other.name}</span>{entry.pair.surprise && <em>Surprise pair</em>}</li>;
      })}</ol>
      <div className="qz-actions">
        <button type="button" className="qz-primary" onClick={again}><RotateCcw size={17}/> Ten more pairs</button>
        <button type="button" className="qz-ghost" onClick={copy}>{copied ? <Check size={17}/> : <Copy size={17}/>} {copied ? 'Copied' : 'Copy result'}</button>
      </div>
    </section> : <>
      <div className="qz-progress"><span>Pair <b>{step + 1}</b> of {round.length}</span><span className="qz-dots" aria-hidden="true">{round.map((_, index) => <i key={index} className={index < picks.length ? 'right' : index === step ? 'now' : ''}/>)}</span></div>
      <section className="qz-card bt-card" key={`${start}-${step}`}>
        <h2>Who is the better player?</h2>
        <p className="qz-detail">{GROUP_NAME[pair.group]}, 2026-27 per game. Names come after you pick.</p>
        <div className="bt-sides">{pair.sides.map((player, index) => <Side key={player.id} player={player} label={'AB'[index]} shown={Boolean(picked)} picked={picked?.id === player.id}/>)}</div>
        <table className="bt-table">
          <tbody>{STATS.map(([label, get]) => {
            const [a, b] = pair.sides.map(side => get(side.stats));
            return <tr key={label}><td className={a > b ? 'win' : ''}>{a.toFixed(1)}</td><th>{label}</th><td className={b > a ? 'win' : ''}>{b.toFixed(1)}</td></tr>;
          })}</tbody>
        </table>
        {!picked && <div className="bt-picks">{['A', 'B'].map((label, index) => <button key={label} type="button" className="qz-primary" data-track={`Blind test: pick ${label}`} onClick={() => choose(index)}>Player {label} is better</button>)}</div>}
        {auth === 'out' && <SignInBar back="/play/blind" title="Which one would you take?" line="Sign in to pick. You will see who they were and how other fans voted."/>}
        {result && <div className={`qz-answer bt-answer ${result.tone}`}>
          <p><b>{result.head}</b> {result.line}</p>
          {split !== 'none' && <p className="bt-split">{!split ? 'Counting votes…' : split.total < 3 ? 'You are one of the first to vote on this pair today.' : <><b>{Math.round((split.same / split.total) * 100)}%</b> of {split.total} fans picked the same.</>}</p>}
          <button type="button" className="qz-primary" onClick={next}>{step + 1 === round.length ? 'See how you did' : 'Next pair'} <ArrowRight size={17}/></button>
        </div>}
      </section>
    </>}
  </main>;
}
