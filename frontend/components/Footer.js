import Link from 'next/link';
import { X, Github } from './Icons';
import { Mark } from './Logo';
import { BRAND, TAGLINE, X_URL, COMMUNITY_URL, GITHUB_URL } from '../lib/brand';

const COLUMNS = [
  { title: 'Product', links: [['Dashboard', '/app'], ['Pages', '/pages'], ['Claim fees', '/claim'], ['Stocks', '/stocks'], ['My payouts', '/wallet']] },
  { title: 'Learn', links: [['Guide', '/guide'], ['How it works', '/#how'], ['Destinations', '/#destinations'], ['FAQ', '/#faq'], ['API', '/#developers']] },
  { title: 'Chain', links: [['Blockscout', 'https://robinhoodchain.blockscout.com'], ['Uniswap', 'https://app.uniswap.org'], ['DexScreener', 'https://dexscreener.com/robinhood']] },
];

export default function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer className="border-t border-line bg-ground px-5 py-10">
      <div className="mx-auto grid max-w-6xl gap-8 md:grid-cols-[1.4fr_repeat(3,1fr)]">
        <div>
          <div className="flex items-center gap-2.5">
            <Mark className="h-9 w-9" />
            <span className="font-display text-base font-semibold tracking-tight text-ink">{BRAND}</span>
          </div>
          <p className="mt-3 max-w-xs text-sm text-mut">{TAGLINE}: to holders, wallets, buybacks, a treasury, and any page on the internet.</p>
          <div className="mt-4 flex items-center gap-4 text-mut">
            {X_URL && <a href={X_URL} target="_blank" rel="noopener noreferrer" aria-label={`${BRAND} on X`} className="transition hover:text-ink"><X className="h-4 w-4" /></a>}
            {COMMUNITY_URL && <a href={COMMUNITY_URL} target="_blank" rel="noopener noreferrer" aria-label={`${BRAND} community on Telegram`} className="transition hover:text-ink"><svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className="h-4 w-4"><path d="M21.9 4.6 18.6 20c-.2 1-.9 1.3-1.8.8l-4.9-3.6-2.4 2.3c-.3.3-.5.5-1 .5l.4-5 9.2-8.3c.4-.4-.1-.6-.6-.2L6.1 13.7 1.3 12.2c-1-.3-1-1 .2-1.5L20.6 3.1c.9-.3 1.6.2 1.3 1.5z"/></svg></a>}
            <a href={GITHUB_URL} target="_blank" rel="noopener noreferrer" aria-label={`${BRAND} on GitHub`} className="transition hover:text-ink"><Github className="h-4 w-4" /></a>
          </div>
        </div>
        {COLUMNS.map((c) => (
          <div key={c.title}>
            <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-mut/70">{c.title}</div>
            <ul className="mt-3 space-y-2 text-sm">
              {c.links.map(([label, href]) => (
                <li key={label}>
                  {href.startsWith('http')
                    ? <a href={href} target="_blank" rel="noopener noreferrer" className="text-mut transition hover:text-ink">{label}</a>
                    : <Link href={href} className="text-mut transition hover:text-ink">{label}</Link>}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="mx-auto mt-8 max-w-6xl border-t border-line pt-5 text-xs leading-relaxed text-mut/70">
        <div className="mb-2 flex gap-5 text-mut">
          <Link href="/privacy" className="transition hover:text-ink">Privacy</Link>
          <Link href="/terms" className="transition hover:text-ink">Terms</Link>
        </div>
        © {year} {BRAND}. Not affiliated with Robinhood Markets: Stock Tokens are issued by Robinhood, {BRAND} only routes them. Not affiliated with YouTube, GitHub, X, Meta, TikTok or Twitch: their names identify where a page lives.
      </div>
    </footer>
  );
}
