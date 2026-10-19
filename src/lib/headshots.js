/* Name matching for player photos. Stat sources spell names differently
   ("A.J. Green", "Vince Williams Jr.", "Gui Santos") so every lookup goes
   through the same loose key: no accents, dots or apostrophes, no suffix. */

export const looseKey = name => name.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[.'’]/g, '').replace(/ (jr|sr|ii|iii|iv)$/, '').replace(/\s+/g, ' ').trim();

const byLooseKey = ids => Object.fromEntries(Object.entries(ids).map(([name, id]) => [looseKey(name), id]));

/* Both lookup files are keyed by name; ESPN stat rows also carry the id in playerId ("espn-123"). */
export async function loadHeadshotIds() {
  const read = url => fetch(url).then(response => response.ok ? response.json() : {}).catch(() => ({}));
  const [nba, espn] = await Promise.all([read('/data/player-ids.json'), read('/data/espn-ids.json')]);
  return {nba: byLooseKey(nba), espn: byLooseKey(espn)};
}

export function headshotSources(entity, {nba = {}, espn = {}} = {}, nbaFallback = {}) {
  const key = looseKey(entity.playerName);
  const nbaId = nba[key] ?? nbaFallback[entity.playerName];
  const espnId = espn[key] ?? (/^espn-(\d+)$/.exec(entity.playerId ?? '') || [])[1];
  return [
    nbaId && `https://cdn.nba.com/headshots/nba/latest/1040x760/${nbaId}.png`,
    espnId && `https://a.espncdn.com/i/headshots/nba/players/full/${espnId}.png`,
  ].filter(Boolean);
}
