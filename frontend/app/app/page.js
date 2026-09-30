'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import TickerTape from '../../components/TickerTape';
import Footer from '../../components/Footer';
import Logo from '../../components/Logo';
import { DEMO_DATA, blankData } from '../../lib/demoData';
import Studio from '../../components/app/Studio';
import { ToastProvider, useToast } from '../../components/app/ui';
import { CaretDown, Convert, SignOut } from '../../components/Icons';
import { useWallet } from '../../lib/useWallet';
import { signIn, signOut, revealDevKey } from '../../lib/authClient';

/** Header chip: the signed-in wallet, with Switch wallet and Disconnect. */
function WalletMenu({ wallet, onSwitch, onLogout }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  if (!wallet) return null;
  return (
    <div className="relative">
      <button type="button" aria-expanded={open} onClick={() => setOpen((o) => !o)} className={`inline-flex items-center gap-2 rounded-lg border bg-ground px-2.5 py-1.5 font-mono text-xs text-ink outline-none transition-colors hover:border-hood-400 focus-visible:border-hood-500 ${open ? 'border-hood-500' : 'border-line'}`} title={wallet}>
        <span className="h-1.5 w-1.5 rounded-full bg-hood-500" />{wallet.slice(0, 6)}…{wallet.slice(-4)}<CaretDown className={`h-3 w-3 text-mut transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="frame absolute right-0 top-full z-50 mt-1.5 w-60 shadow-soft">
          <div className="border-b border-line px-3.5 py-3">
            <div className="label">Signed in as</div>
            <div className="mt-1.5 break-all font-mono text-[11px] leading-relaxed text-ink">{wallet}</div>
          </div>
          <div className="divide-y divide-line/70">
            <button type="button" disabled={busy} onClick={async () => { setBusy(true); try { await onSwitch(); setOpen(false); } finally { setBusy(false); } }} className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left text-[13px] text-ink transition-colors hover:bg-tile disabled:opacity-60"><Convert className="h-4 w-4 text-mut" />Switch wallet</button>
            <button type="button" disabled={busy} onClick={async () => { setBusy(true); try { await onLogout(); setOpen(false); } finally { setBusy(false); } }} className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left text-[13px] text-down transition-colors hover:bg-tile disabled:opacity-60"><SignOut className="h-4 w-4" />Disconnect</button>
          </div>
        </div>
      )}
    </div>
  );
}

function AppShell({ children, wallet, studio, onSwitch, onLogout, onConnect, connecting }) {
  return (
    <div className={studio ? 'flex h-screen flex-col overflow-hidden' : ''}>
      {!studio && <TickerTape />}
      <nav className="sticky top-0 z-40 border-b border-line bg-ground">
        <div className={`flex h-12 items-center justify-between ${studio ? 'px-4' : 'mx-auto max-w-6xl px-5'}`}>
          <Link href="/" className="flex items-center gap-3">
            <Logo />
            <span className="label border-l border-line pl-3">Dashboard</span>
          </Link>
          <div className="flex items-center gap-4 text-[13px]">
            <Link href="/stocks" className="hidden text-mut transition-colors hover:text-ink sm:inline">Stocks</Link>
            <Link href="/#check" className="hidden text-mut transition-colors hover:text-ink sm:inline">Token check</Link>
            {wallet ? <WalletMenu wallet={wallet} onSwitch={onSwitch} onLogout={onLogout} /> : <button type="button" onClick={onConnect} disabled={connecting} className="btn-primary !py-1.5 text-xs">{connecting ? 'Check your wallet…' : 'Connect wallet'}</button>}
          </div>
        </div>
      </nav>
      <main className={studio ? 'min-h-0 flex-1' : 'min-h-[70vh]'}>{children}</main>
      {!studio && <Footer />}
    </div>
  );
}

export default function AppPage() {
  return <ToastProvider><AppInner /></ToastProvider>;
}

function AppInner() {
  const [state, setState] = useState({ loading: true, data: null });
  const injected = useWallet();
  const toast = useToast();

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/app/me', { cache: 'no-store' });
      const data = await res.json();
      setState({ loading: false, data: res.ok ? data : null });
    } catch {
      setState({ loading: false, data: null });
    }
  }, []);

  useEffect(() => {
    load();
    const onRefresh = () => load();
    window.addEventListener('bm:refresh', onRefresh);
    const t = setInterval(load, 30000);
    return () => { window.removeEventListener('bm:refresh', onRefresh); clearInterval(t); };
  }, [load]);

  async function logout() {
    await signOut();
    injected.disconnect();
    setState({ loading: false, data: null });
  }

  const [connecting, setConnecting] = useState(false);
  // Connect: pick an account in the extension, sign the login message, load the real dashboard.
  async function connect() {
    setConnecting(true);
    try {
      const addr = injected.address || (await injected.connect());
      if (!addr) throw new Error(injected.error || 'No wallet found. Install MetaMask or Rabby, or open this page in your wallet browser.');
      await signIn(injected, addr);
      toast(`Signed in as ${addr.slice(0, 6)}…${addr.slice(-4)}`);
      await load();
    } catch (e) {
      toast(e.message, 'err');
    } finally {
      setConnecting(false);
    }
  }

  // Switch wallet: sign out, let the extension pick another account, sign in with it.
  async function switchWallet() {
    try {
      const addr = await injected.switchAccount();
      if (!addr) throw new Error(injected.error || 'No account selected');
      if (state.data?.user?.wallet && addr.toLowerCase() === state.data.user.wallet.toLowerCase()) { toast('Same wallet selected.'); return; }
      await signOut();
      await signIn(injected, addr);
      toast(`Signed in as ${addr.slice(0, 6)}…${addr.slice(-4)}`);
      await load();
    } catch (e) {
      toast(e.message, 'err');
    }
  }

  const wallet = state.data?.user?.wallet;
  return (
    <>
      <AppShell wallet={wallet} studio={!state.loading} onSwitch={switchWallet} onLogout={logout} onConnect={connect} connecting={connecting}>
        {state.loading ? (
          <div className="flex min-h-[50vh] items-center justify-center gap-2.5" role="status"><span className="h-3.5 w-3.5 animate-spin rounded-full border border-line border-t-hood-500" /><span className="label">Loading your routing</span></div>
        ) : !state.data?.user ? (
          <Studio data={DEMO_DATA} demo onConnect={connect} refresh={() => {}} onLogout={() => {}} />
        ) : !state.data.config ? (
          <Studio data={blankData(state.data.user)} setup onCreated={load} refresh={load} onLogout={logout} onSwitchWallet={switchWallet} />
        ) : (
          <Studio data={state.data} refresh={load} onLogout={logout} onSwitchWallet={switchWallet} onRevealKey={() => revealDevKey(injected, injected.address || wallet, state.data.config.dev_wallet_public)} />
        )}
      </AppShell>
    </>
  );
}
