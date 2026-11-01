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

/* Avatars are 40-80px on screen, so they take the 260x190 cut instead of the 1040x760 original: a page of leaders
   decodes a fraction of the pixels and scrolls without stalling. Both CDNs serve the small size. */
const ESPN_FULL = /^https:\/\/a\.espncdn\.com\/i\/headshots\/nba\/players\/full\/(\d+)\.png$/;
export const smallHeadshot = url => {
  if (!url) return url;
  const espn = ESPN_FULL.exec(url);
  if (espn) return `https://a.espncdn.com/combiner/i?img=/i/headshots/nba/players/full/${espn[1]}.png&w=260&h=190`;
  return url.replace('/headshots/nba/latest/1040x760/', '/headshots/nba/latest/260x190/');
};

export function headshotSources(entity, {nba = {}, espn = {}} = {}, nbaFallback = {}, small = false) {
  const key = looseKey(entity.playerName);
  const nbaId = nba[key] ?? nbaFallback[entity.playerName];
  const espnId = espn[key] ?? (/^espn-(\d+)$/.exec(entity.playerId ?? '') || [])[1];
  const sources = [
    nbaId && `https://cdn.nba.com/headshots/nba/latest/1040x760/${nbaId}.png`,
    espnId && `https://a.espncdn.com/i/headshots/nba/players/full/${espnId}.png`,
  ].filter(Boolean);
  return small ? sources.map(smallHeadshot) : sources;
}
