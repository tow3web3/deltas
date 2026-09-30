import { SITE_URL } from '../lib/brand';

// The dashboard and the API are tools, not pages to find in a search.
export default function robots() {
  return {
    rules: [{ userAgent: '*', allow: '/', disallow: ['/api/', '/app'] }],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
