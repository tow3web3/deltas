// The public profile of a page: what it received, from which coins, what waits
// in its vault, and the way to claim it. A page nobody routes to yet still has
// a profile, so its owner can claim ahead and a creator can see it is free.
import Link from 'next/link';
import { notFound } from 'next/navigation';
import TickerTape from '../../../../components/TickerTape';
import Navigation from '../../../../components/Navigation';
import Footer from '../../../../components/Footer';
import StockLogo from '../../../../components/StockLogo';
import { Arrow, PlatformIcon } from '../../../../components/Icons';
import { PageAvatar, ClaimBadge, PayoutRow, ChainTag, ChannelBar, Inflow, fmtUsd, fmtAmount, shortAddr, ago } from '../../../../components/pages/PageParts';
import { getPage } from '../../../../lib/pageQueries';
import { pageView } from '../../../../lib/pageView';
import { PLATFORMS, normalizeHandle, pageName, pageUrl, pagePath } from '../../../../lib/pages';
import { explorerAddress, explorerTx } from '../../../../lib/chains';
import { BRAND } from '../../../../lib/brand';
import { pageMeta } from '../../../../lib/meta';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

async function resolve(params) {
  const { platform, handle: raw } = await params;
  if (!PLATFORMS[platform]) return null;
  const given = decodeURIComponent(raw);
  // A phone page lives at its slug; the number itself is never in an address.
  if (platform === 'phone') return /^[a-z0-9]{12}$/.test(given) ? { platform, handle: given, slug: given } : null;
  const handle = normalizeHandle(platform, given);
  return handle ? { platform, handle } : null;
}

export async function generateMetadata({ params }) {
  const r = await resolve(params);
  if (!r) return pageMeta({ title: 'Page not found', index: false });
  const name = pageName(r.platform, r.handle);
  return pageMeta({
    title: `${name} on ${PLATFORMS[r.platform].label}`,
    description: `Fees routed to ${name} by coins on Solana and Robinhood Chain: what it received, what waits in its vault, and how its owner claims.`,
    path: pagePath(r.platform, r.handle, r.slug),
  });
}

const sharePct = (bps) => (bps / 100).toFixed(bps % 100 ? 1 : 0);
// How many coins the drawing shows; the rest are listed under it.
const DRAWN = 6;

function Stat({ label, value, sub }) {
  return (
    <div className="bg-ground/70 px-4 py-4 sm:px-5">
      <div className="label">{label}</div>
      <div className="figure mt-1.5 text-[26px] font-medium leading-none tracking-[-0.03em] text-ink">{value}</div>
      {sub && <div className="mt-1.5 truncate text-xs text-mut">{sub}</div>}
    </div>
  );
}

/** A coin at the start of its channel. */
function SourceChip({ s }) {
  return (
    <Link href={`/${s.address}`} className="flex items-center gap-2.5 rounded-2xl border border-white/10 bg-[rgba(5,7,12,0.72)] px-3 py-2 backdrop-blur-md transition-colors hover:border-cyan-500/50">
      <StockLogo address={s.address} meta={s} size="h-7 w-7" text="text-[8px]" />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[13px] font-medium text-ink">{s.symbol ? `$${s.symbol}` : shortAddr(s.address)}</span>
        <span className="block text-[10.5px] text-mut">{s.active ? 'running' : 'paused'}</span>
      </span>
      <span className="font-mono text-[13px] tabular-nums text-cyan-500">{sharePct(s.shareBps)}%</span>
    </Link>
  );
}

