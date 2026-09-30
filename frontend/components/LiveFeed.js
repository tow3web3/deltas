'use client';

// The ledger of the network: one line per event, newest on top. A coin linking
// its route, or a cycle paying its holders, with the time, the coin, the asset
// that went out and the amount. Shows a preview stream until the first real event.
import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import StockLogo from './StockLogo';
import { describeAddress, getStock, LIQUID_TICKERS } from '../lib/stocks';

const MAX_ROWS = 6;
const EASE = [0.16, 1, 0.3, 1];

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
const eth = (wei) => {
  const n = Number(wei || 0) / 1e18;
  return n >= 100 ? n.toFixed(1) : n >= 1 ? n.toFixed(2) : n.toFixed(3);
};

// Preview stream shown until the routes have real events: the two example coins, paying in liquid stocks.
const DEMO_SOURCES = ['PONS', 'NASDUCK'];
function demoEvent(id) {
  const stock = getStock(LIQUID_TICKERS[Math.floor(Math.random() * LIQUID_TICKERS.length)]);
  const isPaid = Math.random() > 0.3;
  return {
    id, type: isPaid ? 'paid' : 'linked', demo: true,
    sourceSymbol: DEMO_SOURCES[Math.floor(Math.random() * DEMO_SOURCES.length)],
    rewardToken: stock.address,
    holderCount: isPaid ? 8 + Math.floor(Math.random() * 60) : null,
    time: new Date().toISOString(),
  };
}

const COLS = 'grid-cols-[4.25rem_minmax(0,1fr)_auto] sm:grid-cols-[5.5rem_minmax(0,1.25fr)_minmax(0,1fr)_6.5rem]';

function CoinLogo({ event, meta }) {
  if (event.demo) {
    return (
      <span className="stock-logo h-7 w-7">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={`/logos/tokens/${event.sourceSymbol}.png`} alt={event.sourceSymbol} className="h-full w-full object-cover" />
      </span>
    );
  }
  return <StockLogo address={event.sourceToken} meta={meta?.[event.sourceToken]} size="h-7 w-7" text="text-[7px]" />;
}

function Row({ event, now, meta, fresh }) {
  const isPaid = event.type === 'paid';
  const reward = describeAddress(event.rewardToken, meta?.[event.rewardToken]);
  const sourceSymbol = event.sourceSymbol || meta?.[event.sourceToken]?.symbol || (event.sourceToken ? event.sourceToken.slice(2, 6).toUpperCase() : '????');
  // Past a day the date leads, with the hour under it.
  const old = now - new Date(event.time).getTime() > 86400000;
  const amount = isPaid && event.claimedEth ? eth(event.claimedEth) : null;
  return (
    <motion.li
      layout
      initial={{ opacity: 0, y: -14 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, transition: { duration: 0.2 } }}
      transition={{ duration: 0.5, ease: EASE, layout: { duration: 0.45, ease: EASE } }}
      className={`relative grid ${COLS} items-center gap-x-3 px-4 py-2.5 sm:px-5`}
    >
      {fresh && <motion.span aria-hidden initial={{ opacity: 0.9 }} animate={{ opacity: 0 }} transition={{ duration: 2.4, ease: 'easeOut' }} className="pointer-events-none absolute inset-y-0 left-0 w-[2px] bg-hood-500" />}
      <div className="font-mono text-[11px] leading-tight tabular-nums">
        <div className="text-ink/85">{old ? day(event.time) : clock(event.time)}</div>
        <div className="text-[10px] text-mut">{old ? clock(event.time).slice(0, 5) : relTime(event.time, now)}</div>
      </div>

      <div className="flex min-w-0 items-center gap-2.5">
        <CoinLogo event={event} meta={meta} />
        <div className="min-w-0">
          <div className="truncate text-sm font-medium text-ink">${sourceSymbol}</div>
          <div className="flex items-center gap-1.5 truncate text-[11px] text-mut">
            <span className={`h-1 w-1 shrink-0 rounded-full ${isPaid ? 'bg-hood-500' : 'bg-gold-400'}`} />
            <span className="truncate">{isPaid ? (event.holderCount ? `paid ${event.holderCount} holders` : 'paid its holders') : 'linked its route'}</span>
          </div>
        </div>
      </div>

      <div className="hidden min-w-0 items-center gap-2 sm:flex">
        <StockLogo address={event.rewardToken} meta={meta?.[event.rewardToken]} size="h-5 w-5" text="text-[6px]" />
        <span className="font-mono text-xs font-medium text-ink">{reward.symbol}</span>
        <span className="truncate text-[11px] text-mut">{reward.isNative ? 'Ether' : reward.isStock ? reward.name : ''}</span>
      </div>

      <div className="text-right">
        {amount ? (
          <>
            <div className="figure text-sm font-medium text-ink">{amount}<span className="ml-1 text-[10px] text-mut">ETH</span></div>
            <div className="hidden text-[10px] text-mut sm:block">routed</div>
          </>
        ) : isPaid ? (
          <div className="figure text-sm font-medium text-ink">{event.holderCount || 0}<span className="ml-1 text-[10px] text-mut">paid</span></div>
        ) : (
          <div className="label !text-gold-600">route open</div>
        )}
        <div className="mt-0.5 flex items-center justify-end gap-1 text-[10px] text-mut sm:hidden">in <StockLogo address={event.rewardToken} meta={meta?.[event.rewardToken]} size="h-3.5 w-3.5" text="text-[5px]" /><span className="font-mono text-ink/85">{reward.symbol}</span></div>
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

  const paid = events.filter((e) => e.type === 'paid');
  const routed = paid.reduce((a, e) => a + Number(e.claimedEth || 0) / 1e18, 0);
  const holders = paid.reduce((a, e) => a + (e.holderCount || 0), 0);

  return (
    <div className="frame overflow-hidden">
      <div className="flex items-center justify-between gap-3 px-4 pb-3 pt-4 sm:px-5">
        <span className="label flex items-center gap-2 text-ink/80">
          <span className="relative flex h-1.5 w-1.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-hood-500 opacity-60" />
            <span className="relative h-1.5 w-1.5 rounded-full bg-hood-500" />
          </span>
          Ledger
        </span>
        <span className="label">{demo ? 'Preview, no event yet' : 'Refreshes every 25s'}</span>
      </div>

      <div className={`label grid ${COLS} gap-x-3 border-y border-line bg-tile/40 px-4 py-2 sm:px-5`}>
        <span>Time</span>
        <span>Coin and event</span>
        <span className="hidden sm:block">Paid in</span>
        <span className="text-right">Amount</span>
      </div>

      <ul className="divide-y divide-line/70" style={{ minHeight: events.length ? undefined : 320 }}>
        <AnimatePresence initial={false}>
          {events.map((e) => <Row key={e.id} event={e} now={now} meta={meta} fresh={freshIds.has(e.id)} />)}
        </AnimatePresence>
      </ul>

      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-1 border-t border-line px-4 py-3 sm:px-5">
        <span className="label">Last {events.length} entries</span>
        <span className="text-xs text-mut">
          {routed > 0 && <><span className="figure text-ink">{eth(routed * 1e18)} ETH</span> routed, </>}
          <span className="figure text-ink">{holders.toLocaleString('en-US')}</span> holder payments
        </span>
      </div>
    </div>
  );
}
