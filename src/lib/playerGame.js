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

/* 0-10 from Hollinger's game score off the box score line. */
export const rating = line => Math.max(0, Math.min(10, +(2.5 + gameScore(line) / 6.5).toFixed(1)));

export function tagsOf(row, minutes) {
  const tags = [], cats = [row.PTS, row.REB, row.AST, row.STL, row.BLK].filter(value => value >= 10).length;
  if (cats >= 3) tags.push('tripledouble'); else if (cats >= 2) tags.push('doubledouble');
  if (row.PTS >= 40) tags.push('40bomb'); else if (row.PTS >= 30) tags.push('30bomb'); else if (row.PTS >= 20) tags.push('20pointer');
  if (row.FGA >= 8 && tsPct(row) >= 65) tags.push('efficient');
  if (row.AST >= 8) tags.push('generous');
  if (row.REB >= 12) tags.push('glasseater');
  if (row.STL + row.BLK >= 5) tags.push('lockdown');
  if (row.TPM >= 5) tags.push('rainmaker');
  if (row.FTA >= 8 && row.FTM === row.FTA) tags.push('perfectfts');
  if (row.FGA >= 12 && fgPct(row) < 35) tags.push('brickfest');
  if (row.TO >= 5) tags.push('sloppy');
  if (row.PF >= 5) tags.push('foultrouble');
  if (num(minutes) >= 38) tags.push('workhorse');
  return tags;
}
