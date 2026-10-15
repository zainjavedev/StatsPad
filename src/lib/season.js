/* Which season the site shows. Newest first: as soon as the stats feed has a
   2026-27 file with at least one player (after opening night) every page
   switches to it; until then the previous season stays up. */
export const SEASONS = ['2026-27', '2025-26'];
export const CURRENT = SEASONS[0];
export const pretty = season => season.replace('-', '–');
export const isCurrent = season => season === CURRENT;

/* Hosting rewrites unknown paths to index.html, so a missing file arrives as
   HTML with a 200. Treat anything that doesn't parse into players as absent. */
const readJson = async (url, hasRows) => {
  try {
    const response = await fetch(url);
    if (!response.ok) return null;
    const data = await response.json();
    return hasRows(data) ? data : null;
  } catch {
    return null;
  }
};
const hasPlayers = data => Array.isArray(data?.players) && data.players.length > 0;

export async function loadLatest(suffix) {
  for (const season of SEASONS) {
    const [players, teams, splits] = await Promise.all([
      readJson(`/data/${season}/${suffix}.json`, hasPlayers),
      readJson(`/data/${season}/teams-${suffix}.json`, hasPlayers),
      readJson(`/data/${season}/splits-${suffix}.json`, data => Boolean(data?.quarters)),
    ]);
    if (players && teams) return {season, players, teams, splits};
  }
  throw new Error(`No ${suffix} data found`);
}

/* A roster entry's numbers: ESPN-sourced seasons are keyed espn-<id>, the older
   Basketball Reference ones by their own id, and a hand-made roster with
   neither falls back to the player's name. */
const plain = name => name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[.']/g, '').replace(/ (jr|sr|ii|iii|iv)$/, '').trim();
export const indexPlayers = list => ({
  byId: new Map(list.map(player => [player.playerId, player])),
  byName: new Map(list.map(player => [plain(player.playerName), player])),
});
export const statsFor = (entry, {byId, byName}) => byId.get(`espn-${entry.espnId}`) || (entry.bbrefId && byId.get(entry.bbrefId)) || byName.get(plain(entry.name)) || null;
