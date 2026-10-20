import { SeoPage } from '../../lib/seo-page';

export const metadata = {title: 'Sign in | StatsPads', robots: {index: false}, alternates: {canonical: '/signin'}};
export default function Page() { return <SeoPage route="/signin"/>; }
