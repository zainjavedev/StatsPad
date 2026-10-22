import { SeoPage } from '../../lib/seo-page';

export const metadata = {title: 'Top recent NBA performances | StatsPads', description: 'The best individual NBA game lines from the last few nights.', alternates: {canonical: '/performances'}};
export default function Page() { return <SeoPage route="/performances"/>; }
