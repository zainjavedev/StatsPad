import { SeoPage, routesUnder, seoMetadata } from '../../../lib/seo-page';

export const generateStaticParams = () => routesUnder('/compare').map(pair => ({pair}));
/* Each comparison shares its own picture (opengraph-image.jsx) instead of the site-wide one. */
export const generateMetadata = ({params}) => {
  const route = `/compare/${params.pair}`, meta = seoMetadata(route), image = `${route}/opengraph-image`;
  if (!meta.openGraph) return meta;
  return {...meta, openGraph: {...meta.openGraph, images: [{url: image, width: 1200, height: 630, alt: 'Side-by-side NBA stats comparison'}]}, twitter: {...meta.twitter, images: [{url: image, alt: 'Side-by-side NBA stats comparison'}]}};
};
export default function Page({params}) { return <SeoPage route={`/compare/${params.pair}`}/>; }
