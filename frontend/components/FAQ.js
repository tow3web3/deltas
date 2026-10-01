'use client';

// The questions, as a reader. On a wide screen: the topics, the questions of
// the topic and the answer side by side in one glass frame, like a reference
// manual; the arrow keys walk through the whole manual. On a narrow one the
// same content folds into a list that opens in place. Solana first: the
// Robinhood Chain answers live in a topic of their own. An answer that names a
// stock, a token or a platform shows its logo inline (markers: components/Rich.js).
import { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import Rich from './Rich';
import { Arrow, Back, CaretDown, Telegram } from './Icons';
import { BRAND, COMMUNITY_URL } from '../lib/brand';
import { STOCKS } from '../lib/stocks';
import { XSTOCKS_TOTAL } from '../lib/xstocks';

const EASE = [0.16, 1, 0.3, 1];
const N = STOCKS.length;
const XN = XSTOCKS_TOTAL.toLocaleString('en-US');

const TOPICS = [
  {
    key: 'fees',
    label: 'Fees and routing',
    items: [
      { q: `What does ${BRAND} do?`, a: `It routes the creator fees of a coin to the places its creator chooses, every cycle, on chain, with a receipt. Solana first, where coins launch on {b:pump.fun}, and Robinhood Chain too. The destinations: holders, your own wallets, a buyback and burn, a treasury held in stocks, and any page on the internet.` },
      { q: 'Where do the fees come from?', a: `From pump.fun. Every trade of a pump.fun coin sets a creator fee aside for the wallet that created it: on the bonding curve, then on PumpSwap once the coin graduates. Each cycle ${BRAND} collects both into that wallet, keeps 0.02 {s:SOL} there for network fees, and routes everything above it.` },
      { q: 'Which wallet does it need?', a: `The one pump.fun pays: the wallet that created the coin. You give its key to the bot the way Phantom exports it, base58 or the JSON array, and it is encrypted the moment it arrives. If pump.fun names another wallet as the creator, the fees accrue there, and only what lands in this wallet is routed.` },
      { q: 'Can I keep part of the fees?', a: 'Yes. Add one of your wallets as a destination and give it a share. The shares of a cycle add up to 100%, in any mix of holders, wallets, a buyback and burn, a treasury and pages. The routing is public on the page of the coin, so holders know the policy.' },
      { q: 'What is the treasury?', a: 'A wallet you control that receives a share of every cycle, held in stocks. On Solana that share buys an xStock on Jupiter, {s:SPYx}, {s:NVDAx}, {s:GLDx} or any other, and sends it there. It is a plain wallet: anyone can see what it holds on Solscan.' },
      { q: 'How often does it run?', a: 'Every 1, 2, 5, 10, 30 or 60 minutes, or once a day at the closing bell (4:00 pm New York time, weekdays). Any schedule can be limited to market hours.' },
      { q: 'What if there is too little to route?', a: 'Then the cycle waits. Below 0.005 {s:SOL} above the reserve nothing moves, and the fees keep adding up for the next cycle. A holders share too small to pay this cycle is carried to the next one.' },
      { q: 'Is there an API?', a: 'Yes, a free, public, read-only API at {l:/api/v1|/api/v1}: global stats, the coins routing, recent cycles and the pages being paid. No key needed. See the {l:/#developers|Developers} section.' },
    ],
  },
  {
    key: 'holders',
    label: 'Holders and rewards',
    items: [
      { q: 'What can holders be paid in?', a: '{s:SOL}, an xStock, or any token Jupiter knows. Each cycle the holders share is swapped into the reward on Jupiter, then paid to every holder by balance. Holders of one coin can be paid in another.' },
      { q: 'What is an xStock?', a: `A token on Solana that tracks a real stock or ETF, issued by Backed Finance: {s:NVDAx}, {s:TSLAx}, {s:SPYx}, {s:GLDx}, {s:AAPLx}. Every xStock is a Token-2022 mint whose symbol is the ticker plus x. ${BRAND} can pay any of the ${XN} xStocks Jupiter verifies.` },
      { q: 'How are a hundred holders paid?', a: 'In a few transactions. {s:SOL} goes out in batches of about 18 transfers per transaction, so a hundred holders are paid in a few seconds. A token goes out about 7 per transaction, opening the token account of a holder who has none.' },
      { q: 'Why was a small holder skipped?', a: 'Paying a token to a wallet that never held it means opening a token account, which costs about 0.002 {s:SOL}. When a holder\'s share is worth less than that, the cycle skips them for that cycle rather than spend more on the account than the payout, and the receipt counts them. Paid in {s:SOL}, there is no token account to open.' },
      { q: 'What if the swap price is bad?', a: 'Every swap is checked against the reference price from Jupiter\'s price API. If the best route returns less than 90% of it, the swap does not run: that share is paid in {s:SOL} instead, and the receipt says so. Your fees never disappear into price impact.' },
      { q: 'Who counts as a holder?', a: 'Real wallets. Every token account of the coin is read and summed per owner. The bonding curve, pools and any account owned by a program are left out, and so are the dev wallet and the treasury, so the payout goes to people.' },
    ],
  },
  {
    key: 'pages',
    label: 'Pages and claims',
    items: [
      { q: 'What is a page?', a: 'A place on the internet that can receive a share of the fees: a {p:youtube|YouTube} channel, a {p:github|GitHub} account, an {p:x|X}, {p:instagram|Instagram}, {p:tiktok|TikTok} or {p:twitch|Twitch} account, a {p:facebook|Facebook} page, a {p:domain|domain}, or a {p:phone|phone number}. You paste its link, set its share, and it becomes a destination like any other. Every page has a public profile at {c:/p/<platform>/<handle>}, and {l:/pages|/pages} lists every page receiving fees.' },
      { q: `What if the owner never heard of ${BRAND}?`, a: 'Nothing is lost. The page gets a vault of its own, one per chain, and every cycle sends its share there. The owner does not need to know beforehand: the money waits in the vault until they claim it.' },
      { q: 'How does an owner claim?', a: 'At {l:/claim|/claim}. First they prove the page: a sign-in with the platform itself for {p:youtube|YouTube}, {p:github|GitHub}, {p:x|X}, {p:instagram|Instagram}, {p:facebook|Facebook}, {p:tiktok|TikTok} and {p:twitch|Twitch}; a DNS TXT record for a {p:domain|domain}; a six-digit code by WhatsApp or SMS for a {p:phone|phone number}. Then they connect a wallet and sign once, with no gas. The vault is swept to them, and later cycles pay that wallet directly.' },
      { q: 'Is the vault visible?', a: 'Yes. Anyone can see the vault address and its balance on the public profile of the page, for example {c:/p/github/your-project}, and check it on chain.' },
      { q: 'What if nobody claims?', a: 'The money stays in the vault of the page. It keeps receiving its share every cycle for as long as the creator keeps the route, and the balance stays public on the profile.' },
      { q: 'Is a phone number ever shown?', a: 'Never in full. A phone page shows the country code and the last two digits, like {c:+33 • •• •• •• 78}, and its address is a code of its own, so no link ever carries the number.' },
    ],
  },
  {
    key: 'safety',
    label: 'Safety',
    items: [
      { q: 'Are my funds safe?', a: 'The key of the dev wallet is encrypted with AES-256-GCM the moment it arrives, stored encrypted, and decrypted only in memory while a cycle runs. Use a dedicated wallet, the one that created the coin, never your main holdings.' },
      { q: 'What does a cycle do with the key?', a: 'Four things: collect the creator fees, swap on Jupiter behind the price guard, send each share to its destination, and burn when a buyback asks for it. Every one of those transactions is public on {l:https://solscan.io|Solscan}.' },
      { q: 'Can I stop it?', a: `Yes. Pause and resume from Telegram or the dashboard: paused, nothing goes out, and the fees keep landing in the wallet meanwhile. Deleting the configuration removes ${BRAND}'s access for good.` },
      { q: `Does ${BRAND} keep my platform login?`, a: 'No. The sign-in is read only: the access token is used once, to read which pages your account runs, then dropped. The proof lives in a signed cookie that expires in thirty minutes.' },
    ],
  },
  {
    key: 'robinhood',
    label: 'On Robinhood Chain',
    items: [
      { q: 'Does it run on Robinhood Chain too?', a: `Yes, as the second chain. Coins from launchpads there, PONS among them, pay their creators in {s:ETH} and Robinhood Stock Tokens, straight to the dev wallet. Every cycle ${BRAND} sweeps that wallet above a small gas reserve and routes it the same way, with ETH where Solana uses SOL.` },
      { q: 'What is a Robinhood Stock Token?', a: `A token on Robinhood Chain that tracks a real stock or ETF: {s:NVDA}, {s:TSLA}, {s:SPY}, {s:GLD} and ${N - 4} more. They are plain ERC-20s, so ${BRAND} can buy them and send them to holders like any other token.` },
      { q: 'Do holders get the stock the launchpad paid?', a: 'Yes, by default. Stock fees pass through in kind: {s:NVDA} in, {s:NVDA} out, by balance, with no swap. {s:ETH} fees are converted to the reward you picked.' },
      { q: 'Where are the swaps made there?', a: 'On Uniswap V2, V3 and V4, or on the PONS bonding curve. The guard compares each swap to Yahoo Finance for a stock and to DexScreener for a coin; below 90% of that price, the share is paid in {s:ETH} instead.' },
      { q: 'What is loyalty weighting?', a: `An optional rule per coin on Robinhood Chain. ${BRAND} rebuilds every wallet's history from Transfer logs, so it knows how long each wallet has held and whether it sold. With loyalty on, a wallet's weight ramps from 1x to 2x (up to 5x if the creator wants) over the ramp period, wallets younger than the minimum hold get nothing that cycle, and any sell restarts the clock.` },
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
          <div className="eyebrow mb-4">FAQ</div>
          <h2 className="font-display text-[36px] font-medium leading-[1.05] tracking-[-0.03em] text-ink sm:text-[44px]">Questions, answered.</h2>
          <p className="mt-4 max-w-md text-[16px] leading-relaxed text-mut">pump.fun fees, Jupiter swaps, xStocks, pages and their owners. Robinhood Chain has a topic of its own.</p>
        </div>
        <dl className="flex gap-8 lg:text-right">
          <div><dd className="figure text-4xl font-medium tracking-[-0.03em] text-ink">{ALL.length}</dd><dt className="label mt-1">answers</dt></div>
          <div><dd className="figure text-4xl font-medium tracking-[-0.03em] text-ink">{TOPICS.length}</dd><dt className="label mt-1">topics</dt></div>
        </dl>
      </div>

      {/* Wide: topics, questions, answer */}
      <div className="frame mt-8 hidden min-h-[480px] grid-cols-[210px_minmax(0,0.95fr)_minmax(0,1.3fr)] divide-x divide-white/10 overflow-hidden lg:grid" onKeyDown={onKey}>
        <nav aria-label="Topics" className="flex flex-col justify-between">
          <ul className="py-3">
            {TOPICS.map((t) => {
              const on = t.key === item.topic;
              return (
                <li key={t.key}>
                  <button type="button" onClick={() => setCur(FIRST[t.key])} aria-current={on} className={`relative flex w-full items-center gap-2.5 px-5 py-3 text-left text-sm transition-colors ${on ? 'font-medium text-ink' : 'text-mut hover:text-ink'}`}>
                    {on && <motion.span layoutId="faq-topic" className="beam absolute inset-y-2 left-0 w-[2px] rounded-full shadow-[0_0_12px_#5FE3FF]" transition={{ duration: 0.35, ease: EASE }} />}
                    <span className="flex-1">{t.label}</span>
                    <span className="figure font-mono text-[11px] text-dim">{t.items.length}</span>
                  </button>
                </li>
              );
            })}
          </ul>
          <div className="border-t border-white/10 px-5 py-4">
            <div className="label !text-[9.5px]">Keys</div>
            <div className="mt-1.5 flex items-center gap-1.5 text-[12px] text-mut">
              <kbd className="rounded-md border border-white/10 bg-white/5 px-1.5 font-mono text-[11px] text-ink">↑</kbd>
              <kbd className="rounded-md border border-white/10 bg-white/5 px-1.5 font-mono text-[11px] text-ink">↓</kbd>
              <span>walk the manual</span>
            </div>
          </div>
          {COMMUNITY_URL && <a href={COMMUNITY_URL} target="_blank" rel="noopener noreferrer" className="group flex items-center gap-2.5 border-t border-white/10 px-5 py-4 text-[13px] leading-snug text-mut transition-colors hover:text-ink">
            <Telegram className="h-5 w-5 shrink-0 text-[#2AABEE]" />
            <span>Not in the list? Ask in the Telegram group.</span>
          </a>}
        </nav>

        <div className="min-w-0">
          <div className="label flex items-center justify-between border-b border-white/10 px-5 py-3"><span>{item.topicLabel}</span><span className="text-dim">{ALL.filter((x) => x.topic === item.topic).length}</span></div>
          <ul className="py-1.5">
            {ALL.filter((x) => x.topic === item.topic).map((x) => {
              const on = x.n === cur;
              return (
                <li key={x.q} className="px-2">
                  <button type="button" onClick={() => setCur(x.n)} aria-current={on} className={`group grid w-full grid-cols-[26px_1fr_14px] items-baseline gap-2 rounded-xl px-3 py-2.5 text-left transition-colors ${on ? 'bg-white/[0.06]' : 'hover:bg-white/[0.03]'}`}>
                    <span className={`figure font-mono text-[11px] ${on ? 'text-cyan-500' : 'text-dim'}`}>{num(x.n)}</span>
                    <span className={`text-sm leading-snug ${on ? 'font-medium text-ink' : 'text-ink/70 group-hover:text-ink'}`}>{x.q}</span>
                    <Arrow className={`h-3 w-3 self-center transition-opacity ${on ? 'text-cyan-500 opacity-100' : 'text-mut opacity-0 group-hover:opacity-100'}`} />
                  </button>
                </li>
              );
            })}
          </ul>
        </div>

        <div className="relative flex min-w-0 flex-col">
          {/* the light of the answer: a faint glow from the top left of the pane */}
          <span aria-hidden="true" className="pointer-events-none absolute -left-24 -top-24 h-72 w-72 rounded-full bg-hood-500/10 blur-3xl" />
          <div className="label relative flex items-center justify-between border-b border-white/10 px-7 py-3">
            <span>Answer</span>
            <span><span className="text-ink">{num(cur)}</span> of {ALL.length}</span>
          </div>
          <div className="relative flex-1 px-7 py-8" aria-live="polite">
            <AnimatePresence mode="wait" initial={false}>
              <motion.div key={cur} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.28, ease: EASE }}>
                <h3 className="max-w-[24ch] font-display text-[28px] font-medium leading-[1.12] tracking-[-0.025em] text-ink">{item.q}</h3>
                <p className="mt-5 max-w-[58ch] text-[16px] leading-[1.75] text-ink/80"><Answer text={item.a} /></p>
              </motion.div>
            </AnimatePresence>
          </div>
          <div className="relative grid grid-cols-2 divide-x divide-white/10 border-t border-white/10">
            <button type="button" onClick={() => go(cur - 1)} className="group flex min-w-0 items-center gap-2.5 px-5 py-3.5 text-left transition-colors hover:bg-white/[0.03]">
              <Back className="h-3.5 w-3.5 shrink-0 text-mut transition-transform group-hover:-translate-x-0.5 group-hover:text-ink" />
              <span className="min-w-0"><span className="label block !text-[9.5px]">Previous</span><span className="block truncate text-[13px] text-ink/75">{ALL[(cur - 1 + ALL.length) % ALL.length].q}</span></span>
            </button>
            <button type="button" onClick={() => go(cur + 1)} className="group flex min-w-0 items-center justify-end gap-2.5 px-5 py-3.5 text-right transition-colors hover:bg-white/[0.03]">
              <span className="min-w-0"><span className="label block !text-[9.5px]">Next</span><span className="block truncate text-[13px] text-ink/75">{ALL[(cur + 1) % ALL.length].q}</span></span>
              <Arrow className="h-3.5 w-3.5 shrink-0 text-mut transition-transform group-hover:translate-x-0.5 group-hover:text-ink" />
            </button>
          </div>
        </div>
      </div>

      {/* Narrow: the same manual as a list that opens in place */}
      <div className="mt-8 space-y-4 lg:hidden">
        {TOPICS.map((t) => (
          <section key={t.key} className="panel overflow-hidden">
            <div className="label flex items-center justify-between border-b border-white/10 px-4 py-3">
              <span className="text-ink/80">{t.label}</span><span>{t.items.length}</span>
            </div>
            <ul className="divide-y divide-white/10">
              {ALL.filter((x) => x.topic === t.key).map((x) => {
                const open = x.n === cur && !folded;
                return (
                  <li key={x.q}>
                    <button type="button" aria-expanded={open} onClick={() => { if (x.n === cur) setFolded((f) => !f); else { setCur(x.n); setFolded(false); } }} className="grid w-full grid-cols-[26px_1fr_16px] items-baseline gap-2 px-4 py-3.5 text-left">
                      <span className={`figure font-mono text-[11px] ${open ? 'text-cyan-500' : 'text-dim'}`}>{num(x.n)}</span>
                      <span className={`text-[15px] leading-snug ${open ? 'font-medium text-ink' : 'text-ink/85'}`}>{x.q}</span>
                      <CaretDown className={`h-3.5 w-3.5 self-center text-mut transition-transform duration-300 ${open ? 'rotate-180 !text-cyan-500' : ''}`} />
                    </button>
                    <AnimatePresence initial={false}>
                      {open && (
                        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.3, ease: EASE }} className="overflow-hidden">
                          <p className="pb-5 pl-[50px] pr-4 text-[15px] leading-[1.7] text-ink/75"><Answer text={x.a} /></p>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
        {COMMUNITY_URL && <a href={COMMUNITY_URL} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2.5 px-1 text-sm text-mut"><Telegram className="h-5 w-5 shrink-0 text-[#2AABEE]" />Not in the list? Ask in the Telegram group.</a>}
      </div>
    </div>
  );
}
