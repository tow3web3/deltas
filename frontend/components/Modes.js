'use client';

// Every route a coin's fees can take, as an index and a stage. The index groups
// the options by what they decide; the stage draws the selected one in light,
// with its explanation underneath. It advances on its own until the visitor
// picks one; arrows, Home and End move through it from the keyboard.
import { useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useInView, useReducedMotion } from 'motion/react';
import ModeScene from './ModeScenes';
import { Arrow } from './Icons';
import { XSTOCKS_TOTAL } from '../lib/xstocks';

const PAYABLE = XSTOCKS_TOTAL.toLocaleString('en-US');

const GROUPS = [
  {
    name: 'Where fees go',
    items: [
      { title: 'Payout ratio', scene: 'payout', tag: 'Core', body: 'Decide the share that goes to holders and the share you keep, sent to your own wallet every cycle. 100/0, 80/20, 70/30: your call.' },
      { title: 'Pages', scene: 'vault', tag: 'New', body: 'Route a share to any page on the internet: a YouTube channel, a GitHub account, an X, Instagram, TikTok or Twitch, a Facebook page, a domain, a phone number. It fills a vault of its own until the owner proves it (a sign-in, a DNS record, a code by WhatsApp or SMS) and takes it.' },
      { title: 'Retained earnings', scene: 'treasury', body: 'Route a share into a treasury held in xStocks (SPYx, NVDAx, GLDx), in a wallet you control. The dashboard publishes the balance sheet, the book value per token and how much of the market cap is backed.' },
      { title: 'Buyback and burn', scene: 'burn', body: 'A share buys your own coin on Jupiter and burns it, on Solana. Supply shrinks every cycle, next to the dividend.' },
    ],
  },
  {
    name: 'What holders are paid in',
    items: [
      { title: 'Pay-through in kind', scene: 'inkind', tag: 'Core', body: 'What pump.fun pays is what holders receive: SOL fees become SOL dividends. No swap, no slippage, about 18 holders paid per transaction. On Robinhood Chain, NVDA fees become NVDA dividends.' },
      { title: 'Convert to a stock', scene: 'convert', body: `Rather pay a stock? Each cycle the holders' SOL is swapped on Jupiter into the xStock you pick: NVDAx, SPYx, GLDx, or any of the ${PAYABLE} Jupiter verifies.` },
      { title: 'Any token, by mint', scene: 'anytoken', body: 'Holders do not have to be paid in a stock. Paste any mint on Solana and they are paid in it, swapped on Jupiter every cycle: a partner coin, your ecosystem token, a cross-promo.' },
      { title: 'Roulette, Top Gainer, Portfolio', scene: 'reel', body: 'Let the reward change every cycle: a random liquid stock, the best stock of the day, or a basket in rotation (Magnificent 7, AI and Semis, Degen Street, Safe Haven).' },
      { title: 'Community vote', scene: 'vote', body: 'Holders vote on the next reward, weighted by their balance and their loyalty. Gasless: one signature.' },
    ],
  },
  {
    name: 'When, and who qualifies',
    items: [
      { title: 'Closing bell', scene: 'bell', body: 'Pay once a day at 4:00 pm New York time, on weekdays only. A real dividend calendar.' },
      { title: 'Market hours only', scene: 'hours', body: 'Or run every 1, 2, 5, 10, 30 or 60 minutes, and skip the cycles while Wall Street is closed.' },
      { title: 'Record date and loyalty', scene: 'loyalty', body: 'Weight ramps from 1x to 2x over 30 days of holding, with a minimum hold to qualify, and selling resets the clock. Snipers earn less than diamond hands.' },
    ],
  },
  {
    name: 'Safety and reporting',
    items: [
      { title: 'Fair-price guard', scene: 'guard', body: "Every swap is checked against Jupiter's price before it fills. Below 90% of it, no swap: that share is paid in SOL that cycle, and the receipt says so." },
      { title: 'AES-256 encrypted keys', scene: 'keys', body: 'The dev wallet key is encrypted at rest with AES-256-GCM and decrypted in memory only, while a cycle runs.' },
      { title: 'Dividend yield', scene: 'yield', body: "Fees returned over 30 days, annualized against market cap, like a stock's yield. On the coin's page and in the API." },
      { title: 'Receipts and statements', scene: 'receipts', body: 'Every cycle leaves a public receipt with its Solscan links. Every holder has a statement page, every coin a public page with its routing and cycles, and the Telegram bot reports each one.' },
    ],
  },
];
const MODES = GROUPS.flatMap((g) => g.items.map((m) => ({ ...m, group: g.name })));
MODES.forEach((m, i) => { m.index = i; m.n = String(i + 1).padStart(2, '0'); });

