import { TEAMS, espnLogoUrl, nickname } from './teams';
import { gamesAround } from './espn';

/* The season's games from public/data/2026-27/schedule.json (scripts/build-schedule.mjs), in the
   same shape the game lists use, with ESPN's scoreboard laid over the games of the last week and
   the next few days for live scores and final results. */

let rows;

const side = (code, score) => ({abbr: TEAMS[code].espn.toUpperCase(), code, name: nickname(code), logo: espnLogoUrl(code), score: score === null ? undefined : String(score)});

/* The schedule file is fetched once; ESPN's scoreboard for yesterday, today and tomorrow is laid over
   it on every call (three requests, instead of one per day of the week). */
export async function loadSchedule() {
  rows ??= fetch('/data/2026-27/schedule.json').then(response => response.json());
  const [list, live] = await Promise.all([rows, gamesAround().catch(() => [])]);
  const updates = new Map(live.map(game => [game.id, game]));
  return list.map(([id, date, away, home, venue, tv, state, awayScore, homeScore, preseason]) => {
    const game = {id, date: new Date(date), away: side(away, awayScore), home: side(home, homeScore), venue, tv, state, detail: '', preseason: preseason === 1};
    const update = updates.get(id);
    if (update) { game.state = update.state; game.detail = update.detail; game.away.score = update.away.score; game.home.score = update.home.score; }
    return game;
  });
}

/* What the front page shows: games still to come (or on now), and the latest finals. */
export const upcoming = (games, limit) => games.filter(game => game.state === 'in' || (game.state !== 'post' && game.date >= Date.now() - 3 * 3600 * 1000)).slice(0, limit);
export const finished = (games, limit) => games.filter(game => game.state === 'post').slice(-limit).reverse();
