'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import StockLogo from '../StockLogo';
import Countdown from '../Countdown';
import { Copy, Check, Bolt, Pause, Play, Arrow, Wallet, Burn, Vault, Gas, External, Warning, TrendUp } from '../Icons';
import PolicyEditor from './PolicyEditor';
import { LoyaltyEditor, RewardEditor, ScheduleEditor } from './Editors';
import { Card, Button, useToast, shortAddr, fmtUsd, fmtNum, units, scheduleValue, parseSchedule } from './ui';
import { describeAddress, explorerAddress, explorerTx, ZERO } from '../../lib/stocks';

const smallBtn = 'inline-flex items-center gap-1 rounded-lg border border-line bg-ground px-2 py-1 font-mono text-[10.5px] text-mut transition-colors hover:border-hood-400 hover:text-ink';
const textLink = 'inline-flex items-center gap-0.5 text-xs font-medium text-hood-600 hover:underline';

function CopyBtn({ text, label = 'Copy' }) {
  const [ok, setOk] = useState(false);
  return (
    <button type="button" onClick={async () => { try { await navigator.clipboard.writeText(text); setOk(true); setTimeout(() => setOk(false), 1200); } catch { /* ignore */ } }} className={smallBtn}>
      {ok ? <Check className="h-3 w-3 text-hood-600" /> : <Copy className="h-3 w-3" />}{ok ? 'Copied' : label}
    </button>
  );
}

