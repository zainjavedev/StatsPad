import fs from 'node:fs';
import path from 'node:path';
import { TEAMS, teamCodeOf } from '../src/lib/teams.js';
import { SEASONS, pretty } from '../src/lib/season.js';
import { makeCopy } from './seo-copy.mjs';
import { bestSeason, careerOf, liveRow, seasonsOf, tsOf } from '../src/lib/career.js';
import { LEADERS, statUrl } from '../src/lib/statLeaders.js';
import { published } from '../src/content/blog/posts.js';
import { SITE, compareUrl, playerUrl, slugify, teamUrl } from '../src/lib/routes.js';

/* Runs before `next build`. Writes src/seo/pages.json (title, description and a
   readable stats body for every player, team and popular comparison, which the
   Next.js routes render), a share-card image for each under public/og, and the
   sitemap. React replaces the static text as soon as the app loads; search
   engines and link previews read it as is.

   SEO_LIMIT=n builds only n pages of each kind; */

const root = path.resolve(import.meta.dirname, '..');
const publicDir = path.join(root, 'public');
const manifestFile = path.join(root, 'src/seo/pages.json');
const LIMIT = Number(process.env.SEO_LIMIT) || Infinity;
const OPENING_WEEK_GAMES = 5;
const TOP_PLAYERS_FOR_PAIRS = 20;
const TOP_TEAMS_FOR_PAIRS = 12;
const read = file => JSON.parse(fs.readFileSync(path.join(root, file), 'utf8'));
const esc = value => String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const plain = value => String(value).normalize('NFD').replace(/[̀-ͯ]/g, '');
const fixed = (value, places = 1) => Number(value).toFixed(places);

/* ---------- data ---------- */
/* The app switches seasons on the first game (src/lib/season.js), but the static
   pages search engines index wait until the new season has a body of numbers:
   after opening week there are 150+ players and every team has played. Until
   then they keep last season's full set instead of a few dozen thin pages. */
const readRows = file => { try { const data = read(file); return data.players?.length ? data : null; } catch { return null; } };
const settled = key => {
  const players = readRows(`public/data/${key}/regular-season.json`), teamRows = readRows(`public/data/${key}/teams-regular-season.json`);
  return Boolean(players && teamRows) && (key !== SEASONS[0] || (players.players.length >= 150 && teamRows.players.length >= 30 && Math.max(...players.players.map(p => p.gamesPlayed)) >= OPENING_WEEK_GAMES));
};
const regularKey = SEASONS.find(settled);
if (!regularKey) throw new Error('No season data found under public/data');
/* Until 2026-27 has real regular-season numbers, the pages show its preseason stats (preseason.json) when they exist. */
const preseasonRows = readRows(`public/data/${SEASONS[0]}/preseason.json`), preseasonTeams = readRows(`public/data/${SEASONS[0]}/teams-preseason.json`);
const preseasonStats = regularKey !== SEASONS[0] && Boolean(preseasonRows && preseasonTeams);
const seasonKey = preseasonStats ? SEASONS[0] : regularKey;
const season = preseasonStats ? preseasonRows : read(`public/data/${seasonKey}/regular-season.json`);
const teamData = (preseasonStats ? preseasonTeams : read(`public/data/${seasonKey}/teams-regular-season.json`)).players;
const statsWord = seasonKey === SEASONS[0] ? (preseasonStats ? 'preseason' : 'this season’s') : 'last season’s';
/* Early in a season nobody has 15 games yet, so the cut-off grows with the schedule. */
const mostGames = Math.max(...season.players.map(p => p.gamesPlayed));
const minGames = Math.min(15, Math.max(1, Math.floor(mostGames / 2)));
const playerIds = Object.fromEntries(Object.entries(read('public/data/player-ids.json')).map(([name, id]) => [plain(name), id]));
const espnIds = {};
for (const file of fs.readdirSync(path.join(root, 'public/data/2026-27/rosters'))) for (const entry of read(`public/data/2026-27/rosters/${file}`).players) if (entry.espnId) espnIds[plain(entry.name)] = entry.espnId;
const fgaPlays = s => s.fieldGoalsAttempted + .44 * s.freeThrowsAttempted;
const players = season.players
  .filter(p => preseasonStats ? p.gamesPlayed > 0 && p.minutesPerGame >= 10 : p.gamesPlayed >= minGames && p.minutesPerGame >= 10)
  .map(p => ({...p, slug: slugify(p.playerName), nbaId: playerIds[plain(p.playerName)] ?? null, espnId: espnIds[plain(p.playerName)] ?? null,
    code: TEAMS[teamCodeOf(p.team)] ? teamCodeOf(p.team) : null,
    ts: p.stats.points / (2 * fgaPlays(p.stats)) * 100, tov: p.stats.turnovers / (fgaPlays(p.stats) + p.stats.turnovers) * 100}))
  .sort((a, b) => b.stats.points - a.stats.points);
