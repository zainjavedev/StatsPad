import React from 'react';
import { ArrowRight } from 'lucide-react';
import { TEAMS } from '../lib/teams';
import { favoritesFirst, useFavorites } from '../lib/favorites';
import { TeamLogo } from './TeamRail';
import FavoriteStar from './FavoriteStar';
import AlertsPanel from './AlertsPanel';

export default function TeamsIndex({onOpen}) {
  const favorites = useFavorites();
  return <section className="teams-index">
    <div className="teams-index-head">
      <h1>Teams</h1>
      <p>All 30 clubs. Pick one to see its 2026–27 roster, expected rotation, last season&apos;s numbers and recent games. Star a team to keep it at the top.</p>
    </div>
    <AlertsPanel/>
    <div className="teams-index-grid">{favoritesFirst(favorites).map(code => <div key={code} className="team-tile-wrap">
      <button className="team-tile" style={{'--team': TEAMS[code].color}} onClick={() => onOpen(code)}>
        <TeamLogo code={code} className="team-tile-logo"/>
        <b>{TEAMS[code].name}</b>
        <span>View roster <ArrowRight size={14}/></span>
      </button>
      <FavoriteStar code={code} active={favorites.includes(code)} className="on-tile"/>
    </div>)}</div>
  </section>;
}
