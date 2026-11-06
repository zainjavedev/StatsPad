import React from 'react';
import { ArrowRight } from 'lucide-react';
import { GAMES } from './GamesNav';

/* /play: one card per game, each with a small picture of how it plays. */
const ART = {
  '/play/guess': <div className="gm-art is-guess" aria-hidden="true">
    <svg viewBox="0 0 100 120"><circle cx="50" cy="32" r="20"/><path d="M12 120c0-34 14-52 38-52s38 18 38 52z"/></svg><b>?</b>
  </div>,
  '/play/blind': <div className="gm-art is-blind" aria-hidden="true">
    {['A', 'B'].map(key => <span key={key}><svg viewBox="0 0 100 120"><circle cx="50" cy="34" r="20"/><path d="M14 120c0-33 14-50 36-50s36 17 36 50z"/></svg><b>{key}</b></span>)}<i>VS</i>
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
    </a>)}
      {/* Not a round to play but where the Fixtures picks end up, so it sits with the games. */}
      <a href="/play/leaderboard" className="gm-card">
        <div className="gm-art is-board" aria-hidden="true">{[2, 1, 3].map(place => <span key={place} className={`p${place}`}><b>{place}</b></span>)}</div>
        <div className="gm-copy">
          <h2>Predictor leaderboard</h2>
          <p>Pick who wins every game on Fixtures before tip-off. Every right pick moves you up the board.</p>
          <span className="gm-go">See the board <ArrowRight size={16}/></span>
        </div>
      </a>
    </div>
  </main>;
}
