import React, { useEffect, useRef, useState } from 'react';
import { Bell, BellOff } from 'lucide-react';
import { useFavorites } from '../lib/favorites';
import { completeSignIn, disableAlerts, enableBrowserAlerts, logIn, pushSupported, readAlerts, sendSignInLink, setPassword, signInWithGoogle, signOut, signUp, syncAlertTeams } from '../lib/alerts';

const GOOGLE_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

/* Following a team needs nothing. Game alerts need an account, which is just a verified email:
   sign in with Google or an email and password. Browser notifications are an extra on top. */
export default function AlertsPanel() {
  const favorites = useFavorites();
  const [saved, setSaved] = useState({}), [email, setEmail] = useState(''), [password, setPasswordText] = useState(''), [mode, setMode] = useState('in'), [newPassword, setNewPassword] = useState(''), [busy, setBusy] = useState(false), [note, setNote] = useState(''), [supported, setSupported] = useState(false);
  const googleButton = useRef(null);
  const signedIn = Boolean(saved.email);

  const run = async (task, done) => {
    setBusy(true); setNote('');
    try { setNote(await task() || done); } catch (error) { setNote(error.message); }
    setSaved(readAlerts()); setBusy(false);
  };

  useEffect(() => {
    setSaved(readAlerts()); setSupported(pushSupported());
    const code = new URLSearchParams(window.location.search).get('signin');
    if (code) {
      window.history.replaceState(null, '', window.location.pathname);
      run(async () => { await completeSignIn(code); return 'Signed in. Your teams are back.'; });
    }
  }, []);
  /* The server keeps its own copy of the teams; follow or unfollow and it does too. */
  useEffect(() => { if (signedIn) syncAlertTeams(favorites); }, [favorites, signedIn]);

  useEffect(() => {
    if (signedIn || !GOOGLE_ID) return;
    const render = () => {
      window.google.accounts.id.initialize({client_id: GOOGLE_ID, callback: ({credential}) => run(async () => { await signInWithGoogle(credential); return 'Signed in with Google.'; })});
      if (googleButton.current) window.google.accounts.id.renderButton(googleButton.current, {theme: 'outline', size: 'large', text: 'continue_with', shape: 'pill'});
    };
    if (window.google?.accounts?.id) return render();
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.onload = render;
    document.head.appendChild(script);
  }, [signedIn]);

  const ios = typeof navigator !== 'undefined' && /iPhone|iPad/.test(navigator.userAgent) && !window.matchMedia('(display-mode: standalone)').matches;

  return <section className="alerts-panel" aria-labelledby="alerts-title">
    <div className="alerts-head">
      <Bell size={18}/>
      <div>
        <h2 id="alerts-title">Game alerts</h2>
        <p>{signedIn ? `Signed in as ${saved.emailAddress}. You get alerts when your followed teams tip off and finish.` : 'Follow teams with the bell. To get alerts and keep your teams on every device, sign in.'}</p>
      </div>
    </div>
    {signedIn
      ? <div className="alerts-row">
        {supported && (saved.push
          ? <button className="alerts-btn on" disabled={busy} onClick={() => run(() => disableAlerts('push'), 'Browser alerts are off.')}><BellOff size={15}/> Turn off browser alerts</button>
          : <button className="alerts-btn" disabled={busy || !favorites.length} onClick={() => run(async () => { await enableBrowserAlerts(favorites); }, 'Browser alerts are on.')}><Bell size={15}/> Also alert me in this browser</button>)}
        <form onSubmit={event => { event.preventDefault(); run(async () => { await setPassword(newPassword); setNewPassword(''); return 'Password saved.'; }); }}>
          <input type="password" required minLength={8} placeholder="Set or change password" value={newPassword} onChange={event => setNewPassword(event.target.value)} aria-label="New password" autoComplete="new-password"/>
          <button className="alerts-btn" disabled={busy}>Save password</button>
        </form>
        <button className="alerts-btn" disabled={busy} onClick={() => { signOut(); setSaved(readAlerts()); setNote('Signed out on this browser.'); }}>Sign out</button>
        <button className="alerts-btn" disabled={busy} onClick={() => run(() => disableAlerts('email'), 'Alerts and your account are deleted.')}>Delete my alerts</button>
      </div>
      : <div className="alerts-row alerts-auth">
        {GOOGLE_ID && <div ref={googleButton}/>}
        <p className="alerts-or">or with your email</p>
        <form onSubmit={event => { event.preventDefault(); run(async () => {
          if (mode === 'up') { await signUp(email, password); return `Account created. Click the link we emailed to ${email} to start alerts.`; }
          await logIn(email, password);
          return 'Signed in.';
        }); }}>
          <input type="email" required placeholder="you@email.com" value={email} onChange={event => setEmail(event.target.value)} aria-label="Email address" autoComplete="email"/>
          <input type="password" required minLength={mode === 'up' ? 8 : undefined} placeholder={mode === 'up' ? 'Password (8+ characters)' : 'Password'} value={password} onChange={event => setPasswordText(event.target.value)} aria-label="Password" autoComplete={mode === 'up' ? 'new-password' : 'current-password'}/>
          <button className="alerts-btn" disabled={busy}>{mode === 'up' ? 'Create account' : 'Sign in'}</button>
        </form>
        <div className="alerts-links">
          <button type="button" className="alerts-link" onClick={() => { setMode(mode === 'up' ? 'in' : 'up'); setNote(''); }}>{mode === 'up' ? 'Have an account? Sign in' : 'New here? Create account'}</button>
          {mode === 'in' && <button type="button" className="alerts-link" disabled={busy || !email} onClick={() => run(async () => { await sendSignInLink(email); return `If ${email} has an account, a sign-in link is on its way. Use it, then set a new password.`; })}>Forgot password?</button>}
        </div>
      </div>}
    {ios && signedIn && <p className="alerts-note">On iPhone, add StatsPad to your Home Screen first to get browser alerts.</p>}
    {note && <p className="alerts-note" role="status">{note}</p>}
  </section>;
}
