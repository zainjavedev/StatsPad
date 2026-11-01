'use client';
import React, { useEffect, useState } from 'react';
import { BarChart3, User } from 'lucide-react';
import { readAlerts } from '../lib/alerts';
import { useIsAdmin } from '../lib/admin';
import './admin-link.css';

/* The header's account link: Sign in when signed out, the email's name when signed in. The owner also gets a link to /admin beside it. */
export default function AccountButton() {
  const [email, setEmail] = useState(''), [picture, setPicture] = useState(''), [broken, setBroken] = useState(false), admin = useIsAdmin();
  useEffect(() => {
    const update = () => { const saved = readAlerts(); setEmail(saved.emailAddress || ''); setPicture(saved.picture || ''); setBroken(false); };
    update();
    window.addEventListener('statspad:alerts', update);
    window.addEventListener('storage', update);
    return () => { window.removeEventListener('statspad:alerts', update); window.removeEventListener('storage', update); };
  }, []);
  return <>{admin && <a className="theme-toggle admin-link" href="/admin" aria-label="Activity dashboard" title="Activity dashboard"><BarChart3 size={16}/></a>}<a className={`account-btn ${email ? 'signed-in' : 'signed-out'}`} href={email ? '/account' : '/signin'} aria-label={email ? `Account: ${email}` : 'Sign in'} title={email || 'Sign in'}>
    {email ? (picture && !broken ? <img className="account-photo" src={picture} alt="" referrerPolicy="no-referrer" onError={() => setBroken(true)}/> : <b className="account-initial">{email[0].toUpperCase()}</b>) : <User size={16}/>}<span>{email ? email.split('@')[0] : 'Sign in'}</span>
  </a></>;
}
