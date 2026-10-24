import BlogShell from '../../components/blog/BlogShell';
import { published } from '../../content/blog/posts';
import { SITE } from '../../lib/routes';
import { socialTags } from '../../lib/social';

const TITLE = 'StatsPads blog: NBA stats, explained | StatsPads', DESCRIPTION = 'Player comparisons and stat breakdowns with radar charts, built from the same numbers as the StatsPads compare tool.';
export const metadata = {title: TITLE, description: DESCRIPTION, alternates: {canonical: '/blog'}, ...socialTags({title: TITLE, description: DESCRIPTION, route: '/blog'})};

const dateFormat = new Intl.DateTimeFormat('en-US', {month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC'});

const headshot = id => `https://a.espncdn.com/i/headshots/nba/players/full/${id}.png`;

export default function BlogIndex() {
  const schema = {'@context': 'https://schema.org', '@type': 'Blog', name: 'StatsPads blog', url: `${SITE}/blog`, description: DESCRIPTION, inLanguage: 'en-US', publisher: {'@type': 'Organization', name: 'StatsPads', url: SITE},
    blogPost: published().map(post => ({'@type': 'BlogPosting', headline: post.title, url: `${SITE}/blog/${post.slug}`, datePublished: post.date}))};
  return <BlogShell>
    <script type="application/ld+json" dangerouslySetInnerHTML={{__html: JSON.stringify(schema)}}/>
    <main className="blog-main wide">
      <h1>StatsPads blog</h1>
      <p className="blog-lede">Player comparisons and stat breakdowns, each one built on the same numbers and radar charts as the compare tool.</p>
      <ul className="blog-grid">
        {published().map(post => <li key={post.slug}>
          <a className="blog-tile" href={`/blog/${post.slug}`}>
            <span className="blog-cover" style={{'--ca': post.cover?.colors[0] ?? '#444', '--cb': post.cover?.colors[1] ?? '#222'}}>
              {post.cover?.players.map(player => <img key={player.id} src={headshot(player.id)} alt="" loading="lazy"/>)}
              {post.cover?.players.length === 2 && <i>VS</i>}
              {post.tag && <em>{post.tag}</em>}
            </span>
            <span className="blog-tile-body">
              <time dateTime={post.date}>{dateFormat.format(new Date(`${post.date}T12:00:00Z`))}</time>
              <h2>{post.title}</h2>
              <p>{post.description}</p>
            </span>
          </a>
        </li>)}
        <li>
          <a className="blog-tile blog-cta" href="/compare">
            <span className="blog-cover cta"><b>?</b></span>
            <span className="blog-tile-body">
              <time>Your turn</time>
              <h2>Settle your own debate</h2>
              <p>Pick any two players or teams and see the radar, the verdict and every stat side by side.</p>
            </span>
          </a>
        </li>
      </ul>
    </main>
  </BlogShell>;
}
