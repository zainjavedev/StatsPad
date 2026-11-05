import React from 'react';
import { Share2 } from 'lucide-react';

/* The games hub at /play and the top of every game page: a way back to the hub, the title, and (when there is
   something to share) a small share button opposite the title. Both games use it so they line up the same. */
export const GAMES = [
  {href: '/play/guess', title: 'Guess the player', line: 'A shot chart and a stat line from a real game this season. Which starter is it?', tag: '10 rounds · 3 choices'},
  {href: '/play/blind', title: 'Blind test', line: 'Two players, names hidden. Pick the better one from the stats, then see who they were. Some will surprise you.', tag: '10 pairs · new every day'},
  {href: '/play/quiz', title: 'Stats quiz', line: 'Ten questions about this season: league leaders, team leaders, head to heads, standings.', tag: '10 questions · never repeats'},
];

export default function GameHead({title, onShare, extra}) {
  return <div className="gh">
    <div className="gh-row">
      <div><h1>{title}</h1></div>
      <div className="gh-side">
        {extra}
        {onShare && <button type="button" className="gh-share" onClick={onShare} aria-label="Share as an image"><Share2 size={16}/> Share</button>}
      </div>
    </div>
  </div>;
}
