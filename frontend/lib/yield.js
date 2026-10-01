// Dividend yield: what a coin returned to its holders (dividends, buybacks and
// treasury together) over the trailing 30 days, in USD, annualized, divided by
// market cap. Young tokens are annualized over their real age (at least one
// day) so a week-old token is not understated. Amounts are in the chain's own
// coin: SOL (from lamports) on Solana, ETH (from wei) on Robinhood Chain. The
// fields keep their historical eth* names; `native` says which coin they count.
import { getYieldInputs } from './queries';
import { getQuotes } from './prices';
import { CHAINS } from './chains';

async function nativeUsd() {
  const [q, sol] = await Promise.all([
    getQuotes(['ETH-USD']).catch(() => ({})),
    import('./solana').then((m) => m.solPrices([m.SOL_MINT]).then((p) => p[m.SOL_MINT] || 0)).catch(() => 0),
  ]);
  return { robinhood: q['ETH-USD']?.price || 0, solana: sol };
}

const DAY = 86_400_000;

export function computeYield({ eth30d, eth7d, cycles30d, firstAt, ethUsd, marketCap, chain = 'robinhood' }) {
  const c = CHAINS[chain] || CHAINS.robinhood;
  const unit = 10 ** c.nativeDecimals;
  const eth30 = Number(eth30d || 0) / unit;
  const eth7 = Number(eth7d || 0) / unit;
  const usd30d = eth30 * (ethUsd || 0);
  const ageDays = firstAt ? Math.max(1, (Date.now() - new Date(firstAt).getTime()) / DAY) : 30;
  const window = Math.min(30, ageDays);
  const annualizedUsd = window > 0 ? usd30d * (365 / window) : 0;
  const apy = marketCap > 0 && annualizedUsd > 0 ? (annualizedUsd / marketCap) * 100 : null;
  return { eth30d: eth30, eth7d: eth7, native: c.native, chain: c.key, usd30d, annualizedUsd, apy, cycles30d: Number(cycles30d || 0), windowDays: Math.round(window * 10) / 10 };
}

/** Yield for one token (needs its market cap from token metadata). */
export async function tokenYield(address, marketCap) {
  const [row] = await getYieldInputs(address);
  const usd = await nativeUsd();
  const chain = row?.chain || (/^0x/.test(String(address)) ? 'robinhood' : 'solana');
  if (!row) return computeYield({ eth30d: 0, eth7d: 0, cycles30d: 0, firstAt: null, ethUsd: usd[chain], marketCap, chain });
  return computeYield({ eth30d: row.eth_30d, eth7d: row.eth_7d, cycles30d: row.cycles_30d, firstAt: row.first_at, ethUsd: usd[chain], marketCap, chain });
}

/** Yield for every active token: address(lowercase) -> yield, given a marketCap lookup. */
export async function allYields(marketCapOf) {
  const rows = await getYieldInputs();
  const usd = await nativeUsd();
  const out = {};
  for (const r of rows) {
    const chain = r.chain || 'robinhood';
    out[r.address] = computeYield({ eth30d: r.eth_30d, eth7d: r.eth_7d, cycles30d: r.cycles_30d, firstAt: r.first_at, ethUsd: usd[chain], marketCap: marketCapOf(r.address), chain });
  }
  return out;
}

export const fmtApy = (apy) => (apy == null ? null : apy >= 100 ? `${Math.round(apy)}%` : apy >= 10 ? `${apy.toFixed(1)}%` : `${apy.toFixed(2)}%`);
