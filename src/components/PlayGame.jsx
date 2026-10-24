'use client';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowRight, Check, LogIn, RotateCcw, SkipForward, X } from 'lucide-react';
import { Court } from './ShotChart';
import { trio } from '../lib/trio';
import { fps, rating } from '../lib/playerGame';
import { readAlerts } from '../lib/alerts';
import { loadPool, nextRound } from '../lib/playRound';
import { TEAMS, espnLogoUrl, nickname } from '../lib/teams';
import { photoUrl } from '../lib/photos';

/* Guess the Player: a silhouette, one real stat line and shot chart from this season, three similar starters.
   Signed-in accounts keep a running score on the server. */

const SEEN = 'statspad-play-seen';
const day = new Intl.DateTimeFormat(undefined, {month: 'short', day: 'numeric'});
const readSeen = () => { try { return new Set(JSON.parse(localStorage.getItem(SEEN)) || []); } catch { return new Set(); } };
const writeSeen = seen => { try { localStorage.setItem(SEEN, JSON.stringify([...seen].slice(-400))); } catch { /* private mode */ } };
const hoopY = 36.75;
const api = (method, body, token) => fetch(method === 'GET' ? `/api/play?token=${encodeURIComponent(token)}` : '/api/play', method === 'GET' ? undefined : {method, headers: {'Content-Type': 'application/json'}, body: JSON.stringify(body)}).then(response => response.ok ? response.json() : Promise.reject(new Error(response.status)));

function Shots({shots}) {
  const hit = shots.filter(shot => shot.made).length;
  return <div className="pl-chart">
    <svg viewBox="-2 -2 54 46" overflow="visible" role="img" aria-label={`${hit} of ${shots.length} shots made`}>
      <rect width="50" height="42" rx="1.2" fill="#ffffff" fillOpacity=".04"/>
      <Court/>
      {shots.map((shot, index) => {
        const cx = Math.min(49.2, Math.max(.8, shot.x)), cy = Math.min(41.2, Math.max(.8, hoopY - shot.y)), style = {'--d': `${300 + index * 55}ms`};
        return shot.made
          ? <circle key={index} className="pl-shot" cx={cx} cy={cy} r=".85" fill="#34d399" fillOpacity=".25" stroke="#34d399" strokeWidth=".35" style={style}/>
          : <path key={index} className="pl-shot" d={`M${cx - .6} ${cy - .6}l1.2 1.2M${cx + .6} ${cy - .6}l-1.2 1.2`} stroke="#f87171" strokeWidth=".35" strokeLinecap="round" style={style}/>;
      })}
    </svg>
    <p className="pl-legend"><b>{hit}/{shots.length}</b> from the field<span><i className="m"/>made</span><span><i className="x"/>missed</span></p>
  </div>;
}

const num = value => Number(String(value ?? '').replace('+', '')) || 0;
const initialed = name => name.replace(/^(\S)\S*\s+/, '$1. ');

/* The stat line in the performance-card mould: name and fps, the three best numbers big, the grade, the rest in small type. */
function PerfLine({line, date, name, right}) {
  const best = trio(line), shown = new Set(best.map(([, label]) => label));
  const row = {PTS: num(line.PTS), REB: num(line.REB), AST: num(line.AST), STL: num(line.STL), BLK: num(line.BLK), TO: num(line.TO)};
  const rest = [['PTS', line.PTS], ['REB', line.REB], ['AST', line.AST], ['STL', line.STL], ['BLK', line.BLK], ['TO', line.TO]].filter(([label]) => !shown.has(label.toLowerCase()));
  return <div className="pl-perf">
    <div className="pl-perf-head">
      <div>
        <p className="rp-top">{name && <i className={`pl-verdict ${right ? 'ok' : 'miss'}`}>{right ? 'Correct' : 'It was'}</i>}<b>{name ? initialed(name) : 'Mystery player'}</b><small> · {fps(row)} fps{date ? <span className="pl-date"> · {day.format(new Date(date))}</span> : ''}</small></p>
        <p className="rp-trio">{best.map(([value, label], index) => <span key={label} style={{'--i': index}}><b>{value}</b>{label}</span>)}</p>
      </div>
      <span className="rp-grade">{rating(line).toFixed(1)}</span>
    </div>
    <p className="pl-splits">{[...rest, ['FG', line.FG], ['3PT', line['3PT']], ['FT', line.FT], ['MIN', line.MIN]].map(([label, value]) => <span key={label}><b>{value ?? '0'}</b> {label}</span>)}</p>
  </div>;
}

