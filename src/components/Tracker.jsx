'use client';
import { useEffect } from 'react';
import { readAlerts } from '../lib/alerts';

/* Sends one page view per path, plus batches of taps (below), to /api/hit, for the owner's /admin dashboard. The stats app moves
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

/* Taps on controls that don't change the URL: buttons, tabs, toggles, dropdowns. Links aren't counted here, the page
   view already is. A control's name is its data-track, aria-label or visible text; text fields are never read. */
const CONTROL = 'button, [role="button"], [role="tab"], [role="switch"], [role="option"], [role="menuitem"], summary, input[type="checkbox"], input[type="radio"], a[href^="#"], a:not([href])';
const squash = value => String(value ?? '').replace(/\s+/g, ' ').trim();
/* Visible text with a space between each piece, so <b>Today</b><small>Nov 5</small> reads "Today Nov 5". */
const textOf = el => {
  const parts = [], walk = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
  while (walk.nextNode()) { const piece = walk.currentNode.nodeValue.trim(); if (piece) parts.push(piece); }
  return parts.join(' ');
};
const nameOf = el => squash(el.dataset?.track || el.getAttribute('aria-label') || (el.closest('label') && textOf(el.closest('label'))) || textOf(el) || el.title || el.querySelector?.('img[alt]')?.alt).slice(0, 120);
/* The part of the page a control sits in: a data-track-area, a labelled landmark, or the heading of its section. */
const areaOf = el => {
  const marked = el.closest('[data-track-area]');
  if (marked) return marked.dataset.trackArea;
  for (let node = el.parentElement; node && node !== document.body; node = node.parentElement) {
    if (/^(SECTION|ASIDE|NAV|ARTICLE|FIGURE|DIALOG|HEADER|MAIN)$/.test(node.tagName) || node.getAttribute('role') === 'dialog') {
      const heading = node.getAttribute('aria-label') || node.querySelector('h1, h2, h3')?.textContent;
      if (heading) return squash(heading).slice(0, 80);
    }
  }
  return '';
};
const kindOf = el => el.getAttribute('role') === 'tab' ? 'tab' : el.matches('input, [role="switch"], [aria-pressed]') ? 'toggle' : 'tap';

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

    /* Taps queue up and go out every few seconds, and when the tab is hidden or closed. */
    let queue = [];
    const flush = () => {
      if (!queue.length) return;
      const body = JSON.stringify({visitor, token: readAlerts().email || '', events: queue});
      queue = [];
      if (!navigator.sendBeacon?.('/api/hit', body)) fetch('/api/hit', {method: 'POST', body, keepalive: true}).catch(() => {});
    };
    const log = (label, area, kind) => {
      if (!label || location.pathname.startsWith('/admin')) return;
      queue.push({path: location.pathname + location.search, label, area, kind});
      if (queue.length >= 20) flush();
    };
    const onClick = event => {
      const el = event.target.closest?.(CONTROL);
      if (!el || el.closest('[data-no-track]') || el.matches('input[type="text"], input[type="search"], input[type="email"], input[type="password"]')) return;
      log(nameOf(el), areaOf(el), kindOf(el));
    };
    const onChange = event => {
      const el = event.target;
      if (el.tagName !== 'SELECT' || el.closest('[data-no-track]')) return;
      const name = squash(el.dataset.track || el.getAttribute('aria-label') || el.closest('label')?.firstChild?.textContent || el.name);
      log(`${name ? `${name}: ` : ''}${squash(el.selectedOptions[0]?.textContent)}`.slice(0, 120), areaOf(el), 'select');
    };
    const onHide = () => { if (document.visibilityState === 'hidden') flush(); };
    const timer = setInterval(flush, 5000);
    document.addEventListener('click', onClick, true);
    document.addEventListener('change', onChange, true);
    document.addEventListener('visibilitychange', onHide);
    window.addEventListener('pagehide', flush);
    return () => {
      history.pushState = pushState; history.replaceState = replaceState; window.removeEventListener('popstate', send);
      flush(); clearInterval(timer);
      document.removeEventListener('click', onClick, true); document.removeEventListener('change', onChange, true);
      document.removeEventListener('visibilitychange', onHide); window.removeEventListener('pagehide', flush);
    };
  }, []);
  return null;
}
