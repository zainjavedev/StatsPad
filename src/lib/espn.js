/* ESPN's public site API serves schedules and news with open CORS, so the
   front page and team pages read them straight from the browser. Every call
   resolves to an empty list on failure; callers just hide the section. */

const BASE = 'https://site.api.espn.com/apis/site/v2/sports/basketball/nba';
const getJson = url => fetch(url).then(response => { if (!response.ok) throw new Error(response.status); return response.json(); });
const ymd = date => `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}`;

function toGame(event) {
  const competition = event.competitions[0];
  const side = homeAway => {
    const entry = competition.competitors.find(competitor => competitor.homeAway === homeAway);
    const team = entry.team;
    return {
      abbr: team.abbreviation,
      name: team.shortDisplayName || team.displayName,
      logo: team.logo || team.logos?.[0]?.href,
      score: typeof entry.score === 'object' ? entry.score?.displayValue : entry.score,
    };
  };
  const status = (competition.status || event.status).type;
  return {
    id: event.id,
    date: new Date(event.date),
    away: side('away'),
    home: side('home'),
    state: status.state, // pre | in | post
    detail: status.shortDetail,
    preseason: event.season?.type === 1 || event.seasonType?.type === 1,
    tv: competition.broadcasts?.map(broadcast => broadcast.media?.shortName || broadcast.names?.[0]).filter(Boolean)[0],
  };
}

/* The scoreboard answers a date with no games by returning the most recent
   game day instead, so keep only games that haven't finished yet. */
export async function upcomingGames(days = 7, limit = 6) {
  const today = new Date();
  const dates = Array.from({length: days}, (_, offset) => ymd(new Date(today.getFullYear(), today.getMonth(), today.getDate() + offset)));
  const boards = await Promise.all(dates.map(date => getJson(`${BASE}/scoreboard?dates=${date}`).catch(() => null)));
  const seen = new Set();
  return boards.flatMap(board => board?.events || []).map(toGame)
    .filter(game => game.state !== 'post' && !seen.has(game.id) && seen.add(game.id))
    .sort((a, b) => a.date - b.date)
    .slice(0, limit);
}

export async function teamSchedule(team, limit = 5) {
  try {
    const seasons = await Promise.all([1, 2].map(type => getJson(`${BASE}/teams/${team}/schedule?seasontype=${type}`).catch(() => null)));
    return seasons.flatMap(season => season?.events || []).map(toGame)
      .filter(game => game.state !== 'post')
      .sort((a, b) => a.date - b.date)
      .slice(0, limit);
  } catch {
    return [];
  }
}

export async function latestNews(limit = 5) {
  try {
    const data = await getJson(`${BASE}/news?limit=20`);
    return data.articles
      .filter(article => article.type !== 'Media' && article.links?.web?.href)
      .slice(0, limit)
      .map(article => ({
        id: article.id,
        headline: article.headline,
        url: article.links.web.href,
        image: article.images?.[0]?.url,
        published: new Date(article.published),
      }));
  } catch {
    return [];
  }
}
