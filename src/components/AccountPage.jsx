import React, { useEffect, useRef, useState } from 'react';
import { Bell, BellRing, Eye, EyeOff, LogOut, Mail, ShieldCheck, Trash2 } from 'lucide-react';
import { useFavorites, toggleFavorite } from '../lib/favorites';
import { TEAMS } from '../lib/teams';
import { TeamLogo } from './TeamRail';
import { completeSignIn, disableAlerts, enableBrowserAlerts, logIn, pushSupported, readAlerts, sendSignInLink, setPassword, signInWithGoogle, signOut, signUp, syncAlertTeams } from '../lib/alerts';

const GOOGLE_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
const PERKS = [[BellRing, 'Game alerts', 'Tip-off and final-score emails for your favorite teams.'], [Bell, 'Browser notifications', 'Optional pings on this device, even when StatsPads is closed.'], [ShieldCheck, 'Your teams everywhere', 'Sign in on any browser and your followed teams are already there.']];

/* Sign in, create an account, and manage it. Following a team never needs an account;
   alerts and syncing across devices do. */
export default function AccountPage({onTeams}) {
  const favorites = useFavorites();
  const [saved, setSaved] = useState(null), [mode, setMode] = useState('in'), [email, setEmail] = useState(''), [password, setPasswordText] = useState(''), [show, setShow] = useState(false);
  const [newPassword, setNewPassword] = useState(''), [busy, setBusy] = useState(false), [note, setNote] = useState({}), [supported, setSupported] = useState(false);
  const googleButton = useRef(null);
  const signedIn = Boolean(saved?.email);

  const run = async (area, task) => {
    setBusy(true); setNote({});
    try { setNote({[area]: {text: await task(), ok: true}}); } catch (error) { setNote({[area]: {text: error.message, ok: false}}); }
    setSaved(readAlerts()); setBusy(false);
  };
  const say = area => note[area] && <p className={`acct-note ${note[area].ok ? 'ok' : 'bad'}`} role="status">{note[area].text}</p>;

  useEffect(() => {
    setSaved(readAlerts()); setSupported(pushSupported());
    const params = new URLSearchParams(window.location.search);
    if (window.location.pathname === '/signin' && readAlerts().email) window.history.replaceState(null, '', '/account');
    const code = params.get('signin');
    if (code) {
      window.history.replaceState(null, '', '/account');
      run('auth', async () => { await completeSignIn(code); return 'Signed in. Your teams are back. If you forgot your password, set a new one below.'; });
    }
  }, []);
  useEffect(() => { if (signedIn) syncAlertTeams(favorites); }, [favorites, signedIn]);
  useEffect(() => { if (signedIn) window.history.replaceState(null, '', '/account'); }, [signedIn]);

  useEffect(() => {
    if (saved === null || signedIn || !GOOGLE_ID) return;
    const render = () => {
      window.google.accounts.id.initialize({client_id: GOOGLE_ID, callback: ({credential}) => run('auth', async () => { await signInWithGoogle(credential); return 'Signed in with Google.'; })});
      if (googleButton.current) window.google.accounts.id.renderButton(googleButton.current, {theme: 'outline', size: 'large', text: 'continue_with', shape: 'pill', width: 320});
    };
    if (window.google?.accounts?.id) return render();
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.onload = render;
    document.head.appendChild(script);
  }, [saved, signedIn]);

  if (saved === null) return <section className="acct"><div className="acct-card"><p>Loading…</p></div></section>;

  if (!signedIn) return <section className="acct">
    <aside className="acct-side">
      <h1>{mode === 'up' ? 'Create your StatsPads account' : 'Welcome back'}</h1>
      <p>Follow teams with no account. Sign in when you want alerts and your teams on every device.</p>
      <ul>{PERKS.map(([Icon, title, text]) => <li key={title}><Icon size={20}/><div><b>{title}</b><span>{text}</span></div></li>)}</ul>
    </aside>
    <div className="acct-card">
      <div className="acct-tabs" role="tablist">
        {[['in', 'Sign in'], ['up', 'Create account']].map(([key, label]) => <button key={key} role="tab" aria-selected={mode === key} className={mode === key ? 'on' : ''} onClick={() => { setMode(key); setNote({}); }}>{label}</button>)}
      </div>
      {GOOGLE_ID && <div className="acct-google" ref={googleButton}/>}
      <div className="acct-divider"><span>or with email</span></div>
      <form onSubmit={event => { event.preventDefault(); run('auth', async () => {
        if (mode === 'up') { await signUp(email, password); return `Account created. Click the link we emailed to ${email} to start alerts.`; }
        await logIn(email, password);
        return 'Signed in.';
      }); }}>
        <label>Email<input type="email" required value={email} onChange={event => setEmail(event.target.value)} placeholder="you@email.com" autoComplete="email"/></label>
        <label>Password
          <span className="acct-pass">
            <input type={show ? 'text' : 'password'} required minLength={mode === 'up' ? 8 : undefined} value={password} onChange={event => setPasswordText(event.target.value)} placeholder={mode === 'up' ? 'At least 8 characters' : 'Your password'} autoComplete={mode === 'up' ? 'new-password' : 'current-password'}/>
            <button type="button" onClick={() => setShow(!show)} aria-label={show ? 'Hide password' : 'Show password'}>{show ? <EyeOff size={16}/> : <Eye size={16}/>}</button>
          </span>
        </label>
        {mode === 'in' && <button type="button" className="acct-link" disabled={busy || !email} onClick={() => run('auth', async () => { await sendSignInLink(email); return `If ${email} has an account, a sign-in link is on its way.`; })}>Forgot password? Email me a sign-in link</button>}
        <button className="acct-primary" disabled={busy}>{busy ? 'One moment…' : mode === 'up' ? 'Create account' : 'Sign in'}</button>
      </form>
      {say('auth')}
      <p className="acct-fine">By continuing you agree to our <a href="/privacy">privacy policy</a>.</p>
    </div>
  </section>;

  return <section className="acct acct-in">
    <div className="acct-head">
      <span className="acct-avatar">{saved.emailAddress?.[0]?.toUpperCase()}</span>
      <div><h1>Your account</h1><p>{saved.emailAddress}</p></div>
    </div>
    {say('auth')}
    <div className="acct-grid">
      <div className="acct-card">
        <h2>Favorite teams</h2>
        {favorites.length
          ? <ul className="acct-teams">{favorites.map(code => <li key={code}><TeamLogo code={code} className="acct-logo"/><span>{TEAMS[code].name}</span><button onClick={() => toggleFavorite(code)} aria-label={`Remove ${TEAMS[code].name} from favorites`}>Remove</button></li>)}</ul>
          : <p className="acct-empty">No favorite teams yet.</p>}
        <button className="acct-secondary" onClick={onTeams}>{favorites.length ? 'Add more teams' : 'Pick your teams'}</button>
      </div>
      <div className="acct-card">
        <h2>Alerts</h2>
        <p><Mail size={15}/> Email alerts to {saved.emailAddress} when your teams tip off and finish.</p>
        {supported && (saved.push
          ? <button className="acct-secondary" disabled={busy} onClick={() => run('alerts', async () => { await disableAlerts('push'); return 'Browser alerts are off.'; })}>Turn off browser alerts</button>
          : <button className="acct-secondary" disabled={busy || !favorites.length} onClick={() => run('alerts', async () => { await enableBrowserAlerts(favorites); return 'Browser alerts are on.'; })}>Also alert me in this browser</button>)}
        {say('alerts')}
      </div>
      <div className="acct-card">
        <h2>Password</h2>
        <form onSubmit={event => { event.preventDefault(); run('password', async () => { await setPassword(newPassword); setNewPassword(''); return 'Password saved.'; }); }}>
          <label>Set or change password<input type="password" required minLength={8} value={newPassword} onChange={event => setNewPassword(event.target.value)} placeholder="At least 8 characters" autoComplete="new-password"/></label>
          <button className="acct-secondary" disabled={busy}>Save password</button>
        </form>
        {say('password')}
      </div>
      <div className="acct-card">
        <h2>Session</h2>
        <button className="acct-secondary" disabled={busy} onClick={() => { signOut(); setSaved(readAlerts()); window.history.replaceState(null, '', '/signin'); }}><LogOut size={15}/> Sign out on this browser</button>
        <button className="acct-danger" disabled={busy} onClick={() => { if (window.confirm('Delete your account and all alerts? This cannot be undone.')) run('session', async () => { await disableAlerts('email'); window.history.replaceState(null, '', '/signin'); return 'Your account and alerts are deleted.'; }); }}><Trash2 size={15}/> Delete my account</button>
        {say('session')}
      </div>
    </div>
  </section>;
}
