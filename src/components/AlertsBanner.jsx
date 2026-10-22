import React, { useEffect, useState } from 'react';
import { Star } from 'lucide-react';
import { readAlerts } from '../lib/alerts';

/* Teams page nudge: follow teams freely, sign in to sync them. */
export default function AlertsBanner() {
  const [email, setEmail] = useState('');
  useEffect(() => { setEmail(readAlerts().emailAddress || ''); }, []);
  return <aside className="alerts-banner">
    <Star size={18}/>
    <p>{email ? <>Signed in as <b>{email}</b>.</> : 'Star your favorite teams. Sign in to keep your favorites on every device.'}</p>
    <a className="acct-secondary" href={email ? '/account' : '/signin'}>{email ? 'Manage account' : 'Sign in'}</a>
  </aside>;
}
