import fs from 'node:fs';
import path from 'node:path';
import satori from 'satori';
import { Resvg } from '@resvg/resvg-js';
import sharp from 'sharp';
import { TEAMS, teamCodeOf } from '../src/lib/teams.js';
import { SEASONS, pretty } from '../src/lib/season.js';
import { makeCopy } from './seo-copy.mjs';
import { bestSeason, careerOf, liveRow, seasonsOf, tsOf } from '../src/lib/career.js';
import { SITE, compareUrl, playerUrl, slugify, teamUrl } from '../src/lib/routes.js';

/* Runs before `next build`. Writes src/seo/pages.json (title, description and a
   readable stats body for every player, team and popular comparison, which the
   Next.js routes render), a share-card image for each under public/og, and the
   sitemap. React replaces the static text as soon as the app loads; search
   engines and link previews read it as is.

   SEO_LIMIT=n builds only n pages of each kind; SKIP_OG=1 skips the images. */

const root = path.resolve(import.meta.dirname, '..');
const publicDir = path.join(root, 'public');
const manifestFile = path.join(root, 'src/seo/pages.json');
const cacheDir = path.join(root, '.cache', 'og');
const LIMIT = Number(process.env.SEO_LIMIT) || Infinity;
const SKIP_OG = process.env.SKIP_OG === '1';
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
  return Boolean(players && teamRows) && (key !== SEASONS[0] || (players.players.length >= 150 && teamRows.players.length >= 30));
};
const seasonKey = SEASONS.find(settled);
if (!seasonKey) throw new Error('No season data found under public/data');
const season = read(`public/data/${seasonKey}/regular-season.json`);
const teamData = read(`public/data/${seasonKey}/teams-regular-season.json`).players;
const statsWord = seasonKey === SEASONS[0] ? 'this season’s' : 'last season’s';
/* Early in a season nobody has 15 games yet, so the cut-off grows with the schedule. */
const mostGames = Math.max(...season.players.map(p => p.gamesPlayed));
const minGames = Math.min(15, Math.max(1, Math.floor(mostGames / 2)));
const playerIds = Object.fromEntries(Object.entries(read('public/data/player-ids.json')).map(([name, id]) => [plain(name), id]));
const espnIds = {};
for (const file of fs.readdirSync(path.join(root, 'public/data/2026-27/rosters'))) for (const entry of read(`public/data/2026-27/rosters/${file}`).players) if (entry.espnId) espnIds[plain(entry.name)] = entry.espnId;
const fgaPlays = s => s.fieldGoalsAttempted + .44 * s.freeThrowsAttempted;
const players = season.players
  .filter(p => p.gamesPlayed >= minGames && p.minutesPerGame >= 10)
  .map(p => ({...p, slug: slugify(p.playerName), nbaId: playerIds[plain(p.playerName)] ?? null, espnId: espnIds[plain(p.playerName)] ?? null,
    code: TEAMS[teamCodeOf(p.team)] ? teamCodeOf(p.team) : null,
    ts: p.stats.points / (2 * fgaPlays(p.stats)) * 100, tov: p.stats.turnovers / (fgaPlays(p.stats) + p.stats.turnovers) * 100}))
  .sort((a, b) => b.stats.points - a.stats.points);
const bySlug = new Map(players.map(p => [p.slug, p]));
const teams = Object.entries(TEAMS).map(([code, info]) => {
  const row = teamData.find(t => teamCodeOf(t.team) === code);
  return {code, ...info, slug: slugify(info.name), stats: row?.stats, roster: fs.existsSync(path.join(root, `public/data/2026-27/rosters/${code}.json`)) ? read(`public/data/2026-27/rosters/${code}.json`) : null};
}).filter(team => team.stats);
const colorOf = p => TEAMS[p.code]?.color || '#3b3b45';

