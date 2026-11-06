'use client';
import React, { useEffect, useState } from 'react';
import { BarChart3, Check, Link2, User } from 'lucide-react';
import { loadProfile, readAlerts } from '../lib/alerts';
import { useIsAdmin } from '../lib/admin';
import './admin-link.css';

/* The owner's copy-link button: the page's address without tracking tags, ready to paste into a post. */
function CopyLink() {
  const [done, setDone] = useState(false);
  const copy = () => {
    const url = new URL(location.href);
    [...url.searchParams.keys()].filter(key => key.startsWith('utm_')).forEach(key => url.searchParams.delete(key));
    navigator.clipboard?.writeText(url.toString()).then(() => { setDone(true); setTimeout(() => setDone(false), 1500); }).catch(() => {});
  };
  return <button type="button" className="theme-toggle admin-link" onClick={copy} aria-label={done ? 'Link copied' : 'Copy link to this page'} title={done ? 'Copied' : 'Copy link'}>{done ? <Check size={16}/> : <Link2 size={16}/>}</button>;
}

/* The header's account link: Sign in when signed out; signed in, the saved display name (else the email's name). The owner also gets a copy-link button and a link to /admin beside it. */
export default function AccountButton() {
  const [email, setEmail] = useState(''), [name, setName] = useState(''), [picture, setPicture] = useState(''), [broken, setBroken] = useState(false), admin = useIsAdmin();
  useEffect(() => {
    const update = () => { const saved = readAlerts(); setEmail(saved.emailAddress || ''); setName(saved.profileName || ''); setPicture(('profilePhoto' in saved ? saved.profilePhoto : saved.picture) || ''); setBroken(false); };
    update();
    /* Once per visit, bring the saved display name and photo up to date (they may have been changed on another device). */
    let fresh = false;
    try { fresh = sessionStorage.getItem('statspad-profile-checked') === '1'; sessionStorage.setItem('statspad-profile-checked', '1'); } catch { /* private mode */ }
    if (!fresh && readAlerts().email) loadProfile();
    window.addEventListener('statspad:alerts', update);
    window.addEventListener('storage', update);
    return () => { window.removeEventListener('statspad:alerts', update); window.removeEventListener('storage', update); };
  }, []);
  return <>{admin && <CopyLink/>}{admin && <a className="theme-toggle admin-link" href="/admin" aria-label="Activity dashboard" title="Activity dashboard"><BarChart3 size={16}/></a>}<a className={`account-btn ${email ? 'signed-in' : 'signed-out'}`} href={email ? '/account' : '/signin'} aria-label={email ? `Account: ${email}` : 'Sign in'} title={email || 'Sign in'}>
    {email ? (picture && !broken ? <img className="account-photo" src={picture} alt="" referrerPolicy="no-referrer" onError={() => setBroken(true)}/> : <b className="account-initial">{(name || email)[0].toUpperCase()}</b>) : <User size={16}/>}<span>{email ? name || email.split('@')[0] : 'Sign in'}</span>
  </a></>;
}
