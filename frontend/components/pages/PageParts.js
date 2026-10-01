// Small pieces shared by everything that lists or shows a page: its picture,
// its claim state, its rows, the channel bar that measures it against another,
// and the inflow that draws the coins routing to it as light. No hooks here:
// the server pages use them as they are.
import Link from 'next/link';
import { PlatformIcon } from '../Icons';
import StockLogo from '../StockLogo';
import { PLATFORMS, pageAvatar } from '../../lib/pages';
import { CHAINS, chainOf, explorerTx, explorerTxFor } from '../../lib/chains';

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
 * The chain a row belongs to: its own `chain` field when it has one, else the
 * shape of the coin behind it, of the asset paid, or of its transaction. Null
 * when nothing tells (a page's totals add up every chain, so they carry none).
 */
export function rowChain(r) {
  if (!r) return null;
  if (CHAINS[r.chain]) return r.chain;
  const tx = String(r.tx || '');
  return chainOf(r.from?.address) || chainOf(r.token)
    || (/^0x[0-9a-fA-F]{64}$/.test(tx) ? 'robinhood' : /^[1-9A-HJ-NP-Za-km-z]{64,90}$/.test(tx) ? 'solana' : null);
}

/** The chain, said small: a dot in its colour and its name. Nothing when unknown. */
export function ChainTag({ chain, className = '' }) {
  const c = CHAINS[chain];
  if (!c) return null;
  return (
    <span className={`inline-flex items-center gap-1.5 font-mono text-[9.5px] uppercase tracking-[0.16em] text-dim ${className}`}>
      <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: c.color, boxShadow: `0 0 8px ${c.color}` }} />
      {c.label}
    </span>
  );
}

/**
 * A channel of light whose length is `pct` (0 to 100) of the largest one. The
 * gradient spans the whole track, so a short channel stays blue and only the
 * longest reaches the violet end.
 */
export function ChannelBar({ pct, dim = false, className = '' }) {
  const w = Math.max(0, Math.min(100, Number(pct) || 0));
  return (
    <span className={`relative block h-1.5 rounded-full bg-white/[0.06] ${className}`}>
      {w > 0 && (
        <span
          className={`beam absolute inset-y-0 left-0 rounded-full ${dim ? 'opacity-40' : 'shadow-[0_0_12px_rgba(95,227,255,0.45)]'}`}
          style={{ width: `${Math.max(w, 1.5)}%`, backgroundSize: `${10000 / Math.max(w, 1.5)}% 100%` }}
        />
      )}
    </span>
  );
}

/**
 * The page's own picture (the avatar of the channel or the account, the favicon
 * of the site), with the logo of its platform on the corner. The picture is
 * served by the site and falls back to the platform's logo, so it is never empty.
 * `lit` rings it with the beam and lets its glow spill around it.
 */
export function PageAvatar({ page, size = 'h-10 w-10', badge = 'h-4 w-4', lit = false }) {
  return (
    <span className={`relative inline-flex shrink-0 ${size}`}>
      {lit && <span aria-hidden="true" className="pointer-events-none absolute -inset-[55%] rounded-full bg-[radial-gradient(circle,rgba(47,168,255,0.42),rgba(123,92,255,0.16)_42%,transparent_68%)] blur-xl" />}
      <span className={`relative block h-full w-full rounded-full ${lit ? 'beam p-[2px] shadow-beam' : ''}`}>
        <span className={`block h-full w-full overflow-hidden rounded-full bg-tile ${lit ? '' : 'border border-white/10'}`}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={pageAvatar(page.platform, page.handle)} alt="" loading="lazy" className="h-full w-full object-cover" />
        </span>
      </span>
      {badge && (
        <span className={`absolute -bottom-0.5 -right-0.5 flex items-center justify-center rounded-full border border-white/15 bg-ground p-[3px] shadow-soft ${badge}`}><PlatformIcon platform={page.platform} className="h-full w-full" /></span>
      )}
    </span>
  );
}

