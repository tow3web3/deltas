'use client';

// A coin's routing, drawn as light. One beam leaves the dev wallet, splits into
// channels as thick as the share of every cycle they carry, and ends on glass
// chips with the real logos of where it goes. Read only: the coin page, the
// homepage and the lottery show it; the dashboard is where it is drawn.
import { useEffect, useRef, useState } from 'react';
import { motion } from 'motion/react';
import StockLogo from './StockLogo';
import Countdown from './Countdown';
import { PlatformIcon, Wallet, Vault, Vote } from './Icons';
import { Flow, FlowChip, EASE } from './ui/Light';
import { pageName, pagePath, PLATFORMS } from '../lib/pages';
import { getStock, ZERO, EVM_ADDR } from '../lib/stocks';
import { getXStock } from '../lib/xstocks';
import { CHAINS, chainOf, explorerAddressFor } from '../lib/chains';

/* ---------------- the chain's own currency, and any asset's logo ---------------- */

export const SOL_MINT = 'So11111111111111111111111111111111111111112';
/** True for the chain's own currency, however it is written: no address, the zero address, the SOL mint, or its symbol. */
export const isNativeAsset = (a) => !a || a === 'SOL' || a === 'ETH' || a === SOL_MINT || String(a).toLowerCase() === ZERO;

/** The logo of the chain's own currency: SOL on Solana, ETH on Robinhood Chain. */
export function NativeLogo({ native = 'SOL', className = 'h-5 w-5' }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={native === 'ETH' ? '/eth.svg' : '/sol.png'} alt={native} className={`shrink-0 rounded-full object-cover ${className}`} />
  );
}

/**
 * The logo of anything a coin pays or holds: the chain's currency, an xStock, a
 * Robinhood stock token, or any token. `meta.symbol` alone is enough for the
 * first three; `native` says which currency a bare "in kind" means.
 */
export function AssetLogo({ address = null, meta = null, native = 'SOL', size = 'h-5 w-5', text = 'text-[6px]' }) {
  const sym = meta?.symbol ? String(meta.symbol).replace(/^\$/, '') : null;
  if (sym === 'SOL' || sym === 'ETH') return <NativeLogo native={sym} className={size} />;
  if (isNativeAsset(address) && !sym) return <NativeLogo native={native} className={size} />;
  const bare = isNativeAsset(address) ? null : address;
  const stock = getStock(bare) || (!bare && sym ? getStock(sym) : null);
  if (stock) return <StockLogo address={stock.address} size={size} text={text} />;
  const xs = (!EVM_ADDR.test(String(bare || '')) && getXStock(bare)) || (sym && /^[A-Z.]+x$/.test(sym) ? getXStock(sym) : null);
  if (xs) return <StockLogo address={bare || xs.mint} meta={{ symbol: xs.symbol, image: getStock(xs.ticker)?.logo || xs.logo }} size={size} text={text} />;
  if (bare) return <StockLogo address={bare} meta={meta} size={size} text={text} />;
  return <span className={`stock-logo ${size} ${text} font-mono font-bold text-white`} style={{ background: '#2FA8FF', borderColor: '#2FA8FF' }}>{(sym || '?').slice(0, 4)}</span>;
}

/* ---------------- the legs ---------------- */

const short = (a) => (a && a.length > 10 ? `${a.slice(0, 4)}…${a.slice(-4)}` : a || '');
const pct = (bps) => (bps / 100).toFixed(bps % 100 ? 1 : 0);
const usd = (n) => `$${Number(n || 0).toLocaleString('en-US', { maximumFractionDigits: n >= 100 ? 0 : 2 })}`;
const coins = (n) => {
  const v = Number(n) || 0;
  if (v >= 1000) return v.toLocaleString('en-US', { maximumFractionDigits: 0 });
  return v.toFixed(v >= 1 ? 2 : 4);
};

/** Legs from the API, or the legacy four-way split when the canvas was never used. */
export function legsFrom({ legs, split }) {
  if (Array.isArray(legs) && legs.length) return legs;
  const out = [];
  const s = split || { holders: 10000 };
  if (s.holders > 0) out.push({ kind: 'holders', shareBps: s.holders, label: 'Holders', assetSymbol: null });
  if (s.creator > 0) out.push({ kind: 'wallet', shareBps: s.creator, label: 'Creator', assetSymbol: null });
  if (s.burn > 0) out.push({ kind: 'burn', shareBps: s.burn, label: 'Buyback and burn', assetSymbol: null });
  if (s.treasury > 0) out.push({ kind: 'treasury', shareBps: s.treasury, label: 'Treasury', assetSymbol: null });
  return out;
}

