// The icon of any token on Robinhood Chain. Stocks and ETH are files of the
// site; for everything else this asks the screener, then the explorer, and
// redirects to the first icon that really is an image. 404 when the token has
// published none: the caller then draws its monogram.
import { getStock, isNative, EVM_ADDR } from '../../../../lib/stocks';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const TTL = 6 * 3600 * 1000;
const MISS_TTL = 10 * 60 * 1000;
const cache = new Map();
const UA = { 'User-Agent': 'Mozilla/5.0 (DELTA logo lookup)', Accept: 'application/json' };

async function json(url) {
  const res = await fetch(url, { headers: UA, cache: 'no-store', signal: AbortSignal.timeout(7000) });
  return res.ok ? res.json() : null;
}
async function isImage(url) {
  if (!/^https:\/\//.test(url || '')) return false;
  try {
    const res = await fetch(url, { headers: { Accept: 'image/*', 'User-Agent': UA['User-Agent'] }, cache: 'no-store', signal: AbortSignal.timeout(7000) });
    return res.ok && /^image\//.test(res.headers.get('content-type') || '');
  } catch {
    return false;
  }
}

const SOURCES = [
  async (a) => {
    const d = await json(`https://api.dexscreener.com/tokens/v1/robinhood/${a}`);
    const pairs = (Array.isArray(d) ? d : []).filter((p) => p.baseToken?.address?.toLowerCase() === a && p.info?.imageUrl);
    pairs.sort((x, y) => (y.liquidity?.usd || 0) - (x.liquidity?.usd || 0));
    return pairs[0]?.info?.imageUrl || null;
  },
  async (a) => `https://dd.dexscreener.com/ds-data/tokens/robinhood/${a}.png?size=lg`,
  async (a) => (await json(`https://robinhoodchain.blockscout.com/api/v2/tokens/${a}`))?.icon_url || null,
];

async function find(address) {
  for (const source of SOURCES) {
    try {
      const url = await source(address);
      if (url && (await isImage(url))) return url;
    } catch { /* next source */ }
  }
  return null;
}

export async function GET(request, { params }) {
  const { address: raw } = await params;
  const address = String(raw || '').toLowerCase();
  const local = isNative(address) ? '/eth.svg' : getStock(address)?.logo;
  if (local) return Response.redirect(new URL(local, request.url), 302);
  if (!EVM_ADDR.test(address)) return new Response('Invalid address', { status: 400 });

  const hit = cache.get(address);
  let url = hit && Date.now() - hit.ts < (hit.url ? TTL : MISS_TTL) ? hit.url : undefined;
  if (url === undefined) {
    url = await find(address);
    if (cache.size > 2000) cache.clear();
    cache.set(address, { url, ts: Date.now() });
  }
  if (!url) return new Response('No icon published for this token', { status: 404, headers: { 'Cache-Control': 'public, max-age=600' } });
  return new Response(null, { status: 302, headers: { Location: url, 'Cache-Control': 'public, max-age=21600' } });
}