export default async function PageProfile({ params }) {
  const r = await resolve(params);
  if (!r) notFound();
  let row = null;
  let view = null;
  let error = null;
  try {
    row = await getPage(r.platform, r.handle);
    if (row) view = await pageView(row);
  } catch (e) {
    error = e.message;
  }
  const P = PLATFORMS[r.platform];
  const page = view || { platform: r.platform, handle: r.handle, name: pageName(r.platform, r.handle), avatar: null, url: pageUrl(r.platform, r.handle), path: pagePath(r.platform, r.handle, r.slug), claimed: false };
  const claimHref = `/claim?${new URLSearchParams(r.platform === 'phone' ? { platform: 'phone' } : { platform: r.platform, handle: r.handle })}`;
  const waiting = view && !view.claimed ? view.vaultBalance?.totalUsd || 0 : 0;
  const sources = view?.sources || [];
  const maxShare = Math.max(1, ...sources.map((s) => s.shareBps || 0));
  const proofLine = P.proof === 'dns' ? 'Add a DNS record on the domain' : P.proof === 'otp' ? 'Prove the number with a code sent by WhatsApp or SMS' : `Sign in with ${P.label}`;

  return (
    <main className="min-h-screen">
      <TickerTape />
      <Navigation />
      <div className="mx-auto max-w-6xl px-5 py-10 sm:py-12">
        <Link href="/pages" className="label inline-flex items-center gap-1.5 transition-colors hover:!text-ink">← All pages</Link>

        {/* the page itself, lit */}
        <section className="frame relative mt-5 overflow-hidden p-6 sm:p-8">
          <span aria-hidden="true" className="pointer-events-none absolute -left-24 -top-32 h-80 w-80 rounded-full bg-[radial-gradient(circle,rgba(47,168,255,0.28),transparent_65%)] blur-2xl" />
          <span aria-hidden="true" className="pointer-events-none absolute -bottom-40 -right-24 h-80 w-80 rounded-full bg-[radial-gradient(circle,rgba(123,92,255,0.16),transparent_65%)] blur-2xl" />
          <div className="relative flex flex-wrap items-center gap-x-7 gap-y-5">
            <PageAvatar page={page} size="h-20 w-20 sm:h-24 sm:w-24" badge="h-7 w-7 sm:h-8 sm:w-8" lit />
            <div className="min-w-0 flex-1">
              <div className="label mb-2">{P.label} {P.noun}</div>
              <div className="flex min-w-0 flex-wrap items-center gap-3">
                <h1 className="min-w-0 max-w-full truncate font-display text-[34px] font-medium leading-[1.05] tracking-[-0.03em] text-ink sm:text-[44px]">{page.name}</h1>
                {view && <ClaimBadge claimed={view.claimed} />}
              </div>
              {page.url ? (
                <a href={page.url} target="_blank" rel="noopener noreferrer nofollow" className="mt-2 inline-flex max-w-full items-center gap-1.5 text-sm text-mut transition-colors hover:text-ink">
                  <PlatformIcon platform={r.platform} className="h-3.5 w-3.5 shrink-0" /><span className="truncate">{page.url.replace(/^https:\/\/(www\.)?/, '')} ↗</span>
                </a>
              ) : (
                <span className="mt-2 inline-flex items-center gap-1.5 text-sm text-mut"><PlatformIcon platform={r.platform} className="h-3.5 w-3.5" />Shown in part: its owner proves it with a code</span>
              )}
            </div>
            {!page.claimed && <Link href={claimHref} className="btn-primary">This is my page <Arrow className="h-4 w-4" /></Link>}
          </div>

          {view && (
            <div className="relative mt-8 grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-white/10 bg-white/10 lg:grid-cols-4">
              <Stat label="Received" value={fmtUsd(view.receivedUsd)} sub={view.firstAt ? `since ${new Date(view.firstAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}` : 'no payment yet'} />
              <Stat label={view.claimed ? 'Paid to its owner' : 'In the vault'} value={fmtUsd(view.claimed ? view.paidToOwnerUsd : view.vaultBalance?.totalUsd || 0)} sub={view.claimed ? `wallet ${shortAddr(view.claimedWallet)}` : 'until claimed'} />
              <Stat label="Payments" value={view.payments} sub={view.lastAt ? `last ${ago(view.lastAt)}` : null} />
              <Stat label="Coins routing" value={view.coins} sub="active right now" />
            </div>
          )}
        </section>

        {error && <div className="mt-6 rounded-2xl border border-down/40 bg-down/10 px-4 py-3 text-sm text-down">This profile could not be loaded: {error}</div>}

        {!view && !error && (
          <div className="panel relative mt-4 overflow-hidden px-6 py-12 text-center sm:py-14">
            <span aria-hidden="true" className="beam pointer-events-none absolute left-1/2 top-0 h-px w-1/2 -translate-x-1/2 opacity-60" />
            <div className="font-display text-2xl font-medium tracking-[-0.03em] text-ink">No coin routes fees to {page.name} yet</div>
            <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-mut">Creators can add it as a destination from the dashboard. If this page is yours, you can claim it ahead: payments will then reach your wallet directly.</p>
            <div className="mt-6 flex flex-wrap justify-center gap-2">
              <Link href="/app" className="btn-primary">Route fees to it <Arrow className="h-4 w-4" /></Link>
              <Link href={claimHref} className="btn-ghost">Claim it ahead</Link>
            </div>
          </div>
        )}

        {view && (
          <div className="mt-4 grid items-start gap-4 lg:grid-cols-[1.3fr_0.7fr]">
            <div className="min-w-0 space-y-4">
              {/* the coins routing here, as light flowing into the page */}
              <section className="panel overflow-hidden">
                <div className="flex items-center justify-between gap-3 border-b border-white/10 px-5 py-3">
                  <span className="label">Coins routing here</span>
                  {sources.length > 0 && <span className="font-mono text-[10.5px] text-dim">{sources.length} coin{sources.length === 1 ? '' : 's'}</span>}
                </div>
                {sources.length ? (
                  <>
                    <div className="hidden px-5 py-6 sm:block">
                      <Inflow
                        id="page-inflow"
                        sources={sources.slice(0, DRAWN).map((s) => ({ key: s.address, share: s.shareBps, active: s.active, node: <SourceChip s={s} /> }))}
                        target={<PageAvatar page={page} size="h-16 w-16" badge="h-6 w-6" lit />}
                      />
                    </div>
                    <ul className={`divide-y divide-white/[0.06] ${sources.length > DRAWN ? '' : 'sm:hidden'}`}>
                      {sources.map((s, i) => (
                        <li key={s.address} className={i < DRAWN ? 'sm:hidden' : ''}>
                          <Link href={`/${s.address}`} className="flex items-center gap-3 px-5 py-3 transition-colors hover:bg-white/[0.04]">
                            <StockLogo address={s.address} meta={s} size="h-8 w-8" text="text-[9px]" />
                            <span className="min-w-0 flex-1">
                              <span className="flex items-center justify-between gap-2">
                                <span className="truncate text-sm font-medium text-ink">{s.symbol ? `$${s.symbol}` : shortAddr(s.address)}</span>
                                <span className="font-mono text-[13px] tabular-nums text-cyan-500">{sharePct(s.shareBps)}%</span>
                              </span>
                              <span className="mt-1.5 flex items-center gap-2">
                                <ChannelBar pct={(s.shareBps / maxShare) * 100} dim={!s.active} className="flex-1" />
                                <span className="shrink-0 font-mono text-[10px] text-dim">{s.active ? 'running' : 'paused'}</span>
                              </span>
                            </span>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </>
                ) : <p className="px-5 py-8 text-sm text-mut">No coin routes here at the moment.</p>}
              </section>

              <section className="panel overflow-hidden">
                <div className="flex items-center justify-between gap-3 border-b border-white/10 px-5 py-3">
                  <span className="label">Payments</span>
                  {view.payouts.length > 0 && <span className="font-mono text-[10.5px] text-dim">latest {view.payouts.length}</span>}
                </div>
                {view.payouts.length
                  ? <div className="divide-y divide-white/[0.06]">{view.payouts.map((p) => <PayoutRow key={p.id} p={p} showPage={false} />)}</div>
                  : <p className="px-5 py-10 text-center text-sm text-mut">No payment yet. The next cycle of a coin routing here pays it.</p>}
              </section>
            </div>

            {/* the vault */}
            <aside className="frame frame-top relative overflow-hidden p-5 sm:p-6">
              <span aria-hidden="true" className="pointer-events-none absolute -right-20 -top-24 h-56 w-56 rounded-full bg-[radial-gradient(circle,rgba(95,227,255,0.16),transparent_65%)] blur-2xl" />
              <div className="relative flex items-center justify-between gap-3">
                <span className="label">{(view.vaults?.length || 0) > 1 ? 'Vaults' : 'Vault'}</span>
                {(view.vaults?.length || 0) === 1 && <ChainTag chain={view.vaults[0].chain} />}
              </div>

              {!view.claimed && (
                <div className="relative mt-4">
                  <div className="text-sm text-mut">{waiting > 0 ? 'Waiting for the owner of this page' : 'This page has not been claimed'}</div>
                  <div className={`figure mt-1 pb-1 text-[40px] font-medium leading-none tracking-[-0.03em] ${waiting > 0 ? 'text-beam' : 'text-ink'}`}>{fmtUsd(waiting)}</div>
                  <p className="mt-2 text-xs leading-relaxed text-mut">{proofLine}, connect a wallet, and the vault is sent to it.</p>
                  <Link href={claimHref} className="btn-primary mt-4 w-full">Claim <Arrow className="h-4 w-4" /></Link>
                </div>
              )}

              {(view.vaults || []).length > 0 && (
                <ul className={`relative space-y-2 ${view.claimed ? 'mt-4' : 'mt-5'}`}>
                  {view.vaults.map((v) => (
                    <li key={v.chain}>
                      <a href={explorerAddress(v.address)} target="_blank" rel="noopener noreferrer" className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/5 px-3.5 py-2.5 transition-colors hover:border-cyan-500/50">
                        <span className="min-w-0">
                          {view.vaults.length > 1 && <ChainTag chain={v.chain} className="mb-1" />}
                          <span className="block truncate font-mono text-xs text-ink">{v.address}</span>
                        </span>
                        <span className="shrink-0 font-mono text-[10.5px] text-cyan-500">↗</span>
                      </a>
                    </li>
                  ))}
                </ul>
              )}
              <p className="relative mt-3 text-xs leading-relaxed text-mut">
                {view.claimed
                  ? 'This page is claimed: payments go straight to its owner. Anything that still lands in the vault is forwarded to them.'
                  : `A wallet created for this page alone. ${BRAND} only ever sends its content to the wallet the verified owner binds.`}
              </p>

              {view.vaultBalance?.assets?.length > 0 && (
                <div className="relative mt-5 border-t border-white/10 pt-4">
                  <div className="label">Held</div>
                  <ul className="mt-2.5 space-y-2">
                    {view.vaultBalance.assets.map((a) => (
                      <li key={`${a.chain}-${a.address}`} className="flex items-center justify-between gap-3 text-xs">
                        <span className="flex min-w-0 items-center gap-2"><StockLogo address={a.address} meta={{ symbol: a.symbol, image: a.image }} size="h-6 w-6" text="text-[7px]" /><span className="truncate font-mono font-medium text-ink">{a.symbol}</span></span>
                        <span className="figure shrink-0 text-right"><span className="block text-ink">{fmtAmount(a.amount)}</span><span className="block text-[11px] text-mut">{fmtUsd(a.usd)}</span></span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {view.sweeps.length > 0 && (
                <div className="relative mt-5 border-t border-white/10 pt-4">
                  <div className="label">Sent to the owner</div>
                  <ul className="mt-2.5 space-y-1.5">
                    {view.sweeps.map((s) => (
                      <li key={s.tx || `${s.symbol}-${s.at}`} className="flex items-center justify-between gap-3 text-xs text-mut">
                        <span><span className="figure text-ink">{fmtAmount(s.amount)} {s.symbol}</span> · {ago(s.at)}</span>
                        {s.tx && <a href={explorerTx(s.tx)} target="_blank" rel="noopener noreferrer" className="font-mono text-[10.5px] text-dim transition-colors hover:text-cyan-500">tx ↗</a>}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </aside>
          </div>
        )}
      </div>
      <Footer />
    </main>
  );
}
