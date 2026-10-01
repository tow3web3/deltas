'use client';

// The memecoins of Robinhood Chain, live from the most traded pools, as a small
// sortable table. Each one is a coin that can plug into DELTAS today.
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import StockLogo from './StockLogo';
import { SortHead } from './Screener';
import { Arrow, Rise, Fall } from './Icons';

const fmtBig = (n) => (n == null ? '–' : n >= 1e9 ? `$${(n / 1e9).toFixed(n >= 1e10 ? 0 : 1)}B` : n >= 1e6 ? `$${(n / 1e6).toFixed(n >= 1e7 ? 0 : 1)}M` : n >= 1e3 ? `$${(n / 1e3).toFixed(0)}k` : `$${Number(n).toFixed(0)}`);
const fmtMove = (n) => { const a = Math.abs(n); return a >= 1000 ? `${(a / 1000).toFixed(1)}k%` : a >= 100 ? `${a.toFixed(0)}%` : `${a.toFixed(1)}%`; };

const COLUMNS = [
  { key: 'marketCap', label: 'Mcap', title: 'Market cap' },
  { key: 'volume24', label: 'Vol 24h', title: 'Volume traded over 24 hours' },
  { key: 'change24', label: '24h', title: 'Price change over 24 hours' },
];
const GRID = 'grid-cols-[minmax(0,1fr)_4.75rem_4rem] min-[460px]:grid-cols-[minmax(0,1fr)_3.5rem_4.75rem_4rem]';

export default function MemecoinList() {
  const [state, setState] = useState({ coins: null, error: null });
  const [sort, setSort] = useState({ key: 'volume24', dir: -1 });
  useEffect(() => {
    let alive = true;
    fetch('/api/memecoins').then((r) => r.json()).then((d) => alive && setState({ coins: d.coins || [], error: d.error || null })).catch((e) => alive && setState({ coins: [], error: e.message }));
    return () => { alive = false; };
  }, []);
  const coins = state.coins;

  const rows = useMemo(() => {
    if (!coins) return [];
    return [...coins].sort((a, b) => {
      const av = a[sort.key] ?? null, bv = b[sort.key] ?? null;
      if (av == null && bv == null) return 0;
      if (av == null) return 1;
      if (bv == null) return -1;
      return (bv - av) * -sort.dir;
    });
  }, [coins, sort]);
  const toggle = (key) => setSort((s) => ({ key, dir: s.key === key ? -s.dir : -1 }));
  // Volume bars are drawn on a square-root scale: the pools differ by orders of magnitude.
  const maxVol = Math.max(...(coins || []).map((c) => Math.sqrt(c.volume24 || 0)), 1);

  return (
    <div className="frame overflow-hidden">
      <div className="flex items-start justify-between gap-4 px-4 pb-3 pt-4">
        <div>
          <div className="label">Memecoins on Robinhood Chain</div>
          <div className="mt-1 font-display text-lg font-medium tracking-tight text-ink">Any of these can plug in today</div>
        </div>
        <span className="label mt-0.5 flex shrink-0 items-center gap-1.5 text-hood-600">
          <span className="relative flex h-1.5 w-1.5"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-hood-500 opacity-60" /><span className="relative h-1.5 w-1.5 rounded-full bg-hood-500" /></span>
          {coins ? `${coins.length} pools` : 'live'}
        </span>
      </div>

      <div className="max-h-[392px] overflow-y-auto border-t border-line">
        <div className={`sticky top-0 z-10 grid ${GRID} items-center gap-x-3 border-b border-line bg-paper px-4 py-2`}>
          <span className="label">Coin</span>
          {COLUMNS.map((c) => <span key={c.key} className={c.key === 'marketCap' ? 'hidden justify-end min-[460px]:flex' : 'flex justify-end'}><SortHead col={c} sort={sort} onSort={toggle} align="right" /></span>)}
        </div>

        <div className="divide-y divide-line/70">
          {coins === null && [0, 1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex items-center gap-3 px-4 py-2.5"><span className="h-7 w-7 animate-pulse rounded-full bg-tile" /><span className="h-2.5 w-28 animate-pulse rounded bg-tile" /><span className="ml-auto h-2.5 w-16 animate-pulse rounded bg-tile" /></div>
          ))}
          {rows.map((c) => {
            const up = (c.change24 ?? 0) >= 0;
            return (
              <Link key={c.address} href={`/${c.address}`} className={`group grid ${GRID} items-center gap-x-3 px-4 py-2 transition-colors hover:bg-tile/50`}>
                <span className="flex min-w-0 items-center gap-2.5">
                  <StockLogo address={c.address} meta={{ symbol: c.symbol, image: c.image }} size="h-7 w-7" text="text-[7px]" />
                  <span className="min-w-0">
                    <span className="block truncate text-[13px] font-medium leading-tight text-ink transition-colors group-hover:text-hood-700">{c.name}</span>
                    <span className="block truncate font-mono text-[10px] text-mut">${c.symbol}<span className="min-[460px]:hidden"> · {fmtBig(c.marketCap)}</span></span>
                  </span>
                </span>
                <span className="figure hidden text-right text-xs text-ink min-[460px]:block">{fmtBig(c.marketCap)}</span>
                <span className="text-right">
                  <span className="figure block text-xs text-ink">{fmtBig(c.volume24)}</span>
                  <span className="ml-auto mt-1 block h-[2px] w-full overflow-hidden rounded-[1px] bg-line"><span className="ml-auto block h-full bg-ink/50" style={{ width: `${Math.max(4, (Math.sqrt(c.volume24 || 0) / maxVol) * 100)}%` }} /></span>
                </span>
                <span className={`figure flex items-center justify-end gap-1 text-xs ${c.change24 == null ? 'text-mut' : up ? 'text-hood-600' : 'text-down'}`}>
                  {c.change24 == null ? '–' : <>{up ? <Rise className="h-2 w-2" /> : <Fall className="h-2 w-2" />}{fmtMove(c.change24)}</>}
                </span>
              </Link>
            );
          })}
          {coins && coins.length === 0 && <div className="px-4 py-5 text-xs text-mut">The chain list is busy right now. Try again in a minute.</div>}
        </div>
      </div>

      <div className="flex items-center justify-between gap-4 border-t border-line px-4 py-3">
        <span className="text-xs leading-snug text-mut">Yours is not here yet? Any ERC-20 on Robinhood Chain works.</span>
        <Link href="/app" className="label inline-flex shrink-0 items-center gap-1 whitespace-nowrap !text-hood-600 transition-colors hover:!text-hood-700">Link my coin <Arrow className="h-3 w-3" /></Link>
      </div>
    </div>
  );
}
