/* Fun, formula-driven awards from per-game numbers. Each award picks a pool,
   scores everyone in it and returns the top three with a one-line reason. */

const s = (player, key) => player?.stats?.[key] ?? 0;
const one = value => Number(value).toFixed(1);
const byName = list => new Map(list.map(player => [player.playerName, player]));

const impact = p => s(p, 'points') + .7 * s(p, 'totalRebounds') + .9 * s(p, 'assists') + 1.4 * s(p, 'steals') + 1.2 * s(p, 'blocks') - .8 * s(p, 'turnovers');
const defense = p => 1.5 * s(p, 'steals') + 1.5 * s(p, 'blocks') + .5 * s(p, 'defensiveRebounds');
const fromBench = p => p.gamesPlayed > 0 && p.gamesStarted / p.gamesPlayed <= .34;

export function buildAwards(pool, previous = []) {
  const regulars = pool.filter(p => p.minutesPerGame >= 15);
  const before = byName(previous.filter(p => p.gamesPlayed >= 20 && p.minutesPerGame >= 15));
  const jump = p => before.has(p.playerName) ? s(p, 'points') - s(before.get(p.playerName), 'points') : -Infinity;
  const awards = [
    {key: 'mvp', title: 'MVP', blurb: 'Best all-around numbers', pool: regulars, score: impact, note: p => `${one(s(p, 'points'))} pts · ${one(s(p, 'totalRebounds'))} reb · ${one(s(p, 'assists'))} ast`},
    {key: 'dpoy', title: 'Defensive Player', blurb: 'Steals, blocks and glass', pool: regulars, score: defense, note: p => `${one(s(p, 'steals'))} stl · ${one(s(p, 'blocks'))} blk · ${one(s(p, 'defensiveRebounds'))} dreb`},
    {key: 'sixth', title: 'Sixth Man', blurb: 'Best scorer off the bench', pool: pool.filter(p => fromBench(p) && p.minutesPerGame >= 10), score: p => s(p, 'points'), note: p => `${one(s(p, 'points'))} pts off the bench`},
    {key: 'mip', title: 'Most Improved', blurb: 'Biggest scoring jump on last season', pool: regulars.filter(p => before.has(p.playerName)), score: jump, note: p => `${one(s(before.get(p.playerName), 'points'))} → ${one(s(p, 'points'))} pts`},
    {key: 'sharp', title: 'Sharpshooter', blurb: 'Most threes a game', pool: regulars, score: p => s(p, 'threePointersMade'), note: p => `${one(s(p, 'threePointersMade'))} threes · ${one(s(p, 'threePointPercentage'))}%`},
    {key: 'triple', title: 'Triple-Double Watch', blurb: 'Points + rebounds + assists', pool: regulars, score: p => s(p, 'points') + s(p, 'totalRebounds') + s(p, 'assists'), note: p => `${one(s(p, 'points') + s(p, 'totalRebounds') + s(p, 'assists'))} PRA`},
    {key: 'iron', title: 'Iron Man', blurb: 'Most minutes a night', pool: regulars, score: p => p.minutesPerGame, note: p => `${one(p.minutesPerGame)} minutes a game`},
    {key: 'scoring', title: 'Scoring Champion', blurb: 'Highest scoring average', pool: regulars, score: p => s(p, 'points'), note: p => `${one(s(p, 'points'))} points a game`},
  ];
  return awards.map(award => ({...award, winners: [...award.pool].sort((a, b) => award.score(b) - award.score(a)).slice(0, 3)})).filter(award => award.winners.length);
}
