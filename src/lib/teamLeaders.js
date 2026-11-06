/* The team rankings under /stats/teams: the radar's skills (scoring, efficiency, shooting, playmaking, rebounding, defense)
   plus single stats like steals and blocks as their own lists. Values are per game; asc lists the lowest first.
   The blowout lists are season counts instead (count: true), filled in from the schedule's results by addBlowouts, with
   the biggest margin breaking ties (tie). */
const ts = stats => stats.points / (2 * (stats.fieldGoalsAttempted + .44 * stats.freeThrowsAttempted)) * 100 || 0;

export const TEAM_LEADERS = [
  {slug: 'efficiency', label: 'Efficiency', unit: 'TS%', pct: true, value: ts, note: 'True shooting'},
  {slug: 'points', label: 'Scoring', unit: 'PPG', value: stats => stats.points},
  {slug: 'assists', label: 'Playmaking', unit: 'APG', value: stats => stats.assists},
  {slug: 'rebounds', label: 'Rebounding', unit: 'RPG', value: stats => stats.totalRebounds},
  {slug: 'defense', label: 'Stocks', unit: 'STK', value: stats => stats.steals + stats.blocks, note: 'Steals + blocks'},
  {slug: 'steals', label: 'Steals', unit: 'SPG', value: stats => stats.steals},
  {slug: 'blocks', label: 'Blocks', unit: 'BPG', value: stats => stats.blocks},
  {slug: 'field-goal-pct', label: 'Field-goal %', unit: 'FG%', pct: true, value: stats => stats.fieldGoalPercentage},
  {slug: 'three-point-pct', label: 'Three-point %', unit: '3P%', pct: true, value: stats => stats.threePointPercentage},
  {slug: 'threes', label: 'Threes made', unit: '3PM', value: stats => stats.threePointersMade},
  {slug: 'free-throw-pct', label: 'Free-throw %', unit: 'FT%', pct: true, value: stats => stats.freeThrowPercentage},
  {slug: 'turnovers', label: 'Turnovers', unit: 'TOV', value: stats => stats.turnovers, asc: true, note: 'Fewest first'},
  {slug: 'blowout-wins', label: 'Blowout wins', unit: 'W', count: true, value: stats => stats.blowoutWins ?? 0, tie: stats => stats.biggestWin ?? 0, detail: stats => (stats.biggestWin >= BLOWOUT ? `biggest +${stats.biggestWin}` : ''), note: 'Won by 20 or more'},
  {slug: 'blowout-losses', label: 'Blowout losses', unit: 'L', count: true, value: stats => stats.blowoutLosses ?? 0, tie: stats => stats.biggestLoss ?? 0, detail: stats => (stats.biggestLoss >= BLOWOUT ? `worst −${stats.biggestLoss}` : ''), note: 'Lost by 20 or more'},
];
export const teamStatUrl = slug => `/stats/teams/${slug}`;
export const showValue = (entry, value) => (entry.count ? String(value) : `${value.toFixed(1)}${entry.pct ? '%' : ''}`);
export const rankTeams = (entry, teams) => [...teams].sort((a, b) => (entry.asc ? 1 : -1) * (entry.value(a.stats) - entry.value(b.stats))
  || (entry.tie ? entry.tie(b.stats) - entry.tie(a.stats) : 0) || a.playerName.localeCompare(b.playerName));

/* A blowout is a final decided by 20 or more. Schedule rows are [id, start, away, home, venue, tv, state, awayScore, homeScore, preseason];
   only finished regular-season (and playoff) games count. Returns the teams with blowoutWins, blowoutLosses, biggestWin and biggestLoss in stats. */
export const BLOWOUT = 20;
export function addBlowouts(teams, schedule) {
  const tally = {};
  const add = (code, key, margin) => {
    const row = (tally[code] ??= {blowoutWins: 0, blowoutLosses: 0, biggestWin: 0, biggestLoss: 0});
    if (key === 'win') { row.biggestWin = Math.max(row.biggestWin, margin); if (margin >= BLOWOUT) row.blowoutWins += 1; } else { row.biggestLoss = Math.max(row.biggestLoss, margin); if (margin >= BLOWOUT) row.blowoutLosses += 1; }
  };
  for (const [, , away, home, , , state, awayScore, homeScore, preseason] of schedule ?? []) {
    if (state !== 'post' || preseason === 1 || awayScore == null || homeScore == null || awayScore === homeScore) continue;
    const margin = Math.abs(awayScore - homeScore), [winner, loser] = awayScore > homeScore ? [away, home] : [home, away];
    add(winner, 'win', margin); add(loser, 'loss', margin);
  }
  return teams.map(team => ({...team, stats: {...team.stats, blowoutWins: 0, blowoutLosses: 0, biggestWin: 0, biggestLoss: 0, ...tally[team.team]}}));
}
