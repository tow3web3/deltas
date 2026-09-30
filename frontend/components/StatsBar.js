'use client';

// The numbers of the network, as one instrument instead of four boxes. On the
// left the total routed, drawn over thirty days of cycles. On the right a
// ledger of three lines, each carrying what it counts: the cycles as ticks, the
// coins and the stocks as their own logos.
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { animate, motion, useInView, useMotionValue, useTransform } from 'motion/react';
import StockLogo from './StockLogo';
import { Arrow } from './Icons';
import { STOCKS, LIQUID_TICKERS, getStock } from '../lib/stocks';

const EASE = [0.16, 1, 0.3, 1];

/** A figure that counts up to its value the first time it is seen. */
function Figure({ value, prefix = '', decimals = 0, start, className = '' }) {
  const mv = useMotionValue(0);
  const text = useTransform(mv, (v) => `${prefix}${v.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}`);
  useEffect(() => {
    if (!start) return undefined;
    const controls = animate(mv, Number(value) || 0, { duration: 1.4, ease: EASE });
    return () => controls.stop();
  }, [start, value, mv]);
  return <motion.span className={`figure ${className}`}>{text}</motion.span>;
}

/** Thirty days, one bar a day. A day without a cycle keeps a stub, so the rhythm of the month stays readable. */
function Month({ daily, start }) {
  const [hover, setHover] = useState(null);
  const max = Math.max(...daily.map((d) => d.usd), 0);
  const days = daily.length ? daily : Array.from({ length: 30 }, () => ({ usd: 0, cycles: 0, day: null }));
  const shown = hover != null ? days[hover] : null;
  return (
    <div>
      <div className="flex h-24 items-end gap-[3px]" onMouseLeave={() => setHover(null)}>
        {days.map((d, i) => {
          const h = max > 0 ? Math.max(4, (d.usd / max) * 100) : 4;
          const live = d.usd > 0;
          return (
            <div key={i} className="flex h-full flex-1 items-end" onMouseEnter={() => setHover(i)}>
              <motion.div
                initial={{ scaleY: 0 }}
                animate={start ? { scaleY: 1 } : { scaleY: 0 }}
                transition={{ duration: 0.7, delay: 0.25 + i * 0.018, ease: EASE }}
                style={{ height: `${h}%`, transformOrigin: 'bottom' }}
                className={`w-full rounded-[2px] transition-colors ${hover === i ? 'bg-ink' : live ? (i === days.length - 1 ? 'bg-hood-500' : 'bg-hood-500/55') : 'bg-line'}`}
              />
            </div>
          );
        })}
      </div>
      <div className="label mt-2.5 flex items-center justify-between">
        <span>{shown?.day ? new Date(shown.day).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '30 days ago'}</span>
        <span className="text-ink/80">
          {shown ? `$${shown.usd.toLocaleString('en-US', { maximumFractionDigits: shown.usd >= 100 ? 0 : 2 })} · ${shown.cycles} cycle${shown.cycles === 1 ? '' : 's'}` : max > 0 ? 'routed per day' : 'waiting for the first cycle'}
        </span>
        <span>{shown ? '' : 'today'}</span>
      </div>
    </div>
  );
}

/** Logos overlapping like a hand of cards. */
function Overlap({ children }) {
  return <div className="flex items-center [&>*+*]:-ml-2 [&>*]:ring-2 [&>*]:ring-paper">{children}</div>;
}

function Line({ label, children, figure, href, cta }) {
  const Tag = href ? Link : 'div';
  return (
    <Tag {...(href ? { href } : {})} className={`group grid flex-1 grid-cols-[1fr_auto] content-center items-center gap-x-4 gap-y-2.5 px-6 py-5 ${href ? 'transition-colors hover:bg-tile/50' : ''}`}>
      <div className="label flex items-center gap-2">{label}{cta && <span className="inline-flex items-center gap-1 text-hood-600 opacity-0 transition-opacity group-hover:opacity-100">{cta}<Arrow className="h-3 w-3" /></span>}</div>
      <div className="row-span-2 text-right font-display text-3xl font-medium leading-none tracking-tight text-ink">{figure}</div>
      <div className="min-h-[24px]">{children}</div>
    </Tag>
  );
}

// The strip of stock logos: the liquid ones first, they are the ones that get paid out most.
const STRIP = [...LIQUID_TICKERS.slice(0, 22), ...STOCKS.map((s) => s.ticker).filter((t) => !LIQUID_TICKERS.includes(t)).slice(0, 10)];

