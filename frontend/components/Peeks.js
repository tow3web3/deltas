'use client';

// "See it work": four screens of the product, each as a miniature of the real
// one. The canvas with its dev wallet and its routes, the routing editor, the
// record date table and the receipt as it lands in a Telegram group. The tabs
// run on a timer that stops while the pointer is over the frame.
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import StockLogo from './StockLogo';
import { Mark } from './Logo';
import { Arrow, Check, PlatformIcon, Telegram, X as XGlyph, Receipt, Chart, Users, Wallet, Bank } from './Icons';
import { getStock } from '../lib/stocks';
import { BRAND, SITE_HOST } from '../lib/brand';

const EASE = [0.16, 1, 0.3, 1];
const NVDA = getStock('NVDA').address;
const GLD = getStock('GLD').address;
const SPY = getStock('SPY').address;
const PONS = '/logos/tokens/PONS.png';
const TURN = 7000;

const SCENES = [
  { key: 'loop', label: 'The loop', title: 'Fees in, routes out', body: `Your launchpad pays the dev wallet in stocks. Every cycle ${BRAND} applies the routing: holders, you, the treasury, pages.`, where: 'The canvas', href: '/app', url: `${SITE_HOST}/app` },
  { key: 'policy', label: 'The routing', title: 'A few sliders, one balance sheet', body: 'Move a share, the payout ratio adjusts. Presets for the common splits. Change it any time from the dashboard or Telegram.', where: 'The dashboard', href: '/app', url: `${SITE_HOST}/app` },
  { key: 'record', label: 'Record date', title: 'Diamond hands earn more', body: 'Weight ramps from 1x to 2x over 30 days. A wallet that sells resets to zero. A sniper who buys right before the cycle gets nothing.', where: 'Loyalty, in the dashboard', href: '/app', url: `${SITE_HOST}/app` },
  { key: 'receipt', label: 'The receipt', title: 'Every dividend, posted', body: 'A card lands in your Telegram group with a Share on X button. Holders check their own statement at /wallet.', where: 'Your statement', href: '/wallet', url: 'Telegram' },
];

/** The token of the examples: a real coin, with its real logo. */
function Pons({ size = 'h-6 w-6' }) {
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={PONS} alt="PONS" className={`${size} shrink-0 rounded-full border border-line bg-tile object-cover`} />;
}

