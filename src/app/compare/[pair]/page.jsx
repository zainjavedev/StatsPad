import { SeoPage, routesUnder, seoMetadata } from '../../../lib/seo-page';

export const generateStaticParams = () => routesUnder('/compare').map(pair => ({pair}));
export const generateMetadata = ({params}) => seoMetadata(`/compare/${params.pair}`);
export default function Page({params}) { return <SeoPage route={`/compare/${params.pair}`}/>; }
