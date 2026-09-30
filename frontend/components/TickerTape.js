'use client';

import { useEffect, useState } from 'react';
import StockLogo from './StockLogo';
import { Rise, Fall } from './Icons';
import { TAPE_TICKERS } from '../lib/stocks';

// The tape across the top of every page: live prices for the headline stocks,
// cut every few quotes by the latest payout the routes made. Prices come from
// /api/stocks/prices, payouts from /api/activity.
const fmt = (n) => (n >= 1000 ? n.toLocaleString('en-US', { maximumFractionDigits: 0 }) : n.toFixed(2));

function Quote({ c }) {
  const up = (c.chg ?? 0) >= 0;
  return (
    <span className="flex h-7 items-center gap-2 whitespace-nowrap border-r border-white/[0.07] px-4">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={`/logos/stocks/${c.t}.png`} alt="" className="h-3.5 w-3.5 rounded-full bg-white" />
      <span className="font-mono text-[10.5px] font-medium tracking-[0.08em] text-white/90">{c.t}</span>
      {c.price ? (
        <>
          <span className="font-mono text-[10.5px] tabular-nums text-white/55">{fmt(c.price)}</span>
          <span className={`flex items-center gap-0.5 font-mono text-[10.5px] tabular-nums ${up ? 'text-hood-500' : 'text-down'}`}>
            {up ? <Rise className="h-2 w-2" /> : <Fall className="h-2 w-2" />}
            {Math.abs(c.chg || 0).toFixed(2)}%
          </span>
        </>
      ) : (
        <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-white/30">Robinhood Chain</span>
      )}
    </span>
  );
}

// A payout on the tape: the coin that paid, how many holders, and the asset they received, each with its logo.
function Payout({ p }) {
  return (
    <span className="flex h-7 items-center gap-2 whitespace-nowrap border-r border-white/[0.07] bg-hood-500/[0.07] px-4">
      <span className="font-mono text-[9.5px] font-medium uppercase tracking-[0.16em] text-hood-500">Paid</span>
      <StockLogo address={p.sourceToken} meta={p.source} size="h-3.5 w-3.5" text="text-[5px]" />
      <span className="font-mono text-[10.5px] font-medium tracking-[0.04em] text-white/90">{p.source?.symbol ? `$${p.source.symbol}` : 'A coin'}</span>
      <span className="font-mono text-[10.5px] tabular-nums text-white/55">{p.holderCount} holders in</span>
      <StockLogo address={p.rewardToken} meta={p.reward} size="h-3.5 w-3.5" text="text-[5px]" />
      <span className="font-mono text-[10.5px] font-medium tracking-[0.04em] text-white/90">{p.reward?.symbol || 'stock'}</span>
    </span>
  );
}

export default function TickerTape() {
  const [quotes, setQuotes] = useState({});
  const [payouts, setPayouts] = useState([]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch(`/api/stocks/prices?tickers=${TAPE_TICKERS.join(',')}`, { cache: 'no-store' });
        const data = await res.json();
        if (!cancelled && data.quotes) setQuotes(data.quotes);
      } catch { /* keep last */ }
      try {
        const res = await fetch('/api/activity?limit=12', { cache: 'no-store' });
        const data = await res.json();
        const meta = data.meta || {};
        const items = (data.events || [])
          .filter((e) => e.type === 'paid' && e.holderCount > 0)
          .map((e) => ({ sourceToken: e.sourceToken, rewardToken: e.rewardToken, holderCount: e.holderCount, source: meta[e.sourceToken] || null, reward: meta[e.rewardToken] || null }));
        if (!cancelled) setPayouts(items);
      } catch { /* ignore */ }
    }
    load();
    const t = setInterval(load, 45000);
    return () => { cancelled = true; clearInterval(t); };
  }, []);

  const cells = TAPE_TICKERS.map((t) => {
    const q = quotes[t];
    return { t, price: q?.price, chg: q?.changePct };
  });
  const loop = [...cells, ...cells];

  return (
    <div className="relative z-50 overflow-hidden border-b border-line bg-tape">
      <div className="marquee-track" style={{ animationDuration: '70s' }}>
        {loop.map((c, i) => (
          <span key={i} className="flex items-center">
            <Quote c={c} />
            {payouts.length > 0 && i % 4 === 3 ? <Payout p={payouts[(i >> 2) % payouts.length]} /> : null}
          </span>
        ))}
      </div>
    </div>
  );
}
