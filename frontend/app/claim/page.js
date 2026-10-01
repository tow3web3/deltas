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
const MOVES = ['Prove the page', 'Choose the wallet', 'Receive the vault'];

export default async function ClaimPage({ searchParams }) {
  const sp = await searchParams;
  const str = (v) => (typeof v === 'string' ? v.slice(0, 200) : '');
  return (
    <main className="min-h-screen">
      <TickerTape />
      <Navigation />
      <div className="relative mx-auto max-w-6xl px-5 py-12 sm:py-16">
        <span aria-hidden="true" className="pointer-events-none absolute left-1/2 top-0 h-80 w-[36rem] max-w-full -translate-x-1/2 rounded-full bg-[radial-gradient(ellipse,rgba(47,168,255,0.2),transparent_65%)] blur-2xl" />
        <div className="relative mx-auto max-w-2xl text-center">
          <div className="eyebrow mb-5">Claim</div>
          <h1 className="font-display text-[40px] font-medium leading-[1.02] tracking-[-0.035em] text-ink sm:text-[56px]">
            Fees were routed to your page. <span className="text-beam">Take them.</span>
          </h1>
          <p className="mx-auto mt-5 max-w-lg text-[16px] leading-relaxed text-mut">Connect the page, choose the wallet that gets paid. What waited in the vault is sent to it, and every later payment reaches it directly. No gas, no fee.</p>
          <ol className="mx-auto mt-7 flex max-w-xl flex-wrap items-center justify-center gap-x-3 gap-y-2">
            {MOVES.map((m, i) => (
              <li key={m} className="flex items-center gap-3">
                {i > 0 && <span aria-hidden="true" className="beam h-px w-6 shrink-0 opacity-70 sm:w-8" />}
                <span className="label flex items-center gap-1.5 whitespace-nowrap !tracking-[0.14em]"><span className="text-cyan-500">{i + 1}</span>{m}</span>
              </li>
            ))}
          </ol>
        </div>
        <div className="relative mt-10">
          <Claim initialPlatform={str(sp?.platform) || null} initialHandle={str(sp?.handle)} initialError={str(sp?.error) || null} signed={sp?.signed === '1'} />
        </div>
      </div>
      <Footer />
    </main>
  );
}
