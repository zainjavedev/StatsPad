import { notFound } from 'next/navigation';
import pages from '../../seo/pages.json';
import BlogShell from '../../components/blog/BlogShell';
import { seoMetadata } from '../../lib/seo-page';
import { espnLogoUrl, nickname } from '../../lib/teams';

export const metadata = seoMetadata('/scores');

/* Latest results, written by scripts/prerender.mjs from the schedule file. A server page like /ladders: the scores are in the HTML. */
export default function Scores() {
  const scores = pages['/scores']?.scores;
  if (!scores) notFound();
  return <BlogShell active="/schedule">
    <main className="lu-main">
      <h1>NBA scores and results</h1>
      <p className="lu-lede">Final scores from the latest game nights. Open a game for the full box score and every player&rsquo;s stats.</p>
      {scores.days.map(day => <section key={day.day} className="sc-day">
        <h2>{day.label}</h2>
        <ul className="sc-list">
          {day.games.map(game => {
            const awayWon = game.awayScore > game.homeScore;
            return <li key={game.url}><a href={game.url} className="sc-game">
              <span className={`sc-team${awayWon ? ' won' : ''}`}><img src={espnLogoUrl(game.awayCode)} alt="" width="28" height="28" loading="lazy"/><b>{nickname(game.awayCode)}</b><strong>{game.awayScore}</strong></span>
              <span className={`sc-team${awayWon ? '' : ' won'}`}><img src={espnLogoUrl(game.homeCode)} alt="" width="28" height="28" loading="lazy"/><b>{nickname(game.homeCode)}</b><strong>{game.homeScore}</strong></span>
              <small>Final · box score</small>
            </a></li>;
          })}
        </ul>
      </section>)}
      <p className="lu-links"><a href="/schedule">Full schedule</a> · <a href="/standings">Standings</a> · <a href="/performances">Top performances</a> · <a href="/lineups">Lineups</a></p>
    </main>
  </BlogShell>;
}
