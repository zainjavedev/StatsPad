'use client';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Check, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { TEAMS, espnLogoUrl, nickname } from '../lib/teams';
import { gameUrl, playerUrl } from '../lib/routes';
import { readAlerts } from '../lib/alerts';
import { openSignIn, useSignedIn } from '../lib/signin';
import ShareButton from './ShareButton';

/* Fixtures (/fixtures; /scores and /schedule redirect here): a strip of every game day, then that day's games as flat rows
   (both teams with logo and record, the score with the winner marked, the status: final, the live clock, or tip-off and TV,
   and each side's best line once the game has started). The day's games come from the schedule file and ESPN's scoreboard
   for that date is laid over them, so results and live scores are always current. It opens on today once the first game
   has tipped off, otherwise on the latest night with results. The team picker (or ?team=BOS) lists that team's season instead.
   Every game takes a pick (who wins) until tip-off: saved to the account by /api/predict, graded once the game is final,
   with the fans' split after picking and a share card of the day's picks. Signed-out visitors get the sign-in pop-up. */

const SEASON = '2026-27';
const SCOREBOARD = 'https://site.api.espn.com/apis/site/v2/sports/basketball/nba/scoreboard?dates=';
const eastern = date => new Date(date).toLocaleDateString('en-CA', {timeZone: 'America/New_York'});
const noon = day => new Date(`${day}T12:00:00Z`);
const chip = new Intl.DateTimeFormat('en-US', {weekday: 'short', timeZone: 'UTC'});
const chipDay = new Intl.DateTimeFormat('en-US', {month: 'short', day: 'numeric', timeZone: 'UTC'});
const longDay = new Intl.DateTimeFormat('en-US', {weekday: 'long', month: 'long', day: 'numeric', timeZone: 'UTC'});
const clock = new Intl.DateTimeFormat(undefined, {hour: 'numeric', minute: '2-digit'});
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

const face = id => `https://a.espncdn.com/combiner/i?img=/i/headshots/nba/players/full/${id}.png&w=96&h=70`;

/* One team's line: a bar in the team's colour, logo, name, record and score; the winner gets a marker by the score. */
function Side({side, won, lost}) {
  const team = TEAMS[side.code];
  return <span className={`gb-side${won ? ' won' : ''}${lost ? ' lost' : ''}`} style={{'--tc': team?.color || '#666'}}>
    <img src={espnLogoUrl(side.code)} alt="" width="28" height="28"/>
    <b>{nickname(side.code)}</b>{side.record && <small>{side.record}</small>}
    {side.score !== undefined && side.score !== null && !Number.isNaN(side.score) && <em>{side.score}{won && <i className="gb-win" aria-label="won"/>}</em>}
    <span className="sr">{team?.name}</span>
  </span>;
}

/* Who wins: two team buttons under the game. Open until tip-off; after that the pick (if any) stays, marked right or wrong once
   the game is final. The fans' split shows once you have picked, or once picks are locked. */
function Pick({game, mine, crowd, onPick}) {
  const open = game.state !== 'in' && game.state !== 'post' && new Date(game.start) > Date.now();
  const away = Number(game.away.score), home = Number(game.home.score);
  const winner = game.state === 'post' && away !== home ? (away > home ? game.away.code : game.home.code) : null;
  const total = (crowd?.[game.away.code] || 0) + (crowd?.[game.home.code] || 0), showSplit = total > 0 && (mine || !open);
  if (!open && !mine && !total) return null;
  const label = open ? (mine ? 'Your pick' : 'Who wins?') : mine ? (winner ? (winner === mine ? 'You called it' : 'Missed this one') : 'Your pick, locked') : 'Fan picks';
  return <div className={`gb-pick${open ? ' open' : ''}${winner && mine ? (winner === mine ? ' right' : ' wrong') : ''}`}>
    <span className="gb-pick-q">{winner && mine ? (winner === mine ? <Check size={14}/> : <X size={14}/>) : null}{label}{showSplit && <small>{total} {total === 1 ? 'pick' : 'picks'}</small>}</span>
    <div className="gb-pick-opts" role="group" aria-label={`Who wins, ${nickname(game.away.code)} or ${nickname(game.home.code)}?`}>
      {[game.away.code, game.home.code].map(code => {
        const share = showSplit ? Math.round(((crowd?.[code] || 0) / total) * 100) : null;
        return <button key={code} type="button" className={`gb-opt${mine === code ? ' on' : ''}${mine && mine !== code ? ' off' : ''}`} style={{'--tc': TEAMS[code]?.color || '#666', '--pct': `${share ?? 0}%`}}
          disabled={!open} aria-pressed={mine === code} data-track={`Fixtures: pick ${code}`} onClick={() => onPick(game, code)}>
          <span className="gb-opt-logo"><img src={espnLogoUrl(code)} alt="" width="22" height="22"/>{mine === code && <i className="gb-opt-tick" aria-label="your pick"><Check size={10} strokeWidth={3.5}/></i>}</span>
          <b>{nickname(code)}</b>
          {share !== null && <small>{share}%</small>}
        </button>;
      })}
    </div>
  </div>;
}

