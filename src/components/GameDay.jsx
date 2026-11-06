'use client';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Check, ChevronLeft, ChevronRight, Share2, X } from 'lucide-react';
import { TEAMS, espnLogoUrl, nickname } from '../lib/teams';
import { gameUrl, playerUrl } from '../lib/routes';
import { readAlerts, signOut } from '../lib/alerts';
import { openSignIn, useSignedIn } from '../lib/signin';
import ShareSheet from './ShareSheet';
import PicksPoster from './PicksPoster';

/* Fixtures (/fixtures; /scores and /schedule redirect here): a strip of every game day, then that day's games as flat rows
   (both teams with logo and record, the score with the winner marked, the status: final, the live clock, or tip-off and TV,
   and each side's best line once the game has started). The day's games come from the schedule file and ESPN's scoreboard
   for that date is laid over them, so results and live scores are always current. It opens on today once the first game
   has tipped off, otherwise on the latest night with results. The team picker (or ?team=BOS) lists that team's season instead.
   Before tip-off, tapping a team in the card picks it to win (changeable until tip-off): saved to the account by /api/predict,
   marked right or wrong once the game is final, with a share card of the day's picks. Signed-out visitors get the sign-in pop-up. */

const SEASON = '2026-27';
const SCOREBOARD = 'https://site.api.espn.com/apis/site/v2/sports/basketball/nba/scoreboard?dates=';
const eastern = date => new Date(date).toLocaleDateString('en-CA', {timeZone: 'America/New_York'});
const noon = day => new Date(`${day}T12:00:00Z`);
const chip = new Intl.DateTimeFormat('en-US', {weekday: 'short', timeZone: 'UTC'});
const chipDay = new Intl.DateTimeFormat('en-US', {month: 'short', day: 'numeric', timeZone: 'UTC'});
const longDay = new Intl.DateTimeFormat('en-US', {weekday: 'long', month: 'long', day: 'numeric', timeZone: 'UTC'});
const clock = new Intl.DateTimeFormat(undefined, {hour: 'numeric', minute: '2-digit'});
/* The share card gives tip-off in Eastern time, the way the NBA lists games, since friends may be anywhere. */
const eastClock = new Intl.DateTimeFormat('en-US', {hour: 'numeric', minute: '2-digit', timeZone: 'America/New_York'});
const codes = Object.keys(TEAMS).sort((a, b) => TEAMS[a].name.localeCompare(TEAMS[b].name));
const codeOf = abbr => Object.keys(TEAMS).find(code => TEAMS[code].espn === String(abbr).toLowerCase());

let fileRows;
const loadFile = () => (fileRows ??= fetch(`/data/${SEASON}/schedule.json`).then(response => response.json())
  .then(rows => rows.filter(row => row[9] !== 1 && TEAMS[row[2]] && TEAMS[row[3]]).map(([id, start, away, home, venue, tv, state, awayScore, homeScore]) => ({
    id: String(id), start, day: eastern(start), venue, tv, state, away: {code: away, score: awayScore}, home: {code: home, score: homeScore},
  }))).catch(() => []));

/* ESPN's board for one day: live state, scores, records, TV and each side's points leader, by game id. */
const boards = new Map();
const loadBoard = (day, fresh) => {
  if (fresh || !boards.has(day)) boards.set(day, fetch(`${SCOREBOARD}${day.replaceAll('-', '')}`, {cache: 'no-store'}).then(response => response.json()).then(board => new Map((board.events ?? []).map(event => {
    const competition = event.competitions[0], status = (competition.status || event.status).type;
    const side = where => {
      const entry = competition.competitors.find(competitor => competitor.homeAway === where);
      /* The side's best all-round line ("rating", e.g. "26 PTS, 8 REB, 5 AST"), else its top scorer. */
      const best = entry.leaders?.find(group => group.name === 'rating')?.leaders?.[0], scorer = entry.leaders?.find(group => group.name === 'points')?.leaders?.[0];
      const pick = best ?? scorer, line = best ? best.displayValue.split(',').map(part => part.trim()).slice(0, 3) : scorer ? [`${scorer.displayValue} PTS`] : [];
      return {code: codeOf(entry.team.abbreviation), score: Number(entry.score), record: entry.records?.[0]?.summary,
        top: pick && {name: pick.athlete?.shortName || pick.athlete?.displayName, full: pick.athlete?.displayName, id: pick.athlete?.id, code: codeOf(entry.team.abbreviation), line}};
    };
    return [String(event.id), {state: status.state, detail: status.shortDetail, away: side('away'), home: side('home'),
      tv: competition.broadcasts?.flatMap(broadcast => broadcast.names ?? []).find(Boolean)}];
  }))).catch(() => new Map()));
  return boards.get(day);
};

