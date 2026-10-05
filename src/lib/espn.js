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

/* Headline-level fields only: the summary, photo, byline and the players and
   teams ESPN tags. The full article text is ESPN's and stays on ESPN. */
function toStory(article) {
  const tagged = type => (article.categories || []).filter(category => category.type === type).map(category => category.description).filter(Boolean);
  return {
    id: String(article.id),
    headline: article.headline,
    summary: article.description || '',
    byline: article.byline || null,
    url: article.links?.web?.href,
    image: article.images?.[0]?.url,
    published: new Date(article.published),
    athletes: tagged('athlete'),
    teams: tagged('team'),
  };
}

let newsCache = null;
const newsList = () => (newsCache ||= getJson(`${BASE}/news?limit=50`)
  .then(data => data.articles.filter(article => article.type !== 'Media' && article.links?.web?.href).map(toStory))
  .catch(() => { newsCache = null; return []; }));

export async function latestNews(limit = 5) {
  return (await newsList()).slice(0, limit);
}

/* A story from the recent list, or looked up by id once it has rotated out. */
export async function storyById(id) {
  const recent = (await newsList()).find(story => story.id === String(id));
  if (recent) return recent;
  try {
    const data = await getJson(`https://content.core.api.espn.com/v1/sports/news/${encodeURIComponent(id)}`);
    const article = data.headlines?.[0];
    return article ? toStory(article) : null;
  } catch {
    return null;
  }
}