function Sparks() {
  return <span className="pl-sparks" aria-hidden="true">{Array.from({length: 16}, (_, index) => {
    const angle = index / 16 * Math.PI * 2 + (index % 2) * .2, far = 70 + (index % 4) * 22;
    return <i key={index} style={{'--x': `${Math.cos(angle) * far}px`, '--y': `${Math.sin(angle) * far}px`, '--h': `${(index * 47) % 360}`}}/>;
  })}</span>;
}

const goSignIn = () => { try { sessionStorage.setItem('statspad-return', '/play'); } catch { /* private mode */ } window.location.href = '/signin'; };

/* Signed-out visitors see a real round, clues and all, with the choices locked behind this bar. */
function SignInBar() {
  return <div className="pl-bar">
    <div><b>Think you know who it is?</b><span>Sign in to lock in your guess. Your score and streak are saved to your account.</span></div>
    <button type="button" className="pl-primary" onClick={goSignIn}><LogIn size={18}/> Sign in to play</button>
  </div>;
}

function SignInPrompt() {
  const go = goSignIn;
  return <section className="pl-gate">
    <div className="pl-gate-sil" aria-hidden="true"><svg viewBox="0 0 100 120"><circle cx="50" cy="32" r="20"/><path d="M12 120c0-34 14-52 38-52s38 18 38 52z"/></svg><b>?</b></div>
    <h2>Sign in to play</h2>
    <p>Your score is saved to your account, so you can pick it back up on any device. It takes a few seconds, and your followed teams come with you.</p>
    <button type="button" className="pl-primary" onClick={go}><LogIn size={18}/> Sign in or create an account</button>
  </section>;
}

const ROUND = 10;
const tier = right => right >= 9 ? ['Hall of Fame eye', 'You know this league cold.'] : right >= 7 ? ['All-Star scout', 'Sharp. Very few got past you.'] : right >= 5 ? ['Starter-level', 'Solid, but a few slipped by.'] : ['Bench scout', 'Rough night. Run it back.'];

function Results({results, stats, onAgain}) {
  const right = results.filter(item => item.right).length, [title, line] = tier(right);
  return <section className="pl-results">
    <p className="pl-results-kicker">Round complete</p>
    <div className="pl-results-score"><b>{right}</b><span>/{ROUND}</span></div>
    <h2>{title}</h2>
    <p>{line}</p>
    <ol className="pl-results-list">{results.map((item, index) => <li key={index} className={item.right ? 'ok' : 'miss'} style={{'--i': index}}><i>{item.right ? <Check size={14}/> : <X size={14}/>}</i><span>{item.name}</span></li>)}</ol>
    <p className="pl-results-career">Career: <b>{stats.correct}/{stats.total}</b> right{stats.best ? ` · best streak ${stats.best}` : ''}</p>
    <button type="button" className="pl-primary" onClick={onAgain}><RotateCcw size={18}/> Play another 10</button>
  </section>;
}

