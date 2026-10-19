import React, { useEffect, useState } from 'react';
import { TEAMS, espnLogoUrl, logoUrl, nickname } from '../lib/teams';
import { favoritesFirst, useFavorites } from '../lib/favorites';

export function TeamLogo({code, className}) {
  const sources = [logoUrl(code), espnLogoUrl(code)];
  const [step, setStep] = useState(0);
  useEffect(() => setStep(0), [code]);
  if (step >= sources.length) return <i className={className} aria-hidden="true"/>;
  return <img className={className} src={sources[step]} alt="" loading="lazy" onError={() => setStep(current => current + 1)}/>;
}

/* Every club in one column beside a roster, so you can hop between teams
   without going back. Favourites sit at the top. On phones it folds into a
   scrolling strip. */
export default function TeamRail({current, onPick}) {
  const favorites = useFavorites();
  return <nav className="team-rail" aria-label="All teams">
    <h3>{favorites.length ? 'Favorites & all teams' : 'All teams'}</h3>
    <ul>{favoritesFirst(favorites).map(code => <li key={code} className={favorites.includes(code) ? 'fav' : ''}>
      <button className={code === current ? 'active' : ''} onClick={() => onPick(code)} aria-current={code === current ? 'page' : undefined} title={TEAMS[code].name}>
        <TeamLogo code={code} className="team-rail-logo"/>
        <span>{nickname(code)}</span>
      </button>
    </li>)}</ul>
  </nav>;
}
