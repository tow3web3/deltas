import { getGlobalStats } from '../../../../lib/queries';
import { apiJson, apiOptions } from '../../../../lib/apiResponse';
import { STOCKS } from '../../../../lib/stocks';
import { XSTOCKS_TOTAL } from '../../../../lib/xstocks';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export function OPTIONS() {
  return apiOptions();
}

export async function GET() {
  try {
    const s = await getGlobalStats();
    return apiJson({
      // Fees routed, in each chain's own coin.
      solPaidOut: (Number(s.totalSolClaimedLamports || 0) / 1e9).toFixed(4),
      ethPaidOut: (Number(s.totalEthClaimedWei) / 1e18).toFixed(4),
      dividends: s.totalExecutions,
      activeBots: s.activeConfigs,
      creators: s.totalUsers,
      xStocksAvailable: XSTOCKS_TOTAL,
      stocksAvailable: STOCKS.length,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return apiJson({ error: error.message }, 500);
  }
}
