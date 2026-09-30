// Everything that names the product, in one place. The accounts come from the
// environment; one that is not set is left out of every message and keyboard.
import dotenv from 'dotenv';

dotenv.config();

export const BRAND = 'DELTA';
export const TAGLINE = 'Route your fees anywhere';
export const SITE_URL = (process.env.WEBSITE_URL || process.env.FRONTEND_URL || 'https://deltas.world').replace(/\/+$/, '');
export const SITE_HOST = SITE_URL.replace(/^https?:\/\//, '');
export const X_HANDLE = (process.env.X_HANDLE || '').replace(/^@/, '');
export const X_URL = process.env.X_URL || (X_HANDLE ? `https://x.com/${X_HANDLE}` : '');
// How a shared post names us: the X account when there is one, else the name.
export const CREDIT = X_HANDLE ? `@${X_HANDLE}` : 'DELTA';
export const COMMUNITY_URL = process.env.COMMUNITY_URL || '';

// The project token. Unset until it is live: the holders-only gate, the default
// of /burns and the lottery stay off while the address is missing.
const isAddr = (a) => /^0x[0-9a-fA-F]{40}$/.test(String(a || ''));
export const PROJECT_TOKEN = isAddr(process.env.PROJECT_TOKEN_ADDRESS) ? process.env.PROJECT_TOKEN_ADDRESS.toLowerCase() : null;
export const TOKEN_SYMBOL = (process.env.PROJECT_TOKEN_SYMBOL || 'DELTA').replace(/^\$/, '');
export const TOKEN = `$${TOKEN_SYMBOL}`;
