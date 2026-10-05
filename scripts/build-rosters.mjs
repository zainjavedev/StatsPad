/* Builds public/data/<roster season>/rosters/<TEAM>.json for every team from
   ESPN's roster and depth-chart feeds, plus current-teams.json (who plays
   where now). Teams whose file is marked "curated": true are left alone but
   still count toward current-teams.json.

   node scripts/build-rosters.mjs            (all teams)
   node scripts/build-rosters.mjs BOS LAL    (just these) */
import fs from 'node:fs/promises';

const season = JSON.parse(await fs.readFile('src/season.json', 'utf8'));
const outDir = `public/data/${season.rosters}/rosters`;
const ESPN = 'https://site.api.espn.com/apis/site/v2/sports/basketball/nba';
// ESPN abbreviations -> Basketball Reference, which the stats files use.
const TO_BBREF = {BKN: 'BRK', CHA: 'CHO', GS: 'GSW', NO: 'NOP', NY: 'NYK', PHX: 'PHO', SA: 'SAS', UTAH: 'UTA', WSH: 'WAS'};
const NBA_IDS = {ATL: 1610612737, BOS: 1610612738, CLE: 1610612739, NOP: 1610612740, CHI: 1610612741, DAL: 1610612742, DEN: 1610612743, GSW: 1610612744, HOU: 1610612745, LAC: 1610612746, LAL: 1610612747, MIA: 1610612748, MIL: 1610612749, MIN: 1610612750, BRK: 1610612751, NYK: 1610612752, ORL: 1610612753, IND: 1610612754, PHI: 1610612755, PHO: 1610612756, POR: 1610612757, SAC: 1610612758, SAS: 1610612759, OKC: 1610612760, TOR: 1610612761, UTA: 1610612762, MEM: 1610612763, WAS: 1610612764, DET: 1610612765, CHO: 1610612766};
const SLOTS = ['pg', 'sg', 'sf', 'pf', 'c'];

const key = name => name.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
  .replace(/\b(jr|sr|ii|iii|iv)\b\.?/g, '').replace(/[^a-z]/g, '');
const getJson = async url => {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const response = await fetch(url).catch(() => null);
    if (response?.ok) return response.json();
    await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
  }
  throw new Error(`Failed to fetch ${url}`);
};
const readJson = async path => JSON.parse(await fs.readFile(path, 'utf8').catch(() => 'null'));

const stats = await readJson(`public/data/${season.stats}/regular-season.json`);
const bbrefByName = new Map(stats.players.map(player => [key(player.playerName), player.playerId]));
const nbaIds = await readJson('public/data/player-ids.json');
const nbaIdByName = new Map(Object.entries(nbaIds).map(([name, id]) => [key(name), id]));

/* Starters are the first unused name at each depth-chart slot (PG..C). The
   second and third units then take the next unused names level by level,
   slot by slot; everyone left over is the rest of the roster. */
function assignUnits(roster, chart) {
  const used = new Set(), units = new Map(), slots = new Map();
  const depth = SLOTS.map(slot => (chart?.positions?.[slot]?.athletes || []).map(athlete => String(athlete.id)).filter(id => roster.has(id)));
  depth.forEach((list, index) => {
    const id = list.find(candidate => !used.has(candidate));
    if (!id) return;
    used.add(id); units.set(id, 'starters'); slots.set(id, SLOTS[index].toUpperCase());
  });
  const bench = [];
  for (let level = 0; level < Math.max(0, ...depth.map(list => list.length)); level += 1) {
    for (const list of depth) {
      const id = list[level];
      if (id && !used.has(id)) { used.add(id); bench.push(id); }
    }
  }
  bench.forEach((id, index) => units.set(id, index < 5 ? 'second' : index < 10 ? 'third' : 'camp'));
  return {units, slots};
}

