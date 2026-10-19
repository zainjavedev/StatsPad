import React from 'react';
import { Bell, BellRing } from 'lucide-react';
import { toggleFavorite } from '../lib/favorites';
import { askForEmail, hasEmail } from '../lib/alerts';
import { TEAMS } from '../lib/teams';

export default function FavoriteStar({code, active, className = ''}) {
  const label = active ? `Stop game alerts for ${TEAMS[code].name}` : `Get game alerts for ${TEAMS[code].name}`;
  return <button type="button" className={`fav-star ${active ? 'on' : ''} ${className}`} onClick={() => (active || hasEmail() ? toggleFavorite(code) : askForEmail(code))} aria-pressed={active} aria-label={label} title={label}>
    {active ? <BellRing size={16} fill="currentColor"/> : <Bell size={16}/>}
  </button>;
}
