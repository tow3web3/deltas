'use client';

// The coins that are running, laid out like a departures board: the time to the
// next cycle leads each line, with how far through its interval the coin is.
import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { motion, useInView } from 'motion/react';
import StockLogo from './StockLogo';
import Countdown from './Countdown';
import { RoutingBar, SortHead } from './Screener';
import { Dice, TrendUp, Pie, Vote, InKind, OpeningBell, Bell } from './Icons';
import { describeAddress } from '../lib/stocks';

const EASE = [0.16, 1, 0.3, 1];
const compact = (n) => new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 }).format(n || 0);
const MODE = { roulette: ['Roulette', Dice], gainer: ['Top gainer', TrendUp], portfolio: ['Portfolio', Pie], vote: ['Vote', Vote] };

// Interval schedules fire on wall-clock boundaries, the same rule the countdown uses.
function cycleOf(t, now) {
  if (t.scheduleKind && t.scheduleKind !== 'interval') return { left: null, done: null };
  const m = Math.max(1, Number(t.intervalMinutes) || 1);
  const d = new Date(now);
  const span = m * 60;
  const into = m <= 60 ? (d.getMinutes() % m) * 60 + d.getSeconds() : ((d.getHours() * 60 + d.getMinutes()) % m) * 60 + d.getSeconds();
  return { left: span - into, done: Math.min(1, into / span) };
}

const COLUMNS = [
  { key: 'next', label: 'Next cycle', title: 'Time to the next cycle' },
  { key: 'distributions', label: 'Cycles', title: 'Cycles paid so far' },
  { key: 'marketCap', label: 'Mcap', title: 'Market cap' },
  { key: 'yieldApy', label: 'Yield', title: 'Fees returned over 30 days, annualized, over market cap' },
];
const GRID = 'lg:grid-cols-[9.5rem_minmax(0,2fr)_minmax(0,1.1fr)_minmax(0,1.4fr)_repeat(3,minmax(0,0.7fr))]';

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

