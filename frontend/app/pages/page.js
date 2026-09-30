// The directory: every page a coin routes fees to, ranked by what it received.
import Link from 'next/link';
import TickerTape from '../../components/TickerTape';
import Navigation from '../../components/Navigation';
import Footer from '../../components/Footer';
import { PlatformIcon, Arrow } from '../../components/Icons';
import { PageRow, PayoutRow, fmtUsd } from '../../components/pages/PageParts';
import { topPages, recentPagePayouts, pagesStats } from '../../lib/pageQueries';
import { pageCard, ethPrice } from '../../lib/pageView';
import { fetchTokenMeta } from '../../lib/tokenMeta';
import { PLATFORMS, PLATFORM_KEYS, parsePage, pagePath } from '../../lib/pages';
import { BRAND } from '../../lib/brand';
import { pageMeta } from '../../lib/meta';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const metadata = pageMeta({
  title: 'Pages receiving fees',
  description: 'YouTube channels, GitHub accounts, domains and other pages that coins on Robinhood Chain route their fees to, with what each one received.',
  path: '/pages',
});

async function load({ platform, q }) {
  try {
    const [pages, recent, stats, ethUsd] = await Promise.all([topPages({ limit: 60, platform, q }), recentPagePayouts(10), pagesStats(), ethPrice()]);
    const meta = await fetchTokenMeta([...new Set(recent.map((r) => r.source_token).filter(Boolean))]).catch(() => ({}));
    return {
      stats: { ...stats, routedUsd: (Number(stats.value_wei) / 1e18) * ethUsd },
      pages: pages.map((p) => pageCard(p, ethUsd)),
      recent: recent.map((r) => ({ ...pageCard(r, ethUsd), amount: Number(r.amount) / 10 ** Number(r.decimals ?? 18), token: r.token, symbol: r.symbol, usd: (Number(r.value_wei) / 1e18) * ethUsd, direct: r.direct, tx: r.tx_hash, at: r.created_at, from: r.source_token ? { address: r.source_token, symbol: meta[r.source_token]?.symbol || null, image: meta[r.source_token]?.image || null } : null })),
    };
  } catch (e) {
    return { error: e.message, stats: null, pages: [], recent: [] };
  }
}

