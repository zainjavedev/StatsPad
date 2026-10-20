import { SeoPage } from '../../lib/seo-page';

export const metadata = {title: 'Your account | StatsPads', robots: {index: false}, alternates: {canonical: '/account'}};
export default function Page() { return <SeoPage route="/account"/>; }
