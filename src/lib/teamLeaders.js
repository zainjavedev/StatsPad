/* The team rankings under /stats/teams: the radar's skills (scoring, efficiency, shooting, playmaking, rebounding, defense)
   plus single stats like steals and blocks as their own lists. Values are per game; asc lists the lowest first. */
const ts = stats => stats.points / (2 * (stats.fieldGoalsAttempted + .44 * stats.freeThrowsAttempted)) * 100 || 0;

export const TEAM_LEADERS = [
  {slug: 'efficiency', label: 'Efficiency', unit: 'TS%', pct: true, value: ts, note: 'True shooting: points per shot attempt, counting threes and free throws'},
  {slug: 'points', label: 'Scoring', unit: 'PPG', value: stats => stats.points},
  {slug: 'assists', label: 'Playmaking', unit: 'APG', value: stats => stats.assists},
  {slug: 'rebounds', label: 'Rebounding', unit: 'RPG', value: stats => stats.totalRebounds},
  {slug: 'defense', label: 'Defense', unit: 'STL+BLK', value: stats => stats.steals + stats.blocks, note: 'Steals plus blocks per game, the radar&rsquo;s defense axis'},
  {slug: 'steals', label: 'Steals', unit: 'SPG', value: stats => stats.steals},
  {slug: 'blocks', label: 'Blocks', unit: 'BPG', value: stats => stats.blocks},
  {slug: 'field-goal-pct', label: 'Field-goal %', unit: 'FG%', pct: true, value: stats => stats.fieldGoalPercentage},
  {slug: 'three-point-pct', label: 'Three-point %', unit: '3P%', pct: true, value: stats => stats.threePointPercentage},
  {slug: 'threes', label: 'Threes made', unit: '3PM', value: stats => stats.threePointersMade},
  {slug: 'free-throw-pct', label: 'Free-throw %', unit: 'FT%', pct: true, value: stats => stats.freeThrowPercentage},
  {slug: 'turnovers', label: 'Turnovers', unit: 'TOV', value: stats => stats.turnovers, asc: true, note: 'Fewest first'},
];
export const teamStatUrl = slug => `/stats/teams/${slug}`;
export const showValue = (entry, value) => `${value.toFixed(1)}${entry.pct ? '%' : ''}`;
export const rankTeams = (entry, teams) => [...teams].sort((a, b) => (entry.asc ? 1 : -1) * (entry.value(a.stats) - entry.value(b.stats)) || a.playerName.localeCompare(b.playerName));
