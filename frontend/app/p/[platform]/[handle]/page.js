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
import { PageAvatar, ClaimBadge, PayoutRow, fmtUsd, fmtAmount, shortAddr, ago } from '../../../../components/pages/PageParts';
import { getPage } from '../../../../lib/pageQueries';
import { pageView } from '../../../../lib/pageView';
import { PLATFORMS, normalizeHandle, pageName, pageUrl, pagePath } from '../../../../lib/pages';
import { BRAND } from '../../../../lib/brand';
import { pageMeta } from '../../../../lib/meta';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const EXPLORER = 'https://robinhoodchain.blockscout.com';

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
    description: `Fees routed to ${name} by coins on Robinhood Chain: what it received, what waits in its vault, and how its owner claims.`,
    path: pagePath(r.platform, r.handle, r.slug),
  });
}

function Stat({ label, value, sub }) {
  return (
    <div className="bg-paper p-4">
      <div className="label">{label}</div>
      <div className="figure mt-1 font-display text-2xl font-medium text-ink">{value}</div>
      {sub && <div className="mt-0.5 text-xs text-mut">{sub}</div>}
    </div>
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

  return (
    <main className="min-h-screen">
      <TickerTape />
      <Navigation />
      <div className="mx-auto max-w-5xl px-5 py-10">
        <Link href="/pages" className="text-xs font-medium text-mut hover:text-ink">← All pages</Link>

        <div className="mt-4 flex flex-wrap items-center gap-4">
          <PageAvatar page={page} size="h-16 w-16" badge="h-6 w-6" />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="truncate font-display text-2xl font-semibold tracking-tight text-ink sm:text-3xl">{page.name}</h1>
              {view && <ClaimBadge claimed={view.claimed} />}
            </div>
            {page.url ? (
              <a href={page.url} target="_blank" rel="noopener noreferrer nofollow" className="mt-1 inline-flex items-center gap-1.5 text-sm text-mut hover:text-ink">
                <PlatformIcon platform={r.platform} className="h-3.5 w-3.5" />{P.label} {P.noun} · {page.url.replace(/^https:\/\/(www\.)?/, '')} ↗
              </a>
            ) : (
              <span className="mt-1 inline-flex items-center gap-1.5 text-sm text-mut"><PlatformIcon platform={r.platform} className="h-3.5 w-3.5" />{P.label} {P.noun} · shown in part, its owner proves it with a code</span>
            )}
          </div>
          {!page.claimed && <Link href={claimHref} className="btn-primary">This is my page <Arrow className="h-4 w-4" /></Link>}
        </div>

        {error && <div className="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">This profile could not be loaded: {error}</div>}

        {!view && !error && (
          <div className="frame mt-8 px-6 py-12 text-center">
            <div className="text-base font-semibold text-ink">No coin routes fees to {page.name} yet</div>
            <p className="mx-auto mt-2 max-w-md text-sm text-mut">Creators can add it as a destination from the dashboard. If this page is yours, you can claim it ahead: payments will then reach your wallet directly.</p>
            <div className="mt-5 flex flex-wrap justify-center gap-2">
              <Link href="/app" className="btn-primary">Route fees to it</Link>
              <Link href={claimHref} className="btn-ghost">Claim it ahead</Link>
            </div>
          </div>
        )}

        {view && (
          <>
            {!view.claimed && (
              <div className="mt-6 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-gold-300 bg-gold-50 px-5 py-4">
                <div>
                  <div className="text-sm font-semibold text-gold-700">{waiting > 0 ? `${fmtUsd(waiting)} is waiting for the owner of this page` : 'This page has not been claimed'}</div>
                  <p className="mt-0.5 text-sm text-mut">{P.proof === 'dns' ? 'Add a DNS record on the domain' : P.proof === 'otp' ? 'Prove the number with a code sent by WhatsApp or SMS' : `Sign in with ${P.label}`}, connect a wallet, and the vault is sent to it.</p>
                </div>
                <Link href={claimHref} className="btn-primary !py-2 text-xs">Claim <Arrow className="h-3.5 w-3.5" /></Link>
              </div>
            )}

            <div className="mt-6 grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-line bg-line lg:grid-cols-4">
              <Stat label="Received" value={fmtUsd(view.receivedUsd)} sub={view.firstAt ? `since ${new Date(view.firstAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}` : 'no payment yet'} />
              <Stat label={view.claimed ? 'Paid to its owner' : 'In the vault'} value={fmtUsd(view.claimed ? view.paidToOwnerUsd : view.vaultBalance?.totalUsd || 0)} sub={view.claimed ? `wallet ${shortAddr(view.claimedWallet)}` : 'until claimed'} />
              <Stat label="Payments" value={view.payments} sub={view.lastAt ? `last ${ago(view.lastAt)}` : null} />
              <Stat label="Coins routing" value={view.coins} sub="active right now" />
            </div>

            <div className="mt-4 grid items-start gap-4 lg:grid-cols-[1.3fr_0.7fr]">
              <div className="frame overflow-hidden">
                <div className="border-b border-line px-4 py-2.5 label">Payments</div>
                {view.payouts.length
                  ? <div className="divide-y divide-line/70">{view.payouts.map((p) => <PayoutRow key={p.id} p={p} showPage={false} />)}</div>
                  : <p className="px-4 py-8 text-center text-sm text-mut">No payment yet. The next cycle of a coin routing here pays it.</p>}
              </div>

              <div className="space-y-4">
                <div className="frame overflow-hidden">
                  <div className="border-b border-line px-4 py-2.5 label">Coins routing here</div>
                  {view.sources.length ? (
                    <ul className="divide-y divide-line/70">
                      {view.sources.map((s) => (
                        <li key={s.address}>
                          <Link href={`/${s.address}`} className="flex items-center gap-3 px-4 py-2.5 transition hover:bg-tile/60">
                            <StockLogo address={s.address} meta={s} size="h-8 w-8" text="text-[9px]" />
                            <span className="min-w-0 flex-1">
                              <span className="block truncate text-sm font-semibold text-ink">{s.symbol ? `$${s.symbol}` : shortAddr(s.address)}</span>
                              <span className="block text-[11px] text-mut">{s.active ? 'running' : 'paused'}</span>
                            </span>
                            <span className="figure text-sm font-semibold text-ink">{(s.shareBps / 100).toFixed(s.shareBps % 100 ? 1 : 0)}%</span>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  ) : <p className="px-4 py-6 text-sm text-mut">No coin routes here at the moment.</p>}
                </div>

                <div className="frame p-4">
                  <div className="label">Vault</div>
                  <a href={`${EXPLORER}/address/${view.vault}`} target="_blank" rel="noopener noreferrer" className="mt-1.5 block break-all font-mono text-xs text-ink hover:text-hood-600">{view.vault} ↗</a>
                  <p className="mt-2 text-xs leading-relaxed text-mut">
                    {view.claimed
                      ? 'This page is claimed: payments go straight to its owner. Anything that still lands in the vault is forwarded to them.'
                      : `A wallet created for this page alone. ${BRAND} only ever sends its content to the wallet the verified owner binds.`}
                  </p>
                  {view.vaultBalance?.assets?.length > 0 && (
                    <ul className="mt-3 space-y-1.5 border-t border-line pt-3">
                      {view.vaultBalance.assets.map((a) => (
                        <li key={a.address} className="flex items-center justify-between text-xs">
                          <span className="flex items-center gap-1.5"><StockLogo address={a.address} meta={{ symbol: a.symbol }} size="h-4 w-4" text="text-[5px]" /><span className="font-mono font-semibold text-ink">{a.symbol}</span></span>
                          <span className="figure text-mut"><span className="text-ink">{fmtAmount(a.amount)}</span> · {fmtUsd(a.usd)}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                  {view.sweeps.length > 0 && (
                    <div className="mt-3 border-t border-line pt-3">
                      <div className="label">Sent to the owner</div>
                      <ul className="mt-1.5 space-y-1">
                        {view.sweeps.map((s) => (
                          <li key={s.tx || `${s.symbol}-${s.at}`} className="flex items-center justify-between text-xs text-mut">
                            <span><span className="figure text-ink">{fmtAmount(s.amount)} {s.symbol}</span> · {ago(s.at)}</span>
                            {s.tx && <a href={`${EXPLORER}/tx/${s.tx}`} target="_blank" rel="noopener noreferrer" className="hover:text-ink">tx ↗</a>}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </>
        )}
      </div>
      <Footer />
    </main>
  );
}
