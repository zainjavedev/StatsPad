import BlogShell from '../../components/blog/BlogShell';
import { published } from '../../content/blog/posts';

export const metadata = {title: 'StatsPads blog: NBA stats, explained | StatsPads', description: 'Player comparisons and stat breakdowns with radar charts, built from the same numbers as the StatsPads compare tool.', alternates: {canonical: '/blog'}};

const dateFormat = new Intl.DateTimeFormat('en-US', {month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC'});

export default function BlogIndex() {
  return <BlogShell>
    <main className="blog-main">
      <h1>StatsPads blog</h1>
      <p className="blog-lede">Player comparisons and stat breakdowns, each one built on the same numbers and radar charts as the compare tool.</p>
      <ul className="blog-list">
        {published().map(post => <li key={post.slug}>
          <a href={`/blog/${post.slug}`}><h2>{post.title}</h2></a>
          <time dateTime={post.date}>{dateFormat.format(new Date(`${post.date}T12:00:00Z`))}</time>
          <p>{post.description}</p>
        </li>)}
      </ul>
    </main>
  </BlogShell>;
}
