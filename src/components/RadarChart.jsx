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
    
    // Optimized canvas sizing with better proportions
    const isMobile = window.innerWidth < 640;
    const size = isMobile ? 400 : 520; // Slightly larger for better space utilization
    
    // Update canvas size if needed
    if (canvas.width !== size || canvas.height !== size) {
      canvas.width = size;
      canvas.height = size;
    }
    
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const radius = Math.min(centerX, centerY) * (isMobile ? 0.68 : 0.75); // Much larger radar area
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Add solid background
    ctx.fillStyle = isDarkMode ? '#1F2937' : '#FFFFFF';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    const statKeys = Object.keys(currentStats);
    const angleStep = (2 * Math.PI) / statKeys.length;
    
    // Simple grid - concentric circles (no percentage labels)
    ctx.strokeStyle = isDarkMode ? '#4B5563' : '#D1D5DB';
    ctx.lineWidth = 1;
    
    for (let i = 1; i <= 4; i++) {
      ctx.beginPath();
      ctx.arc(centerX, centerY, (radius * i) / 4, 0, 2 * Math.PI);
      ctx.stroke();
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
    
    // Smart label positioning with proper alignment based on location
    ctx.fillStyle = isDarkMode ? '#F3F4F6' : '#374151';
    ctx.font = `bold ${isMobile ? '12px' : '14px'} system-ui, -apple-system, sans-serif`;
    
    statKeys.forEach((statKey, index) => {
      const angle = index * angleStep - Math.PI / 2;
      const labelDistance = radius + (isMobile ? 20 : 26); // Optimal distance from chart
      const labelX = centerX + Math.cos(angle) * labelDistance;
      const labelY = centerY + Math.sin(angle) * labelDistance;
      
      // Smart alignment based on position around the circle
      const normalizedAngle = ((angle + Math.PI * 2) % (Math.PI * 2));
      
      // Determine text alignment based on quadrant and position
      if (normalizedAngle >= 0 && normalizedAngle < Math.PI * 0.5) {
        // Top right quadrant (0° to 90°)
        ctx.textAlign = 'left';
        ctx.textBaseline = 'bottom';
      } else if (normalizedAngle >= Math.PI * 0.5 && normalizedAngle < Math.PI) {
        // Bottom right quadrant (90° to 180°)
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
      } else if (normalizedAngle >= Math.PI && normalizedAngle < Math.PI * 1.5) {
        // Bottom left quadrant (180° to 270°)
        ctx.textAlign = 'right';
        ctx.textBaseline = 'top';
      } else {
        // Top left quadrant (270° to 360°)
        ctx.textAlign = 'right';
        ctx.textBaseline = 'bottom';
      }
      
      // Special handling for cardinal directions for perfect alignment
      const tolerance = 0.15; // Increased tolerance for better cardinal detection
      if (Math.abs(normalizedAngle) < tolerance || Math.abs(normalizedAngle - Math.PI * 2) < tolerance) {
        // Right (0°)
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
      } else if (Math.abs(normalizedAngle - Math.PI * 0.5) < tolerance) {
        // Bottom (90°)
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
      } else if (Math.abs(normalizedAngle - Math.PI) < tolerance) {
        // Left (180°)
        ctx.textAlign = 'right';
        ctx.textBaseline = 'middle';
      } else if (Math.abs(normalizedAngle - Math.PI * 1.5) < tolerance) {
        // Top (270°)
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';
      }
      
      let label = currentStats[statKey].label;
      
      // Calculate background box dimensions based on alignment
      const metrics = ctx.measureText(label);
      const textWidth = metrics.width;
      const textHeight = 16;
      
      // Position background box based on text alignment
      let bgX, bgY;
      if (ctx.textAlign === 'left') {
        bgX = labelX - 2;
      } else if (ctx.textAlign === 'right') {
        bgX = labelX - textWidth - 2;
      } else { // center
        bgX = labelX - textWidth/2 - 2;
      }
      
      if (ctx.textBaseline === 'top') {
        bgY = labelY - 2;
      } else if (ctx.textBaseline === 'bottom') {
        bgY = labelY - textHeight - 2;
      } else { // middle
        bgY = labelY - textHeight/2 - 2;
      }
      
      // Add optimized background for better readability
      ctx.fillStyle = isDarkMode ? 'rgba(31, 41, 55, 0.9)' : 'rgba(255, 255, 255, 0.9)';
      ctx.fillRect(bgX, bgY, textWidth + 4, textHeight + 4);
      
      // Add subtle border to background
      ctx.strokeStyle = isDarkMode ? 'rgba(75, 85, 99, 0.5)' : 'rgba(209, 213, 219, 0.5)';
      ctx.lineWidth = 1;
      ctx.strokeRect(bgX, bgY, textWidth + 4, textHeight + 4);
      
      // Draw the label text
      ctx.fillStyle = isDarkMode ? '#F3F4F6' : '#374151';
      ctx.fillText(label, labelX, labelY);
    });
    
    // Reset text alignment
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    
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
          
          // Stroke the outline - thicker and more visible
          ctx.strokeStyle = color;
          ctx.lineWidth = isMobile ? 3 : 4;
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
          
          // Draw larger, more visible points
          ctx.fillStyle = color;
          const pointSize = isMobile ? 6 : 8; // Larger points
          points.forEach(point => {
            ctx.beginPath();
            ctx.arc(point.x, point.y, pointSize, 0, 2 * Math.PI);
            ctx.fill();
            
            // Add white border to points for better visibility
            ctx.strokeStyle = '#FFFFFF';
            ctx.lineWidth = 2;
            ctx.stroke();
          });
        });
        
        // MOVED TO TOP-LEFT: Season comparison legend
        ctx.font = `bold ${isMobile ? '11px' : '13px'} system-ui, -apple-system, sans-serif`;
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        
        // Top-left positioning (same as regular comparison)
        const legendStartX = isMobile ? 12 : 15;
        const legendStartY = isMobile ? 12 : 15;
        const legendSpacing = isMobile ? 20 : 22;
        
        // Add legend background for better readability
        const legendHeight = labels.length * legendSpacing + 10;
        const legendWidth = isMobile ? 120 : 140;
        
        ctx.fillStyle = isDarkMode ? 'rgba(31, 41, 55, 0.95)' : 'rgba(255, 255, 255, 0.95)';
        ctx.fillRect(legendStartX - 8, legendStartY - 8, legendWidth, legendHeight);
        
        ctx.strokeStyle = isDarkMode ? '#374151' : '#E5E7EB';
        ctx.lineWidth = 1;
        ctx.strokeRect(legendStartX - 8, legendStartY - 8, legendWidth, legendHeight);
        
        labels.forEach((label, index) => {
          const y = legendStartY + index * legendSpacing;
          const color = colors[index];
          
          // Legend rectangle - consistent size
          ctx.fillStyle = color;
          const rectSize = isMobile ? 14 : 16;
          ctx.fillRect(legendStartX, y, rectSize, rectSize);
          
          // Add subtle border to legend rectangle
          ctx.strokeStyle = isDarkMode ? '#4B5563' : '#D1D5DB';
          ctx.lineWidth = 1;
          ctx.strokeRect(legendStartX, y, rectSize, rectSize);
          
          // Season label only - no player name or team
          ctx.fillStyle = isDarkMode ? '#F3F4F6' : '#374151';
          ctx.font = `bold ${isMobile ? '11px' : '13px'} system-ui, -apple-system, sans-serif`;
          ctx.fillText(label, legendStartX + rectSize + 8, y + 2);
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
        
        // Stroke the outline - thicker and more visible
        ctx.strokeStyle = color;
        ctx.lineWidth = isMobile ? 3 : 4;
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
        
        // Draw larger, more visible points
        ctx.fillStyle = color;
        const pointSize = isMobile ? 6 : 8; // Larger points
        points.forEach(point => {
          ctx.beginPath();
          ctx.arc(point.x, point.y, pointSize, 0, 2 * Math.PI);
          ctx.fill();
          
          // Add white border to points for better visibility
          ctx.strokeStyle = '#FFFFFF';
          ctx.lineWidth = 2;
          ctx.stroke();
        });
      });
      
      // Legend positioned at top-left corner to avoid overlap
      ctx.font = `bold ${isMobile ? '10px' : '12px'} system-ui, -apple-system, sans-serif`;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      
      // Top-left positioning for both mobile and desktop
      const legendStartX = isMobile ? 12 : 15;
      const legendStartY = isMobile ? 12 : 15;
      const legendSpacing = isMobile ? 16 : 18;
      
      // Compact legend size
      const legendHeight = selectedPlayers.length * legendSpacing + 10;
      const legendWidth = isMobile ? 90 : 110;
      
      ctx.fillStyle = isDarkMode ? 'rgba(31, 41, 55, 0.95)' : 'rgba(255, 255, 255, 0.95)';
      ctx.fillRect(legendStartX - 4, legendStartY - 4, legendWidth, legendHeight);
      
      ctx.strokeStyle = isDarkMode ? '#4B5563' : '#D1D5DB';
      ctx.lineWidth = 1;
      ctx.strokeRect(legendStartX - 4, legendStartY - 4, legendWidth, legendHeight);
      
      selectedPlayers.forEach((player, index) => {
        const y = legendStartY + index * legendSpacing;
        const color = colors[index];
        
        // Compact legend rectangle
        ctx.fillStyle = color;
        const rectSize = isMobile ? 10 : 12;
        ctx.fillRect(legendStartX, y, rectSize, rectSize);
        
        // Add subtle border to legend rectangle
        ctx.strokeStyle = isDarkMode ? '#6B7280' : '#9CA3AF';
        ctx.lineWidth = 0.5;
        ctx.strokeRect(legendStartX, y, rectSize, rectSize);
        
        // Player name only - no team
        ctx.fillStyle = isDarkMode ? '#F3F4F6' : '#374151';
        ctx.font = `bold ${isMobile ? '9px' : '11px'} system-ui, -apple-system, sans-serif`;
        
        // Compact player name handling
        let playerDisplay = player.playerName;
        const maxLength = isMobile ? 10 : 12;
        if (playerDisplay.length > maxLength) {
          const nameParts = playerDisplay.split(' ');
          if (nameParts.length >= 2) {
            playerDisplay = `${nameParts[0]} ${nameParts[nameParts.length - 1][0]}.`;
          } else {
            playerDisplay = playerDisplay.substring(0, maxLength - 3) + '...';
          }
        }
        
        ctx.fillText(playerDisplay, legendStartX + rectSize + 5, y + 2);
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
    <div className="mb-4">
      <div className={`rounded-lg border ${
        isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
      }`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between p-3 sm:p-4 border-b border-gray-200 dark:border-gray-700 gap-3">
          <div className="flex items-center space-x-3 min-w-0 flex-1">
            <Radar className="h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0" />
            <div className="min-w-0">
              <h2 className="text-base sm:text-lg font-semibold truncate">
                {isSeasonComparison ? 'Season Comparison' : selectedPlayers.length === 1 ? 'Player Analysis' : 'Performance Comparison'}
              </h2>
              <p className="text-xs sm:text-sm text-gray-500 truncate">
                {isSeasonComparison 
                  ? 'Regular Season vs Playoffs' 
                  : isPlayoffs ? 'Playoffs' : 'Regular Season'} Stats
                {selectedPlayers.length === 1 && !isSeasonComparison && ' • Individual Breakdown'}
              </p>
            </div>
          </div>
          
          <div className="flex items-center justify-between sm:justify-end gap-2 sm:gap-3 flex-shrink-0">
            {/* Season Comparison Toggle for single player */}
            {canCompareSeasons && (
              <div className="flex items-center space-x-2 px-2 py-1 rounded-lg bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300">
                <span className="text-xs font-medium hidden sm:inline">Season Compare</span>
                <span className="text-xs font-medium sm:hidden">Compare</span>
                {isSeasonComparison ? (
                  <ToggleRight className="h-4 w-4" />
                ) : (
                  <ToggleLeft className="h-4 w-4" />
                )}
              </div>
            )}
            
            <div className="flex items-center space-x-2">
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
        </div>
        
        <div className="flex justify-center p-2">
          <canvas
            ref={canvasRef}
            width={520}
            height={520}
            className="max-w-full h-auto"
            style={{ maxWidth: '100%', height: 'auto' }}
          />
        </div>
      </div>
    </div>
  );
};

export default RadarChart;