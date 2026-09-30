// A wallet's statement: the wallet and its totals at the head, then the lines,
// one per payout, with the coin that paid, the asset received, the receipt and
// the transaction. What the wallet holds today sits beside the lines.
import Link from 'next/link';
import Navigation from '../../../components/Navigation';
import TickerTape from '../../../components/TickerTape';
import Footer from '../../../components/Footer';
import StockLogo from '../../../components/StockLogo';
import { Arrow, X, External, Medal } from '../../../components/Icons';
import { getWalletStatement } from '../../../lib/queries';
import { fetchTokenMeta } from '../../../lib/tokenMeta';
import { EVM_ADDR, explorerTx, explorerAddress } from '../../../lib/stocks';
import { fmtUnits, siteUrl } from '../../../lib/og';
import { BRAND, CREDIT } from '../../../lib/brand';

export const dynamic = 'force-dynamic';
const BLOCKS_PER_DAY = 864000;
const short = (a) => `${a.slice(0, 6)}…${a.slice(-4)}`;
const X_HANDLE = CREDIT;

export async function generateMetadata({ params }) {
  const { address } = await params;
  if (!EVM_ADDR.test(address)) return { title: `Wallet · ${BRAND}` };
  const image = `${siteUrl()}/api/card/wallet/${address}`;
  const title = `Dividend statement for ${short(address)}`;
  return {
    title: `${title} · ${BRAND}`,
    description: `Stock dividends earned by holding tokens on Robinhood Chain, via ${BRAND}.`,
    openGraph: { title, images: [{ url: image, width: 1200, height: 630 }] },
    twitter: { card: 'summary_large_image', title, images: [image] },
  };
}

