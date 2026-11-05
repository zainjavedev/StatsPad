import React from 'react';
import { ArrowRight } from 'lucide-react';
import { GAMES } from './GamesNav';

/* /play: one card per game, each with a small picture of how it plays. */
const ART = {
  '/play/guess': <div className="gm-art is-guess" aria-hidden="true">
    <svg viewBox="0 0 100 120"><circle cx="50" cy="32" r="20"/><path d="M12 120c0-34 14-52 38-52s38 18 38 52z"/></svg><b>?</b>
  </div>,
  '/play/quiz': <div className="gm-art is-quiz" aria-hidden="true">
    {['1', '2', '3', '4'].map(key => <span key={key} className={key === '3' ? 'on' : ''}><i>{key}</i></span>)}
  </div>,
};

export default function GamesHub() {
  return <main className="gm">
    <h1>Games</h1>
    <div className="gm-grid">{GAMES.map(game => <a key={game.href} href={game.href} className="gm-card">
      {ART[game.href]}
      <div className="gm-copy">
        <h2>{game.title}</h2>
        <p>{game.line}</p>
        <span className="gm-go">Play <ArrowRight size={16}/></span>
      </div>
    </a>)}</div>
  </main>;
}
