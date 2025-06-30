import React from 'react';
import { Users, Share2, Download, Plus, X } from 'lucide-react';
import { teamColors } from '../config/teamColors';

const PlayerCards = ({ 
  selectedPlayers, 
  removePlayer, 
  shareComparison, 
  isDarkMode 
}) => {
  const downloadChart = (format = 'png') => {
    const event = new CustomEvent('downloadChart', { detail: { format } });
    window.dispatchEvent(event);
  };

  return (
    <div className="mb-6 sm:mb-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 gap-3">
        <h2 className="text-lg font-semibold flex items-center">
          <Users className="h-5 w-5 mr-2" />
          Selected Players ({selectedPlayers.length}/3)
        </h2>
        
        {selectedPlayers.length >= 2 && (
          <div className="flex items-center space-x-2">
            <button
              onClick={shareComparison}
              className="flex items-center px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
            >
              <Share2 className="h-4 w-4 mr-1" />
              <span className="hidden sm:inline">Share</span>
            </button>
            <button
              onClick={() => downloadChart('png')}
              className="flex items-center px-3 py-2 text-sm font-medium text-white bg-blue-500 rounded-lg hover:bg-blue-600 transition-colors"
            >
              <Download className="h-4 w-4 mr-1" />
              <span className="hidden sm:inline">Download PNG</span>
              <span className="sm:hidden">PNG</span>
            </button>
          </div>
        )}
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 mb-4 sm:mb-6">
        {selectedPlayers.map((player, index) => (
          <div
            key={player.playerName}
            className={`p-3 sm:p-4 rounded-lg border transition-all duration-300 ${
              isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
            } hover:shadow-lg`}
            style={{ 
              borderTopColor: teamColors[player.team]?.primary || '#666', 
              borderTopWidth: '3px' 
            }}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-base sm:text-lg truncate">{player.playerName}</h3>
                <p className="text-sm text-gray-500 mb-2">{player.team} • Rank #{player.rank}</p>
                <div className="space-y-1 text-sm">
                  <div>Points: <span className="font-medium">{player.stats.points}</span></div>
                  <div>Rebounds: <span className="font-medium">{player.stats.totalRebounds}</span></div>
                  <div>Assists: <span className="font-medium">{player.stats.assists}</span></div>
                </div>
              </div>
              <button
                onClick={() => removePlayer(player.playerName)}
                className="p-1 text-gray-400 hover:text-red-500 transition-colors flex-shrink-0"
              >
                <X className="h-4 w-4 sm:h-5 sm:w-5" />
              </button>
            </div>
          </div>
        ))}
        
        {selectedPlayers.length < 3 && (
          <div className={`p-3 sm:p-4 rounded-lg border-2 border-dashed transition-colors ${
            isDarkMode 
              ? 'border-gray-600 bg-gray-800/50' 
              : 'border-gray-300 bg-gray-50'
          }`}>
            <div className="text-center text-gray-500">
              <Plus className="h-6 w-6 sm:h-8 sm:w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Add another player</p>
              <p className="text-xs mt-1">Search above to compare</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PlayerCards;