/* Picks made while signed out, in this browser: {gameId: {code, start}}. Old ones are dropped after a month. */
const LOCAL = 'statspad-picks', NUDGE = 'statspad-picks-nudge';
const readLocalPicks = () => { try { return JSON.parse(localStorage.getItem(LOCAL)) || {}; } catch { return {}; } };
const writeLocalPicks = value => {
  const fresh = Object.fromEntries(Object.entries(value).filter(([, entry]) => Date.now() - new Date(entry.start) < 30 * 864e5));
  try { localStorage.setItem(LOCAL, JSON.stringify(fresh)); } catch { /* private mode */ }
};
/* The sign-in line under the picks can be closed; it stays away for a week. */
const nudgeSnoozed = () => { try { return Date.now() - Number(localStorage.getItem(NUDGE) || 0) < 7 * 864e5; } catch { return false; } };

const face = id => `https://a.espncdn.com/combiner/i?img=/i/headshots/nba/players/full/${id}.png&w=96&h=70`;

/* One team's line: a bar in the team's colour, logo, name, record and score; the winner gets a marker by the score.
   `pick` marks the side you picked: a tick, which turns into right or wrong once the game is final. */
function Side({side, won, lost, pick, as: Tag = 'span', ...rest}) {
  const team = TEAMS[side.code], score = side.score !== undefined && side.score !== null && !Number.isNaN(side.score);
  const mark = pick && <i className={`gb-mine ${pick}`} aria-label={pick === 'right' ? 'your pick, right' : pick === 'wrong' ? 'your pick, wrong' : 'your pick'}>{pick === 'wrong' ? <X size={11} strokeWidth={3.5}/> : <Check size={11} strokeWidth={3.5}/>}</i>;
  return <Tag className={`gb-side${won ? ' won' : ''}${lost ? ' lost' : ''}${pick ? ' picked' : ''}`} style={{'--tc': team?.color || '#666'}} {...rest}>
    <img src={espnLogoUrl(side.code)} alt="" width="28" height="28"/>
    <b>{nickname(side.code)}</b>{side.record && <small>{side.record}</small>}
    {(score || mark) && <em>{mark}{score && side.score}{won && <i className="gb-win" aria-label="won"/>}</em>}
    <span className="sr">{team?.name}</span>
  </Tag>;
}

function Game({game, showDay, mine, onPick}) {
  const started = game.state === 'in' || game.state === 'post', live = game.state === 'in';
  /* Picks stay open until tip-off (by the clock, since the file's states lag); you can change your mind until then. */
  const open = !started && new Date(game.start) > Date.now();
  const away = Number(game.away.score), home = Number(game.home.score), final = game.state === 'post' && away !== home;
  const winner = final ? (away > home ? game.away.code : game.home.code) : null;
  const pickOf = code => (mine === code ? (winner ? (winner === code ? 'right' : 'wrong') : 'on') : null);
  const tops = started && [game.away.top, game.home.top].filter(Boolean);
  /* A tag for the games worth a second look: overtime, or decided by three or fewer. */
  const overtime = /OT/.test(game.detail || ''), close = final && Math.abs(away - home) <= 3;
  const status = <>
    {live ? <b className="gb-live"><i/>{game.detail || 'Live'}</b> : game.state === 'post' ? <b>{overtime ? game.detail.replace(/^Final\/?/, 'Final · ') : 'Final'}</b> : <b>{clock.format(new Date(game.start))}</b>}
    {close && !overtime && <span className="gb-tag">Close game</span>}
    {showDay && <small>{chipDay.format(noon(game.day))}</small>}
    {!started && game.tv && <small>{game.tv}</small>}
  </>;
  /* Before tip-off each team line is a button: tap the team you think wins. The time still opens the game page. */
  if (open) return <li className={`gb-game open${mine ? ' has-pick' : ''}`}>
    <div className="gb-row">
      <span className="gb-sides" role="group" aria-label={`Who wins, ${nickname(game.away.code)} or ${nickname(game.home.code)}?`}>
        {[game.away, game.home].map(side => <Side key={side.code} as="button" type="button" side={{...side, score: undefined}} pick={pickOf(side.code)}
          aria-pressed={mine === side.code} data-track={`Fixtures: pick ${side.code}`} onClick={() => onPick(game, side.code)}/>)}
      </span>
      <a className="gb-status" href={gameUrl(game.away.code, game.home.code, game.id)} aria-label={`${nickname(game.away.code)} at ${nickname(game.home.code)}, game page`}>{status}</a>
    </div>
  </li>;
  return <li className={`gb-game${live ? ' live' : ''}`}>
    <a href={gameUrl(game.away.code, game.home.code, game.id)}>
      <span className="gb-sides">
        <Side side={started ? game.away : {...game.away, score: undefined}} won={final && away > home} lost={final && away < home} pick={pickOf(game.away.code)}/>
        <Side side={started ? game.home : {...game.home, score: undefined}} won={final && home > away} lost={final && home < away} pick={pickOf(game.home.code)}/>
      </span>
      <span className="gb-status">{status}</span>
    </a>
    {tops?.length > 0 && <div className="gb-tops">{tops.map(top => <a key={top.full} className="gb-perf" href={playerUrl(top.full)} style={{'--tc': TEAMS[top.code]?.color || '#666'}}>
      <span className="gb-perf-face">{top.id && <img src={face(top.id)} alt="" loading="lazy"/>}</span>
      <span className="gb-perf-main"><b>{top.name}</b><span>{top.line.map(part => { const [value, unit] = part.split(' '); return <span key={unit}><em>{value}</em>{unit?.toLowerCase()}</span>; })}</span></span>
    </a>)}</div>}
  </li>;
}

