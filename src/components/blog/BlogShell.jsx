import React from 'react';
import Link from 'next/link';
import { BarChart3, BookOpen, Flame, Gamepad2, Home, Trophy, Users } from 'lucide-react';
import SiteFooter from '../SiteFooter';
import Warm from './Warm';
import AccountButton from '../AccountButton';
import ThemeToggle from './ThemeToggle';

/* The same banner the stats app wears, as plain links so the page stays a server page. */
const NAV = [['/', 'Home', Home], ['/leaders', 'Leaders', Trophy], ['/performances', 'Performances', Flame], ['/compare', 'Compare', BarChart3], ['/lineups', 'Teams', Users], ['/play', 'Games', Gamepad2], ['/blog', 'Blog', BookOpen]];

/* The phone's bottom bar, the same three tabs the stats app shows. */
const TABS = [['/', 'Home', Home], ['/performances', 'Performances', Flame], ['/play', 'Games', Gamepad2]];

export default function BlogShell({children, active = '/blog', className = '', tabs = true}) {
  return <div className={`blog ${className}`}>
    <div className="site-header" role="banner"><div className="site-header-inner">
      <Link className="site-brand" href="/"><svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><circle cx="12" cy="12" r="9.5"/><path d="M12 2.5v19M2.5 12h19M5.6 5.6c3.4 3.4 3.4 9.4 0 12.8M18.4 5.6c-3.4 3.4-3.4 9.4 0 12.8"/></svg>StatsPads</Link>
      <nav className="site-nav" aria-label="Main">{NAV.map(([href, label, Icon]) => <Link key={href} href={href} className={href === active ? 'active' : ''} aria-current={href === active ? 'page' : undefined}><Icon size={19} className="nav-icon"/><span>{label}</span></Link>)}</nav>
      <div className="site-header-end"><AccountButton/><ThemeToggle/></div>
    </div></div>
    {children}
    <SiteFooter/>
    <Warm/>
    {tabs && <nav className="tabbar" aria-label="Main">{TABS.map(([href, label, Icon]) => <Link key={href} href={href} className={href === active ? 'active' : ''} aria-current={href === active ? 'page' : undefined}><Icon size={19} className="nav-icon"/><span>{label}</span></Link>)}</nav>}
  </div>;
}
