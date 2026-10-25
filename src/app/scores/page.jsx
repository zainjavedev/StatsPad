import { notFound } from 'next/navigation';
import pages from '../../seo/pages.json';
import BlogShell from '../../components/blog/BlogShell';
import { seoMetadata } from '../../lib/seo-page';
import { TEAMS, espnLogoUrl } from '../../lib/teams';

export const metadata = seoMetadata('/scores');

/* Latest results, written by scripts/prerender.mjs from the schedule file and the stored box scores. A server page like /ladders: the scores are in the HTML.
   Each card shows only the two logos and the score; the team names and top scorers are in the link's hidden text, for screen readers and search. */
export default function Scores() {
  const scores = pages['/scores']?.scores;
  if (!scores) notFound();
  return <BlogShell active="/schedule">
    <main className="lu-main">
      <h1>NBA scores and results</h1>
      <p className="lu-lede">Final scores from the latest game nights. Open a game for the full box score and every player&rsquo;s stats.</p>
      {scores.days.map(day => <section key={day.day} className="sc-day">
        <h2>{day.label}</h2>
        <ul className="scr-list">
          {day.games.map(game => {
            const awayWon = game.awayScore > game.homeScore;
            const tops = [game.awayTop, game.homeTop].filter(Boolean).map(top => `${top.name} ${top.pts} points`).join(', ');
            return <li key={game.url}>
              <a href={game.url} className="scr-card" style={{'--a': TEAMS[game.awayCode]?.color || '#555', '--h': TEAMS[game.homeCode]?.color || '#555'}}>
                <span className="scr-sr">{game.away} {game.awayScore}, {game.home} {game.homeScore}, final.{tops ? ` Top scorers: ${tops}.` : ''} Full box score.</span>
                <span className={`scr-side${awayWon ? ' won' : ''}`} aria-hidden="true"><img src={espnLogoUrl(game.awayCode)} alt="" width="64" height="64" loading="lazy"/><strong>{game.awayScore}</strong></span>
                <small className="scr-final" aria-hidden="true">Final</small>
                <span className={`scr-side right${awayWon ? '' : ' won'}`} aria-hidden="true"><strong>{game.homeScore}</strong><img src={espnLogoUrl(game.homeCode)} alt="" width="64" height="64" loading="lazy"/></span>
              </a>
            </li>;
          })}
        </ul>
      </section>)}
      <p className="lu-links"><a href="/schedule">Full schedule</a> · <a href="/standings">Standings</a> · <a href="/lineups">Lineups</a></p>
    </main>
  </BlogShell>;
}
