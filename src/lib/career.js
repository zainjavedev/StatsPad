/* Season-by-season history, from public/data/careers/<slug>.json plus the
   season in progress from the live feed. Rows are per-game averages. */

import { teamCodeOf } from './teams.js';

export const tsOf = row => (row.fga || row.fta ? (row.pts / (2 * (row.fga + 0.44 * row.fta))) * 100 : 0);

/* The live feed's player record in the same shape as a history row. */
export const liveRow = (entity, season) => {
  const s = entity.stats;
  return {
    s: season, t: /^\d+TM$/.test(entity.team) ? 'TOT' : teamCodeOf(entity.team), live: 1,
    gp: entity.gamesPlayed, gs: entity.gamesStarted || 0, mpg: entity.minutesPerGame,
    pts: s.points, reb: s.totalRebounds, ast: s.assists, stl: s.steals, blk: s.blocks, tov: s.turnovers, pf: s.personalFouls,
    fgm: s.fieldGoalsMade, fga: s.fieldGoalsAttempted, fgp: s.fieldGoalPercentage,
    tpm: s.threePointersMade, tpa: s.threePointersAttempted, tpp: s.threePointPercentage,
    ftm: s.freeThrowsMade, fta: s.freeThrowsAttempted, ftp: s.freeThrowPercentage,
  };
};

/* One entry per season: the combined row when a player was traded (with the
   per-team rows as `stints`), otherwise the single row. The live row replaces
   the stored one for the season in progress. */
export function seasonsOf(rows, live) {
  const bySeason = new Map();
  for (const row of rows) bySeason.set(row.s, [...(bySeason.get(row.s) || []), row]);
  const seasons = [...bySeason].map(([s, list]) => {
    const total = list.find(row => row.tot);
    return {s, main: total || list[0], stints: total ? list.filter(row => !row.tot) : []};
  });
  if (live) {
    const found = seasons.find(entry => entry.s === live.s);
    if (found) found.main = live; else seasons.push({s: live.s, main: live, stints: []});
  }
  return seasons.sort((a, b) => a.s.localeCompare(b.s));
}

/* Career line: counting averages weighted by games, percentages from made/attempted. */
export function careerOf(seasons) {
  const rows = seasons.map(entry => entry.main).filter(row => row.gp > 0);
  const gp = rows.reduce((sum, row) => sum + row.gp, 0);
  if (!gp) return null;
  const mean = key => rows.reduce((sum, row) => sum + row[key] * row.gp, 0) / gp;
  const share = (made, attempted) => { const total = rows.reduce((sum, row) => sum + row[attempted] * row.gp, 0); return total ? (rows.reduce((sum, row) => sum + row[made] * row.gp, 0) / total) * 100 : 0; };
  const line = {s: 'Career', t: '', gp, gs: rows.reduce((sum, row) => sum + row.gs, 0)};
  for (const key of ['mpg', 'pts', 'reb', 'ast', 'stl', 'blk', 'tov', 'pf', 'fgm', 'fga', 'tpm', 'tpa', 'ftm', 'fta']) line[key] = mean(key);
  line.fgp = share('fgm', 'fga'); line.tpp = share('tpm', 'tpa'); line.ftp = share('ftm', 'fta');
  return line;
}

/* Best season for a counting stat, for the career-high chips. */
export const bestSeason = (seasons, key) => seasons.filter(entry => entry.main.gp >= 20).reduce((best, entry) => (!best || entry.main[key] > best.main[key] ? entry : best), null);
