// Updated stats configuration with True Shooting and eFG%
export const allAvailableStats = {
  // Basic Stats
  points: { label: 'PPG', max: 35 },
  assists: { label: 'APG', max: 12 },
  totalRebounds: { label: 'RPG', max: 15 },
  steals: { label: 'Steals', max: 3 },
  blocks: { label: 'Blocks', max: 3 },
  turnovers: { label: 'Turnovers', max: 5, inverted: true },
  minutes: { label: 'Minutes', max: 40 },

  // Shooting Stats
  fieldGoalPercentage: { label: 'FG%', max: 60 },
  threePointPercentage: { label: '3PT%', max: 50 },
  freeThrowPercentage: { label: 'FT%', max: 100 },
  trueShootingPercentage: { label: 'TS%', max: 70 },
  effectiveFieldGoalPercentage: { label: 'eFG%', max: 65 },

  // Advanced Stats
  efficiency: { label: 'Efficiency', max: 35 },
  plusMinus: { label: '+/-', max: 15 },
  fieldGoalsAttempted: { label: 'FGA', max: 25 },
  threePointersAttempted: { label: '3PA', max: 12 },
  freeThrowsAttempted: { label: 'FTA', max: 12 },
  defensiveRebounds: { label: 'DREB', max: 12 },
  offensiveRebounds: { label: 'OREB', max: 5 },
  personalFouls: { label: 'Fouls', max: 6, inverted: true }
};

// Default radar configurations
export const defaultRadarConfigs = {
  basic: ['points', 'assists', 'totalRebounds', 'fieldGoalPercentage', 'trueShootingPercentage'],
  shooting: ['fieldGoalPercentage', 'threePointPercentage', 'freeThrowPercentage', 'trueShootingPercentage', 'effectiveFieldGoalPercentage'],
  advanced: ['efficiency', 'trueShootingPercentage', 'plusMinus', 'steals', 'blocks'],
  complete: ['points', 'assists', 'totalRebounds', 'trueShootingPercentage', 'steals', 'blocks', 'turnovers', 'efficiency']
};

// Utility functions for calculating advanced stats
export const calculateTrueShootingPercentage = (points, fga, fta) => {
  if (!points || !fga || fga === 0) return 0;
  const tsa = fga + (0.44 * (fta || 0));
  return tsa > 0 ? (points / (2 * tsa)) * 100 : 0;
};

export const calculateEffectiveFieldGoalPercentage = (fgm, fga, threePM) => {
  if (!fga || fga === 0) return 0;
  return ((fgm + (0.5 * (threePM || 0))) / fga) * 100;
};

// Function to enhance player data with calculated stats
export const enhancePlayerStats = (player) => {
  const stats = { ...player.stats };
  
  // Calculate True Shooting % if we have the required data
  if (stats.points && stats.fieldGoalsAttempted) {
    stats.trueShootingPercentage = calculateTrueShootingPercentage(
      stats.points, 
      stats.fieldGoalsAttempted, 
      stats.freeThrowsAttempted || 0
    );
  }
  
  // Calculate Effective Field Goal % if we have the required data
  if (stats.fieldGoalsMade && stats.fieldGoalsAttempted) {
    stats.effectiveFieldGoalPercentage = calculateEffectiveFieldGoalPercentage(
      stats.fieldGoalsMade,
      stats.fieldGoalsAttempted,
      stats.threePointersMade || 0
    );
  }
  
  return {
    ...player,
    stats
  };
};