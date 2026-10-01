'use client';

// The research card for a token: image, price, 24h change, sparkline, and the
// pool stats that matter before routing fees into it.
import { useMemo } from 'react';
import { Area, AreaChart, ResponsiveContainer, Tooltip, YAxis } from 'recharts';
import StockLogo from '../StockLogo';
import { Rise, Fall, External } from '../Icons';
import { explorerAddress, explorerToken, SOL_MINT } from '../../lib/stocks';
import { isSolAddress, dexScreenerFor } from '../../lib/chains';

const fmtPrice = (p) => (p == null ? '—' : p >= 1000 ? `$${p.toLocaleString('en-US', { maximumFractionDigits: 0 })}` : p >= 1 ? `$${p.toFixed(2)}` : p >= 0.01 ? `$${p.toFixed(4)}` : `$${p.toPrecision(3)}`);
const fmtBig = (n) => (n == null ? '—' : n >= 1e9 ? `$${(n / 1e9).toFixed(2)}B` : n >= 1e6 ? `$${(n / 1e6).toFixed(2)}M` : n >= 1e3 ? `$${(n / 1e3).toFixed(1)}k` : `$${Number(n).toFixed(0)}`);
const pct = (v) => (v == null || !Number.isFinite(Number(v)) ? null : Number(v));

function Change({ v, className = '' }) {
  const n = pct(v);
  if (n == null) return <span className={`text-mut ${className}`}>—</span>;
  const up = n >= 0;
  const Mark = up ? Rise : Fall;
  return <span className={`inline-flex items-center gap-0.5 font-mono tabular-nums ${up ? 'text-cyan-500' : 'text-down'} ${className}`}><Mark className="h-2.5 w-2.5" />{Math.abs(n).toFixed(2)}%</span>;
}

