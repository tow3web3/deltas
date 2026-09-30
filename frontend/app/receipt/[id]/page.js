// The receipt of one payout, set as a receipt: a narrow slip of paper with the
// payer at the top, the lines of the payout under it, the amounts on the right
// in tabular figures and the transactions in mono at the foot.
import Link from 'next/link';
import Navigation from '../../../components/Navigation';
import TickerTape from '../../../components/TickerTape';
import Footer from '../../../components/Footer';
import StockLogo from '../../../components/StockLogo';
import { Arrow, X, External } from '../../../components/Icons';
import { getReceipt } from '../../../lib/queries';
import { fetchTokenMeta } from '../../../lib/tokenMeta';
import { getStock, explorerTx, explorerToken } from '../../../lib/stocks';
import { fmtUnits, siteUrl } from '../../../lib/og';
import { BRAND, CREDIT } from '../../../lib/brand';

export const dynamic = 'force-dynamic';
const X_HANDLE = CREDIT;
const short = (a) => (a ? `${a.slice(0, 6)}…${a.slice(-4)}` : '');
const hash = (h) => (h ? `${h.slice(0, 10)}…${h.slice(-8)}` : '');
const MODES = { roulette: 'Stock Roulette', gainer: 'Top Gainer', portfolio: 'Portfolio', vote: 'Community Vote', fixed: 'Fixed reward' };

async function load(id) {
  const r = await getReceipt(id);
  if (!r) return null;
  const meta = await fetchTokenMeta([r.source_token_address, r.reward_token_used]);
  const src = meta[r.source_token_address] || {};
  const rew = meta[r.reward_token_used] || {};
  const stock = getStock(r.reward_token_used);
  return { r, src, rew, stock, rewardSymbol: rew.symbol || stock?.ticker || 'ETH', amount: fmtUnits(r.total_airdropped, rew.decimals ?? 18) };
}

export async function generateMetadata({ params }) {
  const { id } = await params;
  const d = await load(id);
  if (!d) return { title: `Receipt not found · ${BRAND}` };
  const title = `$${d.src.symbol || 'Token'} paid ${d.amount} ${d.rewardSymbol} to its holders`;
  const description = `${d.r.paid_count || d.r.holder_count} wallets received ${d.rewardSymbol} as a dividend on Robinhood Chain, via ${BRAND}.`;
  const image = `${siteUrl()}/api/card/receipt/${d.r.id}`;
  return {
    title: `${title} · ${BRAND}`,
    description,
    openGraph: { title, description, images: [{ url: image, width: 1200, height: 630 }], type: 'article' },
    twitter: { card: 'summary_large_image', title, description, images: [image] },
  };
}

/** The tear line of the slip: a dashed rule with a notch punched in each edge. */
function Tear() {
  return (
    <div className="relative h-4" aria-hidden="true">
      <span className="absolute -left-px top-0 h-4 w-[9px] overflow-hidden"><span className="absolute -left-2 top-0 h-4 w-4 rounded-full border border-line bg-ground" /></span>
      <span className="absolute -right-px top-0 h-4 w-[9px] overflow-hidden"><span className="absolute -right-2 top-0 h-4 w-4 rounded-full border border-line bg-ground" /></span>
      <span className="absolute inset-x-4 top-1/2 border-t border-dashed border-line" />
    </div>
  );
}

/** One line of the slip: what it is, a dotted leader, the amount on the right. */
function Item({ label, note, children }) {
  return (
    <div className="py-2">
      <div className="flex items-baseline gap-2">
        <span className="shrink-0 text-sm text-ink">{label}</span>
        <span className="min-w-[1rem] flex-1 translate-y-[-3px] border-b border-dotted border-line" aria-hidden="true" />
        <span className="figure shrink-0 text-right text-sm text-ink">{children}</span>
      </div>
      {note && <div className="mt-0.5 text-[11px] text-mut">{note}</div>}
    </div>
  );
}

