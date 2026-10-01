// What a link to the site looks like when it is shared: the title, the text and
// the card. Every page builds its metadata here, so a page that sets its own
// title also gets its own preview instead of inheriting the homepage's.
import { BRAND, SITE_URL, X_HANDLE } from './brand';

// The card is a file of the site. The version in the address changes when the
// artwork does: chat apps keep a preview image for as long as its address stays
// the same.
export const CARD_IMAGE = { url: '/brand/delta-card.png?v=4', width: 1200, height: 630, alt: `${BRAND}: route fees, your way` };
export const HOME_TITLE = `${BRAND} · Route your coin's fees anywhere`;
export const HOME_DESCRIPTION =
  "Route your coin's creator fees on Solana (and Robinhood Chain) to holders, a buyback, a treasury in real stocks, or any page on the internet: a YouTube channel, a GitHub repo, a phone number.";

/**
 * Metadata of one page. `title` is the page's own title (the brand is added),
 * `path` its address on the site, `image` a card of its own when it has one.
 */
export function pageMeta({ title = null, description = HOME_DESCRIPTION, path = '/', image = null, index = true } = {}) {
  const full = title ? `${title} · ${BRAND}` : HOME_TITLE;
  const images = [image ? { url: image, width: 1200, height: 630, alt: full } : CARD_IMAGE];
  return {
    title: full,
    description,
    alternates: { canonical: path },
    robots: index ? { index: true, follow: true } : { index: false, follow: true },
    openGraph: { title: full, description, url: `${SITE_URL}${path}`, siteName: BRAND, type: 'website', locale: 'en_US', images },
    twitter: {
      card: 'summary_large_image', title: full, description, images: images.map((i) => i.url),
      ...(X_HANDLE ? { site: `@${X_HANDLE}`, creator: `@${X_HANDLE}` } : {}),
    },
  };
}
