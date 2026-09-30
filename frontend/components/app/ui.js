'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import StockLogo from '../StockLogo';
import TokenCard from './TokenCard';
import { Bell, CaretDown, Chart, Check, Coins, OpeningBell, Timer, Warning } from '../Icons';
import { STOCKS, LIQUID_TICKERS, getStock } from '../../lib/stocks';

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
          const tone = t.kind === 'ok' ? { bar: 'bg-hood-500', icon: 'text-hood-500', word: 'Done' } : t.kind === 'warn' ? { bar: 'bg-gold-400', icon: 'text-gold-400', word: 'Note' } : { bar: 'bg-down', icon: 'text-down', word: 'Error' };
          const Icon = t.kind === 'ok' ? Check : Warning;
          return (
            <div key={t.id} className="animate-feedin relative flex items-start gap-3 overflow-hidden rounded-xl border border-line bg-paper py-2.5 pl-4 pr-4 shadow-soft">
              <span className={`absolute inset-y-0 left-0 w-[2px] ${tone.bar}`} />
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
export const focusCls = 'outline-none focus-visible:ring-1 focus-visible:ring-hood-500 focus-visible:ring-offset-2 focus-visible:ring-offset-ground';

export function Card({ title, eyebrow, aside, children, className = '', tone = 'paper' }) {
  // One box language: the frame for the card that leads, the plain panel for the rest.
  const base = tone === 'ink' || tone === 'glow' ? 'frame' : 'panel';
  return (
    <section className={`${base} min-w-0 ${className}`}>
      {(title || aside || eyebrow) && (
        <div className="flex items-center justify-between gap-3 border-b border-line px-5 py-3.5">
          <div className="min-w-0">
            {eyebrow && <div className={`label ${tone === 'gold' ? 'text-gold-600' : ''}`}>{eyebrow}</div>}
            {title && <h3 className="mt-0.5 truncate font-display text-base font-medium tracking-tight text-ink">{title}</h3>}
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
    <div role="radiogroup" className="inline-flex max-w-full flex-wrap gap-px overflow-hidden rounded-xl border border-line bg-line">
      {options.map((o) => {
        const on = value === o.value;
        const Icon = o.icon;
        return (
          <button key={o.value} type="button" role="radio" aria-checked={on} onClick={() => onChange(o.value)} title={o.title}
            className={`relative inline-flex flex-1 items-center justify-center gap-1.5 whitespace-nowrap px-3 ${size === 'sm' ? 'py-1.5 text-xs' : 'py-2 text-[13px]'} font-medium transition-colors focus-visible:z-10 focus-visible:outline focus-visible:outline-1 focus-visible:-outline-offset-1 focus-visible:outline-hood-500 ${on ? 'bg-tile text-ink' : 'bg-ground text-mut hover:bg-paper hover:text-ink'}`}>
            {Icon && <Icon className={`h-3.5 w-3.5 shrink-0 ${on ? 'text-hood-500' : ''}`} />}
            {o.label}
            {on && <span className="absolute inset-x-0 bottom-0 h-[2px] bg-hood-500" />}
          </button>
        );
      })}
    </div>
  );
}

export function Toggle({ checked, onChange, label, hint }) {
  return (
    <button type="button" role="switch" aria-checked={checked} onClick={() => onChange(!checked)} className={`group flex w-full items-start justify-between gap-4 rounded-xl border border-line bg-ground px-3.5 py-3 text-left transition-colors hover:border-hood-300 ${focusCls}`}>
      <span className="min-w-0">
        <span className="block text-[13px] font-medium text-ink">{label}</span>
        {hint && <span className="mt-0.5 block text-xs leading-snug text-mut">{hint}</span>}
      </span>
      <span className="flex shrink-0 items-center gap-2 pt-0.5">
        <span className={`font-mono text-[10px] uppercase tracking-[0.14em] ${checked ? 'text-hood-600' : 'text-mut'}`}>{checked ? 'on' : 'off'}</span>
        <span className={`relative h-[18px] w-8 rounded-[5px] border transition-colors ${checked ? 'border-hood-500 bg-hood-200' : 'border-line bg-tile'}`}>
          <span className={`absolute top-[2px] h-3 w-3 rounded-[3px] transition-all ${checked ? 'left-[16px] bg-hood-500' : 'left-[2px] bg-mut'}`} />
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

export const inputCls = 'w-full rounded-xl border border-line bg-ground px-3 py-2 font-mono text-[13px] text-ink outline-none transition-colors placeholder:text-mut/60 hover:border-hood-300 focus:border-hood-500 focus:ring-1 focus:ring-hood-500/40';

export function Button({ children, variant = 'primary', busy, className = '', ...rest }) {
  const cls = variant === 'primary' ? 'btn-primary' : variant === 'ink' ? 'btn-ink' : variant === 'danger' ? 'inline-flex items-center justify-center gap-2 rounded-xl border border-red-300 bg-transparent px-5 py-2.5 text-sm font-semibold text-red-600 transition-colors hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50' : 'btn-ghost disabled:cursor-not-allowed disabled:opacity-50';
  return (
    <button type="button" disabled={busy || rest.disabled} className={`${cls} ${focusCls} ${busy ? 'opacity-60' : ''} ${className}`} {...rest}>
      {busy ? <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" /> : null}
      {children}
    </button>
  );
}

// The colour names the sliders used to take, as the colours they stood for.
const SLIDER_TONES = { 'accent-hood-500': '#2FA8FF', 'accent-ink': '#F4F5F4', 'accent-orange-500': '#FF7A1A', 'accent-gold-400': '#F6C343' };
const thumbCls = '[&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-[7px] [&::-webkit-slider-thumb]:cursor-grab [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-[2px] [&::-webkit-slider-thumb]:border [&::-webkit-slider-thumb]:border-ground [&::-webkit-slider-thumb]:bg-ink [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:w-[7px] [&::-moz-range-thumb]:cursor-grab [&::-moz-range-thumb]:rounded-[2px] [&::-moz-range-thumb]:border [&::-moz-range-thumb]:border-ground [&::-moz-range-thumb]:bg-ink [&::-moz-range-track]:bg-transparent focus-visible:[&::-webkit-slider-thumb]:bg-hood-500 focus-visible:[&::-moz-range-thumb]:bg-hood-500';

/** Slider on a ruler: a hairline track filled up to the value, ten ticks under it, the value in mono. */
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
        className={`mt-1 block h-4 w-full cursor-pointer appearance-none bg-transparent outline-none ${thumbCls}`}
        style={{ background: `linear-gradient(90deg, ${tone} ${at}%, #24272B ${at}%) center / 100% 2px no-repeat` }} />
      <div className="flex justify-between px-[3px]" aria-hidden="true">
        {Array.from({ length: 11 }, (_, i) => <span key={i} className={`w-px bg-line ${i % 5 === 0 ? 'h-1.5' : 'h-1'}`} />)}
      </div>
    </div>
  );
}

/** Stock picker: search over the 195 tickers, plus ETH and a raw address. */
const customCache = new Map();
export function useCustomToken(address) {
  const key = address && /^0x[0-9a-fA-F]{40}$/.test(address) && !getStock(address) && !/^0x0{40}$/i.test(address) ? address.toLowerCase() : null;
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

/** Research payload (/api/app/token) for any address, stocks and ETH included. Cached per address. */
const researchCache = new Map();
export function useTokenResearch(address) {
  const key = address && /^0x[0-9a-fA-F]{40}$/.test(address) ? address.toLowerCase() : address === 'ETH' ? '0x0000000000000000000000000000000000000000' : null;
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

export function StockPicker({ value, onChange, allowEth = true, allowAddress = true, compact = false }) {
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
      <button type="button" aria-expanded={open} onClick={() => setOpen((o) => !o)} className={`flex w-full items-center gap-3 rounded-xl border bg-ground px-3 py-2 text-left transition-colors hover:border-hood-300 ${open ? 'border-hood-500' : 'border-line'} ${focusCls}`}>
        {selected ? <StockLogo address={selected.address} meta={{ symbol: selected.symbol, image: selected.image }} size="h-8 w-8" text="text-[9px]" /> : <span className="h-8 w-8 shrink-0 rounded-full border border-dashed border-line" />}
        <span className="min-w-0 flex-1">
          <span className="block font-mono text-[13px] font-semibold text-ink">{selected ? selected.symbol : 'Pick a token'}</span>
          <span className="block truncate text-xs text-mut">{selected ? selected.name : 'A stock, ETH, or any token by contract address'}</span>
        </span>
        <CaretDown className={`h-3.5 w-3.5 shrink-0 text-mut transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="absolute left-0 right-0 top-full z-20 mt-1.5 min-w-[320px] overflow-hidden rounded-2xl border border-line bg-paper shadow-soft">
          {allowAddress && (
            <div className="grid grid-cols-2 gap-px border-b border-line bg-line">
              {[['stocks', Chart, `Stocks${allowEth ? ' and ETH' : ''}`], ['custom', Coins, 'Any token, by address']].map(([k, Icon, text]) => (
                <button key={k} type="button" onClick={() => setTab(k)} className={`relative flex items-center justify-center gap-1.5 px-2 py-2 text-xs font-medium transition-colors ${tab === k ? 'bg-tile text-ink' : 'bg-ground text-mut hover:text-ink'}`}>
                  <Icon className={`h-3.5 w-3.5 ${tab === k ? 'text-hood-500' : ''}`} />{text}
                  {tab === k && <span className="absolute inset-x-0 bottom-0 h-[2px] bg-hood-500" />}
                </button>
              ))}
            </div>
          )}
          {tab === 'custom' ? (
            <div className="p-3">
              <p className="mb-2 text-xs text-mut">Any ERC-20 on Robinhood Chain: a memecoin, a partner token, your own coin. Paste its contract address.</p>
              <input autoFocus value={q} onChange={(e) => setQ(e.target.value.trim())} placeholder="0x… contract address" className={inputCls} />
              {isAddr ? (
                <div className="mt-2">
                  {probe?.loading || !probe ? <div className="flex items-center gap-2 px-2 py-3 text-xs text-mut"><span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-line border-t-hood-500" /> Looking up {q.trim().slice(0, 10)}… on chain, DexScreener and GeckoTerminal</div>
                    : probe.error ? <div className="px-2 py-3 text-xs text-down">{probe.error}</div>
                    : <TokenCard token={probe} compact action={{ label: 'Use this token', onClick: () => { onChange(q.trim()); setOpen(false); } }} />}
                </div>
              ) : q ? <p className="mt-2 text-xs text-mut">Keep typing: 42 characters starting with 0x.</p> : null}
            </div>
          ) : (
          <>
          <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder={allowAddress ? 'Search a ticker or a company, or paste an address' : 'Search a ticker or a company'} className="w-full border-b border-line bg-transparent px-3 py-2.5 text-[13px] text-ink outline-none placeholder:text-mut/60 focus:border-hood-500" />
          <div className="max-h-[420px] divide-y divide-line/60 overflow-y-auto">
            {allowEth && !q && (
              <button type="button" onClick={() => { onChange('ETH'); setOpen(false); }} className="flex w-full items-center gap-3 px-3 py-2 text-left transition-colors hover:bg-tile">
                <StockLogo address="0x0000000000000000000000000000000000000000" size="h-6 w-6" text="text-[7px]" /><span className="w-14 font-mono text-[13px] font-semibold text-ink">ETH</span><span className="min-w-0 flex-1 truncate text-xs text-mut">Ether, no conversion</span>
              </button>
            )}
            {list.map((s) => (
              <button key={s.ticker} type="button" onClick={() => { onChange(s.address); setOpen(false); }} className="flex w-full items-center gap-3 px-3 py-2 text-left transition-colors hover:bg-tile">
                <StockLogo address={s.address} size="h-6 w-6" text="text-[7px]" />
                <span className="w-14 font-mono text-[13px] font-semibold text-ink">{s.ticker}</span>
                <span className="min-w-0 flex-1 truncate text-xs text-mut">{s.name}</span>
                {LIQUID_TICKERS.includes(s.ticker) && <span className="label flex items-center gap-1 !text-[9px] text-hood-600"><span className="h-1 w-1 rounded-full bg-hood-500" />liquid</span>}
              </button>
            ))}
            {list.length === 0 && !isAddr && <div className="px-4 py-4 text-center text-xs text-mut">No ticker matches. Looking for another token? Use the "Any token" tab.</div>}
          </div>
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
export const scheduleValue = (c) => (c.schedule_kind === 'interval' ? `interval:${[5, 30, 60].includes(Number(c.interval_minutes)) ? c.interval_minutes : 5}` : c.schedule_kind);
export const parseSchedule = (v) => (v.startsWith('interval:') ? { schedule_kind: 'interval', interval_minutes: Number(v.split(':')[1]) } : { schedule_kind: v, interval_minutes: 1440 });

export const PRESETS = [
  { key: '100-0-0-0', label: '100% holders', holders: 100, creator: 0, burn: 0, treasury: 0 },
  { key: '80-20-0-0', label: '80 / 20 you', holders: 80, creator: 20, burn: 0, treasury: 0 },
  { key: '70-30-0-0', label: '70 / 30 you', holders: 70, creator: 30, burn: 0, treasury: 0 },
  { key: '70-0-0-30', label: '70 + 30 treasury', holders: 70, creator: 0, burn: 0, treasury: 30 },
  { key: '60-20-0-20', label: '60 / 20 / 20', holders: 60, creator: 20, burn: 0, treasury: 20 },
  { key: '50-20-15-15', label: '50 / 20 / 15 / 15', holders: 50, creator: 20, burn: 15, treasury: 15 },
];
