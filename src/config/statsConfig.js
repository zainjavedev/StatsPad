// Simple stats - only the ones that matter
export const allAvailableStats = {
  points: { label: 'PPG', max: 35 },
  assists: { label: 'APG', max: 12 },
  totalRebounds: { label: 'RPG', max: 16 },
  freeThrowsAttempted: { label: 'FTA', max: 12 },
  threePointPercentage: { label: '3PT%', max: 50 },
  fieldGoalPercentage: { label: 'FG%', max: 70 },
  steals: { label: 'SPG', max: 3 },
  blocks: { label: 'BPG', max: 3 },
  turnovers: { label: 'TOV', max: 6, inverted: true },
  efficiency: { label: 'EFF', max: 70 },
  minutesPerGame: { label: 'MIN', max: 45 },
  fieldGoalsMade: { label: 'FGM', max: 15 },
  threePointersMade: { label: '3PM', max: 5 },
  freeThrowsMade: { label: 'FTM', max: 10 },
  freeThrowPercentage: { label: 'FT%', max: 100 },
  offensiveRebounds: { label: 'OREB', max: 5 },
  defensiveRebounds: { label: 'DREB', max: 12 }
};

// Default radar configurations - simple presets
export const defaultRadarConfigs = {
  basic: ['points', 'assists', 'totalRebounds', 'fieldGoalPercentage', 'threePointPercentage'],
  offense: ['points', 'assists', 'fieldGoalPercentage', 'threePointPercentage', 'freeThrowsAttempted'],
  defense: ['steals', 'blocks', 'totalRebounds', 'efficiency'],
  shooting: ['fieldGoalPercentage', 'threePointPercentage', 'points', 'freeThrowsAttempted']
};

// For backward compatibility
export const standardStats = {
  points: allAvailableStats.points,
  fieldGoalPercentage: allAvailableStats.fieldGoalPercentage,
  threePointPercentage: allAvailableStats.threePointPercentage,
  totalRebounds: allAvailableStats.totalRebounds,
  assists: allAvailableStats.assists,
  steals: allAvailableStats.steals,
  blocks: allAvailableStats.blocks
};

export const advancedStats = {
  efficiency: allAvailableStats.efficiency,
  points: allAvailableStats.points,
  fieldGoalPercentage: allAvailableStats.fieldGoalPercentage,
  assists: allAvailableStats.assists,
  totalRebounds: allAvailableStats.totalRebounds,
  steals: allAvailableStats.steals,
  blocks: allAvailableStats.blocks,
  turnovers: allAvailableStats.turnovers
};