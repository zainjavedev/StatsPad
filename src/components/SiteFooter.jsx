import React from 'react';

/* One footer for every page: where to go, where the numbers come from, and that this is a fan project. */
const LINKS = [['Home', '/'], ['Schedule', '/schedule'], ['Standings', '/standings'], ['Leaders', '/stats/points'], ['Compare', '/compare'], ['Teams', '/teams'], ['Lineups', '/lineups'], ['Blog', '/blog'], ['About', '/about'], ['Contact', '/contact'], ['Terms', '/terms'], ['Privacy', '/privacy']];

export default function SiteFooter() {
  return <footer className="site-footer">
    <div className="sf-top">
      <div className="sf-brand">
        <b>StatsPads</b>
        <p>Every NBA number in one glance: results, leaders, standings and who beats whom.</p>
      </div>
      <nav className="sf-links" aria-label="Footer">{LINKS.map(([label, href]) => <a key={href} href={href}>{label}</a>)}</nav>
    </div>
    <div className="sf-bottom">
      <span>Scores, stats and news from <a href="https://www.espn.com/nba/" target="_blank" rel="noreferrer">ESPN</a>. Refreshed through the day.</span>
      <span>An independent fan project, not affiliated with the NBA or its teams.</span>
    </div>
  </footer>;
}
