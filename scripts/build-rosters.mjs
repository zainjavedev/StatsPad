import fs from 'node:fs';
import path from 'node:path';

/* Builds public/data/2026-27/rosters/<CODE>.json for every club from ESPN's
   public roster API, joined to last season's Basketball Reference stats.
   Existing files are kept (PHI is hand-curated) unless --force is passed.

   Usage: node scripts/build-rosters.mjs [--force] [CODE ...] */

const args = process.argv.slice(2);
const force = args.includes('--force');
const only = args.filter(arg => !arg.startsWith('--'));

const TEAMS = (await import('../src/lib/teams.js')).TEAMS;
const out = 'public/data/2026-27/rosters';
const readJson = file => JSON.parse(fs.readFileSync(file, 'utf8'));

const plain = name => name.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/ć/g, 'c').toLowerCase().replace(/[.']/g, '').replace(/\s+/g, ' ').trim();
const noSuffix = name => plain(name).replace(/ (jr|sr|ii|iii|iv)$/, '');

const lastSeason = readJson('public/data/2025-26/regular-season.json').players;
const nbaIds = readJson('public/data/player-ids.json');
const bestBy = (key, fn) => {
  const map = new Map();
  for (const player of lastSeason) {
    const k = fn(player.playerName), current = map.get(k);
    if (!current || player.gamesPlayed > current.gamesPlayed) map.set(k, player);
  }
  return map;
};
const byFull = bestBy('full', plain), byShort = bestBy('short', noSuffix);
const idByName = new Map(Object.entries(nbaIds).map(([name, id]) => [plain(name), id]));
const idByShort = new Map(Object.entries(nbaIds).map(([name, id]) => [noSuffix(name), id]));

const UNITS = [
  {key: 'starters', label: 'Expected starting five', short: 'Starters', size: 5},
  {key: 'second', label: 'Second unit', short: '2nd unit', size: 5},
  {key: 'third', label: 'Third unit', short: '3rd unit', size: 5},
  {key: 'camp', label: 'Rest of camp', short: 'Camp', size: Infinity},
];

const feet = display => display?.replace(/^(\d+)'\s*(\d+).*$/, '$1-$2') ?? null;

async function build(code) {
  const team = TEAMS[code];
  const response = await fetch(`https://site.api.espn.com/apis/site/v2/sports/basketball/nba/teams/${team.espn}/roster`);
  if (!response.ok) throw new Error(`${code}: ESPN answered ${response.status}`);
  const data = await response.json();

  const players = data.athletes.map(athlete => {
    const name = athlete.fullName;
    const last = byFull.get(plain(name)) ?? byShort.get(noSuffix(name));
    const nbaId = idByName.get(plain(name)) ?? idByShort.get(noSuffix(name)) ?? null;
    return {
      name,
      ...(last && {bbrefId: last.playerId}),
      nbaId,
      espnId: Number(athlete.id),
      pos: athlete.position?.abbreviation || 'F',
      height: feet(athlete.displayHeight),
      birthDate: athlete.dateOfBirth?.slice(0, 10) ?? null,
      exp: athlete.experience?.years ?? 0,
      college: athlete.college?.name ?? null,
      jersey: athlete.jersey ?? null,
      _minutes: last && last.gamesPlayed >= 10 ? last.minutesPerGame : -1,
    };
  });

  /* Rotation: whoever played the most minutes last season, rookies and
     unknowns after. It is an estimate; the page says so. */
  players.sort((a, b) => b._minutes - a._minutes);
  let cursor = 0;
  for (const unit of UNITS) {
    const members = players.slice(cursor, cursor + unit.size);
    members.forEach(player => { player.unit = unit.key; });
    cursor += members.length;
  }
  const ordered = UNITS.flatMap(unit => players.filter(player => player.unit === unit.key));
  const clean = ordered.map(({_minutes, ...player}) => player);
  return {
    team: code,
    teamName: team.name,
    teamId: team.id,
    season: '2026-27',
    statsSeason: '2025-26',
    coach: data.coach?.[0] ? `${data.coach[0].firstName} ${data.coach[0].lastName}` : null,
    lastUpdated: new Date().toISOString().slice(0, 10),
    note: 'Rotation is estimated from last season\'s minutes, not an announced lineup.',
    sources: [
      {label: 'ESPN roster', url: `https://www.espn.com/nba/team/roster/_/name/${team.espn}`},
      {label: 'Basketball Reference stats', url: 'https://www.basketball-reference.com/leagues/NBA_2026_per_game.html'},
    ],
    units: UNITS.map(({size, ...unit}) => unit),
    players: clean,
  };
}

fs.mkdirSync(out, {recursive: true});
for (const code of only.length ? only : Object.keys(TEAMS)) {
  const file = path.join(out, `${code}.json`);
  if (fs.existsSync(file) && !force) { console.log(`${code}: kept existing`); continue; }
  const roster = await build(code);
  fs.writeFileSync(file, `${JSON.stringify(roster, null, 2)}\n`);
  const noStats = roster.players.filter(player => !player.bbrefId).length;
  console.log(`${code}: ${roster.players.length} players, ${noStats} without last-season stats`);
}
