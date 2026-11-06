'use client';
import { useEffect, useState } from 'react';
import { readAlerts } from './alerts';

/* Signing in from inside a page: openSignIn() pops the small Google sheet (components/SignInSheet.jsx, mounted once in the
   root layout) instead of leaving for /signin. Without a Google client id it falls back to the /signin page. */

export const GOOGLE_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

/* The full /signin page, coming back to `back` once signed in (AccountPage reads statspad-return). */
export const goSignIn = (back = window.location.pathname + window.location.search) => {
  try { sessionStorage.setItem('statspad-return', back); } catch { /* private mode */ }
  window.location.href = '/signin';
};

/* {back, title, line}: back is where the email route returns to; title and line are the sheet's copy. */
export const openSignIn = (options = {}) => {
  if (!GOOGLE_ID) { goSignIn(options.back); return; }
  window.dispatchEvent(new CustomEvent('statspad:signin', {detail: options}));
};

/* 'checking' on the first render, then 'in' or 'out', following sign-ins and sign-outs in this tab and in others. */
export function useSignedIn() {
  const [state, setState] = useState('checking');
  useEffect(() => {
    const check = () => setState(readAlerts().email ? 'in' : 'out');
    check();
    window.addEventListener('statspad:alerts', check);
    window.addEventListener('storage', check);
    return () => { window.removeEventListener('statspad:alerts', check); window.removeEventListener('storage', check); };
  }, []);
  return state;
}

/* Google's sign-in script, loaded once. */
let gsi;
export const loadGoogle = () => (gsi ??= new Promise((resolve, reject) => {
  if (window.google?.accounts?.id) { resolve(window.google); return; }
  const script = document.createElement('script');
  script.src = 'https://accounts.google.com/gsi/client';
  script.async = true;
  script.onload = () => resolve(window.google);
  script.onerror = () => { gsi = undefined; reject(new Error('Google sign-in did not load.')); };
  document.head.appendChild(script);
}));