export default async function WalletPage({ params }) {
  const { address } = await params;
  if (!EVM_ADDR.test(address)) {
    return (
      <>
        <TickerTape /><Navigation />
        <main className="mx-auto max-w-6xl px-5 py-16">
          <div className="border-t border-line pt-8">
            <div className="label">Dividend statement</div>
            <h1 className="mt-3 font-display text-4xl font-medium tracking-tight text-ink">Not a wallet address</h1>
            <p className="mt-3 max-w-md text-sm text-mut">A wallet address starts with 0x and is 42 characters long.</p>
            <Link href="/wallet" className="btn-primary mt-7">Try again</Link>
          </div>
        </main>
        <Footer />
      </>
    );
  }
  const { totals, recent, holdings } = await getWalletStatement(address);
  const meta = await fetchTokenMeta([...totals.flatMap((t) => [t.source_token, t.reward_token]), ...recent.flatMap((r) => [r.source_token, r.reward_token]), ...holdings.map((h) => h.token)]);
  const sym = (a) => meta[a]?.symbol || (a ? a.slice(2, 6).toUpperCase() : '?');
  const dec = (a) => meta[a]?.decimals ?? 18;

  const byReward = new Map();
  for (const t of totals) {
    const cur = byReward.get(t.reward_token) || { total: 0n, n: 0 };
    cur.total += BigInt(t.total);
    cur.n += t.n;
    byReward.set(t.reward_token, cur);
  }
  const dividends = totals.reduce((s, t) => s + t.n, 0);
  const site = siteUrl();
  const headline = [...byReward.entries()].sort((a, b) => b[1].n - a[1].n).slice(0, 3).map(([k, v]) => `${fmtUnits(v.total, dec(k))} ${sym(k)}`).join(', ');
  const shareText = dividends > 0
    ? `I earned ${headline} just by holding on Robinhood Chain. Stock dividends by ${X_HANDLE}`
    : `Memecoins that pay real stock dividends on Robinhood Chain. ${X_HANDLE}`;
  const shareUrl = `https://x.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(`${site}/wallet/${address}`)}`;
  const assets = [...byReward.entries()].sort((a, b) => b[1].n - a[1].n);
  const coins = new Set(totals.map((t) => t.source_token)).size;
  const mostPaid = Math.max(...assets.map(([, v]) => v.n), 0);

  return (
    <>
      <TickerTape />
      <Navigation />
      <main className="mx-auto max-w-6xl px-5 py-10 sm:py-12">
        {/* Head of the statement: whose it is */}
        <header className="flex flex-wrap items-end justify-between gap-x-8 gap-y-5 border-b border-line pb-6">
          <div className="min-w-0">
            <div className="eyebrow">Dividend statement</div>
            <h1 className="mt-3 font-mono text-xl font-medium tracking-tight text-ink sm:text-2xl">
              <span className="hidden break-all md:inline">{address}</span>
              <span className="md:hidden">{short(address)}</span>
            </h1>
            <a href={explorerAddress(address)} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex items-center gap-1 font-mono text-xs text-mut transition-colors hover:text-ink">Blockscout<External className="h-3 w-3" /></a>
          </div>
          <a href={shareUrl} target="_blank" rel="noopener noreferrer" className="btn-ink"><X className="h-4 w-4" /> Share my statement</a>
        </header>

        {/* Totals: the count on the left, one line per asset received on the right */}
        <section className="frame mt-6 grid overflow-hidden lg:grid-cols-12">
          <div className="border-b border-line p-6 sm:p-7 lg:col-span-4 lg:border-b-0 lg:border-r">
            <div className="label">Dividends received</div>
            <div className={`figure mt-3 text-7xl font-medium leading-[0.85] tracking-tight ${dividends > 0 ? 'text-ink' : 'text-mut'}`}>{dividends.toLocaleString('en-US')}</div>
            <div className="mt-4 text-sm text-mut">
              {dividends > 0
                ? <>in <span className="figure text-ink">{assets.length}</span> asset{assets.length === 1 ? '' : 's'}, from <span className="figure text-ink">{coins}</span> coin{coins === 1 ? '' : 's'}</>
                : 'payouts to this wallet so far'}
            </div>
          </div>
          <div className="min-w-0 lg:col-span-8">
            {dividends === 0 ? (
              <div className="flex h-full flex-col justify-center p-6 sm:p-7">
                <p className="max-w-lg font-display text-xl font-medium leading-snug tracking-tight text-ink">No dividend yet for this wallet.</p>
                <p className="mt-2 max-w-lg text-sm text-mut">Hold a token that runs {BRAND} and the statement fills itself.</p>
              </div>
            ) : (
              <>
                <div className="label grid grid-cols-[minmax(0,1fr)_auto] gap-x-4 px-6 py-2.5 sm:grid-cols-[minmax(0,1fr)_8rem_9rem] sm:px-7">
                  <span>Asset</span><span className="hidden sm:block">Payouts</span><span className="text-right">Total received</span>
                </div>
                <div className="divide-y divide-line border-t border-line">
                  {assets.map(([k, v]) => (
                    <div key={k} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 px-6 py-3 sm:grid-cols-[minmax(0,1fr)_8rem_9rem] sm:px-7">
                      <div className="flex min-w-0 items-center gap-3">
                        <StockLogo address={k} meta={meta[k]} size="h-8 w-8" text="text-[8px]" />
                        <div className="min-w-0">
                          <div className="text-sm font-semibold text-ink">{sym(k)}</div>
                          <div className="truncate text-[11px] text-mut">{meta[k]?.name || 'on Robinhood Chain'}<span className="sm:hidden"> · {v.n} payouts</span></div>
                        </div>
                      </div>
                      <div className="hidden items-center gap-2 sm:flex">
                        <span className="h-1 flex-1 overflow-hidden rounded-full bg-line"><span className="block h-full rounded-full bg-hood-500/70" style={{ width: `${mostPaid > 0 ? Math.max(4, (v.n / mostPaid) * 100) : 0}%` }} /></span>
                        <span className="figure w-8 text-right text-xs text-mut">{v.n}</span>
                      </div>
                      <div className="figure text-right text-xl font-medium tracking-tight text-hood-600">+{fmtUnits(v.total, dec(k))}</div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </section>

        <div className="mt-3 grid gap-3 lg:grid-cols-12 lg:items-start">
          {/* The lines of the statement */}
          <section className="panel min-w-0 overflow-hidden lg:col-span-8">
            <div className="flex items-baseline justify-between gap-4 px-5 pb-4 pt-5 sm:px-6">
              <h2 className="font-display text-lg font-medium tracking-tight text-ink">Recent dividends</h2>
              <span className="label">{recent.length ? `last ${recent.length}` : 'no line yet'}</span>
            </div>
            <div className="label hidden grid-cols-[5.5rem_minmax(0,1fr)_minmax(0,1fr)_8rem] gap-x-4 border-t border-line px-6 py-2 sm:grid">
              <span>Date</span><span>Paid by</span><span className="text-right">Received</span><span className="text-right">Proof</span>
            </div>
            {recent.length === 0 ? (
              <div className="border-t border-line">
                <div aria-hidden="true" className="divide-y divide-line">
                  {[72, 54, 63].map((w) => (
                    <div key={w} className="grid grid-cols-[5.5rem_minmax(0,1fr)_4rem] items-center gap-x-4 px-5 py-3.5 sm:px-6">
                      <span className="h-1.5 w-12 rounded-full bg-tile" />
                      <span className="h-1.5 rounded-full bg-tile" style={{ width: `${w}%` }} />
                      <span className="h-1.5 rounded-full bg-tile" />
                    </div>
                  ))}
                </div>
                <p className="border-t border-line px-5 py-5 text-sm text-mut sm:px-6">Nothing yet.</p>
              </div>
            ) : (
              <div className="divide-y divide-line border-t border-line">
                {recent.map((r, i) => (
                  <div key={`${r.log_id}-${i}`} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-1 px-5 py-2.5 transition-colors hover:bg-tile/40 sm:grid-cols-[5.5rem_minmax(0,1fr)_minmax(0,1fr)_8rem] sm:px-6">
                    <span className="text-xs text-mut">{new Date(r.execution_time).toLocaleDateString()}</span>
                    <span className="flex items-center justify-end gap-1.5 sm:order-3">
                      <StockLogo address={r.reward_token} meta={meta[r.reward_token]} size="h-5 w-5" text="text-[6px]" />
                      <span className="figure text-sm font-medium text-ink">+{fmtUnits(r.amount, dec(r.reward_token))} {sym(r.reward_token)}</span>
                    </span>
                    <Link href={`/${r.source_token}`} className="flex min-w-0 items-center gap-1.5 text-xs text-mut transition-colors hover:text-ink sm:order-2">
                      <StockLogo address={r.source_token} meta={meta[r.source_token]} size="h-5 w-5" text="text-[6px]" />
                      <span className="truncate">from ${sym(r.source_token)}</span>
                    </Link>
                    <span className="flex items-center justify-end gap-3 font-mono text-[11px] sm:order-4">
                      <Link href={`/receipt/${r.log_id}`} className="text-hood-600 transition-colors hover:text-hood-700">receipt</Link>
                      {r.tx_hash && <a href={explorerTx(r.tx_hash)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-mut transition-colors hover:text-ink">tx<External className="h-3 w-3" /></a>}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* What the wallet holds today, and where it stands on loyalty */}
          <section className="panel min-w-0 overflow-hidden lg:col-span-4">
            <div className="px-5 pb-4 pt-5 sm:px-6">
              <h2 className="font-display text-lg font-medium tracking-tight text-ink">{BRAND} tokens held</h2>
            </div>
            {holdings.length === 0 ? (
              <p className="border-t border-line px-5 py-5 text-sm text-mut sm:px-6">This wallet holds no token that runs {BRAND} right now.</p>
            ) : (
              <div className="divide-y divide-line border-t border-line">
                {holdings.map((h) => {
                  const since = h.since_block == null ? null : Math.max(Number(h.since_block), h.loyalty_sell_reset && h.last_out_block != null ? Number(h.last_out_block) : 0);
                  const heldDays = since == null ? null : Math.max(0, (Number(h.last_block) - since) / BLOCKS_PER_DAY);
                  const ramp = Number(h.loyalty_ramp_days || 30);
                  const maxMult = Number(h.loyalty_max_bps || 20000) / 10000;
                  const mult = !h.loyalty_enabled ? null : heldDays == null ? maxMult : 1 + (maxMult - 1) * Math.min(1, heldDays / ramp);
                  const pct = heldDays == null ? 100 : Math.min(100, Math.round((heldDays / ramp) * 100));
                  return (
                    <Link key={h.token} href={`/${h.token}`} className="group block px-5 py-3.5 transition-colors hover:bg-tile/50 sm:px-6">
                      <div className="flex items-center gap-3">
                        <StockLogo address={h.token} meta={meta[h.token]} size="h-9 w-9" />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-baseline justify-between gap-2">
                            <span className="truncate text-sm font-semibold text-ink group-hover:text-hood-600">${sym(h.token)}</span>
                            <span className="figure text-sm text-ink">{fmtUnits(h.balance, dec(h.token))}</span>
                          </div>
                          <div className="text-xs text-mut">{heldDays == null ? 'holding since before the ledger' : `holding for ${heldDays < 1 ? `${Math.max(1, Math.round(heldDays * 24))}h` : `${Math.floor(heldDays)} days`}`}</div>
                        </div>
                        <Arrow className="h-3.5 w-3.5 shrink-0 text-mut opacity-0 transition-opacity group-hover:opacity-100" />
                      </div>
                      {mult != null && (
                        <div className="mt-3">
                          <div className="flex items-center justify-between gap-3">
                            <span className="label flex items-center gap-1.5"><Medal className="h-3.5 w-3.5 text-gold-400" />Loyalty</span>
                            <span className="figure text-sm font-medium text-gold-400">{mult.toFixed(2)}x</span>
                          </div>
                          <div className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-line"><div className="h-full rounded-full bg-gold-400" style={{ width: `${pct}%` }} /></div>
                          <div className="mt-1.5 text-[11px] text-mut">Loyalty ramps to {maxMult.toFixed(1)}x at {ramp} days{h.loyalty_sell_reset ? ', selling resets' : ''}</div>
                        </div>
                      )}
                    </Link>
                  );
                })}
              </div>
            )}
          </section>
        </div>
      </main>
      <Footer />
    </>
  );
}