/** The price line: drawn in the beam when it rises, in the warning colour when it falls. */
function Spark({ data, up, height = 96, id }) {
  const color = up ? '#5FE3FF' : '#FF5C33';
  const fill = up ? '#2FA8FF' : '#FF5C33';
  const [min, max] = useMemo(() => { const ps = data.map((d) => d.p); return [Math.min(...ps), Math.max(...ps)]; }, [data]);
  const pad = (max - min) * 0.15 || max * 0.02 || 1;
  return (
    <div style={{ height }} className="w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 6, right: 0, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id={`spark-${id}`} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={fill} stopOpacity={0.32} /><stop offset="100%" stopColor={fill} stopOpacity={0} /></linearGradient>
            <linearGradient id={`spark-line-${id}`} gradientUnits="userSpaceOnUse" x1="0%" y1="0" x2="100%" y2="0"><stop offset="0%" stopColor="#2FA8FF" /><stop offset="50%" stopColor="#5FE3FF" /><stop offset="100%" stopColor="#7B5CFF" /></linearGradient>
          </defs>
          <YAxis hide domain={[min - pad, max + pad]} />
          <Tooltip cursor={{ stroke: color, strokeOpacity: 0.4 }} content={({ active, payload }) => (active && payload?.length ? <div className="rounded-xl border border-white/10 bg-[rgba(9,12,19,0.92)] px-2.5 py-1.5 text-[11px] shadow-soft backdrop-blur-md"><div className="figure font-medium text-ink">{fmtPrice(payload[0].payload.p)}</div><div className="text-mut">{new Date(payload[0].payload.t).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</div></div> : null)} />
          <Area type="monotone" dataKey="p" stroke={up ? `url(#spark-line-${id})` : color} strokeWidth={2} fill={`url(#spark-${id})`} isAnimationActive animationDuration={700} dot={false} activeDot={{ r: 3, fill: color, stroke: '#05070C', strokeWidth: 2 }} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

/** Four-chip fallback when no candle history exists yet: 5m, 1h, 6h, 24h moves. */
function ChangeBars({ change }) {
  const rows = [['5m', change?.m5], ['1h', change?.h1], ['6h', change?.h6], ['24h', change?.h24]];
  return (
    <div className="grid grid-cols-4 gap-1.5">
      {rows.map(([k, v]) => <div key={k} className="flex items-baseline justify-between gap-1 rounded-xl border border-white/[0.06] bg-white/[0.03] px-2 py-1.5"><span className="label !text-[9px]">{k}</span><Change v={v} className="text-[11px]" /></div>)}
    </div>
  );
}

const shortMint = (a) => `${String(a).slice(0, 4)}…${String(a).slice(-4)}`;

/**
 * A Solana mint as Jupiter answers for it (no research card): what kind of token it is,
 * its market cap, its pump.fun state and, when a wallet was given, whether that wallet created it.
 */
function SolanaTokenCard({ token, compact, action }) {
  const pump = token.pump?.isPump ? token.pump : null;
  const native = token.isNative || token.address === SOL_MINT;
  const kindLabel = native ? 'Native coin' : token.isStock ? 'xStock' : pump ? 'pump.fun coin' : 'Token';
  const note = native ? 'SOL is paid as it is, no swap'
    : token.isStock ? 'xStock by Backed Finance · bought on Jupiter'
      : pump ? `pump.fun · ${pump.complete ? 'graduated to PumpSwap' : 'on the bonding curve'}`
        : 'Bought on Jupiter';
  return (
    <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03]">
      <div className={`flex items-center gap-3 ${compact ? 'p-3' : 'p-4'}`}>
        <StockLogo address={token.address} meta={{ symbol: token.symbol, image: token.image }} size={compact ? 'h-9 w-9' : 'h-11 w-11'} text="text-[10px]" />
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-2"><span className="truncate font-display text-[15px] font-medium tracking-[-0.02em] text-ink">{token.name}</span><span className="font-mono text-[11px] text-mut">${token.symbol}</span></div>
          <div className="mt-0.5 flex flex-wrap items-center gap-x-2.5 gap-y-0.5">
            <span className="label flex items-center gap-1 !text-[9px]"><span className={`h-1 w-1 rounded-full ${token.isStock ? 'bg-cyan-500 shadow-[0_0_6px_#5FE3FF]' : native ? 'bg-ink' : 'bg-hood-500'}`} />{kindLabel}</span>
            <a href={explorerToken(token.address)} target="_blank" rel="noopener noreferrer" title="Open in Solscan" className="inline-flex items-center gap-0.5 font-mono text-[10px] text-mut hover:text-ink">{shortMint(token.address)}<External className="h-2.5 w-2.5" /></a>
          </div>
        </div>
        <div className="text-right">
          <div className={`figure font-medium leading-none tracking-[-0.02em] text-ink ${compact ? 'text-lg' : 'text-2xl'}`}>{fmtBig(token.marketCap)}</div>
          <div className="label mt-1 !text-[9px]">market cap</div>
        </div>
      </div>
      {token.isCreator != null && pump && (
        <div className={`border-t border-white/[0.07] px-3 py-2 text-[11px] leading-snug ${token.isCreator ? 'text-cyan-500' : 'text-gold-400'}`}>
          {token.isCreator ? 'This wallet created the coin on pump.fun: its creator fees can be routed.' : `Created by ${pump.creator ? shortMint(pump.creator) : 'another wallet'}: pump.fun pays its creator fees to that wallet.`}
        </div>
      )}
      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-white/[0.07] px-3 py-2 text-[11px] text-mut">
        <span>{note}</span>
        <span className="flex shrink-0 items-center gap-2.5 whitespace-nowrap">
          {!native && <a href={dexScreenerFor('solana', token.address)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-0.5 font-medium hover:text-ink">DexScreener<External className="h-2.5 w-2.5" /></a>}
          {action && <button type="button" onClick={action.onClick} className="btn-primary whitespace-nowrap !gap-1 !px-3 !py-1 !text-[11px]">{action.label}</button>}
        </span>
      </div>
    </div>
  );
}

/**
 * props: token = the /api/app/token payload; compact = tighter layout for inspectors;
 * action = optional { label, onClick } button.
 */
export default function TokenCard({ token, compact = false, action = null }) {
  const solana = token.chain === 'solana' || isSolAddress(token.address);
  // A Solana mint comes back without the research card: show what is known, nothing made up.
  if (solana && !token.research) return <SolanaTokenCard token={token} compact={compact} action={action} />;
  const r = token.research || {};
  const chart = Array.isArray(r.chart) && r.chart.length > 2 ? r.chart : null;
  const trendUp = chart ? chart[chart.length - 1].p >= chart[0].p : (pct(r.change24) ?? 0) >= 0;
  const kindLabel = token.isNative ? (solana ? 'Native coin' : 'Native gas token') : token.isStock ? (solana ? 'xStock' : 'Stock token') : 'Token';
  const id = token.address.slice(2, 10);
  return (
    <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03]">
      <div className={`flex items-center gap-3 ${compact ? 'p-3' : 'p-4'}`}>
        <StockLogo address={token.address} meta={{ symbol: token.symbol, image: token.image }} size={compact ? 'h-9 w-9' : 'h-11 w-11'} text="text-[10px]" />
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-2"><span className="truncate font-display text-[15px] font-medium tracking-[-0.02em] text-ink">{token.name}</span><span className="font-mono text-[11px] text-mut">${token.symbol}</span></div>
          <div className="mt-0.5 flex flex-wrap items-center gap-x-2.5 gap-y-0.5">
            <span className="label flex items-center gap-1 !text-[9px]"><span className={`h-1 w-1 rounded-full ${token.isStock ? 'bg-cyan-500 shadow-[0_0_6px_#5FE3FF]' : token.isNative ? 'bg-ink' : 'bg-hood-500'}`} />{kindLabel}</span>
            <a href={solana ? explorerToken(token.address) : explorerAddress(token.address)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-0.5 font-mono text-[10px] text-mut hover:text-ink">{token.address.slice(0, 6)}…{token.address.slice(-4)}<External className="h-2.5 w-2.5" /></a>
          </div>
        </div>
        <div className="text-right">
          <div className={`figure font-medium leading-none tracking-[-0.02em] text-ink ${compact ? 'text-lg' : 'text-2xl'}`}>{fmtPrice(r.priceUsd)}</div>
          <Change v={r.change24} className="mt-1 text-[11px]" />
        </div>
      </div>
      <div className={compact ? 'px-3' : 'px-4'}>
        {chart ? <Spark data={chart} up={trendUp} height={compact ? 72 : 110} id={id} /> : <div className="pb-3"><ChangeBars change={r.change} /></div>}
      </div>
      <div className="grid grid-cols-3 divide-x divide-white/[0.07] border-t border-white/[0.07]">
        {[['Liquidity', fmtBig(r.liquidityUsd)], ['24h volume', fmtBig(r.volume24)], [token.isStock ? 'On-chain mcap' : 'Market cap', fmtBig(r.marketCap)]].map(([k, v]) => (
          <div key={k} className="px-3 py-2"><div className="label !text-[9px]">{k}</div><div className={`figure mt-0.5 text-ink ${compact ? 'text-[13px]' : 'text-sm'}`}>{v}</div></div>
        ))}
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-white/[0.07] px-3 py-2 text-[11px] text-mut">
        <span>{r.pairs ? `${r.pairs} pool${r.pairs > 1 ? 's' : ''}${r.dex ? ` · ${r.dex}` : ''}${r.quote ? ` · vs ${r.quote}` : ''}` : token.isStock && !solana ? 'Priced from Yahoo Finance' : solana ? 'No pool found yet: a share routed here is paid in SOL until one fills' : 'No pool found yet: fees routed here would pay in kind'}{chart ? ` · ${r.chartSource === 'yahoo' ? '5 days, hourly' : '72 hours, hourly'}` : ''}</span>
        <span className="flex shrink-0 items-center gap-2.5 whitespace-nowrap">
          {r.dexUrl && <a href={r.dexUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-0.5 font-medium hover:text-ink">DexScreener<External className="h-2.5 w-2.5" /></a>}
          {action && <button type="button" onClick={action.onClick} className="btn-primary whitespace-nowrap !gap-1 !px-3 !py-1 !text-[11px]">{action.label}</button>}
        </span>
      </div>
    </div>
  );
}
