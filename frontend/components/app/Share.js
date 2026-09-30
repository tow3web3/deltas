'use client';

// The public page of a coin, ready to share: copy the link, post it on X or
// Telegram. Shown right after launch and behind the Share button on the canvas.
import { useEffect, useState } from 'react';
import { Copy, Check, X, Telegram, External } from '../Icons';
import { SITE_URL } from '../../lib/brand';

const origin = () => (typeof window !== 'undefined' ? window.location.origin : SITE_URL).replace(/\/$/, '');

export function publicPageUrl(address) {
  return `${origin()}/${address}`;
}

const action = 'flex items-center justify-center gap-1.5 bg-ground px-2 py-2 text-xs font-medium text-ink transition-colors hover:bg-tile focus-visible:outline focus-visible:outline-1 focus-visible:-outline-offset-1 focus-visible:outline-hood-500';

export default function SharePanel({ address, symbol, compact = false }) {
  const [url, setUrl] = useState(`${SITE_URL}/${address}`);
  const [copied, setCopied] = useState(false);
  useEffect(() => { setUrl(publicPageUrl(address)); }, [address]);

  const sym = symbol ? `$${symbol}` : 'This coin';
  const text = `${sym} routes its creator fees in public on Robinhood Chain. Every cycle, every route, every wallet paid: all here`;
  const x = `https://twitter.com/intent/tweet?text=${encodeURIComponent(`${text}\n${url}`)}`;
  const tg = `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`;

  const copy = async () => {
    try { await navigator.clipboard.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch { /* clipboard unavailable */ }
  };

  return (
    <div className={compact ? 'space-y-2' : 'space-y-3'}>
      {/* One object: the link on top, what to do with it underneath. */}
      <div className="overflow-hidden rounded-xl border border-line bg-line">
        <button type="button" onClick={copy} className="group flex w-full items-center gap-3 bg-ground px-3 py-2.5 text-left transition-colors hover:bg-tile" title="Copy the link">
          <span className="min-w-0 flex-1 truncate font-mono text-xs text-ink">{url.replace(/^https?:\/\//, '')}</span>
          <span className={`label flex shrink-0 items-center gap-1 ${copied ? 'text-hood-600' : 'group-hover:text-ink'}`}>
            {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}{copied ? 'Copied' : 'Copy'}
          </span>
        </button>
        <div className="mt-px grid grid-cols-3 gap-px">
          <a href={x} target="_blank" rel="noreferrer" className={action}><X className="h-3 w-3" />Post</a>
          <a href={tg} target="_blank" rel="noreferrer" className={action}><Telegram className="h-3.5 w-3.5 text-[#2AABEE]" />Telegram</a>
          <a href={url} target="_blank" rel="noreferrer" className={action}>Open<External className="h-3 w-3 text-mut" /></a>
        </div>
      </div>
      {!compact && <p className="text-xs leading-snug text-mut">Holders see every cycle, their own share and the yield there. Pin it in your group, put it in your bio: it is the proof of where the fees go.</p>}
    </div>
  );
}
