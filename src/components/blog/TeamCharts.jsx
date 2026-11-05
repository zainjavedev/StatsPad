'use client';
import React from 'react';
import { Reveal } from './Charts';
import { logoUrl } from '../../lib/teams';

/* Team-level figures for posts about one team against the league. Same rules as Charts.jsx: small precomputed props,
   finished chart in the server HTML, and a <title> on every mark for the numbers. `--c-a` is the team, `--c-b` the other side. */

const W = 640;
const scale = (d0, d1, r0, r1) => v => r0 + (v - d0) / (d1 - d0) * (r1 - r0);
/* Every team wears its own logo; the league logo stands for "other teams" as a group. */
export const NBA_LOGO = 'https://cdn.nba.com/logos/leagues/logo-nba.svg';
const logoOf = code => (code === 'NBA' ? NBA_LOGO : logoUrl(code));

const signed = v => `${v > 0 ? '+' : ''}${v.toFixed(1)}`;
/* Tick text from plain flags, since a server page can't hand a client figure a function. */
const tick = (axis, v) => (axis.pct ? `${Math.round(v * 100)}%` : axis.signed && v > 0 ? `+${v}` : `${v}`);

/* All 30 teams as dots with one picked out. `flipY` puts low values at the top, for "fewer allowed is better". */
export function TeamScatter({teams, focus, x, y, flipY = false, trend = false, labels = [], corners = [], caption}) {
  const H = 400, M = {l: 56, r: 16, t: 16, b: 42};
  const sx = scale(x.min, x.max, M.l, W - M.r);
  const sy = flipY ? scale(y.max, y.min, H - M.b, M.t) : scale(y.min, y.max, H - M.b, M.t);
  const n = teams.length, mx = teams.reduce((a, t) => a + t.x, 0) / n, my = teams.reduce((a, t) => a + t.y, 0) / n;
  const slope = teams.reduce((a, t) => a + (t.x - mx) * (t.y - my), 0) / teams.reduce((a, t) => a + (t.x - mx) ** 2, 0);
  const at = v => my + slope * (v - mx);
  const order = [...teams].sort((a, b) => (a.code === focus) - (b.code === focus));
  return <Reveal caption={caption} className="bc-scatter tc">
    <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`${y.label} against ${x.label} for all ${n} teams`}>
      {y.ticks.map(v => <g key={`y${v}`}><line className="bc-grid" x1={M.l} x2={W - M.r} y1={sy(v)} y2={sy(v)}/><text className="bc-tick" x={M.l - 8} y={sy(v)} textAnchor="end" dominantBaseline="middle">{tick(y, v)}</text></g>)}
      {x.ticks.map(v => <text key={`x${v}`} className="bc-tick" x={sx(v)} y={H - M.b + 18} textAnchor="middle">{tick(x, v)}</text>)}
      <text className="bc-axis" x={(M.l + W - M.r) / 2} y={H - 6} textAnchor="middle">{x.label} →</text>
      <text className="bc-axis" x={M.l + 6} y={M.t + 4} dominantBaseline="hanging">↑ {y.label}</text>
      {corners.map(([text, side]) => <text key={text} className="tc-corner" x={side.includes('r') ? W - M.r - 6 : M.l + 6} y={side.includes('t') ? M.t + 22 : H - M.b - 8} textAnchor={side.includes('r') ? 'end' : 'start'}>{text}</text>)}
      {trend && <line className="sc-line tc-trend" pathLength="1" x1={sx(x.min)} y1={sy(at(x.min))} x2={sx(x.max)} y2={sy(Math.min(y.max, at(x.max)))}/>}
      {order.map((t, index) => {
        const on = t.code === focus;
        const size = on ? 50 : 28;
        return <image key={t.code} className={`sc-dot tc-logo${on ? ' tc-focus' : ''}`} href={logoUrl(t.code)} x={sx(t.x) - size / 2} y={sy(t.y) - size / 2} width={size} height={size} style={{'--d': `${index * 18}ms`}}><title>{t.title}</title></image>;
      })}
      {order.filter(t => (t.code === focus && t.label) || labels.includes(t.code)).map(t => {
        const right = sx(t.x) < W - 150, gap = t.code === focus ? 28 : 16;
        return <text key={t.code} className={`sc-name${t.code === focus ? ' tc-name' : ''}`} x={sx(t.x) + (right ? gap : -gap)} y={sy(t.y) + 1} textAnchor={right ? 'start' : 'end'} dominantBaseline="middle">{t.label ?? t.code}</text>;
      })}
    </svg>
  </Reveal>;
}

