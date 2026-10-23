import React from 'react';
import pages from '../seo/pages.json';
import ClientApp from '../components/ClientApp';

/* Pages written by scripts/prerender.mjs: route -> {title, description, body, ogName}.
   A route that isn't in there (any other player or pairing) still opens the
   app with generic tags, kept out of the index so it doesn't compete with the real pages. */

export const routesUnder = prefix => Object.keys(pages).filter(route => route.startsWith(`${prefix}/`)).map(route => route.slice(prefix.length + 1));

export function seoMetadata(route) {
  const page = pages[route];
  if (!page) return {alternates: {canonical: route}, robots: {index: false}};
  const images = [page.ogName ? `/og/${page.ogName}.jpg` : '/og-default.jpg'];
  return {
    title: page.title,
    description: page.description,
    alternates: {canonical: route},
    openGraph: {type: 'website', siteName: 'StatsPads', locale: 'en_US', title: page.title, description: page.description, url: route, images: images.map(url => ({url, width: 1200, height: 630, alt: page.title}))},
    twitter: {card: 'summary_large_image', title: page.title, description: page.description, images: images.map(url => ({url, alt: page.title}))},
  };
}

export function SeoPage({route}) {
  return <>
    {(pages[route]?.jsonLd ?? []).map((data, index) => <script key={index} type="application/ld+json" dangerouslySetInnerHTML={{__html: JSON.stringify(data)}}/>)}
    <div className="seo-static" dangerouslySetInnerHTML={{__html: pages[route]?.body ?? ''}}/>
    <ClientApp/>
  </>;
}
