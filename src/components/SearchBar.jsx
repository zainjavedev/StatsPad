import React from 'react';
import { Search, Filter, ArrowUpDown, Star } from 'lucide-react';
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
  const sortOptions = [
    { key: 'rank', label: 'Rank', icon: '🏆' },
    { key: 'points', label: 'Points', icon: '🏀' },
    { key: 'assists', label: 'Assists', icon: '🤝' },
    { key: 'totalRebounds', label: 'Rebounds', icon: '⬆️' },
    { key: 'efficiency', label: 'Efficiency', icon: '⚡' }
  ];

  const handleSortChange = (newSortBy) => {
    if (sortBy === newSortBy) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(newSortBy);
      setSortOrder('desc');
    }
  };

  return (
    <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 flex-1 max-w-4xl">
      {/* Search Input */}
      <div className="relative flex-1 min-w-0">
        <div className="relative">
          <Search className="absolute left-3 sm:left-4 top-1/2 transform -translate-y-1/2 h-4 w-4 sm:h-5 sm:w-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search players..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setShowDropdown(e.target.value.length > 0);
            }}
            onFocus={() => setShowDropdown(searchTerm.length > 0)}
            className={`w-full pl-10 sm:pl-12 pr-8 sm:pr-4 py-2.5 sm:py-3 rounded-lg sm:rounded-xl border-2 transition-all duration-200 text-sm sm:text-base ${
              isDarkMode 
                ? 'bg-gray-800 border-gray-600 text-white placeholder-gray-400 focus:border-blue-500 focus:bg-gray-750' 
                : 'bg-white border-gray-200 text-gray-900 placeholder-gray-500 focus:border-blue-500 focus:bg-blue-50/50'
            } focus:ring-2 sm:focus:ring-4 focus:ring-blue-500/20 focus:outline-none shadow-sm hover:shadow-md`}
          />
          {searchTerm && (
            <button
              onClick={() => {
                setSearchTerm('');
                setShowDropdown(false);
              }}
              className="absolute right-2 sm:right-3 top-1/2 transform -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 transition-colors"
            >
              ✕
            </button>
          )}
        </div>
        
        {/* Enhanced Search Dropdown */}
        {showDropdown && filteredPlayers.length > 0 && (
          <div className={`absolute top-full left-0 right-0 mt-2 rounded-lg sm:rounded-xl border shadow-2xl z-50 max-h-80 sm:max-h-96 overflow-y-auto ${
            isDarkMode ? 'bg-gray-800 border-gray-600' : 'bg-white border-gray-200'
          } backdrop-blur-xl`}>
            <div className="p-1 sm:p-2 space-y-1">
              {filteredPlayers.map((player) => {
                const teamColor = getTeamColors(player.team);
                const isSelected = selectedPlayers.find(p => p.playerName === player.playerName);
                
                return (
                  <button
                    key={player.playerName}
                    onClick={() => addPlayer(player)}
                    disabled={isSelected}
                    className={`w-full p-2 sm:p-4 text-left rounded-lg transition-all duration-200 ${
                      isSelected
                        ? 'opacity-50 cursor-not-allowed bg-gray-100 dark:bg-gray-700'
                        : 'hover:bg-gray-50 dark:hover:bg-gray-700 hover:scale-[1.01] active:scale-[0.99]'
                    } group`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2 sm:space-x-4 min-w-0 flex-1">
                        {/* Player Avatar/Initial */}
                        <div 
                          className="w-8 h-8 sm:w-12 sm:h-12 rounded-full flex items-center justify-center text-white font-bold text-xs sm:text-lg shadow-lg flex-shrink-0"
                          style={{ 
                            background: `linear-gradient(135deg, ${teamColor.primary}, ${teamColor.light})` 
                          }}
                        >
                          {player.playerName.split(' ').map(n => n[0]).join('')}
                        </div>
                        
                        {/* Player Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-1 sm:space-x-2">
                            <h4 className="font-semibold text-sm sm:text-lg group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors truncate">
                              {player.playerName}
                            </h4>
                            {player.rank <= 10 && (
                              <Star className="h-3 w-3 sm:h-4 sm:w-4 text-yellow-500 flex-shrink-0" />
                            )}
                          </div>
                          <div className="flex items-center space-x-2 sm:space-x-4 text-xs sm:text-sm text-gray-600 dark:text-gray-400">
                            <span className="flex items-center space-x-1">
                              <div 
                                className="w-2 h-2 sm:w-3 sm:h-3 rounded-full flex-shrink-0"
                                style={{ backgroundColor: teamColor.primary }}
                              />
                              <span className="font-medium">{player.team}</span>
                              <span className="text-xs hidden sm:inline">({teamDisplayNames[player.team]})</span>
                            </span>
                            <span>#{player.rank}</span>
                            {player.position && <span className="hidden sm:inline">{player.position}</span>}
                          </div>
                        </div>
                      </div>
                      
                      {/* Quick Stats - Simplified on mobile */}
                      <div className="text-right flex-shrink-0 ml-2">
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-1 sm:gap-3 text-xs sm:text-sm">
                          <div className="text-center">
                            <div className="font-bold text-sm sm:text-lg text-blue-600 dark:text-blue-400">
                              {player.stats.points}
                            </div>
                            <div className="text-xs text-gray-500">PPG</div>
                          </div>
                          <div className="text-center">
                            <div className="font-bold text-sm sm:text-lg text-green-600 dark:text-green-400">
                              {player.stats.assists}
                            </div>
                            <div className="text-xs text-gray-500">APG</div>
                          </div>
                          <div className="text-center hidden sm:block">
                            <div className="font-bold text-lg text-purple-600 dark:text-purple-400">
                              {player.stats.totalRebounds}
                            </div>
                            <div className="text-xs text-gray-500">RPG</div>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    {isSelected && (
                      <div className="mt-2 flex items-center text-xs sm:text-sm text-green-600 dark:text-green-400">
                        ✓ Already selected
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
            
            {/* Search Footer */}
            <div className={`p-2 sm:p-3 border-t text-center text-xs sm:text-sm ${
              isDarkMode ? 'border-gray-700 text-gray-400' : 'border-gray-200 text-gray-500'
            }`}>
              Showing {filteredPlayers.length} players
            </div>
          </div>
        )}
      </div>

      {/* Sort Controls - Stack on mobile */}
      <div className="flex items-center space-x-2 flex-shrink-0">
        <div className={`flex items-center space-x-1 sm:space-x-2 px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm ${
          isDarkMode ? 'bg-gray-800 border-gray-600' : 'bg-white border-gray-200'
        } border`}>
          <Filter className="h-3 w-3 sm:h-4 sm:w-4 text-gray-400" />
          <span className="font-medium text-gray-500 hidden sm:inline">Sort by:</span>
          <span className="font-medium text-gray-500 sm:hidden">Sort:</span>
        </div>
        
        <select
          value={sortBy}
          onChange={(e) => handleSortChange(e.target.value)}
          className={`px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg border transition-colors text-xs sm:text-sm ${
            isDarkMode
              ? 'bg-gray-800 border-gray-600 text-white'
              : 'bg-white border-gray-200 text-gray-900'
          } focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
        >
          {sortOptions.map(option => (
            <option key={option.key} value={option.key}>
              <span className="hidden sm:inline">{option.icon} </span>{option.label}
            </option>
          ))}
        </select>
        
        <button
          onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
          className={`p-1.5 sm:p-2 rounded-lg transition-all ${
            isDarkMode
              ? 'bg-gray-800 hover:bg-gray-700 border-gray-600'
              : 'bg-white hover:bg-gray-50 border-gray-200'
          } border hover:scale-105 active:scale-95`}
          title={`Sort ${sortOrder === 'asc' ? 'descending' : 'ascending'}`}
        >
          <ArrowUpDown className={`h-3 w-3 sm:h-4 sm:w-4 transition-transform ${
            sortOrder === 'desc' ? 'rotate-180' : ''
          }`} />
        </button>
      </div>
    </div>
  );
};

export default SearchBar;