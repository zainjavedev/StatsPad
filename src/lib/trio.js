const num = value => Number(String(value ?? '').replace('+', '')) || 0;

/* His three best numbers of the night: each stat is scored against a good night in that category, and the top three show,
   shown in the usual order (points, rebounds, assists...). Points and rebounds are judged a little more kindly than
   steals and blocks, so a quiet night of three steals does not push a scoring line out. Shooting only counts with enough attempts. */
export function trio(stats) {
  const [fgm, fga] = String(stats.FG ?? '0-0').split('-').map(Number), three = Number(String(stats['3PT'] ?? '0-0').split('-')[0]);
  const all = [
    [num(stats.PTS), 'pts', num(stats.PTS) / 17], [num(stats.REB), 'reb', num(stats.REB) / 7], [num(stats.AST), 'ast', num(stats.AST) / 6],
    [num(stats.STL), 'stl', num(stats.STL) / 3.5], [num(stats.BLK), 'blk', num(stats.BLK) / 3.5], [three, '3pm', three / 3],
  ];
  if (fga >= 6) all.push([`${Math.round(fgm / fga * 100)}%`, 'fg', Math.round(fgm / fga * 100) / 55]);
  const best = all.filter(item => item[2] > 0).sort((a, b) => b[2] - a[2]).slice(0, 3);
  for (const fallback of all.slice(0, 3)) if (best.length < 3 && !best.includes(fallback)) best.push(fallback);
  return best.sort((a, b) => all.indexOf(a) - all.indexOf(b)).map(([value, label]) => [value, label]);
}

