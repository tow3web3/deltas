'use client';

// Setup: pick the wallet first (the connected one, or a key you import), DELTA
// scans the chain for the tokens that wallet created or holds, you pick one, go.
// Everything else (routing, record date, schedule) is drawn on the canvas afterwards.
import { useEffect, useRef, useState } from 'react';
import { privateKeyToAccount } from 'viem/accounts';
import StockLogo from '../StockLogo';
import TokenCard from './TokenCard';
import SharePanel from './Share';
import { Button, Field, inputCls, focusCls, useToast, shortAddr, fmtNum, fmtUsd } from './ui';
import { Identity, Key, Convert, SignOut, CaretRight, Verified, Warning, Arrow, Check, PlatformIcon } from '../Icons';
import { BRAND } from '../../lib/brand';

const STEPS = ['Wallet', 'Coin', 'Launch', 'Share'];
const KEY_RE = /^(0x)?[0-9a-fA-F]{64}$/;

function addressOfKey(pk) {
  try { return privateKeyToAccount(pk.startsWith('0x') ? pk : `0x${pk}`).address; } catch { return null; }
}

const miniBtn = 'inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 font-mono text-[10.5px] text-mut transition-colors hover:border-cyan-500/50 hover:text-ink';
// The lit edge of a selected line: a short bar of light on its left.
const litEdge = <span aria-hidden="true" className="absolute inset-y-2 left-0 w-[2px] rounded-full bg-cyan-500 shadow-[0_0_10px_#5FE3FF]" />;
// A note in glass, its left edge lit: the beam for information, a warning colour when something is off.
const note = 'relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] py-2.5 pl-4 pr-3 text-xs leading-snug text-mut';
const BEAM_DOWN = 'linear-gradient(180deg, #2FA8FF 0%, #5FE3FF 50%, #7B5CFF 100%)';
const NoteEdge = ({ tone = 'beam' }) => (
  <span aria-hidden="true" className="absolute inset-y-2 left-0 w-[2px] rounded-full"
    style={tone === 'down' ? { background: '#FF5C33', boxShadow: '0 0 10px rgba(255,92,51,0.6)' } : tone === 'gold' ? { background: '#F6C343', boxShadow: '0 0 10px rgba(246,195,67,0.55)' } : { background: BEAM_DOWN, boxShadow: '0 0 10px rgba(47,168,255,0.7)' }} />
);

