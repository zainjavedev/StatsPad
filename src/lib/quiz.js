import { TEAMS, nickname, teamCodeOf } from './teams';
import { playerUrl, teamUrl } from './routes';

/* Stats Quiz: ten multiple-choice questions about this season, built in the browser from the same files the site shows
   (season stats, team stats, the schedule's results and the ladders). Every question
   comes with the answer explained, so a round doubles as a catch-up on the season. */

const SEASON = '2026-27';
const read = name => fetch(`/data/${SEASON}/${name}.json`).then(response => (response.ok ? response.json() : null)).catch(() => null);
let cached;
export const loadQuizData = () => (cached ??= Promise.all([read('regular-season'), read('teams-regular-season'), read('ladders'), read('schedule')])
  .then(([players, teams, ladders, schedule]) => ({players: players?.players ?? [], teams: teams?.players ?? [], ladders, records: recordsOf(schedule ?? [])})));

/* W-L by team code from the schedule file's finished regular-season games. Rows are [id, start, away, home, venue, tv, state, away score, home score, preseason]. */
function recordsOf(rows) {
  const table = {};
  for (const [, , away, home, , , state, awayScore, homeScore, preseason] of rows) {
    if (state !== 'post' || preseason === 1 || awayScore === homeScore) continue;
    for (const [code, won] of [[away, awayScore > homeScore], [home, homeScore > awayScore]]) { const row = table[code] ??= {w: 0, l: 0}; if (won) row.w += 1; else row.l += 1; }
  }
  return table;
}

const pick = list => list[Math.floor(Math.random() * list.length)];
const shuffle = list => list.map(item => [Math.random(), item]).sort((a, b) => a[0] - b[0]).map(entry => entry[1]);
const f1 = value => Number(value || 0).toFixed(1);
const espnId = player => (/^espn-(\d+)$/.exec(player.playerId ?? '') || [])[1];

