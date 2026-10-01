import Link from 'next/link';
import { X, Github } from './Icons';
import { Mark } from './Logo';
import { BRAND, TAGLINE, X_URL, COMMUNITY_URL, GITHUB_URL } from '../lib/brand';
import { CHAINS } from '../lib/chains';

// The foot of every page: dark glass under a line of light, the mark with its
// glow, the columns, and the chain links Solana first. Robinhood Chain keeps a
// line of its own under the Solana ones.
const COLUMNS = [
  { title: 'Product', links: [['Dashboard', '/app'], ['Pages', '/pages'], ['Claim fees', '/claim'], ['Stocks', '/stocks'], ['My payouts', '/wallet']] },
  { title: 'Learn', links: [['Guide', '/guide'], ['How it works', '/#how'], ['Destinations', '/#destinations'], ['FAQ', '/#faq'], ['API', '/#developers']] },
  {
    title: 'Chain',
    links: [['Solscan', CHAINS.solana.explorer], ['Jupiter', 'https://jup.ag'], ['pump.fun', 'https://pump.fun'], ['DexScreener', 'https://dexscreener.com/solana']],
    second: { label: 'Robinhood Chain', links: [['Blockscout', CHAINS.robinhood.explorer]] },
  },
];

function FooterLink({ label, href }) {
  const cls = 'text-mut transition-colors hover:text-ink';
  return href.startsWith('http')
    ? <a href={href} target="_blank" rel="noopener noreferrer" className={cls}>{label}</a>
    : <Link href={href} className={cls}>{label}</Link>;
}

export default function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer className="relative overflow-hidden border-t border-white/10 bg-[rgba(5,7,12,0.72)] px-5 pb-10 pt-14 backdrop-blur-xl">
      {/* the line of light along the top edge, and the glow of the mark leaking from the left */}
      <span aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-px" style={{ background: 'linear-gradient(90deg, transparent, rgba(95,227,255,0.55) 25%, rgba(123,92,255,0.5) 70%, transparent)' }} />
      <span aria-hidden="true" className="pointer-events-none absolute -left-40 -top-40 h-[420px] w-[420px] rounded-full bg-hood-500/10 blur-3xl" />

      <div className="relative mx-auto grid max-w-6xl gap-10 md:grid-cols-[1.5fr_repeat(3,1fr)]">
        <div>
          <Link href="/" className="inline-flex items-center gap-3">
            <span className="relative">
              <Mark className="h-11 w-11" />
              <span aria-hidden="true" className="absolute inset-0 -z-10 rounded-full bg-hood-500/30 blur-xl" />
            </span>
            <span className="text-[19px] font-medium tracking-[-0.01em] text-ink">{BRAND}</span>
          </Link>
          <p className="mt-4 max-w-xs text-sm leading-relaxed text-mut">{TAGLINE}: to holders, wallets, buybacks, a treasury in stocks, and any page on the internet. Solana first, Robinhood Chain too.</p>
          <div className="mt-5 flex items-center gap-2">
            {X_URL && <a href={X_URL} target="_blank" rel="noopener noreferrer" aria-label={`${BRAND} on X`} className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-mut transition-colors hover:border-cyan-500/50 hover:text-ink"><X className="h-4 w-4" /></a>}
            {COMMUNITY_URL && <a href={COMMUNITY_URL} target="_blank" rel="noopener noreferrer" aria-label={`${BRAND} community on Telegram`} className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-mut transition-colors hover:border-cyan-500/50 hover:text-ink"><svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className="h-4 w-4"><path d="M21.9 4.6 18.6 20c-.2 1-.9 1.3-1.8.8l-4.9-3.6-2.4 2.3c-.3.3-.5.5-1 .5l.4-5 9.2-8.3c.4-.4-.1-.6-.6-.2L6.1 13.7 1.3 12.2c-1-.3-1-1 .2-1.5L20.6 3.1c.9-.3 1.6.2 1.3 1.5z"/></svg></a>}
            <a href={GITHUB_URL} target="_blank" rel="noopener noreferrer" aria-label={`${BRAND} on GitHub`} className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-mut transition-colors hover:border-cyan-500/50 hover:text-ink"><Github className="h-4 w-4" /></a>
          </div>
        </div>
        {COLUMNS.map((c) => (
          <div key={c.title}>
            <div className="label">{c.title}</div>
            <ul className="mt-4 space-y-2.5 text-sm">
              {c.links.map(([label, href]) => <li key={label}><FooterLink label={label} href={href} /></li>)}
            </ul>
            {c.second && (
              <div className="mt-5 border-t border-white/10 pt-4">
                <div className="label !text-[9.5px]">{c.second.label}</div>
                <ul className="mt-2.5 space-y-2.5 text-sm">
                  {c.second.links.map(([label, href]) => <li key={label}><FooterLink label={label} href={href} /></li>)}
                </ul>
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="relative mx-auto mt-12 max-w-6xl border-t border-white/10 pt-6 text-xs leading-relaxed text-dim">
        <div className="mb-3 flex flex-wrap items-center gap-x-5 gap-y-2">
          <Link href="/privacy" className="text-mut transition-colors hover:text-ink">Privacy</Link>
          <Link href="/terms" className="text-mut transition-colors hover:text-ink">Terms</Link>
          <span className="font-mono text-[11px] text-dim">© {year} {BRAND}</span>
        </div>
        <p className="max-w-4xl">
          {BRAND} is not affiliated with pump.fun, Jupiter, Backed Finance, Solana or Robinhood Markets: xStocks are issued by Backed Finance and Stock Tokens by Robinhood, {BRAND} only routes them. Nor with YouTube, GitHub, X, Meta, TikTok or Twitch. These names identify where things live.
        </p>
      </div>
    </footer>
  );
}
