import React from 'react';
import { ArrowRight } from 'lucide-react';
import { useFeed } from '../lib/useFeed';
import { CURRENT } from '../lib/season';
import { navigate } from '../lib/nav';
import { playerUrl } from '../lib/routes';
import { TEAMS, espnLogoUrl } from '../lib/teams';
import { useLiveLadders } from '../lib/liveLadder';
import { LiveBadge, Move, Tonight } from './LadderLive';

/* The MVP and rookie ladders, as performance-style cards with per-game averages: the six best players on per-game score, each with how far he moved since the night
   before (scripts/build-regular-box-stats.mjs ranks the league as of every game day). While games are on they are re-ranked live (src/lib/liveLadder.js). */

/* false when the file is missing, so the skeleton (shown while the answer is null) goes away instead of staying. */
const loadLadders = () => fetch(`/data/${CURRENT}/ladders.json`).then(response => (response.ok ? response.json() : false)).catch(() => false);
const photo = id => `https://a.espncdn.com/combiner/i?img=/i/headshots/nba/players/full/${id}.png&w=260&h=190`;

function Ladder({title, rows, href, live}) {
  return <section className="front-panel ladder" aria-label={title}>
    <div className="front-panel-head"><h2>{title} <LiveBadge live={live}/></h2><a className="front-more" href={href}>Full ladder <ArrowRight size={14}/></a></div>
    <ol className="ld-list">
      {rows.filter(row => row.qualified !== false).slice(0, 6).map((row, index) => <li key={row.playerId} className={index < 3 ? 'top3' : undefined} style={{'--tc': TEAMS[row.team]?.color || '#8a8a8a'}}>
        <button className="ld-row ldc" onClick={() => navigate(playerUrl(row.name))}>
          <b className="ld-rank">{row.rank}</b>
          <span className="rp-face"><img src={photo(row.espnId)} alt="" loading="lazy"/>{TEAMS[row.team] && <img className="rp-team" src={espnLogoUrl(row.team)} alt=""/>}</span>
          <span className="rp-main">
            <span className="rp-top"><b>{row.name}</b><small> · {row.team} · avg</small><Tonight line={row.tonight}/></span>
            <span className="rp-trio"><span><b>{row.pts}</b>pts</span><span><b>{row.reb}</b>reb</span><span><b>{row.ast}</b>ast</span></span>
          </span>
          <Move value={row.move}/>
        </button>
      </li>)}
    </ol>
  </section>;
}

/* The same panels with grey rows, so the page does not jump when the ladders arrive. */
function LadderSkeleton() {
  return <div className="ladder-pair" aria-busy="true" aria-label="Loading the ladders">{[0, 1].map(panel => <section key={panel} className="front-panel ladder">
    <div className="front-panel-head"><div className="sk sk-title" style={{marginBottom: 0}}/></div>
    <ol className="ld-list">{Array.from({length: 6}, (_, index) => <li key={index}><div className="ld-row ldc sk-ld"><b className="ld-rank"/><div className="sk sk-ld-face"/><div className="sk-ld-main"><div className="sk sk-ld-name"/><div className="sk sk-ld-line"/></div><span/></div></li>)}</ol>
  </section>)}</div>;
}

export default function Ladders() {
  const data = useFeed(loadLadders), live = useLiveLadders(data || null);
  if (data === null) return <LadderSkeleton/>;
  if (!data || !data.mvp?.length) return null;
  return <div className="ladder-pair">
    <Ladder title="MVP ladder" rows={live?.mvp ?? data.mvp} href="/ladders/mvp" live={live?.mvp && live}/>
    {data.rookie?.length > 0 && <Ladder title="ROTY ladder" rows={live?.rookie ?? data.rookie} href="/ladders/roty" live={live?.rookie && live}/>}
  </div>;
}
