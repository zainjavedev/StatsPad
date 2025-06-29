import React from 'react';
import { Users } from 'lucide-react';

const EmptyState = ({ isDarkMode }) => {
  return (
    <div className="text-center py-12">
      <div className={`inline-flex items-center justify-center w-16 h-16 rounded-full mb-4 ${
        isDarkMode ? 'bg-gray-800' : 'bg-gray-100'
      }`}>
        <Users className="h-8 w-8 text-gray-400" />
      </div>
      <h3 className="text-lg font-medium mb-2">Start Comparing Players</h3>
      <p className="text-gray-500 mb-6 max-w-md mx-auto">
        Search for NBA players above to begin your comparison. You can compare up to 3 players at once.
      </p>
      <div className="text-sm text-gray-400">
        💡 Try searching for "Giannis", "Jokic", or "Tatum"
      </div>
    </div>
  );
};

export default EmptyState;