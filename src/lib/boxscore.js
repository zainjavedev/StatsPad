/* One game's box score from ESPN's summary: both teams' players with their lines, starters first.
   Games that haven't tipped off return no players, and the screen shows the expected fives instead. */

const URL = 'https://site.api.espn.com/apis/site/v2/sports/basketball/nba/summary?event=';
const cache = new Map();

/* Seconds into the game: twelve-minute quarters, five-minute overtimes; the clock reads "2:33" or "45.2". */
function elapsed(period, clock) {
  const [minutes, seconds] = String(clock ?? '0').includes(':') ? clock.split(':').map(Number) : [0, Number(clock)];
  const left = (minutes || 0) * 60 + (seconds || 0);
  return period <= 4 ? (period - 1) * 720 + 720 - left : 2880 + (period - 5) * 300 + 300 - left;
}

export function loadBoxscore(id) {
  if (!cache.has(id)) {
    cache.set(id, fetch(`${URL}${id}`).then(response => { if (!response.ok) throw new Error(response.status); return response.json(); }).then(data => {
      const teams = (data.boxscore?.players ?? []).map(entry => {
        const block = entry.statistics?.[0] ?? {labels: [], athletes: []};
        const players = block.athletes.map(item => ({
          id: item.athlete?.id, photo: item.athlete?.headshot?.href ?? (item.athlete?.id ? `https://a.espncdn.com/i/headshots/nba/players/full/${item.athlete.id}.png` : null), name: item.athlete?.displayName, short: item.athlete?.shortName, pos: item.athlete?.position?.abbreviation ?? '', jersey: item.athlete?.jersey ?? '',
          starter: Boolean(item.starter), out: Boolean(item.didNotPlay) || !item.stats?.length, stats: Object.fromEntries(block.labels.map((label, index) => [label, item.stats?.[index]])),
        }));
        const totals = Object.fromEntries((data.boxscore.teams.find(team => team.team.id === entry.team.id)?.statistics ?? []).map(stat => [stat.label, stat.displayValue]));
        return {abbr: entry.team.abbreviation, name: entry.team.displayName, logo: entry.team.logo, labels: block.labels, players, totals};
      });
      const status = data.header?.competitions?.[0]?.status?.type;
      const competition = data.header?.competitions?.[0];
      const side = homeAway => {
        const entry = competition?.competitors?.find(item => item.homeAway === homeAway);
        return entry && {id: entry.team.id, abbr: entry.team.abbreviation, name: entry.team.displayName, short: entry.team.shortDisplayName ?? entry.team.displayName, logo: entry.team.logos?.[0]?.href ?? entry.team.logo, score: entry.score};
      };
      const plays = (data.plays ?? []).map(play => ({q: play.period?.number ?? 1, type: play.type?.text ?? '', text: play.text ?? '', pts: play.scoreValue ?? 0, pa: play.pointsAttempted ?? 0, scoring: Boolean(play.scoringPlay), who: (play.participants ?? []).map(entry => entry.athlete?.id), team: play.team?.id, x: play.coordinate?.x, y: play.coordinate?.y, as: play.awayScore, hs: play.homeScore, t: elapsed(play.period?.number ?? 1, play.clock?.displayValue)}));
      return {teams, plays, away: side('away'), home: side('home'), date: competition?.date ?? data.header?.competitions?.[0]?.date, state: status?.state ?? 'pre', detail: status?.detail ?? '', venue: data.gameInfo?.venue?.fullName ?? '', tv: data.broadcasts?.[0]?.media?.shortName ?? '', preseason: data.header?.season?.type === 1};
    }).catch(() => { cache.delete(id); return null; }));
  }
  return cache.get(id);
}
