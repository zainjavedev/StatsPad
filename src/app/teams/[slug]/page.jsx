import { SeoPage, routesUnder, seoMetadata } from '../../../lib/seo-page';

export const generateStaticParams = () => routesUnder('/teams').map(slug => ({slug}));
export const generateMetadata = ({params}) => seoMetadata(`/teams/${params.slug}`);
export default function Page({params}) { return <SeoPage route={`/teams/${params.slug}`}/>; }
