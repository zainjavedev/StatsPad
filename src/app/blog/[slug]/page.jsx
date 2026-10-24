import { notFound } from 'next/navigation';
import BlogShell from '../../../components/blog/BlogShell';
import { POSTS, published } from '../../../content/blog/posts';
import { BODIES } from '../../../content/blog/bodies';
import { SITE } from '../../../lib/routes';
import { socialTags } from '../../../lib/social';

/* Drafts are left out of the static params and dynamicParams is off, so a draft URL is a 404 even when it is committed. */
export const dynamicParams = false;
export const generateStaticParams = () => published().map(post => ({slug: post.slug}));

const find = slug => POSTS.find(post => post.slug === slug && !post.draft);
const dateFormat = new Intl.DateTimeFormat('en-US', {month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC'});

export function generateMetadata({params}) {
  const post = find(params.slug);
  if (!post) return {};
  const route = `/blog/${post.slug}`;
  return {
    title: `${post.title} | StatsPads`.length <= 60 ? `${post.title} | StatsPads` : post.title,
    description: post.description,
    alternates: {canonical: route},
    ...socialTags({title: post.title, description: post.description, route, type: 'article', og: {publishedTime: post.date, modifiedTime: post.updated ?? post.date, authors: ['StatsPads'], section: post.tag}}),
  };
}

export default function BlogPost({params}) {
  const post = find(params.slug), Body = BODIES[params.slug];
  if (!post || !Body) notFound();
  const schema = [
    {'@context': 'https://schema.org', '@type': 'BlogPosting', headline: post.title, description: post.description, datePublished: post.date, dateModified: post.updated ?? post.date, inLanguage: 'en-US', isAccessibleForFree: true, articleSection: post.tag, mainEntityOfPage: `${SITE}/blog/${post.slug}`, image: `${SITE}/og-default.jpg`,
      author: {'@type': 'Organization', name: 'StatsPads', url: SITE}, publisher: {'@type': 'Organization', name: 'StatsPads', url: SITE, logo: {'@type': 'ImageObject', url: `${SITE}/icon-512.png`}}},
    {'@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [['Home', '/'], ['Blog', '/blog'], [post.title, `/blog/${post.slug}`]].map(([name, route], index) => ({'@type': 'ListItem', position: index + 1, name, item: SITE + route}))},
  ];
  return <BlogShell>
    {schema.map((data, index) => <script key={index} type="application/ld+json" dangerouslySetInnerHTML={{__html: JSON.stringify(data)}}/>)}
    <main className="blog-main">
      <article>
        <p className="blog-crumbs"><a href="/blog">Blog</a></p>
        <h1>{post.title}</h1>
        <p className="blog-meta"><time dateTime={post.date}>{dateFormat.format(new Date(`${post.date}T12:00:00Z`))}</time> · StatsPads</p>
        <Body/>
      </article>
    </main>
  </BlogShell>;
}
