'use client';

// The vote: what a vote is on the left, as three plain lines, and the live
// votes and the holder's own ballot on the right.
import Navigation from '../../components/Navigation';
import TickerTape from '../../components/TickerTape';
import Footer from '../../components/Footer';
import VoteDashboard from '../../components/vote/VoteDashboard';
import LiveVotes from '../../components/vote/LiveVotes';
import { BRAND } from '../../lib/brand';

const TERMS = [
  ['What you vote on', `the next stock, for every ${BRAND} token you hold`],
  ['What your vote weighs', 'your balance at the cycle snapshot'],
  ['What it costs', 'nothing: gasless, you just sign a message'],
];

export default function VotePage() {
  return (
    <>
      <TickerTape />
      <Navigation />
      <main className="mx-auto max-w-6xl px-5 py-10 sm:py-14">
        <div className="grid gap-x-12 gap-y-10 lg:grid-cols-12 lg:items-start">
          <div className="lg:sticky lg:top-24 lg:col-span-5">
            <div className="eyebrow">Community Vote</div>
            <h1 className="mt-4 font-display text-4xl font-medium leading-[1.04] tracking-tight text-ink sm:text-[52px]">Holders pick the dividend</h1>
            <p className="mt-5 max-w-md text-sm leading-relaxed text-mut">
              Connect your wallet to vote on the next stock for every {BRAND} token you hold. Votes are weighted by your
              balance at the cycle snapshot, and gasless: you just sign a message.
            </p>
            <dl className="mt-8 divide-y divide-line border-y border-line">
              {TERMS.map(([t, d]) => (
                <div key={t} className="grid gap-x-4 gap-y-0.5 py-3 sm:grid-cols-[11rem_minmax(0,1fr)] sm:items-baseline">
                  <dt className="label">{t}</dt>
                  <dd className="text-sm text-ink">{d}</dd>
                </div>
              ))}
            </dl>
          </div>
          <div className="min-w-0 lg:col-span-7">
            <LiveVotes />
            <VoteDashboard />
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
