// Enhanced team colors with gradients and secondary colors
export const teamColors = {
  'OKC': { 
    primary: '#007AC1', 
    secondary: '#EF3B24', 
    gradient: 'from-blue-500 to-orange-500',
    light: '#3B9AE3',
    dark: '#005A91'
  },
  'MIL': { 
    primary: '#00471B', 
    secondary: '#EEE1C6', 
    gradient: 'from-green-800 to-yellow-200',
    light: '#2D6B3D',
    dark: '#00350F'
  },
  'DEN': { 
    primary: '#0E2240', 
    secondary: '#FEC524', 
    gradient: 'from-blue-900 to-yellow-400',
    light: '#1E3A5F',
    dark: '#081222'
  },
  'MIN': { 
    primary: '#0C2340', 
    secondary: '#236192', 
    gradient: 'from-blue-900 to-blue-600',
    light: '#1A3A5F',
    dark: '#071B30'
  },
  'BOS': { 
    primary: '#007A33', 
    secondary: '#BA9653', 
    gradient: 'from-green-600 to-yellow-600',
    light: '#2D9B5D',
    dark: '#005A26'
  },
  'LAL': { 
    primary: '#552583', 
    secondary: '#FDB927', 
    gradient: 'from-purple-600 to-yellow-400',
    light: '#7549A3',
    dark: '#3D1B5F'
  },
  'LAC': { 
    primary: '#C8102E', 
    secondary: '#1D428A', 
    gradient: 'from-red-600 to-blue-600',
    light: '#D3405E',
    dark: '#A00C24'
  },
  'GSW': { 
    primary: '#1D428A', 
    secondary: '#FFC72C', 
    gradient: 'from-blue-600 to-yellow-400',
    light: '#4C6BAA',
    dark: '#153268'
  },
  'PHX': { 
    primary: '#1D1160', 
    secondary: '#E56020', 
    gradient: 'from-purple-900 to-orange-500',
    light: '#3D2A80',
    dark: '#0F0840'
  },
  'CHI': { 
    primary: '#CE1141', 
    secondary: '#000000', 
    gradient: 'from-red-600 to-gray-900',
    light: '#DB4161',
    dark: '#A00D31'
  },
  'MIA': { 
    primary: '#98002E', 
    secondary: '#F9A01B', 
    gradient: 'from-red-800 to-yellow-500',
    light: '#B8204E',
    dark: '#700022'
  },
  'NYK': { 
    primary: '#006BB6', 
    secondary: '#F58426', 
    gradient: 'from-blue-600 to-orange-500',
    light: '#2D8BD6',
    dark: '#005094'
  },
  'CLE': { 
    primary: '#860038', 
    secondary: '#FDBB30', 
    gradient: 'from-red-800 to-yellow-400',
    light: '#A62058',
    dark: '#60002A'
  },
  'ATL': { 
    primary: '#E03A3E', 
    secondary: '#26282A', 
    gradient: 'from-red-500 to-gray-800',
    light: '#E85A5E',
    dark: '#B82E32'
  },
  'UTA': { 
    primary: '#002B5C', 
    secondary: '#00471B', 
    gradient: 'from-blue-900 to-green-800',
    light: '#1E4B7C',
    dark: '#001A3A'
  },
  'POR': { 
    primary: '#E03A3E', 
    secondary: '#000000', 
    gradient: 'from-red-500 to-gray-900',
    light: '#E85A5E',
    dark: '#B82E32'
  },
  'SAC': { 
    primary: '#5A2D81', 
    secondary: '#63727A', 
    gradient: 'from-purple-600 to-gray-500',
    light: '#7A4DA1',
    dark: '#421F61'
  },
  'HOU': { 
    primary: '#CE1141', 
    secondary: '#000000', 
    gradient: 'from-red-600 to-gray-900',
    light: '#DB4161',
    dark: '#A00D31'
  },
  'MEM': { 
    primary: '#5D76A9', 
    secondary: '#12173F', 
    gradient: 'from-blue-500 to-blue-900',
    light: '#7D96C9',
    dark: '#3D5689'
  },
  'IND': { 
    primary: '#002D62', 
    secondary: '#FDBB30', 
    gradient: 'from-blue-900 to-yellow-400',
    light: '#1E4D82',
    dark: '#001A40'
  },
  'WAS': { 
    primary: '#002B5C', 
    secondary: '#E31837', 
    gradient: 'from-blue-900 to-red-600',
    light: '#1E4B7C',
    dark: '#001A3A'
  },
  'CHA': { 
    primary: '#1D1160', 
    secondary: '#00788C', 
    gradient: 'from-purple-900 to-teal-600',
    light: '#3D2A80',
    dark: '#0F0840'
  },
  'TOR': { 
    primary: '#CE1141', 
    secondary: '#000000', 
    gradient: 'from-red-600 to-gray-900',
    light: '#DB4161',
    dark: '#A00D31'
  },
  'DET': { 
    primary: '#C8102E', 
    secondary: '#1D42BA', 
    gradient: 'from-red-600 to-blue-600',
    light: '#D3405E',
    dark: '#A00C24'
  },
  'ORL': { 
    primary: '#0077C0', 
    secondary: '#C4CED4', 
    gradient: 'from-blue-500 to-gray-400',
    light: '#2D97E0',
    dark: '#005AA0'
  }
};

// Get team color variations
export const getTeamColors = (teamCode) => {
  return teamColors[teamCode] || {
    primary: '#6B7280',
    secondary: '#374151',
    gradient: 'from-gray-500 to-gray-700',
    light: '#9CA3AF',
    dark: '#4B5563'
  };
};

// Team logos/abbreviations mapping for display
export const teamDisplayNames = {
  'OKC': 'Thunder',
  'MIL': 'Bucks',
  'DEN': 'Nuggets',
  'MIN': 'Timberwolves',
  'BOS': 'Celtics',
  'LAL': 'Lakers',
  'LAC': 'Clippers',
  'GSW': 'Warriors',
  'PHX': 'Suns',
  'CHI': 'Bulls',
  'MIA': 'Heat',
  'NYK': 'Knicks',
  'CLE': 'Cavaliers',
  'ATL': 'Hawks',
  'UTA': 'Jazz',
  'POR': 'Trail Blazers',
  'SAC': 'Kings',
  'HOU': 'Rockets',
  'MEM': 'Grizzlies',
  'IND': 'Pacers',
  'WAS': 'Wizards',
  'CHA': 'Hornets',
  'TOR': 'Raptors',
  'DET': 'Pistons',
  'ORL': 'Magic'
};