import React, { useEffect, useState } from 'react';
import { Bell } from 'lucide-react';
import { readAlerts } from '../lib/alerts';

/* Teams page nudge: follow teams freely, sign in for tip-off alerts and to sync them. */
export default function AlertsBanner() {
  const [email, setEmail] = useState('');
  useEffect(() => { setEmail(readAlerts().emailAddress || ''); }, []);
  return <aside className="alerts-banner">
    <Bell size={18}/>
    <p>{email ? <>Tip-off alerts are on for <b>{email}</b>.</> : 'Tap the bell on your favorite teams. Sign in to get tip-off alerts and keep your favorites on every device.'}</p>
    <a className="acct-secondary" href={email ? '/account' : '/signin'}>{email ? 'Manage account' : 'Sign in'}</a>
  </aside>;
}
