import fs from 'node:fs';
import path from 'node:path';
import { qualified } from './season';
import { slugify } from './routes';

/* Blog posts are pinned to a finished season, so the numbers in the text and in the charts never drift
   when the stats bot refreshes the current season. */

const cache = new Map();

export function loadSeason(key) {
  if (!cache.has(key)) {
    const file = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'public/data', key, 'regular-season.json'), 'utf8'));
    const players = file.players;
    cache.set(key, {key, players, pool: qualified(players), bySlug: new Map(players.map(player => [slugify(player.playerName), player]))});
  }
  return cache.get(key);
}

export function playerIn(season, slug) {
  const player = season.bySlug.get(slug);
  if (!player) throw new Error(`Blog data: no player "${slug}" in ${season.key}`);
  return player;
}

export { fixed, list, plays, trueShooting } from './blogStats';
