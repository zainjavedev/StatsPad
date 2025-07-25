import React, { useState } from 'react';
import { Settings, X, Check } from 'lucide-react';
import { allAvailableStats } from '../config/statsConfig';

const RadarCustomizer = ({ 
  selectedStats, 
  onStatsChange, 
  isDarkMode,
  isOpen,
  onClose 
}) => {
  const [previewStats, setPreviewStats] = useState(selectedStats);

  if (!isOpen) return null;

  const toggleStat = (statKey) => {
    const newStats = previewStats.includes(statKey)
      ? previewStats.filter(s => s !== statKey)
      : [...previewStats, statKey].slice(0, 8); // Max 8 stats
    
    setPreviewStats(newStats);
    onStatsChange(newStats); // Apply changes immediately
  };

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 z-50"
        onClick={onClose}
      />
      
      {/* Popup - Responsive sizing */}
      <div className={`fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50 w-[95vw] max-w-md mx-4 rounded-lg border shadow-xl ${
        isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
      }`}>
        <div className="p-3 sm:p-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <Settings className="h-4 w-4 sm:h-5 sm:w-5" />
              <h3 className="font-semibold text-sm sm:text-base">Customize Radar</h3>
            </div>
            <div className="flex items-center space-x-3">
              <span className="text-xs sm:text-sm text-gray-500">
                {previewStats.length}/8
              </span>
              <button
                onClick={onClose}
                className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="max-h-80 overflow-y-auto">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {Object.entries(allAvailableStats).map(([key, stat]) => {
                const isSelected = previewStats.includes(key);
                const isDisabled = !isSelected && previewStats.length >= 8;
                
                return (
                  <button
                    key={key}
                    onClick={() => !isDisabled && toggleStat(key)}
                    disabled={isDisabled}
                    className={`p-2 sm:p-3 rounded-lg border text-left transition-all ${
                      isSelected
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                        : isDisabled
                        ? 'border-gray-200 dark:border-gray-600 opacity-50 cursor-not-allowed'
                        : isDarkMode
                        ? 'border-gray-600 hover:border-gray-500'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-xs sm:text-sm truncate">{stat.label}</div>
                        {stat.inverted && (
                          <div className="text-xs text-yellow-600 dark:text-yellow-400">
                            Lower is better
                          </div>
                        )}
                      </div>
                      {isSelected && <Check className="h-3 w-3 sm:h-4 sm:w-4 text-blue-500 flex-shrink-0 ml-2" />}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="text-xs sm:text-sm text-gray-500 text-center sm:text-left">
                Select up to 8 statistics for the radar chart
              </div>
              <button
                onClick={onClose}
                className="w-full sm:w-auto px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default RadarCustomizer;