'use client';

import { useState } from 'react';
import { useWallet } from '../../lib/useWallet';
import { signIn } from '../../lib/authClient';
import { Button } from './ui';
import StockLogo from '../StockLogo';
import { PageAvatar } from '../pages/PageParts';
import { Users, Wallet, Vault, Check, Arrow } from '../Icons';
import { getStock } from '../../lib/stocks';
import { BRAND } from '../../lib/brand';

// The preview: what one cycle of a sample routing sends, line by line.
const SAMPLE = [
  { icon: Users, color: '#2FA8FF', name: 'Holders', note: '412 wallets', share: 60, paid: [['NVDA', '0.0421'], ['GLD', '0.0106']] },
  { icon: Wallet, color: '#F4F5F4', name: 'You', note: 'your own wallet', share: 20, paid: [['NVDA', '0.0140']] },
  { icon: Vault, color: '#F6C343', name: 'Treasury', note: 'holds SPY', share: 10, paid: [['SPY', '0.0058']] },
  { page: { platform: 'github', handle: 'your-project' }, color: '#5B9DFF', name: 'your-project', note: 'a page, paid in its vault', share: 10, paid: [['ETH', '0.0031']] },
];
const assetAddress = (t) => (t === 'ETH' ? '0x0000000000000000000000000000000000000000' : getStock(t)?.address);

export default function Login({ onLoggedIn }) {
  const wallet = useWallet();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);

  async function login() {
    setErr(null);
    setBusy(true);
    try {
      const addr = wallet.address || (await wallet.connect());
      if (!addr) throw new Error(wallet.error || 'Connect a wallet first');
      await signIn(wallet, addr);
      onLoggedIn();
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto grid max-w-6xl items-start gap-x-12 gap-y-10 px-5 py-14 lg:grid-cols-12">
      <div className="lg:col-span-5 lg:pt-4">
        <div className="eyebrow mb-4">Creator dashboard</div>
        <h1 className="font-display text-4xl font-medium leading-[1.02] tracking-tight text-ink sm:text-5xl">Your routing,<br />on one screen.</h1>
        <p className="mt-5 max-w-lg text-[15px] leading-relaxed text-mut">
          Route your coin&apos;s fees to holders, your own wallets, a buyback and burn, a treasury, and any page on the internet. Set the record date and the schedule, watch what the next cycle pays, run it now. Same engine as the Telegram bot, same account.
        </p>
        <div className="mt-7 flex flex-wrap items-center gap-3">
          <Button onClick={login} busy={busy}>{wallet.available ? (wallet.connected ? 'Sign in' : 'Connect wallet and sign in') : 'Install a wallet'}<Arrow className="h-3.5 w-3.5" /></Button>
          {wallet.connected && (
            <span className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-mut">
              <span className="font-mono text-ink">{wallet.address.slice(0, 6)}…{wallet.address.slice(-4)}</span>
              <button type="button" onClick={async () => { setErr(null); const a = await wallet.switchAccount(); if (!a) setErr(wallet.error || 'No account selected'); }} className="font-medium text-hood-600 hover:underline">Switch wallet</button>
              <button type="button" onClick={wallet.disconnect} className="hover:text-ink">Disconnect</button>
            </span>
          )}
        </div>
        {err && <p className="mt-3 text-sm text-down">{err}</p>}
        <ul className="mt-8 divide-y divide-line/70 border-y border-line text-[13px] text-mut">
          {['Sign in with any wallet, no gas, no email', `${BRAND} creates a dedicated dev wallet for you, or import yours`, 'Link Telegram later for receipts and alerts'].map((t) => (
            <li key={t} className="flex items-center gap-2.5 py-2.5"><Check className="h-3 w-3 shrink-0 text-hood-500" />{t}</li>
          ))}
        </ul>
      </div>

      <div className="frame lg:col-span-7">
        <div className="flex items-center justify-between gap-3 border-b border-line px-5 py-3">
          <span className="label">Sample · what the next cycle pays</span>
          <span className="label text-hood-600">at the closing bell</span>
        </div>
        <div className="px-5 pt-5">
          <div className="flex h-2 w-full gap-px overflow-hidden rounded-[2px] bg-line">{SAMPLE.map((s) => <div key={s.name} style={{ width: `${s.share}%`, background: s.color }} />)}</div>
        </div>
        <div className="mt-3 divide-y divide-line/70">
          {SAMPLE.map((s) => {
            const Icon = s.icon;
            return (
              <div key={s.name} className="grid grid-cols-[auto_1fr_auto] items-center gap-x-3 gap-y-1 px-5 py-3 sm:grid-cols-[auto_1fr_auto_3.5rem]">
                {s.page ? <PageAvatar page={s.page} size="h-7 w-7" badge="h-3.5 w-3.5" /> : <Icon className="h-7 w-7" style={{ color: s.color }} />}
                <div className="min-w-0">
                  <div className="truncate text-sm text-ink">{s.name}</div>
                  <div className="truncate font-mono text-[10.5px] text-mut">{s.note}</div>
                </div>
                <div className="col-span-3 col-start-2 flex flex-wrap items-center gap-x-3 gap-y-1 sm:col-span-1 sm:col-start-3 sm:justify-end">
                  {s.paid.map(([t, n]) => <span key={t} className="inline-flex items-center gap-1 font-mono text-[11px] tabular-nums text-ink"><StockLogo address={assetAddress(t)} size="h-4 w-4" text="text-[5px]" />{n} {t}</span>)}
                </div>
                <div className="figure col-start-3 row-start-1 text-right text-xl font-medium leading-none tracking-tight text-ink sm:col-start-4">{s.share}<span className="ml-px text-xs text-mut">%</span></div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