const dot = (color) => <span className="block h-2.5 w-2.5 rounded-full" style={{ background: color, boxShadow: `0 0 12px ${color}` }} />;

/** What sits at the end of a leg's channel: its logo, its name, a line on where it goes, its share. */
function chipOf(l, { source, sym, native }) {
  const page = l.kind === 'page' && l.page ? l.page : null;
  const paidIn = l.asset || l.assetSymbol ? <AssetLogo address={l.asset} meta={{ symbol: l.assetSymbol }} native={native} size="h-5 w-5" text="text-[6px]" /> : null;
  let icon; let label; let sub; let href = null;
  if (page) {
    icon = <PlatformIcon platform={page.platform} className="h-5 w-5" />;
    label = pageName(page.platform, page.handle);
    sub = `${PLATFORMS[page.platform]?.label || page.platform} · ${page.claimed ? 'paid to its owner' : 'its own vault'}`;
    href = page.path || pagePath(page.platform, page.handle, page.slug);
  } else if (l.kind === 'page') {
    icon = <PlatformIcon platform="domain" className="h-5 w-5" />;
    label = l.label || 'A page';
    sub = 'its own vault';
  } else if (l.kind === 'holders') {
    icon = paidIn || dot('#5FE3FF');
    label = l.label || 'Holders';
    sub = `every $${sym} holder, ${l.assetSymbol ? `in ${l.assetSymbol}` : 'in kind'}`;
  } else if (l.kind === 'burn') {
    icon = <span className="rounded-full shadow-[0_0_12px_#FF7A1A]"><StockLogo address={source?.address} meta={source} size="h-5 w-5" text="text-[6px]" /></span>;
    label = l.label || 'Buyback and burn';
    sub = `buys $${sym}, burns it`;
  } else if (l.kind === 'treasury') {
    icon = paidIn || <Vault className="h-5 w-5 text-hood-600" />;
    label = l.label || 'Treasury';
    sub = l.assetSymbol ? `holds ${l.assetSymbol}` : l.address ? short(l.address) : 'address not set';
  } else if (l.kind === 'lottery') {
    icon = <Vote className="h-5 w-5 text-pink-600" />;
    label = l.label || 'Lottery';
    sub = 'one holder wins, every 24h';
  } else {
    icon = <Wallet className="h-5 w-5 text-ink" />;
    label = l.label || 'Wallet';
    sub = [l.address ? short(l.address) : 'address not set', l.assetSymbol ? `in ${l.assetSymbol}` : null].filter(Boolean).join(' · ');
  }
  if (l.dest) sub = l.dest;
  const chip = <FlowChip icon={icon} label={label} sub={sub} share={pct(Number(l.shareBps) || 0)} href={href} />;
  return l.featured ? <div className="rounded-2xl shadow-[0_0_0_1px_rgba(255,125,180,0.55),0_0_28px_rgba(255,125,180,0.22)]">{chip}</div> : chip;
}

/* ---------------- the light ---------------- */

// A FlowChip is about 58px tall; the chips sit 10px apart. The flow is drawn at
// the measured width, one unit to the pixel, so the chips land on their channels.
const CHIP_H = 58;
const CHIP_GAP = 10;

