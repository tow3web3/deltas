'use client';

// The project token runs on its own product. This is its card and its live
// routing on the homepage, straight from the public dashboard API: the routing
// drawn as light on the left, the record of what it has done on the right.
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { motion, useInView } from 'motion/react';
import PolicyMini from './PolicyMini';
import { Mark } from './Logo';
import { Glass, EASE } from './ui/Light';
import { Arrow, Vote, Copy, Check, External } from './Icons';
import { BRAND, TOKEN_CA, TOKEN_SYMBOL } from '../lib/brand';
import { chainOf, dexScreenerFor, explorerTokenFor, CHAINS } from '../lib/chains';

const fmt = (raw, decimals = 18) => {
  const n = Number(raw || 0) / 10 ** decimals;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n >= 1 || n === 0 ? n.toFixed(2) : n.toFixed(4);
};

/** The last cycles, one lit bar each, as tall as the fees that cycle routed. */
function Cycles({ runs, start, decimals, native }) {
  const [hover, setHover] = useState(null);
  const bars = [...runs].slice(0, 24).reverse().map((r) => ({ v: Number(r.claimedEth || 0) / 10 ** decimals, holders: r.holderCount, at: r.executionTime }));
  const max = Math.max(...bars.map((b) => b.v), 0);
  const shown = hover != null ? bars[hover] : null;
  return (
    <div className="flex h-full flex-col">
      <div className="flex min-h-[4.5rem] flex-1 items-end gap-[3px]" onMouseLeave={() => setHover(null)}>
        {bars.map((b, i) => {
          const lit = hover === i || (hover == null && i === bars.length - 1);
          return (
            <div key={i} className="flex h-full flex-1 items-end" onMouseEnter={() => setHover(i)}>
              <motion.div
                initial={{ scaleY: 0 }} animate={start ? { scaleY: 1 } : { scaleY: 0 }}
                transition={{ duration: 0.6, delay: 0.2 + i * 0.02, ease: EASE }}
                className="w-full rounded-t-[2px] transition-[opacity,box-shadow] duration-200"
                style={{
                  height: `${max > 0 ? Math.max(6, (b.v / max) * 100) : 6}%`,
                  transformOrigin: 'bottom',
                  background: 'linear-gradient(180deg, #5FE3FF 0%, #2FA8FF 55%, #7B5CFF 100%)',
                  opacity: lit ? 1 : 0.4,
                  boxShadow: lit ? '0 0 14px rgba(95,227,255,0.55)' : 'none',
                }}
              />
            </div>
          );
        })}
      </div>
      <div className="mt-2.5 flex items-center justify-between gap-3 font-mono text-[10px] text-mut">
        {shown ? (
          <>
            <span>{new Date(shown.at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
            <span className="text-ink/85">{shown.v.toFixed(3)} {native}{shown.holders ? ` to ${shown.holders}` : ''}</span>
          </>
        ) : (
          <>
            <span>last {bars.length} cycles</span>
            <span>fees routed per cycle</span>
          </>
        )}
      </div>
    </div>
  );
}

function Line({ label, value, unit }) {
  return (
    <div className="flex items-baseline justify-between gap-4 px-5 py-3.5">
      <span className="label">{label}</span>
      <span className="figure text-right text-xl font-medium leading-none tracking-[-0.02em] text-ink">{value}{unit && <span className="ml-1.5 font-mono text-[10px] font-normal tracking-normal text-mut">{unit}</span>}</span>
    </div>
  );
}

export default function TokenLive() {
  const [data, setData] = useState(null);
  useEffect(() => {
    if (!TOKEN_CA) return undefined;
    let alive = true;
    const load = () => fetch(`/api/dashboard/${TOKEN_CA}`, { cache: 'no-store' }).then((r) => (r.ok ? r.json() : null)).then((d) => alive && d && setData(d)).catch(() => {});
    load();
    const t = setInterval(load, 60_000);
    return () => { alive = false; clearInterval(t); };
  }, []);
  if (!TOKEN_CA) return null;
  // The address is shown from the first minute, before the coin is even linked; the live routing joins it once it is.
  return (
    <div id="token" className="scroll-mt-20 space-y-6">
      <TokenCard data={data} />
      {data && <Live data={data} />}
    </div>
  );
}

/**
 * The card of the project token: the mark in its glow, the full address ready
 * to copy, and where to buy it, chart it and read it on the explorer. Always
 * present once the address is set: it is what people come to the homepage for
 * on launch day.
 */
function TokenCard({ data }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try { await navigator.clipboard.writeText(TOKEN_CA); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch { /* clipboard unavailable */ }
  };
  const sym = data?.sourceToken?.symbol || TOKEN_SYMBOL;
  const chain = chainOf(TOKEN_CA) || 'solana';
  return (
    <Glass lit="left">
      <div aria-hidden="true" className="pointer-events-none absolute -left-24 -top-28 h-72 w-72 rounded-full bg-hood-500/15 blur-3xl" />
      <div className="relative grid gap-6 p-6 sm:p-8 lg:grid-cols-[auto_minmax(0,1fr)_auto] lg:items-center lg:gap-9">
        <div className="flex items-center gap-5">
          <span className="relative isolate shrink-0">
            <span aria-hidden="true" className="absolute -inset-3 -z-10 rounded-full blur-2xl" style={{ background: 'radial-gradient(circle, rgba(47,168,255,0.5), rgba(123,92,255,0.22) 60%, transparent 75%)' }} />
            <Mark className="h-20 w-20" />
          </span>
          <div>
            <div className="label">The token</div>
            <div className="mt-1 font-display text-[34px] font-medium leading-none tracking-[-0.03em] text-ink">${sym}</div>
            <div className="mt-1.5 text-[13px] text-mut">on {CHAINS[chain].label} · routes its own fees</div>
          </div>
        </div>
        <div className="min-w-0">
          <div className="label mb-2">{chain === 'solana' ? 'Mint address' : 'Contract address'}</div>
          <button type="button" onClick={copy} title="Copy the address" className="group flex w-full items-center justify-between gap-4 rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-left transition-colors hover:border-cyan-500/50">
            <span className="min-w-0 truncate font-mono text-sm text-ink sm:text-[15px]">{TOKEN_CA}</span>
            <span className="flex shrink-0 items-center gap-1.5 font-mono text-xs text-cyan-500">{copied ? <><Check className="h-4 w-4" />copied</> : <><Copy className="h-4 w-4" />copy</>}</span>
          </button>
          <p className="mt-2 text-xs text-mut">Check the address here before you buy: this page is the only source.</p>
        </div>
        <div className="flex flex-wrap gap-2 lg:flex-col">
          <a href={dexScreenerFor(chain, TOKEN_CA)} target="_blank" rel="noopener noreferrer" className="btn-primary whitespace-nowrap">Chart and buy<External className="h-3.5 w-3.5" /></a>
          <a href={explorerTokenFor(chain, TOKEN_CA)} target="_blank" rel="noopener noreferrer" className="btn-ghost whitespace-nowrap">{chain === 'solana' ? 'Mint' : 'Contract'}<External className="h-3.5 w-3.5" /></a>
        </div>
      </div>
    </Glass>
  );
}

// Mounted once the data is there, so the entrance is tied to an element that exists.
function Live({ data }) {
  const ref = useRef(null);
  const start = useInView(ref, { once: true, amount: 0.15 });
  const sym = data.sourceToken?.symbol || TOKEN_SYMBOL;
  const runs = Array.isArray(data.recentExecutions) ? data.recentExecutions : [];
  const active = data.config.isActive !== false;
  // The chain's own currency: SOL on Solana, ETH on Robinhood Chain.
  const chain = data.config.chain || chainOf(TOKEN_CA) || 'solana';
  const native = data.config.native || CHAINS[chain]?.native || 'SOL';
  const decimals = data.config.nativeDecimals || CHAINS[chain]?.nativeDecimals || 18;
  const srcDecimals = Number(data.sourceToken?.decimals ?? (chain === 'solana' ? 6 : 18));

  return (
    <div ref={ref}>
      <div className="mb-6 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="eyebrow mb-3">We route our own fees</div>
          <h2 className="flex flex-wrap items-center gap-x-3 gap-y-1 font-display text-[28px] font-medium leading-[1.08] tracking-[-0.03em] text-ink sm:text-[36px]">
            <span className="inline-flex items-center gap-2.5"><Mark className="h-8 w-8 sm:h-9 sm:w-9" />${sym}</span>
            <span>runs on {BRAND}, live</span>
          </h2>
          <p className="mt-3 max-w-xl text-[15px] leading-relaxed text-mut">The coin behind the product uses the product: {data.config.scheduleLabel?.toLowerCase()}, its creator fees are routed as drawn here. Every cycle is public.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/lottery" className="btn-ghost whitespace-nowrap"><Vote className="h-4 w-4 text-pink-600" />Daily lottery: 0.5% of fees</Link>
          <Link href={`/${TOKEN_CA}`} className="btn-primary whitespace-nowrap">Open the ${sym} page <Arrow className="h-4 w-4" /></Link>
        </div>
      </div>

      <div className="grid items-stretch gap-4 lg:grid-cols-12">
        <motion.div
          initial={{ opacity: 0, y: 14 }} animate={start ? { opacity: 1, y: 0 } : {}} transition={{ duration: 0.6, ease: EASE }}
          className="min-w-0 lg:col-span-8"
        >
          <PolicyMini source={data.sourceToken} devWallet={data.devWallet} schedule={data.config.scheduleLabel} legs={data.legs} split={data.config.split} countdown={{ intervalMinutes: data.config.intervalMinutes, scheduleKind: data.config.scheduleKind, active: data.config.isActive }} className="lg:!h-full" />
        </motion.div>

        <motion.aside
          initial={{ opacity: 0, y: 14 }} animate={start ? { opacity: 1, y: 0 } : {}} transition={{ duration: 0.6, delay: 0.1, ease: EASE }}
          className="frame frame-top flex flex-col overflow-hidden lg:col-span-4"
        >
          <div className="flex items-center justify-between gap-3 px-5 pb-4 pt-5">
            <span className="label">The record</span>
            <span className={`label flex items-center gap-1.5 ${active ? '!text-cyan-500' : ''}`}>
              <span className={`h-1.5 w-1.5 rounded-full ${active ? 'bg-cyan-500 shadow-[0_0_10px_#5FE3FF]' : 'bg-mut/50'}`} />{active ? data.config.scheduleLabel : 'Paused'}
            </span>
          </div>

          {runs.length > 0
            ? <div className="flex-1 px-5 pb-5"><Cycles runs={runs} start={start} decimals={decimals} native={native} /></div>
            : <div className="flex flex-1 items-center px-5 pb-5 text-sm text-mut">The first cycle is coming.</div>}

          <div className="divide-y divide-white/10 border-t border-white/10">
            <Line label="Fees routed" value={fmt(data.stats.totalEthClaimed, decimals)} unit={native} />
            <Line label="Bought back and burned" value={fmt(data.stats.totalBurned, srcDecimals)} unit={`$${sym}`} />
            <Line label="Cycles" value={String(data.stats.totalExecutions || 0)} />
            <Line label="Holders" value={String(data.stats.holderCount || 0)} />
          </div>
        </motion.aside>
      </div>
    </div>
  );
}
