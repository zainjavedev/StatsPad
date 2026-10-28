import React from 'react';
import TeamRail from './TeamRail';

/* Placeholder screens that mirror the real layouts, so the page keeps its
   shape while data loads. They reuse the real layout classes and only swap
   the content for shimmering blocks. */

const Sk = ({className = '', style}) => <div className={`sk ${className}`} style={style}/>;
const times = (count, render) => Array.from({length: count}, (_, index) => render(index));
const Rows = ({count = 5}) => <div className="sk-rows">{times(count, index => <Sk key={index} className="sk-row"/>)}</div>;

/* The injury list's rows, built from the real row markup (rp-card) so the loading list is the size of the loaded one. */
export function InjuryRowsSkeleton({count = 9}) {
  return <ul className="rp-list rp-skeleton inj-list" aria-hidden="true">{times(count, index => <li key={index} className="inj-row"><div className="rp-card">
    <span className="rp-face"><i/></span>
    <span className="rp-main"><span className="rp-top"><b>Player Name</b></span><span className="rp-trio"><b>00</b><b>00</b><b>00</b></span><small className="rp-game">Injury</small></span>
  </div></li>)}</ul>;
}

export function InjuriesSkeleton() {
  return <section className="inj" aria-busy="true" aria-label="Loading the injury report">
    <div className="sched-head"><h1>NBA injury report</h1></div>
    <div className="inj-flat"><InjuryRowsSkeleton/></div>
  </section>;
}

export function HomeSkeleton() {
  return <section className="front-page" aria-busy="true" aria-label="Loading">
    <div className="sk-ticker"><Sk className="sk-ticker-pill"/><Sk className="sk-ticker-pill"/></div>
    <Sk className="sk-h2h"/>
    <div className="front-block">
      <Sk className="sk-title"/>
      <div className="leader-grid">{times(4, index => <Sk key={index} className="sk-leader"/>)}</div>
    </div>
    <div className="front-feeds">
      <div className="front-panel"><Sk className="sk-title"/><Rows count={5}/></div>
      <div className="front-panel"><Sk className="sk-title"/><Rows count={4}/></div>
    </div>
  </section>;
}

export function TeamSkeletonBody() {
  return <section className="team-page" aria-busy="true" aria-label="Loading roster">
    <Sk className="sk-team-hero"/>
    <div className="team-block">
      <Sk className="sk-title"/>
      <div className="starter-grid">{times(5, index => <Sk key={index} className="sk-starter"/>)}</div>
    </div>
    <div className="team-block team-feeds">
      <div className="team-games"><Sk className="sk-title sk-small"/><Rows count={3}/></div>
      <div className="team-games"><Sk className="sk-title sk-small"/><Rows count={3}/></div>
    </div>
    <div className="team-block">
      <Sk className="sk-title"/>
      <div className="sk-bench">{times(9, index => <Sk key={index} className="sk-bench-row"/>)}</div>
    </div>
  </section>;
}

/* Used before the league data arrives, when there is no TeamPage yet. */
export function TeamLoading({teamCode, color, onPick}) {
  return <div className="team-shell" style={{'--team': color}}>
    <TeamRail current={teamCode} onPick={onPick}/>
    <TeamSkeletonBody/>
  </div>;
}

export function CompareSkeleton() {
  return <section className="h2h-page" aria-busy="true" aria-label="Loading comparison">
    <div className="sk-cmp-bar"><Sk className="sk-pill"/><Sk className="sk-pill" style={{width: 128, flex: '0 0 auto'}}/></div>
    <Sk className="sk-pill" style={{height: 34, borderRadius: 999, margin: '8px 0'}}/>
    <div className="vs-card">
      <div className="sk-vs-head"><Sk className="sk-vs-half"/><Sk className="sk-vs-half"/></div>
      <Sk className="sk-vs-row" style={{height: 44}}/>
      {times(6, index => <Sk key={index} className="sk-vs-row"/>)}
    </div>
  </section>;
}

/* Leaders, teams and profile pages share a simple title-and-cards shape. */
export function PageSkeleton() {
  return <section className="front-page" aria-busy="true" aria-label="Loading">
    <Sk className="sk-title sk-big"/>
    <div className="leader-grid" style={{marginTop: 24}}>{times(8, index => <Sk key={index} className="sk-leader"/>)}</div>
    <div className="front-block"><Rows count={6}/></div>
  </section>;
}

/* A game: the two logos and the status, then the cards. */
export function GameSkeleton() {
  return <section className="gp" aria-busy="true" aria-label="Loading the game">
    <Sk className="sk-title sk-small" style={{width: 90, marginTop: 18}}/>
    <div className="sk-gp-score"><Sk className="sk-gp-logo"/><Sk className="sk-gp-num"/><Sk className="sk-gp-mid"/><Sk className="sk-gp-num"/><Sk className="sk-gp-logo"/></div>
    <Sk className="sk-title sk-small" style={{width: 110, margin: '14px 0 28px'}}/>
    <div className="sk-gp-tabs"><Sk className="sk-gp-tab" style={{width: 170}}/><Sk className="sk-gp-tab" style={{width: 130}}/></div>
    <div className="sk-gp-rows">{times(6, index => <div key={index} className="sk-gp-row"><Sk className="sk-gp-face"/><div><Sk className="sk-gp-line" style={{width: '62%'}}/><Sk className="sk-gp-line" style={{width: '82%', height: 34}}/></div><Sk className="sk-gp-grade"/></div>)}</div>
  </section>;
}

