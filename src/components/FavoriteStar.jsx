import React from 'react';
import { Star } from 'lucide-react';
import { toggleFavorite } from '../lib/favorites';
import { readAlerts } from '../lib/alerts';
import { navigate } from '../lib/nav';
import { TEAMS } from '../lib/teams';

/* Following a team needs an account: signed out, the star sends you to sign in. A team you already follow can always be unstarred. */
export default function FavoriteStar({code, active, className = ''}) {
  const signedIn = Boolean(readAlerts().email);
  const label = active ? `Remove ${TEAMS[code].name} from favorites` : signedIn ? `Add ${TEAMS[code].name} to favorites` : `Sign in to follow ${TEAMS[code].name}`;
  const onClick = () => { if (active || signedIn) toggleFavorite(code); else navigate('/signin'); };
  return <button type="button" className={`fav-star ${active ? 'on' : ''} ${className}`} onClick={onClick} aria-pressed={active} aria-label={label} title={label}>
    <Star size={16} fill={active ? 'currentColor' : 'none'}/>
  </button>;
}
