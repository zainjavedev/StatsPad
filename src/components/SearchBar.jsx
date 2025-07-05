import React from 'react';
import { Search, Star } from 'lucide-react';
import { getTeamColors, teamDisplayNames } from '../config/teamColors';

const SearchBar = ({
  searchTerm,
  setSearchTerm,
  showDropdown,
  setShowDropdown,
  filteredPlayers,
  selectedPlayers,
  addPlayer,
  isDarkMode,
  sortBy,
  setSortBy,
  sortOrder,
  setSortOrder
}) => {
  return (
    <div className="w-full">
      {/* Search Input - Full Width on Mobile */}
      <div className="relative w-full">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search players..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setShowDropdown(e.target.value.length > 0);
            }}
            onFocus={() => setShowDropdown(searchTerm.length > 0)}
            className={`w-full pl-12 pr-10 py-3 rounded-xl border-2 transition-all duration-200 text-base ${
              isDarkMode 
                ? 'bg-gray-800 border-gray-600 text-white placeholder-gray-400 focus:border-blue-500' 
                : 'bg-white border-gray-200 text-gray-900 placeholder-gray-500 focus:border-blue-500 focus:bg-blue-50/50'
            } focus:ring-4 focus:ring-blue-500/20 focus:outline-none shadow-sm hover:shadow-md`}
          />
          {searchTerm && (
            <button
              onClick={() => {
                setSearchTerm('');
                setShowDropdown(false);
              }}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 transition-colors"
            >
              ✕
            </button>
          )}
        </div>
        
        {/* Enhanced Search Dropdown */}
        {showDropdown && filteredPlayers.length > 0 && (
          <div className={`absolute top-full left-0 right-0 mt-2 rounded-xl border shadow-2xl z-50 max-h-80 overflow-y-auto ${
            isDarkMode ? 'bg-gray-800 border-gray-600' : 'bg-white border-gray-200'
          } backdrop-blur-xl`}>
            <div className="p-2 space-y-1">
              {filteredPlayers.map((player) => {
                const teamColor = getTeamColors(player.team);
                const isSelected = selectedPlayers.find(p => p.playerName === player.playerName);
                
                return (
                  <button
                    key={player.playerName}
                    onClick={() => addPlayer(player)}
                    disabled={isSelected}
                    className={`w-full p-3 text-left rounded-lg transition-all duration-200 ${
                      isSelected
                        ? 'opacity-50 cursor-not-allowed bg-gray-100 dark:bg-gray-700'
                        : 'hover:bg-gray-50 dark:hover:bg-gray-700 hover:scale-[1.01] active:scale-[0.99]'
                    } group`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3 min-w-0 flex-1">
                        {/* Player Avatar/Initial */}
                        <div 
                          className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm shadow-lg flex-shrink-0"
                          style={{ 
                            background: `linear-gradient(135deg, ${teamColor.primary}, ${teamColor.light})` 
                          }}
                        >
                          {player.playerName.split(' ').map(n => n[0]).join('')}
                        </div>
                        
                        {/* Player Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-2">
                            <h4 className="font-semibold text-base group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors truncate">
                              {player.playerName}
                            </h4>
                            {player.rank <= 10 && (
                              <Star className="h-4 w-4 text-yellow-500 flex-shrink-0" />
                            )}
                          </div>
                          <div className="flex items-center space-x-3 text-sm text-gray-600 dark:text-gray-400">
                            <span className="flex items-center space-x-1">
                              <div 
                                className="w-3 h-3 rounded-full flex-shrink-0"
                                style={{ backgroundColor: teamColor.primary }}
                              />
                              <span className="font-medium">{player.team}</span>
                            </span>
                            <span>#{player.rank}</span>
                          </div>
                        </div>
                      </div>
                      
                      {/* Quick Stats - Mobile Optimized */}
                      <div className="text-right flex-shrink-0 ml-2">
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div className="text-center">
                            <div className="font-bold text-base text-blue-600 dark:text-blue-400">
                              {player.stats.points}
                            </div>
                            <div className="text-xs text-gray-500">PPG</div>
                          </div>
                          <div className="text-center">
                            <div className="font-bold text-base text-green-600 dark:text-green-400">
                              {player.stats.assists}
                            </div>
                            <div className="text-xs text-gray-500">APG</div>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    {isSelected && (
                      <div className="mt-2 flex items-center text-sm text-green-600 dark:text-green-400">
                        ✓ Already selected
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
            
            {/* Search Footer */}
            <div className={`p-3 border-t text-center text-sm ${
              isDarkMode ? 'border-gray-700 text-gray-400' : 'border-gray-200 text-gray-500'
            }`}>
              Showing {filteredPlayers.length} players
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SearchBar;