import { SITE_URL } from '../lib/brand';
import { topPages } from '../lib/pageQueries';
import { getActiveTokens } from '../lib/queries';
import { pagePath } from '../lib/pages';

export const dynamic = 'force-dynamic';

// The fixed pages, then what lives in the database: every page receiving fees
// and every coin routing them. A database that does not answer leaves the
// fixed pages.
export default async function sitemap() {
  const now = new Date();
  const fixed = [['/', 1, 'daily'], ['/pages', 0.9, 'hourly'], ['/claim', 0.9, 'monthly'], ['/guide', 0.8, 'monthly'], ['/stocks', 0.6, 'weekly'], ['/wallet', 0.5, 'monthly'], ['/vote', 0.4, 'weekly'], ['/missions', 0.3, 'monthly'], ['/privacy', 0.2, 'yearly'], ['/terms', 0.2, 'yearly']]
    .map(([path, priority, changeFrequency]) => ({ url: `${SITE_URL}${path}`, lastModified: now, changeFrequency, priority }));
  const [pages, coins] = await Promise.all([topPages({ limit: 100 }).catch(() => []), getActiveTokens().catch(() => [])]);
  return [
    ...fixed,
    ...pages.map((p) => ({ url: `${SITE_URL}${pagePath(p.platform, p.handle, p.slug)}`, lastModified: p.last_at || p.created_at || now, changeFrequency: 'daily', priority: 0.7 })),
    ...[...new Set(coins.map((c) => c.address))].map((a) => ({ url: `${SITE_URL}/${a}`, lastModified: now, changeFrequency: 'hourly', priority: 0.7 })),
  ];
}
