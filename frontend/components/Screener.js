'use client';

// The screener: every coin routing its fees, Solana first, in one glass table,
// comparable like stocks. Each row carries its routing as a segmented bar, so
// the policy of a coin reads at a glance next to its yield. Amounts are in the
// coin's own chain currency (SOL on Solana, ETH on Robinhood Chain).
import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { motion, useInView } from 'motion/react';
import StockLogo from './StockLogo';
import Countdown from './Countdown';
import { Arrow, Rise, Fall, Dice, TrendUp, Pie, Vote, Medal, InKind } from './Icons';
import { describeAddress } from '../lib/stocks';
import { getXStock } from '../lib/xstocks';
import { CHAINS, chainOf, isSolAddress } from '../lib/chains';

const EASE = [0.16, 1, 0.3, 1];
const SOL_MINT = 'So11111111111111111111111111111111111111112';
const compact = (n) => new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 }).format(n || 0);
const pct = (n, d = 1) => (n == null ? null : n >= 100 ? `${Math.round(n)}%` : `${n.toFixed(d)}%`);
const amount = (n) => n.toLocaleString('en-US', { maximumFractionDigits: n >= 100 ? 0 : n >= 10 ? 2 : 3 });
const MODE = { roulette: ['Roulette', Dice], gainer: ['Top gainer', TrendUp], portfolio: ['Portfolio', Pie], vote: ['Vote', Vote] };

/** The chain of a row: the API's when it says, else read from the shape of the address. */
const chainFor = (t) => (CHAINS[t.chain] ? t.chain : chainOf(t.address) || 'solana');
// The API gives the 30-day amount in the coin's own chain currency (SOL or ETH).
const native30d = (t) => Number(t.eth30d) || 0;

// Where a cycle goes. The colour is the meaning: blue is paid out, white stays with the creator, orange is burned, cyan is kept.
export const ROUTES = [
  { key: 'holders', label: 'Holders', bar: 'bg-hood-500' },
  { key: 'creator', label: 'Creator', bar: 'bg-ink/70' },
  { key: 'burn', label: 'Burn', bar: 'bg-[#FF7A1A]' },
  { key: 'treasury', label: 'Treasury', bar: 'bg-cyan-500' },
];

/** The routing of one coin: one segment per destination, as wide as its share. */
export function RoutingBar({ policy, caption = true, className = '' }) {
  const parts = ROUTES.map((r) => ({ ...r, bps: Number(policy?.[r.key] || 0) })).filter((r) => r.bps > 0);
  const total = parts.reduce((a, p) => a + p.bps, 0) || 1;
  return (
    <div className={className}>
      <div className="flex h-1.5 w-full gap-[2px] overflow-hidden rounded-full bg-white/[0.06] shadow-[0_0_14px_rgba(47,168,255,0.12)]" role="img" aria-label={parts.map((p) => `${p.label} ${p.bps / 100}%`).join(', ')}>
        {parts.map((p) => <span key={p.key} className={`h-full first:rounded-l-full last:rounded-r-full ${p.bar}`} style={{ width: `${(p.bps / total) * 100}%` }} />)}
      </div>
      {caption && (
        <div className="mt-1.5 flex flex-wrap gap-x-2.5 font-mono text-[10px] leading-none text-mut">
          {parts.map((p) => <span key={p.key} className="whitespace-nowrap"><span className="tabular-nums text-ink/85">{Math.round(p.bps / 100)}</span> {p.label.toLowerCase()}</span>)}
        </div>
      )}
    </div>
  );
}

/** A column heading that sorts. */
export function SortHead({ col, sort, onSort, align = 'left' }) {
  const on = sort.key === col.key;
  return (
    <button
      type="button" onClick={() => onSort(col.key)} title={col.title}
      aria-sort={on ? (sort.dir < 0 ? 'descending' : 'ascending') : 'none'}
      className={`label group inline-flex items-center gap-1 transition-colors hover:text-ink ${align === 'right' ? 'justify-end text-right' : ''} ${on ? '!text-cyan-500' : ''}`}
    >
      {col.label}
      <span className={`flex flex-col ${on ? '' : 'opacity-40 group-hover:opacity-80'}`}>
        <Rise className={`-mb-[3px] h-[7px] w-[7px] ${on && sort.dir > 0 ? '' : on ? 'opacity-30' : ''}`} />
        <Fall className={`h-[7px] w-[7px] ${on && sort.dir < 0 ? '' : on ? 'opacity-30' : ''}`} />
      </span>
    </button>
  );
}

