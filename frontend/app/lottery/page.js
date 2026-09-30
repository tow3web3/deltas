'use client';

// The holders lottery: hold 1M+ of the project token for 2h, enter with your wallet, one draw a day
// for 0.5% of the creator fees. Selling after entering disqualifies.
//
// Laid out as a draw: the rules as a ruled list on the left, and on the right
// one instrument that carries the round (prize, clock) and, under a tear line,
// the ticket of the wallet looking at it.
import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import Navigation from '../../components/Navigation';
import TickerTape from '../../components/TickerTape';
import Footer from '../../components/Footer';
import StockLogo from '../../components/StockLogo';
import { ToastProvider, useToast, Button } from '../../components/app/ui';
import { useWallet } from '../../lib/useWallet';
import { signIn } from '../../lib/authClient';
import { explorerAddress, explorerTx } from '../../lib/stocks';
import { Arrow, Check, External, Refresh, Warning } from '../../components/Icons';
import PolicyMini from '../../components/PolicyMini';
import { TOKEN, TOKEN_CA } from '../../lib/brand';

const CA = TOKEN_CA;
const short = (a) => (a ? `${a.slice(0, 6)}…${a.slice(-4)}` : '');
const eth = (wei, d = 4) => (Number(wei || 0) / 1e18).toFixed(d);

