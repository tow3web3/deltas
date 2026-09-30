'use client';

import { useEffect, useState, useCallback } from 'react';
import { claimMessage, rankForXp, RANKS } from '../../lib/missionConfig';
import { useWallet, ConnectButton } from '../../lib/useWallet';
import { isNative, ZERO } from '../../lib/stocks';
import StockLogo from '../StockLogo';
import * as Icons from '../Icons';
import { BRAND, TOKEN } from '../../lib/brand';

const { Gem, Vote, Flame, Handshake, Dice, Target, Check, Warning, Arrow } = Icons;

function rewardLabel(amount, token) {
  if (isNative(token)) return `${(Number(amount) / 1e18).toFixed(4)} ETH`;
  return `${new Intl.NumberFormat('en-US', { notation: 'compact' }).format(Number(amount) / 1e18)} tokens`;
}

function sinceLabel(iso) {
  if (!iso) return '-';
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
  if (days <= 0) return 'today';
  if (days === 1) return '1 day';
  if (days < 30) return `${days} days`;
  const months = Math.floor(days / 30);
  return months === 1 ? '1 month' : `${months} months`;
}

// What a mission asks for, as an icon.
const TYPE_ICONS = { hold: Gem, vote: Vote, vote_count: Flame, customer: Handshake, roulette_mode: Dice, vote_mode: Vote };
// A mission moves through three stops: verified on chain, reward claimed, reward paid.
const STAGES = ['Verified', 'Claimed', 'Paid'];
const stageOf = (status) => (status === 'paid' ? 3 : status === 'claiming' ? 2 : status === 'verified' ? 1 : 0);

function Reward({ amount, token, className = '' }) {
  return (
    <span className={`inline-flex items-center gap-1.5 font-mono text-xs tabular-nums ${className}`}>
      <StockLogo address={isNative(token) ? ZERO : token} size="h-4 w-4" text="text-[5px]" />{rewardLabel(amount, token)}
    </span>
  );
}

