// Coins kept off the public lists: retired test coins whose history should not
// stand for DELTA (the stats, the live feed, the ticker, the screener, the
// sitemap). Set HIDDEN_TOKENS on the server, comma-separated. Nothing is
// deleted: their coin pages, receipts and wallet statements stay reachable.
import { normAddress } from './chains';

export const HIDDEN_TOKENS = String(process.env.HIDDEN_TOKENS || '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean)
  .map((s) => normAddress(s));
