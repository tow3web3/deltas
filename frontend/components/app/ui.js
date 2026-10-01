'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import StockLogo from '../StockLogo';
import TokenCard from './TokenCard';
import { Bell, CaretDown, Chart, Check, Coins, OpeningBell, Timer, Warning } from '../Icons';
import { STOCKS, LIQUID_TICKERS, getStock, SOL_MINT } from '../../lib/stocks';
import { XSTOCKS, FEATURED_XSTOCKS, XSTOCKS_TOTAL, getXStock } from '../../lib/xstocks';
import { isEvmAddress, isSolAddress } from '../../lib/chains';

// The beam, running down instead of across: the lit edge of a toast.
const BEAM_DOWN = 'linear-gradient(180deg, #2FA8FF 0%, #5FE3FF 50%, #7B5CFF 100%)';
// The selected option of a segmented control: a lit glass pill.
const segOn = 'bg-white/[0.09] text-ink shadow-[inset_0_0_0_1px_rgba(95,227,255,0.35),0_0_18px_-6px_rgba(47,168,255,0.55)]';
const segOff = 'text-mut hover:bg-white/[0.04] hover:text-ink';

// ---------- toasts ----------
const ToastCtx = createContext(() => {});
export function ToastProvider({ children }) {
  const [items, setItems] = useState([]);
  const push = useCallback((text, kind = 'ok') => {
    const id = Math.random().toString(36).slice(2);
    setItems((s) => [...s, { id, text, kind }]);
    setTimeout(() => setItems((s) => s.filter((t) => t.id !== id)), 4200);
  }, []);
  return (
    <ToastCtx.Provider value={push}>
      {children}
      <div className="pointer-events-none fixed bottom-5 left-1/2 z-[70] flex w-[min(92vw,440px)] -translate-x-1/2 flex-col gap-1.5" role="status" aria-live="polite">
        {items.map((t) => {
          const tone = t.kind === 'ok' ? { edge: BEAM_DOWN, glow: 'rgba(47,168,255,0.75)', icon: 'text-cyan-500', word: 'Done' } : t.kind === 'warn' ? { edge: '#F6C343', glow: 'rgba(246,195,67,0.6)', icon: 'text-gold-400', word: 'Note' } : { edge: '#FF5C33', glow: 'rgba(255,92,51,0.6)', icon: 'text-down', word: 'Error' };
          const Icon = t.kind === 'ok' ? Check : Warning;
          return (
            <div key={t.id} className="panel animate-feedin flex items-start gap-3 overflow-hidden bg-[rgba(9,12,19,0.9)] py-3 pl-4 pr-4 shadow-soft">
              <span className="absolute inset-y-2.5 left-0 w-[2px] rounded-full" style={{ background: tone.edge, boxShadow: `0 0 10px ${tone.glow}` }} />
              <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${tone.icon}`} />
              <span className="min-w-0 flex-1 text-[13px] leading-snug text-ink">{t.text}</span>
              <span className="label mt-0.5 shrink-0">{tone.word}</span>
            </div>
          );
        })}
      </div>
    </ToastCtx.Provider>
  );
}
export const useToast = () => useContext(ToastCtx);

// ---------- primitives ----------
// The ring every control shows when it is reached with the keyboard.
export const focusCls = 'outline-none focus-visible:ring-1 focus-visible:ring-cyan-500/70 focus-visible:ring-offset-2 focus-visible:ring-offset-ground';

export function Card({ title, eyebrow, aside, children, className = '', tone = 'paper' }) {
  // Glass for every card: the one that leads carries the lit edge.
  const lead = tone === 'ink' || tone === 'glow' || tone === 'gold';
  return (
    <section className={`${lead ? 'frame' : 'panel'} min-w-0 ${className}`}>
      {(title || aside || eyebrow) && (
        <div className="flex items-center justify-between gap-3 border-b border-white/10 px-5 py-3.5">
          <div className="min-w-0">
            {eyebrow && <div className={`label ${lead ? 'text-cyan-500' : ''}`}>{eyebrow}</div>}
            {title && <h3 className="mt-1 truncate font-display text-base font-medium tracking-[-0.02em] text-ink">{title}</h3>}
          </div>
          {aside}
        </div>
      )}
      <div className="p-5">{children}</div>
    </section>
  );
}

/** Segmented control. An option may carry `icon` (a component from Icons.js). */
export function Seg({ options, value, onChange, size = 'md' }) {
  return (
    <div role="radiogroup" className="inline-flex max-w-full flex-wrap gap-1 rounded-2xl border border-white/10 bg-white/[0.03] p-1">
      {options.map((o) => {
        const on = value === o.value;
        const Icon = o.icon;
        return (
          <button key={o.value} type="button" role="radio" aria-checked={on} onClick={() => onChange(o.value)} title={o.title}
            className={`relative inline-flex flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-xl px-3 ${size === 'sm' ? 'py-1.5 text-xs' : 'py-2 text-[13px]'} font-medium outline-none transition-colors focus-visible:ring-1 focus-visible:ring-cyan-500/70 ${on ? segOn : segOff}`}>
            {Icon && <Icon className={`h-3.5 w-3.5 shrink-0 ${on ? 'text-cyan-500' : ''}`} />}
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

export function Toggle({ checked, onChange, label, hint }) {
  return (
    <button type="button" role="switch" aria-checked={checked} onClick={() => onChange(!checked)} className={`group flex w-full items-start justify-between gap-4 rounded-2xl border border-white/10 bg-white/[0.03] px-3.5 py-3 text-left transition-colors hover:border-white/20 hover:bg-white/[0.05] ${focusCls}`}>
      <span className="min-w-0">
        <span className="block text-[13px] font-medium text-ink">{label}</span>
        {hint && <span className="mt-0.5 block text-xs leading-snug text-mut">{hint}</span>}
      </span>
      <span className="flex shrink-0 items-center gap-2 pt-0.5">
        <span className={`font-mono text-[10px] uppercase tracking-[0.14em] ${checked ? 'text-cyan-500' : 'text-dim'}`}>{checked ? 'on' : 'off'}</span>
        <span className={`relative h-5 w-9 rounded-full border transition-all ${checked ? 'beam border-transparent shadow-[0_0_14px_rgba(47,168,255,0.45)]' : 'border-white/10 bg-white/[0.08]'}`}>
          <span className={`absolute top-[2px] h-3.5 w-3.5 rounded-full transition-all ${checked ? 'left-[18px] bg-white shadow-[0_0_8px_rgba(255,255,255,0.6)]' : 'left-[2px] bg-mut'}`} />
        </span>
      </span>
    </button>
  );
}

export function Field({ label, hint, children }) {
  return (
    <label className="block">
      <span className="label mb-1.5 block">{label}</span>
      {children}
      {hint && <span className="mt-1.5 block text-[11px] leading-snug text-mut">{hint}</span>}
    </label>
  );
}

export const inputCls = 'w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 font-mono text-[13px] text-ink outline-none transition-colors placeholder:text-dim hover:border-white/20 focus:border-cyan-500/60 focus:ring-2 focus:ring-hood-500/20';

export function Button({ children, variant = 'primary', busy, className = '', ...rest }) {
  const cls = variant === 'primary' ? 'btn-primary'
    : variant === 'ink' ? 'btn-ink disabled:cursor-not-allowed disabled:opacity-50'
      : variant === 'danger' ? 'inline-flex items-center justify-center gap-2 rounded-full border border-down/40 bg-down/[0.06] px-5 py-2.5 text-sm font-medium text-down transition-colors hover:border-down/70 hover:bg-down/[0.12] disabled:cursor-not-allowed disabled:opacity-50'
        : 'btn-ghost disabled:cursor-not-allowed disabled:opacity-50';
  return (
    <button type="button" disabled={busy || rest.disabled} className={`${cls} ${focusCls} ${busy ? 'opacity-60' : ''} ${className}`} {...rest}>
      {busy ? <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" /> : null}
      {children}
    </button>
  );
}

// The colour names the sliders used to take, as the colours they stood for.
const SLIDER_TONES = { 'accent-hood-500': '#2FA8FF', 'accent-ink': '#F3F5F9', 'accent-orange-500': '#FF7A1A', 'accent-gold-400': '#F6C343' };
// A white bead lit in the colour of the slider (`--tone`, set on the input).
const thumbCls = '[&::-webkit-slider-thumb]:h-3.5 [&::-webkit-slider-thumb]:w-3.5 [&::-webkit-slider-thumb]:cursor-grab [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-ground [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:shadow-[0_0_0_1px_var(--tone),0_0_12px_var(--tone)] [&::-moz-range-thumb]:h-3.5 [&::-moz-range-thumb]:w-3.5 [&::-moz-range-thumb]:cursor-grab [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-ground [&::-moz-range-thumb]:bg-white [&::-moz-range-thumb]:shadow-[0_0_0_1px_var(--tone),0_0_12px_var(--tone)] [&::-moz-range-track]:bg-transparent focus-visible:[&::-webkit-slider-thumb]:bg-cyan-500 focus-visible:[&::-moz-range-thumb]:bg-cyan-500';

/** Slider as a channel of light: the track lit up to the value, a glowing bead, the value in mono. */
export function Slider({ label, value, min = 0, max = 100, step = 1, onChange, format = (v) => `${v}%`, color = '#2FA8FF', icon: Icon }) {
  const tone = SLIDER_TONES[color] || color;
  const at = max > min ? Math.min(100, Math.max(0, ((value - min) / (max - min)) * 100)) : 0;
  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <span className="flex items-center gap-1.5 text-[13px] font-medium text-ink">{Icon && <Icon className="h-3.5 w-3.5 shrink-0 self-center" style={{ color: tone }} />}{label}</span>
        <span className="font-mono text-xs tabular-nums text-ink">{format(value)}</span>
      </div>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} aria-label={typeof label === 'string' ? label : undefined}
        className={`mt-1.5 block h-4 w-full cursor-pointer appearance-none bg-transparent outline-none ${thumbCls}`}
        style={{ '--tone': tone, background: `linear-gradient(90deg, ${tone} ${at}%, rgba(255,255,255,0.1) ${at}%) center / 100% 3px no-repeat` }} />
    </div>
  );
}

/** Stock picker: search over the 195 tickers, plus ETH and a raw address (Robinhood Chain), or the xStocks, SOL and any mint (Solana). */
const customCache = new Map();
// A token the site must look up: a 0x token that is neither a stock nor ETH (stored lowercase),
// or a Solana mint that is neither SOL nor a listed xStock (base58 is case-sensitive: kept as typed).
const customKey = (address) => {
  if (!address) return null;
  if (/^0x[0-9a-fA-F]{40}$/.test(address)) return !getStock(address) && !/^0x0{40}$/i.test(address) ? address.toLowerCase() : null;
  if (isSolAddress(address)) return address !== SOL_MINT && getXStock(address)?.mint !== address ? address : null;
  return null;
};
export function useCustomToken(address) {
  const key = customKey(address);
  const [info, setInfo] = useState(key ? customCache.get(key) || null : null);
  useEffect(() => {
    if (!key) { setInfo(null); return; }
    if (customCache.has(key)) { setInfo(customCache.get(key)); return; }
    let alive = true;
    setInfo({ loading: true });
    fetch(`/api/app/token?address=${key}`).then((r) => r.json()).then((d) => { const v = d.error ? { error: d.error } : d; customCache.set(key, v); if (alive) setInfo(v); }).catch(() => { if (alive) setInfo({ error: 'Lookup failed' }); });
    return () => { alive = false; };
  }, [key]);
  return info;
}

/** Research payload (/api/app/token) for any address, stocks and ETH included, or any Solana mint (SOL and xStocks included). Cached per address. */
const researchCache = new Map();
export function useTokenResearch(address) {
  const key = address && /^0x[0-9a-fA-F]{40}$/.test(address) ? address.toLowerCase() : address === 'ETH' ? '0x0000000000000000000000000000000000000000'
    : address === 'SOL' ? SOL_MINT : isSolAddress(address) ? address : null;
  const [info, setInfo] = useState(key ? researchCache.get(key) || null : null);
  useEffect(() => {
    if (!key) { setInfo(null); return; }
    if (researchCache.has(key)) { setInfo(researchCache.get(key)); return; }
    let alive = true;
    setInfo({ loading: true });
    fetch(`/api/app/token?address=${key}`).then((r) => r.json()).then((d) => { const v = d.error ? { error: d.error } : d; researchCache.set(key, v); if (alive) setInfo(v); }).catch(() => { if (alive) setInfo({ error: 'Lookup failed' }); });
    return () => { alive = false; };
  }, [key]);
  return info;
}

/**
 * The asset picker of the chain the coin lives on. `chain` = 'robinhood' (default: Robinhood Stock
 * Tokens, ETH as 'ETH', 0x tokens) or 'solana' (xStocks, SOL as SOL_MINT, any mint, case kept).
 * `allowEth` allows the chain's native coin (ETH or SOL); `allowAddress` allows any token by address.
 */
export function StockPicker({ chain = 'robinhood', ...props }) {
  return chain === 'solana' ? <SolanaStockPicker {...props} /> : <RobinhoodStockPicker {...props} />;
}

function RobinhoodStockPicker({ value, onChange, allowEth = true, allowAddress = true, compact = false }) {
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState('stocks'); // stocks | custom
  const custom = useCustomToken(value);
  const selected = value ? (value === 'ETH' || /^0x0{40}$/i.test(value) ? { symbol: 'ETH', name: 'Ether', address: '0x0000000000000000000000000000000000000000' } : getStock(value) ? { symbol: getStock(value).ticker, name: getStock(value).name, address: getStock(value).address } : { symbol: custom?.symbol || `${value.slice(0, 6)}…`, name: custom?.name ? `${custom.name} · custom token` : 'Custom token', address: value, image: custom?.image || null }) : null;
  const list = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const base = STOCKS.filter((s) => !needle || s.ticker.toLowerCase().includes(needle) || s.name.toLowerCase().includes(needle));
    return base.sort((a, b) => Number(LIQUID_TICKERS.includes(b.ticker)) - Number(LIQUID_TICKERS.includes(a.ticker))).slice(0, compact ? 8 : 14);
  }, [q, compact]);
  useEffect(() => { if (!open) { setQ(''); setTab('stocks'); } }, [open]);
  const isAddr = /^0x[0-9a-fA-F]{40}$/.test(q.trim());
  useEffect(() => { if (isAddr) setTab('custom'); }, [isAddr]);
  const probe = useTokenResearch(isAddr ? q.trim() : null);

  return (
    <div className="relative">
      <button type="button" aria-expanded={open} onClick={() => setOpen((o) => !o)} className={`flex w-full items-center gap-3 rounded-xl border bg-black/30 px-3 py-2 text-left transition-colors hover:border-white/20 ${open ? 'border-cyan-500/60' : 'border-white/10'} ${focusCls}`}>
        {selected ? <StockLogo address={selected.address} meta={{ symbol: selected.symbol, image: selected.image }} size="h-8 w-8" text="text-[9px]" /> : <span className="h-8 w-8 shrink-0 rounded-full border border-dashed border-white/15" />}
        <span className="min-w-0 flex-1">
          <span className="block font-mono text-[13px] font-medium text-ink">{selected ? selected.symbol : 'Pick a token'}</span>
          <span className="block truncate text-xs text-mut">{selected ? selected.name : 'A stock, ETH, or any token by contract address'}</span>
        </span>
        <CaretDown className={`h-3.5 w-3.5 shrink-0 text-mut transition-transform ${open ? 'rotate-180 text-cyan-500' : ''}`} />
      </button>
      {open && (
        <div className="absolute left-0 right-0 top-full z-20 mt-1.5 min-w-[320px] overflow-hidden rounded-2xl border border-white/10 bg-[rgba(9,12,19,0.96)] shadow-soft backdrop-blur-xl">
          {allowAddress && (
            <div className="grid grid-cols-2 gap-1 border-b border-white/[0.07] p-1.5">
              {[['stocks', Chart, `Stocks${allowEth ? ' and ETH' : ''}`], ['custom', Coins, 'Any token, by address']].map(([k, Icon, text]) => (
                <button key={k} type="button" onClick={() => setTab(k)} className={`flex items-center justify-center gap-1.5 rounded-xl px-2 py-1.5 text-xs font-medium transition-colors ${tab === k ? segOn : segOff}`}>
                  <Icon className={`h-3.5 w-3.5 ${tab === k ? 'text-cyan-500' : ''}`} />{text}
                </button>
              ))}
            </div>
          )}
          {tab === 'custom' ? (
            <div className="p-3">
              <p className="mb-2 text-xs text-mut">Any token by its contract address: a memecoin, a partner token, your own coin.</p>
              <input autoFocus value={q} onChange={(e) => setQ(e.target.value.trim())} placeholder="0x… contract address" className={inputCls} />
              {isAddr ? (
                <div className="mt-2">
                  {probe?.loading || !probe ? <div className="flex items-center gap-2 px-2 py-3 text-xs text-mut"><span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/10 border-t-cyan-500" /> Looking up {q.trim().slice(0, 10)}… on chain, DexScreener and GeckoTerminal</div>
                    : probe.error ? <div className="px-2 py-3 text-xs text-down">{probe.error}</div>
                    : <TokenCard token={probe} compact action={{ label: 'Use this token', onClick: () => { onChange(q.trim()); setOpen(false); } }} />}
                </div>
              ) : q ? <p className="mt-2 text-xs text-mut">Keep typing: 42 characters starting with 0x.</p> : null}
            </div>
          ) : (
          <>
          <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder={allowAddress ? 'Search a ticker or a company, or paste an address' : 'Search a ticker or a company'} className="w-full border-b border-white/[0.07] bg-transparent px-3.5 py-2.5 text-[13px] text-ink outline-none placeholder:text-dim focus:border-cyan-500/50" />
          <div className="max-h-[420px] overflow-y-auto p-1.5">
            {allowEth && !q && (
              <button type="button" onClick={() => { onChange('ETH'); setOpen(false); }} className="flex w-full items-center gap-3 rounded-xl px-2.5 py-2 text-left transition-colors hover:bg-white/[0.05]">
                <StockLogo address="0x0000000000000000000000000000000000000000" size="h-6 w-6" text="text-[7px]" /><span className="w-14 font-mono text-[13px] font-medium text-ink">ETH</span><span className="min-w-0 flex-1 truncate text-xs text-mut">Ether, no conversion</span>
              </button>
            )}
            {list.map((s) => (
              <button key={s.ticker} type="button" onClick={() => { onChange(s.address); setOpen(false); }} className="flex w-full items-center gap-3 rounded-xl px-2.5 py-2 text-left transition-colors hover:bg-white/[0.05]">
                <StockLogo address={s.address} size="h-6 w-6" text="text-[7px]" />
                <span className="w-14 font-mono text-[13px] font-medium text-ink">{s.ticker}</span>
                <span className="min-w-0 flex-1 truncate text-xs text-mut">{s.name}</span>
                {LIQUID_TICKERS.includes(s.ticker) && <span className="label flex items-center gap-1 !text-[9px] text-cyan-500"><span className="h-1 w-1 rounded-full bg-cyan-500 shadow-[0_0_6px_#5FE3FF]" />liquid</span>}
              </button>
            ))}
            {list.length === 0 && !isAddr && <div className="px-4 py-4 text-center text-xs text-mut">No ticker matches. Looking for another token? Use the &quot;Any token&quot; tab.</div>}
          </div>
          </>
          )}
        </div>
      )}
    </div>
  );
}

/** What the Solana picker offers, in a few words. */
const solOffer = (allowSol, allowMint) => (allowSol ? `SOL, an xStock${allowMint ? ', or any token by mint' : ''}` : `An xStock${allowMint ? ', or any token by mint' : ''}`);
// The familiar xStocks first, in the order of the featured list; the rest keep their order.
const xstockRank = (s) => { const i = FEATURED_XSTOCKS.findIndex((f) => f.ticker === s.ticker); return i < 0 ? FEATURED_XSTOCKS.length : i; };

/** The Solana picker: SOL (SOL_MINT), the xStocks (by mint) and any mint Jupiter knows. Every value is a mint, as typed. */
function SolanaStockPicker({ value, onChange, allowEth = true, allowAddress = true, compact = false }) {
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState('stocks'); // stocks | custom
  const custom = useCustomToken(value);
  const xs = value ? getXStock(value) : null;
  const selected = !value ? null
    : value === 'SOL' || value === SOL_MINT ? { symbol: 'SOL', name: 'Solana', address: SOL_MINT }
      : xs ? { symbol: xs.symbol, name: xs.name, address: xs.mint }
        : { symbol: custom?.symbol || `${value.slice(0, 6)}…`, name: custom?.name ? `${custom.name} · custom token` : 'Custom token', address: value, image: custom?.image || null };
  const list = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const base = XSTOCKS.filter((s) => !needle || s.ticker.toLowerCase().includes(needle) || s.symbol.toLowerCase().includes(needle) || s.name.toLowerCase().includes(needle));
    return base.sort((a, b) => xstockRank(a) - xstockRank(b)).slice(0, compact ? 8 : 14);
  }, [q, compact]);
  useEffect(() => { if (!open) { setQ(''); setTab('stocks'); } }, [open]);
  const typed = q.trim();
  const isAddr = isSolAddress(typed);
  const isEvm = isEvmAddress(typed);
  useEffect(() => { if (isAddr && allowAddress) setTab('custom'); }, [isAddr, allowAddress]);
  const probe = useTokenResearch(isAddr && allowAddress ? typed : null);
  const total = XSTOCKS_TOTAL.toLocaleString('en-US');

  return (
    <div className="relative">
      <button type="button" aria-expanded={open} onClick={() => setOpen((o) => !o)} className={`flex w-full items-center gap-3 rounded-xl border bg-black/30 px-3 py-2 text-left transition-colors hover:border-white/20 ${open ? 'border-cyan-500/60' : 'border-white/10'} ${focusCls}`}>
        {selected ? <StockLogo address={selected.address} meta={{ symbol: selected.symbol, image: selected.image }} size="h-8 w-8" text="text-[9px]" /> : <span className="h-8 w-8 shrink-0 rounded-full border border-dashed border-white/15" />}
        <span className="min-w-0 flex-1">
          <span className="block font-mono text-[13px] font-medium text-ink">{selected ? selected.symbol : allowEth || allowAddress ? 'Pick a token' : 'Pick an xStock'}</span>
          <span className="block truncate text-xs text-mut">{selected ? selected.name : solOffer(allowEth, allowAddress)}</span>
        </span>
        <CaretDown className={`h-3.5 w-3.5 shrink-0 text-mut transition-transform ${open ? 'rotate-180 text-cyan-500' : ''}`} />
      </button>
      {open && (
        <div className="absolute left-0 right-0 top-full z-20 mt-1.5 min-w-[320px] overflow-hidden rounded-2xl border border-white/10 bg-[rgba(9,12,19,0.96)] shadow-soft backdrop-blur-xl">
          {allowAddress && (
            <div className="grid grid-cols-2 gap-1 border-b border-white/[0.07] p-1.5">
              {[['stocks', Chart, allowEth ? 'SOL and xStocks' : 'xStocks'], ['custom', Coins, 'Any token, by mint']].map(([k, Icon, text]) => (
                <button key={k} type="button" onClick={() => setTab(k)} className={`flex items-center justify-center gap-1.5 rounded-xl px-2 py-1.5 text-xs font-medium transition-colors ${tab === k ? segOn : segOff}`}>
                  <Icon className={`h-3.5 w-3.5 ${tab === k ? 'text-cyan-500' : ''}`} />{text}
                </button>
              ))}
            </div>
          )}
          {tab === 'custom' && allowAddress ? (
            <div className="p-3">
              <p className="mb-2 text-xs text-mut">Any Solana token by its mint: a memecoin, a partner token, one of the {total} xStocks, your own coin.</p>
              <input autoFocus value={q} onChange={(e) => setQ(e.target.value.trim())} placeholder="Mint address" spellCheck={false} autoCapitalize="off" autoCorrect="off" autoComplete="off" className={inputCls} />
              {isAddr ? (
                <div className="mt-2">
                  {probe?.loading || !probe ? <div className="flex items-center gap-2 px-2 py-3 text-xs text-mut"><span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/10 border-t-cyan-500" /> Looking up {typed.slice(0, 10)}… on Jupiter</div>
                    : probe.error ? <div className="px-2 py-3 text-xs text-down">{probe.error}</div>
                    : <TokenCard token={probe} compact action={{ label: 'Use this token', onClick: () => { onChange(typed); setOpen(false); } }} />}
                </div>
              ) : isEvm ? <p className="mt-2 text-xs text-down">That is a Robinhood Chain address. This coin lives on Solana: paste a Solana mint.</p>
                : q ? <p className="mt-2 text-xs text-mut">Keep typing: a mint is 32 to 44 letters and digits.</p> : null}
            </div>
          ) : (
          <>
          <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder={allowAddress ? 'Search a ticker or a company, or paste a mint' : 'Search a ticker or a company'} spellCheck={false} autoCapitalize="off" autoCorrect="off" autoComplete="off" className="w-full border-b border-white/[0.07] bg-transparent px-3.5 py-2.5 text-[13px] text-ink outline-none placeholder:text-dim focus:border-cyan-500/50" />
          <div className="max-h-[420px] overflow-y-auto p-1.5">
            {allowEth && !q && (
              <button type="button" onClick={() => { onChange(SOL_MINT); setOpen(false); }} className="flex w-full items-center gap-3 rounded-xl px-2.5 py-2 text-left transition-colors hover:bg-white/[0.05]">
                <StockLogo address={SOL_MINT} size="h-6 w-6" text="text-[7px]" /><span className="w-16 font-mono text-[13px] font-medium text-ink">SOL</span><span className="min-w-0 flex-1 truncate text-xs text-mut">Solana, no conversion</span>
              </button>
            )}
            {list.map((s) => (
              <button key={s.mint} type="button" onClick={() => { onChange(s.mint); setOpen(false); }} className="flex w-full items-center gap-3 rounded-xl px-2.5 py-2 text-left transition-colors hover:bg-white/[0.05]">
                <StockLogo address={s.mint} size="h-6 w-6" text="text-[7px]" />
                <span className="w-16 font-mono text-[13px] font-medium text-ink">{s.symbol}</span>
                <span className="min-w-0 flex-1 truncate text-xs text-mut">{s.name}</span>
              </button>
            ))}
            {list.length === 0 && !isAddr && <div className="px-4 py-4 text-center text-xs text-mut">No xStock matches among the {XSTOCKS.length} listed here.{allowAddress ? ' Any of the others, or any token, goes by its mint in the "Any token" tab.' : ''}</div>}
            {list.length === 0 && isAddr && !allowAddress && <div className="px-4 py-4 text-center text-xs text-mut">Pick an xStock from the list.</div>}
          </div>
          {allowAddress && !q && <div className="border-t border-white/[0.07] px-3.5 py-2 text-[11px] leading-snug text-mut">The {XSTOCKS.length} best known of the {total} xStocks Jupiter verifies. Any of them pays: paste its mint in the second tab.</div>}
          </>
          )}
        </div>
      )}
    </div>
  );
}

export const shortAddr = (a) => (a ? `${a.slice(0, 6)}…${a.slice(-4)}` : '');
export const fmtUsd = (n) => `$${(n || 0).toLocaleString('en-US', { maximumFractionDigits: n >= 100 ? 0 : 2 })}`;
export const fmtNum = (n, d = 4) => (n >= 1000 ? n.toLocaleString('en-US', { maximumFractionDigits: 0 }) : Number(n || 0).toFixed(n >= 1 ? 2 : d));
export const units = (raw, dec = 18) => Number(raw || 0) / 10 ** dec;

export const SCHEDULES = [
  { value: 'interval:5', label: '5 min', title: 'Every 5 minutes', icon: Timer }, { value: 'interval:30', label: '30 min', title: 'Every 30 minutes', icon: Timer }, { value: 'interval:60', label: 'Hourly', title: 'Every hour', icon: Timer },
  { value: 'closing_bell', label: 'Closing bell', title: '4:00 pm New York, weekdays', icon: Bell }, { value: 'opening_bell', label: 'Opening bell', title: '9:30 am New York, weekdays', icon: OpeningBell },
];
// Solana: every 1, 2, 5, 10, 30 or 60 minutes, or once a day at the closing bell.
export const SOL_SCHEDULES = [
  { value: 'interval:1', label: '1 min', title: 'Every minute', icon: Timer }, { value: 'interval:2', label: '2 min', title: 'Every 2 minutes', icon: Timer }, { value: 'interval:5', label: '5 min', title: 'Every 5 minutes', icon: Timer },
  { value: 'interval:10', label: '10 min', title: 'Every 10 minutes', icon: Timer }, { value: 'interval:30', label: '30 min', title: 'Every 30 minutes', icon: Timer }, { value: 'interval:60', label: 'Hourly', title: 'Every hour', icon: Timer },
  { value: 'closing_bell', label: 'Closing bell', title: '4:00 pm New York, weekdays', icon: Bell },
];
export const scheduleValue = (c) => (c.schedule_kind === 'interval' ? `interval:${(c.chain === 'solana' ? [1, 2, 5, 10, 30, 60] : [5, 30, 60]).includes(Number(c.interval_minutes)) ? c.interval_minutes : 5}` : c.schedule_kind);
export const parseSchedule = (v) => (v.startsWith('interval:') ? { schedule_kind: 'interval', interval_minutes: Number(v.split(':')[1]) } : { schedule_kind: v, interval_minutes: 1440 });

export const PRESETS = [
  { key: '100-0-0-0', label: '100% holders', holders: 100, creator: 0, burn: 0, treasury: 0 },
  { key: '80-20-0-0', label: '80 / 20 you', holders: 80, creator: 20, burn: 0, treasury: 0 },
  { key: '70-30-0-0', label: '70 / 30 you', holders: 70, creator: 30, burn: 0, treasury: 0 },
  { key: '70-0-0-30', label: '70 + 30 treasury', holders: 70, creator: 0, burn: 0, treasury: 30 },
  { key: '60-20-0-20', label: '60 / 20 / 20', holders: 60, creator: 20, burn: 0, treasury: 20 },
  { key: '50-20-15-15', label: '50 / 20 / 15 / 15', holders: 50, creator: 20, burn: 15, treasury: 15 },
];
