import React, { forwardRef } from 'react';
import { SITE_HOST, onDark } from '../lib/share';

/* The 1080x1080 picture people post. Text and numbers only: no team logos or
   player photos, so it renders the same everywhere and is free to repost.
   Three layouts, picked by spec.kind:
     versus  {eyebrow, names, subs, colors, score, rows: [{label, values, lead}]}
     tiles   {eyebrow, title, sub, color, tiles: [{label, value, note}]}
     list    {eyebrow, title, sub, color, rows: [{lead, name, sub, value}]}
   plus a footer line ({foot}) and the page address ({path}). */

function Head({spec}) {
  return <div className="sc-head">
    <span className="sc-brand">StatsPad</span>
    <span className="sc-eyebrow">{spec.eyebrow}</span>
  </div>;
}

const side = name => (name.length > 15 ? 'sc-side long' : 'sc-side');

function Versus({spec}) {
  const [a, b] = spec.colors.map(onDark);
  return <>
    <div className="sc-names">
      <div className={side(spec.names[0])} style={{'--c': a}}>
        <b>{spec.names[0]}</b><small>{spec.subs?.[0]}</small>
      </div>
      <div className="sc-score"><strong>{spec.score[0]}<i>–</i>{spec.score[1]}</strong><small>stat leads</small></div>
      <div className={`${side(spec.names[1])} right`} style={{'--c': b}}>
        <b>{spec.names[1]}</b><small>{spec.subs?.[1]}</small>
      </div>
    </div>
    <div className="sc-rows">
      {spec.rows.map(row => <div className="sc-row" key={row.label}>
        <span className={row.lead === 0 ? 'sc-val lead' : 'sc-val'} style={row.lead === 0 ? {'--c': a} : null}>{row.values[0]}</span>
        <span className="sc-cat">{row.label}</span>
        <span className={row.lead === 1 ? 'sc-val lead right' : 'sc-val right'} style={row.lead === 1 ? {'--c': b} : null}>{row.values[1]}</span>
      </div>)}
    </div>
  </>;
}

function Tiles({spec}) {
  return <>
    <div className="sc-title">
      <b style={{'--c': onDark(spec.color)}}>{spec.title}</b>
      <small>{spec.sub}</small>
    </div>
    <div className="sc-tiles">
      {spec.tiles.map(tile => <div className="sc-tile" key={tile.label}>
        <span>{tile.label}</span><strong>{tile.value}</strong><small>{tile.note}</small>
      </div>)}
    </div>
  </>;
}

function List({spec}) {
  return <>
    <div className="sc-title">
      <b style={{'--c': onDark(spec.color)}}>{spec.title}</b>
      <small>{spec.sub}</small>
    </div>
    <div className={spec.rows.length <= 6 ? 'sc-list roomy' : 'sc-list'}>
      {spec.rows.map((row, index) => <div className="sc-li" key={`${row.name}-${index}`}>
        <span className="sc-rank" style={{'--c': onDark(spec.color)}}>{row.lead}</span>
        <span className="sc-who"><b>{row.name}</b>{row.sub && <small>{row.sub}</small>}</span>
        <span className="sc-num">{row.value}</span>
      </div>)}
    </div>
  </>;
}

/* The address printed on the card: the page itself when it is short enough to
   read, otherwise just the site. The share caption always has the full link. */
const shownLink = path => (path && `${SITE_HOST}${path}`.length <= 32 && !path.includes('?') ? `${SITE_HOST}${path}` : SITE_HOST);

const ShareCard = forwardRef(function ShareCard({spec}, ref) {
  const accent = onDark(spec.colors?.[0] || spec.color);
  const Body = {versus: Versus, tiles: Tiles, list: List}[spec.kind];
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
