// The project token on Robinhood Chain + the minimum holding required for missions.
import { TOKEN_CA, TOKEN_ON_EVM } from './brand';

// Missions read balances on Robinhood Chain: off while the project token lives on Solana.
export const PROJECT_TOKEN = TOKEN_ON_EVM ? TOKEN_CA : '';
export const MIN_HOLD = 100_000;

export function claimMessage(wallet) {
  return `DELTAS Missions, claim rewards\nChain: Robinhood Chain (4663)\nWallet: ${wallet}`;
}

// `icon` is the name of an export of components/Icons.js, resolved by the component
// that draws the rank (this file is also read by API routes, so no component here).
export const RANKS = [
  { name: 'Rookie', min: 0, icon: 'Sprout' },
  { name: 'Holder', min: 100, icon: 'Coins' },
  { name: 'Diamond', min: 300, icon: 'Gem' },
  { name: 'Whale', min: 700, icon: 'Whale' },
  { name: 'Legend', min: 1500, icon: 'Crown' },
];

export function rankForXp(xp = 0) {
  let i = 0;
  for (let k = 0; k < RANKS.length; k++) if (xp >= RANKS[k].min) i = k;
  const cur = RANKS[i];
  const next = RANKS[i + 1] || null;
  const span = next ? next.min - cur.min : 1;
  const pct = next ? Math.min(100, Math.round(((xp - cur.min) / span) * 100)) : 100;
  return { ...cur, level: i + 1, next, pct, toNext: next ? next.min - xp : 0 };
}
