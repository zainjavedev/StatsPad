import React from 'react';
import { BarChart3, Moon, Sun, Share2, Users, Sparkles } from 'lucide-react';

const Header = ({ isDarkMode, setIsDarkMode, selectedPlayers, shareComparison }) => {
  return (
    <header className={`${
      isDarkMode ? 'bg-gray-900/95 border-gray-800' : 'bg-white/95 border-gray-200'
    } border-b sticky top-0 z-50 backdrop-blur-xl transition-all duration-300 shadow-sm`}>
      <div className="max-w-7xl mx-auto px-8 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-24">
          <div className="flex items-center space-x-4">
            <div className="relative group">
              <div className="p-3 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl shadow-lg transition-transform group-hover:scale-105">
                <BarChart3 className="h-6 w-6 text-white" />
              </div>
              <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
              <Sparkles className="absolute -top-2 -right-2 h-4 w-4 text-yellow-400 animate-bounce" />
            </div>
            <div>
              <h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                NBA Player Comparison
              </h1>
              <p className={`text-sm transition-colors ${
                isDarkMode ? 'text-gray-400' : 'text-gray-600'
              }`}>
                Advanced Analytics Dashboard
              </p>
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            {/* Player Count Badge */}
            {selectedPlayers.length > 0 && (
              <div className={`flex items-center space-x-2 px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                isDarkMode 
                  ? 'bg-blue-900/50 text-blue-300 border border-blue-800' 
                  : 'bg-blue-50 text-blue-700 border border-blue-200'
              }`}>
                <Users className="h-4 w-4" />
                <span>{selectedPlayers.length}/3</span>
              </div>
            )}

            {/* Share Button */}
            {selectedPlayers.length >= 2 && (
              <button
                onClick={shareComparison}
                className={`p-2.5 rounded-lg transition-all duration-200 ${
                  isDarkMode 
                    ? 'bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white border border-gray-700' 
                    : 'bg-gray-100 hover:bg-gray-200 text-gray-600 hover:text-gray-900 border border-gray-200'
                } hover:scale-105 active:scale-95`}
                title="Share comparison"
              >
                <Share2 className="h-4 w-4" />
              </button>
            )}
            
            {/* Theme Toggle */}
            <button
              onClick={() => setIsDarkMode(!isDarkMode)}
              className={`p-2.5 rounded-lg transition-all duration-200 ${
                isDarkMode 
                  ? 'bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-400 border border-yellow-500/30' 
                  : 'bg-blue-500/10 hover:bg-blue-500/20 text-blue-600 border border-blue-200'
              } hover:scale-105 active:scale-95`}
              title={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {isDarkMode ? (
                <Sun className="h-4 w-4" />
              ) : (
                <Moon className="h-4 w-4" />
              )}
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;