import { notFound } from 'next/navigation';
import pages from '../../seo/pages.json';
import BlogShell from '../../components/blog/BlogShell';
import { seoMetadata } from '../../lib/seo-page';
import GameDay from '../../components/GameDay';

export const metadata = seoMetadata('/fixtures');

/* Scores: the game-day board (GameDay), plus the latest results written by scripts/prerender.mjs from the schedule file and the
   stored box scores, kept in the HTML as plain links so search engines see them without running the board. */
export default function Scores() {
  const scores = pages['/fixtures']?.scores;
  if (!scores) notFound();
  return <BlogShell active="/fixtures">
    <main className="lu-main gb-main">
      <GameDay/>
      {/* The latest nights as plain links in the HTML, for search engines and screen readers; the board above loads in the browser. */}
      <section className="sr" aria-label="Latest results">
        {scores.days.map(day => <div key={day.day}><h2>NBA scores, {day.label}</h2><ul>{day.games.map(game => {
          const tops = [game.awayTop, game.homeTop].filter(Boolean).map(top => `${top.name} ${top.pts} points`).join(', ');
          return <li key={game.url}><a href={game.url}>{game.away} {game.awayScore}, {game.home} {game.homeScore}, final.{tops ? ` Top scorers: ${tops}.` : ''}</a></li>;
        })}</ul></div>)}
      </section>
      <p className="lu-links"><a href="/standings">Standings</a> · <a href="/lineups">Lineups</a></p>
    </main>
  </BlogShell>;
}
