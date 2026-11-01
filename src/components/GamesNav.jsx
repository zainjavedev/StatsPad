import React from 'react';

/* The games on /play, side by side so each is one tap from the other. */
const GAMES = [['/play', 'Guess the player'], ['/play/quiz', 'Stats quiz']];

export default function GamesNav({active}) {
  return <nav className="games-nav" aria-label="Games">{GAMES.map(([href, label]) => <a key={href} href={href} className={href === active ? 'on' : ''} aria-current={href === active ? 'page' : undefined}>{label}</a>)}</nav>;
}
