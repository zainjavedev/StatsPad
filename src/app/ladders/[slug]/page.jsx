import { notFound } from 'next/navigation';
import pages from '../../../seo/pages.json';
import BlogShell from '../../../components/blog/BlogShell';
import { routesUnder, seoMetadata } from '../../../lib/seo-page';
import LadderLive from '../../../components/LadderLive';

export const dynamicParams = false;
export const generateStaticParams = () => routesUnder('/ladders').map(slug => ({slug}));
export const generateMetadata = ({params}) => seoMetadata(`/ladders/${params.slug}`);

/* A full MVP (top 30) or Rookie of the Year (every rookie who has played) ladder, in the same card style as the home page's ladders, with
   per-game averages. A server page like /lineups: the ranking is in the HTML, and LadderLive re-ranks it in the browser while games are on. */
export default function Ladder({params}) {
  const ladder = pages[`/ladders/${params.slug}`]?.ladder;
  if (!ladder) notFound();
  const rows = ladder.rows;
  return <BlogShell active="/ladders">
    <main className="lu-main">
      <h1>NBA {ladder.name} ladder, 2026–27</h1>
      <section className="ladder ldp-cards" aria-label={`${ladder.name} ladder`}>
        <h2 className="ldp-h2">{ladder.name} ladder: {ladder.key === 'mvp' ? `top ${rows.length}` : `all ${rows.length} rookies`}</h2>
        <LadderLive rows={rows} ladderKey={ladder.key}/>
      </section>
      <p className="lu-links"><a href="/ladders">All award ladders</a> · <a href="/ladders/mvp">MVP ladder</a> · <a href="/ladders/roty">Rookie of the Year ladder</a> · <a href="/stats/points">Stat leaders</a> · <a href="/fixtures">Fixtures</a> · <a href="/standings">Standings</a></p>
    </main>
  </BlogShell>;
}
