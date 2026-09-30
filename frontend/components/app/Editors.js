'use client';

import StockLogo from '../StockLogo';
import * as Icons from '../Icons';
import { Slider, Seg, Toggle, Field, StockPicker, SCHEDULES, focusCls } from './ui';
import { BASKETS, getStock } from '../../lib/stocks';

export function LoyaltyEditor({ value, onChange }) {
  const set = (p) => onChange({ ...value, ...p });
  const minLabel = (h) => (h === 0 ? 'none' : h < 24 ? `${h}h` : `${Math.round(h / 24)}d`);
  return (
    <div className="space-y-2.5">
      <Toggle checked={value.enabled} onChange={(v) => set({ enabled: v })} label="Weight dividends by holding time" hint="Snipers who buy before the record date earn less than long-term holders" />
      <div className={`space-y-4 border-l border-line pl-3.5 transition-opacity ${value.enabled ? '' : 'pointer-events-none opacity-40'}`}>
        <Slider label="Max multiplier" value={value.maxBps / 10000} min={1} max={5} step={0.5} onChange={(v) => set({ maxBps: Math.round(v * 10000) })} format={(v) => `${v.toFixed(1)}x`} />
        <Slider label="Ramp to max" value={value.rampDays} min={1} max={180} step={1} onChange={(v) => set({ rampDays: v })} format={(v) => `${v} days`} />
        <Slider label="Minimum hold to qualify" value={value.minHoldHours} min={0} max={168} step={1} onChange={(v) => set({ minHoldHours: v })} format={minLabel} />
        <Toggle checked={value.sellReset} onChange={(v) => set({ sellReset: v })} label="Selling resets the clock" hint="Any outgoing transfer restarts a wallet's holding time" />
        <p className="text-[11px] leading-snug text-mut">A wallet&apos;s weight = balance x multiplier. The multiplier ramps from 1x to {(value.maxBps / 10000).toFixed(1)}x over {value.rampDays} days{value.minHoldHours ? `; wallets held under ${minLabel(value.minHoldHours)} get nothing that cycle` : ''}. Voting weight follows the same rule.</p>
      </div>
    </div>
  );
}

const MODES = [
  { value: 'fixed', label: 'Fixed', icon: Icons.Target },
  { value: 'roulette', label: 'Roulette', icon: Icons.Dice },
  { value: 'gainer', label: 'Top gainer', icon: Icons.TrendUp },
  { value: 'portfolio', label: 'Portfolio', icon: Icons.Pie },
  { value: 'vote', label: 'Vote', icon: Icons.Vote },
];

export function RewardEditor({ value, onChange }) {
  const set = (p) => onChange({ ...value, ...p });
  return (
    <div className="space-y-3">
      <p className="text-xs leading-snug text-mut">Applies to <span className="font-medium text-ink">ETH fees</span> (and to stock fees in convert mode). In-kind stock fees are paid as they are.</p>
      <Seg value={value.rewardMode} onChange={(v) => set({ rewardMode: v })} options={MODES} size="sm" />
      {value.rewardMode === 'fixed' && (
        <Field label="Reward" hint="A stock, ETH, or any token on Robinhood Chain (the second tab of the picker takes a contract address)">
          <StockPicker value={value.reward} onChange={(v) => set({ reward: v })} />
        </Field>
      )}
      {value.rewardMode === 'portfolio' && (
        <div>
          <div className="label mb-1.5">Basket</div>
          {/* A basket is its stocks: one line per basket, the logos in the order they are paid. */}
          <div role="radiogroup" className="divide-y divide-line overflow-hidden rounded-xl border border-line">
            {Object.entries(BASKETS).map(([k, b]) => {
              const on = value.basket === k;
              const Icon = Icons[b.icon];
              return (
                <button key={k} type="button" role="radio" aria-checked={on} onClick={() => set({ basket: k })} className={`relative flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors ${on ? 'bg-tile' : 'bg-ground hover:bg-paper'} ${focusCls}`}>
                  {on && <span className="absolute inset-y-0 left-0 w-[2px] bg-hood-500" />}
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-1.5 text-[13px] font-medium text-ink">{Icon && <Icon className={`h-3.5 w-3.5 ${on ? 'text-hood-500' : 'text-mut'}`} />}{b.label}</span>
                    <span className="mt-0.5 block truncate font-mono text-[10px] text-mut">{b.tickers.join(' · ')}</span>
                  </span>
                  <span className="flex shrink-0 items-center [&>*+*]:-ml-1.5 [&>*]:ring-2 [&>*]:ring-ground">
                    {b.tickers.map((t) => <StockLogo key={t} address={getStock(t)?.address} size="h-5 w-5" text="text-[6px]" />)}
                  </span>
                </button>
              );
            })}
          </div>
          <p className="mt-1.5 text-[11px] leading-snug text-mut">One stock per cycle, in order, then repeat.</p>
        </div>
      )}
      {value.rewardMode === 'roulette' && <p className="text-xs leading-snug text-mut">A random stock from the liquid pool every cycle. Holders never know what is coming.</p>}
      {value.rewardMode === 'gainer' && <p className="text-xs leading-snug text-mut">The best-performing stock of the day among the liquid pool, from Yahoo Finance.</p>}
      {value.rewardMode === 'vote' && <p className="text-xs leading-snug text-mut">Holders vote on the next reward on the /vote page, weighted by balance and loyalty. The fixed reward is used until the first vote resolves.</p>}
    </div>
  );
}

const FEE_SOURCES = [
  { value: 'wallet', label: 'Fees land in the wallet', icon: Icons.Wallet },
  { value: 'univ3', label: 'Uniswap V3 LP fees', icon: Icons.Layers },
];

export function ScheduleEditor({ value, onChange }) {
  const set = (p) => onChange({ ...value, ...p });
  return (
    <div className="space-y-3">
      <div>
        <div className="label mb-1.5">A cycle fires</div>
        <Seg value={value.schedule} onChange={(v) => set({ schedule: v })} options={SCHEDULES} size="sm" />
      </div>
      <Toggle checked={value.marketHoursOnly} onChange={(v) => set({ marketHoursOnly: v })} label="Market hours only" hint="Skip cycles outside 9:30 to 16:00 New York time, weekdays" />
      <div>
        <div className="label mb-1.5">Fee source</div>
        <Seg value={value.feeSource} onChange={(v) => set({ feeSource: v })} options={FEE_SOURCES} size="sm" />
      </div>
    </div>
  );
}
