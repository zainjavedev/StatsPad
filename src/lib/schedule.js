import { TEAMS, espnLogoUrl, nickname } from './teams';
import { recentResults, upcomingGames } from './espn';

/* The season's games from public/data/2026-27/schedule.json (scripts/build-schedule.mjs), in the
   same shape the game lists use, with ESPN's scoreboard laid over the games of the last week and
   the next few days for live scores and final results. */

let cached;

const side = (code, score) => ({abbr: TEAMS[code].espn.toUpperCase(), code, name: nickname(code), logo: espnLogoUrl(code), score: score === null ? undefined : String(score)});

export async function loadSchedule() {
  cached ??= (async () => {
    const rows = await fetch('/data/2026-27/schedule.json').then(response => response.json());
    const games = rows.map(([id, date, away, home, venue, tv, state, awayScore, homeScore]) => ({id, date: new Date(date), away: side(away, awayScore), home: side(home, homeScore), venue, tv, state, detail: ''}));
    const [recent, soon] = await Promise.all([recentResults(7, 80).catch(() => []), upcomingGames(3, 40).catch(() => [])]);
    const live = new Map([...recent, ...soon].map(game => [game.id, game]));
    for (const game of games) {
      const update = live.get(game.id);
      if (update) { game.state = update.state; game.detail = update.detail; game.away.score = update.away.score; game.home.score = update.home.score; }
    }
    return games;
  })();
  return cached;
}
