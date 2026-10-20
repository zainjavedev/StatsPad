import { SeoPage, seoMetadata } from '../../lib/seo-page';

export const metadata = seoMetadata('/standings');
export default function Page() { return <SeoPage route="/standings"/>; }
