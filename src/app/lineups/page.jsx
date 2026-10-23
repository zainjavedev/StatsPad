import pages from '../../seo/pages.json';
import BlogShell from '../../components/blog/BlogShell';
import { seoMetadata } from '../../lib/seo-page';
import { TEAMS, logoUrl } from '../../lib/teams';

export const metadata = seoMetadata('/lineups');

const dateFormat = new Intl.DateTimeFormat('en-US', {month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC'});

/* Every team's expected starting five as cards. A server page like the blog: the lineups are in the HTML and the stats app does not load here. */
export default function Lineups() {
  const page = pages['/lineups'] ?? {}, teams = page.lineups ?? [];
  return <BlogShell>
    <main className="lu-main">
      <h1>NBA starting lineups, 2026–27</h1>
      <p className="lu-lede">The expected starting five for each team: the lineup it has used most recently or most often, not an official announcement. Starters change with injuries, rest days and trades.</p>
      {page.updated && <p className="lu-updated">Updated <time dateTime={page.updated}>{dateFormat.format(new Date(`${page.updated}T12:00:00Z`))}</time>, from ESPN. <a href="/about">How the numbers work</a></p>}
      <div className="lu-grid">
        {teams.map(team => <section className="lu-card" key={team.code} style={{'--tc': TEAMS[team.code].color}}>
          <h2><img src={logoUrl(team.code)} alt="" width="28" height="28" loading="lazy"/><a href={team.url}>{team.name}</a></h2>
          <ol>{team.starters.map(starter => <li key={starter.slot + starter.name}>
            <span className="lu-pos">{starter.slot}</span>
            {starter.url ? <a href={starter.url}>{starter.name}</a> : <span>{starter.name}</span>}
          </li>)}</ol>
          <a className="lu-more" href={team.url}>Full roster and stats</a>
        </section>)}
      </div>
      <p className="lu-links"><a href="/teams">All teams</a> · <a href="/compare">Compare two teams</a> · <a href="/standings">Standings</a> · <a href="/blog">Blog</a></p>
    </main>
  </BlogShell>;
}
