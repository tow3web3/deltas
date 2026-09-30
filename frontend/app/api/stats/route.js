import { getGlobalStats, getDailyRouted, getActiveTokens } from '../../../lib/queries';
import { fetchTokenMeta } from '../../../lib/tokenMeta';
import { getQuotes } from '../../../lib/prices';
import { STOCKS } from '../../../lib/stocks';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const [s, daily, tokens, quotes] = await Promise.all([
      getGlobalStats(),
      getDailyRouted(30).catch(() => []),
      getActiveTokens().catch(() => []),
      getQuotes(['ETH-USD']).catch(() => ({})),
    ]);
    const ethUsd = quotes['ETH-USD']?.price || 0;
    const coins = [...new Map(tokens.map((t) => [t.address, t])).values()].slice(0, 8);
    const meta = await fetchTokenMeta(coins.map((c) => c.address)).catch(() => ({}));
    return Response.json({
      totalUsers: s.totalUsers,
      activeConfigs: s.activeConfigs,
      totalExecutions: s.totalExecutions,
      totalEthClaimed: (Number(s.totalEthClaimedWei) / 1e18).toFixed(4),
      stocksAvailable: STOCKS.length,
      ethUsd,
      // The last 30 days, one entry per day, for the chart.
      daily: daily.map((d) => ({ day: d.day, eth: Number(d.wei) / 1e18, usd: (Number(d.wei) / 1e18) * ethUsd, cycles: d.cycles })),
      coins: coins.map((c) => ({ address: c.address, symbol: meta[c.address]?.symbol || null, image: meta[c.address]?.image || null })),
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
