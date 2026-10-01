'use client';

import { useEffect, useState } from 'react';
import StockLogo from './StockLogo';
import { Rise, Fall } from './Icons';
import { TAPE_TICKERS, describeAddress } from '../lib/stocks';
import { getXStock } from '../lib/xstocks';
import { chainOf, isSolAddress } from '../lib/chains';

// The tape across the top of every page: live prices of the headline stocks,
// named as the xStocks a coin can pay on Solana (NVDAx, SPYx…), cut every few
// quotes by the latest payout the routes made. Prices come from
// /api/stocks/prices (the price of the share), payouts from /api/activity.
const SOL_MINT = 'So11111111111111111111111111111111111111112';
const fmt = (n) => (n >= 1000 ? n.toLocaleString('en-US', { maximumFractionDigits: 0 }) : n.toFixed(2));

// Each ticker as its xStock when there is one: the xStock's symbol and logo, the site's own logo of the ticker as a fallback.
const CELLS = TAPE_TICKERS.map((t) => {
  const x = getXStock(t);
  return { t, label: x ? x.symbol : t, name: x?.name || t, logos: [x?.logo, `/logos/stocks/${t}.png`].filter(Boolean) };
});

/** What a payout was paid in: SOL, an xStock, or whatever the chain's registry says. */
function rewardOf(p) {
  const a = p.rewardToken;
  const chain = chainOf(p.sourceToken) || 'solana';
  if (chain === 'solana' && (!a || a === SOL_MINT || a === 'SOL' || /^0x/.test(a))) return { address: SOL_MINT, symbol: 'SOL', meta: { symbol: 'SOL', image: '/sol.png' } };
  const x = isSolAddress(a) ? getXStock(a) : null;
  if (x) return { address: x.mint, symbol: x.symbol, meta: { symbol: x.symbol, image: x.logo } };
  return { address: a, symbol: describeAddress(a, p.reward).symbol, meta: p.reward };
}

function TapeLogo({ srcs }) {
  const [at, setAt] = useState(0);
  const src = srcs[at];
  if (!src) return <span className="h-3.5 w-3.5 shrink-0 rounded-full bg-white/15" />;
  // eslint-disable-next-line @next/next/no-img-element
  return <img key={src} src={src} alt="" onError={() => setAt((i) => i + 1)} className="h-3.5 w-3.5 shrink-0 rounded-full bg-white" />;
}

function Quote({ c }) {
  const up = (c.chg ?? 0) >= 0;
  return (
    <span className="flex h-7 items-center gap-2 whitespace-nowrap border-r border-white/[0.06] px-4">
      <TapeLogo srcs={c.logos} />
      <span className="font-mono text-[10.5px] font-medium tracking-[0.04em] text-ink/90">{c.label}</span>
      {c.price ? (
        <>
          <span className="font-mono text-[10.5px] tabular-nums text-mut">{fmt(c.price)}</span>
          <span className={`flex items-center gap-0.5 font-mono text-[10.5px] tabular-nums ${up ? 'text-hood-600' : 'text-down'}`}>
            {up ? <Rise className="h-2 w-2" /> : <Fall className="h-2 w-2" />}
            {Math.abs(c.chg || 0).toFixed(2)}%
          </span>
        </>
      ) : (
        <span className="font-mono text-[10px] tracking-[0.04em] text-dim">{c.name}</span>
      )}
    </span>
  );
}

// A payout on the tape: the coin that paid, how many holders, and the asset they received, each with its logo.
function Payout({ p }) {
  const reward = rewardOf(p);
  return (
    <span className="flex h-7 items-center gap-2 whitespace-nowrap border-r border-white/[0.06] bg-gradient-to-r from-hood-500/[0.09] via-cyan-500/[0.05] to-violet-500/[0.09] px-4">
      <span className="h-1.5 w-1.5 rounded-full bg-cyan-500 shadow-[0_0_8px_#5FE3FF]" />
      <span className="font-mono text-[9.5px] font-medium uppercase tracking-[0.18em] text-cyan-500">Paid</span>
      <StockLogo address={p.sourceToken} meta={p.source} size="h-3.5 w-3.5" text="text-[5px]" />
      <span className="font-mono text-[10.5px] font-medium tracking-[0.04em] text-ink/90">{p.source?.symbol ? `$${p.source.symbol}` : 'A coin'}</span>
      <span className="font-mono text-[10.5px] tabular-nums text-mut">{p.holderCount} holders in</span>
      <StockLogo address={reward.address} meta={reward.meta} size="h-3.5 w-3.5" text="text-[5px]" />
      <span className="font-mono text-[10.5px] font-medium tracking-[0.04em] text-ink/90">{reward.symbol}</span>
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

  const cells = CELLS.map((c) => {
    const q = quotes[c.t];
    return { ...c, price: q?.price, chg: q?.changePct };
  });
  const loop = [...cells, ...cells];

  return (
    <div className="relative z-50 overflow-hidden border-b border-white/[0.06] bg-[rgba(3,5,8,0.82)] backdrop-blur-md">
      {/* The edges fade into the ground, so the tape reads as light passing, not a box. */}
      <div className="[mask-image:linear-gradient(90deg,transparent,#000_3%,#000_97%,transparent)]">
        <div className="marquee-track" style={{ animationDuration: '70s' }}>
          {loop.map((c, i) => (
            <span key={i} className="flex items-center">
              <Quote c={c} />
              {payouts.length > 0 && i % 4 === 3 ? <Payout p={payouts[(i >> 2) % payouts.length]} /> : null}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
