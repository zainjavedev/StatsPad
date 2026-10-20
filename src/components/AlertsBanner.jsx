import React, { useEffect, useState } from 'react';
import { Star } from 'lucide-react';
import { readAlerts } from '../lib/alerts';

/* Teams page nudge: follow teams freely, sign in for alerts. */
export default function AlertsBanner() {
  const [email, setEmail] = useState('');
  useEffect(() => { setEmail(readAlerts().emailAddress || ''); }, []);
  return <aside className="alerts-banner">
    <Star size={18}/>
    <p>{email ? <>Game alerts are on for <b>{email}</b>.</> : 'Star your favorite teams. Sign in to get their game alerts and keep your favorites on every device.'}</p>
    <a className="acct-secondary" href={email ? '/account' : '/signin'}>{email ? 'Manage account' : 'Sign in'}</a>
  </aside>;
}
