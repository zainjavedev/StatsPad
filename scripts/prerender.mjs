import fs from 'node:fs';
import { neon } from '@neondatabase/serverless';
import path from 'node:path';
import { TEAMS, teamCodeOf } from '../src/lib/teams.js';
import { SEASONS, pretty } from '../src/lib/season.js';
import { makeCopy } from './seo-copy.mjs';
import { bestSeason, careerOf, liveRow, seasonsOf, tsOf } from '../src/lib/career.js';
import { LEADERS, statUrl } from '../src/lib/statLeaders.js';
import { published } from '../src/content/blog/posts.js';
import { SITE, compareUrl, gameUrl, playerUrl, slugify, teamUrl } from '../src/lib/routes.js';

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
const TOP_PLAYERS_FOR_PAIRS = 40;
const TOP_TEAMS_FOR_PAIRS = 30;
const read = file => JSON.parse(fs.readFileSync(path.join(root, file), 'utf8'));
const esc = value => String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const plain = value => String(value).normalize('NFD').replace(/[̀-ͯ]/g, '');
const fixed = (value, places = 1) => Number(value).toFixed(places);

/* ---------- data ---------- */
/* The static pages use 2026-27 regular-season stats as soon as that file has rows, with the preseason numbers kept alongside. */
const readRows = file => { try { const data = read(file); return data.players?.length ? data : null; } catch { return null; } };
const settled = key => Boolean(readRows(`public/data/${key}/regular-season.json`) && readRows(`public/data/${key}/teams-regular-season.json`));
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
const finite = value => (Number.isFinite(value) ? value : 0);
const fgaPlays = s => s.fieldGoalsAttempted + .44 * s.freeThrowsAttempted;
const players = season.players
  .filter(p => preseasonStats ? p.gamesPlayed > 0 && p.minutesPerGame >= 10 : p.gamesPlayed >= minGames && p.minutesPerGame >= 10)
  .map(p => ({...p, slug: slugify(p.playerName), nbaId: playerIds[plain(p.playerName)] ?? null, espnId: espnIds[plain(p.playerName)] ?? null,
    code: TEAMS[teamCodeOf(p.team)] ? teamCodeOf(p.team) : null,
    ts: finite(p.stats.points / (2 * fgaPlays(p.stats)) * 100), tov: finite(p.stats.turnovers / (fgaPlays(p.stats) + p.stats.turnovers) * 100)}))
  .sort((a, b) => b.stats.points - a.stats.points);
const bySlug = new Map(players.map(p => [p.slug, p]));
const teams = Object.entries(TEAMS).map(([code, info]) => {
  const row = teamData.find(t => teamCodeOf(t.team) === code);
  return {code, ...info, slug: slugify(info.name), stats: row?.stats, roster: fs.existsSync(path.join(root, `public/data/2026-27/rosters/${code}.json`)) ? read(`public/data/2026-27/rosters/${code}.json`) : null};
}).filter(team => team.stats);

/* ---------- html ---------- */
/* ---------- box scores from Postgres ----------
   scripts/sync-espn-db.mjs keeps finished games in Neon. Without DATABASE_URL (or if the query fails) the game pages and
   game logs are simply left out, so the build still works. */
