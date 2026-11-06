'use client';
import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { signInWithGoogle } from '../lib/alerts';
import { GOOGLE_ID, goSignIn, loadGoogle } from '../lib/signin';

/* The sign-in pop-up: one Continue with Google button, and a quiet link to the email form on /signin.
   Opened from anywhere with openSignIn() (lib/signin.js); mounted once in the root layout. */
export default function SignInSheet() {
  const [open, setOpen] = useState(null), [busy, setBusy] = useState(false), [error, setError] = useState('');
  const button = useRef(null), panel = useRef(null);

  useEffect(() => {
    const show = event => { setOpen(event.detail || {}); setError(''); setBusy(false); };
    window.addEventListener('statspad:signin', show);
    return () => window.removeEventListener('statspad:signin', show);
  }, []);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = event => { if (event.key === 'Escape') setOpen(null); };
    window.addEventListener('keydown', onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    panel.current?.focus();
    let live = true;
    loadGoogle().then(google => {
      if (!live || !button.current) return;
      google.accounts.id.initialize({client_id: GOOGLE_ID, callback: async ({credential}) => {
        setBusy(true); setError('');
        try { await signInWithGoogle(credential); setOpen(null); } catch (failure) { setError(failure.message); setBusy(false); }
      }});
      google.accounts.id.renderButton(button.current, {theme: 'outline', size: 'large', text: 'continue_with', shape: 'pill', width: Math.min(320, Math.max(200, button.current.clientWidth || 300))});
    }).catch(failure => live && setError(failure.message));
    return () => { live = false; window.removeEventListener('keydown', onKey); document.body.style.overflow = overflow; };
  }, [open]);

  if (!open) return null;
  return createPortal(<div className="si-back" onClick={event => { if (event.target === event.currentTarget) setOpen(null); }}>
    <div className="si-sheet" role="dialog" aria-modal="true" aria-labelledby="si-title" tabIndex={-1} ref={panel}>
      <button type="button" className="si-close" aria-label="Close" onClick={() => setOpen(null)}><X size={18}/></button>
      <span className="si-mark" aria-hidden="true"><svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="9.5"/><path d="M12 2.5v19M2.5 12h19M5.6 5.6c3.4 3.4 3.4 9.4 0 12.8M18.4 5.6c-3.4 3.4-3.4 9.4 0 12.8"/></svg></span>
      <h2 id="si-title">{open.title || 'Sign in to StatsPads'}</h2>
      <p>{open.line || 'One tap with Google. Your picks, scores and teams stay with you on every device.'}</p>
      <div className="si-google" ref={button} aria-busy={busy}/>
      {busy && <p className="si-note" role="status">Signing you in…</p>}
      {error && <p className="si-note bad" role="alert">{error}</p>}
      <button type="button" className="si-email" onClick={() => goSignIn(open.back)}>Use email instead</button>
    </div>
  </div>, document.body);
}
