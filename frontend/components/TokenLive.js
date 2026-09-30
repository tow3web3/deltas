'use client';

// The project token runs on its own product. This is its live routing and
// numbers, on the homepage, straight from the public dashboard API: the routing
// canvas on the left, the account of what it has done on the right.
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { motion, useInView } from 'motion/react';
import PolicyMini from './PolicyMini';
import StockLogo from './StockLogo';
import Countdown from './Countdown';
import { Arrow, Vote, Copy, Check, External } from './Icons';
import { BRAND, TOKEN_CA, TOKEN_SYMBOL } from '../lib/brand';
import { chainOf, dexScreenerFor, explorerTokenFor, CHAINS } from '../lib/chains';

const EASE = [0.16, 1, 0.3, 1];
const fmt = (raw, decimals = 18) => {
  const n = Number(raw || 0) / 10 ** decimals;
  return n >= 1_000_000 ? `${(n / 1_000_000).toFixed(2)}M` : n >= 1_000 ? `${(n / 1_000).toFixed(1)}K` : n.toFixed(2);
};

/** The last cycles, one bar each, as tall as the fees that cycle routed. */
function Cycles({ runs, start }) {
  const [hover, setHover] = useState(null);
  const bars = [...runs].slice(0, 24).reverse().map((r) => ({ eth: Number(r.claimedEth || 0) / 1e18, holders: r.holderCount, at: r.executionTime }));
  const max = Math.max(...bars.map((b) => b.eth), 0);
  const shown = hover != null ? bars[hover] : null;
  return (
    <div className="flex h-full flex-col">
      <div className="flex min-h-[3.5rem] flex-1 items-end gap-[3px]" onMouseLeave={() => setHover(null)}>
        {bars.map((b, i) => (
          <div key={i} className="flex h-full flex-1 items-end" onMouseEnter={() => setHover(i)}>
            <motion.div
              initial={{ scaleY: 0 }} animate={start ? { scaleY: 1 } : { scaleY: 0 }}
              transition={{ duration: 0.6, delay: 0.2 + i * 0.02, ease: EASE }}
              style={{ height: `${max > 0 ? Math.max(6, (b.eth / max) * 100) : 6}%`, transformOrigin: 'bottom' }}
              className={`w-full rounded-[1px] transition-colors ${hover === i ? 'bg-ink' : i === bars.length - 1 ? 'bg-hood-500' : 'bg-hood-500/50'}`}
            />
          </div>
        ))}
      </div>
      <div className="mt-2 flex items-center justify-between gap-3 font-mono text-[10px] text-mut">
        {shown ? (
          <>
            <span>{new Date(shown.at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
            <span className="text-ink/85">{shown.eth.toFixed(3)} ETH{shown.holders ? ` to ${shown.holders}` : ''}</span>
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
      <span className="figure text-right text-xl font-medium leading-none tracking-tight text-ink">{value}{unit && <span className="ml-1.5 font-mono text-[10px] font-normal tracking-normal text-mut">{unit}</span>}</span>
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
 * The card of the project token: its logo, the full contract address ready to
 * copy, and where to buy it, chart it and read its contract. Always present
 * once the address is set: it is what people come to the homepage for on
 * launch day.
 */
function TokenCard({ data }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try { await navigator.clipboard.writeText(TOKEN_CA); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch { /* clipboard unavailable */ }
  };
  const sym = data?.sourceToken?.symbol || TOKEN_SYMBOL;
  const chain = chainOf(TOKEN_CA) || 'solana';
  const links = [
    ['Chart and buy', dexScreenerFor(chain, TOKEN_CA)],
    [chain === 'solana' ? 'Mint' : 'Contract', explorerTokenFor(chain, TOKEN_CA)],
  ];
  return (
    <div className="frame relative overflow-hidden">
      <div aria-hidden="true" className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-hood-500/10 blur-3xl" />
      <div className="grid gap-5 p-5 sm:p-6 lg:grid-cols-[auto_1fr_auto] lg:items-center">
        <div className="flex items-center gap-4">
          <StockLogo address={TOKEN_CA} meta={{ symbol: sym }} size="h-16 w-16" text="text-sm" />
          <div>
            <div className="eyebrow">The token</div>
            <div className="mt-1 font-display text-3xl font-semibold tracking-tight text-ink">${sym}</div>
            <div className="mt-0.5 text-sm text-mut">on {CHAINS[chain].label}</div>
          </div>
        </div>
        <div className="min-w-0">
          <div className="label mb-1.5">{chain === 'solana' ? 'Mint address' : 'Contract address'}</div>
          <button type="button" onClick={copy} title="Copy the address" className="group flex w-full items-center justify-between gap-3 rounded-xl border border-line bg-ground px-4 py-3 text-left transition hover:border-hood-400">
            <span className="min-w-0 truncate font-mono text-sm text-ink sm:text-[15px]">{TOKEN_CA}</span>
            <span className="flex shrink-0 items-center gap-1.5 text-xs font-semibold text-mut group-hover:text-hood-600">{copied ? <><Check className="h-4 w-4 text-hood-500" />Copied</> : <><Copy className="h-4 w-4" />Copy</>}</span>
          </button>
          <p className="mt-2 text-xs text-mut">Check the address here before you buy: this page is the only source.</p>
        </div>
        <div className="flex flex-wrap gap-2 lg:flex-col">
          {links.map(([label, href]) => (
            <a key={label} href={href} target="_blank" rel="noopener noreferrer" className={`${label === 'Chart and buy' ? 'btn-primary' : 'btn-ghost'} whitespace-nowrap`}>{label}<External className="h-3.5 w-3.5" /></a>
          ))}
        </div>
      </div>
    </div>
  );
}

// Mounted once the data is there, so the entrance is tied to an element that exists.
function Live({ data }) {
  const ref = useRef(null);
  const start = useInView(ref, { once: true, amount: 0.15 });
  const sym = data.sourceToken?.symbol || TOKEN_SYMBOL;
  const runs = Array.isArray(data.recentExecutions) ? data.recentExecutions : [];
  const active = data.config.isActive !== false;

  return (
    <div ref={ref}>
      <div className="mb-6 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="eyebrow mb-2">We route our own fees</div>
          <h2 className="font-display text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
            <span className="mr-2 inline-flex items-center gap-2 align-bottom"><StockLogo address={TOKEN_CA} meta={data.sourceToken} size="h-7 w-7 sm:h-8 sm:w-8" text="text-[7px]" />${sym}</span>
            runs on {BRAND}, live
          </h2>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-mut">The coin behind the product uses the product: {data.config.scheduleLabel?.toLowerCase()}, creator fees are routed as drawn below. Every cycle is public.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/lottery" className="btn-ghost whitespace-nowrap"><Vote className="h-4 w-4 text-hood-600" />Daily lottery: 0.5% of fees</Link>
          <Link href={`/${TOKEN_CA}`} className="btn-primary whitespace-nowrap">Open the ${sym} dashboard <Arrow className="h-4 w-4" /></Link>
        </div>
      </div>

      <div className="grid items-stretch gap-3 lg:grid-cols-12">
        <motion.div
          initial={{ opacity: 0, y: 12 }} animate={start ? { opacity: 1, y: 0 } : {}} transition={{ duration: 0.6, ease: EASE }}
          className="min-w-0 lg:col-span-8"
        >
          <PolicyMini source={data.sourceToken} devWallet={data.devWallet} schedule={data.config.scheduleLabel} legs={data.legs} split={data.config.split} countdown={{ intervalMinutes: data.config.intervalMinutes, scheduleKind: data.config.scheduleKind, active: data.config.isActive }} className="lg:!h-full" />
        </motion.div>

        <motion.aside
          initial={{ opacity: 0, y: 12 }} animate={start ? { opacity: 1, y: 0 } : {}} transition={{ duration: 0.6, delay: 0.1, ease: EASE }}
          className="frame flex flex-col overflow-hidden lg:col-span-4"
        >
          <div className="px-5 pb-4 pt-5">
            <div className="flex items-center justify-between gap-3">
              <span className="label">{active ? 'Next cycle in' : 'Paused'}</span>
              <span className={`label flex items-center gap-1.5 ${active ? '!text-hood-600' : ''}`}>
                <span className={`h-1.5 w-1.5 rounded-full ${active ? 'bg-hood-500' : 'bg-mut/50'}`} />{data.config.scheduleLabel}
              </span>
            </div>
            <div className="figure mt-3 text-5xl font-medium leading-none tracking-tight text-ink">
              {active ? <Countdown intervalMinutes={data.config.intervalMinutes} scheduleKind={data.config.scheduleKind} /> : '--:--'}
            </div>
          </div>

          {runs.length > 0 ? <div className="flex-1 border-t border-line px-5 py-4"><Cycles runs={runs} start={start} /></div> : <div className="flex-1" />}

          <div className="divide-y divide-line border-t border-line">
            <Line label="Paid to holders" value={fmt(data.stats.totalAirdropped)} unit={`$${sym}`} />
            <Line label="Bought back and burned" value={fmt(data.stats.totalBurned)} unit={`$${sym}`} />
            <Line label="Cycles" value={String(data.stats.totalExecutions || 0)} />
            <Line label="Holders" value={String(data.stats.holderCount || 0)} />
          </div>
        </motion.aside>
      </div>
    </div>
  );
}
