import React from 'react';
import { Bell, BellRing } from 'lucide-react';
import { toggleFavorite } from '../lib/favorites';
import { readAlerts } from '../lib/alerts';
import { navigate } from '../lib/nav';
import { TEAMS } from '../lib/teams';

/* Following a team needs an account: signed out, the bell sends you to sign in. A team you already follow can always be switched off. */
export default function FavoriteStar({code, active, className = ''}) {
  const signedIn = Boolean(readAlerts().email);
  const label = active ? `Turn off ${TEAMS[code].name} tip-off alerts` : signedIn ? `Get ${TEAMS[code].name} tip-off alerts` : `Sign in for ${TEAMS[code].name} tip-off alerts`;
  const onClick = () => { if (active || signedIn) toggleFavorite(code); else navigate('/signin'); };
  return <button type="button" className={`fav-star ${active ? 'on' : ''} ${className}`} onClick={onClick} aria-pressed={active} aria-label={label} title={label}>
    {active ? <BellRing size={16} fill="currentColor"/> : <Bell size={16}/>}
  </button>;
}
