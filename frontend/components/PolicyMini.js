'use client';

// A read-only miniature of a coin's routing canvas: the dev wallet on the left,
// the legs on the right, dashed flows carrying the share. Same look as the
// Studio, no React Flow, for public pages and the homepage.
import { useEffect, useRef, useState } from 'react';
import StockLogo from './StockLogo';
import Countdown from './Countdown';
import { pageName, PLATFORMS } from '../lib/pages';
import { PageAvatar } from './pages/PageParts';
import { Users, Wallet, Burn, Vault, World, Vote, InKind } from './Icons';
import { getStock, ZERO } from '../lib/stocks';

// A kind of destination is told by its icon and its colour, as on the canvas.
const KIND = {
  holders: { label: 'Holders', icon: Users, color: '#2FA8FF', text: 'text-hood-600' },
  wallet: { label: 'Wallet', icon: Wallet, color: '#F4F5F4', text: 'text-ink' },
  burn: { label: 'Buyback & burn', icon: Burn, color: '#FF7A1A', text: 'text-orange-700' },
  treasury: { label: 'Treasury', icon: Vault, color: '#F6C343', text: 'text-gold-700' },
  page: { label: 'Page', icon: World, color: '#5B9DFF', text: 'text-[#8DBBFF]' },
  lottery: { label: 'Lottery', icon: Vote, color: '#FF3D8A', text: 'text-pink-600' },
};
const short = (a) => (a && a.length > 10 ? `${a.slice(0, 6)}…${a.slice(-4)}` : a || '');
const pct = (bps) => (bps / 100).toFixed(bps % 100 ? 1 : 0);
const usd = (n) => `$${Number(n || 0).toLocaleString('en-US', { maximumFractionDigits: n >= 100 ? 0 : 2 })}`;
const marks = 'before:[border-color:var(--k)] after:[border-color:var(--k)]';

/** Legs from the API, or the legacy four-way split when the canvas was never used. */
export function legsFrom({ legs, split }) {
  if (Array.isArray(legs) && legs.length) return legs;
  const out = [];
  const s = split || { holders: 10000 };
  if (s.holders > 0) out.push({ kind: 'holders', shareBps: s.holders, label: 'Holders', assetSymbol: null });
  if (s.creator > 0) out.push({ kind: 'wallet', shareBps: s.creator, label: 'Creator', assetSymbol: null });
  if (s.burn > 0) out.push({ kind: 'burn', shareBps: s.burn, label: 'Buyback & burn', assetSymbol: null });
  if (s.treasury > 0) out.push({ kind: 'treasury', shareBps: s.treasury, label: 'Treasury', assetSymbol: null });
  return out;
}

/** The logo of what a leg is paid in, when the leg names it: by address, or by the symbol of a stock or ETH. */
function assetAddress(l) {
  if (l.asset) return l.asset;
  if (!l.assetSymbol) return null;
  if (String(l.assetSymbol).toUpperCase() === 'ETH') return ZERO;
  return getStock(l.assetSymbol)?.address || null;
}

const LEG_H = 92;
const LEG_GAP = 14;

