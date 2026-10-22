import React, { forwardRef, useState } from 'react';
import { onDark, siteHost } from '../lib/share';
import ShotChart from './ShotChart';

/* The 1080x1080 picture people post. Layouts, picked by spec.kind:
     versus  {eyebrow, names, subs, colors, score, rows: [{label, values, lead}], photos?}
     tiles   {eyebrow, title, sub, color, tiles: [{label, value, note}], photo?}
     list    {eyebrow, title, sub, color, rows: [{lead, name, sub, value, photo?}]}
     perf    {eyebrow, title, sub, color, person, rating, tone, headline: [[value, unit]], tags, tiles: [[label, value]], bars: [{label, value}], assists: [{name, pts, ast}]}
     grid    {eyebrow, title, sub, color, rows: [{lead, name, lines, photo?}], summary?}
   plus {foot} and the page address ({path}). Photos are ESPN headshots, filled
   in by lib/photos.js; anyone without one gets their initials. */

const initials = name => name.replace(/ (Jr\.|Sr\.|II|III|IV)$/, '').split(' ').map(part => part[0]).slice(0, 2).join('');

/* Headshot on a coloured tile; crossOrigin lets the export read the pixels. */
function Photo({src, name, color, className}) {
  const [failed, setFailed] = useState(false);
  return <span className={`sc-photo ${className || ''}`} style={{'--c': onDark(color)}}>
    {src && !failed
      ? <img src={src} alt="" crossOrigin="anonymous" onError={() => setFailed(true)}/>
      : <i>{initials(name)}</i>}
  </span>;
}

function Head({spec}) {
  return <div className="sc-head">
    <span className="sc-brand">StatsPads</span>
    <span className="sc-eyebrow">{spec.eyebrow}</span>
  </div>;
}

const side = name => (name.length > 15 ? 'sc-side long' : 'sc-side');

function Versus({spec}) {
  const [a, b] = spec.colors.map(onDark);
  const faces = Boolean(spec.photos);
  return <>
    {faces
      ? <div className="sc-faces">
        {[0, 1].map(index => <div className="sc-face" key={index} style={{'--c': index ? b : a}}>
          <Photo src={spec.photos[index]} name={spec.names[index]} color={index ? b : a} className="sc-face-photo"/>
          <div className="sc-face-name"><b>{spec.names[index]}</b><small>{spec.subs?.[index]}</small></div>
        </div>)}
        <div className="sc-score floating"><strong>{spec.score[0]}<i>–</i>{spec.score[1]}</strong><small>stat leads</small></div>
      </div>
      : <div className="sc-names">
        <div className={side(spec.names[0])} style={{'--c': a}}><b>{spec.names[0]}</b><small>{spec.subs?.[0]}</small></div>
        <div className="sc-score"><strong>{spec.score[0]}<i>–</i>{spec.score[1]}</strong><small>stat leads</small></div>
        <div className={`${side(spec.names[1])} right`} style={{'--c': b}}><b>{spec.names[1]}</b><small>{spec.subs?.[1]}</small></div>
      </div>}
    <div className={faces ? 'sc-rows tight' : 'sc-rows'}>
      {spec.rows.slice(0, faces ? 7 : 8).map(row => <div className="sc-row" key={row.label}>
        <span className={row.lead === 0 ? 'sc-val lead' : 'sc-val'} style={row.lead === 0 ? {'--c': a} : null}>{row.values[0]}</span>
        <span className="sc-cat">{row.label}</span>
        <span className={row.lead === 1 ? 'sc-val lead right' : 'sc-val right'} style={row.lead === 1 ? {'--c': b} : null}>{row.values[1]}</span>
      </div>)}
    </div>
  </>;
}

function Tiles({spec}) {
  return <>
    <div className={spec.photo !== undefined ? 'sc-title with-photo' : 'sc-title'}>
      {spec.photo !== undefined && <Photo src={spec.photo} name={spec.title} color={spec.color} className="sc-hero-photo"/>}
      <div className="sc-title-text">
        <b style={{'--c': onDark(spec.color)}}>{spec.title}</b>
        <small>{spec.sub}</small>
      </div>
    </div>
    <div className="sc-tiles">
      {spec.tiles.map(tile => <div className="sc-tile" key={tile.label}>
        <span>{tile.label}</span><strong>{tile.value}</strong><small>{tile.note}</small>
      </div>)}
    </div>
  </>;
}

