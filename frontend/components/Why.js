import Link from 'next/link';
import Reveal from './Reveal';
import { Arrow, PlatformIcon } from './Icons';
import { BRAND } from '../lib/brand';
import { PLATFORMS } from '../lib/pages';

// The argument, set large, beside three cases written as entries of a ledger:
// who is paid, the page that stands for them, and how they prove it is theirs.
const CASES = [
  { platform: 'youtube', page: 'youtube.com/@yourchannel', title: 'The creator of the meme', body: 'The YouTuber whose video started it all. Paste the channel link and give it a share.' },
  { platform: 'github', page: 'github.com/your-project', title: 'The code you depend on', body: 'The open source repo the project is built on. A GitHub account is a route like any other.' },
  { platform: 'domain', page: 'yoursite.com', title: 'The artist behind the art', body: 'Their own site, by domain. They prove it with a DNS record and claim what has been waiting.' },
];
const proofOf = (p) => (PLATFORMS[p].proof === 'dns' ? 'DNS record' : `${PLATFORMS[p].label} sign-in`);

export default function Why() {
  return (
    <div id="why" className="scroll-mt-20">
      <div className="grid gap-x-12 gap-y-10 lg:grid-cols-12">
        <Reveal className="flex flex-col justify-between lg:col-span-6 xl:col-span-7">
          <div>
          <div className="eyebrow mb-5">Why {BRAND}</div>
          <h2 className="font-display text-[40px] font-medium leading-[1.02] tracking-tight text-ink sm:text-6xl lg:text-[46px] xl:text-[68px]">
            A coin&apos;s fees are revenue.{' '}
            <span className="whitespace-nowrap text-mut">You decide</span> <span className="text-gradient">where it goes</span>.
          </h2>
          </div>
          <div className="mt-9 grid gap-x-8 gap-y-5 border-t border-line pt-6 sm:grid-cols-2">
            <p className="text-sm leading-relaxed text-mut">
              Every trade of a coin pays its creator a fee. That is revenue, and revenue raises one question: what happens to it?
              With {BRAND} the creator draws the answer. A share to holders, a share kept, a buyback and burn, a treasury.
            </p>
            <p className="text-sm leading-relaxed text-mut">
              <span className="font-semibold text-ink">And now a share to people and projects outside crypto.</span> They do not need a wallet,
              and they do not need to have heard of {BRAND}. Each page gets its own on-chain vault that anyone can see. Its owner signs in
              with the platform, connects a wallet and claims.
            </p>
          </div>
        </Reveal>

        <Reveal delay={120} className="lg:col-span-6 lg:pt-10 xl:col-span-5">
          <div className="frame">
            <div className="flex items-center justify-between border-b border-line px-5 py-3">
              <span className="label">Three cases</span>
              <span className="label">Proof of ownership</span>
            </div>
            <ol className="divide-y divide-line">
              {CASES.map((c, i) => (
                <li key={c.platform} className="grid grid-cols-[auto_1fr] gap-x-4 px-5 py-5">
                  <span className="figure row-span-2 pt-0.5 text-[26px] font-medium leading-none text-mut/50">0{i + 1}</span>
                  <div className="flex items-center justify-between gap-x-3">
                    <span className="inline-flex min-w-0 items-center gap-2 font-mono text-[12px] text-ink">
                      <PlatformIcon platform={c.platform} className="h-4 w-4 shrink-0" />
                      <span className="truncate">{c.page}</span>
                    </span>
                    <span className="label shrink-0 text-hood-600">{proofOf(c.platform)}</span>
                  </div>
                  <div className="mt-2.5">
                    <h3 className="font-display text-lg font-medium tracking-tight text-ink">{c.title}</h3>
                    <p className="mt-1 text-sm leading-relaxed text-mut">{c.body}</p>
                  </div>
                </li>
              ))}
            </ol>
            <div className="flex flex-wrap gap-x-6 gap-y-2 border-t border-line px-5 py-3.5 text-sm">
              <Link href="/pages" className="inline-flex items-center gap-1.5 font-semibold text-hood-600 transition hover:text-hood-700">Pages receiving fees <Arrow className="h-3.5 w-3.5" /></Link>
              <Link href="/claim" className="inline-flex items-center gap-1.5 font-semibold text-mut transition hover:text-ink">Claim a page <Arrow className="h-3.5 w-3.5" /></Link>
            </div>
          </div>
        </Reveal>
      </div>
    </div>
  );
}
