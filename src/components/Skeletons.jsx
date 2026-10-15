import React from 'react';
import TeamRail from './TeamRail';

/* Placeholder screens that mirror the real layouts, so the page keeps its
   shape while data loads. They reuse the real layout classes and only swap
   the content for shimmering blocks. */

const Sk = ({className = '', style}) => <div className={`sk ${className}`} style={style}/>;
const times = (count, render) => Array.from({length: count}, (_, index) => render(index));
const Rows = ({count = 5}) => <div className="sk-rows">{times(count, index => <Sk key={index} className="sk-row"/>)}</div>;

export function HomeSkeleton() {
  return <section className="front-page" aria-busy="true" aria-label="Loading">
    <Sk className="sk-hero"/>
    <div className="front-block">
      <Sk className="sk-title"/>
      <div className="debates">{times(3, index => <Sk key={index} className="sk-debate"/>)}</div>
    </div>
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
    <div className="sk-bar">
      <Sk className="sk-pill" style={{width: 170}}/>
      <Sk className="sk-pill" style={{width: 220}}/>
      <Sk className="sk-pill sk-push" style={{width: 250}}/>
    </div>
    <div className="vs-card">
      <div className="sk-vs-head"><Sk className="sk-vs-half"/><Sk className="sk-vs-half"/></div>
      {times(9, index => <Sk key={index} className="sk-vs-row"/>)}
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
