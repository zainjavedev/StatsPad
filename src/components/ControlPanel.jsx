import React from 'react';

const ControlPanel = ({
  isPlayoffs,
  setIsPlayoffs,
  showAdvanced,
  setShowAdvanced,
  isDarkMode
}) => {
  return (
    <div className="w-full">
      {/* Season Toggle - Full Width on Mobile */}
      <div className={`w-full inline-flex rounded-lg p-1 ${
        isDarkMode ? 'bg-gray-800' : 'bg-gray-100'
      }`}>
        <button
          onClick={() => setIsPlayoffs(false)}
          className={`flex-1 px-4 py-3 text-sm font-medium rounded-md transition-colors ${
            !isPlayoffs
              ? 'bg-blue-500 text-white shadow-sm'
              : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
          }`}
        >
          Regular Season
        </button>
        <button
          onClick={() => setIsPlayoffs(true)}
          className={`flex-1 px-4 py-3 text-sm font-medium rounded-md transition-colors ${
            isPlayoffs
              ? 'bg-blue-500 text-white shadow-sm'
              : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
          }`}
        >
          Playoffs
        </button>
      </div>
    </div>
  );
};

export default ControlPanel;