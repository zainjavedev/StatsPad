import React from 'react';
import SiteFooter from '../SiteFooter';

/* Blog pages are plain server pages with a small header and the site footer. The stats app does not load here. */
export default function BlogShell({children}) {
  return <div className="blog">
    <header className="blog-top">
      <a className="blog-brand" href="/">StatsPads</a>
      <nav aria-label="Main"><a href="/compare">Compare</a><a href="/leaders">Leaders</a><a href="/lineups">Lineups</a><a href="/blog">Blog</a></nav>
    </header>
    {children}
    <SiteFooter/>
  </div>;
}
