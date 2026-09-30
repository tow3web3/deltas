'use client';

import { useMemo } from 'react';
import { Slider, Seg, Field, inputCls, PRESETS, StockPicker } from './ui';
import { Users, Wallet, Burn, Vault, InKind, Convert } from '../Icons';

/**
 * The four-way split as sliders that always sum to 100. Moving one
 * slider takes from (or gives to) the holders share, which is the natural
 * balancing item of a payout ratio.
 */
export default function PolicyEditor({ value, onChange, showAddresses = true }) {
  const { holders, creator, burn, treasury, creatorAddress, treasuryAddress, treasuryAsset, payoutMode } = value;
  const set = (patch) => onChange({ ...value, ...patch });

  const setLeg = (key, v) => {
    const others = { creator, burn, treasury, [key]: v };
    const sum = others.creator + others.burn + others.treasury;
    if (sum > 100) return; // holders cannot go negative
    set({ [key]: v, holders: 100 - sum });
  };
  const presetKey = `${holders}-${creator}-${burn}-${treasury}`;

  const bar = useMemo(() => [
    ['Holders', holders, '#2FA8FF', Users], ['You', creator, '#F4F5F4', Wallet], ['Burn', burn, '#FF7A1A', Burn], ['Treasury', treasury, '#F6C343', Vault],
  ], [holders, creator, burn, treasury]);

  return (
    <div className="space-y-5">
      {/* The split, drawn once: each share is a column as wide as what it takes. */}
      <div>
        <div className="flex h-9 w-full gap-px overflow-hidden rounded-[5px] bg-line">
          {bar.filter(([, v]) => v > 0).map(([k, v, c]) => (
            <div key={k} className="relative flex min-w-0 items-end bg-ground px-1.5 pb-1 transition-all duration-300" style={{ width: `${v}%` }} title={`${k} ${v}%`}>
              <span className="absolute inset-x-0 top-0 h-[3px]" style={{ background: c }} />
              {v >= 12 && <span className="figure truncate text-xs text-ink">{v}%</span>}
            </div>
          ))}
        </div>
        <div className="mt-2.5 grid grid-cols-2 gap-x-5 gap-y-1.5">
          {bar.map(([k, v, c, Icon]) => (
            <div key={k} className={`flex items-center gap-1.5 ${v > 0 ? '' : 'opacity-45'}`}>
              <Icon className="h-3.5 w-3.5 shrink-0" style={{ color: c }} />
              <span className="label truncate">{k}</span>
              <span className="ml-auto font-mono text-[11px] tabular-nums text-ink">{v}%</span>
            </div>
          ))}
        </div>
      </div>

      <div>
        <div className="label mb-1.5">Presets</div>
        <div className="flex flex-wrap gap-1">
          {PRESETS.map((p) => (
            <button key={p.key} type="button" onClick={() => set({ holders: p.holders, creator: p.creator, burn: p.burn, treasury: p.treasury })}
              className={`rounded-lg border px-2.5 py-1 font-mono text-[11px] transition-colors ${presetKey === p.key ? 'border-hood-500 bg-hood-50 text-hood-700' : 'border-line bg-ground text-mut hover:border-hood-300 hover:text-ink'}`}>
              {p.label}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-4 border-l border-line pl-3.5">
        <Slider label="Your share" icon={Wallet} value={creator} onChange={(v) => setLeg('creator', v)} color="#F4F5F4" />
        <Slider label="Buyback and burn" icon={Burn} value={burn} onChange={(v) => setLeg('burn', v)} color="#FF7A1A" />
        <Slider label="Retained in treasury" icon={Vault} value={treasury} onChange={(v) => setLeg('treasury', v)} color="#F6C343" />
        <p className="text-[11px] leading-snug text-mut">Holders receive the rest: <span className="font-mono text-hood-600">{holders}%</span>. A share without a destination address is paid to holders.</p>
      </div>

      {showAddresses && (
        <div className="grid gap-x-3 gap-y-4 sm:grid-cols-2">
          <Field label="Your payout address" hint={creator > 0 && !creatorAddress ? 'Required to activate your share' : 'Where your share goes, never the dev wallet'}>
            <input value={creatorAddress || ''} onChange={(e) => set({ creatorAddress: e.target.value.trim() })} placeholder="0x…" className={inputCls} />
          </Field>
          <Field label="Treasury address" hint={treasury > 0 && !treasuryAddress ? 'Required to activate the treasury share' : 'A cold wallet or multisig you control'}>
            <input value={treasuryAddress || ''} onChange={(e) => set({ treasuryAddress: e.target.value.trim() })} placeholder="0x…" className={inputCls} />
          </Field>
          <Field label="Treasury asset" hint="What ETH fees buy for the treasury. Stock fees move in kind.">
            <StockPicker value={treasuryAsset || ''} onChange={(v) => set({ treasuryAsset: v })} allowEth={false} allowAddress={false} compact />
          </Field>
          <div>
            <div className="label mb-1.5">Stock fees</div>
            <Seg value={payoutMode || 'in_kind'} onChange={(v) => set({ payoutMode: v })} options={[{ value: 'in_kind', label: 'In kind', icon: InKind }, { value: 'convert', label: 'Convert', icon: Convert }]} />
            <p className="mt-1.5 text-[11px] leading-snug text-mut">{payoutMode === 'convert' ? 'Sold and converted to your reward before payout' : 'Paid to holders as they are: NVDA in, NVDA out'}</p>
          </div>
        </div>
      )}
    </div>
  );
}