function Asset({ address, meta, children }) {
  return <span className="inline-flex items-center gap-1.5"><StockLogo address={address} meta={meta} size="h-4 w-4" text="text-[5px]" className="translate-y-[2px]" />{children}</span>;
}

export default async function ReceiptPage({ params }) {
  const { id } = await params;
  const d = await load(id);

  if (!d) {
    return (
      <>
        <TickerTape /><Navigation />
        <main className="mx-auto max-w-6xl px-5 py-16">
          <div className="grid gap-8 border-t border-line pt-8 lg:grid-cols-12">
            <div className="lg:col-span-7">
              <div className="label">Receipt #{String(id).slice(0, 12)}</div>
              <h1 className="mt-3 font-display text-4xl font-medium tracking-tight text-ink">Receipt not found</h1>
              <p className="mt-3 max-w-md text-sm text-mut">No payout carries this number. Receipts are issued for cycles that paid at least one wallet.</p>
              <Link href="/" className="btn-primary mt-7">Go home <Arrow className="h-4 w-4" /></Link>
            </div>
          </div>
        </main>
        <Footer />
      </>
    );
  }

  const { r, src, rew, stock, rewardSymbol, amount } = d;
  const site = siteUrl();
  const shareText = `$${src.symbol || 'Token'} just paid its holders ${amount} ${rewardSymbol}\n${r.paid_count || r.holder_count} wallets, pro-rata, on Robinhood Chain.\nDividends by ${X_HANDLE}`;
  const shareUrl = `https://x.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(`${site}/receipt/${r.id}`)}`;
  const when = new Date(r.execution_time).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'America/New_York' });
  const coin = src.name || (src.symbol ? `$${src.symbol}` : short(r.source_token_address));
  const paid = r.paid_count || r.holder_count;
  const schedule = r.schedule_kind === 'closing_bell' ? 'at the closing bell' : r.schedule_kind === 'opening_bell' ? 'at the opening bell' : r.interval_minutes ? `every ${r.interval_minutes} min` : null;
  const number = String(r.id).padStart(6, '0');

  return (
    <>
      <TickerTape />
      <Navigation />
      <main className="mx-auto max-w-6xl px-5 py-10 sm:py-14">
        <div className="grid gap-x-12 gap-y-10 lg:grid-cols-12 lg:items-start">
          {/* What happened, in one sentence */}
          <div className="lg:sticky lg:top-24 lg:col-span-6">
            <div className="eyebrow">Dividend receipt #{r.id}</div>
            <h1 className="mt-4 font-display text-3xl font-medium leading-[1.08] tracking-tight text-ink sm:text-[44px]">
              Holders of {coin} received{' '}
              <span className="whitespace-nowrap"><span className="figure text-hood-500">{amount}</span> {rewardSymbol}</span>.
            </h1>
            <p className="mt-4 max-w-md text-sm leading-relaxed text-mut">
              {paid} wallets were paid on {when} ET, from {fmtUnits(r.claimed_eth_wei, 18, 4)} ETH of fees. Every line of it is on the slip.
            </p>
            <div className="mt-7 flex flex-wrap gap-2">
              <a href={shareUrl} target="_blank" rel="noopener noreferrer" className="btn-ink"><X className="h-3.5 w-3.5" /> Share</a>
              <Link href={`/${r.source_token_address}`} className="btn-primary">Dashboard <Arrow className="h-4 w-4" /></Link>
            </div>
            <p className="mt-8 border-t border-line pt-4 text-xs text-mut">Holders: check everything you earned at <Link href="/wallet" className="font-semibold text-hood-600 hover:text-hood-700">/wallet</Link>.</p>
          </div>

          {/* The slip */}
          <article className="frame mx-auto w-full max-w-[440px] lg:col-span-6 lg:mr-0" aria-label={`Receipt ${r.id}`}>
            <header className="px-6 pb-4 pt-6">
              <div className="label flex items-center justify-between gap-3">
                <span>{BRAND} · receipt</span>
                <span className="text-ink">No. {number}</span>
              </div>
              <div className="mt-5 flex items-center gap-3">
                <StockLogo address={r.source_token_address} meta={src} size="h-11 w-11" />
                <div className="min-w-0">
                  <div className="label">Holders of</div>
                  <div className="mt-0.5 flex items-baseline gap-2">
                    <Link href={`/${r.source_token_address}`} className="truncate font-display text-lg font-medium tracking-tight text-ink hover:text-hood-600">{coin}</Link>
                    {src.symbol && src.name && <span className="font-mono text-xs text-mut">${src.symbol}</span>}
                  </div>
                </div>
              </div>
              <div className="mt-4 flex items-center justify-between gap-3 font-mono text-[11px] text-mut">
                <span>{when} ET</span>
                <a href={explorerToken(r.source_token_address)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 hover:text-ink">{short(r.source_token_address)}<External className="h-3 w-3" /></a>
              </div>
            </header>

            <Tear />

            <section className="px-6 py-3">
              <div className="label flex justify-between pb-1"><span>Item</span><span>Amount</span></div>
              <Item label="Fees collected" note="what this cycle started from">
                <Asset address={null}>{fmtUnits(r.claimed_eth_wei, 18, 4)} ETH</Asset>
              </Item>
              {r.swap_tx && (
                <Item label="Swapped into" note="on the market, before the payout">
                  <Asset address={r.reward_token_used} meta={rew}>{rewardSymbol}</Asset>
                </Item>
              )}
              <Item label="Wallets paid" note={r.destination === 'burn' ? 'destination: buyback and burn' : 'destination: holders'}>{paid}</Item>
              <Item label="Weighting" note={r.loyalty_enabled ? 'long holders weigh more' : 'by balance at the snapshot'}>{r.loyalty_enabled ? 'Loyalty' : 'Pro-rata'}</Item>
              {r.reward_mode_used && MODES[r.reward_mode_used] && <Item label="Reward picked by">{MODES[r.reward_mode_used]}</Item>}
              {schedule && <Item label="Schedule">{schedule}</Item>}
            </section>

            <section className="mx-6 border-t border-line py-5">
              <div className="flex items-end justify-between gap-4">
                <div>
                  <div className="label">Received</div>
                  <div className="mt-2 flex items-center gap-2">
                    <StockLogo address={r.reward_token_used} meta={rew} size="h-8 w-8" text="text-[8px]" />
                    <div className="min-w-0">
                      <div className="text-sm font-semibold leading-tight text-ink">{rewardSymbol}</div>
                      <div className="truncate text-[11px] leading-tight text-mut">{stock ? `${stock.name} · Robinhood Stock Token` : rew.name || 'on Robinhood Chain'}</div>
                    </div>
                  </div>
                </div>
                <div className="figure text-right text-4xl font-medium leading-none tracking-tight text-hood-500 sm:text-5xl">{amount}</div>
              </div>
            </section>

            <Tear />

            <footer className="px-6 pb-6 pt-3">
              <div className="label pb-2">Transactions</div>
              <dl className="space-y-2 font-mono text-xs">
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-mut">payout</dt>
                  <dd>{r.tx_hash ? <a href={explorerTx(r.tx_hash)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-hood-600 hover:text-hood-700">{hash(r.tx_hash)}<External className="h-3 w-3" /></a> : <span className="text-mut">not recorded</span>}</dd>
                </div>
                {r.swap_tx && (
                  <div className="flex items-center justify-between gap-3">
                    <dt className="text-mut">swap</dt>
                    <dd><a href={explorerTx(r.swap_tx)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-ink hover:text-hood-600">{hash(r.swap_tx)}<External className="h-3 w-3" /></a></dd>
                  </div>
                )}
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-mut">chain</dt>
                  <dd className="text-ink">Robinhood Chain (4663)</dd>
                </div>
              </dl>
              {r.error_message && <p className="mt-4 border-t border-dashed border-line pt-3 text-xs text-gold-400">{r.error_message}</p>}
            </footer>
          </article>
        </div>
      </main>
      <Footer />
    </>
  );
}
