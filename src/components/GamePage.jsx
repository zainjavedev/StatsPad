import React, { useEffect, useState } from 'react';
import { ArrowLeft, Eye } from 'lucide-react';
import { revealGame, useSpoilers } from '../lib/spoilers';
import { performancesOf } from '../lib/performances';
import { flowOf, rating } from '../lib/playerGame';
import PlayerGame from './PlayerGame';
import { Flow } from './ShotChart';
import { PerfCard } from './RecentPerformances';
import SpoilerToggle, { Hidden } from './SpoilerToggle';
import { loadBoxscore } from '../lib/boxscore';
import Radar from './Radar';
import { Headshot } from './TeamPage';
import { loadSchedule } from '../lib/schedule';
import { GameSkeleton } from './Skeletons';
import { TEAMS, teamCodeOf } from '../lib/teams';
import { gameUrl } from '../lib/routes';
import { useFeed } from '../lib/useFeed';
import { radarAxes, radarTints } from '../lib/radarAxes';

/* A team's page from ESPN's abbreviation, so the game header can link to it. */
const teamHref = abbr => {
  const code = Object.keys(TEAMS).find(key => TEAMS[key].espn === String(abbr).toLowerCase());
  return code ? `/lineups/${TEAMS[code].name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}` : null;
};
const TeamLink = ({side}) => {
  const href = teamHref(side.abbr), logo = <img src={side.logo} alt={side.short}/>;
  return href ? <a className="hd-link" href={href} title={`${side.short} team page`}>{logo}</a> : logo;
};

/* Team totals side by side: the better number in each row is bold (fewer is better for turnovers and fouls). */
const COMPARE = [
  ['Field goals', 'FG'], ['FG%', 'Field Goal %', '%'], ['3-pointers', '3PT'], ['3P%', 'Three Point %', '%'], ['Free throws', 'FT'], ['FT%', 'Free Throw %', '%'],
  ['Rebounds', 'Rebounds'], ['Offensive rebounds', 'Offensive Rebounds'], ['Assists', 'Assists'], ['Steals', 'Steals'], ['Blocks', 'Blocks'],
  ['Turnovers', 'Turnovers', '', true], ['Fouls', 'Fouls', '', true], ['Points in the paint', 'Points in Paint'], ['Fast-break points', 'Fast Break Points'], ['Largest lead', 'Largest Lead'],
];
const lead = value => parseFloat(String(value ?? '').split('-')[0]);
function TeamCompare({teams}) {
  const rows = COMPARE.filter(([, key]) => teams.every(team => team.totals?.[key] !== undefined));
  if (rows.length === 0) return null;
  return <section className="gd-card gd-compare">
    <div className="pg-card-head"><h3>Team stats</h3></div>
    <div className="gd-compare-head">{teams.map(team => <span key={team.abbr}>{team.logo && <img src={team.logo} alt=""/>}{team.abbr}</span>)}</div>
    {rows.map(([label, key, suffix = '', fewer]) => {
      const [a, b] = teams.map(team => lead(team.totals[key])), best = a === b ? -1 : (fewer ? a < b : a > b) ? 0 : 1;
      return <div key={label} className="gd-compare-row">
        <b className={best === 0 ? 'lead' : ''}>{teams[0].totals[key]}{suffix}</b><span>{label}</span><b className={best === 1 ? 'lead' : ''}>{teams[1].totals[key]}{suffix}</b>
      </div>;
    })}
  </section>;
}

/* The score margin through the whole game, from the away team's side. */
function GameFlow({box, plays}) {
  const flow = flowOf(plays, null, true), periods = Math.max(4, ...plays.map(play => play.q || 0));
  const label = quarter => (quarter <= 4 ? `Q${quarter}` : quarter === 5 ? 'OT' : `${quarter - 4}OT`);
  if (flow.points.length <= 2) return null;
  return <section className="gd-card">
    <div className="pg-card-head"><h3>How the game swung</h3></div>
    <Flow flow={flow} color="var(--text-1)" quarters={periods}/>
    <div className="pg-axis">{Array.from({length: periods}, (_, index) => <span key={index}>{label(index + 1)}</span>)}</div>
    <p className="pg-legend"><span><i className="lead"/>{box.away.short} ahead</span><span><i className="trail"/>{box.home.short} ahead</span></p>
  </section>;
}

