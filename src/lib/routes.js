import { TEAMS } from './teams.js';

/* Clean URLs for the app and the build step: /compare/luka-doncic-vs-nikola-jokic,
   /teams/san-antonio-spurs, /players/luka-doncic. routeParams turns a path back
   into the query parameters the app already understands, so old ?players=...
   links keep working. */

const env = typeof process !== 'undefined' ? process.env : {};
export const SITE = env.SITE_URL || 'https://stats-pad.vercel.app';

export const slugify = name => name.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/['’.]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

export const TEAM_SLUGS = Object.fromEntries(Object.entries(TEAMS).map(([code, team]) => [slugify(team.name), code]));

export const teamUrl = code => `/teams/${slugify(TEAMS[code].name)}`;
export const playerUrl = name => `/players/${slugify(name)}`;

/* Alphabetical, so a pair always has exactly one address. */
export function compareUrl(names, _mode, seasonType = 'regular-season') {
  const [a, b] = names.map(slugify).sort();
  const base = a && b ? `/compare/${a}-vs-${b}` : '/compare';
  return seasonType === 'playoffs' ? `${base}?type=playoffs` : base;
}

export function routeParams(pathname = '/', search = '') {
  const params = new URLSearchParams(search);
  const path = pathname.replace(/\/+$/, '') || '/';
  const compare = path.match(/^\/compare\/(.+?)-vs-(.+)$/);
  const team = path.match(/^\/teams\/(.+)$/);
  const player = path.match(/^\/players\/(.+)$/);
  if (compare) {
    const slugs = [compare[1], compare[2]];
    if (slugs.every(slug => TEAM_SLUGS[slug])) {
      params.set('mode', 'team');
      params.set('players', slugs.map(slug => TEAMS[TEAM_SLUGS[slug]].name).join('|'));
    } else {
      params.set('players', slugs.join('|'));
    }
  } else if (path === '/compare') {
    if (!params.has('players')) params.set('players', '');
  } else if (team && TEAM_SLUGS[team[1]]) {
    params.set('team', TEAM_SLUGS[team[1]]);
  } else if (path === '/teams') {
    params.set('view', 'teams');
  } else if (path === '/leaders') {
    params.set('view', 'leaders');
  } else if (player) {
    params.set('profile', player[1]);
  }
  return params;
}

export const matchesName = (name, wanted) => name === wanted || slugify(name) === wanted;
