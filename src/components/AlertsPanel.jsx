import React, { useEffect, useRef, useState } from 'react';
import { Bell, BellOff, Mail } from 'lucide-react';
import { useFavorites } from '../lib/favorites';
import { completeSignIn, disableAlerts, enableBrowserAlerts, enableEmailAlerts, pushSupported, readAlerts, sendSignInLink, signInWithGoogle, signOut, syncAlertTeams } from '../lib/alerts';

const GOOGLE_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

/* Following a team needs nothing. Game alerts need an account, which is just a verified email:
   sign in with Google, or confirm an email link. Browser notifications are an extra on top. */
export default function AlertsPanel() {
  const favorites = useFavorites();
  const [saved, setSaved] = useState({}), [email, setEmail] = useState(''), [busy, setBusy] = useState(false), [note, setNote] = useState(''), [supported, setSupported] = useState(false);
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
        <button className="alerts-btn" disabled={busy} onClick={() => { signOut(); setSaved(readAlerts()); setNote('Signed out on this browser.'); }}>Sign out</button>
        <button className="alerts-btn" disabled={busy} onClick={() => run(() => disableAlerts('email'), 'Alerts and your account are deleted.')}>Delete my alerts</button>
      </div>
      : <div className="alerts-row">
        {GOOGLE_ID && <div ref={googleButton}/>}
        <form onSubmit={event => { event.preventDefault(); run(async () => {
          const result = await enableEmailAlerts(email, favorites);
          if (result === 'link') return `We sent a sign-in link to ${email}.`;
          return result ? 'Email alerts are on.' : `Check ${email} and click the confirm link.`;
        }); }}>
          <input type="email" required placeholder="or use your email" value={email} onChange={event => setEmail(event.target.value)} aria-label="Email address"/>
          <button className="alerts-btn" disabled={busy}><Mail size={15}/> Email me a link</button>
        </form>
        <button type="button" className="alerts-btn" disabled={busy || !email} onClick={() => run(async () => { await sendSignInLink(email); return `If ${email} has an account, a sign-in link is on its way.`; })}>Restore my teams</button>
      </div>}
    {ios && signedIn && <p className="alerts-note">On iPhone, add StatsPad to your Home Screen first to get browser alerts.</p>}
    {note && <p className="alerts-note" role="status">{note}</p>}
  </section>;
}
