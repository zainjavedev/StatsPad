import React, { useRef, useEffect } from 'react';
import { Radar, Settings, Download, ToggleLeft, ToggleRight } from 'lucide-react';

const RadarChart = ({ 
  selectedPlayers, 
  currentStats, 
  isPlayoffs, 
  showAdvanced,
  isDarkMode,
  showCustomizer,
  setShowCustomizer,
  // New props for season comparison
  regularSeasonData,
  playoffsData
}) => {
  const canvasRef = useRef(null);

  const getStatValue = (player, statKey) => {
    const value = player.stats[statKey];
    const stat = currentStats[statKey];
    
    if (!stat || value === undefined) return 0;
    return Math.min(100, (value / stat.max) * 100);
  };

  const generateRadarChart = () => {
    const canvas = canvasRef.current;
    if (!canvas || selectedPlayers.length === 0) return;

    const ctx = canvas.getContext('2d');
    
    // Responsive canvas sizing - increased for better spacing
    const isMobile = window.innerWidth < 640;
    const size = isMobile ? 400 : 600; // Increased canvas size for more space
    
    // Update canvas size if needed
    if (canvas.width !== size || canvas.height !== size) {
      canvas.width = size;
      canvas.height = size;
    }
    
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const radius = Math.min(centerX, centerY) * (isMobile ? 0.5 : 0.55); // Reduced radar size relative to canvas
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Add solid background
    ctx.fillStyle = isDarkMode ? '#1F2937' : '#FFFFFF';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    const statKeys = Object.keys(currentStats);
    const angleStep = (2 * Math.PI) / statKeys.length;
    
    // Simple grid - concentric circles
    ctx.strokeStyle = isDarkMode ? '#4B5563' : '#D1D5DB';
    ctx.lineWidth = 1;
    
    for (let i = 1; i <= 4; i++) {
      ctx.beginPath();
      ctx.arc(centerX, centerY, (radius * i) / 4, 0, 2 * Math.PI);
      ctx.stroke();
      
      // Add percentage labels for grid lines
      if (i === 4) {
        ctx.fillStyle = isDarkMode ? '#6B7280' : '#9CA3AF';
        ctx.font = `${isMobile ? '8px' : '10px'} system-ui, -apple-system, sans-serif`;
        ctx.textAlign = 'center';
        ctx.fillText('100%', centerX, centerY - radius + (isMobile ? 8 : 12));
      }
    }
    
    // Axes
    ctx.strokeStyle = isDarkMode ? '#6B7280' : '#9CA3AF';
    ctx.lineWidth = 0.5;
    statKeys.forEach((statKey, index) => {
      const angle = index * angleStep - Math.PI / 2;
      const x2 = centerX + Math.cos(angle) * radius;
      const y2 = centerY + Math.sin(angle) * radius;
      
      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.lineTo(x2, y2);
      ctx.stroke();
    });
    
    // Enhanced labels with better spacing
    ctx.fillStyle = isDarkMode ? '#F3F4F6' : '#374151';
    ctx.font = `${isMobile ? '11px' : '13px'} system-ui, -apple-system, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    statKeys.forEach((statKey, index) => {
      const angle = index * angleStep - Math.PI / 2;
      const labelDistance = radius + (isMobile ? 50 : 70); // Increased label distance
      const labelX = centerX + Math.cos(angle) * labelDistance;
      const labelY = centerY + Math.sin(angle) * labelDistance;
      
      // Main stat label - center aligned for consistency
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      
      let label = currentStats[statKey].label;
      // Don't truncate labels since we have more space now
      
      ctx.fillText(label, labelX, labelY - (isMobile ? 8 : 10));
      
      // Show actual stat values for single player or season comparison
      if (selectedPlayers.length === 1) {
        const player = selectedPlayers[0];
        const value = player.stats[statKey];
        if (value !== undefined) {
          ctx.font = `${isMobile ? '9px' : '11px'} system-ui, -apple-system, sans-serif`;
          ctx.fillStyle = isDarkMode ? '#9CA3AF' : '#6B7280';
          
          let displayValue = value;
          if (statKey.includes('Percentage')) {
            displayValue = `${value.toFixed(1)}%`;
          } else {
            displayValue = value.toFixed(1);
          }
          
          ctx.fillText(displayValue, labelX, labelY + (isMobile ? 8 : 10));
          ctx.font = `${isMobile ? '11px' : '13px'} system-ui, -apple-system, sans-serif`;
          ctx.fillStyle = isDarkMode ? '#F3F4F6' : '#374151';
        }
      }
    });
    
    // Reset text alignment
    ctx.textAlign = 'left';
    
    // Check if we're doing season comparison for single player
    const isSeasonComparison = selectedPlayers.length === 1 && regularSeasonData && playoffsData;
    
    if (isSeasonComparison) {
      // Season comparison mode - show both regular season and playoffs for same player
      const player = selectedPlayers[0];
      const regularPlayer = regularSeasonData.players.find(p => p.playerName === player.playerName);
      const playoffPlayer = playoffsData.players.find(p => p.playerName === player.playerName);
      
      if (regularPlayer && playoffPlayer) {
        const players = [regularPlayer, playoffPlayer];
        const colors = ['#3B82F6', '#EF4444']; // Blue for regular, Red for playoffs
        const labels = ['Regular Season', 'Playoffs'];
        
        players.forEach((seasonPlayer, seasonIndex) => {
          const color = colors[seasonIndex];
          
          const points = statKeys.map((statKey, index) => {
            const angle = index * angleStep - Math.PI / 2;
            const value = getStatValue(seasonPlayer, statKey);
            const distance = (radius * value) / 100;
            
            return {
              x: centerX + Math.cos(angle) * distance,
              y: centerY + Math.sin(angle) * distance,
              value: value
            };
          });
          
          // Fill area with transparency
          ctx.fillStyle = color + '20';
          ctx.beginPath();
          points.forEach((point, index) => {
            if (index === 0) {
              ctx.moveTo(point.x, point.y);
            } else {
              ctx.lineTo(point.x, point.y);
            }
          });
          ctx.closePath();
          ctx.fill();
          
          // Stroke the outline
          ctx.strokeStyle = color;
          ctx.lineWidth = isMobile ? 2 : 2.5;
          // Remove dashed line - solid line for both seasons
          ctx.beginPath();
          points.forEach((point, index) => {
            if (index === 0) {
              ctx.moveTo(point.x, point.y);
            } else {
              ctx.lineTo(point.x, point.y);
            }
          });
          ctx.closePath();
          ctx.stroke();
          
          // Draw points
          ctx.fillStyle = color;
          const pointSize = isMobile ? 4 : 5;
          points.forEach(point => {
            ctx.beginPath();
            ctx.arc(point.x, point.y, pointSize, 0, 2 * Math.PI);
            ctx.fill();
            
            // Add white border to points
            ctx.strokeStyle = '#FFFFFF';
            ctx.lineWidth = 1;
            ctx.stroke();
          });
        });
        
        // Season comparison legend - positioned better with more space
        ctx.font = `${isMobile ? '13px' : '15px'} system-ui, -apple-system, sans-serif`;
        ctx.textAlign = 'left';
        
        const legendStartY = isMobile ? 30 : 40;
        const legendSpacing = isMobile ? 28 : 35;
        const legendX = isMobile ? 20 : 30;
        
        labels.forEach((label, index) => {
          const y = legendStartY + index * legendSpacing;
          const color = colors[index];
          
          // Legend rectangle
          ctx.fillStyle = color;
          const rectSize = isMobile ? 16 : 20; // Slightly larger legend squares
          ctx.fillRect(legendX, y - rectSize/2, rectSize, rectSize);
          
          // Season label
          ctx.fillStyle = isDarkMode ? '#F3F4F6' : '#374151';
          ctx.fillText(label, legendX + rectSize + 12, y - 6);
          
          // Player name and team
          ctx.font = `${isMobile ? '11px' : '13px'} system-ui, -apple-system, sans-serif`;
          ctx.fillStyle = isDarkMode ? '#9CA3AF' : '#6B7280';
          let playerName = player.playerName;
          // Don't truncate player names since we have more space
          ctx.fillText(`${playerName} (${player.team})`, legendX + rectSize + 12, y + 8);
          ctx.font = `${isMobile ? '13px' : '15px'} system-ui, -apple-system, sans-serif`;
        });
      }
    } else {
      // Regular comparison mode - multiple different players
      const colors = ['#3B82F6', '#EF4444', '#10B981']; // Blue, Red, Green
      
      selectedPlayers.forEach((player, playerIndex) => {
        const color = colors[playerIndex];
        
        const points = statKeys.map((statKey, index) => {
          const angle = index * angleStep - Math.PI / 2;
          const value = getStatValue(player, statKey);
          const distance = (radius * value) / 100;
          
          return {
            x: centerX + Math.cos(angle) * distance,
            y: centerY + Math.sin(angle) * distance,
            value: value
          };
        });
        
        // Fill area with transparency
        ctx.fillStyle = color + '20';
        ctx.beginPath();
        points.forEach((point, index) => {
          if (index === 0) {
            ctx.moveTo(point.x, point.y);
          } else {
            ctx.lineTo(point.x, point.y);
          }
        });
        ctx.closePath();
        ctx.fill();
        
        // Stroke the outline
        ctx.strokeStyle = color;
        ctx.lineWidth = isMobile ? 2 : 2.5;
        ctx.beginPath();
        points.forEach((point, index) => {
          if (index === 0) {
            ctx.moveTo(point.x, point.y);
          } else {
            ctx.lineTo(point.x, point.y);
          }
        });
        ctx.closePath();
        ctx.stroke();
        
        // Draw points
        ctx.fillStyle = color;
        const pointSize = isMobile ? 4 : 5;
        points.forEach(point => {
          ctx.beginPath();
          ctx.arc(point.x, point.y, pointSize, 0, 2 * Math.PI);
          ctx.fill();
          
          // Add white border to points
          ctx.strokeStyle = '#FFFFFF';
          ctx.lineWidth = 1;
          ctx.stroke();
        });
      });
      
      // Regular legend - also improved spacing
      ctx.font = `${isMobile ? '13px' : '15px'} system-ui, -apple-system, sans-serif`;
      ctx.textAlign = 'left';
      
      const legendStartY = isMobile ? 30 : 40;
      const legendSpacing = isMobile ? 26 : 32;
      const legendX = isMobile ? 20 : 30;
      
      selectedPlayers.forEach((player, index) => {
        const y = legendStartY + index * legendSpacing;
        const color = colors[index];
        
        // Legend rectangle
        ctx.fillStyle = color;
        const rectSize = isMobile ? 16 : 20;
        ctx.fillRect(legendX, y - rectSize/2, rectSize, rectSize);
        
        // Player name
        ctx.fillStyle = isDarkMode ? '#F3F4F6' : '#374151';
        let playerName = player.playerName;
        // Don't truncate since we have more space
        ctx.fillText(playerName, legendX + rectSize + 12, y - 6);
        
        // Team
        ctx.font = `${isMobile ? '11px' : '13px'} system-ui, -apple-system, sans-serif`;
        ctx.fillStyle = isDarkMode ? '#9CA3AF' : '#6B7280';
        ctx.fillText(player.team, legendX + rectSize + 12, y + 8);
        ctx.font = `${isMobile ? '13px' : '15px'} system-ui, -apple-system, sans-serif`;
        ctx.fillStyle = isDarkMode ? '#F3F4F6' : '#374151';
      });
    }
  };

  useEffect(() => {
    if (selectedPlayers.length > 0) {
      generateRadarChart();
    }
  }, [selectedPlayers, currentStats, isDarkMode, regularSeasonData, playoffsData]);

  // Handle window resize for responsive chart
  useEffect(() => {
    const handleResize = () => {
      if (selectedPlayers.length > 0) {
        setTimeout(generateRadarChart, 100);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [selectedPlayers, currentStats, isDarkMode]);

  const downloadChart = (format = 'png') => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const link = document.createElement('a');
    const filename = selectedPlayers.length === 1 && regularSeasonData && playoffsData
      ? `${selectedPlayers[0].playerName.replace(/\s+/g, '-')}-season-comparison.${format}`
      : `nba-comparison-${selectedPlayers.map(p => p.playerName.replace(/\s+/g, '-')).join('-vs-')}.${format}`;
    link.download = filename;
    link.href = canvas.toDataURL(`image/${format}`);
    link.click();
  };

  useEffect(() => {
    const handleDownload = (event) => {
      downloadChart(event.detail.format);
    };

    window.addEventListener('downloadChart', handleDownload);
    return () => window.removeEventListener('downloadChart', handleDownload);
  }, []);

  // Check if season comparison is available
  const canCompareSeasons = selectedPlayers.length === 1 && regularSeasonData && playoffsData;
  const isSeasonComparison = canCompareSeasons && 
    regularSeasonData.players.find(p => p.playerName === selectedPlayers[0].playerName) &&
    playoffsData.players.find(p => p.playerName === selectedPlayers[0].playerName);

  return (
    <div className="mb-6 sm:mb-8">
      <div className={`rounded-lg border ${
        isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
      }`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between p-3 sm:p-4 border-b border-gray-200 dark:border-gray-700 gap-3">
          <div className="flex items-center space-x-3">
            <Radar className="h-4 w-4 sm:h-5 sm:w-5" />
            <div>
              <h2 className="text-base sm:text-lg font-semibold">
                {isSeasonComparison ? 'Season Comparison' : selectedPlayers.length === 1 ? 'Player Analysis' : 'Performance Comparison'}
              </h2>
              <p className="text-xs sm:text-sm text-gray-500">
                {isSeasonComparison 
                  ? 'Regular Season vs Playoffs' 
                  : isPlayoffs ? 'Playoffs' : 'Regular Season'} Stats
                {selectedPlayers.length === 1 && !isSeasonComparison && ' • Individual Breakdown'}
              </p>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            {/* Season Comparison Toggle for single player */}
            {canCompareSeasons && (
              <div className="flex items-center space-x-2 px-2 py-1 rounded-lg bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300">
                <span className="text-xs font-medium">Season Compare</span>
                {isSeasonComparison ? (
                  <ToggleRight className="h-4 w-4" />
                ) : (
                  <ToggleLeft className="h-4 w-4" />
                )}
              </div>
            )}
            
            <button
              onClick={() => downloadChart('png')}
              className={`p-2 rounded-lg transition-colors ${
                isDarkMode
                  ? 'bg-gray-700 hover:bg-gray-600 text-gray-300'
                  : 'bg-gray-100 hover:bg-gray-200 text-gray-600'
              }`}
              title="Download chart"
            >
              <Download className="h-4 w-4" />
            </button>
            
            {setShowCustomizer && (
              <button
                onClick={() => setShowCustomizer(!showCustomizer)}
                className={`p-2 rounded-lg transition-colors ${
                  showCustomizer
                    ? 'bg-blue-500 text-white'
                    : isDarkMode
                    ? 'bg-gray-700 hover:bg-gray-600 text-gray-300'
                    : 'bg-gray-100 hover:bg-gray-200 text-gray-600'
                }`}
                title="Customize radar"
              >
                <Settings className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
        
        <div className="flex justify-center p-3 sm:p-6">
          <canvas
            ref={canvasRef}
            width={600}
            height={600}
            className="max-w-full h-auto"
            style={{ maxWidth: '100%', height: 'auto' }}
          />
        </div>
      </div>
    </div>
  );
};

export default RadarChart;