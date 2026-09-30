'use client';

// The questions, as a reader. On a wide screen: the topics, the questions of
// the topic and the answer side by side in one frame, like a reference manual.
// On a narrow one the same content folds into a list that opens in place.
// An answer that names a stock, a token or a platform shows its logo inline.
import { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import Rich from './Rich';
import { Arrow, Back, CaretDown, Telegram } from './Icons';
import { BRAND, COMMUNITY_URL } from '../lib/brand';
import { STOCKS, LIQUID_TICKERS } from '../lib/stocks';

const EASE = [0.16, 1, 0.3, 1];
const N = STOCKS.length;

// Markers inside an answer: {s:NVDA} a stock or ETH with its logo, {p:youtube|YouTube}
// a platform with its logo, {l:/claim|/claim} a link, {c:text} a path set in mono.
const TOPICS = [
  {
    key: 'fees',
    label: 'Fees and routing',
    items: [
      { q: `What does ${BRAND} do?`, a: `It routes the creator fees of a coin on Robinhood Chain. Every cycle it sweeps the dev wallet and splits what it finds along the routes you drew: holders, your own wallets, a buyback and burn, a treasury, and any page on the internet.` },
      { q: 'Where do my fees come from?', a: `Launchpads on Robinhood Chain pay creators in stock tokens and/or {s:ETH}, straight to the dev wallet. Every cycle ${BRAND} sweeps that wallet: all ${N} Robinhood Stock Tokens and {s:ETH} above a small gas reserve. If your token trades on Uniswap V3 with a position you hold, it also collects the LP fees.` },
      { q: 'What is a dividend policy?', a: 'The same four decisions a listed company makes about its cash, applied to your fees every cycle: the payout ratio (share to holders, paid in kind), the share you keep (sent to your own payout address), buybacks (buy your own token and burn it), and retained earnings (a stock treasury with a published book value). Plus the record date rules (loyalty), the calendar (closing bell) and a yield anyone can compare.' },
      { q: 'Can I keep part of the fees?', a: 'Yes: that is the payout ratio. Presets from 100% to holders down to 50%, with the rest going to your payout address, a buyback and burn, the treasury, or pages, in any mix. Everything is published on the dashboard so holders know the policy.' },
      { q: 'What is the treasury?', a: 'Retained earnings. A share of each cycle goes to a wallet you control: stock fees move there in kind, {s:ETH} fees buy a stock ({s:SPY} by default). The dashboard shows the balance sheet, book value per token, and what share of the market cap the treasury backs.' },
      { q: 'How often does it run?', a: 'Every 1, 2, 5, 10, 30 or 60 minutes, or once a day at the closing bell (4:00 pm New York time, weekdays). You can also restrict any schedule to market hours.' },
      { q: 'Is there an API?', a: 'Yes, a free public read-only API at {l:/api/v1|/api/v1}: global stats, linked tokens, recent dividends and the stock registry. See the {l:/#developers|Developers} section.' },
    ],
  },
  {
    key: 'pages',
    label: 'Pages and claims',
    items: [
      { q: 'What is a page?', a: 'A place on the internet that can receive a share of the fees: a {p:youtube|YouTube} channel, a {p:github|GitHub} account, a {p:domain|domain}, an {p:x|X}, {p:instagram|Instagram}, {p:tiktok|TikTok} or {p:twitch|Twitch} account, a {p:facebook|Facebook} page. You paste its link, set its share, and it becomes a route like any other. Every page has a public profile at {c:/p/<platform>/<handle>}, and {l:/pages|/pages} lists every page receiving fees.' },
      { q: `What happens if the owner never heard of ${BRAND}?`, a: `Nothing is lost. ${BRAND} creates an on-chain vault for the page, a wallet of its own, and every cycle sends the page's share there. The owner does not need to know beforehand: the funds wait in the vault until they claim.` },
      { q: 'How does an owner claim?', a: 'At {l:/claim|/claim}. They sign in with the platform itself (Google for {p:youtube|YouTube}, {p:github|GitHub}, {p:x|X}, {p:instagram|Instagram}, {p:facebook|Facebook}, {p:tiktok|TikTok} or {p:twitch|Twitch}), or add a DNS TXT record for a {p:domain|domain}. Then they connect a wallet and the vault is swept to it. After that, every cycle pays their wallet directly.' },
      { q: 'Is the vault visible?', a: `Yes. Anyone can see the vault address and its balance on the page's public profile, for example {c:/p/github/your-project}, and check it on chain.` },
      { q: 'What if nobody claims?', a: `The funds stay in the page's vault. It keeps receiving its share every cycle for as long as the creator keeps the route, and the balance stays public on the page's profile.` },
    ],
  },
  {
    key: 'holders',
    label: 'Holders and rewards',
    items: [
      { q: 'What is a Robinhood Stock Token?', a: `A token on Robinhood Chain that tracks a real stock or ETF: {s:NVDA}, {s:TSLA}, {s:SPY}, {s:GLD} and ${N - 4} more. They are plain ERC-20s, so ${BRAND} can buy them on Uniswap and send them to your holders like any other token.` },
      { q: 'Do my holders get the same stock the launchpad paid me?', a: 'Yes, by default. Stock fees are paid through in kind: {s:NVDA} in, {s:NVDA} out, pro-rata, no swap and no slippage. Switch to convert mode if you would rather pay a single stock of your choice; {s:ETH} fees are always converted to the stock you picked, with the fair-price guard.' },
      { q: 'Can holders be paid in another token, not a stock?', a: 'Yes. The reward can be any ERC-20 on Robinhood Chain: pick it by contract address in the dashboard or send the address to the bot. Holders of coin A get paid in coin B every cycle, swapped on Uniswap with the same fair-price guard (DexScreener price for non-stocks). No pool yet? Holders receive {s:ETH} that cycle instead.' },
      { q: 'Which stocks are liquid today?', a: `About ${LIQUID_TICKERS.length} of the ${N} fill a small order at fair value on Uniswap V4 right now: the Magnificent 7, most big semis, {s:SPY}, {s:QQQ}, {s:GLD}, {s:COIN}, {s:GME}, {s:PLTR} and more (marked Liquid on the {l:/stocks|Stocks} page). Roulette and Top Gainer draw only from this pool. Any of the ${N} can be chosen as a fixed reward; the guard handles the rest.` },
      { q: 'What is loyalty weighting?', a: `An optional rule set per token. Because ${BRAND} rebuilds every wallet's history from Transfer logs, it knows how long each wallet has held and whether it sold. With loyalty on, a wallet's dividend weight ramps from 1x to 2x (creator's choice up to 5x) over the ramp period, wallets younger than the minimum hold get nothing that cycle, and any sell restarts the clock. Voting weight follows the same rules.` },
      { q: 'Who counts as a holder?', a: 'Real wallets only. Balances are rebuilt from Transfer logs on chain. Liquidity pools, routers, the token contract, the dev wallet and any smart contract are excluded, so dividends go to people.' },
    ],
  },
  {
    key: 'safety',
    label: 'Safety',
    items: [
      { q: 'Are my funds safe?', a: 'Your private key is encrypted with AES-256-GCM and only decrypted in memory when a cycle runs. Use a dedicated wallet funded with just what a cycle needs, never your main holdings.' },
      { q: 'What if a stock pool is too thin?', a: 'Every stock swap is compared to the Yahoo Finance price. If no route on Uniswap V4, V3 or V2 delivers at least 90% of fair value, the cycle pays {s:ETH} instead and says so on the dashboard. Your fees never disappear into price impact.' },
    ],
  },
];

// One flat, numbered list: the number of a question is its place in the whole manual.
const ALL = TOPICS.flatMap((t) => t.items.map((it) => ({ ...it, topic: t.key, topicLabel: t.label }))).map((it, i) => ({ ...it, n: i }));
const FIRST = Object.fromEntries(TOPICS.map((t) => [t.key, ALL.findIndex((x) => x.topic === t.key)]));
const num = (i) => String(i + 1).padStart(2, '0');

const Answer = ({ text }) => <Rich text={text} />;

export default function FAQ() {
  const [cur, setCur] = useState(0);
  const [folded, setFolded] = useState(false);
  const item = ALL[cur];
  const go = (i) => setCur((i + ALL.length) % ALL.length);

  const onKey = (e) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowRight') { e.preventDefault(); go(cur + 1); }
    if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') { e.preventDefault(); go(cur - 1); }
  };

  return (
    <div>
      <div className="grid items-end gap-6 lg:grid-cols-[1fr_auto]">
        <div className="max-w-2xl">
          <div className="eyebrow mb-3">FAQ</div>
          <h2 className="font-display text-3xl font-medium tracking-tight text-ink sm:text-4xl">Questions, answered</h2>
        </div>
        <dl className="flex gap-8 lg:text-right">
          <div><dd className="figure font-display text-3xl font-medium tracking-tight text-ink">{ALL.length}</dd><dt className="label mt-0.5">answers</dt></div>
          <div><dd className="figure font-display text-3xl font-medium tracking-tight text-ink">{TOPICS.length}</dd><dt className="label mt-0.5">topics</dt></div>
        </dl>
      </div>

      {/* Wide: topics, questions, answer */}
      <div className="frame mt-7 hidden min-h-[460px] grid-cols-[200px_minmax(0,0.95fr)_minmax(0,1.3fr)] divide-x divide-line lg:grid" onKeyDown={onKey}>
        <nav aria-label="Topics" className="flex flex-col justify-between">
          <ul className="py-2">
            {TOPICS.map((t) => {
              const on = t.key === item.topic;
              return (
                <li key={t.key}>
                  <button type="button" onClick={() => setCur(FIRST[t.key])} aria-current={on} className={`relative flex w-full items-baseline justify-between gap-3 px-5 py-3 text-left text-sm transition-colors ${on ? 'font-semibold text-ink' : 'text-mut hover:text-ink'}`}>
                    {on && <motion.span layoutId="faq-topic" className="absolute inset-y-2 left-0 w-[2px] rounded-full bg-hood-500" transition={{ duration: 0.35, ease: EASE }} />}
                    <span>{t.label}</span>
                    <span className="figure text-xs text-mut">{t.items.length}</span>
                  </button>
                </li>
              );
            })}
          </ul>
          {COMMUNITY_URL && <a href={COMMUNITY_URL} target="_blank" rel="noopener noreferrer" className="group flex items-center gap-2.5 border-t border-line px-5 py-4 text-[13px] leading-snug text-mut transition-colors hover:text-ink">
            <Telegram className="h-5 w-5 shrink-0 text-[#2AABEE]" />
            <span>Not in the list? Ask in the Telegram group.</span>
          </a>}
        </nav>

        <div>
          <div className="label border-b border-line px-5 py-2.5">{item.topicLabel}</div>
          <ul className="divide-y divide-line">
            {ALL.filter((x) => x.topic === item.topic).map((x) => {
              const on = x.n === cur;
              return (
                <li key={x.q}>
                  <button type="button" onClick={() => setCur(x.n)} aria-current={on} className={`group grid w-full grid-cols-[26px_1fr_14px] items-baseline gap-2 px-5 py-3 text-left transition-colors ${on ? 'bg-tile/60' : 'hover:bg-tile/30'}`}>
                    <span className={`figure text-xs ${on ? 'text-hood-600' : 'text-mut'}`}>{num(x.n)}</span>
                    <span className={`text-sm leading-snug ${on ? 'font-semibold text-ink' : 'text-ink/75 group-hover:text-ink'}`}>{x.q}</span>
                    <Arrow className={`h-3 w-3 self-center transition-opacity ${on ? 'text-hood-600 opacity-100' : 'text-mut opacity-0 group-hover:opacity-100'}`} />
                  </button>
                </li>
              );
            })}
          </ul>
        </div>

        <div className="flex flex-col">
          <div className="label flex items-center justify-between border-b border-line px-7 py-2.5">
            <span>Answer</span>
            <span><span className="text-ink">{num(cur)}</span> of {ALL.length}</span>
          </div>
          <div className="flex-1 px-7 py-7" aria-live="polite">
            <AnimatePresence mode="wait" initial={false}>
              <motion.div key={cur} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.28, ease: EASE }}>
                <h3 className="max-w-[24ch] font-display text-[28px] font-medium leading-[1.12] tracking-tight text-ink">{item.q}</h3>
                <p className="mt-5 max-w-[58ch] text-[16px] leading-[1.75] text-ink/80"><Answer text={item.a} /></p>
              </motion.div>
            </AnimatePresence>
          </div>
          <div className="grid grid-cols-2 divide-x divide-line border-t border-line">
            <button type="button" onClick={() => go(cur - 1)} className="group flex min-w-0 items-center gap-2.5 px-5 py-3 text-left transition-colors hover:bg-tile/40">
              <Back className="h-3.5 w-3.5 shrink-0 text-mut transition-transform group-hover:-translate-x-0.5 group-hover:text-ink" />
              <span className="min-w-0"><span className="label block !text-[9.5px]">Previous</span><span className="block truncate text-[13px] text-ink/80">{ALL[(cur - 1 + ALL.length) % ALL.length].q}</span></span>
            </button>
            <button type="button" onClick={() => go(cur + 1)} className="group flex min-w-0 items-center justify-end gap-2.5 px-5 py-3 text-right transition-colors hover:bg-tile/40">
              <span className="min-w-0"><span className="label block !text-[9.5px]">Next</span><span className="block truncate text-[13px] text-ink/80">{ALL[(cur + 1) % ALL.length].q}</span></span>
              <Arrow className="h-3.5 w-3.5 shrink-0 text-mut transition-transform group-hover:translate-x-0.5 group-hover:text-ink" />
            </button>
          </div>
        </div>
      </div>

      {/* Narrow: the same manual as a list that opens in place */}
      <div className="mt-7 space-y-7 lg:hidden">
        {TOPICS.map((t) => (
          <section key={t.key}>
            <div className="label mb-2 flex items-center justify-between"><span className="text-ink/80">{t.label}</span><span>{t.items.length}</span></div>
            <ul className="divide-y divide-line border-y border-line">
              {ALL.filter((x) => x.topic === t.key).map((x) => {
                const open = x.n === cur && !folded;
                return (
                  <li key={x.q}>
                    <button type="button" aria-expanded={open} onClick={() => { if (x.n === cur) setFolded((f) => !f); else { setCur(x.n); setFolded(false); } }} className="grid w-full grid-cols-[26px_1fr_16px] items-baseline gap-2 py-3.5 text-left">
                      <span className={`figure text-xs ${open ? 'text-hood-600' : 'text-mut'}`}>{num(x.n)}</span>
                      <span className={`text-[15px] leading-snug ${open ? 'font-semibold text-ink' : 'text-ink/85'}`}>{x.q}</span>
                      <CaretDown className={`h-3.5 w-3.5 self-center text-mut transition-transform duration-300 ${open ? 'rotate-180 text-hood-600' : ''}`} />
                    </button>
                    <AnimatePresence initial={false}>
                      {open && (
                        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.3, ease: EASE }} className="overflow-hidden">
                          <p className="pb-5 pl-[34px] pr-1 text-[15px] leading-[1.7] text-ink/75"><Answer text={x.a} /></p>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
        {COMMUNITY_URL && <a href={COMMUNITY_URL} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2.5 text-sm text-mut"><Telegram className="h-5 w-5 shrink-0 text-[#2AABEE]" />Not in the list? Ask in the Telegram group.</a>}
      </div>
    </div>
  );
}
