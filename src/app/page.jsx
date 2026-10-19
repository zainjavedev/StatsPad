import { SeoPage, seoMetadata } from '../lib/seo-page';

export const metadata = seoMetadata('/');
export default function Page() { return <SeoPage route="/"/>; }
