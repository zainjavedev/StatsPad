import React, { useEffect, useMemo, useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { loadBoxscore } from '../lib/boxscore';
import Radar from './Radar';
import { Headshot } from './TeamPage';
import { loadSchedule } from '../lib/schedule';
import { TEAMS } from '../lib/teams';

/* One game on its own page: the score, who led it in each category (with photos), and the full box
   score for both teams with each category's leader highlighted. Before tip-off, the expected fives. */

const BASIC = ['MIN', 'PTS', 'REB', 'AST', 'STL', 'BLK', 'FG'];
const EXTRA = ['3PT', 'FT', 'TO', '+/-'];
const LEADS = [['PTS', 'Points'], ['REB', 'Rebounds'], ['AST', 'Assists'], ['STL', 'Steals'], ['BLK', 'Blocks']];
const codeOf = abbr => Object.keys(TEAMS).find(code => TEAMS[code].espn === String(abbr).toLowerCase());
const num = value => Number(String(value ?? '').replace('+', '')) || 0;
const dateFormat = new Intl.DateTimeFormat(undefined, {weekday: 'long', month: 'long', day: 'numeric', hour: 'numeric', minute: '2-digit'});

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

const Face = ({player, size = 40}) => player.photo ? <img className="gp-face" style={{width: size, height: size}} src={player.photo} alt="" loading="lazy" onError={event => { event.currentTarget.style.visibility = 'hidden'; }}/> : <i className="gp-face" style={{width: size, height: size}}/>;

const plain = name => String(name).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[.']/g, '').replace(/\s+/g, ' ').trim();

/* Team radar for the matchup: last season's team numbers, each scaled from the league's lowest to highest team. */
const TEAM_AXES = [
  ['Scoring', stats => stats.points, 'PPG'], ['Shooting', stats => stats.effectiveFieldGoalPercentage, 'eFG%'], ['3P%', stats => stats.threePointPercentage, '3P%'],
  ['Playmaking', stats => stats.assists, 'APG'], ['Rebounding', stats => stats.totalRebounds, 'RPG'], ['Defense', stats => stats.steals + stats.blocks, 'STL+BLK'], ['Ball care', stats => -stats.turnovers, 'TOV'],
];

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

/* Before tip-off: each side's expected starting five on the team page's cards, with last season's per-game
   numbers and how often the player started in the preseason. */
function Preview({box}) {
  const [data, setData] = useState(null), [context, setContext] = useState(null);
  useEffect(() => {
    const [awayCode, homeCode] = [box.away, box.home].map(side => codeOf(side.abbr));
    Promise.all([
      loadSchedule(),
      fetch('/data/2025-26/teams-regular-season.json').then(response => response.json()).catch(() => ({players: []})),
      ...[2026, 2025, 2024].map(year => SEASON_FETCH(year)(awayCode)),
    ]).then(([games, teams, ...seasons]) => {
      const byCode = new Map(teams.players.map(team => [codeOf(team.team), team.stats]));
      const meetings = seasons.flatMap(season => season.events ?? []).map(event => {
        const competition = event.competitions?.[0];
        const sides = Object.fromEntries((competition?.competitors ?? []).map(entry => [entry.homeAway, {code: codeOf(entry.team.abbreviation), score: Number(typeof entry.score === 'object' ? entry.score?.displayValue : entry.score)}]));
        return {id: event.id, date: new Date(event.date), state: competition?.status?.type?.state, ...sides};
      }).filter(game => game.state === 'post' && game.home && game.away && [game.home.code, game.away.code].includes(homeCode)).sort((a, b) => b.date - a.date).slice(0, 6);
      setContext({awayCode, homeCode, form: [formOf(games, awayCode), formOf(games, homeCode)], meetings, byCode});
    }).catch(() => setContext({awayCode, homeCode, form: [], meetings: [], byCode: new Map()}));
    const codes = [awayCode, homeCode];
    Promise.all(codes.map(code => fetch(`/data/2026-27/rosters/${code}.json`).then(response => response.json()))).then(async rosters => {
      const [season, pre] = await Promise.all([
        fetch(`/data/${rosters[0].statsSeason}/regular-season.json`).then(response => response.json()).catch(() => ({players: []})),
        fetch('/data/2026-27/preseason-starters.json').then(response => response.json()).catch(() => ({})),
      ]);
      const stats = new Map(season.players.map(player => [plain(player.playerName), player.stats]));
      setData(rosters.map((roster, index) => ({
        roster, code: codes[index], side: [box.away, box.home][index],
        five: roster.players.filter(player => player.unit === 'starters').map(player => ({...player, stats: stats.get(plain(player.name)) ?? null, pre: (pre[codes[index]] ?? []).find(item => item.espnId === player.espnId || plain(item.name) === plain(player.name))})),
        games: Math.max(0, ...(pre[codes[index]] ?? []).map(item => item.games)),
      })));
    }).catch(() => setData([]));
  }, [box]);
  if (!data) return <p className="gd-note">Loading the starting fives…</p>;
  const per = (player, key) => player.stats ? player.stats[key].toFixed(1) : '—';
  return <div className="gp-preview">
    <p className="gd-note">No box score yet. Starters are the five who started the most preseason games for each team.</p>
    {data.map(({roster, code, side, five, games}) => <section key={code} className="gp-side" style={{'--team': TEAMS[code].color}}>
      <h3>{side.logo && <img src={side.logo} alt=""/>}<span>{roster.teamName}<small>Expected starting five{games ? ` · ${games} preseason game${games === 1 ? '' : 's'}` : ''}</small></span></h3>
      <div className="starter-grid">{five.map(player => <div key={player.name} className="starter-card">
        <span className="starter-stage"><span className="slot-badge">{player.slot ?? player.pos}</span><Headshot player={player} className="starter-art"/></span>
        <h3>{player.name}</h3>
        <dl className="starter-line">
          <div><dt>PPG</dt><dd>{per(player, 'points')}</dd></div>
          <div><dt>RPG</dt><dd>{per(player, 'totalRebounds')}</dd></div>
          <div><dt>APG</dt><dd>{per(player, 'assists')}</dd></div>
        </dl>
        {player.pre && <small className="gp-started">Started {player.pre.starts} of {player.pre.games} preseason</small>}
      </div>)}</div>
      <p className="gd-meta">Per game, last season. {roster.coach ? `Coach: ${roster.coach}.` : ''}</p>
    </section>)}
    {context && <Context box={box} context={context}/>}
  </div>;
}


/* The matchup context: how the two teams compare, how each is playing, and how past meetings went. */
function Context({box, context}) {
  const {awayCode, homeCode, form, meetings, byCode} = context;
  const sides = [[awayCode, box.away], [homeCode, box.home]];
  const league = [...byCode.values()];
  const axes = league.length && byCode.get(awayCode) && byCode.get(homeCode) ? TEAM_AXES.map(([label, get, unit]) => ({label, sides: [awayCode, homeCode].map(code => {
    const values = league.map(get), low = Math.min(...values), high = Math.max(...values), value = get(byCode.get(code));
    const pct = Math.round(Math.max(0, Math.min(1, high > low ? (value - low) / (high - low) : .5)) * 100);
    return {pct, text: `${Math.abs(value).toFixed(1)} ${unit}`, rank: `${pct}% of the league range`};
  })})) : [];
  const wins = [0, 0];
  meetings.forEach(game => { const winner = game.home.score > game.away.score ? game.home.code : game.away.code; if (winner === awayCode) wins[0] += 1; else if (winner === homeCode) wins[1] += 1; });
  return <>
    {axes.length > 0 && <Radar axes={axes} names={sides.map(([, side]) => side.short)} colors={['var(--accent)', 'var(--text-1)']} scope="all 30 teams" notes={["Last season's team numbers, each scaled from the league's lowest to highest team, so distance shows how far apart these two really are."]}/>}
    <section className="gp-form">
      <h3>Recent form</h3>
      <div className="gp-form-grid">{sides.map(([code, side], index) => <div key={code}>
        <p className="gp-form-head">{side.logo && <img src={side.logo} alt=""/>}<b>{side.short}</b>{form[index]?.streak && <em className={form[index].streak.startsWith('W') ? 'win' : 'loss'}>{form[index].streak}</em>}</p>
        {form[index]?.results.length ? <ul>{form[index].results.map(result => <li key={result.id}>
          <span className={`gp-wl ${result.win ? 'win' : 'loss'}`}>{result.win ? 'W' : 'L'}</span>
          <span>{result.home ? 'vs' : '@'} {result.opp}{result.pre ? ' · Preseason' : ''}</span><strong>{result.us}–{result.them}</strong>
        </li>)}</ul> : <p className="gd-note">No games played yet.</p>}
      </div>)}</div>
    </section>
    <section className="gp-past">
      <h3>Past matchups</h3>
      {meetings.length ? <>
        <div className="gp-series">
          <div className="gp-series-side"><img src={box.away.logo} alt=""/><strong>{wins[0]}</strong><span>{box.away.short}</span></div>
          <div className="gp-series-bar" aria-hidden="true"><i style={{flex: wins[0] || 0.05}}/><i className="b" style={{flex: wins[1] || 0.05}}/></div>
          <div className="gp-series-side right"><span>{box.home.short}</span><strong>{wins[1]}</strong><img src={box.home.logo} alt=""/></div>
        </div>
        <p className="gd-meta gp-series-note">{wins[0] === wins[1] ? 'Dead even' : `${wins[0] > wins[1] ? box.away.short : box.home.short} lead`} over the last {meetings.length} meetings{meetings[0] ? ` · latest ${dayFormat.format(meetings[0].date)}` : ''}</p>
        <ul className="gp-meet">{meetings.map(game => {
          const homeWon = game.home.score > game.away.score, margin = Math.abs(game.home.score - game.away.score), winner = homeWon ? game.home : game.away;
          const logo = side => (side.code === awayCode ? box.away : box.home).logo;
          return <li key={game.id}>
            <span className="gp-meet-date"><b>{dayFormat.format(game.date)}</b><small>{TEAMS[winner.code]?.name.split(' ').pop()} by {margin}</small></span>
            <span className={`gp-meet-team${homeWon ? '' : ' won'}`}><img src={logo(game.away)} alt=""/><b>{game.away.score}</b></span>
            <span className="gp-at">at</span>
            <span className={`gp-meet-team${homeWon ? ' won' : ''}`}><b>{game.home.score}</b><img src={logo(game.home)} alt=""/></span>
          </li>;
        })}</ul>
      </> : <p className="gd-note">No recent regular-season meetings found.</p>}
    </section>
  </>;
}

export default function GamePage({id}) {
  const [box, setBox] = useState(undefined), [side, setSide] = useState(0), [more, setMore] = useState(false);
  useEffect(() => { loadBoxscore(id).then(setBox); }, [id]);

  /* Top three in each category across both teams; the leader (ties included) is what the box score highlights. */
  const leaders = useMemo(() => {
    if (!box?.teams?.length) return [];
    const everyone = box.teams.flatMap(team => team.players.filter(player => !player.out).map(player => ({...player, team: team.abbr})));
    return LEADS.map(([key, label]) => {
      const ranked = everyone.filter(player => num(player.stats[key]) > 0).sort((a, b) => num(b.stats[key]) - num(a.stats[key]) || num(b.stats.PTS) - num(a.stats.PTS));
      const top = ranked.length ? num(ranked[0].stats[key]) : 0;
      return {key, label, top, ranked: ranked.slice(0, 3), players: ranked.filter(player => num(player.stats[key]) === top)};
    }).filter(entry => entry.ranked.length);
  }, [box]);
  const led = useMemo(() => {
    const map = new Map();
    leaders.filter(entry => ['PTS', 'REB', 'AST'].includes(entry.key) && entry.players.length === 1).forEach(entry => map.set(`${entry.players[0].id}:${entry.key}`, true));
    return map;
  }, [leaders]);

  if (box === undefined) return <section className="gp"><p className="gd-note">Loading the game…</p></section>;
  if (!box?.away) return <section className="gp"><a className="gp-back" href="/schedule"><ArrowLeft size={15}/> Schedule</a><p className="gd-note">We couldn&apos;t load this game.</p></section>;

  const scored = box.state !== 'pre';
  const ordered = [...box.teams].sort((a, b) => (a.abbr === box.away.abbr ? 0 : 1) - (b.abbr === box.away.abbr ? 0 : 1));

  return <section className="gp">
    <a className="gp-back" href="/schedule"><ArrowLeft size={15}/> Schedule</a>
    <div className="gd-head gp-head">
      <div><img src={box.away.logo} alt=""/><b>{box.away.short}</b>{scored && <strong>{box.away.score}</strong>}</div>
      <span>{box.state === 'post' ? 'Final' : box.state === 'in' ? (box.detail || 'Live') : 'Upcoming'}</span>
      <div><img src={box.home.logo} alt=""/><b>{box.home.short}</b>{scored && <strong>{box.home.score}</strong>}</div>
    </div>
    <p className="gd-meta">{[box.date && dateFormat.format(new Date(box.date)), box.venue, box.tv, box.preseason ? 'Preseason' : ''].filter(Boolean).join(' · ')}</p>

    {box.state === 'pre' ? <Preview box={box}/> : <>
      <div className="gp-tabs" role="group" aria-label="Team">
        {ordered.map((team, index) => <button key={team.abbr} className={side === index ? 'active' : ''} onClick={() => setSide(index)}>{team.logo && <img src={team.logo} alt=""/>}{team.name}</button>)}
        <button className="gp-more-btn" onClick={() => setMore(open => !open)}>{more ? 'Fewer stats' : 'More stats'}</button>
      </div>
      {ordered[side] && (() => {
        const team = ordered[side], columns = more ? [...BASIC, ...EXTRA] : BASIC;
        const starters = team.players.filter(player => player.starter), bench = team.players.filter(player => !player.starter && !player.out), out = team.players.filter(player => !player.starter && player.out);
        const line = (player, face) => <tr key={player.id} className={face ? '' : 'bench'}>
          <td className="who"><span className="gp-name">{face && <Face player={player}/>}<span><b>{player.name}</b><small>{player.pos}</small></span></span></td>
          {columns.map(label => <td key={label} className={`num${led.has(`${player.id}:${label}`) ? ' led' : ''}`}>{player.stats[label] ?? '–'}</td>)}
        </tr>;
        return <section className="gd-team">
          <div className="gd-scroll"><table className="calm">
            <thead><tr><th className="who">Starters</th>{columns.map(label => <th key={label} className="num">{label}</th>)}</tr></thead>
            <tbody>
              {starters.map(player => line(player, true))}
              <tr className="gd-sub"><th className="who">Bench</th>{columns.map(label => <th key={label}/>)}</tr>
              {bench.map(player => line(player, false))}
              <tr className="gd-total"><td className="who"><b>Team</b></td>{columns.map(label => <td key={label} className="num">{['FG', '3PT', 'FT'].includes(label) ? team.totals[label] : ''}</td>)}</tr>
            </tbody>
          </table></div>
          {out.length > 0 && <p className="gd-out">Did not play: {out.map(player => player.name).join(', ')}</p>}
        </section>;
      })()}
      {ordered.length === 2 && <Radar axes={shapeAxes(ordered, ordered.map(team => team.abbr === box.away.abbr ? box.away.score : box.home.score))} names={ordered.map(team => team.abbr === box.away.abbr ? box.away.short : box.home.short)} colors={['var(--accent)', 'var(--text-1)']} scope="a typical NBA game" notes={['Each spoke runs from a low to a high night for that stat, so the shape shows how each team played, not season averages. Ball care rewards fewer turnovers.']}/>}
      {leaders.length > 0 && <div className="gp-leaders">{leaders.map(entry => <section key={entry.key} className="gp-leader">
        <small>{entry.label}</small>
        <ol>{entry.ranked.map((player, index) => <li key={player.id} className={index === 0 ? 'top' : num(player.stats[entry.key]) === entry.top ? 'tied' : ''}>
          <Face player={player} size={index === 0 ? 68 : 48}/>
          <span className="gp-who"><b>{player.short ?? player.name}</b><i>{player.team}</i></span><strong>{player.stats[entry.key]}</strong>
        </li>)}</ol>
      </section>)}</div>}
    </>}
  </section>;
}
