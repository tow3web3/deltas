// The directory of pages receiving fees. Public, read-only.
import { topPages, recentPagePayouts, pagesStats } from '../../../lib/pageQueries';
import { pageCard, payoutRow, statsUsd, nativePrices, lamportWeight } from '../../../lib/pageView';
import { fetchTokenMeta } from '../../../lib/tokenMeta';
import { apiJson, apiOptions } from '../../../lib/apiResponse';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const OPTIONS = apiOptions;

export async function GET(request) {
  try {
    const sp = new URL(request.url).searchParams;
    const prices = await nativePrices();
    const [pages, recent, stats] = await Promise.all([
      topPages({ limit: sp.get('limit') || 24, platform: sp.get('platform'), q: sp.get('q'), lamportWeight: lamportWeight(prices) }),
      recentPagePayouts(12),
      pagesStats(),
    ]);
    const meta = await fetchTokenMeta([...new Set(recent.map((r) => r.source_token).filter(Boolean))]).catch(() => ({}));
    return apiJson({
      stats: { pages: stats.pages, claimed: stats.claimed, payments: stats.payments, routedUsd: statsUsd(stats, prices) },
      pages: pages.map((p) => pageCard(p, prices)),
      recent: recent.map((r) => payoutRow(r, prices, meta)),
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return apiJson({ error: error.message }, 500);
  }
}
