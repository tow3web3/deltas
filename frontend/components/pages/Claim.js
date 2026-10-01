'use client';

// Claim a page by connecting it: one click on a platform opens its sign-in,
// the pages of that account come back with what waits for them, and one
// signature from the wallet that should be paid sends it. A domain has no
// sign-in, so it connects with a DNS record. Nothing here costs gas.
import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Arrow, Check, Copy, PlatformIcon } from '../Icons';
import StockLogo from '../StockLogo';
import { PageAvatar, ClaimBadge, fmtUsd, fmtAmount, shortAddr, ago } from './PageParts';
import { useWallet } from '../../lib/useWallet';
import { useSolWallet, NO_SOL_WALLET } from '../../lib/useSolWallet';
import { CHAINS } from '../../lib/chains';
import { PLATFORMS, PLATFORM_KEYS, normalizeHandle, pageName, pagePath, pageAvatar } from '../../lib/pages';
import { claimMessage } from '../../lib/claimMessage';
import { BRAND } from '../../lib/brand';

// A text field in glass: a pill that lights its edge when it has the focus.
const FIELD = 'min-w-0 flex-1 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2.5 text-sm text-ink outline-none transition placeholder:text-dim focus:border-cyan-500/60 focus:bg-white/[0.06]';

function Step({ n, title, done, children }) {
  return (
    <section className={`${done ? 'frame' : 'panel'} relative overflow-hidden p-5 sm:p-6`}>
      <div className="flex items-center gap-3.5">
        <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full font-mono text-xs font-medium ${done ? 'beam text-coal shadow-beam' : 'border border-white/15 bg-white/5 text-ink'}`}>{done ? <Check className="h-3.5 w-3.5" /> : n}</span>
        <h2 className="font-display text-[19px] font-medium leading-tight tracking-[-0.02em] text-ink sm:text-[22px]">{title}</h2>
      </div>
      <div className="mt-5">{children}</div>
    </section>
  );
}

function CopyLine({ label, value }) {
  const [ok, setOk] = useState(false);
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.03] px-3.5 py-2.5">
      <span className="label w-12 shrink-0">{label}</span>
      <code className="min-w-0 flex-1 break-all font-mono text-xs text-ink">{value}</code>
      <button type="button" onClick={async () => { try { await navigator.clipboard.writeText(value); setOk(true); setTimeout(() => setOk(false), 1200); } catch { /* clipboard unavailable */ } }} className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-mut transition hover:bg-white/5 hover:text-ink" aria-label={`Copy ${label}`}>
        {ok ? <Check className="h-4 w-4 text-cyan-500" /> : <Copy className="h-4 w-4" />}
      </button>
    </div>
  );
}

/**
 * What a connected page has to claim, said plainly: the amount waiting in its
 * vault with every asset, or that nothing waits and why. The answer comes before
 * the button, so nobody signs to find out.
 */
// What waits for the owner across both vaults: the assets of every chain not claimed yet.
const assetChain = (a) => a.chain || 'robinhood';
const owedOf = (p) => (p.vaultAssets || []).filter((a) => !p.claimedOn?.[assetChain(a)]).reduce((t, a) => t + (a.usd || 0), 0);

/** Which wallet gets paid: one on Solana, or one on Robinhood Chain. Each chain has its own vault. */
function ChainSwitch({ chain, onChange }) {
  const pill = (on) => `inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-[13px] font-medium transition-colors ${on ? 'border-cyan-500/60 bg-white/[0.08] text-ink shadow-glow' : 'border-white/10 bg-white/[0.03] text-mut hover:border-white/25 hover:text-ink'}`;
  return (
    <div className="mb-4 flex flex-wrap items-center gap-2">
      <span className="label mr-1">Paid on</span>
      {[['solana', '/sol.png', 'Phantom, Solflare, Backpack'], ['robinhood', '/eth.svg', 'MetaMask, Rabby']].map(([k, logo, hint]) => (
        <button key={k} type="button" onClick={() => onChange(k)} className={pill(chain === k)} title={hint}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={logo} alt="" className="h-4 w-4 rounded-full" />{CHAINS[k].label}
        </button>
      ))}
    </div>
  );
}

function Result({ p, busy, wallet, chain, onClaim, onSwitch }) {
  // This chain's vault and claim; the other chain is mentioned when something waits there.
  const assets = (p.vaultAssets || []).filter((a) => assetChain(a) === chain);
  const vaultUsd = assets.reduce((t, a) => t + (a.usd || 0), 0);
  const claimedWallet = p.claimedOn?.[chain] || null;
  const claimed = Boolean(claimedWallet);
  const other = chain === 'solana' ? 'robinhood' : 'solana';
  const otherUsd = p.claimedOn?.[other] ? 0 : (p.vaultAssets || []).filter((a) => assetChain(a) === other).reduce((t, a) => t + (a.usd || 0), 0);
  const has = !claimed && vaultUsd > 0;
  const working = busy === `${p.platform}:${p.handle}`;
  return (
    <li className={`relative overflow-hidden rounded-2xl border ${has ? 'border-cyan-500/40 bg-white/[0.05] shadow-glow' : 'border-white/10 bg-white/[0.025]'}`}>
      {has && <span aria-hidden="true" className="pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full bg-[radial-gradient(circle,rgba(47,168,255,0.28),transparent_65%)] blur-2xl" />}
      {has && <span aria-hidden="true" className="beam pointer-events-none absolute inset-x-0 top-0 h-px" />}
      <div className="relative flex flex-wrap items-center gap-3.5 px-5 pt-5">
        <PageAvatar page={p} size="h-12 w-12" badge="h-5 w-5" lit={has} />
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 items-center gap-2"><span className="truncate text-[16px] font-medium text-ink">{p.name}</span>{p.exists && <ClaimBadge claimed={p.claimed} />}</div>
          <div className="label mt-1 !text-[10px]">{PLATFORMS[p.platform]?.label} {PLATFORMS[p.platform]?.noun} · connected</div>
        </div>
        {p.exists && <Link href={p.path} target="_blank" className="label !text-[10px] transition-colors hover:!text-ink">public profile ↗</Link>}
      </div>

      <div className="relative grid gap-x-8 gap-y-4 px-5 py-5 sm:grid-cols-[auto_1fr] sm:items-end">
        <div>
          <div className="label">{claimed ? 'In the vault since your claim' : `Waiting for you on ${CHAINS[chain].label}`}</div>
          <div className={`figure mt-2 pb-1 text-[52px] font-medium leading-none tracking-[-0.035em] ${has || (claimed && vaultUsd > 0) ? 'text-beam' : 'text-ink'}`}>{fmtUsd(vaultUsd)}</div>
        </div>
        <div className="text-sm leading-relaxed text-mut">
          {claimed ? <>This page is claimed on {CHAINS[chain].label}: its fees there go straight to <span className="font-mono text-ink">{shortAddr(claimedWallet)}</span>. {fmtUsd(p.paidToOwnerUsd)} paid so far. Sign again to send them to another wallet.</>
            : has ? <>Held in the vault of this page, from {p.payments} payment{p.payments === 1 ? '' : 's'}{p.lastAt ? `, the last one ${ago(p.lastAt)}` : ''}. Claiming sends all of it to your wallet, and every later payment reaches it directly.</>
              : p.exists && p.coins > 0 ? <>{p.coins} coin{p.coins === 1 ? ' routes' : 's route'} fees to this page, and the first payment has not run yet. Claim now: it will land in your wallet.</>
                : p.exists ? <>No coin routes fees to this page at the moment, and its vault is empty.</>
                  : <>No coin has routed fees to this page yet. You can still claim it ahead: the day one does, the fees come straight to your wallet.</>}
        </div>
      </div>

      {otherUsd > 0 && (
        <div className="relative flex flex-wrap items-center justify-between gap-2 border-t border-white/10 px-5 py-3 text-xs text-mut">
          <span>Also <span className="figure text-ink">{fmtUsd(otherUsd)}</span> waiting in the {CHAINS[other].label} vault of this page.</span>
          <button type="button" onClick={() => onSwitch(other)} className="font-medium text-cyan-500 hover:underline">Claim it with a {CHAINS[other].label} wallet</button>
        </div>
      )}

      {assets.length > 0 && (
        <ul className="relative grid gap-2 border-t border-white/10 px-5 py-4 sm:grid-cols-2">
          {assets.map((a, i) => (
            <li key={`${assetChain(a)}-${a.address}`} className={`flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/5 px-3.5 py-2.5 ${assets.length % 2 && i === assets.length - 1 ? 'sm:col-span-2' : ''}`}>
              <span className="flex min-w-0 items-center gap-2"><StockLogo address={a.address} meta={{ symbol: a.symbol, image: a.image }} size="h-7 w-7" text="text-[8px]" /><span className="truncate font-mono text-xs font-medium text-ink">{a.symbol}</span></span>
              <span className="shrink-0 text-right"><span className="figure block text-sm text-ink">{fmtAmount(a.amount)}</span><span className="figure block text-[11px] text-mut">{fmtUsd(a.usd)}</span></span>
            </li>
          ))}
        </ul>
      )}

      {p.sources?.length > 0 && (
        <div className="relative flex flex-wrap items-center gap-2 border-t border-white/10 px-5 py-3">
          <span className="label mr-1">Routed by</span>
          {p.sources.map((s) => (
            <Link key={s.address} href={`/${s.address}`} target="_blank" className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 py-1 pl-1 pr-2.5 text-xs text-ink transition-colors hover:border-cyan-500/50">
              <StockLogo address={s.address} meta={s} size="h-5 w-5" text="text-[6px]" />{s.symbol ? `$${s.symbol}` : shortAddr(s.address)}<span className="font-mono tabular-nums text-cyan-500">{(s.shareBps / 100).toFixed(s.shareBps % 100 ? 1 : 0)}%</span>
            </Link>
          ))}
        </div>
      )}

      <div className="relative flex flex-wrap items-center justify-between gap-3 border-t border-white/10 bg-white/[0.02] px-5 py-3.5">
        <span className="text-xs text-mut">{wallet.connected ? <>To <span className="font-mono text-ink">{shortAddr(wallet.address)}</span>. No gas, one signature.</> : 'Connect the wallet that should be paid. No gas, one signature.'}</span>
        <button type="button" onClick={onClaim} disabled={Boolean(busy)} className={has ? 'btn-primary' : 'btn-ghost'}>
          {working ? 'Check your wallet…' : claimed ? 'Change the wallet' : has ? `Claim ${fmtUsd(vaultUsd)}` : wallet.connected ? 'Claim this page ahead' : `Connect a ${CHAINS[chain].label} wallet`}
        </button>
      </div>
    </li>
  );
}

/**
 * Proving a phone number: the number, the channel, a code. Once the code is
 * right the number is proved for this browser and the claim goes on as usual.
 */
function PhoneConnect({ onProved }) {
  const [number, setNumber] = useState('');
  const [channel, setChannel] = useState('whatsapp');
  const [sent, setSent] = useState(null); // { masked, channel }
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const valid = Boolean(normalizeHandle('phone', number));

  async function call(body) {
    setBusy(true); setError(null);
    try {
      const res = await fetch('/api/claim/phone', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || 'Something went wrong');
      return d;
    } catch (e) {
      setError(e.message);
      return null;
    } finally {
      setBusy(false);
    }
  }
  const send = async () => { const d = await call({ number, channel }); if (d) { setSent({ masked: d.masked, channel: d.channel }); setCode(''); } };
  const check = async () => { const d = await call({ number, code }); if (d) onProved(); };

  return (
    <div>
      <p className="max-w-lg text-sm leading-relaxed text-mut">A number has no sign-in: it is proved with a code. Write it with its country code; the code goes to that number and nowhere else. The number is shown in part on the site, never in full.</p>
      <div className="mt-4 flex flex-wrap gap-2">
        <input value={number} onChange={(e) => { setNumber(e.target.value); setSent(null); }} inputMode="tel" autoComplete="tel" placeholder="+33 6 12 34 56 78" className={`${FIELD} font-mono`} />
        <div className="flex rounded-full border border-white/10 bg-white/[0.03] p-1">
          {[['whatsapp', 'WhatsApp'], ['sms', 'SMS']].map(([k, label]) => (
            <button key={k} type="button" onClick={() => setChannel(k)} className={`rounded-full px-3.5 py-1.5 text-sm font-medium transition ${channel === k ? 'bg-white/[0.12] text-ink shadow-soft' : 'text-mut hover:text-ink'}`}>{label}</button>
          ))}
        </div>
        <button type="button" onClick={send} disabled={!valid || busy} className={`${sent ? 'btn-ghost' : 'btn-primary'} disabled:cursor-not-allowed disabled:opacity-50`}>{busy && !sent ? 'Sending…' : sent ? 'Send again' : 'Send the code'}</button>
      </div>
      {number && !valid && <p className="mt-2 px-1 text-xs text-down">Write the number with its country code, for example +33 6 12 34 56 78.</p>}
      {sent && (
        <div className="relative mt-4 flex flex-wrap items-center gap-3 overflow-hidden rounded-2xl border border-cyan-500/30 bg-cyan-500/[0.06] p-3.5">
          <span aria-hidden="true" className="beam pointer-events-none absolute inset-x-0 top-0 h-px opacity-70" />
          <span className="min-w-0 flex-1 text-sm text-ink">A 6-digit code was sent by {sent.channel === 'sms' ? 'SMS' : 'WhatsApp'} to <span className="font-mono">{sent.masked}</span>.</span>
          <input value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))} onKeyDown={(e) => { if (e.key === 'Enter' && code.length === 6) check(); }} inputMode="numeric" autoComplete="one-time-code" placeholder="123456" className="w-36 rounded-full border border-white/10 bg-ground/70 px-3 py-2 text-center font-mono text-base tracking-[0.3em] text-ink outline-none transition placeholder:text-dim focus:border-cyan-500/60" />
          <button type="button" onClick={check} disabled={code.length !== 6 || busy} className="btn-primary disabled:cursor-not-allowed disabled:opacity-50">{busy ? 'Checking…' : 'Confirm'}</button>
        </div>
      )}
      {error && <p className="mt-3 px-1 text-sm text-down">{error}</p>}
    </div>
  );
}

/** The picture of a connected account, small. One that does not load leaves the name alone. */
function Face({ p }) {
  const [gone, setGone] = useState(false);
  const src = p.avatar || pageAvatar(p.platform, p.handle);
  if (gone || !src) return null;
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt="" onError={() => setGone(true)} className="h-4 w-4 shrink-0 rounded-full border border-white/15 object-cover" />;
}

export default function Claim({ initialPlatform = null, initialHandle = '', initialError = null, signed = false }) {
  // Solana first. The chain picks the wallet: Phantom and the like, or MetaMask and the like.
  const evm = useWallet();
  const sol = useSolWallet();
  const [chain, setChain] = useState('solana');
  const wallet = chain === 'solana' ? sol : evm;
  const noWallet = chain === 'solana' ? NO_SOL_WALLET : 'No wallet found. Install MetaMask or Rabby.';
  const chainPicked = useRef(false);
  const [platform, setPlatform] = useState(PLATFORMS[initialPlatform] ? initialPlatform : null);
  const [state, setState] = useState(null); // { platforms, proved }
  const [error, setError] = useState(initialError);
  const [busy, setBusy] = useState(null);
  const [done, setDone] = useState(null);
  const [domain, setDomain] = useState(initialPlatform === 'domain' ? initialHandle : '');
  const [record, setRecord] = useState(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/claim', { cache: 'no-store' });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || 'Could not load');
      setState(d);
    } catch (e) {
      setState({ platforms: {}, proved: [] });
      setError((prev) => prev || e.message);
    }
  }, []);
  useEffect(() => { load(); }, [load]);
  // When everything waiting sits on Robinhood Chain, open on that chain's wallet. Once.
  useEffect(() => {
    if (chainPicked.current || !state?.proved?.length) return;
    chainPicked.current = true;
    const on = (c) => state.proved.reduce((t, p) => t + (p.claimedOn?.[c] ? 0 : (p.vaultAssets || []).filter((a) => assetChain(a) === c).reduce((u, a) => u + (a.usd || 0), 0)), 0);
    if (on('robinhood') > 0 && on('solana') === 0) setChain('robinhood');
  }, [state]);

  // Forget every page this browser proved. A claim already made is not undone.
  const disconnect = async () => {
    await fetch('/api/claim', { method: 'DELETE' }).catch(() => {});
    load();
  };

  const proved = (state?.proved || []).filter((p) => p.platform === platform);
  const enabled = platform ? state?.platforms?.[platform] : false;
  const wanted = platform && platform !== 'domain' && initialHandle ? normalizeHandle(platform, initialHandle) : null;
  // Signed in, but as someone who does not run the page this visitor came for.
  const mismatch = wanted && proved.length > 0 && !proved.some((p) => p.handle === wanted);
  const cleanDomain = normalizeHandle('domain', domain);
  // What waits in the vaults of the connected pages: the first thing to say once connected.
  const waiting = proved.reduce((s, p) => s + owedOf(p), 0);
  const connectUrl = (k) => `/api/oauth/${k}/start?return=${encodeURIComponent(`/claim?platform=${k}${wanted && k === platform ? `&handle=${encodeURIComponent(wanted)}` : ''}`)}`;
  const accounts = (k) => (state?.proved || []).filter((p) => p.platform === k);
  const connected = (k) => accounts(k).length > 0;
  // Nothing chosen and something connected: open it, so the answer is on screen.
  useEffect(() => {
    if (!platform && state?.proved?.length) setPlatform(state.proved[0].platform);
  }, [state, platform]);
  // One click: a platform that can connect goes straight to its sign-in.
  const pick = (k) => {
    setError(null); setRecord(null);
    if (k !== 'domain' && k !== 'phone' && state?.platforms?.[k] && !connected(k)) { setBusy(`connect:${k}`); window.location.assign(connectUrl(k)); return; }
    setPlatform(k);
  };

  async function sign(target) {
    setError(null);
    setBusy(`${target.platform}:${target.handle}`);
    try {
      const addr = wallet.address || (await wallet.connect());
      if (!addr) throw new Error(wallet.available ? 'Connect a wallet first' : noWallet);
      const n = await fetch('/api/app/auth/nonce', { cache: 'no-store' }).then((r) => r.json());
      if (!n?.nonce) throw new Error(n?.error || 'Could not get a nonce. Reload and try again.');
      const signature = await wallet.signMessage(claimMessage({ platform: target.platform, handle: target.handle, wallet: addr, nonce: n.nonce, issuedAt: n.issuedAt }), addr);
      const res = await fetch('/api/claim', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ platform: target.platform, handle: target.handle, wallet: addr, nonce: n.nonce, issuedAt: n.issuedAt, signature }) });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || 'Claim failed');
      setDone({ ...target, wallet: d.wallet, chain: d.chain || chain, path: d.page, sweepStarted: d.sweepStarted });
      load();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(null);
    }
  }

  async function domainRecord() {
    setError(null);
    setBusy('record');
    try {
      const addr = wallet.address || (await wallet.connect());
      if (!addr) throw new Error(wallet.available ? 'Connect a wallet first' : noWallet);
      const res = await fetch('/api/claim/domain', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ domain, wallet: addr }) });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || 'Could not prepare the record');
      setRecord({ ...d, wallet: addr });
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(null);
    }
  }
  // The record is made for one wallet: switching account makes it stale.
  useEffect(() => { if (record && wallet.address && record.wallet.toLowerCase() !== wallet.address.toLowerCase()) setRecord(null); }, [wallet.address, record]);

  if (done) {
    return (
      <div className="frame relative mx-auto max-w-xl overflow-hidden p-8 text-center sm:p-10">
        <span aria-hidden="true" className="pointer-events-none absolute left-1/2 top-0 h-72 w-72 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,rgba(47,168,255,0.38),transparent_65%)] blur-2xl" />
        <span className="beam relative mx-auto flex h-14 w-14 items-center justify-center rounded-full text-coal shadow-beam"><Check className="h-6 w-6" /></span>
        <h2 className="relative mt-5 font-display text-[28px] font-medium leading-tight tracking-[-0.03em] text-ink">{pageName(done.platform, done.handle)} is yours</h2>
        <p className="relative mx-auto mt-3 max-w-md text-sm leading-relaxed text-mut">
          Every payment to this page on {CHAINS[done.chain]?.label || 'this chain'} now goes to <span className="font-mono text-ink">{shortAddr(done.wallet)}</span>.{' '}
          {done.sweepStarted ? 'What waited in the vault is on its way: it arrives within a few minutes.' : 'What waited in the vault is sent within a few minutes.'}
        </p>
        <div className="relative mt-7 flex flex-wrap justify-center gap-2">
          <Link href={done.path} className="btn-primary">Open the profile <Arrow className="h-4 w-4" /></Link>
          <button type="button" onClick={() => setDone(null)} className="btn-ghost">Claim another page</button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      {error && <div className="rounded-2xl border border-down/40 bg-down/10 px-4 py-3 text-sm text-down">{error}</div>}

      <Step n={1} title="Connect your page" done={Boolean(platform) && (platform === 'domain' ? Boolean(record?.found) : connected(platform))}>
        <div className="grid grid-cols-3 gap-2">
          {PLATFORM_KEYS.map((k) => {
            const on = k === 'domain' || Boolean(state?.platforms?.[k]);
            const mine = accounts(k);
            const owed = mine.reduce((t, p) => t + owedOf(p), 0);
            return (
              <button key={k} type="button" onClick={() => pick(k)} disabled={busy === `connect:${k}`}
                className={`group relative flex min-w-0 flex-col items-start gap-2.5 overflow-hidden rounded-2xl border px-2.5 py-3 text-left transition disabled:opacity-60 sm:px-3.5 sm:py-3.5 ${platform === k ? 'border-cyan-500/60 bg-white/[0.07] shadow-glow' : mine.length ? 'border-hood-400/40 bg-white/[0.04] hover:border-cyan-500/60' : 'border-white/10 bg-white/[0.025] hover:border-white/25 hover:bg-white/[0.05]'}`}>
                {platform === k && <span aria-hidden="true" className="beam pointer-events-none absolute inset-x-0 top-0 h-px" />}
                <span className="flex w-full items-center justify-between gap-2">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/5"><PlatformIcon platform={k} className="h-5 w-5 shrink-0" /></span>
                  {mine.length ? (owed > 0 ? <span className="figure beam rounded-full px-1.5 py-0.5 text-[10px] font-semibold leading-none text-coal">{fmtUsd(owed)}</span> : <Check className="h-3.5 w-3.5 text-cyan-500" />) : <span className={`h-1.5 w-1.5 rounded-full ${on ? 'bg-cyan-500 shadow-[0_0_8px_#5FE3FF]' : 'bg-white/15'}`} />}
                </span>
                <span className="text-[14px] font-medium text-ink">{PLATFORMS[k].label}</span>
                <span className="label !text-[9.5px] !leading-snug !tracking-[0.14em]">{busy === `connect:${k}` ? 'opening…' : mine.length ? 'connected as' : k === 'domain' ? 'DNS record' : k === 'phone' ? (on ? 'code by WhatsApp' : 'soon') : on ? 'connect' : 'soon'}</span>
                {mine.length > 0 && (
                  <span className="-mt-1 flex w-full min-w-0 items-center gap-1.5">
                    <Face p={mine[0]} />
                    <span className="truncate font-mono text-[11px] font-medium text-cyan-500">{pageName(k, mine[0].handle)}</span>
                    {mine.length > 1 && <span className="figure shrink-0 text-[10px] text-mut">+{mine.length - 1}</span>}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </Step>

      {platform && platform !== 'domain' && (
        <Step n={2} title={proved.length > 0 ? (waiting > 0 ? <>You have <span className="text-beam">{fmtUsd(waiting)}</span> to claim</> : proved.every((p) => p.claimedOn?.[chain]) ? 'Your page is claimed' : 'Nothing to claim yet') : `Connect your ${PLATFORMS[platform].label} ${PLATFORMS[platform].noun}`} done={false}>
          {!state ? <div className="h-12 animate-pulse rounded-2xl bg-white/5" /> : proved.length > 0 ? (
            <>
              {mismatch && <p className="mb-3 rounded-2xl border border-gold-300 bg-gold-50 px-4 py-2.5 text-sm text-gold-700">You signed in, but not as the owner of {pageName(platform, wanted)}. Sign in with the account that runs it.</p>}
              <ChainSwitch chain={chain} onChange={setChain} />
              <ul className="space-y-3">
                {proved.map((p) => <Result key={p.handle} p={p} busy={busy} wallet={wallet} chain={chain} onSwitch={setChain} onClaim={() => sign(p)} />)}
              </ul>
              <div className="mt-4 flex flex-wrap items-center justify-between gap-2 px-1 text-xs text-mut">
                <span>{wallet.connected ? <>Paid to <span className="font-mono text-ink">{shortAddr(wallet.address)}</span>. <button type="button" onClick={wallet.switchAccount} className="font-medium text-hood-600 hover:underline">Use another wallet</button></> : 'The wallet you connect is the one that gets paid.'}</span>
                <span className="flex items-center gap-4">
                  <a href={connectUrl(platform)} className="font-medium text-mut transition-colors hover:text-ink">Connect another account</a>
                  <button type="button" onClick={disconnect} className="font-medium text-mut transition-colors hover:text-ink">Disconnect</button>
                </span>
              </div>
            </>
          ) : enabled && platform === 'phone' ? (
            <PhoneConnect onProved={load} />
          ) : enabled ? (
            <>
              <a href={connectUrl(platform)} className="btn-primary">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-ground"><PlatformIcon platform={platform} className="h-3 w-3" /></span>Connect {PLATFORMS[platform].label}
              </a>
              <p className="mt-4 max-w-lg text-xs leading-relaxed text-mut">{BRAND} reads which {PLATFORMS[platform].noun}s your account runs and nothing else: it cannot post, and it keeps no access afterwards. <Link href="/privacy#connect" className="text-hood-600 underline-offset-2 hover:underline">What is read</Link></p>
            </>
          ) : (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3.5">
              <p className="max-w-md text-sm leading-relaxed text-mut">The {PLATFORMS[platform].label} connector opens soon. Until then your fees keep adding up in the vault of your {PLATFORMS[platform].noun}: nothing is lost.</p>
              <Link href="/pages" className="btn-ghost !py-2 text-xs">Find your page</Link>
            </div>
          )}
        </Step>
      )}

      {platform === 'domain' && (
        <Step n={2} title="Connect your domain" done={Boolean(record?.found)}>
          <p className="max-w-lg text-sm leading-relaxed text-mut">A domain has no sign-in: it connects with a DNS record. Connect the wallet that should be paid, then add the record where you manage the domain.</p>
          <div className="mt-4"><ChainSwitch chain={chain} onChange={(c) => { setChain(c); setRecord(null); }} /></div>
          <div className="mt-4 flex flex-wrap gap-2">
            <input value={domain} onChange={(e) => { setDomain(e.target.value); setRecord(null); }} placeholder="example.com" className={FIELD} />
            <button type="button" onClick={domainRecord} disabled={!cleanDomain || busy === 'record'} className={`${record?.found ? 'btn-ghost' : 'btn-primary'} disabled:cursor-not-allowed disabled:opacity-50`}>{busy === 'record' ? 'Checking…' : record ? 'Check again' : wallet.connected ? 'Get my record' : 'Connect wallet'}</button>
          </div>
          {domain && !cleanDomain && <p className="mt-2 px-1 text-xs text-down">That is not a valid domain name.</p>}
          {record && (
            <div className="mt-5 space-y-2">
              <CopyLine label="Type" value="TXT" />
              <CopyLine label="Host" value={record.record.host} />
              <CopyLine label="Value" value={record.record.value} />
              <p className="px-1 pt-1 text-xs leading-relaxed text-mut">Some DNS panels want only <span className="font-mono text-ink">{record.record.name}</span> as the host. The value is tied to <span className="font-mono text-ink">{shortAddr(record.wallet)}</span>: it pays that wallet and no other.</p>
              {record.found ? (
                <button type="button" onClick={() => sign({ platform: 'domain', handle: record.domain })} disabled={Boolean(busy)} className="btn-primary mt-2">{busy === `domain:${record.domain}` ? 'Check your wallet…' : `Record found. Claim ${record.domain}`}</button>
              ) : (
                <p className="rounded-2xl border border-gold-300 bg-gold-50 px-4 py-2.5 text-sm text-gold-700">Record not visible yet. DNS changes can take a few minutes: add it, then check again.</p>
              )}
            </div>
          )}
        </Step>
      )}

      <p className="px-1 text-xs leading-relaxed text-mut">
        Looking for a page? <Link href="/pages" className="font-medium text-ink transition-colors hover:text-hood-600">Browse the directory</Link>
        {platform && initialHandle && normalizeHandle(platform, initialHandle) ? <> or open <Link href={pagePath(platform, normalizeHandle(platform, initialHandle))} className="font-medium text-ink transition-colors hover:text-hood-600">{pageName(platform, normalizeHandle(platform, initialHandle))}</Link></> : null}.
        {signed && platform && platform !== 'domain' && state && !connected(platform) ?' Your sign-in expired: sign in again.' : ''}
      </p>
    </div>
  );
}
