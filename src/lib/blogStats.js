/* Pure helpers the post bodies share. No file access, so client charts can import them too. */

export const plays = stats => stats.fieldGoalsAttempted + .44 * stats.freeThrowsAttempted;
export const trueShooting = stats => stats.points / (2 * plays(stats)) * 100;
export const fixed = (value, places = 1) => Number(value).toFixed(places);
export const mean = values => values.reduce((sum, value) => sum + value, 0) / values.length;
export const list = items => items.length < 2 ? items.join('') : `${items.slice(0, -1).join(', ')} and ${items.at(-1)}`;

/* Last name only, for labels and sentences that name a player twice. */
export const surname = name => name.replace(/ (Jr\.|Sr\.|II|III|IV)$/, '').split(' ').slice(-1)[0];

/* Pearson correlation and a least-squares line, so the prose can say how strong a pattern is. */
export function fit(points) {
  const mx = mean(points.map(p => p.x)), my = mean(points.map(p => p.y));
  const sxy = points.reduce((sum, p) => sum + (p.x - mx) * (p.y - my), 0);
  const sxx = points.reduce((sum, p) => sum + (p.x - mx) ** 2, 0);
  const syy = points.reduce((sum, p) => sum + (p.y - my) ** 2, 0);
  const slope = sxy / sxx;
  return {r: sxy / Math.sqrt(sxx * syy), slope, intercept: my - slope * mx};
}

/* Where a scorer's points come from: twos, threes and free throws, as a share of all points. */
export function scoringMix(stats) {
  const three = stats.threePointersMade * 3, ft = stats.freeThrowsMade, two = stats.points - three - ft;
  return {two: two / stats.points * 100, three: three / stats.points * 100, ft: ft / stats.points * 100};
}

/* Names are matched across seasons without accents, suffixes or punctuation, so "Nikola Jokić" and "Nikola Jokic" meet. */
export const nameKey = name => name.normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\b(jr|sr|ii|iii|iv)\b\.?/g, '').replace(/[^a-z]/g, '');

/* Splits a points-per-game rise into the part that came from more minutes (at last year's scoring rate)
   and the part that came from scoring faster per minute. The two always add up to the full rise. */
export function leapOf(before, after) {
  const rate = before.stats.points / before.minutesPerGame;
  const total = after.stats.points - before.stats.points;
  const fromMinutes = (after.minutesPerGame - before.minutesPerGame) * rate;
  return {total, fromMinutes, fromRate: total - fromMinutes, per36Before: rate * 36, per36After: after.stats.points / after.minutesPerGame * 36};
}
