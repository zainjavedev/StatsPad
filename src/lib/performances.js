import { loadBoxscore } from './boxscore';
import { TEAMS } from './teams';

/* Individual game lines for the share cards: rank every player in a box score by Hollinger's game score and
   describe a line as a card spec. */

const num = value => Number(String(value ?? '').replace('+', '')) || 0;
const made = value => String(value ?? '0-0').split('-').map(Number);
const codeOf = abbr => Object.keys(TEAMS).find(code => TEAMS[code].espn === String(abbr).toLowerCase());
const dayFormat = new Intl.DateTimeFormat(undefined, {month: 'short', day: 'numeric'});

export function gameScore(stats) {
  const [fg, fga] = made(stats.FG), [ft, fta] = made(stats.FT);
  const oreb = stats.OREB === undefined ? 0 : num(stats.OREB), dreb = stats.DREB === undefined ? num(stats.REB) : num(stats.DREB);
  return num(stats.PTS) + .4 * fg - .7 * fga - .4 * (fta - ft) + .7 * oreb + .3 * dreb + num(stats.STL) + .7 * num(stats.AST) + .7 * num(stats.BLK) - .4 * num(stats.PF) - num(stats.TO);
}

/* Every player who played in one finished game, with the context a card needs. */
export function performancesOf(box) {
  if (!box?.away || box.state !== 'post') return [];
  return box.teams.flatMap(team => {
    const mine = team.abbr === box.away.abbr ? box.away : box.home, other = mine === box.away ? box.home : box.away;
    const won = num(mine.score) > num(other.score);
    return team.players.filter(player => !player.out).map(player => ({
      player, team: team.abbr, opp: other.abbr, home: mine === box.home, won, score: `${mine.score}–${other.score}`,
      date: box.date ? new Date(box.date) : null, rating: gameScore(player.stats),
    }));
  });
}

/* The best lines across several games, newest slate first. */
export async function bestOfNight(games, limit = 5) {
  const boxes = await Promise.all(games.map(game => loadBoxscore(game.id).catch(() => null)));
  return boxes.flatMap(performancesOf).sort((a, b) => b.rating - a.rating).slice(0, limit);
}

export const headline = ({player}) => {
  const s = player.stats, parts = [`${s.PTS} PTS`];
  if (num(s.REB) >= 5) parts.push(`${s.REB} REB`);
  if (num(s.AST) >= 5) parts.push(`${s.AST} AST`);
  if (num(s.STL) >= 3) parts.push(`${s.STL} STL`);
  if (num(s.BLK) >= 3) parts.push(`${s.BLK} BLK`);
  return parts.join(' · ');
};

const versus = line => `${line.home ? 'vs' : '@'} ${line.opp} · ${line.won ? 'W' : 'L'} ${line.score}${line.date ? ` · ${dayFormat.format(line.date)}` : ''}`;
const color = line => TEAMS[codeOf(line.team)]?.color;
const photoOf = player => player.id ? {name: player.name, espnId: player.id} : {name: player.name};

/* One player's night as a tiles card. */
export function lineCard(line) {
  const s = line.player.stats;
  return {
    kind: 'tiles', eyebrow: 'Game line', title: line.player.name, person: photoOf(line.player), color: color(line),
    sub: `${line.team} ${versus(line)}`,
    tiles: [
      ['PTS', s.PTS], ['REB', s.REB], ['AST', s.AST], ['STL', s.STL], ['BLK', s.BLK], ['MIN', s.MIN],
      ['FG', s.FG], ['3PT', s['3PT']], ['FT', s.FT],
    ].map(([label, value]) => ({label, value: value ?? '–', note: ''})),
    foot: 'Box score', path: null,
  };
}

/* The night's best lines as a ranked list card. */
export function nightCard(lines, day) {
  return {
    kind: 'list', eyebrow: 'Players of the night', title: 'Best performances', color: color(lines[0] ?? {}),
    sub: day ? dayFormat.format(day) : 'Last night',
    rows: lines.map((line, index) => ({lead: index + 1, name: line.player.name, sub: `${line.team} ${line.home ? 'vs' : '@'} ${line.opp} · ${headline(line).split(' · ').slice(1).join(' · ') || line.score}`, value: `${line.player.stats.PTS} PTS`, person: photoOf(line.player)})),
    foot: 'Ranked by game score',
  };
}
