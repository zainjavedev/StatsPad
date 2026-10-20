import React from 'react';
import { Star } from 'lucide-react';
import { toggleFavorite } from '../lib/favorites';
import { TEAMS } from '../lib/teams';

export default function FavoriteStar({code, active, className = ''}) {
  const label = active ? `Remove ${TEAMS[code].name} from favorites` : `Add ${TEAMS[code].name} to favorites`;
  return <button type="button" className={`fav-star ${active ? 'on' : ''} ${className}`} onClick={() => toggleFavorite(code)} aria-pressed={active} aria-label={label} title={label}>
    <Star size={16} fill={active ? 'currentColor' : 'none'}/>
  </button>;
}
