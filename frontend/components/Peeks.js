'use client';

// "See it work": four screens of the product, each a miniature of the real one,
// told with one pump.fun coin on Solana. The loop (the creator fee collected,
// the routing drawn as channels of light), the routing editor, the record date
// and the receipt with its Solscan links. The tabs turn on a timer that stops
// while the pointer is over the frame.
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import StockLogo from './StockLogo';
import { Arrow, External, PlatformIcon, Wallet } from './Icons';
import { Flow, FlowChip, EASE } from './ui/Light';
import { getXStock } from '../lib/xstocks';
import { BRAND, SITE_HOST } from '../lib/brand';

const TURN = 7000;
const SOL_MINT = 'So11111111111111111111111111111111111111112';
// The coin of the examples. It is drawn, not a real logo: it stands for any pump.fun coin.
const COIN = '$GLOW';

const SCENES = [
  { key: 'loop', label: 'The loop', title: 'Fees in, channels out', body: `pump.fun sets a creator fee aside on every trade of your coin. Each cycle ${BRAND} collects it into the dev wallet, keeps 0.02 SOL for fees and routes the rest: holders, you, a treasury, a page, a buyback.`, where: 'The canvas', href: '/app', url: `${SITE_HOST}/app` },
  { key: 'policy', label: 'The routing', title: 'A few sliders, every destination', body: 'Move a share and the payout ratio follows. Presets for the common splits. Change it any time from the dashboard or the Telegram bot.', where: 'The dashboard', href: '/app', url: `${SITE_HOST}/app` },
  { key: 'record', label: 'Record date', title: 'Diamond hands earn more', body: 'Weight ramps from 1x to 2x over 30 days. A wallet that sells starts again from zero. A sniper who buys right before the cycle gets nothing.', where: 'Loyalty, in the dashboard', href: '/app', url: `${SITE_HOST}/app` },
  { key: 'receipt', label: 'The receipt', title: 'Every cycle, on the record', body: 'Each cycle leaves a public receipt: what came in, what each destination got, and every transaction on Solscan. Holders find their own statement at /wallet.', where: 'Your statement', href: '/wallet', url: `${SITE_HOST}/receipt/129` },
];

/* ---------------- small parts ---------------- */

/** The example coin: an orb of light on the logo's blue. */
function Coin({ className = 'h-6 w-6' }) {
  return (
    <span aria-hidden="true" className={`inline-flex shrink-0 items-center justify-center rounded-full ${className}`} style={{ background: 'radial-gradient(circle at 35% 30%, #5FE3FF, #2FA8FF 55%, #123A7A)', boxShadow: '0 0 14px rgba(47,168,255,0.45)' }}>
      <span className="h-[34%] w-[34%] rounded-full bg-white/90" />
    </span>
  );
}
function Sol({ size = 'h-4 w-4' }) {
  return <StockLogo address={SOL_MINT} meta={{ symbol: 'SOL', image: '/sol.png' }} size={size} text="text-[5px]" />;
}
function XStock({ t, size = 'h-4 w-4' }) {
  const x = getXStock(t);
  return <StockLogo address={x?.mint} meta={{ symbol: x?.symbol || t, image: x?.logo }} size={size} text="text-[5px]" />;
}
/** The glass sheet every mock sits on. */
function Sheet({ children, className = '' }) {
  return <div className={`overflow-hidden rounded-2xl border border-white/10 bg-[rgba(5,7,12,0.72)] shadow-soft backdrop-blur-md ${className}`}>{children}</div>;
}
/** A transaction, as Solscan names it. */
function Tx({ label, hash, note, className = '' }) {
  return (
    <div className={`flex items-center justify-between gap-3 font-mono text-[11px] ${className}`}>
      <span className="text-mut">{label}{note && <span className="text-dim"> · {note}</span>}</span>
      <span className="inline-flex items-center gap-1 text-hood-600">{hash}<External className="h-3 w-3" /></span>
    </div>
  );
}
const dot = (color) => <span className="block h-2.5 w-2.5 rounded-full" style={{ background: color, boxShadow: `0 0 12px ${color}` }} />;

