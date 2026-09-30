// The directory of pages receiving fees. Public, read-only.
import { topPages, recentPagePayouts, pagesStats } from '../../../lib/pageQueries';
import { pageCard, ethPrice } from '../../../lib/pageView';
import { fetchTokenMeta } from '../../../lib/tokenMeta';
import { apiJson, apiOptions } from '../../../lib/apiResponse';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const OPTIONS = apiOptions;

export async function GET(request) {
  try {
    const sp = new URL(request.url).searchParams;
    const [pages, recent, stats, ethUsd] = await Promise.all([
      topPages({ limit: sp.get('limit') || 24, platform: sp.get('platform'), q: sp.get('q') }),
      recentPagePayouts(12),
      pagesStats(),
      ethPrice(),
    ]);
    const meta = await fetchTokenMeta([...new Set(recent.map((r) => r.source_token).filter(Boolean))]).catch(() => ({}));
    return apiJson({
      stats: { pages: stats.pages, claimed: stats.claimed, payments: stats.payments, routedUsd: (Number(stats.value_wei) / 1e18) * ethUsd },
      pages: pages.map((p) => pageCard(p, ethUsd)),
      recent: recent.map((r) => {
        const { receivedUsd, payments, coins, lastAt, ...card } = pageCard(r, ethUsd);
        void receivedUsd; void payments; void coins; void lastAt;
        return {
          ...card,
          amount: Number(r.amount) / 10 ** Number(r.decimals ?? 18), token: r.token, symbol: r.symbol, usd: (Number(r.value_wei) / 1e18) * ethUsd, direct: r.direct, tx: r.tx_hash, at: r.created_at,
          from: r.source_token ? { address: r.source_token, symbol: meta[r.source_token]?.symbol || null, image: meta[r.source_token]?.image || null } : null,
        };
      }),
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return apiJson({ error: error.message }, 500);
  }
}
