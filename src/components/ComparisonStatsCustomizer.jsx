import React, { useState } from 'react';
import { Settings, X, Check, BarChart3 } from 'lucide-react';
import { allAvailableStats, defaultComparisonConfigs, statCategories } from '../config/statsConfig';

const ComparisonStatsCustomizer = ({ 
  selectedStats, 
  onStatsChange, 
  isDarkMode,
  isOpen,
  onClose 
}) => {
  const [previewStats, setPreviewStats] = useState(selectedStats);
  const [activePreset, setActivePreset] = useState('custom');
  const [selectedCategory, setSelectedCategory] = useState('all');

  if (!isOpen) return null;

  const toggleStat = (statKey) => {
    const newStats = previewStats.includes(statKey)
      ? previewStats.filter(s => s !== statKey)
      : [...previewStats, statKey];
    
    setPreviewStats(newStats);
    onStatsChange(newStats);
    setActivePreset('custom');
  };

  const applyPreset = (presetKey) => {
    const presetStats = defaultComparisonConfigs[presetKey];
    if (presetStats) {
      setPreviewStats(presetStats);
      onStatsChange(presetStats);
      setActivePreset(presetKey);
    }
  };

  const getFilteredStats = () => {
    if (selectedCategory === 'all') {
      return Object.entries(allAvailableStats);
    }
    const categoryStats = statCategories[selectedCategory] || [];
    return Object.entries(allAvailableStats).filter(([key]) => categoryStats.includes(key));
  };

  const categories = [
    { key: 'all', label: 'All Stats', icon: '📊' },
    { key: 'scoring', label: 'Scoring', icon: '🏀' },
    { key: 'playmaking', label: 'Playmaking', icon: '🤝' },
    { key: 'rebounding', label: 'Rebounding', icon: '⬆️' },
    { key: 'defense', label: 'Defense', icon: '🛡️' },
    { key: 'advanced', label: 'Advanced', icon: '📈' },
    { key: 'volume', label: 'Volume', icon: '📏' }
  ];

  const presets = [
    { key: 'essential', label: 'Essential', desc: '6 key stats' },
    { key: 'comprehensive', label: 'Comprehensive', desc: '12 detailed stats' },
    { key: 'shooting', label: 'Shooting Focus', desc: 'Shooting metrics' },
    { key: 'advanced', label: 'Advanced', desc: 'Advanced analytics' },
    { key: 'defense', label: 'Defense', desc: 'Defensive stats' },
    { key: 'volume', label: 'Volume', desc: 'Volume metrics' }
  ];

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 z-50"
        onClick={onClose}
      />
      
      {/* Popup - Larger for more stats */}
      <div className={`fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50 w-[95vw] max-w-4xl mx-4 rounded-lg border shadow-xl ${
        isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
      }`}>
        <div className="p-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <BarChart3 className="h-5 w-5" />
              <h3 className="font-semibold text-lg">Customize Head-to-Head Stats</h3>
            </div>
            <div className="flex items-center space-x-3">
              <span className="text-sm text-gray-500">
                {previewStats.length} stats selected
              </span>
              <button
                onClick={onClose}
                className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Presets */}
          <div className="mb-4">
            <h4 className="font-medium mb-2">Quick Presets</h4>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
              {presets.map(preset => (
                <button
                  key={preset.key}
                  onClick={() => applyPreset(preset.key)}
                  className={`p-2 rounded-lg border text-left transition-all ${
                    activePreset === preset.key
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                      : isDarkMode
                      ? 'border-gray-600 hover:border-gray-500'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="font-medium text-sm">{preset.label}</div>
                  <div className="text-xs text-gray-500">{preset.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Category Filter */}
          <div className="mb-4">
            <h4 className="font-medium mb-2">Filter by Category</h4>
            <div className="flex flex-wrap gap-2">
              {categories.map(category => (
                <button
                  key={category.key}
                  onClick={() => setSelectedCategory(category.key)}
                  className={`px-3 py-1 rounded-full text-sm transition-colors ${
                    selectedCategory === category.key
                      ? 'bg-blue-500 text-white'
                      : isDarkMode
                      ? 'bg-gray-700 hover:bg-gray-600'
                      : 'bg-gray-100 hover:bg-gray-200'
                  }`}
                >
                  {category.icon} {category.label}
                </button>
              ))}
            </div>
          </div>

          {/* Stats Selection */}
          <div className="max-h-80 overflow-y-auto">
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
              {getFilteredStats().map(([key, stat]) => {
                const isSelected = previewStats.includes(key);
                
                return (
                  <button
                    key={key}
                    onClick={() => toggleStat(key)}
                    className={`p-3 rounded-lg border text-left transition-all ${
                      isSelected
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                        : isDarkMode
                        ? 'border-gray-600 hover:border-gray-500'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm truncate">{stat.label}</div>
                        <div className="text-xs text-gray-500 capitalize">
                          {Object.entries(statCategories).find(([_, stats]) => stats.includes(key))?.[0] || 'other'}
                        </div>
                        {stat.inverted && (
                          <div className="text-xs text-yellow-600 dark:text-yellow-400">
                            Lower is better
                          </div>
                        )}
                      </div>
                      {isSelected && <Check className="h-4 w-4 text-blue-500 flex-shrink-0 ml-2" />}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="text-sm text-gray-500 text-center sm:text-left">
                Select the stats you want to compare in the head-to-head table
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={() => {
                    setPreviewStats([]);
                    onStatsChange([]);
                  }}
                  className="px-4 py-2 text-sm border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  Clear All
                </button>
                <button
                  onClick={onClose}
                  className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default ComparisonStatsCustomizer;