import { TEAMS, nickname, teamCodeOf } from './teams';
import { playerUrl, gameUrl, teamUrl } from './routes';

/* Stats Quiz: ten multiple-choice questions about this season, built in the browser from the same files the site shows
   (season stats, team stats, the ready-made game lines from scripts/build-play-rounds.mjs and the ladders). Every question
   comes with the answer explained, so a round doubles as a catch-up on the season. */

const SEASON = '2026-27';
const read = name => fetch(`/data/${SEASON}/${name}.json`).then(response => (response.ok ? response.json() : null)).catch(() => null);
let cached;
export const loadQuizData = () => (cached ??= Promise.all([read('regular-season'), read('teams-regular-season'), read('play-rounds'), read('ladders')])
  .then(([players, teams, rounds, ladders]) => ({players: players?.players ?? [], teams: teams?.players ?? [], games: rounds?.games ?? [], ladders})));

const pick = list => list[Math.floor(Math.random() * list.length)];
const shuffle = list => list.map(item => [Math.random(), item]).sort((a, b) => a[0] - b[0]).map(entry => entry[1]);
const f1 = value => Number(value || 0).toFixed(1);
const espnId = player => (/^espn-(\d+)$/.exec(player.playerId ?? '') || [])[1];
const codeOfEspn = abbr => Object.keys(TEAMS).find(code => TEAMS[code].espn === String(abbr).toLowerCase());
const day = new Intl.DateTimeFormat('en-US', {month: 'short', day: 'numeric'});

/* Answer choices: a player (headshot), a team (logo) or a plain number. */
const asPlayer = player => ({key: player.playerName, label: player.playerName, sub: TEAMS[teamCodeOf(player.team)] ? nickname(teamCodeOf(player.team)) : player.team, face: espnId(player)});
const asTeam = code => ({key: code, label: TEAMS[code].name, logo: code});

const STATS = [
  ['points', 'points', 'PPG'], ['totalRebounds', 'rebounds', 'RPG'], ['assists', 'assists', 'APG'],
  ['steals', 'steals', 'SPG'], ['blocks', 'blocks', 'BPG'], ['threePointersMade', 'threes made', '3PM'],
];

/* Who counts: enough games to mean something this early, and real minutes. */
function pools(data) {
  const most = Math.max(1, ...data.players.map(player => player.gamesPlayed));
  const regulars = data.players.filter(player => player.gamesPlayed >= Math.max(2, Math.ceil(most * .6)) && player.minutesPerGame >= 18 && espnId(player));
  const stars = [...regulars].sort((a, b) => b.stats.points - a.stats.points).slice(0, 60);
  return {regulars, stars};
}

/* Decoys that look like the answer on paper, so a question can't be solved by "the only star in the list". */
const nearby = (pool, answer, key, count = 3) => shuffle(pool.filter(player => player.playerName !== answer.playerName)
  .sort((a, b) => Math.abs(a.stats[key] - answer.stats[key]) - Math.abs(b.stats[key] - answer.stats[key])).slice(0, 10)).slice(0, count);

const ask = ({kind, prompt, detail, answer, others, explain, path}) => {
  const options = shuffle([answer, ...others]);
  return {kind, prompt, detail, options, answer: options.indexOf(answer), explain, path};
};

