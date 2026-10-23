/* Data-driven copy for the prerendered pages. Every sentence is computed from
   the season's numbers (ranks, who leads which category, efficiency against
   volume), so two pages never share the same text. Wording stays neutral:
   "leads", never "wins". Callers pass the escaping and link helpers. */

const ord = n => {
  const suffix = ['th', 'st', 'nd', 'rd'], v = n % 100;
  return `${n}${suffix[(v - 20) % 10] || suffix[v] || suffix[0]}`;
};
const fixed = (value, places = 1) => Number(value).toFixed(places);
const list = items => items.length < 2 ? items.join('') : `${items.slice(0, -1).join(', ')} and ${items.at(-1)}`;
const plays = s => s.fieldGoalsAttempted + .44 * s.freeThrowsAttempted;

/* Player categories. `lower` marks stats where less is better; `gate` keeps
   percentages from players who barely attempt the shot out of the rankings. */
const PLAYER_CATS = [
  {label: 'PPG', get: p => p.stats.points},
  {label: 'RPG', get: p => p.stats.totalRebounds},
  {label: 'APG', get: p => p.stats.assists},
  {label: 'SPG', get: p => p.stats.steals},
  {label: 'BPG', get: p => p.stats.blocks},
  {label: 'FG%', get: p => p.stats.fieldGoalPercentage},
  {label: '3P%', get: p => p.stats.threePointPercentage, gate: p => p.stats.threePointersAttempted >= 1},
  {label: 'FT%', get: p => p.stats.freeThrowPercentage, gate: p => p.stats.freeThrowsAttempted >= 1},
  {label: 'TS%', get: p => p.ts},
  {label: 'TOV%', get: p => p.tov, lower: true},
];
const TEAM_CATS = [
  {label: 'PPG', get: t => t.stats.points},
  {label: 'APG', get: t => t.stats.assists},
  {label: 'RPG', get: t => t.stats.totalRebounds},
  {label: 'SPG', get: t => t.stats.steals},
  {label: 'BPG', get: t => t.stats.blocks},
  {label: 'FG%', get: t => t.stats.fieldGoalPercentage},
  {label: '3P%', get: t => t.stats.threePointPercentage},
  {label: '3PM', get: t => t.stats.threePointersMade},
  {label: 'FT%', get: t => t.stats.freeThrowPercentage},
  {label: 'eFG%', get: t => t.stats.effectiveFieldGoalPercentage},
];

const rankIn = (pool, item, cat) => {
  if (cat.gate && !cat.gate(item)) return null;
  const sorted = pool.filter(entry => !cat.gate || cat.gate(entry)).map(cat.get).sort((a, b) => cat.lower ? a - b : b - a);
  return sorted.findIndex(value => cat.lower ? value >= cat.get(item) : value <= cat.get(item)) + 1;
};
const average = (pool, get) => pool.reduce((sum, entry) => sum + get(entry), 0) / pool.length;

/* Who leads each category between two entities, as {label, a, b, leader}. */
function splitCategories(cats, a, b) {
  return cats.map(cat => {
    const x = cat.get(a), y = cat.get(b);
    if (Math.abs(x - y) < 0.05) return {label: cat.label, x, y, leader: null};
    return {label: cat.label, x, y, leader: (cat.lower ? x < y : x > y) ? a : b};
  });
}