/* A player: the hero, the season tiles, then recent games. */
export function ProfileSkeleton() {
  return <section className="profile-page" aria-busy="true" aria-label="Loading the player">
    <Sk className="sk-title sk-small" style={{width: 110, marginTop: 10}}/>
    <Sk className="sk-hero" style={{minHeight: 234, height: 234}}/>
    <div className="sk-tiles">{times(10, index => <Sk key={index} className="sk-tile"/>)}</div>
    <Sk className="sk-title sk-small" style={{marginTop: 24}}/>
    <div className="sk-tiles sk-tiles-wide">{times(4, index => <Sk key={index} className="sk-tile sk-tile-wide"/>)}</div>
  </section>;
}

/* Stat leaders: back link, title and subtitle, the stat tabs, then the ranked cards. */
export function StatSkeleton() {
  return <section className="front-page" aria-busy="true" aria-label="Loading the leaders">
    <Sk className="sk-title sk-small" style={{width: 70, marginBottom: 18}}/>
    <Sk className="sk-title" style={{width: 220, height: 30, marginBottom: 8}}/>
    <Sk className="sk-title sk-small" style={{width: 110}}/>
    <div className="sk-tabs">{times(5, index => <Sk key={index} className="sk-tab"/>)}</div>
    <Sk className="sk-stat-top"/>
    <div className="sk-stat-rows">{times(7, index => <Sk key={index} className="sk-stat-row"/>)}</div>
  </section>;
}

/* Standings: title, the East/West switch, then one conference table. */
export function StandingsSkeleton() {
  return <section className="front-page" aria-busy="true" aria-label="Loading the standings">
    <Sk className="sk-title sk-big" style={{width: 190, marginTop: 20}}/>
    <Sk className="sk-switch"/>
    <div className="sk-table">
      <Sk className="sk-title sk-small" style={{width: 160, height: 16, margin: '4px 0 14px'}}/>
      {times(12, index => <Sk key={index} className="sk-table-row"/>)}
    </div>
  </section>;
}

/* Schedule: title, the team and opponent pickers, the upcoming/played switch, then a day of games. */
export function ScheduleSkeleton() {
  return <section className="front-page" aria-busy="true" aria-label="Loading the schedule">
    <Sk className="sk-title sk-big" style={{width: 200, marginTop: 20}}/>
    <div className="sk-pickers"><Sk className="sk-picker"/><Sk className="sk-picker"/></div>
    <Sk className="sk-switch"/>
    <div className="sk-table">
      <Sk className="sk-title sk-small" style={{width: 110, height: 16, margin: '4px 0 18px'}}/>
      <Sk className="sk-title" style={{width: 150, height: 24, marginBottom: 14}}/>
      {times(8, index => <Sk key={index} className="sk-game-row"/>)}
    </div>
  </section>;
}

/* A team's lineup page: the team rail, the banner, then the starting five. */
export function LineupSkeleton() {
  return <section className="front-page sk-lineup" aria-busy="true" aria-label="Loading the lineup">
    <div className="sk-rail">{times(6, index => <div key={index}><Sk className="sk-rail-logo"/><Sk className="sk-rail-name"/></div>)}</div>
    <Sk className="sk-lu-hero"/>
    <Sk className="sk-title" style={{width: 230, margin: '26px 0 14px'}}/>
    <div className="sk-lu-cards">{times(5, index => <Sk key={index} className="sk-lu-card"/>)}</div>
  </section>;
}

/* The teams hub: a grid of team tiles. */
export function TilesSkeleton() {
  return <section className="front-page" aria-busy="true" aria-label="Loading the teams">
    <Sk className="sk-title sk-big" style={{width: 'min(420px,86%)', marginTop: 8}}/>
    <Sk className="sk-title" style={{width: 'min(560px,100%)', height: 74, margin: '6px 0 20px'}}/>
    <Sk className="sk-alert"/>
    <Sk className="sk-search"/>
    <div className="sk-tabs">{times(5, index => <Sk key={index} className="sk-tab" style={{width: 74}}/>)}</div>
    <div className="sk-tiles sk-tiles-teams">{times(12, index => <Sk key={index} className="sk-tile sk-tile-team"/>)}</div>
  </section>;
}

/* The placeholder for a path, so a page goes from one skeleton to its own content. */
export function skeletonForPath(path) {
  if (/^\/games\//.test(path)) return <GameSkeleton/>;
  if (/^\/players\//.test(path)) return <ProfileSkeleton/>;
  if (path === '/lineups') return <TilesSkeleton/>;
  if (/^\/lineups\//.test(path)) return <LineupSkeleton/>;
  if (path === '/standings') return <StandingsSkeleton/>;
  if (path === '/schedule') return <ScheduleSkeleton/>;
  if (path === '/injuries') return <InjuriesSkeleton/>;
  if (/^\/stats\//.test(path) || path === '/leaders') return <StatSkeleton/>;
  return <PageSkeleton/>;
}
