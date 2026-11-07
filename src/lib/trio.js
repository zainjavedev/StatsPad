const num = value => Number(String(value ?? '').replace('+', '')) || 0;

/* A performance card's three numbers: points always lead, then his two best other numbers of the night. Each stat is
   scored against a good night in that category, so rebounds and assists are judged a little more kindly than steals and
   blocks, and a quiet night of three steals does not push a real line out. Shooting only counts with enough attempts, and is judged against 65% so an ordinary shooting night does not crowd out a real number.
   The two that follow points keep the usual order (rebounds, assists...). `must` (a label like 'blk') is always one of
   them, for a list sorted on that stat. */
/* Numbers a card only shows when a list is sorted on them (turnovers, free throws attempted, plus-minus), as [value, label]. */
const signed = value => (value > 0 ? `+${value}` : String(value));
const EXTRA = {to: s => num(s.TO), fta: s => Number(String(s.FT ?? '0-0').split('-')[1]) || 0, '+/-': s => (s['+/-'] === undefined ? null : signed(num(s['+/-'])))};
const extra = (stats, label) => { const value = EXTRA[label]?.(stats); return value === undefined || value === null ? null : [value, label, 0]; };

export function trio(stats, must) {
  const [fgm, fga] = String(stats.FG ?? '0-0').split('-').map(Number), three = Number(String(stats['3PT'] ?? '0-0').split('-')[0]);
  const all = [
    [num(stats.PTS), 'pts', num(stats.PTS) / 17], [num(stats.REB), 'reb', num(stats.REB) / 7], [num(stats.AST), 'ast', num(stats.AST) / 6],
    [num(stats.STL), 'stl', num(stats.STL) / 3.5], [num(stats.BLK), 'blk', num(stats.BLK) / 3.5], [three, '3pm', three / 3],
  ];
  if (fga >= 6) all.push([`${Math.round(fgm / fga * 100)}%`, 'fg', Math.round(fgm / fga * 100) / 65]);
  const [points, ...rest] = all;
  const best = rest.filter(item => item[2] > 0).sort((a, b) => b[2] - a[2]).slice(0, 2);
  for (const fallback of rest.slice(0, 2)) if (best.length < 2 && !best.includes(fallback)) best.push(fallback);
  const wanted = rest.find(item => item[1] === must) ?? extra(stats, must);
  if (wanted && !best.includes(wanted)) best.splice(1, 1, wanted);
  return [points, ...best.sort((a, b) => all.indexOf(a) - all.indexOf(b))].map(([value, label]) => [value, label]);
}
