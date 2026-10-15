import fs from 'node:fs';
import path from 'node:path';
import satori from 'satori';
import { Resvg } from '@resvg/resvg-js';
import sharp from 'sharp';
import { TEAMS, teamCodeOf } from '../src/lib/teams.js';
import { SEASONS, pretty } from '../src/lib/season.js';
import { makeCopy } from './seo-copy.mjs';
import { SITE, compareUrl, playerUrl, slugify, teamUrl } from '../src/lib/routes.js';

/* Runs after `vite build`. Writes a real HTML page (title, description, social
   tags and readable stats) for every player, team and popular comparison, a
   share-card image for each, and a sitemap. React replaces the static text as
   soon as the app loads; search engines and link previews read it as is.

   SEO_LIMIT=n builds only n pages of each kind; SKIP_OG=1 skips the images. */

const root = path.resolve(import.meta.dirname, '..');
const dist = path.join(root, 'dist');
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
const template = fs.readFileSync(path.join(dist, 'index.html'), 'utf8');
if (template.includes('rel="canonical"')) throw new Error('dist/index.html was already prerendered. Run `vite build` first.');
const written = [];
function writePage({route, title, description, body, ogName}) {
  const url = `${SITE}${route}`;
  const image = ogName ? `${SITE}/og/${ogName}.jpg` : `${SITE}/statspad.png`;
  const tags = [
    `<meta name="description" content="${esc(description)}" />`,
    `<link rel="canonical" href="${url}" />`,
    `<meta property="og:type" content="website" />`, `<meta property="og:site_name" content="StatsPad" />`,
    `<meta property="og:title" content="${esc(title)}" />`, `<meta property="og:description" content="${esc(description)}" />`,
    `<meta property="og:url" content="${url}" />`, `<meta property="og:image" content="${image}" />`,
    ...(ogName ? [`<meta property="og:image:width" content="1200" />`, `<meta property="og:image:height" content="630" />`] : []),
    `<meta name="twitter:card" content="summary_large_image" />`, `<meta name="twitter:title" content="${esc(title)}" />`,
    `<meta name="twitter:description" content="${esc(description)}" />`, `<meta name="twitter:image" content="${image}" />`,
    `<style>.seo{max-width:820px;margin:0 auto;padding:32px 20px;font:16px/1.5 system-ui,sans-serif;color:#14140f}.seo table{border-collapse:collapse;width:100%}.seo th,.seo td{padding:6px 10px;border-bottom:1px solid #ddd;text-align:left}.seo a{color:inherit}</style>`,
  ].join('\n');
  let html = template.replace(/<title>[^<]*<\/title>/, `<title>${esc(title)}</title>`).replace('</head>', `${tags}\n</head>`).replace('<div id="root"></div>', `<div id="root">${body}</div>`);
  const file = route === '/' ? path.join(dist, 'index.html') : path.join(dist, route.replace(/^\//, ''), 'index.html');
  fs.mkdirSync(path.dirname(file), {recursive: true});
  fs.writeFileSync(file, html);
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
const brand = h({position: 'absolute', top: 26, left: 34, fontSize: 30, fontWeight: 800, color: '#fff', letterSpacing: -1}, 'StatsPad');
const footAt = side => h({position: 'absolute', bottom: 18, [side]: 40, fontSize: 20, fontWeight: 700, color: 'rgba(255,255,255,.7)'}, SITE.replace('https://', ''));
const foot = footAt('left');

async function render(name, tree) {
  if (SKIP_OG) return;
  try {
    const svg = await satori(tree, {width: 1200, height: 630, fonts});
    const png = new Resvg(svg, {fitTo: {mode: 'width', value: 1200}}).render().asPng();
    const jpg = await sharp(png).jpeg({quality: 78, mozjpeg: true}).toBuffer();
    const file = path.join(dist, 'og', `${name}.jpg`);
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
const starterNames = team => ['PG', 'SG', 'SF', 'PF', 'C'].map(slot => team.roster?.players.find(entry => entry.slot === slot)?.name).filter(Boolean).map(name => (bySlug.get(slugify(name)) ? link(playerUrl(name), name) : esc(name)));

writePage({route: '/', title: 'StatsPad: NBA player and team comparisons, rosters and stats', description: 'Compare any two NBA players or teams side by side with a skill radar, see every roster with its expected starting five, and browse the league leaders.', body: '<main class="seo"><h1>StatsPad: NBA player and team comparisons</h1><p>Compare any two NBA players or teams, browse every roster and see the league leaders.</p></main>'});
writePage({route: '/compare', title: 'Compare NBA players and teams | StatsPad', description: 'Pick any two NBA players or teams and compare their stats side by side with a skill radar.', body: '<main class="seo"><h1>Compare NBA players and teams</h1></main>'});
writePage({route: '/leaders', title: 'NBA stat leaders | StatsPad', description: 'Points, rebounds, assists, steals, blocks and shooting leaders across the NBA, with the full top five for each.', body: '<main class="seo"><h1>NBA stat leaders</h1></main>'});
writePage({route: '/teams', title: 'NBA teams and rosters | StatsPad', description: 'Every NBA team with its 2026–27 roster, expected starting five and ' + statsWord + ' stats.', body: `<main class="seo"><h1>NBA teams and rosters</h1><ul>${teams.map(team => `<li>${link(teamUrl(team.code), team.name)}</li>`).join('')}</ul></main>`});

for (const p of cap(players)) {
  const related = pairs.filter(pair => pair.includes(p)).slice(0, 4).map(([x, y]) => `<li>${link(compareUrl([x.playerName, y.playerName]), `${x.playerName} vs ${y.playerName}`)}</li>`).join('');
  writePage({route: playerUrl(p.playerName), ogName: `players/${p.slug}`,
    title: `${p.playerName} stats ${yearLabel}: ${fixed(p.stats.points)} PPG, ${fixed(p.stats.totalRebounds)} RPG, ${fixed(p.stats.assists)} APG | StatsPad`,
    description: `${p.playerName} ${yearLabel} NBA stats: ${statLine(p)}, ${fixed(p.stats.fieldGoalPercentage)}% FG, ${fixed(p.stats.threePointPercentage)}% 3P, ${fixed(p.ts)}% TS in ${p.gamesPlayed} games. Compare ${p.playerName} with any player.`,
    body: `<main class="seo"><h1>${esc(p.playerName)} stats, ${yearLabel}</h1>${copy.playerProfile(p)}${table(['Stat', 'Per game'], PLAYER_ROWS.map(([label, get, places]) => [esc(label), fixed(get(p), places ?? 1)]))}${p.code ? `<p>${link(teamUrl(p.code), `${TEAMS[p.code].name} roster`)}</p>` : ''}${copy.teammates(p)}${copy.neighbours(p)}${related ? `<h2>Compare</h2><ul>${related}</ul>` : ''}</main>`});
  card(`players/${p.slug}`, () => playerCard(p));
}
for (const team of cap(teams)) {
  const roster = team.roster?.players ?? [];
  const slug = name => bySlug.get(slugify(name));
  const line = player => slug(player.name) ? link(playerUrl(player.name), player.name) : esc(player.name);
  const starters = ['PG', 'SG', 'SF', 'PF', 'C'].map(slot => roster.find(p => p.slot === slot)).filter(Boolean);
  writePage({route: teamUrl(team.code), ogName: `teams/${team.slug}`,
    title: `${team.name} roster 2026–27: expected starting five and stats | StatsPad`,
    description: `${team.name} 2026–27 roster with the expected starting five${starters.length ? ` (${starters.map(p => p.name).join(', ')})` : ''}, ${statsWord} per-game stats and recent results.`,
    body: `<main class="seo"><h1>${esc(team.name)} roster, 2026–27</h1>${copy.teamProfile(team)}${starters.length ? `<h2>Expected starting five</h2><ol>${starters.map(p => `<li>${esc(p.slot)} ${line(p)}</li>`).join('')}</ol>` : ''}${roster.length ? `<h2>Full roster</h2><ul>${roster.map(p => `<li>${line(p)}</li>`).join('')}</ul>` : ''}<h2>${yearLabel} team stats</h2>${table(['Stat', 'Per game'], TEAM_ROWS.map(([label, get]) => [esc(label), fixed(get(team))]))}</main>`});
  card(`teams/${team.slug}`, () => teamCard(team));
}
for (const [a, b] of cap(pairs)) {
  const route = compareUrl([a.playerName, b.playerName]);
  writePage({route, ogName: `compare/${a.slug}-vs-${b.slug}`,
    title: `${a.playerName} vs ${b.playerName}: ${yearLabel} stats comparison | StatsPad`,
    description: `${a.playerName} vs ${b.playerName} ${yearLabel} stats side by side: ${fixed(a.stats.points)} vs ${fixed(b.stats.points)} PPG, ${fixed(a.stats.totalRebounds)} vs ${fixed(b.stats.totalRebounds)} RPG, ${fixed(a.stats.assists)} vs ${fixed(b.stats.assists)} APG, with a skill radar.`,
    body: `<main class="seo"><h1>${esc(a.playerName)} vs ${esc(b.playerName)}: ${yearLabel} stats</h1><p>${esc(a.playerName)} averaged ${esc(statLine(a))}. ${esc(b.playerName)} averaged ${esc(statLine(b))}.</p>${copy.playerComparison(a, b)}${table(['Stat', a.playerName, b.playerName], cell(PLAYER_ROWS, a, b))}<p>${link(playerUrl(a.playerName), `${a.playerName} stats`)} · ${link(playerUrl(b.playerName), `${b.playerName} stats`)}${a.code ? ` · ${link(teamUrl(a.code), `${TEAMS[a.code].name} roster`)}` : ''}${b.code && b.code !== a.code ? ` · ${link(teamUrl(b.code), `${TEAMS[b.code].name} roster`)}` : ''}</p>${copy.moreComparisons(a, b)}</main>`});
  card(`compare/${a.slug}-vs-${b.slug}`, () => compareCard(a, b));
}
for (const [a, b] of cap(teamPairs)) {
  writePage({route: compareUrl([a.name, b.name]), ogName: `compare/${a.slug}-vs-${b.slug}`,
    title: `${a.name} vs ${b.name}: ${yearLabel} team stats comparison | StatsPad`,
    description: `${a.name} vs ${b.name} ${yearLabel} team stats side by side: ${fixed(a.stats.points)} vs ${fixed(b.stats.points)} PPG, ${fixed(a.stats.assists)} vs ${fixed(b.stats.assists)} APG, ${fixed(a.stats.totalRebounds)} vs ${fixed(b.stats.totalRebounds)} RPG, with a skill radar and the expected starting fives.`,
    body: `<main class="seo"><h1>${esc(a.name)} vs ${esc(b.name)}: ${yearLabel} team stats</h1>${copy.teamComparison(a, b, starterNames)}${table(['Stat', a.name, b.name], cell(TEAM_ROWS, a, b))}<p>${link(teamUrl(a.code), `${a.name} roster`)} · ${link(teamUrl(b.code), `${b.name} roster`)}</p></main>`});
  card(`compare/${a.slug}-vs-${b.slug}`, () => teamCompareCard(a, b));
}

const started = Date.now();
await pool(jobs, 6);

/* ---------- sitemap and robots ---------- */
const today = new Date().toISOString().slice(0, 10);
const urls = ['/', '/compare', '/leaders', '/teams', ...written.filter(route => !['/compare', '/leaders', '/teams'].includes(route))];
fs.writeFileSync(path.join(dist, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map(route => `  <url><loc>${SITE}${route}</loc><lastmod>${today}</lastmod></url>`).join('\n')}\n</urlset>\n`);
fs.writeFileSync(path.join(dist, 'robots.txt'), `User-agent: *\nAllow: /\n\nSitemap: ${SITE}/sitemap.xml\n`);
console.log(`prerender: ${written.length} pages, ${cards} share cards in ${((Date.now() - started) / 1000).toFixed(1)}s, ${players.filter(p => !p.nbaId && !p.espnId).length} of ${players.length} players without a headshot`);