/* One game on its own page: the score, who led it in each category (with photos), and the full box
   score for both teams with each category's leader highlighted. Before tip-off, the expected fives. */

const codeOf = abbr => Object.keys(TEAMS).find(code => TEAMS[code].espn === String(abbr).toLowerCase());
const TOP = 6;
const num = value => Number(String(value ?? '').replace('+', '')) || 0;

/* How each side played, on a typical NBA game's range (a point is where that stat usually runs from low to high). */
const SHAPE = [
  ['Scoring', side => side.points, 85, 140, value => `${value} pts`],
  ['FG%', side => side.totals['Field Goal %'], 35, 60, value => `${value}%`],
  ['3P%', side => side.totals['Three Point %'], 20, 50, value => `${value}%`],
  ['Rebounds', side => side.totals.Rebounds, 30, 60, value => `${value} reb`],
  ['Assists', side => side.totals.Assists, 15, 35, value => `${value} ast`],
  ['Defense', side => num(side.totals.Steals) + num(side.totals.Blocks), 4, 22, value => `${value} stl + blk`],
  ['Ball care', side => num(side.totals.Turnovers), 22, 8, value => `${value} turnovers`],
];
const shapeAxes = (teams, scores) => SHAPE.map(([label, get, low, high, text]) => ({label, sides: teams.map((team, index) => {
  const value = num(get({totals: team.totals, points: scores[index]}));
  const pct = Math.round(Math.max(0, Math.min(1, (value - low) / (high - low))) * 100);
  return {pct, text: text(value), rank: `${pct}% of a typical game's range`};
})}));


