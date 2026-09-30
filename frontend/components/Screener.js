'use client';

// The screener: every coin routing its fees, in one table, comparable like
// stocks. Each row carries its routing as a segmented bar, so the policy of a
// coin reads at a glance next to its yield.
import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { motion, useInView } from 'motion/react';
import StockLogo from './StockLogo';
import Countdown from './Countdown';
import { Arrow, Rise, Fall, Dice, TrendUp, Pie, Vote, Medal, InKind } from './Icons';
import { describeAddress } from '../lib/stocks';

const EASE = [0.16, 1, 0.3, 1];
const compact = (n) => new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 }).format(n || 0);
const pct = (n, d = 1) => (n == null ? null : n >= 100 ? `${Math.round(n)}%` : `${n.toFixed(d)}%`);
const MODE = { roulette: ['Roulette', Dice], gainer: ['Top gainer', TrendUp], portfolio: ['Portfolio', Pie], vote: ['Vote', Vote] };

// Where a cycle goes. The colour is the meaning: green is paid out, white stays with the creator, orange is burned, gold is kept.
export const ROUTES = [
  { key: 'holders', label: 'Holders', bar: 'bg-hood-500' },
  { key: 'creator', label: 'Creator', bar: 'bg-ink' },
  { key: 'burn', label: 'Burn', bar: 'bg-[#FF7A1A]' },
  { key: 'treasury', label: 'Treasury', bar: 'bg-gold-400' },
];