try { process.loadEnvFile?.('.env.local'); } catch { /* no local env file: Vercel and CI set DATABASE_URL themselves */ }
async function loadDb() {
  if (!process.env.DATABASE_URL) { console.warn('prerender: no DATABASE_URL, skipping game pages'); return null; }
  try {
    const sql = neon(process.env.DATABASE_URL);
    const [games, lines] = await Promise.all([
      sql`select id, season_type, played_at, away, home, away_score, home_score, venue from games where season = ${SEASONS[0]} order by played_at desc`,
      sql`select game_id, espn_player_id, team, opponent, name, starter, minutes, pts, reb, ast, stl, blk, tov, pf, fgm, fga, tpm, tpa, ftm, fta, plus_minus from player_game_stats where season = ${SEASONS[0]}`,
    ]);
    const byGame = new Map(), byPlayer = new Map();
    for (const line of lines) {
      if (!byGame.has(line.game_id)) byGame.set(line.game_id, []);
      byGame.get(line.game_id).push(line);
      if (!byPlayer.has(line.espn_player_id)) byPlayer.set(line.espn_player_id, []);
      byPlayer.get(line.espn_player_id).push(line);
    }
    return {games, byGame, byPlayer, gameById: new Map(games.map(game => [game.id, game]))};
  } catch (error) { console.warn(`prerender: box scores unavailable (${error.message}), skipping game pages`); return null; }
}
const db = await loadDb();
const dayLabel = date => new Date(date).toLocaleDateString('en-US', {month: 'short', day: 'numeric', year: 'numeric', timeZone: 'America/New_York'});
const shortDay = date => new Date(date).toLocaleDateString('en-US', {month: 'short', day: 'numeric', timeZone: 'America/New_York'});
const gameLog = p => {
  const lines = (p.espnId && db?.byPlayer.get(String(p.espnId))) || [];
  const rows = lines.map(line => ({line, game: db.gameById.get(line.game_id)})).filter(row => row.game).sort((x, y) => new Date(y.game.played_at) - new Date(x.game.played_at)).slice(0, 10);
  if (!rows.length) return '';
  const body = rows.map(({line, game}) => {
    const home = game.home === line.team, mine = home ? game.home_score : game.away_score, theirs = home ? game.away_score : game.home_score;
    return [link(gameUrl(game.away, game.home, game.id), shortDay(game.played_at)), esc(`${home ? 'vs' : '@'} ${TEAMS[line.opponent]?.name ?? line.opponent}`), esc(`${mine > theirs ? 'W' : 'L'} ${mine}-${theirs}`), line.minutes, line.pts, line.reb, line.ast];
  });
  return `<h2>${esc(p.playerName)} game log, ${pretty(SEASONS[0])}</h2>${table(['Date', 'Opponent', 'Result', 'MIN', 'PTS', 'REB', 'AST'], body, `${p.playerName} last ${rows.length} games`)}`;
};
const pages = {};
const written = [];
function writePage({route, title, description, body, jsonLd, og}) {
  pages[route] = {title, description, body, jsonLd: jsonLd ?? null, og: og ?? null};
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
/* Once the regular season takes over, people still search for preseason stats, so player pages keep a preseason section. */
const preseasonBySlug = new Map(!preseasonStats && seasonKey === SEASONS[0] && preseasonRows ? preseasonRows.players.filter(q => q.gamesPlayed > 0).map(q => [slugify(q.playerName), {...q, ts: finite(q.stats.points / (2 * fgaPlays(q.stats)) * 100), tov: finite(q.stats.turnovers / (fgaPlays(q.stats) + q.stats.turnovers) * 100)}]) : []);
const statsLabel = preseasonStats ? 'preseason stats' : 'stats';

const PLAYER_ROWS = [['GP', p => p.gamesPlayed, 0], ['MPG', p => p.minutesPerGame], ['PPG', p => p.stats.points], ['RPG', p => p.stats.totalRebounds], ['APG', p => p.stats.assists], ['SPG', p => p.stats.steals], ['BPG', p => p.stats.blocks], ['FG%', p => p.stats.fieldGoalPercentage], ['3P%', p => p.stats.threePointPercentage], ['FT%', p => p.stats.freeThrowPercentage], ['TS%', p => p.ts], ['TOV%', p => p.tov]];
const TEAM_ROWS = [['PPG', t => t.stats.points], ['APG', t => t.stats.assists], ['RPG', t => t.stats.totalRebounds], ['SPG', t => t.stats.steals], ['BPG', t => t.stats.blocks], ['FG%', t => t.stats.fieldGoalPercentage], ['3P%', t => t.stats.threePointPercentage], ['3PM', t => t.stats.threePointersMade], ['FT%', t => t.stats.freeThrowPercentage], ['eFG%', t => t.stats.effectiveFieldGoalPercentage]];
const cell = (rows, a, b) => rows.map(([label, get, places]) => [esc(label), fixed(get(a), places ?? 1), fixed(get(b), places ?? 1)]);

const statLine = p => `${fixed(p.stats.points)} PPG · ${fixed(p.stats.totalRebounds)} RPG · ${fixed(p.stats.assists)} APG`;

/* ---------- pages ---------- */

const cap = items => items.slice(0, LIMIT);
/* Pairs that already earn impressions must not vanish when the top 40 shifts: scripts/seo-keep-players.json holds players that stay in the pool. */
const keepSlugs = new Set(read('scripts/seo-keep-players.json'));
const topPlayers = [...new Map([...players.slice(0, TOP_PLAYERS_FOR_PAIRS), ...players.filter(p => keepSlugs.has(slugify(p.playerName)))].map(p => [p.playerId ?? p.playerName, p])).values()];
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
const ORG_ID = `${SITE}/#organization`, WEB_ID = `${SITE}/#website`;
const organization = {'@context': 'https://schema.org', '@type': 'Organization', '@id': ORG_ID, name: 'StatsPads', url: SITE, logo: {'@type': 'ImageObject', url: `${SITE}/icon-512.png`, width: 512, height: 512}, image: `${SITE}/og-default.jpg`, email: 'support@statspads.com', description: 'An independent NBA stats site: player and team comparisons, league leaders, standings and expected starting lineups.'};
const website = {'@context': 'https://schema.org', '@type': 'WebSite', '@id': WEB_ID, name: 'StatsPads', alternateName: 'Stats Pads', url: SITE, description: 'NBA player and team comparisons, rosters and stats.', inLanguage: 'en-US', publisher: {'@id': ORG_ID}};
/* A page's own record: when its numbers were last refreshed, and the site it belongs to. */
const webPage = (route, name, description, extra = {}) => ({'@context': 'https://schema.org', '@type': 'WebPage', '@id': `${SITE}${route}#webpage`, url: SITE + route, name, description, inLanguage: 'en-US', isPartOf: {'@id': WEB_ID}, publisher: {'@id': ORG_ID}, dateModified: season.lastUpdated, ...extra});

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
    jsonLd: [crumbs(['Home', '/'], ['Leaders', '/stats/points'], [`${entry.label} leaders`, statUrl(entry.slug)]), webPage(statUrl(entry.slug), `NBA ${lower} leaders ${yearLabel}`, `Top 25 NBA players in ${lower} (${entry.unit}) for ${yearLabel}.`),
      {'@context': 'https://schema.org', '@type': 'ItemList', name: `NBA ${lower} leaders, ${yearLabel}`, itemListOrder: 'https://schema.org/ItemListOrderDescending', numberOfItems: ranked.length, itemListElement: ranked.map((p, index) => ({'@type': 'ListItem', position: index + 1, name: p.playerName, url: SITE + playerUrl(p.playerName)}))}],
    body: `<main class="seo"><h1>NBA ${esc(lower)} leaders, ${yearLabel}</h1><p>The top 25 NBA players in ${esc(lower)} (${entry.unit}) for ${yearLabel}${entry.min ? `, among players with at least ${entry.min[1]} ${entry.min[0].replace(/([A-Z])/g, ' $1').toLowerCase()} per game` : ''}.</p>${table(['Rank', 'Player', 'Team', 'GP', entry.unit], ranked.map((p, index) => [index + 1, link(playerUrl(p.playerName), p.playerName), p.code ? esc(TEAMS[p.code].name) : '', p.gamesPlayed, fixed(p.stats[entry.key])]), `NBA ${lower} leaders, ${yearLabel}`)}<p>${link('/leaders', 'All stat leaders')} · ${LEADERS.filter(other => other.slug !== entry.slug).map(other => link(statUrl(other.slug), `${other.label} leaders`)).join(' · ')}</p></main>`});
}
writePage({route: '/performances', title: 'Top recent NBA performances | StatsPads', description: 'The best individual NBA game lines from the last few nights, ranked by game score, with points, rebounds and assists for each.', jsonLd: [crumbs(['Home', '/'], ['Performances', '/performances'])],
  body: `<main class="seo"><h1>Top recent NBA performances</h1><p>The best individual NBA game lines from the last few nights, ranked by game score (a single number that combines scoring, rebounding, assists, steals, blocks, shooting efficiency and turnovers). Each line shows the player, the opponent, the final score and a share card you can send to a friend.</p><p>Game score is John Hollinger's one-number box-score rating. It rewards points, made shots, offensive and defensive rebounds, assists, steals and blocks, and it subtracts missed shots, missed free throws, turnovers and fouls. Because it counts efficiency as well as volume, a quiet 28-point night on 70 percent shooting can rank above a 35-point night that took 35 shots. Only finished regular-season games count, one line per player, so a single big night does not fill the list. The list refreshes as games finish, usually within minutes of the final buzzer, and the share card for each line carries the player's photo, the box-score numbers and a link back to the full game page. Use it to catch up on the games you missed, find a player worth following, or settle an argument about who had the better night.</p><p>${link('/leaders', 'Season stat leaders')} · ${link('/schedule', 'Schedule and results')} · ${link('/standings', 'Standings')} · ${link('/lineups', 'Starting lineups for all 30 teams')}</p></main>`});
