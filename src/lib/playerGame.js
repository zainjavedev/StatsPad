import { gameScore } from './performances';

/* One player's night rebuilt from ESPN's play-by-play: every quarter's stats, who he assisted, and a rating. */

const BLANK = () => ({PTS: 0, FGM: 0, FGA: 0, TPM: 0, TPA: 0, FTM: 0, FTA: 0, REB: 0, OREB: 0, DREB: 0, AST: 0, STL: 0, BLK: 0, TO: 0, PF: 0});
const num = value => Number(String(value ?? '').replace('+', '')) || 0;

/* Stats per quarter (index 1..) from the plays the athlete took part in. */
export function quarterStats(plays, id) {
  const quarters = new Map(), assisted = new Map();
  const at = quarter => { if (!quarters.has(quarter)) quarters.set(quarter, BLANK()); return quarters.get(quarter); };
  for (const play of plays) {
    const [first, second] = play.who, type = play.type, text = play.text;
    const isFt = /Free Throw/i.test(type), made = /\bmakes\b/i.test(text), three = play.pa === 3;
    if (first === id && play.q) {
      const row = at(play.q);
      if (/Rebound/i.test(type)) { row.REB += 1; if (/Offensive/i.test(type)) row.OREB += 1; else row.DREB += 1; }
      else if (/turnover/i.test(`${type} ${text}`)) row.TO += 1;
      else if (/Foul/i.test(type) && !/Technical/i.test(type)) row.PF += 1;
      else if (isFt) { row.FTA += 1; if (made) { row.FTM += 1; row.PTS += 1; } }
      else if (/\b(makes|misses|blocks)\b/i.test(text)) {
        row.FGA += 1; if (three) row.TPA += 1;
        if (made) { row.FGM += 1; row.PTS += play.pts || (three ? 3 : 2); if (three) row.TPM += 1; }
      }
    }
    if (second === id && play.q) {
      if (/assists\)/i.test(text)) at(play.q).AST += 1;
      else if (/steals\)/i.test(text)) at(play.q).STL += 1;
      else if (/\bblocks\b/i.test(text)) at(play.q).BLK += 1;
    }
    if (second === id && /assists\)/i.test(text) && play.scoring) {
      const entry = assisted.get(first) ?? {id: first, ast: 0, pts: 0};
      entry.ast += 1; entry.pts += play.pts; assisted.set(first, entry);
    }
  }
  return {quarters, assisted: [...assisted.values()].sort((a, b) => b.pts - a.pts || b.ast - a.ast)};
}

export const total = (quarters, only) => {
  const sum = BLANK();
  for (const [quarter, row] of quarters) if (!only || quarter === only) for (const key of Object.keys(sum)) sum[key] += row[key];
  return sum;
};

/* Fantasy-style points: the same recipe every quarter and for the whole game. */
export const fps = row => +(row.PTS + 1.2 * row.REB + 1.5 * row.AST + 3 * row.STL + 3 * row.BLK - row.TO).toFixed(1);
export const tsPct = row => (row.FGA + .44 * row.FTA ? Math.round(1000 * row.PTS / (2 * (row.FGA + .44 * row.FTA))) / 10 : 0);
export const fgPct = row => (row.FGA ? Math.round(1000 * row.FGM / row.FGA) / 10 : 0);

/* The colour band for a grade, shared by the game page and the share card so the same night reads the same everywhere. */
export const gradeTone = value => (value >= 8 ? 'great' : value >= 6 ? 'good' : value >= 4.5 ? 'ok' : 'poor');

/* 0-10 from Hollinger's game score off the box score line. */
export const rating = line => Math.max(0, Math.min(10, +(2.5 + gameScore(line) / 6.5).toFixed(1)));

/* Did he score his team's last eight-plus points of a win that was tied, or one possession away, when the run began? */
function closedItOut(game) {
  if (!game?.won || !game.plays?.length || !game.teamId) return false;
  const scoring = game.plays.filter(play => play.scoring && play.pts > 0 && play.t !== undefined);
  const mine = scoring.filter(play => String(play.team) === String(game.teamId));
  let run = 0, index = mine.length - 1;
  while (index >= 0 && mine[index].who[0] === game.id) { run += mine[index].pts; index -= 1; }
  if (run < 8) return false;
  const first = mine[index + 1];
  const before = scoring.filter(play => play.t < first.t).pop();
  if (!before || before.as === undefined) return true;
  const lead = game.away ? before.as - before.hs : before.hs - before.as;
  return Math.abs(lead) <= 3;
}

/* The tags on a performance, mostly for fun. Each rule is a name, how rare it is (rarer wins a slot) and a test.
   The card shows the three rarest that apply. `game` is optional context: {won, margin, quarters, plays, id, teamId, away}. */