function Game({game, showDay, mine, crowd, onPick}) {
  const started = game.state === 'in' || game.state === 'post', live = game.state === 'in';
  const away = Number(game.away.score), home = Number(game.home.score), final = game.state === 'post' && away !== home;
  const tops = started && [game.away.top, game.home.top].filter(Boolean);
  /* A tag for the games worth a second look: overtime, or decided by three or fewer. */
  const overtime = /OT/.test(game.detail || ''), close = final && Math.abs(away - home) <= 3;
  return <li className={`gb-game${live ? ' live' : ''}`}>
    <a href={gameUrl(game.away.code, game.home.code, game.id)}>
      <span className="gb-sides">
        <Side side={started ? game.away : {...game.away, score: undefined}} won={final && away > home} lost={final && away < home}/>
        <Side side={started ? game.home : {...game.home, score: undefined}} won={final && home > away} lost={final && home < away}/>
      </span>
      <span className="gb-status">
        {live ? <b className="gb-live"><i/>{game.detail || 'Live'}</b> : game.state === 'post' ? <b>{overtime ? game.detail.replace(/^Final\/?/, 'Final · ') : 'Final'}</b> : <b>{clock.format(new Date(game.start))}</b>}
        {close && !overtime && <span className="gb-tag">Close game</span>}
        {showDay && <small>{chipDay.format(noon(game.day))}</small>}
        {!started && game.tv && <small>{game.tv}</small>}
      </span>
    </a>
    {tops?.length > 0 && <div className="gb-tops">{tops.map(top => <a key={top.full} className="gb-perf" href={playerUrl(top.full)} style={{'--tc': TEAMS[top.code]?.color || '#666'}}>
      <span className="gb-perf-face">{top.id && <img src={face(top.id)} alt="" loading="lazy"/>}</span>
      <span className="gb-perf-main"><b>{top.name}</b><span>{top.line.map(part => { const [value, unit] = part.split(' '); return <span key={unit}><em>{value}</em>{unit?.toLowerCase()}</span>; })}</span></span>
    </a>)}</div>}
    <Pick game={game} mine={mine} crowd={crowd} onPick={onPick}/>
  </li>;
}

