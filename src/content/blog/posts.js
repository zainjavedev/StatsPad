/* The list of posts. Plain data so the build script can read it too (sitemap, llms.txt).
   draft: true keeps a post out of the routes, the sitemap and llms.txt. */
export const POSTS = [
  {
    slug: 'how-are-the-sixers-8-1',
    title: 'How are the Sixers 8–1?',
    description: 'Philadelphia is 20th in scoring and 23rd in shooting efficiency but has the best record in the NBA. Defense, turnovers, 4th quarters and a 7–0 close-game record explain it.',
    date: '2026-11-05',
    draft: false,
    tag: 'Team breakdown',
    /* The starting five by games started, Maxey in the middle, plus the team logo. */
    cover: {players: [{name: 'VJ Edgecombe', id: '5124612'}, {name: 'Jaylen Brown', id: '3917376'}, {name: 'Tyrese Maxey', id: '4431678'}, {name: 'Joel Embiid', id: '3059318'}, {name: 'LeBron James', id: '1966'}], team: 'PHI', colors: ['#006bb6', '#0a4a8f']},
  },
  {
    slug: 'doncic-vs-gilgeous-alexander-shot-efficiency',
    title: 'Dončić vs Gilgeous-Alexander: who got more from every shot',
    description: 'Luka Dončić scored 33.5 points a game in 2025–26 and Shai Gilgeous-Alexander 31.1. Shot volume, true shooting and a radar show where the gap comes from.',
    date: '2026-10-23',
    draft: false,
    tag: 'Head to head',
    /* Cover art: ESPN headshot ids and the two team colours. */
    cover: {players: [{name: 'Luka Dončić', id: '3945274'}, {name: 'Shai Gilgeous-Alexander', id: '4278073'}], colors: ['#552583', '#007ac1']},
  },
];
export const published = () => POSTS.filter(post => !post.draft).sort((a, b) => b.date.localeCompare(a.date));