/** The five ranks on one line, the XP earned drawn along it. */
function Ladder({ xp }) {
  // Each rank takes an equal stretch of the line, so the first ranks stay readable.
  const at = (() => {
    let i = 0;
    for (let k = 0; k < RANKS.length; k++) if (xp >= RANKS[k].min) i = k;
    if (i >= RANKS.length - 1) return 100;
    const span = RANKS[i + 1].min - RANKS[i].min;
    return ((i + Math.min(1, (xp - RANKS[i].min) / span)) / (RANKS.length - 1)) * 100;
  })();
  return (
    <div>
      <div className="relative mx-3 h-px bg-line">
        <div className="absolute left-0 top-0 h-[2px] -translate-y-px bg-gold-400 transition-[width] duration-700" style={{ width: `${at}%` }} />
        {RANKS.map((r, i) => (
          <span key={r.name} className={`absolute top-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-[2px] border ${xp >= r.min ? 'border-gold-400 bg-gold-400' : 'border-line bg-ground'}`} style={{ left: `${(i / (RANKS.length - 1)) * 100}%` }} />
        ))}
      </div>
      <div className="mt-3 flex justify-between">
        {RANKS.map((r, i) => {
          const Icon = Icons[r.icon] || Target;
          const reached = xp >= r.min;
          return (
            <div key={r.name} className={`flex w-6 flex-col ${i === 0 ? 'items-start' : i === RANKS.length - 1 ? 'items-end' : 'items-center'}`}>
              <Icon className={`h-4 w-4 ${reached ? 'text-gold-400' : 'text-mut/60'}`} />
              <span className={`mt-1 whitespace-nowrap text-[11px] ${reached ? 'text-ink' : 'text-mut'}`}>{r.name}</span>
              <span className="whitespace-nowrap font-mono text-[9.5px] tabular-nums text-mut">{r.min.toLocaleString()} XP</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Line({ label, value, sub, tone = '' }) {
  return (
    <div className="grid flex-1 grid-cols-[1fr_auto] items-center gap-x-4 px-5 py-3">
      <div className="min-w-0"><div className="label">{label}</div>{sub && <div className={`mt-1 truncate text-[11px] ${tone || 'text-mut'}`}>{sub}</div>}</div>
      <div className="figure text-right text-xl font-medium leading-none tracking-tight text-ink">{value}</div>
    </div>
  );
}

function Message({ msg }) {
  if (!msg) return null;
  const ok = msg.type === 'ok';
  const Icon = ok ? Check : Warning;
  return (
    <div role="status" className="relative flex items-start gap-2.5 overflow-hidden rounded-xl border border-line bg-paper py-2.5 pl-4 pr-4 text-[13px] text-ink">
      <span className={`absolute inset-y-0 left-0 w-[2px] ${ok ? 'bg-hood-500' : 'bg-down'}`} />
      <Icon className={`mt-0.5 h-3.5 w-3.5 shrink-0 ${ok ? 'text-hood-500' : 'text-down'}`} />{msg.text}
    </div>
  );
}

/** The board itself, from the payload of /api/missions. */
export function MissionsBoard({ data, busy = null, msg = null, onComplete = () => {}, onClaim = () => {} }) {
  const claimableEth = (data.claimable || []).find((c) => isNative(c.token));
  const xp = data.totalXp || 0;
  const rank = rankForXp(xp);
  const RankIcon = Icons[rank.icon] || Target;
  const missions = data.missions || [];

  return (
    <div className="space-y-3">
      <Message msg={msg} />

      <div className="grid gap-3 lg:grid-cols-12">
        <section className="frame p-5 sm:p-6 lg:col-span-7">
          <div className="flex items-start justify-between gap-4">
            <span className="label flex items-center gap-1.5 text-gold-600"><RankIcon className="h-4 w-4" />Level {rank.level} · {rank.name}</span>
            <span className="label">{rank.next ? `${rank.toNext.toLocaleString()} XP to ${rank.next.name}` : 'Top rank'}</span>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="figure text-6xl font-medium leading-[0.9] tracking-tight text-ink">{xp.toLocaleString()}</span>
            <span className="font-mono text-xs text-mut">XP</span>
          </div>
          <div className="mt-7"><Ladder xp={xp} /></div>
        </section>

        <section className="frame flex flex-col divide-y divide-line lg:col-span-5">
          <Line label={`${TOKEN} held`} value={data.tokenBalance == null ? '-' : Math.floor(data.tokenBalance).toLocaleString()} sub={data.eligible ? 'eligible for missions' : `${Number(data.minHold || 0).toLocaleString()} needed to take part`} tone={data.eligible ? 'text-hood-600' : 'text-gold-600'} />
          <Line label="Holding for" value={sinceLabel(data.firstSeen)} sub={`${data.missionsDone || 0} of ${data.totalMissions || 0} missions done`} />
          <div className="grid flex-1 grid-cols-[1fr_auto] items-center gap-x-4 px-5 py-3">
            <div className="min-w-0">
              <div className="label">Claimable</div>
              <div className="mt-1.5 flex items-center gap-1.5">
                <StockLogo address={ZERO} size="h-5 w-5" text="text-[6px]" />
                <span className={`figure text-xl font-medium leading-none tracking-tight ${claimableEth ? 'text-hood-500' : 'text-ink'}`}>{claimableEth ? rewardLabel(claimableEth.amount, claimableEth.token) : '0.0000 ETH'}</span>
              </div>
              <div className="mt-1 text-[11px] text-mut">{claimableEth ? `${claimableEth.count} reward${Number(claimableEth.count) === 1 ? '' : 's'}, paid after you sign` : 'complete a mission to earn one'}</div>
            </div>
            <button type="button" onClick={onClaim} disabled={!claimableEth || busy !== null} className="btn-primary !px-4 !py-2 text-[13px] disabled:opacity-40">{busy === 'claim' ? 'Signing…' : 'Claim'}{busy !== 'claim' && <Arrow className="h-3.5 w-3.5" />}</button>
          </div>
        </section>
      </div>

      {/* Missions are comparable: one ledger, one line each, the same columns all the way down. */}
      <section className="panel overflow-hidden">
        <div className="hidden grid-cols-[minmax(0,1fr)_9rem_4rem_8rem_6.5rem] items-center gap-4 border-b border-line px-5 py-2.5 md:grid">
          <span className="label">Mission</span><span className="label">Progress</span><span className="label text-right">XP</span><span className="label text-right">Reward</span><span className="label text-right">Status</span>
        </div>
        <div className="divide-y divide-line/70">
          {missions.length === 0 && <p className="px-5 py-6 text-sm text-mut">No mission is open right now.</p>}
          {missions.map((m) => {
            const stage = stageOf(m.status);
            const Icon = TYPE_ICONS[m.type] || Target;
            return (
              <div key={m.id} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-2.5 px-5 py-3.5 transition-colors hover:bg-tile/40 md:grid-cols-[minmax(0,1fr)_9rem_4rem_8rem_6.5rem]">
                <div className="flex min-w-0 items-start gap-3">
                  <Icon className={`mt-0.5 h-5 w-5 shrink-0 ${stage > 0 ? 'text-hood-500' : 'text-mut'}`} />
                  <div className="min-w-0">
                    <div className="text-sm text-ink">{m.title}</div>
                    <div className="text-xs leading-snug text-mut">{m.description}</div>
                  </div>
                </div>
                <div className="col-span-2 row-start-2 md:col-span-1 md:row-start-auto">
                  <div className="flex gap-[3px]" role="img" aria-label={stage ? `${STAGES[stage - 1]}, step ${stage} of 3` : 'Not started'}>
                    {STAGES.map((s, i) => <span key={s} className={`h-[3px] flex-1 rounded-[1px] ${i < stage ? (stage === 3 ? 'bg-hood-500' : 'bg-gold-400') : 'bg-line'}`} />)}
                  </div>
                  <div className="mt-1.5 font-mono text-[9.5px] uppercase tracking-[0.12em] text-mut">{stage ? STAGES[stage - 1] : 'Not started'}</div>
                </div>
                <div className="hidden text-right font-mono text-xs tabular-nums text-gold-600 md:block">+{m.xp}</div>
                <div className="hidden justify-end md:flex"><Reward amount={m.rewardAmount} token={m.rewardToken} className="text-ink" /></div>
                <div className="col-start-2 row-start-1 flex flex-col items-end gap-1 md:col-start-auto md:row-start-auto">
                  {stage >= 2 ? (
                    <span className={`inline-flex items-center gap-1 font-mono text-[10.5px] uppercase tracking-[0.12em] ${stage === 3 ? 'text-hood-600' : 'text-gold-600'}`}>{stage === 3 && <Check className="h-3 w-3" />}{stage === 3 ? 'Paid' : 'Claiming'}</span>
                  ) : stage === 1 ? (
                    <span className="font-mono text-[10.5px] uppercase tracking-[0.12em] text-gold-600">Earned</span>
                  ) : (
                    <button type="button" onClick={() => onComplete(m.id)} disabled={!data.eligible || busy !== null} className="btn-ghost !px-3 !py-1.5 text-xs disabled:cursor-not-allowed disabled:opacity-40">{busy === m.id ? 'Checking…' : 'Verify'}</button>
                  )}
                  <span className="flex items-center gap-2 md:hidden"><span className="font-mono text-[10.5px] tabular-nums text-gold-600">+{m.xp} XP</span><Reward amount={m.rewardAmount} token={m.rewardToken} className="!text-[10.5px] text-ink" /></span>
                </div>
              </div>
            );
          })}
        </div>
        <div className="border-t border-line px-5 py-2.5 text-[11px] text-mut">Rewards are paid from the {BRAND} treasury after you claim. On-chain missions only.</div>
      </section>
    </div>
  );
}

export default function MissionsDashboard() {
  const wallet = useWallet();
  const addr = wallet.address;
  const [data, setData] = useState(null);
  const [busy, setBusy] = useState(null);
  const [msg, setMsg] = useState(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch(addr ? `/api/missions?wallet=${addr}` : '/api/missions', { cache: 'no-store' });
      setData(await res.json());
    } catch {
      setData({ missions: [] });
    }
  }, [addr]);

  useEffect(() => { load(); }, [load]);

  async function complete(missionId) {
    setBusy(missionId);
    setMsg(null);
    try {
      const res = await fetch('/api/missions/complete', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ missionId, wallet: addr }) });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || 'Failed');
      setMsg({ type: 'ok', text: 'Mission complete: XP and reward credited' });
      await load();
    } catch (e) {
      setMsg({ type: 'err', text: e.message });
    } finally {
      setBusy(null);
    }
  }

  async function claim() {
    if (!addr) return;
    setBusy('claim');
    setMsg(null);
    try {
      const signature = await wallet.signMessage(claimMessage(addr));
      const res = await fetch('/api/missions/claim', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ wallet: addr, signature }) });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || 'Claim failed');
      setMsg({ type: 'ok', text: 'Claim submitted: rewards are on their way' });
      await load();
    } catch (e) {
      setMsg({ type: 'err', text: e.message });
    } finally {
      setBusy(null);
    }
  }

  if (!wallet.connected) {
    return (
      <section className="frame grid gap-px overflow-visible bg-line md:grid-cols-12">
        <div className="rounded-t-[9px] bg-paper p-6 md:col-span-7 md:rounded-l-[9px] md:rounded-tr-none">
          <div className="label">Missions</div>
          <h2 className="mt-3 font-display text-2xl font-medium leading-tight tracking-tight text-ink">Connect to start missions</h2>
          <p className="mt-2 max-w-md text-sm leading-relaxed text-mut">Hold at least <span className="font-mono text-ink">{data?.minHold?.toLocaleString() || '100,000'} {TOKEN}</span>, complete missions, earn XP, and claim rewards.</p>
          {wallet.error && <p className="mt-2 text-xs text-down">{wallet.error}</p>}
          <div className="mt-5"><ConnectButton wallet={wallet} /></div>
        </div>
        <div className="rounded-b-[9px] bg-paper p-6 md:col-span-5 md:rounded-r-[9px] md:rounded-bl-none">
          <div className="label mb-5">The ranks</div>
          <Ladder xp={0} />
        </div>
      </section>
    );
  }

  if (!data) return <div className="panel flex items-center gap-2.5 px-5 py-8" role="status"><span className="h-3.5 w-3.5 animate-spin rounded-full border border-line border-t-hood-500" /><span className="label">Loading your missions</span></div>;

  return <MissionsBoard data={data} busy={busy} msg={msg} onComplete={complete} onClaim={claim} />;
}
