import Link from 'next/link';
import { Arrow } from './Icons';
import CopyCA from './CopyCA';
import RouteMap from './RouteMap';
import PageProbe from './PageProbe';
import { BOT_URL } from '../lib/brand';

export default function Hero() {
  return (
    <section className="relative px-5 pt-14 sm:pt-20">
      <div className="mx-auto max-w-6xl">
        <div className="grid items-start gap-x-14 gap-y-12 lg:grid-cols-[1.08fr_0.92fr]">
          <div>
            <div className="eyebrow mb-7">Fee routing on Robinhood Chain</div>

            <h1 className="font-display text-[2.75rem] font-medium leading-[0.98] tracking-[-0.035em] text-ink sm:text-6xl lg:text-[4.5rem]">
              Your coin&apos;s fees,<br />
              routed <span className="text-gradient">anywhere.</span>
            </h1>

            <p className="mt-7 max-w-lg text-[17px] leading-relaxed text-mut">
              To holders as a dividend, to a wallet, a buyback, a treasury. And now to <span className="text-ink">any page on the internet</span>: a channel, a repository, a site.
            </p>

            <div className="mt-9"><PageProbe /></div>

            <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-3 border-t border-line pt-5">
              <Link href="/app" className="btn-primary">Open the dashboard <Arrow className="h-4 w-4" /></Link>
              <Link href="/claim" className="group inline-flex items-center gap-1.5 text-sm font-semibold text-ink">Claim a page <Arrow className="h-3.5 w-3.5 text-mut transition-transform group-hover:translate-x-0.5 group-hover:text-ink" /></Link>
              {BOT_URL && <a href={BOT_URL} target="_blank" rel="noopener noreferrer" className="group inline-flex items-center gap-1.5 text-sm font-semibold text-mut transition-colors hover:text-ink">Telegram bot <Arrow className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" /></a>}
              <CopyCA className="ml-auto" />
            </div>
          </div>

          <div className="lg:pt-10">
            <RouteMap className="mx-auto w-full max-w-lg" />
            <p className="label mx-auto mt-3 max-w-lg text-center !normal-case !tracking-normal">Every route, every payment and every vault is public and on chain.</p>
          </div>
        </div>
      </div>
    </section>
  );
}
