'use client';
import React, { useEffect, useState } from 'react';
import { User } from 'lucide-react';
import { readAlerts } from '../lib/alerts';

/* The header's account link: Sign in when signed out, the email's name when signed in. */
export default function AccountButton() {
  const [email, setEmail] = useState(''), [picture, setPicture] = useState(''), [broken, setBroken] = useState(false);
  useEffect(() => {
    const update = () => { const saved = readAlerts(); setEmail(saved.emailAddress || ''); setPicture(saved.picture || ''); setBroken(false); };
    update();
    window.addEventListener('statspad:alerts', update);
    window.addEventListener('storage', update);
    return () => { window.removeEventListener('statspad:alerts', update); window.removeEventListener('storage', update); };
  }, []);
  return <a className={`account-btn ${email ? 'signed-in' : 'signed-out'}`} href={email ? '/account' : '/signin'} aria-label={email ? `Account: ${email}` : 'Sign in'} title={email || 'Sign in'}>
    {email ? (picture && !broken ? <img className="account-photo" src={picture} alt="" referrerPolicy="no-referrer" onError={() => setBroken(true)}/> : <b className="account-initial">{email[0].toUpperCase()}</b>) : <User size={16}/>}<span>{email ? email.split('@')[0] : 'Sign in'}</span>
  </a>;
}
