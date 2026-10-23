import React from 'react';
import { BarChart3, BookOpen, Flame, Home, Trophy, User, Users } from 'lucide-react';
import SiteFooter from '../SiteFooter';

/* The same banner the stats app wears, as plain links so the page stays a server page. */
const NAV = [['/', 'Home', Home], ['/leaders', 'Leaders', Trophy], ['/performances', 'Performances', Flame], ['/compare', 'Compare', BarChart3], ['/teams', 'Teams', Users], ['/blog', 'Blog', BookOpen]];

export default function BlogShell({children}) {
  return <div className="blog">
    <div className="site-header" role="banner"><div className="site-header-inner">
      <a className="site-brand" href="/"><svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><circle cx="12" cy="12" r="9.5"/><path d="M12 2.5v19M2.5 12h19M5.6 5.6c3.4 3.4 3.4 9.4 0 12.8M18.4 5.6c-3.4 3.4-3.4 9.4 0 12.8"/></svg>StatsPads</a>
      <nav className="site-nav" aria-label="Main">{NAV.map(([href, label, Icon]) => <a key={href} href={href} className={href === '/blog' ? 'active' : ''} aria-current={href === '/blog' ? 'page' : undefined}><Icon size={19} className="nav-icon"/><span>{label}</span></a>)}</nav>
      <div className="site-header-end"><a className="account-btn signed-out" href="/signin" aria-label="Sign in" title="Sign in"><User size={16}/></a></div>
    </div></div>
    {children}
    <SiteFooter/>
  </div>;
}
