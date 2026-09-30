// xStocks: the tokenized stocks and ETFs on Solana (Backed Finance). The
// registry is read from Jupiter's verified list, kept in a JSON file next to
// this module and refreshed once a day, so the engine never starts without it.
// A Backed xStock is recognised by its mint (they all start with "Xs") and its
// name ("… xStock"). Ticker without the trailing x: NVDAx -> NVDA.
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const FILE = path.join(path.dirname(fileURLToPath(import.meta.url)), 'xstocks.json');
const LIST_URL = `${process.env.JUPITER_API_KEY ? 'https://api.jup.ag' : 'https://lite-api.jup.ag'}/tokens/v2/tag?query=verified`;
const TTL = 24 * 3600 * 1000;
let cache = null; // { at, list }

const isXStock = (t) => typeof t?.id === 'string' && t.id.startsWith('Xs') && /xStock/i.test(String(t.name || '')) && /x$/.test(String(t.symbol || ''));
const shape = (t) => ({ mint: t.id, symbol: t.symbol, ticker: t.symbol.replace(/x$/, ''), name: String(t.name).replace(/\s*xStock\s*$/i, ''), decimals: t.decimals, icon: t.icon || null });

async function refresh() {
  const res = await fetch(LIST_URL, { headers: { Accept: 'application/json', ...(process.env.JUPITER_API_KEY ? { 'x-api-key': process.env.JUPITER_API_KEY } : {}) }, signal: AbortSignal.timeout(30_000) });
  if (!res.ok) throw new Error(`Jupiter list ${res.status}`);
  const all = await res.json();
  const list = all.filter(isXStock).map(shape).sort((a, b) => a.ticker.localeCompare(b.ticker));
  if (list.length < 20) throw new Error(`Jupiter list looks wrong: ${list.length} xStocks`);
  await fs.writeFile(FILE, JSON.stringify({ at: new Date().toISOString(), list }, null, 1));
  return list;
}

/** Every xStock, from memory, the file, or Jupiter, in that order. */
export async function xStocks() {
  if (cache && Date.now() - cache.at < TTL) return cache.list;
  try {
    const saved = JSON.parse(await fs.readFile(FILE, 'utf8'));
    if (saved?.list?.length && Date.now() - new Date(saved.at).getTime() < TTL) { cache = { at: Date.now(), list: saved.list }; return saved.list; }
  } catch { /* no file yet */ }
  try {
    const list = await refresh();
    cache = { at: Date.now(), list };
    return list;
  } catch (e) {
    try { const saved = JSON.parse(await fs.readFile(FILE, 'utf8')); if (saved?.list?.length) return saved.list; } catch { /* nothing saved */ }
    throw e;
  }
}

/** One xStock by ticker (NVDA), symbol (NVDAx) or mint. */
export async function getXStock(key) {
  const list = await xStocks();
  const k = String(key || '');
  return list.find((s) => s.mint === k || s.symbol.toLowerCase() === k.toLowerCase() || s.ticker.toLowerCase() === k.toLowerCase()) || null;
}
