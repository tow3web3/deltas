'use client';

// The stock universe: what a coin's holders can be paid in, and what its
// treasury can hold. Solana first: xStocks, tokenized stocks and ETFs by Backed
// Finance, bought through Jupiter. Robinhood Chain second: its 195 Robinhood
// Stock Tokens. A switch at the top picks the chain. On the homepage (`compact`)
// it is a short board beside how a payout in a stock happens; on /stocks it is
// the whole directory, by sector, with search and a sector filter.
import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { AnimatePresence, motion } from 'motion/react';
import { Arrow, Rise, Fall, Liquid, Find, External, Copy, Check, Close, Swap } from './Icons';
import MemecoinList from './MemecoinList';
import { EASE } from './ui/Light';
import { BRAND } from '../lib/brand';
import { STOCKS, SECTORS, LIQUID_TICKERS, STOCK_BY_TICKER } from '../lib/stocks';
import { XSTOCKS, XSTOCKS_TOTAL, FEATURED_XSTOCKS } from '../lib/xstocks';
import { CHAINS, explorerTokenFor, shortAddress } from '../lib/chains';

const LIQUID = new Set(LIQUID_TICKERS);
const slug = (s) => `sector-${s.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
const price = (n) => (n >= 1000 ? n.toLocaleString('en-US', { maximumFractionDigits: 0 }) : n.toFixed(2));
const n0 = (n) => n.toLocaleString('en-US');
const TOTAL = n0(XSTOCKS_TOTAL);

// An xStock carries no sector: it borrows the one of the same ticker on Robinhood Chain. These few are not listed there.
const EXTRA_SECTOR = {
  TQQQ: 'Index & ETF', IWM: 'Index & ETF',
  HOOD: 'Fintech', JPM: 'Fintech', V: 'Fintech', MA: 'Fintech',
  WMT: 'Consumer', KO: 'Consumer', MCD: 'Consumer', UBER: 'Consumer',
  MARA: 'Crypto Street', RIOT: 'Crypto Street', SBET: 'Crypto Street', BMNR: 'Crypto Street',
  OPEN: 'Meme & Quantum',
};
const sectorOf = (ticker) => STOCK_BY_TICKER[ticker]?.sector || EXTRA_SECTOR[ticker] || 'Other';

// One shape for both chains. `logos`: where the icon lives, best first (an xStock falls back to the site's own file of its ticker).
const ITEMS = {
  solana: XSTOCKS.map((x) => ({ id: x.symbol, ticker: x.ticker, symbol: x.symbol, name: x.name, sector: sectorOf(x.ticker), address: x.mint, logos: [x.logo, STOCK_BY_TICKER[x.ticker]?.logo].filter(Boolean), liquid: false })),
  robinhood: STOCKS.map((s) => ({ id: s.ticker, ticker: s.ticker, symbol: s.ticker, name: s.name, sector: s.sector, address: s.address, logos: [s.logo], liquid: LIQUID.has(s.ticker) })),
};
const GROUPS = Object.fromEntries(Object.entries(ITEMS).map(([chain, items]) => [
  chain,
  [...SECTORS, 'Other'].map((name) => {
    const stocks = items.filter((s) => s.sector === name);
    return { name, stocks, liquid: stocks.filter((s) => s.liquid).length };
  }).filter((g) => g.stocks.length),
]));

// The homepage sample on Solana: the featured xStocks.
const X_FEATURED = FEATURED_XSTOCKS.map((x) => ITEMS.solana.find((s) => s.id === x.symbol)).filter(Boolean);
const X_TICKERS = X_FEATURED.map((s) => s.ticker);
const NVDAX = ITEMS.solana.find((s) => s.ticker === 'NVDA');

// The homepage sample on Robinhood Chain: the sectors of the featured tickers, three tickers each. Featured first, then the liquid ones.
const RH_FEATURED = ['NVDA', 'TSLA', 'AAPL', 'MSFT', 'GOOGL', 'AMZN', 'META', 'SPY', 'GLD', 'COIN', 'PLTR', 'GME', 'AMD', 'QQQ', 'SPCX', 'ASML', 'NFLX', 'MU', 'INTC', 'RDDT', 'HOOD', 'MSTR', 'AVGO', 'ORCL'];
const BOARD = (() => {
  const featured = RH_FEATURED.map((t) => ITEMS.robinhood.find((s) => s.ticker === t)).filter(Boolean);
  const names = ['Big Tech', 'Semis', ...new Set(featured.map((s) => s.sector))].filter((n, i, a) => a.indexOf(n) === i && SECTORS.includes(n));
  return names.map((name) => GROUPS.robinhood.find((g) => g.name === name)).filter(Boolean).map((group) => {
    const rank = (s) => (RH_FEATURED.includes(s.ticker) ? RH_FEATURED.indexOf(s.ticker) : s.liquid ? 100 : 200);
    return { ...group, picks: [...group.stocks].sort((a, b) => rank(a) - rank(b)).slice(0, 3) };
  });
})();
const BOARD_TICKERS = BOARD.flatMap((g) => g.picks.map((s) => s.ticker));

/** Live quotes for a few tickers, refreshed every minute. */
function useQuotes(tickers) {
  const [quotes, setQuotes] = useState({});
  const key = tickers.join(',');
  useEffect(() => {
    let alive = true;
    const load = () => fetch(`/api/stocks/prices?tickers=${key}`, { cache: 'no-store' }).then((r) => r.json()).then((d) => { if (alive && d.quotes) setQuotes(d.quotes); }).catch(() => {});
    load();
    const t = setInterval(load, 60_000);
    return () => { alive = false; clearInterval(t); };
  }, [key]);
  return quotes;
}

/** A stock logo as a plain lazy image (the directory draws up to 195), trying each source in turn, a monogram last. */
function Logo({ s, size = 'h-7 w-7' }) {
  const [at, setAt] = useState(0);
  const src = s.logos[at];
  return (
    <span className={`stock-logo ${size}`}>
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img key={src} src={src} alt="" loading="lazy" decoding="async" width="56" height="56" onError={() => setAt((i) => i + 1)} className="h-full w-full object-cover" />
      ) : <span className="font-mono text-[8px] font-medium text-coal">{s.ticker.slice(0, 4)}</span>}
    </span>
  );
}

/** Price and move of the day, or the name while there is no quote. */
function QuoteLine({ q, fallback }) {
  if (!q?.price) return <span className="truncate text-mut">{fallback}</span>;
  const up = (q.changePct ?? 0) >= 0;
  return (
    <>
      <span className="figure text-mut">{price(q.price)}</span>
      <span className={`figure hidden items-center gap-0.5 min-[420px]:flex ${up ? 'text-hood-600' : 'text-down'}`}>{up ? <Rise className="h-[7px] w-[7px]" /> : <Fall className="h-[7px] w-[7px]" />}{Math.abs(q.changePct || 0).toFixed(1)}%</span>
    </>
  );
}

function ChainMark({ chain }) {
  // eslint-disable-next-line @next/next/no-img-element
  if (chain === 'solana') return <img src="/sol.png" alt="" className="h-4 w-4 rounded-full" />;
  return <span className="h-2 w-2 rounded-full bg-hood-500 shadow-[0_0_8px_#2FA8FF]" />;
}

/** The chain switch: Solana first, Robinhood Chain second. */
function ChainSwitch({ chain, onChange }) {
  return (
    <div role="group" aria-label="Chain" className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/[0.04] p-1 backdrop-blur-md">
      {['solana', 'robinhood'].map((k) => {
        const on = chain === k;
        return (
          <button key={k} type="button" aria-pressed={on} onClick={() => onChange(k)} className={`relative inline-flex items-center rounded-full px-3.5 py-1.5 text-[13px] font-medium transition-colors ${on ? 'text-ink' : 'text-mut hover:text-ink'}`}>
            {on && <motion.span layoutId="universe-chain" aria-hidden className="absolute inset-0 rounded-full border border-white/10 bg-white/10 shadow-[0_0_24px_rgba(47,168,255,0.18)]" transition={{ duration: 0.4, ease: EASE }} />}
            <span className="relative flex items-center gap-2"><ChainMark chain={k} />{CHAINS[k].label}</span>
          </button>
        );
      })}
    </div>
  );
}

/** Solana, homepage: the featured xStocks with their logos and the price of the share they track. */
function XBoard() {
  const quotes = useQuotes(X_TICKERS);
  return (
    <div className="frame overflow-hidden">
      <div className="flex items-center justify-between gap-4 border-b border-white/10 px-5 py-3">
        <span className="label">xStocks on Solana</span>
        <span className="label hidden sm:inline">price of the share</span>
      </div>
      <div className="grid grid-cols-2 gap-2 p-3 sm:grid-cols-3">
        {X_FEATURED.map((s, i) => (
          <Link key={s.id} href={`/stocks#${s.id}`} title={`${s.name} · ${s.symbol}`} className={`group min-w-0 items-center gap-2.5 rounded-2xl border border-white/10 bg-white/[0.03] px-3 py-2.5 transition-colors hover:border-cyan-500/40 hover:bg-white/[0.06] ${i >= 14 ? 'hidden sm:flex' : 'flex'}`}>
            <Logo s={s} size="h-8 w-8" />
            <span className="min-w-0 flex-1">
              <span className="block font-mono text-xs font-medium text-ink transition-colors group-hover:text-hood-700">{s.symbol}</span>
              <span className="flex items-center gap-1.5 whitespace-nowrap text-[10.5px] leading-tight"><QuoteLine q={quotes[s.ticker]} fallback={s.name} /></span>
            </span>
          </Link>
        ))}
      </div>
      <Link href="/stocks" className="group flex items-center justify-between gap-4 border-t border-white/10 px-5 py-3 transition-colors hover:bg-white/[0.04]">
        <span className="text-xs text-mut"><span className="figure text-ink">{XSTOCKS.length - X_FEATURED.length}</span> more listed, <span className="figure text-ink">{TOTAL}</span> payable</span>
        <span className="label inline-flex shrink-0 items-center gap-1 !text-hood-600">Browse all <Arrow className="h-3 w-3 transition-transform group-hover:translate-x-0.5" /></span>
      </Link>
    </div>
  );
}

