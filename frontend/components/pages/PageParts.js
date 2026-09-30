// Small pieces shared by everything that lists or shows a page.
import Link from 'next/link';
import { PlatformIcon } from '../Icons';
import StockLogo from '../StockLogo';
import { PLATFORMS, pageAvatar } from '../../lib/pages';

export const fmtUsd = (n) => {
  const v = Number(n) || 0;
  if (v >= 1000) return `$${v.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
  if (v >= 1) return `$${v.toFixed(2)}`;
  return v > 0 ? `$${v.toFixed(v < 0.01 ? 4 : 2)}` : '$0';
};
export const fmtAmount = (n) => {
  const v = Number(n) || 0;
  if (v >= 1000) return v.toLocaleString('en-US', { maximumFractionDigits: 0 });
  if (v >= 1) return v.toFixed(2);
  return v.toFixed(v < 0.0001 && v > 0 ? 6 : 4);
};
export const shortAddr = (a) => (a ? `${a.slice(0, 6)}…${a.slice(-4)}` : '');
export function ago(iso) {
  if (!iso) return '';
  const s = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (s < 60) return 'just now';
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

/**
 * The page's own picture (the avatar of the channel or the account, the favicon
 * of the site), with the logo of its platform on the corner. The picture is
 * served by the site and falls back to the platform's logo, so it is never empty.
 */
export function PageAvatar({ page, size = 'h-10 w-10', badge = 'h-4 w-4' }) {
  return (
    <span className={`relative inline-flex shrink-0 ${size}`}>
      <span className="block h-full w-full overflow-hidden rounded-full border border-line bg-tile">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={pageAvatar(page.platform, page.handle)} alt="" loading="lazy" className="h-full w-full object-cover" />
      </span>
      {badge && (
        <span className={`absolute -bottom-0.5 -right-0.5 flex items-center justify-center rounded-full border border-line bg-ground p-[3px] ${badge}`}><PlatformIcon platform={page.platform} className="h-full w-full" /></span>
      )}
    </span>
  );
}

export function ClaimBadge({ claimed, className = '' }) {
  return claimed
    ? <span className={`rounded-full bg-hood-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-hood-700 ${className}`}>Claimed</span>
    : <span className={`rounded-full bg-gold-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-gold-700 ${className}`}>Unclaimed</span>;
}

/** One page in a list: who, where, how much. */
export function PageRow({ page, rank = null }) {
  return (
    <Link href={page.path} className="group flex items-center gap-3 px-4 py-3 transition hover:bg-tile/60">
      {rank != null && <span className="figure w-5 shrink-0 text-xs text-mut">{rank}</span>}
      <PageAvatar page={page} />
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2">
          <span className="truncate text-sm font-semibold text-ink group-hover:text-hood-600">{page.name}</span>
          <ClaimBadge claimed={page.claimed} />
        </span>
        <span className="block truncate text-xs text-mut">
          {PLATFORMS[page.platform]?.label || page.platform}
          {page.coins ? ` · ${page.coins} coin${page.coins === 1 ? '' : 's'} routing` : ''}
          {page.payments ? ` · ${page.payments} payment${page.payments === 1 ? '' : 's'}` : ''}
        </span>
      </span>
      <span className="text-right">
        <span className="figure block text-sm font-semibold text-ink">{fmtUsd(page.receivedUsd)}</span>
        <span className="block text-[11px] text-mut">{page.lastAt ? ago(page.lastAt) : 'no payment yet'}</span>
      </span>
    </Link>
  );
}

/** One payment to a page. */
export function PayoutRow({ p, showPage = true }) {
  return (
    <div className="flex items-center gap-3 px-4 py-2.5">
      {showPage && <PageAvatar page={p} size="h-8 w-8" badge="h-3.5 w-3.5" />}
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm text-ink">
          {showPage && <Link href={p.path} className="font-semibold hover:text-hood-600">{p.name}</Link>}
          {showPage ? ' received ' : ''}
          <span className="inline-flex items-center gap-1 align-middle"><StockLogo address={p.token} meta={{ symbol: p.symbol }} size="h-4 w-4" text="text-[5px]" /><span className="figure font-semibold">{fmtAmount(p.amount)} {p.symbol}</span></span>
          {p.from?.address ? <> from <Link href={`/${p.from.address}`} className="inline-flex items-center gap-1 align-middle font-semibold hover:text-hood-600"><StockLogo address={p.from.address} meta={p.from} size="h-4 w-4" text="text-[5px]" />{p.from.symbol ? `$${p.from.symbol}` : shortAddr(p.from.address)}</Link></> : null}
        </span>
        <span className="block text-[11px] text-mut">{p.direct ? 'paid to its owner' : 'into its vault'} · {ago(p.at)}</span>
      </span>
      <span className="text-right">
        <span className="figure block text-sm font-semibold text-hood-600">{fmtUsd(p.usd)}</span>
        {p.tx && <a href={`https://robinhoodchain.blockscout.com/tx/${p.tx}`} target="_blank" rel="noopener noreferrer" className="text-[11px] text-mut hover:text-ink">tx ↗</a>}
      </span>
    </div>
  );
}
