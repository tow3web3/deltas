'use client';

// Every option of the routing, as an index and a stage. The index groups the
// options by what they decide; the stage shows the selected one drawn large,
// with its explanation. It advances on its own until the visitor picks one.
import { useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useInView, useReducedMotion } from 'motion/react';
import ModeScene from './ModeScenes';
import { Arrow } from './Icons';

const GROUPS = [
  {
    name: 'Where fees go',
    items: [
      { title: 'Payout ratio', scene: 'payout', tag: 'Core', body: 'Decide the share that goes to holders and the share you keep, sent to your own payout address each cycle. 100/0, 80/20, 70/30: your call.' },
      { title: 'Pages', scene: 'vault', tag: 'New', body: 'Route a share to any page on the internet: a YouTube channel, a GitHub account, a domain, an X, Instagram, TikTok, Twitch or Facebook page. It fills a public vault until its owner signs in and claims.' },
      { title: 'Retained earnings', scene: 'treasury', body: 'Route a share into a stock treasury held by a wallet you control. The dashboard publishes the balance sheet, book value per token and how much of the market cap is backed.' },
      { title: 'Buyback and burn', scene: 'burn', body: 'A share buys your own token and burns it. Supply shrinks every cycle, alongside the dividend.' },
    ],
  },
  {
    name: 'What holders are paid in',
    items: [
      { title: 'Pay-through in kind', scene: 'inkind', tag: 'Core', body: 'What the launchpad pays, holders receive: NVDA fees become NVDA dividends. No swap, no slippage. ETH fees convert to the stock you pick.' },
      { title: 'Convert mode', scene: 'convert', body: 'Rather pay one stock than a mix? Everything is converted to the reward you chose before payout: any of the 195, or ETH.' },
      { title: 'Any token, by address', scene: 'anytoken', body: 'Dividends do not have to be a stock. Paste any contract address on Robinhood Chain and holders of your coin get paid in it: a partner memecoin, your ecosystem token, a cross-promo. Fees are swapped into it on Uniswap every cycle.' },
      { title: 'Roulette, Top Gainer, Portfolio', scene: 'reel', body: 'For ETH fees: a random liquid stock each cycle, the best stock of the day, or a rotating basket (Magnificent 7, AI & Semis, Degen Street, Safe Haven).' },
      { title: 'Community vote', scene: 'vote', body: 'Holders vote on the next dividend, weighted by their balance and loyalty. Gasless, just a signature.' },
    ],
  },
  {
    name: 'When, and who qualifies',
    items: [
      { title: 'Closing bell', scene: 'bell', body: 'Pay once a day at 4:00 pm New York time, weekdays only. A real dividend calendar.' },
      { title: 'Market hours only', scene: 'hours', body: 'Or run every 1 to 60 minutes and skip the cycles when Wall Street is closed.' },
      { title: 'Record date and loyalty', scene: 'loyalty', body: 'Dividends weighted by holding time: 1x to 2x over 30 days, a minimum hold to qualify, and selling resets the clock. Snipers earn less than diamond hands.' },
    ],
  },
  {
    name: 'Safety and reporting',
    items: [
      { title: 'Fair-price guard', scene: 'guard', body: 'Every conversion is checked against Yahoo Finance. Thin pool, no fill: holders get ETH that cycle instead of a bad price.' },
      { title: 'AES-256 encrypted keys', scene: 'keys', body: 'Wallet keys are encrypted at rest and decrypted in memory only, at run time.' },
      { title: 'Dividend yield', scene: 'yield', body: 'Fees returned over 30 days, annualized against market cap, like a real stock. On the dashboard, in the API, and as a badge you can embed.' },
      { title: 'Receipts and statements', scene: 'receipts', body: 'Every dividend posts a card to your Telegram group with a Share on X button. Every holder gets a statement page. Every token gets a live dashboard.' },
    ],
  },
];
const MODES = GROUPS.flatMap((g) => g.items.map((m) => ({ ...m, group: g.name })));
MODES.forEach((m, i) => { m.index = i; m.n = String(i + 1).padStart(2, '0'); });

