'use client';

// The stock universe. On the homepage (`compact`) it is a short board: eight
// sectors, three tickers each with their live price, beside the memecoins of
// the chain. On /stocks it is the whole directory: every sector is a rail on the
// left with its tokens listed to the right, with search and a sector filter.
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Arrow, Rise, Fall, Liquid, Find, External, Copy, Check, Close } from './Icons';
import MemecoinList from './MemecoinList';
import { STOCKS, SECTORS, LIQUID_TICKERS, explorerToken } from '../lib/stocks';

const FEATURED = ['NVDA', 'TSLA', 'AAPL', 'MSFT', 'GOOGL', 'AMZN', 'META', 'SPY', 'GLD', 'COIN', 'PLTR', 'GME', 'AMD', 'QQQ', 'SPCX', 'ASML', 'NFLX', 'MU', 'INTC', 'RDDT', 'HOOD', 'MSTR', 'AVGO', 'ORCL'];
const LIQUID = new Set(LIQUID_TICKERS);
const slug = (s) => `sector-${s.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
const price = (n) => (n >= 1000 ? n.toLocaleString('en-US', { maximumFractionDigits: 0 }) : n.toFixed(2));

const BY_SECTOR = SECTORS.map((name) => {
  const stocks = STOCKS.filter((s) => s.sector === name);
  return { name, stocks, liquid: stocks.filter((s) => LIQUID.has(s.ticker)).length };
});

// The homepage sample: the sectors of the featured tickers, three tickers each. Featured first, then the liquid ones.
const BOARD = (() => {
  const featured = FEATURED.map((t) => STOCKS.find((s) => s.ticker === t)).filter(Boolean);
  const names = ['Big Tech', 'Semis', ...new Set(featured.map((s) => s.sector))].filter((n, i, a) => a.indexOf(n) === i && SECTORS.includes(n));
  return names.map((name) => {
    const group = BY_SECTOR.find((g) => g.name === name);
    const rank = (s) => (FEATURED.includes(s.ticker) ? FEATURED.indexOf(s.ticker) : LIQUID.has(s.ticker) ? 100 : 200);
    const picks = [...group.stocks].sort((a, b) => rank(a) - rank(b)).slice(0, 3);
    return { ...group, picks };
  });
})();
const BOARD_TICKERS = BOARD.flatMap((g) => g.picks.map((s) => s.ticker));

/** A stock logo as a plain lazy image: the directory draws 195 of them. */
function Logo({ s, size = 'h-7 w-7' }) {
  return (
    <span className={`stock-logo ${size}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={s.logo} alt="" loading="lazy" decoding="async" width="56" height="56" className="h-full w-full object-cover" />
    </span>
  );
}