export function ClaimBadge({ claimed, className = '' }) {
  const base = 'inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2 py-[3px] font-mono text-[9.5px] font-medium uppercase leading-none tracking-[0.16em]';
  return claimed
    ? <span className={`${base} border-cyan-500/30 bg-cyan-500/10 text-cyan-500 ${className}`}><span className="h-1.5 w-1.5 rounded-full bg-cyan-500 shadow-[0_0_8px_#5FE3FF]" />Claimed</span>
    : <span className={`${base} border-white/10 bg-white/[0.04] text-mut ${className}`}><span className="h-1.5 w-1.5 rounded-full border border-mut/70" />Unclaimed</span>;
}

/**
 * One page in a list: who, where, how much. With `top` (the largest amount in
 * the list) a channel under the name measures this page against it.
 */
export function PageRow({ page, rank = null, top = null }) {
  const chain = rowChain(page);
  return (
    <Link href={page.path} className="group flex items-center gap-3.5 px-4 py-3.5 transition-colors hover:bg-white/[0.04] sm:px-5">
      {rank != null && <span className="w-6 shrink-0 font-mono text-[11px] tabular-nums text-dim">{String(rank).padStart(2, '0')}</span>}
      <PageAvatar page={page} />
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2">
          <span className="truncate text-[15px] font-medium text-ink transition-colors group-hover:text-hood-600">{page.name}</span>
          <ClaimBadge claimed={page.claimed} />
        </span>
        <span className="mt-0.5 flex min-w-0 items-center gap-2 text-xs text-mut">
          <span className="truncate">
            {PLATFORMS[page.platform]?.label || page.platform}
            {page.coins ? ` · ${page.coins} coin${page.coins === 1 ? '' : 's'} routing` : ''}
            {page.payments ? ` · ${page.payments} payment${page.payments === 1 ? '' : 's'}` : ''}
          </span>
          {chain && <ChainTag chain={chain} />}
        </span>
        {top > 0 && <ChannelBar pct={((page.receivedUsd || 0) / top) * 100} className="mt-2.5 max-w-sm" />}
      </span>
      <span className="shrink-0 text-right">
        <span className="figure block text-[15px] font-medium text-ink">{fmtUsd(page.receivedUsd)}</span>
        <span className="block font-mono text-[10.5px] text-dim">{page.lastAt ? ago(page.lastAt) : 'no payment yet'}</span>
      </span>
    </Link>
  );
}

/**
 * One payment to a page. The asset and its amount lead, in the unit it was
 * paid in (the chain's own currency when the row names no symbol); the dollar
 * value follows, smaller.
 */
export function PayoutRow({ p, showPage = true }) {
  const chain = rowChain(p);
  const unit = p.symbol || CHAINS[chain]?.native || '';
  const txUrl = p.tx ? (chain ? explorerTxFor(chain, p.tx) : explorerTx(p.tx)) : null;
  return (
    <div className="flex items-center gap-3 px-4 py-3 sm:px-5">
      {showPage
        ? <PageAvatar page={p} size="h-9 w-9" badge="h-4 w-4" />
        : <StockLogo address={p.token} meta={{ symbol: p.symbol }} size="h-9 w-9" text="text-[8px]" />}
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm text-mut">
          {showPage && <Link href={p.path} className="font-medium text-ink transition-colors hover:text-hood-600">{p.name}</Link>}
          {showPage ? ' received ' : ''}
          <span className="inline-flex items-center gap-1 align-middle">
            {showPage && <StockLogo address={p.token} meta={{ symbol: p.symbol }} size="h-4 w-4" text="text-[5px]" />}
            <span className="figure font-medium text-ink">{fmtAmount(p.amount)} {unit}</span>
          </span>
          {p.from?.address ? <> from <Link href={`/${p.from.address}`} className="inline-flex items-center gap-1 align-middle font-medium text-ink transition-colors hover:text-hood-600"><StockLogo address={p.from.address} meta={p.from} size="h-4 w-4" text="text-[5px]" />{p.from.symbol ? `$${p.from.symbol}` : shortAddr(p.from.address)}</Link></> : null}
        </span>
        <span className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-dim">
          <span>{p.direct ? 'paid to its owner' : 'into its vault'}</span>
          {chain && <ChainTag chain={chain} />}
          <span>{ago(p.at)}</span>
        </span>
      </span>
      <span className="shrink-0 text-right">
        <span className="figure block text-sm text-hood-600">{fmtUsd(p.usd)}</span>
        {txUrl && <a href={txUrl} target="_blank" rel="noopener noreferrer" className="font-mono text-[10.5px] text-dim transition-colors hover:text-cyan-500">tx ↗</a>}
      </span>
    </div>
  );
}