/* Every team's expected starting five, for the /lineups page (the "NBA starting lineups" search) and public/lineups.json. */
const lineupRows = teams.map(team => {
  const five = (team.roster?.players ?? []).filter(p => p.unit === 'starters');
  return five.length ? `<h2>${link(teamUrl(team.code), `${team.name} starting lineup`)}</h2><ol>${five.map(p => `<li>${esc(p.slot)} ${bySlug.get(slugify(p.name)) ? link(playerUrl(p.name), p.name) : esc(p.name)}</li>`).join('')}</ol>` : '';
}).join('');
fs.writeFileSync(path.join(publicDir, 'lineups.json'), JSON.stringify({updated: season.lastUpdated, teams: Object.fromEntries(teams.map(team => [team.code, (team.roster?.players ?? []).filter(p => p.unit === 'starters').map(p => [p.slot, p.name])]))}));
/* MVP and Rookie of the Year ladders as full pages, from ladders.json (scripts/build-regular-box-stats.mjs). */
const ladders = (() => { try { return read(`public/data/${SEASONS[0]}/ladders.json`); } catch { return null; } })();
for (const [slug, key, name] of [['mvp', 'mvp', 'MVP'], ['roty', 'rookie', 'Rookie of the Year']]) {
  const rows = ladders?.[key];
  if (!rows?.length) continue;
  const route = `/ladders/${slug}`, through = new Date(`${ladders.through}T12:00:00Z`).toLocaleDateString('en-US', {month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC'});
  const lead = rows.slice(0, 3).map(row => row.name);
  const moved = row => row.move === undefined ? '' : row.move === null ? 'new on the ladder' : row.move === 0 ? 'no change' : `${row.move > 0 ? 'up' : 'down'} ${Math.abs(row.move)}`;
  const method = key === 'mvp' ? 'Players are ranked on per-game game score (a linear mix of the box score), adjusted for how many games they have played, plus a small credit for their team\u2019s record that grows as the season fills in.' : 'Rookies are ranked on the same per-game game score. They need a rotation role and most of their team\u2019s games, and team record is not counted.';
  const items = rows.map(row => ({...row, teamName: TEAMS[row.team]?.name ?? row.team, url: bySlug.get(slugify(row.name)) ? playerUrl(row.name) : null, moved: moved(row)}));
  writePage({route, jsonLd: [crumbs(['Home', '/'], [`${name} ladder`, route]), webPage(route, `NBA ${name} ladder ${pretty(SEASONS[0])}`, `${name} ladder through ${through}: ${lead.join(', ')}.`), {'@context': 'https://schema.org', '@type': 'ItemList', name: `NBA ${name} ladder ${pretty(SEASONS[0])}`, itemListOrder: 'https://schema.org/ItemListOrderAscending', numberOfItems: rows.length, itemListElement: items.map((row, index) => ({'@type': 'ListItem', position: index + 1, name: row.name, ...(row.url ? {url: SITE + row.url} : {})}))}],
    title: fitTitle(`NBA ${name} ladder ${pretty(SEASONS[0])}: top ${rows.length} | StatsPads`, `NBA ${name} ladder ${pretty(SEASONS[0])}`),
    description: fitDescription(`NBA ${name} ladder through ${through}: ${lead.join(', ')} lead. Top ${rows.length} players ranked on per-game stats, with each player\u2019s move since the night before.`, `NBA ${name} ladder through ${through}: ${lead.slice(0, 2).join(' and ')} lead the top ${rows.length}, ranked on per-game stats with each player\u2019s move.`),
    body: `<main class="seo"><h1>NBA ${esc(name)} ladder, ${pretty(SEASONS[0])}</h1><p>The ${esc(name)} ladder through ${esc(through)}. ${esc(method)}</p><h2>${esc(name)} ladder: top ${rows.length}</h2><ol>${items.map(row => `<li>${row.url ? link(row.url, row.name) : esc(row.name)}, ${esc(row.teamName)}: ${row.pts} points, ${row.reb} rebounds, ${row.ast} assists in ${row.games} games${row.moved ? ` (${row.moved})` : ''}</li>`).join('')}</ol><p>${link('/ladders/mvp', 'MVP ladder')} · ${link('/ladders/roty', 'Rookie of the Year ladder')} · ${link('/stats/points', 'Stat leaders')} · ${link('/performances', 'Top performances')}</p></main>`});
  pages[route].ladder = {name, key, through: ladders.through, method, rows: items};
}
/* ---------- /scores: results of the latest game nights, built from the schedule file so it needs no database ---------- */
{
  const rows = (() => { try { return read(`public/data/${SEASONS[0]}/schedule.json`); } catch { return []; } })();
  const games = rows.map(([id, date, away, home, , , state, awayScore, homeScore, pre]) => ({id, date, away, home, state, awayScore, homeScore, preseason: pre === 1})).filter(g => TEAMS[g.away] && TEAMS[g.home]);
  const done = games.filter(g => g.state === 'post' && Number.isFinite(g.awayScore) && Number.isFinite(g.homeScore));
  const regular = done.filter(g => !g.preseason), pool = regular.length ? regular : done;
  const easternDay = date => new Date(date).toLocaleDateString('en-CA', {timeZone: 'America/New_York'});
  const dayNames = [...new Set(pool.map(g => easternDay(g.date)))].sort().reverse().slice(0, 5);
  const shape = g => ({url: gameUrl(g.away, g.home, g.id), away: TEAMS[g.away].name, home: TEAMS[g.home].name, awayCode: g.away, homeCode: g.home, awayScore: g.awayScore, homeScore: g.homeScore});
  const days = dayNames.map(day => ({day, label: new Date(`${day}T12:00:00Z`).toLocaleDateString('en-US', {weekday: 'long', month: 'long', day: 'numeric', timeZone: 'UTC'}), games: pool.filter(g => easternDay(g.date) === day).sort((x, y) => x.date.localeCompare(y.date)).map(shape)}));
  if (days.length) {
    const latest = days[0], top = latest.games.slice(0, 3).map(g => `${g.awayScore > g.homeScore ? g.away : g.home} beat ${g.awayScore > g.homeScore ? g.home : g.away} ${Math.max(g.awayScore, g.homeScore)}-${Math.min(g.awayScore, g.homeScore)}`);
    const line = g => `${g.away} ${g.awayScore}, ${g.home} ${g.homeScore}`;
    writePage({route: '/scores', jsonLd: [crumbs(['Home', '/'], ['Scores', '/scores']), webPage('/scores', 'NBA scores and results', `NBA final scores from ${latest.label}.`)],
      title: 'NBA scores: last night\u2019s final scores | StatsPads',
      description: fitDescription(`NBA scores and final results from ${latest.label}: ${top.join('; ')}. Box scores and player stats for every game.`, `NBA scores and final results from ${latest.label}, with a box score and player stats for every game.`),
      body: `<main class="seo"><h1>NBA scores and results</h1><p>Final scores from the latest game nights. Open a game for the full box score and every player\u2019s stats.</p>${days.map(d => `<h2>NBA scores, ${esc(d.label)}</h2><ul>${d.games.map(g => `<li>${link(g.url, line(g))}</li>`).join('')}</ul>`).join('')}<p>${link('/schedule', 'Full schedule')} \u00b7 ${link('/standings', 'Standings')} \u00b7 ${link('/performances', 'Top performances')} \u00b7 ${link('/lineups', 'Lineups')}</p></main>`});
    pages['/scores'].scores = {days};
  }
}
writePage({route: '/schedule', title: 'NBA schedule 2026-27: every game and TV time | StatsPads', description: 'The full 2026-27 NBA schedule: every game with times in your timezone, TV channel and scores. Filter by team or find when two teams meet.', jsonLd: [crumbs(['Home', '/'], ['Schedule', '/schedule'])],
  body: `<main class="seo"><h1>NBA schedule 2026–27</h1><p>Every regular-season game with start times in your timezone, TV and arena. Pick a team, or two, to see when they play each other, like Lakers vs Celtics or 76ers vs Knicks.</p><p>Each of the 30 teams plays 82 regular-season games, 1,230 in all, split between 41 home games and 41 on the road. Every team meets the other 14 teams in its own conference three or four times and each team in the other conference twice, once at home and once away. Finished games link to a full box score with a shot chart and a game-flow chart, and upcoming games show the expected starters for both teams.</p><h2>Teams</h2>${teamList}</main>`});
writePage({route: '/standings', title: 'NBA standings 2026-27: East and West | StatsPads', description: 'Current NBA standings for 2026-27: Eastern and Western conference seeds, records, games behind, home and road records, last ten and streaks.', jsonLd: [crumbs(['Home', '/'], ['Standings', '/standings'])],
  body: `<main class="seo"><h1>NBA standings 2026–27</h1><p>Eastern and Western conference standings: seeds 1–6 go to the playoffs and 7–10 to the play-in. Each row shows wins, losses, win percentage, games behind, home and road records, last ten games, streak and scoring.</p><p>Each conference has 15 teams and the table is ordered by record. The top six seeds in each conference qualify for the playoffs directly, while seeds 7 to 10 enter the play-in tournament for the last two spots. Games behind shows how far a team trails the conference leader, and the last-ten column is a quick read on current form. Open any team to see its roster, expected starting five and per-game stats.</p><h2>Teams</h2>${teamList}</main>`});
writePage({route: '/lineups', title: fitTitle(`NBA lineups and starting lineups ${pretty(seasonKey).replace('–', '-')} | StatsPads`, `NBA starting lineups ${pretty(seasonKey).replace('–', '-')}: every team`), description: fitDescription('NBA lineups for all 30 teams: the expected starting lineup, bench rotation and depth chart by position, with each roster and ' + statsWord + ' per-game stats, updated daily.', 'NBA lineups for all 30 teams: starting lineup, bench rotation and depth chart by position, with ' + statsWord + ' per-game stats.'), jsonLd: [crumbs(['Home', '/'], ['Lineups', '/lineups'])],
  body: `<main class="seo"><h1>NBA lineups: starting lineups and depth charts for every team, ${pretty(seasonKey)}</h1><p>The expected starting five for each of the 30 NBA teams: the lineup each team has used most recently or most often, not an official announcement. Starters change with injuries, rest days and trades. Open a team for its bench rotation, roster, ${statsWord} per-game stats and recent results, and to follow it for game alerts.</p>${lineupRows}${table(['Team', 'PPG', 'APG', 'RPG'], [...teams].sort((x, y) => x.name.localeCompare(y.name)).map(team => [link(teamUrl(team.code), team.name), fixed(team.stats.points), fixed(team.stats.assists), fixed(team.stats.totalRebounds)]), `NBA team per-game stats, ${yearLabel}`)}</main>`});

for (const p of cap(players)) {
  const related = pairs.filter(pair => pair.includes(p)).slice(0, 4).map(([x, y]) => `<li>${link(compareUrl([x.playerName, y.playerName]), `${x.playerName} vs ${y.playerName}`)}</li>`).join('');
  const route = playerUrl(p.playerName), personId = `${SITE}${route}#player`;
  const photo = p.espnId ? `https://a.espncdn.com/i/headshots/nba/players/full/${p.espnId}.png` : p.nbaId ? `https://cdn.nba.com/headshots/nba/latest/1040x760/${p.nbaId}.png` : null;
  const pre = preseasonBySlug.get(p.slug);
  const [first, ...rest] = plain(p.playerName).split(' ');
  writePage({route, og: {type: 'profile', fields: {firstName: first, lastName: rest.join(' ') || first}},
    jsonLd: [crumbs(['Home', '/'], ['Players', '/stats/points'], [p.playerName, route]),
      webPage(route, `${p.playerName} stats ${yearLabel}`, `${p.playerName} ${yearLabel} NBA stats: ${statLine(p)}.`, {mainEntity: {'@id': personId}}),
      {'@context': 'https://schema.org', '@type': 'Person', '@id': personId, name: p.playerName, jobTitle: `Basketball player${p.position ? ` (${p.position})` : ''}`, description: `${p.playerName} averaged ${statLine(p)} in ${p.gamesPlayed} games in ${yearLabel}.`, url: SITE + route, mainEntityOfPage: {'@id': `${SITE}${route}#webpage`}, ...(photo ? {image: photo} : {}), ...(p.code ? {affiliation: {'@type': 'SportsTeam', name: TEAMS[p.code].name, sport: 'Basketball', url: SITE + teamUrl(p.code)}} : {})}],
    title: fitTitle(...(pre ? [`${p.playerName}: regular season & preseason stats ${pretty(seasonKey)} | StatsPads`, `${p.playerName} regular season & preseason stats ${pretty(seasonKey)}`, `${p.playerName} preseason & regular stats ${pretty(seasonKey)}`] : []), `${p.playerName} ${statsLabel} ${pretty(seasonKey)}: ${fixed(p.stats.points)} PPG, ${fixed(p.stats.totalRebounds)} RPG, ${fixed(p.stats.assists)} APG | StatsPads`, `${p.playerName} ${statsLabel} ${pretty(seasonKey)}: ${fixed(p.stats.points)} PPG, ${fixed(p.stats.totalRebounds)} RPG, ${fixed(p.stats.assists)} APG`, `${p.playerName} ${statsLabel} ${pretty(seasonKey)}: ${fixed(p.stats.points)} PPG, ${fixed(p.stats.totalRebounds)} RPG`, `${p.playerName} ${statsLabel} ${pretty(seasonKey)}`),
    description: fitDescription(`${p.playerName} ${yearLabel} NBA stats: ${statLine(p)}, ${fixed(p.stats.fieldGoalPercentage)}% FG, ${fixed(p.stats.threePointPercentage)}% 3P, ${fixed(p.ts)}% TS in ${p.gamesPlayed} games. Compare ${p.playerName} with any player.`, `${p.playerName} ${yearLabel} NBA stats: ${statLine(p)}, ${fixed(p.stats.fieldGoalPercentage)}% FG, ${fixed(p.stats.threePointPercentage)}% 3P in ${p.gamesPlayed} games.`),
    body: `<main class="seo"><h1>${esc(p.playerName)} stats, ${yearLabel}</h1>${updated()}${copy.playerProfile(p)}${copy.playerRankings(p)}${table(['Stat', 'Per game'], PLAYER_ROWS.map(([label, get, places]) => [esc(label), fixed(get(p), places ?? 1)]), `${p.playerName} per-game stats, ${yearLabel}`)}${p.code ? `<p>${link(teamUrl(p.code), `${TEAMS[p.code].name} roster`)}</p>` : ''}${pre ? `<h2>${esc(p.playerName)} preseason stats, ${pretty(seasonKey)}</h2><p>${esc(p.playerName)} averaged ${statLine(pre)} in ${pre.gamesPlayed} preseason games.</p>${table(['Stat', 'Preseason per game'], PLAYER_ROWS.map(([label, get, places]) => [esc(label), fixed(get(pre), places ?? 1)]), `${p.playerName} preseason per-game stats, ${pretty(seasonKey)}`)}` : ''}${gameLog(p)}${careerHtml(p)}${copy.teammates(p)}${copy.neighbours(p)}${related ? `<h2>Compare</h2><ul>${related}</ul>` : ''}</main>`});
}
/* Players who only have preseason games keep a page after the regular season takes over, so the preseason searches still land somewhere. */
for (const q of cap([...preseasonBySlug.values()].filter(q => q.minutesPerGame >= 10 && !bySlug.has(slugify(q.playerName))))) {
  const route = playerUrl(q.playerName), name = q.playerName, code = TEAMS[teamCodeOf(q.team)] ? teamCodeOf(q.team) : null;
  const [first, ...rest] = plain(name).split(' ');
  writePage({route, og: {type: 'profile', fields: {firstName: first, lastName: rest.join(' ') || first}},
    jsonLd: [crumbs(['Home', '/'], ['Players', '/stats/points'], [name, route]), webPage(route, `${name} preseason stats ${pretty(seasonKey)}`, `${name} ${pretty(seasonKey)} preseason NBA stats: ${statLine(q)}.`)],
    title: fitTitle(`${name} preseason stats ${pretty(seasonKey)}: ${fixed(q.stats.points)} PPG, ${fixed(q.stats.totalRebounds)} RPG, ${fixed(q.stats.assists)} APG | StatsPads`, `${name} preseason stats ${pretty(seasonKey)}: ${fixed(q.stats.points)} PPG, ${fixed(q.stats.totalRebounds)} RPG`, `${name} preseason stats ${pretty(seasonKey)}`),
    description: fitDescription(`${name} ${pretty(seasonKey)} preseason NBA stats: ${statLine(q)}, ${fixed(q.stats.fieldGoalPercentage)}% FG, ${fixed(q.stats.threePointPercentage)}% 3P in ${q.gamesPlayed} games. Compare ${name} with any player.`, `${name} ${pretty(seasonKey)} preseason NBA stats: ${statLine(q)} in ${q.gamesPlayed} games.`),
    body: `<main class="seo"><h1>${esc(name)} preseason stats, ${pretty(seasonKey)}</h1><p>${esc(name)} averaged ${statLine(q)} in ${q.gamesPlayed} preseason games${code ? ` for the ${esc(TEAMS[code].name)}` : ''}.</p>${table(['Stat', 'Preseason per game'], PLAYER_ROWS.map(([label, get, places]) => [esc(label), fixed(get(q), places ?? 1)]), `${name} preseason per-game stats, ${pretty(seasonKey)}`)}${code ? `<p>${link(teamUrl(code), `${TEAMS[code].name} roster`)}</p>` : ''}</main>`});
}
for (const team of cap(teams)) {
  const roster = team.roster?.players ?? [];
  const slug = name => bySlug.get(slugify(name));
  const line = player => slug(player.name) ? link(playerUrl(player.name), player.name) : esc(player.name);
  const starters = roster.filter(p => p.unit === 'starters');
  /* After the regular season takes over, "preseason starting lineup" is still searched: keep a preseason section, written into the HTML. */
  const preTeam = !preseasonStats && preseasonTeams?.players.find(t => t.team === team.code && t.gamesPlayed > 0);
  const prePlayers = preTeam ? preseasonRows.players.filter(q => q.team === team.code && q.gamesPlayed > 0) : [];
  const preFive = [...prePlayers].sort((x, y) => y.gamesStarted - x.gamesStarted || y.minutesPerGame - x.minutesPerGame).slice(0, 5);
  const preSection = preTeam ? `<h2>${esc(team.name)} preseason ${pretty(SEASONS[0])}: starting five and stats</h2><p>The ${esc(team.name)} played ${preTeam.gamesPlayed} preseason ${preTeam.gamesPlayed === 1 ? 'game' : 'games'}, averaging ${fixed(preTeam.stats.points)} points, ${fixed(preTeam.stats.totalRebounds)} rebounds and ${fixed(preTeam.stats.assists)} assists. ${preFive.length ? `Their preseason starting five, by games started, was ${preFive.map(q => slug(q.playerName) ? link(playerUrl(q.playerName), q.playerName) : esc(q.playerName)).join(', ')}.` : ''}</p>${table(['Player', 'GP', 'GS', 'MIN', 'PTS', 'REB', 'AST'], [...prePlayers].sort((x, y) => y.stats.points - x.stats.points).slice(0, 10).map(q => [slug(q.playerName) ? link(playerUrl(q.playerName), q.playerName) : esc(q.playerName), q.gamesPlayed, q.gamesStarted, fixed(q.minutesPerGame), fixed(q.stats.points), fixed(q.stats.totalRebounds), fixed(q.stats.assists)]), `${team.name} preseason per-game stats`)}` : '';
  const route = teamUrl(team.code), teamId = `${SITE}${route}#team`;
  writePage({route, jsonLd: [crumbs(['Home', '/'], ['Lineups', '/lineups'], [team.name, route]),
      webPage(route, `${team.name} starting lineup 2026–27`, `${team.name} expected starting five, bench rotation, roster and per-game stats.`, {mainEntity: {'@id': teamId}}),
      {'@context': 'https://schema.org', '@type': 'SportsTeam', '@id': teamId, name: team.name, sport: 'Basketball', url: SITE + route, logo: `https://cdn.nba.com/logos/nba/${team.id}/global/L/logo.svg`, memberOf: {'@type': 'SportsOrganization', name: 'NBA'}, mainEntityOfPage: {'@id': `${SITE}${route}#webpage`},
        ...(roster.length ? {athlete: roster.slice(0, 20).map(player => ({'@type': 'Person', name: player.name, ...(slug(player.name) ? {url: SITE + playerUrl(player.name)} : {})}))} : {})}],
    title: fitTitle(`${team.name} starting lineup 2026–27 | StatsPads`, `${team.name} starting lineup 2026–27`),
    description: fitDescription(`${team.name} starting lineup for 2026–27${starters.length ? `: ${starters.map(p => p.name).join(', ')}` : ''}. Bench rotation, depth chart, roster, ${statsWord} per-game stats and recent results.`, `${team.name} starting lineup for 2026–27, bench rotation, depth chart, roster, ${statsWord} per-game stats and recent results.`),
    body: `<main class="seo"><h1>${esc(team.name)} starting lineup, 2026–27</h1>${updated()}${starters.length ? `<p>The ${esc(team.name)} starting five is ${starters.map(p => esc(p.name)).join(', ')}${team.roster?.coach ? `, coached by ${esc(team.roster.coach)}` : ''}. This is the lineup the team has used most recently or most often, not an official announcement; starters change with injuries, rest days and trades.</p>` : ''}${starters.length ? (team.roster.units ?? []).map(unit => { const group = roster.filter(p => p.unit === unit.key && unit.key !== 'camp'); return group.length ? `<h2>${esc(unit.key === 'starters' ? 'Expected starting five' : unit.label)}</h2><ol>${group.map(p => `<li>${esc(p.slot ?? p.pos)} ${line(p)}</li>`).join('')}</ol>` : ''; }).join('') : ''}${copy.teamProfile(team)}${copy.teamRankings(team)}${preSection}${roster.length ? `<h2>Full roster</h2><ul>${roster.map(p => `<li>${line(p)}</li>`).join('')}</ul>` : ''}<h2>${yearLabel} team stats</h2>${table(['Stat', 'Per game'], TEAM_ROWS.map(([label, get]) => [esc(label), fixed(get(team))]), `${team.name} per-game stats, ${yearLabel}`)}</main>`});
}
/* Three questions people ask about a pairing, answered from the numbers. Marked up as FAQPage so search and AI answers can quote them. */
const moreOf = (a, b, get, unit) => {
  const x = get(a), y = get(b);
  const text = `${a.playerName} averages ${fixed(x)} ${unit} and ${b.playerName} averages ${fixed(y)} ${unit} in ${yearLabel}`;
  return Math.abs(x - y) < 0.05 ? `${text}, so they are level.` : `${text}, so ${(x > y ? a : b).playerName} has the higher number.`;
};
const betterOf = (a, b) => {
  const picks = [['points', p => p.stats.points], ['rebounds', p => p.stats.totalRebounds], ['assists', p => p.stats.assists], ['steals', p => p.stats.steals], ['true shooting', p => p.ts]];
  const wins = picks.filter(([, get]) => get(a) > get(b)), losses = picks.filter(([, get]) => get(b) > get(a));
  if (wins.length === losses.length) return `${a.playerName} and ${b.playerName} are even in ${yearLabel} per-game numbers: each leads in ${wins.length} of five categories (points, rebounds, assists, steals and true shooting).`;
  const [lead, lagged, leads] = wins.length > losses.length ? [a, b, wins] : [b, a, losses];
  return `On ${yearLabel} per-game numbers ${lead.playerName} is ahead of ${lagged.playerName}, leading in ${leads.length} of five categories (${leads.map(([name]) => name).join(', ')}). This is a small sample early in the season, and role and minutes matter as much as the averages.`;
};
const faqFor = (a, b) => [
  [`Who is better, ${a.playerName} or ${b.playerName}?`, betterOf(a, b)],
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
    title: fitTitle(`${a.playerName} vs ${b.playerName}: who is better? ${pretty(seasonKey).replace('–', '-')}${preseasonStats ? " preseason" : ""} stats | StatsPads`, `${a.playerName} vs ${b.playerName}: who is better? | StatsPads`, `${a.playerName} vs ${b.playerName}: who is better?`, `${a.playerName} vs ${b.playerName}: ${pretty(seasonKey)}${preseasonStats ? " preseason" : ""} stats | StatsPads`, `${a.playerName} vs ${b.playerName}: ${pretty(seasonKey)}${preseasonStats ? " preseason" : ""} stats`, `${a.playerName} vs ${b.playerName} stats`),
    description: fitDescription(`${a.playerName} vs ${b.playerName} ${yearLabel} stats side by side: ${fixed(a.stats.points)} vs ${fixed(b.stats.points)} PPG, ${fixed(a.stats.totalRebounds)} vs ${fixed(b.stats.totalRebounds)} RPG, ${fixed(a.stats.assists)} vs ${fixed(b.stats.assists)} APG, with a skill radar.`, `${a.playerName} vs ${b.playerName} stats: ${fixed(a.stats.points)} vs ${fixed(b.stats.points)} PPG, ${fixed(a.stats.totalRebounds)} vs ${fixed(b.stats.totalRebounds)} RPG, ${fixed(a.stats.assists)} vs ${fixed(b.stats.assists)} APG, with a skill radar.`),
    body: `<main class="seo"><h1>${esc(a.playerName)} vs ${esc(b.playerName)}: ${yearLabel} stats</h1><p>${esc(a.playerName)} averaged ${esc(statLine(a))}. ${esc(b.playerName)} averaged ${esc(statLine(b))}.</p>${updated()}${copy.playerComparison(a, b)}${copy.comparisonRankings(a, b)}${table(['Stat', a.playerName, b.playerName], cell(PLAYER_ROWS, a, b))}<p>${link(playerUrl(a.playerName), `${a.playerName} stats`)} · ${link(playerUrl(b.playerName), `${b.playerName} stats`)}${a.code ? ` · ${link(teamUrl(a.code), `${TEAMS[a.code].name} roster`)}` : ''}${b.code && b.code !== a.code ? ` · ${link(teamUrl(b.code), `${TEAMS[b.code].name} roster`)}` : ''}</p>${faqHtml(faq)}${copy.moreComparisons(a, b)}</main>`});
}
for (const [a, b] of cap(teamPairs)) {
  writePage({route: compareUrl([a.name, b.name]), title: fitTitle(`${a.name} vs ${b.name}: ${pretty(seasonKey)} team stats | StatsPads`, `${a.name} vs ${b.name}: ${pretty(seasonKey)} team stats`, `${a.name} vs ${b.name} team stats`),
    description: fitDescription(`${a.name} vs ${b.name} ${yearLabel} team stats side by side: ${fixed(a.stats.points)} vs ${fixed(b.stats.points)} PPG, ${fixed(a.stats.assists)} vs ${fixed(b.stats.assists)} APG, ${fixed(a.stats.totalRebounds)} vs ${fixed(b.stats.totalRebounds)} RPG, with a skill radar and the expected starting fives.`, `${a.name} vs ${b.name} team stats: ${fixed(a.stats.points)} vs ${fixed(b.stats.points)} PPG, ${fixed(a.stats.assists)} vs ${fixed(b.stats.assists)} APG, ${fixed(a.stats.totalRebounds)} vs ${fixed(b.stats.totalRebounds)} RPG, with a skill radar.`),
    body: `<main class="seo"><h1>${esc(a.name)} vs ${esc(b.name)}: ${yearLabel} team stats</h1>${updated()}${copy.teamComparison(a, b, starterNames)}${copy.teamComparisonRankings(a, b)}${table(['Stat', a.name, b.name], cell(TEAM_ROWS, a, b))}<p>${link(teamUrl(a.code), `${a.name} roster`)} · ${link(teamUrl(b.code), `${b.name} roster`)}</p></main>`});
}

