import { TEAMS, teamCodeOf } from './teams';

/* The radar behind the home page's head-to-head and the blog's player comparisons, kept in one place so a chart in a
   post is scaled exactly like the one a reader sees after clicking through. */

/* Each player is drawn in their team's colour. Two teams with near-identical colours (or one team) get the orange
   series colour for the second player so the shapes never merge. */
const rgb = hex => [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16));
/* Clubs whose official primary is too dark to read as a data colour use their gold instead. */
const RADAR_COLOR = {IND: '#fdbb30'};
const teamHex = player => { const code = teamCodeOf(player?.team); return RADAR_COLOR[code] || TEAMS[code]?.color || '#8a8a8a'; };
const hue = hex => {
  const [r, g, b] = rgb(hex).map(v => v / 255), max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min;
  if (!d) return null;
  const h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return (h * 60 + 360) % 360;
};
/* Apart means a different hue family, or far apart in RGB when one is a neutral. */
const apart = (x, y) => {
  const [hx, hy] = [hue(x), hue(y)];
  if (hx === null || hy === null) return Math.hypot(...rgb(x).map((v, i) => v - rgb(y)[i])) > 110;
  const gap = Math.abs(hx - hy);
  return Math.min(gap, 360 - gap) > 40;
};

/* Seven skills, each scaled from the league's lowest to highest rotation player, as on the compare page. */
export const ts = stats => stats.points / (2 * (stats.fieldGoalsAttempted + .44 * stats.freeThrowsAttempted)) * 100 || 0;
export const AXES = [
  ['Scoring', [[p => p.stats.points, 'PPG']]],
  ['Efficiency', [[p => ts(p.stats), 'TS%']]],
  ['FG%', [[p => p.stats.fieldGoalPercentage, 'FG%']]],
  ['3P%', [[p => p.stats.threePointPercentage, '3P%']]],
  ['Playmaking', [[p => p.stats.assists, 'APG']]],
  ['Rebounding', [[p => p.stats.totalRebounds, 'RPG']]],
  ['Defense', [[p => p.stats.steals, 'SPG'], [p => p.stats.blocks, 'BPG']]],
];

/* The two series colours for a pair: each player's team colour, with orange for the second when the two would blur together. */
export function radarTints(a, b) {
  const [hexA, hexB] = [teamHex(a), teamHex(b)];
  return {'--ta': hexA, '--tb': apart(hexA, hexB) ? hexB : '#ff8a3d'};
}

/* One entry per spoke: the pct drives the shape, the text shows on hover. */
export const radarAxes = (a, b, pool) => AXES.map(([label, parts]) => ({label, sides: [a, b].map(player => {
  const shares = parts.map(([get]) => {
    const values = pool.map(get).filter(Number.isFinite), low = Math.min(...values), high = Math.max(...values);
    return high > low ? Math.max(0, Math.min(1, (get(player) - low) / (high - low))) : .5;
  });
  const pct = Math.round(shares.reduce((sum, share) => sum + share, 0) / shares.length * 100);
  return {pct, text: parts.map(([get, short]) => `${get(player).toFixed(1)} ${short}`).join(' · '), rank: `${pct}% of the league range`};
})}));
