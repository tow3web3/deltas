import { STOCKS, LIQUID_TICKERS, BASKETS } from '../../../lib/stocks';
import { apiJson, apiOptions } from '../../../lib/apiResponse';
import { SITE_URL } from '../../../lib/brand';

export const runtime = 'nodejs';

export function OPTIONS() {
  return apiOptions();
}

export function GET() {
  return apiJson({
    chainId: 4663,
    count: STOCKS.length,
    liquid: LIQUID_TICKERS,
    baskets: BASKETS,
    stocks: STOCKS.map((s) => ({ ticker: s.ticker, name: s.name, sector: s.sector, address: s.address, logo: `${SITE_URL}${s.logo}`, liquid: LIQUID_TICKERS.includes(s.ticker) })),
  });
}
