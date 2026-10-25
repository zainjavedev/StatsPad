import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { BarChart3, BookOpen, Flame, Gamepad2, Home as HomeIcon, Moon, Sun, Trophy, Users } from 'lucide-react';
import AccountButton from './AccountButton';

const NAV_ITEMS = [['home','Home',HomeIcon],['leaders','Leaders',Trophy],['scores','Scores',Flame],['compare','Compare',BarChart3],['teams','Teams',Users],['play','Games',Gamepad2],['blog','Blog',BookOpen]];

/* A banner div, not <header>, so none of the old header rules apply. The tab
   bar is a sibling because a blurred parent would trap a fixed child. */
export default function SiteHeader({page,onHome,onLeaders,onCompare,onTeams,theme,onToggleTheme}){
  const router=useRouter();
  /* Games and the blog are their own pages; fetching them ahead and moving with the router keeps the page from reloading. */
  useEffect(()=>{router.prefetch('/play');router.prefetch('/blog')},[router]);
  const current=page==='team'?'teams':page,go={home:onHome,leaders:onLeaders,compare:onCompare,teams:onTeams,blog:()=>router.push('/blog'),play:()=>router.push('/play'),scores:()=>router.push('/scores')};
  const TABBAR_KEYS=['home','scores','play'];
  const tabs=(className,items=NAV_ITEMS)=><nav className={className} aria-label="Main">{items.map(([key,label,Icon])=><button key={key} className={current===key?'active':''} aria-current={current===key?'page':undefined} onClick={()=>go[key]()}><Icon size={19} className="nav-icon"/><span>{label}</span></button>)}</nav>;
  return <>
    <div className="site-header" role="banner"><div className="site-header-inner">
      <button className="site-brand" onClick={()=>onHome()}><svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><circle cx="12" cy="12" r="9.5"/><path d="M12 2.5v19M2.5 12h19M5.6 5.6c3.4 3.4 3.4 9.4 0 12.8M18.4 5.6c-3.4 3.4-3.4 9.4 0 12.8"/></svg>StatsPads</button>
      {tabs('site-nav')}
      <div className="site-header-end"><AccountButton/><button className="theme-toggle" onClick={onToggleTheme} aria-label={theme==='dark'?'Switch to light theme':'Switch to dark theme'} title={theme==='dark'?'Light theme':'Dark theme'}>{theme==='dark'?<Sun size={16}/>:<Moon size={16}/>}</button></div>
    </div></div>
    {tabs('tabbar',NAV_ITEMS.filter(([key])=>TABBAR_KEYS.includes(key)))}
  </>;
}
