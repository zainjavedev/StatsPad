import React from 'react';
import { TEAMS, logoUrl, nickname } from '../lib/teams';

export function TeamLogo({code, className}) {
  return <img className={className} src={logoUrl(code)} alt="" loading="lazy" onError={event => { event.currentTarget.style.visibility = 'hidden'; }}/>;
}

/* Every club in one column beside a roster, so you can hop between teams
   without going back. On phones it folds into a scrolling strip. */
export default function TeamRail({current, onPick}) {
  return <nav className="team-rail" aria-label="All teams">
    <h3>All teams</h3>
    <ul>{Object.entries(TEAMS).map(([code, team]) => <li key={code}>
      <button className={code === current ? 'active' : ''} onClick={() => onPick(code)} aria-current={code === current ? 'page' : undefined} title={team.name}>
        <TeamLogo code={code} className="team-rail-logo"/>
        <span>{nickname(code)}</span>
      </button>
    </li>)}</ul>
  </nav>;
}
