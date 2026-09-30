import { getDashboard } from '../../lib/queries';
import { fetchTokenMeta } from '../../lib/tokenMeta';
import { tokenYield, fmtApy } from '../../lib/yield';
import { EVM_ADDR } from '../../lib/stocks';
import { BRAND } from '../../lib/brand';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }) {
  const { tokenAddress } = await params;
  const fallback = { title: `Token dashboard · ${BRAND}`, description: 'Live dashboard of a coin on Robinhood Chain: where its fees are routed and what holders were paid.' };
  if (!EVM_ADDR.test(tokenAddress)) return fallback;
  try {
    const data = await getDashboard(tokenAddress);
    if (!data) return fallback;
    const src = data.config.source_token_address;
    const tgt = data.config.target_token_address;
    const meta = await fetchTokenMeta([src, tgt]);
    const y = await tokenYield(src, meta[src]?.marketCap ?? null);
    const apy = fmtApy(y.apy);
    const sym = meta[src]?.symbol ? `$${meta[src].symbol}` : 'This token';
    const title = `${sym} pays dividends in ${meta[tgt]?.symbol || 'stocks'}${apy ? ` · ${apy} APY` : ''} · ${BRAND}`;
    const description = `${data.stats.execution_count || 0} dividends paid to holders on Robinhood Chain${apy ? `, ${apy} annualized yield` : ''}. Live dashboard by ${BRAND}.`;
    return { title, description, openGraph: { title, description }, twitter: { card: 'summary_large_image', title, description } };
  } catch {
    return fallback;
  }
}

export default function DashboardLayout({ children }) {
  return children;
}
