'use client';

// Who is being paid. The page that received the most gets the stage, the
// others line up beside it with a bar that compares them to it, and the
// latest payments run underneath as a tape. Live data only: while nothing has
// been routed yet, the section says so.
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { motion, useInView } from 'motion/react';
import StockLogo from '../StockLogo';
import { Arrow, PlatformIcon } from '../Icons';
import { PageAvatar, ClaimBadge, fmtUsd, fmtAmount, ago } from './PageParts';
import { PLATFORMS } from '../../lib/pages';

const EASE = [0.16, 1, 0.3, 1];

function Lead({ page, seen }) {
  return (
    <motion.div initial={{ opacity: 0, y: 14 }} animate={seen ? { opacity: 1, y: 0 } : {}} transition={{ duration: 0.6, ease: EASE }} className="frame flex flex-col justify-between overflow-hidden p-6 lg:col-span-5">
      <div className="flex items-start justify-between">
        <span className="label">Most paid page</span>
        <ClaimBadge claimed={page.claimed} />
      </div>
      <Link href={page.path} className="group mt-8 block">
        <PageAvatar page={page} size="h-20 w-20" badge="h-7 w-7" />
        <div className="mt-5 flex items-center gap-2">
          <span className="truncate font-display text-3xl font-medium tracking-tight text-ink group-hover:text-hood-600">{page.name}</span>
          <Arrow className="h-5 w-5 shrink-0 text-mut transition-transform group-hover:translate-x-1 group-hover:text-hood-600" />
        </div>
        <div className="mt-1 text-sm text-mut">{PLATFORMS[page.platform]?.label} {PLATFORMS[page.platform]?.noun}</div>
      </Link>
      <div className="mt-8 grid grid-cols-3 divide-x divide-line border-t border-line pt-4">
        <div><div className="label">Received</div><div className="figure mt-1 text-2xl font-medium text-ink">{fmtUsd(page.receivedUsd)}</div></div>
        <div className="pl-4"><div className="label">Payments</div><div className="figure mt-1 text-2xl font-medium text-ink">{page.payments ?? 0}</div></div>
        <div className="pl-4"><div className="label">Coins</div><div className="figure mt-1 text-2xl font-medium text-ink">{page.coins ?? 0}</div></div>
      </div>
    </motion.div>
  );
}

function Rank({ page, rank, top, seen, delay }) {
  const share = top > 0 ? Math.max(2, ((page.receivedUsd || 0) / top) * 100) : 0;
  return (
    <motion.li initial={{ opacity: 0, x: 12 }} animate={seen ? { opacity: 1, x: 0 } : {}} transition={{ duration: 0.5, delay, ease: EASE }}>
      <Link href={page.path} className="group relative grid grid-cols-[28px_auto_1fr_auto] items-center gap-3 px-5 py-3 transition-colors hover:bg-tile/50">
        <span className="figure text-sm text-mut">{String(rank).padStart(2, '0')}</span>
        <PageAvatar page={page} size="h-9 w-9" badge="h-4 w-4" />
        <span className="min-w-0">
          <span className="flex items-center gap-2"><span className="truncate text-sm font-semibold text-ink group-hover:text-hood-600">{page.name}</span>{!page.claimed && <span className="label !text-[9px] !text-gold-700">unclaimed</span>}</span>
          <span className="mt-1.5 block h-[3px] overflow-hidden rounded-full bg-line">
            <motion.span className="block h-full rounded-full bg-hood-500" initial={{ width: 0 }} animate={seen ? { width: `${share}%` } : {}} transition={{ duration: 0.9, delay: delay + 0.15, ease: EASE }} />
          </span>
        </span>
        <span className="text-right">
          <span className="figure block text-sm font-medium text-ink">{fmtUsd(page.receivedUsd)}</span>
          <span className="label !text-[9.5px]">{page.lastAt ? ago(page.lastAt) : 'no payment yet'}</span>
        </span>
      </Link>
    </motion.li>
  );
}