const BUILDERS = {
  leader({regulars}) {
    const [key, word, unit] = pick(STATS), ranked = [...regulars].sort((a, b) => b.stats[key] - a.stats[key]), top = ranked[0];
    if (!top || ranked[1]?.stats[key] === top.stats[key]) return null;
    const answer = asPlayer(top);
    return ask({kind: 'League leaders', prompt: `Who leads the league in ${word} per game?`, answer, others: shuffle(ranked.slice(1, 10)).slice(0, 3).map(asPlayer),
      explain: `${top.playerName}: ${f1(top.stats[key])} ${unit}. Next is ${ranked[1].playerName} at ${f1(ranked[1].stats[key])}.`, path: playerUrl(top.playerName)});
  },
  shooting({regulars}) {
    const [key, word, gate, min] = pick([['threePointPercentage', '3-point percentage', p => p.stats.threePointersAttempted >= 5, '5 threes'], ['fieldGoalPercentage', 'field-goal percentage', p => p.stats.fieldGoalsAttempted >= 12, '12 shots'], ['freeThrowPercentage', 'free-throw percentage', p => p.stats.freeThrowsAttempted >= 5, '5 free throws']]);
    const ranked = regulars.filter(gate).sort((a, b) => b.stats[key] - a.stats[key]), top = ranked[0];
    if (!top || ranked.length < 6) return null;
    return ask({kind: 'Shooting', prompt: `Who has the best ${word}?`, detail: `At least ${min} a game`, answer: asPlayer(top), others: shuffle(ranked.slice(1, 8)).slice(0, 3).map(asPlayer),
      explain: `${top.playerName} is at ${f1(top.stats[key])}%. ${ranked[1].playerName} is next at ${f1(ranked[1].stats[key])}%.`, path: playerUrl(top.playerName)});
  },
  night({games, regulars}) {
    const game = pick(games), line = game && pick(game.players);
    if (!line) return null;
    const player = regulars.find(entry => espnId(entry) === line.id) ?? {playerName: line.name, team: codeOfEspn(line.team), playerId: `espn-${line.id}`, stats: {points: Number(line.line.PTS)}};
    const mine = line.team === game.away.abbr ? game.away : game.home, other = mine === game.away ? game.home : game.away, opp = codeOfEspn(other.abbr), home = mine === game.home;
    const won = Number(mine.score) > Number(other.score);
    const others = nearby(regulars.filter(entry => entry.minutesPerGame >= 25), {...player, stats: {...player.stats, points: Number(line.line.PTS)}}, 'points').map(asPlayer);
    if (!opp || others.length < 3) return null;
    return ask({kind: 'Who did that?', prompt: `Who had ${line.line.PTS} points, ${line.line.REB} rebounds and ${line.line.AST} assists ${home ? 'against' : 'at'} the ${nickname(opp)}?`,
      detail: `${day.format(new Date(game.date))} · ${line.line.FG} shooting · ${won ? 'a win' : 'a loss'}, ${mine.score}–${other.score}`, answer: asPlayer(player), others,
      explain: `${line.name} did it on ${day.format(new Date(game.date))}.`, path: gameUrl(home ? opp : codeOfEspn(line.team), home ? codeOfEspn(line.team) : opp, game.id)});
  },
  statline({stars}) {
    const player = pick(stars.slice(0, 40));
    if (!player) return null;
    return ask({kind: 'Name the line', prompt: 'Which player is averaging this?', detail: `${f1(player.stats.points)} points · ${f1(player.stats.totalRebounds)} rebounds · ${f1(player.stats.assists)} assists`,
      answer: asPlayer(player), others: nearby(stars, player, 'points').map(asPlayer), explain: `That's ${player.playerName} over ${player.gamesPlayed} games.`, path: playerUrl(player.playerName)});
  },
  number({stars}) {
    const player = pick(stars.slice(0, 30)), [key, word, unit] = pick(STATS.slice(0, 3));
    if (!player) return null;
    const value = player.stats[key], step = key === 'points' ? 3.4 : 1.6;
    const values = new Set([f1(value)]);
    for (const offset of shuffle([-2, -1, 1, 2, 3]).slice(0, 5)) { if (values.size === 4) break; const decoy = value + offset * step * (.8 + Math.random() * .4); if (decoy > 0) values.add(f1(decoy)); }
    if (values.size < 4) return null;
    const options = [...values].sort((a, b) => a - b).map(text => ({key: text, label: text, number: true}));
    const answer = options.find(option => option.key === f1(value));
    return {kind: 'Numbers', prompt: `How many ${word} per game is ${player.playerName} averaging?`, detail: `${player.gamesPlayed} games this season`, options, answer: options.indexOf(answer),
      explain: `${player.playerName}: ${f1(value)} ${unit}.`, path: playerUrl(player.playerName), face: espnId(player)};
  },
  versus({stars}) {
    const [key, word, unit] = pick(STATS.slice(0, 5)), a = pick(stars.slice(0, 40));
    if (!a) return null;
    const b = shuffle(stars.filter(other => other !== a && Math.abs(other.stats[key] - a.stats[key]) > .2 && Math.abs(other.stats[key] - a.stats[key]) / Math.max(a.stats[key], .1) < .25))[0];
    if (!b) return null;
    const [high, low] = a.stats[key] > b.stats[key] ? [a, b] : [b, a];
    return ask({kind: 'Head to head', prompt: `Who averages more ${word}?`, answer: asPlayer(high), others: [asPlayer(low)],
      explain: `${high.playerName} ${f1(high.stats[key])} ${unit}, ${low.playerName} ${f1(low.stats[key])}.`, path: `/compare`});
  },
  team({stars}) {
    const player = pick(stars.slice(0, 50)), code = player && teamCodeOf(player.team);
    if (!TEAMS[code]) return null;
    return ask({kind: 'Rosters', prompt: `Which team does ${player.playerName} play for?`, answer: asTeam(code), others: shuffle(Object.keys(TEAMS).filter(other => other !== code)).slice(0, 3).map(asTeam),
      explain: `${player.playerName} plays for the ${TEAMS[code].name}.`, path: teamUrl(code)});
  },
  teams({teams}) {
    const [key, word, unit, low] = pick([['points', 'scores the most points', 'PPG'], ['threePointersMade', 'makes the most threes', '3PM'], ['totalRebounds', 'grabs the most rebounds', 'RPG'], ['assists', 'has the most assists', 'APG'], ['turnovers', 'turns it over the least', 'TO', true]]);
    const ranked = teams.filter(team => TEAMS[teamCodeOf(team.team)]).sort((a, b) => (low ? a.stats[key] - b.stats[key] : b.stats[key] - a.stats[key])), top = ranked[0];
    if (!top || ranked.length < 10) return null;
    return ask({kind: 'Teams', prompt: `Which team ${word} per game?`, answer: asTeam(teamCodeOf(top.team)), others: shuffle(ranked.slice(1, 9)).slice(0, 3).map(team => asTeam(teamCodeOf(team.team))),
      explain: `The ${top.playerName}: ${f1(top.stats[key])} ${unit}. Next: the ${ranked[1].playerName} at ${f1(ranked[1].stats[key])}.`, path: teamUrl(teamCodeOf(top.team))});
  },
  ladder({ladders, regulars}) {
    const [key, slug, label] = pick([['mvp', 'mvp', 'MVP'], ['rookie', 'roty', 'Rookie of the Year']]), rows = ladders?.[key] ?? [];
    if (rows.length < 4) return null;
    const toPlayer = row => regulars.find(entry => espnId(entry) === String(row.espnId)) ?? {playerName: row.name, team: row.team, playerId: `espn-${row.espnId}`};
    return ask({kind: 'Ladders', prompt: `Who is No. 1 on the ${label} ladder right now?`, answer: asPlayer(toPlayer(rows[0])), others: shuffle(rows.slice(1, 8)).slice(0, 3).map(row => asPlayer(toPlayer(row))),
      explain: `${rows[0].name}: ${f1(rows[0].pts)} points, ${f1(rows[0].reb)} rebounds and ${f1(rows[0].ast)} assists a game.`, path: `/ladders/${slug}`});
  },
};

/* A round: ten questions over as many kinds as possible, the same answer never twice. */
export function makeRound(data, count = 10) {
  const context = {...data, ...pools(data)}, used = new Set(), round = [];
  const order = [...shuffle(Object.keys(BUILDERS)), ...shuffle(['night', 'night', 'leader', 'statline', 'number', 'versus', 'shooting', 'teams'])];
  for (let tries = 0; round.length < count && tries < 80; tries += 1) {
    const kind = order[tries % order.length], question = BUILDERS[kind](context);
    const key = question && `${question.kind}:${question.options[question.answer].key}`;
    if (!question || used.has(key)) continue;
    used.add(key); round.push(question);
  }
  return round;
}
