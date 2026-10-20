import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { loadBoxscore } from '../lib/boxscore';
import { TEAMS } from '../lib/teams';

/* A game's details in a dialog: the score, each team's starting five and the full box score. Before tip-off
   there are no stats yet, so it shows the expected starting fives from the roster files. */

const COLUMNS = ['MIN', 'PTS', 'REB', 'AST', 'STL', 'BLK', 'FG', '3PT', 'FT', 'TO', '+/-'];
const codeOf = abbr => Object.keys(TEAMS).find(code => TEAMS[code].espn === String(abbr).toLowerCase());

function Lines({team}) {
  const starters = team.players.filter(player => player.starter), bench = team.players.filter(player => !player.starter && !player.out), out = team.players.filter(player => !player.starter && player.out);
  const row = player => <tr key={player.id}><td className="who"><b>{player.name}</b><small>{player.pos}</small></td>{COLUMNS.map(label => <td key={label} className="num">{player.stats[label] ?? '–'}</td>)}</tr>;
  return <section className="gd-team">
    <h3>{team.logo && <img src={team.logo} alt=""/>}{team.name}</h3>
    <div className="gd-scroll">
      <table>
        <thead><tr><th className="who">Starters</th>{COLUMNS.map(label => <th key={label} className="num">{label}</th>)}</tr></thead>
        <tbody>
          {starters.map(row)}
          <tr className="gd-sub"><th className="who">Bench</th>{COLUMNS.map(label => <th key={label}/>)}</tr>
          {bench.map(row)}
          <tr className="gd-total"><td className="who"><b>Team</b></td>{COLUMNS.map(label => <td key={label} className="num">{label === 'FG' ? team.totals.FG : label === '3PT' ? team.totals['3PT'] : label === 'FT' ? team.totals.FT : ''}</td>)}</tr>
        </tbody>
      </table>
    </div>
    {out.length > 0 && <p className="gd-out">Did not play: {out.map(player => player.name).join(', ')}</p>}
  </section>;
}

function Expected({game}) {
  const [rosters, setRosters] = useState(null);
  useEffect(() => {
    Promise.all([game.away.code, game.home.code].map(code => fetch(`/data/2026-27/rosters/${code}.json`).then(response => response.json()))).then(setRosters).catch(() => setRosters([]));
  }, [game]);
  if (!rosters) return <p className="gd-note">Loading the starting fives…</p>;
  return <>
    <p className="gd-note">No box score yet. These are the expected starting fives, from ESPN&apos;s depth chart.</p>
    <div className="gd-fives">{rosters.map((roster, index) => <section key={roster.team ?? index} className="gd-team">
      <h3><img src={[game.away, game.home][index].logo} alt=""/>{roster.teamName}</h3>
      <ul>{roster.players.filter(player => player.unit === 'starters').map(player => <li key={player.name}><span>{player.slot ?? player.pos}</span><b>{player.name}</b></li>)}</ul>
    </section>)}</div>
  </>;
}

export default function GameDetail({game, onClose}) {
  const [box, setBox] = useState(undefined);
  useEffect(() => {
    setBox(undefined);
    if (game.state === 'pre') return;
    loadBoxscore(game.id).then(setBox);
  }, [game]);
  useEffect(() => {
    const close = event => { if (event.key === 'Escape') onClose(); };
    window.addEventListener('keydown', close);
    return () => window.removeEventListener('keydown', close);
  }, [onClose]);

  const scored = game.state !== 'pre';
  const ordered = box?.teams?.length ? [...box.teams].sort((a, b) => (a.abbr === game.away.abbr ? 0 : 1) - (b.abbr === game.away.abbr ? 0 : 1)) : [];
  return <div className="gate-backdrop" onClick={onClose}>
    <div className="gd" role="dialog" aria-modal="true" aria-label="Game details" onClick={event => event.stopPropagation()}>
      <button type="button" className="gate-close" onClick={onClose} aria-label="Close"><X size={18}/></button>
      <div className="gd-head">
        <div><img src={game.away.logo} alt=""/><b>{game.away.name}</b>{scored && <strong>{game.away.score}</strong>}</div>
        <span>{game.state === 'post' ? 'Final' : game.state === 'in' ? (game.detail || 'Live') : 'Upcoming'}</span>
        <div><img src={game.home.logo} alt=""/><b>{game.home.name}</b>{scored && <strong>{game.home.score}</strong>}</div>
      </div>
      <p className="gd-meta">{[game.venue, game.tv, game.preseason ? 'Preseason' : ''].filter(Boolean).join(' · ')}</p>
      {game.state === 'pre'
        ? <Expected game={{...game, away: {...game.away, code: game.away.code ?? codeOf(game.away.abbr)}, home: {...game.home, code: game.home.code ?? codeOf(game.home.abbr)}}}/>
        : box === undefined ? <p className="gd-note">Loading the box score…</p>
          : ordered.length ? ordered.map(team => <Lines key={team.abbr} team={team}/>)
            : <p className="gd-note">The box score isn&apos;t available for this game.</p>}
    </div>
  </div>;
}
