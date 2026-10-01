'use client';

// The argument, set large and centred, then the picture of it: one pump.fun
// coin's fees coming down as a beam and splitting into three channels, each
// landing on a page outside crypto (the YouTuber who started the meme, the
// repo the project depends on, the artist's site), with how its owner proves it.
import Link from 'next/link';
import Reveal from './Reveal';
import { Arrow, PlatformIcon } from './Icons';
import { Glass } from './ui/Light';
import { Fan } from './RouteMap';
import { BRAND } from '../lib/brand';
import { PLATFORMS } from '../lib/pages';

const CASES = [
  { platform: 'youtube', share: 10, page: 'youtube.com/@yourchannel', title: 'The YouTuber who started the meme', body: 'The video the coin is named after. Paste the channel link and give it a share: every cycle pays its vault.' },
  { platform: 'github', share: 5, page: 'github.com/your-project', title: 'The repo it depends on', body: 'The open source code the project is built on. A GitHub account or org is a destination like any other.' },
  { platform: 'domain', share: 5, page: 'yoursite.com', title: "The artist's site", body: 'The artist who drew the mascot, by their own domain. They prove it with a DNS record and take what waited for them.' },
];
const proofOf = (p) => (PLATFORMS[p].proof === 'dns' ? 'DNS record' : `${PLATFORMS[p].label} sign-in`);

// The cards sit in three columns 16px apart; each channel lands on the middle of its card.
const COL_GAP = 16;
const ENDS = CASES.map((c, i) => ({ key: c.platform, share: c.share, at: (W) => ((W - 2 * COL_GAP) / 3) * (i + 0.5) + i * COL_GAP }));

export default function Why() {
  return (
    <div id="why" className="scroll-mt-20">
      <Reveal className="mx-auto max-w-4xl text-center">
        <div className="eyebrow mb-6">Why {BRAND}</div>
        <h2 className="font-display text-[40px] font-medium leading-[1.0] tracking-[-0.035em] text-ink sm:text-[60px] lg:text-[72px]">
          A coin&apos;s fees are revenue.{' '}
          <span className="text-mut">You decide</span> <span className="text-beam">where it goes.</span>
        </h2>
      </Reveal>

      <Reveal delay={100} className="mx-auto mt-10 grid max-w-3xl gap-x-10 gap-y-4 text-[15px] leading-relaxed text-mut sm:grid-cols-2">
        <p>
          Every trade of a pump.fun coin pays its creator a fee. That is revenue, and revenue raises one question: where does it go?
          With {BRAND} the creator draws the answer. A share to holders, a share kept, a buyback and burn, a treasury in xStocks.
        </p>
        <p>
          <span className="font-medium text-ink">And a share to people and projects outside crypto.</span> They do not need a wallet,
          and they do not need to have heard of {BRAND}. Each page gets its own vault on chain that anyone can see. Its owner proves
          the page is theirs, connects a wallet and claims.
        </p>
      </Reveal>

      <Reveal delay={160} className="mt-16">
        {/* the source: one coin's fees */}
        <div className="flex justify-center">
          <div className="relative z-10 inline-flex items-center gap-3 rounded-full border border-white/10 bg-[rgba(5,7,12,0.8)] py-2 pl-2 pr-5 shadow-[0_0_40px_rgba(47,168,255,0.25)] backdrop-blur-md">
            <span className="flex h-8 w-8 items-center justify-center rounded-full border border-cyan-500/40 font-mono text-[8px] text-ink">$COIN</span>
            <span className="text-[13px] text-ink">A pump.fun coin<span className="text-mut"> · creator fees, every cycle</span></span>
          </div>
        </div>

        {/* the split, down to the three pages */}
        <Fan ends={ENDS} height={88} from="down" className="hidden md:block" />

        <div className="mt-6 grid gap-4 md:mt-0 md:grid-cols-3">
          {CASES.map((c) => (
            <Glass key={c.platform} lit="top" className="flex h-full flex-col p-6">
              <div className="flex items-center justify-between">
                <span className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/5">
                  <PlatformIcon platform={c.platform} className="h-5 w-5" />
                </span>
                <span className="font-mono text-sm tabular-nums text-cyan-500">{c.share}%</span>
              </div>
              <div className="mt-5 truncate font-mono text-[12px] text-ink/75">{c.page}</div>
              <h3 className="mt-2 text-[20px] font-medium leading-snug tracking-[-0.02em] text-ink">{c.title}</h3>
              <p className="mt-2 flex-1 text-[14px] leading-relaxed text-mut">{c.body}</p>
              <div className="mt-5 flex items-center justify-between gap-3 border-t border-white/10 pt-4">
                <span className="label">Proof</span>
                <span className="label !text-hood-600">{proofOf(c.platform)}</span>
              </div>
            </Glass>
          ))}
        </div>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-sm">
          <Link href="/pages" className="group inline-flex items-center gap-1.5 font-medium text-hood-600 transition-colors hover:text-hood-700">Pages receiving fees <Arrow className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" /></Link>
          <Link href="/claim" className="group inline-flex items-center gap-1.5 font-medium text-mut transition-colors hover:text-ink">Claim a page <Arrow className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" /></Link>
        </div>
      </Reveal>
    </div>
  );
}
