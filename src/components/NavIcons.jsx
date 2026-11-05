import React from 'react';

/* StatsPads' own navigation icons: one 24px grid, thin 1.6 strokes, round ends, no fills except a single dot where a
   detail needs weight. The open section draws a little bolder (see .side-link.active / .tabbar .active in style.css).
   Kept apart from the lucide icons used inside pages, so the menu has a look of its own. */
const Glyph = ({size = 20, className = '', children}) => <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor"
  strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={`nav-glyph ${className}`}>{children}</svg>;
const Dot = props => <circle {...props} fill="currentColor" stroke="none"/>;

/* A house with an arched door. */
export const HomeGlyph = props => <Glyph {...props}><path d="M4 10.4 12 4l8 6.4V19a1.5 1.5 0 0 1-1.5 1.5H5.5A1.5 1.5 0 0 1 4 19z"/><path d="M9.5 20.5v-5.2a2.5 2.5 0 0 1 5 0v5.2"/></Glyph>;
/* A calendar page with one game marked. */
export const FixturesGlyph = props => <Glyph {...props}><rect x="4" y="5.5" width="16" height="15" rx="2.5"/><path d="M4 10h16M8.5 3.5v4M15.5 3.5v4"/><Dot cx="15.5" cy="15.2" r="1.7"/></Glyph>;
/* A podium: first, second, third. */
export const LeadersGlyph = props => <Glyph {...props}><path d="M9 20.5V9.5h6v11M9 20.5H3.5v-6H9M15 20.5h5.5v-8H15"/><path d="M12 3.5l.9 1.8 2 .3-1.45 1.4.35 2-1.8-.95-1.8.95.35-2L9.1 5.6l2-.3z"/></Glyph>;
/* A flame: the best lines of the latest nights. */
export const PerformancesGlyph = props => <Glyph {...props}><path d="M12 3.5c.6 3.2-2.6 4.6-2.6 8.2a2.6 2.6 0 0 0 5.2 0c0-1.1-.5-2.1-1.1-2.9 2.3 1.1 4.2 3.4 4.2 6.3a5.7 5.7 0 0 1-11.4 0c0-4.8 4.1-7.2 5.7-11.6z"/></Glyph>;
/* A ladder: the award races. */
export const LaddersGlyph = props => <Glyph {...props}><path d="M8 3.5v17M16 3.5v17M8 7.5h8M8 12h8M8 16.5h8"/></Glyph>;
/* Ranked rows, the top one set apart. */
export const StandingsGlyph = props => <Glyph {...props}><path d="M9.5 6.5h10M9.5 12h10M9.5 17.5h10"/><Dot cx="5" cy="6.5" r="1.5"/><circle cx="5" cy="12" r="1.2"/><circle cx="5" cy="17.5" r="1.2"/></Glyph>;
/* Two players overlapping: side by side. */
export const CompareGlyph = props => <Glyph {...props}><circle cx="9" cy="12" r="5.5"/><circle cx="15" cy="12" r="5.5"/></Glyph>;
/* A jersey. */
export const TeamsGlyph = props => <Glyph {...props}><path d="M8.6 3.8 4 6.2v4.6l2.6.6v9.1h10.8v-9.1l2.6-.6V6.2l-4.6-2.4c-.5 1.5-1.8 2.4-3.4 2.4s-2.9-.9-3.4-2.4z"/></Glyph>;
/* A game controller: the quiz and Guess the Player. */
export const GamesGlyph = props => <Glyph {...props}><path d="M7.2 8.5h9.6a4 4 0 0 1 3.9 4.9l-.7 3.2a2.2 2.2 0 0 1-3.8 1L15 16h-6l-1.2 1.6a2.2 2.2 0 0 1-3.8-1l-.7-3.2a4 4 0 0 1 3.9-4.9z"/><path d="M8.5 11.3v3M7 12.8h3"/><Dot cx="15.6" cy="12" r="1"/><Dot cx="17.2" cy="13.8" r="1"/></Glyph>;
export const PlusGlyph = props => <Glyph {...props}><path d="M12 6v12M6 12h12"/></Glyph>;