/* ---------------- 1. the canvas ---------------- */
const LEGS = [
  { name: 'Holders', sub: 'every $PONS holder', pct: 60, color: '#2FA8FF', Icon: Users, asset: NVDA, sym: 'NVDA' },
  { name: 'You', sub: '0x8a2f…41c9', pct: 20, color: '#F4F5F4', Icon: Wallet, sym: 'in kind' },
  { name: 'Treasury', sub: 'retained in stocks', pct: 10, color: '#F6C343', Icon: Bank, asset: SPY, sym: 'SPY' },
  { name: '@yourchannel', sub: 'held in its vault', pct: 10, color: '#5B9DFF', platform: 'youtube', asset: null, sym: 'ETH' },
];
function LoopScene() {
  const n = LEGS.length;
  return (
    <div className="grid h-full grid-cols-[minmax(0,0.9fr)_36px_minmax(0,1fr)] items-stretch sm:grid-cols-[minmax(0,0.85fr)_72px_minmax(0,1fr)]">
      <div className="flex items-center">
        <div className="w-full rounded-xl border border-hood-500/70 bg-paper">
          <div className="flex items-center gap-2.5 border-b border-line px-3 py-2.5">
            <Pons size="h-7 w-7" />
            <div className="min-w-0"><div className="truncate text-[13px] font-semibold text-ink">$PONS</div><div className="truncate font-mono text-[10px] text-mut">dev wallet 0x4c1e…09af</div></div>
          </div>
          <div className="px-3 py-2.5">
            <div className="label !text-[9px]">Paid by the launchpad</div>
            <ul className="mt-2 space-y-1.5">
              {[[NVDA, 'NVDA', '0.0702'], [GLD, 'GLD', '0.0310']].map(([a, s, v]) => (
                <li key={s} className="flex items-center gap-2 text-xs"><StockLogo address={a} size="h-5 w-5" text="text-[6px]" /><span className="text-ink">{s}</span><span className="figure ml-auto text-ink">{v}</span></li>
              ))}
            </ul>
          </div>
          <div className="label flex items-center justify-between border-t border-line px-3 py-2 !text-[9px]"><span>goes out</span><span className="text-hood-600">every 5 min</span></div>
        </div>
      </div>

      <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="h-full w-full" aria-hidden>
        {LEGS.map((l, i) => {
          const y = ((i + 0.5) / n) * 100;
          const d = `M 0 50 C 55 50, 45 ${y}, 100 ${y}`;
          return (
            <g key={l.name}>
              <path d={d} fill="none" stroke={l.color} strokeOpacity="0.22" strokeWidth={1.5 + l.pct / 12} vectorEffect="non-scaling-stroke" />
              <path d={d} fill="none" stroke={l.color} strokeWidth="1.5" vectorEffect="non-scaling-stroke" className="route-dash" style={{ animationDelay: `${i * -0.4}s` }} />
            </g>
          );
        })}
      </svg>

      <ul className="grid gap-2" style={{ gridTemplateRows: `repeat(${n}, minmax(0, 1fr))` }}>
        {LEGS.map((l, i) => (
          <motion.li key={l.name} initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.45, delay: 0.1 + i * 0.07, ease: EASE }} className="flex min-w-0 items-center gap-2.5 rounded-xl border border-line bg-paper py-2 pl-3 pr-3" style={{ borderLeftColor: l.color, borderLeftWidth: 3 }}>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 text-[13px] font-semibold text-ink">
                {l.platform ? <PlatformIcon platform={l.platform} className="h-3.5 w-3.5 shrink-0" /> : <l.Icon className="h-4 w-4 shrink-0" style={{ color: l.color }} />}
                <span className="truncate">{l.name}</span>
              </div>
              <div className="mt-0.5 flex items-center gap-1.5 truncate font-mono text-[10px] text-mut">
                {l.asset !== undefined && <StockLogo address={l.asset} size="h-3.5 w-3.5" text="text-[4px]" />}
                <span className="truncate">{l.sym}<span className="hidden sm:inline"> · {l.sub}</span></span>
              </div>
            </div>
            <span className="figure text-lg font-medium text-ink">{l.pct}%</span>
          </motion.li>
        ))}
      </ul>
    </div>
  );
}

