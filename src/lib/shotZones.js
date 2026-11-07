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
