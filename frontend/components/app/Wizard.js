'use client';

// Setup runs on the chain of the wallet the creator signed in with.
// Solana: paste the key of the wallet that created the pump.fun coin (its public
// key is derived here, in the browser), the mint, what holders receive, the
// schedule, launch. Robinhood Chain: pick the wallet first (the connected one, or
// a key you import), DELTAS scans the chain for the tokens that wallet created or
// holds, you pick one, go. Everything else (routing, record date, pages) is drawn
// on the canvas afterwards.
import { Fragment, useEffect, useMemo, useRef, useState } from 'react';
import { privateKeyToAccount } from 'viem/accounts';
import nacl from 'tweetnacl';
import bs58 from 'bs58';
import StockLogo from '../StockLogo';
import TokenCard from './TokenCard';
import SharePanel from './Share';
import { Button, Field, Seg, Toggle, inputCls, focusCls, useToast, shortAddr, fmtNum, fmtUsd } from './ui';
import { Identity, Key, Convert, SignOut, CaretRight, Verified, Warning, Arrow, Check, PlatformIcon, Timer, Bell, Search, External, Coins, Chart, Lock } from '../Icons';
import { BRAND } from '../../lib/brand';
import { SOL_MINT, explorerAddress } from '../../lib/stocks';
import { isSolAddress, chainOf } from '../../lib/chains';
import { XSTOCKS, FEATURED_XSTOCKS, XSTOCKS_TOTAL, getXStock } from '../../lib/xstocks';

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
const spinner = <span className="h-3 w-3 shrink-0 animate-spin rounded-full border border-white/10 border-t-cyan-500" />;
const h2Cls = 'font-display text-lg font-medium tracking-[-0.02em] text-ink';
const listCls = 'divide-y divide-white/[0.07] overflow-hidden rounded-2xl border border-white/10 bg-white/[0.02]';

/** The title block, shared by both chains. */
function Heading({ eyebrow }) {
  return (
    <div className="mb-7 pr-32">
      <div className="eyebrow mb-3">{eyebrow}</div>
      <h1 className="font-display text-[1.65rem] font-medium leading-[1.05] tracking-[-0.03em] text-ink sm:text-[2rem]">Your wallet, your coin, <span className="text-beam">then draw the routing.</span></h1>
    </div>
  );
}

/** The steps as a rail of light: numbered stops on one line, the part already travelled lit. */
function Rail({ steps, step }) {
  return (
    <ol className="mb-5 flex items-center">
      {steps.map((s, i) => (
        <li key={s} className={`flex items-center ${i < steps.length - 1 ? 'flex-1' : ''}`} aria-current={i === step ? 'step' : undefined}>
          <span className={`flex items-center gap-2 whitespace-nowrap font-mono text-[10.5px] uppercase tracking-[0.16em] ${i === step ? 'text-ink' : i < step ? 'text-cyan-500' : 'text-dim'}`}>
            <span className={`flex h-[22px] min-w-[22px] items-center justify-center rounded-full border px-1 text-[10px] tracking-normal transition-all ${i === step ? 'border-cyan-500/70 bg-cyan-500/10 text-cyan-500 shadow-[0_0_14px_rgba(95,227,255,0.35)]' : i < step ? 'beam border-transparent text-coal' : 'border-white/10 text-dim'}`}>{i < step ? <Check className="h-2.5 w-2.5" /> : i + 1}</span>
            <span className={i === step ? '' : 'hidden sm:inline'}>{s}</span>
          </span>
          {i < steps.length - 1 && <span className={`mx-3 h-px flex-1 rounded-full ${i < step ? 'beam shadow-[0_0_8px_rgba(47,168,255,0.6)]' : 'bg-white/10'}`} />}
        </li>
      ))}
    </ol>
  );
}

/** The wizard for the chain of the signed-in wallet. Robinhood Chain (or no chain given) runs as before. */
export default function Wizard(props) {
  const chain = props.user?.chain || chainOf(props.user?.wallet) || 'solana';
  return chain === 'solana' ? <SolanaWizard {...props} /> : <RobinhoodWizard {...props} />;
}