/* One page per finished game: score, box score and a "player vs opponent" line for each team's top scorers. They live in games.json, apart from pages.json, which keeps the other routes' bundle small. */
const gamePages = {}, gameRedirects = {};
for (const game of cap(db?.games ?? [])) {
  const lines = (db.byGame.get(game.id) ?? []).sort((x, y) => Number(y.starter) - Number(x.starter) || y.minutes - x.minutes);
  const away = TEAMS[game.away], home = TEAMS[game.home];
  if (!away || !home || !lines.length) continue;
  const route = gameUrl(game.away, game.home, game.id);
  gameRedirects[game.id] = route;
  const day = dayLabel(game.played_at), kind = game.season_type === 'preseason' ? 'preseason' : game.season_type === 'playoffs' ? 'playoff' : 'regular-season';
  const winner = game.home_score > game.away_score ? home : away, loser = winner === home ? away : home;
  const [winScore, loseScore] = [Math.max(game.home_score, game.away_score), Math.min(game.home_score, game.away_score)];
  const sides = [[game.away, away], [game.home, home]].map(([code, team]) => ({code, team, lines: lines.filter(line => line.team === code), top: [...lines.filter(line => line.team === code)].sort((x, y) => y.pts - x.pts || y.minutes - x.minutes)}));
  const who = line => bySlug.get(slugify(line.name)) ? link(playerUrl(line.name), line.name) : esc(line.name);
  const leaders = sides.map(side => side.top[0]).filter(Boolean);
  const box = side => `<h2>${esc(side.team.name)} box score</h2>${table(['Player', 'MIN', 'PTS', 'REB', 'AST', 'STL', 'BLK', 'TO', 'FG', '3PT', 'FT', '+/-'], side.lines.map(l => [who(l), l.minutes, l.pts, l.reb, l.ast, l.stl, l.blk, l.tov, `${l.fgm}-${l.fga}`, `${l.tpm}-${l.tpa}`, `${l.ftm}-${l.fta}`, l.plus_minus > 0 ? `+${l.plus_minus}` : l.plus_minus]), `${side.team.name} box score, ${day}`)}`;
  const versus = side => side.top.slice(0, 2).map(l => {
    const rival = side === sides[0] ? sides[1] : sides[0];
    const pct = l.fga ? ` shooting ${l.fgm}-of-${l.fga} (${(l.fgm / l.fga * 100).toFixed(1)}%) from the field` : '';
    return `<h2>${esc(l.name)} vs ${esc(rival.team.name)}</h2><p>${who(l)} scored ${l.pts} points with ${l.reb} rebounds and ${l.ast} assists in ${l.minutes} minutes for the ${esc(side.team.name)} against the ${esc(rival.team.name)} on ${day},${pct}.</p>`;
  }).join('');
  const names = leaders.map(l => `${l.name} ${l.pts}`).join(', ');
  const name = `${away.name} vs ${home.name}`;
  gamePages[game.id] = {
    title: fitTitle(`${name}: match player stats, ${shortDay(game.played_at)} | StatsPads`, `${name}: match player stats, ${shortDay(game.played_at)}`, `${name}: match player stats`, `${game.away} vs ${game.home}: match player stats`),
    route,
    description: fitDescription(`${winner.name} beat ${loser.name} ${winScore}-${loseScore} on ${day}. Full box score and player stats: ${names}.`, `${winner.name} beat ${loser.name} ${winScore}-${loseScore} on ${day}. Full box score and player stats.`),
    jsonLd: [crumbs(['Home', '/'], ['Schedule', '/schedule'], [name, route]),
      {'@context': 'https://schema.org', '@type': 'SportsEvent', '@id': `${SITE}${route}#event`, name, url: SITE + route, sport: 'Basketball', startDate: new Date(game.played_at).toISOString(), eventStatus: 'https://schema.org/EventCompleted', ...(game.venue ? {location: {'@type': 'Place', name: game.venue}} : {}),
        awayTeam: {'@type': 'SportsTeam', name: away.name, url: SITE + teamUrl(game.away)}, homeTeam: {'@type': 'SportsTeam', name: home.name, url: SITE + teamUrl(game.home)}}],
    body: `<main class="seo"><h1>${esc(name)}: match player stats and box score, ${day}</h1><p>The ${esc(winner.name)} beat the ${esc(loser.name)} ${winScore}-${loseScore} in a ${kind} game on ${day}${game.venue ? ` at ${esc(game.venue)}` : ''}. ${leaders.map(l => `${who(l)} led the ${esc(TEAMS[l.team].name)} with ${l.pts} points`).join('; ')}.</p>${sides.map(box).join('')}${sides.map(versus).join('')}<p>${link(teamUrl(game.away), `${away.name} roster`)} · ${link(teamUrl(game.home), `${home.name} roster`)} · ${link(teamUrl(game.away), `${away.name} starting lineup`)} · ${link(teamUrl(game.home), `${home.name} starting lineup`)} · ${link('/schedule', 'Schedule')}</p></main>`,
  };
  written.push(route);
}

