import React, { useState } from 'react';

/* Two profiles on one chart. Every spoke is a league percentile, so a point
   further out means higher up the league, and the shapes show where the two
   differ at a glance. Hover a point for the number behind it. */

const SIZE = {width: 560, height: 400, cx: 280, cy: 200, radius: 138};
const RINGS = [25, 50, 75, 100];

const point = (index, count, fraction, push = 0) => {
  const angle = -Math.PI / 2 + (index / count) * Math.PI * 2;
  const distance = SIZE.radius * fraction + push;
  return [SIZE.cx + Math.cos(angle) * distance, SIZE.cy + Math.sin(angle) * distance];
};
const path = (count, fractionOf) => Array.from({length: count}, (_, index) => point(index, count, fractionOf(index)).map(value => value.toFixed(1)).join(',')).join(' ');
const anchorFor = x => x < SIZE.cx - 8 ? 'end' : x > SIZE.cx + 8 ? 'start' : 'middle';

export default function Radar({axes, names, colors, views = [], view, onView, blurb}) {
  const count = axes.length, [tip, setTip] = useState(null);
  return <section className="vs-radar">
    <div className="vs-radar-head">
      <span className="vs-radar-key">{names.map((name, side) => <span key={name}><i style={{background: colors[side]}}/>{name}</span>)}</span>
    </div>
    {views.length > 1 && <div className="vs-radar-tabs">
      <div className="radar-tabs" role="group" aria-label="Radar view">{views.map(item => <button key={item.key} className={item.key === view ? 'active' : ''} onClick={() => onView(item.key)}>{item.label}</button>)}</div>
      {blurb && <span>{blurb}</span>}
    </div>}
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
        </g>;
      })}
      {/* Dots go last so neither player's shape covers the other's points. */}
      {names.map((name, side) => axes.map((axis, index) => {
        const [x, y] = point(index, count, Math.max(axis.sides[side].pct, 3) / 100);
        const show = () => setTip({x, y, color: colors[side], value: axis.sides[side].text});
        return <g key={`${name}-${axis.label}`} onMouseEnter={show} onMouseLeave={() => setTip(null)} onClick={show} tabIndex={0} onFocus={show} onBlur={() => setTip(null)} style={{cursor: 'pointer', outline: 'none'}}>
          <circle cx={x} cy={y} r="13" fill="transparent"/>
          <circle className="radar-dot" cx={x} cy={y} r="5" style={{fill: colors[side]}}/>
        </g>;
      }))}
      {tip && (() => {
        const width = 112, height = 38, left = Math.max(6, Math.min(SIZE.width - width - 6, tip.x - width / 2)), top = tip.y > SIZE.cy ? tip.y - height - 12 : tip.y + 12;
        return <g className="radar-tip" pointerEvents="none">
          <rect x={left} y={top} width={width} height={height} rx="10"/>
          <text x={left + 12} y={top + 25} className="radar-tip-value"><tspan fill={tip.color}>●</tspan> {tip.value}</text>
        </g>;
      })()}
    </svg>
  </section>;
}
