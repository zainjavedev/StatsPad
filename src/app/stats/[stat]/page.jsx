import { SeoPage } from '../../../lib/seo-page';
import { LEADERS } from '../../../lib/statLeaders';

export const generateStaticParams = () => LEADERS.map(entry => ({stat: entry.slug}));
export const generateMetadata = ({params}) => {
  const entry = LEADERS.find(item => item.slug === params.stat);
  const label = entry ? entry.label.toLowerCase() : 'stat';
  return {title: `NBA ${label} leaders | StatsPads`, description: `Who leads the NBA in ${label} this season, with every qualifying player ranked.`, alternates: {canonical: `/stats/${params.stat}`}};
};
export default function Page({params}) { return <SeoPage route={`/stats/${params.stat}`}/>; }
