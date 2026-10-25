import ClientApp from '../../../components/ClientApp';
import games from '../../../seo/games.json';
import { SeoPage } from '../../../lib/seo-page';
import { socialTags } from '../../../lib/social';

/* Finished games written by scripts/prerender.mjs are indexable pages at /games/<away>-vs-<home>-<espn id>; any other game (live, upcoming, unsynced) still opens the app and stays out of the index. The bare id of a finished game is redirected to its slug in next.config.mjs. */
const pageFor = param => games[param.match(/(\d+)$/)?.[1]];
export const generateStaticParams = () => Object.values(games).map(page => ({id: page.route.split('/')[2]}));

export function generateMetadata({params}) {
  const page = pageFor(params.id);
  if (!page) return {title: 'Game details | StatsPads', robots: {index: false}};
  return {title: page.title, description: page.description, alternates: {canonical: page.route}, ...socialTags({title: page.title, description: page.description, route: page.route})};
}

export default function Page({params}) {
  const page = pageFor(params.id);
  return page ? <SeoPage route={page.route} page={page}/> : <ClientApp/>;
}
