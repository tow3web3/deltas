// Where a page's owner comes to be paid.
import TickerTape from '../../components/TickerTape';
import Navigation from '../../components/Navigation';
import Footer from '../../components/Footer';
import Claim from '../../components/pages/Claim';
import { BRAND } from '../../lib/brand';
import { pageMeta } from '../../lib/meta';

export const metadata = pageMeta({
  title: 'Claim the fees routed to your page',
  description: 'A coin routes fees to your YouTube channel, GitHub account, domain or page. Connect it, choose a wallet, receive what waited for you.',
  path: '/claim',
});

export default async function ClaimPage({ searchParams }) {
  const sp = await searchParams;
  const str = (v) => (typeof v === 'string' ? v.slice(0, 200) : '');
  return (
    <main className="min-h-screen">
      <TickerTape />
      <Navigation />
      <div className="mx-auto max-w-6xl px-5 py-12">
        <div className="mx-auto max-w-2xl text-center">
          <div className="eyebrow mb-2">Claim</div>
          <h1 className="font-display text-3xl font-medium tracking-tight text-ink sm:text-5xl">Fees were routed to your page. Take them.</h1>
          <p className="mt-3 text-sm leading-relaxed text-mut">Connect the page, choose the wallet that gets paid. What waited in the vault is sent to it, and every later payment reaches it directly. No gas, no fee.</p>
        </div>
        <div className="mt-8">
          <Claim initialPlatform={str(sp?.platform) || null} initialHandle={str(sp?.handle)} initialError={str(sp?.error) || null} signed={sp?.signed === '1'} />
        </div>
      </div>
      <Footer />
    </main>
  );
}
