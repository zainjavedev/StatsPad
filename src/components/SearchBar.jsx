import React from 'react';
import { Search, Filter, ArrowUpDown, Star, TrendingUp } from 'lucide-react';
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
    <div className="flex flex-col lg:flex-row gap-4 flex-1 max-w-4xl">
      {/* Search Input */}
      <div className="relative flex-1 max-w-md">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search players or teams..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setShowDropdown(e.target.value.length > 0);
            }}
            onFocus={() => setShowDropdown(searchTerm.length > 0)}
            className={`w-full pl-12 pr-4 py-3 rounded-xl border-2 transition-all duration-200 ${
              isDarkMode 
                ? 'bg-gray-800 border-gray-600 text-white placeholder-gray-400 focus:border-blue-500 focus:bg-gray-750' 
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
          <div className={`absolute top-full left-0 right-0 mt-2 rounded-xl border shadow-2xl z-50 max-h-96 overflow-y-auto ${
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
                    className={`w-full p-4 text-left rounded-lg transition-all duration-200 ${
                      isSelected
                        ? 'opacity-50 cursor-not-allowed bg-gray-100 dark:bg-gray-700'
                        : 'hover:bg-gray-50 dark:hover:bg-gray-700 hover:scale-[1.02] active:scale-[0.98]'
                    } group`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        {/* Player Avatar/Initial */}
                        <div 
                          className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-lg"
                          style={{ 
                            background: `linear-gradient(135deg, ${teamColor.primary}, ${teamColor.light})` 
                          }}
                        >
                          {player.playerName.split(' ').map(n => n[0]).join('')}
                        </div>
                        
                        {/* Player Info */}
                        <div className="flex-1">
                          <div className="flex items-center space-x-2">
                            <h4 className="font-semibold text-lg group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                              {player.playerName}
                            </h4>
                            {player.rank <= 10 && (
                              <Star className="h-4 w-4 text-yellow-500" />
                            )}
                          </div>
                          <div className="flex items-center space-x-4 text-sm text-gray-600 dark:text-gray-400">
                            <span className="flex items-center space-x-1">
                              <div 
                                className="w-3 h-3 rounded-full"
                                style={{ backgroundColor: teamColor.primary }}
                              />
                              <span className="font-medium">{player.team}</span>
                              <span className="text-xs">({teamDisplayNames[player.team]})</span>
                            </span>
                            <span>#{player.rank}</span>
                            {player.position && <span>{player.position}</span>}
                          </div>
                        </div>
                      </div>
                      
                      {/* Quick Stats */}
                      <div className="text-right">
                        <div className="grid grid-cols-3 gap-3 text-sm">
                          <div className="text-center">
                            <div className="font-bold text-lg text-blue-600 dark:text-blue-400">
                              {player.stats.points}
                            </div>
                            <div className="text-xs text-gray-500">PPG</div>
                          </div>
                          <div className="text-center">
                            <div className="font-bold text-lg text-green-600 dark:text-green-400">
                              {player.stats.assists}
                            </div>
                            <div className="text-xs text-gray-500">APG</div>
                          </div>
                          <div className="text-center">
                            <div className="font-bold text-lg text-purple-600 dark:text-purple-400">
                              {player.stats.totalRebounds}
                            </div>
                            <div className="text-xs text-gray-500">RPG</div>
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

      {/* Sort Controls */}
      <div className="flex items-center space-x-2">
        <div className={`flex items-center space-x-2 px-3 py-2 rounded-lg ${
          isDarkMode ? 'bg-gray-800 border-gray-600' : 'bg-white border-gray-200'
        } border`}>
          <Filter className="h-4 w-4 text-gray-400" />
          <span className="text-sm font-medium text-gray-500">Sort by:</span>
        </div>
        
        <select
          value={sortBy}
          onChange={(e) => handleSortChange(e.target.value)}
          className={`px-3 py-2 rounded-lg border transition-colors ${
            isDarkMode
              ? 'bg-gray-800 border-gray-600 text-white'
              : 'bg-white border-gray-200 text-gray-900'
          } focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
        >
          {sortOptions.map(option => (
            <option key={option.key} value={option.key}>
              {option.icon} {option.label}
            </option>
          ))}
        </select>
        
        <button
          onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
          className={`p-2 rounded-lg transition-all ${
            isDarkMode
              ? 'bg-gray-800 hover:bg-gray-700 border-gray-600'
              : 'bg-white hover:bg-gray-50 border-gray-200'
          } border hover:scale-105 active:scale-95`}
          title={`Sort ${sortOrder === 'asc' ? 'descending' : 'ascending'}`}
        >
          <ArrowUpDown className={`h-4 w-4 transition-transform ${
            sortOrder === 'desc' ? 'rotate-180' : ''
          }`} />
        </button>
      </div>
    </div>
  );
};

export default SearchBar;