import { notFound } from 'next/navigation';
import pages from '../../../seo/pages.json';
import BlogShell from '../../../components/blog/BlogShell';
import { routesUnder, seoMetadata } from '../../../lib/seo-page';
import { TEAMS, espnLogoUrl } from '../../../lib/teams';

export const dynamicParams = false;
export const generateStaticParams = () => routesUnder('/ladders').map(slug => ({slug}));
export const generateMetadata = ({params}) => seoMetadata(`/ladders/${params.slug}`);

const photo = id => `https://a.espncdn.com/i/headshots/nba/players/full/${id}.png`;

/* How far a player moved since the night before: an arrow and the places, or NEW, or a dash. */
function Move({value}) {
  if (value === undefined) return null;
  if (value === null) return <span className="ld-move new">New</span>;
  if (value === 0) return <span className="ld-move flat" title="No change">–</span>;
  const up = value > 0, places = Math.abs(value);
  return <span className={`ld-move ${up ? 'up' : 'down'}`} title={`${up ? 'Up' : 'Down'} ${places} ${places === 1 ? 'place' : 'places'}`}>{up ? '▲' : '▼'} {places}</span>;
}

/* A full MVP (top 30) or Rookie of the Year (every rookie who has played) ladder, in the same card style as the home page's ladders, with
   per-game averages. A server page like /lineups: the ranking is in the HTML. */
export default function Ladder({params}) {
  const ladder = pages[`/ladders/${params.slug}`]?.ladder;
  if (!ladder) notFound();
  const rows = ladder.rows;
  return <BlogShell active="/ladders">
    <main className="lu-main">
      <h1>NBA {ladder.name} ladder, 2026–27</h1>
      <p className="lu-lede">{ladder.method}</p>
      <section className="ladder ldp-cards" aria-label={`${ladder.name} ladder`}>
        <h2 className="ldp-h2">{ladder.name} ladder: {ladder.key === 'mvp' ? `top ${rows.length}` : `all ${rows.length} rookies`}</h2>
        <ol className="ld-list">
          {rows.map((row, index) => <li key={row.playerId} className={index < 3 ? 'top3' : undefined} style={{'--tc': TEAMS[row.team]?.color || '#8a8a8a'}}>
            {(() => {
              const body = <>
                <b className="ld-rank">{row.rank}</b>
                <span className="rp-face"><img src={photo(row.espnId)} alt="" width="64" height="64" loading="lazy"/>{TEAMS[row.team] && <img className="rp-team" src={espnLogoUrl(row.team)} alt="" width="24" height="24"/>}</span>
                <span className="rp-main">
                  <span className="rp-top"><b>{row.name}</b><small> · {row.team}<span className="ldp-gp"> · {row.games} {row.games === 1 ? 'game' : 'games'}</span> · avg</small></span>
                  <span className="rp-trio"><span><b>{row.pts}</b>pts</span><span><b>{row.reb}</b>reb</span><span><b>{row.ast}</b>ast</span></span>
                </span>
                <span className="ldp-right"><span className="ldp-score" title="Per-game game score, pulled toward the pool average for players with few games"><b>{row.score}</b><small>game score</small></span>{row.qualified === false ? null : <Move value={row.move}/>}</span>
              </>;
              return row.url ? <a className="ld-row ldc" href={row.url}>{body}</a> : <div className="ld-row ldc">{body}</div>;
            })()}
          </li>)}
        </ol>
      </section>
      <p className="lu-links"><a href="/ladders/mvp">MVP ladder</a> · <a href="/ladders/roty">Rookie of the Year ladder</a> · <a href="/stats/points">Stat leaders</a> · <a href="/scores">Scores</a> · <a href="/standings">Standings</a></p>
    </main>
  </BlogShell>;
}