/* ---------------- 2. the routing editor ---------------- */
const PRESETS = [
  { name: '100', h: 100, c: 0, b: 0, t: 0 },
  { name: '80 / 20', h: 80, c: 20, b: 0, t: 0 },
  { name: '70 / 20 / 10', h: 70, c: 20, b: 0, t: 10 },
  { name: '50 / 20 / 15 / 15', h: 50, c: 20, b: 15, t: 15 },
];
function PolicyScene({ still }) {
  const [k, setK] = useState(2);
  useEffect(() => {
    if (still) return undefined;
    const t = setInterval(() => setK((x) => (x + 1) % PRESETS.length), 2400);
    return () => clearInterval(t);
  }, [still]);
  const p = PRESETS[k];
  const rows = [
    { l: 'Holders', v: p.h, c: '#2FA8FF', logo: <StockLogo address={NVDA} size="h-4 w-4" text="text-[5px]" />, sym: 'NVDA' },
    { l: 'You', v: p.c, c: '#F4F5F4', sym: 'in kind' },
    { l: 'Buyback and burn', v: p.b, c: '#FF7A1A', logo: <Pons size="h-4 w-4" />, sym: 'PONS' },
    { l: 'Treasury', v: p.t, c: '#F6C343', logo: <StockLogo address={SPY} size="h-4 w-4" text="text-[5px]" />, sym: 'SPY' },
  ];
  return (
    <div className="mx-auto flex h-full max-w-lg flex-col justify-center">
      <div className="rounded-xl border border-line bg-paper">
        <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-2.5">
          <span className="flex items-center gap-2 text-[13px] font-semibold text-ink"><Pons size="h-5 w-5" />$PONS routing</span>
          <span className="label !text-[9.5px]">payout ratio <span className="figure text-[13px] normal-case tracking-normal text-hood-600">{p.h}%</span></span>
        </div>
        <div className="flex gap-1.5 overflow-x-auto border-b border-line px-4 py-2.5">
          {PRESETS.map((x, i) => (
            <button key={x.name} type="button" onClick={() => setK(i)} className={`figure shrink-0 rounded-md border px-2 py-1 text-[11px] transition-colors ${i === k ? 'border-hood-500 text-ink' : 'border-line text-mut hover:text-ink'}`}>{x.name}</button>
          ))}
        </div>
        <div className="px-4 pt-4">
          <div className="flex h-2 w-full gap-px overflow-hidden rounded-full bg-line">
            {rows.map((r) => <div key={r.l} className="transition-all duration-700 ease-out" style={{ width: `${r.v}%`, background: r.c }} />)}
          </div>
        </div>
        <div className="space-y-3.5 px-4 py-4">
          {rows.map((r) => (
            <div key={r.l} className="grid grid-cols-[1fr_auto] items-center gap-x-4 gap-y-1.5">
              <span className="flex items-center gap-2 text-[13px] text-ink/85">{r.l}<span className="flex items-center gap-1 font-mono text-[10px] text-mut">{r.logo}{r.sym}</span></span>
              <span className="figure text-sm font-medium text-ink">{r.v}%</span>
              <div className="relative col-span-2 h-1 rounded-full bg-line">
                <div className="absolute inset-y-0 left-0 rounded-full transition-all duration-700 ease-out" style={{ width: `${r.v}%`, background: r.c }} />
                <div className="absolute top-1/2 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-paper transition-all duration-700 ease-out" style={{ left: `${r.v}%`, background: r.c }} />
              </div>
            </div>
          ))}
        </div>
        <div className="flex items-center justify-between gap-3 border-t border-line bg-ground/60 px-4 py-2.5 text-xs text-mut">
          <span className="flex items-center gap-1.5">Next cycle <StockLogo address={NVDA} size="h-4 w-4" text="text-[5px]" /><span className="figure text-ink">0.0421 NVDA</span> in the wallet</span>
          <span className="rounded-lg bg-hood-500 px-2.5 py-1 text-[11px] font-semibold text-coal">Save</span>
        </div>
      </div>
    </div>
  );
}

/* ---------------- 3. the record date ---------------- */
const WALLETS = [
  { name: '0x8a2f…41c9', days: 61, mult: 2.0, note: 'holding 61 days' },
  { name: '0x3d17…b0e2', days: 15, mult: 1.5, note: 'holding 15 days' },
  { name: '0xc4a9…77de', days: 2, mult: 1.07, note: 'sold 2 days ago, clock reset' },
  { name: '0xf01e…9a33', days: 0, mult: 0, note: 'bought 4 minutes ago, below min hold' },
];
function RecordScene() {
  return (
    <div className="mx-auto flex h-full max-w-xl flex-col justify-center">
      <div className="rounded-xl border border-line bg-paper">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-4 py-2.5">
          <span className="flex items-center gap-2 text-[13px] font-semibold text-ink"><Pons size="h-5 w-5" />Record date · 4:00 pm ET</span>
          <span className="label !text-[9.5px] !text-gold-600">1x to 2x over 30 days</span>
        </div>
        <div className="label grid grid-cols-[96px_1fr_64px] gap-3 border-b border-line px-4 py-2 !text-[9px] sm:grid-cols-[110px_1fr_70px]">
          <span>Wallet</span><span>Held, of the 30 day ramp</span><span className="text-right">Weight</span>
        </div>
        <ul className="divide-y divide-line">
          {WALLETS.map((w, i) => (
            <motion.li key={w.name} initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.45, delay: 0.15 + i * 0.12, ease: EASE }} className="grid grid-cols-[96px_1fr_64px] items-center gap-3 px-4 py-2.5 sm:grid-cols-[110px_1fr_70px]">
              <span className="font-mono text-[11.5px] text-ink/85">{w.name}</span>
              <div className="min-w-0">
                <div className="h-1 rounded-full bg-line">
                  <motion.div className={`h-full rounded-full ${w.mult >= 2 ? 'bg-gold-400' : 'bg-hood-500'}`} initial={{ width: 0 }} animate={{ width: `${Math.min(100, (w.days / 30) * 100)}%` }} transition={{ duration: 0.9, delay: 0.3 + i * 0.12, ease: EASE }} />
                </div>
                <div className="mt-1 truncate text-[11px] text-mut">{w.note}</div>
              </div>
              <span className={`figure text-right text-sm font-medium ${w.mult === 0 ? 'text-down' : 'text-ink'}`}>{w.mult === 0 ? 'skipped' : `${w.mult.toFixed(2)}x`}</span>
            </motion.li>
          ))}
        </ul>
        <p className="border-t border-line bg-ground/60 px-4 py-2.5 text-xs text-mut">Weight = balance x multiplier. Voting weight follows the same rule.</p>
      </div>
    </div>
  );
}

