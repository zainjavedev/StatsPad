import { SeoPage, routesUnder, seoMetadata } from '../../../lib/seo-page';

export const generateStaticParams = () => routesUnder('/leaders').map(season => ({season}));
export const generateMetadata = ({params}) => seoMetadata(`/leaders/${params.season}`);
export default function Page({params}) { return <SeoPage route={`/leaders/${params.season}`}/>; }
