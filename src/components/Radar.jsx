import React, { useEffect, useRef, useState } from 'react';

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
const TRACE = 1.7, STAGGER = 0.25;
const reduced = () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
/* How far round the outline each corner sits (0 to 1), so a corner's dot can appear as the glow reaches it. */
const stops = coords => {
  const loop = [...coords, coords[0]], cum = [0];
  for (let i = 1; i < loop.length; i += 1) cum.push(cum[i - 1] + Math.hypot(loop[i][0] - loop[i - 1][0], loop[i][1] - loop[i - 1][1]));
  return cum.map(value => value / cum[cum.length - 1]);
};
/* A glowing dot that runs from corner to corner along the outline while it draws. */
function Comet({coords, delay, color}) {
  const ref = useRef(null), shape = coords.join(' ');
  useEffect(() => {
    const dot = ref.current, at = stops(coords), loop = [...coords, coords[0]];
    if (!dot || reduced()) return undefined;
    let raf, begin;
    const step = now => {
      begin ??= now;
      const t = (now - begin) / 1000 - delay;
      if (t < 0) { raf = requestAnimationFrame(step); return; }
      const done = Math.min(1, t / TRACE);
      let i = 1;
      while (i < at.length - 1 && at[i] < done) i += 1;
      const k = (done - at[i - 1]) / ((at[i] - at[i - 1]) || 1);
      dot.setAttribute('cx', loop[i - 1][0] + (loop[i][0] - loop[i - 1][0]) * k);
      dot.setAttribute('cy', loop[i - 1][1] + (loop[i][1] - loop[i - 1][1]) * k);
      dot.style.opacity = done < 1 ? 1 : 0;
      if (done < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shape, delay]);
  return <circle ref={ref} className="radar-comet" r="6.5" cx="-20" cy="-20" style={{fill: color, color, opacity: 0}}/>;
}
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
        const coords = axes.map((axis, index) => point(index, count, Math.max(axis.sides[side].pct, 3) / 100));
        const points = coords.map(pair => pair.map(value => value.toFixed(1)).join(',')).join(' ');
        const begin = side * STAGGER, at = stops(coords);
        return <g key={`${name}-${points}`} style={{'--begin': `${begin}s`}}>
          <polygon className="radar-halo" points={points}/>
          <polygon className="radar-shape" pathLength="1" points={points} style={{fill: colors[side], stroke: colors[side]}}/>
          <Comet coords={coords} delay={begin} color={colors[side]}/>
          {/* Dots go last so neither player's shape covers the other's points. */}
          {axes.map((axis, index) => {
            const [x, y] = coords[index];
            const show = () => setTip({x, y, color: colors[side], value: axis.sides[side].text});
            return <g key={axis.label} className="radar-dot-g" style={{cursor: 'pointer', outline: 'none', '--d': `${begin + at[index] * TRACE}s`}} onMouseEnter={show} onMouseLeave={() => setTip(null)} onClick={show} tabIndex={0} onFocus={show} onBlur={() => setTip(null)}>
              <circle cx={x} cy={y} r="13" fill="transparent"/>
              <circle className="radar-dot" cx={x} cy={y} r="5" style={{fill: colors[side]}}/>
            </g>;
          })}
        </g>;
      })}
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
