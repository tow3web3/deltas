// Everything that names the product lives here: the brand, its links and its
// token. Change a handle or the domain in the environment, not in components.
export const BRAND = 'DELTA';
export const TAGLINE = 'Route your fees anywhere';
export const DESCRIPTION =
  'DELTA routes the creator fees of any coin, on Solana and on Robinhood Chain: to holders, to wallets, to a buyback, to a treasury, and to any page on the internet. A YouTube channel, a GitHub account, a domain, an Instagram or a Facebook page, a phone number gets its own vault; its owner proves it and claims.';

// The domain moves with NEXT_PUBLIC_SITE_URL. The fallback is the domain the
// product runs on.
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || 'https://deltas.world').replace(/\/$/, '');
export const SITE_HOST = SITE_URL.replace(/^https?:\/\//, '');

// The accounts of the brand. Each one is set in the environment; a link that is
// not set is simply not shown, so the site never points at an account that is
// not ours.
export const BOT_USERNAME = (process.env.NEXT_PUBLIC_BOT_USERNAME || '').replace(/^@/, '');
export const BOT_URL = BOT_USERNAME ? `https://t.me/${BOT_USERNAME}` : '';
export const X_URL = process.env.NEXT_PUBLIC_X_URL || '';
export const X_HANDLE = X_URL ? X_URL.replace(/\/+$/, '').split('/').pop().replace(/^@/, '') : '';
// How a shared post names us: the X account when there is one, else the name.
export const CREDIT = X_HANDLE ? `@${X_HANDLE}` : BRAND;
export const COMMUNITY_URL = process.env.NEXT_PUBLIC_COMMUNITY_URL || '';
export const GITHUB_URL = process.env.NEXT_PUBLIC_GITHUB_URL || 'https://github.com/tow3web3/deltas';
export const CONTACT_EMAIL = process.env.NEXT_PUBLIC_CONTACT_EMAIL || 'hello@deltas.world';

// The project token. Empty until it is live: every token feature (lottery,
// missions, the live link) stays off while the address is missing.
export const TOKEN_SYMBOL = (process.env.NEXT_PUBLIC_TOKEN_SYMBOL || 'DELTA').replace(/^\$/, '');
export const TOKEN_CA = process.env.NEXT_PUBLIC_TOKEN_CA || '';
export const TOKEN = `$${TOKEN_SYMBOL}`;
// Which chain the project token lives on: $DELTA is a pump.fun coin on Solana. The lottery and
// missions run on Robinhood Chain only, so they stay off for a Solana token.
export const TOKEN_CHAIN = !TOKEN_CA ? null : /^0x[0-9a-fA-F]{40}$/.test(TOKEN_CA) ? 'robinhood' : 'solana';
export const TOKEN_ON_EVM = TOKEN_CHAIN === 'robinhood';