const EASE = [0.16, 1, 0.3, 1];
const DWELL = 7000;

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
      <div className="mb-7 grid items-end gap-x-10 gap-y-3 lg:grid-cols-12">
        <div className="lg:col-span-8">
          <div className="eyebrow mb-2">The routing</div>
          <h2 className="font-display text-3xl font-medium tracking-tight text-ink sm:text-4xl lg:text-5xl">Every route a coin&apos;s fees can take</h2>
        </div>
        <p className="text-sm leading-relaxed text-mut lg:col-span-4">Holders, wallets, buybacks, a treasury, pages. Plus the record date, the calendar and the yield. Set from the dashboard or Telegram. Pick an option to see it run.</p>
      </div>

      <div className="frame grid lg:grid-cols-12">
        {/* the index */}
        <div
          ref={rail} role="tablist" aria-label="Routing options" aria-orientation="vertical" onKeyDown={onKey}
          className="flex overflow-x-auto border-b border-line [scrollbar-width:none] lg:col-span-4 lg:block lg:overflow-visible lg:border-b-0 lg:border-r [&::-webkit-scrollbar]:hidden"
        >
          {GROUPS.map((g, gi) => (
            <div key={g.name} className={`flex shrink-0 items-stretch lg:block ${gi ? 'border-l border-line lg:border-l-0 lg:border-t' : ''}`}>
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
                      className={`group relative flex shrink-0 items-baseline gap-3 whitespace-nowrap px-3 py-3 text-left outline-none transition-colors focus-visible:bg-tile lg:w-full lg:whitespace-normal lg:px-5 lg:py-[6px] ${on ? 'bg-tile/70' : 'hover:bg-tile/40'}`}
                    >
                      <span className={`absolute bottom-0 left-0 h-px w-full origin-left transition-transform duration-300 lg:bottom-auto lg:top-0 lg:h-full lg:w-px lg:origin-top ${on ? 'scale-100 bg-hood-500' : 'scale-0 bg-hood-500'}`} />
                      <span className={`font-mono text-[10.5px] tabular-nums ${on ? 'text-hood-600' : 'text-mut/70'}`}>{m.n}</span>
                      <span className={`text-[13.5px] leading-snug transition-colors ${on ? 'font-semibold text-ink' : 'text-mut group-hover:text-ink'}`}>{m.title}</span>
                      {m.tag && <span className={`hidden font-mono text-[9.5px] uppercase tracking-[0.14em] lg:ml-auto lg:inline ${m.tag === 'New' ? 'text-hood-600' : 'text-mut/70'}`}>{m.tag}</span>}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* the stage */}
        <div id="mode-stage" role="tabpanel" aria-labelledby={`mode-tab-${mode.scene}`} className="flex min-w-0 flex-col lg:col-span-8">
          <div className="flex items-center justify-between gap-4 border-b border-line px-5 py-3">
            <span className="label truncate">{mode.group}</span>
            <span className="label shrink-0 tabular-nums"><span className="text-ink">{mode.n}</span> / {MODES.length}</span>
          </div>
          <div className="relative h-px bg-transparent">
            {auto && seen && !still && (
              <motion.span key={active} initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ duration: DWELL / 1000, ease: 'linear' }} className="absolute inset-x-0 -top-px block h-px origin-left bg-hood-500" />
            )}
          </div>

          <div ref={stage} className="relative flex flex-1 flex-col justify-center bg-ground/60 px-2 py-3 sm:px-5 sm:py-6">
            <AnimatePresence mode="wait" initial={false}>
              <motion.div key={mode.scene} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.32, ease: EASE }}>
                <ModeScene kind={mode.scene} />
              </motion.div>
            </AnimatePresence>
          </div>

          <div className="grid gap-x-8 gap-y-4 border-t border-line px-5 py-5 sm:grid-cols-[1fr_auto] sm:px-7 sm:py-6">
            <AnimatePresence mode="wait" initial={false}>
              <motion.div key={mode.scene} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.3, ease: EASE }} className="min-h-[132px] sm:min-h-[112px]">
                <h3 className="flex flex-wrap items-baseline gap-x-3 font-display text-2xl font-medium tracking-tight text-ink sm:text-[28px]">
                  {mode.title}
                  {mode.tag && <span className={`font-mono text-[10.5px] font-medium uppercase tracking-[0.14em] ${mode.tag === 'New' ? 'text-hood-600' : 'text-mut'}`}>{mode.tag}</span>}
                </h3>
                <p className="mt-2 max-w-xl text-[15px] leading-relaxed text-mut">{mode.body}</p>
              </motion.div>
            </AnimatePresence>
            <div className="flex items-end gap-2">
              <button type="button" onClick={() => pick(active - 1)} aria-label="Previous option" className="flex h-9 w-9 items-center justify-center rounded-xl border border-line text-mut transition-colors hover:border-hood-400 hover:text-ink"><Arrow className="h-3.5 w-3.5 rotate-180" /></button>
              <button type="button" onClick={() => pick(active + 1)} aria-label="Next option" className="flex h-9 w-9 items-center justify-center rounded-xl border border-line text-mut transition-colors hover:border-hood-400 hover:text-ink"><Arrow className="h-3.5 w-3.5" /></button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