export function makeCopy({players, teams, esc, link, nameOf, playerHref, pairRoute}) {
  const league = {ts: average(players, p => p.ts), tov: average(players, p => p.tov), fga: average(players, p => p.stats.fieldGoalsAttempted)};
  const teamName = p => (p.code ? nameOf(p.code) : p.team);
  const withThe = p => (p.code ? `the ${nameOf(p.code)}` : p.team);
  const bullets = items => items.length ? `<ul>${items.map(item => `<li>${item}</li>`).join('')}</ul>` : '';

  function playerProfile(p) {
    const s = p.stats;
    const ranks = PLAYER_CATS.map(cat => ({label: cat.label, rank: rankIn(players, p, cat)})).filter(entry => entry.rank);
    const best = ranks.filter(entry => entry.rank <= 25).sort((a, b) => a.rank - b.rank).slice(0, 3);
    const paragraphs = [];
    paragraphs.push(`${esc(p.playerName)} (${esc(teamName(p))}, ${esc(p.position)}) averaged ${fixed(s.points)} points, ${fixed(s.totalRebounds)} rebounds and ${fixed(s.assists)} assists over ${p.gamesPlayed} games and ${fixed(p.minutesPerGame)} minutes per game.${best.length ? ` Among the ${players.length} qualified players that ranks ${list(best.map(entry => `${ord(entry.rank)} in ${entry.label}`))}.` : ''}`);
    const efficiency = p.ts - league.ts;
    paragraphs.push(`Shooting: ${fixed(s.fieldGoalsAttempted)} field-goal attempts a game at ${fixed(s.fieldGoalPercentage)}%, including ${fixed(s.threePointersAttempted)} threes at ${fixed(s.threePointPercentage)}% and ${fixed(s.freeThrowsAttempted)} free throws at ${fixed(s.freeThrowPercentage)}%. True shooting comes to ${fixed(p.ts)}%, ${Math.abs(efficiency) < 0.5 ? 'right at' : `${fixed(Math.abs(efficiency))} points ${efficiency > 0 ? 'above' : 'below'}`} the ${fixed(league.ts)}% average for qualified players.`);
    paragraphs.push(`Ball handling and defense: ${fixed(s.assists)} assists against ${fixed(s.turnovers)} turnovers a game (a ${fixed(p.tov)}% turnover rate versus ${fixed(league.tov)}% for the typical qualified player), plus ${fixed(s.steals)} steals and ${fixed(s.blocks)} blocks.`);
    return paragraphs.map(text => `<p>${text}</p>`).join('');
  }

  /* Neighbours in the scoring order, for internal links. */
  function neighbours(p, count = 4) {
    const index = players.indexOf(p);
    const near = [...players.slice(Math.max(0, index - 2), index), ...players.slice(index + 1, index + 3)].slice(0, count);
    return near.length ? `<h2>Players with similar scoring</h2>${bullets(near.map(q => `${link(playerHref(q), q.playerName)} (${fixed(q.stats.points)} PPG)`))}` : '';
  }
  function teammates(p) {
    const mates = players.filter(q => q !== p && q.code && q.code === p.code).slice(0, 4);
    return mates.length ? `<h2>${esc(nameOf(p.code))} teammates</h2>${bullets(mates.map(q => `${link(playerHref(q), q.playerName)} (${fixed(q.stats.points)} PPG)`))}` : '';
  }

  function playerComparison(a, b) {
    const split = splitCategories(PLAYER_CATS, a, b);
    const ledBy = who => split.filter(entry => entry.leader === who);
    const describe = entry => `${entry.label} (${fixed(entry.leader === a ? entry.x : entry.y)} vs ${fixed(entry.leader === a ? entry.y : entry.x)})`;
    const sides = [a, b].map(who => ({who, led: ledBy(who)}));
    const paragraphs = [];
    paragraphs.push(`Across ${PLAYER_CATS.length} categories, ${esc(a.playerName)} leads in ${sides[0].led.length} and ${esc(b.playerName)} in ${sides[1].led.length}${split.some(entry => !entry.leader) ? ', with the rest level' : ''}.`);
    for (const {who, led} of sides) if (led.length) paragraphs.push(`${esc(who.playerName)} leads in ${esc(list(led.map(describe)))}.`);
    const [moreEfficient, lessEfficient] = a.ts >= b.ts ? [a, b] : [b, a];
    const volume = plays(moreEfficient.stats) - plays(lessEfficient.stats);
    paragraphs.push(`On efficiency, ${esc(moreEfficient.playerName)} shoots ${fixed(moreEfficient.ts)}% true shooting against ${fixed(lessEfficient.ts)}% for ${esc(lessEfficient.playerName)}, on ${Math.abs(volume) < 0.5 ? 'about the same number of' : volume > 0 ? 'more' : 'fewer'} shot attempts per game (${fixed(plays(moreEfficient.stats))} vs ${fixed(plays(lessEfficient.stats))} counting free throws).`);
    const teamLine = a.code && a.code === b.code ? `They play for the same team, the ${esc(nameOf(a.code))}.` : `${esc(a.playerName)} plays for ${esc(withThe(a))} and ${esc(b.playerName)} for ${esc(withThe(b))}.`;
    paragraphs.push(`${teamLine} ${esc(a.playerName)} played ${a.gamesPlayed} games at ${fixed(a.minutesPerGame)} minutes a night; ${esc(b.playerName)} played ${b.gamesPlayed} at ${fixed(b.minutesPerGame)}, so per-game numbers carry a different workload.`);
    return paragraphs.map(text => `<p>${text}</p>`).join('');
  }

  /* Other comparisons that exist, so each page links to the next. */
  function moreComparisons(a, b) {
    const picks = [];
    for (const [keep, other] of [[a, b], [b, a]]) {
      const options = players.filter(q => q !== keep && q !== other && pairRoute(keep, q)).slice(0, 2);
      for (const q of options) picks.push(link(pairRoute(keep, q), `${keep.playerName} vs ${q.playerName}`));
    }
    return picks.length ? `<h2>More comparisons</h2>${bullets(picks)}` : '';
  }

  function teamProfile(team) {
    const ranks = TEAM_CATS.map(cat => ({label: cat.label, rank: rankIn(teams, team, cat)})).sort((a, b) => a.rank - b.rank);
    const strong = ranks.filter(entry => entry.rank <= 8).slice(0, 3), weak = ranks.filter(entry => entry.rank >= teams.length - 7).slice(-2);
    const s = team.stats;
    const parts = [`The ${esc(team.name)} averaged ${fixed(s.points)} points, ${fixed(s.totalRebounds)} rebounds and ${fixed(s.assists)} assists per game, shooting ${fixed(s.fieldGoalPercentage)}% from the field and ${fixed(s.threePointPercentage)}% from three on ${fixed(s.threePointersAttempted)} attempts.`];
    if (strong.length) parts.push(`Among ${teams.length} teams that ranks ${list(strong.map(entry => `${ord(entry.rank)} in ${entry.label}`))}.`);
    if (weak.length) parts.push(`The lowest rankings are ${list(weak.map(entry => `${ord(entry.rank)} in ${entry.label}`))}.`);
    return `<p>${parts.join(' ')}</p>`;
  }

  function teamComparison(a, b, startersOf) {
    const split = splitCategories(TEAM_CATS, a, b);
    const ledBy = who => split.filter(entry => entry.leader === who);
    const describe = entry => `${entry.label} (${fixed(entry.leader === a ? entry.x : entry.y)} vs ${fixed(entry.leader === a ? entry.y : entry.x)})`;
    const paragraphs = [`Across ${TEAM_CATS.length} team categories, the ${esc(a.name)} lead in ${ledBy(a).length} and the ${esc(b.name)} in ${ledBy(b).length}.`];
    for (const who of [a, b]) if (ledBy(who).length) paragraphs.push(`The ${esc(who.name)} lead in ${esc(list(ledBy(who).map(describe)))}.`);
    const [shooter, other] = a.stats.effectiveFieldGoalPercentage >= b.stats.effectiveFieldGoalPercentage ? [a, b] : [b, a];
    paragraphs.push(`By effective field-goal percentage the ${esc(shooter.name)} shoot ${fixed(shooter.stats.effectiveFieldGoalPercentage)}% against ${fixed(other.stats.effectiveFieldGoalPercentage)}% for the ${esc(other.name)}, on ${fixed(shooter.stats.fieldGoalsAttempted)} and ${fixed(other.stats.fieldGoalsAttempted)} field-goal attempts a game.`);
    const fives = [a, b].map(team => ({team, starters: startersOf(team)})).filter(entry => entry.starters.length);
    if (fives.length === 2) paragraphs.push(`Expected starting fives: ${fives.map(({team, starters}) => `${esc(team.name)}: ${starters.join(', ')}`).join('; ')}.`);
    return paragraphs.map(text => `<p>${text}</p>`).join('');
  }

  /* Where each category sits in the league, as a table so each name appears once in the header instead of on every line. */
  const rankings = (pool, cats, entries, noun) => {
    const rows = cats.map(cat => {
      const cells = entries.map(entry => { const rank = rankIn(pool, entry.item, cat); return rank ? [fixed(cat.get(entry.item)), ord(rank)] : null; });
      return cells.every(Boolean) ? `<tr><th scope="row">${cat.label}</th>${cells.map(([value, rank]) => `<td>${value}</td><td>${rank}</td>`).join('')}</tr>` : '';
    }).filter(Boolean).join('');
    if (!rows) return '';
    const heads = entries.map(entry => `<th colspan="2" scope="colgroup">${esc(entry.name)}</th>`).join('');
    let verdict = '';
    if (entries.length === 1) {
      const ranked = cats.map(cat => ({label: cat.label, rank: rankIn(pool, entries[0].item, cat)})).filter(entry => entry.rank).sort((x, y) => x.rank - y.rank);
      if (ranked.length > 1) verdict = ` ${esc(entries[0].name)} ranks highest in ${ranked[0].label} (${ord(ranked[0].rank)}) and lowest in ${ranked.at(-1).label} (${ord(ranked.at(-1).rank)}). The next strongest categories are ${list(ranked.slice(1, 3).map(entry => `${entry.label} (${ord(entry.rank)})`))}, and the next weakest are ${list(ranked.slice(-3, -1).reverse().map(entry => `${entry.label} (${ord(entry.rank)})`))}.`;
    }
    return `<h2>League rankings</h2><p>Each stat per game, with the rank among ${pool.length} ${noun}.${verdict}</p><table><thead><tr><th></th>${heads}</tr><tr><th>Stat</th>${entries.map(() => '<th>Avg</th><th>Rank</th>').join('')}</tr></thead><tbody>${rows}</tbody></table>`;
  };
  const playerRankings = p => rankings(players, PLAYER_CATS, [{name: p.playerName, item: p}], 'qualified players');
  const teamRankings = t => rankings(teams, TEAM_CATS, [{name: t.name, item: t}], 'NBA teams');
  const comparisonRankings = (a, b) => rankings(players, PLAYER_CATS, [{name: a.playerName, item: a}, {name: b.playerName, item: b}], 'qualified players');
  const teamComparisonRankings = (a, b) => rankings(teams, TEAM_CATS, [{name: a.name, item: a}, {name: b.name, item: b}], 'NBA teams');

  return {playerProfile, neighbours, teammates, playerComparison, moreComparisons, teamProfile, teamComparison, playerRankings, teamRankings, comparisonRankings, teamComparisonRankings};
}
