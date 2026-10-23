import { loadBoxscore } from './boxscore';
import { loadSchedule } from './schedule';
import { looseKey } from './headshots';
import { shotsOf } from './playerGame';
import { TEAMS, teamCodeOf } from './teams';
import { photoUrl } from './photos';

/* Rounds for Guess the Player: a real line from one finished game this season (stats and shot chart), the
   starter behind it, and two other starters who look a lot like him on paper. */

const SEASON = '2026-27', LAST = '2025-26';
const shuffle = list => list.map(item => [Math.random(), item]).sort((a, b) => a[0] - b[0]).map(entry => entry[1]);
const num = value => Number(String(value ?? '').replace('+', '')) || 0;
const made = value => String(value ?? '0-0').split('-').map(Number);
const codeOfEspn = abbr => Object.keys(TEAMS).find(code => TEAMS[code].espn === String(abbr).toLowerCase());
const group = position => (/C/.test(position) ? 'big' : /F/.test(position) ? 'wing' : 'guard');

let cached;
/* Starters (real minutes, started most of their games) and this season's finished games. */
export function loadPool() {
  cached ??= Promise.all([fetch(`/data/${SEASON}/regular-season.json`).then(response => response.json()), fetch(`/data/${LAST}/regular-season.json`).then(response => response.json()).catch(() => ({players: []})), loadSchedule()]).then(([season, last, schedule]) => {
    /* A few games in, this season's averages swing wildly, so a full last season decides who counts as a star. */
    const before = new Map(last.players.filter(player => player.gamesPlayed >= 30).map(player => [looseKey(player.playerName), player.stats]));
    const list = season.players.filter(player => player.gamesPlayed >= 1 && player.minutesPerGame >= 25 && player.gamesStarted >= player.gamesPlayed * .6)
      .map(player => ({name: player.playerName, position: player.position, code: teamCodeOf(player.team), id: (/^espn-(\d+)$/.exec(player.playerId ?? '') || [])[1], stats: before.get(looseKey(player.playerName)) ?? player.stats, key: looseKey(player.playerName)}))
      .filter(player => player.stats.points + .8 * player.stats.totalRebounds + .8 * player.stats.assists >= 19);
    return {list, byKey: new Map(list.map(player => [player.key, player])), games: schedule.filter(game => game.state === 'post' && !game.preseason)};
  });
  return cached;
}

const loads = url => new Promise(resolve => { const image = new Image(); image.onload = () => resolve(true); image.onerror = () => resolve(false); image.src = url; });

/* The two decoys play the same kind of position and score, rebound and pass about as much, for other teams. */
function decoysFor(answer, avoid, pool) {
  const gap = other => Math.abs(other.stats.points - answer.stats.points) + .8 * Math.abs(other.stats.totalRebounds - answer.stats.totalRebounds) + .8 * Math.abs(other.stats.assists - answer.stats.assists);
  const rank = same => pool.list.filter(other => other !== answer && !avoid.has(other.code) && (!same || group(other.position) === group(answer.position))).sort((a, b) => gap(a) - gap(b)).slice(0, 8);
  let near = rank(true);
  if (near.length < 2) near = rank(false);
  return shuffle(near).slice(0, 2);
}

/* One round, or null when no game works out. `seen` is a Set of "game:player" keys already played. */
export async function nextRound(pool, seen) {
  for (const game of shuffle(pool.games).slice(0, 10)) {
    const box = await loadBoxscore(game.id).catch(() => null);
    if (!box || box.state !== 'post') continue;
    const options = box.teams.flatMap(team => team.players.filter(player => player.starter && !player.out && player.id && !seen.has(`${game.id}:${player.id}`)).map(player => ({team, player})))
      .map(entry => ({...entry, season: pool.byKey.get(looseKey(entry.player.name)), shots: shotsOf(box.plays, entry.player.id)}))
      .filter(entry => entry.season && num(entry.player.stats.MIN) >= 22 && made(entry.player.stats.FG)[1] >= 7 && entry.shots.length >= 6 && num(entry.player.stats.PTS) >= 12);
    for (const entry of shuffle(options)) {
      const {team, player, season, shots} = entry;
      const mine = team.abbr === box.away.abbr ? box.away : box.home, other = mine === box.away ? box.home : box.away;
      const code = codeOfEspn(team.abbr), oppCode = codeOfEspn(other.abbr);
      const photo = photoUrl(player.id);
      if (!await loads(photo)) continue;
      const decoys = decoysFor(season, new Set([code, oppCode]), pool);
      if (decoys.length < 2) continue;
      return {
        key: `${game.id}:${player.id}`, photo, color: TEAMS[code]?.color ?? '#5b8def',
        answer: {name: player.name, position: season.position, code},
        choices: shuffle([{name: player.name, code, id: player.id, correct: true}, ...decoys.map(decoy => ({name: decoy.name, code: decoy.code, id: decoy.id, correct: false}))]),
        game: {opp: oppCode, home: mine === box.home, won: num(mine.score) > num(other.score), score: `${mine.score}–${other.score}`, date: box.date},
        line: player.stats, shots,
      };
    }
  }
  return null;
}
