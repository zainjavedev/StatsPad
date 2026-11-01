'use client';
import { useEffect } from 'react';
import { readAlerts } from '../lib/alerts';

/* Sends one page view per path to /api/hit, for the owner's /admin dashboard. The stats app moves
   with raw history.pushState, so history is wrapped here rather than in every caller.
   Only the live site reports, so local runs against the real database don't pollute it. */
const KEY = 'statspad-visitor', NOT_ME = 'statspad-not-me';
const visitorId = () => {
  try {
    let id = localStorage.getItem(KEY);
    if (!id) { id = Math.random().toString(36).slice(2, 12) + Date.now().toString(36); localStorage.setItem(KEY, id); }
    return id;
  } catch { return 'private' + Date.now().toString(36); }
};

export default function Tracker() {
  useEffect(() => {
    if (!/(^|\.)statspads\.com$/.test(location.hostname)) return;
    const visitor = visitorId();
    /* ?notme=1 marks this browser as the owner's: past views drop out of the dashboard and nothing more is sent. ?notme=0 undoes it. */
    const params = new URLSearchParams(location.search), notMe = params.get('notme');
    if (notMe !== null) {
      try { if (notMe === '0') localStorage.removeItem(NOT_ME); else localStorage.setItem(NOT_ME, '1'); } catch { /* private mode: nothing to remember */ }
      if (notMe !== '0') navigator.sendBeacon?.('/api/hit', JSON.stringify({visitor, hide: true}));
      params.delete('notme');
      history.replaceState(history.state, '', location.pathname + (params.size ? `?${params}` : '') + location.hash);
    }
    try { if (localStorage.getItem(NOT_ME)) return undefined; } catch { /* no storage: count as usual */ }
    let lastPath = '', lastUrl = '', referrer = document.referrer && !document.referrer.includes(location.host) ? document.referrer : '';
    /* replaceState mostly tidies the query (Home keeps it in sync with filters), so it only counts on a new path.
       pushState and back/forward count on any new URL, which keeps team profiles (/?profile=X). */
    const send = replacing => {
      const url = location.pathname + location.search;
      if (url === lastUrl || (replacing === true && location.pathname === lastPath)) return;
      lastPath = location.pathname; lastUrl = url;
      const body = JSON.stringify({visitor, token: readAlerts().email || '', path: url, referrer});
      referrer = '';
      if (!navigator.sendBeacon?.('/api/hit', body)) fetch('/api/hit', {method: 'POST', body, keepalive: true}).catch(() => {});
    };
    const {pushState, replaceState} = history;
    history.pushState = function (...args) { const result = pushState.apply(this, args); send(); return result; };
    history.replaceState = function (...args) { const result = replaceState.apply(this, args); send(true); return result; };
    window.addEventListener('popstate', send);
    send(false);
    return () => { history.pushState = pushState; history.replaceState = replaceState; window.removeEventListener('popstate', send); };
  }, []);
  return null;
}
