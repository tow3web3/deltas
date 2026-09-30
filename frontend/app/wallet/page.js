'use client';

// The way into a statement: the address on the left, and on the right the form
// of the statement it opens, drawn with nothing filled in yet.
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Navigation from '../../components/Navigation';
import TickerTape from '../../components/TickerTape';
import Footer from '../../components/Footer';
import StockLogo from '../../components/StockLogo';
import { Arrow, Medal } from '../../components/Icons';
import { useWallet } from '../../lib/useWallet';
import { EVM_ADDR, getStock } from '../../lib/stocks';
import { BRAND } from '../../lib/brand';

// The assets a statement line can be paid in: ETH, then stocks.
const FORM_LINES = [null, 'NVDA', 'AAPL', 'SPY'];

export default function WalletLookup() {
  const router = useRouter();
  const wallet = useWallet();
  const [q, setQ] = useState('');
  const [err, setErr] = useState(null);

  const go = (a) => {
    if (!EVM_ADDR.test(a)) return setErr('Paste a 0x wallet address (42 characters).');
    router.push(`/wallet/${a}`);
  };

  return (
    <>
      <TickerTape />
      <Navigation />
      <main className="mx-auto max-w-6xl px-5 py-12 sm:py-16">
        <div className="grid gap-x-12 gap-y-10 lg:grid-cols-12 lg:items-center">
          <div className="lg:col-span-7">
            <div className="eyebrow">Dividend statement</div>
            <h1 className="mt-4 font-display text-4xl font-medium leading-[1.05] tracking-tight text-ink sm:text-5xl">What did holding earn you?</h1>
            <p className="mt-4 max-w-lg text-sm leading-relaxed text-mut">Every stock dividend a wallet received from any {BRAND} token, plus its loyalty standing. Shareable.</p>

            <form onSubmit={(e) => { e.preventDefault(); go(q.trim()); }} className="mt-8 max-w-xl">
              <label htmlFor="wallet-address" className="label">Wallet address</label>
              <div className="mt-2 flex flex-col gap-2 sm:flex-row">
                <input id="wallet-address" value={q} onChange={(e) => { setQ(e.target.value); if (err) setErr(null); }} placeholder="0x… wallet address" spellCheck={false} autoComplete="off" className={`min-w-0 flex-1 rounded-xl border bg-paper px-4 py-3 font-mono text-sm text-ink outline-none transition placeholder:text-mut/60 focus:ring-2 ${err ? 'border-down/60 focus:ring-down/20' : 'border-line focus:border-hood-400 focus:ring-hood-200'}`} />
                <button type="submit" className="btn-primary justify-center">Show <Arrow className="h-4 w-4" /></button>
              </div>
              {err && <p className="mt-2 text-xs text-down">{err}</p>}
            </form>
            <div className="mt-5 text-sm text-mut">
              or{' '}
              <button onClick={async () => { const a = wallet.address || (await wallet.connect()); if (a) go(a); }} className="font-semibold text-hood-600 underline-offset-4 hover:underline">
                connect your wallet
              </button>
            </div>
          </div>

          {/* The blank form of a statement */}
          <div className="frame overflow-hidden lg:col-span-5" aria-hidden="true">
            <div className="flex items-center justify-between gap-3 border-b border-line px-5 py-3.5">
              <span className="label">Statement</span>
              <span className="truncate font-mono text-[11px] text-mut">{EVM_ADDR.test(q.trim()) ? `${q.trim().slice(0, 6)}…${q.trim().slice(-4)}` : '0x your wallet'}</span>
            </div>
            <div className="divide-y divide-line">
              {FORM_LINES.map((t, i) => {
                const s = t ? getStock(t) : null;
                return (
                  <div key={t || 'eth'} className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-x-3 px-5 py-3">
                    <StockLogo address={s ? s.address : null} size="h-7 w-7" text="text-[7px]" />
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-ink">{s ? s.ticker : 'ETH'}</div>
                      <div className="truncate text-[11px] text-mut">{s ? s.name : 'Ether'}</div>
                    </div>
                    <span className="h-1.5 rounded-full bg-tile" style={{ width: 84 - i * 14 }} />
                  </div>
                );
              })}
            </div>
            <div className="border-t border-line px-5 py-3.5">
              <div className="flex items-center justify-between gap-3">
                <span className="label flex items-center gap-1.5"><Medal className="h-3.5 w-3.5 text-gold-400" />Loyalty standing</span>
                <span className="h-1.5 w-10 rounded-full bg-tile" />
              </div>
              <div className="mt-2 h-1 w-full rounded-full bg-line" />
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
