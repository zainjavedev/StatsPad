import React from 'react';

/* Half court in feet from the basket (x across, y up the floor), drawn at 50 x 42 with the baseline at the
   bottom. Makes are filled in the team colour, misses are hollow. */
const HOOP_Y = 36.75;
const sy = y => HOOP_Y - y;
const LINE = {fill: 'none', stroke: 'currentColor', strokeWidth: .28, opacity: .55};

export function Court() {
  return <g style={{color: '#fff'}}>
    <rect x=".12" y=".12" width="49.76" height="41.76" rx="1.2" {...LINE}/>
    <rect x="17" y="23" width="16" height="19" {...LINE}/>
    <path d="M19 23a6 6 0 0 1 12 0" {...LINE}/>
    <path d="M19 23a6 6 0 0 0 12 0" {...LINE} strokeDasharray=".7 .7"/>
    <path d="M21 36.75a4 4 0 0 1 8 0" {...LINE}/>
    <path d="M22 38h6" {...LINE} strokeWidth=".5"/>
    <circle cx="25" cy="36.75" r=".75" {...LINE} opacity=".7"/>
    <path d="M3 42V27.8A23.75 23.75 0 0 1 47 27.8V42" {...LINE}/>
  </g>;
}

export default function ShotChart({shots, assists = [], className = ''}) {
  const misses = shots.filter(shot => !shot.made), makes = shots.filter(shot => shot.made);
  return <svg className={`shot-chart ${className}`} viewBox="0 0 50 42" role="img" aria-label={`${makes.length} of ${shots.length} shots made`}>
    <rect width="50" height="42" rx="1.2" fill="#ffffff" fillOpacity=".035"/>
    <Court/>
            {misses.map((shot, index) => <path key={`m${index}`} d={`M${shot.x - .5} ${sy(shot.y) - .5}l1 1M${shot.x + .5} ${sy(shot.y) - .5}l-1 1`} stroke="#c9777a" strokeWidth=".26" strokeLinecap="round" opacity=".75" fill="none"/>)}
        {makes.map((shot, index) => <circle key={`h${index}`} cx={shot.x} cy={sy(shot.y)} r=".65" fill="none" stroke="#7fc79d" strokeWidth=".3"/>)}
    {assists.map((shot, index) => <rect key={`a${index}`} x={shot.x - .6} y={sy(shot.y) - .6} width="1.2" height="1.2" fill="none" stroke="#6aa6ff" strokeWidth=".3" transform={`rotate(45 ${shot.x} ${sy(shot.y)})`}/>)}
  </svg>;
}

/* The team's lead through the game with the player's own baskets on the line. */
export function Flow({flow, color, quarters}) {
  const width = 320, height = 112, mid = height / 2;
  const span = Math.max(8, ...flow.points.map(point => Math.abs(point.m)));
  const x = t => (t / flow.end) * width, y = m => mid - (m / (span * 1.1)) * (mid - 8);
  const line = flow.points.map((point, index) => `${index ? 'L' : 'M'}${x(point.t).toFixed(1)} ${y(point.m).toFixed(1)}`).join(' ');
  const area = `${line} L${width} ${mid} L0 ${mid} Z`;
  const marks = [720, 1440, 2160, 2880].filter(t => t < flow.end + 1);
  return <svg className="flow-chart" viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Lead through the game">
    <defs>
      <clipPath id="fl-up"><rect width={width} height={mid}/></clipPath>
      <clipPath id="fl-down"><rect y={mid} width={width} height={mid}/></clipPath>
    </defs>
    {marks.slice(0, quarters).map(t => <line key={t} x1={x(t)} x2={x(t)} y1="4" y2={height - 4} stroke="#fff" strokeOpacity=".12" strokeDasharray="2 3"/>)}
    <path d={area} fill="#5ee08a" fillOpacity=".3" clipPath="url(#fl-up)"/>
    <path d={area} fill="#ef6b6b" fillOpacity=".3" clipPath="url(#fl-down)"/>
    <line x1="0" x2={width} y1={mid} y2={mid} stroke="#fff" strokeOpacity=".3"/>
    <path d={line} fill="none" stroke="#fff" strokeOpacity=".8" strokeWidth="1.2" strokeLinejoin="round"/>
    {flow.marks.map((mark, index) => <circle key={index} cx={x(mark.t)} cy={y(mark.m)} r={1.8 + mark.pts * .9} fill={color} stroke="#fff" strokeWidth="1"/>)}
  </svg>;
}