export default function GameDay() {
  const auth = useSignedIn();
  const [picks, setPicks] = useState({}), [record, setRecord] = useState(null), [notice, setNotice] = useState('');
  const [sharing, setSharing] = useState(false), inflight = useRef(new Set()), [version, setVersion] = useState(0), [nudgeHidden, setNudgeHidden] = useState(true);
  useEffect(() => { setNudgeHidden(nudgeSnoozed()); }, []);
  const [rows, setRows] = useState(null), [day, setDay] = useState(null), [board, setBoard] = useState(new Map()), [team, setTeam] = useState('');
  const strip = useRef(null), today = eastern(Date.now());

  useEffect(() => {
    loadFile().then(list => {
      setRows(list);
      const days = [...new Set(list.map(row => row.day))].sort();
      /* Nights that have started, judged by tip-off time, since the file's game states lag between refreshes. */
      const played = days.filter(value => value <= today && list.some(row => row.day === value && new Date(row.start) <= Date.now()));
      /* Scores opens on today once its first game has tipped off (the file's states lag, so this goes by start time). */
      const tipped = list.some(row => row.day === today && new Date(row.start) <= Date.now());
      setDay(tipped ? today : played.at(-1) ?? days.find(value => value >= today) ?? days[0]);
      const asked = new URLSearchParams(location.search).get('team')?.toUpperCase();
      if (TEAMS[asked]) setTeam(asked);
    });
  }, [today]);

  /* The chosen day's board, refreshed every 30 seconds while a game on it is live. */
  useEffect(() => {
    if (!day || team) return undefined;
    let timer, stopped = false;
    const tick = fresh => loadBoard(day, fresh).then(found => {
      if (stopped) return;
      setBoard(found);
      if ([...found.values()].some(game => game.state === 'in')) timer = setTimeout(() => tick(true), 30e3);
    });
    tick(day === today);
    return () => { stopped = true; clearTimeout(timer); };
  }, [day, team, today]);

  const days = useMemo(() => rows ? [...new Set(rows.map(row => row.day))].sort() : [], [rows]);
  /* Keep the chosen day in the middle of the strip (scrolling the strip itself, not the page). */
  useEffect(() => {
    const box = strip.current, chosen = box?.querySelector('.active');
    if (chosen) box.scrollTo({left: chosen.offsetLeft - (box.clientWidth - chosen.offsetWidth) / 2, behavior: 'instant'});
  }, [day, days.length, team]);

  const merge = row => {
    const live = board.get(row.id);
    if (!live) return {...row, away: {...row.away}, home: {...row.home}};
    return {...row, state: live.state, detail: live.detail, tv: live.tv || row.tv, away: {...row.away, ...live.away, code: row.away.code}, home: {...row.home, ...live.home, code: row.home.code}};
  };
  const games = rows && (team ? rows.filter(row => row.away.code === team || row.home.code === team) : rows.filter(row => row.day === day).map(merge))
    .sort((a, b) => a.start.localeCompare(b.start));
  const index = days.indexOf(day);

  /* Picks for the games on screen. Signed in, they come from the account (picks still being saved win over what the server
     sends back); signed out, from this browser. `version` refetches after local picks move into a new account. */
  const ids = games?.map(game => game.id).join(',') ?? '';
  useEffect(() => {
    if (!ids || auth === 'checking') return undefined;
    if (auth === 'out') {
      const local = readLocalPicks();
      setPicks(Object.fromEntries(Object.entries(local).map(([id, entry]) => [id, entry.code])));
      setRecord(null);
      return undefined;
    }
    let live = true;
    const token = readAlerts().email;
    fetch(`/api/predict?ids=${ids}&token=${encodeURIComponent(token)}`).then(response => (response.ok ? response.json() : null)).then(data => {
      if (!live || !data) return;
      setPicks(now => {
        const next = {...data.picks};
        inflight.current.forEach(id => { if (now[id]) next[id] = now[id]; });
        return next;
      });
      setRecord(data.record);
    }).catch(() => {});
    return () => { live = false; };
  }, [ids, auth, version]);

  /* Signing in moves this browser's picks into the account, for games that have not tipped off yet (the server checks too). */
  useEffect(() => {
    if (auth !== 'in') return;
    const local = readLocalPicks(), open = Object.entries(local).filter(([, entry]) => new Date(entry.start) > Date.now());
    if (!Object.keys(local).length) return;
    writeLocalPicks({});
    if (!open.length) return;
    const token = readAlerts().email;
    Promise.all(open.map(([id, entry]) => fetch('/api/predict', {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({token, game: id, pick: entry.code})}).catch(() => null)))
      .then(() => setVersion(now => now + 1));
  }, [auth]);

  const pick = useCallback((game, code) => {
    const before = picks[game.id];
    if (before === code) return;
    setPicks(now => ({...now, [game.id]: code}));
    /* Signed out: the pick lives in this browser (it still shows, grades and shares), and a quiet line offers an account. */
    if (auth !== 'in') { writeLocalPicks({...readLocalPicks(), [game.id]: {code, start: game.start}}); return; }
    inflight.current.add(game.id);
    fetch('/api/predict', {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({token: readAlerts().email, game: game.id, pick: code})})
      .then(async response => {
        const data = await response.json().catch(() => ({}));
        /* A token the server no longer knows (account deleted): this browser reads as signed out and keeps the pick itself. */
        if (response.status === 401) { writeLocalPicks({...readLocalPicks(), [game.id]: {code, start: game.start}}); signOut(); return; }
        if (!response.ok) throw new Error(data.error || 'Could not save your pick. Try again.');
      })
      .catch(error => { setPicks(now => ({...now, [game.id]: before})); setNotice(error.message); })
      .finally(() => inflight.current.delete(game.id));
  }, [auth, picks]);
  useEffect(() => {
    if (!notice) return undefined;
    const timer = setTimeout(() => setNotice(''), 3200);
    return () => clearTimeout(timer);
  }, [notice]);

  /* The share card: this day's picks (or the team's), with a tick or cross on the ones already decided. */
  const picked = games?.filter(game => picks[game.id]) ?? [];
  const dayLabel = team ? TEAMS[team]?.name : day === today ? 'tonight' : day ? longDay.format(noon(day)) : '';
  /* The share picture: one tile per pick, with the result once the game is final. */
  const shareGames = picked.map(game => {
    const away = Number(game.away.score), home = Number(game.home.score), done = game.state === 'post' && away !== home;
    const result = done ? ((away > home ? game.away.code : game.home.code) === picks[game.id] ? 'right' : 'wrong') : null;
    return {away: game.away.code, home: game.home.code, pick: picks[game.id], result, note: done ? `${away}–${home} final` : game.state === 'in' ? 'Live' : `${eastClock.format(new Date(game.start))} ET`};
  });
  const decided = shareGames.filter(game => game.result), shareRecord = decided.length ? {won: decided.filter(game => game.result === 'right').length, lost: decided.filter(game => game.result === 'wrong').length} : null;
  /* The post text: the picked teams by name (X shows them before the picture loads), the question, one hashtag. */
  const names = shareGames.map(game => nickname(game.pick)), listed = names.length > 6 ? `${names.slice(0, 6).join(', ')} and ${names.length - 6} more` : names.join(', ');
  const shareText = `My NBA picks ${team ? `for the ${nickname(team)}` : day === today ? 'tonight' : `for ${dayLabel}`}: ${listed}${shareRecord ? ` (${shareRecord.won}–${shareRecord.lost} so far)` : ''}. Who do you have? #NBA`;

  return <section className="gb">
    <div className="gb-head">
      <h1>Fixtures</h1>
      {record && record.won + record.lost > 0 && <a className="gb-record" href="/play/leaderboard" title="Your picks so far, graded after each game. Open the leaderboard">Your picks <b>{record.won}–{record.lost}</b>{record.players >= 3 && <> · <b>#{record.rank}</b> of {record.players}</>}</a>}
      <select className="gb-team" value={team} onChange={event => setTeam(event.target.value)} aria-label="Team">
        <option value="">All teams, by day</option>{codes.map(code => <option key={code} value={code}>{TEAMS[code].name}</option>)}
      </select>
    </div>
    {!team && <nav className="gb-days" aria-label="Game days">
      <button type="button" className="gb-step" aria-label="Previous day" disabled={index <= 0} onClick={() => setDay(days[index - 1])}><ChevronLeft size={18}/></button>
      <div className="gb-strip" ref={strip}>{days.map(value => <button key={value} type="button" className={`${value === day ? 'active' : ''}${value === today ? ' today' : ''}`} aria-pressed={value === day} onClick={() => setDay(value)}>
        <small>{value === today ? 'Today' : chip.format(noon(value))}</small><b>{chipDay.format(noon(value))}</b>
      </button>)}</div>
      <button type="button" className="gb-step" aria-label="Next day" disabled={index >= days.length - 1} onClick={() => setDay(days[index + 1])}><ChevronRight size={18}/></button>
    </nav>}
    {(team || day) && <div className="gb-dayrow">
      {team ? <h2 className="gb-day">{TEAMS[team].name} <small>{games?.length ?? 0} games this season</small></h2>
        : <h2 className="gb-day">{day === today ? 'Today' : longDay.format(noon(day))} <small>{games?.length ?? 0} games</small></h2>}
      {picked.length > 0 && <button type="button" className="gb-share" data-track="Fixtures: share picks" onClick={() => setSharing(true)}><Share2 size={15}/> Share my {picked.length} {picked.length === 1 ? 'pick' : 'picks'}</button>}
    </div>}
    {games?.some(game => game.state !== 'in' && game.state !== 'post' && new Date(game.start) > Date.now()) && <p className="gb-hint">Tap who you think wins. Change it any time before tip-off.</p>}
    {auth === 'out' && picked.length > 0 && !nudgeHidden && <div className="gb-nudge" role="note">
      <p><b>Keep your picks.</b> A free account saves them, keeps your record and ranks you against other fans.</p>
      <button type="button" className="gb-nudge-go" data-track="Fixtures: picks sign-in nudge" onClick={() => openSignIn({back: '/fixtures', title: 'Save your picks', line: 'One tap with Google. Your picks move into your account, get graded after every game, and you see where you rank.'})}>Save my picks</button>
      <button type="button" className="gb-nudge-x" aria-label="Not now" onClick={() => { try { localStorage.setItem(NUDGE, String(Date.now())); } catch { /* private mode */ } setNudgeHidden(true); }}><X size={16}/></button>
    </div>}
    {!games ? <ul className="gb-list" aria-busy="true">{Array.from({length: 6}, (_, key) => <li key={key} className="gb-game sk"/>)}</ul>
      : !games.length ? <p className="gb-empty">No games on this day.</p>
      : team ? <>
        {/* A team's season: what is next first, then the results, newest first. */}
        {[['Coming up', games.filter(game => game.state !== 'post')], ['Results', games.filter(game => game.state === 'post').reverse()]].filter(([, list]) => list.length).map(([title, list]) => <React.Fragment key={title}>
          <h3 className="gb-part">{title} <small>{list.length}</small></h3>
          <ul key={`${team}-${title}`} className="gb-list list-in">{list.map(game => <Game key={game.id} game={game} mine={picks[game.id]} onPick={pick} showDay/>)}</ul>
        </React.Fragment>)}
      </> : <ul key={day} className="gb-list list-in">{games.map(game => <Game key={game.id} game={game} mine={picks[game.id]} onPick={pick}/>)}</ul>}
    {sharing && picked.length > 0 && <ShareSheet width={1600} ready onClose={() => setSharing(false)} filename={`statspads-picks-${team || day}`} text={shareText} url={`${location.origin}/fixtures`}>
      {ref => <PicksPoster ref={ref} title={team ? `My ${nickname(team)} picks` : 'My NBA picks'} date={team ? TEAMS[team].name : day === today ? `Tonight, ${chipDay.format(noon(day))}` : chipDay.format(noon(day))} games={shareGames} record={shareRecord}/>}
    </ShareSheet>}
    {notice && createPortal(<div className="toast" role="alert">{notice}</div>, document.body)}
  </section>;
}