/* ---------------- 4. the receipt, in Telegram ---------------- */
function ReceiptScene() {
  const enter = (delay) => ({ initial: { opacity: 0, y: 10 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.45, delay, ease: EASE } });
  return (
    <div className="mx-auto flex h-full max-w-md flex-col justify-center">
      <div className="overflow-hidden rounded-xl border border-line bg-[#0E1621]">
        <div className="flex items-center gap-2.5 border-b border-white/5 bg-[#17212B] px-3.5 py-2.5">
          <Pons size="h-8 w-8" />
          <div className="min-w-0 flex-1"><div className="truncate text-[13px] font-semibold text-white">$PONS holders</div><div className="text-[11px] text-white/45">1,204 members</div></div>
          <Telegram className="h-5 w-5 text-[#2AABEE]" />
        </div>
        <div className="space-y-2.5 px-3 py-3.5">
          <motion.div {...enter(0.15)} className="flex items-end gap-2">
            <Mark className="h-7 w-7 shrink-0 rounded-full" />
            <div className="min-w-0 max-w-[310px] flex-1">
              <div className="overflow-hidden rounded-xl rounded-bl-sm bg-[#182533]">
                <div className="px-3 pt-2 text-[12px] font-semibold text-[#6AB2F2]">{BRAND} <span className="font-normal text-white/35">bot</span></div>
                <div className="m-2 overflow-hidden rounded-lg border border-line bg-paper">
                  <div className="label flex items-center justify-between border-b border-line px-3 py-1.5 !text-[9px]"><span className="flex items-center gap-1 text-hood-600"><Check className="h-2.5 w-2.5" />Dividend paid</span><span>4:00 pm ET</span></div>
                  <div className="flex items-center gap-3 px-3 py-3">
                    <StockLogo address={NVDA} size="h-11 w-11" text="text-xs" />
                    <div className="min-w-0">
                      <div className="flex items-center gap-1 text-[11px] text-mut">Holders of <Pons size="h-3.5 w-3.5" /> $PONS received</div>
                      <div className="figure text-2xl font-medium leading-tight text-ink">0.0421 <span className="text-hood-600">NVDA</span></div>
                      <div className="text-[11px] text-mut">412 wallets · loyalty-weighted</div>
                    </div>
                  </div>
                </div>
              </div>
              <motion.div {...enter(0.45)} className="mt-1 grid grid-cols-3 gap-1 text-[11px] font-medium text-white/90">
                <span className="flex items-center justify-center gap-1.5 rounded-md bg-white/10 py-1.5"><XGlyph className="h-3 w-3" />Share</span>
                <span className="flex items-center justify-center gap-1.5 rounded-md bg-white/10 py-1.5"><Receipt className="h-3.5 w-3.5" />Receipt</span>
                <span className="flex items-center justify-center gap-1.5 rounded-md bg-white/10 py-1.5"><Chart className="h-3.5 w-3.5" />Dashboard</span>
              </motion.div>
            </div>
          </motion.div>
          <motion.div {...enter(0.9)} className="flex justify-end">
            <div className="rounded-xl rounded-br-sm bg-[#2B5278] px-3 py-1.5 text-[12.5px] text-white">holding since day one <span className="ml-1 text-[10px] text-white/45">4:01 pm</span></div>
          </motion.div>
        </div>
      </div>
      <div className="mt-3 flex items-center justify-center gap-1.5 text-xs text-mut"><StockLogo address={NVDA} size="h-4 w-4" text="text-[5px]" /><StockLogo address={GLD} size="h-4 w-4" text="text-[5px]" /><StockLogo address={SPY} size="h-4 w-4" text="text-[5px]" /><span className="ml-1">Every cycle, every stock, one card.</span></div>
    </div>
  );
}

