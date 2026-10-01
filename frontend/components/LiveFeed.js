'use client';

// The ledger of the network: one line per event, newest on top. A coin linking
// its route, or a cycle paying its holders, with the time, the coin and its
// chain, the asset that went out and the amount, in the chain's own currency
// (SOL on Solana, ETH on Robinhood Chain). Shows a preview stream until the first real event.
import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import StockLogo from './StockLogo';
import { describeAddress } from '../lib/stocks';
import { getXStock } from '../lib/xstocks';
import { CHAINS, chainOf, isSolAddress } from '../lib/chains';
import { TOKEN_SYMBOL } from '../lib/brand';

const MAX_ROWS = 6;
const EASE = [0.16, 1, 0.3, 1];
const SOL_MINT = 'So11111111111111111111111111111111111111112';

function relTime(iso, now) {
  const s = Math.max(0, Math.floor((now - new Date(iso).getTime()) / 1000));
  if (s < 3) return 'just now';
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}
const clock = (iso) => new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
const day = (iso) => new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });

/** The chain of an event: the API's when it says, else read from the shape of the coin's address. */
const chainOfEvent = (e) => (CHAINS[e.chain] ? e.chain : chainOf(e.sourceToken) || 'solana');
/** A raw native amount (lamports on Solana, wei on Robinhood Chain) in the chain's own unit. */
const toNative = (raw, chain) => Number(raw || 0) / 10 ** CHAINS[chain].nativeDecimals;
const fmt = (n) => (n >= 100 ? n.toFixed(1) : n >= 1 ? n.toFixed(2) : n.toFixed(4));

/** What a payout went out in: SOL, an xStock, or whatever the chain's registry says. */
function assetOf(address, meta, chain) {
  if (chain === 'solana' && (!address || address === SOL_MINT || address === 'SOL' || /^0x/.test(address))) {
    return { address: SOL_MINT, symbol: 'SOL', name: 'Solana', meta: { symbol: 'SOL', image: '/sol.png' } };
  }
  const x = isSolAddress(address) ? getXStock(address) : null;
  if (x) return { address: x.mint, symbol: x.symbol, name: x.name, meta: { symbol: x.symbol, image: x.logo } };
  const d = describeAddress(address, meta);
  return { address, symbol: d.symbol, name: d.isNative ? 'Ether' : d.isStock ? d.name : '', meta };
}

// Preview stream shown until the routes have real events: the project's coin on Solana paying in SOL or an
// xStock, and now and then the moment a coin links its route.
const DEMO_X = ['NVDA', 'SPY', 'GLD', 'TSLA', 'AAPL', 'QQQ', 'MSTR', 'COIN'].map((t) => getXStock(t)).filter(Boolean);
const pickOne = (a) => a[Math.floor(Math.random() * a.length)];
function demoEvent(id) {
  const time = new Date().toISOString();
  if (Math.random() > 0.2) {
    const inSol = Math.random() < 0.3;
    return {
      id, type: 'paid', demo: true, chain: 'solana',
      sourceSymbol: TOKEN_SYMBOL, sourceLogo: '/logos/tokens/DELTA.png',
      rewardToken: inSol ? SOL_MINT : pickOne(DEMO_X).mint,
      holderCount: 8 + Math.floor(Math.random() * 90),
      claimedEth: String(Math.round((0.02 + Math.random() * 1.6) * 1e9)),
      time,
    };
  }
  return {
    id, type: 'linked', demo: true, chain: 'solana',
    sourceSymbol: TOKEN_SYMBOL, sourceLogo: '/logos/tokens/DELTA.png',
    rewardToken: pickOne(DEMO_X).mint,
    holderCount: null, claimedEth: null,
    time,
  };
}

const COLS = 'grid-cols-[4.25rem_minmax(0,1fr)_auto] sm:grid-cols-[5.5rem_minmax(0,1.25fr)_minmax(0,1fr)_7rem]';

/** The chain of a coin, as a small mark on the corner of its logo. */
function ChainBadge({ chain }) {
  return (
    <span title={CHAINS[chain].label} className="absolute -bottom-0.5 -right-0.5 flex h-3 w-3 items-center justify-center overflow-hidden rounded-full border border-ground bg-ground">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      {chain === 'solana' ? <img src="/sol.png" alt="" className="h-full w-full" /> : <span className="h-1.5 w-1.5 rounded-full bg-hood-500" />}
    </span>
  );
}