const COLUMNS = [
  { key: 'yieldApy', label: 'Yield', title: 'Fees returned over 30 days, annualized, over market cap' },
  { key: 'backed', label: 'Backed', title: 'Treasury value as a share of market cap' },
  { key: 'marketCap', label: 'Mcap', title: 'Market cap' },
  { key: 'distributions', label: 'Cycles', title: 'Cycles paid so far' },
];
const ROUTING_COL = { key: 'payoutRatio', label: 'Routing', title: 'Where each cycle goes. Sorts by the share paid to holders' };
const GRID = 'lg:grid-cols-[1.5rem_minmax(0,2fr)_minmax(0,1.5fr)_minmax(0,1.1fr)_minmax(0,1fr)_repeat(3,minmax(0,0.7fr))_4.5rem]';

/** The chain of a coin, as a small mark on the corner of its logo. */
function ChainBadge({ chain, className = '' }) {
  return (
    <span title={CHAINS[chain].label} className={`flex h-3.5 w-3.5 items-center justify-center overflow-hidden rounded-full border border-ground bg-ground ${className}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      {chain === 'solana' ? <img src="/sol.png" alt="" className="h-full w-full" /> : <span className="h-2 w-2 rounded-full bg-hood-500" />}
      <span className="sr-only">{CHAINS[chain].label}</span>
    </span>
  );
}

/** What a coin pays its holders in: SOL, an xStock, a stock or a token, with its logo. */
function rewardOf(t, chain) {
  const a = t.rewardToken;
  if (chain === 'solana' && (!a || a === SOL_MINT || a === 'SOL' || /^0x/.test(a))) return { address: SOL_MINT, symbol: 'SOL', meta: { symbol: 'SOL', image: '/sol.png' } };
  const x = isSolAddress(a) ? getXStock(a) : null;
  if (x) return { address: x.mint, symbol: x.symbol, meta: { symbol: x.symbol, image: x.logo } };
  return { address: a, symbol: describeAddress(a, { symbol: t.rewardSymbol }).symbol, meta: { symbol: t.rewardSymbol } };
}

function PaysIn({ t, chain }) {
  if (t.payoutMode === 'in_kind') return <span className="flex items-center gap-1.5 text-xs text-ink"><InKind className="h-4 w-4 text-cyan-500" />In kind</span>;
  const mode = MODE[t.rewardMode];
  if (mode) {
    const Icon = mode[1];
    return <span className="flex items-center gap-1.5 text-xs text-ink"><Icon className="h-4 w-4 text-cyan-500" />{mode[0]}</span>;
  }
  const reward = rewardOf(t, chain);
  return (
    <span className="flex min-w-0 items-center gap-1.5">
      <StockLogo address={reward.address} meta={reward.meta} size="h-5 w-5" text="text-[6px]" />
      <span className="truncate font-mono text-xs font-medium text-ink">{reward.symbol}</span>
    </span>
  );
}

const Dash = () => <span className="text-mut/60">–</span>;

export default function Screener() {
  const ref = useRef(null);
  const seen = useInView(ref, { once: true, amount: 0.15 });
  const [tokens, setTokens] = useState(null);
  const [sort, setSort] = useState({ key: 'yieldApy', dir: -1 });

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch('/api/v1/tokens', { cache: 'no-store' });
        const data = await res.json();
        if (!cancelled && Array.isArray(data.tokens)) setTokens(data.tokens);
      } catch { if (!cancelled) setTokens([]); }
    }
    load();
    const t = setInterval(load, 30000);
    return () => { cancelled = true; clearInterval(t); };
  }, []);

  const rows = useMemo(() => {
    if (!tokens) return [];
    const val = (t) => (sort.key === 'backed' ? t.treasury?.backedPct ?? null : t[sort.key] ?? null);
    return [...tokens].sort((a, b) => {
      const av = val(a), bv = val(b);
      if (av == null && bv == null) return 0;
      if (av == null) return 1;
      if (bv == null) return -1;
      return (bv - av) * sort.dir;
    });
  }, [tokens, sort]);

  const toggle = (key) => setSort((s) => ({ key, dir: s.key === key ? -s.dir : -1 }));
  // What was routed over 30 days, per chain: SOL first, ETH beside it when Robinhood Chain coins routed any.
  const routed = { solana: 0, robinhood: 0 };
  for (const t of tokens || []) { const c = chainFor(t); routed[c] += native30d(t, c); }
  const cycles = (tokens || []).reduce((a, t) => a + (Number(t.distributions) || 0), 0);
  const lead = routed.solana > 0 || routed.robinhood === 0 ? 'solana' : 'robinhood';
  const other = lead === 'solana' && routed.robinhood > 0 ? 'robinhood' : null;

  return (
    <div id="screener" ref={ref} className="scroll-mt-20">
      <div className="mb-8 grid items-end gap-8 lg:grid-cols-12">
        <div className="lg:col-span-7">
          <div className="eyebrow mb-4">The screener</div>
          <h2 className="font-display text-[34px] font-medium leading-[1.05] tracking-[-0.03em] text-ink sm:text-[42px]">Coins, compared <span className="text-beam">like stocks.</span></h2>
          <p className="mt-4 max-w-xl text-[15px] leading-relaxed text-mut">Every coin routing its fees, on Solana and Robinhood Chain, ranked by yield, routing and treasury backing. Read from chain, updated every cycle.</p>
        </div>
        <dl className="panel grid grid-cols-3 divide-x divide-white/10 lg:col-span-5">
          <div className="px-4 py-4">
            <dt className="label">Listed</dt>
            <dd className="figure mt-1.5 text-2xl font-medium leading-none tracking-tight text-ink">{tokens ? tokens.length : '–'}</dd>
          </div>
          <div className="px-4 py-4">
            <dt className="label">Routed, 30d</dt>
            <dd className="figure mt-1.5 text-2xl font-medium leading-none tracking-tight text-ink">
              {tokens ? <>{amount(routed[lead])}<span className="ml-1.5 font-mono text-[10px] font-normal tracking-normal text-mut">{CHAINS[lead].native}</span></> : '–'}
            </dd>
            {tokens && other && <dd className="mt-1 font-mono text-[10.5px] tabular-nums text-mut">+ {amount(routed[other])} {CHAINS[other].native}</dd>}
          </div>
          <div className="px-4 py-4">
            <dt className="label">Cycles paid</dt>
            <dd className="figure mt-1.5 text-2xl font-medium leading-none tracking-tight text-ink">{tokens ? cycles.toLocaleString('en-US') : '–'}</dd>
          </div>
        </dl>
      </div>

      <div className="frame overflow-hidden shadow-soft">
        <div className="max-h-[640px] overflow-y-auto">
          {/* Heading row: sticks while the list scrolls. On narrow screens it becomes the sort control. */}
          <div className={`sticky top-0 z-10 flex items-center gap-x-5 gap-y-2 overflow-x-auto border-b border-white/10 bg-[rgba(8,11,18,0.94)] px-4 py-3 backdrop-blur-md sm:px-5 lg:grid ${GRID} lg:gap-x-4 lg:overflow-visible`}>
            <span className="label hidden lg:block">#</span>
            <span className="label shrink-0">Coin</span>
            <SortHead col={ROUTING_COL} sort={sort} onSort={toggle} />
            <span className="label hidden lg:block">Pays in</span>
            {COLUMNS.map((c) => <span key={c.key} className="flex shrink-0 lg:justify-end"><SortHead col={c} sort={sort} onSort={toggle} align="right" /></span>)}
            <span className="label hidden text-right lg:block">Next</span>
          </div>

          {tokens === null && (
            <div className="divide-y divide-white/[0.06]">
              {[0, 1, 2].map((i) => <div key={i} className="flex items-center gap-3 px-5 py-4"><span className="h-9 w-9 animate-pulse rounded-full bg-white/[0.06]" /><span className="h-3 w-40 animate-pulse rounded-full bg-white/[0.06]" /><span className="ml-auto h-3 w-24 animate-pulse rounded-full bg-white/[0.06]" /></div>)}
            </div>
          )}
          {tokens && tokens.length === 0 && (
            <div className="grid items-center gap-5 px-5 py-10 sm:grid-cols-[1fr_auto] sm:px-8">
              <div>
                <p className="font-display text-lg font-medium tracking-tight text-ink">No coin is routing its fees yet.</p>
                <p className="mt-1 max-w-md text-sm text-mut">The first pump.fun coin to route its fees is listed here, with its yield and its routing. Set it up from the dashboard or the Telegram bot.</p>
              </div>
              <a href="/app" className="btn-primary justify-self-start">Route a coin <Arrow className="h-3.5 w-3.5" /></a>
            </div>
          )}

          <div className="divide-y divide-white/[0.06]">
            {rows.map((t, i) => {
              const chain = chainFor(t);
              const routed30 = native30d(t, chain);
              const backedPct = t.treasury?.backedPct ?? null;
              const apy = pct(t.yieldApy);
              const sym = t.symbol || (chain === 'solana' ? t.address.slice(0, 4) : t.address.slice(2, 6).toUpperCase());
              return (
                <motion.div
                  key={t.address} layout="position"
                  initial={{ opacity: 0, y: 10 }} animate={seen ? { opacity: 1, y: 0 } : {}}
                  transition={{ duration: 0.5, delay: Math.min(i, 10) * 0.04, ease: EASE, layout: { duration: 0.4, ease: EASE } }}
                >
                  <Link href={`/${t.address}`} className={`group grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-3 px-4 py-3.5 transition-colors hover:bg-white/[0.04] sm:px-5 ${GRID}`}>
                    <span className="hidden font-mono text-[11px] tabular-nums text-dim lg:col-start-1 lg:row-start-1 lg:block">{String(i + 1).padStart(2, '0')}</span>

                    <div className="flex min-w-0 items-center gap-3 lg:col-start-2 lg:row-start-1">
                      <span className="relative shrink-0">
                        <StockLogo address={t.address} meta={{ symbol: t.symbol, image: t.image }} size="h-9 w-9" />
                        <ChainBadge chain={chain} className="absolute -bottom-0.5 -right-0.5" />
                      </span>
                      <div className="min-w-0">
                        <div className="truncate text-sm font-medium text-ink transition-colors group-hover:text-hood-700">{t.name || `$${sym}`}</div>
                        <div className="flex items-center gap-1.5 truncate font-mono text-[10.5px] text-mut">
                          <span>${sym}</span>
                          <span className="text-white/15">/</span>
                          <span className="truncate">{t.scheduleLabel}</span>
                          {t.loyalty ? <span className="flex shrink-0 items-center gap-0.5 text-cyan-500"><Medal className="h-3 w-3" />{t.loyalty.maxMultiplier.toFixed(1)}x</span> : null}
                        </div>
                      </div>
                    </div>

                    {/* Yield sits beside the name on narrow screens, in its column on wide ones. */}
                    <div className="text-right lg:col-start-5 lg:row-start-1">
                      {apy ? (
                        <span className="figure text-base font-medium text-hood-600">{apy}<span className="ml-1 font-mono text-[9.5px] uppercase tracking-[0.12em] text-mut">apy</span></span>
                      ) : routed30 > 0 ? (
                        <span className="figure text-sm text-ink">{amount(routed30)}<span className="ml-1 font-mono text-[9.5px] uppercase tracking-[0.12em] text-mut">{CHAINS[chain].native} 30d</span></span>
                      ) : <Dash />}
                    </div>

                    <RoutingBar policy={t.policy} className="col-span-2 lg:col-span-1 lg:col-start-3 lg:row-start-1 lg:pr-4" />

                    <div className="flex items-center gap-2 lg:col-start-4 lg:row-start-1">
                      <span className="label lg:hidden">Pays in</span>
                      <PaysIn t={t} chain={chain} />
                    </div>

                    <div className="figure hidden text-right text-sm text-ink lg:col-start-6 lg:row-start-1 lg:block">{backedPct != null ? <span className={backedPct >= 100 ? 'text-hood-600' : ''}>{pct(backedPct)}</span> : <Dash />}</div>
                    <div className="figure hidden text-right text-sm text-ink lg:col-start-7 lg:row-start-1 lg:block">{t.marketCap ? `$${compact(t.marketCap)}` : <Dash />}</div>
                    <div className="figure hidden text-right text-sm text-ink lg:col-start-8 lg:row-start-1 lg:block">{t.distributions}</div>

                    <div className="text-right font-mono text-[11px] tabular-nums text-ink/85 lg:col-start-9 lg:row-start-1">
                      <span className="mr-1.5 text-mut lg:hidden">next</span>
                      <Countdown intervalMinutes={t.intervalMinutes} scheduleKind={t.scheduleKind} />
                    </div>
                  </Link>
                </motion.div>
              );
            })}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-white/10 px-4 py-3 sm:px-5">
          <span className="label">Routing</span>
          {ROUTES.map((r) => <span key={r.key} className="flex items-center gap-1.5 text-[11px] text-mut"><span className={`h-1.5 w-3 rounded-full ${r.bar}`} />{r.label}</span>)}
          <span className="flex items-center gap-3 text-[11px] text-mut sm:ml-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <span className="flex items-center gap-1.5"><img src="/sol.png" alt="" className="h-3 w-3 rounded-full" />Solana</span>
            <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-hood-500" />Robinhood Chain</span>
          </span>
          <a href="/app" className="label ml-auto inline-flex items-center gap-1 !text-hood-600 transition-colors hover:!text-hood-700">Route a coin <Arrow className="h-3 w-3" /></a>
        </div>
      </div>
    </div>
  );
}
