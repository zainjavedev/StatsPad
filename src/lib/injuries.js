import { TEAMS } from './teams';
import { slugify } from './routes';

/* ESPN's league-wide injury report, sorted into three tiers: a bandage for a game or a few days,
   a first aid box for a real absence, an ambulance for a season-ending injury. ESPN's own
   return date drives the tiers; the wording of the news item catches the season-ending cases
   it leaves undated. */

const URL = 'https://site.api.espn.com/apis/site/v2/sports/basketball/nba/injuries';
const SEASON_ENDS = '2027-04-15';
const DAY = 24 * 3600 * 1000;
const SEASON_ENDING = /season-ending|(?:rest|remainder) of (?:the |this )?(?:2026-27 )?season|miss(?:es)? the (?:entire |2026-27 )+season|out for the season|will not play (?:again )?this season/i;

export const TIERS = [
  {key: 'minor', label: 'Bandage', blurb: 'Day-to-day or back within a week'},
  {key: 'major', label: 'First aid', blurb: 'Out for a stretch, more than a week'},
  {key: 'season', label: 'Ambulance', blurb: 'Done for the season'},
];

const codeOf = abbreviation => Object.keys(TEAMS).find(code => TEAMS[code].espn === String(abbreviation).toLowerCase() || code === String(abbreviation).toUpperCase());

export function tierOf(item, now = Date.now()) {
  const back = item.returnDate;
  if (item.status === 'Day-To-Day') return 'minor';
  if (back && back >= SEASON_ENDS) return 'season';
  if (SEASON_ENDING.test(`${item.headline} ${item.note}`)) return 'season';
  if (back && Date.parse(`${back}T23:59:59Z`) - now <= 7 * DAY) return 'minor';
  return 'major';
}

const parse = (data, now) => (data.injuries ?? []).flatMap(team => team.injuries.map(entry => {
  const athlete = entry.athlete, details = entry.details ?? {};
  const code = codeOf(athlete.team?.abbreviation);
  if (!code) return null;
  const item = {
    id: entry.id,
    name: athlete.displayName,
    slug: slugify(athlete.displayName),
    team: code,
    position: athlete.position?.abbreviation ?? '',
    headshot: athlete.headshot?.href ?? null,
    status: entry.status,
    returnDate: details.returnDate ?? null,
    area: [details.side, details.type].filter(Boolean).join(' ').toLowerCase() || null,
    detail: details.detail ?? null,
    headline: entry.shortComment ?? '',
    note: entry.longComment ?? '',
    date: entry.date,
  };
  return {...item, tier: tierOf(item, now)};
}).filter(Boolean));

export const REFRESH = 3600 * 1000;

let cached, cachedAt = 0;
/* One shared fetch for every lineup on the page: injured players by name slug. It is read again once it is an hour old;
   a failed fetch is retried next time. */
export const injuryIndex = () => {
  if (!cached || Date.now() - cachedAt > REFRESH) {
    cachedAt = Date.now();
    cached = loadInjuries().then(items => new Map(items.map(item => [item.slug, item]))).catch(() => { cached = undefined; return new Map(); });
  }
  return cached;
};

export const loadInjuries = () => fetch(URL).then(response => response.json()).then(data => parse(data, Date.now()));

/* Per-game numbers by player slug: this season once a player has a game, last season otherwise. */
export async function loadStatLines() {
  const read = season => fetch(`/data/${season}/regular-season.json`).then(response => (response.ok ? response.json() : null)).then(data => (Array.isArray(data?.players) ? data.players : [])).catch(() => []);
  const [now, last] = await Promise.all([read('2026-27'), read('2025-26')]);
  const lines = new Map();
  const add = (players, season) => players.forEach(player => {
    const key = slugify(player.playerName);
    if (player.gamesPlayed > 0 && !lines.has(key)) lines.set(key, {season, games: player.gamesPlayed, points: player.stats.points, rebounds: player.stats.totalRebounds, assists: player.stats.assists, minutes: player.minutesPerGame});
  });
  add(now, '2026-27');
  add(last, '2025-26');
  return lines;
}
