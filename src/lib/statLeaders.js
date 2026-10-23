/* The stats on the home page's Top performers panel, and the page that lists everyone for one of them.
   home: false keeps a stat to its own page and out of the home panel. */
export const LEADERS = [
  {slug: 'points', key: 'points', label: 'Points', unit: 'PPG'},
  {slug: 'rebounds', key: 'totalRebounds', label: 'Rebounds', unit: 'RPG'},
  {slug: 'assists', key: 'assists', label: 'Assists', unit: 'APG'},
  {slug: 'steals', key: 'steals', label: 'Steals', unit: 'SPG'},
  {slug: 'blocks', key: 'blocks', label: 'Blocks', unit: 'BPG'},
  {slug: 'threes', key: 'threePointersMade', label: 'Threes made', unit: '3PM'},
  {slug: 'three-point-pct', key: 'threePointPercentage', label: 'Three-point %', unit: '3P%', pct: true, min: ['threePointersAttempted', 3]},
  {slug: 'field-goal-pct', key: 'fieldGoalPercentage', label: 'Field-goal %', unit: 'FG%', pct: true, min: ['fieldGoalsAttempted', 8]},
  {slug: 'free-throw-pct', key: 'freeThrowPercentage', label: 'Free-throw %', unit: 'FT%', pct: true, min: ['freeThrowsAttempted', 4]},
  {slug: 'turnovers', key: 'turnovers', label: 'Turnovers', unit: 'TOV', home: false},
];
export const statUrl = slug => `/stats/${slug}`;