/** Solana, homepage: how a holder ends up with a stock, as one line of light. */
function PayoutPath() {
  const steps = [
    // eslint-disable-next-line @next/next/no-img-element
    { icon: <img src="/sol.png" alt="" className="h-5 w-5 rounded-full" />, title: 'The creator fee arrives in SOL', sub: `pump.fun sets it aside on every trade. ${BRAND} collects it each cycle.` },
    { icon: <Swap className="h-4 w-4 text-cyan-500" />, title: 'Jupiter buys the xStock', sub: "Refused if it returns less than 90% of Jupiter's reference price." },
    { icon: NVDAX ? <Logo s={NVDAX} size="h-5 w-5" /> : null, title: 'Holders receive it, by balance', sub: `NVDAx, SPYx, GLDx, or any of the ${TOTAL}.` },
  ];
  return (
    <div className="frame frame-top p-5 sm:p-6">
      <div className="label">A payout in an xStock</div>
      <ol className="relative mt-5 space-y-5">
        <span aria-hidden className="absolute bottom-4 left-[17px] top-4 w-px bg-gradient-to-b from-hood-500 via-cyan-500 to-violet-500 opacity-70 shadow-[0_0_10px_#5FE3FF]" />
        {steps.map((st) => (
          <li key={st.title} className="relative flex items-start gap-3.5">
            <span className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-[rgba(5,7,12,0.9)]">{st.icon}</span>
            <span className="min-w-0 pt-0.5">
              <span className="block text-[14px] font-medium text-ink">{st.title}</span>
              <span className="mt-0.5 block text-[12.5px] leading-snug text-mut">{st.sub}</span>
            </span>
          </li>
        ))}
      </ol>
      <p className="mt-5 border-t border-white/10 pt-4 text-[12.5px] leading-relaxed text-mut">When the guard refuses a swap, that share is paid in SOL instead, and the receipt says so.</p>
      <Link href="/app" className="btn-ghost mt-4 w-full !py-2">Route a coin <Arrow className="h-4 w-4" /></Link>
    </div>
  );
}

