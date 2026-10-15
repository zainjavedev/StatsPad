/* The 30 clubs: NBA team id (for logos), ESPN's URL slug (for schedules and rosters), a brand colour
   and the display name. Codes match the roster files in public/data. */

export const TEAMS = {
  ATL: {id: 1610612737, name: 'Atlanta Hawks', espn: 'atl', color: '#e03a3e'},
  BOS: {id: 1610612738, name: 'Boston Celtics', espn: 'bos', color: '#007a33'},
  BKN: {id: 1610612751, name: 'Brooklyn Nets', espn: 'bkn', color: '#777777'},
  CHA: {id: 1610612766, name: 'Charlotte Hornets', espn: 'cha', color: '#1d1160'},
  CHI: {id: 1610612741, name: 'Chicago Bulls', espn: 'chi', color: '#ce1141'},
  CLE: {id: 1610612739, name: 'Cleveland Cavaliers', espn: 'cle', color: '#860038'},
  DAL: {id: 1610612742, name: 'Dallas Mavericks', espn: 'dal', color: '#00538c'},
  DEN: {id: 1610612743, name: 'Denver Nuggets', espn: 'den', color: '#0e2240'},
  DET: {id: 1610612765, name: 'Detroit Pistons', espn: 'det', color: '#c8102e'},
  GSW: {id: 1610612744, name: 'Golden State Warriors', espn: 'gs', color: '#1d428a'},
  HOU: {id: 1610612745, name: 'Houston Rockets', espn: 'hou', color: '#ce1141'},
  IND: {id: 1610612754, name: 'Indiana Pacers', espn: 'ind', color: '#002d62'},
  LAC: {id: 1610612746, name: 'LA Clippers', espn: 'lac', color: '#c8102e'},
  LAL: {id: 1610612747, name: 'Los Angeles Lakers', espn: 'lal', color: '#552583'},
  MEM: {id: 1610612763, name: 'Memphis Grizzlies', espn: 'mem', color: '#5d76a9'},
  MIA: {id: 1610612748, name: 'Miami Heat', espn: 'mia', color: '#98002e'},
  MIL: {id: 1610612749, name: 'Milwaukee Bucks', espn: 'mil', color: '#00471b'},
  MIN: {id: 1610612750, name: 'Minnesota Timberwolves', espn: 'min', color: '#0c2340'},
  NOP: {id: 1610612740, name: 'New Orleans Pelicans', espn: 'no', color: '#0c2340'},
  NYK: {id: 1610612752, name: 'New York Knicks', espn: 'ny', color: '#f58426'},
  OKC: {id: 1610612760, name: 'Oklahoma City Thunder', espn: 'okc', color: '#007ac1'},
  ORL: {id: 1610612753, name: 'Orlando Magic', espn: 'orl', color: '#0077c0'},
  PHI: {id: 1610612755, name: 'Philadelphia 76ers', espn: 'phi', color: '#006bb6'},
  PHX: {id: 1610612756, name: 'Phoenix Suns', espn: 'phx', color: '#1d1160'},
  POR: {id: 1610612757, name: 'Portland Trail Blazers', espn: 'por', color: '#e03a3e'},
  SAC: {id: 1610612758, name: 'Sacramento Kings', espn: 'sac', color: '#5a2d81'},
  SAS: {id: 1610612759, name: 'San Antonio Spurs', espn: 'sa', color: '#8a8d8f'},
  TOR: {id: 1610612761, name: 'Toronto Raptors', espn: 'tor', color: '#ce1141'},
  UTA: {id: 1610612762, name: 'Utah Jazz', espn: 'utah', color: '#6cace4'},
  WAS: {id: 1610612764, name: 'Washington Wizards', espn: 'wsh', color: '#002b5c'},
};

/* Basketball Reference spells three clubs differently from the roster files. */
const BBREF_CODES = {BRK: 'BKN', CHO: 'CHA', PHO: 'PHX'};
export const teamCodeOf = code => BBREF_CODES[code] || code;

export const logoUrl = code => `https://cdn.nba.com/logos/nba/${TEAMS[code].id}/global/L/logo.svg`;

/* "Oklahoma City Thunder" -> "Thunder". */
export const nickname = code => TEAMS[code].name.endsWith('Trail Blazers') ? 'Trail Blazers' : TEAMS[code].name.split(' ').pop();
