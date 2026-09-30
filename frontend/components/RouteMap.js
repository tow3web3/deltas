'use client';

// The product in one picture: what lands in a coin's dev wallet on the left,
// where each share goes on the right. It runs: a cycle fires every few
// seconds, the payment travels each route and lands as an amount. The handles
// are placeholders on purpose, nobody real is shown receiving money.
import { useEffect, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { PlatformIcon, Burn } from './Icons';
import StockLogo from './StockLogo';
import { getStock } from '../lib/stocks';

const ROW = 52;
const GAP = 6;
const ROUTES = [
  { share: 40, title: 'Holders', sub: 'paid in NVDA, by balance', color: '#2FA8FF', stock: 'NVDA' },
  { share: 25, title: '@yourchannel', sub: 'YouTube · held in its vault', color: '#5B9DFF', platform: 'youtube' },
  { share: 10, title: 'your-project', sub: 'GitHub · claimed, paid direct', color: '#5B9DFF', platform: 'github' },
  { share: 5, title: 'yoursite.com', sub: 'Domain · held in its vault', color: '#5B9DFF', platform: 'domain' },
  { share: 10, title: 'Buyback and burn', sub: 'buys the coin, burns it', color: '#FF7A1A', burn: true },
  { share: 10, title: 'Treasury', sub: 'holds SPY', color: '#F6C343', stock: 'SPY' },
];
const HEIGHT = ROUTES.length * ROW + (ROUTES.length - 1) * GAP;
// What a cycle brings in, in dollars: a short loop of plausible amounts.
const CYCLES = [1240, 860, 1975, 640, 1410];
const money = (n) => `$${n.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;

export default function RouteMap({ className = '' }) {
  const still = useReducedMotion();
  const [n, setN] = useState(0);
  useEffect(() => {
    if (still) return undefined;
    const t = setInterval(() => setN((v) => v + 1), 3600);
    return () => clearInterval(t);
  }, [still]);
  const total = CYCLES[n % CYCLES.length];

  return (
    <div className={`frame overflow-hidden ${className}`}>
      <div className="flex items-center justify-between border-b border-line px-4 py-2.5">
        <span className="label">Routing table · $COIN</span>
        <span className="label flex items-center gap-1.5 text-hood-600">
          <span className="relative flex h-1.5 w-1.5"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-hood-500 opacity-60" /><span className="relative h-1.5 w-1.5 rounded-full bg-hood-500" /></span>
          cycle {String(128 + n).padStart(4, '0')}
        </span>
      </div>

      <div className="grid grid-cols-[minmax(0,0.78fr)_minmax(32px,0.42fr)_minmax(0,1.9fr)] items-center p-4" style={{ minHeight: HEIGHT + 32 }}>
        <div className="border-l-2 border-hood-500 pl-3">
          <div className="label">Dev wallet</div>
          <div className="relative mt-1 h-8 overflow-hidden">
            <AnimatePresence mode="popLayout" initial={false}>
              <motion.div key={total} initial={{ y: 18, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -18, opacity: 0 }} transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }} className="figure absolute inset-0 font-display text-2xl font-medium leading-8 text-ink">
                {money(total)}
              </motion.div>
            </AnimatePresence>
          </div>
          <div className="mt-0.5 text-[11px] text-mut">in fees, this cycle</div>
        </div>

        <svg viewBox={`0 0 100 ${HEIGHT}`} preserveAspectRatio="none" className="w-full" style={{ height: HEIGHT }} aria-hidden>
          {ROUTES.map((r, i) => {
            const y = i * (ROW + GAP) + ROW / 2;
            const d = `M0 ${HEIGHT / 2} C 55 ${HEIGHT / 2}, 45 ${y}, 100 ${y}`;
            return (
              <g key={r.title} fill="none">
                <path d={d} stroke={r.color} strokeOpacity="0.2" strokeWidth={1 + r.share / 14} vectorEffect="non-scaling-stroke" />
                <motion.path
                  key={`${n}-${i}`} d={d} stroke={r.color} strokeWidth="1.6" strokeLinecap="round" vectorEffect="non-scaling-stroke"
                  initial={{ pathLength: 0, opacity: 1 }} animate={{ pathLength: 1, opacity: [1, 1, 0.25] }}
                  transition={{ duration: still ? 0 : 1.1, delay: still ? 0 : 0.15 + i * 0.09, ease: [0.4, 0, 0.2, 1] }}
                />
              </g>
            );
          })}
        </svg>

        <ul className="flex flex-col" style={{ gap: GAP }}>
          {ROUTES.map((r, i) => (
            <li key={r.title} className="relative flex items-center gap-2.5 overflow-hidden rounded-lg border border-line bg-ground pl-3.5 pr-3" style={{ height: ROW }}>
              <span className="absolute inset-y-0 left-0 w-[3px]" style={{ background: r.color }} />
              {r.stock ? <StockLogo address={getStock(r.stock).address} size="h-7 w-7" text="text-[7px]" /> : (
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-tile">
                  {r.platform ? <PlatformIcon platform={r.platform} className="h-3.5 w-3.5" /> : <Burn className="h-4 w-4 text-orange-700" />}
                </span>
              )}
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[13px] font-semibold text-ink">{r.title}</span>
                <span className="block truncate text-[11px] text-mut">{r.sub}</span>
              </span>
              <span className="text-right leading-tight">
                <span className="relative block h-[18px] w-16 overflow-hidden">
                  <AnimatePresence mode="popLayout" initial={false}>
                    <motion.span key={`${total}-${i}`} initial={{ y: 14, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -14, opacity: 0 }} transition={{ duration: 0.4, delay: still ? 0 : 0.9 + i * 0.09, ease: [0.16, 1, 0.3, 1] }} className="figure absolute inset-0 text-right text-sm font-medium text-ink">
                      {money((total * r.share) / 100)}
                    </motion.span>
                  </AnimatePresence>
                </span>
                <span className="label block !text-[9.5px]">{r.share}%</span>
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
