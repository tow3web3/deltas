// Text with things in it. Markers:
//   {s:SOL}    SOL with its logo (/sol.png)
//   {s:NVDAx}  an xStock on Solana: the ticker plus a lowercase x, logo from lib/xstocks.js
//   {s:NVDA}   a Robinhood Stock Token (Robinhood Chain), {s:ETH} ETH, each with its logo
//   {p:youtube|YouTube} a platform with its logo, {l:/claim|Claim} a link,
//   {c:/status} a path or command set in mono, {b:bold text}.
import { Fragment } from 'react';
import Link from 'next/link';
import StockLogo from './StockLogo';
import { PlatformIcon } from './Icons';
import { getStock } from '../lib/stocks';
import { getXStock } from '../lib/xstocks';

const SOL_MINT = 'So11111111111111111111111111111111111111112';
const DISC = { size: 'h-[1.35em] w-[1.35em]', text: 'text-[6px]' };

/** The logo of what an {s:…} marker names: SOL, an xStock (NVDAx), ETH, or a Robinhood Stock Token (NVDA). */
function AssetLogo({ value }) {
  if (value === 'SOL') return <StockLogo address={SOL_MINT} meta={{ symbol: 'SOL', image: '/sol.png' }} {...DISC} />;
  if (value === 'ETH') return <StockLogo address={null} {...DISC} />;
  // A lowercase x after the ticker is the xStock: NVDAx, SPYx, GLDx.
  const x = /[A-Z]x$/.test(value) ? getXStock(value) : null;
  if (x) return <StockLogo address={x.mint} meta={{ symbol: x.symbol, image: x.logo }} {...DISC} />;
  const stock = getStock(value);
  return stock ? <StockLogo address={stock.address} {...DISC} /> : <StockLogo address={value} meta={{ symbol: value }} {...DISC} />;
}

export function Inline({ kind, value, text }) {
  if (kind === 's') {
    return (
      <span className="inline-flex items-center gap-1 whitespace-nowrap align-baseline font-medium text-ink">
        <AssetLogo value={value} />{value}
      </span>
    );
  }
  if (kind === 'p') {
    return (
      <span className="inline-flex items-center gap-1 whitespace-nowrap align-baseline font-medium text-ink">
        <PlatformIcon platform={value} className="h-[1.1em] w-[1.1em]" />{text}
      </span>
    );
  }
  if (kind === 'l') {
    const out = /^https?:/.test(value);
    const cls = 'font-medium text-hood-600 underline decoration-hood-300 underline-offset-4 transition-colors hover:text-hood-700 hover:decoration-hood-600';
    return out ? <a href={value} target="_blank" rel="noopener noreferrer" className={cls}>{text}</a> : <Link href={value} className={cls}>{text}</Link>;
  }
  if (kind === 'b') return <strong className="font-medium text-ink">{value}</strong>;
  return <code className="whitespace-nowrap rounded-md border border-white/10 bg-white/[0.06] px-1.5 py-px font-mono text-[0.82em] text-ink">{value}</code>;
}

export default function Rich({ text }) {
  const parts = String(text).split(/(\{[splcb]:[^}]+\})/g);
  return parts.map((part, i) => {
    const m = part.match(/^\{([splcb]):([^}|]+)(?:\|([^}]+))?\}$/);
    return m ? <Inline key={i} kind={m[1]} value={m[2]} text={m[3] || m[2]} /> : <Fragment key={i}>{part}</Fragment>;
  });
}
