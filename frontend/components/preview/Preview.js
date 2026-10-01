'use client';

// The next look of DELTAS, in one page: a deep ground lit by the logo's glow,
// glass panels with one lit edge, Geist, and the routing drawn as light that
// enters once and leaves in channels. Nothing here uses the old frame grammar.
import { useEffect, useRef, useState } from 'react';
import { motion, useInView } from 'motion/react';
import { PlatformIcon } from '../Icons';
import { Mark } from '../Logo';

const G = {
  ground: '#05070C', ink: '#F3F5F9', mut: '#8A93A6', dim: '#5A6275',
  blue: '#2FA8FF', violet: '#7B5CFF', cyan: '#5FE3FF',
  glass: 'rgba(255,255,255,0.035)', edge: 'rgba(255,255,255,0.08)',
};
const MONO = 'var(--font-geist-mono), ui-monospace, monospace';
const EASE = [0.16, 1, 0.3, 1];

/* ---------------- primitives ---------------- */

/** A glass panel with one lit edge, on the side the light comes from. */
function Glass({ children, className = '', lit = 'left', style = {} }) {
  const edge = lit === 'left' ? { borderLeftColor: 'rgba(95,227,255,0.55)' } : lit === 'top' ? { borderTopColor: 'rgba(95,227,255,0.55)' } : {};
  return (
    <div className="relative overflow-hidden rounded-[22px] border" style={{ background: G.glass, borderColor: G.edge, backdropFilter: 'blur(18px)', ...edge, ...style }}>
      <div aria-hidden="true" className="pointer-events-none absolute inset-0" style={{ background: 'linear-gradient(135deg, rgba(255,255,255,0.05), transparent 45%)' }} />
      {/* the layout classes belong to the content, not the glass */}
      <div className={`relative ${className}`}>{children}</div>
    </div>
  );
}

function Label({ children, className = '' }) {
  return <div className={`text-[11px] uppercase tracking-[0.2em] ${className}`} style={{ fontFamily: MONO, color: G.dim }}>{children}</div>;
}

function Num({ children, className = '' }) {
  return <div className={`font-medium tabular-nums tracking-[-0.03em] ${className}`} style={{ color: G.ink, fontVariantNumeric: 'tabular-nums' }}>{children}</div>;
}

/** The accent, as the logo makes it: blue sliding into violet. */
const grad = 'linear-gradient(90deg, #2FA8FF 0%, #5FE3FF 45%, #7B5CFF 100%)';

/* ---------------- the light flow ---------------- */

const CHANNELS = [
  { key: 'holders', label: 'Holders', sub: 'paid in SOL, by balance', share: 50, icon: 'holders' },
  { key: 'page', label: '@yourchannel', sub: 'YouTube · its own vault', share: 20, icon: 'youtube' },
  { key: 'stock', label: 'Treasury', sub: 'holds NVDAx', share: 15, icon: 'stock' },
  { key: 'burn', label: 'Buyback and burn', sub: 'buys $DELTAS, burns it', share: 10, icon: 'burn' },
  { key: 'phone', label: '+33 • •• •• •• 78', sub: 'a phone number · WhatsApp', share: 5, icon: 'phone' },
];

function IconFor({ kind }) {
  if (kind === 'youtube' || kind === 'phone') return <PlatformIcon platform={kind} className="h-5 w-5" />;
  if (kind === 'stock') return <img src="/logos/stocks/NVDA.png" alt="" className="h-5 w-5 rounded-full" />;
  if (kind === 'burn') return <span className="block h-2.5 w-2.5 rounded-full" style={{ background: '#FF7A1A', boxShadow: '0 0 12px #FF7A1A' }} />;
  return <span className="block h-2.5 w-2.5 rounded-full" style={{ background: G.cyan, boxShadow: `0 0 12px ${G.cyan}` }} />;
}

/**
 * One beam enters on the left, splits into channels whose thickness is their
 * share, pulses travel along them. SVG, so it stays crisp at any size.
 */
