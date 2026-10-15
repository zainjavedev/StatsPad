/* The 30 clubs: ESPN's URL slug (for schedules and rosters), a brand colour
   and the display name. Codes match the roster files in public/data. */

export const TEAMS = {
  ATL: {name: 'Atlanta Hawks', espn: 'atl', color: '#e03a3e'},
  BOS: {name: 'Boston Celtics', espn: 'bos', color: '#007a33'},
  BKN: {name: 'Brooklyn Nets', espn: 'bkn', color: '#777777'},
  CHA: {name: 'Charlotte Hornets', espn: 'cha', color: '#1d1160'},
  CHI: {name: 'Chicago Bulls', espn: 'chi', color: '#ce1141'},
  CLE: {name: 'Cleveland Cavaliers', espn: 'cle', color: '#860038'},
  DAL: {name: 'Dallas Mavericks', espn: 'dal', color: '#00538c'},
  DEN: {name: 'Denver Nuggets', espn: 'den', color: '#0e2240'},
  DET: {name: 'Detroit Pistons', espn: 'det', color: '#c8102e'},
  GSW: {name: 'Golden State Warriors', espn: 'gs', color: '#1d428a'},
  HOU: {name: 'Houston Rockets', espn: 'hou', color: '#ce1141'},
  IND: {name: 'Indiana Pacers', espn: 'ind', color: '#002d62'},
  LAC: {name: 'LA Clippers', espn: 'lac', color: '#c8102e'},
  LAL: {name: 'Los Angeles Lakers', espn: 'lal', color: '#552583'},
  MEM: {name: 'Memphis Grizzlies', espn: 'mem', color: '#5d76a9'},
  MIA: {name: 'Miami Heat', espn: 'mia', color: '#98002e'},
  MIL: {name: 'Milwaukee Bucks', espn: 'mil', color: '#00471b'},
  MIN: {name: 'Minnesota Timberwolves', espn: 'min', color: '#0c2340'},
  NOP: {name: 'New Orleans Pelicans', espn: 'no', color: '#0c2340'},
  NYK: {name: 'New York Knicks', espn: 'ny', color: '#f58426'},
  OKC: {name: 'Oklahoma City Thunder', espn: 'okc', color: '#007ac1'},
  ORL: {name: 'Orlando Magic', espn: 'orl', color: '#0077c0'},
  PHI: {name: 'Philadelphia 76ers', espn: 'phi', color: '#006bb6'},
  PHX: {name: 'Phoenix Suns', espn: 'phx', color: '#1d1160'},
  POR: {name: 'Portland Trail Blazers', espn: 'por', color: '#e03a3e'},
  SAC: {name: 'Sacramento Kings', espn: 'sac', color: '#5a2d81'},
  SAS: {name: 'San Antonio Spurs', espn: 'sa', color: '#8a8d8f'},
  TOR: {name: 'Toronto Raptors', espn: 'tor', color: '#ce1141'},
  UTA: {name: 'Utah Jazz', espn: 'utah', color: '#6cace4'},
  WAS: {name: 'Washington Wizards', espn: 'wsh', color: '#002b5c'},
};

/* Basketball Reference spells three clubs differently from the roster files. */
const BBREF_CODES = {BRK: 'BKN', CHO: 'CHA', PHO: 'PHX'};
export const teamCodeOf = code => BBREF_CODES[code] || code;
