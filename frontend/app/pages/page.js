// The directory: every page a coin routes fees to, ranked by what it received.
import Link from 'next/link';
import TickerTape from '../../components/TickerTape';
import Navigation from '../../components/Navigation';
import Footer from '../../components/Footer';
import { PlatformIcon, Arrow, Search } from '../../components/Icons';
import { PageRow, PayoutRow, fmtUsd } from '../../components/pages/PageParts';
import { topPages, recentPagePayouts, pagesStats } from '../../lib/pageQueries';
import { pageCard, payoutRow, statsUsd, nativePrices, lamportWeight } from '../../lib/pageView';
import { fetchTokenMeta } from '../../lib/tokenMeta';
import { PLATFORMS, PLATFORM_KEYS, parsePage, pagePath } from '../../lib/pages';
import { BRAND } from '../../lib/brand';
import { pageMeta } from '../../lib/meta';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const metadata = pageMeta({
  title: 'Pages receiving fees',
  description: 'YouTube channels, GitHub accounts, domains, phone numbers and other pages that coins on Solana and Robinhood Chain route their fees to, with what each one received.',
  path: '/pages',
});

async function load({ platform, q }) {
  try {
    const prices = await nativePrices();
    const [pages, recent, stats] = await Promise.all([topPages({ limit: 60, platform, q, lamportWeight: lamportWeight(prices) }), recentPagePayouts(10), pagesStats()]);
    const meta = await fetchTokenMeta([...new Set(recent.map((r) => r.source_token).filter(Boolean))]).catch(() => ({}));
    return {
      stats: { ...stats, routedUsd: statsUsd(stats, prices) },
      pages: pages.map((p) => pageCard(p, prices)),
      recent: recent.map((r) => payoutRow(r, prices, meta)),
    };
  } catch (e) {
    return { error: e.message, stats: null, pages: [], recent: [] };
  }
}

const pill = (on) => `inline-flex shrink-0 items-center gap-2 rounded-full border px-3.5 py-1.5 text-[13px] font-medium transition-colors ${on ? 'border-cyan-500/60 bg-white/[0.08] text-ink shadow-glow' : 'border-white/10 bg-white/[0.03] text-mut hover:border-white/25 hover:text-ink'}`;