export default function ActiveTokens() {
  const ref = useRef(null);
  const seen = useInView(ref, { once: true, amount: 0.15 });
  const [tokens, setTokens] = useState([]);
  const [now, setNow] = useState(null);
  const [sort, setSort] = useState({ key: 'next', dir: 1 });

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch('/api/v1/tokens', { cache: 'no-store' });
        const data = await res.json();
        if (!cancelled && Array.isArray(data.tokens)) setTokens(data.tokens);
      } catch { /* ignore */ }
    }
    load();
    const t = setInterval(load, 20000);
    setNow(Date.now());
    const tick = setInterval(() => setNow(Date.now()), 1000);
    return () => { cancelled = true; clearInterval(t); clearInterval(tick); };
  }, []);

  // The order only moves when the sort or the list changes, not every second.
  const order = useMemo(() => {
    const at = Date.now();
    const val = (t) => (sort.key === 'next' ? cycleOf(t, at).left : t[sort.key] ?? null);
    return [...tokens].sort((a, b) => {
      const av = val(a), bv = val(b);
      if (av == null && bv == null) return 0;
      if (av == null) return 1;
      if (bv == null) return -1;
      return (av - bv) * sort.dir;
    }).map((t) => t.address);
  }, [tokens, sort]);
  const byAddress = Object.fromEntries(tokens.map((t) => [t.address, t]));
  const toggle = (key) => setSort((s) => ({ key, dir: s.key === key ? -s.dir : key === 'next' ? 1 : -1 }));

  return (
    <div id="bots" ref={ref} className="scroll-mt-20">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-x-8 gap-y-3">
        <div>
          <div className="eyebrow mb-2">Running now</div>
          <h2 className="font-display text-2xl font-semibold tracking-tight text-ink sm:text-3xl">Tokens paying dividends</h2>
        </div>
        <div className="flex items-baseline gap-2.5">
          <span className="relative flex h-1.5 w-1.5 self-center">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-hood-500 opacity-60" />
            <span className="relative h-1.5 w-1.5 rounded-full bg-hood-500" />
          </span>
          <span className="figure text-3xl font-medium leading-none tracking-tight text-ink">{tokens.length}</span>
          <span className="label">active</span>
        </div>
      </div>

      {tokens.length === 0 ? (
        <div className="frame px-6 py-10 text-sm text-mut">
          <span className="font-display text-lg font-medium tracking-tight text-ink">No active bots right now.</span> Yours could be the first.
        </div>
      ) : (
        <div className="frame overflow-hidden">
          <div className="max-h-[640px] overflow-y-auto">
            <div className={`sticky top-0 z-10 flex items-center gap-x-5 overflow-x-auto border-b border-line bg-paper px-4 py-2.5 sm:px-5 lg:grid ${GRID} lg:gap-x-5 lg:overflow-visible`}>
              <span className="shrink-0"><SortHead col={COLUMNS[0]} sort={sort} onSort={toggle} /></span>
              <span className="label hidden lg:block">Coin</span>
              <span className="label hidden lg:block">Pays in</span>
              <span className="label hidden lg:block">Routing</span>
              {COLUMNS.slice(1).map((c) => <span key={c.key} className="flex shrink-0 lg:justify-end"><SortHead col={c} sort={sort} onSort={toggle} align="right" /></span>)}
            </div>

            <div className="divide-y divide-line/70">
              {order.map((address, i) => {
                const t = byAddress[address];
                if (!t) return null;
                const c = now ? cycleOf(t, now) : { left: null, done: null };
                const bell = t.scheduleKind && t.scheduleKind !== 'interval';
                const BellIcon = t.scheduleKind === 'opening_bell' ? OpeningBell : Bell;
                return (
                  <motion.div
                    key={t.address} layout="position"
                    initial={{ opacity: 0, y: 10 }} animate={seen ? { opacity: 1, y: 0 } : {}}
                    transition={{ duration: 0.5, delay: Math.min(i, 10) * 0.04, ease: EASE, layout: { duration: 0.4, ease: EASE } }}
                  >
                    <Link href={`/${t.address}`} className={`group grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-5 gap-y-3 px-4 py-3.5 transition-colors hover:bg-tile/50 sm:px-5 ${GRID}`}>
                      <div className="order-2 text-right lg:order-none lg:col-start-1 lg:row-start-1 lg:text-left">
                        <div className="figure text-xl font-medium leading-none tracking-tight text-ink"><Countdown intervalMinutes={t.intervalMinutes} scheduleKind={t.scheduleKind} /></div>
                        {bell ? (
                          <div className="mt-1.5 flex items-center justify-end gap-1 font-mono text-[10px] text-mut lg:justify-start"><BellIcon className="h-3 w-3 text-gold-400" />{t.scheduleLabel}</div>
                        ) : (
                          <>
                            <div className="mt-2 ml-auto h-[3px] w-24 overflow-hidden rounded-[1px] bg-line lg:ml-0 lg:w-full">
                              <div className="h-full bg-hood-500 transition-[width] duration-1000 ease-linear" style={{ width: `${(c.done ?? 0) * 100}%` }} />
                            </div>
                            <div className="mt-1.5 font-mono text-[10px] text-mut">{t.scheduleLabel}</div>
                          </>
                        )}
                      </div>

                      <div className="order-1 flex min-w-0 items-center gap-3 lg:order-none lg:col-start-2 lg:row-start-1">
                        <StockLogo address={t.address} meta={{ symbol: t.symbol, image: t.image }} size="h-9 w-9" />
                        <div className="min-w-0">
                          <div className="truncate text-sm font-medium text-ink transition-colors group-hover:text-hood-700">{t.name || `$${t.symbol || t.address.slice(2, 6)}`}</div>
                          <div className="truncate font-mono text-[10.5px] text-mut">${t.symbol || t.address.slice(2, 6).toUpperCase()}</div>
                        </div>
                      </div>

                      <div className="order-4 flex items-center justify-end gap-2 lg:order-none lg:col-start-3 lg:row-start-1 lg:justify-start"><PaysIn t={t} /></div>
                      <RoutingBar policy={t.policy} className="order-3 lg:order-none lg:col-start-4 lg:row-start-1 lg:pr-4" />

                      <div className="figure hidden text-right text-sm text-ink lg:col-start-5 lg:row-start-1 lg:block">{t.distributions > 0 ? t.distributions : <Dash />}</div>
                      <div className="figure hidden text-right text-sm text-ink lg:col-start-6 lg:row-start-1 lg:block">{t.marketCap ? `$${compact(t.marketCap)}` : <Dash />}</div>
                      <div className="figure hidden text-right text-sm lg:col-start-7 lg:row-start-1 lg:block">{t.yieldApy ? <span className="text-hood-600">{t.yieldApy >= 10 ? t.yieldApy.toFixed(1) : t.yieldApy.toFixed(2)}%</span> : <Dash />}</div>
                    </Link>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
