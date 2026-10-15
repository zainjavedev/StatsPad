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

const SLOTS = ['PG', 'SG', 'SF', 'PF', 'C'];
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
  const depthResponse = await fetch(`https://site.api.espn.com/apis/site/v2/sports/basketball/nba/teams/${team.espn}/depthcharts`);
  const depth = depthResponse.ok ? (await depthResponse.json()).depthchart?.[0]?.positions ?? {} : {};

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

  /* Starters come from ESPN's depth chart: the first name at each position,
     skipping anyone already taken at an earlier slot. Everyone else is ordered
     by how high they sit on the chart, then by last season's minutes. Without
     a depth chart it falls back to minutes alone. */
  const byEspnId = new Map(players.map(player => [String(player.espnId), player]));
  const taken = new Set();
  for (const slot of SLOTS) {
    const pick = (depth[slot.toLowerCase()]?.athletes ?? []).map(entry => byEspnId.get(String(entry.id))).find(player => player && !taken.has(player));
    if (pick) { pick.unit = 'starters'; pick.slot = slot; taken.add(pick); }
  }
  const spare = players.filter(player => !taken.has(player)).sort((a, b) => b._minutes - a._minutes);
  while (taken.size < 5 && spare.length) { const player = spare.shift(); player.unit = 'starters'; taken.add(player); }
  const depthRank = new Map();
  for (const slot of SLOTS) (depth[slot.toLowerCase()]?.athletes ?? []).forEach((entry, index) => {
    const player = byEspnId.get(String(entry.id));
    if (player) depthRank.set(player, Math.min(depthRank.get(player) ?? Infinity, index));
  });
  const rest = players.filter(player => !taken.has(player))
    .sort((a, b) => (depthRank.get(a) ?? 99) - (depthRank.get(b) ?? 99) || b._minutes - a._minutes);
  const open = UNITS.filter(unit => unit.key !== 'starters');
  let cursor = 0;
  for (const unit of open) {
    const members = rest.slice(cursor, cursor + unit.size);
    members.forEach(player => { player.unit = unit.key; });
    cursor += members.length;
  }

  const ordered = UNITS.flatMap(unit => unit.key === 'starters'
    ? [...SLOTS.map(slot => players.find(player => player.slot === slot)).filter(Boolean), ...players.filter(player => player.unit === 'starters' && !player.slot)]
    : rest.filter(player => player.unit === unit.key));
  const clean = ordered.map(({_minutes, ...player}) => player);
  return {
    team: code,
    teamName: team.name,
    teamId: team.id,
    season: '2026-27',
    statsSeason: '2025-26',
    coach: data.coach?.[0] ? `${data.coach[0].firstName} ${data.coach[0].lastName}` : null,
    lastUpdated: new Date().toISOString().slice(0, 10),
    note: 'Starters follow ESPN\'s depth chart and the rest of the rotation is estimated; coaches can change any of it.',
    sources: [
      {label: 'ESPN roster', url: `https://www.espn.com/nba/team/roster/_/name/${team.espn}`},
      {label: 'ESPN depth chart', url: `https://www.espn.com/nba/team/depth/_/name/${team.espn}`},
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
