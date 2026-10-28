import { SeoPage, seoMetadata } from '../../../../lib/seo-page';
import { TEAM_LEADERS } from '../../../../lib/teamLeaders';

export const generateStaticParams = () => TEAM_LEADERS.map(entry => ({stat: entry.slug}));
export const generateMetadata = ({params}) => seoMetadata(`/stats/teams/${params.stat}`);
export default function Page({params}) { return <SeoPage route={`/stats/teams/${params.stat}`}/>; }