/* ---------------- 1. the loop ---------------- */
const LEGS = [
  { key: 'holders', share: 50, label: 'Holders', sub: 'in SOL, by balance', icon: dot('#5FE3FF') },
  { key: 'you', share: 20, label: 'You', sub: '7xKX…9fGh', icon: <Wallet className="h-4 w-4 text-ink" /> },
  { key: 'treasury', share: 15, label: 'Treasury', sub: 'holds SPYx', icon: <XStock t="SPY" size="h-5 w-5" /> },
  { key: 'page', share: 10, label: '@yourchannel', sub: 'YouTube · its vault', icon: <PlatformIcon platform="youtube" className="h-5 w-5" /> },
  { key: 'burn', share: 5, label: 'Buyback and burn', sub: `buys ${COIN}, burns it`, icon: dot('#FF7A1A') },
];
const channels = LEGS.map((l) => ({ key: l.key, share: l.share, node: <FlowChip icon={l.icon} label={l.label} sub={l.sub} share={l.share} /> }));

function LoopScene() {
  return (
    <div className="flex h-full flex-col gap-3 md:mx-auto md:grid md:max-w-[740px] md:grid-cols-[minmax(0,0.78fr)_minmax(0,1.5fr)] md:items-center md:gap-0">
      {/* the dev wallet, where pump.fun's creator fee is collected */}
      <Sheet className="relative z-10 hidden md:block">
        <div className="flex items-center gap-2.5 border-b border-white/10 px-3.5 py-3">
          <Coin className="h-8 w-8" />
          <div className="min-w-0"><div className="truncate text-[13px] font-medium text-ink">{COIN}</div><div className="truncate font-mono text-[10px] text-mut">pump.fun · dev wallet</div></div>
        </div>
        <div className="space-y-2 px-3.5 py-3">
          <div className="label !text-[9px]">Creator fee collected</div>
          <div className="flex items-baseline gap-2"><span className="self-center"><Sol size="h-5 w-5" /></span><span className="figure text-2xl font-medium text-ink">4.82</span><span className="text-xs text-mut">SOL</span></div>
          <div className="flex items-center justify-between font-mono text-[10px] text-mut"><span>kept for fees</span><span className="text-ink/80">0.02 SOL</span></div>
          <div className="flex items-center justify-between font-mono text-[10px] text-mut"><span>routed</span><span className="text-cyan-500">4.80 SOL</span></div>
        </div>
        <div className="label flex items-center justify-between border-t border-white/10 px-3.5 py-2 !text-[9px]"><span>cycle 0129</span><span className="text-cyan-500">every 5 min</span></div>
      </Sheet>
      {/* narrower, the wallet is one line above the channels */}
      <div className="flex items-center gap-2.5 rounded-2xl border border-white/10 bg-white/[0.03] px-3 py-2 md:hidden">
        <Coin className="h-6 w-6" />
        <span className="text-[13px] font-medium text-ink">{COIN}</span>
        <span className="ml-auto flex items-center gap-1.5 text-xs text-mut"><Sol /><span className="figure text-ink">4.82 SOL</span> collected</span>
      </div>
      {/* two sizes of the same flow: Flow names its gradient and glow after its size, so the ids stay apart */}
      <div className="mx-auto w-full min-w-0 max-w-[340px] pl-6 md:hidden"><Flow width={560} height={600} split={0.42} channels={channels} /></div>
      <div className="hidden min-w-0 md:block md:pl-3"><Flow width={600} height={420} split={0.5} channels={channels} /></div>
    </div>
  );
}

/* ---------------- 2. the routing editor ---------------- */
const PRESETS = [
  { name: '100', v: [100, 0, 0, 0] },
  { name: '80 / 20', v: [80, 20, 0, 0] },
  { name: '70 / 20 / 10', v: [70, 20, 0, 10] },
  { name: '50 / 20 / 15 / 15', v: [50, 20, 15, 15] },
];
const ROWS = [
  { l: 'Holders', sym: 'SOL', logo: <Sol size="h-3.5 w-3.5" /> },
  { l: 'You', sym: '7xKX…9fGh', logo: <Wallet className="h-3.5 w-3.5 text-mut" /> },
  { l: 'Buyback and burn', sym: COIN, logo: <Coin className="h-3.5 w-3.5" /> },
  { l: 'Treasury', sym: 'SPYx', logo: <XStock t="SPY" size="h-3.5 w-3.5" /> },
];
// The composite bar: the same beam, a little dimmer for each destination after the first.
const SEGMENT = [1, 0.72, 0.48, 0.3];