/* Answer choices: a player (headshot), a team (logo) or a plain number. */
const asPlayer = player => { const code = teamCodeOf(player.team); return {key: player.playerName, label: player.playerName, sub: TEAMS[code] ? nickname(code) : player.team, face: espnId(player), color: TEAMS[code]?.color}; };
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
  versus({stars}) {
    const [key, word, unit] = pick(STATS.slice(0, 5)), a = pick(stars.slice(0, 40));
    if (!a) return null;
    const b = shuffle(stars.filter(other => other !== a && Math.abs(other.stats[key] - a.stats[key]) > .2 && Math.abs(other.stats[key] - a.stats[key]) / Math.max(a.stats[key], .1) < .25))[0];
    if (!b) return null;
    const [high, low] = a.stats[key] > b.stats[key] ? [a, b] : [b, a];
    return ask({kind: 'Head to head', prompt: `Who averages more ${word}?`, answer: asPlayer(high), others: [asPlayer(low)],
      explain: `${high.playerName} ${f1(high.stats[key])} ${unit}, ${low.playerName} ${f1(low.stats[key])}.`, path: `/compare`});
  },
  teams({teams}) {
    const [key, word, unit, low] = pick([['points', 'scores the most points', 'PPG'], ['threePointersMade', 'makes the most threes', '3PM'], ['totalRebounds', 'grabs the most rebounds', 'RPG'], ['assists', 'has the most assists', 'APG'], ['turnovers', 'turns it over the least', 'TO', true]]);
    const ranked = teams.filter(team => TEAMS[teamCodeOf(team.team)]).sort((a, b) => (low ? a.stats[key] - b.stats[key] : b.stats[key] - a.stats[key])), top = ranked[0];
    if (!top || ranked.length < 10) return null;
    return ask({kind: 'Teams', prompt: `Which team ${word} per game?`, answer: asTeam(teamCodeOf(top.team)), others: shuffle(ranked.slice(1, 9)).slice(0, 3).map(team => asTeam(teamCodeOf(team.team))),
      explain: `The ${top.playerName}: ${f1(top.stats[key])} ${unit}. Next: the ${ranked[1].playerName} at ${f1(ranked[1].stats[key])}.`, path: teamUrl(teamCodeOf(top.team))});
  },
  teamLead({regulars}) {
    const [key, word, unit] = pick(STATS.slice(0, 3));
    const byTeam = Object.keys(TEAMS).map(code => regulars.filter(player => teamCodeOf(player.team) === code).sort((a, b) => b.minutesPerGame - a.minutesPerGame).slice(0, 4)).filter(group => group.length === 4);
    const group = pick(byTeam);
    if (!group) return null;
    const ranked = [...group].sort((a, b) => b.stats[key] - a.stats[key]), top = ranked[0], code = teamCodeOf(top.team);
    if (ranked[1].stats[key] === top.stats[key]) return null;
    return ask({kind: 'Team leaders', prompt: `Who leads the ${nickname(code)} in ${word} per game?`, answer: asPlayer(top), others: ranked.slice(1).map(asPlayer),
      explain: `${top.playerName}: ${f1(top.stats[key])} ${unit}. ${ranked[1].playerName} is next with ${f1(ranked[1].stats[key])}.`, path: teamUrl(code)});
  },
  record({records}) {
    const rows = Object.entries(records).filter(([code]) => TEAMS[code]).map(([code, row]) => ({code, ...row, pct: row.w / Math.max(1, row.w + row.l)}));
    if (rows.length < 20) return null;
    const best = Math.random() < .5, ranked = [...rows].sort((a, b) => (best ? b.pct - a.pct : a.pct - b.pct) || (best ? b.w - a.w : b.l - a.l)), top = ranked[0];
    if (ranked[1].pct === top.pct) return null;
    return ask({kind: 'Standings', prompt: best ? 'Which team has the best record?' : 'Which team has the worst record?', answer: asTeam(top.code), others: shuffle(ranked.slice(1, 9)).slice(0, 3).map(row => asTeam(row.code)),
      explain: `The ${TEAMS[top.code].name} are ${top.w}-${top.l}.`, path: '/standings'});
  },
  doubleDouble({regulars, stars}) {
    const tens = player => [player.stats.points, player.stats.totalRebounds, player.stats.assists].filter(value => value >= 10).length;
    const answer = pick(regulars.filter(player => tens(player) >= 2 && player.minutesPerGame >= 24));
    const others = shuffle(stars.filter(player => tens(player) < 2 && (player.stats.totalRebounds >= 7 || player.stats.assists >= 7))).slice(0, 3);
    if (!answer || others.length < 3) return null;
    return ask({kind: 'Double-doubles', prompt: 'Who is averaging a double-double?', answer: asPlayer(answer), others: others.map(asPlayer),
      explain: `${answer.playerName}: ${f1(answer.stats.points)} points, ${f1(answer.stats.totalRebounds)} rebounds and ${f1(answer.stats.assists)} assists.`, path: playerUrl(answer.playerName)});
  },
  ladder({ladders, regulars}) {
    const [key, slug, label] = pick([['mvp', 'mvp', 'MVP'], ['rookie', 'roty', 'Rookie of the Year']]), rows = ladders?.[key] ?? [];
    if (rows.length < 4) return null;
    const toPlayer = row => regulars.find(entry => espnId(entry) === String(row.espnId)) ?? {playerName: row.name, team: row.team, playerId: `espn-${row.espnId}`};
    return ask({kind: 'Ladders', prompt: `Who is No. 1 on the ${label} ladder right now?`, answer: asPlayer(toPlayer(rows[0])), others: shuffle(rows.slice(1, 8)).slice(0, 3).map(row => asPlayer(toPlayer(row))),
      explain: `${rows[0].name}: ${f1(rows[0].pts)} points, ${f1(rows[0].reb)} rebounds and ${f1(rows[0].ast)} assists a game.`, path: `/ladders/${slug}`});
  },
};

/* What identifies a question for "never ask it again": the wording and the right answer. If a leader changes, it is a new question. */
export const questionKey = question => `${question.prompt}|${question.detail ?? ''}|${question.options[question.answer].key}`;

/* A round: ten questions over as many kinds as possible, the same answer never twice, and nothing in `seen` (questions
   this visitor already had). No kind more than twice, unless the small kinds have all been seen; then the big ones
   (team leaders, head to head) may fill the gap, up to five each. */
export function makeRound(data, seen = new Set(), count = 10) {
  const context = {...data, ...pools(data)}, used = new Set(), round = [];
  const order = [...shuffle(Object.keys(BUILDERS)), ...shuffle(['leader', 'leader', 'teamLead', 'teamLead', 'versus', 'versus', 'shooting', 'teams', 'record', 'doubleDouble'])];
  for (const cap of [2, 5]) {
    for (let tries = 0; round.length < count && tries < 600; tries += 1) {
      const kind = order[tries % order.length], question = BUILDERS[kind](context);
      const key = question && `${question.kind}:${question.options[question.answer].key}`;
      if (!question || used.has(key) || seen.has(questionKey(question)) || round.filter(each => each.kind === question.kind).length >= cap) continue;
      used.add(key); round.push(question);
    }
  }
  return shuffle(round);
}
