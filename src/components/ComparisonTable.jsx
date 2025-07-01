import React, { useRef, useEffect } from 'react';
import { BarChart3, Crown, Download, User } from 'lucide-react';

const ComparisonTable = ({ selectedPlayers, currentStats, isDarkMode, regularSeasonData, playoffsData }) => {
  const tableRef = useRef(null);

  // Check if we can do season comparison for single player
  const canCompareSeasons = selectedPlayers.length === 1 && regularSeasonData && playoffsData;
  const selectedPlayer = selectedPlayers[0];
  const regularPlayer = canCompareSeasons ? regularSeasonData.players.find(p => p.playerName === selectedPlayer.playerName) : null;
  const playoffPlayer = canCompareSeasons ? playoffsData.players.find(p => p.playerName === selectedPlayer.playerName) : null;
  const isSeasonComparison = regularPlayer && playoffPlayer;

  const getBestValue = (statKey) => {
    if (isSeasonComparison) {
      // For season comparison, compare regular vs playoff stats
      const regularValue = regularPlayer.stats[statKey];
      const playoffValue = playoffPlayer.stats[statKey];
      if (regularValue !== undefined && playoffValue !== undefined) {
        return Math.max(regularValue, playoffValue);
      }
      return regularValue !== undefined ? regularValue : playoffValue;
    }
    
    if (selectedPlayers.length <= 1) return null; // No best/worst for single player without season comparison
    
    const values = selectedPlayers.map(p => p.stats[statKey]).filter(v => v !== undefined);
    if (values.length === 0) return null;
    
    return Math.max(...values);
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
    const table = tableRef.current;
    if (!table) return;

    // Create a canvas to draw the table
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    // Set canvas size based on screen size
    const isMobile = window.innerWidth < 640;
    canvas.width = isMobile ? 600 : 800;
    canvas.height = isMobile ? 500 : 600;
    
    // Background
    ctx.fillStyle = isDarkMode ? '#1F2937' : '#FFFFFF';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Title
    ctx.fillStyle = isDarkMode ? '#F3F4F6' : '#374151';
    ctx.font = `bold ${isMobile ? '16px' : '20px'} system-ui, -apple-system, sans-serif`;
    ctx.textAlign = 'center';
    const title = isSeasonComparison ? 'Regular Season vs Playoffs' : selectedPlayers.length === 1 ? 'Player Stats' : 'Head-to-Head Comparison';
    ctx.fillText(title, canvas.width / 2, isMobile ? 30 : 40);
    
    // Table headers
    ctx.font = `bold ${isMobile ? '12px' : '14px'} system-ui, -apple-system, sans-serif`;
    ctx.textAlign = 'left';
    
    const colWidth = canvas.width / (isSeasonComparison ? 3 : selectedPlayers.length + 1);
    let yPos = isMobile ? 60 : 80;
    
    // Header row
    ctx.fillStyle = isDarkMode ? '#374151' : '#F9FAFB';
    ctx.fillRect(0, yPos - 20, canvas.width, 30);
    
    ctx.fillStyle = isDarkMode ? '#F3F4F6' : '#374151';
    ctx.fillText('Stat', 20, yPos);
    
    if (isSeasonComparison) {
      // Season comparison headers
      ctx.fillText('Regular Season', colWidth + 20, yPos - 10);
      ctx.font = `${isMobile ? '10px' : '12px'} system-ui, -apple-system, sans-serif`;
      ctx.fillStyle = isDarkMode ? '#9CA3AF' : '#6B7280';
      ctx.fillText(`${selectedPlayer.playerName} (${selectedPlayer.team})`, colWidth + 20, yPos + 5);
      
      ctx.font = `bold ${isMobile ? '12px' : '14px'} system-ui, -apple-system, sans-serif`;
      ctx.fillStyle = isDarkMode ? '#F3F4F6' : '#374151';
      ctx.fillText('Playoffs', colWidth * 2 + 20, yPos - 10);
      ctx.font = `${isMobile ? '10px' : '12px'} system-ui, -apple-system, sans-serif`;
      ctx.fillStyle = isDarkMode ? '#9CA3AF' : '#6B7280';
      ctx.fillText(`${selectedPlayer.playerName} (${selectedPlayer.team})`, colWidth * 2 + 20, yPos + 5);
    } else {
      // Regular player comparison headers
      selectedPlayers.forEach((player, index) => {
        const x = colWidth * (index + 1) + 20;
        ctx.fillText(player.playerName, x, yPos - 10);
        ctx.font = `${isMobile ? '10px' : '12px'} system-ui, -apple-system, sans-serif`;
        ctx.fillStyle = isDarkMode ? '#9CA3AF' : '#6B7280';
        ctx.fillText(player.team, x, yPos + 5);
        ctx.font = `bold ${isMobile ? '12px' : '14px'} system-ui, -apple-system, sans-serif`;
        ctx.fillStyle = isDarkMode ? '#F3F4F6' : '#374151';
      });
    }
    
    yPos += 40;
    
    // Table rows
    Object.entries(currentStats).forEach(([statKey, statConfig], index) => {
      const bestValue = getBestValue(statKey);
      
      // Alternating row background
      if (index % 2 === 0) {
        ctx.fillStyle = isDarkMode ? '#374151' : '#F9FAFB';
        ctx.fillRect(0, yPos - 15, canvas.width, 25);
      }
      
      // Stat name
      ctx.fillStyle = isDarkMode ? '#F3F4F6' : '#374151';
      ctx.font = `${isMobile ? '12px' : '14px'} system-ui, -apple-system, sans-serif`;
      ctx.fillText(statConfig.label, 20, yPos);
      
      // Player values
      if (isSeasonComparison) {
        // Season comparison values
        const regularValue = regularPlayer.stats[statKey];
        const playoffValue = playoffPlayer.stats[statKey];
        const isBestRegular = regularValue === bestValue && regularValue !== undefined && regularValue !== playoffValue;
        const isBestPlayoff = playoffValue === bestValue && playoffValue !== undefined && playoffValue !== regularValue;
        
        // Regular season value
        let x = colWidth + 20;
        if (isBestRegular) {
          ctx.fillStyle = '#10B981';
          ctx.fillRect(x - 5, yPos - 15, colWidth - 20, 25);
          ctx.fillStyle = '#FFFFFF';
        } else {
          ctx.fillStyle = isDarkMode ? '#F3F4F6' : '#374151';
        }
        ctx.fillText(formatValue(regularValue, statKey), x, yPos);
        if (isBestRegular) {
          ctx.fillText('👑', x + (isMobile ? 40 : 60), yPos);
        }
        
        // Playoff value
        x = colWidth * 2 + 20;
        if (isBestPlayoff) {
          ctx.fillStyle = '#10B981';
          ctx.fillRect(x - 5, yPos - 15, colWidth - 20, 25);
          ctx.fillStyle = '#FFFFFF';
        } else {
          ctx.fillStyle = isDarkMode ? '#F3F4F6' : '#374151';
        }
        ctx.fillText(formatValue(playoffValue, statKey), x, yPos);
        if (isBestPlayoff) {
          ctx.fillText('👑', x + (isMobile ? 40 : 60), yPos);
        }
      } else {
        // Regular player comparison values
        selectedPlayers.forEach((player, playerIndex) => {
          const value = player.stats[statKey];
          const isBest = value === bestValue && value !== undefined && selectedPlayers.length > 1;
          const x = colWidth * (playerIndex + 1) + 20;
          
          if (isBest) {
            // Highlight best value (only for comparisons)
            ctx.fillStyle = '#10B981';
            ctx.fillRect(x - 5, yPos - 15, colWidth - 20, 25);
            ctx.fillStyle = '#FFFFFF';
          } else {
            ctx.fillStyle = isDarkMode ? '#F3F4F6' : '#374151';
          }
          
          ctx.fillText(formatValue(value, statKey), x, yPos);
          
          if (isBest) {
            ctx.fillText('👑', x + (isMobile ? 40 : 60), yPos);
          }
        });
      }
      
      yPos += isMobile ? 25 : 30;
    });
    
    // Download
    const link = document.createElement('a');
    const filename = isSeasonComparison
      ? `${selectedPlayer.playerName.replace(/\s+/g, '-')}-season-comparison.png`
      : selectedPlayers.length === 1 
      ? `${selectedPlayers[0].playerName.replace(/\s+/g, '-')}-stats.png`
      : 'nba-head-to-head.png';
    link.download = filename;
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

  return (
    <div className={`rounded-lg border ${
      isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
    }`}>
      <div className="flex items-center justify-between space-x-3 p-3 sm:p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center space-x-3">
          {selectedPlayers.length === 1 ? (
            <User className="h-4 w-4 sm:h-5 sm:w-5" />
          ) : (
            <BarChart3 className="h-4 w-4 sm:h-5 sm:w-5" />
          )}
          <h2 className="text-base sm:text-lg font-semibold">
            {isSeasonComparison ? 'Regular Season vs Playoffs' : selectedPlayers.length === 1 ? 'Player Stats' : 'Head-to-Head'}
          </h2>
        </div>
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
      
      <div className="overflow-x-auto" ref={tableRef}>
        <table className="w-full text-sm">
          <thead>
            <tr className={`${isDarkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
              <th className="px-3 sm:px-4 py-2 sm:py-3 text-left font-medium sticky left-0 bg-inherit">
                Stat
              </th>
              {isSeasonComparison ? (
                <>
                  <th className="px-3 sm:px-4 py-2 sm:py-3 text-center font-medium min-w-[120px]">
                    <div className="text-xs sm:text-sm">Regular Season</div>
                    <div className="text-xs text-gray-500">{selectedPlayer.team}</div>
                  </th>
                  <th className="px-3 sm:px-4 py-2 sm:py-3 text-center font-medium min-w-[120px]">
                    <div className="text-xs sm:text-sm">Playoffs</div>
                    <div className="text-xs text-gray-500">{selectedPlayer.team}</div>
                  </th>
                </>
              ) : (
                selectedPlayers.map((player) => (
                  <th key={player.playerName} className="px-3 sm:px-4 py-2 sm:py-3 text-center font-medium min-w-[120px]">
                    <div className="text-xs sm:text-sm truncate">{player.playerName}</div>
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
                  <td className="px-3 sm:px-4 py-2 sm:py-3 font-medium sticky left-0 bg-inherit text-xs sm:text-sm">
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
                          <td className={`px-3 sm:px-4 py-2 sm:py-3 text-center ${
                            isBestRegular 
                              ? 'bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-200 font-semibold' 
                              : ''
                          }`}>
                            <div className="flex items-center justify-center space-x-1">
                              <span className="text-xs sm:text-sm">{formatValue(regularValue, statKey)}</span>
                              {isBestRegular && <Crown className="h-3 w-3 sm:h-4 sm:w-4 text-green-600" />}
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
                          <td className={`px-3 sm:px-4 py-2 sm:py-3 text-center ${
                            isBestPlayoff 
                              ? 'bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-200 font-semibold' 
                              : ''
                          }`}>
                            <div className="flex items-center justify-center space-x-1">
                              <span className="text-xs sm:text-sm">{formatValue(playoffValue, statKey)}</span>
                              {isBestPlayoff && <Crown className="h-3 w-3 sm:h-4 sm:w-4 text-green-600" />}
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
                        <td key={player.playerName} className={`px-3 sm:px-4 py-2 sm:py-3 text-center ${
                          isBest 
                            ? 'bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-200 font-semibold' 
                            : ''
                        }`}>
                          <div className="flex items-center justify-center space-x-1">
                            <span className="text-xs sm:text-sm">{formatValue(value, statKey)}</span>
                            {isBest && <Crown className="h-3 w-3 sm:h-4 sm:w-4 text-green-600" />}
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
        <div className="p-3 sm:p-4 border-t border-gray-200 dark:border-gray-700">
          <div className="text-xs text-gray-500 text-center">
            💡 Add more players to see comparisons and best/worst indicators
          </div>
        </div>
      )}
    </div>
  );
};

export default ComparisonTable;