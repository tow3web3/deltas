// Text with things in it. Markers: {s:NVDA} a stock or ETH with its logo,
// {p:youtube|YouTube} a platform with its logo, {l:/claim|Claim} a link,
// {c:/status} a path or command set in mono, {b:bold text}.
import { Fragment } from 'react';
import Link from 'next/link';
import StockLogo from './StockLogo';
import { PlatformIcon } from './Icons';
import { getStock } from '../lib/stocks';

export function Inline({ kind, value, text }) {
  if (kind === 's') {
    const stock = getStock(value);
    return (
      <span className="inline-flex items-center gap-1 whitespace-nowrap align-baseline font-medium text-ink">
        <StockLogo address={stock ? stock.address : null} size="h-[1.35em] w-[1.35em]" text="text-[6px]" />{value}
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
    const cls = 'font-medium text-hood-600 underline decoration-hood-300 underline-offset-4 transition-colors hover:text-hood-700';
    return out ? <a href={value} target="_blank" rel="noopener noreferrer" className={cls}>{text}</a> : <Link href={value} className={cls}>{text}</Link>;
  }
  if (kind === 'b') return <strong className="font-semibold text-ink">{value}</strong>;
  return <code className="whitespace-nowrap rounded border border-line bg-tile px-1 py-px font-mono text-[0.82em] text-ink">{value}</code>;
}

export default function Rich({ text }) {
  const parts = String(text).split(/(\{[splcb]:[^}]+\})/g);
  return parts.map((part, i) => {
    const m = part.match(/^\{([splcb]):([^}|]+)(?:\|([^}]+))?\}$/);
    return m ? <Inline key={i} kind={m[1]} value={m[2]} text={m[3] || m[2]} /> : <Fragment key={i}>{part}</Fragment>;
  });
}
