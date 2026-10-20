/* One game's box score from ESPN's summary: both teams' players with their lines, starters first.
   Games that haven't tipped off return no players, and the screen shows the expected fives instead. */

const URL = 'https://site.api.espn.com/apis/site/v2/sports/basketball/nba/summary?event=';
const cache = new Map();

export function loadBoxscore(id) {
  if (!cache.has(id)) {
    cache.set(id, fetch(`${URL}${id}`).then(response => { if (!response.ok) throw new Error(response.status); return response.json(); }).then(data => {
      const teams = (data.boxscore?.players ?? []).map(entry => {
        const block = entry.statistics?.[0] ?? {labels: [], athletes: []};
        const players = block.athletes.map(item => ({
          id: item.athlete?.id, name: item.athlete?.displayName, short: item.athlete?.shortName, pos: item.athlete?.position?.abbreviation ?? '', jersey: item.athlete?.jersey ?? '',
          starter: Boolean(item.starter), out: Boolean(item.didNotPlay) || !item.stats?.length, stats: Object.fromEntries(block.labels.map((label, index) => [label, item.stats?.[index]])),
        }));
        const totals = Object.fromEntries((data.boxscore.teams.find(team => team.team.id === entry.team.id)?.statistics ?? []).map(stat => [stat.label, stat.displayValue]));
        return {abbr: entry.team.abbreviation, name: entry.team.displayName, logo: entry.team.logo, labels: block.labels, players, totals};
      });
      const status = data.header?.competitions?.[0]?.status?.type;
      return {teams, state: status?.state ?? 'pre', detail: status?.detail ?? '', venue: data.gameInfo?.venue?.fullName ?? '', attendance: data.gameInfo?.attendance ?? null};
    }).catch(() => { cache.delete(id); return null; }));
  }
  return cache.get(id);
}