export default function PlayGame() {
  const [auth, setAuth] = useState('checking');
  const [token, setToken] = useState('');
  const [stats, setStats] = useState({correct: 0, total: 0, streak: 0, best: 0});
  const [round, setRound] = useState(null);
  const [picked, setPicked] = useState(null);
  const [status, setStatus] = useState('loading');
  const [results, setResults] = useState([]);
  const [finished, setFinished] = useState(false);
  const [skipped, setSkipped] = useState(false);
  const seen = useRef(null), upcoming = useRef(null), card = useRef(null), started = useRef(false);

  const fetchRound = useCallback(async () => {
    const pool = await loadPool();
    let found = await nextRound(pool, seen.current);
    if (!found) { seen.current = new Set(); found = await nextRound(pool, seen.current); }
    if (found) { seen.current.add(found.key); writeSeen(seen.current); }
    return found;
  }, []);
  const prefetch = useCallback(() => { upcoming.current = fetchRound().catch(() => null); }, [fetchRound]);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    const email = readAlerts().email;
    if (!email) {
      setAuth('out'); seen.current = new Set();
      fetchRound().then(found => { if (found) { setRound(found); setStatus('ready'); } else setStatus('empty'); }).catch(() => setStatus('error'));
      return;
    }
    setToken(email); setAuth('in'); seen.current = readSeen();
    api('GET', null, email).then(setStats).catch(() => {});
    fetchRound().then(found => { if (found) { setRound(found); setStatus('ready'); prefetch(); } else setStatus('empty'); }).catch(() => setStatus('error'));
  }, [fetchRound, prefetch]);

  const choose = useCallback(index => {
    if (!round || picked !== null) return;
    if (auth === 'out') { goSignIn(); return; }
    const right = round.choices[index].correct;
    setPicked(index);
    setResults(now => [...now, {name: round.answer.name, right}]);
    setStats(now => ({correct: now.correct + (right ? 1 : 0), total: now.total + 1, streak: right ? now.streak + 1 : 0, best: Math.max(now.best, right ? now.streak + 1 : 0)}));
    api('POST', {token, correct: right}).then(setStats).catch(() => {});
  }, [round, picked, token, auth]);

  const showNext = useCallback(async () => {
    setStatus('loading'); setPicked(null);
    const found = (await upcoming.current) ?? await fetchRound().catch(() => null);
    if (found) { setRound(found); setStatus('ready'); prefetch(); window.scrollTo({top: 0, behavior: 'smooth'}); } else setStatus('error');
  }, [fetchRound, prefetch]);
  const next = useCallback(() => { if (results.length >= ROUND) { setFinished(true); window.scrollTo({top: 0, behavior: 'smooth'}); } else showNext(); }, [results.length, showNext]);
  const again = useCallback(() => { setResults([]); setFinished(false); setSkipped(false); showNext(); }, [showNext]);
  /* One skip per round of ten: the player is swapped for a new one and nothing is scored. */
  const skip = useCallback(() => { if (picked !== null || skipped || status === 'loading') return; setSkipped(true); showNext(); }, [picked, skipped, status, showNext]);

  useEffect(() => {
    const onKey = event => {
      if (auth !== 'in' || finished || event.metaKey || event.ctrlKey || event.altKey) return;
      if (picked === null && ['1', '2', '3'].includes(event.key)) choose(Number(event.key) - 1);
      else if (picked === null && event.key.toLowerCase() === 's') skip();
      else if (picked !== null && (event.key === 'Enter' || event.key === 'ArrowRight')) next();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [auth, finished, picked, choose, next, skip]);

  const revealed = picked !== null;
  const right = revealed && round.choices[picked].correct;
  const number = Math.min(ROUND, results.length + (revealed ? 0 : 1));

  return <main className="pl">
    <div className="pl-top">
      <div><h1>Guess the player</h1><p>A shot chart and a stat line from this season. Which starter is it?</p></div>
    </div>

    {auth === 'in' && !finished && round && <div className="pl-progress" aria-label={`Round ${number} of ${ROUND}`}>
      <b>Round {number}<span> of {ROUND}</span></b>
      <ol>{Array.from({length: ROUND}, (_, index) => <li key={index} className={index < results.length ? (results[index].right ? 'ok' : 'miss') : index === results.length && !revealed ? 'now' : ''}/>)}</ol>
    </div>}

    {auth === 'out' && status !== 'ready' && status !== 'loading' && <SignInPrompt/>}
    {auth === 'checking' && <div className="pl-note">Loading…</div>}
    {auth === 'in' && status === 'empty' && <div className="pl-note">No finished games with shot charts yet. Check back after tonight&apos;s games.</div>}
    {auth === 'in' && status === 'error' && <div className="pl-note">Couldn&apos;t load a round. <button type="button" onClick={showNext}>Try again</button></div>}
    {auth !== 'checking' && status === 'loading' && !round && <div className="pl-card pl-skeleton" aria-busy="true"/>}

    {auth === 'in' && finished && <Results results={results} stats={stats} onAgain={again}/>}

    {auth !== 'checking' && round && !finished && <>
      <section ref={card} className={`pl-card ${revealed ? 'is-revealed' : ''} ${revealed ? (right ? 'is-right' : 'is-wrong') : ''} ${status === 'loading' ? 'is-loading' : ''}`} key={round.key} style={{'--team': revealed ? round.color : '#5b6cff'}}>
        <div className="pl-stage">
          <div className="pl-disc">
            <svg className="pl-sil" viewBox="0 0 200 200" aria-hidden="true"><circle cx="100" cy="76" r="40"/><path d="M24 200c0-54 32-84 76-84s76 30 76 84z"/><text x="100" y="95" textAnchor="middle">?</text></svg>
            <img className="pl-col" src={round.photo} alt={revealed ? round.answer.name : ''} draggable="false"/>
          </div>
          {right && <Sparks/>}
          <div className="pl-ctx">
            <span className="pl-opp" aria-label={`${round.game.home ? 'vs' : 'at'} ${nickname(round.game.opp)}`}>{round.game.home ? 'vs' : '@'} <img src={espnLogoUrl(round.game.opp)} alt="" width="28" height="28"/></span>
          </div>
          <div className="pl-slot">
            {!revealed && <p className="pl-prompt">Who is it?</p>}
            <div className="pl-reveal-name" aria-live="polite">
              <small>{right ? 'Correct' : 'It was'}</small>
              <b>{round.answer.name}</b>
              <span>{TEAMS[round.answer.code]?.name} · {round.answer.position}</span>
            </div>
          </div>
        </div>
        <div className="pl-body">
          <PerfLine line={round.line} date={round.game.date} name={revealed ? round.answer.name : null} right={right}/>
          <Shots shots={round.shots}/>
        </div>
      </section>

      <div className={`pl-choices ${auth === 'out' ? 'locked' : ''}`} role="group" aria-label="Who is it?">
        {round.choices.map((choice, index) => {
          const state = !revealed ? '' : choice.correct ? 'correct' : picked === index ? 'wrong' : 'dim';
          return <button key={choice.name} type="button" className={`pl-choice ${state}`} disabled={revealed || status === 'loading'} onClick={() => choose(index)} title={auth === 'out' ? 'Sign in to guess' : undefined} style={{'--i': index}}>
            <kbd>{index + 1}</kbd>
            <span className="pl-face">{choice.id ? <img src={photoUrl(choice.id)} alt="" loading="lazy"/> : <i/>}<img className="pl-badge" src={espnLogoUrl(choice.code)} alt="" width="20" height="20"/></span>
            <span className="pl-who"><b>{choice.name}</b></span>
          </button>;
        })}
      </div>

      {auth === 'out' ? <SignInBar/> : <div className={`pl-next ${revealed ? 'on' : 'idle'}`}>
        {revealed
          ? <button type="button" className="pl-primary" onClick={next} disabled={status === 'loading'}>{results.length >= ROUND ? 'See results' : 'Next player'} <ArrowRight size={18}/></button>
          : <button type="button" className="pl-skip" onClick={skip} disabled={skipped || status === 'loading'}><SkipForward size={16}/> {skipped ? 'Skip used' : 'Skip this player (1 per round)'}</button>}
        <p>Tip: press 1, 2 or 3 to answer, S to skip and Enter for the next one.</p>
      </div>}
    </>}
  </main>;
}