function Perf({spec}) {
  return <>
    <div className="sc-title with-photo">
      <Photo src={spec.photo} name={spec.title} color={spec.color} className="sc-hero-photo"/>
      <div className="sc-title-text">
        <b style={{'--c': onDark(spec.color)}}>{spec.title}</b>
        <small>{spec.sub}</small>
      </div>
      <div className={`sc-rate ${spec.tone}`}><strong>{spec.rating}</strong><small>grade</small></div>
    </div>
    <p className="sc-story">{spec.story}</p>
    <div className="sc-perf">
      <div className="sc-court"><ShotChart shots={spec.shots} color={onDark(spec.color)}/><small>{spec.shotLine}</small></div>
      <div className="sc-side3">
        <div className="sc-head3">{spec.headline.map(([value, unit]) => <span key={unit}><b>{value}</b>{unit}</span>)}</div>
        {spec.tags.length > 0 && <div className="sc-tags">{spec.tags.map(tag => <span key={tag}>{tag}</span>)}</div>}
        {spec.assists.length > 0 && <div className="sc-assists"><small>Set up</small>{spec.assists.map(entry => <div key={entry.name}><b>{entry.name.split(' ').slice(1).join(' ') || entry.name}</b><span>{entry.pts} pts · {entry.ast} ast</span></div>)}</div>}
      </div>
    </div>
    <div className="sc-mini">{spec.tiles.map(([name, value]) => <div key={name}><strong>{value}</strong><small>{name}</small></div>)}</div>
  </>;
}

function List({spec}) {
  const faces = spec.rows.some(row => row.photo !== undefined);
  return <>
    <div className="sc-title">
      <div className="sc-title-text">
        <b style={{'--c': onDark(spec.color)}}>{spec.title}</b>
        <small>{spec.sub}</small>
      </div>
    </div>
    <div className={spec.rows.length <= 6 ? 'sc-list roomy' : 'sc-list'}>
      {spec.rows.map((row, index) => <div className="sc-li" key={`${row.name}-${index}`}>
        <span className="sc-rank" style={{'--c': onDark(spec.color)}}>{row.lead}</span>
        {faces && <Photo src={row.photo} name={row.name} color={spec.color} className="sc-thumb"/>}
        <span className="sc-who"><b>{row.name}</b>{row.sub && <small>{row.sub}</small>}</span>
        <span className="sc-num">{row.value}</span>
      </div>)}
    </div>
  </>;
}

function Grid({spec}) {
  return <>
    <div className="sc-title">
      <div className="sc-title-text">
        <b style={{'--c': onDark(spec.color)}}>{spec.title}</b>
        <small>{spec.sub}</small>
      </div>
    </div>
    <div className="sc-grid">
      {spec.rows.map(row => <div className="sc-cell" key={row.name}>
        <Photo src={row.photo} name={row.name} color={spec.color} className="sc-cell-photo"/>
        <span className="sc-slot" style={{'--c': onDark(spec.color)}}>{row.lead}</span>
        <b>{row.name}</b>
        <div className="sc-lines">{row.lines.map(line => <span key={line[0]}><strong>{line[1]}</strong><small>{line[0]}</small></span>)}</div>
      </div>)}
    </div>
    {spec.summary && <div className="sc-summary"><strong>{spec.summary[0]}</strong><span>{spec.summary[1]}</span></div>}
  </>;
}

/* The address printed on the card: the page itself when it is short enough to
   read, otherwise just the site. The share caption always has the full link. */
const shownLink = path => { const host = siteHost(); return path && `${host}${path}`.length <= 32 && !path.includes('?') ? `${host}${path}` : host; };

const ShareCard = forwardRef(function ShareCard({spec}, ref) {
  const accent = onDark(spec.colors?.[0] || spec.color);
  const Body = {versus: Versus, tiles: Tiles, list: List, grid: Grid, perf: Perf}[spec.kind];
  return <div className={`sc-card sc-kind-${spec.kind}`} ref={ref} style={{'--accent': accent}}>
    <Head spec={spec}/>
    <Body spec={spec}/>
    <div className="sc-foot">
      <span className="sc-foot-note">{spec.foot}</span>
      <span className="sc-link">{shownLink(spec.path)}</span>
    </div>
  </div>;
});

export default ShareCard;
