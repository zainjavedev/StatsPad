import React, { useEffect, useMemo, useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { loadBoxscore } from '../lib/boxscore';
import Radar from './Radar';
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

function Expected({box}) {
  const [rosters, setRosters] = useState(null);
  useEffect(() => {
    Promise.all([box.away, box.home].map(side => fetch(`/data/2026-27/rosters/${codeOf(side.abbr)}.json`).then(response => response.json()))).then(setRosters).catch(() => setRosters([]));
  }, [box]);
  if (!rosters) return <p className="gd-note">Loading the starting fives…</p>;
  return <>
    <p className="gd-note">No box score yet. These are the expected starting fives, from ESPN&apos;s depth chart.</p>
    <div className="gd-fives">{rosters.map((roster, index) => <section key={index} className="gd-team">
      <h3><img src={[box.away, box.home][index].logo} alt=""/>{roster.teamName}</h3>
      <ul>{roster.players.filter(player => player.unit === 'starters').map(player => <li key={player.name}>
        <img className="gp-face" style={{width: 44, height: 44}} src={`https://a.espncdn.com/i/headshots/nba/players/full/${player.espnId}.png`} alt="" loading="lazy" onError={event => { event.currentTarget.style.visibility = 'hidden'; }}/>
        <span>{player.slot ?? player.pos}</span><b>{player.name}</b>
      </li>)}</ul>
    </section>)}</div>
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

    {box.state === 'pre' ? <Expected box={box}/> : <>
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
          <Face player={player} size={index === 0 ? 40 : 30}/>
          <span className="gp-who"><b>{player.short ?? player.name}</b><i>{player.team}</i></span><strong>{player.stats[entry.key]}</strong>
        </li>)}</ol>
      </section>)}</div>}
    </>}
  </section>;
}
