'use client';

// What protects the money, told as the path it takes: the key, the swap, the
// vault, the claim, the public record. Each station is lit on one beam and says
// what guards it and the value anyone can check. Below, the two guards that are
// easiest to get wrong, drawn out: the fair-price floor as a channel bar, and
// how a page proves who owns it.
import { motion, useReducedMotion } from 'motion/react';
import StockLogo from './StockLogo';
import { Arrow, Eye, Key, PlatformIcon, Shield, Vault, Verified } from './Icons';
import { Glass, EASE } from './ui/Light';
import { BRAND } from '../lib/brand';
import { getXStock } from '../lib/xstocks';

const SOL_MINT = 'So11111111111111111111111111111111111111112';
const NVDAX = getXStock('NVDA');
const SIGN_IN = ['youtube', 'github', 'x', 'instagram', 'facebook', 'tiktok', 'twitch'];

const STATIONS = [
  { key: 'key', icon: Key, title: 'The key', body: 'Encrypted the moment it arrives and stored encrypted. Decrypted only in memory, while a cycle runs.', value: 'AES-256-GCM' },
  { key: 'swap', icon: Shield, title: 'The swap', body: 'The route must return 90% of the reference price, or that share is paid in SOL instead.', value: '90% floor' },
  { key: 'vault', icon: Vault, title: 'The vault', body: 'Every page has a vault of its own, one per chain. Only its proven owner can sweep it.', value: '1 per page, per chain' },
  { key: 'claim', icon: Verified, title: 'The claim', body: 'Proved by the platform itself, a DNS record or a code to the phone. No form, no ticket.', value: 'OAuth · DNS · code' },
  { key: 'record', icon: Eye, title: 'The record', body: 'Every payment is a transaction anyone can open on Solscan, and every cycle leaves a receipt.', value: 'public, on chain' },
];

/** The five stations on one beam, a pulse travelling from the key to the record. */
function Path() {
  const still = useReducedMotion();
  return (
    <Glass lit="top" className="relative mt-8 px-5 py-7 sm:px-8 sm:py-9">
      <div className="relative">
        {/* the beam, across on a wide screen */}
        <div aria-hidden="true" className="absolute left-[10%] right-[10%] top-[21px] hidden h-[2px] lg:block">
          <span className="beam absolute inset-0 rounded-full opacity-50" />
          <span className="beam absolute inset-0 rounded-full opacity-70 blur-[6px]" />
          {!still && (
            <motion.span
              className="absolute top-1/2 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white shadow-[0_0_14px_#5FE3FF]"
              initial={{ left: '0%' }} animate={{ left: ['0%', '100%'] }}
              transition={{ duration: 4.2, repeat: Infinity, repeatDelay: 0.6, ease: [0.4, 0, 0.2, 1] }}
            />
          )}
        </div>
        {/* and down, on a narrow one */}
        <div aria-hidden="true" className="absolute bottom-6 left-[21px] top-6 w-[2px] rounded-full opacity-60 lg:hidden" style={{ background: 'linear-gradient(180deg, #2FA8FF, #5FE3FF 45%, #7B5CFF)' }} />

        <ol className="relative grid gap-7 lg:grid-cols-5 lg:gap-5">
          {STATIONS.map((s, i) => {
            const I = s.icon;
            return (
              <motion.li
                key={s.key}
                initial={{ opacity: 0, y: 14 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.3 }}
                transition={{ delay: i * 0.08, duration: 0.6, ease: EASE }}
                className="flex gap-4 lg:block lg:text-center"
              >
                <span className="relative z-10 flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-[rgba(5,7,12,0.9)] shadow-glow lg:mx-auto">
                  <I className="h-5 w-5 text-cyan-500" />
                </span>
                <div className="min-w-0 lg:mt-5">
                  <div className="flex items-baseline gap-2 lg:justify-center">
                    <span className="font-mono text-[10.5px] text-dim">{String(i + 1).padStart(2, '0')}</span>
                    <h3 className="text-[15px] font-medium text-ink">{s.title}</h3>
                  </div>
                  <p className="mt-1.5 text-[13px] leading-relaxed text-mut lg:mx-auto lg:max-w-[22ch]">{s.body}</p>
                  <code className="mt-3 inline-block whitespace-nowrap rounded-full border border-white/10 bg-white/5 px-2.5 py-0.5 font-mono text-[11px] text-cyan-500">{s.value}</code>
                </div>
              </motion.li>
            );
          })}
        </ol>
      </div>
    </Glass>
  );
}

