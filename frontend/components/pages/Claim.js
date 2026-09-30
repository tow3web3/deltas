'use client';

// Claim a page by connecting it: one click on a platform opens its sign-in,
// the pages of that account come back with what waits for them, and one
// signature from the wallet that should be paid sends it. A domain has no
// sign-in, so it connects with a DNS record. Nothing here costs gas.
import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Arrow, Check, Copy, PlatformIcon } from '../Icons';
import StockLogo from '../StockLogo';
import { PageAvatar, ClaimBadge, fmtUsd, fmtAmount, shortAddr, ago } from './PageParts';
import { useWallet } from '../../lib/useWallet';
import { PLATFORMS, PLATFORM_KEYS, normalizeHandle, pageName, pagePath, pageAvatar } from '../../lib/pages';
import { claimMessage } from '../../lib/claimMessage';
import { BRAND } from '../../lib/brand';

function Step({ n, title, done, children }) {
  return (
    <section className="frame p-5">
      <div className="flex items-center gap-3">
        <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${done ? 'bg-hood-500 text-coal' : 'bg-tile text-ink'}`}>{done ? <Check className="h-3.5 w-3.5" /> : n}</span>
        <h2 className="text-sm font-semibold text-ink">{title}</h2>
      </div>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function CopyLine({ label, value }) {
  const [ok, setOk] = useState(false);
  return (
    <div className="flex items-center gap-3 rounded-xl border border-line bg-ground px-3 py-2">
      <span className="w-12 shrink-0 text-[11px] font-semibold uppercase tracking-wider text-mut">{label}</span>
      <code className="min-w-0 flex-1 break-all font-mono text-xs text-ink">{value}</code>
      <button type="button" onClick={async () => { try { await navigator.clipboard.writeText(value); setOk(true); setTimeout(() => setOk(false), 1200); } catch { /* clipboard unavailable */ } }} className="shrink-0 text-mut transition hover:text-ink" aria-label={`Copy ${label}`}>
        {ok ? <Check className="h-4 w-4 text-hood-600" /> : <Copy className="h-4 w-4" />}
      </button>
    </div>
  );
}

/**
 * What a connected page has to claim, said plainly: the amount waiting in its
 * vault with every asset, or that nothing waits and why. The answer comes before
 * the button, so nobody signs to find out.
 */
function Result({ p, busy, wallet, onClaim }) {
  const has = !p.claimed && p.vaultUsd > 0;
  const working = busy === `${p.platform}:${p.handle}`;
  return (
    <li className={`overflow-hidden rounded-xl border ${has ? 'border-hood-300 bg-hood-50' : 'border-line bg-ground'}`}>
      <div className="flex flex-wrap items-center gap-3 px-4 pt-4">
        <PageAvatar page={p} size="h-11 w-11" badge="h-[18px] w-[18px]" />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2"><span className="truncate text-[15px] font-semibold text-ink">{p.name}</span>{p.exists && <ClaimBadge claimed={p.claimed} />}</div>
          <div className="label mt-0.5 !text-[10px]">{PLATFORMS[p.platform]?.label} {PLATFORMS[p.platform]?.noun} · connected</div>
        </div>
        {p.exists && <Link href={p.path} target="_blank" className="label !text-[10px] transition-colors hover:!text-ink">public profile</Link>}
      </div>

      <div className="grid gap-x-6 gap-y-4 px-4 py-4 sm:grid-cols-[auto_1fr] sm:items-end">
        <div>
          <div className="label">{p.claimed ? 'In the vault since your claim' : 'Waiting for you'}</div>
          <div className={`figure font-display text-5xl font-medium leading-none tracking-tight ${has || (p.claimed && p.vaultUsd > 0) ? 'text-hood-500' : 'text-ink'}`}>{fmtUsd(p.vaultUsd)}</div>
        </div>
        <div className="text-sm leading-snug text-mut">
          {p.claimed ? <>This page is already claimed: its fees go straight to <span className="font-mono text-ink">{shortAddr(p.claimedWallet)}</span>. {fmtUsd(p.paidToOwnerUsd)} paid so far. Sign again to send them to another wallet.</>
            : has ? <>Held in the vault of this page, from {p.payments} payment{p.payments === 1 ? '' : 's'}{p.lastAt ? `, the last one ${ago(p.lastAt)}` : ''}. Claiming sends all of it to your wallet, and every later payment reaches it directly.</>
              : p.exists && p.coins > 0 ? <>{p.coins} coin{p.coins === 1 ? ' routes' : 's route'} fees to this page, and the first payment has not run yet. Claim now: it will land in your wallet.</>
                : p.exists ? <>No coin routes fees to this page at the moment, and its vault is empty.</>
                  : <>No coin has routed fees to this page yet. You can still claim it ahead: the day one does, the fees come straight to your wallet.</>}
        </div>
      </div>

      {p.vaultAssets.length > 0 && (
        <ul className="grid gap-px border-t border-line bg-line sm:grid-cols-2">
          {p.vaultAssets.map((a, i) => (
            <li key={a.address} className={`flex items-center justify-between gap-3 bg-paper px-4 py-2.5 ${p.vaultAssets.length % 2 && i === p.vaultAssets.length - 1 ? 'sm:col-span-2' : ''}`}>
              <span className="flex items-center gap-2"><StockLogo address={a.address} meta={{ symbol: a.symbol }} size="h-6 w-6" text="text-[7px]" /><span className="font-mono text-xs font-semibold text-ink">{a.symbol}</span></span>
              <span className="text-right"><span className="figure block text-sm text-ink">{fmtAmount(a.amount)}</span><span className="figure block text-[11px] text-mut">{fmtUsd(a.usd)}</span></span>
            </li>
          ))}
        </ul>
      )}

      {p.sources?.length > 0 && (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-line px-4 py-2.5">
          <span className="label">Routed by</span>
          {p.sources.map((s) => (
            <Link key={s.address} href={`/${s.address}`} target="_blank" className="inline-flex items-center gap-1.5 text-xs text-ink transition-colors hover:text-hood-600">
              <StockLogo address={s.address} meta={s} size="h-5 w-5" text="text-[6px]" />{s.symbol ? `$${s.symbol}` : shortAddr(s.address)}<span className="figure text-mut">{(s.shareBps / 100).toFixed(s.shareBps % 100 ? 1 : 0)}%</span>
            </Link>
          ))}
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line px-4 py-3">
        <span className="text-xs text-mut">{wallet.connected ? <>To <span className="font-mono text-ink">{shortAddr(wallet.address)}</span>. No gas, one signature.</> : 'Connect the wallet that should be paid. No gas, one signature.'}</span>
        <button type="button" onClick={onClaim} disabled={Boolean(busy)} className={has ? 'btn-primary' : 'btn-ghost'}>
          {working ? 'Check your wallet…' : p.claimed ? 'Change the wallet' : has ? `Claim ${fmtUsd(p.vaultUsd)}` : wallet.connected ? 'Claim this page ahead' : 'Connect wallet'}
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
      <p className="text-sm text-mut">A number has no sign-in: it is proved with a code. Write it with its country code; the code goes to that number and nowhere else. The number is shown in part on the site, never in full.</p>
      <div className="mt-3 flex flex-wrap gap-2">
        <input value={number} onChange={(e) => { setNumber(e.target.value); setSent(null); }} inputMode="tel" autoComplete="tel" placeholder="+33 6 12 34 56 78" className="min-w-0 flex-1 rounded-xl border border-line bg-ground px-4 py-2.5 font-mono text-sm text-ink outline-none transition placeholder:text-mut/60 focus:border-hood-400" />
        <div className="flex overflow-hidden rounded-xl border border-line">
          {[['whatsapp', 'WhatsApp'], ['sms', 'SMS']].map(([k, label]) => (
            <button key={k} type="button" onClick={() => setChannel(k)} className={`px-3.5 py-2.5 text-sm font-semibold transition ${channel === k ? 'bg-ink text-coal' : 'bg-ground text-mut hover:text-ink'}`}>{label}</button>
          ))}
        </div>
        <button type="button" onClick={send} disabled={!valid || busy} className="btn-ink disabled:cursor-not-allowed disabled:opacity-50">{busy && !sent ? 'Sending…' : sent ? 'Send again' : 'Send the code'}</button>
      </div>
      {number && !valid && <p className="mt-1.5 text-xs text-red-600">Write the number with its country code, for example +33 6 12 34 56 78.</p>}
      {sent && (
        <div className="mt-4 flex flex-wrap items-center gap-2 rounded-xl border border-hood-300 bg-hood-50 p-3">
          <span className="flex-1 text-sm text-ink">A 6-digit code was sent by {sent.channel === 'sms' ? 'SMS' : 'WhatsApp'} to <span className="font-mono">{sent.masked}</span>.</span>
          <input value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))} onKeyDown={(e) => { if (e.key === 'Enter' && code.length === 6) check(); }} inputMode="numeric" autoComplete="one-time-code" placeholder="123456" className="w-32 rounded-xl border border-line bg-ground px-3 py-2 text-center font-mono text-base tracking-[0.3em] text-ink outline-none focus:border-hood-400" />
          <button type="button" onClick={check} disabled={code.length !== 6 || busy} className="btn-primary disabled:cursor-not-allowed disabled:opacity-50">{busy ? 'Checking…' : 'Confirm'}</button>
        </div>
      )}
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </div>
  );
}

/** The picture of a connected account, small. One that does not load leaves the name alone. */
function Face({ p }) {
  const [gone, setGone] = useState(false);
  const src = p.avatar || pageAvatar(p.platform, p.handle);
  if (gone || !src) return null;
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt="" onError={() => setGone(true)} className="h-4 w-4 shrink-0 rounded-full border border-line object-cover" />;
}

export default function Claim({ initialPlatform = null, initialHandle = '', initialError = null, signed = false }) {
  const wallet = useWallet();
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
  const waiting = proved.filter((p) => !p.claimed).reduce((s, p) => s + (p.vaultUsd || 0), 0);
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
      if (!addr) throw new Error(wallet.available ? 'Connect a wallet first' : 'No wallet found. Install MetaMask or Rabby.');
      const n = await fetch('/api/app/auth/nonce', { cache: 'no-store' }).then((r) => r.json());
      if (!n?.nonce) throw new Error(n?.error || 'Could not get a nonce. Reload and try again.');
      const signature = await wallet.signMessage(claimMessage({ platform: target.platform, handle: target.handle, wallet: addr, nonce: n.nonce, issuedAt: n.issuedAt }), addr);
      const res = await fetch('/api/claim', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ platform: target.platform, handle: target.handle, wallet: addr, nonce: n.nonce, issuedAt: n.issuedAt, signature }) });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || 'Claim failed');
      setDone({ ...target, wallet: d.wallet, path: d.page, sweepStarted: d.sweepStarted });
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
      if (!addr) throw new Error(wallet.available ? 'Connect a wallet first' : 'No wallet found. Install MetaMask or Rabby.');
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
      <div className="panel-glow mx-auto max-w-xl p-8 text-center">
        <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-hood-500 text-coal"><Check className="h-6 w-6" /></span>
        <h2 className="mt-4 font-display text-xl font-semibold text-ink">{pageName(done.platform, done.handle)} is yours</h2>
        <p className="mt-2 text-sm text-mut">
          Every payment to this page now goes to <span className="font-mono text-ink">{shortAddr(done.wallet)}</span>.{' '}
          {done.sweepStarted ? 'What waited in the vault is on its way: it arrives within a few minutes.' : 'What waited in the vault is sent within a few minutes.'}
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <Link href={done.path} className="btn-primary">Open the profile <Arrow className="h-4 w-4" /></Link>
          <button type="button" onClick={() => setDone(null)} className="btn-ghost">Claim another page</button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      {error && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

      <Step n={1} title="Connect your page" done={Boolean(platform) && (platform === 'domain' ? Boolean(record?.found) : connected(platform))}>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {PLATFORM_KEYS.map((k) => {
            const on = k === 'domain' || Boolean(state?.platforms?.[k]);
            const mine = accounts(k);
            const owed = mine.filter((p) => !p.claimed).reduce((t, p) => t + (p.vaultUsd || 0), 0);
            return (
              <button key={k} type="button" onClick={() => pick(k)} disabled={busy === `connect:${k}`}
                className={`group flex min-w-0 flex-col items-start gap-2 rounded-xl border px-3 py-3 text-left transition ${platform === k ? 'border-hood-500 bg-hood-50' : mine.length ? 'border-hood-300 bg-ground hover:border-hood-500' : 'border-line bg-ground hover:border-mut'}`}>
                <span className="flex w-full items-center justify-between">
                  <PlatformIcon platform={k} className="h-5 w-5 shrink-0" />
                  {mine.length ? (owed > 0 ? <span className="figure rounded-full bg-hood-500 px-1.5 py-0.5 text-[10px] font-semibold leading-none text-coal">{fmtUsd(owed)}</span> : <Check className="h-3.5 w-3.5 text-hood-500" />) : <span className={`h-1.5 w-1.5 rounded-full ${on ? 'bg-hood-500' : 'bg-line'}`} />}
                </span>
                <span className="text-sm font-semibold text-ink">{PLATFORMS[k].label}</span>
                <span className="label !text-[9.5px]">{busy === `connect:${k}` ? 'opening…' : mine.length ? 'connected as' : k === 'domain' ? 'DNS record' : k === 'phone' ? (on ? 'code by WhatsApp' : 'soon') : on ? 'connect' : 'soon'}</span>
                {mine.length > 0 && (
                  <span className="-mt-1 flex w-full min-w-0 items-center gap-1.5">
                    <Face p={mine[0]} />
                    <span className="truncate font-mono text-[11px] font-semibold text-hood-500">{pageName(k, mine[0].handle)}</span>
                    {mine.length > 1 && <span className="figure shrink-0 text-[10px] text-mut">+{mine.length - 1}</span>}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </Step>

      {platform && platform !== 'domain' && (
        <Step n={2} title={proved.length > 0 ? (waiting > 0 ? `You have ${fmtUsd(waiting)} to claim` : proved.every((p) => p.claimed) ? 'Your page is claimed' : 'Nothing to claim yet') : `Connect your ${PLATFORMS[platform].label} ${PLATFORMS[platform].noun}`} done={false}>
          {!state ? <div className="h-10 animate-pulse rounded-xl bg-tile" /> : proved.length > 0 ? (
            <>
              {mismatch && <p className="mb-3 rounded-xl border border-gold-300 bg-gold-50 px-3 py-2 text-sm text-gold-700">You signed in, but not as the owner of {pageName(platform, wanted)}. Sign in with the account that runs it.</p>}
              <ul className="space-y-3">
                {proved.map((p) => <Result key={p.handle} p={p} busy={busy} wallet={wallet} onClaim={() => sign(p)} />)}
              </ul>
              <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-mut">
                <span>{wallet.connected ? <>Paid to <span className="font-mono text-ink">{shortAddr(wallet.address)}</span>. <button type="button" onClick={wallet.switchAccount} className="font-semibold text-hood-600 hover:underline">Use another wallet</button></> : 'The wallet you connect is the one that gets paid.'}</span>
                <span className="flex items-center gap-4">
                  <a href={connectUrl(platform)} className="font-semibold text-mut hover:text-ink">Connect another account</a>
                  <button type="button" onClick={disconnect} className="font-semibold text-mut hover:text-ink">Disconnect</button>
                </span>
              </div>
            </>
          ) : enabled && platform === 'phone' ? (
            <PhoneConnect onProved={load} />
          ) : enabled ? (
            <>
              <a href={connectUrl(platform)} className="btn-ink">
                <PlatformIcon platform={platform} className="h-4 w-4" />Connect {PLATFORMS[platform].label}
              </a>
              <p className="mt-3 text-xs text-mut">{BRAND} reads which {PLATFORMS[platform].noun}s your account runs and nothing else: it cannot post, and it keeps no access afterwards. <Link href="/privacy#connect" className="underline underline-offset-2 hover:text-ink">What is read</Link></p>
            </>
          ) : (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line bg-ground px-4 py-3">
              <p className="text-sm text-mut">The {PLATFORMS[platform].label} connector opens soon. Until then your fees keep adding up in the vault of your {PLATFORMS[platform].noun}: nothing is lost.</p>
              <Link href="/pages" className="text-sm font-semibold text-ink hover:text-hood-600">Find your page</Link>
            </div>
          )}
        </Step>
      )}

      {platform === 'domain' && (
        <Step n={2} title="Connect your domain" done={Boolean(record?.found)}>
          <p className="text-sm text-mut">A domain has no sign-in: it connects with a DNS record. Connect the wallet that should be paid, then add the record where you manage the domain.</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <input value={domain} onChange={(e) => { setDomain(e.target.value); setRecord(null); }} placeholder="example.com" className="min-w-0 flex-1 rounded-xl border border-line bg-ground px-4 py-2.5 text-sm text-ink outline-none transition placeholder:text-mut/60 focus:border-hood-400" />
            <button type="button" onClick={domainRecord} disabled={!cleanDomain || busy === 'record'} className="btn-ink disabled:cursor-not-allowed disabled:opacity-50">{busy === 'record' ? 'Checking…' : record ? 'Check again' : wallet.connected ? 'Get my record' : 'Connect wallet'}</button>
          </div>
          {domain && !cleanDomain && <p className="mt-1.5 text-xs text-red-600">That is not a valid domain name.</p>}
          {record && (
            <div className="mt-4 space-y-2">
              <CopyLine label="Type" value="TXT" />
              <CopyLine label="Host" value={record.record.host} />
              <CopyLine label="Value" value={record.record.value} />
              <p className="text-xs text-mut">Some DNS panels want only <span className="font-mono text-ink">{record.record.name}</span> as the host. The value is tied to <span className="font-mono text-ink">{shortAddr(record.wallet)}</span>: it pays that wallet and no other.</p>
              {record.found ? (
                <button type="button" onClick={() => sign({ platform: 'domain', handle: record.domain })} disabled={Boolean(busy)} className="btn-primary mt-1">{busy === `domain:${record.domain}` ? 'Check your wallet…' : `Record found. Claim ${record.domain}`}</button>
              ) : (
                <p className="rounded-xl border border-gold-300 bg-gold-50 px-3 py-2 text-sm text-gold-700">Record not visible yet. DNS changes can take a few minutes: add it, then check again.</p>
              )}
            </div>
          )}
        </Step>
      )}

      <p className="px-1 text-xs leading-relaxed text-mut">
        Looking for a page? <Link href="/pages" className="font-semibold text-ink hover:text-hood-600">Browse the directory</Link>
        {platform && initialHandle && normalizeHandle(platform, initialHandle) ? <> or open <Link href={pagePath(platform, normalizeHandle(platform, initialHandle))} className="font-semibold text-ink hover:text-hood-600">{pageName(platform, normalizeHandle(platform, initialHandle))}</Link></> : null}.
        {signed && platform && platform !== 'domain' && state && !connected(platform) ?' Your sign-in expired: sign in again.' : ''}
      </p>
    </div>
  );
}