const started = Date.now();

/* ---------- sitemap and robots ---------- */
const today = new Date().toISOString().slice(0, 10);
const urls = ['/', '/compare', '/stats/points', '/lineups', '/schedule', '/standings', '/blog', ...published().map(post => `/blog/${post.slug}`), '/about', '/contact', '/terms', '/privacy', ...written.filter(route => !['/compare', '/lineups', '/stats/points'].includes(route) && !route.startsWith('/leaders'))];
fs.writeFileSync(path.join(publicDir, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${[...new Set(urls)].map(route => `  <url><loc>${SITE}${route}</loc><lastmod>${today}</lastmod></url>`).join('\n')}\n</urlset>\n`);
fs.writeFileSync(path.join(publicDir, 'llms.txt'), `# StatsPads\n\n> StatsPads (${SITE}) is a free NBA stats site: side-by-side player and team comparisons on a skill radar, league leaders, standings, the schedule, team pages with expected starting fives, and game pages with box scores. Stats come from ESPN's public feeds and are refreshed every few hours.\n\n## Main pages\n\n- [Home](${SITE}/): today's picture of the league\n- [Compare](${SITE}/compare): pick any two players or teams\n- [Stat leaders](${SITE}/leaders): top five in each major category\n- [Starting lineups and teams](${SITE}/lineups): the expected starting five, roster and stats for all 30 teams\n- [Standings](${SITE}/standings): both conferences with seeds\n- [Schedule](${SITE}/schedule): every game of the season\n- [Top performances](${SITE}/performances): the best recent individual game lines\n- [Blog](${SITE}/blog): player comparisons and stat breakdowns\n${published().map(post => `- [${post.title}](${SITE}/blog/${post.slug}): ${post.description}`).join('\n')}\n\n## Stat rankings\n\n${LEADERS.map(entry => `- [${entry.label} leaders](${SITE}${statUrl(entry.slug)})`).join('\n')}\n\n## Page patterns\n\n- Players: ${SITE}/players/{player-name}, per-game stats, league ranks, career by season\n- Teams: ${SITE}/lineups/{team-name}, roster, expected starting five, team stats\n- Comparisons: ${SITE}/compare/{a}-vs-{b}\n\nFull list of pages: ${SITE}/sitemap.xml\n`);
fs.writeFileSync(path.join(publicDir, 'robots.txt'), `User-agent: *\nAllow: /\n\nSitemap: ${SITE}/sitemap.xml\n`);
console.log(`prerender: ${written.length} pages, in ${((Date.now() - started) / 1000).toFixed(1)}s, ${players.filter(p => !p.nbaId && !p.espnId).length} of ${players.length} players without a headshot`);
fs.mkdirSync(path.dirname(manifestFile), {recursive: true});
fs.writeFileSync(manifestFile, JSON.stringify(pages));
fs.writeFileSync(path.join(root, 'src/seo/games.json'), JSON.stringify(gamePages));
fs.writeFileSync(path.join(root, 'src/seo/game-redirects.json'), JSON.stringify(gameRedirects));
