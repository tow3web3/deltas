'use client';

import { useEffect, useState } from 'react';
import StockLogo from '../StockLogo';
import { getStock } from '../../lib/stocks';

function timeLeft(endsAt) {
  const ms = new Date(endsAt).getTime() - Date.now();
  if (ms <= 0) return 'resolving…';
  const h = Math.floor(ms / 3.6e6);
  const m = Math.floor((ms % 3.6e6) / 6e4);
  const s = Math.floor((ms % 6e4) / 1000);
  return h > 0 ? `${h}h ${m}m` : m > 0 ? `${m}m ${s}s` : `${s}s`;
}

/** The votes open right now, as one board: coin, who leads and by how much, voters, time left. */
export function VoteBoard({ votes }) {
  return (
    <section className="panel mb-3 overflow-hidden">
      <header className="flex items-center justify-between gap-3 border-b border-line px-5 py-2.5">
        <span className="label flex items-center gap-2 text-gold-600">
          <span className="relative flex h-1.5 w-1.5"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-gold-400 opacity-60" /><span className="relative h-1.5 w-1.5 rounded-full bg-gold-400" /></span>
          Live votes
        </span>
        <span className="label">{votes.length} open</span>
      </header>
      <div className="hidden grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)_4.5rem_5.5rem] gap-4 border-b border-line/70 px-5 py-2 sm:grid">
        <span className="label !text-[9.5px]">Coin</span><span className="label !text-[9.5px]">Leading</span><span className="label text-right !text-[9.5px]">Voters</span><span className="label text-right !text-[9.5px]">Closes in</span>
      </div>
      <div className="divide-y divide-line/70">
        {votes.map((v) => {
          const pct = v.leader ? Math.round(v.leader.share * 100) : 0;
          // The leader is a stock most of the time: its logo is found by its ticker when the API sends no address.
          const leaderAddress = v.leader ? v.leader.token || v.leader.address || getStock(v.leader.symbol)?.address || null : null;
          return (
            <div key={v.cycleId} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-2 px-5 py-2.5 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)_4.5rem_5.5rem]">
              <div className="flex min-w-0 items-center gap-2.5">
                <StockLogo address={v.token} meta={{ symbol: v.symbol, image: v.image }} size="h-6 w-6" text="text-[7px]" />
                <span className="truncate font-mono text-[13px] text-ink">${v.symbol || v.token.slice(2, 6)}</span>
              </div>
              <div className="col-span-2 row-start-2 flex min-w-0 items-center gap-2.5 sm:col-span-1 sm:row-start-auto">
                {v.leader ? (
                  <>
                    {leaderAddress ? <StockLogo address={leaderAddress} meta={{ symbol: v.leader.symbol, image: v.leader.image }} size="h-5 w-5" text="text-[6px]" /> : null}
                    <span className="w-12 shrink-0 font-mono text-xs text-ink">{v.leader.symbol || '?'}</span>
                    <span className="h-[3px] min-w-0 flex-1 overflow-hidden rounded-[1px] bg-line"><span className="block h-full bg-gold-400 transition-[width] duration-500" style={{ width: `${pct}%` }} /></span>
                    <span className="figure w-9 shrink-0 text-right text-xs text-ink">{pct}%</span>
                  </>
                ) : <span className="text-xs text-mut">no votes yet</span>}
              </div>
              <span className="hidden text-right font-mono text-xs tabular-nums text-mut sm:block">{v.voters}</span>
              <span className="col-start-2 row-start-1 text-right font-mono text-xs tabular-nums text-ink sm:col-start-auto sm:row-start-auto">{timeLeft(v.endsAt)}</span>
            </div>
          );
        })}
      </div>
    </section>
  );
}

export default function LiveVotes() {
  const [votes, setVotes] = useState(null);
  const [, setNow] = useState(Date.now());

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch('/api/vote/active', { cache: 'no-store' });
        const data = await res.json();
        if (!cancelled) setVotes(data.votes || []);
      } catch {
        if (!cancelled) setVotes([]);
      }
    }
    load();
    const poll = setInterval(load, 10000);
    const tick = setInterval(() => setNow(Date.now()), 1000);
    return () => { cancelled = true; clearInterval(poll); clearInterval(tick); };
  }, []);

  if (!votes || votes.length === 0) return null;

  return <VoteBoard votes={votes} />;
}
