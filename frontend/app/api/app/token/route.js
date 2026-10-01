// Resolve a token address for the dashboard: symbol, name, decimals, whether it
// is a stock, plus the research card (image, price, changes, liquidity, chart).
import { parseAbi } from 'viem';
import { rpc } from '../../../../lib/evm';
import { fetchTokenMeta } from '../../../../lib/tokenMeta';
import { researchToken } from '../../../../lib/tokenResearch';
import { EVM_ADDR, getStock, isNative } from '../../../../lib/stocks';
import { isSolAddress } from '../../../../lib/chains';
import { jupiterTokens, pumpCurve, SOL_MINT } from '../../../../lib/solana';
import { getXStock } from '../../../../lib/xstocks';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
const erc20 = parseAbi(['function symbol() view returns (string)', 'function name() view returns (string)', 'function decimals() view returns (uint8)']);

/** A Solana mint: Jupiter's card, whether it is an xStock, and its pump.fun creator. */
async function solanaToken(mint, wallet) {
  const [meta, curve] = await Promise.all([jupiterTokens([mint]).catch(() => ({})), pumpCurve(mint).catch(() => null)]);
  const m = meta[mint];
  if (!m) return Response.json({ error: 'Jupiter does not know that mint yet. Check the address, or try again once the coin has traded.' }, { status: 404 });
  const xs = getXStock(mint);
  const pump = curve ? { isPump: true, creator: curve.creator, complete: curve.complete } : null;
  return Response.json({
    address: mint, chain: 'solana', symbol: m.symbol, name: m.name, decimals: m.decimals, image: m.image || (xs ? xs.logo : null), marketCap: m.marketCap ?? null,
    isStock: Boolean(xs && xs.mint === mint), isNative: mint === SOL_MINT, research: null,
    pump, isCreator: pump?.creator && wallet ? pump.creator === wallet : null,
  });
}

export async function GET(request) {
  const sp = new URL(request.url).searchParams;
  const address = sp.get('address') || '';
  if (isSolAddress(address) && !EVM_ADDR.test(address)) return solanaToken(address, sp.get('wallet') || null);
  if (!EVM_ADDR.test(address)) return Response.json({ error: 'Invalid address' }, { status: 400 });
  if (isNative(address)) {
    const research = await researchToken(address);
    return Response.json({ address: address.toLowerCase(), symbol: 'ETH', name: 'Ether', decimals: 18, image: '/eth.svg', marketCap: null, isStock: false, isNative: true, research });
  }
  try {
    const stock = getStock(address);
    const [symbol, name, decimals] = stock
      ? [stock.ticker, stock.name, 18]
      : await Promise.all([
        rpc().readContract({ address, abi: erc20, functionName: 'symbol' }),
        rpc().readContract({ address, abi: erc20, functionName: 'name' }).catch(() => null),
        rpc().readContract({ address, abi: erc20, functionName: 'decimals' }).catch(() => 18),
      ]);
    const [meta, research] = await Promise.all([fetchTokenMeta([address]).catch(() => ({})), researchToken(address)]);
    const m = meta[address.toLowerCase()] || {};
    return Response.json({
      address: address.toLowerCase(), symbol: String(symbol), name: name ? String(name) : String(symbol), decimals: Number(decimals),
      image: research.image || m.image || null, marketCap: research.marketCap ?? m.marketCap ?? null, isStock: Boolean(stock), isNative: false, research,
    });
  } catch {
    return Response.json({ error: 'No ERC-20 found at that address on Robinhood Chain' }, { status: 404 });
  }
}
