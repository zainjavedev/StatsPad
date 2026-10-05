/* StatsPad's own articles: every Markdown file in src/articles, newest first.
   Each file starts with front matter between --- lines:
   title, summary, date (YYYY-MM-DD), author and optionally team (e.g. PHI). */
const files = import.meta.glob('../articles/*.md', {as: 'raw', eager: true});

function parseArticle(raw, file) {
  const match = raw.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  const meta = {}, body = match ? match[2] : raw;
  if (match) for (const line of match[1].split('\n')) {
    const field = line.match(/^(\w+):\s*(.*)$/);
    if (field) meta[field[1]] = field[2].trim();
  }
  const slug = meta.slug || file.split('/').pop().replace(/\.md$/, '');
  return {slug, title: meta.title || slug, summary: meta.summary || '', author: meta.author || 'StatsPad', date: meta.date ? new Date(`${meta.date}T12:00:00`) : null, team: meta.team || null, body};
}

export const ARTICLES = Object.entries(files)
  .map(([file, raw]) => parseArticle(raw, file))
  .sort((a, b) => (b.date || 0) - (a.date || 0));
