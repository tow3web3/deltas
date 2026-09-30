'use client';

import { useEffect, useState, useCallback } from 'react';
import { voteMessage } from '../../lib/voteMessage';
import { useWallet, ConnectButton } from '../../lib/useWallet';
import StockLogo from '../StockLogo';
import { Check, Warning, Clock } from '../Icons';
import { describeAddress } from '../../lib/stocks';
import { BRAND } from '../../lib/brand';

const compact = (n) => new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 }).format(n || 0);

function timeLeft(endsAt) {
  const ms = new Date(endsAt).getTime() - Date.now();
  if (ms <= 0) return 'ended';
  const h = Math.floor(ms / 3.6e6);
  const m = Math.floor((ms % 3.6e6) / 6e4);
  const s = Math.floor((ms % 6e4) / 1000);
  return h > 0 ? `${h}h ${m}m` : m > 0 ? `${m}m ${s}s` : `${s}s`;
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

/**
 * One ballot: the coin, the time left, and the candidates as lines of a table,
 * each with its share of the vote. The line that leads is set larger.
 */
export function Ballot({ e, data, ended, busy = null, onVote = () => {} }) {
  // The candidates keep the order of the ballot, so a line never moves under the pointer while votes come in.
  const options = data?.options || [];
  const voters = options.reduce((s, o) => s + (Number(o.voters) || 0), 0);
  const best = options.reduce((m, o) => Math.max(m, o.share || 0), 0);
  const leaderId = best > 0 ? options.find((o) => (o.share || 0) === best)?.id : null;

  return (
    <section className="frame">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-3.5">
        <div className="flex min-w-0 items-center gap-3">
          <StockLogo address={e.token} meta={{ symbol: e.symbol, image: e.image }} size="h-9 w-9" />
          <div className="min-w-0">
            <div className="truncate font-display text-base font-medium leading-tight tracking-tight text-ink">{e.name || `$${e.symbol || e.token.slice(2, 6)}`}</div>
            <div className="font-mono text-[10.5px] text-mut">your weight {compact(Number(e.weight) / 1e18)}{data ? ` · ${voters} voter${voters === 1 ? '' : 's'}` : ''}</div>
          </div>
        </div>
        <div className="text-right">
          <div className={`label flex items-center justify-end gap-1.5 ${ended ? '' : 'text-hood-600'}`}><Clock className="h-3.5 w-3.5" />{ended ? 'Resolving' : 'Closes in'}</div>
          {!ended && <div className="figure mt-0.5 text-lg leading-none text-ink">{timeLeft(e.endsAt)}</div>}
        </div>
      </header>

      {!data ? (
        <div className="flex items-center gap-2.5 px-5 py-6" role="status"><span className="h-3 w-3 animate-spin rounded-full border border-line border-t-hood-500" /><span className="label">Loading the candidates</span></div>
      ) : (
        <div className="divide-y divide-line/70">
          {options.map((o, i) => {
            const isVoted = e.votedOptionId === o.id;
            const pct = Math.round((o.share || 0) * 100);
            const d = describeAddress(o.token, { symbol: o.symbol, name: o.name, image: o.image });
            const lead = o.id === leaderId;
            return (
              <div key={o.id} className={`relative grid grid-cols-[1.25rem_auto_minmax(0,1fr)_auto] items-center gap-x-3 px-5 transition-colors sm:grid-cols-[1.25rem_auto_minmax(0,11rem)_minmax(0,1fr)_3.5rem_auto] ${lead ? 'py-4' : 'py-2.5'} ${isVoted ? 'bg-hood-50' : 'hover:bg-tile/40'}`}>
                {isVoted && <span className="absolute inset-y-0 left-0 w-[2px] bg-hood-500" />}
                <span className="font-mono text-[10.5px] tabular-nums text-mut">{String(i + 1).padStart(2, '0')}</span>
                <StockLogo address={o.token} meta={{ symbol: o.symbol, image: o.image }} size={lead ? 'h-9 w-9' : 'h-7 w-7'} text="text-[8px]" />
                <div className="min-w-0">
                  <div className={`font-mono text-ink ${lead ? 'text-[15px] font-semibold' : 'text-[13px]'}`}>{d.symbol}{lead && <span className="label ml-2 !text-[9px] text-hood-600">leading</span>}</div>
                  <div className="truncate text-[11px] text-mut">{d.name} · {o.voters} voter{Number(o.voters) === 1 ? '' : 's'}</div>
                </div>
                <div className="col-span-3 col-start-2 row-start-2 mt-2 h-[3px] overflow-hidden rounded-[1px] bg-line sm:col-span-1 sm:col-start-auto sm:row-start-auto sm:mt-0">
                  <div className={`h-full transition-[width] duration-500 ${lead || isVoted ? 'bg-hood-500' : 'bg-mut'}`} style={{ width: `${pct}%` }} />
                </div>
                <div className={`figure hidden text-right leading-none tracking-tight text-ink sm:block ${lead ? 'text-2xl font-medium' : 'text-sm'}`}>{pct}<span className="ml-px text-[10px] text-mut">%</span></div>
                <div className="col-start-4 row-start-1 flex items-center gap-2 sm:col-start-auto sm:row-start-auto">
                  <span className="figure text-sm text-ink sm:hidden">{pct}%</span>
                  <button
                    type="button"
                    onClick={() => onVote(e.token, e.cycleId, o.id)}
                    disabled={ended || busy !== null}
                    aria-pressed={isVoted}
                    className={`inline-flex w-[4.75rem] items-center justify-center gap-1 rounded-xl py-1.5 text-xs font-semibold outline-none transition-colors focus-visible:ring-1 focus-visible:ring-hood-500 focus-visible:ring-offset-2 focus-visible:ring-offset-paper disabled:cursor-not-allowed disabled:opacity-50 ${isVoted ? 'bg-hood-500 text-coal' : 'border border-line text-ink hover:border-hood-400'}`}
                  >
                    {busy === o.id ? 'Signing…' : isVoted ? <><Check className="h-3 w-3" />Voted</> : 'Vote'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
      {data && <footer className="border-t border-line px-5 py-2.5 text-[11px] text-mut">The winner becomes the next dividend for every holder.</footer>}
    </section>
  );
}

export default function VoteDashboard() {
  const wallet = useWallet();
  const addr = wallet.address;

  const [eligible, setEligible] = useState(null);
  const [cycles, setCycles] = useState({});
  const [now, setNow] = useState(Date.now());
  const [busy, setBusy] = useState(null);
  const [msg, setMsg] = useState(null);

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const loadEligibility = useCallback(async () => {
    if (!addr) return;
    try {
      const res = await fetch(`/api/vote/eligibility?wallet=${addr}`, { cache: 'no-store' });
      const data = await res.json();
      setEligible(data.eligible || []);
    } catch {
      setEligible([]);
    }
  }, [addr]);

  const loadCycle = useCallback(async (token) => {
    try {
      const res = await fetch(`/api/vote/cycle/${token}`, { cache: 'no-store' });
      if (!res.ok) return;
      const data = await res.json();
      setCycles((prev) => ({ ...prev, [token]: data }));
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    if (wallet.connected && addr) loadEligibility();
    else setEligible(null);
  }, [wallet.connected, addr, loadEligibility]);

  useEffect(() => {
    if (!eligible?.length) return;
    eligible.forEach((e) => loadCycle(e.token));
    const t = setInterval(() => eligible.forEach((e) => loadCycle(e.token)), 10000);
    return () => clearInterval(t);
  }, [eligible, loadCycle]);

  async function vote(token, cycleId, optionId) {
    if (!addr) return;
    setBusy(optionId);
    setMsg(null);
    try {
      const message = voteMessage({ cycleId, optionId, wallet: addr });
      const signature = await wallet.signMessage(message);
      const res = await fetch('/api/vote/cast', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token, optionId, wallet: addr, signature }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Vote failed');
      setMsg({ type: 'ok', text: 'Vote recorded' });
      await loadCycle(token);
      await loadEligibility();
    } catch (e) {
      setMsg({ type: 'err', text: e.message });
    } finally {
      setBusy(null);
    }
  }

  if (!wallet.connected) {
    return (
      <section className="frame">
        <div className="flex items-center justify-between gap-3 border-b border-line px-5 py-2.5">
          <span className="label">Your ballots</span>
          <span className="label flex items-center gap-1.5"><span className="h-1 w-1 rounded-full bg-mut" />no wallet connected</span>
        </div>
        <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-5 p-5 sm:p-6">
          <div className="max-w-md">
            <h2 className="font-display text-2xl font-medium leading-tight tracking-tight text-ink">Connect to vote</h2>
            <p className="mt-2 text-sm leading-relaxed text-mut">Connect your Robinhood Chain wallet to see the {BRAND} tokens you hold and vote on their next dividend. Voting is gasless: you only sign a message.</p>
            {wallet.error && <p className="mt-2 text-xs text-down">{wallet.error}</p>}
          </div>
          <ConnectButton wallet={wallet} />
        </div>
      </section>
    );
  }

  if (eligible === null) return <div className="panel flex items-center gap-2.5 px-5 py-8" role="status"><span className="h-3.5 w-3.5 animate-spin rounded-full border border-line border-t-hood-500" /><span className="label">Checking your holdings</span></div>;

  if (eligible.length === 0) {
    return (
      <div className="panel flex flex-wrap items-center justify-between gap-4 px-5 py-5">
        <div className="max-w-lg">
          <div className="label">Your ballots</div>
          <p className="mt-2 text-[15px] text-ink">No open vote for your wallet</p>
          <p className="mt-1 text-xs leading-snug text-mut">You do not hold a token with an active Community Vote (at the last snapshot). Hold a vote-enabled {BRAND} token to take part.</p>
        </div>
        <ConnectButton wallet={wallet} className="!py-2 text-xs" />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <span className="label">Your ballots · {eligible.length}</span>
        <ConnectButton wallet={wallet} className="!px-3 !py-1.5 text-xs" />
      </div>
      <Message msg={msg} />
      {eligible.map((e) => <Ballot key={e.token} e={e} data={cycles[e.token]} ended={new Date(e.endsAt).getTime() <= now} busy={busy} onVote={vote} />)}
    </div>
  );
}
