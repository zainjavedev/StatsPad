import { useEffect, useState } from 'react';

/* The most points a player scored in his regular-season games before this one, from the stored box scores. Null until
   it is known (or when the database cannot answer), so no tag is shown on a guess. */
const cache = new Map();
const load = espnId => {
  if (!cache.has(espnId)) cache.set(espnId, fetch(`/api/player-games?id=${espnId}&limit=100`).then(response => (response.ok ? response.json() : null)).then(data => data?.lines ?? null).catch(() => null));
  return cache.get(espnId);
};

export function useSeasonHigh(espnId, gameId, date) {
  const [best, setBest] = useState(null);
  useEffect(() => {
    let live = true;
    setBest(null);
    if (!espnId) return undefined;
    load(String(espnId)).then(lines => {
      if (!live || !lines) return;
      const before = lines.filter(line => String(line.gameId) !== String(gameId) && (!date || new Date(line.date) < new Date(date)));
      setBest({games: before.length, points: Math.max(0, ...before.map(line => Number(line.player.stats.PTS) || 0))});
    });
    return () => { live = false; };
  }, [espnId, gameId, date]);
  return best;
}
