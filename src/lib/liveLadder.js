import { useEffect, useState } from 'react';
import { parseSummary } from './boxscore';

/* Live MVP and rookie ladders. ladders.json carries each contender's raw season totals (scripts/build-regular-box-stats.mjs);
   while games are on, every player's line so far is added as one more game and the ladder is re-ranked the same way the
   build ranks it: per-game game score, pulled toward the pool's average by `weight` games. It reads "if the games ended now".
   Games that are over but not yet in the stats files count too, so the ladder does not jump back at the buzzer. */

const SCOREBOARD = 'https://site.api.espn.com/apis/site/v2/sports/basketball/nba/scoreboard';
const SUMMARY = 'https://site.api.espn.com/apis/site/v2/sports/basketball/nba/summary?event=';
const EVERY = 60e3;

const dayOf = iso => new Date(iso).toLocaleDateString('en-CA', {timeZone: 'America/New_York'});
const stamp = offset => dayOf(Date.now() - offset * 864e5).replaceAll('-', '');
const round = value => Number(Number(value || 0).toFixed(1));
const num = value => Number(String(value ?? '').replace('+', '')) || 0;
const made = value => String(value ?? '0-0').split('-').map(Number);
const gameScoreOf = stats => {
  const [fg, fga] = made(stats.FG), [ft, fta] = made(stats.FT);
  const oreb = stats.OREB === undefined ? 0 : num(stats.OREB), dreb = stats.DREB === undefined ? num(stats.REB) : num(stats.DREB);
  return num(stats.PTS) + .4 * fg - .7 * fga - .4 * (fta - ft) + .7 * oreb + .3 * dreb + num(stats.STL) + .7 * num(stats.AST) + .7 * num(stats.BLK) - .4 * num(stats.PF) - num(stats.TOV ?? stats.TO);
};

/* Regular-season games on now, or over since the ladders were built. */
async function gamesToCount(through) {
  const boards = await Promise.all([0, 1].map(offset => fetch(`${SCOREBOARD}?dates=${stamp(offset)}`, {cache: 'no-store'}).then(response => response.json()).catch(() => null)));
  return boards.flatMap(board => board?.events ?? []).filter(event => event.season?.type === 2)
    .filter(event => event.status?.type?.state === 'in' || (event.status?.type?.state === 'post' && dayOf(event.date) > through))
    .map(event => ({id: event.id, live: event.status.type.state === 'in'}));
}

/* Every player's line in those games, by ESPN id. */
async function linesOf(games) {
  const lines = new Map();
  await Promise.all(games.map(game => fetch(`${SUMMARY}${game.id}`, {cache: 'no-store'}).then(response => response.json()).then(parseSummary).then(box => {
    for (const team of box.teams) for (const player of team.players) {
      if (player.out || !player.id) continue;
      const [fgm, fga] = made(player.stats.FG), [ftm, fta] = made(player.stats.FT);
      lines.set(String(player.id), {gs: gameScoreOf(player.stats), pts: num(player.stats.PTS), reb: num(player.stats.REB), ast: num(player.stats.AST), fgm, fga, ftm, fta, live: game.live});
    }
  }).catch(() => {})));
  return lines;
}

function rerank(pool, weight, official, lines) {
  if (!pool?.rows?.length || !pool.rows.some(row => lines.has(row.id))) return null;
  const was = new Map(official.map(row => [String(row.espnId), row.rank]));
  return pool.rows.map(row => {
    const line = lines.get(row.id), games = row.games + (line ? 1 : 0);
    const gs = row.gs + (line?.gs ?? 0), pts = row.pts + (line?.pts ?? 0), reb = row.reb + (line?.reb ?? 0), ast = row.ast + (line?.ast ?? 0);
    return {row, line, games, pts, reb, ast, rate: (gs + weight * pool.prior) / (games + weight)};
  }).sort((a, b) => b.rate - a.rate || a.row.name.localeCompare(b.row.name)).slice(0, official.filter(row => row.qualified !== false).length).map((entry, index) => {
    const before = was.get(entry.row.id), rank = index + 1;
    return {rank, qualified: true, playerId: `espn-${entry.row.id}`, espnId: entry.row.id, name: entry.row.name, team: entry.row.team, games: entry.games,
      pts: round(entry.pts / entry.games), reb: round(entry.reb / entry.games), ast: round(entry.ast / entry.games), score: round(entry.rate),
      move: before === undefined ? null : before - rank, tonight: entry.line && {pts: entry.line.pts, reb: entry.line.reb, ast: entry.line.ast, live: entry.line.live}};
  });
}

/* The ladders as they would stand if tonight's games ended now, refreshed every minute while a game is on;
   null when nothing tonight touches them. */
export function useLiveLadders(data) {
  const [live, setLive] = useState(null);
  useEffect(() => {
    if (!data?.live || !data.through) return undefined;
    let timer, stopped = false;
    const tick = async () => {
      const games = await gamesToCount(data.through).catch(() => []);
      const lines = games.length ? await linesOf(games) : new Map();
      if (stopped) return;
      const mvp = rerank(data.live.mvp, data.live.weight, data.mvp, lines);
      const qualified = rerank(data.live.rookie, data.live.weight, data.rookie ?? [], lines);
      const rookie = qualified && [...qualified, ...(data.rookie ?? []).filter(row => row.qualified === false)];
      setLive(mvp || rookie ? {mvp, rookie, playing: games.some(game => game.live)} : null);
      if (games.some(game => game.live)) timer = setTimeout(() => (document.hidden ? addEventListener('visibilitychange', tick, {once: true}) : tick()), EVERY);
    };
    tick();
    return () => { stopped = true; clearTimeout(timer); removeEventListener('visibilitychange', tick); };
  }, [data]);
  return live;
}