/** Robinhood Chain, homepage: a few sectors, three tickers each, with their live price. */
function Board() {
  const quotes = useQuotes(BOARD_TICKERS);
  return (
    <div className="frame overflow-hidden">
      <div className="flex items-center justify-between gap-4 border-b border-white/10 px-5 py-3">
        <span className="label">Sector</span>
        <span className="label flex items-center gap-1.5"><Liquid className="h-3 w-3 text-cyan-500" />liquid today</span>
      </div>
      <div className="divide-y divide-white/[0.07]">
        {BOARD.map((g) => (
          <div key={g.name} className="grid sm:grid-cols-[8.5rem_minmax(0,1fr)]">
            <Link href={`/stocks?chain=robinhood#${slug(g.name)}`} className="group flex items-baseline justify-between gap-2 bg-white/[0.02] px-4 pb-1 pt-2.5 transition-colors hover:bg-white/[0.05] sm:block sm:border-r sm:border-white/[0.07] sm:py-2.5">
              <span className="block text-[13px] font-medium leading-tight text-ink transition-colors group-hover:text-hood-700">{g.name}</span>
              <span className="mt-0.5 block font-mono text-[10px] text-mut"><span className="tabular-nums">{g.stocks.length}</span> tokens</span>
            </Link>
            <div className="grid grid-cols-3 divide-x divide-white/[0.06]">
              {g.picks.map((s) => (
                <Link key={s.id} href={`/stocks?chain=robinhood#${s.id}`} title={`${s.name} · ${s.sector}`} className="group flex min-w-0 items-center gap-2 px-3 py-2.5 transition-colors hover:bg-white/[0.04]">
                  <Logo s={s} size="h-6 w-6" />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-1">
                      <span className="font-mono text-xs font-medium text-ink transition-colors group-hover:text-hood-700">{s.ticker}</span>
                      {s.liquid && <Liquid className="h-2.5 w-2.5 shrink-0 text-cyan-500" aria-label="Liquid today" />}
                    </span>
                    <span className="flex items-center gap-1.5 whitespace-nowrap text-[10.5px] leading-tight"><QuoteLine q={quotes[s.ticker]} fallback={s.name} /></span>
                  </span>
                </Link>
              ))}
            </div>
          </div>
        ))}
      </div>
      <Link href="/stocks?chain=robinhood" className="group flex items-center justify-between gap-4 border-t border-white/10 px-5 py-3 transition-colors hover:bg-white/[0.04]">
        <span className="text-xs text-mut"><span className="figure text-ink">{STOCKS.length - BOARD_TICKERS.length}</span> more across <span className="figure text-ink">{SECTORS.length}</span> sectors, <span className="figure text-ink">{LIQUID_TICKERS.length}</span> of them liquid</span>
        <span className="label inline-flex shrink-0 items-center gap-1 !text-hood-600">Browse all <Arrow className="h-3 w-3 transition-transform group-hover:translate-x-0.5" /></span>
      </Link>
    </div>
  );
}

