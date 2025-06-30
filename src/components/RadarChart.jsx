import React, { useRef, useEffect } from 'react';
import { Radar, Settings, Download } from 'lucide-react';

const RadarChart = ({ 
  selectedPlayers, 
  currentStats, 
  isPlayoffs, 
  showAdvanced,
  isDarkMode,
  showCustomizer,
  setShowCustomizer
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
    
    // Responsive canvas sizing
    const isMobile = window.innerWidth < 640;
    const size = isMobile ? 300 : 500;
    
    // Update canvas size if needed
    if (canvas.width !== size || canvas.height !== size) {
      canvas.width = size;
      canvas.height = size;
    }
    
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const radius = Math.min(centerX, centerY) * (isMobile ? 0.6 : 0.7);
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Add solid background
    ctx.fillStyle = isDarkMode ? '#1F2937' : '#FFFFFF';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    const statKeys = Object.keys(currentStats);
    const angleStep = (2 * Math.PI) / statKeys.length;
    
    // Simple grid - just circles
    ctx.strokeStyle = isDarkMode ? '#4B5563' : '#D1D5DB';
    ctx.lineWidth = 1;
    
    for (let i = 1; i <= 4; i++) {
      ctx.beginPath();
      ctx.arc(centerX, centerY, (radius * i) / 4, 0, 2 * Math.PI);
      ctx.stroke();
    }
    
    // Simple axes
    ctx.strokeStyle = isDarkMode ? '#6B7280' : '#9CA3AF';
    statKeys.forEach((statKey, index) => {
      const angle = index * angleStep - Math.PI / 2;
      const x2 = centerX + Math.cos(angle) * radius;
      const y2 = centerY + Math.sin(angle) * radius;
      
      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.lineTo(x2, y2);
      ctx.stroke();
    });
    
    // Responsive labels
    ctx.fillStyle = isDarkMode ? '#F3F4F6' : '#374151';
    ctx.font = `${isMobile ? '10px' : '14px'} system-ui, -apple-system, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    statKeys.forEach((statKey, index) => {
      const angle = index * angleStep - Math.PI / 2;
      const labelDistance = radius + (isMobile ? 20 : 30);
      const labelX = centerX + Math.cos(angle) * labelDistance;
      const labelY = centerY + Math.sin(angle) * labelDistance;
      
      // Truncate labels on mobile
      let label = currentStats[statKey].label;
      if (isMobile && label.length > 8) {
        label = label.substring(0, 6) + '...';
      }
      
      ctx.fillText(label, labelX, labelY);
    });
    
    // Simple player data
    const colors = ['#3B82F6', '#EF4444', '#10B981']; // Blue, Red, Green
    
    selectedPlayers.forEach((player, playerIndex) => {
      const color = colors[playerIndex];
      
      const points = statKeys.map((statKey, index) => {
        const angle = index * angleStep - Math.PI / 2;
        const value = getStatValue(player, statKey);
        const distance = (radius * value) / 100;
        
        return {
          x: centerX + Math.cos(angle) * distance,
          y: centerY + Math.sin(angle) * distance
        };
      });
      
      // Fill area - very subtle
      ctx.fillStyle = color + '15';
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
      
      // Simple line
      ctx.strokeStyle = color;
      ctx.lineWidth = isMobile ? 1.5 : 2;
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
      
      // Simple points
      ctx.fillStyle = color;
      const pointSize = isMobile ? 3 : 4;
      points.forEach(point => {
        ctx.beginPath();
        ctx.arc(point.x, point.y, pointSize, 0, 2 * Math.PI);
        ctx.fill();
      });
    });
    
    // Responsive legend
    ctx.font = `${isMobile ? '12px' : '14px'} system-ui, -apple-system, sans-serif`;
    ctx.textAlign = 'left';
    
    const legendStartY = isMobile ? 20 : 30;
    const legendSpacing = isMobile ? 20 : 25;
    const legendX = isMobile ? 10 : 20;
    
    selectedPlayers.forEach((player, index) => {
      const y = legendStartY + index * legendSpacing;
      const color = colors[index];
      
      // Simple rectangle
      ctx.fillStyle = color;
      const rectSize = isMobile ? 12 : 16;
      ctx.fillRect(legendX, y - rectSize/2, rectSize, rectSize);
      
      // Player name (truncated on mobile)
      ctx.fillStyle = isDarkMode ? '#F3F4F6' : '#374151';
      let playerName = player.playerName;
      if (isMobile && playerName.length > 12) {
        playerName = playerName.substring(0, 10) + '...';
      }
      ctx.fillText(playerName, legendX + rectSize + 8, y);
    });
  };

  useEffect(() => {
    if (selectedPlayers.length > 0) {
      generateRadarChart();
    }
  }, [selectedPlayers, currentStats, isDarkMode]);

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
    link.download = `nba-comparison.${format}`;
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

  return (
    <div className="mb-6 sm:mb-8">
      <div className={`rounded-lg border ${
        isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
      }`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between p-3 sm:p-4 border-b border-gray-200 dark:border-gray-700 gap-3">
          <div className="flex items-center space-x-3">
            <Radar className="h-4 w-4 sm:h-5 sm:w-5" />
            <div>
              <h2 className="text-base sm:text-lg font-semibold">Performance Radar</h2>
              <p className="text-xs sm:text-sm text-gray-500">
                {isPlayoffs ? 'Playoffs' : 'Regular Season'} Stats
              </p>
            </div>
          </div>
          
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
        
        <div className="flex justify-center p-3 sm:p-6">
          <canvas
            ref={canvasRef}
            width={500}
            height={500}
            className="max-w-full h-auto"
            style={{ maxWidth: '100%', height: 'auto' }}
          />
        </div>
      </div>
    </div>
  );
};

export default RadarChart;