import { getGlobalStats, getDailyRouted, getActiveTokens } from '../../../lib/queries';
import { fetchTokenMeta } from '../../../lib/tokenMeta';
import { getQuotes } from '../../../lib/prices';
import { STOCKS } from '../../../lib/stocks';
import { XSTOCKS_TOTAL } from '../../../lib/xstocks';
import { solPrices, SOL_MINT } from '../../../lib/solana';

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
    const solUsd = (await solPrices([SOL_MINT]).catch(() => ({})))[SOL_MINT] || 0;
    const eth = Number(s.totalEthClaimedWei) / 1e18;
    const sol = Number(s.totalSolClaimedLamports || 0) / 1e9;
    const coins = [...new Map(tokens.map((t) => [t.address, t])).values()].slice(0, 8);
    const meta = await fetchTokenMeta(coins.map((c) => c.address)).catch(() => ({}));
    return Response.json({
      totalUsers: s.totalUsers,
      activeConfigs: s.activeConfigs,
      totalExecutions: s.totalExecutions,
      totalEthClaimed: eth.toFixed(4),
      totalSolClaimed: sol.toFixed(4),
      // Both chains in one figure, in dollars.
      routedUsd: eth * ethUsd + sol * solUsd,
      stocksAvailable: STOCKS.length,
      xStocksAvailable: XSTOCKS_TOTAL,
      ethUsd,
      solUsd,
      // The last 30 days, one entry per day, for the chart.
      daily: daily.map((d) => ({ day: d.day, eth: Number(d.wei) / 1e18, sol: Number(d.lamports || 0) / 1e9, usd: (Number(d.wei) / 1e18) * ethUsd + (Number(d.lamports || 0) / 1e9) * solUsd, cycles: d.cycles })),
      coins: coins.map((c) => ({ address: c.address, symbol: meta[c.address]?.symbol || null, image: meta[c.address]?.image || null })),
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
