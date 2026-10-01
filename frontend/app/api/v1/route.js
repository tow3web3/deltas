import { apiJson, apiOptions } from '../../../lib/apiResponse';
import { BRAND, GITHUB_URL } from '../../../lib/brand';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export function OPTIONS() {
  return apiOptions();
}

export function GET() {
  return apiJson({
    name: `${BRAND} Public API`,
    version: 'v1',
    // Solana first; Robinhood Chain too. Addresses tell the chain: base58 mints are Solana, 0x addresses Robinhood Chain.
    chains: [
      { key: 'solana', name: 'Solana', native: 'SOL', explorer: 'https://solscan.io' },
      { key: 'robinhood', name: 'Robinhood Chain', id: 4663, native: 'ETH', explorer: 'https://robinhoodchain.blockscout.com' },
    ],
    description: `Read-only data about the coins that route their fees with ${BRAND}.`,
    endpoints: {
      stats: { method: 'GET', path: '/api/v1/stats', description: 'Global stats.' },
      tokens: { method: 'GET', path: '/api/v1/tokens', description: 'Every token with an active bot.' },
      token: { method: 'GET', path: '/api/v1/token/{address}', description: 'Is a coin linked? Config and stats. A Solana mint or a Robinhood Chain address.' },
      stocks: { method: 'GET', path: '/api/v1/stocks', description: 'The Robinhood Stock Tokens on Robinhood Chain. On Solana, any xStock Jupiter verifies is payable.' },
      activity: { method: 'GET', path: '/api/v1/activity?limit=20', description: 'Recent linked tokens and dividends.' },
    },
    docs: GITHUB_URL,
  });
}