const plain = name => String(name).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[.']/g, '').replace(/\s+/g, ' ').trim();

const SEASON_FETCH = year => code => fetch(`https://site.api.espn.com/apis/site/v2/sports/basketball/nba/teams/${TEAMS[code].espn}/schedule?season=${year}`).then(response => response.json()).catch(() => ({events: []}));
const dayFormat = new Intl.DateTimeFormat(undefined, {month: 'short', day: 'numeric', year: 'numeric'});

/* One side's recent results, newest first, and the streak they are on. */
function formOf(games, code) {
  const mine = games.filter(game => game.state === 'post' && (game.away.code === code || game.home.code === code)).slice(-5).reverse();
  const results = mine.map(game => {
    const home = game.home.code === code, us = Number((home ? game.home : game.away).score), them = Number((home ? game.away : game.home).score), other = home ? game.away : game.home;
    return {id: game.id, win: us > them, us, them, home, opp: other.abbr, pre: game.preseason};
  });
  let streak = 0;
  for (const result of results) { if (result.win === results[0].win) streak += 1; else break; }
  return {results, streak: results.length ? `${results[0].win ? 'W' : 'L'}${streak}` : null};
}

/* The radar between the two logos of an upcoming game: the same seven skills and league scaling as the team pages and the compare page,
   from this season's team numbers (the preseason's until the regular season has games). */
const loadMatchupPool = () => {
  const read = name => fetch(`/data/2026-27/${name}.json`).then(response => (response.ok ? response.json() : null)).then(data => (Array.isArray(data?.players) ? data.players.filter(team => team.gamesPlayed > 0) : [])).catch(() => []);
  return read('teams-regular-season').then(pool => (pool.length > 10 ? pool : read('teams-preseason')));
};
function MatchupRadar({box}) {
  const pool = useFeed(loadMatchupPool);
  const [a, b] = [box.away, box.home].map(side => (pool || []).find(team => teamCodeOf(team.team) === codeOf(side.abbr)));
  if (pool === null) return <div className="gp-radar" aria-hidden="true"><div className="sk" style={{aspectRatio: '560 / 400', borderRadius: 28}}/></div>;
  if (!a || !b || pool.length < 10) return null;
  return <div className="gp-radar" style={radarTints(a, b)} aria-label={`${box.away.short} and ${box.home.short} radar`}>
    <Radar axes={radarAxes(a, b, pool)} names={[box.away.short, box.home.short]} colors={['var(--ta)', 'var(--tb)']}/>
  </div>;
}

/* Before tip-off: each side's expected starting five on the team page's cards, with last season's per-game
   numbers and how often the player started in the preseason. */
function Preview({box}) {
  const [data, setData] = useState(null), [context, setContext] = useState(null), [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const [awayCode, homeCode] = [box.away, box.home].map(side => codeOf(side.abbr));
    Promise.all([
      loadSchedule(),
      fetch('/data/2025-26/teams-regular-season.json').then(response => response.json()).catch(() => ({players: []})),
      ...[2026, 2025, 2024].map(year => SEASON_FETCH(year)(awayCode)),
    ]).then(([games, teams, ...seasons]) => {
      const byCode = new Map(teams.players.map(team => [teamCodeOf(team.team), team.stats]));
      const meetings = seasons.flatMap(season => season.events ?? []).map(event => {
        const competition = event.competitions?.[0];
        const sides = Object.fromEntries((competition?.competitors ?? []).map(entry => [entry.homeAway, {code: codeOf(entry.team.abbreviation), score: Number(typeof entry.score === 'object' ? entry.score?.displayValue : entry.score)}]));
        return {id: event.id, date: new Date(event.date), state: competition?.status?.type?.state, ...sides};
      }).filter(game => game.state === 'post' && game.home && game.away && [game.home.code, game.away.code].includes(homeCode)).sort((a, b) => b.date - a.date).slice(0, 6);
      setContext({awayCode, homeCode, form: [formOf(games, awayCode), formOf(games, homeCode)], meetings, byCode});
    }).catch(() => setContext({awayCode, homeCode, form: [], meetings: [], byCode: new Map()}));
    const codes = [awayCode, homeCode];
    /* A phone on a weak connection can drop one of these files; each is asked for twice (the second time past the cache) before giving up. */
    const getRoster = code => fetch(`/data/2026-27/rosters/${code}.json`).then(response => { if (!response.ok) throw new Error(response.status); return response.json(); })
      .catch(() => fetch(`/data/2026-27/rosters/${code}.json`, {cache: 'reload'}).then(response => { if (!response.ok) throw new Error(response.status); return response.json(); }));
    Promise.all(codes.map(getRoster)).then(async rosters => {
      /* Numbers on the cards: this season's regular-season averages once a player has played one, otherwise his
         preseason averages. Last season's numbers are not used here. */
      const [live, pre] = await Promise.all([
        fetch('/data/2026-27/regular-season.json', {cache: 'no-cache'}).then(response => response.ok ? response.json() : {players: []}).catch(() => ({players: []})),
        fetch('/data/2026-27/preseason-starters.json', {cache: 'no-cache'}).then(response => response.json()).catch(() => ({})),
      ]);
      const season = new Map((live.players ?? []).filter(player => player.gamesPlayed > 0).map(player => [plain(player.playerName), player.stats]));
      setData(rosters.map((roster, index) => {
        const code = codes[index];
        const five = roster.players.filter(player => player.unit === 'starters').map(player => {
          const record = (pre[code] ?? []).find(item => item.espnId === player.espnId || plain(item.name) === plain(player.name));
          const regular = season.get(plain(player.name));
          return {...player, line: regular ? {ppg: regular.points, rpg: regular.totalRebounds, apg: regular.assists, source: live.seasonType === 'Preseason' ? 'preseason' : 'season'} : record ? {ppg: record.ppg, rpg: record.rpg, apg: record.apg, source: 'preseason'} : null};
        });
        return {roster, code, side: [box.away, box.home][index], five, source: five.some(player => player.line?.source === 'season') ? 'season' : 'preseason'};
      }));
    }).catch(() => setData([]));
  }, [box, attempt]);
  if (!data) return <div className="gp-preview" aria-busy="true" aria-label="Loading the starting fives">{[0, 1].map(side => <section key={side} className="gp-side"><div className="sk sk-title"/><div className="starter-grid">{[0, 1, 2, 3, 4].map(index => <div key={index} className="sk sk-starter"/>)}</div></section>)}</div>;
  const per = (player, key) => Number.isFinite(player.line?.[key]) ? player.line[key].toFixed(1) : '—';
  return <div className="gp-preview">
    <p className="gd-note">No box score yet. Expected starters are who started the most preseason games, with this season&apos;s per-game numbers (preseason numbers until the regular season starts).</p>
    {data.length === 0 && <div className="gp-retry"><p>The starting fives did not load. This is usually a weak connection.</p><button type="button" className="spoiler-toggle" onClick={() => { setData(null); setAttempt(count => count + 1); }}>Try again</button></div>}
    {data.map(({roster, code, side, five}) => <section key={code} className="gp-side" style={{'--team': TEAMS[code].color}}>
      <h3>{side.logo && <img src={side.logo} alt=""/>}<span>{roster.teamName}<small>Expected starting five</small></span></h3>
      <div className="starter-grid">{five.map(player => <div key={player.name} className="starter-card">
        <span className="starter-stage"><span className="slot-badge">{player.slot ?? player.pos}</span><Headshot player={player} className="starter-art"/></span>
        <h3>{player.name}</h3>
        <dl className="starter-line">
          <div><dt>PPG</dt><dd>{per(player, 'ppg')}</dd></div>
          <div><dt>RPG</dt><dd>{per(player, 'rpg')}</dd></div>
          <div><dt>APG</dt><dd>{per(player, 'apg')}</dd></div>
        </dl>
        
      </div>)}</div>
    </section>)}
    {context && <Context box={box} context={context}/>}
  </div>;
}