export default async function PagesDirectory({ searchParams }) {
  const sp = await searchParams;
  const platform = PLATFORMS[sp?.platform] ? sp.platform : null;
  const q = typeof sp?.q === 'string' ? sp.q.trim().slice(0, 80) : '';
  const data = await load({ platform, q: q || null });
  // A full link in the search box is a request for that exact page.
  const exact = q ? parsePage(q, platform) : null;
  const href = (p) => `/pages${p || q ? `?${new URLSearchParams({ ...(p ? { platform: p } : {}), ...(q ? { q } : {}) })}` : ''}`;

  return (
    <main className="min-h-screen">
      <TickerTape />
      <Navigation />
      <div className="mx-auto max-w-6xl px-5 py-12">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div className="max-w-2xl">
            <div className="eyebrow mb-2">Pages</div>
            <h1 className="font-display text-3xl font-medium tracking-tight text-ink sm:text-5xl">Pages receiving fees</h1>
            <p className="mt-3 text-sm leading-relaxed text-mut">Channels, accounts and sites that coins route a share of their fees to. An unclaimed page keeps its money in a vault until its owner signs in.</p>
          </div>
          {data.stats && (
            <div className="grid grid-cols-3 gap-6 text-right">
              <div><div className="figure font-display text-2xl font-medium text-ink">{fmtUsd(data.stats.routedUsd)}</div><div className="label">routed</div></div>
              <div><div className="figure font-display text-2xl font-medium text-ink">{data.stats.pages}</div><div className="label">pages</div></div>
              <div><div className="figure font-display text-2xl font-medium text-ink">{data.stats.claimed}</div><div className="label">claimed</div></div>
            </div>
          )}
        </div>

        <form action="/pages" className="mt-8 flex flex-wrap gap-2">
          {platform && <input type="hidden" name="platform" value={platform} />}
          <input name="q" defaultValue={q} placeholder="Search a handle, or paste a link" className="min-w-0 flex-1 rounded-xl border border-line bg-paper px-4 py-2.5 text-sm text-ink outline-none transition placeholder:text-mut/60 focus:border-hood-400" />
          <button type="submit" className="btn-ink">Search</button>
        </form>
        <div className="mt-3 flex flex-wrap gap-1.5">
          <Link href={href(null)} className={`rounded-full border px-3 py-1 text-xs font-medium transition ${!platform ? 'border-ink bg-ink text-coal' : 'border-line text-mut hover:text-ink'}`}>All</Link>
          {PLATFORM_KEYS.map((k) => (
            <Link key={k} href={href(k)} className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition ${platform === k ? 'border-ink bg-ink text-coal' : 'border-line text-mut hover:text-ink'}`}>
              <PlatformIcon platform={k} className="h-3 w-3" mono={platform === k} />{PLATFORMS[k].label}
            </Link>
          ))}
        </div>

        {data.error && <div className="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">The directory could not be loaded: {data.error}</div>}

        <div className="mt-6 grid items-start gap-4 lg:grid-cols-[1.35fr_0.65fr]">
          <div className="frame overflow-hidden">
            <div className="flex items-center justify-between border-b border-line px-4 py-2.5">
              <span className="label">{q ? `Results for "${q}"` : platform ? `${PLATFORMS[platform].label}, by amount received` : 'By amount received'}</span>
              <span className="text-[11px] text-mut">{data.pages.length} shown</span>
            </div>
            {exact && !exact.error && exact.platform !== 'phone' && !data.pages.some((p) => p.platform === exact.platform && p.handle === exact.handle) && (
              <Link href={pagePath(exact.platform, exact.handle)} className="flex items-center justify-between gap-3 border-b border-line bg-tile/50 px-4 py-3 text-sm text-ink transition hover:bg-tile">
                <span className="flex items-center gap-2"><PlatformIcon platform={exact.platform} className="h-4 w-4" />Open the profile of <span className="font-semibold">{exact.handle}</span> on {PLATFORMS[exact.platform].label}</span>
                <Arrow className="h-4 w-4 text-mut" />
              </Link>
            )}
            {data.pages.length ? (
              <div className="divide-y divide-line/70">{data.pages.map((p, i) => <PageRow key={`${p.platform}:${p.handle}`} page={p} rank={i + 1} />)}</div>
            ) : !data.error && (
              <div className="px-6 py-14 text-center">
                <div className="text-sm font-semibold text-ink">{q || platform ? 'No page matches' : 'No page has been routed to yet'}</div>
                <p className="mx-auto mt-1 max-w-sm text-sm text-mut">A page appears here as soon as a coin gives it a share of its fees.</p>
                <Link href="/app" className="btn-primary mt-5">Route fees to a page <Arrow className="h-4 w-4" /></Link>
              </div>
            )}
          </div>

          <div className="space-y-4">
            <div className="frame overflow-hidden">
              <div className="border-b border-line px-4 py-2.5 label">Recent payments</div>
              {data.recent.length
                ? <div className="divide-y divide-line/70">{data.recent.map((p) => <PayoutRow key={p.tx || `${p.platform}:${p.handle}:${p.at}`} p={p} />)}</div>
                : <p className="px-4 py-6 text-sm text-mut">Nothing yet.</p>}
            </div>
            <div className="frame p-5">
              <h2 className="text-sm font-semibold text-ink">Is one of these yours?</h2>
              <p className="mt-1.5 text-sm text-mut">Sign in with the platform, connect a wallet, receive everything that waited. It takes a minute and costs no gas.</p>
              <Link href="/claim" className="btn-primary mt-4 !py-2 text-xs">Claim a page <Arrow className="h-3.5 w-3.5" /></Link>
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </main>
  );
}
