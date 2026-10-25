'use client';
import React, { useEffect, useRef, useState } from 'react';

/* Animated figures for posts. They get small precomputed arrays, never the season files, so they can run in the browser.
   Server HTML is the finished chart. Once the page loads, a figure hides itself ("armed") and plays when it scrolls
   into view, so crawlers, no-JS readers and reduced-motion readers all see the full picture. */

function Reveal({children, caption, className = ''}) {
  const box = useRef(null);
  const [phase, setPhase] = useState('done');
  useEffect(() => {
    if (!box.current || !('IntersectionObserver' in window) || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return undefined;
    setPhase('armed');
    const watch = new IntersectionObserver(([entry]) => { if (entry.isIntersecting) { setPhase('play'); watch.disconnect(); } }, {threshold: .3});
    watch.observe(box.current);
    return () => watch.disconnect();
  }, []);
  const replay = () => { setPhase('armed'); setTimeout(() => setPhase('play'), 80); };
  return <figure ref={box} className={`blog-fig bc ${phase} ${className}`}>
    {children}
    <div className="bc-foot"><figcaption>{caption}</figcaption>{phase !== 'done' && <button type="button" className="bc-replay" onClick={replay}>↻ Replay</button>}</div>
  </figure>;
}

const W = 640, H = 400, M = {l: 46, r: 14, t: 14, b: 42};
const ticks = (lo, hi, step) => { const out = []; for (let v = Math.ceil(lo / step) * step; v <= hi; v += step) out.push(v); return out; };

/* Every qualified player as a dot, then the trend line. `groups` names the two colours; labelled players get their surname. */
export function ScatterChart({points, line, x, y, groups, caption}) {
  const xs = points.map(p => p.x), ys = points.map(p => p.y);
  const [x0, x1] = [Math.floor(Math.min(...xs)), Math.ceil(Math.max(...xs))], [y0, y1] = [Math.floor(Math.min(...ys) / 5) * 5, Math.ceil(Math.max(...ys) / 5) * 5];
  const sx = v => M.l + (v - x0) / (x1 - x0) * (W - M.l - M.r), sy = v => H - M.b - (v - y0) / (y1 - y0) * (H - M.t - M.b);
  const order = [...points].sort((a, b) => a.x - b.x);
  return <Reveal caption={caption} className="bc-scatter">
    <div className="bc-key">{groups.map((group, index) => <span key={group}><i className={`g${index}`}/>{group}</span>)}</div>
    <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`${y.label} against ${x.label} for ${points.length} players`}>
      {ticks(y0, y1, 5).map(v => <g key={`y${v}`}><line className="bc-grid" x1={M.l} x2={W - M.r} y1={sy(v)} y2={sy(v)}/><text className="bc-tick" x={M.l - 8} y={sy(v)} textAnchor="end" dominantBaseline="middle">{v}</text></g>)}
      {ticks(x0, x1, 5).map(v => <g key={`x${v}`}><text className="bc-tick" x={sx(v)} y={H - M.b + 18} textAnchor="middle">{v}</text></g>)}
      <text className="bc-axis" x={(M.l + W - M.r) / 2} y={H - 6} textAnchor="middle">{x.label}</text>
      <text className="bc-axis" transform={`translate(12 ${(M.t + H - M.b) / 2}) rotate(-90)`} textAnchor="middle">{y.label}</text>
      {order.map((p, index) => <circle key={p.name} className={`sc-dot g${p.group}`} cx={sx(p.x)} cy={sy(p.y)} r={p.label ? 5.5 : 4} style={{'--d': `${index * 5}ms`}}><title>{`${p.name}: ${p.x.toFixed(1)} ${x.unit}, ${p.y.toFixed(1)} ${y.unit}`}</title></circle>)}
      <line className="sc-line" pathLength="1" x1={sx(line.x0)} y1={sy(line.y0)} x2={sx(line.x1)} y2={sy(line.y1)}/>
      {points.filter(p => p.label).map(p => {
        const right = sx(p.x) < W - 120;
        return <text key={p.name} className="sc-name" x={sx(p.x) + (right ? 9 : -9)} y={sy(p.y) + 1} textAnchor={right ? 'start' : 'end'} dominantBaseline="middle">{p.label}</text>;
      })}
    </svg>
  </Reveal>;
}

/* Rows of stacked bars: how each player's points split into twos, threes and free throws. */
export function DietBars({rows, caption}) {
  return <Reveal caption={caption} className="bc-diet">
    <div className="bc-key"><span><i className="c-two"/>Twos</span><span><i className="c-three"/>Threes</span><span><i className="c-ft"/>Free throws</span></div>
    <ol className="diet-list">
      {rows.map((row, index) => <li key={row.name} style={{'--i': index}}>
        <span className="diet-name">{row.name}</span>
        <span className="diet-bar" role="img" aria-label={`${row.name}: ${row.two.toFixed(0)}% twos, ${row.three.toFixed(0)}% threes, ${row.ft.toFixed(0)}% free throws`}>
          {[['c-two', row.two], ['c-three', row.three], ['c-ft', row.ft]].map(([cls, value]) => <i key={cls} className={cls} style={{flexBasis: `${value}%`}}>{value >= 9 ? Math.round(value) : ''}</i>)}
        </span>
        <span className="diet-pts">{row.points.toFixed(1)}</span>
      </li>)}
    </ol>
  </Reveal>;
}

/* Last season's PPG to this season's, split into the part minutes explain and the part scoring rate explains. */
export function LeapBars({rows, caption}) {
  const max = Math.max(...rows.map(row => row.after)) * 1.04;
  const at = value => `${value / max * 100}%`;
  const span = (a, b) => ({left: at(Math.min(a, b)), width: `${Math.abs(b - a) / max * 100}%`});
  return <Reveal caption={caption} className="bc-leap">
    <div className="bc-key"><span><i className="c-min"/>From more minutes</span><span><i className="c-rate"/>From scoring faster</span></div>
    <ol className="leap-list">
      {rows.map((row, index) => {
        const mid = row.before + row.fromMinutes;
        return <li key={row.name} style={{'--i': index}}>
          <span className="leap-name">{row.name}<small>{row.minutesBefore.toFixed(0)} → {row.minutesAfter.toFixed(0)} min</small></span>
          <span className="leap-track">
            <i className="leap-from" style={{left: at(row.before)}}/>
            <i className="leap-seg c-min" style={span(row.before, mid)}/>
            <i className="leap-seg c-rate b" style={span(mid, row.after)}/>
            <i className="leap-to" style={{left: at(row.after)}}/>
          </span>
          <span className="leap-val"><b>+{row.total.toFixed(1)}</b><small>{row.before.toFixed(1)} → {row.after.toFixed(1)}</small></span>
        </li>;
      })}
    </ol>
  </Reveal>;
}
