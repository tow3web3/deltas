// The close of the page: one line set large, the two ways in, and the facts
// that answer "how long, where to, how often". Part of the page, not a box.
import Link from 'next/link';
import { Arrow, PlatformIcon, Telegram } from './Icons';
import StockLogo from './StockLogo';
import { BOT_URL } from '../lib/brand';
import { PLATFORM_KEYS } from '../lib/pages';
import { STOCKS, getStock } from '../lib/stocks';

const ROUTES = [
  ['Holders', '#2FA8FF'],
  ['Wallets', '#F4F5F4'],
  ['Buyback', '#FF7A1A'],
  ['Treasury', '#F6C343'],
  ['Pages', '#5B9DFF'],
];
const SHOWN = ['NVDA', 'TSLA', 'SPY', 'GLD', 'AAPL'];

function Fact({ label, children, figure, unit }) {
  return (
    <div className="flex flex-col justify-between gap-5 bg-ground py-5 sm:px-6">
      <div className="label">{label}</div>
      <div>
        <div className="flex items-baseline gap-2">
          <span className="figure text-3xl font-medium leading-none tracking-tight text-ink">{figure}</span>
          <span className="text-sm text-mut">{unit}</span>
        </div>
        <div className="mt-3 flex min-h-[44px] items-start">{children}</div>
      </div>
    </div>
  );
}

export default function CTA() {
  return (
    <div id="start" className="scroll-mt-20 border-t border-line pt-14">
      <div className="grid items-end gap-x-10 gap-y-8 lg:grid-cols-[1fr_auto]">
        <div>
          <div className="eyebrow mb-5">Get started</div>
          <h2 className="font-display text-[44px] font-medium leading-[0.98] tracking-tight text-ink sm:text-7xl lg:text-[92px]">
            Route your coin&apos;s fees <span className="text-hood-500">anywhere.</span>
          </h2>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row lg:flex-col lg:pb-3">
          <Link href="/app" className="btn-primary whitespace-nowrap">Open the dashboard <Arrow className="h-4 w-4" /></Link>
          {BOT_URL ? <a href={BOT_URL} target="_blank" rel="noopener noreferrer" className="btn-ghost whitespace-nowrap"><Telegram className="h-4 w-4 text-[#2AABEE]" />Or use Telegram</a>
            : <Link href="/claim" className="btn-ghost whitespace-nowrap">Claim a page</Link>}
        </div>
      </div>

      <div className="mt-12 grid gap-px border-y border-line bg-line sm:grid-cols-2 lg:grid-cols-4">
        <Fact label="Setup" figure="&lt; 2" unit="minutes, no code">
          <span className="text-[13px] text-mut">Pick the routes, the schedule, and go.</span>
        </Fact>
        <Fact label="Routes" figure={ROUTES.length} unit="kinds of destination">
          <span className="flex flex-wrap gap-x-3 gap-y-1">
            {ROUTES.map(([name, color]) => <span key={name} className="inline-flex items-center gap-1.5 text-[12px] text-ink/80"><span className="h-2 w-[3px] rounded-full" style={{ background: color }} />{name}</span>)}
          </span>
        </Fact>
        <Fact label="Pages" figure={PLATFORM_KEYS.length} unit="platforms, any page">
          <span className="flex items-center gap-2.5">
            {PLATFORM_KEYS.map((k) => <PlatformIcon key={k} platform={k} className="h-4 w-4" />)}
          </span>
        </Fact>
        <Fact label="Paid in" figure={STOCKS.length} unit="stock tokens, or ETH">
          <span className="flex items-center gap-1.5">
            {SHOWN.map((t) => <StockLogo key={t} address={getStock(t).address} size="h-6 w-6" text="text-[6px]" />)}
            <StockLogo address={null} size="h-6 w-6" text="text-[6px]" />
          </span>
        </Fact>
      </div>
    </div>
  );
}
