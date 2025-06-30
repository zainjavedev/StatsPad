import React from 'react';
import { BarChart3, TrendingUp } from 'lucide-react';

const ControlPanel = ({
  isPlayoffs,
  setIsPlayoffs,
  showAdvanced,
  setShowAdvanced,
  isDarkMode
}) => {
  return (
    <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
      <div className={`inline-flex rounded-lg p-1 ${
        isDarkMode ? 'bg-gray-800' : 'bg-gray-100'
      }`}>
        <button
          onClick={() => setIsPlayoffs(false)}
          className={`px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-medium rounded-md transition-colors ${
            !isPlayoffs
              ? 'bg-blue-500 text-white shadow-sm'
              : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
          }`}
        >
          <span className="hidden sm:inline">Regular Season</span>
          <span className="sm:hidden">Regular</span>
        </button>
        <button
          onClick={() => setIsPlayoffs(true)}
          className={`px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-medium rounded-md transition-colors ${
            isPlayoffs
              ? 'bg-blue-500 text-white shadow-sm'
              : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
          }`}
        >
          Playoffs
        </button>
      </div>

      <div className={`inline-flex rounded-lg p-1 ${
        isDarkMode ? 'bg-gray-800' : 'bg-gray-100'
      }`}>
        <button
          onClick={() => setShowAdvanced(false)}
          className={`px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-medium rounded-md transition-colors ${
            !showAdvanced
              ? 'bg-green-500 text-white shadow-sm'
              : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
          }`}
        >
          <BarChart3 className="h-3 w-3 sm:h-4 sm:w-4 inline mr-1" />
          Standard
        </button>
        <button
          onClick={() => setShowAdvanced(true)}
          className={`px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-medium rounded-md transition-colors ${
            showAdvanced
              ? 'bg-green-500 text-white shadow-sm'
              : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
          }`}
        >
          <TrendingUp className="h-3 w-3 sm:h-4 sm:w-4 inline mr-1" />
          Advanced
        </button>
      </div>
    </div>
  );
};

export default ControlPanel;