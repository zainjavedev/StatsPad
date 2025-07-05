import React, { useState, useEffect, useMemo } from 'react';
import Header from './Header';
import SearchBar from './SearchBar';
import ControlPanel from './ControlPanel';
import PlayerCards from './PlayerCards';
import RadarChart from './RadarChart';
import ComparisonTable from './ComparisonTable';
import EmptyState from './EmptyState';
import RadarCustomizer from './RadarCustomizer';
import ComparisonStatsCustomizer from './ComparisonStatsCustomizer';
import { usePlayerData } from '../hooks/usePlayerData';
import { 
  allAvailableStats, 
  defaultRadarConfigs, 
  defaultComparisonConfigs,
  defaultRadarStats,
  defaultComparisonStats,
  enhancePlayerStats,
  getCurrentStats 
} from '../config/statsConfig';
import { generateShareableUrl, parseUrlParameters } from '../utils/utils';

function Home() {
  const [selectedPlayers, setSelectedPlayers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isPlayoffs, setIsPlayoffs] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [showRadarCustomizer, setShowRadarCustomizer] = useState(false);
  const [showComparisonCustomizer, setShowComparisonCustomizer] = useState(false);
  const [selectedRadarStats, setSelectedRadarStats] = useState(defaultRadarStats);
  const [selectedComparisonStats, setSelectedComparisonStats] = useState(defaultComparisonStats);
  const [radarPreset, setRadarPreset] = useState('basic');
  const [comparisonPreset, setComparisonPreset] = useState('comprehensive');
  const [sortBy, setSortBy] = useState('rank');
  const [sortOrder, setSortOrder] = useState('asc');

  // Get both regular season and playoff data for season comparison
  const { currentData: regularSeasonData, loading: regularLoading, error: regularError } = usePlayerData(false);
  const { currentData: playoffData, loading: playoffLoading, error: playoffError } = usePlayerData(true);

  // Current data based on selected season
  const currentData = isPlayoffs ? playoffData : regularSeasonData;
  const loading = regularLoading || playoffLoading;
  const error = regularError || playoffError;

  // Enhance player data with calculated stats (TS%, eFG%)
  const enhancedData = useMemo(() => {
    if (!currentData) return null;
    
    return {
      ...currentData,
      players: currentData.players.map(player => enhancePlayerStats(player))
    };
  }, [currentData]);

  // Enhanced regular season and playoff data for season comparison
  const enhancedRegularSeasonData = useMemo(() => {
    if (!regularSeasonData) return null;
    return {
      ...regularSeasonData,
      players: regularSeasonData.players.map(player => enhancePlayerStats(player))
    };
  }, [regularSeasonData]);

  const enhancedPlayoffData = useMemo(() => {
    if (!playoffData) return null;
    return {
      ...playoffData,
      players: playoffData.players.map(player => enhancePlayerStats(player))
    };
  }, [playoffData]);

  // Get current stats for radar based on selection
  const currentRadarStats = useMemo(() => {
    return getCurrentStats(selectedRadarStats);
  }, [selectedRadarStats]);

  // Get current stats for comparison table based on selection
  const currentComparisonStats = useMemo(() => {
    return getCurrentStats(selectedComparisonStats);
  }, [selectedComparisonStats]);

  // Filter and sort players with enhanced data
  const filteredPlayers = useMemo(() => {
    if (!searchTerm || !enhancedData) return [];
    
    let filtered = enhancedData.players.filter(player => {
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
             (searchTermLower === 'lebron' && playerName.includes('lebron')) ||
             (searchTermLower === 'shai' && playerName.includes('shai'));
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
  }, [searchTerm, enhancedData, sortBy, sortOrder]);

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
    if (defaultRadarConfigs[preset]) {
      setSelectedRadarStats(defaultRadarConfigs[preset]);
    }
  };

  // Handle radar stats selection
  const handleRadarStatsChange = (statKeys) => {
    setSelectedRadarStats(statKeys);
    setRadarPreset('custom');
  };

  // Handle comparison stats selection
  const handleComparisonStatsChange = (statKeys) => {
    setSelectedComparisonStats(statKeys);
    setComparisonPreset('custom');
  };

  // Handle comparison preset change
  const handleComparisonPresetChange = (preset) => {
    setComparisonPreset(preset);
    if (defaultComparisonConfigs[preset]) {
      setSelectedComparisonStats(defaultComparisonConfigs[preset]);
    }
  };

  // Share comparison
  const shareComparison = async () => {
    const url = generateShareableUrl(selectedPlayers, isPlayoffs);
    
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
    if (parseUrlParameters) {
      const { players: playerNames, isPlayoffs: urlIsPlayoffs } = parseUrlParameters();

      if (urlIsPlayoffs) setIsPlayoffs(true);

      if (playerNames && playerNames.length > 0 && enhancedData) {
        const players = enhancedData.players.filter(p => 
          playerNames.includes(p.playerName)
        );
        setSelectedPlayers(players);
      }
    }
  }, [enhancedData]);

  // Update selected players when switching between seasons
  useEffect(() => {
    if (selectedPlayers.length > 0 && enhancedData) {
      const updatedPlayers = selectedPlayers.map(selectedPlayer => {
        const updatedPlayer = enhancedData.players.find(p => p.playerName === selectedPlayer.playerName);
        return updatedPlayer || selectedPlayer; // Fallback to original if not found
      });
      
      // Only update if there are actual changes
      const hasChanges = updatedPlayers.some((player, index) => 
        JSON.stringify(player.stats) !== JSON.stringify(selectedPlayers[index].stats)
      );
      
      if (hasChanges) {
        setSelectedPlayers(updatedPlayers);
      }
    }
  }, [isPlayoffs, enhancedData]);

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

  // Handle clicks outside dropdown to close it
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showDropdown && !event.target.closest('.search-container')) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showDropdown]);

  if (loading) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${
        isDarkMode ? 'bg-gray-900 text-white' : 'bg-gradient-to-br from-blue-50 to-purple-50 text-gray-900'
      }`}>
        <div className="text-center px-4">
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
        <div className="text-center max-w-md mx-4">
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

      <div className="max-w-7xl mx-auto px-4 py-4">
        {/* Search and Controls - Mobile Full Width */}
        <div className="mb-6 space-y-4">
          <div className="search-container w-full">
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
          </div>

          <div className="w-full">
            <ControlPanel
              isPlayoffs={isPlayoffs}
              setIsPlayoffs={setIsPlayoffs}
              isDarkMode={isDarkMode}
            />
          </div>
        </div>

        {/* Season Comparison Notice for Single Player */}
        {selectedPlayers.length === 1 && enhancedRegularSeasonData && enhancedPlayoffData && (
          <div className={`mb-4 p-3 rounded-lg border-l-4 border-blue-500 ${
            isDarkMode ? 'bg-blue-900/20 border-blue-400' : 'bg-blue-50 border-blue-500'
          }`}>
            <div className="flex items-center space-x-2 text-sm">
              <span className="text-blue-600 dark:text-blue-400">💡</span>
              <span className={`${isDarkMode ? 'text-blue-300' : 'text-blue-700'}`}>
                Season comparison available for {selectedPlayers[0].playerName} - radar shows both regular season and playoffs
              </span>
            </div>
          </div>
        )}

        {/* Selected Players */}
        {selectedPlayers.length > 0 && (
          <PlayerCards
            selectedPlayers={selectedPlayers}
            removePlayer={removePlayer}
            shareComparison={shareComparison}
            isDarkMode={isDarkMode}
          />
        )}

        {/* Radar Chart with Season Comparison Support */}
        {selectedPlayers.length >= 1 && (
          <div className="mb-4">
            <RadarChart
              selectedPlayers={selectedPlayers}
              currentStats={currentRadarStats}
              isPlayoffs={isPlayoffs}
              isDarkMode={isDarkMode}
              showCustomizer={showRadarCustomizer}
              setShowCustomizer={setShowRadarCustomizer}
              radarPreset={radarPreset}
              onPresetChange={handleRadarPresetChange}
              // Season comparison data
              regularSeasonData={enhancedRegularSeasonData}
              playoffsData={enhancedPlayoffData}
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
        {selectedPlayers.length >= 1 && (
          <div>
            <ComparisonTable
              selectedPlayers={selectedPlayers}
              currentStats={currentComparisonStats}
              isDarkMode={isDarkMode}
              showStatsCustomizer={showComparisonCustomizer}
              setShowStatsCustomizer={setShowComparisonCustomizer}
              // Season comparison data
              regularSeasonData={enhancedRegularSeasonData}
              playoffsData={enhancedPlayoffData}
            />
            
            {showComparisonCustomizer && (
              <ComparisonStatsCustomizer
                selectedStats={selectedComparisonStats}
                onStatsChange={handleComparisonStatsChange}
                isDarkMode={isDarkMode}
                isOpen={showComparisonCustomizer}
                onClose={() => setShowComparisonCustomizer(false)}
              />
            )}
          </div>
        )}

        {/* Empty State */}
        {selectedPlayers.length === 0 && <EmptyState isDarkMode={isDarkMode} />}
      </div>
    </div>
  );
}

export default Home;    