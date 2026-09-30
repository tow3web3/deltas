// Jupiter: one venue for every swap on Solana, and the reference price for the
// fair-price guard. The free endpoints (lite-api) need no key; JUPITER_API_KEY
// switches to the paid host when set.
import { VersionedTransaction } from '@solana/web3.js';
import { conn } from './client.js';

export const SOL_MINT = 'So11111111111111111111111111111111111111112';
const BASE = process.env.JUPITER_API_KEY ? 'https://api.jup.ag' : 'https://lite-api.jup.ag';
const headers = () => ({ Accept: 'application/json', ...(process.env.JUPITER_API_KEY ? { 'x-api-key': process.env.JUPITER_API_KEY } : {}) });

async function getJson(url) {
  const res = await fetch(url, { headers: headers(), signal: AbortSignal.timeout(20_000) });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`Jupiter ${res.status}: ${(data.error || data.message || '').toString().slice(0, 140)}`);
  return data;
}

/** USD prices for mints: { [mint]: { usdPrice, decimals, liquidity } }. */
export async function prices(mints) {
  const d = await getJson(`${BASE}/price/v3?ids=${mints.join(',')}`);
  return d;
}

/** A quote for `amount` (raw units of inputMint) -> outputMint. Returns Jupiter's quote object (outAmount, routePlan…). */
export async function quote({ inputMint, outputMint, amount, slippageBps = 100 }) {
  const q = new URLSearchParams({ inputMint, outputMint, amount: String(amount), slippageBps: String(slippageBps), restrictIntermediateTokens: 'true' });
  return await getJson(`${BASE}/swap/v1/quote?${q}`);
}

/**
 * Execute a quote from `keypair`: Jupiter builds the transaction, we sign and
 * send it. Returns { signature, outAmount }.
 */
export async function swap({ keypair, quoteResponse }) {
  const res = await fetch(`${BASE}/swap/v1/swap`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', ...headers() },
    body: JSON.stringify({ quoteResponse, userPublicKey: keypair.publicKey.toBase58(), wrapAndUnwrapSol: true, dynamicComputeUnitLimit: true, prioritizationFeeLamports: { priorityLevelWithMaxLamports: { maxLamports: 2_000_000, priorityLevel: 'high' } } }),
    signal: AbortSignal.timeout(30_000),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.swapTransaction) throw new Error(`Jupiter swap build failed: ${(data.error || res.status).toString().slice(0, 140)}`);
  const tx = VersionedTransaction.deserialize(Buffer.from(data.swapTransaction, 'base64'));
  tx.sign([keypair]);
  const c = conn();
  const signature = await c.sendRawTransaction(tx.serialize(), { skipPreflight: false, maxRetries: 3 });
  const { blockhash, lastValidBlockHeight } = await c.getLatestBlockhash('confirmed');
  const conf = await c.confirmTransaction({ signature, blockhash, lastValidBlockHeight }, 'confirmed');
  if (conf.value.err) throw new Error(`Swap failed on chain: ${JSON.stringify(conf.value.err)}`);
  return { signature, outAmount: BigInt(quoteResponse.outAmount) };
}

/** Token metadata from Jupiter's list: { symbol, name, decimals, icon } or null. */
export async function tokenInfo(mint) {
  try {
    const d = await getJson(`${BASE}/tokens/v2/search?query=${mint}`);
    const t = (Array.isArray(d) ? d : []).find((x) => x.id === mint);
    return t ? { address: t.id, symbol: t.symbol, name: t.name, decimals: t.decimals, icon: t.icon || null, tags: t.tags || [] } : null;
  } catch {
    return null;
  }
}