export default async function PagesDirectory({ searchParams }) {
  const sp = await searchParams;
  const platform = PLATFORMS[sp?.platform] ? sp.platform : null;
  const q = typeof sp?.q === 'string' ? sp.q.trim().slice(0, 80) : '';
  const data = await load({ platform, q: q || null });
  // A full link in the search box is a request for that exact page.
  const exact = q ? parsePage(q, platform) : null;
  const href = (p) => `/pages${p || q ? `?${new URLSearchParams({ ...(p ? { platform: p } : {}), ...(q ? { q } : {}) })}` : ''}`;
  // The longest channel: every row is measured against it.
  const top = Math.max(0, ...data.pages.map((p) => p.receivedUsd || 0));

  return (
    <main className="min-h-screen">
      <TickerTape />
      <Navigation />
      <div className="mx-auto max-w-6xl px-5 py-12 sm:py-16">
        <div className="grid items-end gap-8 lg:grid-cols-[1fr_auto]">
          <div className="max-w-2xl">
            <div className="eyebrow mb-4">Pages</div>
            <h1 className="font-display text-[40px] font-medium leading-[1.02] tracking-[-0.035em] text-ink sm:text-[56px]">Pages receiving fees</h1>
            <p className="mt-4 max-w-lg text-[16px] leading-relaxed text-mut">Channels, accounts, sites and phone numbers that coins route a share of their fees to. An unclaimed page keeps its money in a vault until its owner proves it.</p>
          </div>
          {data.stats && (
            <dl className="grid grid-cols-3 gap-2">
              {[[fmtUsd(data.stats.routedUsd), 'routed'], [data.stats.pages, 'pages'], [data.stats.claimed, 'claimed']].map(([v, l]) => (
                <div key={l} className="panel flex flex-col-reverse px-4 py-3 sm:px-5">
                  <dt className="label mt-1.5">{l}</dt>
                  <dd className="figure text-2xl font-medium tracking-[-0.03em] text-ink sm:text-[28px]">{v}</dd>
                </div>
              ))}
            </dl>
          )}
        </div>

        <form action="/pages" className="mt-10 flex flex-wrap gap-2">
          {platform && <input type="hidden" name="platform" value={platform} />}
          <label className="panel flex min-w-0 flex-1 items-center gap-3 !rounded-full px-4 transition-colors focus-within:border-cyan-500/60">
            <Search className="h-4 w-4 shrink-0 text-mut" />
            <input name="q" defaultValue={q} placeholder="Search a handle, or paste a link" className="min-w-0 flex-1 bg-transparent py-3 text-sm text-ink outline-none placeholder:text-dim" />
          </label>
          <button type="submit" className="btn-primary">Search</button>
        </form>
        <div className="-mx-5 mt-4 flex gap-1.5 overflow-x-auto px-5 pb-1 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0">
          <Link href={href(null)} className={pill(!platform)}>
            <span className={`h-1.5 w-1.5 rounded-full ${!platform ? 'bg-cyan-500 shadow-[0_0_8px_#5FE3FF]' : 'bg-mut'}`} />All
          </Link>
          {PLATFORM_KEYS.map((k) => (
            <Link key={k} href={href(k)} className={pill(platform === k)}>
              <PlatformIcon platform={k} className="h-3.5 w-3.5" />{PLATFORMS[k].label}
            </Link>
          ))}
        </div>

        {data.error && <div className="mt-6 rounded-2xl border border-down/40 bg-down/10 px-4 py-3 text-sm text-down">The directory could not be loaded: {data.error}</div>}

        <div className="mt-6 grid items-start gap-4 lg:grid-cols-[1.35fr_0.65fr]">
          <div className="frame overflow-hidden">
            <div className="flex items-center justify-between gap-3 border-b border-white/10 px-5 py-3">
              <span className="label truncate">{q ? `Results for "${q}"` : platform ? `${PLATFORMS[platform].label}, by amount received` : 'By amount received'}</span>
              <span className="shrink-0 font-mono text-[10.5px] text-dim">{data.pages.length} shown</span>
            </div>
            {exact && !exact.error && exact.platform !== 'phone' && !data.pages.some((p) => p.platform === exact.platform && p.handle === exact.handle) && (
              <Link href={pagePath(exact.platform, exact.handle)} className="group flex items-center justify-between gap-3 border-b border-white/10 bg-cyan-500/[0.05] px-5 py-3.5 text-sm text-ink transition-colors hover:bg-cyan-500/[0.09]">
                <span className="flex min-w-0 items-center gap-2.5">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/5"><PlatformIcon platform={exact.platform} className="h-4 w-4" /></span>
                  <span className="truncate">Open the profile of <span className="font-medium">{exact.handle}</span> on {PLATFORMS[exact.platform].label}</span>
                </span>
                <Arrow className="h-4 w-4 shrink-0 text-mut transition-transform group-hover:translate-x-0.5 group-hover:text-hood-600" />
              </Link>
            )}
            {data.pages.length ? (
              <div className="divide-y divide-white/[0.06]">{data.pages.map((p, i) => <PageRow key={`${p.platform}:${p.handle}`} page={p} rank={i + 1} top={top} />)}</div>
            ) : !data.error && (
              <div className="relative px-6 py-16 text-center">
                <span aria-hidden="true" className="beam pointer-events-none absolute left-1/2 top-0 h-px w-1/2 -translate-x-1/2 opacity-50" />
                <div className="font-display text-xl font-medium tracking-[-0.02em] text-ink">{q || platform ? 'No page matches' : 'No page has been routed to yet'}</div>
                <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-mut">A page appears here as soon as a coin gives it a share of its fees.</p>
                <Link href="/app" className="btn-primary mt-6">Route fees to a page <Arrow className="h-4 w-4" /></Link>
              </div>
            )}
          </div>

          <div className="space-y-4">
            <div className="panel overflow-hidden">
              <div className="flex items-center gap-2 border-b border-white/10 px-5 py-3">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-cyan-500 shadow-[0_0_10px_#5FE3FF]" />
                <span className="label">Recent payments</span>
              </div>
              {data.recent.length
                ? <div className="divide-y divide-white/[0.06]">{data.recent.map((p) => <PayoutRow key={p.tx || `${p.platform}:${p.handle}:${p.at}`} p={p} />)}</div>
                : <p className="px-5 py-6 text-sm text-mut">Nothing yet.</p>}
            </div>
            <div className="frame relative overflow-hidden p-6">
              <span aria-hidden="true" className="pointer-events-none absolute -right-16 -top-20 h-48 w-48 rounded-full bg-[radial-gradient(circle,rgba(47,168,255,0.22),transparent_65%)] blur-2xl" />
              <div className="relative flex items-center [&>*+*]:-ml-1.5">
                {['youtube', 'github', 'x', 'domain', 'phone'].map((k) => <span key={k} className="flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-ground"><PlatformIcon platform={k} className="h-4 w-4" /></span>)}
              </div>
              <h2 className="relative mt-4 text-[19px] font-medium tracking-[-0.02em] text-ink">Is one of these yours?</h2>
              <p className="relative mt-2 text-sm leading-relaxed text-mut">Prove it with a sign-in, a DNS record or a code, connect a wallet, and receive everything that waited. It takes a minute and costs no gas.</p>
              <Link href="/claim" className="btn-primary relative mt-5">Claim a page <Arrow className="h-4 w-4" /></Link>
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </main>
  );
}