const EASE = [0.16, 1, 0.3, 1];
const DWELL = 7000;
// The light of the stage: the logo's blue from the left, a little violet low on the right.
const STAGE_LIGHT = 'radial-gradient(ellipse 60% 70% at 32% 45%, rgba(47,168,255,0.13), transparent 70%), radial-gradient(ellipse 45% 55% at 88% 75%, rgba(123,92,255,0.1), transparent 70%)';

export default function Modes() {
  const [active, setActive] = useState(0);
  const [auto, setAuto] = useState(true);
  const root = useRef(null);
  const rail = useRef(null);
  const stage = useRef(null);
  const tabs = useRef([]);
  const seen = useInView(root, { amount: 0.3 });
  const still = useReducedMotion();
  const mode = MODES[active];

  const pick = useCallback((i) => { setAuto(false); setActive((i + MODES.length) % MODES.length); }, []);

  // Advance slowly while nobody has touched it and the section is on screen.
  useEffect(() => {
    if (!auto || !seen || still) return undefined;
    const t = setTimeout(() => setActive((i) => (i + 1) % MODES.length), DWELL);
    return () => clearTimeout(t);
  }, [auto, seen, still, active]);

  // On a narrow screen the index is a row: keep the selected item in sight, without moving the page.
  useEffect(() => {
    const box = rail.current;
    const tab = tabs.current[active];
    if (!box || !tab || box.scrollWidth <= box.clientWidth) return;
    const left = tab.offsetLeft - box.offsetLeft - 16;
    box.scrollTo({ left: Math.max(0, left), behavior: still ? 'auto' : 'smooth' });
  }, [active, still]);

  // SMIL does not know about reduced motion: hold each scene on a frame where everything is drawn.
  useEffect(() => {
    if (!still) return;
    stage.current?.querySelectorAll('svg').forEach((svg) => { try { svg.setCurrentTime(5.2); svg.pauseAnimations(); } catch { /* no SMIL here */ } });
  }, [still, active]);

  const onKey = (e) => {
    const step = { ArrowDown: 1, ArrowRight: 1, ArrowUp: -1, ArrowLeft: -1 }[e.key];
    const to = e.key === 'Home' ? 0 : e.key === 'End' ? MODES.length - 1 : step ? (active + step + MODES.length) % MODES.length : null;
    if (to == null) return;
    e.preventDefault();
    pick(to);
    tabs.current[to]?.focus();
  };

  return (
    <div id="modes" ref={root} className="scroll-mt-20">
      <div className="mb-8 grid items-end gap-x-10 gap-y-4 lg:grid-cols-12">
        <div className="lg:col-span-8">
          <div className="eyebrow mb-4">The routing</div>
          <h2 className="font-display text-[34px] font-medium leading-[1.04] tracking-[-0.03em] text-ink sm:text-[44px]">Every route a coin&apos;s fees can take</h2>
        </div>
        <p className="max-w-md text-[15px] leading-relaxed text-mut lg:col-span-4">Holders, wallets, a buyback, a treasury in xStocks, any page. Then the reward, the calendar, the record date and the guard. Set from the dashboard or the Telegram bot; pick one to see it run.</p>
      </div>

      <div className="frame grid overflow-hidden shadow-soft lg:grid-cols-12">
        {/* the index */}
        <div
          ref={rail} role="tablist" aria-label="Routing options" aria-orientation="vertical" onKeyDown={onKey}
          className="flex overflow-x-auto border-b border-white/10 [scrollbar-width:none] lg:col-span-4 lg:block lg:overflow-visible lg:border-b-0 lg:border-r [&::-webkit-scrollbar]:hidden"
        >
          {GROUPS.map((g, gi) => (
            <div key={g.name} className={`flex shrink-0 items-stretch lg:block ${gi ? 'border-l border-white/10 lg:border-l-0 lg:border-t' : ''}`}>
              <div className="label flex items-center whitespace-nowrap py-3 pl-4 pr-1 lg:px-5 lg:pb-1.5 lg:pt-4">{g.name}</div>
              <div className="flex lg:block lg:pb-2.5">
                {g.items.map((item) => {
                  const m = MODES.find((x) => x.scene === item.scene);
                  const on = m.index === active;
                  return (
                    <button
                      key={m.scene} type="button" role="tab" id={`mode-tab-${m.scene}`} aria-selected={on} aria-controls="mode-stage" tabIndex={on ? 0 : -1}
                      ref={(el) => { tabs.current[m.index] = el; }}
                      onClick={() => pick(m.index)} onFocus={(e) => { if (e.target.matches(':focus-visible')) pick(m.index); }}
                      className={`group relative flex shrink-0 items-baseline gap-3 whitespace-nowrap px-3 py-3 text-left outline-none transition-colors focus-visible:bg-white/[0.07] lg:w-full lg:whitespace-normal lg:px-5 lg:py-[6px] ${on ? 'bg-white/[0.05]' : 'hover:bg-white/[0.03]'}`}
                    >
                      {/* the light on the selected option: under it in a row, along its left edge in the column */}
                      <span
                        aria-hidden="true"
                        className={`absolute bottom-0 left-0 h-[2px] w-full origin-left bg-gradient-to-r from-hood-500 via-cyan-500 to-violet-500 transition-transform duration-300 lg:bottom-auto lg:top-1 lg:h-[calc(100%-8px)] lg:w-[2px] lg:origin-top lg:rounded-full lg:bg-gradient-to-b ${on ? 'scale-100 shadow-[0_0_12px_rgba(95,227,255,0.8)]' : 'scale-0'}`}
                      />
                      <span className={`font-mono text-[10.5px] tabular-nums ${on ? 'text-cyan-500' : 'text-dim'}`}>{m.n}</span>
                      <span className={`text-[13.5px] leading-snug transition-colors ${on ? 'font-medium text-ink' : 'text-mut group-hover:text-ink'}`}>{m.title}</span>
                      {m.tag && <span className={`hidden font-mono text-[9.5px] uppercase tracking-[0.14em] lg:ml-auto lg:inline ${m.tag === 'New' ? 'text-cyan-500' : 'text-dim'}`}>{m.tag}</span>}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* the stage */}
        <div id="mode-stage" role="tabpanel" aria-labelledby={`mode-tab-${mode.scene}`} className="flex min-w-0 flex-col lg:col-span-8">
          <div className="flex items-center justify-between gap-4 border-b border-white/10 px-5 py-3">
            <span className="label truncate">{mode.group}</span>
            <span className="label shrink-0 tabular-nums"><span className="text-ink">{mode.n}</span> / {MODES.length}</span>
          </div>
          <div className="relative h-0">
            {auto && seen && !still && (
              <motion.span
                key={active} initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ duration: DWELL / 1000, ease: 'linear' }}
                className="beam absolute inset-x-0 -top-px block h-[2px] origin-left shadow-[0_0_12px_rgba(95,227,255,0.6)]"
              />
            )}
          </div>

          <div ref={stage} className="relative flex flex-1 flex-col justify-center overflow-hidden px-3 py-5 sm:px-6 sm:py-8">
            <div aria-hidden="true" className="pointer-events-none absolute inset-0" style={{ background: STAGE_LIGHT }} />
            <AnimatePresence mode="wait" initial={false}>
              <motion.div key={mode.scene} className="relative" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.32, ease: EASE }}>
                <ModeScene kind={mode.scene} />
              </motion.div>
            </AnimatePresence>
          </div>

          <div className="grid gap-x-8 gap-y-4 border-t border-white/10 px-5 py-5 sm:grid-cols-[1fr_auto] sm:px-7 sm:py-6">
            <AnimatePresence mode="wait" initial={false}>
              <motion.div key={mode.scene} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.3, ease: EASE }} className="min-h-[176px] sm:min-h-[140px]">
                <h3 className="flex flex-wrap items-baseline gap-x-3 font-display text-2xl font-medium tracking-[-0.03em] text-ink sm:text-[28px]">
                  {mode.title}
                  {mode.tag && <span className={`font-mono text-[10.5px] font-medium uppercase tracking-[0.14em] ${mode.tag === 'New' ? 'text-cyan-500' : 'text-dim'}`}>{mode.tag}</span>}
                </h3>
                <p className="mt-2 max-w-xl text-[15px] leading-relaxed text-mut">{mode.body}</p>
              </motion.div>
            </AnimatePresence>
            <div className="flex items-end gap-2">
              <button type="button" onClick={() => pick(active - 1)} aria-label="Previous option" className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-mut transition-colors hover:border-cyan-500/50 hover:text-ink"><Arrow className="h-3.5 w-3.5 rotate-180" /></button>
              <button type="button" onClick={() => pick(active + 1)} aria-label="Next option" className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-mut transition-colors hover:border-cyan-500/50 hover:text-ink"><Arrow className="h-3.5 w-3.5" /></button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