export default function Wizard({ onCreated, onLaunched, user, onSwitchWallet, onLogout, embedded = false }) {
  const toast = useToast();
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const [wallet, setWallet] = useState({ mode: 'mine', privateKey: '' });
  const [scan, setScan] = useState({ wallet: null, loading: false, data: null, error: null });
  const [token, setToken] = useState({ address: '', meta: null, checking: false, error: null });
  const [manual, setManual] = useState('');
  const [live, setLive] = useState(null); // the created policy, once launched

  const keyAddress = wallet.mode === 'import' && KEY_RE.test(wallet.privateKey.trim()) ? addressOfKey(wallet.privateKey.trim()) : null;
  const scanWallet = wallet.mode === 'mine' ? user?.wallet : keyAddress;
  const scanned = useRef(null);

  // Scan the chosen wallet when entering the token step.
  useEffect(() => {
    if (step !== 1 || !scanWallet || scanned.current === scanWallet) return;
    scanned.current = scanWallet;
    let alive = true;
    setScan({ wallet: scanWallet, loading: true, data: null, error: null });
    fetch(`/api/app/discover?wallet=${scanWallet}`).then((r) => r.json()).then((d) => { if (!alive) return; if (d.error) setScan({ wallet: scanWallet, loading: false, data: null, error: d.error }); else setScan({ wallet: scanWallet, loading: false, data: d, error: null }); }).catch((e) => alive && setScan({ wallet: scanWallet, loading: false, data: null, error: e.message }));
    return () => { alive = false; scanned.current = null; };
  }, [step, scanWallet]);

  async function checkToken(address) {
    setToken({ address, meta: null, checking: true, error: null });
    if (!/^0x[0-9a-fA-F]{40}$/.test(address)) return setToken((t) => ({ ...t, checking: false }));
    try {
      const res = await fetch(`/api/app/token?address=${address}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setToken({ address, meta: data, checking: false, error: null });
    } catch (e) {
      setToken({ address, meta: null, checking: false, error: e.message });
    }
  }

  const canNext = [wallet.mode === 'mine' ? Boolean(user?.wallet) : Boolean(keyAddress), Boolean(token.meta), true][step];
  const created = scan.data?.created || [];

  async function create() {
    setBusy(true);
    try {
      const res = await fetch('/api/app/config', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sourceToken: token.address, wallet: wallet.mode === 'import' ? { mode: 'import', privateKey: wallet.privateKey.trim() } : { mode: 'generate' },
          reward: 'ETH', rewardMode: 'fixed', scheduleKind: 'closing_bell', intervalMinutes: 1440, marketHoursOnly: false, feeSource: 'wallet',
          split: { holders: 10000, creator: 0, burn: 0, treasury: 0 }, payoutMode: 'in_kind',
          loyalty: { enabled: true, minHoldHours: 24, rampDays: 30, maxBps: 20000, sellReset: true },
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not create');
      toast(data.generated ? `${BRAND} is live for your token. Dev wallet ${shortAddr(data.devWallet)} created for you.` : `${BRAND} is live for your token.`);
      setLive(data);
      setStep(3);
      onLaunched?.(data);
    } catch (e) {
      toast(e.message, 'err');
    } finally {
      setBusy(false);
    }
  }

  const TokenRow = ({ t, tag }) => {
    const on = token.address === t.address;
    return (
      <button type="button" role="radio" aria-checked={on} onClick={() => { setManual(''); checkToken(t.address); }} className={`relative flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors ${on ? 'bg-white/[0.06]' : 'hover:bg-white/[0.03]'} ${focusCls}`}>
        {on && litEdge}
        <StockLogo address={t.address} meta={{ symbol: t.symbol, image: t.image }} size="h-8 w-8" text="text-[9px]" />
        <span className="min-w-0 flex-1">
          <span className="flex items-baseline gap-2"><span className="truncate text-[13px] font-medium text-ink">{t.name}</span><span className="font-mono text-[11px] text-mut">${t.symbol}</span>{tag && <span className="label !text-[9px] text-cyan-500">{tag}</span>}</span>
          <span className="block truncate font-mono text-[10.5px] text-mut">{shortAddr(t.address)}{t.marketCap ? ` · MC ${fmtUsd(t.marketCap)}` : ''}{t.balanceUi > 0 ? ` · you hold ${fmtNum(t.balanceUi, 2)}` : ''}</span>
        </span>
        {on ? <Check className="h-3.5 w-3.5 shrink-0 text-cyan-500" /> : <CaretRight className="h-3 w-3 shrink-0 text-mut" />}
      </button>
    );
  };

  // The two ways in, as two lines of one glass list: the chosen one lights up on its left edge.
  const WalletChoice = ({ mode, icon: Icon, title, children, extra }) => {
    const on = wallet.mode === mode;
    return (
      <div role="radio" aria-checked={on} tabIndex={0} onClick={() => setWallet({ ...wallet, mode })} onKeyDown={(e) => { if (e.target === e.currentTarget && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); setWallet({ ...wallet, mode }); } }}
        className={`relative grid cursor-pointer grid-cols-[auto_1fr] gap-x-3 px-4 py-3.5 transition-colors ${on ? 'bg-white/[0.06]' : 'hover:bg-white/[0.03]'} ${focusCls}`}>
        {on && litEdge}
        <span className={`flex h-8 w-8 items-center justify-center rounded-xl ${on ? 'bg-cyan-500/10' : 'bg-white/5'}`}><Icon className={`h-[18px] w-[18px] ${on ? 'text-cyan-500' : 'text-mut'}`} /></span>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <span className="text-[13px] font-medium text-ink">{title}</span>
            {extra}
            <span className={`ml-auto flex h-4 w-4 shrink-0 items-center justify-center rounded-full border ${on ? 'border-cyan-500/70' : 'border-white/15'}`}>{on && <span className="h-2 w-2 rounded-full bg-cyan-500 shadow-[0_0_8px_#5FE3FF]" />}</span>
          </div>
          <p className="mt-1 text-xs leading-snug text-mut">{children}</p>
        </div>
      </div>
    );
  };

  return (
    <div className={embedded ? 'w-full' : 'mx-auto max-w-2xl px-5 py-10'}>
      <div className="mb-7 pr-32">
        <div className="eyebrow mb-3">Set up {BRAND}</div>
        <h1 className="font-display text-[1.65rem] font-medium leading-[1.05] tracking-[-0.03em] text-ink sm:text-[2rem]">Your wallet, your coin, <span className="text-beam">then draw the routing.</span></h1>
      </div>

      {/* The steps as a rail of light: numbered stops on one line, the part already travelled lit */}
      <ol className="mb-5 flex items-center">
        {STEPS.map((s, i) => (
          <li key={s} className={`flex items-center ${i < STEPS.length - 1 ? 'flex-1' : ''}`} aria-current={i === step ? 'step' : undefined}>
            <span className={`flex items-center gap-2 whitespace-nowrap font-mono text-[10.5px] uppercase tracking-[0.16em] ${i === step ? 'text-ink' : i < step ? 'text-cyan-500' : 'text-dim'}`}>
              <span className={`flex h-[22px] min-w-[22px] items-center justify-center rounded-full border px-1 text-[10px] tracking-normal transition-all ${i === step ? 'border-cyan-500/70 bg-cyan-500/10 text-cyan-500 shadow-[0_0_14px_rgba(95,227,255,0.35)]' : i < step ? 'beam border-transparent text-coal' : 'border-white/10 text-dim'}`}>{i < step ? <Check className="h-2.5 w-2.5" /> : i + 1}</span>
              <span className={i === step ? '' : 'hidden sm:inline'}>{s}</span>
            </span>
            {i < STEPS.length - 1 && <span className={`mx-3 h-px flex-1 rounded-full ${i < step ? 'beam shadow-[0_0_8px_rgba(47,168,255,0.6)]' : 'bg-white/10'}`} />}
          </li>
        ))}
      </ol>

      <div className="panel">
        <div className="p-5 sm:p-6">
          {step === 0 && (
            <div>
              <h2 className="font-display text-lg font-medium tracking-[-0.02em] text-ink">Which wallet created your coin?</h2>
              <p className="mt-1 text-[13px] leading-snug text-mut">{BRAND} scans the chain for the tokens this wallet created, so you can pick yours in one tap.</p>
              <div role="radiogroup" className="mt-4 divide-y divide-white/[0.07] overflow-hidden rounded-2xl border border-white/10 bg-white/[0.02]">
                <WalletChoice mode="mine" icon={Identity} title="My connected wallet" extra={(
                  <span className="flex flex-wrap items-center gap-1.5">
                    <span className="font-mono text-[11px] text-ink">{user?.wallet ? shortAddr(user.wallet) : 'not connected'}</span>
                    {onSwitchWallet && <button type="button" onClick={(e) => { e.stopPropagation(); onSwitchWallet(); }} className={miniBtn}><Convert className="h-3 w-3" />Switch</button>}
                    {onLogout && <button type="button" onClick={(e) => { e.stopPropagation(); onLogout(); }} className={`${miniBtn} hover:!border-down/50 hover:!text-down`}><SignOut className="h-3 w-3" />Disconnect</button>}
                  </span>
                )}>
                  We list the tokens it created. {BRAND} then creates a dedicated dev wallet for the fees (a bot cannot sign with your browser wallet); you set it as fee recipient on your launchpad.
                </WalletChoice>
                <WalletChoice mode="import" icon={Key} title="Import a key">
                  The wallet that created your token and receives its fees. We list its tokens and use it as the dev wallet. AES-256 encrypted the moment it arrives.
                </WalletChoice>
              </div>
              {wallet.mode === 'import' && (
                <div className="mt-4">
                  <Field label="Private key" hint="64 hex characters, with or without 0x. Sent once over HTTPS, stored encrypted. Never your main wallet.">
                    <input type="password" value={wallet.privateKey} onChange={(e) => setWallet({ ...wallet, privateKey: e.target.value })} placeholder="0x…" className={inputCls} autoComplete="off" autoFocus />
                    {wallet.privateKey && !KEY_RE.test(wallet.privateKey.trim()) && <p className="mt-1.5 text-xs text-down">Not a valid private key yet.</p>}
                    {keyAddress && <p className="mt-1.5 flex items-center gap-1.5 text-xs text-mut"><Check className="h-3 w-3 text-cyan-500" />Wallet <span className="break-all font-mono text-ink">{keyAddress}</span></p>}
                  </Field>
                </div>
              )}
            </div>
          )}

          {step === 1 && (
            <div className="space-y-4">
              <div>
                <h2 className="font-display text-lg font-medium tracking-[-0.02em] text-ink">Which coin routes its fees?</h2>
                <p className="mt-1 text-[13px] leading-snug text-mut">Scanning <span className="font-mono text-ink">{shortAddr(scanWallet)}</span> on chain. Its fees are what gets routed: to holders first, then wherever you draw.</p>
              </div>
              {scan.loading && (
                <div className={`${note} flex items-center gap-2.5 font-mono !text-[10.5px]`}>
                  <NoteEdge />
                  <span className="h-3 w-3 shrink-0 animate-spin rounded-full border border-white/10 border-t-cyan-500" />Reading every transaction this wallet ever sent, finding the tokens it created…
                </div>
              )}
              {scan.error && (
                <div className={`${note} flex items-center justify-between gap-3`}>
                  <NoteEdge tone="down" />
                  <span className="flex items-start gap-2"><Warning className="mt-px h-3.5 w-3.5 shrink-0 text-down" />The chain scan did not complete{/rate limit/i.test(scan.error) ? ' (the public RPC is busy)' : ''}. Paste the address below, or retry.</span>
                  <button type="button" onClick={() => { scanned.current = null; setScan({ wallet: null, loading: false, data: null, error: null }); }} className={`${miniBtn} shrink-0 text-ink`}><Convert className="h-3 w-3" />Retry</button>
                </div>
              )}
              {scan.data && created.length > 0 && (
                <div>
                  <div className="label mb-2 text-cyan-500">Created by this wallet</div>
                  <div role="radiogroup" className="divide-y divide-white/[0.07] overflow-hidden rounded-2xl border border-white/10 bg-white/[0.02]">{created.map((t) => <TokenRow key={t.address} t={t} tag="Created" />)}</div>
                </div>
              )}
              {scan.data && created.length === 0 && (
                <p className={note}><NoteEdge />No token created by this wallet found on chain. If your launchpad deployed it from another wallet, paste the contract address below.</p>
              )}
              <Field label={created.length ? 'Or paste a contract address' : 'Token contract address'} hint="The contract address of your coin.">
                <input value={manual} onChange={(e) => { setManual(e.target.value.trim()); checkToken(e.target.value.trim()); }} placeholder="0x…" className={inputCls} />
              </Field>
              {token.checking && <p className="flex items-center gap-2 font-mono text-[10.5px] text-mut"><span className="h-3 w-3 shrink-0 animate-spin rounded-full border border-white/10 border-t-cyan-500" />Checking on chain, DexScreener and GeckoTerminal…</p>}
              {token.error && <p className="text-xs text-down">{token.error}</p>}
              {token.meta && <TokenCard token={token.meta} />}
            </div>
          )}

          {step === 2 && (
            <div>
              <h2 className="font-display text-lg font-medium tracking-[-0.02em] text-ink">Launch with a sane default, then draw</h2>
              {/* What gets created, read like the lines of a contract */}
              <dl className="mt-4 divide-y divide-white/[0.07] rounded-2xl border border-white/10 bg-white/[0.02] px-4">
                <div className="grid grid-cols-[6.5rem_1fr] items-center gap-3 py-3">
                  <dt className="label">Token</dt>
                  <dd className="flex min-w-0 items-center gap-2 text-[13px] text-ink">
                    <StockLogo address={token.address} meta={{ symbol: token.meta?.symbol, image: token.meta?.image }} size="h-5 w-5" text="text-[6px]" />
                    <span className="truncate">{token.meta ? token.meta.name : shortAddr(token.address)}</span>
                    {token.meta && <span className="font-mono text-[11px] text-mut">${token.meta.symbol}</span>}
                  </dd>
                </div>
                {[
                  ['Dev wallet', wallet.mode === 'import' ? `Imported: ${shortAddr(keyAddress)}` : 'Created for you, encrypted at rest'],
                  ['Routing', '100% to holders, paid in kind'],
                  ['Record date', 'Loyalty 1x to 2x over 30 days, 24h minimum hold'],
                  ['Schedule', 'Closing bell, 4:00 pm New York, weekdays'],
                ].map(([k, v]) => <div key={k} className="grid grid-cols-[6.5rem_1fr] items-baseline gap-3 py-3"><dt className="label">{k}</dt><dd className="text-[13px] text-ink">{v}</dd></div>)}
                <div className="grid grid-cols-[6.5rem_1fr] items-baseline gap-3 py-3">
                  <dt className="label">Then</dt>
                  <dd className="text-[13px] leading-snug text-mut">
                    Add wallets, buybacks, a treasury, any page on the internet
                    <span className="mx-1.5 inline-flex items-center gap-1.5 align-middle"><PlatformIcon platform="youtube" className="h-3.5 w-3.5" /><PlatformIcon platform="github" className="h-3.5 w-3.5" /><PlatformIcon platform="domain" className="h-3.5 w-3.5" /></span>
                    and pick payout assets: all on the canvas.
                  </dd>
                </div>
              </dl>
              <p className="mt-3 text-xs leading-snug text-mut">{wallet.mode === 'import' ? 'Fees already landing in this wallet are routed from the first cycle.' : 'Point your launchpad fee recipient at the new dev wallet once it appears on the canvas. Nothing moves until fees land there.'}</p>
            </div>
          )}

          {step === 3 && live && (
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <span className="relative shrink-0">
                  <StockLogo address={token.address} meta={{ symbol: token.meta?.symbol, image: token.meta?.image }} size="h-10 w-10" text="text-[9px]" />
                  <Verified className="absolute -bottom-1 -right-1 h-4 w-4 rounded-full bg-ground text-cyan-500" />
                </span>
                <div>
                  <h2 className="font-display text-lg font-medium leading-tight tracking-[-0.02em] text-ink">{token.meta ? `$${token.meta.symbol}` : 'Your coin'} routes its fees now</h2>
                  <p className="mt-0.5 text-[13px] text-mut">First cycle at the closing bell{live.generated ? `, once fees land in ${shortAddr(live.devWallet)}` : ''}.</p>
                </div>
              </div>
              <div>
                <div className="label mb-2 text-cyan-500">The link to share with your community</div>
                <SharePanel address={token.address} symbol={token.meta?.symbol} />
              </div>
              {live.generated && (
                <div className={note}>
                  <NoteEdge tone="gold" />
                  <span className="font-medium text-ink">One more thing.</span> Set <span className="break-all font-mono text-ink">{live.devWallet}</span> as the fee recipient on your launchpad. Nothing moves until fees land there.
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-white/10 px-5 py-3.5 sm:px-6">
          {step === 3
            ? <span className="text-xs text-mut">Next: draw the routing on the canvas.</span>
            : <Button variant="ghost" className="!px-4 !py-2 text-[13px]" onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0 || busy}>Back</Button>}
          {step === 3
            ? <Button className="!px-4 !py-2 text-[13px]" onClick={() => onCreated(live)}>Open the canvas<Arrow className="h-3.5 w-3.5" /></Button>
            : step < 2
              ? <Button className="!px-4 !py-2 text-[13px]" onClick={() => setStep((s) => s + 1)} disabled={!canNext}>Continue<Arrow className="h-3.5 w-3.5" /></Button>
              : <Button className="!px-4 !py-2 text-[13px]" onClick={create} busy={busy}>Launch</Button>}
        </div>
      </div>
    </div>
  );
}