/** The guard as a channel bar: what a route returns as a share of the reference price, the floor at 90%. */
function Guard() {
  return (
    <Glass lit="left" className="flex h-full flex-col p-6 sm:p-7">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className="label">The fair-price guard</span>
        <span className="flex items-center gap-1.5 font-mono text-[12px] text-ink">
          <StockLogo address={SOL_MINT} meta={{ symbol: 'SOL', image: '/sol.png' }} size="h-5 w-5" text="text-[6px]" />SOL
          <Arrow className="mx-0.5 h-3 w-3 text-mut" />
          <StockLogo address={NVDAX?.mint} meta={{ symbol: 'NVDAx', image: NVDAX?.logo }} size="h-5 w-5" text="text-[6px]" />NVDAx
        </span>
      </div>
      <h3 className="mt-5 text-[22px] font-medium leading-tight tracking-[-0.02em] text-ink">A thin pool never eats the fees.</h3>
      <p className="mt-2 max-w-md text-[14px] leading-relaxed text-mut">Before a swap runs on Jupiter, what the route returns is compared to the reference price from Jupiter&apos;s price API. Below 90% of it the swap does not run: that share is paid in SOL, and the receipt says so.</p>

      <div className="mt-10 flex-1">
        <div className="relative h-3 rounded-full bg-white/[0.06]">
          <div className="absolute inset-y-0 left-0 w-[90%] rounded-l-full bg-down/20" />
          <motion.div
            initial={{ scaleX: 0 }} whileInView={{ scaleX: 1 }} viewport={{ once: true }} transition={{ duration: 0.9, ease: EASE }}
            className="beam absolute inset-y-0 left-[90%] right-0 origin-left rounded-r-full shadow-[0_0_18px_rgba(95,227,255,0.55)]"
          />
          <div className="absolute -bottom-2 -top-2 left-[90%] w-px bg-ink" />
          <span className="figure absolute -top-7 left-[90%] -translate-x-1/2 font-mono text-xs text-ink">90%</span>
        </div>
        <div className="mt-3 flex items-start justify-between gap-4 text-[12.5px] leading-snug">
          <span className="text-mut">Below the floor<br /><span className="text-ink/85">the share is paid in SOL</span></span>
          <span className="text-right text-mut">At or above<br /><span className="text-cyan-500">the swap runs</span></span>
        </div>
        <div className="label mt-3 !text-[9.5px]">what the route returns, as a share of the reference price</div>
      </div>

      <p className="mt-6 border-t border-white/10 pt-4 text-[12.5px] leading-relaxed text-mut">Also on Robinhood Chain: there the reference is Yahoo Finance for a stock and DexScreener for a coin, and the fallback is ETH.</p>
    </Glass>
  );
}

/** How a page proves its owner: three ways, none of which leaves a door open. */
function Proofs() {
  const rows = [
    {
      icon: <span className="grid grid-cols-2 gap-1"><PlatformIcon platform="youtube" className="h-3.5 w-3.5" /><PlatformIcon platform="github" className="h-3.5 w-3.5" /><PlatformIcon platform="x" className="h-3.5 w-3.5" /><PlatformIcon platform="twitch" className="h-3.5 w-3.5" /></span>,
      title: 'A sign-in with the platform',
      body: 'Read only, for every platform below. The access token is used once, to read which pages the account runs, then dropped. It is never stored.',
      extra: <span className="mt-2.5 flex flex-wrap gap-2">{SIGN_IN.map((k) => <PlatformIcon key={k} platform={k} className="h-4 w-4" />)}</span>,
    },
    {
      icon: <PlatformIcon platform="domain" className="h-5 w-5" />,
      title: 'A DNS record',
      body: <>A TXT record on <code className="rounded-md border border-white/10 bg-white/[0.06] px-1.5 py-px font-mono text-[0.85em] text-ink">_deltas.yourdomain.com</code>, which only whoever runs the domain can add.</>,
    },
    {
      icon: <PlatformIcon platform="phone" className="h-5 w-5" />,
      title: 'A code to the phone',
      body: 'Six digits by WhatsApp or SMS. The number is only ever shown masked, and never put in a URL: a phone page has an address of its own.',
      extra: <span className="mt-2.5 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 font-mono text-[12px] text-ink"><PlatformIcon platform="phone" className="h-3.5 w-3.5" />+33 • •• •• •• 78</span>,
    },
  ];
  return (
    <Glass lit="none" className="flex h-full flex-col p-6 sm:p-7">
      <span className="label">How a page proves its owner</span>
      <ul className="mt-5 flex-1 divide-y divide-white/10">
        {rows.map((r) => (
          <li key={r.title} className="flex gap-4 py-4 first:pt-0 last:pb-0">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/5">{r.icon}</span>
            <div className="min-w-0">
              <div className="text-[14.5px] font-medium text-ink">{r.title}</div>
              <p className="mt-1 text-[13px] leading-relaxed text-mut">{r.body}</p>
              {r.extra}
            </div>
          </li>
        ))}
      </ul>
    </Glass>
  );
}

export default function Security() {
  return (
    <div id="security" className="scroll-mt-20">
      <div className="grid items-end gap-6 lg:grid-cols-[1fr_auto]">
        <div className="max-w-2xl">
          <div className="eyebrow mb-4">Security</div>
          <h2 className="font-display text-[36px] font-medium leading-[1.05] tracking-[-0.03em] text-ink sm:text-[44px]">What protects the money.</h2>
          <p className="mt-4 max-w-md text-[16px] leading-relaxed text-mut">A cycle uses a wallet key and moves real value. These are the rules it runs under, from the key to the receipt, and each one can be checked.</p>
        </div>
        <div className="label lg:text-right">Five guards<br /><span className="text-ink">one beam, key to receipt</span></div>
      </div>

      <Path />

      <div className="mt-3 grid gap-3 lg:grid-cols-12">
        <div className="lg:col-span-7"><Guard /></div>
        <div className="lg:col-span-5"><Proofs /></div>
      </div>

      <div className="mt-3 flex flex-col gap-3 rounded-2xl border border-white/10 bg-white/[0.03] px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-[13.5px] leading-relaxed text-mut"><span className="text-ink">Use a dedicated wallet</span>, the one that created the coin, funded with what cycles need. Never your main holdings.</p>
        <div className="flex shrink-0 flex-wrap items-center gap-1.5">
          {['pause', 'resume', 'delete'].map((v) => <code key={v} className="rounded-full border border-white/10 bg-white/5 px-2.5 py-0.5 font-mono text-[11px] text-ink/85">{v}</code>)}
          <span className="ml-1 text-[12.5px] text-mut">any time, from Telegram or the dashboard. Deleting ends {BRAND}&apos;s access.</span>
        </div>
      </div>
    </div>
  );
}