/* The matchup context: how the two teams compare, how each is playing, and how past meetings went. */
function Context({box, context}) {
  const spoilers = useSpoilers();
  const {awayCode, homeCode, form, meetings} = context;
  const sides = [[awayCode, box.away], [homeCode, box.home]];
  const wins = [0, 0];
  meetings.forEach(game => { const winner = game.home.score > game.away.score ? game.home.code : game.away.code; if (winner === awayCode) wins[0] += 1; else if (winner === homeCode) wins[1] += 1; });
  const open = meetings.every(game => spoilers.revealed(game.id));
  return <>
    <section className="gp-form">
      <h3>Recent form</h3>
      <div className="gp-form-grid">{sides.map(([code, side], index) => <div key={code}>
        <p className="gp-form-head">{side.logo && <img src={side.logo} alt=""/>}<b>{side.short}</b>{form[index]?.streak && <em className={form[index].streak.startsWith('W') ? 'win' : 'loss'}>{form[index].results.every(result => spoilers.revealed(result.id)) ? form[index].streak : '?'}</em>}</p>
        {form[index]?.results.length ? <ul>{form[index].results.map(result => <li key={result.id}>
          {spoilers.revealed(result.id) ? <span className={`gp-wl ${result.win ? 'win' : 'loss'}`}>{result.win ? 'W' : 'L'}</span> : <span className="gp-wl">?</span>}
          <span>{result.home ? 'vs' : '@'} {result.opp}{result.pre ? ' · Preseason' : ''}</span>{spoilers.revealed(result.id) ? <strong>{result.us}–{result.them}</strong> : <Hidden id={result.id} onReveal={revealGame}/>}
        </li>)}</ul> : <p className="gd-note">No games played yet.</p>}
      </div>)}</div>
    </section>
    <section className="gp-past">
      <h3>Past matchups <SpoilerToggle/></h3>
      {meetings.length ? <>
        <div className="gp-series">
          <div className="gp-series-side"><img src={box.away.logo} alt=""/><strong>{open ? wins[0] : '?'}</strong><span>{box.away.short}</span></div>
          <div className="gp-series-bar" aria-hidden="true"><i style={{flex: open ? wins[0] || 0.05 : 1}}/><i className="b" style={{flex: open ? wins[1] || 0.05 : 1}}/></div>
          <div className="gp-series-side right"><span>{box.home.short}</span><strong>{open ? wins[1] : '?'}</strong><img src={box.home.logo} alt=""/></div>
        </div>
        <p className="gd-meta gp-series-note">{!open ? `Last ${meetings.length} meetings` : wins[0] === wins[1] ? 'Dead even' : `${wins[0] > wins[1] ? box.away.short : box.home.short} lead`} over the last {meetings.length} meetings{meetings[0] ? ` · latest ${dayFormat.format(meetings[0].date)}` : ''}</p>
        <ul className="gp-meet">{meetings.map(game => {
          const homeWon = game.home.score > game.away.score, margin = Math.abs(game.home.score - game.away.score), winner = homeWon ? game.home : game.away;
          const logo = side => (side.code === awayCode ? box.away : box.home).logo;
          const shown = spoilers.revealed(game.id);
          return <li key={game.id}>
            <span className="gp-meet-date"><b>{dayFormat.format(game.date)}</b>{shown && <small>{TEAMS[winner.code]?.name.split(' ').pop()} by {margin}</small>}</span>
            <span className={`gp-meet-team${shown && !homeWon ? ' won' : ''}`}><img src={logo(game.away)} alt=""/>{shown ? <b>{game.away.score}</b> : <Hidden id={game.id} onReveal={revealGame}/>}</span>
            <span className="gp-at">at</span>
            <span className={`gp-meet-team${shown && homeWon ? ' won' : ''}`}>{shown && <b>{game.home.score}</b>}<img src={logo(game.home)} alt=""/></span>
          </li>;
        })}</ul>
      </> : <p className="gd-note">No recent regular-season meetings found.</p>}
    </section>
  </>;
}

