import pages from '../../seo/pages.json';
import { seoMetadata } from '../../lib/seo-page';

export const metadata = seoMetadata('/lineups');

const wrap = {maxWidth: 680, margin: '0 auto', padding: '48px 16px 80px', font: '16px/1.65 system-ui, sans-serif'};

/* Plain readable page, like the privacy policy: the prerendered copy is the page, there is no app view for it. */
export default function Lineups() {
  const body = (pages['/lineups']?.body ?? '').replace(/^<main class="seo">|<\/main>$/g, '');
  return <main style={wrap} dangerouslySetInnerHTML={{__html: body}}/>;
}
