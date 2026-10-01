import Link from 'next/link';
import { Arrow, PlatformIcon } from './Icons';
import CopyCA from './CopyCA';
import PageProbe from './PageProbe';
import { Glass, Flow, FlowChip } from './ui/Light';
import { BOT_URL, TOKEN } from '../lib/brand';

// The hero: the promise on the left, the product on the right as light. One
// beam of fees enters the routing and leaves in channels, each one a kind of
// destination, with the real logos at the end.
const CHANNELS = [
  { key: 'holders', share: 50, label: 'Holders', sub: 'paid in SOL, by balance', icon: <span className="block h-2.5 w-2.5 rounded-full bg-cyan-500 shadow-[0_0_12px_#5FE3FF]" /> },
  { key: 'page', share: 20, label: '@yourchannel', sub: 'YouTube · its own vault', icon: <PlatformIcon platform="youtube" className="h-5 w-5" /> },
  // eslint-disable-next-line @next/next/no-img-element
  { key: 'stock', share: 15, label: 'Treasury', sub: 'holds NVDAx', icon: <img src="/logos/stocks/NVDA.png" alt="" className="h-5 w-5 rounded-full" /> },
  { key: 'burn', share: 10, label: 'Buyback and burn', sub: `buys ${TOKEN}, burns it`, icon: <span className="block h-2.5 w-2.5 rounded-full bg-orange-700 shadow-[0_0_12px_#FF7A1A]" /> },
  { key: 'phone', share: 5, label: '+33 • •• •• •• 78', sub: 'a phone number · WhatsApp', icon: <PlatformIcon platform="phone" className="h-5 w-5" /> },
];

export default function Hero() {
  return (
    <section className="relative px-5 pt-14 sm:pt-20">
      <div className="mx-auto grid max-w-6xl items-center gap-x-12 gap-y-12 lg:grid-cols-[1fr_1.1fr]">
        <div>
          <div className="eyebrow mb-6">Fee routing · Solana first</div>
          <h1 className="font-display text-[2.9rem] font-medium leading-[0.98] tracking-[-0.035em] text-ink sm:text-6xl lg:text-[4.4rem]">
            Every fee your<br />coin earns,<br />
            <span className="text-beam">sent where you say.</span>
          </h1>
          <p className="mt-7 max-w-md text-[17px] leading-relaxed text-mut">
            Holders, a treasury in real stocks, a buyback, a wallet. And any page on the internet: a YouTube channel, a GitHub repo, a phone number. Every cycle, on chain, with a receipt.
          </p>
          <div className="mt-8"><PageProbe /></div>
          <div className="mt-6 flex flex-wrap items-center gap-x-3 gap-y-3">
            <Link href="/app" className="btn-primary">Route a coin <Arrow className="h-4 w-4" /></Link>
            <Link href="/claim" className="btn-ghost">Claim a page</Link>
            {BOT_URL && <a href={BOT_URL} target="_blank" rel="noopener noreferrer" className="ml-1 text-sm font-medium text-mut transition-colors hover:text-ink">Telegram bot ↗</a>}
            <CopyCA className="ml-auto" />
          </div>
          <div className="label mt-5">pump.fun creator fees · xStocks · Jupiter · Robinhood Chain too</div>
        </div>

        <Glass lit="left" className="p-5 sm:p-7">
          <div className="mb-4 flex items-center justify-between">
            <span className="label">Routing · {TOKEN} · cycle 0129</span>
            <span className="label flex items-center gap-2 !text-cyan-500"><span className="h-1.5 w-1.5 animate-pulse rounded-full bg-cyan-500 shadow-[0_0_10px_#5FE3FF]" />live</span>
          </div>
          <Flow channels={CHANNELS.map((c) => ({ key: c.key, share: c.share, node: <FlowChip icon={c.icon} label={c.label} sub={c.sub} share={c.share} /> }))} />
          <div className="mt-5 flex items-end justify-between border-t border-white/10 pt-4">
            <div><div className="label">In the dev wallet</div><div className="figure mt-1 text-3xl font-medium text-ink">4.82 <span className="text-base text-mut">SOL</span></div></div>
            <div className="text-right"><div className="label">Next cycle</div><div className="figure mt-1 font-mono text-3xl font-medium text-ink">14:32</div></div>
          </div>
        </Glass>
      </div>
      <p className="label mx-auto mt-6 max-w-6xl text-center !normal-case !tracking-normal">Every route, every payment and every vault is public and on chain.</p>
    </section>
  );
}
