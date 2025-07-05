import React, { useRef, useEffect } from 'react';
import { BarChart3, Crown, Download, User, Settings } from 'lucide-react';

const ComparisonTable = ({ 
  selectedPlayers, 
  currentStats, 
  isDarkMode, 
  regularSeasonData, 
  playoffsData,
  showStatsCustomizer,
  setShowStatsCustomizer
}) => {
  const tableRef = useRef(null);

  // Check if we can do season comparison for single player
  const canCompareSeasons = selectedPlayers.length === 1 && regularSeasonData && playoffsData;
  const selectedPlayer = selectedPlayers[0];
  const regularPlayer = canCompareSeasons ? regularSeasonData.players.find(p => p.playerName === selectedPlayer.playerName) : null;
  const playoffPlayer = canCompareSeasons ? playoffsData.players.find(p => p.playerName === selectedPlayer.playerName) : null;
  const isSeasonComparison = regularPlayer && playoffPlayer;

  // Stats where lower values are better
  const lowerIsBetterStats = ['turnovers', 'personalFouls', 'technicalFouls'];

  const getBestValue = (statKey) => {
    const isLowerBetter = lowerIsBetterStats.includes(statKey);
    
    if (isSeasonComparison) {
      // For season comparison, compare regular vs playoff stats
      const regularValue = regularPlayer.stats[statKey];
      const playoffValue = playoffPlayer.stats[statKey];
      if (regularValue !== undefined && playoffValue !== undefined) {
        return isLowerBetter ? Math.min(regularValue, playoffValue) : Math.max(regularValue, playoffValue);
      }
      return regularValue !== undefined ? regularValue : playoffValue;
    }
    
    if (selectedPlayers.length <= 1) return null; // No best/worst for single player without season comparison
    
    const values = selectedPlayers.map(p => p.stats[statKey]).filter(v => v !== undefined);
    if (values.length === 0) return null;
    
    return isLowerBetter ? Math.min(...values) : Math.max(...values);
  };

  const formatValue = (value, statKey) => {
    if (value === undefined || value === null) return 'N/A';
    if (typeof value !== 'number') return value;
    
    if (statKey.includes('Percentage')) {
      return `${value.toFixed(1)}%`;
    }
    
    return value.toFixed(1);
  };

  const downloadTable = () => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    // High-quality canvas settings
    const isMobile = window.innerWidth < 640;
    canvas.width = isMobile ? 600 : 1200; // Doubled for better quality
    canvas.height = isMobile ? 800 : 1000; // Increased height
    
    // Set high DPI scaling
    const scale = 2;
    ctx.scale(scale, scale);
    const scaledWidth = canvas.width / scale;
    const scaledHeight = canvas.height / scale;
    
    // Background with proper styling
    ctx.fillStyle = isDarkMode ? '#1F2937' : '#FFFFFF';
    ctx.fillRect(0, 0, scaledWidth, scaledHeight);
    
    // Add border
    ctx.strokeStyle = isDarkMode ? '#374151' : '#E5E7EB';
    ctx.lineWidth = 1;
    ctx.strokeRect(0, 0, scaledWidth, scaledHeight);
    
    // Title with better styling
    ctx.fillStyle = isDarkMode ? '#F3F4F6' : '#374151';
    ctx.font = `bold ${isMobile ? '16px' : '24px'} system-ui, -apple-system, sans-serif`;
    ctx.textAlign = 'center';
    const title = isSeasonComparison ? 'Regular Season vs Playoffs' : selectedPlayers.length === 1 ? 'Player Stats' : 'Head-to-Head Comparison';
    ctx.fillText(title, scaledWidth / 2, isMobile ? 30 : 40);
    
    // Add subtitle
    ctx.font = `${isMobile ? '12px' : '16px'} system-ui, -apple-system, sans-serif`;
    ctx.fillStyle = isDarkMode ? '#9CA3AF' : '#6B7280';
    const subtitle = isSeasonComparison ? selectedPlayer.playerName : 'NBA Player Comparison';
    ctx.fillText(subtitle, scaledWidth / 2, isMobile ? 50 : 65);
    
    // Calculate improved layout
    const colCount = isSeasonComparison ? 3 : selectedPlayers.length + 1;
    const tableStartX = 20;
    const tableWidth = scaledWidth - 40;
    const colWidth = tableWidth / colCount;
    let yPos = isMobile ? 80 : 100;
    
    // Header with modern styling
    const headerHeight = 50;
    ctx.fillStyle = isDarkMode ? '#374151' : '#F9FAFB';
    ctx.fillRect(tableStartX, yPos - 20, tableWidth, headerHeight);
    
    // Header border
    ctx.strokeStyle = isDarkMode ? '#4B5563' : '#D1D5DB';
    ctx.lineWidth = 1;
    ctx.strokeRect(tableStartX, yPos - 20, tableWidth, headerHeight);
    
    // Header text with better styling
    ctx.fillStyle = isDarkMode ? '#F3F4F6' : '#374151';
    ctx.font = `bold ${isMobile ? '12px' : '16px'} system-ui, -apple-system, sans-serif`;
    ctx.textAlign = 'left';
    ctx.fillText('Statistic', tableStartX + 10, yPos + 5);
    
    // Column headers
    ctx.textAlign = 'center';
    if (isSeasonComparison) {
      // Season comparison headers with better layout
      ctx.fillText('Regular Season', tableStartX + colWidth + colWidth/2, yPos - 5);
      ctx.font = `${isMobile ? '10px' : '12px'} system-ui, -apple-system, sans-serif`;
      ctx.fillStyle = isDarkMode ? '#9CA3AF' : '#6B7280';
      ctx.fillText(`2023-24 Season`, tableStartX + colWidth + colWidth/2, yPos + 10);
      
      ctx.font = `bold ${isMobile ? '12px' : '16px'} system-ui, -apple-system, sans-serif`;
      ctx.fillStyle = isDarkMode ? '#F3F4F6' : '#374151';
      ctx.fillText('Playoffs', tableStartX + colWidth * 2 + colWidth/2, yPos - 5);
      ctx.font = `${isMobile ? '10px' : '12px'} system-ui, -apple-system, sans-serif`;
      ctx.fillStyle = isDarkMode ? '#9CA3AF' : '#6B7280';
      ctx.fillText(`2024 Playoffs`, tableStartX + colWidth * 2 + colWidth/2, yPos + 10);
    } else {
      // Regular player comparison with improved styling
      selectedPlayers.forEach((player, index) => {
        const x = tableStartX + colWidth * (index + 1) + colWidth/2;
        ctx.font = `bold ${isMobile ? '11px' : '15px'} system-ui, -apple-system, sans-serif`;
        ctx.fillStyle = isDarkMode ? '#F3F4F6' : '#374151';
        
        let playerName = player.playerName;
        if (isMobile && playerName.length > 15) {
          const parts = playerName.split(' ');
          playerName = parts.length > 1 ? `${parts[0]} ${parts[parts.length-1][0]}.` : playerName.substring(0, 12) + '...';
        }
        ctx.fillText(playerName, x, yPos - 5);
        
        ctx.font = `${isMobile ? '9px' : '12px'} system-ui, -apple-system, sans-serif`;
        ctx.fillStyle = isDarkMode ? '#9CA3AF' : '#6B7280';
        ctx.fillText(player.team, x, yPos + 10);
      });
    }
    
    yPos += 60;
    
    // Table rows with improved styling
    Object.entries(currentStats).forEach(([statKey, statConfig], index) => {
      const bestValue = getBestValue(statKey);
      const rowHeight = isMobile ? 28 : 35;
      
      // Alternating row backgrounds with subtle styling
      if (index % 2 === 0) {
        ctx.fillStyle = isDarkMode ? 'rgba(55, 65, 81, 0.3)' : 'rgba(249, 250, 251, 0.8)';
        ctx.fillRect(tableStartX, yPos - 18, tableWidth, rowHeight);
      }
      
      // Row border
      ctx.strokeStyle = isDarkMode ? 'rgba(75, 85, 99, 0.3)' : 'rgba(209, 213, 219, 0.5)';
      ctx.lineWidth = 0.5;
      ctx.strokeRect(tableStartX, yPos - 18, tableWidth, rowHeight);
      
      // Stat name with better typography
      ctx.fillStyle = isDarkMode ? '#F3F4F6' : '#374151';
      ctx.font = `${isMobile ? '11px' : '15px'} system-ui, -apple-system, sans-serif`;
      ctx.textAlign = 'left';
      
      let statLabel = statConfig.label;
      if (isMobile && statLabel.length > 15) {
        statLabel = statLabel.substring(0, 15) + '...';
      }
      ctx.fillText(statLabel, tableStartX + 10, yPos);
      
      // Values with highlighting
      ctx.textAlign = 'center';
      ctx.font = `${isMobile ? '12px' : '16px'} system-ui, -apple-system, sans-serif`;
      
      if (isSeasonComparison) {
        const regularValue = regularPlayer.stats[statKey];
        const playoffValue = playoffPlayer.stats[statKey];
        const isBestRegular = regularValue === bestValue && regularValue !== undefined && regularValue !== playoffValue;
        const isBestPlayoff = playoffValue === bestValue && playoffValue !== undefined && playoffValue !== regularValue;
        
        // Regular season value with highlighting
        let x = tableStartX + colWidth + colWidth/2;
        if (isBestRegular) {
          ctx.fillStyle = '#10B981';
          ctx.fillRect(x - colWidth/2 + 5, yPos - 18, colWidth - 10, rowHeight);
          ctx.fillStyle = '#FFFFFF';
          ctx.font = `bold ${isMobile ? '12px' : '16px'} system-ui, -apple-system, sans-serif`;
        } else {
          ctx.fillStyle = isDarkMode ? '#F3F4F6' : '#374151';
        }
        ctx.fillText(formatValue(regularValue, statKey), x, yPos);
        if (isBestRegular) {
          ctx.fillText('👑', x + (isMobile ? 35 : 45), yPos);
        }
        
        // Playoff value with highlighting
        x = tableStartX + colWidth * 2 + colWidth/2;
        if (isBestPlayoff) {
          ctx.fillStyle = '#10B981';
          ctx.fillRect(x - colWidth/2 + 5, yPos - 18, colWidth - 10, rowHeight);
          ctx.fillStyle = '#FFFFFF';
          ctx.font = `bold ${isMobile ? '12px' : '16px'} system-ui, -apple-system, sans-serif`;
        } else {
          ctx.fillStyle = isDarkMode ? '#F3F4F6' : '#374151';
          ctx.font = `${isMobile ? '12px' : '16px'} system-ui, -apple-system, sans-serif`;
        }
        ctx.fillText(formatValue(playoffValue, statKey), x, yPos);
        if (isBestPlayoff) {
          ctx.fillText('👑', x + (isMobile ? 35 : 45), yPos);
        }
      } else {
        selectedPlayers.forEach((player, playerIndex) => {
          const value = player.stats[statKey];
          const isBest = value === bestValue && value !== undefined && selectedPlayers.length > 1;
          const x = tableStartX + colWidth * (playerIndex + 1) + colWidth/2;
          
          if (isBest) {
            ctx.fillStyle = '#10B981';
            ctx.fillRect(x - colWidth/2 + 5, yPos - 18, colWidth - 10, rowHeight);
            ctx.fillStyle = '#FFFFFF';
            ctx.font = `bold ${isMobile ? '12px' : '16px'} system-ui, -apple-system, sans-serif`;
          } else {
            ctx.fillStyle = isDarkMode ? '#F3F4F6' : '#374151';
            ctx.font = `${isMobile ? '12px' : '16px'} system-ui, -apple-system, sans-serif`;
          }
          
          ctx.fillText(formatValue(value, statKey), x, yPos);
          
          if (isBest) {
            ctx.fillText('👑', x + (isMobile ? 35 : 45), yPos);
          }
        });
      }
      
      yPos += rowHeight;
    });
    
    // Add footer with timestamp
    ctx.font = `${isMobile ? '10px' : '12px'} system-ui, -apple-system, sans-serif`;
    ctx.fillStyle = isDarkMode ? '#6B7280' : '#9CA3AF';
    ctx.textAlign = 'center';
    const timestamp = new Date().toLocaleDateString();
    ctx.fillText(`Generated on ${timestamp} • NBA Comparison Dashboard`, scaledWidth / 2, scaledHeight - 20);
    
    // Download with better filename
    const link = document.createElement('a');
    const filename = isSeasonComparison
      ? `${selectedPlayer.playerName.replace(/\s+/g, '-')}-season-comparison.png`
      : selectedPlayers.length === 1 
      ? `${selectedPlayers[0].playerName.replace(/\s+/g, '-')}-stats.png`
      : `nba-comparison-${selectedPlayers.map(p => p.playerName.replace(/\s+/g, '-')).join('-vs-')}.png`;
    link.download = filename;
    link.href = canvas.toDataURL('image/png', 1.0);
    link.click();
  };

  return (
    <div className={`rounded-lg border ${
      isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
    }`}>
      <div className="flex items-center justify-between space-x-3 p-3 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center space-x-3">
          {selectedPlayers.length === 1 ? (
            <User className="h-5 w-5" />
          ) : (
            <BarChart3 className="h-5 w-5" />
          )}
          <h2 className="text-lg font-semibold">
            {isSeasonComparison ? 'Regular Season vs Playoffs' : selectedPlayers.length === 1 ? 'Player Stats' : 'Head-to-Head'}
          </h2>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setShowStatsCustomizer(!showStatsCustomizer)}
            className={`p-2 rounded-lg transition-colors ${
              showStatsCustomizer
                ? 'bg-blue-500 text-white'
                : isDarkMode
                ? 'bg-gray-700 hover:bg-gray-600 text-gray-300'
                : 'bg-gray-100 hover:bg-gray-200 text-gray-600'
            }`}
            title="Customize stats"
          >
            <Settings className="h-4 w-4" />
          </button>
          <button
            onClick={downloadTable}
            className={`p-2 rounded-lg transition-colors ${
              isDarkMode
                ? 'bg-gray-700 hover:bg-gray-600 text-gray-300'
                : 'bg-gray-100 hover:bg-gray-200 text-gray-600'
            }`}
            title="Download table"
          >
            <Download className="h-4 w-4" />
          </button>
        </div>
      </div>
      
      <div className="overflow-x-auto" ref={tableRef}>
        <table className="w-full text-sm">
          <thead>
            <tr className={`${isDarkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
              <th className="px-3 py-2 text-left font-medium sticky left-0 bg-inherit">
                Stat
              </th>
              {isSeasonComparison ? (
                <>
                  <th className="px-3 py-2 text-center font-medium min-w-[100px]">
                    <div className="text-sm">Regular Season</div>
                    <div className="text-xs text-gray-500">{selectedPlayer.team}</div>
                  </th>
                  <th className="px-3 py-2 text-center font-medium min-w-[100px]">
                    <div className="text-sm">Playoffs</div>
                    <div className="text-xs text-gray-500">{selectedPlayer.team}</div>
                  </th>
                </>
              ) : (
                selectedPlayers.map((player) => (
                  <th key={player.playerName} className="px-3 py-2 text-center font-medium min-w-[100px]">
                    <div className="text-sm truncate">{player.playerName}</div>
                    <div className="text-xs text-gray-500">{player.team}</div>
                  </th>
                ))
              )}
            </tr>
          </thead>
          <tbody>
            {Object.entries(currentStats).map(([statKey, statConfig]) => {
              const bestValue = getBestValue(statKey);
              
              return (
                <tr key={statKey} className={`${
                  isDarkMode ? 'border-gray-700' : 'border-gray-200'
                } border-t`}>
                  <td className="px-3 py-2 font-medium sticky left-0 bg-inherit text-sm">
                    {statConfig.label}
                  </td>
                  {isSeasonComparison ? (
                    <>
                      {/* Regular Season Value */}
                      {(() => {
                        const regularValue = regularPlayer.stats[statKey];
                        const playoffValue = playoffPlayer.stats[statKey];
                        const isBestRegular = regularValue === bestValue && regularValue !== undefined && regularValue !== playoffValue;
                        
                        return (
                          <td className={`px-3 py-2 text-center ${
                            isBestRegular 
                              ? 'bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-200 font-semibold' 
                              : ''
                          }`}>
                            <div className="flex items-center justify-center space-x-1">
                              <span className="text-sm">{formatValue(regularValue, statKey)}</span>
                              {isBestRegular && <Crown className="h-4 w-4 text-green-600" />}
                            </div>
                          </td>
                        );
                      })()}
                      
                      {/* Playoff Value */}
                      {(() => {
                        const regularValue = regularPlayer.stats[statKey];
                        const playoffValue = playoffPlayer.stats[statKey];
                        const isBestPlayoff = playoffValue === bestValue && playoffValue !== undefined && playoffValue !== regularValue;
                        
                        return (
                          <td className={`px-3 py-2 text-center ${
                            isBestPlayoff 
                              ? 'bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-200 font-semibold' 
                              : ''
                          }`}>
                            <div className="flex items-center justify-center space-x-1">
                              <span className="text-sm">{formatValue(playoffValue, statKey)}</span>
                              {isBestPlayoff && <Crown className="h-4 w-4 text-green-600" />}
                            </div>
                          </td>
                        );
                      })()}
                    </>
                  ) : (
                    selectedPlayers.map((player) => {
                      const value = player.stats[statKey];
                      const isBest = value === bestValue && value !== undefined && selectedPlayers.length > 1;
                      
                      return (
                        <td key={player.playerName} className={`px-3 py-2 text-center ${
                          isBest 
                            ? 'bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-200 font-semibold' 
                            : ''
                        }`}>
                          <div className="flex items-center justify-center space-x-1">
                            <span className="text-sm">{formatValue(value, statKey)}</span>
                            {isBest && <Crown className="h-4 w-4 text-green-600" />}
                          </div>
                        </td>
                      );
                    })
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      
      {selectedPlayers.length === 1 && !isSeasonComparison && (
        <div className="p-3 border-t border-gray-200 dark:border-gray-700">
          <div className="text-xs text-gray-500 text-center">
            💡 Add more players to see comparisons and best/worst indicators
          </div>
        </div>
      )}
    </div>
  );
};

export default ComparisonTable;