/** /stocks: every stock of the chosen chain, by sector, with search and a sector filter. */
function Directory({ chain }) {
  const rh = chain === 'robinhood';
  const items = ITEMS[chain];
  const all = GROUPS[chain];
  const [q, setQ] = useState('');
  const [sector, setSector] = useState('All');
  const [liquidOnly, setLiquidOnly] = useState(false);
  const [copied, setCopied] = useState(null);

  const groups = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const hit = (s) => !needle || s.symbol.toLowerCase().includes(needle) || s.name.toLowerCase().includes(needle) || s.sector.toLowerCase().includes(needle) || s.address.toLowerCase() === needle;
    return all
      .filter((g) => sector === 'All' || g.name === sector)
      .map((g) => ({ ...g, shown: g.stocks.filter((s) => (!liquidOnly || s.liquid) && hit(s)) }))
      .filter((g) => g.shown.length);
  }, [all, q, sector, liquidOnly]);
  const count = groups.reduce((a, g) => a + g.shown.length, 0);

  const copy = async (s) => {
    try { await navigator.clipboard.writeText(s.address); setCopied(s.id); setTimeout(() => setCopied(null), 1200); } catch { /* ignore */ }
  };

  return (
    <>
      {/* Controls. The strip on top is the universe by sector, the chosen one lit. */}
      <div className="frame overflow-hidden">
        <div className="flex h-1 gap-px" aria-hidden>
          {all.map((g) => <span key={g.name} className={`h-full transition-colors ${sector === g.name ? 'beam' : sector === 'All' ? 'bg-white/25' : 'bg-white/[0.06]'}`} style={{ width: `${(g.stocks.length / items.length) * 100}%` }} />)}
        </div>
        <div className="flex flex-col gap-3 border-b border-white/10 p-3 sm:flex-row sm:items-center">
          <label className="flex flex-1 items-center gap-2.5 rounded-xl border border-white/10 bg-black/30 px-3.5 py-2 transition-colors focus-within:border-cyan-500/60">
            <Find className="h-4 w-4 shrink-0 text-mut" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={rh ? 'Search a ticker, a company or a sector' : 'Search NVDAx, a company, a sector or a mint'} aria-label="Search stocks" spellCheck={false} className="w-full bg-transparent text-sm text-ink outline-none placeholder:text-mut/70" />
            {q && <button type="button" onClick={() => setQ('')} aria-label="Clear the search" className="text-mut transition-colors hover:text-ink"><Close className="h-3.5 w-3.5" /></button>}
          </label>
          <div className="flex items-center gap-3">
            <select value={sector} onChange={(e) => setSector(e.target.value)} aria-label="Sector" className="min-w-0 flex-1 rounded-xl border border-white/10 bg-paper px-3 py-2 text-sm text-ink outline-none focus:border-cyan-500/60 lg:hidden">
              <option>All</option>
              {all.map((g) => <option key={g.name}>{g.name}</option>)}
            </select>
            {rh && (
              <button type="button" onClick={() => setLiquidOnly((v) => !v)} aria-pressed={liquidOnly} className={`inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-xl border px-3 py-2 text-sm transition-colors ${liquidOnly ? 'border-cyan-500/50 bg-cyan-500/10 text-ink' : 'border-white/10 bg-black/30 text-mut hover:text-ink'}`}>
                <Liquid className={`h-3.5 w-3.5 ${liquidOnly ? 'text-cyan-500' : ''}`} />Liquid only
              </button>
            )}
            <span className="label shrink-0 whitespace-nowrap"><span className="tabular-nums text-ink/85">{count}</span><span className="hidden min-[440px]:inline"> of {items.length}</span><span className="min-[440px]:hidden"> shown</span></span>
          </div>
        </div>
        <div className="hidden flex-wrap gap-1 p-2 lg:flex">
          {[{ name: 'All', stocks: items }, ...all].map((g) => (
            <button key={g.name} type="button" onClick={() => setSector(g.name)} aria-pressed={sector === g.name} className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs transition-colors ${sector === g.name ? 'bg-white/10 text-ink' : 'text-mut hover:text-ink'}`}>
              {g.name}<span className={`font-mono text-[10px] tabular-nums ${sector === g.name ? 'text-cyan-500' : 'text-mut/70'}`}>{g.stocks.length}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="mt-10 space-y-10">
        {groups.map((g) => (
          <section key={g.name} id={slug(g.name)} className="grid scroll-mt-24 gap-x-8 gap-y-4 lg:grid-cols-[11rem_minmax(0,1fr)]">
            <header className="flex items-end justify-between gap-4 lg:sticky lg:top-24 lg:block lg:self-start">
              <div>
                <h3 className="font-display text-lg font-medium leading-tight tracking-tight text-ink">{g.name}</h3>
                <div className="label mt-1.5"><span className="tabular-nums text-ink/85">{g.stocks.length}</span> {rh ? 'tokens' : 'xStocks'}</div>
              </div>
              {rh && (
                <div className="lg:mt-4">
                  <div className="h-1 w-28 overflow-hidden rounded-full bg-white/[0.08] lg:w-full" aria-hidden>
                    <span className="beam block h-full rounded-full" style={{ width: `${(g.liquid / g.stocks.length) * 100}%` }} />
                  </div>
                  <div className="mt-1.5 flex items-center gap-1 text-[11px] text-mut"><Liquid className="h-3 w-3 text-cyan-500" /><span className="figure text-ink">{g.liquid}</span> liquid today</div>
                </div>
              )}
            </header>

            <div className="panel overflow-hidden">
              <div className="-mb-px -mr-px grid sm:grid-cols-2 xl:grid-cols-3">
                {g.shown.map((s) => (
                  <div key={s.id} id={s.id} className="group flex min-w-0 scroll-mt-28 items-center gap-2.5 border-b border-r border-white/[0.07] px-3 py-2.5 transition-colors target:bg-cyan-500/10 hover:bg-white/[0.04]">
                    <Logo s={s} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono text-xs font-medium text-ink">{s.symbol}</span>
                        {s.liquid && <span className="flex items-center gap-0.5 font-mono text-[9px] uppercase tracking-[0.12em] text-cyan-500"><Liquid className="h-2.5 w-2.5" />liquid</span>}
                      </div>
                      <div className="truncate text-[11.5px] leading-tight text-mut">{s.name}</div>
                    </div>
                    <button type="button" onClick={() => copy(s)} title={`Copy the ${rh ? 'address' : 'mint'} of ${s.symbol}`} className="flex shrink-0 items-center gap-1 font-mono text-[10px] tabular-nums text-mut/80 transition-colors hover:text-hood-600">
                      {copied === s.id ? <><Check className="h-3 w-3 text-cyan-500" />copied</> : <>{rh ? s.address.slice(0, 6) : shortAddress(s.address)}<Copy className="h-3 w-3 opacity-0 transition-opacity group-hover:opacity-100" /></>}
                    </button>
                    <a href={explorerTokenFor(chain, s.address)} target="_blank" rel="noopener noreferrer" aria-label={`${s.symbol} on ${rh ? 'Blockscout' : 'Solscan'}`} className="shrink-0 text-mut/70 transition-colors hover:text-hood-600"><External className="h-3.5 w-3.5" /></a>
                  </div>
                ))}
              </div>
            </div>
          </section>
        ))}
        {groups.length === 0 && (
          <div className="py-12 text-sm text-mut"><span className="font-display text-lg font-medium tracking-tight text-ink">No ticker matches.</span> Try a company name, or clear the filters.</div>
        )}
        {!rh && (
          <div className="frame flex flex-col gap-5 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
            <div>
              <div className="label">Not on this list</div>
              <p className="mt-2 max-w-xl text-sm leading-relaxed text-mut">
                Any of the <span className="figure text-ink">{TOTAL}</span> xStocks Jupiter verifies can be paid, by its mint. A swap that returns less than 90% of Jupiter&apos;s reference price is refused: that share is paid in SOL, and the receipt says so.
              </p>
            </div>
            <Link href="/app" className="btn-primary shrink-0 self-start sm:self-auto">Route a coin <Arrow className="h-4 w-4" /></Link>
          </div>
        )}
      </div>
    </>
  );
}

export default function StockUniverse({ compact = false }) {
  const [chain, setChain] = useState('solana');
  const jump = useRef(null);
  const sol = chain === 'solana';

  // /stocks?chain=robinhood opens on Robinhood Chain; so does an anchor to a ticker only listed there.
  useEffect(() => {
    if (compact) return;
    try {
      const want = new URLSearchParams(window.location.search).get('chain');
      const hash = decodeURIComponent(window.location.hash.slice(1));
      const rhOnly = hash && !document.getElementById(hash) && STOCK_BY_TICKER[hash];
      if (want === 'robinhood' || rhOnly) { jump.current = hash ? { id: hash, chain: 'robinhood' } : null; setChain('robinhood'); }
    } catch { /* ignore */ }
  }, [compact]);
  // Once that chain's directory is drawn, the anchor it was opened for is scrolled to.
  useEffect(() => {
    const j = jump.current;
    if (!j || j.chain !== chain) return;
    jump.current = null;
    requestAnimationFrame(() => document.getElementById(j.id)?.scrollIntoView({ block: 'start' }));
  }, [chain]);

  const pick = (k) => {
    setChain(k);
    if (compact) return;
    try { window.history.replaceState(null, '', k === 'solana' ? window.location.pathname : `${window.location.pathname}?chain=${k}`); } catch { /* ignore */ }
  };

  const stats = sol
    ? [[TOTAL, 'payable'], [XSTOCKS.length, 'listed here'], [GROUPS.solana.length, 'sectors']]
    : [[STOCKS.length, 'tokens'], [LIQUID_TICKERS.length, 'liquid'], [SECTORS.length, 'sectors']];

  return (
    <div id="stocks" className="scroll-mt-20">
      <div className={`grid items-end gap-6 lg:grid-cols-[minmax(0,1fr)_auto] ${compact ? 'mb-8' : 'mb-10'}`}>
        <div>
          <div className="eyebrow mb-4">The stock universe</div>
          {compact ? (
            <h2 className="font-display text-[34px] font-medium leading-[1.05] tracking-[-0.03em] text-ink sm:text-[42px]">Pay holders in <span className="text-beam">real stocks.</span></h2>
          ) : (
            <h1 className="font-display text-[36px] font-medium leading-[1.03] tracking-[-0.03em] text-ink sm:text-[48px]">
              {sol ? TOTAL : STOCKS.length} stocks and ETFs,<br className="hidden sm:block" /> <span className="text-beam">payable on {CHAINS[chain].label}.</span>
            </h1>
          )}
          <p className="mt-4 max-w-xl text-[15px] leading-relaxed text-mut">
            {sol ? (
              <>On Solana, holders can be paid in xStocks: tokenized stocks and ETFs by Backed Finance, bought through Jupiter every cycle. Any of the {TOTAL} xStocks Jupiter verifies can be paid{compact ? '.' : <>; the {XSTOCKS.length} below are the familiar ones.</>}</>
            ) : compact ? (
              <>On Robinhood Chain, holders can be paid in any of the {STOCKS.length} Robinhood Stock Tokens, and the memecoins on the right can route their fees today.</>
            ) : (
              <>Every official Robinhood Stock Token on Robinhood Chain. <span className="inline-flex items-center gap-1 font-medium text-ink"><Liquid className="h-3 w-3 text-cyan-500" />Liquid</span> tickers fill at fair value today; the rest are guarded and pay ETH until their pools deepen.</>
            )}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-4 lg:flex-col lg:items-end">
          <ChainSwitch chain={chain} onChange={pick} />
          {compact ? (
            <Link href={sol ? '/stocks' : '/stocks?chain=robinhood'} className="btn-ghost !py-2">See all {sol ? XSTOCKS.length : STOCKS.length} <Arrow className="h-4 w-4" /></Link>
          ) : (
            <dl className="flex divide-x divide-white/10">
              {stats.map(([v, l], i) => (
                <div key={l} className={i ? 'px-5 last:pr-0' : 'pr-5'}>
                  <dd className="figure text-3xl font-medium leading-none tracking-tight text-ink">{v}</dd>
                  <dt className="label mt-1.5">{l}</dt>
                </div>
              ))}
            </dl>
          )}
        </div>
      </div>

      <AnimatePresence mode="wait" initial={false}>
        <motion.div key={chain} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, transition: { duration: 0.15 } }} transition={{ duration: 0.5, ease: EASE }}>
          {compact ? (
            sol ? (
              <div className="grid items-start gap-4 lg:grid-cols-[1.25fr_0.75fr]">
                <XBoard />
                <PayoutPath />
              </div>
            ) : (
              <div className="grid items-start gap-4 lg:grid-cols-[1.2fr_0.8fr]">
                <div>
                  <Board />
                  <p className="mt-3 flex items-start gap-1.5 text-xs leading-relaxed text-mut"><Liquid className="mt-0.5 h-3 w-3 shrink-0 text-cyan-500" /><span>Liquid today: fills at fair value on Uniswap. The rest are guarded and pay ETH until their pools deepen.</span></p>
                </div>
                <MemecoinList />
              </div>
            )
          ) : <Directory key={chain} chain={chain} />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
