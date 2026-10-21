import { useSyncExternalStore } from 'react';

/* Finished scores stay hidden until the visitor asks: one switch for everything (remembered on this device) and
   a tap to reveal a single game for the rest of the visit. */

const KEY = 'statspad-show-scores-v2';
const listeners = new Set();
const read = () => { try { return localStorage.getItem(KEY) === '1'; } catch { return false; } };
let state = {all: read(), shown: new Set()};
const emit = () => listeners.forEach(listener => listener());
const subscribe = listener => { listeners.add(listener); return () => listeners.delete(listener); };

export function setShowScores(value) {
  state = {all: value, shown: value ? state.shown : new Set()};
  try { localStorage.setItem(KEY, value ? '1' : '0'); } catch { /* private mode */ }
  emit();
}
export function revealGame(id) {
  state = {...state, shown: new Set([...state.shown, id])};
  emit();
}

export const useSpoilers = () => {
  const current = useSyncExternalStore(subscribe, () => state, () => state);
  return {all: current.all, revealed: id => current.all || current.shown.has(id)};
};
