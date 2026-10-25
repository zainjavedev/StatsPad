import { notFound } from 'next/navigation';
import pages from '../../../seo/pages.json';
import BlogShell from '../../../components/blog/BlogShell';
import { routesUnder, seoMetadata } from '../../../lib/seo-page';
import { TEAMS, espnLogoUrl } from '../../../lib/teams';

export const dynamicParams = false;
export const generateStaticParams = () => routesUnder('/ladders').map(slug => ({slug}));
export const generateMetadata = ({params}) => seoMetadata(`/ladders/${params.slug}`);

const dateFormat = new Intl.DateTimeFormat('en-US', {month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC'});
const MOVES = {up: '▲', down: '▼'};

/* A full MVP or Rookie of the Year ladder. A server page like /lineups: the ranking is in the HTML. */
export default function Ladder({params}) {
  const ladder = pages[`/ladders/${params.slug}`]?.ladder;
  if (!ladder) notFound();
  return <BlogShell active="/ladders">
    <main className="lu-main">
      <h1>NBA {ladder.name} ladder, 2026–27</h1>
      <p className="lu-lede">{ladder.method}</p>
      <p className="lu-updated">Through <time dateTime={ladder.through}>{dateFormat.format(new Date(`${ladder.through}T12:00:00Z`))}</time>, from ESPN box scores. <a href="/about">How the numbers work</a></p>
      <ol className="ldp-list">
        {ladder.rows.map(row => <li key={row.playerId} style={{'--tc': TEAMS[row.team]?.color || '#8a8a8a'}}>
          <b className="ldp-rank">{row.rank}</b>
          <span className="ldp-face"><img src={`https://a.espncdn.com/i/headshots/nba/players/full/${row.espnId}.png`} alt="" width="52" height="52" loading="lazy"/>{TEAMS[row.team] && <img className="ldp-team" src={espnLogoUrl(row.team)} alt="" width="20" height="20"/>}</span>
          <span className="ldp-main">
            {row.url ? <a className="ldp-name" href={row.url}>{row.name}</a> : <span className="ldp-name">{row.name}</span>}
            <span className="ldp-sub">{row.teamName} · {row.games} {row.games === 1 ? 'game' : 'games'} · {row.min} min</span>
          </span>
          <span className="ldp-line"><b>{row.pts}</b> pts <b>{row.reb}</b> reb <b>{row.ast}</b> ast</span>
          <span className={`ldp-move ${row.move === null ? 'new' : row.move > 0 ? 'up' : row.move < 0 ? 'down' : 'flat'}`}>{row.move === undefined ? '' : row.move === null ? 'New' : row.move === 0 ? '–' : `${MOVES[row.move > 0 ? 'up' : 'down']} ${Math.abs(row.move)}`}</span>
        </li>)}
      </ol>
      <p className="lu-links"><a href="/ladders/mvp">MVP ladder</a> · <a href="/ladders/roty">Rookie of the Year ladder</a> · <a href="/stats/points">Stat leaders</a> · <a href="/performances">Top performances</a> · <a href="/standings">Standings</a></p>
    </main>
  </BlogShell>;
}