/**
 * The coins that route to a page, drawn as light flowing into it: one channel
 * per coin, as thick as its share, all meeting at the page. `sources`:
 * [{ key, share, active, node }] where `node` sits at the start of its channel;
 * `target` sits where they meet. Paused coins keep a dim channel and no pulse.
 * Plain SVG and markup, so a server page can draw it.
 */
export function Inflow({ sources, target, width = 640, rowH = 64, split = 0.42, id = 'inflow', className = '' }) {
  const n = Math.max(1, sources.length);
  const W = width;
  const H = Math.max(176, n * rowH + 24);
  const x0 = Math.round(W * split) + 6;
  const x1 = W - 56;
  const ys = sources.map((_, i) => (n === 1 ? H / 2 : rowH / 2 + 12 + (i * (H - rowH - 24)) / (n - 1)));
  const path = (y) => `M ${x0} ${y} C ${x0 + (x1 - x0) * 0.45} ${y}, ${x1 - (x1 - x0) * 0.5} ${H / 2}, ${x1} ${H / 2}`;
  const maxShare = Math.max(1, ...sources.map((s) => s.share || 0));
  return (
    <div className={`relative ${className}`}>
      <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" style={{ overflow: 'visible' }} aria-hidden="true">
        <defs>
          <linearGradient id={`${id}-beam`} gradientUnits="userSpaceOnUse" x1={x0} y1="0" x2={x1} y2="0">
            <stop offset="0" stopColor="#2FA8FF" /><stop offset="0.5" stopColor="#5FE3FF" /><stop offset="1" stopColor="#7B5CFF" />
          </linearGradient>
          <filter id={`${id}-glow`} filterUnits="userSpaceOnUse" x={-40} y={-40} width={W + 80} height={H + 80}>
            <feGaussianBlur stdDeviation="6" result="b" /><feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>
        {sources.map((s, i) => {
          const w = 2 + ((s.share || 0) / maxShare) * 10;
          const d = path(ys[i]);
          const live = s.active !== false;
          return (
            <g key={s.key} opacity={live ? 1 : 0.35}>
              <path d={d} stroke={`url(#${id}-beam)`} strokeWidth={w} fill="none" strokeLinecap="round" opacity={0.26} />
              <path d={d} stroke={`url(#${id}-beam)`} strokeWidth={Math.max(1.5, w * 0.45)} fill="none" strokeLinecap="round" filter={`url(#${id}-glow)`} opacity={0.95} strokeDasharray={live ? undefined : '3 7'} />
              {live && (
                <circle r={Math.max(3, w * 0.5)} fill="#fff" filter={`url(#${id}-glow)`}>
                  <animateMotion dur={`${2.4 + i * 0.3}s`} begin={`${i * 0.45}s`} repeatCount="indefinite" path={d} keyPoints="0;1" keyTimes="0;1" calcMode="spline" keySplines="0.4 0 0.2 1" />
                </circle>
              )}
            </g>
          );
        })}
      </svg>
      {sources.map((s, i) => (
        <div key={s.key} className="absolute left-0 -translate-y-1/2" style={{ top: `${(ys[i] / H) * 100}%`, width: `${split * 100}%` }}>{s.node}</div>
      ))}
      <div className="absolute -translate-x-1/2 -translate-y-1/2" style={{ left: `${(x1 / W) * 100}%`, top: '50%' }}>{target}</div>
    </div>
  );
}
