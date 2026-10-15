import React from 'react';

/* Two profiles on one chart. Every spoke is a league percentile, so a point
   further out means higher up the league, and the shapes show where the two
   differ at a glance. Hover a point for the number behind it. */

const SIZE = {width: 480, height: 400, cx: 240, cy: 200, radius: 138};
const RINGS = [25, 50, 75, 100];

const point = (index, count, fraction, push = 0) => {
  const angle = -Math.PI / 2 + (index / count) * Math.PI * 2;
  const distance = SIZE.radius * fraction + push;
  return [SIZE.cx + Math.cos(angle) * distance, SIZE.cy + Math.sin(angle) * distance];
};
const path = (count, fractionOf) => Array.from({length: count}, (_, index) => point(index, count, fractionOf(index)).map(value => value.toFixed(1)).join(',')).join(' ');
const anchorFor = x => x < SIZE.cx - 8 ? 'end' : x > SIZE.cx + 8 ? 'start' : 'middle';

export default function Radar({axes, names, colors, scope, notes = []}) {
  const count = axes.length;
  return <section className="vs-radar">
    <div className="vs-radar-head">
      <small>Shape of their game · vs the league{scope ? `: ${scope}` : ''}</small>
      <span className="vs-radar-key">{names.map((name, side) => <span key={name}><i style={{background: colors[side]}}/>{name}</span>)}</span>
    </div>
    <svg viewBox={`0 0 ${SIZE.width} ${SIZE.height}`} role="img" aria-label={`Radar chart comparing ${names.join(' and ')} across ${axes.map(axis => axis.label).join(', ')}`}>
      {RINGS.map(ring => <polygon key={ring} className="radar-ring" points={path(count, () => ring / 100)}/>)}
      {axes.map((axis, index) => {
        const [x, y] = point(index, count, 1);
        const [lx, ly] = point(index, count, 1, 20);
        return <g key={axis.label}>
          <line className="radar-spoke" x1={SIZE.cx} y1={SIZE.cy} x2={x} y2={y}/>
          <text className="radar-label" x={lx} y={ly} textAnchor={anchorFor(lx)} dominantBaseline="middle">{axis.label}</text>
        </g>;
      })}
      {names.map((name, side) => {
        const points = path(count, index => Math.max(axes[index].sides[side].pct, 3) / 100);
        return <g key={name}>
          <polygon className="radar-halo" points={points}/>
          <polygon className="radar-shape" points={points} style={{fill: colors[side], stroke: colors[side]}}/>
          {axes.map((axis, index) => {
            const [x, y] = point(index, count, Math.max(axis.sides[side].pct, 3) / 100);
            return <circle key={axis.label} className="radar-dot" cx={x} cy={y} r="4" style={{fill: colors[side]}}>
              <title>{`${name} · ${axis.label}: ${axis.sides[side].text} (${axis.sides[side].rank})`}</title>
            </circle>;
          })}
        </g>;
      })}
    </svg>
    {notes.length > 0 && <ul className="vs-radar-notes">{notes.map(note => <li key={note}>{note}</li>)}</ul>}
  </section>;
}