/** One leg only: the beam goes straight to it. */
function Single({ channel, paused }) {
  return (
    <div className={`relative flex w-full items-center gap-3 ${paused ? 'opacity-50 saturate-50' : ''}`} style={{ height: 112 }}>
      <div className="relative h-full flex-1">
        <span aria-hidden="true" className="beam absolute top-1/2 h-3 -translate-y-1/2 rounded-full opacity-30 blur-[2px]" style={{ left: -56, right: 0 }} />
        <span aria-hidden="true" className="beam absolute top-1/2 h-[5px] -translate-y-1/2 rounded-full shadow-[0_0_18px_rgba(95,227,255,0.6)]" style={{ left: -56, right: 0 }} />
        {!paused && (
          <motion.span
            aria-hidden="true"
            className="absolute top-1/2 -mt-[5px] h-2.5 w-2.5 rounded-full bg-white shadow-[0_0_12px_#fff]"
            initial={{ left: '0%' }} animate={{ left: '100%' }}
            transition={{ duration: 2.6, repeat: Infinity, ease: [0.4, 0, 0.2, 1] }}
          />
        )}
      </div>
      <motion.div initial={{ opacity: 0, x: 14 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3, duration: 0.7, ease: EASE }} className="w-[min(270px,64%)] shrink-0">
        {channel.node}
      </motion.div>
    </div>
  );
}

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

  // The chain's own currency: from the dev wallet when the API names it, else from the shape of the coin's address.
  const chain = devWallet?.native === 'ETH' ? 'robinhood' : devWallet?.native === 'SOL' ? 'solana' : chainOf(source?.address) || 'solana';
  const native = devWallet?.native || CHAINS[chain].native;
  const sym = source?.symbol || 'TOKEN';
  const paused = countdown?.active === false;

  const n = legs.length;
  const W = Math.round(w);
  const H = Math.max(180, Math.round(n * CHIP_H + (n - 1) * CHIP_GAP + 0.04 * W));
  // The chips keep about 290px whatever the width; the channels take the rest.
  const at = Math.min(0.68, Math.max(0.34, 1 - 290 / Math.max(W, 1)));
  const channels = legs.map((l, i) => ({ key: `${i}-${l.kind}`, share: Math.max(0.5, (Number(l.shareBps) || 0) / 100), node: chipOf(l, { source, sym, native }) }));
  const hasAmount = devWallet?.eth != null;

  return (
    <div className={`frame flex flex-col overflow-hidden p-4 sm:p-6 ${className}`}>
      <div className="flex items-center justify-between gap-3">
        <span className="label truncate">Routing · ${sym}</span>
        {paused ? (
          <span className="label flex shrink-0 items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-mut" />paused</span>
        ) : (
          <span className="label flex shrink-0 items-center gap-2 !text-cyan-500"><span className="h-1.5 w-1.5 animate-pulse rounded-full bg-cyan-500 shadow-[0_0_10px_#5FE3FF]" />live</span>
        )}
      </div>

      <div ref={wrap} className="my-5 flex flex-1 items-center">
        {W <= 0 ? (
          <div className="w-full" style={{ height: n <= 1 ? 112 : n * (CHIP_H + CHIP_GAP) + 20 }} />
        ) : n === 0 ? (
          <div className="flex h-28 w-full items-center justify-center rounded-2xl border border-dashed border-white/10 text-sm text-mut">No route drawn yet</div>
        ) : n === 1 ? (
          <Single channel={channels[0]} paused={paused} />
        ) : (
          <div className={`relative w-full ${paused ? 'opacity-50 saturate-50' : ''}`}>
            <Flow channels={channels} width={W} height={H} split={at} beamLabel={W >= 560 ? 'DEV WALLET' : null} className="w-full" />
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4 border-t border-white/10 pt-4">
        <div className="min-w-0">
          <div className="label">In the dev wallet</div>
          <div className="figure mt-1.5 flex items-center gap-2 text-3xl font-medium leading-none text-ink">
            {hasAmount ? (
              <><NativeLogo native={native} className="h-6 w-6" />{coins(devWallet.eth)}<span className="text-base text-mut">{native}</span></>
            ) : devWallet?.totalUsd != null ? usd(devWallet.totalUsd) : <span className="text-mut">…</span>}
          </div>
          {devWallet?.address && (
            <div className="mt-2 truncate font-mono text-[11px] text-dim">
              <a href={explorerAddressFor(chain, devWallet.address)} target="_blank" rel="noopener noreferrer" className="transition-colors hover:text-ink">{short(devWallet.address)}</a>
              {hasAmount && devWallet.totalUsd != null ? ` · ${usd(devWallet.totalUsd)} in all` : ''}
            </div>
          )}
        </div>
        {countdown ? (
          <div className="text-right">
            <div className="label">{paused ? 'Paused' : 'Next cycle'}</div>
            <div className="figure mt-1.5 font-mono text-3xl font-medium leading-none text-ink">
              {paused ? '--:--' : <Countdown intervalMinutes={countdown.intervalMinutes} scheduleKind={countdown.scheduleKind} />}
            </div>
            {schedule && <div className="mt-2 font-mono text-[11px] text-dim">{schedule.toLowerCase()}</div>}
          </div>
        ) : schedule ? (
          <div className="text-right">
            <div className="label">Goes out</div>
            <div className="mt-1.5 text-sm text-ink">{schedule.toLowerCase()}</div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