function RobinhoodWizard({ onCreated, onLaunched, user, onSwitchWallet, onLogout, embedded = false }) {
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
      <Heading eyebrow={`Set up ${BRAND}`} />
      <Rail steps={STEPS} step={step} />

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

/* ------------------------------------------------------------------ Solana */

const SOL_STEPS = ['Wallet', 'Coin', 'Payout', 'Schedule', 'Launch', 'Share'];
const SOL_INTERVALS = [1, 2, 5, 10, 30, 60];
const everyLabel = (m) => (m === 1 ? 'every minute' : m === 60 ? 'every hour' : `every ${m} minutes`);
const capFirst = (s) => s.charAt(0).toUpperCase() + s.slice(1);
const fmtBig = (n) => (n == null || !Number.isFinite(Number(n)) ? null : n >= 1e9 ? `$${(n / 1e9).toFixed(2)}B` : n >= 1e6 ? `$${(n / 1e6).toFixed(2)}M` : n >= 1e3 ? `$${(n / 1e3).toFixed(1)}k` : `$${Number(n).toFixed(0)}`);
const sameBytes = (a, b) => a.length === b.length && a.every((v, i) => v === b[i]);

/**
 * A Solana private key as pasted (base58 64-byte secret, base58 32-byte seed, or a
 * JSON array of numbers) to its wallet, derived here in the browser. Returns null
 * for an empty field, { error } when it is not a key, or { publicKey, secret, seed }
 * where `secret` is the same key as a base58 64-byte secret (the form sent at launch).
 */
function solKey(raw) {
  const s = String(raw || '').trim().replace(/^["']+|["']+$/g, '');
  if (!s) return null;
  let bytes;
  if (s.startsWith('[')) {
    let arr = null;
    try { arr = JSON.parse(s); } catch { /* reported below */ }
    if (!Array.isArray(arr) || !arr.every((n) => Number.isInteger(n) && n >= 0 && n <= 255)) return { error: 'Not a valid array yet: numbers from 0 to 255 between square brackets.' };
    bytes = Uint8Array.from(arr);
  } else {
    try { bytes = bs58.decode(s); } catch { return { error: 'Not base58 yet: a Solana key is letters and digits, without 0, O, I or l.' }; }
  }
  try {
    if (bytes.length === 64) {
      const kp = nacl.sign.keyPair.fromSecretKey(bytes);
      // The second half of a 64-byte key is the public key of the first: a key cut or mistyped fails here.
      if (!sameBytes(nacl.sign.keyPair.fromSeed(bytes.slice(0, 32)).publicKey, kp.publicKey)) return { error: 'The two halves of this key do not match. Copy it again from your wallet.' };
      return { publicKey: bs58.encode(kp.publicKey), secret: bs58.encode(kp.secretKey), seed: false };
    }
    if (bytes.length === 32) {
      const kp = nacl.sign.keyPair.fromSeed(bytes);
      return { publicKey: bs58.encode(kp.publicKey), secret: bs58.encode(kp.secretKey), seed: true };
    }
  } catch { /* reported below */ }
  return { error: `That is ${bytes.length} bytes. A Solana private key is 64 bytes, or a 32-byte seed.` };
}

/** GET /api/app/token for a Solana mint (with the creator wallet when given), debounced. */
function useSolLookup(address, wallet = null) {
  const [state, setState] = useState({ address: '', meta: null, checking: false, error: null });
  useEffect(() => {
    if (!isSolAddress(address)) { setState({ address: '', meta: null, checking: false, error: null }); return undefined; }
    let alive = true;
    setState({ address, meta: null, checking: true, error: null });
    const t = setTimeout(() => {
      fetch(`/api/app/token?address=${encodeURIComponent(address)}${wallet ? `&wallet=${encodeURIComponent(wallet)}` : ''}`)
        .then(async (r) => { const d = await r.json().catch(() => ({})); if (!r.ok || d.error) throw new Error(d.error || 'Lookup failed'); return d; })
        .then((d) => { if (alive) setState({ address, meta: d, checking: false, error: null }); })
        .catch((e) => { if (alive) setState({ address, meta: null, checking: false, error: e.message || 'Lookup failed' }); });
    }, 300);
    return () => { alive = false; clearTimeout(t); };
  }, [address, wallet]);
  return state.address === address ? state : { address, meta: null, checking: isSolAddress(address), error: null };
}

/** Search over the xStocks the site knows: exact ticker first, then prefixes, then names. */
function searchXStocks(q) {
  const raw = q.trim();
  const n = raw.replace(/^\$/, '').toLowerCase();
  if (!n) return [];
  const score = (s) => (s.ticker.toLowerCase() === n || s.symbol.toLowerCase() === n ? 0 : s.ticker.toLowerCase().startsWith(n) ? 1 : s.name.toLowerCase().startsWith(n) ? 2 : 3);
  return XSTOCKS.filter((s) => s.mint === raw || s.ticker.toLowerCase().includes(n) || s.symbol.toLowerCase().includes(n) || s.name.toLowerCase().includes(n))
    .sort((a, b) => score(a) - score(b)).slice(0, 8);
}

const IconBox = ({ icon: Icon, on }) => (
  <span className={`flex h-8 w-8 items-center justify-center rounded-xl ${on ? 'bg-cyan-500/10' : 'bg-white/5'}`}><Icon className={`h-[18px] w-[18px] ${on ? 'text-cyan-500' : 'text-mut'}`} /></span>
);

/** One line of a glass radio list: the chosen one lights up on its left edge. */
function ChoiceRow({ on, onSelect, lead, title, extra, children, below }) {
  return (
    <div role="radio" aria-checked={on} tabIndex={0} onClick={onSelect} onKeyDown={(e) => { if (e.target === e.currentTarget && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); onSelect(); } }}
      className={`relative grid cursor-pointer grid-cols-[auto_1fr] gap-x-3 px-4 py-3.5 transition-colors ${on ? 'bg-white/[0.06]' : 'hover:bg-white/[0.03]'} ${focusCls}`}>
      {on && litEdge}
      {lead}
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <span className="text-[13px] font-medium text-ink">{title}</span>
          {extra}
          <span className={`ml-auto flex h-4 w-4 shrink-0 items-center justify-center rounded-full border ${on ? 'border-cyan-500/70' : 'border-white/15'}`}>{on && <span className="h-2 w-2 rounded-full bg-cyan-500 shadow-[0_0_8px_#5FE3FF]" />}</span>
        </div>
        <p className="mt-1 text-xs leading-snug text-mut">{children}</p>
        {below}
      </div>
    </div>
  );
}

const SolscanLink = ({ address, full = false, className = '' }) => (
  <a href={explorerAddress(address)} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className={`inline-flex items-center gap-0.5 font-mono hover:text-cyan-500 ${className}`}>
    <span className={full ? 'break-all' : ''}>{full ? address : shortAddr(address)}</span><External className="h-2.5 w-2.5 shrink-0" />
  </a>
);

/** An asset as one glass line: logo, name, symbol, a tag, its mint on Solscan. */
function AssetLine({ address, symbol, name, image, tag }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-2.5">
      <StockLogo address={address} meta={{ symbol, image }} size="h-8 w-8" text="text-[9px]" />
      <span className="min-w-0 flex-1">
        <span className="flex items-baseline gap-2"><span className="truncate text-[13px] font-medium text-ink">{name || symbol}</span><span className="font-mono text-[11px] text-mut">{symbol}</span>{tag && <span className="label !text-[9px] text-cyan-500">{tag}</span>}</span>
        <SolscanLink address={address} className="text-[10.5px] text-mut" />
      </span>
    </div>
  );
}

/** The coin as pump.fun and Jupiter know it, and whether the pasted key is its creator. */
function SolCoinCard({ meta, wallet }) {
  const pump = meta.pump;
  const sym = meta.symbol ? `$${meta.symbol}` : 'this coin';
  const cap = fmtBig(meta.marketCap);
  const stage = pump?.isPump ? (pump.complete === true ? 'pump.fun · on PumpSwap' : pump.complete === false ? 'pump.fun · bonding curve' : 'pump.fun') : 'Not on pump.fun';
  return (
    <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03]">
      <div className="flex items-center gap-3 p-4">
        <StockLogo address={meta.address} meta={{ symbol: meta.symbol, image: meta.image }} size="h-11 w-11" text="text-[10px]" />
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-2"><span className="truncate font-display text-[15px] font-medium tracking-[-0.02em] text-ink">{meta.name || meta.symbol}</span>{meta.symbol && <span className="font-mono text-[11px] text-mut">${meta.symbol}</span>}</div>
          <div className="mt-0.5 flex flex-wrap items-center gap-x-2.5 gap-y-0.5">
            <span className="label flex items-center gap-1 !text-[9px]"><span className={`h-1 w-1 rounded-full ${pump?.isPump ? 'bg-cyan-500 shadow-[0_0_6px_#5FE3FF]' : 'bg-mut'}`} />{stage}</span>
            <SolscanLink address={meta.address} className="text-[10px] text-mut" />
          </div>
        </div>
        {cap && (
          <div className="text-right">
            <div className="label !text-[9px]">Market cap</div>
            <div className="figure mt-0.5 text-sm text-ink">{cap}</div>
          </div>
        )}
      </div>
      <div className="relative border-t border-white/[0.07] py-2.5 pl-4 pr-3 text-xs leading-snug text-mut">
        {meta.isCreator === true ? (
          <span className="flex items-start gap-2"><Check className="mt-px h-3.5 w-3.5 shrink-0 text-cyan-500" /><span><span className="text-ink">Created by this key&apos;s wallet.</span> Every pump.fun creator fee on {sym}, on the bonding curve and on PumpSwap, is collected into <span className="font-mono text-ink">{shortAddr(wallet)}</span>.</span></span>
        ) : meta.isCreator === false ? (
          <>
            <NoteEdge tone="gold" />
            <span className="flex items-start gap-2"><Warning className="mt-px h-3.5 w-3.5 shrink-0 text-gold-400" /><span><span className="font-medium text-ink">This key is not the coin&apos;s creator.</span> pump.fun pays {sym}&apos;s creator fees to <span className="font-mono text-ink">{shortAddr(pump?.creator)}</span>, not to <span className="font-mono text-ink">{shortAddr(wallet)}</span>. Only fees landing in <span className="font-mono text-ink">{shortAddr(wallet)}</span> get routed: go back and paste the creator wallet&apos;s key, unless you send fees to this wallet yourself.</span></span>
          </>
        ) : pump?.isPump ? (
          <>
            <NoteEdge tone="gold" />
            <span className="flex items-start gap-2"><Warning className="mt-px h-3.5 w-3.5 shrink-0 text-gold-400" /><span>pump.fun did not say who created {sym}. Only fees landing in <span className="font-mono text-ink">{shortAddr(wallet)}</span> get routed, so make sure this key is the creator&apos;s.</span></span>
          </>
        ) : (
          <>
            <NoteEdge tone="gold" />
            <span className="flex items-start gap-2"><Warning className="mt-px h-3.5 w-3.5 shrink-0 text-gold-400" /><span>pump.fun does not know this mint, so there is no pump.fun creator fee to collect. Only what lands in <span className="font-mono text-ink">{shortAddr(wallet)}</span> gets routed.</span></span>
          </>
        )}
      </div>
    </div>
  );
}

