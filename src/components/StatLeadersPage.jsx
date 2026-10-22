import React, { useMemo } from 'react';
import { ArrowLeft } from 'lucide-react';
import { LEADERS } from '../lib/statLeaders';
import { qualified } from '../lib/season';
import { navigate } from '../lib/nav';
import { TEAMS, espnLogoUrl, teamCodeOf } from '../lib/teams';

/* Everyone ranked on one stat: a long list of cards, the top three set apart. */

const SHOWN = 100;

export default function StatLeadersPage({slug, players, playerIds, Art, onOpen}) {
  const entry = LEADERS.find(item => item.slug === slug) || LEADERS[0];
  const ranked = useMemo(() => {
    const pool = qualified(players), base = pool.length ? pool : players;
    const eligible = entry.min ? base.filter(player => player.stats[entry.min[0]] >= entry.min[1]) : base;
    return [...eligible].sort((a, b) => b.stats[entry.key] - a.stats[entry.key] || a.playerName.localeCompare(b.playerName)).slice(0, SHOWN);
  }, [players, entry]);
  const value = player => `${player.stats[entry.key].toFixed(1)}${entry.pct ? '%' : ''}`;
  const rank = ranked.map((_, index) => index + 1); // ties run in alphabetical order, each with its own number
  return <section className="statpage">
    <button className="statpage-back" onClick={() => navigate('/')}><ArrowLeft size={15}/> Home</button>
    <h1>{entry.label} leaders</h1>
    <p>{entry.unit} · top {ranked.length}</p>
    <div className="statpage-tabs" role="group" aria-label="Stat">{LEADERS.map(item => <button key={item.slug} className={item.slug === entry.slug ? 'active' : ''} onClick={() => navigate(`/stats/${item.slug}`)}>{item.label}</button>)}</div>
    <ol className="statpage-list">{ranked.map((player, index) => {
      const code = teamCodeOf(player.team), color = TEAMS[code]?.color || '#8a8a8a';
      return <li key={player.playerId} className={rank[index] <= 3 ? `top top-${rank[index]}` : ''} style={{'--tc': color}}>
        <button onClick={() => onOpen(player)}>
          <span className="statpage-rank">{rank[index]}</span>
          <Art entity={player} playerIds={playerIds} className="statpage-art"/>
          <span className="statpage-who"><b>{player.playerName}</b><small>{code && <img src={espnLogoUrl(code)} alt=""/>}{player.team}</small></span>
          <strong>{value(player)}<small>{entry.unit}</small></strong>
        </button>
      </li>;
    })}</ol>
  </section>;
}
