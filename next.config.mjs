import fs from 'node:fs';

/* scripts/prerender.mjs maps each finished game's id to its slug URL; the bare id then gets a permanent redirect (the query string, like ?player=, is kept). */
let gameRedirects = {};
try { gameRedirects = JSON.parse(fs.readFileSync(new URL('./src/seo/game-redirects.json', import.meta.url), 'utf8')); } catch { /* not generated yet */ }

/** @type {import('next').NextConfig} */
export default {
  // The app reads location and history directly and was never wrapped in StrictMode.
  reactStrictMode: false,
  // The old Vercel address sends visitors and search engines to the real domain.
  // Basic security headers for every response. A full Content-Security-Policy is left out on purpose: Tag Manager, analytics and Google sign-in all inject scripts, so it needs testing before it goes live.
  async headers() {
    return [
      /* The stat files only change when the bot rebuilds them (every few hours) or a game night lands, so the browser may reuse them
         for two minutes and then show the old copy while it fetches a fresh one in the background. */
      {source: '/data/:path*', headers: [{key: 'Cache-Control', value: 'public, max-age=120, s-maxage=300, stale-while-revalidate=3600'}]},
      {source: '/:path*', headers: [
      {key: 'X-Content-Type-Options', value: 'nosniff'},
      {key: 'X-Frame-Options', value: 'SAMEORIGIN'},
      {key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin'},
      {key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()'},
      {key: 'Content-Security-Policy', value: "frame-ancestors 'self'"},
    ]},
    ];
  },
  async redirects() {
    return [
      ...Object.entries(gameRedirects).map(([id, destination]) => ({source: `/games/${id}`, destination, permanent: true})),
      {source: '/teams', destination: '/lineups', permanent: true},
      {source: '/teams/:slug', destination: '/lineups/:slug', permanent: true},
      {source: '/leaders', destination: '/stats/points', permanent: true},
      {source: '/leaders/:type', destination: '/stats/points', permanent: true},
      {source: '/:path*', has: [{type: 'host', value: 'stats-pad.vercel.app'}], destination: 'https://statspads.com/:path*', permanent: true},
    ];
  },
};
