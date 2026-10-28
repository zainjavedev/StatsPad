import React from 'react';
import pages from '../seo/pages.json';
import ClientApp from '../components/ClientApp';
import { socialTags } from './social';

/* Pages written by scripts/prerender.mjs: route -> {title, description, body, ogName}.
   A route that isn't in there (any other player or pairing) still opens the
   app with generic tags, kept out of the index so it doesn't compete with the real pages. */

export const routesUnder = prefix => Object.keys(pages).filter(route => route.startsWith(`${prefix}/`)).map(route => route.slice(prefix.length + 1));

export function seoMetadata(route) {
  const page = pages[route];
  if (!page) return {alternates: {canonical: route}, robots: {index: false}};
  return {
    title: page.title,
    description: page.description,
    alternates: {canonical: route},
    ...socialTags({title: page.title, description: page.description, route, type: page.og?.type ?? 'website', og: page.og?.fields}),
  };
}

/* The same links on every static page, so the hub pages (home, compare, leaders...) get an incoming link from every other page. Stat rankings are linked from /leaders and from each other. */
const HUBS = [['/', 'Home'], ['/compare', 'Compare players and teams'], ['/stats/points', 'Stat leaders'], ['/stats/teams', 'Team leaders'], ['/lineups', 'Starting lineups and teams'], ['/ladders/mvp', 'MVP ladder'], ['/ladders/roty', 'Rookie of the Year ladder'], ['/blog', 'Blog'], ['/standings', 'Standings'], ['/injuries', 'Injury report'], ['/schedule', 'Schedule'], ['/scores', 'Scores'], ['/about', 'About StatsPads'], ['/contact', 'Contact'], ['/terms', 'Terms of service'], ['/privacy', 'Privacy'], ['/llms.txt', 'llms.txt']];

/* Pages whose written copy stays on screen under the app (the app hides the rest once it loads): the copy is what search engines read for these routes, and a reader gets the summary, FAQ and career table too. */
const VISIBLE = /^\/(compare\/|players\/|lineups\/|games\/)/;

export function SeoPage({route, page = pages[route]}) {
  return <>
    {(page?.jsonLd ?? []).map((data, index) => <script key={index} type="application/ld+json" dangerouslySetInnerHTML={{__html: JSON.stringify(data)}}/>)}
    <nav className="seo-static" aria-label="StatsPads">
      {HUBS.map(([href, label]) => <a key={href} href={href}>{label}</a>)}
    </nav>
    <div className={VISIBLE.test(route) ? 'seo-static seo-copy' : 'seo-static'} dangerouslySetInnerHTML={{__html: page?.body ?? ''}}/>
    <ClientApp route={route}/>
  </>;
}
