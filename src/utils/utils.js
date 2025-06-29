/**
 * Format stat values for display
 */
export const formatStatValue = (value, statKey) => {
  if (typeof value !== 'number') return value;
  
  const formatted = value.toFixed(1);
  
  if (statKey.includes('Percentage')) {
    return `${formatted}%`;
  }
  
  return formatted;
};

/**
 * Get normalized stat value for radar chart
 */
export const getNormalizedStatValue = (player, statKey, statConfig) => {
  const value = player.stats[statKey];
  
  if (statConfig.inverted) {
    return Math.max(0, ((statConfig.max - value) / statConfig.max) * 100);
  }
  
  return Math.min(100, (value / statConfig.max) * 100);
};

/**
 * Generate shareable URL for current comparison
 */
export const generateShareableUrl = (selectedPlayers, isPlayoffs, showAdvanced) => {
  const url = new URL(window.location.origin);
  url.searchParams.set('players', selectedPlayers.map(p => p.playerName).join(','));
  url.searchParams.set('season', isPlayoffs ? 'playoffs' : 'regular');
  url.searchParams.set('stats', showAdvanced ? 'advanced' : 'standard');
  
  return url.toString();
};

/**
 * Parse URL parameters to restore comparison state
 */
export const parseUrlParameters = () => {
  const urlParams = new URLSearchParams(window.location.search);
  
  return {
    players: urlParams.get('players')?.split(',').filter(Boolean) || [],
    isPlayoffs: urlParams.get('season') === 'playoffs',
    showAdvanced: urlParams.get('stats') === 'advanced'
  };
};

/**
 * Download canvas as image
 */
export const downloadCanvasAsImage = (canvas, filename = 'nba-comparison', format = 'png') => {
  if (!canvas) return;
  
  const link = document.createElement('a');
  link.download = `${filename}.${format}`;
  link.href = canvas.toDataURL(`image/${format}`);
  link.click();
};

/**
 * Debounce function for search input
 */
export const debounce = (func, wait) => {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
};