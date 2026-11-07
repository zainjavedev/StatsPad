/* A player's shots grouped into the ten usual zones of a half court. ESPN's x runs 0-50 across the floor (the basket at 25),
   y is feet up the floor from the basket. Threes are told apart by the play (a 3-point attempt), not by the drawing, so a
   toe-on-the-line long two is never counted as a three. Left and right are as the court is drawn, basket at the bottom. */

export const WING = 22;
const angle = (x, y) => Math.atan2(x - 25, y) * 180 / Math.PI;
const side = (x, y) => { const a = angle(x, y); return a < -WING ? 'left' : a > WING ? 'right' : 'center'; };

export const ZONES = [
  {key: 'ra', name: 'At the rim', long: 'Restricted area'},
  {key: 'paint', name: 'Paint', long: 'In the paint, outside the restricted area'},
  {key: 'mid-left', name: 'Left midrange', long: 'Midrange, left side'},
  {key: 'mid-center', name: 'Middle midrange', long: 'Midrange, straight on'},
  {key: 'mid-right', name: 'Right midrange', long: 'Midrange, right side'},
  {key: 'c3-left', name: 'Left corner 3', long: 'Left corner three'},
  {key: 'c3-right', name: 'Right corner 3', long: 'Right corner three'},
  {key: 'w3-left', name: 'Left wing 3', long: 'Above the break, left wing'},
  {key: 'top3', name: 'Top of the key 3', long: 'Above the break, straight on'},
  {key: 'w3-right', name: 'Right wing 3', long: 'Above the break, right wing'},
];

export function zoneOf({x, y, three}) {
  if (three) {
    if (y <= 9) return x < 25 ? 'c3-left' : 'c3-right';
    return {left: 'w3-left', center: 'top3', right: 'w3-right'}[side(x, y)];
  }
  if (Math.hypot(x - 25, y) <= 4) return 'ra';
  if (Math.abs(x - 25) <= 8 && y <= 14) return 'paint';
  return `mid-${side(x, y)}`;
}

/* Attempts, makes and points per zone, each zone's share of all attempts and of the season's points (free throws included). */
export function zonesOf(shots, totalPoints) {
  const rows = new Map(ZONES.map(zone => [zone.key, {...zone, fga: 0, fgm: 0, pts: 0}]));
  for (const shot of shots) {
    const row = rows.get(zoneOf(shot));
    row.fga += 1;
    if (shot.made) { row.fgm += 1; row.pts += shot.three ? 3 : 2; }
  }
  const fga = shots.length, points = Math.max(totalPoints || 0, [...rows.values()].reduce((sum, row) => sum + row.pts, 0));
  return [...rows.values()].map(row => ({...row, share: fga ? row.fga / fga : 0, ptsShare: points ? row.pts / points : 0, pct: row.fga ? row.fgm / row.fga : null}));
}

/* The five standard groups (the NBA's own shot-zone split), for written copy: no left/right, since ESPN's coordinates don't say
   which side is the player's left. `label` follows "his hot zone is", `short` fits a meta description. */
export const GROUPS = [
  {key: 'rim', name: 'Restricted area', label: 'the restricted area, at the rim', short: 'at the rim', where: 'at the rim', zones: ['ra']},
  {key: 'paint', name: 'In the paint (non-RA)', label: 'the paint outside the restricted area', short: 'in the paint', where: 'in the paint outside the restricted area', zones: ['paint']},
  {key: 'mid', name: 'Midrange', label: 'midrange', short: 'midrange', where: 'from midrange', zones: ['mid-left', 'mid-center', 'mid-right']},
  {key: 'corner3', name: 'Corner 3', label: 'the corner three', short: 'corner threes', where: 'from the corner three', zones: ['c3-left', 'c3-right']},
  {key: 'arc3', name: 'Above-the-break 3', label: 'the above-the-break three', short: 'above-the-break threes', where: 'from above-the-break threes', zones: ['w3-left', 'top3', 'w3-right']},
];
export function groupsOf(shots, totalPoints) {
  const zones = zonesOf(shots, totalPoints);
  return GROUPS.map(group => {
    const parts = zones.filter(zone => group.zones.includes(zone.key));
    const fga = parts.reduce((sum, zone) => sum + zone.fga, 0), fgm = parts.reduce((sum, zone) => sum + zone.fgm, 0);
    return {...group, fga, fgm, pct: fga ? fgm / fga : null, share: parts.reduce((sum, zone) => sum + zone.share, 0), ptsShare: parts.reduce((sum, zone) => sum + zone.ptsShare, 0)};
  });
}
