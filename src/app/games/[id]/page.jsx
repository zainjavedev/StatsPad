import ClientApp from '../../../components/ClientApp';
import games from '../../../seo/games.json';
import { SeoPage } from '../../../lib/seo-page';
import { socialTags } from '../../../lib/social';

/* Finished games written by scripts/prerender.mjs are indexable pages; any other game (live, upcoming, unsynced) still opens the app and stays out of the index. */
export const generateStaticParams = () => Object.keys(games).map(id => ({id}));

export function generateMetadata({params}) {
  const page = games[params.id], route = `/games/${params.id}`;
  if (!page) return {title: 'Game details | StatsPads', robots: {index: false}};
  return {title: page.title, description: page.description, alternates: {canonical: route}, ...socialTags({title: page.title, description: page.description, route})};
}

export default function Page({params}) {
  const page = games[params.id];
  return page ? <SeoPage route={`/games/${params.id}`} page={page}/> : <ClientApp/>;
}
