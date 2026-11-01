import { loadBoxscore } from './boxscore';
import { scheduleFile } from './schedule';
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
  cached ??= Promise.all([fetch(`/data/${SEASON}/regular-season.json`).then(response => response.json()), fetch(`/data/${LAST}/regular-season.json`).then(response => response.json()).catch(() => ({players: []})), scheduleFile(),
    fetch(`/data/${SEASON}/play-rounds.json`).then(response => (response.ok ? response.json() : null)).catch(() => null)]).then(([season, last, schedule, ready]) => {
    /* A few games in, this season's averages swing wildly, so a full last season decides who counts as a star. */
    const before = new Map(last.players.filter(player => player.gamesPlayed >= 30).map(player => [looseKey(player.playerName), player.stats]));
    const list = season.players.filter(player => player.gamesPlayed >= 1 && player.minutesPerGame >= 25 && player.gamesStarted >= player.gamesPlayed * .6)
      .map(player => ({name: player.playerName, position: player.position, code: teamCodeOf(player.team), id: (/^espn-(\d+)$/.exec(player.playerId ?? '') || [])[1], stats: before.get(looseKey(player.playerName)) ?? player.stats, key: looseKey(player.playerName)}))
      .filter(player => player.stats.points + .8 * player.stats.totalRebounds + .8 * player.stats.assists >= 19);
    return {list, byKey: new Map(list.map(player => [player.key, player])), games: schedule.filter(game => game.state === 'post' && !game.preseason), ready: ready?.games?.length ? ready.games : null};
  });
  return cached;
}

/* Starts the photo download without waiting for it: the round shows at once and the picture fills in. */
const warm = url => { const image = new Image(); image.src = url; };

/* The two decoys play the same kind of position and score, rebound and pass about as much, for other teams. */
function decoysFor(answer, avoid, pool) {
  const gap = other => Math.abs(other.stats.points - answer.stats.points) + .8 * Math.abs(other.stats.totalRebounds - answer.stats.totalRebounds) + .8 * Math.abs(other.stats.assists - answer.stats.assists);
  const rank = same => pool.list.filter(other => other !== answer && !avoid.has(other.code) && (!same || group(other.position) === group(answer.position))).sort((a, b) => gap(a) - gap(b)).slice(0, 8);
  let near = rank(true);
  if (near.length < 2) near = rank(false);
  return shuffle(near).slice(0, 2);
}

/* A round from a candidate line: the starter, his team and the opponent from that game, and two decoys. */
function roundFrom(pool, {gameId, date, mine, other, home, player, season, shots}) {
  const code = codeOfEspn(mine.abbr), oppCode = codeOfEspn(other.abbr);
  const decoys = decoysFor(season, new Set([code, oppCode]), pool);
  if (decoys.length < 2) return null;
  const photo = photoUrl(player.id);
  warm(photo);
  return {
    key: `${gameId}:${player.id}`, photo, color: TEAMS[code]?.color ?? '#5b8def',
    answer: {name: player.name, position: season.position, code},
    choices: shuffle([{name: player.name, code, id: player.id, correct: true}, ...decoys.map(decoy => ({name: decoy.name, code: decoy.code, id: decoy.id, correct: false}))]),
    game: {opp: oppCode, home, won: num(mine.score) > num(other.score), score: `${mine.score}–${other.score}`, date},
    line: player.stats, shots,
  };
}

/* One round, or null when no game works out. `seen` is a Set of "game:player" keys already played.
   The ready-made lines (scripts/build-play-rounds.mjs) need no fetch at all; ESPN's summaries are the fallback. */
export async function nextRound(pool, seen) {
  if (pool.ready) {
    const lines = pool.ready.flatMap(game => game.players.map(player => ({game, player})))
      .filter(({game, player}) => !seen.has(`${game.id}:${player.id}`) && pool.byKey.has(looseKey(player.name)));
    for (const {game, player} of shuffle(lines)) {
      const mine = player.team === game.away.abbr ? game.away : game.home, other = mine === game.away ? game.home : game.away;
      const round = roundFrom(pool, {gameId: game.id, date: game.date, mine, other, home: mine === game.home, player: {id: player.id, name: player.name, stats: player.line},
        season: pool.byKey.get(looseKey(player.name)), shots: player.shots.map(([x, y, made]) => ({x, y, made: made === 1}))});
      if (round) return round;
    }
  }
  const games = shuffle(pool.games).slice(0, 10);
  for (const [index, game] of games.entries()) {
    /* The next game's box score downloads while this one is checked, so a game with no usable starter costs no extra wait. */
    if (games[index + 1]) loadBoxscore(games[index + 1].id).catch(() => null);
    const box = await loadBoxscore(game.id).catch(() => null);
    if (!box || box.state !== 'post') continue;
    const options = box.teams.flatMap(team => team.players.filter(player => player.starter && !player.out && player.id && player.hasPhoto && !seen.has(`${game.id}:${player.id}`)).map(player => ({team, player})))
      .map(entry => ({...entry, season: pool.byKey.get(looseKey(entry.player.name)), shots: shotsOf(box.plays, entry.player.id)}))
      .filter(entry => entry.season && num(entry.player.stats.MIN) >= 22 && made(entry.player.stats.FG)[1] >= 7 && entry.shots.length >= 6 && num(entry.player.stats.PTS) >= 12);
    for (const {team, player, season, shots} of shuffle(options)) {
      const mine = team.abbr === box.away.abbr ? box.away : box.home, other = mine === box.away ? box.home : box.away;
      const round = roundFrom(pool, {gameId: game.id, date: box.date, mine, other, home: mine === box.home, player, season, shots});
      if (round) return round;
    }
  }
  return null;
}
