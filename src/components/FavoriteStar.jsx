import React from 'react';
import { Bell, BellRing } from 'lucide-react';
import { toggleFavorite } from '../lib/favorites';
import { TEAMS } from '../lib/teams';

export default function FavoriteStar({code, active, className = ''}) {
  const label = active ? `Unfollow ${TEAMS[code].name}` : `Follow ${TEAMS[code].name}`;
  return <button type="button" className={`fav-star ${active ? 'on' : ''} ${className}`} onClick={() => toggleFavorite(code)} aria-pressed={active} aria-label={label} title={label}>
    {active ? <BellRing size={16} fill="currentColor"/> : <Bell size={16}/>}
  </button>;
}