function useCountdown(iso) {
  const [left, setLeft] = useState(null);
  useEffect(() => {
    if (!iso) return undefined;
    const t = () => setLeft(Math.max(0, new Date(iso).getTime() - Date.now()));
    t();
    const id = setInterval(t, 1000);
    return () => clearInterval(id);
  }, [iso]);
  if (left == null) return '--:--:--';
  const s = Math.ceil(left / 1000);
  return `${String(Math.floor(s / 3600)).padStart(2, '0')}:${String(Math.floor((s % 3600) / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}

export default function LotteryPage() {
  return <ToastProvider><Lottery /></ToastProvider>;
}

const RULES = [
  [`Hold at least 1,000,000 ${TOKEN}`, 'for more than 2 hours. Sending or selling resets your clock.'],
  ['Connect your wallet and enter', 'we check your balance and your holding time on chain, then you are in for this round.'],
  ['Keep holding until the draw', 'sell or send tokens out and your ticket is void. The winner is announced in the community group and here.'],
];

/** The tear line between the round and the ticket. */
function Tear() {
  return (
    <div className="relative h-4" aria-hidden="true">
      <span className="absolute -left-px top-0 h-4 w-[9px] overflow-hidden"><span className="absolute -left-2 top-0 h-4 w-4 rounded-full border border-line bg-ground" /></span>
      <span className="absolute -right-px top-0 h-4 w-[9px] overflow-hidden"><span className="absolute -right-2 top-0 h-4 w-4 rounded-full border border-line bg-ground" /></span>
      <span className="absolute inset-x-4 top-1/2 border-t border-dashed border-line" />
    </div>
  );
}

/** One check of the ticket: what is required, what the wallet has. */
function Proof({ label, value, need, ok }) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-2">
      <span className="label">{label}</span>
      <span className="text-right">
        <span className={`figure text-lg font-medium ${ok ? 'text-hood-600' : 'text-ink'}`}>{value}</span>
        {need && <span className="ml-2 text-[11px] text-mut">{need}</span>}
      </span>
    </div>
  );
}

function Lottery() {
  const [data, setData] = useState(null);
  const [dash, setDash] = useState(null);
  const [busy, setBusy] = useState(null);
  useEffect(() => {
    if (!CA) return undefined;
    let alive = true;
    fetch(`/api/dashboard/${CA}`, { cache: 'no-store' }).then((r) => (r.ok ? r.json() : null)).then((d) => alive && d && setDash(d)).catch(() => {});
    return () => { alive = false; };
  }, []);
  const wallet = useWallet();
  const toast = useToast();
  const load = useCallback(async () => {
    try { setData(await fetch('/api/lottery', { cache: 'no-store' }).then((r) => r.json())); } catch { /* keep the last state */ }
  }, []);
  useEffect(() => { load(); const id = setInterval(load, 30_000); return () => clearInterval(id); }, [load]);
  const draw = useCountdown(data?.round?.drawsAt);

  async function connect() {
    setBusy('connect');
    try {
      const addr = wallet.address || (await wallet.connect());
      if (!addr) throw new Error(wallet.error || 'No wallet found. Install MetaMask or Rabby, or open this page in your wallet browser.');
      await signIn(wallet, addr);
      toast(`Signed in as ${short(addr)}`);
      await load();
    } catch (e) { toast(e.message, 'err'); } finally { setBusy(null); }
  }
  async function enter() {
    setBusy('enter');
    try {
      const res = await fetch('/api/lottery/enter', { method: 'POST' });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || 'Could not enter');
      toast(d.already ? 'You are already in this round.' : 'You are in. Keep holding until the draw.');
      await load();
    } catch (e) { toast(e.message, 'err'); } finally { setBusy(null); }
  }

  const round = data?.round;
  const me = data?.me;
  const elig = me?.eligibility;
  const entered = Boolean(me?.entry && !me.entry.disqualified_at);
  const live = Boolean(CA);

  return (
    <main className="min-h-screen">
      <TickerTape />
      <Navigation />
      <div className="mx-auto max-w-6xl px-5 py-10 sm:py-14">
        <div className="grid gap-x-12 gap-y-10 lg:grid-cols-12 lg:items-start">
          <div className="lg:col-span-7">
            <div className="eyebrow">Holders lottery</div>
            <h1 className="mt-4 font-display text-4xl font-medium leading-[1.04] tracking-tight text-ink sm:text-[56px]">Win 0.5% of the creator fees of {TOKEN}. <span className="text-gradient">Forever.</span></h1>
            <p className="mt-5 max-w-xl text-base leading-relaxed text-mut">One draw every 24 hours, forever. One ticket per wallet. The prize is paid in <span className="inline-flex items-center gap-1 align-middle text-ink"><StockLogo address={null} size="h-4 w-4" />ETH</span> from the dev wallet, straight to the winner.</p>

            <ol className="mt-9 border-t border-line">
              {RULES.map(([t, b], i) => (
                <li key={t} className="grid grid-cols-[2.75rem_minmax(0,1fr)] gap-x-3 border-b border-line py-4 sm:grid-cols-[4rem_minmax(0,17rem)_minmax(0,1fr)] sm:items-baseline sm:gap-x-5">
                  <span className="figure text-2xl font-medium leading-none text-hood-500 sm:text-3xl">{String(i + 1).padStart(2, '0')}</span>
                  <span className="font-display text-lg font-medium leading-snug tracking-tight text-ink">{t}</span>
                  <span className="col-start-2 mt-1 text-sm leading-relaxed text-mut sm:col-start-3 sm:mt-0">{b}</span>
                </li>
              ))}
            </ol>
            {CA && <p className="mt-4 text-xs text-mut">{TOKEN} contract: <Link href={`/${CA}`} className="break-all font-mono text-hood-600 hover:text-hood-700">{CA}</Link></p>}
          </div>

          {/* The round and the ticket, one instrument */}
          <div className="frame lg:col-span-5">
            <div className="p-6 sm:p-7">
              {round ? (
                <>
                  <div className="label flex items-center justify-between gap-3">
                    <span className="flex items-center gap-1.5 text-hood-600"><span className="relative flex h-1.5 w-1.5"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-hood-500 opacity-60" /><span className="relative h-1.5 w-1.5 rounded-full bg-hood-500" /></span>Round #{round.id}</span>
                    <span>{round.entries} {round.entries === 1 ? 'ticket' : 'tickets'}</span>
                  </div>
                  <div className="label mt-6">Prize so far</div>
                  <div className="mt-2 flex items-center gap-3">
                    <StockLogo address={null} size="h-9 w-9" />
                    <span className="figure text-5xl font-medium leading-none tracking-tight text-ink">{eth(round.prizeWei)}</span>
                    <span className="self-end font-display text-lg text-mut">ETH</span>
                  </div>
                  <p className="mt-3 text-xs leading-relaxed text-mut">0.5% of {eth(round.feesWei)} ETH of creator fees this round{Number(round.carryWei) > 0 ? `, plus ${eth(round.carryWei)} ETH rolled over` : ''}. Grows until the draw.</p>
                  <div className="mt-6 flex items-end justify-between gap-4 border-t border-line pt-4">
                    <div>
                      <div className="label">Draw in</div>
                      <div className="figure mt-1.5 text-4xl font-medium leading-none tracking-tight text-hood-500">{draw}</div>
                    </div>
                    <div className="text-right font-mono text-[11px] text-mut">{new Date(round.drawsAt).toLocaleString()}</div>
                  </div>
                </>
              ) : (
                <>
                  <div className="label flex items-center justify-between gap-3">
                    <span className="flex items-center gap-1.5"><span className={`h-1.5 w-1.5 rounded-full ${data ? 'bg-gold-400' : 'animate-pulse bg-mut'}`} />{!data ? 'Reading the round' : live ? 'Between rounds' : 'Not live yet'}</span>
                    <span>0 tickets</span>
                  </div>
                  <div className="label mt-6">Prize</div>
                  <div className="mt-2 flex items-center gap-3">
                    <StockLogo address={null} size="h-9 w-9" />
                    <span className="figure text-5xl font-medium leading-none tracking-tight text-ink">0.5%</span>
                    <span className="self-end text-sm text-mut">of the creator fees</span>
                  </div>
                  <p className="mt-3 text-sm leading-relaxed text-mut">
                    {!data ? 'Loading the round…'
                      : live ? 'No round is open right now. The next one opens with the next cycle.'
                        : `The lottery starts when ${TOKEN} is live on Robinhood Chain. Its contract will be shown here, and the first round opens with the first cycle.`}
                  </p>
                  <div className="mt-6 flex items-end justify-between gap-4 border-t border-line pt-4">
                    <div>
                      <div className="label">Draw in</div>
                      <div className="figure mt-1.5 text-4xl font-medium leading-none tracking-tight text-mut">--:--:--</div>
                    </div>
                    <div className="text-right font-mono text-[11px] text-mut">every 24h</div>
                  </div>
                </>
              )}
            </div>

            <Tear />

            <div className="p-6 pt-4 sm:p-7 sm:pt-4">
              <div className="label">Your ticket</div>
              {!me ? (
                <>
                  <p className="mt-2 text-sm leading-relaxed text-mut">Connect the wallet that holds your {TOKEN}. A gasless signature proves it is yours.</p>
                  <Button className="mt-4" onClick={connect} busy={busy === 'connect'}>Connect wallet</Button>
                </>
              ) : (
                <>
                  <div className="mt-2 flex items-center justify-between gap-2">
                    <span className="font-mono text-sm text-ink">{short(me.wallet)}</span>
                    <a href={explorerAddress(me.wallet)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 font-mono text-[11px] text-mut transition-colors hover:text-ink">Blockscout<External className="h-3 w-3" /></a>
                  </div>
                  {elig && (
                    <div className="mt-3 divide-y divide-line border-y border-line">
                      <Proof label="Balance" value={Math.floor(elig.balance || 0).toLocaleString()} need={round?.minHold ? `of ${Number(round.minHold).toLocaleString()}` : null} ok={elig.balance >= (round?.minHold || 0)} />
                      <Proof label="Held for" value={elig.heldHours == null ? 'not indexed' : elig.heldHours < 1 ? `${Math.floor(elig.heldHours * 60)} min` : `${elig.heldHours.toFixed(1)}h`} need={round?.minHours ? `of ${round.minHours}h` : null} ok={elig.heldHours != null && elig.heldHours >= (round?.minHours || 0)} />
                    </div>
                  )}
                  {entered ? (
                    <div className="mt-4 flex items-start gap-2 text-sm font-semibold text-hood-600"><Check className="mt-0.5 h-4 w-4 shrink-0" /> You are in round #{round?.id}. Keep holding until the draw.</div>
                  ) : me.entry?.disqualified_at ? (
                    <div className="mt-4 flex items-start gap-2 text-sm text-red-600"><Warning className="mt-0.5 h-4 w-4 shrink-0" />Your ticket for this round is void: {me.entry.reason || 'tokens left the wallet'}.</div>
                  ) : elig?.ok ? (
                    <Button className="mt-4 w-full" onClick={enter} busy={busy === 'enter'}>Enter this round <Arrow className="h-4 w-4" /></Button>
                  ) : (
                    <div className="mt-4 space-y-1 border-l-2 border-gold-400 pl-3 text-sm text-gold-600">{(elig?.reasons || [round ? 'Checking…' : 'No round to enter yet.']).map((r) => <div key={r}>{r}</div>)}</div>
                  )}
                  {!entered && !elig?.ok && <button type="button" onClick={load} className="mt-3 inline-flex items-center gap-1.5 font-mono text-[11px] text-mut transition-colors hover:text-ink"><Refresh className="h-3 w-3" />Re-check</button>}
                </>
              )}
            </div>
          </div>
        </div>

        {dash && (
          <section className="mt-16">
            <div className="mb-4 grid gap-x-8 gap-y-3 lg:grid-cols-12 lg:items-end">
              <div className="lg:col-span-8">
                <h2 className="font-display text-2xl font-medium tracking-tight text-ink sm:text-3xl">Where the fees go, and where you come in</h2>
                <p className="mt-2 text-sm text-mut">The {TOKEN} routing as the creator drew it, plus the slice one holder takes home every day. Forever.</p>
              </div>
              <div className="label flex items-center gap-2 lg:col-span-4 lg:justify-end"><span className="h-2 w-2 rounded-[2px] bg-pink-600" /><span><span className="text-ink">You 0.5%</span> · every 24h · forever</span></div>
            </div>
            <PolicyMini
              source={dash.sourceToken}
              devWallet={dash.devWallet}
              schedule={dash.config.scheduleLabel}
              legs={[...(dash.legs || []), { kind: 'lottery', shareBps: 50, label: 'YOU', assetSymbol: 'ETH', dest: 'one holder wins, every 24h, forever', chip: 'in ETH', featured: true }]}
              split={dash.config.split}
              countdown={{ intervalMinutes: dash.config.intervalMinutes, scheduleKind: dash.config.scheduleKind, active: dash.config.isActive }}
            />
          </section>
        )}

        <section className="mt-16">
          <div className="flex items-baseline justify-between gap-4">
            <h2 className="font-display text-2xl font-medium tracking-tight text-ink">Past draws</h2>
            <span className="label">{data?.past?.length ? `${data.past.length} drawn` : 'none drawn'}</span>
          </div>
          <div className="panel mt-4 overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="label text-left [&>th]:px-5 [&>th]:py-2.5 [&>th]:font-medium">
                  <th>Round</th><th>Drawn</th><th>Winner</th><th className="text-right">Prize</th><th className="text-right">Tickets</th><th className="text-right">Payout</th>
                </tr>
              </thead>
              <tbody>
                {data?.past?.length ? data.past.map((r) => (
                  <tr key={r.id} className="border-t border-line transition-colors hover:bg-tile/40 [&>td]:px-5 [&>td]:py-2.5">
                    <td className="font-mono text-xs text-ink">#{r.id}</td>
                    <td className="text-xs text-mut">{new Date(r.drawn_at || r.draws_at).toLocaleString()}</td>
                    <td>{r.winner ? <a href={explorerAddress(r.winner)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 font-mono text-xs text-hood-600 hover:text-hood-700">{short(r.winner)}<External className="h-3 w-3" /></a> : <span className="text-xs text-mut">no eligible entry, rolled over</span>}</td>
                    <td className="text-right"><span className="inline-flex items-center gap-1.5"><StockLogo address={null} size="h-4 w-4" /><span className="figure font-medium text-ink">{eth(r.prize_wei)} ETH</span></span></td>
                    <td className="figure text-right text-xs text-mut">{r.eligible_count ?? 0} / {r.entries_count ?? 0}</td>
                    <td className="text-right font-mono text-xs">{r.tx_hash ? <a href={explorerTx(r.tx_hash)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-hood-600 hover:text-hood-700">paid<External className="h-3 w-3" /></a> : r.status === 'won' ? <span className="text-gold-400">paying at the next cycle</span> : <span className="text-mut">none</span>}</td>
                  </tr>
                )) : (
                  <>
                    {[0, 1].map((i) => (
                      <tr key={i} aria-hidden="true" className="border-t border-line [&>td]:px-5 [&>td]:py-3.5">
                        <td><span className="block h-1.5 w-8 rounded-full bg-tile" /></td>
                        <td><span className="block h-1.5 w-24 rounded-full bg-tile" /></td>
                        <td><span className="block h-1.5 w-20 rounded-full bg-tile" /></td>
                        <td><span className="ml-auto block h-1.5 w-16 rounded-full bg-tile" /></td>
                        <td><span className="ml-auto block h-1.5 w-8 rounded-full bg-tile" /></td>
                        <td><span className="ml-auto block h-1.5 w-10 rounded-full bg-tile" /></td>
                      </tr>
                    ))}
                    <tr className="border-t border-line"><td colSpan={6} className="px-5 py-4 text-sm text-mut">No draw yet. The first one is coming.</td></tr>
                  </>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
      <Footer />
    </main>
  );
}