function CoinLogo({ event, meta, chain }) {
  return (
    <span className="relative shrink-0">
      {event.demo ? (
        <span className="stock-logo h-7 w-7">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={event.sourceLogo} alt={event.sourceSymbol} className="h-full w-full object-cover" />
        </span>
      ) : <StockLogo address={event.sourceToken} meta={meta?.[event.sourceToken]} size="h-7 w-7" text="text-[7px]" />}
      <ChainBadge chain={chain} />
    </span>
  );
}

function Row({ event, now, meta, fresh }) {
  const chain = chainOfEvent(event);
  const native = CHAINS[chain].native;
  const isPaid = event.type === 'paid';
  const reward = assetOf(event.rewardToken, meta?.[event.rewardToken], chain);
  const sourceSymbol = event.sourceSymbol || meta?.[event.sourceToken]?.symbol || (event.sourceToken ? (chain === 'solana' ? event.sourceToken.slice(0, 4) : event.sourceToken.slice(2, 6).toUpperCase()) : '????');
  // Past a day the date leads, with the hour under it.
  const old = now - new Date(event.time).getTime() > 86400000;
  const amount = isPaid && event.claimedEth ? fmt(toNative(event.claimedEth, chain)) : null;
  return (
    <motion.li
      layout
      initial={{ opacity: 0, y: -14 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, transition: { duration: 0.2 } }}
      transition={{ duration: 0.5, ease: EASE, layout: { duration: 0.45, ease: EASE } }}
      className={`relative grid ${COLS} items-center gap-x-3 px-4 py-3 sm:px-5`}
    >
      {fresh && <motion.span aria-hidden initial={{ opacity: 1 }} animate={{ opacity: 0 }} transition={{ duration: 2.4, ease: 'easeOut' }} className="pointer-events-none absolute inset-y-1 left-0 w-[2px] rounded-full bg-cyan-500 shadow-[0_0_12px_#5FE3FF]" />}
      <div className="font-mono text-[11px] leading-tight tabular-nums">
        <div className="text-ink/85">{old ? day(event.time) : clock(event.time)}</div>
        <div className="text-[10px] text-dim">{old ? clock(event.time).slice(0, 5) : relTime(event.time, now)}</div>
      </div>

      <div className="flex min-w-0 items-center gap-2.5">
        <CoinLogo event={event} meta={meta} chain={chain} />
        <div className="min-w-0">
          <div className="truncate text-sm font-medium text-ink">${sourceSymbol}</div>
          <div className="flex items-center gap-1.5 truncate text-[11px] text-mut">
            <span className={`h-1 w-1 shrink-0 rounded-full ${isPaid ? 'bg-cyan-500 shadow-[0_0_6px_#5FE3FF]' : 'bg-white/40'}`} />
            <span className="truncate">{isPaid ? (event.holderCount ? `paid ${event.holderCount} holders` : 'paid its holders') : 'linked its route'}<span className="text-dim"> · {CHAINS[chain].label}</span></span>
          </div>
        </div>
      </div>

      <div className="hidden min-w-0 items-center gap-2 sm:flex">
        <StockLogo address={reward.address} meta={reward.meta} size="h-5 w-5" text="text-[6px]" />
        <span className="font-mono text-xs font-medium text-ink">{reward.symbol}</span>
        <span className="truncate text-[11px] text-mut">{reward.name}</span>
      </div>

      <div className="text-right">
        {amount ? (
          <>
            <div className="figure text-sm font-medium text-ink">{amount}<span className="ml-1 font-mono text-[10px] text-mut">{native}</span></div>
            <div className="hidden text-[10px] text-dim sm:block">routed</div>
          </>
        ) : isPaid ? (
          <div className="figure text-sm font-medium text-ink">{event.holderCount || 0}<span className="ml-1 text-[10px] text-mut">paid</span></div>
        ) : (
          <div className="label !text-hood-600">route open</div>
        )}
        <div className="mt-0.5 flex items-center justify-end gap-1 text-[10px] text-mut sm:hidden">in <StockLogo address={reward.address} meta={reward.meta} size="h-3.5 w-3.5" text="text-[5px]" /><span className="font-mono text-ink/85">{reward.symbol}</span></div>
      </div>
    </motion.li>
  );
}

