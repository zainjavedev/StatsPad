import React, { useEffect, useState } from 'react';
import { injuryIndex } from '../lib/injuries';
import { slugify } from '../lib/routes';

/* Soft-filled outline glyphs: a bandage, a first aid kit and an ambulance, drawn on the 24px grid. */
const tint = {fill: 'currentColor', fillOpacity: 0.2};

export const TierIcon = ({tier, size = 22}) => {
  const common = {width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true};
  if (tier === 'minor') return <svg {...common}><g transform="rotate(-45 12 12)"><rect {...tint} x="1.5" y="7.5" width="21" height="9" rx="4.5"/><rect x="8" y="7.5" width="8" height="9" fill="currentColor" fillOpacity=".12"/><path d="M8 7.5v9M16 7.5v9"/>{[[10.9, 10.6], [13.1, 10.6], [10.9, 13.4], [13.1, 13.4]].map(([x, y]) => <circle key={`${x}${y}`} cx={x} cy={y} r=".7" fill="currentColor" stroke="none"/>)}</g></svg>;
  if (tier === 'major') return <svg {...common}><path d="M9 7V5.5A1.5 1.5 0 0 1 10.5 4h3A1.5 1.5 0 0 1 15 5.5V7"/><rect {...tint} x="2.5" y="7" width="19" height="13" rx="2.5"/><path d="M12 10.5v6M9 13.5h6" strokeWidth="2.2"/></svg>;
  return <svg {...common}><path {...tint} d="M1.5 16.5V7.5A1.5 1.5 0 0 1 3 6h10.5v10.5z"/><path {...tint} d="M13.5 9.5h4.2l3.8 4v3h-8z"/><path d="M1.5 16.5h2M7.5 16.5h6M19.5 16.5h2"/><circle cx="5.5" cy="17.5" r="2"/><circle cx="16.5" cy="17.5" r="2"/><path d="M7.5 8.4v4.2M5.4 10.5h4.2" strokeWidth="2"/></svg>;
};

const WORDS = {minor: 'Minor injury', major: 'Out for a stretch', season: 'Out for the season'};

/* The bandage, first aid box or ambulance next to a player who is on the injury report; nothing for a healthy one. */
export default function InjuryMark({name, stage = false}) {
  const [index, setIndex] = useState(null);
  useEffect(() => {
    let live = true;
    injuryIndex().then(found => live && setIndex(found));
    return () => { live = false; };
  }, []);
  const item = index?.get(slugify(name));
  if (!item) return null;
  const label = `${WORDS[item.tier]}${item.area ? `: ${item.area}` : ''}`;
  return <span className={`inj-mark tier-${item.tier}${stage ? ' on-stage' : ''}`} title={label} role="img" aria-label={label}><TierIcon tier={item.tier} size={stage ? 16 : 14}/></span>;
}