function Tape({ recent }) {
  const loop = recent.length > 3 ? [...recent, ...recent] : recent;
  return (
    <div className="relative overflow-hidden border-t border-line [mask-image:linear-gradient(90deg,transparent,#000_6%,#000_94%,transparent)]">
      <div className={recent.length > 3 ? 'marquee-track' : 'flex'} style={{ animationDuration: `${Math.max(40, recent.length * 9)}s` }}>
        {loop.map((p, i) => (
          <Link key={`${p.tx || p.at}-${i}`} href={p.path} className="flex shrink-0 items-center gap-2 border-r border-line px-5 py-3 text-sm transition-colors hover:bg-tile/50">
            <PageAvatar page={p} size="h-6 w-6" badge={null} />
            <span className="font-semibold text-ink">{p.name}</span>
            <span className="text-mut">received</span>
            <StockLogo address={p.token} meta={{ symbol: p.symbol }} size="h-4 w-4" text="text-[5px]" />
            <span className="figure text-ink">{fmtAmount(p.amount)} {p.symbol}</span>
            <span className="figure text-hood-600">{fmtUsd(p.usd)}</span>
            <span className="label !text-[9.5px]">{ago(p.at)}</span>
          </Link>
        ))}
      </div>
    </div>
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
      <div className="grid items-end gap-6 lg:grid-cols-[1fr_auto]">
        <div className="max-w-2xl">
          <div className="eyebrow mb-3">Pages</div>
          <h2 className="font-display text-3xl font-medium tracking-tight text-ink sm:text-4xl">Who is being paid</h2>
          <p className="mt-3 text-[15px] leading-relaxed text-mut">Channels, accounts and sites that coins route fees to. Each one has a public profile with its vault, its payments and the coins behind them.</p>
        </div>
        {data?.stats && (
          <dl className="flex gap-8 text-right">
            {[[fmtUsd(data.stats.routedUsd), 'routed to pages'], [data.stats.pages, 'pages'], [data.stats.claimed, 'claimed']].map(([v, l]) => (
              <div key={l}><dd className="figure font-display text-3xl font-medium tracking-tight text-ink">{v}</dd><dt className="label mt-0.5">{l}</dt></div>
            ))}
          </dl>
        )}
      </div>

      {!data ? (
        <div className="mt-7 grid gap-3 lg:grid-cols-12"><div className="h-80 animate-pulse rounded-2xl bg-paper lg:col-span-5" /><div className="h-80 animate-pulse rounded-2xl bg-paper lg:col-span-7" /></div>
      ) : !lead ? (
        <div className="frame mt-7 grid items-center gap-6 p-8 md:grid-cols-[1fr_auto]">
          <div>
            <div className="font-display text-2xl font-medium tracking-tight text-ink">No page has been routed to yet.</div>
            <p className="mt-2 max-w-lg text-sm text-mut">The first one appears here the moment a coin gives it a share. Add a page on the canvas by pasting its link, or claim yours ahead so payments reach your wallet directly.</p>
          </div>
          <div className="flex flex-wrap gap-2"><Link href="/app" className="btn-primary">Route to a page <Arrow className="h-4 w-4" /></Link><Link href="/claim" className="btn-ghost">Claim ahead</Link></div>
        </div>
      ) : (
        <div className="mt-7 grid gap-3 lg:grid-cols-12">
          <Lead page={lead} seen={seen} />
          <motion.div initial={{ opacity: 0, y: 14 }} animate={seen ? { opacity: 1, y: 0 } : {}} transition={{ duration: 0.6, delay: 0.08, ease: EASE }} className="frame flex flex-col overflow-hidden lg:col-span-7">
            <div className="flex items-center justify-between border-b border-line px-5 py-2.5">
              <span className="label">Next in line · compared to the first</span>
              <Link href="/pages" className="label group inline-flex items-center gap-1 !text-hood-600">All pages <Arrow className="h-3 w-3 transition-transform group-hover:translate-x-0.5" /></Link>
            </div>
            {rest.length ? (
              <ul className="flex-1 divide-y divide-line">{rest.map((p, i) => <Rank key={`${p.platform}:${p.handle}`} page={p} rank={i + 2} top={lead.receivedUsd || 0} seen={seen} delay={0.12 + i * 0.06} />)}</ul>
            ) : (
              <p className="flex-1 px-5 py-8 text-sm text-mut">One page so far. The next coin that routes to a page puts it here.</p>
            )}
            <div className="flex items-center justify-between gap-3 border-t border-line bg-ground/60 px-5 py-3">
              <span className="flex items-center gap-2 text-sm text-mut"><span className="flex items-center [&>*+*]:-ml-1">{['youtube', 'github', 'x', 'twitch'].map((k) => <span key={k} className="flex h-5 w-5 items-center justify-center rounded-full bg-tile ring-2 ring-paper"><PlatformIcon platform={k} className="h-2.5 w-2.5" /></span>)}</span>Is one of them yours?</span>
              <Link href="/claim" className="group inline-flex items-center gap-1 text-sm font-semibold text-ink">Claim it <Arrow className="h-3.5 w-3.5 text-mut transition-transform group-hover:translate-x-0.5 group-hover:text-ink" /></Link>
            </div>
          </motion.div>
          {recent.length > 0 && <div className="frame overflow-hidden lg:col-span-12"><div className="label px-5 pt-3">Latest payments</div><Tape recent={recent} /></div>}
        </div>
      )}
    </div>
  );
}