function SolanaWizard({ onCreated, onLaunched, user, onSwitchWallet, onLogout, embedded = false }) {
  const toast = useToast();
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const [keyInput, setKeyInput] = useState('');
  const [mintInput, setMintInput] = useState('');
  const [pay, setPay] = useState({ kind: 'sol', ticker: '', mint: '' }); // kind: sol | xstock | mint
  const [xq, setXq] = useState('');
  const [when, setWhen] = useState({ kind: 'interval', minutes: 5, marketHours: false });
  const [live, setLive] = useState(null); // the reply of the launch, with what was launched

  // The key never leaves the browser before Launch: the wallet is derived here.
  const key = useMemo(() => solKey(keyInput), [keyInput]);
  const keyError = key?.error || (key?.seed && user?.wallet && keyInput.trim() === user.wallet ? 'That is the address of the wallet you signed in with, not its private key.' : null);
  const pub = key && !keyError ? key.publicKey : null;

  const mint = mintInput.trim();
  const coin = useSolLookup(pub ? mint : '', pub);
  const coinMeta = coin.meta;
  const coinWrong = coinMeta ? (coinMeta.isNative ? 'That is SOL itself. Paste the mint of your own coin.' : coinMeta.isStock ? 'That is an xStock, a payout asset. Paste the mint of your own coin.' : coinMeta.chain && coinMeta.chain !== 'solana' ? 'That is not a Solana mint.' : null) : null;
  const coinOk = Boolean(coinMeta) && !coinWrong;

  const payMint = pay.mint.trim();
  const payLookup = useSolLookup(pay.kind === 'mint' ? payMint : '');
  const xs = pay.kind === 'xstock' ? getXStock(pay.ticker) : null;
  const pm = payLookup.meta;
  const asset = pay.kind === 'sol' ? { address: SOL_MINT, symbol: 'SOL', name: 'Solana', sol: true }
    : pay.kind === 'xstock' ? (xs ? { address: xs.mint, symbol: xs.symbol, name: xs.name, stock: true } : null)
      : pm ? { address: payMint, symbol: pm.symbol, name: pm.name, image: pm.image, sol: payMint === SOL_MINT || Boolean(pm.isNative), stock: Boolean(pm.isStock || getXStock(payMint)?.mint === payMint) } : null;
  const reward = pay.kind === 'xstock' ? xs?.ticker : pay.kind === 'mint' && asset && !asset.sol ? payMint : 'SOL';
  const xsResults = useMemo(() => searchXStocks(xq), [xq]);

  const canNext = [Boolean(pub), coinOk, Boolean(asset), true][step];
  const scheduleText = when.kind === 'closing_bell' ? 'Closing bell, 4:00 pm New York, weekdays' : `${capFirst(everyLabel(when.minutes))}${when.marketHours ? ', market hours only' : ''}`;

  async function create() {
    if (!key?.secret || !pub || !coinOk || !asset) return;
    setBusy(true);
    try {
      const res = await fetch('/api/app/config', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chain: 'solana', sourceToken: mint,
          wallet: { mode: 'import', privateKey: key.secret },
          reward,
          scheduleKind: when.kind, intervalMinutes: when.minutes, marketHoursOnly: when.kind === 'interval' && when.marketHours,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Could not create');
      const symbol = data.symbol || coinMeta?.symbol;
      toast(`${BRAND} is live for ${symbol ? `$${symbol}` : 'your coin'} on Solana.`);
      setLive({ ...data, mint, coin: coinMeta, asset, when });
      setKeyInput(''); // the key is on the server now, encrypted: nothing keeps it here
      setStep(5);
      onLaunched?.(data);
    } catch (e) {
      toast(e.message, 'err');
    } finally {
      setBusy(false);
    }
  }

  const cycleLines = [
    <>Collect the pump.fun creator fees on {coinMeta?.symbol ? `$${coinMeta.symbol}` : 'your coin'} (bonding curve and PumpSwap) into <span className="font-mono text-ink">{shortAddr(pub)}</span>.</>,
    <>Keep 0.02 SOL for network fees. With less than 0.005 SOL left to route, skip the cycle: the fees wait for the next one.</>,
    ...(asset && !asset.sol ? [<>Buy {asset.symbol} on Jupiter. A swap returning less than 90% of the fair price is refused, and that share is paid in SOL.</>] : []),
    asset && !asset.sol
      ? <>Pay holders by balance, about 7 per transaction. A holder whose share is worth less than opening a token account (~0.002 SOL) is skipped that cycle.</>
      : <>Pay holders by balance in SOL, about 18 per transaction.</>,
  ];

  return (
    <div className={embedded ? 'w-full' : 'mx-auto max-w-2xl px-5 py-10'}>
      <Heading eyebrow={`Set up ${BRAND} on Solana`} />
      <Rail steps={SOL_STEPS} step={step} />

      <div className="panel">
        <div className="p-5 sm:p-6">
          {step === 0 && (
            <div>
              <h2 className={h2Cls}>The key of the wallet that created your coin</h2>
              <p className="mt-1 text-[13px] leading-snug text-mut">pump.fun pays the creator fee of every trade to the wallet that launched the coin. {BRAND} collects it and routes it each cycle by signing with that wallet, so it needs its private key: a bot cannot sign with your browser wallet.</p>

              <div className="mt-4 flex flex-wrap items-center gap-x-2.5 gap-y-2 rounded-2xl border border-white/10 bg-white/[0.02] px-4 py-2.5">
                <Identity className="h-4 w-4 shrink-0 text-mut" />
                <span className="text-xs text-mut">Signed in with</span>
                <span className="font-mono text-[11px] text-ink">{user?.wallet ? shortAddr(user.wallet) : 'no wallet'}</span>
                <span className="label !text-[9px]">Solana</span>
                <span className="ml-auto flex flex-wrap items-center gap-1.5">
                  {onSwitchWallet && <button type="button" onClick={onSwitchWallet} className={`${miniBtn} ${focusCls}`}><Convert className="h-3 w-3" />Switch</button>}
                  {onLogout && <button type="button" onClick={onLogout} className={`${miniBtn} hover:!border-down/50 hover:!text-down ${focusCls}`}><SignOut className="h-3 w-3" />Disconnect</button>}
                </span>
              </div>

              <div className="mt-4">
                <Field label="Private key of the creator wallet">
                  <input type="password" value={keyInput} onChange={(e) => setKeyInput(e.target.value)} placeholder="Base58, about 88 characters" className={inputCls} autoComplete="off" spellCheck={false} data-1p-ignore="true" data-lpignore="true" autoFocus />
                </Field>
                <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[11px] text-mut">
                  <span>In Phantom:</span>
                  {['Settings', 'Manage accounts', 'Show private key'].map((s, i) => (
                    <Fragment key={s}>
                      {i > 0 && <CaretRight className="h-2.5 w-2.5 text-dim" />}
                      <span className="rounded-lg border border-white/10 bg-white/[0.04] px-1.5 py-0.5 font-mono text-[10.5px] text-ink">{s}</span>
                    </Fragment>
                  ))}
                  <span>Solflare and Backpack export the same base58 key. A 32-byte seed or a JSON array also works.</span>
                </div>
                {keyError && <p className="mt-2 text-xs text-down">{keyError}</p>}
                {pub && (
                  <div className="mt-3 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-2.5">
                    <p className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-xs text-mut"><Check className="h-3 w-3 text-cyan-500" />Wallet of this key <SolscanLink address={pub} full className="text-[11.5px] text-ink" /></p>
                    {key.seed && <p className="mt-1 text-[11px] leading-snug text-gold-400">Read as a 32-byte seed. A Phantom private key is about 88 characters: if you pasted an address, this wallet is not yours.</p>}
                    {user?.wallet && <p className="mt-1 text-[11px] leading-snug text-mut">{pub === user.wallet ? 'The wallet you signed in with.' : 'Not the wallet you signed in with. That works: fees are collected in the wallet of this key.'}</p>}
                  </div>
                )}
              </div>

              <div className="mt-4 space-y-2">
                <div className={note}>
                  <NoteEdge />
                  <span className="flex items-start gap-2"><Lock className="mt-px h-3.5 w-3.5 shrink-0 text-cyan-500" /><span><span className="font-medium text-ink">It stays in this browser until you launch.</span> Then it is sent once over HTTPS and encrypted (AES-256-GCM) before it is stored. {BRAND} never shows it again; you can reveal it later from the dashboard with a fresh signature.</span></span>
                </div>
                <div className={note}>
                  <NoteEdge tone="gold" />
                  <span className="flex items-start gap-2"><Warning className="mt-px h-3.5 w-3.5 shrink-0 text-gold-400" /><span>Each cycle routes all the SOL in this wallet above the 0.02 SOL kept for network fees. Keep savings in another wallet.</span></span>
                </div>
              </div>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-4">
              <div>
                <h2 className={h2Cls}>Which pump.fun coin routes its fees?</h2>
                <p className="mt-1 text-[13px] leading-snug text-mut">Paste its mint, the CA on the coin&apos;s pump.fun page. {BRAND} checks that <span className="font-mono text-ink">{shortAddr(pub)}</span> created it.</p>
              </div>
              <Field label="Mint address">
                <input value={mintInput} onChange={(e) => setMintInput(e.target.value.trim())} placeholder="Mint, often ending in pump" className={inputCls} autoComplete="off" spellCheck={false} autoFocus />
              </Field>
              {mint && !isSolAddress(mint) && (
                <p className="text-xs text-mut">{/^0x/i.test(mint) ? 'That is a Robinhood Chain address. You signed in with a Solana wallet, so the coin is a Solana mint.' : 'Keep typing: a mint is 32 to 44 base58 characters.'}</p>
              )}
              {coin.checking && <p className="flex items-center gap-2 font-mono text-[10.5px] text-mut">{spinner}Looking up the mint on Jupiter and pump.fun…</p>}
              {coin.error && <p className="text-xs text-down">{coin.error}</p>}
              {coinMeta && (coinWrong ? <p className="text-xs text-down">{coinWrong}</p> : <SolCoinCard meta={{ ...coinMeta, address: coinMeta.address || mint }} wallet={pub} />)}
            </div>
          )}

          {step === 2 && (
            <div>
              <h2 className={h2Cls}>What do holders receive?</h2>
              <p className="mt-1 text-[13px] leading-snug text-mut">Holders are paid by balance every cycle, all in one asset. You can change it later on the canvas.</p>
              <div role="radiogroup" aria-label="Payout asset" className={`mt-4 ${listCls}`}>
                <ChoiceRow on={pay.kind === 'sol'} onSelect={() => setPay((p) => ({ ...p, kind: 'sol' }))} lead={<StockLogo address={SOL_MINT} size="h-8 w-8" text="text-[9px]" />} title="SOL" extra={<span className="label !text-[9px] text-cyan-500">Default</span>}>
                  No swap. Each holder&apos;s share is sent as SOL, about 18 holders per transaction, so a hundred holders are paid in a few seconds.
                </ChoiceRow>
                <ChoiceRow on={pay.kind === 'xstock'} onSelect={() => setPay((p) => ({ ...p, kind: 'xstock' }))} lead={xs ? <StockLogo address={xs.mint} size="h-8 w-8" text="text-[9px]" /> : <IconBox icon={Chart} on={pay.kind === 'xstock'} />} title="An xStock" extra={xs && <span className="font-mono text-[11px] text-cyan-500">{xs.symbol}</span>}>
                  A tokenized stock or ETF by Backed Finance. Each cycle buys it on Jupiter with the fees, then pays it out, about 7 holders per transaction.
                </ChoiceRow>
                <ChoiceRow on={pay.kind === 'mint'} onSelect={() => setPay((p) => ({ ...p, kind: 'mint' }))} lead={pay.kind === 'mint' && asset ? <StockLogo address={asset.address} meta={{ symbol: asset.symbol, image: asset.image }} size="h-8 w-8" text="text-[9px]" /> : <IconBox icon={Coins} on={pay.kind === 'mint'} />} title="Any token" extra={pay.kind === 'mint' && asset && <span className="font-mono text-[11px] text-cyan-500">{asset.symbol}</span>}>
                  Paste any mint Jupiter can buy: a partner&apos;s coin, or {coinMeta?.symbol ? `$${coinMeta.symbol}` : 'your coin'} itself.
                </ChoiceRow>
              </div>

              {pay.kind === 'xstock' && (
                <div className="mt-4">
                  <div className="label mb-2">Featured</div>
                  <div role="radiogroup" aria-label="Featured xStocks" className="grid grid-cols-3 gap-1.5 sm:grid-cols-5">
                    {FEATURED_XSTOCKS.map((x) => {
                      const on = pay.ticker === x.ticker;
                      return (
                        <button key={x.mint} type="button" role="radio" aria-checked={on} title={x.name} onClick={() => setPay((p) => ({ ...p, ticker: x.ticker }))}
                          className={`flex min-w-0 items-center gap-2 rounded-xl border px-2.5 py-1.5 text-left transition-colors ${on ? 'border-cyan-500/60 bg-white/[0.07] shadow-[0_0_16px_-6px_rgba(95,227,255,0.6)]' : 'border-white/10 bg-white/[0.02] hover:border-white/20 hover:bg-white/[0.04]'} ${focusCls}`}>
                          <StockLogo address={x.mint} size="h-5 w-5" text="text-[6px]" />
                          <span className={`truncate font-mono text-[12px] ${on ? 'text-ink' : 'text-mut'}`}>{x.symbol}</span>
                        </button>
                      );
                    })}
                  </div>
                  <div className="relative mt-3">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-mut" />
                    <input value={xq} onChange={(e) => setXq(e.target.value)} placeholder={`Search ${XSTOCKS.length} xStocks: ticker or company`} aria-label="Search xStocks" className={`${inputCls} !pl-8 !font-sans`} autoComplete="off" spellCheck={false} />
                  </div>
                  {xq.trim() && (
                    <div role="radiogroup" aria-label="xStocks found" className={`mt-2 ${listCls}`}>
                      {xsResults.map((x) => {
                        const on = pay.ticker === x.ticker;
                        return (
                          <button key={x.mint} type="button" role="radio" aria-checked={on} onClick={() => setPay((p) => ({ ...p, ticker: x.ticker }))} className={`relative flex w-full items-center gap-3 px-4 py-2 text-left transition-colors ${on ? 'bg-white/[0.06]' : 'hover:bg-white/[0.03]'} ${focusCls}`}>
                            {on && litEdge}
                            <StockLogo address={x.mint} size="h-6 w-6" text="text-[7px]" />
                            <span className="w-16 shrink-0 font-mono text-[12.5px] text-ink">{x.symbol}</span>
                            <span className="min-w-0 flex-1 truncate text-xs text-mut">{x.name}</span>
                            {on ? <Check className="h-3.5 w-3.5 shrink-0 text-cyan-500" /> : <CaretRight className="h-3 w-3 shrink-0 text-mut" />}
                          </button>
                        );
                      })}
                      {xsResults.length === 0 && <p className="px-4 py-3 text-xs text-mut">No xStock here matches. Paste its mint under Any token instead.</p>}
                    </div>
                  )}
                  <p className="mt-2 text-[11px] leading-snug text-mut">{XSTOCKS.length} familiar ones listed here. {BRAND} can pay any of the {XSTOCKS_TOTAL.toLocaleString('en-US')} xStocks Jupiter verifies: paste another one&apos;s mint under Any token.</p>
                </div>
              )}

              {pay.kind === 'mint' && (
                <div className="mt-4 space-y-2.5">
                  <Field label="Mint address">
                    <input value={pay.mint} onChange={(e) => { const v = e.target.value.trim(); setPay((p) => ({ ...p, mint: v })); }} placeholder="Any Solana mint" className={inputCls} autoComplete="off" spellCheck={false} />
                  </Field>
                  {coinMeta && payMint !== mint && (
                    <button type="button" onClick={() => setPay((p) => ({ ...p, mint }))} className={`${miniBtn} ${focusCls}`}>
                      <StockLogo address={mint} meta={{ symbol: coinMeta.symbol, image: coinMeta.image }} size="h-3.5 w-3.5" text="text-[5px]" />Pay in ${coinMeta.symbol} itself
                    </button>
                  )}
                  {payMint && !isSolAddress(payMint) && <p className="text-xs text-mut">Keep typing: a mint is 32 to 44 base58 characters.</p>}
                  {payLookup.checking && <p className="flex items-center gap-2 font-mono text-[10.5px] text-mut">{spinner}Looking up the mint on Jupiter…</p>}
                  {payLookup.error && <p className="text-xs text-down">{payLookup.error}</p>}
                  {asset && pay.kind === 'mint' && <AssetLine address={asset.address} symbol={asset.symbol} name={asset.name} image={asset.image} tag={asset.sol ? 'Native' : payMint === mint ? 'Your coin' : asset.stock ? 'xStock' : 'Token'} />}
                </div>
              )}

              {asset && !asset.sol && (
                <div className={`${note} mt-4`}>
                  <NoteEdge />
                  The fair-price guard: a Jupiter swap that returns less than 90% of the reference price is refused, and that share is paid in SOL instead. A holder whose share is worth less than opening a token account (~0.002 SOL) is skipped that cycle.
                </div>
              )}
            </div>
          )}

          {step === 3 && (
            <div>
              <h2 className={h2Cls}>How often does it run?</h2>
              <p className="mt-1 text-[13px] leading-snug text-mut">Each cycle collects the creator fees, keeps 0.02 SOL for network fees and routes the rest. With less than 0.005 SOL to route, a cycle is skipped and the fees wait for the next one.</p>
              <div role="radiogroup" aria-label="Schedule" className={`mt-4 ${listCls}`}>
                <ChoiceRow on={when.kind === 'interval'} onSelect={() => setWhen((w) => ({ ...w, kind: 'interval' }))} lead={<IconBox icon={Timer} on={when.kind === 'interval'} />} title="On a timer"
                  extra={when.kind === 'interval' && <span className="font-mono text-[11px] text-cyan-500">{everyLabel(when.minutes)}</span>}
                  below={(
                    <div className="mt-2.5">
                      <Seg size="sm" options={SOL_INTERVALS.map((m) => ({ value: m, label: m === 60 ? 'Hourly' : `${m} min`, title: capFirst(everyLabel(m)) }))} value={when.kind === 'interval' ? when.minutes : null} onChange={(m) => setWhen((w) => ({ ...w, kind: 'interval', minutes: m }))} />
                    </div>
                  )}>
                  Around the clock, many small payouts.
                </ChoiceRow>
                <ChoiceRow on={when.kind === 'closing_bell'} onSelect={() => setWhen((w) => ({ ...w, kind: 'closing_bell' }))} lead={<IconBox icon={Bell} on={when.kind === 'closing_bell'} />} title="At the closing bell"
                  extra={when.kind === 'closing_bell' && <span className="font-mono text-[11px] text-cyan-500">4:00 pm New York</span>}>
                  Once a day at 4:00 pm New York, Monday to Friday: one larger payout instead of many small ones.
                </ChoiceRow>
              </div>
              <div className="mt-3">
                {when.kind === 'interval'
                  ? <Toggle checked={when.marketHours} onChange={(v) => setWhen((w) => ({ ...w, marketHours: v }))} label="Market hours only" hint="Run only while the New York market is open, 9:30 am to 4:00 pm on weekdays. Fees that build up overnight and at weekends are routed at the next open." />
                  : <p className="text-xs leading-snug text-mut">The closing bell always falls on a market day, so there is no market-hours setting to choose.</p>}
              </div>
            </div>
          )}

          {step === 4 && (
            <div>
              <h2 className={h2Cls}>Check it, then launch</h2>
              <dl className="mt-4 divide-y divide-white/[0.07] rounded-2xl border border-white/10 bg-white/[0.02] px-4">
                <div className="grid grid-cols-[6.5rem_1fr] items-center gap-3 py-3">
                  <dt className="label">Coin</dt>
                  <dd className="flex min-w-0 items-center gap-2 text-[13px] text-ink">
                    <StockLogo address={mint} meta={{ symbol: coinMeta?.symbol, image: coinMeta?.image }} size="h-5 w-5" text="text-[6px]" />
                    <span className="truncate">{coinMeta?.name || shortAddr(mint)}</span>
                    {coinMeta?.symbol && <span className="font-mono text-[11px] text-mut">${coinMeta.symbol}</span>}
                  </dd>
                </div>
                <div className="grid grid-cols-[6.5rem_1fr] items-baseline gap-3 py-3">
                  <dt className="label">Wallet</dt>
                  <dd className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 text-[13px] text-ink">
                    <span className="font-mono">{shortAddr(pub)}</span>
                    <span className="text-xs text-mut">key encrypted at rest</span>
                    {coinMeta?.isCreator === true && <span className="label !text-[9px] text-cyan-500">pump.fun creator</span>}
                    {coinMeta?.isCreator === false && <span className="label !text-[9px] !text-gold-400">not the creator</span>}
                  </dd>
                </div>
                <div className="grid grid-cols-[6.5rem_1fr] items-center gap-3 py-3">
                  <dt className="label">Paid in</dt>
                  <dd className="flex min-w-0 items-center gap-2 text-[13px] text-ink">
                    {asset && <StockLogo address={asset.address} meta={{ symbol: asset.symbol, image: asset.image }} size="h-5 w-5" text="text-[6px]" />}
                    <span className="font-mono">{asset?.symbol}</span>
                    {asset?.name && asset.name !== asset.symbol && <span className="truncate text-xs text-mut">{asset.name}</span>}
                  </dd>
                </div>
                {[
                  ['Routing', '100% to holders, by balance'],
                  ['Schedule', scheduleText],
                ].map(([k, v]) => <div key={k} className="grid grid-cols-[6.5rem_1fr] items-baseline gap-3 py-3"><dt className="label">{k}</dt><dd className="text-[13px] text-ink">{v}</dd></div>)}
                <div className="grid grid-cols-[6.5rem_1fr] items-baseline gap-3 py-3">
                  <dt className="label">Then</dt>
                  <dd className="text-[13px] leading-snug text-mut">
                    Add wallets, buybacks, a treasury in xStocks, any page on the internet
                    <span className="mx-1.5 inline-flex items-center gap-1.5 align-middle"><PlatformIcon platform="youtube" className="h-3.5 w-3.5" /><PlatformIcon platform="github" className="h-3.5 w-3.5" /><PlatformIcon platform="domain" className="h-3.5 w-3.5" /></span>
                    and change the payout: all on the canvas.
                  </dd>
                </div>
              </dl>
              <div className="mt-3 rounded-2xl border border-white/10 bg-white/[0.02] px-4 py-3">
                <div className="label mb-2 text-cyan-500">Every cycle</div>
                <ol className="space-y-1.5 text-xs leading-snug text-mut">
                  {cycleLines.map((l, i) => (
                    <li key={i} className="flex gap-2.5"><span className="figure w-3 shrink-0 font-mono text-[10.5px] text-cyan-500">{i + 1}</span><span>{l}</span></li>
                  ))}
                </ol>
              </div>
              {coinMeta?.isCreator === false && (
                <div className={`${note} mt-3`}>
                  <NoteEdge tone="gold" />
                  pump.fun pays this coin&apos;s creator fees to <span className="font-mono text-ink">{shortAddr(coinMeta.pump?.creator)}</span>. Only fees landing in <span className="font-mono text-ink">{shortAddr(pub)}</span> get routed.
                </div>
              )}
            </div>
          )}

          {step === 5 && live && (
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <span className="relative shrink-0">
                  <StockLogo address={live.mint} meta={{ symbol: live.coin?.symbol, image: live.coin?.image }} size="h-10 w-10" text="text-[9px]" />
                  <Verified className="absolute -bottom-1 -right-1 h-4 w-4 rounded-full bg-ground text-cyan-500" />
                </span>
                <div>
                  <h2 className="font-display text-lg font-medium leading-tight tracking-[-0.02em] text-ink">{live.symbol || live.coin?.symbol ? `$${live.symbol || live.coin.symbol}` : 'Your coin'} routes its fees now</h2>
                  <p className="mt-0.5 text-[13px] text-mut">
                    {live.when.kind === 'closing_bell'
                      ? 'First cycle at the closing bell, 4:00 pm New York.'
                      : `First cycle ${live.when.minutes === 1 ? 'within the minute' : live.when.minutes === 60 ? 'within the hour' : `within ${live.when.minutes} minutes`}${live.when.marketHours ? ' while the New York market is open, otherwise at the next open' : ''}.`}
                    {' '}Holders are paid in {live.asset?.symbol || 'SOL'}.
                  </p>
                </div>
              </div>
              {live.creator?.isCreator === false && (
                <div className={note}>
                  <NoteEdge tone="gold" />
                  <span className="font-medium text-ink">One more thing.</span> pump.fun pays this coin&apos;s creator fees to <span className="break-all font-mono text-ink">{live.creator.creator}</span>, not to <span className="break-all font-mono text-ink">{live.devWallet}</span>. Only what lands in <span className="font-mono text-ink">{shortAddr(live.devWallet)}</span> is routed.
                </div>
              )}
              <div>
                <div className="label mb-2 text-cyan-500">The link to share with your community</div>
                <SharePanel address={live.mint} symbol={live.symbol || live.coin?.symbol} />
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-white/10 px-5 py-3.5 sm:px-6">
          {step === 5
            ? <span className="text-xs text-mut">Next: draw the routing on the canvas.</span>
            : <Button variant="ghost" className="!px-4 !py-2 text-[13px]" onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0 || busy}>Back</Button>}
          {step === 5
            ? <Button className="!px-4 !py-2 text-[13px]" onClick={() => onCreated(live)}>Open the canvas<Arrow className="h-3.5 w-3.5" /></Button>
            : step < 4
              ? <Button className="!px-4 !py-2 text-[13px]" onClick={() => setStep((s) => s + 1)} disabled={!canNext}>Continue<Arrow className="h-3.5 w-3.5" /></Button>
              : <Button className="!px-4 !py-2 text-[13px]" onClick={create} busy={busy} disabled={busy || !pub || !coinOk || !asset}>Launch</Button>}
        </div>
      </div>
    </div>
  );
}