export default function GameDay() {
  const auth = useSignedIn();
  const [picks, setPicks] = useState({}), [crowd, setCrowd] = useState({}), [record, setRecord] = useState(null), [notice, setNotice] = useState('');
  const pending = useRef(null), inflight = useRef(new Set());
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

  /* Picks and the fans' split for the games on screen, again whenever the account changes. Picks still being saved win over
     what the server sends back. */
  const ids = games?.map(game => game.id).join(',') ?? '';
  useEffect(() => {
    if (!ids || auth === 'checking') return undefined;
    let live = true;
    const token = auth === 'in' ? readAlerts().email : '';
    fetch(`/api/predict?ids=${ids}${token ? `&token=${encodeURIComponent(token)}` : ''}`).then(response => (response.ok ? response.json() : null)).then(data => {
      if (!live || !data) return;
      setCrowd(now => ({...now, ...data.crowd}));
      setPicks(now => {
        const next = token ? {...now, ...data.picks} : {};
        inflight.current.forEach(id => { if (now[id]) next[id] = now[id]; });
        return next;
      });
      setRecord(data.record);
    }).catch(() => {});
    return () => { live = false; };
  }, [ids, auth]);

  const pick = useCallback((game, code) => {
    if (auth !== 'in') {
      pending.current = {game, code};
      openSignIn({back: '/fixtures', title: 'Who wins tonight?', line: 'One tap with Google. Your picks are saved and graded after every game, so you can see your record.'});
      return;
    }
    const before = picks[game.id], split = crowd[game.id];
    if (before === code) return;
    setPicks(now => ({...now, [game.id]: code}));
    setCrowd(now => {
      const next = {...now[game.id]};
      if (before) next[before] = Math.max(0, (next[before] || 1) - 1);
      next[code] = (next[code] || 0) + 1;
      return {...now, [game.id]: next};
    });
    inflight.current.add(game.id);
    fetch('/api/predict', {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({token: readAlerts().email, game: game.id, pick: code})})
      .then(async response => {
        const data = await response.json().catch(() => ({}));
        /* A token the server no longer knows (account deleted, or signed out elsewhere): sign in again and keep the pick. */
        if (response.status === 401) { pending.current = {game, code}; openSignIn({back: '/fixtures', title: 'Sign in again', line: 'Your session ran out. One tap with Google and your pick is saved.'}); throw new Error(''); }
        if (!response.ok) throw new Error(data.error || 'Could not save your pick. Try again.');
        setCrowd(now => ({...now, [game.id]: data.crowd}));
      })
      .catch(error => { setPicks(now => ({...now, [game.id]: before})); setCrowd(now => ({...now, [game.id]: split})); if (error.message) setNotice(error.message); })
      .finally(() => inflight.current.delete(game.id));
  }, [auth, picks, crowd]);
  /* The pick that opened the sign-in pop-up is saved as soon as the sign-in lands. */
  useEffect(() => {
    if (auth !== 'in' || !pending.current) return;
    const {game, code} = pending.current;
    pending.current = null;
    pick(game, code);
  }, [auth, pick]);
  useEffect(() => {
    if (!notice) return undefined;
    const timer = setTimeout(() => setNotice(''), 3200);
    return () => clearTimeout(timer);
  }, [notice]);

  /* The share card: this day's picks (or the team's), with a tick or cross on the ones already decided. */
  const picked = games?.filter(game => picks[game.id]) ?? [];
  const dayLabel = team ? TEAMS[team]?.name : day === today ? 'tonight' : day ? longDay.format(noon(day)) : '';
  const shareSpec = picked.length ? {
    kind: 'list', eyebrow: 'My picks', title: team ? `${TEAMS[team].name} picks` : `NBA picks, ${day ? chipDay.format(noon(day)) : ''}`,
    sub: `${picked.length} ${picked.length === 1 ? 'game' : 'games'}, called before tip-off`, color: TEAMS[picks[picked[0].id]]?.color, foot: 'Who do you have? Make your picks',
    rows: picked.slice(0, 12).map((game, place) => {
      const mine = picks[game.id], other = mine === game.away.code ? game.home.code : game.away.code;
      const away = Number(game.away.score), home = Number(game.home.score), done = game.state === 'post' && away !== home;
      const won = done && (away > home ? game.away.code : game.home.code) === mine;
      return {lead: place + 1, name: `${nickname(mine)} to win`, sub: `${mine === game.home.code ? 'vs' : 'at'} ${TEAMS[other].name}`, value: done ? (won ? '✓' : '✗') : clock.format(new Date(game.start))};
    }),
  } : null;

  return <section className="gb">
    <div className="gb-head">
      <h1>Fixtures</h1>
      {record && record.won + record.lost > 0 && <span className="gb-record" title="Your picks so far, graded after each game">Your picks <b>{record.won}–{record.lost}</b></span>}
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
      {shareSpec && <ShareButton spec={shareSpec} filename={`statspads-picks-${team || day}`} title="My NBA picks" text={`My NBA picks for ${dayLabel} on StatsPads. Who do you have?`} path="/fixtures" className="gb-share" label={`Share my ${picked.length} ${picked.length === 1 ? 'pick' : 'picks'}`}/>}
    </div>}
    {!games ? <ul className="gb-list" aria-busy="true">{Array.from({length: 6}, (_, key) => <li key={key} className="gb-game sk"/>)}</ul>
      : !games.length ? <p className="gb-empty">No games on this day.</p>
      : team ? <>
        {/* A team's season: what is next first, then the results, newest first. */}
        {[['Coming up', games.filter(game => game.state !== 'post')], ['Results', games.filter(game => game.state === 'post').reverse()]].filter(([, list]) => list.length).map(([title, list]) => <React.Fragment key={title}>
          <h3 className="gb-part">{title} <small>{list.length}</small></h3>
          <ul key={`${team}-${title}`} className="gb-list list-in">{list.map(game => <Game key={game.id} game={game} mine={picks[game.id]} crowd={crowd[game.id]} onPick={pick} showDay/>)}</ul>
        </React.Fragment>)}
      </> : <ul key={day} className="gb-list list-in">{games.map(game => <Game key={game.id} game={game} mine={picks[game.id]} crowd={crowd[game.id]} onPick={pick}/>)}</ul>}
    {notice && createPortal(<div className="toast" role="alert">{notice}</div>, document.body)}
  </section>;
}