export default function Peeks() {
  const [i, setI] = useState(0);
  const [paused, setPaused] = useState(false);
  const still = useReducedMotion();
  const held = paused || still;
  useEffect(() => {
    if (held) return undefined;
    const t = setInterval(() => setI((x) => (x + 1) % SCENES.length), TURN);
    return () => clearInterval(t);
  }, [held, i]);
  const scene = SCENES[i];

  return (
    <div id="peeks" className="scroll-mt-20">
      <div className="max-w-2xl">
        <div className="eyebrow mb-3">Sneak peek</div>
        <h2 className="font-display text-3xl font-medium tracking-tight text-ink sm:text-4xl">See it work</h2>
      </div>

      <div className="frame mt-7 overflow-hidden" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}>
        {/* the four screens, and the time left on the one showing */}
        <div role="tablist" className="grid grid-cols-4 divide-x divide-line border-b border-line">
          {SCENES.map((s, k) => (
            <button key={s.key} type="button" role="tab" aria-selected={k === i} onClick={() => setI(k)} className={`relative flex flex-col gap-1 px-3 py-3 text-left transition-colors sm:flex-row sm:items-baseline sm:gap-2.5 sm:px-5 ${k === i ? 'bg-tile/50' : 'hover:bg-tile/25'}`}>
              <span className={`figure text-xs ${k === i ? 'text-hood-600' : 'text-mut'}`}>{String(k + 1).padStart(2, '0')}</span>
              <span className={`text-[12.5px] leading-tight sm:text-sm ${k === i ? 'font-semibold text-ink' : 'text-mut'}`}>{s.label}</span>
              {k === i && (
                <motion.span key={`${i}-${held}`} className="absolute inset-x-0 bottom-0 h-px origin-left bg-hood-500" initial={{ scaleX: held ? 1 : 0 }} animate={{ scaleX: 1 }} transition={{ duration: held ? 0 : TURN / 1000, ease: 'linear' }} />
              )}
            </button>
          ))}
        </div>

        <div className="grid lg:grid-cols-[minmax(0,0.72fr)_minmax(0,1.5fr)] lg:divide-x lg:divide-line">
          <div className="flex flex-col justify-between gap-6 border-b border-line p-6 lg:border-b-0">
            <AnimatePresence mode="wait" initial={false}>
              <motion.div key={scene.key} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.3, ease: EASE }}>
                <h3 className="font-display text-2xl font-medium leading-tight tracking-tight text-ink">{scene.title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-mut">{scene.body}</p>
              </motion.div>
            </AnimatePresence>
            <div className="border-t border-line pt-4">
              <div className="label !text-[9.5px]">Where you see it</div>
              <Link href={scene.href} className="group mt-1.5 inline-flex items-center gap-1.5 text-sm font-semibold text-ink transition-colors hover:text-hood-600">{scene.where}<Arrow className="h-3.5 w-3.5 text-mut transition-transform group-hover:translate-x-0.5 group-hover:text-hood-600" /></Link>
            </div>
          </div>

          <div className="min-w-0 bg-ground" style={scene.key === 'loop' ? { backgroundImage: 'radial-gradient(circle, rgba(244,245,244,0.07) 1px, transparent 1px)', backgroundSize: '18px 18px' } : undefined}>
            <div className="label flex items-center justify-between border-b border-line bg-paper/60 px-4 py-2 !text-[9.5px]">
              <span className="normal-case tracking-normal">{scene.url}</span>
              <span>{scene.label}</span>
            </div>
            <div className="h-[400px] p-4 sm:h-[390px] sm:p-6">
              <AnimatePresence mode="wait" initial={false}>
                <motion.div key={scene.key} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.3, ease: EASE }} className="h-full">
                  {scene.key === 'loop' && <LoopScene />}
                  {scene.key === 'policy' && <PolicyScene still={still} />}
                  {scene.key === 'record' && <RecordScene />}
                  {scene.key === 'receipt' && <ReceiptScene />}
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
