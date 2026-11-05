import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Moon, Sun } from 'lucide-react';
import { CompareGlyph, FixturesGlyph, GamesGlyph, HomeGlyph, LeadersGlyph } from './NavIcons';
import AccountButton from './AccountButton';
import SideNav from './SideNav';
import SiteSearch from './SiteSearch';

/* Pages that aren't a menu item themselves light up the item they live under, the same as the server pages do. */
const SECTION = {team:'teams', injuries:'teams', game:'scores', schedule:'scores', stat:'leaders', teamstat:'leaders'};
/* The phone's bottom bar; wide screens get the left menu (SideNav) instead. */
const TABS = [['home','Home',HomeGlyph],['leaders','Leaders',LeadersGlyph],['scores','Fixtures',FixturesGlyph],['compare','Compare',CompareGlyph],['play','Games',GamesGlyph]];

/* A banner div, not <header>, so none of the old header rules apply. The tab
   bar is a sibling because a blurred parent would trap a fixed child. */
export default function SiteHeader({page,onHome,onLeaders,onCompare,onTeams,theme,onToggleTheme}){
  const router=useRouter();
  /* Games and the blog are their own pages; fetching them ahead and moving with the router keeps the page from reloading. */
  useEffect(()=>{router.prefetch('/play');router.prefetch('/blog')},[router]);
  const current=SECTION[page]??page,go={home:onHome,leaders:onLeaders,compare:onCompare,teams:onTeams,blog:()=>router.push('/blog'),play:()=>router.push('/play'),performances:()=>router.push('/top-performances'),scores:()=>router.push('/scores'),standings:()=>router.push('/standings')};
  return <>
    <div className="site-header" role="banner"><div className="site-header-inner">
      <button className="site-brand" onClick={()=>onHome()}><svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><circle cx="12" cy="12" r="9.5"/><path d="M12 2.5v19M2.5 12h19M5.6 5.6c3.4 3.4 3.4 9.4 0 12.8M18.4 5.6c-3.4 3.4-3.4 9.4 0 12.8"/></svg>StatsPads</button>
      <SiteSearch spa/>
      <div className="site-header-end"><AccountButton/><button className="theme-toggle" onClick={onToggleTheme} aria-label={theme==='dark'?'Switch to light theme':'Switch to dark theme'} title={theme==='dark'?'Light theme':'Dark theme'}>{theme==='dark'?<Sun size={16}/>:<Moon size={16}/>}</button></div>
    </div></div>
    <nav className="tabbar" aria-label="Main">{TABS.map(([key,label,Icon])=><button key={key} className={current===key?'active':''} aria-current={current===key?'page':undefined} onClick={()=>go[key]()}><Icon size={19} className="nav-icon"/><span>{label}</span></button>)}</nav>
    <SideNav current={current} go={go}/>
  </>;
}
