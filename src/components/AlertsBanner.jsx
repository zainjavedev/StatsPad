import React, { useEffect, useState } from 'react';
import { Bell } from 'lucide-react';
import { readAlerts } from '../lib/alerts';

/* Teams page nudge: follow teams freely, sign in for alerts. */
export default function AlertsBanner() {
  const [email, setEmail] = useState('');
  useEffect(() => { setEmail(readAlerts().emailAddress || ''); }, []);
  return <aside className="alerts-banner">
    <Bell size={18}/>
    <p>{email ? <>Game alerts are on for <b>{email}</b>.</> : 'Follow teams with the bell. Sign in to get their game alerts and keep your teams on every device.'}</p>
    <a className="acct-secondary" href={email ? '/account' : '/signin'}>{email ? 'Manage account' : 'Sign in'}</a>
  </aside>;
}
