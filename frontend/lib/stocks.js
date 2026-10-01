// Stock Token registry for the site (mirrors backend/src/chain/stocks.js).
import { STOCK_LIST } from './stocks-data';
import { TOKEN_CA, TOKEN_SYMBOL } from './brand';
import { getXStock } from './xstocks';
import { isSolAddress, explorerTx as chainTx, explorerAddress as chainAddress, explorerToken as chainToken } from './chains';

const SECTOR_COLORS = {
  'Big Tech': '#1E88E5', Semis: '#7C4DFF', 'AI & Cloud': '#00ACC1', 'EV & Auto': '#FB8C00',
  'Defense & Space': '#607D8B', 'Crypto Street': '#F2A900', 'Meme & Quantum': '#EC407A',
  Fintech: '#4DB8FF', Energy: '#FDD835', 'Pharma & Health': '#43A047', Consumer: '#F06292',
  'Index & ETF': '#AB47BC', Hardware: '#5C6BC0', Software: '#26A69A', Industrial: '#8D6E63',
};

export const STOCKS = STOCK_LIST.map(([ticker, name, sector, address]) => ({
  ticker, name, sector, address, color: SECTOR_COLORS[sector] || '#00C805',
  // Served by the site (public/logos/stocks, filled by scripts/fetch-logos.mjs): a logo never depends on a third party.
  logo: `/logos/stocks/${ticker}.png`,
}));
export const STOCK_BY_TICKER = Object.fromEntries(STOCKS.map((s) => [s.ticker, s]));
export const STOCK_BY_ADDRESS = Object.fromEntries(STOCKS.map((s) => [s.address.toLowerCase(), s]));
export const SECTORS = [...new Set(STOCKS.map((s) => s.sector))];

// Filled a 0.01 ETH order at 94%+ of the Yahoo price on Uniswap V4 (probe 2026-09-07). Mirrors backend/src/chain/stocks.js.
export const LIQUID_TICKERS = [
  'AAPL', 'MSFT', 'GOOGL', 'AMZN', 'META', 'NFLX', 'ORCL', 'NOW',
  'NVDA', 'AMD', 'INTC', 'MU', 'AVGO', 'QCOM', 'TSM', 'SMCI', 'ASML',
  'PLTR', 'SNOW', 'NET', 'DDOG', 'RDDT', 'TSLA', 'RKLB', 'ASTS', 'SPCX',
  'COIN', 'CRCL', 'GME', 'DJT', 'LLY', 'COST', 'TTWO', 'SPY', 'QQQ', 'GLD',
  'EWY', 'DELL', 'HPE', 'SNDK', 'ZM', 'CRWV', 'NBIS', 'WYFI', 'AAOI',
  'KLAC', 'LITE', 'TER',
];
export const TAPE_TICKERS = ['NVDA', 'TSLA', 'AAPL', 'SPY', 'GLD', 'MSFT', 'AMZN', 'META', 'GOOGL', 'COIN', 'PLTR', 'GME', 'AMD', 'QQQ'];

// `icon` is the name of an export of components/Icons.js (this file is also read by
// API routes, so it carries a key, not a component). A basket is shown by the logos of its tickers.
export const BASKETS = {
  MAG7: { label: 'Magnificent 7', icon: 'Crown', tickers: ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'META', 'NVDA', 'TSLA'] },
  AI: { label: 'AI & Semis', icon: 'Brain', tickers: ['NVDA', 'AMD', 'MU', 'INTC', 'PLTR'] },
  DEGEN: { label: 'Degen Street', icon: 'Dice', tickers: ['GME', 'COIN', 'RDDT', 'TSLA', 'PLTR'] },
  HAVEN: { label: 'Safe Haven', icon: 'Vault', tickers: ['GLD', 'AAPL', 'MSFT'] },
};

export const EVM_ADDR = /^0x[0-9a-fA-F]{40}$/;
export const ZERO = '0x0000000000000000000000000000000000000000';
export const isNative = (a) => !a || a.toLowerCase() === ZERO;
export const SOL_MINT = 'So11111111111111111111111111111111111111112';

export function getStock(tickerOrAddress) {
  const q = String(tickerOrAddress || '').trim();
  if (!q) return null;
  if (/^0x[0-9a-fA-F]{40}$/.test(q)) return STOCK_BY_ADDRESS[q.toLowerCase()] || null;
  return STOCK_BY_TICKER[q.replace(/^\$/, '').toUpperCase()] || null;
}

/**
 * Display info for any reward/source address: stock, ETH, or a generic token.
 * `logos` lists every place the icon can be, best first; `logo` is the first.
 */
export function describeAddress(address, meta = null) {
  if (isNative(address)) return { symbol: 'ETH', name: 'Ether', logo: '/eth.svg', logos: ['/eth.svg'], color: '#627EEA', isStock: false, isNative: true };
  if (address === SOL_MINT) return { symbol: 'SOL', name: 'Solana', logo: '/sol.png', logos: ['/sol.png'], color: '#9945FF', isStock: false, isNative: true };
  const s = getStock(address);
  if (s) return { symbol: s.ticker, name: s.name, logo: s.logo, logos: [s.logo], color: s.color, isStock: true, isNative: false, sector: s.sector };
  // An xStock on Solana: the site's own stock logo first, then the issuer's.
  const xs = isSolAddress(address) ? getXStock(address) : null;
  if (xs && xs.mint === address) {
    const own = getStock(xs.ticker)?.logo || null;
    const logos = [own, xs.logo].filter(Boolean);
    return { symbol: xs.symbol, name: xs.name, logo: logos[0], logos, color: getStock(xs.ticker)?.color || '#00C805', isStock: true, isNative: false, xstock: true };
  }
  const short = address ? `${address.slice(2, 6).toUpperCase()}` : '????';
  const sol = isSolAddress(address);
  const valid = EVM_ADDR.test(String(address || '')) || sol;
  const ours = Boolean(TOKEN_CA) && valid && String(address).toLowerCase() === TOKEN_CA.toLowerCase();
  const logos = [...new Set([
    // The project token carries its own logo, served by the site: no screener needed.
    ours ? `/logos/tokens/${TOKEN_SYMBOL}.png` : null,
    meta?.image || null,
    valid ? (sol ? `https://dd.dexscreener.com/ds-data/tokens/solana/${address}.png?size=lg` : `https://dd.dexscreener.com/ds-data/tokens/robinhood/${String(address).toLowerCase()}.png?size=lg`) : null,
    // Last resort: the site asks the screener and the explorer for the token's icon.
    valid && !sol ? `/api/logo/${String(address).toLowerCase()}` : null,
  ].filter(Boolean))];
  return { symbol: ours ? TOKEN_SYMBOL : meta?.symbol || short, name: meta?.name || (ours ? 'DELTA' : 'Token'), logo: logos[0] || null, logos, color: ours ? '#2FA8FF' : '#00C805', isStock: false, isNative: false };
}

export const EXPLORER = 'https://robinhoodchain.blockscout.com';
// Links read the chain from the shape of the hash or address: Solscan for Solana, Blockscout otherwise.
export const explorerTx = (h) => chainTx(h);
export const explorerAddress = (a) => chainAddress(a);
export const explorerToken = (a) => chainToken(a);
