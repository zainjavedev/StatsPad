import { slugify } from './routes';

/* Blind test (/play/blind): two players' season lines with the names hidden; the visitor picks who is better, then sees who
   they were. There is no right answer. The fun is the reveal: about four rounds in ten are built so a lesser-known player's
   numbers match or beat a big name's in the same position group.

   Fame is a player's best points per game over the last two seasons (matched by name), so a star who sat out injured still
   counts. A rookie on the ROTY ladder counts as known; other rookies sit in the middle and are never the "unknown" side.
   Everyone gets the same pairs on the same day (a seed from the US date), so the "% picked the same" split means something. */

const SEASON = '2026-27', PAST = ['2025-26', '2024-25'];
const read = (season, name) => fetch(`/data/${season}/${name}.json`).then(response => (response.ok ? response.json() : null)).catch(() => null);
let cached;
export const loadBlindData = () => (cached ??= Promise.all([read(SEASON, 'regular-season'), ...PAST.map(season => read(season, 'regular-season')), read(SEASON, 'ladders')])
  .then(([now, ...rest]) => { const ladders = rest.pop(); return {players: now?.players ?? [], past: rest.map(file => file?.players ?? []), rookies: (ladders?.rookie ?? []).slice(0, 8).map(row => row.espnId)}; }));

/* A seeded random number generator (mulberry32), so a day's pairs are the same for everyone. */
const seeded = seed => () => {
  seed = (seed + 0x6D2B79F5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
const hash = text => [...text].reduce((h, c) => (Math.imul(h, 31) + c.charCodeAt(0)) | 0, 7);
export const today = () => new Intl.DateTimeFormat('en-CA', {timeZone: 'America/New_York'}).format(new Date());

const GROUP = {PG: 'guard', SG: 'guard', G: 'guard', SF: 'wing', F: 'wing', PF: 'big', C: 'big'};
export const GROUP_NAME = {guard: 'Two guards', wing: 'Two forwards', big: 'Two bigs'};
export const trueShooting = s => (s.fieldGoalsAttempted + .44 * s.freeThrowsAttempted ? 100 * s.points / (2 * (s.fieldGoalsAttempted + .44 * s.freeThrowsAttempted)) : 0);
/* One number for "how good is this line", only used to build the pairs, never shown. */
const impact = s => s.points + 1.2 * s.totalRebounds + 1.5 * s.assists + 2 * (s.steals + s.blocks) - s.turnovers + .5 * (trueShooting(s) - 57);

/* The stats on the card, in order. */
export const STATS = [
  ['PTS', s => s.points], ['REB', s => s.totalRebounds], ['AST', s => s.assists], ['STL', s => s.steals], ['BLK', s => s.blocks], ['TS%', trueShooting],
];

/* How many of the card's six stats one player beats the other on. A surprise has to show on the card itself: the lesser-known
   player wins at least three and scores within four points, so the pick is a real coin flip on paper. */
export const wins = (a, b) => STATS.filter(([, get]) => get(a.stats) > get(b.stats)).length;
const looksBetter = (other, known) => wins(other, known) >= 3 && other.stats.points >= known.stats.points - 4;

const espnId = player => String(player.playerId).replace(/^espn-/, '');

/* Each eligible player with their group, fame and line score. Thin early-season samples are left out. */
function pool({players, past, rookies}) {
  const before = past.map(list => new Map(list.filter(player => player.gamesPlayed >= 20).map(player => [slugify(player.playerName), player.stats.points])));
  const most = Math.max(0, ...players.map(player => player.gamesPlayed));
  const games = Math.max(3, Math.floor(most * .5));
  return players.filter(player => GROUP[player.position] && player.gamesPlayed >= games && player.minutesPerGame >= 18).map(player => {
    const slug = slugify(player.playerName), seasons = before.map(map => map.get(slug)).filter(value => value != null);
    const lastPpg = before[0].get(slug) ?? null, rookie = !past.some(list => list.some(row => slugify(row.playerName) === slug));
    const fame = seasons.length ? Math.max(...seasons) : rookie ? (rookies.includes(espnId(player)) ? 15 : 12) : 0;
    return {id: espnId(player), name: player.playerName, team: player.team, group: GROUP[player.position], gp: player.gamesPlayed, mpg: player.minutesPerGame,
      stats: player.stats, lastPpg, rookie, fame, value: impact(player.stats)};
  });
}

/* The day's pairs, built once. Every ten pairs hold four surprises (a lesser-known player whose card beats a known name's in
   the same group) and six normal ones (the known name clearly ahead), in a shuffled order. A player shows up once in any ten. */
export function dayPairs(data, day = today(), count = 40) {
  const rand = seeded(hash(day)), players = pool(data);
  const shuffle = list => list.map(item => [rand(), item]).sort((a, b) => a[0] - b[0]).map(entry => entry[1]);
  const stars = shuffle(players.filter(player => player.fame >= 17)), unknown = players.filter(player => player.fame <= 10);
  const pairs = [], used = new Map();
  const free = (player, index) => !used.has(player.id) || index - used.get(player.id) >= 10;
  let plan = [];
  for (let index = 0; index < count; index += 1) {
    if (!plan.length) plan = shuffle([true, true, true, true, false, false, false, false, false, false]);
    const surprise = plan.shift();
    let found = null;
    for (const known of shuffle(stars)) {
      if (!free(known, index)) continue;
      const options = unknown.filter(other => other.group === known.group && free(other, index)
        && (surprise ? looksBetter(other, known) : wins(known, other) >= 4 && known.value - other.value >= 5));
      if (options.length) { found = [known, options[Math.floor(rand() * options.length)]]; break; }
    }
    if (!found) continue;
    const [known, other] = found;
    used.set(known.id, index); used.set(other.id, index);
    pairs.push({key: [known.id, other.id].sort().join('_'), surprise, known: known.id, group: known.group, sides: rand() < .5 ? [known, other] : [other, known]});
  }
  return pairs;
}
