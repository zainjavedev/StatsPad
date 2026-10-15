import React from 'react';
import { ArrowRight } from 'lucide-react';
import { TEAMS } from '../lib/teams';
import { TeamLogo } from './TeamRail';

export default function TeamsIndex({onOpen}) {
  return <section className="teams-index">
    <div className="teams-index-head">
      <h1>Teams</h1>
      <p>All 30 clubs. Pick one to see its 2026–27 roster, expected rotation, last season&apos;s numbers and recent games.</p>
    </div>
    <div className="teams-index-grid">{Object.entries(TEAMS).map(([code, team]) => <button key={code} className="team-tile" style={{'--team': team.color}} onClick={() => onOpen(code)}>
      <TeamLogo code={code} className="team-tile-logo"/>
      <b>{team.name}</b>
      <span>View roster <ArrowRight size={14}/></span>
    </button>)}</div>
  </section>;
}
