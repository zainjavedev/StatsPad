import React, { useRef, useEffect } from 'react';
import { BarChart3, Crown, Download } from 'lucide-react';

const ComparisonTable = ({ selectedPlayers, currentStats, isDarkMode }) => {
  const tableRef = useRef(null);

  const getBestValue = (statKey) => {
    if (selectedPlayers.length === 0) return null;
    
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
    
    // Set canvas size
    canvas.width = 800;
    canvas.height = 600;
    
    // Background
    ctx.fillStyle = isDarkMode ? '#1F2937' : '#FFFFFF';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Title
    ctx.fillStyle = isDarkMode ? '#F3F4F6' : '#374151';
    ctx.font = 'bold 20px system-ui, -apple-system, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Head-to-Head Comparison', canvas.width / 2, 40);
    
    // Table headers
    ctx.font = 'bold 14px system-ui, -apple-system, sans-serif';
    ctx.textAlign = 'left';
    
    const colWidth = canvas.width / (selectedPlayers.length + 1);
    let yPos = 80;
    
    // Header row
    ctx.fillStyle = isDarkMode ? '#374151' : '#F9FAFB';
    ctx.fillRect(0, yPos - 20, canvas.width, 30);
    
    ctx.fillStyle = isDarkMode ? '#F3F4F6' : '#374151';
    ctx.fillText('Stat', 20, yPos);
    
    selectedPlayers.forEach((player, index) => {
      const x = colWidth * (index + 1) + 20;
      ctx.fillText(player.playerName, x, yPos - 10);
      ctx.font = '12px system-ui, -apple-system, sans-serif';
      ctx.fillStyle = isDarkMode ? '#9CA3AF' : '#6B7280';
      ctx.fillText(player.team, x, yPos + 5);
      ctx.font = 'bold 14px system-ui, -apple-system, sans-serif';
      ctx.fillStyle = isDarkMode ? '#F3F4F6' : '#374151';
    });
    
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
      ctx.font = '14px system-ui, -apple-system, sans-serif';
      ctx.fillText(statConfig.label, 20, yPos);
      
      // Player values
      selectedPlayers.forEach((player, playerIndex) => {
        const value = player.stats[statKey];
        const isBest = value === bestValue && value !== undefined;
        const x = colWidth * (playerIndex + 1) + 20;
        
        if (isBest) {
          // Highlight best value
          ctx.fillStyle = '#10B981';
          ctx.fillRect(x - 5, yPos - 15, colWidth - 20, 25);
          ctx.fillStyle = '#FFFFFF';
        } else {
          ctx.fillStyle = isDarkMode ? '#F3F4F6' : '#374151';
        }
        
        ctx.fillText(formatValue(value, statKey), x, yPos);
        
        if (isBest) {
          ctx.fillText('👑', x + 60, yPos);
        }
      });
      
      yPos += 30;
    });
    
    // Download
    const link = document.createElement('a');
    link.download = 'nba-head-to-head.png';
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

  return (
    <div className={`rounded-lg border ${
      isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
    }`}>
      <div className="flex items-center justify-between space-x-3 p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center space-x-3">
          <BarChart3 className="h-5 w-5" />
          <h2 className="text-lg font-semibold">Head-to-Head</h2>
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
        <table className="w-full">
          <thead>
            <tr className={`${isDarkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
              <th className="px-4 py-3 text-left font-medium">Stat</th>
              {selectedPlayers.map((player) => (
                <th key={player.playerName} className="px-4 py-3 text-center font-medium">
                  <div className="text-sm">{player.playerName}</div>
                  <div className="text-xs text-gray-500">{player.team}</div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Object.entries(currentStats).map(([statKey, statConfig]) => {
              const bestValue = getBestValue(statKey);
              
              return (
                <tr key={statKey} className={`${
                  isDarkMode ? 'border-gray-700' : 'border-gray-200'
                } border-t`}>
                  <td className="px-4 py-3 font-medium">{statConfig.label}</td>
                  {selectedPlayers.map((player) => {
                    const value = player.stats[statKey];
                    const isBest = value === bestValue && value !== undefined;
                    
                    return (
                      <td key={player.playerName} className={`px-4 py-3 text-center ${
                        isBest 
                          ? 'bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-200 font-semibold' 
                          : ''
                      }`}>
                        <div className="flex items-center justify-center space-x-1">
                          <span>{formatValue(value, statKey)}</span>
                          {isBest && <Crown className="h-4 w-4 text-green-600" />}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ComparisonTable;