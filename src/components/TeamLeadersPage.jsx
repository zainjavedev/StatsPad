import React, { useEffect, useMemo, useState } from 'react';
import { TEAM_LEADERS, rankTeams, showValue, teamStatUrl } from '../lib/teamLeaders';
import { TEAMS, espnLogoUrl } from '../lib/teams';
import { teamUrl } from '../lib/routes';
import { navigate } from '../lib/nav';

/* Every team ranked on one stat, in the same layout as the player leaders. */

const load = () => fetch('/data/2026-27/teams-regular-season.json').then(response => (response.ok ? response.json() : null)).then(data => (Array.isArray(data?.players) ? data.players.filter(team => team.gamesPlayed > 0) : [])).catch(() => []);

/* Players | Teams, shared by both leader pages. */
export const LeadersSwitch = ({active}) => <div className="inj-tabs lead-switch" role="group" aria-label="Leaders for">
  <button className={active === 'players' ? 'active' : ''} onClick={() => navigate('/stats/points')}>Players</button>
  <button className={active === 'teams' ? 'active' : ''} onClick={() => navigate('/stats/teams')}>Teams</button>
</div>;

export default function TeamLeadersPage({slug}) {
  const [teams, setTeams] = useState(null);
  useEffect(() => { load().then(setTeams); }, []);
  const entry = TEAM_LEADERS.find(item => item.slug === slug) || TEAM_LEADERS[0];
  const ranked = useMemo(() => (teams ? rankTeams(entry, teams) : null), [teams, entry]);
  return <section className="statpage">
    <LeadersSwitch active="teams"/>
    <h1>{entry.label} leaders</h1>
    <p>{entry.unit}{entry.note ? ` · ${entry.note.replace('&rsquo;', '’')}` : ''} · per game, all {ranked ? ranked.length : 30} teams</p>
    <div className="statpage-tabs" role="group" aria-label="Stat">{TEAM_LEADERS.map(item => <button key={item.slug} className={item.slug === entry.slug ? 'active' : ''} onClick={() => navigate(teamStatUrl(item.slug))}>{item.label}</button>)}</div>
    {ranked && !ranked.length && <p>No team has played a game yet.</p>}
    <ol className="statpage-list">{(ranked ?? []).map((team, index) => {
      const code = team.team, color = TEAMS[code]?.color || '#8a8a8a';
      return <li key={code} className={index < 3 ? `top top-${index + 1}` : ''} style={{'--tc': color}}>
        <button onClick={() => navigate(teamUrl(code))}>
          <span className="statpage-rank">{index + 1}</span>
          <img className="statpage-art team-logo" src={espnLogoUrl(code)} alt=""/>
          <span className="statpage-who"><b>{team.playerName}</b><small>{team.gamesPlayed} {team.gamesPlayed === 1 ? 'game' : 'games'}</small></span>
          <strong>{showValue(entry, entry.value(team.stats))}<small>{entry.unit}</small></strong>
        </button>
      </li>;
    })}</ol>
  </section>;
}
