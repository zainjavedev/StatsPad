import React, { useEffect, useState } from 'react';
import { Bell, BellOff, Mail } from 'lucide-react';
import { useFavorites } from '../lib/favorites';
import { disableAlerts, enableBrowserAlerts, enableEmailAlerts, pushSupported, readAlerts, syncAlertTeams } from '../lib/alerts';

/* Tip-off and final-score alerts for the followed teams. An email comes first;
   browser notifications are an extra on top of it. */
export default function AlertsPanel() {
  const favorites = useFavorites();
  const [saved, setSaved] = useState({}), [email, setEmail] = useState(''), [busy, setBusy] = useState(false), [note, setNote] = useState(''), [supported, setSupported] = useState(false);
  useEffect(() => { setSaved(readAlerts()); setSupported(pushSupported()); }, []);
  /* The server keeps its own copy of the teams; follow or unfollow and it does too. */
  useEffect(() => { if (favorites.length) syncAlertTeams(favorites); }, [favorites]);

  const run = async (task, done) => {
    setBusy(true); setNote('');
    try { setNote(await task() || done); } catch (error) { setNote(error.message); }
    setSaved(readAlerts()); setBusy(false);
  };
  const ios = typeof navigator !== 'undefined' && /iPhone|iPad/.test(navigator.userAgent) && !window.matchMedia('(display-mode: standalone)').matches;

  return <section className="alerts-panel" aria-labelledby="alerts-title">
    <div className="alerts-head">
      <Bell size={18}/>
      <div>
        <h2 id="alerts-title">Game alerts</h2>
        <p>{saved.email ? 'Get told when your followed teams tip off and when the game ends.' : 'Tap the bell on a team and add your email to get its game alerts.'}</p>
      </div>
    </div>
    <div className="alerts-row">
      {saved.email
        ? <>
          <button className="alerts-btn on" disabled={busy} onClick={() => run(() => disableAlerts('email'), 'Alerts are off.')}><BellOff size={15}/> Stop alerts to {saved.emailAddress}</button>
          {supported && (saved.push
            ? <button className="alerts-btn on" disabled={busy} onClick={() => run(() => disableAlerts('push'), 'Browser alerts are off.')}><BellOff size={15}/> Turn off browser alerts</button>
            : <button className="alerts-btn" disabled={busy || !favorites.length} onClick={() => run(async () => { await enableBrowserAlerts(favorites); }, 'Browser alerts are on.')}><Bell size={15}/> Also alert me in this browser</button>)}
        </>
        : <form onSubmit={event => { event.preventDefault(); run(async () => (await enableEmailAlerts(email, favorites)) ? 'Email alerts are on.' : `Check ${email} and click the confirm link.`); }}>
          <input type="email" required placeholder="you@email.com" value={email} onChange={event => setEmail(event.target.value)} aria-label="Email address"/>
          <button className="alerts-btn" disabled={busy || !favorites.length}><Mail size={15}/> Turn on alerts</button>
        </form>}
    </div>
    {!saved.email && !favorites.length && <p className="alerts-note">Follow at least one team below first.</p>}
    {ios && saved.email && <p className="alerts-note">On iPhone, add StatsPad to your Home Screen first to get browser alerts.</p>}
    {note && <p className="alerts-note" role="status">{note}</p>}
  </section>;
}
