// Enhanced stats configuration with separate settings for radar vs comparison table

// All available stats for customization (limited to actual data + calculated stats)
export const allAvailableStats = {
  // Basic Stats
  points: { label: 'PPG', max: 40, category: 'scoring' },
  assists: { label: 'APG', max: 15, category: 'playmaking' },
  totalRebounds: { label: 'RPG', max: 20, category: 'rebounding' },
  steals: { label: 'SPG', max: 3, category: 'defense' },
  blocks: { label: 'BPG', max: 4, category: 'defense' },
  
  // Shooting Stats
  fieldGoalPercentage: { label: 'FG%', max: 70, category: 'shooting' },
  threePointPercentage: { label: '3P%', max: 50, category: 'shooting' },
  freeThrowPercentage: { label: 'FT%', max: 100, category: 'shooting' },
  
  // Calculated Advanced Stats
  trueShootingPercentage: { label: 'TS%', max: 75, category: 'shooting' },
  effectiveFieldGoalPercentage: { label: 'eFG%', max: 70, category: 'shooting' },
  
  // Negative Stats (lower is better)
  turnovers: { label: 'TOV', max: 6, inverted: true, category: 'negative' },
  personalFouls: { label: 'PF', max: 6, inverted: true, category: 'negative' },
  
  // Volume Stats
  fieldGoalsMade: { label: 'FGM', max: 15, category: 'volume' },
  fieldGoalsAttempted: { label: 'FGA', max: 25, category: 'volume' },
  threePointersMade: { label: '3PM', max: 6, category: 'volume' },
  threePointersAttempted: { label: '3PA', max: 12, category: 'volume' },
  freeThrowsMade: { label: 'FTM', max: 12, category: 'volume' },
  freeThrowsAttempted: { label: 'FTA', max: 15, category: 'volume' },
  
  // Rebounding Breakdown
  offensiveRebounds: { label: 'OREB', max: 5, category: 'rebounding' },
  defensiveRebounds: { label: 'DREB', max: 15, category: 'rebounding' },
  
  // Other Stats
  plusMinus: { label: '+/-', max: 20, category: 'advanced' },
  fantasyPoints: { label: 'FPTS', max: 80, category: 'advanced' },
  doubleDoubles: { label: '2x2', max: 50, category: 'advanced' },
  tripleDoubles: { label: '3x3', max: 30, category: 'advanced' }
};

// Default radar chart stats (focused on key performance indicators)
export const defaultRadarStats = [
  'points',
  'assists', 
  'totalRebounds',
  'trueShootingPercentage',
  'threePointPercentage'
];

// Default comparison table stats (comprehensive player comparison)
export const defaultComparisonStats = [
  'points',
  'assists',
  'totalRebounds',
  'steals',
  'blocks',
  'fieldGoalPercentage',
  'threePointPercentage',
  'freeThrowPercentage',
  'trueShootingPercentage',
  'turnovers',
  'personalFouls',
  'plusMinus'
];

// Preset configurations for radar chart
export const defaultRadarConfigs = {
  basic: ['points', 'assists', 'totalRebounds', 'fieldGoalPercentage', 'threePointPercentage'],
  shooting: ['points', 'fieldGoalPercentage', 'threePointPercentage', 'freeThrowPercentage', 'trueShootingPercentage'],
  advanced: ['points', 'assists', 'totalRebounds', 'trueShootingPercentage', 'effectiveFieldGoalPercentage'],
  defense: ['steals', 'blocks', 'defensiveRebounds', 'personalFouls', 'points'],
  playmaking: ['assists', 'points', 'turnovers', 'totalRebounds', 'trueShootingPercentage'],
  complete: ['points', 'assists', 'totalRebounds', 'steals', 'blocks', 'fieldGoalPercentage']
};

// Preset configurations for comparison table
export const defaultComparisonConfigs = {
  essential: ['points', 'assists', 'totalRebounds', 'fieldGoalPercentage', 'threePointPercentage', 'trueShootingPercentage'],
  comprehensive: ['points', 'assists', 'totalRebounds', 'steals', 'blocks', 'fieldGoalPercentage', 'threePointPercentage', 'freeThrowPercentage', 'trueShootingPercentage', 'turnovers', 'personalFouls', 'plusMinus'],
  shooting: ['points', 'fieldGoalPercentage', 'threePointPercentage', 'freeThrowPercentage', 'trueShootingPercentage', 'effectiveFieldGoalPercentage', 'fieldGoalsMade', 'fieldGoalsAttempted', 'threePointersMade', 'threePointersAttempted'],
  advanced: ['points', 'assists', 'totalRebounds', 'trueShootingPercentage', 'effectiveFieldGoalPercentage', 'plusMinus', 'fantasyPoints', 'doubleDoubles', 'tripleDoubles'],
  defense: ['steals', 'blocks', 'defensiveRebounds', 'personalFouls', 'points', 'assists', 'totalRebounds'],
  volume: ['points', 'assists', 'totalRebounds', 'fieldGoalsMade', 'fieldGoalsAttempted', 'threePointersMade', 'threePointersAttempted', 'freeThrowsMade', 'freeThrowsAttempted']
};

// Categories for organization
export const statCategories = {
  scoring: ['points', 'fieldGoalPercentage', 'threePointPercentage', 'freeThrowPercentage', 'trueShootingPercentage', 'effectiveFieldGoalPercentage'],
  playmaking: ['assists', 'turnovers'],
  rebounding: ['totalRebounds', 'offensiveRebounds', 'defensiveRebounds'],
  defense: ['steals', 'blocks', 'personalFouls'],
  advanced: ['trueShootingPercentage', 'effectiveFieldGoalPercentage', 'plusMinus', 'fantasyPoints', 'doubleDoubles', 'tripleDoubles'],
  volume: ['fieldGoalsMade', 'fieldGoalsAttempted', 'threePointersMade', 'threePointersAttempted', 'freeThrowsMade', 'freeThrowsAttempted'],
  negative: ['turnovers', 'personalFouls']
};

// Function to enhance player stats with calculated values
export const enhancePlayerStats = (player) => {
  const stats = { ...player.stats };
  
  // Calculate True Shooting Percentage
  if (stats.points && stats.fieldGoalsAttempted && stats.freeThrowsAttempted) {
    const tsAttempts = stats.fieldGoalsAttempted + 0.44 * stats.freeThrowsAttempted;
    stats.trueShootingPercentage = tsAttempts > 0 ? (stats.points / (2 * tsAttempts)) * 100 : 0;
  }
  
  // Calculate Effective Field Goal Percentage
  if (stats.fieldGoalsMade && stats.threePointersMade && stats.fieldGoalsAttempted) {
    stats.effectiveFieldGoalPercentage = stats.fieldGoalsAttempted > 0 
      ? ((stats.fieldGoalsMade + 0.5 * stats.threePointersMade) / stats.fieldGoalsAttempted) * 100 
      : 0;
  }
  
  return {
    ...player,
    stats
  };
};

// Helper function to get stats by category
export const getStatsByCategory = (category) => {
  return statCategories[category] || [];
};

// Helper function to get current stats configuration
export const getCurrentStats = (statKeys) => {
  const stats = {};
  statKeys.forEach(statKey => {
    if (allAvailableStats[statKey]) {
      stats[statKey] = allAvailableStats[statKey];
    }
  });
  return stats;
};