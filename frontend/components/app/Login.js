'use client';

import { useState } from 'react';
import { useWallet } from '../../lib/useWallet';
import { signIn } from '../../lib/authClient';
import { Button } from './ui';
import StockLogo from '../StockLogo';
import { PageAvatar } from '../pages/PageParts';
import { Glass, Flow, FlowChip } from '../ui/Light';
import { Users, Wallet, Vault, Check, Arrow } from '../Icons';
import { getStock } from '../../lib/stocks';
import { BRAND } from '../../lib/brand';

// The preview: what one cycle of a sample routing sends, drawn as light.
const SAMPLE = [
  { icon: Users, color: '#2FA8FF', name: 'Holders', note: '412 wallets', share: 60, paid: [['NVDA', '0.0421'], ['GLD', '0.0106']] },
  { icon: Wallet, color: '#F3F5F9', name: 'You', note: 'your own wallet', share: 20, paid: [['NVDA', '0.0140']] },
  { icon: Vault, color: '#7B5CFF', name: 'Treasury', note: 'holds SPY', share: 10, paid: [['SPY', '0.0058']] },
  { page: { platform: 'github', handle: 'your-project' }, color: '#5FE3FF', name: 'your-project', note: 'a page, paid in its vault', share: 10, paid: [['ETH', '0.0031']] },
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
    <div className="mx-auto grid max-w-6xl items-center gap-x-12 gap-y-10 px-5 py-14 lg:grid-cols-12">
      <div className="lg:col-span-5">
        <div className="eyebrow mb-5">Creator dashboard</div>
        <h1 className="font-display text-[2.6rem] font-medium leading-[1.0] tracking-[-0.035em] text-ink sm:text-[3.4rem]">Your routing,<br /><span className="text-beam">on one screen.</span></h1>
        <p className="mt-6 max-w-md text-[16px] leading-relaxed text-mut">
          Route your coin&apos;s fees to holders, your own wallets, a buyback and burn, a treasury, and any page on the internet. Set the record date and the schedule, watch what the next cycle pays, run it now. Same engine as the Telegram bot, same account.
        </p>
        <div className="mt-8 flex flex-wrap items-center gap-3">
          <Button onClick={login} busy={busy}>{wallet.available ? (wallet.connected ? 'Sign in' : 'Connect wallet and sign in') : 'Install a wallet'}<Arrow className="h-3.5 w-3.5" /></Button>
          {wallet.connected && (
            <span className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-mut">
              <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 font-mono text-ink">{wallet.address.slice(0, 6)}…{wallet.address.slice(-4)}</span>
              <button type="button" onClick={async () => { setErr(null); const a = await wallet.switchAccount(); if (!a) setErr(wallet.error || 'No account selected'); }} className="font-medium text-hood-600 hover:underline">Switch wallet</button>
              <button type="button" onClick={wallet.disconnect} className="transition-colors hover:text-ink">Disconnect</button>
            </span>
          )}
        </div>
        {err && <p className="mt-3 text-sm text-down">{err}</p>}
        <ul className="mt-8 divide-y divide-white/[0.07] rounded-2xl border border-white/10 bg-white/[0.02] px-4 text-[13px] text-mut">
          {['Sign in with any wallet, no gas, no email', `${BRAND} creates a dedicated dev wallet for you, or import yours`, 'Link Telegram later for receipts and alerts'].map((t) => (
            <li key={t} className="flex items-center gap-3 py-3">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-cyan-500/10"><Check className="h-3 w-3 text-cyan-500" /></span>{t}
            </li>
          ))}
        </ul>
      </div>

      <Glass lit="left" className="p-5 sm:p-7 lg:col-span-7">
        <div className="mb-4 flex items-center justify-between gap-3">
          <span className="label">Sample · what the next cycle pays</span>
          <span className="label flex items-center gap-2 text-cyan-500"><span className="h-1.5 w-1.5 rounded-full bg-cyan-500 shadow-[0_0_10px_#5FE3FF]" />at the closing bell</span>
        </div>
        <Flow channels={SAMPLE.map((s) => {
          const Icon = s.icon;
          const icon = s.page ? <PageAvatar page={s.page} size="h-6 w-6" badge="h-3 w-3" /> : <Icon className="h-5 w-5" style={{ color: s.color }} />;
          return { key: s.name, share: s.share, node: <FlowChip icon={icon} label={s.name} sub={s.note} share={s.share} /> };
        })} />
        <div className="mt-5 border-t border-white/10 pt-4">
          <div className="label mb-2.5">Paid this cycle</div>
          <div className="flex flex-wrap gap-1.5">
            {SAMPLE.flatMap((s) => s.paid.map(([t, n]) => (
              <span key={`${s.name}-${t}`} className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 py-1 pl-1 pr-2.5 font-mono text-[11px] tabular-nums text-ink">
                <StockLogo address={assetAddress(t)} size="h-4 w-4" text="text-[5px]" />{n} {t}<span className="text-dim">to {s.name === 'You' ? 'you' : s.name.toLowerCase()}</span>
              </span>
            )))}
          </div>
        </div>
      </Glass>
    </div>
  );
}
