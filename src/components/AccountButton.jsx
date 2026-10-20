import React, { useEffect, useState } from 'react';
import { User, X } from 'lucide-react';
import AlertsPanel from './AlertsPanel';
import { readAlerts } from '../lib/alerts';

/* The header's sign-in button. It opens the same panel the Teams page has, in a dialog. */
export default function AccountButton() {
  const [email, setEmail] = useState(''), [open, setOpen] = useState(false);
  useEffect(() => {
    const update = () => setEmail(readAlerts().emailAddress || '');
    update();
    window.addEventListener('statspad:alerts', update);
    window.addEventListener('storage', update);
    return () => { window.removeEventListener('statspad:alerts', update); window.removeEventListener('storage', update); };
  }, []);
  useEffect(() => {
    if (!open) return;
    const close = event => { if (event.key === 'Escape') setOpen(false); };
    window.addEventListener('keydown', close);
    return () => window.removeEventListener('keydown', close);
  }, [open]);

  return <>
    <button type="button" className="account-btn" onClick={() => setOpen(true)} aria-label={email ? `Account: ${email}` : 'Sign in'} title={email || 'Sign in'}>
      <User size={16}/><span>{email ? email.split('@')[0] : 'Sign in'}</span>
    </button>
    {open && <div className="gate-backdrop" onClick={() => setOpen(false)}>
      <div className="gate account-dialog" role="dialog" aria-modal="true" aria-label="Sign in" onClick={event => event.stopPropagation()}>
        <button type="button" className="gate-close" onClick={() => setOpen(false)} aria-label="Close"><X size={18}/></button>
        <AlertsPanel/>
      </div>
    </div>}
  </>;
}
