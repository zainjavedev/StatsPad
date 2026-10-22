import { SeoPage } from '../../../lib/seo-page';
import { LEADERS } from '../../../lib/statLeaders';

export const generateStaticParams = () => LEADERS.map(entry => ({stat: entry.slug}));
export const generateMetadata = ({params}) => {
  const entry = LEADERS.find(item => item.slug === params.stat);
  return {title: `NBA ${entry ? entry.label.toLowerCase() : 'stat'} leaders | StatsPads`, alternates: {canonical: `/stats/${params.stat}`}};
};
export default function Page({params}) { return <SeoPage route={`/stats/${params.stat}`}/>; }