async function buildTeam(team) {
  const espnAbbr = team.abbreviation, code = TO_BBREF[espnAbbr] || espnAbbr;
  const file = `${outDir}/${code}.json`;
  const existing = await readJson(file);
  if (existing?.curated) return {code, players: existing.players, curated: true};
  const [rosterData, depthData] = await Promise.all([
    getJson(`${ESPN}/teams/${team.id}/roster`),
    getJson(`${ESPN}/teams/${team.id}/depthcharts`).catch(() => null),
  ]);
  const athletes = rosterData.athletes || [];
  const {units, slots} = assignUnits(new Set(athletes.map(athlete => String(athlete.id))), depthData?.depthchart?.[0]);
  const order = {starters: 0, second: 1, third: 2, camp: 3};
  const players = athletes.map(athlete => {
    const name = athlete.fullName || athlete.displayName;
    const entry = {
      name,
      espnId: athlete.id,
      bbrefId: bbrefByName.get(key(name)),
      nbaId: nbaIdByName.get(key(name)),
      headshot: athlete.headshot?.href,
      pos: athlete.position?.abbreviation,
      slot: slots.get(String(athlete.id)),
      height: athlete.displayHeight?.replace(/' (\d+)"/, '-$1'),
      birthDate: athlete.dateOfBirth?.slice(0, 10),
      exp: athlete.experience?.years ?? 0,
      college: athlete.college?.name || null,
      jersey: athlete.jersey,
      unit: units.get(String(athlete.id)) || 'camp',
    };
    return Object.fromEntries(Object.entries(entry).filter(([, value]) => value !== undefined));
  }).sort((a, b) => order[a.unit] - order[b.unit] || (a.slot && b.slot ? SLOTS.indexOf(a.slot.toLowerCase()) - SLOTS.indexOf(b.slot.toLowerCase()) : 0));
  const coach = rosterData.coach?.[0];
  const roster = {
    team: code,
    espnAbbr: espnAbbr.toLowerCase(),
    teamName: team.displayName,
    teamId: NBA_IDS[code],
    colors: {primary: `#${team.color || '333333'}`, secondary: `#${team.alternateColor || 'ffffff'}`},
    season: season.rosters,
    statsSeason: season.stats,
    coach: coach ? `${coach.firstName} ${coach.lastName}` : null,
    lastUpdated: new Date().toISOString().slice(0, 10),
    sources: [{label: 'ESPN roster and depth chart', url: `https://www.espn.com/nba/team/depth/_/name/${espnAbbr.toLowerCase()}`}],
    units: [
      {key: 'starters', label: 'Expected starting five', short: 'Starters'},
      {key: 'second', label: 'Second unit', short: '2nd unit'},
      {key: 'third', label: 'Third unit', short: '3rd unit'},
      {key: 'camp', label: 'Rest of roster', short: 'Rest'},
    ],
    players,
  };
  await fs.writeFile(file, `${JSON.stringify(roster, null, 2)}\n`);
  return {code, players};
}

const only = new Set(process.argv.slice(2).map(code => code.toUpperCase()));
const teams = (await getJson(`${ESPN}/teams`)).sports[0].leagues[0].teams.map(entry => entry.team);
await fs.mkdir(outDir, {recursive: true});
const results = [];
for (const team of teams) {
  const code = TO_BBREF[team.abbreviation] || team.abbreviation;
  if (only.size && !only.has(code)) {
    const existing = await readJson(`${outDir}/${code}.json`);
    if (existing) results.push({code, players: existing.players});
    continue;
  }
  const result = await buildTeam(team);
  results.push(result);
  console.log(`${code.padEnd(4)} ${String(result.players.length).padStart(2)} players${result.curated ? ' (curated, kept)' : ''}`);
}

// Who plays where now, keyed by Basketball Reference id and by folded name.
const current = {season: season.rosters, updated: new Date().toISOString().slice(0, 10), byId: {}, byName: {}};
for (const {code, players} of results) for (const player of players) {
  if (player.bbrefId) current.byId[player.bbrefId] = code;
  current.byName[key(player.name)] = code;
}
await fs.writeFile(`public/data/${season.rosters}/current-teams.json`, `${JSON.stringify(current)}\n`);
console.log(`current-teams.json: ${Object.keys(current.byName).length} players`);
