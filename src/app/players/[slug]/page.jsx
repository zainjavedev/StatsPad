import { SeoPage, routesUnder, seoMetadata } from '../../../lib/seo-page';

export const generateStaticParams = () => routesUnder('/players').map(slug => ({slug}));
export const generateMetadata = ({params}) => seoMetadata(`/players/${params.slug}`);
export default function Page({params}) { return <SeoPage route={`/players/${params.slug}`}/>; }