/** A card that tracks a draft, shows Save when dirty, and PATCHes on save. */
function Editable({ title, eyebrow, initial, toPatch, children, tone }) {
  const [draft, setDraft] = useState(initial);
  const [busy, setBusy] = useState(false);
  const toast = useToast();
  useEffect(() => setDraft(initial), [JSON.stringify(initial)]); // eslint-disable-line react-hooks/exhaustive-deps
  const dirty = JSON.stringify(draft) !== JSON.stringify(initial);
  async function save() {
    setBusy(true);
    try {
      const res = await fetch('/api/app/config', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(toPatch(draft)) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Save failed');
      toast('Saved. The scheduler picked it up.');
      window.dispatchEvent(new Event('bm:refresh'));
    } catch (e) {
      toast(e.message, 'err');
    } finally {
      setBusy(false);
    }
  }
  return (
    <Card title={title} eyebrow={eyebrow} tone={tone} aside={dirty ? <div className="flex gap-2"><Button variant="ghost" className="!py-1.5 text-xs" onClick={() => setDraft(initial)} disabled={busy}>Discard</Button><Button className="!py-1.5 text-xs" onClick={save} busy={busy}>Save</Button></div> : null}>
      {children(draft, setDraft)}
    </Card>
  );
}

export default function Dashboard({ data, refresh, onLogout }) {
  const { config, assets, logs, meta, user } = data;
  const toast = useToast();
  const [busy, setBusy] = useState(null);
  const [tg, setTg] = useState(null);
  const src = meta[config.source_token_address] || {};
  const symbol = src.symbol || config.source_token_address.slice(2, 6).toUpperCase();

  const policyInitial = useMemo(() => ({
    holders: Number(config.split_holders_bps) / 100, creator: Number(config.split_creator_bps) / 100, burn: Number(config.split_burn_bps) / 100, treasury: Number(config.split_treasury_bps) / 100,
    creatorAddress: config.creator_address || '', treasuryAddress: config.treasury_address || '', treasuryAsset: config.treasury_asset || '', payoutMode: config.payout_mode || 'in_kind',
  }), [config]);
  const loyaltyInitial = useMemo(() => ({ enabled: Boolean(config.loyalty_enabled), maxBps: Number(config.loyalty_max_bps || 20000), rampDays: Number(config.loyalty_ramp_days || 30), minHoldHours: Number(config.loyalty_min_hold_hours || 0), sellReset: Boolean(config.loyalty_sell_reset) }), [config]);
  const rewardInitial = useMemo(() => ({ rewardMode: config.reward_mode || 'fixed', reward: config.target_token_address === ZERO ? 'ETH' : config.target_token_address, basket: config.basket || 'MAG7' }), [config]);
  const scheduleInitial = useMemo(() => ({ schedule: scheduleValue(config), marketHoursOnly: Boolean(config.market_hours_only), feeSource: config.fee_source || 'wallet' }), [config]);

  async function act(kind) {
    setBusy(kind);
    try {
      if (kind === 'run') {
        const res = await fetch('/api/app/config/run', { method: 'POST' });
        const d = await res.json();
        if (!res.ok) throw new Error(d.error);
        toast('Cycle started. Results land here and on Telegram in a minute or two.');
      } else if (kind === 'pause' || kind === 'resume') {
        const res = await fetch('/api/app/config', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ is_active: kind === 'resume' }) });
        if (!res.ok) throw new Error((await res.json()).error);
        toast(kind === 'resume' ? 'Resumed.' : 'Paused. No cycles until you resume.');
        refresh();
      } else if (kind === 'delete') {
        if (!window.confirm('Delete this policy? The bot loses access to the dev wallet. Withdraw its funds first.')) return;
        const res = await fetch('/api/app/config', { method: 'DELETE' });
        if (!res.ok) throw new Error((await res.json()).error);
        toast('Deleted.');
        refresh();
      } else if (kind === 'tg') {
        const res = await fetch('/api/app/telegram-link', { method: 'POST' });
        const d = await res.json();
        if (!res.ok) throw new Error(d.error);
        setTg(d.url);
      }
    } catch (e) {
      toast(e.message, 'err');
    } finally {
      setBusy(null);
    }
  }

  const eth = assets?.assets?.find((a) => a.isNative);
  const lowGas = eth && eth.amount < (assets.gasReserveEth || 0.002);
  const payable = (assets?.assets || []).filter((a) => (a.isNative ? a.spendable > 0.0005 : a.usd >= 1));

  return (
    <div className="mx-auto max-w-6xl px-5 py-8">
      {/* Top strip */}
      <div className="mb-5 flex flex-col gap-4 border-b border-line pb-5 lg:flex-row lg:items-end lg:justify-between">
        <div className="flex items-center gap-3.5">
          <StockLogo address={config.source_token_address} meta={src} size="h-11 w-11" text="text-xs" />
          <div>
            <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
              <h1 className="font-display text-2xl font-medium leading-none tracking-tight text-ink">{src.name || `$${symbol}`}</h1>
              <span className="font-mono text-xs text-mut">${symbol}</span>
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1">
              <span className={`label flex items-center gap-1.5 ${config.is_active ? 'text-hood-600' : ''}`}><span className={`h-1.5 w-1.5 rounded-full ${config.is_active ? 'bg-hood-500' : 'bg-mut'}`} />{config.is_active ? 'Running' : 'Paused'} · {config.scheduleLabel}</span>
              {data.yield?.apy ? <span className="label flex items-center gap-1 text-gold-600"><TrendUp className="h-3.5 w-3.5" />{data.yield.apy.toFixed(data.yield.apy >= 10 ? 1 : 2)}% yield</span> : null}
              <Link href={`/${config.source_token_address}`} className={textLink}>Public dashboard<External className="h-2.5 w-2.5" /></Link>
            </div>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button className="!px-4 !py-2 text-[13px]" onClick={() => act('run')} busy={busy === 'run'} disabled={!config.is_active}><Bolt className="h-4 w-4" />Run a cycle now</Button>
          {config.is_active ? <Button variant="ghost" className="!px-4 !py-2 text-[13px]" onClick={() => act('pause')} busy={busy === 'pause'}><Pause className="h-3.5 w-3.5" />Pause</Button> : <Button variant="ink" className="!px-4 !py-2 text-[13px]" onClick={() => act('resume')} busy={busy === 'resume'}><Play className="h-3 w-3" />Resume</Button>}
          <button type="button" onClick={onLogout} className="ml-1 text-xs text-mut hover:text-ink">Sign out</button>
        </div>
      </div>

      <div className="grid items-start gap-3 lg:grid-cols-12">
        {/* Left: live state */}
        <div className="min-w-0 space-y-3 lg:col-span-7">
          {/* The next cycle: when, and what it carries, asset by asset */}
          <section className="frame">
            <div className="flex flex-wrap items-end justify-between gap-4 p-5">
              <div>
                <div className="label">{config.is_active ? 'Next cycle in' : 'Next cycle'}</div>
                <div className={`figure mt-2 text-5xl font-medium leading-none tracking-tight ${config.is_active ? 'text-hood-500' : 'text-mut'}`}>{config.is_active ? <Countdown intervalMinutes={config.interval_minutes} scheduleKind={config.schedule_kind} /> : 'Paused'}</div>
              </div>
              <p className="max-w-[16rem] text-right text-xs leading-snug text-mut">{payable.length ? `Paid under the policy on the right${config.loyalty_enabled ? ', weighted by loyalty' : ''}.` : 'Nothing to distribute yet. Fees land in the dev wallet, then the next cycle pays them out.'}</p>
            </div>
            {payable.length > 0 && (
              <div className="grid grid-cols-2 gap-px border-t border-line bg-line sm:grid-cols-3">
                {payable.map((a) => (
                  <div key={a.address} className="flex items-center gap-2 bg-paper px-4 py-2.5">
                    <StockLogo address={a.address} meta={{ symbol: a.symbol }} size="h-5 w-5" text="text-[6px]" />
                    <span className="font-mono text-xs tabular-nums text-ink">{fmtNum(a.isNative ? a.spendable : a.amount)}</span>
                    <span className="ml-auto font-mono text-[10.5px] text-mut">{a.symbol}</span>
                  </div>
                ))}
              </div>
            )}
          </section>

          <Card eyebrow="Dev wallet" title={<span className="font-mono text-sm">{shortAddr(config.dev_wallet_public)}</span>} aside={<div className="flex gap-1.5"><CopyBtn text={config.dev_wallet_public} label="Copy address" /><a href={explorerAddress(config.dev_wallet_public)} target="_blank" rel="noopener noreferrer" className={smallBtn}>Blockscout<External className="h-2.5 w-2.5" /></a></div>}>
            {lowGas && (
              <div className="relative mb-3 flex items-start gap-2 overflow-hidden rounded-xl border border-line bg-ground py-2.5 pl-4 pr-3 text-xs leading-snug text-mut">
                <span className="absolute inset-y-0 left-0 w-[2px] bg-gold-400" /><Gas className="mt-px h-3.5 w-3.5 shrink-0 text-gold-400" />
                <span>Low gas: the wallet holds <span className="font-mono text-ink">{fmtNum(eth.amount)} ETH</span>. Send about 0.005 ETH so cycles can pay transfers.</span>
              </div>
            )}
            <p className="mb-3 border-l border-line pl-3 text-xs leading-snug text-mut">
              Set <span className="break-all font-mono text-ink">{config.dev_wallet_public}</span> as the fee recipient on your launchpad. Whatever lands here (stocks or ETH) is what the next cycle distributes.
            </p>
            {assets?.error && <p className="text-xs text-down">{assets.error}</p>}
            <div className="divide-y divide-line/70 border-y border-line/70">
              {(assets?.assets || []).map((a) => (
                <div key={a.address} className="grid grid-cols-[auto_1fr_auto_5rem] items-center gap-3 py-2">
                  <StockLogo address={a.address} meta={{ symbol: a.symbol }} size="h-6 w-6" text="text-[7px]" />
                  <div className="min-w-0"><span className="font-mono text-[13px] text-ink">{a.symbol}</span><span className="ml-2 truncate text-[11px] text-mut">{a.name}{a.isNative ? ` · ${fmtNum(a.spendable)} spendable` : ''}</span></div>
                  <span className="font-mono text-xs tabular-nums text-mut">{fmtNum(a.amount)}</span>
                  <span className="figure text-right text-sm text-ink">{fmtUsd(a.usd)}</span>
                </div>
              ))}
              {assets && assets.assets.length <= 1 && !(eth?.amount > 0) && <div className="py-3 text-xs text-mut">Empty so far.</div>}
            </div>
            {assets && <div className="mt-2.5 flex items-baseline justify-between"><span className="label">Total</span><span className="figure text-lg text-ink">{fmtUsd(assets.totalUsd)}</span></div>}
          </Card>

          <Card eyebrow="History" title="Recent cycles" aside={<Link href={`/${config.source_token_address}`} className={textLink}>Public dashboard<External className="h-2.5 w-2.5" /></Link>}>
            {logs.length === 0 && <p className="text-xs text-mut">No cycle yet.</p>}
            <div className="-my-2 divide-y divide-line/70">
              {logs.map((l) => {
                const r = describeAddress(l.reward_token_used, meta[l.reward_token_used]);
                const paid = Number(l.total_airdropped || 0) > 0;
                const state = l.status === 'success' ? (paid ? 'paid' : 'idle') : 'failed';
                return (
                  <div key={l.id} className="py-2.5 text-xs">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-[10.5px] text-mut">{new Date(l.execution_time).toLocaleString()}</span>
                      <span className="flex items-center gap-3">
                        {paid && <Link href={`/receipt/${l.id}`} className={textLink}>receipt</Link>}
                        {l.tx_hash && <a href={explorerTx(l.tx_hash)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-0.5 font-mono text-[10.5px] text-mut hover:text-ink">tx<External className="h-2.5 w-2.5" /></a>}
                        <span className={`inline-flex items-center gap-1 font-mono text-[9.5px] uppercase tracking-[0.12em] ${state === 'paid' ? 'text-hood-600' : state === 'failed' ? 'text-down' : 'text-mut'}`}><span className={`h-1 w-1 rounded-full ${state === 'paid' ? 'bg-hood-500' : state === 'failed' ? 'bg-down' : 'bg-mut'}`} />{state}</span>
                      </span>
                    </div>
                    <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-mut">
                      {paid && <span className="flex items-center gap-1.5"><StockLogo address={l.reward_token_used} meta={{ symbol: r.symbol }} size="h-4 w-4" text="text-[6px]" /><span className="font-mono tabular-nums text-ink">{fmtNum(units(l.total_airdropped, meta[l.reward_token_used]?.decimals ?? 18))} {r.symbol}</span> to {l.holder_count} holders</span>}
                      {Number(l.creator_amount) > 0 && <span className="flex items-center gap-1 font-mono tabular-nums" title="Your share"><Wallet className="h-3.5 w-3.5 text-ink" />{fmtNum(units(l.creator_amount))}</span>}
                      {Number(l.burn_amount) > 0 && <span className="flex items-center gap-1 font-mono tabular-nums" title="Bought back and burned"><Burn className="h-3.5 w-3.5 text-[#FF7A1A]" />{fmtNum(units(l.burn_amount), 2)}</span>}
                      {Number(l.treasury_amount) > 0 && <span className="flex items-center gap-1 font-mono tabular-nums" title="Added to the treasury"><Vault className="h-3.5 w-3.5 text-gold-400" />+{fmtNum(units(l.treasury_amount))}{l.treasury_token ? <StockLogo address={l.treasury_token} meta={meta[l.treasury_token]} size="h-3.5 w-3.5" text="text-[5px]" /> : null}{meta[l.treasury_token]?.symbol || ''}</span>}
                      {l.error_message && <span className="flex items-start gap-1 text-gold-600"><Warning className="mt-px h-3.5 w-3.5 shrink-0" />{l.error_message}</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        </div>

        {/* Right: the routing */}
        <div className="min-w-0 space-y-3 lg:col-span-5">
          <Editable title="Routing" eyebrow="Payout ratio · you · buyback · treasury" tone="gold" initial={policyInitial}
            toPatch={(d) => ({ split_holders_bps: d.holders * 100, split_creator_bps: d.creator * 100, split_burn_bps: d.burn * 100, split_treasury_bps: d.treasury * 100, creator_address: d.creatorAddress || null, treasury_address: d.treasuryAddress || null, treasury_asset: d.treasuryAsset || null, payout_mode: d.payoutMode })}>
            {(d, set) => <PolicyEditor value={d} onChange={set} />}
          </Editable>

          <Editable title="Record date" eyebrow="Loyalty weighting" initial={loyaltyInitial}
            toPatch={(d) => ({ loyalty_enabled: d.enabled, loyalty_max_bps: d.maxBps, loyalty_ramp_days: d.rampDays, loyalty_min_hold_hours: d.minHoldHours, loyalty_sell_reset: d.sellReset })}>
            {(d, set) => <LoyaltyEditor value={d} onChange={set} />}
          </Editable>

          <Editable title="Reward for ETH fees" eyebrow="Conversion" initial={rewardInitial}
            toPatch={(d) => ({ reward_mode: d.rewardMode, reward: d.rewardMode === 'fixed' ? d.reward : undefined, basket: d.rewardMode === 'portfolio' ? d.basket : undefined })}>
            {(d, set) => <RewardEditor value={d} onChange={set} />}
          </Editable>

          <Editable title="Schedule and fee source" eyebrow="Calendar" initial={scheduleInitial}
            toPatch={(d) => ({ ...parseSchedule(d.schedule), market_hours_only: d.marketHoursOnly, fee_source: d.feeSource })}>
            {(d, set) => <ScheduleEditor value={d} onChange={set} />}
          </Editable>

          <Card title="Telegram" eyebrow="Receipts and alerts">
            {user.telegramLinked ? (
              <p className="text-sm text-mut">Linked{user.telegramUsername ? ` to @${user.telegramUsername}` : ''}. Send <span className="font-mono text-ink">/announce</span> in your project group so every dividend posts a receipt card there.</p>
            ) : (
              <div className="space-y-2">
                <p className="text-sm text-mut">Get every cycle's result on Telegram, post receipt cards in your group, and control the same routing from the bot.</p>
                {tg ? <a href={tg} target="_blank" rel="noopener noreferrer" className="btn-primary !py-2 text-xs">Open Telegram to link <Arrow className="h-3.5 w-3.5" /></a> : <Button variant="ghost" className="!py-2 text-xs" onClick={() => act('tg')} busy={busy === 'tg'}>Link Telegram</Button>}
              </div>
            )}
          </Card>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line px-1 pt-4">
            <p className="max-w-[18rem] text-xs leading-snug text-mut"><span className="label mr-1.5 text-down">Irreversible</span>Deleting removes the bot&apos;s access to the dev wallet. Move its funds out first.</p>
            <Button variant="danger" className="!px-3.5 !py-1.5 text-xs" onClick={() => act('delete')} busy={busy === 'delete'}>Delete this policy</Button>
          </div>
        </div>
      </div>
    </div>
  );
}
