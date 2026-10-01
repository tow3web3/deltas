import Navigation from '../../components/Navigation';
import TickerTape from '../../components/TickerTape';
import Footer from '../../components/Footer';
import StockUniverse from '../../components/StockUniverse';
import CTA from '../../components/CTA';
import { Cut } from '../../components/ui/Light';
import { BRAND } from '../../lib/brand';
import { STOCKS } from '../../lib/stocks';
import { XSTOCKS_TOTAL } from '../../lib/xstocks';
import { pageMeta } from '../../lib/meta';

const TOTAL = XSTOCKS_TOTAL.toLocaleString('en-US');

export const metadata = pageMeta({
  title: `${TOTAL} xStocks a coin can pay out`,
  description: `The stocks and ETFs ${BRAND} can pay a coin's holders from its fees. On Solana, any of the ${TOTAL} xStocks Jupiter verifies; also on Robinhood Chain, the ${STOCKS.length} Robinhood Stock Tokens, by sector.`,
  path: '/stocks',
});

export default function StocksPage() {
  return (
    <>
      <TickerTape />
      <Navigation />
      <main className="mx-auto max-w-6xl space-y-24 px-5 py-14">
        <StockUniverse />
        <Cut />
        <CTA />
      </main>
      <Footer />
    </>
  );
}
