import fs from 'node:fs';
import { TEAMS } from '../src/lib/teams.js';

/* Expected starting fives from what actually happened in the preseason: for each club, the five players
   who started the most finished preseason games (ties go to the player with more minutes). Writes
   public/data/2026-27/preseason-starters.json (starts and games per player) and moves those five into
   the "starters" unit of the club's roster file, keeping everyone else in their existing order.
   PHI is hand-curated, so it is left alone unless --all is passed.

   Usage: node scripts/build-starters.mjs [--all] */

const all = process.argv.includes('--all');
const rows = JSON.parse(fs.readFileSync('public/data/2026-27/schedule.json', 'utf8')).filter(row => row[9] === 1 && row[6] === 'post');
const plain = name => name.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[.']/g, '').replace(/\s+/g, ' ').trim();
const codeOf = abbr => Object.keys(TEAMS).find(code => TEAMS[code].espn === String(abbr).toLowerCase());
const tally = Object.fromEntries(Object.keys(TEAMS).map(code => [code, new Map()]));
const minutes = value => Number(String(value ?? '0').split(':')[0]) || 0;

for (const [id] of rows) {
  const response = await fetch(`https://site.api.espn.com/apis/site/v2/sports/basketball/nba/summary?event=${id}`);
  if (!response.ok) continue;
  const data = await response.json();
  for (const entry of data.boxscore?.players ?? []) {
    const code = codeOf(entry.team.abbreviation);
    if (!code) continue;
    const block = entry.statistics?.[0];
    const minIndex = block?.labels?.indexOf('MIN') ?? -1;
    for (const item of block?.athletes ?? []) {
      if (item.didNotPlay || !item.stats?.length) continue;
      const record = tally[code].get(String(item.athlete.id)) ?? {espnId: Number(item.athlete.id), name: item.athlete.displayName, starts: 0, games: 0, minutes: 0, pts: 0, reb: 0, ast: 0};
      record.games += 1;
      if (item.starter) record.starts += 1;
      record.minutes += minutes(item.stats[minIndex]);
      for (const [key, label] of [['pts', 'PTS'], ['reb', 'REB'], ['ast', 'AST']]) record[key] += Number(item.stats[block.labels.indexOf(label)]) || 0;
      tally[code].set(String(item.athlete.id), record);
    }
  }
}

/* How guard-like a listed position is (0) to how centre-like (5). */
const RANK = {PG: 0, G: 1, SG: 1, GF: 2, SF: 2.5, F: 3, PF: 4, FC: 4.5, C: 5};
const SLOTS = ['PG', 'SG', 'SF', 'PF', 'C'];
const UNITS = ['starters', 'second', 'third', 'camp'];

const summary = {};
for (const code of Object.keys(TEAMS)) {
  const file = `public/data/2026-27/rosters/${code}.json`;
  const roster = JSON.parse(fs.readFileSync(file, 'utf8'));
  const stats = [...tally[code].values()];
  summary[code] = stats.sort((a, b) => b.starts - a.starts || b.minutes - a.minutes).map(record => ({...record, ppg: +(record.pts / record.games).toFixed(1), rpg: +(record.reb / record.games).toFixed(1), apg: +(record.ast / record.games).toFixed(1)}));
  if ((code === 'PHI' && !all) || !stats.length) { console.log(`${code}: kept (${code === 'PHI' ? 'hand-curated' : 'no preseason games'})`); continue; }

  const onRoster = roster.players.filter(player => stats.some(stat => stat.espnId === player.espnId || plain(stat.name) === plain(player.name)));
  const record = player => stats.find(stat => stat.espnId === player.espnId || plain(stat.name) === plain(player.name));
  const chosen = [...onRoster].sort((a, b) => record(b).starts - record(a).starts || record(b).minutes - record(a).minutes).slice(0, 5);
  if (chosen.length < 5) { console.log(`${code}: only ${chosen.length} candidates, kept`); continue; }

  /* Line them up from guard to centre and hand out the slots in that order, so a team with three guards
     still reads PG, SG, SF, PF, C rather than putting a guard at centre. */
  const placed = new Map();
  [...chosen].sort((a, b) => (RANK[a.pos] ?? 3) - (RANK[b.pos] ?? 3) || record(b).starts - record(a).starts).forEach((player, index) => placed.set(player, SLOTS[index]));

  const rest = roster.players.filter(player => !chosen.includes(player));
  const lineup = SLOTS.map(slot => chosen.find(player => placed.get(player) === slot));
  const sizes = {second: 5, third: 5};
  let cursor = 0;
  const players = [...lineup.map(player => { return {...player, unit: 'starters', slot: placed.get(player)}; })];
  for (const unit of UNITS.slice(1)) {
    const take = sizes[unit] ?? Infinity;
    for (const player of rest.slice(cursor, cursor + take)) { const clean = {...player}; delete clean.slot; players.push({...clean, unit}); }
    cursor += Math.min(take, rest.length - cursor);
  }
  roster.players = players;
  roster.note = 'Starters are the five who started the most 2026–27 preseason games; the rest of the rotation is estimated, and coaches can change any of it.';
  roster.lastUpdated = new Date().toISOString().slice(0, 10);
  fs.writeFileSync(file, `${JSON.stringify(roster, null, 2)}\n`);
  console.log(`${code}: ${lineup.map(player => `${placed.get(player)} ${player.name}`).join(', ')}`);
}
fs.writeFileSync('public/data/2026-27/preseason-starters.json', JSON.stringify(summary));
console.log(`starters: ${rows.length} preseason games read`);
