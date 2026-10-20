import { useSyncExternalStore } from 'react';
import { TEAMS } from './teams';

/* Teams a visitor has starred. Kept in localStorage and shared between every
   component through a tiny store, so a star toggled on the roster page shows
   up in the rail and the teams index straight away. */

const KEY = 'statspad-favorite-teams';
const listeners = new Set();

const read = () => {
  try {
    const saved = JSON.parse(localStorage.getItem(KEY));
    return Array.isArray(saved) ? saved.filter(code => TEAMS[code]) : [];
  } catch { return []; }
};
let favorites = read();

export const getFavorites = () => favorites;

export function toggleFavorite(code) {
  favorites = favorites.includes(code) ? favorites.filter(item => item !== code) : [...favorites, code];
  try { localStorage.setItem(KEY, JSON.stringify(favorites)); } catch { /* private mode */ }
  listeners.forEach(listener => listener());
}

export function setFavorites(codes) {
  favorites = [...new Set(codes)].filter(code => TEAMS[code]);
  try { localStorage.setItem(KEY, JSON.stringify(favorites)); } catch { /* private mode */ }
  listeners.forEach(listener => listener());
}

const subscribe = listener => { listeners.add(listener); return () => listeners.delete(listener); };

export const useFavorites = () => useSyncExternalStore(subscribe, () => favorites, () => []);

/* Team codes with the starred ones first, in the order they were starred. */
export const favoritesFirst = favs => [...favs, ...Object.keys(TEAMS).filter(code => !favs.includes(code))];
