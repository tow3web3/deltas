'use client';

// Everywhere a share of the fees can go, as the thing it is: a routing table.
// The visitor can move the shares and see what one cycle would pay each
// destination. Holders absorb what the others leave, so the table always adds
// up to 100%, like the real one on the canvas.
import { useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { motion, useInView } from 'motion/react';
import StockLogo from './StockLogo';
import { Arrow, PlatformIcon, Users, Wallet, Burn, Bank } from './Icons';
import { PLATFORMS, PLATFORM_KEYS } from '../lib/pages';
import { getStock } from '../lib/stocks';

const EASE = [0.16, 1, 0.3, 1];
const CYCLE = 1000;
const ROWS = [
  { key: 'holders', name: 'Holders', via: 'The dividend, by balance and holding time', asset: 'NVDA', color: '#2FA8FF', Icon: Users, share: 45, sink: true },
  { key: 'pages', name: 'Pages', via: 'A vault per page, claimed by signing in', asset: 'ETH', color: '#5B9DFF', share: 25, pages: true },
  { key: 'wallet', name: 'Wallets', via: 'You, a partner, a budget, a DAO', asset: 'in kind', color: '#F4F5F4', Icon: Wallet, share: 10 },
  { key: 'burn', name: 'Buyback and burn', via: 'Buys your coin on Uniswap, burns it', asset: 'your coin', color: '#FF7A1A', Icon: Burn, share: 10 },
  { key: 'treasury', name: 'Treasury', via: 'Retained in stocks, book value published', asset: 'SPY', color: '#F6C343', Icon: Bank, share: 10 },
];
const money = (n) => `$${n.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;

function Asset({ asset }) {
  const stock = getStock(asset);
  if (stock) return <span className="inline-flex items-center gap-1.5"><StockLogo address={stock.address} size="h-4 w-4" text="text-[5px]" />{asset}</span>;
  if (asset === 'ETH') return <span className="inline-flex items-center gap-1.5"><StockLogo address={null} size="h-4 w-4" text="text-[5px]" />ETH</span>;
  return <span>{asset}</span>;
}

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
      <div className="grid items-end gap-6 lg:grid-cols-[1fr_auto]">
        <div className="max-w-2xl">
          <div className="eyebrow mb-3">Destinations</div>
          <h2 className="font-display text-3xl font-medium tracking-tight text-ink sm:text-4xl">One routing table. Any destination.</h2>
          <p className="mt-3 text-[15px] leading-relaxed text-mut">Give each destination a share and the asset it is paid in. Change it whenever you want: the next cycle follows the new table. Move the shares below to see what a cycle pays.</p>
        </div>
        <div className="text-right">
          <div className="label">One cycle</div>
          <div className="figure font-display text-4xl font-medium tracking-tight text-ink">{money(CYCLE)}</div>
        </div>
      </div>

      <div className="frame mt-7 overflow-hidden">
        {/* the split, as one bar */}
        <div className="flex h-1.5 w-full">
          {rows.map((r) => <motion.div key={r.key} animate={{ width: `${r.share}%` }} transition={{ duration: 0.4, ease: EASE }} style={{ background: r.color }} />)}
        </div>

        <div className="label hidden grid-cols-[1.5fr_1.7fr_0.8fr_150px_90px] gap-4 border-b border-line px-5 py-2.5 md:grid">
          <span>Destination</span><span>How it is paid</span><span>Asset</span><span className="text-center">Share</span><span className="text-right">This cycle</span>
        </div>

        <ul className="divide-y divide-line">
          {rows.map((r, i) => (
            <motion.li
              key={r.key}
              initial={{ opacity: 0, x: -10 }} animate={seen ? { opacity: 1, x: 0 } : {}} transition={{ duration: 0.5, delay: 0.08 * i, ease: EASE }}
              className="grid grid-cols-[1fr_auto] items-center gap-x-4 gap-y-2 px-5 py-4 md:grid-cols-[1.5fr_1.7fr_0.8fr_150px_90px]"
            >
              <div className="flex min-w-0 items-center gap-3">
                <span className="h-8 w-[3px] shrink-0 rounded-full" style={{ background: r.color }} />
                {r.pages ? (
                  <span className="flex items-center [&>*+*]:-ml-1.5">
                    {PLATFORM_KEYS.slice(0, 4).map((k) => <span key={k} className="flex h-7 w-7 items-center justify-center rounded-full border border-line bg-tile ring-2 ring-paper"><PlatformIcon platform={k} className="h-3.5 w-3.5" /></span>)}
                  </span>
                ) : <r.Icon className="h-6 w-6 shrink-0" style={{ color: r.color }} />}
                <span className="min-w-0">
                  <span className="block truncate text-[15px] font-semibold text-ink">{r.name}</span>
                  {r.sink && <span className="label !text-[9.5px]">takes what the others leave</span>}
                  {r.pages && <span className="label !text-[9.5px] !text-hood-600">new</span>}
                </span>
              </div>

              <div className="order-last col-span-2 text-sm text-mut md:order-none md:col-span-1">
                {r.via}
                {r.pages && (
                  <span className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1">
                    {PLATFORM_KEYS.map((k) => <span key={k} className="inline-flex items-center gap-1 text-xs text-ink/80"><PlatformIcon platform={k} className="h-3 w-3" />{PLATFORMS[k].label}</span>)}
                  </span>
                )}
              </div>

              <div className="hidden font-mono text-xs text-ink md:block"><Asset asset={r.asset} /></div>

              <div className="col-start-2 row-start-1 flex items-center justify-end gap-1.5 md:col-start-auto md:row-start-auto md:justify-center">
                {r.sink ? <span className="w-7" /> : <button type="button" onClick={() => move(r.key, -5)} disabled={r.share <= 0} aria-label={`Less to ${r.name}`} className="flex h-7 w-7 items-center justify-center rounded-lg border border-line font-mono text-sm text-mut transition-colors hover:border-mut hover:text-ink disabled:opacity-30">−</button>}
                <span className="figure w-14 text-center text-lg font-medium text-ink">{r.share}%</span>
                {r.sink ? <span className="w-7" /> : <button type="button" onClick={() => move(r.key, 5)} disabled={shares.holders < 5} aria-label={`More to ${r.name}`} className="flex h-7 w-7 items-center justify-center rounded-lg border border-line font-mono text-sm text-mut transition-colors hover:border-mut hover:text-ink disabled:opacity-30">+</button>}
              </div>

              <div className="figure hidden text-right text-lg font-medium text-ink md:block">{money((CYCLE * r.share) / 100)}</div>
            </motion.li>
          ))}
        </ul>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line bg-ground/60 px-5 py-3">
          <span className="label">Total <span className="figure ml-1 text-ink">100%</span> · it always is</span>
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
            <Link href="/pages" className="group inline-flex items-center gap-1 font-semibold text-mut transition-colors hover:text-ink">Pages being paid <Arrow className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" /></Link>
            <Link href="/app" className="group inline-flex items-center gap-1 font-semibold text-hood-600 transition-colors hover:text-hood-700">Draw yours on the canvas <Arrow className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" /></Link>
          </div>
        </div>
      </div>
    </div>
  );
}
