// Builds the "NBA tonight" post: every game on a date, the hot players from each
// team's recent form, and a caption ready to paste. No network, no secrets.
//
//   node scripts/tonight.mjs                 # first date with games still to play
//   node scripts/tonight.mjs 2026-10-29      # a specific date (UTC day of tip-off)
//   node scripts/tonight.mjs --json          # machine-readable output
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const dir = join(root, 'public', 'data', '2026-27')
const SITE = 'https://statspads.com'

const schedule = JSON.parse(readFileSync(join(dir, 'schedule.json'), 'utf8'))
const recent = JSON.parse(readFileSync(join(dir, 'recent-performances.json'), 'utf8')).lines

// schedule row: [gameId, tipoff, away, home, venue, tv, state, awayScore, homeScore, ?]
const args = process.argv.slice(2)
const asJson = args.includes('--json')
let day = args.find((a) => /^\d{4}-\d{2}-\d{2}$/.test(a))
if (!day) {
  const next = schedule.filter((g) => g[6] === 'pre').map((g) => g[1].slice(0, 10)).sort()[0]
  if (!next) {
    console.error('No upcoming games in schedule.json')
    process.exit(1)
  }
  day = next
}

const games = schedule.filter((g) => g[1].startsWith(day)).sort((a, b) => a[1].localeCompare(b[1]))
if (!games.length) {
  console.error(`No games on ${day}`)
  process.exit(1)
}

// Recent-performance rows use ESPN's short codes for opponents; the schedule uses the standard ones.
const ABBR = { NY: 'NYK', UTAH: 'UTA', WSH: 'WAS', GS: 'GSW', SA: 'SAS', NO: 'NOP' }

// Best recent line per team, by the site's own rating.
function hotPlayers(team, n = 2) {
  const seen = new Set()
  return recent
    .filter((l) => l.team === team)
    .sort((a, b) => b.rating - a.rating)
    .filter((l) => !seen.has(l.player.id) && seen.add(l.player.id))
    .slice(0, n)
    .map((l) => ({
      name: l.player.name,
      line: `${l.player.stats.PTS} pts, ${l.player.stats.REB} reb, ${l.player.stats.AST} ast`,
      vs: ABBR[l.opp] || l.opp,
    }))
}

const slate = games.map((g) => ({
  id: g[0],
  tipoff: g[1],
  away: g[2],
  home: g[3],
  venue: g[4],
  tv: g[5],
  hot: { [g[2]]: hotPlayers(g[2]), [g[3]]: hotPlayers(g[3]) },
}))

const label = new Date(`${day}T12:00:00Z`).toLocaleDateString('en-US', {
  weekday: 'long', month: 'long', day: 'numeric', timeZone: 'UTC',
})

if (asJson) {
  console.log(JSON.stringify({ day, label, slate }, null, 2))
  process.exit(0)
}

const lines = [`NBA tonight, ${label} (${slate.length} games)`, '']
for (const g of slate) {
  lines.push(`${g.away} @ ${g.home}`)
  for (const team of [g.away, g.home]) {
    const hot = g.hot[team]
    if (hot.length) lines.push(`  ${team}: ` + hot.map((p) => `${p.name} (${p.line} vs ${p.vs})`).join('; '))
  }
}
lines.push('', `Compare any two players: ${SITE}/compare`, '#NBA #NBATonight #NBAStats')

const out = lines.join('\n')
const outDir = join(root, 'out')
mkdirSync(outDir, { recursive: true })
writeFileSync(join(outDir, `tonight-${day}.txt`), out + '\n')
console.log(out)
