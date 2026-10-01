// Where a page's owner comes to be paid.
import TickerTape from '../../components/TickerTape';
import Navigation from '../../components/Navigation';
import Footer from '../../components/Footer';
import Claim from '../../components/pages/Claim';
import { BRAND } from '../../lib/brand';
import { pageMeta } from '../../lib/meta';

export const metadata = pageMeta({
  title: 'Claim the fees routed to your page',
  description: 'A coin routes fees to your YouTube channel, GitHub account, domain, phone number or page. Connect it, choose a wallet, receive what waited for you.',
  path: '/claim',
});

// The three moves of a claim, as one line of light.
const MOVES = [
  ['Prove the page', 'Sign in with the platform, add a DNS record, or type the code sent to the phone.'],
  ['Choose the wallet', 'A Solana wallet, or a Robinhood Chain one. One signature, no gas.'],
  ['Receive the vault', 'What waited arrives in minutes; every later payment comes straight to you.'],
];

export default async function ClaimPage({ searchParams }) {
  const sp = await searchParams;
  const str = (v) => (typeof v === 'string' ? v.slice(0, 200) : '');
  return (
    <main className="min-h-screen">
      <TickerTape />
      <Navigation />
      {/* One screen on a desktop: the claim on the right, what it is and how it goes on the left. */}
      {/* At least one full screen under the ticker and the bar (94px), so the footer starts below the fold. */}
      <div className="relative mx-auto max-w-6xl px-5 py-8 lg:min-h-[calc(100svh-94px)] lg:py-10">
        <span aria-hidden="true" className="pointer-events-none absolute left-0 top-0 h-80 w-[36rem] max-w-full rounded-full bg-[radial-gradient(ellipse,rgba(47,168,255,0.18),transparent_65%)] blur-2xl" />
        <div className="relative grid gap-8 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-12">
          <div className="text-center lg:pt-2 lg:text-left">
            <div className="eyebrow mb-4">Claim</div>
            <h1 className="font-display text-[36px] font-medium leading-[1.04] tracking-[-0.035em] text-ink sm:text-[44px] lg:text-[48px]">
              Fees were routed to your page. <span className="text-beam">Take them.</span>
            </h1>
            <p className="mx-auto mt-4 max-w-md text-[15px] leading-relaxed text-mut lg:mx-0">A coin sent part of its fees to your channel, account, site or number. They wait in a vault made for your page. No gas, no fee.</p>
            <ol className="mx-auto mt-6 max-w-md space-y-3 text-left lg:mx-0">
              {MOVES.map(([m, note], i) => (
                <li key={m} className="flex gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-cyan-500/40 bg-cyan-500/[0.08] font-mono text-[11px] text-cyan-500">{i + 1}</span>
                  <span className="min-w-0">
                    <span className="block text-[14px] font-medium text-ink">{m}</span>
                    <span className="block text-[13px] leading-snug text-mut">{note}</span>
                  </span>
                </li>
              ))}
            </ol>
          </div>
          <div className="relative">
            <Claim initialPlatform={str(sp?.platform) || null} initialHandle={str(sp?.handle)} initialError={str(sp?.error) || null} signed={sp?.signed === '1'} />
          </div>
        </div>
      </div>
      <Footer />
    </main>
  );
}
