import React, { useState, useEffect, useMemo } from 'react';
import Header from './components/Header';
import SearchBar from './components/SearchBar';
import ControlPanel from './components/ControlPanel';
import PlayerCards from './components/PlayerCards';
import RadarChart from './components/RadarChart';
import ComparisonTable from './components/ComparisonTable';
import EmptyState from './components/EmptyState';
import RadarCustomizer from './components/RadarCustomizer';
import { usePlayerData } from './hooks/usePlayerData';
import { allAvailableStats, defaultRadarConfigs } from './config/statsConfig';
import { generateShareableUrl, parseUrlParameters } from './utils/utils';

function App() {
  const [selectedPlayers, setSelectedPlayers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isPlayoffs, setIsPlayoffs] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [showRadarCustomizer, setShowRadarCustomizer] = useState(false);
  const [selectedRadarStats, setSelectedRadarStats] = useState(['points', 'assists', 'totalRebounds', 'fieldGoalPercentage', 'threePointPercentage']);
  const [radarPreset, setRadarPreset] = useState('basic');
  const [sortBy, setSortBy] = useState('rank');
  const [sortOrder, setSortOrder] = useState('asc');

  const { currentData, loading, error } = usePlayerData(isPlayoffs);

  // Get current stats for radar based on selection
  const currentStats = useMemo(() => {
    const stats = {};
    selectedRadarStats.forEach(statKey => {
      if (allAvailableStats[statKey]) {
        stats[statKey] = allAvailableStats[statKey];
      }
    });
    return stats;
  }, [selectedRadarStats]);

  // Filter and sort players - Fixed search for "Luka"
  const filteredPlayers = useMemo(() => {
    if (!searchTerm || !currentData) return [];
    
    let filtered = currentData.players.filter(player => {
      const playerName = player.playerName.toLowerCase();
      const teamName = player.team.toLowerCase();
      const searchTermLower = searchTerm.toLowerCase();
      
      // Check for partial matches in player name or team
      return playerName.includes(searchTermLower) || 
             teamName.includes(searchTermLower) ||
             // Special case for common nicknames
             (searchTermLower === 'luka' && playerName.includes('luka')) ||
             (searchTermLower === 'giannis' && playerName.includes('giannis')) ||
             (searchTermLower === 'jokic' && playerName.includes('jokic')) ||
             (searchTermLower === 'lebron' && playerName.includes('lebron'));
    });

    // Sort players
    filtered.sort((a, b) => {
      let aValue = sortBy === 'rank' ? a.rank : (a.stats[sortBy] || 0);
      let bValue = sortBy === 'rank' ? b.rank : (b.stats[sortBy] || 0);
      
      if (sortOrder === 'asc') {
        return aValue - bValue;
      } else {
        return bValue - aValue;
      }
    });

    return filtered.slice(0, 50); // Show up to 50 players
  }, [searchTerm, currentData, sortBy, sortOrder]);

  // Add player to comparison
  const addPlayer = (player) => {
    if (selectedPlayers.length < 3 && !selectedPlayers.find(p => p.playerName === player.playerName)) {
      setSelectedPlayers([...selectedPlayers, player]);
      setSearchTerm('');
      setShowDropdown(false);
    }
  };

  // Remove player from comparison
  const removePlayer = (playerName) => {
    setSelectedPlayers(selectedPlayers.filter(p => p.playerName !== playerName));
  };

  // Handle radar preset change
  const handleRadarPresetChange = (preset) => {
    setRadarPreset(preset);
    setSelectedRadarStats(defaultRadarConfigs[preset]);
  };

  // Handle custom radar stats selection
  const handleRadarStatsChange = (statKeys) => {
    setSelectedRadarStats(statKeys);
    setRadarPreset('custom');
  };

  // Share comparison
  const shareComparison = async () => {
    const url = generateShareableUrl(selectedPlayers, isPlayoffs, showAdvanced);
    
    try {
      await navigator.clipboard.writeText(url);
      // Show success toast
      const toast = document.createElement('div');
      toast.className = `fixed top-4 right-4 z-50 px-4 py-2 rounded-lg shadow-lg transition-all duration-300 ${
        isDarkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-900'
      } border border-green-200`;
      toast.innerHTML = '✅ Link copied to clipboard!';
      document.body.appendChild(toast);
      setTimeout(() => {
        toast.remove();
      }, 3000);
    } catch (err) {
      console.error('Failed to copy to clipboard:', err);
      prompt('Copy this link to share:', url);
    }
  };

  // Load shared comparison from URL
  useEffect(() => {
    const { players: playerNames, isPlayoffs: urlIsPlayoffs, showAdvanced: urlShowAdvanced } = parseUrlParameters();

    if (urlIsPlayoffs) setIsPlayoffs(true);
    if (urlShowAdvanced) setShowAdvanced(true);

    if (playerNames.length > 0 && currentData) {
      const players = currentData.players.filter(p => 
        playerNames.includes(p.playerName)
      );
      setSelectedPlayers(players);
    }
  }, [currentData]);

  // Initialize dark mode from system preference
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    if (savedTheme === 'dark' || (!savedTheme && systemPrefersDark)) {
      setIsDarkMode(true);
      document.documentElement.classList.add('dark');
    }
  }, []);

  // Update theme
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDarkMode]);

  if (loading) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${
        isDarkMode ? 'bg-gray-900 text-white' : 'bg-gradient-to-br from-blue-50 to-purple-50 text-gray-900'
      }`}>
        <div className="text-center">
          <div className="relative">
            <div className="w-16 h-16 border-4 border-blue-200 rounded-full animate-spin border-t-blue-500 mx-auto mb-4"></div>
            <div className="absolute inset-0 w-16 h-16 border-4 border-purple-200 rounded-full animate-ping border-t-purple-500 mx-auto"></div>
          </div>
          <p className="text-lg font-medium">Loading player data...</p>
          <p className="text-sm text-gray-500 mt-2">Getting the latest NBA stats</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${
        isDarkMode ? 'bg-gray-900 text-white' : 'bg-gradient-to-br from-red-50 to-pink-50 text-gray-900'
      }`}>
        <div className="text-center max-w-md">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl">⚠️</span>
          </div>
          <h2 className="text-xl font-semibold mb-2">Error Loading Data</h2>
          <p className="text-red-600 mb-4">{error}</p>
          <button 
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen transition-all duration-300 ${
      isDarkMode 
        ? 'bg-gray-900 text-white' 
        : 'bg-gradient-to-br from-blue-50 via-white to-purple-50 text-gray-900'
    }`}>
      <Header 
        isDarkMode={isDarkMode} 
        setIsDarkMode={setIsDarkMode}
        selectedPlayers={selectedPlayers}
        shareComparison={shareComparison}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Search and Controls */}
        <div className="mb-8 space-y-6">
          <div className="flex flex-col lg:flex-row gap-6 items-start lg:items-center">
            <SearchBar
              searchTerm={searchTerm}
              setSearchTerm={setSearchTerm}
              showDropdown={showDropdown}
              setShowDropdown={setShowDropdown}
              filteredPlayers={filteredPlayers}
              selectedPlayers={selectedPlayers}
              addPlayer={addPlayer}
              isDarkMode={isDarkMode}
              sortBy={sortBy}
              setSortBy={setSortBy}
              sortOrder={sortOrder}
              setSortOrder={setSortOrder}
            />

            <ControlPanel
              isPlayoffs={isPlayoffs}
              setIsPlayoffs={setIsPlayoffs}
              showAdvanced={showAdvanced}
              setShowAdvanced={setShowAdvanced}
              isDarkMode={isDarkMode}
            />
          </div>
        </div>

        {/* Selected Players */}
        {selectedPlayers.length > 0 && (
          <PlayerCards
            selectedPlayers={selectedPlayers}
            removePlayer={removePlayer}
            shareComparison={shareComparison}
            isDarkMode={isDarkMode}
          />
        )}

        {/* Radar Chart with Customizer */}
        {selectedPlayers.length >= 2 && (
          <div className="mb-8">
            <RadarChart
              selectedPlayers={selectedPlayers}
              currentStats={currentStats}
              isPlayoffs={isPlayoffs}
              showAdvanced={showAdvanced}
              isDarkMode={isDarkMode}
              showCustomizer={showRadarCustomizer}
              setShowCustomizer={setShowRadarCustomizer}
              radarPreset={radarPreset}
              onPresetChange={handleRadarPresetChange}
            />
            
            {showRadarCustomizer && (
              <RadarCustomizer
                selectedStats={selectedRadarStats}
                onStatsChange={handleRadarStatsChange}
                isDarkMode={isDarkMode}
                isOpen={showRadarCustomizer}
                onClose={() => setShowRadarCustomizer(false)}
              />
            )}
          </div>
        )}

        {/* Comparison Table */}
        {selectedPlayers.length >= 2 && (
          <ComparisonTable
            selectedPlayers={selectedPlayers}
            currentStats={currentStats}
            isDarkMode={isDarkMode}
            showAdvanced={showAdvanced}
          />
        )}

        {/* Empty State */}
        {selectedPlayers.length === 0 && <EmptyState isDarkMode={isDarkMode} />}
      </div>
    </div>
  );
}

export default App;