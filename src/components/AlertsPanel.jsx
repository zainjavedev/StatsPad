import React, { useEffect, useState } from 'react';
import { Bell, BellOff, Mail } from 'lucide-react';
import { useFavorites } from '../lib/favorites';
import { disableAlerts, enableBrowserAlerts, enableEmailAlerts, pushSupported, readAlerts, syncAlertTeams } from '../lib/alerts';

/* Tip-off and final-score alerts for the starred teams, by browser
   notification and/or email. */
export default function AlertsPanel() {
  const favorites = useFavorites();
  const [saved, setSaved] = useState({}), [email, setEmail] = useState(''), [busy, setBusy] = useState(false), [note, setNote] = useState(''), [supported, setSupported] = useState(false);
  useEffect(() => { setSaved(readAlerts()); setSupported(pushSupported()); }, []);
  /* The server keeps its own copy of the teams; star or unstar and it follows. */
  useEffect(() => { if (favorites.length) syncAlertTeams(favorites); }, [favorites]);

  const run = async (task, done) => {
    setBusy(true); setNote('');
    try { setNote(await task() || done); } catch (error) { setNote(error.message); }
    setSaved(readAlerts()); setBusy(false);
  };
  const ios = typeof navigator !== 'undefined' && /iPhone|iPad/.test(navigator.userAgent) && !window.matchMedia('(display-mode: standalone)').matches;
  const disabled = busy || !favorites.length;

  return <section className="alerts-panel" aria-labelledby="alerts-title">
    <div className="alerts-head">
      <Bell size={18}/>
      <div>
        <h2 id="alerts-title">Game alerts</h2>
        <p>{favorites.length ? 'Get told when your starred teams tip off and when the game ends.' : 'Star at least one team below, then choose how to get alerts.'}</p>
      </div>
    </div>
    <div className="alerts-row">
      {supported && (saved.push
        ? <button className="alerts-btn on" disabled={busy} onClick={() => run(() => disableAlerts('push'), 'Browser alerts are off.')}><BellOff size={15}/> Turn off browser alerts</button>
        : <button className="alerts-btn" disabled={disabled} onClick={() => run(async () => { await enableBrowserAlerts(favorites); }, 'Browser alerts are on.')}><Bell size={15}/> Alert me in this browser</button>)}
      {saved.email
        ? <button className="alerts-btn on" disabled={busy} onClick={() => run(() => disableAlerts('email'), 'Email alerts are off.')}><BellOff size={15}/> Stop emailing {saved.emailAddress}</button>
        : <form onSubmit={event => { event.preventDefault(); run(async () => (await enableEmailAlerts(email, favorites)) ? 'Email alerts are on.' : `Check ${email} and click the confirm link.`); }}>
          <input type="email" required placeholder="you@email.com" value={email} onChange={event => setEmail(event.target.value)} aria-label="Email address"/>
          <button className="alerts-btn" disabled={disabled}><Mail size={15}/> Email me</button>
        </form>}
    </div>
    {ios && <p className="alerts-note">On iPhone, add StatsPad to your Home Screen first to get browser alerts.</p>}
    {note && <p className="alerts-note" role="status">{note}</p>}
  </section>;
}
