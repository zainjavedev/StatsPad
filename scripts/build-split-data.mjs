import fs from 'node:fs/promises';

const sourceFile = process.argv[2] || 'public/data/2025-26/regular-season.json';
const outputFile = process.argv[3] || 'public/data/2025-26/splits-regular-season.json';
const source = JSON.parse(await fs.readFile(sourceFile, 'utf8'));
const base = 'https://app.sportsfbi.com/api';
const normalize = value => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '');
const getJson = async url => { const response = await fetch(url); if (!response.ok) return null; return response.json(); };
const candidates = source.players.filter(player => player.gamesPlayed >= 15 && player.minutesPerGame >= 10).slice(0, 100);
const records = [];
for (let index = 0; index < candidates.length; index += 8) {
  const batch = candidates.slice(index, index + 8);
  const found = await Promise.all(batch.map(async player => {
    const search = await getJson(`${base}/nba/players?q=${encodeURIComponent(player.playerName)}`);
    const match = search?.players?.find(item => normalize(item.full_name) === normalize(player.playerName)) || search?.players?.[0];
    if (!match) return null;
    const [quarter, clutch] = await Promise.all([
      getJson(`${base}/nba/players/${match.id}/quarter-stats?season=2025`),
      getJson(`${base}/nba/players/${match.id}/clutch-stats?season=2025`),
    ]);
    if (!quarter?.quarters?.length && !clutch?.clutch) return null;
    return { playerId: player.playerId, playerName: player.playerName, team: player.team, quarter: quarter?.quarters || [], clutch: clutch?.clutch || null, clutchScore: clutch?.clutchScore ?? null };
  }));
  records.push(...found.filter(Boolean));
  console.log(`Fetched ${Math.min(index + batch.length, candidates.length)}/${candidates.length}`);
}
const quarters = Object.fromEntries(['Q1', 'Q2', 'Q3', 'Q4'].map(label => [label, records.map(record => {
  const split = record.quarter.find(item => item.label === label);
  return split ? { playerId: record.playerId, playerName: record.playerName, team: record.team, pts: split.pts, tsPct: Number((split.ts_pct * 100).toFixed(1)), usagePct: Number((split.usage_pct * 100).toFixed(1)) } : null;
}).filter(Boolean).sort((a, b) => b.pts - a.pts).slice(0, 10)]));
const clutch = records.filter(record => record.clutch).map(record => ({ playerId: record.playerId, playerName: record.playerName, team: record.team, games: record.clutch.games, pts: record.clutch.pts, clutchPoints: Math.round(record.clutch.pts * record.clutch.games), reb: record.clutch.reb, ast: record.clutch.ast, fgPct: Number((record.clutch.fg_pct * 100).toFixed(1)), clutchScore: record.clutchScore })).sort((a, b) => b.clutchPoints - a.clutchPoints).slice(0, 10);
await fs.writeFile(outputFile, `${JSON.stringify({ season: '2025-26', seasonType: 'Regular Season', source: { name: 'SportsFBI NBA split feed', url: 'https://sportsfbi.com/api-docs' }, quarters, clutch, recordsFetched: records.length }, null, 2)}\n`);
console.log(`Wrote ${records.length} split records to ${outputFile}`);