function PolicyScene({ still }) {
  const [k, setK] = useState(3);
  useEffect(() => {
    if (still) return undefined;
    const t = setInterval(() => setK((x) => (x + 1) % PRESETS.length), 2400);
    return () => clearInterval(t);
  }, [still]);
  const p = PRESETS[k];
  const starts = p.v.map((_, i) => p.v.slice(0, i).reduce((a, b) => a + b, 0));
  return (
    <div className="mx-auto flex h-full max-w-lg flex-col justify-center">
      <Sheet>
        <div className="flex items-center justify-between gap-3 border-b border-white/10 px-4 py-3">
          <span className="flex items-center gap-2 text-[13px] font-medium text-ink"><Coin className="h-5 w-5" />{COIN} routing</span>
          <span className="label !text-[9.5px]">payout ratio <span className="figure text-[13px] normal-case tracking-normal text-cyan-500">{p.v[0]}%</span></span>
        </div>
        <div className="flex gap-1.5 overflow-x-auto border-b border-white/10 px-4 py-2.5 [scrollbar-width:none]">
          {PRESETS.map((x, i) => (
            <button key={x.name} type="button" onClick={() => setK(i)} className={`figure shrink-0 rounded-full border px-2.5 py-1 text-[11px] transition-colors ${i === k ? 'border-cyan-500/60 bg-white/[0.06] text-ink shadow-[0_0_14px_rgba(95,227,255,0.25)]' : 'border-white/10 text-mut hover:text-ink'}`}>{x.name}</button>
          ))}
        </div>
        <div className="px-4 pt-4">
          <div className="relative h-2.5 w-full overflow-hidden rounded-full bg-white/[0.06]">
            {p.v.map((v, i) => (
              <div key={ROWS[i].l} className="absolute inset-y-0 px-[1.5px] transition-all duration-700 ease-out" style={{ left: `${starts[i]}%`, width: `${v}%` }}>
                <div className="beam h-full rounded-full" style={{ opacity: SEGMENT[i] }} />
              </div>
            ))}
          </div>
        </div>
        <div className="space-y-3.5 px-4 py-4">
          {ROWS.map((r, i) => {
            const v = p.v[i];
            return (
              <div key={r.l} className="grid grid-cols-[1fr_auto] items-center gap-x-4 gap-y-1.5">
                <span className="flex items-center gap-2 text-[13px] text-ink/85">{r.l}<span className="flex items-center gap-1 font-mono text-[10px] text-mut">{r.logo}{r.sym}</span></span>
                <span className={`figure text-sm font-medium ${v ? 'text-ink' : 'text-dim'}`}>{v}%</span>
                <div className="relative col-span-2 h-1.5 rounded-full bg-white/[0.06]">
                  <div className="beam absolute inset-y-0 left-0 rounded-full shadow-[0_0_10px_rgba(95,227,255,0.45)] transition-all duration-700 ease-out" style={{ width: `${v}%`, opacity: SEGMENT[i] }} />
                  <div className="absolute top-1/2 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-ground bg-ink shadow-[0_0_10px_rgba(95,227,255,0.6)] transition-all duration-700 ease-out" style={{ left: `${v}%` }} />
                </div>
              </div>
            );
          })}
        </div>
        <div className="flex items-center justify-between gap-3 border-t border-white/10 bg-white/[0.02] px-4 py-2.5 text-xs text-mut">
          <span className="flex items-center gap-1.5">Next cycle <Sol /><span className="figure text-ink">4.80 SOL</span> to route</span>
          <span className="rounded-full px-3 py-1 text-[11px] font-medium text-coal beam">Save</span>
        </div>
      </Sheet>
    </div>
  );
}