export default function StatsBar() {
  const ref = useRef(null);
  const start = useInView(ref, { once: true, amount: 0.35 });
  const [stats, setStats] = useState(null);

  useEffect(() => {
    let live = true;
    const load = () => fetch('/api/stats', { cache: 'no-store' }).then((r) => (r.ok ? r.json() : null)).then((d) => { if (live && d && !d.error) setStats(d); }).catch(() => {});
    load();
    const t = setInterval(load, 60_000);
    return () => { live = false; clearInterval(t); };
  }, []);

  const s = stats || { totalEthClaimed: 0, ethUsd: 0, totalExecutions: 0, activeConfigs: 0, daily: [], coins: [] };
  const routed = (Number(s.totalEthClaimed) || 0) * (s.ethUsd || 0);
  const month = s.daily.reduce((a, d) => a + d.usd, 0);
  const week = s.daily.slice(-7).reduce((a, d) => a + d.cycles, 0);
  const lastCycles = s.daily.slice(-14);

  return (
    <div ref={ref} className="grid gap-3 lg:grid-cols-12">
      <motion.section
        initial={{ opacity: 0, y: 14 }} animate={start ? { opacity: 1, y: 0 } : {}} transition={{ duration: 0.6, ease: EASE }}
        className="frame overflow-hidden p-6 sm:p-7 lg:col-span-7"
      >
        <div className="flex items-start justify-between gap-4">
          <span className="label">Fees routed · all time</span>
          <span className="label flex items-center gap-1.5 text-hood-600"><span className="relative flex h-1.5 w-1.5"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-hood-500 opacity-60" /><span className="relative h-1.5 w-1.5 rounded-full bg-hood-500" /></span>live</span>
        </div>
        <div className="mt-5 flex flex-wrap items-end gap-x-5 gap-y-1">
          <Figure value={routed} prefix="$" decimals={routed > 0 && routed < 1000 ? 2 : 0} start={start} className="text-6xl font-medium leading-[0.9] tracking-tight text-ink sm:text-7xl" />
          <div className="pb-1.5 text-sm text-mut">
            <span className="figure text-ink">{(Number(s.totalEthClaimed) || 0).toLocaleString('en-US', { maximumFractionDigits: 3 })} ETH</span> through the routes
            <br />
            <span className="figure text-hood-600">${month.toLocaleString('en-US', { maximumFractionDigits: 0 })}</span> of it in the last 30 days
          </div>
        </div>
        <div className="mt-7"><Month daily={s.daily} start={start} /></div>
      </motion.section>

      <motion.section
        initial={{ opacity: 0, y: 14 }} animate={start ? { opacity: 1, y: 0 } : {}} transition={{ duration: 0.6, delay: 0.1, ease: EASE }}
        className="frame flex flex-col justify-between divide-y divide-line overflow-hidden lg:col-span-5"
      >
        <Line label="Cycles run" figure={<Figure value={s.totalExecutions} start={start} />}>
          <div className="flex items-end gap-[3px]" aria-label={`${week} cycles in the last 7 days`}>
            {(lastCycles.length ? lastCycles : Array.from({ length: 14 }, () => ({ cycles: 0 }))).map((d, i) => (
              <span key={i} className={`w-[5px] rounded-[1px] ${d.cycles ? 'bg-gold-400' : 'bg-line'}`} style={{ height: d.cycles ? 8 + Math.min(14, d.cycles * 2) : 6 }} />
            ))}
            <span className="ml-2 text-xs text-mut"><span className="figure text-ink">{week}</span> this week</span>
          </div>
        </Line>

        <Line label="Coins routing" href="/#screener" cta="see them" figure={<Figure value={s.activeConfigs} start={start} />}>
          {s.coins.length ? (
            <Overlap>{s.coins.slice(0, 7).map((c) => <StockLogo key={c.address} address={c.address} meta={c} size="h-6 w-6" text="text-[7px]" />)}</Overlap>
          ) : <span className="text-xs text-mut">Link yours: it takes two minutes.</span>}
        </Line>

        <Line label="Stocks payable" href="/stocks" cta="all of them" figure={<Figure value={STOCKS.length} start={start} />}>
          <div className="relative w-full max-w-[240px] overflow-hidden [mask-image:linear-gradient(90deg,transparent,#000_12%,#000_88%,transparent)]">
            <div className="marquee-track gap-1.5" style={{ animationDuration: '60s' }}>
              {[...STRIP, ...STRIP].map((t, i) => <StockLogo key={`${t}-${i}`} address={getStock(t).address} size="h-6 w-6" text="text-[7px]" />)}
            </div>
          </div>
        </Line>
      </motion.section>
    </div>
  );
}