export default function PolicyMini({ source, devWallet, schedule, legs: rawLegs, split, countdown = null, className = '' }) {
  const legs = legsFrom({ legs: rawLegs, split });
  const wrap = useRef(null);
  const [w, setW] = useState(0);
  useEffect(() => {
    if (!wrap.current) return undefined;
    const ro = new ResizeObserver((es) => setW(es[0].contentRect.width));
    ro.observe(wrap.current);
    return () => ro.disconnect();
  }, []);

  const n = Math.max(1, legs.length);
  const height = Math.max(countdown ? 250 : 190, n * (LEG_H + LEG_GAP) + 12);
  const narrow = w > 0 && w < 560;
  const srcW = narrow ? Math.min(200, w * 0.4) : Math.min(300, w * 0.4);
  const legX = narrow ? srcW + 26 : Math.max(srcW + 56, w * 0.56);
  const legW = Math.max(160, w - legX);
  const midY = height / 2;
  const sym = source?.symbol || 'TOKEN';
  const paused = countdown?.active === false;

  return (
    <div className={`w-full overflow-hidden rounded-2xl border border-line bg-ground p-2 sm:p-4 ${className}`} style={{ backgroundImage: 'radial-gradient(circle, rgba(244,245,244,0.07) 1px, transparent 1px)', backgroundSize: '18px 18px' }}>
    <div ref={wrap} className="relative w-full" style={{ height }}>
      {w > 0 && (
        <svg className="pointer-events-none absolute inset-0" width={w} height={height} aria-hidden>
          {legs.map((l, i) => {
            const k = KIND[l.kind] || KIND.wallet;
            const y2 = 6 + i * (LEG_H + LEG_GAP) + LEG_H / 2;
            const x1 = srcW;
            const x2 = legX;
            const c = (x2 - x1) / 2;
            const d = `M ${x1} ${midY} C ${x1 + c} ${midY}, ${x2 - c} ${y2}, ${x2} ${y2}`;
            const sw = 2 + (l.shareBps / 10000) * 8;
            return (
              <g key={i}>
                <path d={d} fill="none" stroke={k.color} strokeWidth={sw} strokeOpacity="0.28" />
                <path d={d} fill="none" stroke={k.color} strokeWidth={Math.max(1.5, sw / 2)} strokeDasharray="6 10" className={paused ? '' : 'bm-flow'} style={{ animationDuration: `${Math.max(0.6, 2.4 - (l.shareBps / 10000) * 1.6)}s`, opacity: paused ? 0.45 : 1 }} />
                <rect x={x2 - 4} y={y2 - 4} width="8" height="8" rx="2" fill={k.color} stroke="#0A0A0A" strokeWidth="1.5" />
              </g>
            );
          })}
          <rect x={srcW - 4.5} y={midY - 4.5} width="9" height="9" rx="2" fill="#2FA8FF" stroke="#0A0A0A" strokeWidth="1.5" />
        </svg>
      )}

      {/* source */}
      <div className="frame absolute left-0 shadow-soft" style={{ width: srcW, top: midY, transform: 'translateY(-50%)' }}>
        <div className={`flex items-center pt-3 ${narrow ? 'gap-2 px-2.5' : 'gap-2.5 px-3.5'}`}>
          <StockLogo address={source?.address} meta={source} size={narrow ? 'h-6 w-6' : 'h-8 w-8'} text="text-[8px]" />
          <div className="min-w-0 flex-1">
            <div className="truncate font-display text-sm font-medium tracking-tight text-ink">{source?.name || `$${sym}`}</div>
            {devWallet?.address && <div className="truncate font-mono text-[10px] text-mut">{narrow ? '' : 'dev wallet '}{short(devWallet.address)}</div>}
          </div>
        </div>
        <div className={`mt-3 flex items-end justify-between gap-2 pb-3 ${narrow ? 'px-2.5' : 'px-3.5'}`}>
          <div className="min-w-0">
            <div className="label truncate !text-[9px]">In the wallet</div>
            <div className="figure mt-1 text-2xl font-medium leading-none tracking-tight text-hood-500">{devWallet && devWallet.totalUsd != null ? usd(devWallet.totalUsd) : '…'}</div>
          </div>
          {schedule && !countdown && !narrow && <div className="text-right"><div className="label !text-[9px]">Goes out</div><div className="mt-1 font-mono text-[10px] text-ink">{schedule.toLowerCase()}</div></div>}
        </div>
        {countdown && (
          <div className={`flex items-end justify-between gap-3 border-t border-line py-2.5 ${narrow ? 'px-2.5' : 'px-3.5'}`}>
            <div>
              <div className={`label flex items-center gap-1.5 whitespace-nowrap !text-[9px] ${paused ? '' : 'text-hood-600'}`}><span className={`h-1 w-1 rounded-full ${paused ? 'bg-mut' : 'bg-hood-500'}`} />{paused ? 'Paused' : narrow ? 'Next cycle' : 'Next cycle in'}</div>
              <div className="figure mt-1 text-2xl font-medium leading-none tracking-tight text-ink">{paused ? '--:--' : <Countdown intervalMinutes={countdown.intervalMinutes} scheduleKind={countdown.scheduleKind} />}</div>
            </div>
            {schedule && !narrow && <div className="min-w-0 text-right font-mono text-[10px] leading-tight text-mut">{schedule.toLowerCase()}</div>}
          </div>
        )}
      </div>

      {/* legs */}
      {legs.map((l, i) => {
        const k = KIND[l.kind] || KIND.wallet;
        const Icon = k.icon;
        const page = l.kind === 'page' && l.page ? l.page : null;
        const dest = l.dest || (l.kind === 'holders' ? `every $${sym} holder` : l.kind === 'burn' ? `buys $${sym}, burns it` : l.kind === 'lottery' ? 'one holder wins, every 24h' : page ? `${l.label && l.label !== pageName(page.platform, page.handle) ? `${pageName(page.platform, page.handle)} · ` : ''}${page.claimed ? 'paid to its owner' : 'held in its vault'}` : l.address ? short(l.address) : 'address not set');
        const chip = l.chip || (l.kind === 'burn' ? `buys back $${sym}` : l.assetSymbol ? `in ${l.assetSymbol}` : 'in kind');
        const paidIn = l.kind === 'burn' ? source?.address : assetAddress(l);
        return (
          <div key={i} className={`frame absolute flex flex-col shadow-soft ${marks} ${l.featured ? 'border-pink-600' : ''}`} style={{ '--k': k.color, left: legX, top: 6 + i * (LEG_H + LEG_GAP), width: legW, height: LEG_H }}>
            <div className={`flex min-h-0 flex-1 items-start gap-2 pt-2.5 ${narrow ? 'px-2.5' : 'px-3'}`}>
              {page ? <PageAvatar page={page} size={narrow ? 'h-6 w-6' : 'h-7 w-7'} badge={narrow ? 'h-3 w-3' : 'h-3.5 w-3.5'} /> : <Icon className={`shrink-0 ${narrow ? 'h-5 w-5' : 'h-6 w-6'}`} style={{ color: k.color }} />}
              <div className="min-w-0 flex-1">
                <div className={`label truncate !text-[9px] ${k.text}`}>{page ? PLATFORMS[page.platform]?.label || page.platform : k.label}</div>
                <div className="truncate font-display text-sm font-medium leading-tight tracking-tight text-ink">{l.label || k.label}</div>
                <div className="truncate font-mono text-[10px] text-mut">{dest}</div>
              </div>
              <div className={`figure font-medium leading-none tracking-tight text-ink ${narrow ? 'text-base' : 'text-[22px]'}`}>{pct(l.shareBps)}<span className="ml-px text-xs text-mut">%</span></div>
            </div>
            <div className="h-px shrink-0 bg-line"><div className="h-[2px] -translate-y-px" style={{ width: `${Math.min(100, l.shareBps / 100)}%`, background: k.color }} /></div>
            <div className="flex shrink-0 items-center gap-1.5 px-3 py-1.5 font-mono text-[10px] text-mut">
              {paidIn ? <StockLogo address={paidIn} meta={l.kind === 'burn' ? source : { symbol: l.assetSymbol }} size="h-3.5 w-3.5" text="text-[5px]" /> : <InKind className="h-3.5 w-3.5 shrink-0" />}
              <span className="truncate">{chip}</span>
            </div>
          </div>
        );
      })}
    </div>
    </div>
  );
}