/* Two horizontal bars, team against opponents. */
export function PairBars({rows, unit, caption}) {
  const max = Math.max(...rows.map(row => row.value)) * 1.08;
  return <Reveal caption={caption} className="bc-pair">
    <ol className="pair-list">
      {rows.map((row, index) => <li key={row.label} style={{'--i': index}}>
        <span className="pair-name">{row.logo && <img src={logoOf(row.logo)} alt=""/>}<span>{row.label}<small>{row.note}</small></span></span>
        <span className="pair-track"><i className={index ? 'c-opp' : 'c-team'} style={{width: `${row.value / max * 100}%`}} title={`${row.label}: ${row.value.toFixed(1)} ${unit}`}/></span>
        <b>{row.value.toFixed(1)}</b>
      </li>)}
    </ol>
  </Reveal>;
}

/* Average margin per quarter, bars up from zero when the team wins the quarter. */
export function QuarterBars({quarters, team, caption}) {
  const H = 230, M = {l: 40, r: 12, t: 22, b: 30};
  const lo = Math.min(-2, Math.floor(Math.min(...quarters))), hi = Math.max(4, Math.ceil(Math.max(...quarters)) + 1);
  const sy = scale(lo, hi, H - M.b, M.t), band = (W - M.l - M.r) / quarters.length;
  const ticks = []; for (let v = Math.ceil(lo / 2) * 2; v <= hi; v += 2) ticks.push(v);
  return <Reveal caption={caption} className="bc-quarters">
    <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`${team} average margin by quarter: ${quarters.map(signed).join(', ')}`}>
      {ticks.map(v => <g key={v}><line className="bc-grid" x1={M.l} x2={W - M.r} y1={sy(v)} y2={sy(v)}/><text className="bc-tick" x={M.l - 8} y={sy(v)} textAnchor="end" dominantBaseline="middle">{v > 0 ? `+${v}` : v}</text></g>)}
      <line className="tc-zero" x1={M.l} x2={W - M.r} y1={sy(0)} y2={sy(0)}/>
      {quarters.map((v, index) => {
        const x = M.l + index * band + band * .22, w = band * .56, top = Math.min(sy(v), sy(0)), h = Math.abs(sy(v) - sy(0));
        return <g key={index} className="qb" style={{'--i': index}}>
          <rect className={v >= 0 ? 'c-team' : 'c-opp'} x={x} y={top} width={w} height={Math.max(h, 1)} rx="4"><title>{`Quarter ${index + 1}: ${team} ${signed(v)} a game`}</title></rect>
          <text className="sc-name" x={x + w / 2} y={v >= 0 ? top - 8 : top + h + 16} textAnchor="middle">{signed(v)}</text>
          <text className="bc-tick" x={x + w / 2} y={H - 8} textAnchor="middle">{['1st', '2nd', '3rd', '4th'][index]}</text>
        </g>;
      })}
    </svg>
  </Reveal>;
}

/* Win-loss records as split bars, one row per team, the focus team at full strength. */
export function RecordBars({rows, focus, caption}) {
  const max = Math.max(...rows.map(row => row.w + row.l));
  return <Reveal caption={caption} className="bc-record">
    <div className="bc-key"><span><i className="c-team"/>Wins</span><span><i className="c-opp"/>Losses</span></div>
    <ol className="rec-list">
      {rows.map((row, index) => <li key={row.code} className={row.code === focus ? 'on' : ''} style={{'--i': index}}>
        <span className="rec-name"><img src={logoUrl(row.code)} alt=""/>{row.code}</span>
        <span className="rec-track" title={`${row.code}: ${row.w}–${row.l}`}>
          <i className="c-team" style={{width: `${row.w / max * 100}%`}}/>
          <i className="c-opp" style={{width: `${row.l / max * 100}%`}}/>
        </span>
        <b>{row.w}–{row.l}</b>
      </li>)}
    </ol>
  </Reveal>;
}

