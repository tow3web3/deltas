'use client';

// Who is being paid. The page that received the most takes the stage, lit;
// the others follow as channels of light whose length is what they received
// against the first; the latest payments run underneath as a ticker. Live data
// only: while nothing has been routed yet, the section says so.
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { motion, useInView, useReducedMotion } from 'motion/react';
import StockLogo from '../StockLogo';
import { Arrow, PlatformIcon } from '../Icons';
import { PageAvatar, ClaimBadge, ChainTag, rowChain, fmtUsd, fmtAmount, ago } from './PageParts';
import { PLATFORMS } from '../../lib/pages';
import { CHAINS } from '../../lib/chains';

const EASE = [0.16, 1, 0.3, 1];

/** A figure that counts up once it is on screen. */
function Count({ to, format = (v) => Math.round(v).toLocaleString('en-US'), seen }) {
  const [v, setV] = useState(0);
  useEffect(() => {
    if (!seen) return undefined;
    const target = Number(to) || 0;
    const t0 = performance.now();
    let raf;
    const step = (t) => { const p = Math.min(1, (t - t0) / 1400); setV(target * (1 - Math.pow(1 - p, 3))); if (p < 1) raf = requestAnimationFrame(step); };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [seen, to]);
  return <>{format(v)}</>;
}

function Lead({ page, seen }) {
  const P = PLATFORMS[page.platform];
  return (
    <motion.div initial={{ opacity: 0, y: 14 }} animate={seen ? { opacity: 1, y: 0 } : {}} transition={{ duration: 0.6, ease: EASE }} className="frame relative flex flex-col overflow-hidden p-6 sm:p-7 lg:col-span-5">
      <span aria-hidden="true" className="pointer-events-none absolute -left-24 -top-24 h-72 w-72 rounded-full bg-[radial-gradient(circle,rgba(47,168,255,0.26),transparent_65%)] blur-2xl" />
      <span aria-hidden="true" className="pointer-events-none absolute -bottom-28 -right-20 h-64 w-64 rounded-full bg-[radial-gradient(circle,rgba(123,92,255,0.18),transparent_65%)] blur-2xl" />
      <div className="relative flex items-start justify-between gap-3">
        <span className="label">Most paid page</span>
        <ClaimBadge claimed={page.claimed} />
      </div>
      <Link href={page.path} className="group relative mt-9 block">
        <PageAvatar page={page} size="h-24 w-24" badge="h-8 w-8" lit />
        <div className="mt-6 flex items-center gap-2">
          <span className="truncate font-display text-[32px] font-medium leading-[1.05] tracking-[-0.03em] text-ink transition-colors group-hover:text-hood-600">{page.name}</span>
          <Arrow className="h-5 w-5 shrink-0 text-mut transition-transform group-hover:translate-x-1 group-hover:text-hood-600" />
        </div>
        <div className="mt-1.5 flex items-center gap-1.5 text-sm text-mut"><PlatformIcon platform={page.platform} className="h-3.5 w-3.5" />{P?.label} {P?.noun}</div>
      </Link>
      <div className="relative mt-8">
        <div className="label">Received</div>
        <div className="figure mt-1.5 text-[44px] font-medium leading-none tracking-[-0.03em] text-ink">{fmtUsd(page.receivedUsd)}</div>
        {/* the full channel: the line every other page is measured against */}
        <span className="relative mt-4 block h-1.5 rounded-full bg-white/[0.06]">
          <motion.span className="beam absolute inset-y-0 left-0 rounded-full shadow-[0_0_14px_rgba(95,227,255,0.55)]" initial={{ width: 0 }} animate={seen ? { width: '100%' } : {}} transition={{ duration: 1.1, delay: 0.2, ease: EASE }}>
            <span className="absolute right-0 top-1/2 h-2.5 w-2.5 -translate-y-1/2 translate-x-1/2 rounded-full bg-white shadow-[0_0_12px_#fff]" />
          </motion.span>
        </span>
      </div>
      <div className="relative mt-6 grid grid-cols-2 gap-2">
        <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3"><div className="label">Payments</div><div className="figure mt-1 text-2xl font-medium text-ink">{page.payments ?? 0}</div></div>
        <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3"><div className="label">Coins routing</div><div className="figure mt-1 text-2xl font-medium text-ink">{page.coins ?? 0}</div></div>
      </div>
    </motion.div>
  );
}

function Rank({ page, rank, top, seen, delay }) {
  const share = top > 0 ? Math.max(2, ((page.receivedUsd || 0) / top) * 100) : 0;
  return (
    <motion.li initial={{ opacity: 0, x: 12 }} animate={seen ? { opacity: 1, x: 0 } : {}} transition={{ duration: 0.5, delay, ease: EASE }}>
      <Link href={page.path} className="group grid grid-cols-[24px_auto_1fr_auto] items-center gap-3.5 px-5 py-3.5 transition-colors hover:bg-white/[0.04]">
        <span className="font-mono text-[11px] tabular-nums text-dim">{String(rank).padStart(2, '0')}</span>
        <PageAvatar page={page} size="h-9 w-9" badge="h-4 w-4" />
        <span className="min-w-0">
          <span className="flex min-w-0 items-center gap-2">
            <span className="truncate text-[14px] font-medium text-ink transition-colors group-hover:text-hood-600">{page.name}</span>
            {!page.claimed && <span className="shrink-0 font-mono text-[9px] uppercase tracking-[0.16em] text-dim">unclaimed</span>}
          </span>
          <span className="relative mt-2 block h-1.5 rounded-full bg-white/[0.06]">
            {share > 0 && (
              <motion.span
                className="beam absolute inset-y-0 left-0 rounded-full shadow-[0_0_10px_rgba(95,227,255,0.45)]"
                style={{ backgroundSize: `${10000 / share}% 100%` }}
                initial={{ width: 0 }} animate={seen ? { width: `${share}%` } : {}} transition={{ duration: 0.9, delay: delay + 0.15, ease: EASE }}
              >
                <span className="absolute right-0 top-1/2 h-1.5 w-1.5 -translate-y-1/2 translate-x-1/2 rounded-full bg-white shadow-[0_0_8px_#fff]" />
              </motion.span>
            )}
          </span>
        </span>
        <span className="text-right">
          <span className="figure block text-[14px] font-medium text-ink">{fmtUsd(page.receivedUsd)}</span>
          <span className="block font-mono text-[10px] text-dim">{page.lastAt ? ago(page.lastAt) : 'no payment yet'}</span>
        </span>
      </Link>
    </motion.li>
  );
}

/** The latest payments as a ticker, running over a line of light with a pulse travelling along it. */
function Ticker({ recent, seen }) {
  const still = useReducedMotion();
  const loop = recent.length > 3 ? [...recent, ...recent] : recent;
  return (
    <motion.div initial={{ opacity: 0, y: 14 }} animate={seen ? { opacity: 1, y: 0 } : {}} transition={{ duration: 0.6, delay: 0.16, ease: EASE }} className="panel relative overflow-hidden lg:col-span-12">
      <div className="flex flex-col sm:flex-row sm:items-stretch">
        <span className="label flex shrink-0 items-center gap-2 border-b border-white/10 px-5 py-3 !text-cyan-500 sm:border-b-0 sm:border-r">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-cyan-500 shadow-[0_0_10px_#5FE3FF]" />Latest payments
        </span>
        <div className="relative min-w-0 flex-1 overflow-hidden [mask-image:linear-gradient(90deg,transparent,#000_5%,#000_95%,transparent)]">
          <div className={recent.length > 3 ? 'marquee-track' : 'flex'} style={{ animationDuration: `${Math.max(40, recent.length * 9)}s` }}>
            {loop.map((p, i) => {
              const chain = rowChain(p);
              return (
                <Link key={`${p.tx || p.at}-${i}`} href={p.path} className="group flex shrink-0 items-center gap-2.5 px-5 py-3.5 text-[13px] transition-colors hover:bg-white/[0.04]">
                  <PageAvatar page={p} size="h-6 w-6" badge={null} />
                  <span className="font-medium text-ink transition-colors group-hover:text-hood-600">{p.name}</span>
                  <span className="text-dim">received</span>
                  <StockLogo address={p.token} meta={{ symbol: p.symbol }} size="h-4 w-4" text="text-[5px]" />
                  <span className="figure text-ink">{fmtAmount(p.amount)} {p.symbol || CHAINS[chain]?.native || ''}</span>
                  <span className="figure text-hood-600">{fmtUsd(p.usd)}</span>
                  {chain && <ChainTag chain={chain} />}
                  <span className="font-mono text-[10px] text-dim">{ago(p.at)}</span>
                  <span aria-hidden="true" className="ml-3 h-1 w-1 rounded-full bg-cyan-500/60 shadow-[0_0_6px_#5FE3FF]" />
                </Link>
              );
            })}
          </div>
        </div>
      </div>
      {/* the line of light under the tape, with its pulse */}
      <span aria-hidden="true" className="beam pointer-events-none absolute inset-x-0 bottom-0 h-px opacity-70" />
      {!still && (
        <motion.span aria-hidden="true" className="pointer-events-none absolute bottom-0 h-[3px] w-16 -translate-x-1/2 translate-y-[1px] rounded-full bg-white shadow-[0_0_14px_#5FE3FF]"
          initial={{ left: '0%', opacity: 0 }} animate={{ left: ['0%', '100%'], opacity: [0, 1, 1, 0] }}
          transition={{ left: { duration: 5.5, repeat: Infinity, ease: 'linear' }, opacity: { duration: 5.5, repeat: Infinity, ease: 'linear', times: [0, 0.1, 0.9, 1] } }} />
      )}
    </motion.div>
  );
}

export default function TopPages({ limit = 6 }) {
  const ref = useRef(null);
  const seen = useInView(ref, { once: true, amount: 0.2 });
  const [data, setData] = useState(null);
  useEffect(() => {
    let live = true;
    const load = () => fetch(`/api/pages?limit=${limit}`, { cache: 'no-store' }).then((r) => (r.ok ? r.json() : null)).then((d) => { if (live && d && !d.error) setData(d); }).catch(() => {});
    load();
    const t = setInterval(load, 30_000);
    return () => { live = false; clearInterval(t); };
  }, [limit]);

  const pages = data?.pages || [];
  const recent = data?.recent || [];
  const [lead, ...rest] = pages;

  return (
    <div id="pages" ref={ref} className="scroll-mt-20">
      <div className="grid items-end gap-8 lg:grid-cols-[1fr_auto]">
        <div className="max-w-xl">
          <div className="eyebrow mb-4">Pages</div>
          <h2 className="font-display text-[36px] font-medium leading-[1.05] tracking-[-0.03em] text-ink sm:text-[44px]">Who is being paid</h2>
          <p className="mt-4 max-w-md text-[16px] leading-relaxed text-mut">Channels, accounts, sites and phone numbers that coins route fees to. Each one has a public profile with its vault, its payments and the coins behind them.</p>
        </div>
        {data?.stats && (
          <dl className="grid grid-cols-3 gap-2">
            {[
              [<Count key="u" to={data.stats.routedUsd} format={fmtUsd} seen={seen} />, 'routed to pages'],
              [<Count key="p" to={data.stats.pages} seen={seen} />, 'pages'],
              [<Count key="c" to={data.stats.claimed} seen={seen} />, 'claimed'],
            ].map(([v, l]) => (
              <div key={l} className="panel flex flex-col-reverse px-4 py-3 sm:px-5">
                <dt className="label mt-1.5">{l}</dt>
                <dd className="figure text-2xl font-medium tracking-[-0.03em] text-ink sm:text-[28px]">{v}</dd>
              </div>
            ))}
          </dl>
        )}
      </div>

      {!data ? (
        <div className="mt-10 grid gap-3 lg:grid-cols-12"><div className="panel h-96 animate-pulse lg:col-span-5" /><div className="panel h-96 animate-pulse lg:col-span-7" /></div>
      ) : !lead ? (
        <div className="frame relative mt-10 grid items-center gap-6 overflow-hidden p-7 sm:p-9 md:grid-cols-[auto_1fr_auto]">
          <span aria-hidden="true" className="pointer-events-none absolute -left-24 -top-24 h-64 w-64 rounded-full bg-[radial-gradient(circle,rgba(47,168,255,0.22),transparent_65%)] blur-2xl" />
          <span className="relative flex items-center [&>*+*]:-ml-2">
            {['youtube', 'github', 'x', 'phone'].map((k) => <span key={k} className="flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-ground ring-4 ring-ground/60"><PlatformIcon platform={k} className="h-5 w-5" /></span>)}
          </span>
          <div className="relative">
            <div className="font-display text-2xl font-medium tracking-[-0.03em] text-ink">No page has been routed to yet.</div>
            <p className="mt-2 max-w-lg text-sm leading-relaxed text-mut">The first one appears here the moment a coin gives it a share. Add a page on the canvas by pasting its link, or claim yours ahead so payments reach your wallet directly.</p>
          </div>
          <div className="relative flex flex-wrap gap-2"><Link href="/app" className="btn-primary">Route to a page <Arrow className="h-4 w-4" /></Link><Link href="/claim" className="btn-ghost">Claim ahead</Link></div>
        </div>
      ) : (
        <div className="mt-10 grid gap-3 lg:grid-cols-12">
          <Lead page={lead} seen={seen} />
          <motion.div initial={{ opacity: 0, y: 14 }} animate={seen ? { opacity: 1, y: 0 } : {}} transition={{ duration: 0.6, delay: 0.08, ease: EASE }} className="panel flex flex-col overflow-hidden lg:col-span-7">
            <div className="flex items-center justify-between gap-3 border-b border-white/10 px-5 py-3">
              <span className="label">Next in line · against the first</span>
              <Link href="/pages" className="label group inline-flex items-center gap-1 !text-hood-600">All pages <Arrow className="h-3 w-3 transition-transform group-hover:translate-x-0.5" /></Link>
            </div>
            {rest.length ? (
              <ul className="flex-1 divide-y divide-white/[0.06]">{rest.map((p, i) => <Rank key={`${p.platform}:${p.handle}`} page={p} rank={i + 2} top={lead.receivedUsd || 0} seen={seen} delay={0.12 + i * 0.06} />)}</ul>
            ) : (
              <p className="flex-1 px-5 py-10 text-sm text-mut">One page so far. The next coin that routes to a page puts it here.</p>
            )}
            <div className="flex items-center justify-between gap-3 border-t border-white/10 bg-white/[0.02] px-5 py-3.5">
              <span className="flex items-center gap-2.5 text-sm text-mut">
                <span className="flex items-center [&>*+*]:-ml-1.5">{['youtube', 'github', 'x', 'twitch', 'phone'].map((k) => <span key={k} className="flex h-6 w-6 items-center justify-center rounded-full border border-white/10 bg-ground"><PlatformIcon platform={k} className="h-3 w-3" /></span>)}</span>
                Is one of them yours?
              </span>
              <Link href="/claim" className="group inline-flex items-center gap-1 text-sm font-medium text-ink transition-colors hover:text-hood-600">Claim it <Arrow className="h-3.5 w-3.5 text-mut transition-transform group-hover:translate-x-0.5 group-hover:text-hood-600" /></Link>
            </div>
          </motion.div>
          {recent.length > 0 && <Ticker recent={recent} seen={seen} />}
        </div>
      )}
    </div>
  );
}
