import { SeoPage, seoMetadata } from '../../../lib/seo-page';
import { LEADERS } from '../../../lib/statLeaders';

export const generateStaticParams = () => LEADERS.map(entry => ({stat: entry.slug}));
export const generateMetadata = ({params}) => seoMetadata(`/stats/${params.stat}`);
export default function Page({params}) { return <SeoPage route={`/stats/${params.stat}`}/>; }
