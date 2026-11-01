'use client';
import { useEffect, useState } from 'react';
import { readAlerts } from './alerts';

/* Whether this browser is signed in as the owner, for the links to /admin. Guests never ask, and the answer
   is kept for the tab's session so the check doesn't hit the database on every page. The server still guards /admin. */
const KEY = 'statspad-admin';

export function useIsAdmin() {
  const [admin, setAdmin] = useState(false);
  useEffect(() => {
    let live = true;
    const check = () => {
      const token = readAlerts().email || '';
      if (!token) { setAdmin(false); return; }
      try {
        const saved = JSON.parse(sessionStorage.getItem(KEY) || 'null');
        if (saved?.token === token) { setAdmin(saved.ok); return; }
      } catch { /* private mode: just ask */ }
      fetch('/api/admin', {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({token, check: true})})
        .then(response => {
          const ok = response.ok;
          try { sessionStorage.setItem(KEY, JSON.stringify({token, ok})); } catch { /* ignore */ }
          if (live) setAdmin(ok);
        }).catch(() => {});
    };
    check();
    window.addEventListener('statspad:alerts', check);
    return () => { live = false; window.removeEventListener('statspad:alerts', check); };
  }, []);
  return admin;
}