export default function GamePage({id}) {
  const [box, setBox] = useState(undefined), [side, setSide] = useState(0), [all, setAll] = useState(false), spoilers = useSpoilers(), [focus, setFocus] = useState(() => (typeof location === 'undefined' ? null : new URLSearchParams(location.search).get('player')));
  const pick = playerId => { setFocus(playerId); const url = new URL(location.href); if (playerId) url.searchParams.set('player', playerId); else url.searchParams.delete('player'); history.replaceState(null, '', url); window.scrollTo(0, 0); };
  useEffect(() => { loadBoxscore(id).then(setBox); }, [id]);
  /* Opened from a list by its bare id: show the readable /games/<away>-vs-<home>-<id> address, as the server does for a direct visit. */
  useEffect(() => {
    if (!box?.away) return;
    const [away, home] = [box.away, box.home].map(side => codeOf(side.abbr));
    if (!TEAMS[away] || !TEAMS[home]) return;
    const path = gameUrl(away, home, id);
    if (location.pathname !== path) history.replaceState(history.state, '', path + location.search + location.hash);
  }, [box, id]);

  /* Top three in each category across both teams; the leader (ties included) is what the box score highlights. */
  if (box === undefined) return <GameSkeleton/>;
  if (!box?.away) return <section className="gp"><a className="gp-back" href="/schedule"><ArrowLeft size={15}/> Schedule</a><p className="gd-note">We couldn&apos;t load this game.</p></section>;

  const focusTeam = focus ? box.teams.find(team => team.players.some(entry => entry.id === focus && !entry.out)) : null;
  const nameOf = athlete => box.teams.flatMap(team => team.players).find(entry => entry.id === athlete)?.name;
  const hidden = box.state !== 'pre' && !spoilers.revealed(String(id)), scored = box.state !== 'pre' && !hidden;
  const ordered = [...box.teams].sort((a, b) => (a.abbr === box.away.abbr ? 0 : 1) - (b.abbr === box.away.abbr ? 0 : 1));

  return <section className="gp">
    {!focusTeam && <a className="gp-back" href="/schedule"><ArrowLeft size={15}/> Schedule</a>}
    {!focusTeam && <>
    <div className={box.state === 'in' ? 'gd-head gp-head is-live' : 'gd-head gp-head'}>
      <div><TeamLink side={box.away}/>{scored && <strong className={Number(box.away.score) > Number(box.home.score) ? 'won' : ''}>{box.away.score}</strong>}</div>
      <span className={box.state === 'pre' ? 'gp-mid' : undefined}>{box.state === 'post' ? (hidden ? 'Played' : 'Final') : box.state === 'in' ? (box.detail || 'Live') : 'Upcoming'}{box.state === 'pre' && <MatchupRadar box={box}/>}</span>
      <div><TeamLink side={box.home}/>{scored && <strong className={Number(box.home.score) > Number(box.away.score) ? 'won' : ''}>{box.home.score}</strong>}</div>
    </div>
    <p className="gd-meta">{[box.venue].filter(Boolean).join(' · ')}</p>
    </>}

    {focusTeam && <PlayerGame gameId={id} box={box} plays={box.plays ?? []} team={focusTeam} player={focusTeam.players.find(entry => entry.id === focus)} onClose={() => pick(null)} onPick={pick} nameOf={nameOf}/>}
    {focusTeam ? null : box.state === 'pre' ? <Preview box={box}/> : hidden ? <div className="gp-spoiler"><p>This game has started. The score and box score are hidden.</p><button type="button" className="spoiler-toggle" onClick={() => revealGame(String(id))}><Eye size={14}/> Show score</button></div> : <>
      <div className="gp-tabs" role="group" aria-label="Team">
        {ordered.map((team, index) => <button key={team.abbr} className={side === index ? 'active' : ''} onClick={() => setSide(index)}>{team.logo && <img src={team.logo} alt=""/>}{team.name}</button>)}
      </div>
      <div className="gd-sides">{ordered.map((team, index) => {
        const lines = performancesOf(box, id).filter(line => line.team === team.abbr).sort((a, b) => Number(b.player.stats.PTS) - Number(a.player.stats.PTS) || rating(b.player.stats) - rating(a.player.stats));
        const out = team.players.filter(player => !player.starter && player.out);
        const shown = all ? lines : lines.slice(0, TOP);
        return <section key={team.abbr} className={`gd-team gd-cards${side === index ? ' on' : ''}`}>
          <h3>{team.logo && <img src={team.logo} alt=""/>}{team.name}</h3>
          <ul className="rp-list">{shown.map(line => <li key={line.player.id}><PerfCard line={line} onPick={pick}/></li>)}</ul>
          {out.length > 0 && <p className="gd-out">Did not play: {out.map(player => player.name).join(', ')}</p>}
        </section>;
      })}</div>
      {!all && ordered.some(team => performancesOf(box, id).filter(line => line.team === team.abbr).length > TOP) && <button type="button" className="gd-more" onClick={() => setAll(true)}>View all players</button>}
      <GameFlow box={box} plays={box.plays ?? []}/>
      {ordered.length === 2 && <TeamCompare teams={ordered}/>}
      {ordered.length === 2 && <Radar axes={shapeAxes(ordered, ordered.map(team => team.abbr === box.away.abbr ? box.away.score : box.home.score))} names={ordered.map(team => team.abbr === box.away.abbr ? box.away.short : box.home.short)} colors={['var(--accent)', 'var(--series-2)']} scope="a typical NBA game" notes={['Each spoke runs from a low to a high night for that stat, so the shape shows how each team played, not season averages. Ball care rewards fewer turnovers.']}/>}
    </>}
  </section>;
}