const bySlug = new Map(players.map(p => [p.slug, p]));
const teams = Object.entries(TEAMS).map(([code, info]) => {
  const row = teamData.find(t => teamCodeOf(t.team) === code);
  return {code, ...info, slug: slugify(info.name), stats: row?.stats, roster: fs.existsSync(path.join(root, `public/data/2026-27/rosters/${code}.json`)) ? read(`public/data/2026-27/rosters/${code}.json`) : null};
}).filter(team => team.stats);

/* ---------- html ---------- */
const pages = {};
const written = [];
function writePage({route, title, description, body, jsonLd}) {
  pages[route] = {title, description, body, jsonLd: jsonLd ?? null};
  if (route !== '/') written.push(route);
}
const table = (heads, rows, caption) => `<table>${caption ? `<caption>${esc(caption)}</caption>` : ''}<thead><tr>${heads.map(h => `<th>${esc(h)}</th>`).join('')}</tr></thead><tbody>${rows.map(row => `<tr>${row.map(cell => `<td>${cell}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
/* Titles over 60 characters get cut off in search results: take the longest wording that fits, with the brand first and then without it. */
const fitTitle = (...options) => options.find(option => option.length <= 60) ?? options[options.length - 1];
/* Descriptions over 160 characters get cut off, so fall back to the shorter wording. */
const fitDescription = (full, short) => full.length <= 160 ? full : short;
const updated = () => `<p>Stats last updated <time datetime="${season.lastUpdated}">${new Date(`${season.lastUpdated}T12:00:00Z`).toLocaleDateString('en-US', {month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC'})}</time>, from ESPN. <a href="/about">How these numbers are calculated</a>.</p>`;
const link = (href, label) => `<a href="${href}">${esc(label)}</a>`;
const yearLabel = pretty(seasonKey) + (preseasonStats ? ' preseason' : '');

const PLAYER_ROWS = [['GP', p => p.gamesPlayed, 0], ['MPG', p => p.minutesPerGame], ['PPG', p => p.stats.points], ['RPG', p => p.stats.totalRebounds], ['APG', p => p.stats.assists], ['SPG', p => p.stats.steals], ['BPG', p => p.stats.blocks], ['FG%', p => p.stats.fieldGoalPercentage], ['3P%', p => p.stats.threePointPercentage], ['FT%', p => p.stats.freeThrowPercentage], ['TS%', p => p.ts], ['TOV%', p => p.tov]];
const TEAM_ROWS = [['PPG', t => t.stats.points], ['APG', t => t.stats.assists], ['RPG', t => t.stats.totalRebounds], ['SPG', t => t.stats.steals], ['BPG', t => t.stats.blocks], ['FG%', t => t.stats.fieldGoalPercentage], ['3P%', t => t.stats.threePointPercentage], ['3PM', t => t.stats.threePointersMade], ['FT%', t => t.stats.freeThrowPercentage], ['eFG%', t => t.stats.effectiveFieldGoalPercentage]];
const cell = (rows, a, b) => rows.map(([label, get, places]) => [esc(label), fixed(get(a), places ?? 1), fixed(get(b), places ?? 1)]);

const statLine = p => `${fixed(p.stats.points)} PPG · ${fixed(p.stats.totalRebounds)} RPG · ${fixed(p.stats.assists)} APG`;

/* ---------- pages ---------- */

const cap = items => items.slice(0, LIMIT);
const topPlayers = players.slice(0, TOP_PLAYERS_FOR_PAIRS);
const pairs = [];
for (let i = 0; i < topPlayers.length; i += 1) for (let j = i + 1; j < topPlayers.length; j += 1) pairs.push([topPlayers[i], topPlayers[j]].sort((x, y) => x.slug.localeCompare(y.slug)));
const teamPairs = [];
const topTeams = [...teams].sort((a, b) => b.stats.points - a.stats.points).slice(0, TOP_TEAMS_FOR_PAIRS);
for (let i = 0; i < topTeams.length; i += 1) for (let j = i + 1; j < topTeams.length; j += 1) teamPairs.push([topTeams[i], topTeams[j]].sort((x, y) => x.slug.localeCompare(y.slug)));
const pairKeys = new Set(pairs.map(([x, y]) => `${x.slug}|${y.slug}`));
const pairRoute = (x, y) => {
  const [first, second] = [x, y].sort((m, n) => m.slug.localeCompare(n.slug));
  return pairKeys.has(`${first.slug}|${second.slug}`) ? compareUrl([x.playerName, y.playerName]) : null;
};
const copy = makeCopy({players, teams, esc, link, nameOf: code => TEAMS[code].name, playerHref: q => playerUrl(q.playerName), pairRoute});
/* Season-by-season history from public/data/careers, with this season's live line on the end. */
function careerHtml(p) {
  const file = path.join(root, 'public/data/careers', `${p.slug}.json`);
  const rows = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')).rows : [];
  const seasons = seasonsOf(rows, liveRow(p, seasonKey));
  if (seasons.length < 2) return '';
  const career = careerOf(seasons);
  const high = bestSeason(seasons, 'pts');
  const body = [...seasons].reverse().map(({s, main}) => [esc(pretty(s)), esc(main.tot ? 'TOT' : main.t), main.gp, ...[main.mpg, main.pts, main.reb, main.ast, main.fgp, main.tpp, tsOf(main)].map(value => fixed(value))]);
  body.push(['Career', '', career.gp, ...[career.mpg, career.pts, career.reb, career.ast, career.fgp, career.tpp, tsOf(career)].map(value => fixed(value))]);
  return `<h2>${esc(p.playerName)} career stats by season</h2><p>Across ${seasons.length} seasons and ${career.gp} games, ${esc(p.playerName)} has averaged ${fixed(career.pts)} points, ${fixed(career.reb)} rebounds and ${fixed(career.ast)} assists per game${high ? `, with a best scoring season of ${fixed(high.main.pts)} PPG in ${esc(pretty(high.s))}` : ''}.</p>${table(['Season', 'Team', 'GP', 'MPG', 'PPG', 'RPG', 'APG', 'FG%', '3P%', 'TS%'], body)}`;
}
const starterNames = team => (team.roster?.players ?? []).filter(entry => entry.unit === 'starters').map(entry => entry.name).map(name => (bySlug.get(slugify(name)) ? link(playerUrl(name), name) : esc(name)));

const LEADER_STATS = [['Points', 'PPG', p => p.stats.points], ['Rebounds', 'RPG', p => p.stats.totalRebounds], ['Assists', 'APG', p => p.stats.assists], ['Steals', 'SPG', p => p.stats.steals], ['Blocks', 'BPG', p => p.stats.blocks]];
const leadersOf = (get, pool = players) => [...pool].sort((x, y) => get(y) - get(x)).slice(0, 5);
const leaderList = ([name, abbr, get], pool = players) => `<h2>${esc(name)} per game</h2><ol>${leadersOf(get, pool).map(p => `<li>${link(playerUrl(p.playerName), p.playerName)}${p.code ? ` (${esc(TEAMS[p.code].name)})` : ''}: ${fixed(get(p))} ${abbr}</li>`).join('')}</ol>`;
const popular = pairs.slice(0, 8).map(([x, y]) => `<li>${link(compareUrl([x.playerName, y.playerName]), `${x.playerName} vs ${y.playerName}`)}</li>`).join('');
const teamList = `<ul>${teams.map(team => `<li>${link(teamUrl(team.code), `${team.name} roster`)}</li>`).join('')}</ul>`;
const crumbs = (...items) => ({'@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: items.map(([name, route], index) => ({'@type': 'ListItem', position: index + 1, name, item: SITE + route}))});
const organization = {'@context': 'https://schema.org', '@type': 'Organization', name: 'StatsPads', url: SITE, logo: `${SITE}/icon-512.png`, email: 'support@statspads.com', description: 'An independent NBA stats site: player and team comparisons, league leaders, standings and expected starting lineups.'};
const website = {'@context': 'https://schema.org', '@type': 'WebSite', name: 'StatsPads', alternateName: 'Stats Pads', url: SITE, description: 'NBA player and team comparisons, rosters and stats.'};

writePage({route: '/', title: 'StatsPads: NBA player and team comparisons, rosters, stats', description: 'Compare any two NBA players or teams side by side with a skill radar, see every roster with its expected starting five, and browse the league leaders.', jsonLd: [website, organization],
  body: `<main class="seo"><h1>StatsPads: NBA player and team stats, comparisons and starting lineups</h1><p>StatsPads is a free NBA stats site. Compare any two players or teams side by side with a skill radar, browse every roster with its expected starting five, and see who leads the league in ${statsWord} points, rebounds, assists, steals and blocks. Pick a team, follow it, and get its game alerts.</p><h2>${yearLabel} scoring leaders</h2>${leaderList(LEADER_STATS[0])}<p>${link('/leaders', 'See all stat leaders')}</p><h2>Popular player comparisons</h2><ul>${popular}</ul><p>${link('/compare', 'Compare any two players or teams')}</p><h2>All 30 NBA teams</h2>${teamList}</main>`});
writePage({route: '/compare', title: 'Compare NBA players and teams | StatsPads', description: 'Pick any two NBA players or teams and compare their stats side by side on a skill radar, with shooting efficiency and expected starting fives.', jsonLd: [crumbs(['Home', '/'], ['Compare', '/compare'])],
  body: `<main class="seo"><h1>Compare NBA players and teams</h1><p>Choose any two NBA players or any two teams and see their ${statsWord} per-game numbers, shooting efficiency and a skill radar side by side. The comparison covers points, rebounds, assists, steals, blocks, field goal, three-point and free throw percentages, true shooting and turnover rate. Team comparisons also show the expected starting fives. Every comparison also lists where each side ranks in the league for each category, so you can see not just who averages more but how far above or below the league average each one is. Pick two players from the list below, or open any player or team page and use the compare button to choose an opponent.</p><h2>Popular player comparisons</h2><ul>${popular}</ul><h2>Compare teams</h2><ul>${teamPairs.slice(0, 8).map(([x, y]) => `<li>${link(compareUrl([x.name, y.name]), `${x.name} vs ${y.name}`)}</li>`).join('')}</ul></main>`});
writePage({route: '/leaders', title: 'NBA stat leaders | StatsPads', description: 'Points, rebounds, assists, steals, blocks and shooting leaders across the NBA, with the full top five for each.', jsonLd: [crumbs(['Home', '/'], ['Leaders', '/stats/points'])],
  body: `<main class="seo"><h1>NBA stat leaders, ${yearLabel}</h1><p>The top five NBA players in each major per-game category for ${yearLabel}, among players with at least ${minGames} games played and ten minutes a game.</p>${LEADER_STATS.map(stat => leaderList(stat)).join('')}</main>`});
const LEADER_SETS = [
  ['preseason', 'Preseason', `${SEASONS[0]}/preseason.json`, p => p.gamesPlayed > 0 && p.minutesPerGame >= 10],
  ['regular-season', 'Regular season', `${SEASONS[1]}/regular-season.json`, p => p.gamesPlayed >= 15 && p.minutesPerGame >= 10],
  ['playoffs', 'Playoffs', `${SEASONS[1]}/playoffs.json`, p => p.gamesPlayed >= 3 && p.minutesPerGame >= 10],
];
for (const [slug, name, file, keep] of LEADER_SETS) {
  const rows = readRows(`public/data/${file}`);
  if (!rows) continue;
  const label = `${pretty(file.split('/')[0])} ${name.toLowerCase()}`;
  const pool = rows.players.filter(keep).map(p => ({...p, code: TEAMS[teamCodeOf(p.team)] ? teamCodeOf(p.team) : null}));
  writePage({route: `/leaders/${slug}`, title: `NBA ${name.toLowerCase()} stat leaders ${pretty(file.split('/')[0])} | StatsPads`, description: `Points, rebounds, assists, steals and blocks leaders for the ${label}, with the top five in each category.`, jsonLd: [crumbs(['Home', '/'], ['Leaders', '/stats/points'], [name, `/leaders/${slug}`])],
    body: `<main class="seo"><h1>NBA stat leaders, ${label}</h1><p>The top five NBA players in each major per-game category for the ${label}.</p>${LEADER_STATS.map(stat => leaderList(stat, pool)).join('')}<p>${LEADER_SETS.map(([other, otherName]) => link(`/leaders/${other}`, `${otherName} leaders`)).join(' · ')}</p></main>`});
}
/* One page per stat ranking: the top 25 players, with the same qualifying minimums the app uses. */
for (const entry of LEADERS) {
  const ranked = players.filter(p => !entry.min || p.stats[entry.min[0]] >= entry.min[1]).sort((x, y) => y.stats[entry.key] - x.stats[entry.key]).slice(0, 25);
  const lower = entry.label.toLowerCase();
  writePage({route: statUrl(entry.slug), title: fitTitle(`NBA ${lower} leaders ${pretty(seasonKey)} | StatsPads`, `NBA ${lower} leaders ${pretty(seasonKey)}`),
    description: fitDescription(`Who leads the NBA in ${lower} (${entry.unit}) in ${yearLabel}: the top 25 players ranked, from ${ranked[0]?.playerName ?? 'the league leader'} down, with team and games played.`, `Who leads the NBA in ${lower} (${entry.unit}) in ${yearLabel}: the top 25 players ranked.`),
    jsonLd: [crumbs(['Home', '/'], ['Leaders', '/stats/points'], [`${entry.label} leaders`, statUrl(entry.slug)])],
    body: `<main class="seo"><h1>NBA ${esc(lower)} leaders, ${yearLabel}</h1><p>The top 25 NBA players in ${esc(lower)} (${entry.unit}) for ${yearLabel}${entry.min ? `, among players with at least ${entry.min[1]} ${entry.min[0].replace(/([A-Z])/g, ' $1').toLowerCase()} per game` : ''}.</p>${table(['Rank', 'Player', 'Team', 'GP', entry.unit], ranked.map((p, index) => [index + 1, link(playerUrl(p.playerName), p.playerName), p.code ? esc(TEAMS[p.code].name) : '', p.gamesPlayed, fixed(p.stats[entry.key])]), `NBA ${lower} leaders, ${yearLabel}`)}<p>${link('/leaders', 'All stat leaders')} · ${LEADERS.filter(other => other.slug !== entry.slug).map(other => link(statUrl(other.slug), `${other.label} leaders`)).join(' · ')}</p></main>`});
}
writePage({route: '/performances', title: 'Top recent NBA performances | StatsPads', description: 'The best individual NBA game lines from the last few nights, ranked by game score, with points, rebounds and assists for each.', jsonLd: [crumbs(['Home', '/'], ['Performances', '/performances'])],
  body: `<main class="seo"><h1>Top recent NBA performances</h1><p>The best individual NBA game lines from the last few nights, ranked by game score (a single number that combines scoring, rebounding, assists, steals, blocks, shooting efficiency and turnovers). Each line shows the player, the opponent, the final score and a share card you can send to a friend.</p><p>Game score is John Hollinger's one-number box-score rating. It rewards points, made shots, offensive and defensive rebounds, assists, steals and blocks, and it subtracts missed shots, missed free throws, turnovers and fouls. Because it counts efficiency as well as volume, a quiet 28-point night on 70 percent shooting can rank above a 35-point night that took 35 shots. Only finished regular-season games count, one line per player, so a single big night does not fill the list. The list refreshes as games finish, usually within minutes of the final buzzer, and the share card for each line carries the player's photo, the box-score numbers and a link back to the full game page. Use it to catch up on the games you missed, find a player worth following, or settle an argument about who had the better night.</p><p>${link('/leaders', 'Season stat leaders')} · ${link('/schedule', 'Schedule and results')} · ${link('/standings', 'Standings')} · ${link('/teams', 'All 30 teams')}</p></main>`});
/* One page with every team's expected starting five: the "NBA starting lineups" search. */
const lineupRows = teams.map(team => {
  const five = (team.roster?.players ?? []).filter(p => p.unit === 'starters');
  return five.length ? `<h2>${link(teamUrl(team.code), `${team.name} starting lineup`)}</h2><ol>${five.map(p => `<li>${esc(p.slot)} ${bySlug.get(slugify(p.name)) ? link(playerUrl(p.name), p.name) : esc(p.name)}</li>`).join('')}</ol>` : '';
}).join('');
writePage({route: '/lineups', title: fitTitle(`NBA starting lineups ${pretty(seasonKey)}: every team | StatsPads`, `NBA starting lineups ${pretty(seasonKey)}: every team`, `NBA starting lineups ${pretty(seasonKey)}`),
  description: 'The expected starting five for all 30 NBA teams, by position, with links to each roster and player stats.', jsonLd: [crumbs(['Home', '/'], ['Lineups', '/lineups'])],
  body: `<main class="seo"><h1>NBA starting lineups, ${pretty(seasonKey)}</h1><p>The expected starting five for each of the 30 NBA teams: the lineup each team has used most recently or most often, not an official announcement. Starters change with injuries, rest days and trades, and this page is rebuilt every few hours.</p>${updated()}${lineupRows}<p>${link('/teams', 'All teams and rosters')} · ${link('/compare', 'Compare two teams')} · ${link('/standings', 'Standings')}</p></main>`});
/* The same lineups as data, for the page's card layout. */
pages['/lineups'].lineups = teams.map(team => ({code: team.code, name: team.name, url: teamUrl(team.code), starters: (team.roster?.players ?? []).filter(p => p.unit === 'starters').map(p => ({slot: p.slot, name: p.name, url: bySlug.get(slugify(p.name)) ? playerUrl(p.name) : null}))})).filter(team => team.starters.length);
pages['/lineups'].updated = season.lastUpdated;
writePage({route: '/schedule', title: 'NBA schedule 2026–27 | StatsPads', description: 'Every NBA game of the 2026–27 season with times in your timezone. Filter by team or find when two teams meet.', jsonLd: [crumbs(['Home', '/'], ['Schedule', '/schedule'])],
  body: `<main class="seo"><h1>NBA schedule 2026–27</h1><p>Every regular-season game with start times in your timezone, TV and arena. Pick a team, or two, to see when they play each other, like Lakers vs Celtics or 76ers vs Knicks.</p><p>Each of the 30 teams plays 82 regular-season games, 1,230 in all, split between 41 home games and 41 on the road. Every team meets the other 14 teams in its own conference three or four times and each team in the other conference twice, once at home and once away. Finished games link to a full box score with a shot chart and a game-flow chart, and upcoming games show the expected starters for both teams.</p><h2>Teams</h2>${teamList}</main>`});
writePage({route: '/standings', title: 'NBA standings 2026–27 | StatsPads', description: 'Eastern and Western conference standings with seeds, records, games behind, home and road records, last ten and streaks.', jsonLd: [crumbs(['Home', '/'], ['Standings', '/standings'])],
  body: `<main class="seo"><h1>NBA standings 2026–27</h1><p>Eastern and Western conference standings: seeds 1–6 go to the playoffs and 7–10 to the play-in. Each row shows wins, losses, win percentage, games behind, home and road records, last ten games, streak and scoring.</p><p>Each conference has 15 teams and the table is ordered by record. The top six seeds in each conference qualify for the playoffs directly, while seeds 7 to 10 enter the play-in tournament for the last two spots. Games behind shows how far a team trails the conference leader, and the last-ten column is a quick read on current form. Open any team to see its roster, expected starting five and per-game stats.</p><h2>Teams</h2>${teamList}</main>`});
writePage({route: '/teams', title: 'NBA teams and rosters | StatsPads', description: 'Every NBA team with its 2026–27 roster, expected starting five and ' + statsWord + ' per-game stats, from the Atlanta Hawks to the Washington Wizards.', jsonLd: [crumbs(['Home', '/'], ['Teams', '/teams'])],
  body: `<main class="seo"><h1>NBA teams and rosters</h1><p>All 30 NBA teams with their 2026–27 roster, the expected starting five and ${statsWord} per-game team stats. Open a team to see its lineup, recent results and to follow it for game alerts.</p>${table(['Team', 'PPG', 'APG', 'RPG'], [...teams].sort((x, y) => x.name.localeCompare(y.name)).map(team => [link(teamUrl(team.code), team.name), fixed(team.stats.points), fixed(team.stats.assists), fixed(team.stats.totalRebounds)]), `NBA team per-game stats, ${yearLabel}`)}</main>`});

for (const p of cap(players)) {
  const related = pairs.filter(pair => pair.includes(p)).slice(0, 4).map(([x, y]) => `<li>${link(compareUrl([x.playerName, y.playerName]), `${x.playerName} vs ${y.playerName}`)}</li>`).join('');
  writePage({route: playerUrl(p.playerName), jsonLd: [crumbs(['Home', '/'], ['Players', '/stats/points'], [p.playerName, playerUrl(p.playerName)]), {'@context': 'https://schema.org', '@type': 'Person', name: p.playerName, jobTitle: 'Basketball player', url: SITE + playerUrl(p.playerName), ...(p.code ? {affiliation: {'@type': 'SportsTeam', name: TEAMS[p.code].name, sport: 'Basketball'}} : {})}],
    title: fitTitle(`${p.playerName} stats ${pretty(seasonKey)}: ${fixed(p.stats.points)} PPG, ${fixed(p.stats.totalRebounds)} RPG, ${fixed(p.stats.assists)} APG | StatsPads`, `${p.playerName} stats ${pretty(seasonKey)}: ${fixed(p.stats.points)} PPG, ${fixed(p.stats.totalRebounds)} RPG, ${fixed(p.stats.assists)} APG`, `${p.playerName} stats ${pretty(seasonKey)}: ${fixed(p.stats.points)} PPG, ${fixed(p.stats.totalRebounds)} RPG`, `${p.playerName} stats ${pretty(seasonKey)}`),
    description: fitDescription(`${p.playerName} ${yearLabel} NBA stats: ${statLine(p)}, ${fixed(p.stats.fieldGoalPercentage)}% FG, ${fixed(p.stats.threePointPercentage)}% 3P, ${fixed(p.ts)}% TS in ${p.gamesPlayed} games. Compare ${p.playerName} with any player.`, `${p.playerName} ${yearLabel} NBA stats: ${statLine(p)}, ${fixed(p.stats.fieldGoalPercentage)}% FG, ${fixed(p.stats.threePointPercentage)}% 3P in ${p.gamesPlayed} games.`),
    body: `<main class="seo"><h1>${esc(p.playerName)} stats, ${yearLabel}</h1>${updated()}${copy.playerProfile(p)}${copy.playerRankings(p)}${table(['Stat', 'Per game'], PLAYER_ROWS.map(([label, get, places]) => [esc(label), fixed(get(p), places ?? 1)]), `${p.playerName} per-game stats, ${yearLabel}`)}${p.code ? `<p>${link(teamUrl(p.code), `${TEAMS[p.code].name} roster`)}</p>` : ''}${careerHtml(p)}${copy.teammates(p)}${copy.neighbours(p)}${related ? `<h2>Compare</h2><ul>${related}</ul>` : ''}</main>`});
}
for (const team of cap(teams)) {
  const roster = team.roster?.players ?? [];
  const slug = name => bySlug.get(slugify(name));
  const line = player => slug(player.name) ? link(playerUrl(player.name), player.name) : esc(player.name);
  const starters = roster.filter(p => p.unit === 'starters');
  writePage({route: teamUrl(team.code), jsonLd: [crumbs(['Home', '/'], ['Teams', '/teams'], [team.name, teamUrl(team.code)]), {'@context': 'https://schema.org', '@type': 'SportsTeam', name: team.name, sport: 'Basketball', url: SITE + teamUrl(team.code), memberOf: {'@type': 'SportsOrganization', name: 'NBA'}}],
    title: fitTitle(`${team.name} roster 2026–27: expected starting five | StatsPads`, `${team.name} roster 2026–27 and starting five`, `${team.name} roster 2026–27`),
    description: fitDescription(`${team.name} 2026–27 roster with the expected starting five${starters.length ? ` (${starters.map(p => p.name).join(', ')})` : ''}, ${statsWord} per-game stats and recent results.`, `${team.name} 2026–27 roster with the expected starting five, ${statsWord} per-game stats and recent results.`),
    body: `<main class="seo"><h1>${esc(team.name)} roster, 2026–27</h1>${updated()}${copy.teamProfile(team)}${copy.teamRankings(team)}${starters.length ? `<h2>Expected starting five</h2><ol>${starters.map(p => `<li>${esc(p.slot)} ${line(p)}</li>`).join('')}</ol>` : ''}${roster.length ? `<h2>Full roster</h2><ul>${roster.map(p => `<li>${line(p)}</li>`).join('')}</ul>` : ''}<h2>${yearLabel} team stats</h2>${table(['Stat', 'Per game'], TEAM_ROWS.map(([label, get]) => [esc(label), fixed(get(team))]), `${team.name} per-game stats, ${yearLabel}`)}</main>`});
}
/* Three questions people ask about a pairing, answered from the numbers. Marked up as FAQPage so search and AI answers can quote them. */
const moreOf = (a, b, get, unit) => {
  const x = get(a), y = get(b);
  const text = `${a.playerName} averages ${fixed(x)} ${unit} and ${b.playerName} averages ${fixed(y)} ${unit} in ${yearLabel}`;
  return Math.abs(x - y) < 0.05 ? `${text}, so they are level.` : `${text}, so ${(x > y ? a : b).playerName} has the higher number.`;
};
const faqFor = (a, b) => [
  [`Who scores more, ${a.playerName} or ${b.playerName}?`, moreOf(a, b, p => p.stats.points, 'points per game')],
  [`Who is the more efficient shooter, ${a.playerName} or ${b.playerName}?`, moreOf(a, b, p => p.ts, '% true shooting')],
  [`Who rebounds and passes more, ${a.playerName} or ${b.playerName}?`, `${moreOf(a, b, p => p.stats.totalRebounds, 'rebounds per game')} ${moreOf(a, b, p => p.stats.assists, 'assists per game')}`],
];
const faqHtml = items => `<h2>Common questions</h2>${items.map(([question, answer]) => `<h3>${esc(question)}</h3><p>${esc(answer)}</p>`).join('')}`;
const faqSchema = items => ({'@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: items.map(([question, answer]) => ({'@type': 'Question', name: question, acceptedAnswer: {'@type': 'Answer', text: answer}}))});
for (const [a, b] of cap(pairs)) {
  const route = compareUrl([a.playerName, b.playerName]);
  const faq = faqFor(a, b);
  writePage({route, jsonLd: [crumbs(['Home', '/'], ['Compare', '/compare'], [`${a.playerName} vs ${b.playerName}`, route]), faqSchema(faq)],
    title: fitTitle(`${a.playerName} vs ${b.playerName}: ${pretty(seasonKey)} stats | StatsPads`, `${a.playerName} vs ${b.playerName}: ${pretty(seasonKey)} stats`, `${a.playerName} vs ${b.playerName} stats`),
    description: fitDescription(`${a.playerName} vs ${b.playerName} ${yearLabel} stats side by side: ${fixed(a.stats.points)} vs ${fixed(b.stats.points)} PPG, ${fixed(a.stats.totalRebounds)} vs ${fixed(b.stats.totalRebounds)} RPG, ${fixed(a.stats.assists)} vs ${fixed(b.stats.assists)} APG, with a skill radar.`, `${a.playerName} vs ${b.playerName} stats: ${fixed(a.stats.points)} vs ${fixed(b.stats.points)} PPG, ${fixed(a.stats.totalRebounds)} vs ${fixed(b.stats.totalRebounds)} RPG, ${fixed(a.stats.assists)} vs ${fixed(b.stats.assists)} APG, with a skill radar.`),
    body: `<main class="seo"><h1>${esc(a.playerName)} vs ${esc(b.playerName)}: ${yearLabel} stats</h1><p>${esc(a.playerName)} averaged ${esc(statLine(a))}. ${esc(b.playerName)} averaged ${esc(statLine(b))}.</p>${updated()}${copy.playerComparison(a, b)}${copy.comparisonRankings(a, b)}${table(['Stat', a.playerName, b.playerName], cell(PLAYER_ROWS, a, b))}<p>${link(playerUrl(a.playerName), `${a.playerName} stats`)} · ${link(playerUrl(b.playerName), `${b.playerName} stats`)}${a.code ? ` · ${link(teamUrl(a.code), `${TEAMS[a.code].name} roster`)}` : ''}${b.code && b.code !== a.code ? ` · ${link(teamUrl(b.code), `${TEAMS[b.code].name} roster`)}` : ''}</p>${faqHtml(faq)}${copy.moreComparisons(a, b)}</main>`});
}
for (const [a, b] of cap(teamPairs)) {
  writePage({route: compareUrl([a.name, b.name]), title: fitTitle(`${a.name} vs ${b.name}: ${pretty(seasonKey)} team stats | StatsPads`, `${a.name} vs ${b.name}: ${pretty(seasonKey)} team stats`, `${a.name} vs ${b.name} team stats`),
    description: fitDescription(`${a.name} vs ${b.name} ${yearLabel} team stats side by side: ${fixed(a.stats.points)} vs ${fixed(b.stats.points)} PPG, ${fixed(a.stats.assists)} vs ${fixed(b.stats.assists)} APG, ${fixed(a.stats.totalRebounds)} vs ${fixed(b.stats.totalRebounds)} RPG, with a skill radar and the expected starting fives.`, `${a.name} vs ${b.name} team stats: ${fixed(a.stats.points)} vs ${fixed(b.stats.points)} PPG, ${fixed(a.stats.assists)} vs ${fixed(b.stats.assists)} APG, ${fixed(a.stats.totalRebounds)} vs ${fixed(b.stats.totalRebounds)} RPG, with a skill radar.`),
    body: `<main class="seo"><h1>${esc(a.name)} vs ${esc(b.name)}: ${yearLabel} team stats</h1>${updated()}${copy.teamComparison(a, b, starterNames)}${copy.teamComparisonRankings(a, b)}${table(['Stat', a.name, b.name], cell(TEAM_ROWS, a, b))}<p>${link(teamUrl(a.code), `${a.name} roster`)} · ${link(teamUrl(b.code), `${b.name} roster`)}</p></main>`});
}

const started = Date.now();

/* ---------- sitemap and robots ---------- */
const today = new Date().toISOString().slice(0, 10);
const urls = ['/', '/compare', '/stats/points', '/teams', '/schedule', '/standings', '/blog', ...published().map(post => `/blog/${post.slug}`), '/about', '/contact', '/terms', '/privacy', ...written.filter(route => !['/compare', '/teams', '/stats/points'].includes(route) && !route.startsWith('/leaders'))];
fs.writeFileSync(path.join(publicDir, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map(route => `  <url><loc>${SITE}${route}</loc><lastmod>${today}</lastmod></url>`).join('\n')}\n</urlset>\n`);
fs.writeFileSync(path.join(publicDir, 'llms.txt'), `# StatsPads\n\n> StatsPads (${SITE}) is a free NBA stats site: side-by-side player and team comparisons on a skill radar, league leaders, standings, the schedule, team pages with expected starting fives, and game pages with box scores. Stats come from ESPN's public feeds and are refreshed every few hours.\n\n## Main pages\n\n- [Home](${SITE}/): today's picture of the league\n- [Compare](${SITE}/compare): pick any two players or teams\n- [Stat leaders](${SITE}/leaders): top five in each major category\n- [Teams](${SITE}/teams): all 30 teams with rosters and expected starting fives\n- [Starting lineups](${SITE}/lineups): the expected starting five for every team\n- [Standings](${SITE}/standings): both conferences with seeds\n- [Schedule](${SITE}/schedule): every game of the season\n- [Top performances](${SITE}/performances): the best recent individual game lines\n- [Blog](${SITE}/blog): player comparisons and stat breakdowns\n${published().map(post => `- [${post.title}](${SITE}/blog/${post.slug}): ${post.description}`).join('\n')}\n\n## Stat rankings\n\n${LEADERS.map(entry => `- [${entry.label} leaders](${SITE}${statUrl(entry.slug)})`).join('\n')}\n\n## Page patterns\n\n- Players: ${SITE}/players/{player-name}, per-game stats, league ranks, career by season\n- Teams: ${SITE}/teams/{team-name}, roster, expected starting five, team stats\n- Comparisons: ${SITE}/compare/{a}-vs-{b}\n\nFull list of pages: ${SITE}/sitemap.xml\n`);
fs.writeFileSync(path.join(publicDir, 'robots.txt'), `User-agent: *\nAllow: /\n\nSitemap: ${SITE}/sitemap.xml\n`);
console.log(`prerender: ${written.length} pages, in ${((Date.now() - started) / 1000).toFixed(1)}s, ${players.filter(p => !p.nbaId && !p.espnId).length} of ${players.length} players without a headshot`);
fs.mkdirSync(path.dirname(manifestFile), {recursive: true});
fs.writeFileSync(manifestFile, JSON.stringify(pages));