function Board() {
  const [quotes, setQuotes] = useState({});
  useEffect(() => {
    let alive = true;
    const load = () => fetch(`/api/stocks/prices?tickers=${BOARD_TICKERS.join(',')}`, { cache: 'no-store' }).then((r) => r.json()).then((d) => { if (alive && d.quotes) setQuotes(d.quotes); }).catch(() => {});
    load();
    const t = setInterval(load, 60_000);
    return () => { alive = false; clearInterval(t); };
  }, []);

  return (
    <div className="frame overflow-hidden">
      <div className="flex items-center justify-between gap-4 border-b border-line px-4 py-3">
        <span className="label">Sector</span>
        <span className="label flex items-center gap-1.5"><Liquid className="h-3 w-3 text-hood-500" />liquid today</span>
      </div>
      <div className="divide-y divide-line">
        {BOARD.map((g) => (
          <div key={g.name} className="grid sm:grid-cols-[8.5rem_minmax(0,1fr)]">
            <Link href={`/stocks#${slug(g.name)}`} className="group flex items-baseline justify-between gap-2 bg-tile/30 px-4 pb-1 pt-2.5 transition-colors hover:bg-tile/60 sm:block sm:border-r sm:border-line sm:py-2.5">
              <span className="block text-[13px] font-medium leading-tight text-ink transition-colors group-hover:text-hood-700">{g.name}</span>
              <span className="mt-0.5 block font-mono text-[10px] text-mut"><span className="tabular-nums">{g.stocks.length}</span> tokens</span>
            </Link>
            <div className="grid grid-cols-3 divide-x divide-line/70">
              {g.picks.map((s) => {
                const q = quotes[s.ticker];
                const up = (q?.changePct ?? 0) >= 0;
                return (
                  <Link key={s.ticker} href={`/stocks#${s.ticker}`} title={`${s.name} · ${s.sector}`} className="group flex min-w-0 items-center gap-2 px-3 py-2.5 transition-colors hover:bg-tile/50">
                    <Logo s={s} size="h-6 w-6" />
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-1">
                        <span className="font-mono text-xs font-medium text-ink transition-colors group-hover:text-hood-700">{s.ticker}</span>
                        {LIQUID.has(s.ticker) && <Liquid className="h-2.5 w-2.5 shrink-0 text-hood-500" aria-label="Liquid today" />}
                      </span>
                      <span className="flex items-center gap-1.5 whitespace-nowrap text-[10.5px] leading-tight">
                        {q?.price ? (
                          <>
                            <span className="figure text-mut">{price(q.price)}</span>
                            <span className={`figure hidden items-center gap-0.5 min-[420px]:flex ${up ? 'text-hood-600' : 'text-down'}`}>{up ? <Rise className="h-[7px] w-[7px]" /> : <Fall className="h-[7px] w-[7px]" />}{Math.abs(q.changePct || 0).toFixed(1)}%</span>
                          </>
                        ) : <span className="truncate text-mut">{s.name}</span>}
                      </span>
                    </span>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </div>
      <Link href="/stocks" className="group flex items-center justify-between gap-4 border-t border-line px-4 py-3 transition-colors hover:bg-tile/50">
        <span className="text-xs text-mut"><span className="figure text-ink">{STOCKS.length - BOARD_TICKERS.length}</span> more across <span className="figure text-ink">{SECTORS.length}</span> sectors, <span className="figure text-ink">{LIQUID_TICKERS.length}</span> of them liquid</span>
        <span className="label inline-flex shrink-0 items-center gap-1 !text-hood-600">Browse all <Arrow className="h-3 w-3 transition-transform group-hover:translate-x-0.5" /></span>
      </Link>
    </div>
  );
}

function Directory() {
  const [q, setQ] = useState('');
  const [sector, setSector] = useState('All');
  const [liquidOnly, setLiquidOnly] = useState(false);
  const [copied, setCopied] = useState(null);

  const groups = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return BY_SECTOR
      .filter((g) => sector === 'All' || g.name === sector)
      .map((g) => ({ ...g, shown: g.stocks.filter((s) => (!liquidOnly || LIQUID.has(s.ticker)) && (!needle || s.ticker.toLowerCase().includes(needle) || s.name.toLowerCase().includes(needle) || s.sector.toLowerCase().includes(needle))) }))
      .filter((g) => g.shown.length);
  }, [q, sector, liquidOnly]);
  const count = groups.reduce((a, g) => a + g.shown.length, 0);

  const copy = async (s) => {
    try { await navigator.clipboard.writeText(s.address); setCopied(s.ticker); setTimeout(() => setCopied(null), 1200); } catch { /* ignore */ }
  };

  return (
    <>
      {/* Controls: the strip on top is the universe by sector, the chosen one lit. */}
      <div className="frame overflow-hidden">
        <div className="flex h-1 gap-px bg-paper" aria-hidden>
          {BY_SECTOR.map((g) => <span key={g.name} className={`h-full transition-colors ${sector === g.name ? 'bg-hood-500' : sector === 'All' ? 'bg-ink/25' : 'bg-line'}`} style={{ width: `${(g.stocks.length / STOCKS.length) * 100}%` }} />)}
        </div>
        <div className="flex flex-col gap-3 border-b border-line p-3 sm:flex-row sm:items-center">
          <label className="flex flex-1 items-center gap-2.5 rounded-xl border border-line bg-ground px-3.5 py-2 transition-colors focus-within:border-hood-400">
            <Find className="h-4 w-4 shrink-0 text-mut" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search a ticker, a company or a sector" aria-label="Search stocks" className="w-full bg-transparent text-sm text-ink outline-none placeholder:text-mut/70" />
            {q && <button type="button" onClick={() => setQ('')} aria-label="Clear the search" className="text-mut transition-colors hover:text-ink"><Close className="h-3.5 w-3.5" /></button>}
          </label>
          <div className="flex items-center gap-3">
            <select value={sector} onChange={(e) => setSector(e.target.value)} aria-label="Sector" className="min-w-0 flex-1 rounded-xl border border-line bg-ground px-3 py-2 text-sm text-ink outline-none focus:border-hood-400 lg:hidden">
              <option>All</option>
              {SECTORS.map((s) => <option key={s}>{s}</option>)}
            </select>
            <button type="button" onClick={() => setLiquidOnly((v) => !v)} aria-pressed={liquidOnly} className={`inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-xl border px-3 py-2 text-sm transition-colors ${liquidOnly ? 'border-hood-300 bg-hood-50 text-hood-700' : 'border-line bg-ground text-mut hover:text-ink'}`}>
              <Liquid className={`h-3.5 w-3.5 ${liquidOnly ? 'text-hood-500' : ''}`} />Liquid only
            </button>
            <span className="label shrink-0 whitespace-nowrap"><span className="tabular-nums text-ink/85">{count}</span><span className="hidden min-[440px]:inline"> of {STOCKS.length}</span><span className="min-[440px]:hidden"> shown</span></span>
          </div>
        </div>
        <div className="hidden flex-wrap gap-x-1 gap-y-1 p-2 lg:flex">
          {[{ name: 'All', stocks: STOCKS }, ...BY_SECTOR].map((g) => (
            <button key={g.name} type="button" onClick={() => setSector(g.name)} aria-pressed={sector === g.name} className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs transition-colors ${sector === g.name ? 'bg-tile text-ink' : 'text-mut hover:text-ink'}`}>
              {g.name}<span className={`font-mono text-[10px] tabular-nums ${sector === g.name ? 'text-hood-600' : 'text-mut/70'}`}>{g.stocks.length}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="mt-8 divide-y divide-line border-y border-line">
        {groups.map((g) => (
          <section key={g.name} id={slug(g.name)} className="grid scroll-mt-24 gap-x-8 gap-y-4 py-7 lg:grid-cols-[11rem_minmax(0,1fr)]">
            <header className="flex items-end justify-between gap-4 lg:sticky lg:top-24 lg:block lg:self-start">
              <div>
                <h3 className="font-display text-lg font-medium leading-tight tracking-tight text-ink">{g.name}</h3>
                <div className="label mt-1.5"><span className="tabular-nums text-ink/85">{g.stocks.length}</span> tokens</div>
              </div>
              <div className="lg:mt-4">
                <div className="flex h-1 w-28 gap-px overflow-hidden rounded-[1px] bg-line lg:w-full" aria-hidden>
                  <span className="h-full bg-hood-500" style={{ width: `${(g.liquid / g.stocks.length) * 100}%` }} />
                </div>
                <div className="mt-1.5 flex items-center gap-1 text-[11px] text-mut"><Liquid className="h-3 w-3 text-hood-500" /><span className="figure text-ink">{g.liquid}</span> liquid today</div>
              </div>
            </header>

            <div className="overflow-hidden rounded-2xl border border-line bg-paper">
              <div className="-mb-px -mr-px grid sm:grid-cols-2 xl:grid-cols-3">
                {g.shown.map((s) => {
                  const liquid = LIQUID.has(s.ticker);
                  return (
                    <div key={s.ticker} id={s.ticker} className="group flex min-w-0 scroll-mt-28 items-center gap-2.5 border-b border-r border-line px-3 py-2.5 transition-colors target:bg-hood-50 hover:bg-tile/50">
                      <Logo s={s} />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono text-xs font-medium text-ink">{s.ticker}</span>
                          {liquid && <span className="flex items-center gap-0.5 font-mono text-[9px] uppercase tracking-[0.12em] text-hood-600"><Liquid className="h-2.5 w-2.5 text-hood-500" />liquid</span>}
                        </div>
                        <div className="truncate text-[11.5px] leading-tight text-mut">{s.name}</div>
                      </div>
                      <button type="button" onClick={() => copy(s)} title={`Copy the address of ${s.ticker}`} className="flex shrink-0 items-center gap-1 font-mono text-[10px] tabular-nums text-mut/80 transition-colors hover:text-hood-600">
                        {copied === s.ticker ? <><Check className="h-3 w-3 text-hood-500" />copied</> : <>{s.address.slice(0, 6)}<Copy className="h-3 w-3 opacity-0 transition-opacity group-hover:opacity-100" /></>}
                      </button>
                      <a href={explorerToken(s.address)} target="_blank" rel="noopener noreferrer" aria-label={`${s.ticker} on the explorer`} className="shrink-0 text-mut/70 transition-colors hover:text-hood-600"><External className="h-3.5 w-3.5" /></a>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>
        ))}
        {groups.length === 0 && (
          <div className="py-12 text-sm text-mut"><span className="font-display text-lg font-medium tracking-tight text-ink">No ticker matches.</span> Try a company name, or clear the filters.</div>
        )}
      </div>
    </>
  );
}

export default function StockUniverse({ compact = false }) {
  return (
    <div id="stocks" className="scroll-mt-20">
      <div className={`flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between ${compact ? 'mb-6' : 'mb-7'}`}>
        <div>
          <div className="eyebrow mb-2">The universe</div>
          {compact
            ? <h2 className="font-display text-2xl font-semibold tracking-tight text-ink sm:text-3xl">Stocks to pay with, memecoins to plug in</h2>
            : <h1 className="font-display text-3xl font-semibold tracking-tight text-ink sm:text-4xl">{STOCKS.length} stocks and ETFs, all payable</h1>}
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-mut">
            {compact ? <>Dividends can be paid in any of the {STOCKS.length} official Robinhood Stock Tokens, or in any memecoin on the chain. Any coin on the right can link its routing today.</> : <>Every official Robinhood Stock Token on Robinhood Chain. <span className="inline-flex items-center gap-1 font-medium text-ink"><Liquid className="h-3 w-3 text-hood-500" />Liquid</span> tickers fill at fair value today; the rest are guarded and pay ETH until their pools deepen.</>}
          </p>
        </div>
        {compact ? (
          <Link href="/stocks" className="btn-ghost shrink-0 self-start sm:self-auto">See all {STOCKS.length} <Arrow className="h-4 w-4" /></Link>
        ) : (
          <dl className="flex shrink-0 divide-x divide-line">
            {[[STOCKS.length, 'tokens'], [LIQUID_TICKERS.length, 'liquid'], [SECTORS.length, 'sectors']].map(([v, l], i) => (
              <div key={l} className={i ? 'px-5 last:pr-0' : 'pr-5'}>
                <dd className="figure text-3xl font-medium leading-none tracking-tight text-ink">{v}</dd>
                <dt className="label mt-1.5">{l}</dt>
              </div>
            ))}
          </dl>
        )}
      </div>

      {compact ? (
        <div className="grid items-start gap-3 lg:grid-cols-[1.2fr_0.8fr]">
          <div>
            <Board />
            <p className="mt-3 flex items-start gap-1.5 text-xs leading-relaxed text-mut"><Liquid className="mt-0.5 h-3 w-3 shrink-0 text-hood-500" /><span>Liquid today: fills at fair value on Uniswap. The rest are guarded and pay ETH until their pools deepen.</span></p>
          </div>
          <MemecoinList />
        </div>
      ) : <Directory />}
    </div>
  );
}
