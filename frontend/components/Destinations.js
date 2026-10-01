'use client';

// Everywhere a share of the fees can go, as the thing it is: a routing table.
// Each destination is a channel of light whose length is its share. The
// visitor can move the shares and see what one cycle would pay each
// destination. Holders absorb what the others leave, so the table always adds
// up to 100%, like the real one in the dashboard.
import { useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { motion, useInView } from 'motion/react';
import StockLogo from './StockLogo';
import { Arrow, PlatformIcon, Users, Wallet, Burn, Bank, World } from './Icons';
import { Glass, EASE } from './ui/Light';
import { PLATFORMS, PLATFORM_KEYS } from '../lib/pages';
import { getXStock } from '../lib/xstocks';

// One cycle, in SOL: 4.82 in the dev wallet, 0.02 kept for fees.
const CYCLE = 4.8;
const ROWS = [
  { key: 'holders', name: 'Holders', via: 'Pro rata by balance, with optional loyalty weighting', asset: 'NVDAx', alt: 'or SOL', Icon: Users, tone: 'text-cyan-500', share: 45, sink: true },
  { key: 'pages', name: 'Pages', via: 'Any page on the internet, each with its own vault', asset: 'SOL', Icon: World, tone: 'text-hood-600', share: 25, pages: true },
  { key: 'wallet', name: 'Wallets', via: 'You, a partner, a budget, a DAO', asset: 'SOL', Icon: Wallet, tone: 'text-ink/80', share: 10 },
  { key: 'burn', name: 'Buyback and burn', via: 'Buys your coin on Jupiter, burns it', asset: 'coin', Icon: Burn, tone: 'text-orange-700', share: 10 },
  { key: 'treasury', name: 'Treasury', via: 'Held in stocks, in a wallet you control', asset: 'SPYx', Icon: Bank, tone: 'text-ink/80', share: 10 },
];
const sol = (n) => n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// eslint-disable-next-line @next/next/no-img-element
const SolLogo = ({ className = 'h-4 w-4' }) => <img src="/sol.png" alt="" className={`shrink-0 rounded-full ${className}`} />;

/** What a destination is paid in, with its logo. */
function Asset({ asset, alt }) {
  const x = getXStock(asset);
  return (
    <span className="inline-flex items-center gap-1.5 font-mono text-[11.5px] text-ink/85">
      {x ? <StockLogo address={x.mint} meta={{ symbol: x.symbol, image: x.logo }} size="h-4 w-4" text="text-[5px]" />
        : asset === 'SOL' ? <SolLogo /> : null}
      {asset === 'coin' ? 'your coin' : asset}
      {alt && <span className="text-dim">{alt}</span>}
    </span>
  );
}

/** The nine kinds of page, as their own logos. */
function PageKinds() {
  return (
    <span className="flex flex-wrap items-center gap-1.5">
      {PLATFORM_KEYS.map((k) => (
        <span key={k} title={PLATFORMS[k].label} className="flex h-7 w-7 items-center justify-center rounded-full border border-white/10 bg-white/5">
          <PlatformIcon platform={k} className="h-3.5 w-3.5" />
          <span className="sr-only">{PLATFORMS[k].label}</span>
        </span>
      ))}
    </span>
  );
}

const stepBtn = 'flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-white/5 font-mono text-sm text-mut transition-colors hover:border-cyan-500/50 hover:text-ink disabled:pointer-events-none disabled:opacity-30';

export default function Destinations() {
  const ref = useRef(null);
  const seen = useInView(ref, { once: true, amount: 0.25 });
  const [shares, setShares] = useState(() => Object.fromEntries(ROWS.map((r) => [r.key, r.share])));
  const rows = useMemo(() => ROWS.map((r) => ({ ...r, share: shares[r.key] })), [shares]);

  // Moving a row takes from, or gives back to, the holders.
  const move = (key, delta) => setShares((s) => {
    const next = Math.max(0, Math.min(100, s[key] + delta));
    const holders = s.holders - (next - s[key]);
    if (holders < 0 || holders > 100) return s;
    return { ...s, [key]: next, holders };
  });

  return (
    <div id="destinations" ref={ref} className="scroll-mt-20">
      <div className="grid items-start gap-x-14 gap-y-10 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
        {/* the argument, and what one cycle brings in */}
        <div className="lg:pt-4">
          <div className="eyebrow mb-4">Destinations</div>
          <h2 className="font-display text-[34px] font-medium leading-[1.04] tracking-[-0.03em] text-ink sm:text-[44px]">One routing table. Any destination.</h2>
          <p className="mt-5 max-w-md text-[16px] leading-relaxed text-mut">
            Give each destination a share and the asset it is paid in: SOL, an xStock, any SPL token. Change it whenever you want, the next cycle follows the new table.
          </p>

          <div className="mt-10 border-t border-white/10 pt-6">
            <div className="label">One cycle</div>
            <div className="mt-2 flex items-baseline gap-2.5">
              <SolLogo className="h-7 w-7 self-center" />
              <span className="figure text-[56px] font-medium leading-none tracking-[-0.03em] text-ink">{sol(CYCLE)}</span>
              <span className="text-lg text-mut">SOL</span>
            </div>
            <p className="mt-3 max-w-xs text-[13px] leading-relaxed text-mut">Move the shares with − and + to see what each destination gets from it.</p>
          </div>

          <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-3 text-sm">
            <Link href="/app" className="group inline-flex items-center gap-1.5 font-medium text-hood-600 transition-colors hover:text-hood-700">Draw yours in the dashboard <Arrow className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" /></Link>
            <Link href="/pages" className="group inline-flex items-center gap-1.5 font-medium text-mut transition-colors hover:text-ink">Pages being paid <Arrow className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" /></Link>
          </div>
        </div>

        {/* the table, as channels of light */}
        <Glass lit="left">
          <div className="flex items-center justify-between border-b border-white/10 px-5 py-3.5 sm:px-6">
            <span className="label">Routing table · your coin</span>
            <span className="label">Total <span className="figure ml-1 text-[12px] text-ink">100%</span></span>
          </div>

          <ul className="divide-y divide-white/10">
            {rows.map((r, i) => (
              <motion.li
                key={r.key}
                initial={{ opacity: 0, x: -10 }} animate={seen ? { opacity: 1, x: 0 } : {}} transition={{ duration: 0.5, delay: 0.08 * i, ease: EASE }}
                className="px-5 py-5 sm:px-6"
              >
                <div className="flex items-center gap-3.5">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/5">
                    <r.Icon className={`h-5 w-5 ${r.tone}`} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5">
                      <span className="text-[15px] font-medium text-ink">{r.name}</span>
                      <Asset asset={r.asset} alt={r.alt} />
                    </div>
                    <div className="mt-0.5 truncate text-[13px] text-mut">{r.via}</div>
                  </div>
                  <div className="flex shrink-0 items-center gap-1.5">
                    {r.sink ? <span className="w-8" /> : <button type="button" onClick={() => move(r.key, -5)} disabled={r.share <= 0} aria-label={`Less to ${r.name}`} className={stepBtn}>−</button>}
                    <span className="w-12 text-center font-mono text-[15px] tabular-nums text-cyan-500">{r.share}%</span>
                    {r.sink ? <span className="w-8" /> : <button type="button" onClick={() => move(r.key, 5)} disabled={shares.holders < 5} aria-label={`More to ${r.name}`} className={stepBtn}>+</button>}
                  </div>
                </div>

                {/* the channel: its length is the share */}
                <div className="mt-4 flex items-center gap-4">
                  <div className="relative h-2 flex-1 rounded-full bg-white/[0.06]">
                    <motion.div
                      className="beam absolute inset-y-0 left-0 rounded-full shadow-[0_0_14px_rgba(47,168,255,0.55)]"
                      initial={{ width: 0 }} animate={{ width: seen ? `${r.share}%` : 0 }} transition={{ duration: 0.5, ease: EASE }}
                    >
                      {r.share > 0 && (
                        <motion.span
                          className="absolute top-1/2 h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white shadow-[0_0_8px_#fff]"
                          initial={{ left: '0%', opacity: 0 }} animate={{ left: '100%', opacity: [0, 1, 1, 0] }}
                          transition={{ duration: 2.2 + i * 0.25, delay: 0.6 + i * 0.3, repeat: Infinity, ease: 'linear' }}
                        />
                      )}
                    </motion.div>
                  </div>
                  <span className="w-[92px] shrink-0 text-right">
                    <span className="figure text-[15px] font-medium text-ink">{sol((CYCLE * r.share) / 100)}</span>
                    <span className="ml-1 text-[11px] text-mut">SOL</span>
                  </span>
                </div>

                {r.pages && <div className="mt-3.5"><PageKinds /></div>}
                {r.sink && <div className="label mt-3 !text-[9.5px]">Takes what the others leave</div>}
              </motion.li>
            ))}
          </ul>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/10 bg-black/20 px-5 py-3 sm:px-6">
            <span className="label">Paid every cycle, on chain</span>
            <span className="label">Each payment has a receipt</span>
          </div>
        </Glass>
      </div>
    </div>
  );
}
