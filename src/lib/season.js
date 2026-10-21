/* Which season the site shows. Newest first: once the stats feed has a 2026-27
   file every page switches to it; until then the previous season stays up,
   labelled as last season. */
export const SEASONS = ['2026-27', '2025-26'];
export const CURRENT = SEASONS[0];
export const pretty = season => season.replace('-', '–');
/* True while the newest file is the preseason stand-in (seasonType "Preseason", built from box scores); the
   regular season replaces it automatically. Pages read this after their data has loaded. */
let preseason = false;
export const isPreseason = () => preseason;
export const setCurrentIsPreseason = value => { preseason = value; };
export const stageOf = kind => kind === 'preseason' ? 'preseason' : kind === 'playoffs' ? 'playoffs' : 'regular season';
export const stage = () => stageOf(preseason ? 'preseason' : 'regular-season');
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
const fileOf = (suffix, kind) => suffix === 'preseason' ? (kind === 'teams' ? 'teams-preseason' : 'preseason') : (kind === 'teams' ? `teams-${suffix}` : suffix);
const hasPlayers = data => Array.isArray(data?.players) && data.players.length > 0;

export async function loadLatest(suffix) {
  for (const season of SEASONS) {
    const [players, teams, splits] = await Promise.all([
      readJson(`/data/${season}/${fileOf(suffix, 'players')}.json`, hasPlayers),
      readJson(`/data/${season}/${fileOf(suffix, 'teams')}.json`, hasPlayers),
      readJson(`/data/${season}/splits-${suffix}.json`, data => Boolean(data?.quarters)),
    ]);
    if (players && teams) {
      return {season, players, teams, splits};
    }
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

/* "Qualified" players for rankings and the radar. In the preseason, and until teams have played about eight games, it
   is raw stats: everyone who played, whoever is ahead leads. After that it is 15 games and 10 minutes, with the games
   bar at half of what the busiest team has played until a team reaches 30. */
const RAW_UNTIL = 8;
export const minGames = list => Math.min(15, Math.max(1, Math.floor(Math.max(0, ...list.map(player => player.gamesPlayed)) / 2)));
export const qualified = list => {
  if (Math.max(0, ...list.map(player => player.gamesPlayed)) <= RAW_UNTIL) return list.filter(player => player.gamesPlayed > 0);
  const games = minGames(list);
  return list.filter(player => player.gamesPlayed >= games && player.minutesPerGame >= 10);
};