function Flow() {
  const W = 640, H = 420, x0 = 40, x1 = 430;
  const ys = [60, 140, 220, 300, 380];
  const path = (y) => `M ${x0} ${H / 2} C ${x0 + 170} ${H / 2}, ${x1 - 150} ${y}, ${x1} ${y}`;
  return (
    <div className="relative">
      <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" style={{ overflow: 'visible' }}>
        <defs>
          <linearGradient id="pv-beam" x1="0" x2="1">
            <stop offset="0" stopColor={G.blue} /><stop offset="0.5" stopColor={G.cyan} /><stop offset="1" stopColor={G.violet} />
          </linearGradient>
          <filter id="pv-glow" x="-20%" y="-50%" width="140%" height="200%">
            <feGaussianBlur stdDeviation="6" result="b" /><feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>
        {/* the source beam */}
        <line x1={-40} y1={H / 2} x2={x0} y2={H / 2} stroke="url(#pv-beam)" strokeWidth={14} strokeLinecap="round" filter="url(#pv-glow)" opacity={0.9} />
        {CHANNELS.map((c, i) => {
          const w = 2 + (c.share / 50) * 10;
          return (
            <g key={c.key}>
              <path d={path(ys[i])} stroke="url(#pv-beam)" strokeWidth={w} fill="none" strokeLinecap="round" opacity={0.28} />
              <path d={path(ys[i])} stroke="url(#pv-beam)" strokeWidth={Math.max(1.5, w * 0.45)} fill="none" strokeLinecap="round" filter="url(#pv-glow)" opacity={0.95} />
              <circle r={Math.max(3, w * 0.5)} fill="#fff" filter="url(#pv-glow)">
                <animateMotion dur={`${2.6 + i * 0.35}s`} begin={`${i * 0.5}s`} repeatCount="indefinite" path={path(ys[i])} keyPoints="0;1" keyTimes="0;1" calcMode="spline" keySplines="0.4 0 0.2 1" />
              </circle>
            </g>
          );
        })}
      </svg>
      {/* the destinations, as glass chips at the end of each channel */}
      <div className="pointer-events-none absolute inset-y-0 right-0 flex w-[42%] flex-col justify-between py-[2%]">
        {CHANNELS.map((c, i) => (
          <motion.div key={c.key} initial={{ opacity: 0, x: 14 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 + i * 0.12, duration: 0.7, ease: EASE }}
            className="flex items-center gap-3 rounded-2xl border px-3.5 py-2.5" style={{ background: 'rgba(5,7,12,0.7)', borderColor: G.edge, backdropFilter: 'blur(12px)' }}>
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl" style={{ background: 'rgba(255,255,255,0.05)' }}><IconFor kind={c.icon} /></span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[13px] font-medium" style={{ color: G.ink }}>{c.label}</span>
              <span className="block truncate text-[11px]" style={{ color: G.mut }}>{c.sub}</span>
            </span>
            <span className="text-sm font-medium tabular-nums" style={{ color: G.cyan, fontFamily: MONO }}>{c.share}%</span>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

/* ---------------- sections ---------------- */

function Nav() {
  return (
    <header className="sticky top-0 z-30">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4">
        <div className="flex items-center gap-2.5">
          <Mark className="h-9 w-9" />
          <span className="text-[17px] font-medium tracking-[-0.01em]" style={{ color: G.ink }}>DELTAS</span>
        </div>
        <nav className="hidden items-center gap-7 text-[14px] md:flex" style={{ color: G.mut }}>
          {['Pages', 'Claim', 'Guide', 'Stocks'].map((l) => <span key={l} className="transition-colors hover:text-white">{l}</span>)}
        </nav>
        <div className="flex items-center gap-3">
          <span className="hidden rounded-full border px-3 py-1.5 text-[12px] md:inline" style={{ borderColor: G.edge, color: G.mut, fontFamily: MONO }}>◎ Solana</span>
          <button type="button" className="rounded-full px-4 py-2 text-[14px] font-medium text-[#05070C]" style={{ background: grad, boxShadow: '0 0 30px rgba(47,168,255,0.35)' }}>Open the dashboard</button>
        </div>
      </div>
    </header>
  );
}

function Hero() {
  return (
    <section className="relative mx-auto grid max-w-6xl items-center gap-12 px-5 pb-28 pt-16 lg:grid-cols-[1fr_1.1fr]">
      <div className="relative">
        <Label className="mb-5">Fee routing · Solana first</Label>
        <h1 className="text-[52px] font-medium leading-[0.98] tracking-[-0.035em] sm:text-[72px]" style={{ color: G.ink }}>
          Every fee<br />your coin earns,<br />
          <span style={{ backgroundImage: grad, WebkitBackgroundClip: 'text', color: 'transparent' }}>sent where you say.</span>
        </h1>
        <p className="mt-7 max-w-md text-[17px] leading-relaxed" style={{ color: G.mut }}>
          Holders, a treasury in real stocks, a buyback, a wallet. And any page on the internet: a YouTube channel, a GitHub repo, a phone number. Every cycle, on chain, with a receipt.
        </p>
        <div className="mt-9 flex flex-wrap items-center gap-3">
          <button type="button" className="rounded-full px-5 py-3 text-[15px] font-medium text-[#05070C]" style={{ background: grad, boxShadow: '0 0 40px rgba(47,168,255,0.35)' }}>Route a coin</button>
          <button type="button" className="rounded-full border px-5 py-3 text-[15px] font-medium" style={{ borderColor: G.edge, color: G.ink, background: G.glass }}>Claim a page</button>
          <span className="ml-2 text-[13px]" style={{ color: G.dim, fontFamily: MONO }}>pump.fun creator fees · xStocks · Jupiter</span>
        </div>
      </div>
      <Glass lit="left" className="p-5 sm:p-7">
        <div className="mb-4 flex items-center justify-between">
          <Label>Routing · $DELTAS · cycle 0129</Label>
          <span className="flex items-center gap-2 text-[11px] uppercase tracking-[0.2em]" style={{ fontFamily: MONO, color: G.cyan }}><span className="h-1.5 w-1.5 animate-pulse rounded-full" style={{ background: G.cyan, boxShadow: `0 0 10px ${G.cyan}` }} />live</span>
        </div>
        <Flow />
        <div className="mt-5 flex items-end justify-between border-t pt-4" style={{ borderColor: G.edge }}>
          <div><Label>In the dev wallet</Label><Num className="mt-1 text-3xl">4.82 <span className="text-base" style={{ color: G.mut }}>SOL</span></Num></div>
          <div className="text-right"><Label>Next cycle</Label><Num className="mt-1 text-3xl" style={{ fontFamily: MONO }}>14:32</Num></div>
        </div>
      </Glass>
    </section>
  );
}

function Count({ to, prefix = '', suffix = '', decimals = 0 }) {
  const ref = useRef(null);
  const seen = useInView(ref, { once: true });
  const [v, setV] = useState(0);
  useEffect(() => {
    if (!seen) return undefined;
    const t0 = performance.now(); let raf;
    const step = (t) => { const p = Math.min(1, (t - t0) / 1400); setV(to * (1 - Math.pow(1 - p, 3))); if (p < 1) raf = requestAnimationFrame(step); };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [seen, to]);
  return <span ref={ref}>{prefix}{v.toLocaleString('en-US', { maximumFractionDigits: decimals, minimumFractionDigits: decimals })}{suffix}</span>;
}

function Stats() {
  const cells = [
    { label: 'Routed, all time', v: 23686, prefix: '$' },
    { label: 'Cycles run', v: 58 },
    { label: 'Coins routing', v: 3 },
    { label: 'Stocks it can pay', v: 1171 },
  ];
  return (
    <section className="mx-auto max-w-6xl px-5">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {cells.map((c, i) => (
          <motion.div key={c.label} initial={{ opacity: 0, y: 14 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.08, duration: 0.6, ease: EASE }}>
            <Glass lit="top" className="px-6 py-6">
              <Label>{c.label}</Label>
              <Num className="mt-3 text-[40px] leading-none"><Count to={c.v} prefix={c.prefix || ''} /></Num>
            </Glass>
          </motion.div>
        ))}
      </div>
    </section>
  );
}

/** The diagonal cut of the logo, as a section divider. */
function Cut() {
  return <div aria-hidden="true" className="mx-auto my-24 h-px max-w-6xl" style={{ background: 'linear-gradient(90deg, transparent, rgba(95,227,255,0.6) 30%, rgba(123,92,255,0.6) 70%, transparent)', transform: 'skewY(-2deg)' }} />;
}

function Destinations() {
  const items = [
    { k: 'youtube', name: 'A YouTube channel', how: 'Owner signs in with Google' },
    { k: 'github', name: 'A GitHub repo', how: 'Owner signs in with GitHub' },
    { k: 'x', name: 'An X account', how: 'Owner signs in with X' },
    { k: 'phone', name: 'A phone number', how: 'A code by WhatsApp' },
    { k: 'domain', name: 'A website', how: 'A DNS record' },
    { k: 'tiktok', name: 'A TikTok', how: 'Owner signs in with TikTok' },
  ];
  return (
    <section className="mx-auto grid max-w-6xl gap-10 px-5 lg:grid-cols-[0.8fr_1.2fr]">
      <div>
        <Label className="mb-4">Destinations</Label>
        <h2 className="text-[36px] font-medium leading-[1.05] tracking-[-0.03em] sm:text-[44px]" style={{ color: G.ink }}>Any page on the internet is a destination.</h2>
        <p className="mt-5 max-w-sm text-[16px] leading-relaxed" style={{ color: G.mut }}>Paste a link. The page gets a vault of its own, paid every cycle. Its owner proves it and takes what waited. No permission, no account, no gas.</p>
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        {items.map((it, i) => (
          <motion.div key={it.k} initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0, margin: '0px 0px 400px 0px' }} transition={{ delay: i * 0.06, duration: 0.5, ease: EASE }}>
            <Glass className="flex items-center gap-4 px-4 py-4" lit="none">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl" style={{ background: 'rgba(255,255,255,0.05)' }}><PlatformIcon platform={it.k} className="h-5 w-5" /></span>
              <span className="min-w-0"><span className="block text-[15px] font-medium" style={{ color: G.ink }}>{it.name}</span><span className="block text-[12.5px]" style={{ color: G.mut }}>{it.how}</span></span>
            </Glass>
          </motion.div>
        ))}
      </div>
    </section>
  );
}

function Token() {
  return (
    <section className="mx-auto max-w-6xl px-5">
      <Glass lit="left" className="grid gap-8 p-7 sm:p-9 lg:grid-cols-[auto_1fr_auto] lg:items-center">
        <div className="flex items-center gap-5">
          <div className="relative"><Mark className="h-20 w-20" /><span aria-hidden="true" className="absolute inset-0 -z-10 rounded-full blur-2xl" style={{ background: 'rgba(47,168,255,0.35)' }} /></div>
          <div><Label>The token</Label><div className="mt-1 text-[34px] font-medium tracking-[-0.03em]" style={{ color: G.ink }}>$DELTAS</div><div className="text-[13px]" style={{ color: G.mut }}>on Solana · routes its own fees</div></div>
        </div>
        <div className="min-w-0">
          <Label className="mb-2">Mint address</Label>
          <div className="flex items-center justify-between gap-4 rounded-2xl border px-4 py-3" style={{ borderColor: G.edge, background: 'rgba(0,0,0,0.3)' }}>
            <span className="truncate text-[14px]" style={{ fontFamily: MONO, color: G.ink }}>Soon · the mint is posted here first</span>
            <span className="text-[12px]" style={{ color: G.cyan, fontFamily: MONO }}>copy</span>
          </div>
        </div>
        <div className="flex gap-2 lg:flex-col">
          <button type="button" className="rounded-full px-5 py-2.5 text-[14px] font-medium text-[#05070C]" style={{ background: grad }}>Chart and buy</button>
          <button type="button" className="rounded-full border px-5 py-2.5 text-[14px] font-medium" style={{ borderColor: G.edge, color: G.ink }}>Mint</button>
        </div>
      </Glass>
    </section>
  );
}

export function Preview() {
  return (
    <div className="min-h-screen pb-32" style={{ background: G.ground, color: G.ink }}>
      {/* the light: the logo's glow leaking from the top left, and a faint violet from the bottom right */}
      <div aria-hidden="true" className="pointer-events-none fixed inset-0 -z-0">
        <div className="absolute -left-40 -top-56 h-[720px] w-[720px] rounded-full blur-3xl" style={{ background: 'radial-gradient(circle, rgba(47,168,255,0.28), transparent 60%)' }} />
        <div className="absolute -bottom-72 -right-48 h-[760px] w-[760px] rounded-full blur-3xl" style={{ background: 'radial-gradient(circle, rgba(123,92,255,0.22), transparent 60%)' }} />
        <div className="absolute inset-0" style={{ backgroundImage: 'radial-gradient(rgba(255,255,255,0.05) 1px, transparent 1px)', backgroundSize: '32px 32px', maskImage: 'radial-gradient(ellipse 70% 60% at 50% 30%, black, transparent)' }} />
      </div>
      <div className="relative">
        <Nav />
        <Hero />
        <Stats />
        <Cut />
        <Destinations />
        <Cut />
        <Token />
      </div>
    </div>
  );
}
