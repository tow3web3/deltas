'use client';

import { useEffect, useState } from 'react';
import { describeAddress } from '../lib/stocks';

/**
 * Logo disc for any asset. Stocks and ETH are served by the site itself, so
 * they always show. Any other token tries every place its icon can live (the
 * image the screener reports, the screener's CDN, the explorer) one after the
 * other. The coloured monogram sits underneath the whole time: it is what
 * shows while an icon loads, and what stays for a token that has published no
 * icon anywhere. The disc is never blank.
 */
export default function StockLogo({ address, meta, size = 'h-9 w-9', text = 'text-[10px]', className = '' }) {
  const d = describeAddress(address, meta);
  const sources = d.logos;
  const key = sources.join('|');
  const [at, setAt] = useState(0);
  const [loaded, setLoaded] = useState(false);
  useEffect(() => { setAt(0); setLoaded(false); }, [key]);
  const src = at < sources.length ? sources[at] : null;
  // The site's own files are there at first paint: no monogram flashing behind them.
  const local = Boolean(src) && src.startsWith('/') && !src.startsWith('/api/');
  return (
    <span
      className={`stock-logo relative ${size} ${text} font-mono font-bold text-white ${className}`}
      style={loaded || local ? undefined : { background: d.color, borderColor: d.color }}
    >
      {!loaded && !local && d.symbol.replace('$', '').slice(0, 4)}
      {src && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={src} src={src} alt={d.symbol}
          ref={(el) => { if (el?.complete && el.naturalWidth > 0) setLoaded(true); }}
          onLoad={() => setLoaded(true)}
          onError={() => { setLoaded(false); setAt((i) => i + 1); }}
          className={`absolute inset-0 h-full w-full object-cover ${loaded || local ? '' : 'opacity-0'}`}
        />
      )}
    </span>
  );
}