/** The routing of one coin: one segment per destination, as wide as its share. */
export function RoutingBar({ policy, caption = true, className = '' }) {
  const parts = ROUTES.map((r) => ({ ...r, bps: Number(policy?.[r.key] || 0) })).filter((r) => r.bps > 0);
  const total = parts.reduce((a, p) => a + p.bps, 0) || 1;
  return (
    <div className={className}>
      <div className="flex h-1.5 w-full gap-px overflow-hidden rounded-[2px] bg-line" role="img" aria-label={parts.map((p) => `${p.label} ${p.bps / 100}%`).join(', ')}>
        {parts.map((p) => <span key={p.key} className={`h-full ${p.bar}`} style={{ width: `${(p.bps / total) * 100}%` }} />)}
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
      className={`label group inline-flex items-center gap-1 transition-colors hover:text-ink ${align === 'right' ? 'justify-end text-right' : ''} ${on ? '!text-hood-600' : ''}`}
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

function PaysIn({ t }) {
  if (t.payoutMode === 'in_kind') return <span className="flex items-center gap-1.5 text-xs text-ink"><InKind className="h-4 w-4 text-hood-600" />In kind</span>;
  const mode = MODE[t.rewardMode];
  if (mode) {
    const Icon = mode[1];
    return <span className="flex items-center gap-1.5 text-xs text-ink"><Icon className="h-4 w-4 text-hood-600" />{mode[0]}</span>;
  }
  const reward = describeAddress(t.rewardToken, { symbol: t.rewardSymbol });
  return (
    <span className="flex min-w-0 items-center gap-1.5">
      <StockLogo address={t.rewardToken} meta={{ symbol: t.rewardSymbol }} size="h-5 w-5" text="text-[6px]" />
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
  const eth30 = (tokens || []).reduce((a, t) => a + (Number(t.eth30d) || 0), 0);
  const cycles = (tokens || []).reduce((a, t) => a + (Number(t.distributions) || 0), 0);

  return (
    <div id="screener" ref={ref} className="scroll-mt-20">
      <div className="mb-6 grid items-end gap-6 lg:grid-cols-12">
        <div className="lg:col-span-7">
          <div className="eyebrow mb-2">The screener</div>
          <h2 className="font-display text-2xl font-semibold tracking-tight text-ink sm:text-3xl">Memecoins, compared like stocks</h2>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-mut">Every coin routing its fees, ranked by yield, routing and treasury backing. Read from chain, updated every cycle.</p>
        </div>
        <dl className="grid grid-cols-3 divide-x divide-line border-y border-line lg:col-span-5">
          {[
            ['Listed', tokens ? String(tokens.length) : '–'],
            ['Routed, 30d', tokens ? eth30.toLocaleString('en-US', { maximumFractionDigits: eth30 >= 100 ? 0 : 2 }) : '–', 'ETH'],
            ['Cycles paid', tokens ? cycles.toLocaleString('en-US') : '–'],
          ].map(([l, v, u], i) => (
            <div key={l} className={`py-3 ${i ? 'pl-4' : ''}`}>
              <dt className="label">{l}</dt>
              <dd className="figure mt-1 text-2xl font-medium leading-none tracking-tight text-ink">{v}{u && tokens && <span className="ml-1.5 font-mono text-[10px] font-normal tracking-normal text-mut">{u}</span>}</dd>
            </div>
          ))}
        </dl>
      </div>

      <div className="frame overflow-hidden">
        <div className="max-h-[640px] overflow-y-auto">
          {/* Heading row: sticks while the list scrolls. On narrow screens it becomes the sort control. */}
          <div className={`sticky top-0 z-10 flex items-center gap-x-5 gap-y-2 overflow-x-auto border-b border-line bg-paper px-4 py-2.5 sm:px-5 lg:grid ${GRID} lg:gap-x-4 lg:overflow-visible`}>
            <span className="label hidden lg:block">#</span>
            <span className="label shrink-0">Coin</span>
            <SortHead col={ROUTING_COL} sort={sort} onSort={toggle} />
            <span className="label hidden lg:block">Pays in</span>
            {COLUMNS.map((c) => <span key={c.key} className="flex shrink-0 lg:justify-end"><SortHead col={c} sort={sort} onSort={toggle} align="right" /></span>)}
            <span className="label hidden text-right lg:block">Next</span>
          </div>

          {tokens === null && (
            <div className="divide-y divide-line/70">
              {[0, 1, 2].map((i) => <div key={i} className="flex items-center gap-3 px-5 py-4"><span className="h-9 w-9 animate-pulse rounded-full bg-tile" /><span className="h-3 w-40 animate-pulse rounded bg-tile" /><span className="ml-auto h-3 w-24 animate-pulse rounded bg-tile" /></div>)}
            </div>
          )}
          {tokens && tokens.length === 0 && (
            <div className="grid items-center gap-5 px-5 py-10 sm:grid-cols-[1fr_auto] sm:px-8">
              <div>
                <p className="font-display text-lg font-medium tracking-tight text-ink">No coin is routing its fees yet.</p>
                <p className="mt-1 max-w-md text-sm text-mut">The first one listed here gets every holder on Robinhood Chain looking at its yield. Two minutes on Telegram.</p>
              </div>
              <a href="/app" className="btn-primary justify-self-start">Be the first <Arrow className="h-3.5 w-3.5" /></a>
            </div>
          )}

          <div className="divide-y divide-line/70">
            {rows.map((t, i) => {
              const backedPct = t.treasury?.backedPct ?? null;
              const apy = pct(t.yieldApy);
              return (
                <motion.div
                  key={t.address} layout="position"
                  initial={{ opacity: 0, y: 10 }} animate={seen ? { opacity: 1, y: 0 } : {}}
                  transition={{ duration: 0.5, delay: Math.min(i, 10) * 0.04, ease: EASE, layout: { duration: 0.4, ease: EASE } }}
                >
                  <Link href={`/${t.address}`} className={`group grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-3 px-4 py-3.5 transition-colors hover:bg-tile/50 sm:px-5 ${GRID}`}>
                    <span className="hidden font-mono text-[11px] tabular-nums text-mut lg:col-start-1 lg:row-start-1 lg:block">{String(i + 1).padStart(2, '0')}</span>

                    <div className="flex min-w-0 items-center gap-3 lg:col-start-2 lg:row-start-1">
                      <StockLogo address={t.address} meta={{ symbol: t.symbol, image: t.image }} size="h-9 w-9" />
                      <div className="min-w-0">
                        <div className="truncate text-sm font-medium text-ink transition-colors group-hover:text-hood-700">{t.name || `$${t.symbol || t.address.slice(2, 6)}`}</div>
                        <div className="flex items-center gap-1.5 truncate font-mono text-[10.5px] text-mut">
                          <span>${t.symbol || t.address.slice(2, 6).toUpperCase()}</span>
                          <span className="text-line">/</span>
                          <span className="truncate">{t.scheduleLabel}</span>
                          {t.loyalty ? <span className="flex shrink-0 items-center gap-0.5 text-gold-600"><Medal className="h-3 w-3" />{t.loyalty.maxMultiplier.toFixed(1)}x</span> : null}
                        </div>
                      </div>
                    </div>

                    {/* Yield sits beside the name on narrow screens, in its column on wide ones. */}
                    <div className="text-right lg:col-start-5 lg:row-start-1">
                      {apy ? (
                        <span className="figure text-base font-medium text-hood-600">{apy}<span className="ml-1 font-mono text-[9.5px] uppercase tracking-[0.12em] text-mut">apy</span></span>
                      ) : t.eth30d > 0 ? (
                        <span className="figure text-sm text-ink">{t.eth30d.toFixed(t.eth30d >= 10 ? 2 : 3)}<span className="ml-1 font-mono text-[9.5px] uppercase tracking-[0.12em] text-mut">eth 30d</span></span>
                      ) : <Dash />}
                    </div>

                    <RoutingBar policy={t.policy} className="col-span-2 lg:col-span-1 lg:col-start-3 lg:row-start-1 lg:pr-4" />

                    <div className="flex items-center gap-2 lg:col-start-4 lg:row-start-1">
                      <span className="label lg:hidden">Pays in</span>
                      <PaysIn t={t} />
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

        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-line px-4 py-3 sm:px-5">
          <span className="label">Routing</span>
          {ROUTES.map((r) => <span key={r.key} className="flex items-center gap-1.5 text-[11px] text-mut"><span className={`h-1.5 w-3 rounded-[1px] ${r.bar}`} />{r.label}</span>)}
          <a href="/app" className="label ml-auto inline-flex items-center gap-1 !text-hood-600 transition-colors hover:!text-hood-700">List a coin <Arrow className="h-3 w-3" /></a>
        </div>
      </div>
    </div>
  );
}