/* ---------- html ---------- */
const pages = {};
const written = [];
function writePage({route, title, description, body, ogName, jsonLd}) {
  pages[route] = {title, description, body, ogName: ogName ?? null, jsonLd: jsonLd ?? null};
  if (route !== '/') written.push(route);
}
const table = (heads, rows) => `<table><thead><tr>${heads.map(h => `<th>${esc(h)}</th>`).join('')}</tr></thead><tbody>${rows.map(row => `<tr>${row.map(cell => `<td>${cell}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
const link = (href, label) => `<a href="${href}">${esc(label)}</a>`;
const yearLabel = pretty(seasonKey);

const PLAYER_ROWS = [['GP', p => p.gamesPlayed, 0], ['MPG', p => p.minutesPerGame], ['PPG', p => p.stats.points], ['RPG', p => p.stats.totalRebounds], ['APG', p => p.stats.assists], ['SPG', p => p.stats.steals], ['BPG', p => p.stats.blocks], ['FG%', p => p.stats.fieldGoalPercentage], ['3P%', p => p.stats.threePointPercentage], ['FT%', p => p.stats.freeThrowPercentage], ['TS%', p => p.ts], ['TOV%', p => p.tov]];
const TEAM_ROWS = [['PPG', t => t.stats.points], ['APG', t => t.stats.assists], ['RPG', t => t.stats.totalRebounds], ['SPG', t => t.stats.steals], ['BPG', t => t.stats.blocks], ['FG%', t => t.stats.fieldGoalPercentage], ['3P%', t => t.stats.threePointPercentage], ['3PM', t => t.stats.threePointersMade], ['FT%', t => t.stats.freeThrowPercentage], ['eFG%', t => t.stats.effectiveFieldGoalPercentage]];
const cell = (rows, a, b) => rows.map(([label, get, places]) => [esc(label), fixed(get(a), places ?? 1), fixed(get(b), places ?? 1)]);

/* ---------- share cards ---------- */
fs.mkdirSync(cacheDir, {recursive: true});
const fonts = [400, 700, 800].map(weight => ({name: 'DM Sans', weight, style: 'normal', data: fs.readFileSync(path.join(root, `scripts/fonts/DMSans-${weight}.ttf`))}));
const imageCache = new Map();
async function dataUri(url, type) {
  if (imageCache.has(url)) return imageCache.get(url);
  const file = path.join(cacheDir, slugify(url) + (type === 'svg' ? '.svg' : '.png'));
  let buffer = fs.existsSync(file) ? fs.readFileSync(file) : null;
  if (!buffer) {
    try { const response = await fetch(url); if (response.ok) { buffer = Buffer.from(await response.arrayBuffer()); fs.writeFileSync(file, buffer); } } catch { /* offline: no photo */ }
  }
  const uri = buffer ? `data:image/${type === 'svg' ? 'svg+xml' : 'png'};base64,${buffer.toString('base64')}` : null;
  imageCache.set(url, uri);
  return uri;
}
const photo = player => player.nbaId ? dataUri(`https://cdn.nba.com/headshots/nba/latest/1040x760/${player.nbaId}.png`, 'png') : player.espnId ? dataUri(`https://a.espncdn.com/i/headshots/nba/players/full/${player.espnId}.png`, 'png') : null;
const logo = team => dataUri(`https://cdn.nba.com/logos/nba/${team.id}/global/L/logo.svg`, 'svg');

const h = (style, ...children) => ({type: 'div', props: {style: {display: 'flex', ...style}, children: children.flat().filter(c => c !== null && c !== undefined && c !== false)}});
const t = (style, text) => h({...style}, String(text));
const img = (src, style) => ({type: 'img', props: {src, style}});
const shade = color => `linear-gradient(160deg, ${color}, #0b0b0c)`;
const brand = h({position: 'absolute', top: 26, left: 34, fontSize: 30, fontWeight: 800, color: '#fff', letterSpacing: -1}, 'StatsPads');
const footAt = side => h({position: 'absolute', bottom: 18, [side]: 40, fontSize: 20, fontWeight: 700, color: 'rgba(255,255,255,.7)'}, SITE.replace('https://', ''));
const foot = footAt('left');

async function render(name, tree) {
  if (SKIP_OG) return;
  try {
    const svg = await satori(tree, {width: 1200, height: 630, fonts});
    const png = new Resvg(svg, {fitTo: {mode: 'width', value: 1200}}).render().asPng();
    const jpg = await sharp(png).jpeg({quality: 78, mozjpeg: true}).toBuffer();
    const file = path.join(publicDir, 'og', `${name}.jpg`);
    fs.mkdirSync(path.dirname(file), {recursive: true});
    fs.writeFileSync(file, jpg);
    return true;
  } catch (error) { console.warn(`og ${name}: ${error.message}`); return false; }
}
const statLine = p => `${fixed(p.stats.points)} PPG · ${fixed(p.stats.totalRebounds)} RPG · ${fixed(p.stats.assists)} APG`;

async function compareCard(a, b) {
  const [pa, pb] = await Promise.all([photo(a), photo(b)]);
  const half = (p, uri, right) => h({width: 600, height: 630, position: 'relative', background: shade(colorOf(p))},
    uri ? img(uri, {position: 'absolute', bottom: 150, [right ? 'right' : 'left']: 40, width: 520, height: 380}) : h({position: 'absolute', top: 150, left: 190, width: 220, height: 220, borderRadius: 110, background: 'rgba(255,255,255,.18)', color: '#fff', fontSize: 80, fontWeight: 800, alignItems: 'center', justifyContent: 'center'}, plain(p.playerName).split(' ').map(w => w[0]).slice(0, 2).join('')));
  const caption = p => h({flex: 1, flexDirection: 'column', alignItems: 'center', justifyContent: 'center'}, t({fontSize: 40, fontWeight: 800, color: '#fff'}, plain(p.playerName)), t({fontSize: 25, fontWeight: 700, color: 'rgba(255,255,255,.78)', marginTop: 6}, statLine(p)));
  return h({width: 1200, height: 630, position: 'relative', background: '#0b0b0c'}, half(a, pa, false), half(b, pb, true), brand,
    h({position: 'absolute', bottom: 0, left: 0, width: 1200, height: 175, background: 'rgba(0,0,0,.62)'}, caption(a), caption(b)),
    h({position: 'absolute', left: 540, top: 210, width: 120, height: 120, borderRadius: 60, background: '#fff', color: '#111', fontSize: 44, fontWeight: 800, alignItems: 'center', justifyContent: 'center'}, 'VS'), foot);
}
async function playerCard(p) {
  const uri = await photo(p);
  return h({width: 1200, height: 630, position: 'relative', background: shade(colorOf(p))}, brand,
    uri ? img(uri, {position: 'absolute', right: 20, bottom: 0, width: 650, height: 475}) : null,
    h({position: 'absolute', left: 50, top: 150, flexDirection: 'column', width: 600},
      t({fontSize: 72, fontWeight: 800, color: '#fff', lineHeight: 1.02, letterSpacing: -2}, plain(p.playerName)),
      t({fontSize: 28, fontWeight: 700, color: 'rgba(255,255,255,.8)', marginTop: 14}, `${p.code ? TEAMS[p.code].name : p.team} · ${p.position} · ${yearLabel}`),
      h({marginTop: 44, gap: 44}, [[p.stats.points, 'PPG'], [p.stats.totalRebounds, 'RPG'], [p.stats.assists, 'APG']].map(([value, label]) => h({flexDirection: 'column'}, t({fontSize: 80, fontWeight: 800, color: '#fff'}, fixed(value)), t({fontSize: 24, fontWeight: 700, color: 'rgba(255,255,255,.75)'}, label))))), foot);
}
const disc = (uri, size) => h({width: size, height: size, borderRadius: size / 2, background: '#fff', alignItems: 'center', justifyContent: 'center'}, uri ? img(uri, {width: size * .72, height: size * .72}) : null);
async function teamCard(team) {
  const uri = await logo(team);
  const five = team.roster ? ['PG', 'SG', 'SF', 'PF', 'C'].map(slot => team.roster.players.find(p => p.slot === slot)).filter(Boolean).map(p => plain(p.name).split(' ').slice(-1)[0]).join('  ·  ') : '';
  return h({width: 1200, height: 630, position: 'relative', background: shade(team.color)}, brand,
    h({position: 'absolute', left: 60, top: 150, alignItems: 'center', gap: 44}, disc(uri, 250),
      h({flexDirection: 'column', width: 760}, t({fontSize: 68, fontWeight: 800, color: '#fff', lineHeight: 1.02, letterSpacing: -2}, team.name), t({fontSize: 28, fontWeight: 700, color: 'rgba(255,255,255,.8)', marginTop: 16}, '2026–27 roster and expected starting five'), five ? t({fontSize: 26, fontWeight: 700, color: '#fff', marginTop: 28}, five) : null)), foot);
}
async function teamCompareCard(a, b) {
  const [la, lb] = await Promise.all([logo(a), logo(b)]);
  const half = (team, uri) => h({width: 600, height: 630, flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 22, background: shade(team.color)}, disc(uri, 230), t({fontSize: 44, fontWeight: 800, color: '#fff', textAlign: 'center'}, team.name), t({fontSize: 28, fontWeight: 700, color: 'rgba(255,255,255,.8)'}, `${fixed(team.stats.points)} PPG · ${fixed(team.stats.assists)} APG`));
  return h({width: 1200, height: 630, position: 'relative'}, half(a, la), half(b, lb), brand, h({position: 'absolute', left: 540, top: 255, width: 120, height: 120, borderRadius: 60, background: '#fff', color: '#111', fontSize: 44, fontWeight: 800, alignItems: 'center', justifyContent: 'center'}, 'VS'), foot);
}

/* ---------- pages ---------- */
const pool = (items, size = 6) => { const queue = [...items]; return Promise.all(Array.from({length: size}, async () => { while (queue.length) await queue.shift()(); })); };
const jobs = [];
let cards = 0;
const card = (name, builder) => jobs.push(async () => { if (await render(name, await builder())) cards += 1; });

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
const starterNames = team => ['PG', 'SG', 'SF', 'PF', 'C'].map(slot => team.roster?.players.find(entry => entry.slot === slot)?.name).filter(Boolean).map(name => (bySlug.get(slugify(name)) ? link(playerUrl(name), name) : esc(name)));

const LEADER_STATS = [['Points', 'PPG', p => p.stats.points], ['Rebounds', 'RPG', p => p.stats.totalRebounds], ['Assists', 'APG', p => p.stats.assists], ['Steals', 'SPG', p => p.stats.steals], ['Blocks', 'BPG', p => p.stats.blocks]];
const leadersOf = get => [...players].sort((x, y) => get(y) - get(x)).slice(0, 5);
const leaderList = ([name, abbr, get]) => `<h3>${esc(name)} per game</h3><ol>${leadersOf(get).map(p => `<li>${link(playerUrl(p.playerName), p.playerName)}${p.code ? ` (${esc(TEAMS[p.code].name)})` : ''}: ${fixed(get(p))} ${abbr}</li>`).join('')}</ol>`;
const popular = pairs.slice(0, 8).map(([x, y]) => `<li>${link(compareUrl([x.playerName, y.playerName]), `${x.playerName} vs ${y.playerName}`)}</li>`).join('');
const teamList = `<ul>${teams.map(team => `<li>${link(teamUrl(team.code), `${team.name} roster`)}</li>`).join('')}</ul>`;
const crumbs = (...items) => ({'@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: items.map(([name, route], index) => ({'@type': 'ListItem', position: index + 1, name, item: SITE + route}))});
const website = {'@context': 'https://schema.org', '@type': 'WebSite', name: 'StatsPads', alternateName: 'Stats Pads', url: SITE, description: 'NBA player and team comparisons, rosters and stats.'};

writePage({route: '/', title: 'StatsPads: NBA player and team comparisons, rosters and stats', description: 'Compare any two NBA players or teams side by side with a skill radar, see every roster with its expected starting five, and browse the league leaders.', jsonLd: [website],
  body: `<main class="seo"><h1>StatsPads: NBA player and team comparisons</h1><p>StatsPads is a free NBA stats site. Compare any two players or teams side by side with a skill radar, browse every roster with its expected starting five, and see who leads the league in ${statsWord} points, rebounds, assists, steals and blocks. Pick a team, follow it, and get its game alerts.</p><h2>${yearLabel} scoring leaders</h2>${leaderList(LEADER_STATS[0])}<p>${link('/leaders', 'See all stat leaders')}</p><h2>Popular player comparisons</h2><ul>${popular}</ul><p>${link('/compare', 'Compare any two players or teams')}</p><h2>All 30 NBA teams</h2>${teamList}</main>`});
writePage({route: '/compare', title: 'Compare NBA players and teams | StatsPads', description: 'Pick any two NBA players or teams and compare their stats side by side with a skill radar.', jsonLd: [crumbs(['Home', '/'], ['Compare', '/compare'])],
  body: `<main class="seo"><h1>Compare NBA players and teams</h1><p>Choose any two NBA players or any two teams and see their ${statsWord} per-game numbers, shooting efficiency and a skill radar side by side. The comparison covers points, rebounds, assists, steals, blocks, field goal, three-point and free throw percentages, true shooting and turnover rate. Team comparisons also show the expected starting fives.</p><h2>Popular player comparisons</h2><ul>${popular}</ul><h2>Compare teams</h2><ul>${teamPairs.slice(0, 8).map(([x, y]) => `<li>${link(compareUrl([x.name, y.name]), `${x.name} vs ${y.name}`)}</li>`).join('')}</ul></main>`});
writePage({route: '/leaders', title: 'NBA stat leaders | StatsPads', description: 'Points, rebounds, assists, steals, blocks and shooting leaders across the NBA, with the full top five for each.', jsonLd: [crumbs(['Home', '/'], ['Leaders', '/leaders'])],
  body: `<main class="seo"><h1>NBA stat leaders, ${yearLabel}</h1><p>The top five NBA players in each major per-game category for ${yearLabel}, among players with at least ${minGames} games played and ten minutes a game.</p>${LEADER_STATS.map(leaderList).join('')}</main>`});
writePage({route: '/schedule', title: 'NBA schedule 2026–27 | StatsPads', description: 'Every NBA game of the 2026–27 season with times in your timezone. Filter by team or find when two teams meet.', jsonLd: [crumbs(['Home', '/'], ['Schedule', '/schedule'])],
  body: `<main class="seo"><h1>NBA schedule 2026–27</h1><p>Every regular-season game with start times in your timezone, TV and arena. Pick a team, or two, to see when they play each other, like Lakers vs Celtics or 76ers vs Knicks.</p><h2>Teams</h2>${teamList}</main>`});
writePage({route: '/standings', title: 'NBA standings 2026–27 | StatsPads', description: 'Eastern and Western conference standings with seeds, records, games behind, home and road records, last ten and streaks.', jsonLd: [crumbs(['Home', '/'], ['Standings', '/standings'])],
  body: `<main class="seo"><h1>NBA standings 2026–27</h1><p>Eastern and Western conference standings: seeds 1–6 go to the playoffs and 7–10 to the play-in. Each row shows wins, losses, win percentage, games behind, home and road records, last ten games, streak and scoring.</p><h2>Teams</h2>${teamList}</main>`});
writePage({route: '/teams', title: 'NBA teams and rosters | StatsPads', description: 'Every NBA team with its 2026–27 roster, expected starting five and ' + statsWord + ' stats.', jsonLd: [crumbs(['Home', '/'], ['Teams', '/teams'])],
  body: `<main class="seo"><h1>NBA teams and rosters</h1><p>All 30 NBA teams with their 2026–27 roster, the expected starting five and ${statsWord} per-game team stats. Open a team to see its lineup, recent results and to follow it for game alerts.</p>${table(['Team', 'PPG', 'APG', 'RPG'], [...teams].sort((x, y) => x.name.localeCompare(y.name)).map(team => [link(teamUrl(team.code), team.name), fixed(team.stats.points), fixed(team.stats.assists), fixed(team.stats.totalRebounds)]))}</main>`});

for (const p of cap(players)) {
  const related = pairs.filter(pair => pair.includes(p)).slice(0, 4).map(([x, y]) => `<li>${link(compareUrl([x.playerName, y.playerName]), `${x.playerName} vs ${y.playerName}`)}</li>`).join('');
  writePage({route: playerUrl(p.playerName), ogName: `players/${p.slug}`,
    jsonLd: [crumbs(['Home', '/'], ['Players', '/leaders'], [p.playerName, playerUrl(p.playerName)]), {'@context': 'https://schema.org', '@type': 'Person', name: p.playerName, jobTitle: 'Basketball player', url: SITE + playerUrl(p.playerName), ...(p.code ? {affiliation: {'@type': 'SportsTeam', name: TEAMS[p.code].name, sport: 'Basketball'}} : {})}],
    title: `${p.playerName} stats ${yearLabel}: ${fixed(p.stats.points)} PPG, ${fixed(p.stats.totalRebounds)} RPG, ${fixed(p.stats.assists)} APG | StatsPads`,
    description: `${p.playerName} ${yearLabel} NBA stats: ${statLine(p)}, ${fixed(p.stats.fieldGoalPercentage)}% FG, ${fixed(p.stats.threePointPercentage)}% 3P, ${fixed(p.ts)}% TS in ${p.gamesPlayed} games. Compare ${p.playerName} with any player.`,
    body: `<main class="seo"><h1>${esc(p.playerName)} stats, ${yearLabel}</h1>${copy.playerProfile(p)}${table(['Stat', 'Per game'], PLAYER_ROWS.map(([label, get, places]) => [esc(label), fixed(get(p), places ?? 1)]))}${p.code ? `<p>${link(teamUrl(p.code), `${TEAMS[p.code].name} roster`)}</p>` : ''}${careerHtml(p)}${copy.teammates(p)}${copy.neighbours(p)}${related ? `<h2>Compare</h2><ul>${related}</ul>` : ''}</main>`});
  card(`players/${p.slug}`, () => playerCard(p));
}
for (const team of cap(teams)) {
  const roster = team.roster?.players ?? [];
  const slug = name => bySlug.get(slugify(name));
  const line = player => slug(player.name) ? link(playerUrl(player.name), player.name) : esc(player.name);
  const starters = ['PG', 'SG', 'SF', 'PF', 'C'].map(slot => roster.find(p => p.slot === slot)).filter(Boolean);
  writePage({route: teamUrl(team.code), ogName: `teams/${team.slug}`,
    jsonLd: [crumbs(['Home', '/'], ['Teams', '/teams'], [team.name, teamUrl(team.code)]), {'@context': 'https://schema.org', '@type': 'SportsTeam', name: team.name, sport: 'Basketball', url: SITE + teamUrl(team.code), memberOf: {'@type': 'SportsOrganization', name: 'NBA'}}],
    title: `${team.name} roster 2026–27: expected starting five and stats | StatsPads`,
    description: `${team.name} 2026–27 roster with the expected starting five${starters.length ? ` (${starters.map(p => p.name).join(', ')})` : ''}, ${statsWord} per-game stats and recent results.`,
    body: `<main class="seo"><h1>${esc(team.name)} roster, 2026–27</h1>${copy.teamProfile(team)}${starters.length ? `<h2>Expected starting five</h2><ol>${starters.map(p => `<li>${esc(p.slot)} ${line(p)}</li>`).join('')}</ol>` : ''}${roster.length ? `<h2>Full roster</h2><ul>${roster.map(p => `<li>${line(p)}</li>`).join('')}</ul>` : ''}<h2>${yearLabel} team stats</h2>${table(['Stat', 'Per game'], TEAM_ROWS.map(([label, get]) => [esc(label), fixed(get(team))]))}</main>`});
  card(`teams/${team.slug}`, () => teamCard(team));
}
for (const [a, b] of cap(pairs)) {
  const route = compareUrl([a.playerName, b.playerName]);
  writePage({route, ogName: `compare/${a.slug}-vs-${b.slug}`,
    title: `${a.playerName} vs ${b.playerName}: ${yearLabel} stats comparison | StatsPads`,
    description: `${a.playerName} vs ${b.playerName} ${yearLabel} stats side by side: ${fixed(a.stats.points)} vs ${fixed(b.stats.points)} PPG, ${fixed(a.stats.totalRebounds)} vs ${fixed(b.stats.totalRebounds)} RPG, ${fixed(a.stats.assists)} vs ${fixed(b.stats.assists)} APG, with a skill radar.`,
    body: `<main class="seo"><h1>${esc(a.playerName)} vs ${esc(b.playerName)}: ${yearLabel} stats</h1><p>${esc(a.playerName)} averaged ${esc(statLine(a))}. ${esc(b.playerName)} averaged ${esc(statLine(b))}.</p>${copy.playerComparison(a, b)}${table(['Stat', a.playerName, b.playerName], cell(PLAYER_ROWS, a, b))}<p>${link(playerUrl(a.playerName), `${a.playerName} stats`)} · ${link(playerUrl(b.playerName), `${b.playerName} stats`)}${a.code ? ` · ${link(teamUrl(a.code), `${TEAMS[a.code].name} roster`)}` : ''}${b.code && b.code !== a.code ? ` · ${link(teamUrl(b.code), `${TEAMS[b.code].name} roster`)}` : ''}</p>${copy.moreComparisons(a, b)}</main>`});
  card(`compare/${a.slug}-vs-${b.slug}`, () => compareCard(a, b));
}
for (const [a, b] of cap(teamPairs)) {
  writePage({route: compareUrl([a.name, b.name]), ogName: `compare/${a.slug}-vs-${b.slug}`,
    title: `${a.name} vs ${b.name}: ${yearLabel} team stats comparison | StatsPads`,
    description: `${a.name} vs ${b.name} ${yearLabel} team stats side by side: ${fixed(a.stats.points)} vs ${fixed(b.stats.points)} PPG, ${fixed(a.stats.assists)} vs ${fixed(b.stats.assists)} APG, ${fixed(a.stats.totalRebounds)} vs ${fixed(b.stats.totalRebounds)} RPG, with a skill radar and the expected starting fives.`,
    body: `<main class="seo"><h1>${esc(a.name)} vs ${esc(b.name)}: ${yearLabel} team stats</h1>${copy.teamComparison(a, b, starterNames)}${table(['Stat', a.name, b.name], cell(TEAM_ROWS, a, b))}<p>${link(teamUrl(a.code), `${a.name} roster`)} · ${link(teamUrl(b.code), `${b.name} roster`)}</p></main>`});
  card(`compare/${a.slug}-vs-${b.slug}`, () => teamCompareCard(a, b));
}

const started = Date.now();
await pool(jobs, 6);

/* ---------- sitemap and robots ---------- */
const today = new Date().toISOString().slice(0, 10);
const urls = ['/', '/compare', '/leaders', '/teams', '/schedule', '/standings', '/privacy', ...written.filter(route => !['/compare', '/leaders', '/teams'].includes(route))];
fs.writeFileSync(path.join(publicDir, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map(route => `  <url><loc>${SITE}${route}</loc><lastmod>${today}</lastmod></url>`).join('\n')}\n</urlset>\n`);
fs.writeFileSync(path.join(publicDir, 'robots.txt'), `User-agent: *\nAllow: /\n\nSitemap: ${SITE}/sitemap.xml\n`);
console.log(`prerender: ${written.length} pages, ${cards} share cards in ${((Date.now() - started) / 1000).toFixed(1)}s, ${players.filter(p => !p.nbaId && !p.espnId).length} of ${players.length} players without a headshot`);
fs.mkdirSync(path.dirname(manifestFile), {recursive: true});
fs.writeFileSync(manifestFile, JSON.stringify(pages));
