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
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const radius = Math.min(centerX, centerY) * 0.7;
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Add solid background
    ctx.fillStyle = isDarkMode ? '#1F2937' : '#FFFFFF';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    const statKeys = Object.keys(currentStats);
    const angleStep = (2 * Math.PI) / statKeys.length;
    
    // Simple grid - just circles, no fancy stuff
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
    
    // Simple labels with better font
    ctx.fillStyle = isDarkMode ? '#F3F4F6' : '#374151';
    ctx.font = '14px system-ui, -apple-system, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    statKeys.forEach((statKey, index) => {
      const angle = index * angleStep - Math.PI / 2;
      const labelX = centerX + Math.cos(angle) * (radius + 30);
      const labelY = centerY + Math.sin(angle) * (radius + 30);
      
      ctx.fillText(currentStats[statKey].label, labelX, labelY);
    });
    
    // Simple player data - no fancy gradients
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
      
      // Simple line - no dashes
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
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
      points.forEach(point => {
        ctx.beginPath();
        ctx.arc(point.x, point.y, 4, 0, 2 * Math.PI);
        ctx.fill();
      });
    });
    
    // Simple legend
    ctx.font = '14px system-ui, -apple-system, sans-serif';
    ctx.textAlign = 'left';
    
    selectedPlayers.forEach((player, index) => {
      const y = 30 + index * 25;
      const color = colors[index];
      
      // Simple rectangle
      ctx.fillStyle = color;
      ctx.fillRect(20, y - 8, 16, 16);
      
      // Player name
      ctx.fillStyle = isDarkMode ? '#F3F4F6' : '#374151';
      ctx.fillText(player.playerName, 45, y);
    });
  };

  useEffect(() => {
    if (selectedPlayers.length > 0) {
      generateRadarChart();
    }
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
    <div className="mb-8">
      <div className={`rounded-lg border ${
        isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
      }`}>
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center space-x-3">
            <Radar className="h-5 w-5" />
            <div>
              <h2 className="text-lg font-semibold">Performance Radar</h2>
              <p className="text-sm text-gray-500">
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
          </div>
        </div>
        
        <div className="flex justify-center p-6">
          <canvas
            ref={canvasRef}
            width={500}
            height={500}
            className="max-w-full h-auto"
          />
        </div>
      </div>
    </div>
  );
};

export default RadarChart;