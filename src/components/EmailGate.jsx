import React, { useEffect, useState } from 'react';
import { Bell, X } from 'lucide-react';
import { toggleFavorite, useFavorites } from '../lib/favorites';
import { enableEmailAlerts } from '../lib/alerts';
import { TEAMS } from '../lib/teams';

/* Game alerts need an email. Tapping a bell without one saved opens this, and
   the team is only followed once the email has been accepted. */
export default function EmailGate() {
  const favorites = useFavorites();
  const [code, setCode] = useState(null), [email, setEmail] = useState(''), [busy, setBusy] = useState(false), [error, setError] = useState(''), [sent, setSent] = useState(null);
  useEffect(() => {
    const open = event => { setCode(event.detail.code); setError(''); setSent(null); };
    window.addEventListener('statspad:need-email', open);
    return () => window.removeEventListener('statspad:need-email', open);
  }, []);
  if (!code) return null;
  const close = () => setCode(null);
  const submit = async event => {
    event.preventDefault();
    setBusy(true); setError('');
    try {
      const confirmed = await enableEmailAlerts(email, [...new Set([...favorites, code])]);
      if (!favorites.includes(code)) toggleFavorite(code);
      setSent({confirmed});
    } catch (failure) { setError(failure.message); }
    setBusy(false);
  };

  return <div className="gate-backdrop" onClick={close}>
    <form className="gate" role="dialog" aria-modal="true" aria-labelledby="gate-title" onClick={event => event.stopPropagation()} onSubmit={submit}>
      <button type="button" className="gate-close" onClick={close} aria-label="Close"><X size={18}/></button>
      <Bell size={22}/>
      {sent
        ? <>
          <h2 id="gate-title">{sent.confirmed ? 'Alerts are on' : 'Check your inbox'}</h2>
          <p>{sent.confirmed ? `You are following the ${TEAMS[code].name}.` : `We sent a link to ${email}. Click it to start getting ${TEAMS[code].name} alerts.`}</p>
          <button type="button" className="alerts-btn" onClick={close}>Done</button>
        </>
        : <>
          <h2 id="gate-title">Get {TEAMS[code].name} alerts</h2>
          <p>Enter your email and we&apos;ll tell you when they tip off and when the game ends. One click to confirm, unsubscribe any time.</p>
          <input type="email" required autoFocus placeholder="you@email.com" value={email} onChange={event => setEmail(event.target.value)} aria-label="Email address"/>
          {error && <p className="gate-error" role="alert">{error}</p>}
          <button className="alerts-btn" disabled={busy}>{busy ? 'Sending…' : 'Turn on alerts'}</button>
        </>}
    </form>
  </div>;
}