/* ---------------- 3. the record date ---------------- */
const WALLETS = [
  { name: '7xKX…9fGh', days: 61, mult: 2.0, note: 'holding 61 days' },
  { name: 'Bq3m…Tz8R', days: 15, mult: 1.5, note: 'holding 15 days' },
  { name: 'E5wa…kP2c', days: 2, mult: 1.07, note: 'sold 2 days ago, clock reset' },
  { name: '9wQe…3kLm', days: 0, mult: 0, note: 'bought 4 minutes ago, below the minimum hold' },
];
function RecordScene() {
  return (
    <div className="mx-auto flex h-full max-w-xl flex-col justify-center">
      <Sheet>
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 px-4 py-3">
          <span className="flex items-center gap-2 text-[13px] font-medium text-ink"><Coin className="h-5 w-5" />{COIN} · record date · 4:00 pm ET</span>
          <span className="label !text-[9.5px] !text-cyan-500">1x to 2x over 30 days</span>
        </div>
        <div className="label grid grid-cols-[88px_1fr_64px] gap-3 border-b border-white/10 px-4 py-2 !text-[9px] sm:grid-cols-[104px_1fr_70px]">
          <span>Wallet</span><span>Held, of the 30 day ramp</span><span className="text-right">Weight</span>
        </div>
        <ul className="divide-y divide-white/[0.06]">
          {WALLETS.map((w, i) => (
            <motion.li key={w.name} initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.45, delay: 0.15 + i * 0.12, ease: EASE }} className="grid grid-cols-[88px_1fr_64px] items-center gap-3 px-4 py-3 sm:grid-cols-[104px_1fr_70px]">
              <span className="font-mono text-[11.5px] text-ink/85">{w.name}</span>
              <div className="min-w-0">
                <div className="h-1.5 rounded-full bg-white/[0.06]">
                  <motion.div className={`beam h-full rounded-full ${w.mult >= 2 ? 'shadow-[0_0_12px_rgba(95,227,255,0.7)]' : 'opacity-70'}`} initial={{ width: 0 }} animate={{ width: `${Math.min(100, (w.days / 30) * 100)}%` }} transition={{ duration: 0.9, delay: 0.3 + i * 0.12, ease: EASE }} />
                </div>
                <div className="mt-1 truncate text-[11px] text-mut">{w.note}</div>
              </div>
              <span className={`figure text-right text-sm font-medium ${w.mult === 0 ? 'text-down' : w.mult >= 2 ? 'text-cyan-500' : 'text-ink'}`}>{w.mult === 0 ? 'skipped' : `${w.mult.toFixed(2)}x`}</span>
            </motion.li>
          ))}
        </ul>
        <p className="border-t border-white/10 bg-white/[0.02] px-4 py-2.5 text-xs text-mut">Weight = balance × multiplier. Votes follow the same rule.</p>
      </Sheet>
    </div>
  );
}

