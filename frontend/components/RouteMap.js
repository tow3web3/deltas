'use client';

// The routing drawn as light, in pixels: one beam fans out into channels whose
// thickness is their share, white pulses travel along them. `Fan` is the
// drawing alone, measured to the box it sits in so each channel ends exactly on
// the row or card it feeds (How it works and Why place their destinations at
// its ends). RouteMap is a small live routing panel built on it.
import { useEffect, useId, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { PlatformIcon, Burn } from './Icons';
import StockLogo from './StockLogo';
import { Glass, FlowChip, EASE } from './ui/Light';
import { getXStock } from '../lib/xstocks';

/** The width of an element, kept up to date. Starts at `fallback` so the server and the first paint agree. */
function useWidth(fallback) {
  const ref = useRef(null);
  const [w, setW] = useState(fallback);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof ResizeObserver === 'undefined') return undefined;
    const ro = new ResizeObserver(([entry]) => {
      const v = Math.round(entry.contentRect.width);
      if (v > 0) setW(v);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, w];
}

/**
 * Channels of light out of one source.
 * - from 'left': the source is the middle of the left edge, channels end on the right edge.
 * - from 'top': a trunk comes down at `x` px from the left, channels bend right and end on the right edge.
 * - from 'down': the source is the top centre, channels end on the bottom edge.
 * `ends`: [{ key, share, at }], `at` is where the channel ends along that edge:
 * a fraction of it, or a function (width, height) => px.
 */
export function Fan({ ends, height, from = 'left', x = 0, stub = 0, className = '' }) {
  const [ref, W] = useWidth(320);
  const still = useReducedMotion();
  const id = `fan${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  const H = height;
  const down = from === 'down';
  const max = Math.max(1, ...ends.map((e) => e.share || 1));
  const at = (e) => (typeof e.at === 'function' ? e.at(W, H) : e.at * (down ? W : H));
  const path = (e) => {
    const p = at(e);
    if (from === 'left') return `M 0 ${H / 2} C ${W * 0.45} ${H / 2}, ${W * 0.55} ${p}, ${W} ${p}`;
    if (from === 'top') return `M ${x} 0 C ${x} ${p * 0.75}, ${x + (W - x) * 0.3} ${p}, ${W} ${p}`;
    return `M ${W / 2} 0 C ${W / 2} ${H * 0.55}, ${p} ${H * 0.45}, ${p} ${H}`;
  };
  const src = from === 'left' ? [-stub, H / 2, 0, H / 2] : from === 'top' ? [x, -stub, x, 0] : [W / 2, -stub, W / 2, 0];
  return (
    <div ref={ref} className={`relative ${className}`} style={{ height: H }} aria-hidden="true">
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} className="absolute inset-0 block" style={{ overflow: 'visible' }}>
        <defs>
          {/* user space: a straight channel has no height, and a bounding-box gradient would not paint it */}
          <linearGradient id={`${id}-b`} gradientUnits="userSpaceOnUse" x1={0} y1={0} x2={down ? 0 : W} y2={down ? H : 0}>
            <stop offset="0" stopColor="#2FA8FF" /><stop offset="0.5" stopColor="#5FE3FF" /><stop offset="1" stopColor="#7B5CFF" />
          </linearGradient>
          <filter id={`${id}-g`} filterUnits="userSpaceOnUse" x={-80} y={-80} width={W + 160} height={H + 160}>
            <feGaussianBlur stdDeviation="5" result="b" /><feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>
        {stub > 0 && <line x1={src[0]} y1={src[1]} x2={src[2]} y2={src[3]} stroke={`url(#${id}-b)`} strokeWidth={6} strokeLinecap="round" filter={`url(#${id}-g)`} />}
        {ends.map((e, i) => {
          const w = 2 + ((e.share || 1) / max) * 10;
          const d = path(e);
          return (
            <g key={e.key}>
              <path d={d} stroke={`url(#${id}-b)`} strokeWidth={w} fill="none" strokeLinecap="round" opacity={0.26} />
              <path d={d} stroke={`url(#${id}-b)`} strokeWidth={Math.max(1.5, w * 0.45)} fill="none" strokeLinecap="round" filter={`url(#${id}-g)`} opacity={0.95} />
              {!still && (
                <circle r={Math.max(2.5, w * 0.4)} fill="#fff" filter={`url(#${id}-g)`} opacity={0}>
                  <animate attributeName="opacity" values="0;1;1;0" keyTimes="0;0.1;0.85;1" dur={`${2.6 + i * 0.3}s`} begin={`${i * 0.45}s`} repeatCount="indefinite" />
                  <animateMotion dur={`${2.6 + i * 0.3}s`} begin={`${i * 0.45}s`} repeatCount="indefinite" path={d} keyPoints="0;1" keyTimes="0;1" calcMode="spline" keySplines="0.4 0 0.2 1" />
                </circle>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}

/* ---------------- the live panel ---------------- */

function XLogo({ t }) {
  const s = getXStock(t);
  return <StockLogo address={s.mint} meta={{ symbol: s.symbol, image: s.logo }} size="h-5 w-5" text="text-[5px]" />;
}

const ROW = 52;
const GAP = 6;
const ROUTES = [
  { key: 'holders', share: 40, label: 'Holders', sub: 'NVDAx, by balance', icon: <XLogo t="NVDA" /> },
  { key: 'youtube', share: 25, label: '@yourchannel', sub: 'YouTube vault', icon: <PlatformIcon platform="youtube" className="h-5 w-5" /> },
  { key: 'github', share: 10, label: 'your-project', sub: 'GitHub, paid direct', icon: <PlatformIcon platform="github" className="h-5 w-5" /> },
  { key: 'burn', share: 15, label: 'Buyback and burn', sub: 'on Jupiter', icon: <Burn className="h-5 w-5 text-orange-700" /> },
  { key: 'treasury', share: 10, label: 'Treasury', sub: 'SPYx', icon: <XLogo t="SPY" /> },
];
const HEIGHT = ROUTES.length * ROW + (ROUTES.length - 1) * GAP;
const ENDS = ROUTES.map((r, i) => ({ key: r.key, share: r.share, at: (i * (ROW + GAP) + ROW / 2) / HEIGHT }));
// What a cycle routes, in SOL: a short loop of plausible amounts.
const CYCLES = [4.8, 3.12, 6.25, 2.4, 5.36];
const sol = (n) => n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 3 });

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
    <Glass lit="left" className={`p-5 ${className}`}>
      <div className="mb-4 flex items-center justify-between">
        <span className="label">Routing · your coin</span>
        <span className="label flex items-center gap-2 !text-cyan-500">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-cyan-500 shadow-[0_0_10px_#5FE3FF]" />
          cycle {String(128 + n).padStart(4, '0')}
        </span>
      </div>
      <div className="grid grid-cols-[minmax(0,0.75fr)_minmax(40px,0.55fr)_minmax(0,1.7fr)] items-center">
        <div>
          <div className="label">Dev wallet</div>
          <div className="relative mt-1 h-8 overflow-hidden">
            <AnimatePresence mode="popLayout" initial={false}>
              <motion.div key={total} initial={{ y: 18, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -18, opacity: 0 }} transition={{ duration: 0.45, ease: EASE }} className="figure absolute inset-0 text-2xl font-medium leading-8 text-ink">
                {sol(total)}
              </motion.div>
            </AnimatePresence>
          </div>
          <div className="mt-0.5 text-[11px] text-mut">SOL, this cycle</div>
        </div>
        <Fan ends={ENDS} height={HEIGHT} from="left" />
        <ul className="flex flex-col" style={{ gap: GAP }}>
          {ROUTES.map((r) => (
            <li key={r.key} className="flex items-center" style={{ height: ROW }}>
              <div className="w-full"><FlowChip icon={r.icon} label={r.label} sub={`${sol((total * r.share) / 100)} SOL · ${r.sub}`} share={r.share} /></div>
            </li>
          ))}
        </ul>
      </div>
    </Glass>
  );
}
