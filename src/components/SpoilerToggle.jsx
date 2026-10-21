import React from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { setShowScores, useSpoilers } from '../lib/spoilers';

export default function SpoilerToggle() {
  const {all} = useSpoilers();
  return <button type="button" className="spoiler-toggle" aria-pressed={all} onClick={() => setShowScores(!all)}>
    {all ? <EyeOff size={14}/> : <Eye size={14}/>}{all ? 'Hide scores' : 'Show scores'}
  </button>;
}

/* A hidden score: tap to reveal just this game. */
export const Hidden = ({id, onReveal}) => <button type="button" className="spoiler-hidden" onClick={event => { event.stopPropagation(); onReveal(id); }} aria-label="Show score">Tap to show</button>;
