/* Open Graph and Twitter card tags, built in one place so every page sends the same complete set:
   title, description, canonical URL, locale, and the share image with its size, type and alt text. */

export const SITE_NAME = 'StatsPads';
export const IMAGE_ALT = 'StatsPads: NBA player and team comparisons, league leaders and standings';
export const SHARE_IMAGE = '/og-default.jpg';

export const ogImages = () => [{url: SHARE_IMAGE, width: 1200, height: 630, alt: IMAGE_ALT, type: 'image/jpeg'}];

/* `route` becomes og:url (resolved against metadataBase); leave it out for fallback tags that must not claim a URL.
   `og` adds type-specific fields: profile names for a player, publish dates for an article. */
export function socialTags({title, description, route, type = 'website', og = {}}) {
  return {
    openGraph: {type, siteName: SITE_NAME, locale: 'en_US', title, description, ...(route ? {url: route} : {}), images: ogImages(), ...og},
    twitter: {card: 'summary_large_image', title, description, images: [{url: SHARE_IMAGE, alt: IMAGE_ALT}]},
  };
}
