// The close of the page: the mark on a line of light that crosses the whole
// width, one line set large under it, the ways in, and a single strip of facts
// that answer "how often, to what, paid in what". Part of the page, not a box.
import Link from 'next/link';
import { Arrow, PlatformIcon, Telegram } from './Icons';
import StockLogo from './StockLogo';
import { Mark } from './Logo';
import { Glass } from './ui/Light';
import { BOT_URL } from '../lib/brand';
import { PLATFORMS, PLATFORM_KEYS } from '../lib/pages';
import { XSTOCKS_TOTAL, getXStock } from '../lib/xstocks';

const SHOWN = ['NVDA', 'TSLA', 'SPY', 'GLD', 'AAPL'].map((t) => getXStock(t)).filter(Boolean);

function Fact({ label, figure, unit, className = '', children }) {
  return (
    <div className={`flex flex-col justify-between gap-5 border-white/10 px-6 py-6 ${className}`}>
      <div className="label">{label}</div>
      <div>
        <div className="flex items-baseline gap-2">
          <span className="figure text-[30px] font-medium leading-none tracking-[-0.02em] text-ink">{figure}</span>
          <span className="text-sm text-mut">{unit}</span>
        </div>
        <div className="mt-3 flex min-h-[28px] items-center">{children}</div>
      </div>
    </div>
  );
}

export default function CTA() {
  return (
    <div id="start" className="scroll-mt-20 pt-6">
      {/* the mark, with the light passing through it */}
      <div className="relative flex items-center justify-center py-6">
        <span aria-hidden="true" className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-gradient-to-r from-transparent via-cyan-500/80 to-transparent" />
        <span aria-hidden="true" className="beam absolute inset-x-[12%] top-1/2 h-2 -translate-y-1/2 rounded-full opacity-40 blur-md" />
        <div className="relative">
          <span aria-hidden="true" className="absolute -inset-16 rounded-full bg-[radial-gradient(circle,rgba(47,168,255,0.42),transparent_62%)] blur-2xl" />
          <Mark className="relative h-24 w-24 sm:h-28 sm:w-28" />
        </div>
      </div>

      <h2 className="mx-auto mt-10 max-w-5xl text-center font-display text-[44px] font-medium leading-[0.98] tracking-[-0.035em] text-ink sm:text-7xl lg:text-[92px]">
        Route your coin&apos;s fees <span className="text-beam">anywhere.</span>
      </h2>
      <p className="mx-auto mt-6 max-w-lg text-center text-[17px] leading-relaxed text-mut">
        Holders, wallets, a buyback, a treasury in xStocks, any page on the internet. Set it up from the dashboard or the Telegram bot, no code.
      </p>

      <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
        <Link href="/app" className="btn-primary !px-6 !py-3 !text-[15px]">Route a coin <Arrow className="h-4 w-4" /></Link>
        <Link href="/claim" className="btn-ghost !px-6 !py-3 !text-[15px]">Claim a page</Link>
        {BOT_URL && (
          <a href={BOT_URL} target="_blank" rel="noopener noreferrer" className="ml-1 inline-flex items-center gap-2 text-sm font-medium text-mut transition-colors hover:text-ink">
            <Telegram className="h-4 w-4 text-[#2AABEE]" />Telegram bot
          </a>
        )}
      </div>
      <p className="label mt-5 text-center">Solana first · Robinhood Chain too</p>

      <Glass lit="none" className="mt-14 grid sm:grid-cols-2 lg:grid-cols-4">
        <Fact label="Schedule" figure="1–60" unit="minutes" className="border-b sm:border-r lg:border-b-0">
          <span className="text-[13px] text-mut">or once a day at the closing bell</span>
        </Fact>
        <Fact label="Destinations" figure="5" unit="kinds" className="border-b lg:border-b-0 lg:border-r">
          <span className="text-[13px] text-mut">holders, wallets, buyback, treasury, pages</span>
        </Fact>
        <Fact label="Pages" figure={PLATFORM_KEYS.length} unit="platforms, any page" className="border-b sm:border-b-0 sm:border-r">
          <span className="flex flex-wrap items-center gap-2.5">
            {PLATFORM_KEYS.map((k) => <span key={k} title={PLATFORMS[k].label}><PlatformIcon platform={k} className="h-4 w-4" /></span>)}
          </span>
        </Fact>
        <Fact label="Paid in" figure={XSTOCKS_TOTAL.toLocaleString('en-US')} unit="xStocks, or SOL">
          <span className="flex items-center gap-1.5">
            {SHOWN.map((s) => <StockLogo key={s.mint} address={s.mint} meta={{ symbol: s.symbol, image: s.logo }} size="h-6 w-6" text="text-[6px]" />)}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/sol.png" alt="SOL" className="h-6 w-6 rounded-full" />
          </span>
        </Fact>
      </Glass>
    </div>
  );
}