/* ---------------- 4. the receipt ---------------- */
// The same cycle as the loop: 4.82 SOL collected, 0.02 kept for fees, 4.80 routed 50 / 20 / 15 / 10 / 5.
const SPLIT = [
  { l: 'Holders', note: '412 wallets', share: 50, v: '2.40 SOL', icon: <Sol size="h-3.5 w-3.5" /> },
  { l: 'You', note: '7xKX…9fGh', share: 20, v: '0.96 SOL', icon: <Wallet className="h-3.5 w-3.5 text-mut" /> },
  { l: 'Treasury', note: 'into SPYx', share: 15, v: '0.72 SOL', icon: <XStock t="SPY" size="h-3.5 w-3.5" /> },
  { l: '@yourchannel', note: 'its vault', share: 10, v: '0.48 SOL', icon: <PlatformIcon platform="youtube" className="h-3.5 w-3.5" /> },
  { l: 'Buyback and burn', note: `${COIN} burned`, share: 5, v: '0.24 SOL', icon: dot('#FF7A1A') },
];
function ReceiptScene() {
  const enter = (delay) => ({ initial: { opacity: 0, y: 8 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.45, delay, ease: EASE } });
  return (
    <div className="flex h-full flex-col justify-center">
      <Sheet className="grid sm:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)]">
        {/* what came in and where it went, as channel bars */}
        <div className="border-b border-white/10 p-4 sm:border-b-0 sm:border-r sm:p-5">
          <div className="label flex items-center justify-between !text-[9.5px]"><span>{BRAND} · receipt</span><span className="text-ink">No. 000129</span></div>
          <div className="mt-3 flex items-center gap-2.5">
            <Coin className="h-8 w-8" />
            <div className="min-w-0"><div className="label !text-[9px]">Holders of</div><div className="text-[15px] font-medium leading-tight text-ink">{COIN}</div></div>
            <div className="ml-auto text-right"><div className="label !text-[9px]">Collected</div><div className="figure text-[15px] font-medium leading-tight text-ink">4.82 SOL</div></div>
          </div>
          <ul className="mt-3 space-y-2">
            {SPLIT.map((s, i) => (
              <motion.li key={s.l} {...enter(0.1 + i * 0.07)}>
                <div className="flex items-center gap-2 text-[12px]">
                  <span className="flex h-4 w-4 items-center justify-center">{s.icon}</span>
                  <span className="truncate text-ink">{s.l}</span>
                  <span className="hidden truncate font-mono text-[10px] text-dim sm:inline">{s.note}</span>
                  <span className="figure ml-auto shrink-0 text-ink">{s.v}</span>
                </div>
                <div className="mt-1 h-1 rounded-full bg-white/[0.06]">
                  <motion.div className="beam h-full rounded-full shadow-[0_0_8px_rgba(95,227,255,0.5)]" initial={{ width: 0 }} animate={{ width: `${s.share}%` }} transition={{ duration: 0.8, delay: 0.2 + i * 0.07, ease: EASE }} />
                </div>
              </motion.li>
            ))}
          </ul>
        </div>
        {/* what holders received, and the transactions */}
        <div className="flex flex-col justify-between gap-4 p-4 sm:p-5">
          <motion.div {...enter(0.35)}>
            <div className="label !text-[9px]">Holders received</div>
            <div className="mt-1.5 flex items-center gap-2.5">
              <Sol size="h-8 w-8" />
              <span className="figure text-[34px] font-medium leading-none tracking-[-0.03em] text-beam">2.40</span>
              <span className="text-sm text-mut">SOL</span>
            </div>
            <div className="mt-1.5 text-[11px] text-mut">412 wallets · by balance · in 23 transactions</div>
          </motion.div>
          <motion.div {...enter(0.5)} className="space-y-1.5 border-t border-white/10 pt-3">
            <div className="label pb-0.5 !text-[9px]">On Solscan</div>
            <Tx label="collect" hash="4Zt8…Wq1m" />
            <Tx label="payout" note="1 of 23" hash="5Kq9…xR2v" />
            <Tx label="swap" note="SPYx" hash="3Hf7…bN1c" className="hidden sm:flex" />
            <Tx label="burn" note={COIN} hash="2Lm4…Pd8e" className="hidden sm:flex" />
          </motion.div>
        </div>
      </Sheet>
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
      <div className="grid items-end gap-x-10 gap-y-4 lg:grid-cols-12">
        <div className="lg:col-span-7">
          <div className="eyebrow mb-4">Sneak peek</div>
          <h2 className="font-display text-[34px] font-medium leading-[1.04] tracking-[-0.03em] text-ink sm:text-[44px]">See it work</h2>
        </div>
        <p className="max-w-md text-[15px] leading-relaxed text-mut lg:col-span-5">One pump.fun coin, one cycle, from the creator fee to the receipt. Miniatures of the screens you will use.</p>
      </div>

      <div className="frame mt-8 overflow-hidden shadow-soft" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}>
        {/* the four screens, and the time left on the one showing */}
        <div role="tablist" aria-label="Screens of the product" className="grid grid-cols-4 border-b border-white/10">
          {SCENES.map((s, k) => (
            <button
              key={s.key} type="button" role="tab" id={`peek-tab-${s.key}`} aria-selected={k === i} aria-controls="peek-panel" onClick={() => setI(k)}
              className={`relative flex flex-col gap-1 px-3 py-3.5 text-left transition-colors sm:flex-row sm:items-baseline sm:gap-2.5 sm:px-5 ${k ? 'border-l border-white/10' : ''} ${k === i ? 'bg-white/[0.05]' : 'hover:bg-white/[0.03]'}`}
            >
              <span className={`font-mono text-[11px] tabular-nums ${k === i ? 'text-cyan-500' : 'text-dim'}`}>{String(k + 1).padStart(2, '0')}</span>
              <span className={`text-[12.5px] leading-tight sm:text-sm ${k === i ? 'font-medium text-ink' : 'text-mut'}`}>{s.label}</span>
              {k === i && (
                <motion.span
                  key={`${i}-${held}`} className="beam absolute inset-x-0 bottom-0 h-[2px] origin-left shadow-[0_0_12px_rgba(95,227,255,0.7)]"
                  initial={{ scaleX: held ? 1 : 0 }} animate={{ scaleX: 1 }} transition={{ duration: held ? 0 : TURN / 1000, ease: 'linear' }}
                />
              )}
            </button>
          ))}
        </div>

        <div id="peek-panel" role="tabpanel" aria-labelledby={`peek-tab-${scene.key}`} className="grid lg:grid-cols-[minmax(0,0.72fr)_minmax(0,1.5fr)]">
          <div className="flex flex-col justify-between gap-6 border-b border-white/10 p-6 sm:p-7 lg:border-b-0 lg:border-r">
            <AnimatePresence mode="wait" initial={false}>
              <motion.div key={scene.key} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.3, ease: EASE }}>
                <h3 className="font-display text-2xl font-medium leading-tight tracking-[-0.03em] text-ink">{scene.title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-mut">{scene.body}</p>
              </motion.div>
            </AnimatePresence>
            <div className="border-t border-white/10 pt-4">
              <div className="label !text-[9.5px]">Where you see it</div>
              <Link href={scene.href} className="group mt-1.5 inline-flex items-center gap-1.5 text-sm font-medium text-ink transition-colors hover:text-hood-600">{scene.where}<Arrow className="h-3.5 w-3.5 text-mut transition-transform group-hover:translate-x-0.5 group-hover:text-hood-600" /></Link>
            </div>
          </div>

          <div className="relative min-w-0 overflow-hidden">
            {/* the light behind the screens, and a faint grid on the canvas */}
            <div aria-hidden="true" className="pointer-events-none absolute inset-0" style={{ background: 'radial-gradient(ellipse 65% 70% at 30% 50%, rgba(47,168,255,0.14), transparent 70%), radial-gradient(ellipse 45% 60% at 92% 85%, rgba(123,92,255,0.12), transparent 70%)' }} />
            {scene.key === 'loop' && <div aria-hidden="true" className="pointer-events-none absolute inset-0" style={{ backgroundImage: 'radial-gradient(rgba(255,255,255,0.06) 1px, transparent 1px)', backgroundSize: '22px 22px', maskImage: 'radial-gradient(ellipse 80% 70% at 50% 50%, black, transparent)', WebkitMaskImage: 'radial-gradient(ellipse 80% 70% at 50% 50%, black, transparent)' }} />}
            <div className="relative flex items-center justify-between gap-3 border-b border-white/10 bg-white/[0.02] px-4 py-2.5">
              <span className="flex min-w-0 items-center gap-2.5 font-mono text-[11px] text-mut">
                <span className="flex shrink-0 gap-1" aria-hidden="true">{[0, 1, 2].map((d) => <span key={d} className="h-1.5 w-1.5 rounded-full bg-white/15" />)}</span>
                <span className="truncate">{scene.url}</span>
              </span>
              <span className="label flex shrink-0 items-center gap-1.5 !text-[9.5px]"><Sol size="h-3 w-3" />Solana</span>
            </div>
            <div className="relative h-[500px] p-4 sm:p-6 md:h-[400px]">
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
