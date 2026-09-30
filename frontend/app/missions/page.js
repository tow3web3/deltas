// Missions are not live yet. The page shows what is coming as it will be used:
// the ladder of ranks as one track, and the first missions as a locked list.
import Navigation from '../../components/Navigation';
import TickerTape from '../../components/TickerTape';
import Footer from '../../components/Footer';
import StockLogo from '../../components/StockLogo';
import { Gem, Vote, Flame, Handshake, Dice, Chart, Lock, Sprout, Route, Whale, Crown } from '../../components/Icons';
import { BRAND, TOKEN } from '../../lib/brand';
import { pageMeta } from '../../lib/meta';

export const metadata = pageMeta({ title: 'Missions, coming soon', description: 'Tasks for holders, with rewards paid on chain. Opening with the project token.', path: '/missions' });

const PREVIEW = [
  { Icon: Gem, title: 'Diamond hands', body: `Hold tiers from 100K to 1M ${TOKEN}.` },
  { Icon: Vote, title: 'Cast your vote', body: 'Take part in a Community Vote cycle.' },
  { Icon: Flame, title: 'Active voter', body: 'Vote across multiple cycles.' },
  { Icon: Handshake, title: 'Become a customer', body: 'Link your own token to the bot.' },
  { Icon: Dice, title: 'Spin the wheel', body: 'Turn on Stock Roulette.' },
  { Icon: Chart, title: 'Dividend collector', body: `Receive a stock dividend from any ${BRAND} token.`, later: true },
];

const RANKS = [
  { name: 'Rookie', Icon: Sprout },
  { name: 'Holder', Icon: Route },
  { name: 'Diamond', Icon: Gem },
  { name: 'Whale', Icon: Whale },
  { name: 'Legend', Icon: Crown },
];

export default function MissionsPage() {
  return (
    <>
      <TickerTape />
      <Navigation />
      <main className="mx-auto max-w-6xl px-5 py-10 sm:py-14">
        <div className="grid gap-x-12 gap-y-10 lg:grid-cols-12 lg:items-start">
          <div className="lg:sticky lg:top-24 lg:col-span-5">
            <div className="label flex items-center gap-2 !text-gold-400"><span className="h-1.5 w-1.5 animate-pulse rounded-full bg-gold-400" />Coming soon</div>
            <h1 className="mt-4 font-display text-4xl font-medium leading-[1.04] tracking-tight text-ink sm:text-[56px]">Earn from holding</h1>
            <p className="mt-5 max-w-md text-sm leading-relaxed text-mut">
              Holding won't be passive anymore. Complete missions, earn <span className="font-semibold text-ink">XP</span>, level up, and claim{' '}
              <span className="inline-flex items-center gap-1 align-middle text-ink"><StockLogo address={null} size="h-4 w-4" />ETH</span> rewards straight to your wallet, gasless. And soon, every project on {BRAND} will be able to run missions for
              their own holders.
            </p>
            <p className="mt-8 border-t border-line pt-4 text-sm text-mut">Missions drop with <span className="font-semibold text-ink">{TOKEN}</span> on Robinhood Chain.</p>
          </div>

          <div className="frame overflow-hidden lg:col-span-7">
            {/* The ladder: five ranks on one track */}
            <section className="px-5 pb-6 pt-5 sm:px-7">
              <div className="flex items-baseline justify-between gap-4">
                <h2 className="label">Climb the ranks</h2>
                <span className="label">XP moves you right</span>
              </div>
              <ol className="relative mt-6 grid grid-cols-5">
                <span className="absolute left-[10%] right-[10%] top-[18px] h-px bg-line" aria-hidden="true" />
                <span className="absolute left-[10%] top-[18px] h-px w-[20%] bg-gold-400/70" aria-hidden="true" />
                {RANKS.map(({ name, Icon }, i) => (
                  <li key={name} className="relative flex flex-col items-center text-center">
                    <span className={`flex h-9 w-9 items-center justify-center rounded-full border bg-paper ${i === 0 ? 'border-gold-400 text-gold-400' : 'border-line text-mut'}`}><Icon className="h-4 w-4" /></span>
                    <span className={`mt-2.5 text-xs font-semibold sm:text-sm ${i === 0 ? 'text-ink' : 'text-mut'}`}>{name}</span>
                    <span className="label mt-0.5 !text-[9.5px]">Rank {i + 1}</span>
                  </li>
                ))}
              </ol>
            </section>

            {/* The first missions, locked until launch */}
            <section className="border-t border-line">
              <div className="label grid grid-cols-[2rem_minmax(0,1fr)_auto] gap-x-4 px-5 py-2.5 sm:px-7">
                <span>No.</span><span>Mission</span><span>Status</span>
              </div>
              <ol className="divide-y divide-line border-t border-line">
                {PREVIEW.map(({ Icon, title, body, later }, i) => (
                  <li key={title} className="grid grid-cols-[2rem_minmax(0,1fr)_auto] items-center gap-x-4 px-5 py-3.5 sm:px-7">
                    <span className="figure text-sm text-mut">{String(i + 1).padStart(2, '0')}</span>
                    <span className="min-w-0 sm:grid sm:grid-cols-[11rem_minmax(0,1fr)] sm:items-baseline sm:gap-x-4">
                      <span className="flex items-center gap-2 text-sm font-semibold text-ink"><Icon className="h-4 w-4 shrink-0 text-hood-600" />{title}</span>
                      <span className="mt-0.5 block text-xs leading-relaxed text-mut sm:mt-0">{body}</span>
                    </span>
                    <span className="label flex items-center gap-1.5" title="Coming soon"><Lock className="h-3.5 w-3.5" />{later ? 'later' : 'locked'}</span>
                  </li>
                ))}
              </ol>
            </section>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
