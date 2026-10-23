/* The list of posts. Plain data so the build script can read it too (sitemap, llms.txt).
   draft: true keeps a post out of the routes, the sitemap and llms.txt. */
export const POSTS = [
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