const TAGS = [
  ['tripleDouble', 100, row => [row.PTS, row.REB, row.AST, row.STL, row.BLK].filter(value => value >= 10).length >= 3],
  ['him', 96, (row, mins, game) => closedItOut(game)],
  ['forNoReason', 92, (row, mins, game) => game?.won === false && row.PTS >= 30],
  ['fiftyBurger', 99, row => row.PTS >= 50],
  ['fortyBurger', 90, row => row.PTS >= 40 && row.PTS < 50],
  ['lateBoomer', 86, (row, mins, game) => {
    if (!game?.quarters) return false;
    let first = 0, second = 0;
    for (const [quarter, value] of game.quarters) { if (quarter <= 2) first += value.PTS; else second += value.PTS; }
    return first === 0 && second >= 15;
  }],
  ['automatic', 84, row => row.FGA >= 6 && row.FGM === row.FGA],
  ['stockBroker', 80, row => row.STL + row.BLK >= 6],
  ['splashZone', 76, row => row.TPM >= 6],
  ['brickedUp', 74, row => row.FGA >= 15 && fgPct(row) <= 25],
  ['butterFingers', 72, row => row.TO >= 7],
  ['perfectFts', 66, row => row.FTA >= 8 && row.FTM === row.FTA],
  ['thirtyBomb', 62, row => row.PTS >= 30 && row.PTS < 40],
  ['bucketGetter', 60, row => row.PTS >= 25 && row.FGA <= 17],
  ['dimeDealer', 58, row => row.AST >= 10],
  ['glassCleaner', 56, row => row.REB >= 14],
  ['splashBro', 52, row => row.TPM >= 4 && row.TPM < 6],
  ['thatGuy', 88, row => row.PTS >= 25 && row.TPA >= 5 && row.TPM / row.TPA >= .8 && row.FTA >= 4 && row.FTM === row.FTA],
  ['putHimInTheStartingFive', 82, (row, mins, game) => game?.starter === false && mins <= 22 && row.PTS >= 18],
  ['statsPads', 78, (row, mins, game) => game?.won === false && game.margin >= 25 && row.PTS >= 25],
  ['glueGuy', 54, row => row.REB >= 12 && row.AST >= 5 && row.PTS <= 8],
  ['lowKey', 50, (row, mins, game) => game?.won && game.margin >= 20 && row.PTS >= 8 && row.PTS <= 15 && row.FGA >= 3 && row.FGM / row.FGA >= .5 && row.AST >= 3 && row.TO === 0],
  ['foulTrouble', 48, row => row.PF >= 5],
  ['doubleDouble', 44, row => [row.PTS, row.REB, row.AST, row.STL, row.BLK].filter(value => value >= 10).length === 2],
  ['ironMan', 42, (row, mins) => mins >= 42],
  ['ghostMode', 40, (row, mins) => row.PTS <= 2 && mins >= 20],
];

export function tagsOf(row, minutes, game) {
  const mins = num(minutes);
  return TAGS.filter(([, , test]) => test(row, mins, game)).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([name]) => name);
}

/* Every field-goal attempt by the player, with where it was taken (feet from the basket: x across, y up the floor). */
export function shotsOf(plays, id) {
  return plays.filter(play => play.who[0] === id && play.q && !/Free Throw/i.test(play.type) && /\b(makes|misses|blocks)\b/i.test(play.text) && Number.isFinite(play.x) && play.x >= 0 && play.y > -100)
    .map(play => ({x: play.x, y: play.y, made: /\bmakes\b/i.test(play.text), three: play.pa === 3, q: play.q, text: play.text.replace(/\s*\(.*?\)\s*$/, '')}));
}

/* Baskets by teammates that this player set up, with where they were taken. */
export function assistShotsOf(plays, id) {
  return plays.filter(play => play.who[1] === id && play.scoring && play.q && !/Free Throw/i.test(play.type) && Number.isFinite(play.x) && play.x >= 0 && play.y > -100)
    .map(play => ({x: play.x, y: play.y, made: true, q: play.q, three: play.pa === 3}));
}

/* The player's team's lead over the game, with his own scoring plays marked. */
export function flowOf(plays, id, away) {
  const points = [{t: 0, m: 0}], marks = [];
  for (const play of plays) {
    if (play.as === undefined || play.t === undefined) continue;
    const margin = away ? play.as - play.hs : play.hs - play.as;
    points.push({t: play.t, m: margin});
    if (play.who[0] === id && play.scoring) marks.push({t: play.t, m: margin, pts: play.pts});
  }
  return {points, marks, end: Math.max(2880, ...points.map(point => point.t))};
}

/* A few honest sentences about the night. */
export function storyOf({name, row, quarters, won, margin, team, opp, minutes}) {
  const first = name.split(' ').slice(-1)[0].replace(/(Jr\.|Sr\.|II|III)$/, '').trim() || name;
  let best = [0, 0];
  for (const [quarter, value] of quarters) if (value.PTS > best[1]) best = [quarter, value.PTS];
  const lead = `${row.PTS} points on ${row.FGM}-of-${row.FGA} shooting.`;
  const extras = [];
  if (row.TPM >= 3) extras.push(`${row.TPM} threes`);
  if (row.AST >= 7) extras.push(`${row.AST} assists`);
  if (row.REB >= 10) extras.push(`${row.REB} boards`);
  if (row.STL + row.BLK >= 4) extras.push(`${row.STL + row.BLK} steals and blocks`);
  const quarterText = best[1] >= 12 ? `${best[1]} of them came in the ${best[0] <= 4 ? ['first', 'second', 'third', 'fourth'][best[0] - 1] : 'overtime'}${best[0] <= 4 ? ' quarter' : ''}.` : '';
  const result = won ? `${team} won by ${margin}.` : row.PTS >= 28 ? `It still wasn't enough: ${team} lost by ${margin}.` : `${team} lost to ${opp} by ${margin}.`;
  const sentence = extras.length ? `${first} also had ${extras.slice(0, 2).join(' and ')}.` : '';
  return {lead, rest: [quarterText, sentence, result].filter(Boolean).join(' '), minutes};
}
