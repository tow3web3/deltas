// Solana reads for the site: balances and token metadata, through the RPC in
// SOLANA_RPC_URL (Helius) and Jupiter's free endpoints. Server only.
import { PublicKey } from '@solana/web3.js';
import { isSolAddress } from './chains';

const RPC = process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com';
export const SOL_MINT = 'So11111111111111111111111111111111111111112';
const JUP = 'https://lite-api.jup.ag';
const cache = new Map();
const TTL = 60_000;

async function rpc(method, params) {
  const res = await fetch(RPC, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }), signal: AbortSignal.timeout(15_000), cache: 'no-store' });
  const d = await res.json();
  if (d.error) throw new Error(`${method}: ${d.error.message}`);
  return d.result;
}

/** SOL balance in lamports (bigint). */
export async function solBalance(address) {
  if (!isSolAddress(address)) return 0n;
  const r = await rpc('getBalance', [address, { commitment: 'confirmed' }]);
  return BigInt(r.value);
}

/** Every SPL token an owner holds: [{ mint, amount (raw string), decimals }]. */
export async function splHoldings(address) {
  if (!isSolAddress(address)) return [];
  const out = [];
  for (const programId of ['TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA', 'TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb']) {
    const r = await rpc('getTokenAccountsByOwner', [address, { programId }, { encoding: 'jsonParsed', commitment: 'confirmed' }]).catch(() => ({ value: [] }));
    for (const a of r.value || []) {
      const info = a.account?.data?.parsed?.info;
      if (info && info.tokenAmount && info.tokenAmount.amount !== '0') out.push({ mint: info.mint, amount: info.tokenAmount.amount, decimals: info.tokenAmount.decimals });
    }
  }
  return out;
}

const PUMP_PROGRAM = '6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P';
/**
 * A pump.fun coin's bonding curve: whether it graduated, and the wallet its
 * creator fees accrue to. Null when the mint is not a pump.fun coin.
 * Layout: 8-byte discriminator, five u64, `complete` at byte 48, `creator` at 49..81.
 */
export async function pumpCurve(mint) {
  if (!isSolAddress(mint)) return null;
  const [pda] = PublicKey.findProgramAddressSync([Buffer.from('bonding-curve'), new PublicKey(mint).toBuffer()], new PublicKey(PUMP_PROGRAM));
  const r = await rpc('getAccountInfo', [pda.toBase58(), { encoding: 'base64', commitment: 'confirmed' }]);
  if (!r?.value) return null;
  const data = Buffer.from(r.value.data[0], 'base64');
  return { complete: data[48] === 1, creator: data.length >= 81 ? new PublicKey(data.subarray(49, 81)).toBase58() : null };
}

/** USD prices from Jupiter: { [mint]: usdPrice }. Cached a minute. */
export async function solPrices(mints) {
  const want = [...new Set(mints.filter(Boolean))];
  const key = `p:${want.sort().join(',')}`;
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < TTL) return hit.v;
  const res = await fetch(`${JUP}/price/v3?ids=${want.join(',')}`, { headers: { Accept: 'application/json' }, signal: AbortSignal.timeout(15_000) });
  const d = res.ok ? await res.json() : {};
  const v = Object.fromEntries(want.map((m) => [m, d[m]?.usdPrice ?? null]));
  cache.set(key, { at: Date.now(), v });
  return v;
}

/** Jupiter's view of mints: { [mint]: { symbol, name, decimals, image, marketCap } }. */
export async function jupiterTokens(mints) {
  const out = {};
  const want = [...new Set(mints.filter(isSolAddress))];
  for (const mint of want) {
    if (mint === SOL_MINT) { out[mint] = { symbol: 'SOL', name: 'Solana', decimals: 9, image: '/sol.png', marketCap: null }; continue; }
    const hit = cache.get(`t:${mint}`);
    if (hit && Date.now() - hit.at < 24 * 3600_000) { out[mint] = hit.v; continue; }
    try {
      const res = await fetch(`${JUP}/tokens/v2/search?query=${mint}`, { headers: { Accept: 'application/json' }, signal: AbortSignal.timeout(15_000) });
      const list = res.ok ? await res.json() : [];
      const t = (Array.isArray(list) ? list : []).find((x) => x.id === mint);
      if (t) {
        const v = { symbol: t.symbol, name: t.name, decimals: t.decimals, image: t.icon || null, marketCap: t.mcap ?? t.fdv ?? null, isXStock: /xStock/i.test(t.name || '') && mint.startsWith('Xs') };
        cache.set(`t:${mint}`, { at: Date.now(), v }); out[mint] = v;
      } else {
        // A coin launched minutes ago can be missing from Jupiter: read its on-chain metadata (Helius DAS).
        const a = await rpc('getAsset', { id: mint }).catch(() => null);
        const md = a?.content?.metadata;
        if (md?.symbol && a?.token_info?.decimals != null) {
          out[mint] = { symbol: md.symbol, name: md.name || md.symbol, decimals: a.token_info.decimals, image: a.content?.links?.image || null, marketCap: null, isXStock: false };
        }
      }
    } catch { /* unknown mint: the monogram will do */ }
  }
  return out;
}

/** What a Solana dev wallet holds, priced: { totalUsd, assets: [{ address, symbol, amount, usd, isNative }] }. */
export async function solWalletAssets(address, reserveLamports = 0n) {
  const [lamports, tokens] = await Promise.all([solBalance(address), splHoldings(address)]);
  const mints = [SOL_MINT, ...tokens.map((t) => t.mint)];
  const [prices, meta] = await Promise.all([solPrices(mints), jupiterTokens(mints)]);
  const assets = [];
  const spendable = lamports > reserveLamports ? lamports - reserveLamports : 0n;
  const sol = Number(spendable) / 1e9;
  assets.push({ address: SOL_MINT, symbol: 'SOL', decimals: 9, amount: sol, usd: prices[SOL_MINT] ? sol * prices[SOL_MINT] : null, isNative: true, image: '/sol.png' });
  for (const t of tokens) {
    const m = meta[t.mint]; const amount = Number(t.amount) / 10 ** t.decimals;
    assets.push({ address: t.mint, symbol: m?.symbol || t.mint.slice(0, 4), decimals: t.decimals, amount, usd: prices[t.mint] ? amount * prices[t.mint] : null, isNative: false, image: m?.image || null });
  }
  return { totalUsd: assets.reduce((s, a) => s + (a.usd || 0), 0), assets };
}
