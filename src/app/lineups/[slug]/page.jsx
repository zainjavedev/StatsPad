import { SeoPage, routesUnder, seoMetadata } from '../../../lib/seo-page';

export const generateStaticParams = () => routesUnder('/lineups').map(slug => ({slug}));
export const generateMetadata = ({params}) => seoMetadata(`/lineups/${params.slug}`);
export default function Page({params}) { return <SeoPage route={`/lineups/${params.slug}`}/>; }