export default function LiveFeed() {
  const [events, setEvents] = useState([]);
  const [meta, setMeta] = useState({});
  const [now, setNow] = useState(() => Date.now());
  const [demo, setDemo] = useState(false);
  const demoId = useRef(0);
  const demoMode = useRef(false);
  const seen = useRef(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch(`/api/activity?limit=${MAX_ROWS}`, { cache: 'no-store' });
        const data = await res.json();
        if (cancelled) return;
        if (Array.isArray(data.events) && data.events.length > 0) {
          demoMode.current = false;
          setDemo(false);
          if (data.meta) setMeta((prev) => ({ ...prev, ...data.meta }));
          // Keyed by what the event is, not by its position, so a new event pushes the others down instead of redrawing them.
          const used = new Set();
          setEvents(data.events.map((e) => {
            let id = `${e.type}-${e.sourceToken}-${e.time}`;
            while (used.has(id)) id += '+';
            used.add(id);
            return { ...e, id };
          }));
          return;
        }
      } catch { /* backend offline */ }
      if (!cancelled && !demoMode.current) {
        demoMode.current = true;
        setDemo(true);
        setEvents(Array.from({ length: MAX_ROWS }, () => {
          const ev = demoEvent(demoId.current++);
          ev.time = new Date(Date.now() - Math.random() * 120000).toISOString();
          return ev;
        }).sort((a, b) => new Date(b.time) - new Date(a.time)));
      }
    }
    load();
    const refresh = setInterval(load, 25000);
    const tick = setInterval(() => setNow(Date.now()), 1000);
    let demoTimer;
    const scheduleDemo = () => {
      demoTimer = setTimeout(() => {
        if (demoMode.current) setEvents((prev) => [demoEvent(demoId.current++), ...prev].slice(0, MAX_ROWS));
        scheduleDemo();
      }, 30000 + Math.random() * 30000);
    };
    scheduleDemo();
    return () => { cancelled = true; clearInterval(refresh); clearInterval(tick); clearTimeout(demoTimer); };
  }, []);

  // Rows that arrived after the first load carry a mark on their left edge for a few seconds.
  const firstBatch = seen.current === null;
  if (events.length) {
    if (firstBatch) seen.current = new Map();
    for (const e of events) if (!seen.current.has(e.id)) seen.current.set(e.id, firstBatch ? 0 : Date.now());
  }
  const freshIds = new Set(events.filter((e) => now - (seen.current?.get(e.id) || 0) < 3000).map((e) => e.id));

  // Totals of the entries shown, per chain: SOL first.
  const paid = events.filter((e) => e.type === 'paid');
  const routed = { solana: 0, robinhood: 0 };
  for (const e of paid) { const c = chainOfEvent(e); routed[c] += toNative(e.claimedEth, c); }
  const routedParts = ['solana', 'robinhood'].filter((c) => routed[c] > 0);
  const holders = paid.reduce((a, e) => a + (e.holderCount || 0), 0);

  return (
    <div className="frame overflow-hidden shadow-soft">
      <div className="flex items-center justify-between gap-3 px-4 pb-3 pt-4 sm:px-5">
        <span className="label flex items-center gap-2 !text-ink/80">
          <span className="relative flex h-1.5 w-1.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-cyan-500 opacity-60" />
            <span className="relative h-1.5 w-1.5 rounded-full bg-cyan-500 shadow-[0_0_8px_#5FE3FF]" />
          </span>
          Ledger
        </span>
        <span className="label">{demo ? 'Preview, no event yet' : 'Refreshes every 25s'}</span>
      </div>

      <div className={`label grid ${COLS} gap-x-3 border-y border-white/10 bg-white/[0.03] px-4 py-2 sm:px-5`}>
        <span>Time</span>
        <span>Coin and event</span>
        <span className="hidden sm:block">Paid in</span>
        <span className="text-right">Amount</span>
      </div>

      <ul className="divide-y divide-white/[0.06]" style={{ minHeight: events.length ? undefined : 320 }}>
        <AnimatePresence initial={false}>
          {events.map((e) => <Row key={e.id} event={e} now={now} meta={meta} fresh={freshIds.has(e.id)} />)}
        </AnimatePresence>
      </ul>

      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-1 border-t border-white/10 px-4 py-3 sm:px-5">
        <span className="label">Last {events.length} entries</span>
        <span className="text-xs text-mut">
          {routedParts.length > 0 && <>{routedParts.map((c, i) => <span key={c}>{i ? ' and ' : ''}<span className="figure text-ink">{fmt(routed[c])} {CHAINS[c].native}</span></span>)} routed, </>}
          <span className="figure text-ink">{holders.toLocaleString('en-US')}</span> holder payments
        </span>
      </div>
    </div>
  );
}