/* The score margin through one game, from the team's side: above the line means ahead. `flow` is [minute, margin] pairs. */
function FlowPath({flow, width, height, pad, big}) {
  const end = Math.max(48, flow.at(-1)[0]), lim = 30;
  const sx = scale(0, end, pad.l, width - pad.r), sy = scale(-lim, lim, height - pad.b, pad.t);
  const points = [[0, 0], ...flow];
  const line = points.map(([m, v], i) => `${i ? 'L' : 'M'}${sx(m).toFixed(1)} ${sy(v).toFixed(1)}`).join('');
  const area = `${line}L${sx(points.at(-1)[0]).toFixed(1)} ${sy(0)}L${sx(0)} ${sy(0)}Z`;
  const id = `f${flow.length}${flow.at(-1)[1]}${width}`;
  const low = flow.reduce((a, b) => (b[1] < a[1] ? b : a)), last = flow.at(-1);
  return <>
    <defs>
      <clipPath id={`${id}u`}><rect x="0" y="0" width={width} height={sy(0)}/></clipPath>
      <clipPath id={`${id}d`}><rect x="0" y={sy(0)} width={width} height={height}/></clipPath>
    </defs>
    {big && [-30, -20, -10, 10, 20, 30].map(v => <g key={v}><line className="bc-grid" x1={pad.l} x2={width - pad.r} y1={sy(v)} y2={sy(v)}/><text className="bc-tick" x={pad.l - 8} y={sy(v)} textAnchor="end" dominantBaseline="middle">{v > 0 ? `+${v}` : v}</text></g>)}
    {big && [12, 24, 36].map(m => <line key={m} className="bc-grid" x1={sx(m)} x2={sx(m)} y1={pad.t} y2={height - pad.b}/>)}
    {big && ['Q1', 'Q2', 'Q3', 'Q4'].map((q, i) => <text key={q} className="bc-tick" x={sx(i * 12 + 6)} y={height - 8} textAnchor="middle">{q}</text>)}
    <path className="fl-area up" d={area} clipPath={`url(#${id}u)`}/>
    <path className="fl-area down" d={area} clipPath={`url(#${id}d)`}/>
    <path className="fl-line up" d={line} clipPath={`url(#${id}u)`} pathLength="1"/>
    <path className="fl-line down" d={line} clipPath={`url(#${id}d)`} pathLength="1"/>
    <line className="tc-zero" x1={pad.l} x2={width - pad.r} y1={sy(0)} y2={sy(0)}/>
    {big && low[1] < 0 && <><circle className="fl-dot down" cx={sx(low[0])} cy={sy(low[1])} r="5"/><text className="sc-name" x={sx(low[0]) + 10} y={sy(low[1])} dominantBaseline="middle">Down {-low[1]}</text></>}
    {big && <><circle className="fl-dot up" cx={sx(last[0])} cy={sy(last[1])} r="5"/><text className="sc-name" x={sx(last[0]) - 10} y={sy(last[1]) - 12} textAnchor="end">{last[1] > 0 ? `Won by ${last[1]}` : `Lost by ${-last[1]}`}</text></>}
  </>;
}

export function GameFlow({game, team, caption}) {
  return <Reveal caption={caption} className="bc-flow">
    <svg viewBox="0 0 420 240" role="img" aria-label={`${team} lead and deficit through the game against ${game.opp}, trailing by as much as ${-game.low}`}>
      <FlowPath flow={game.flow} width={420} height={240} pad={{l: 34, r: 10, t: 12, b: 26}} big/>
    </svg>
  </Reveal>;
}

/* Every game as a small flow chart, in date order. */
export function FlowGrid({games, team, caption}) {
  return <Reveal caption={caption} className="bc-flowgrid">
    <ol className="flow-grid">
      {games.map(game => {
        const won = game.pts > game.oppPts;
        return <li key={game.id} title={game.low < 0 ? `Trailed by as much as ${-game.low}` : `${team} never trailed`}>
          <span className="fg-head"><b>{game.home ? 'vs' : '@'} {game.opp}</b><em>{won ? 'W' : 'L'} {game.pts}–{game.oppPts}</em></span>
          <svg viewBox="0 0 200 84" role="img" aria-label={`${won ? 'Won' : 'Lost'} ${game.pts}–${game.oppPts} ${game.home ? 'against' : 'at'} ${game.opp}`}>
            <FlowPath flow={game.flow} width={200} height={84} pad={{l: 2, r: 2, t: 4, b: 4}}/>
          </svg>
        </li>;
      })}
    </ol>
  </Reveal>;
}
