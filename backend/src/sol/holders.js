// Who holds a Solana coin right now: every token account of the mint, read
// through Helius's getTokenAccounts (paginated by mint), summed per owner.
// Pools, the bonding curve, the dev wallet and any program-owned account are
// left out, so payouts go to people.
import { PublicKey } from '@solana/web3.js';
import { rpc, conn, pk } from './client.js';
import { bondingCurvePda, PUMP_AMM_PROGRAM } from './pump.js';

const PAGE = 1000;

/** [{ owner, balance (bigint), accounts }] sorted by balance desc. `exclude`: addresses never paid. */
export async function tokenHolders(mint, { exclude = [], minBalance = 0n } = {}) {
  const byOwner = new Map();
  let cursor = null;
  for (let page = 0; page < 500; page++) {
    const params = { mint: pk(mint).toBase58(), limit: PAGE, options: { showZeroBalance: false } };
    if (cursor) params.cursor = cursor;
    const res = await rpc('getTokenAccounts', params);
    for (const a of res.token_accounts || []) {
      const amount = BigInt(a.amount || 0);
      if (amount <= 0n) continue;
      const cur = byOwner.get(a.owner) || { owner: a.owner, balance: 0n, accounts: 0 };
      cur.balance += amount; cur.accounts += 1;
      byOwner.set(a.owner, cur);
    }
    cursor = res.cursor;
    if (!cursor || (res.token_accounts || []).length < PAGE) break;
  }
  const skip = new Set([...exclude.map(String), bondingCurvePda(mint).toBase58()]);
  // Program-owned owners (pools, vaults) are not people: drop any owner whose account is executable or owned by a program other than System.
  const owners = [...byOwner.values()].filter((h) => !skip.has(h.owner) && h.balance >= minBalance);
  // The RPC answers at most 100 accounts per call.
  const infos = [];
  for (let i = 0; i < owners.length; i += 100) {
    infos.push(...(await conn().getMultipleAccountsInfo(owners.slice(i, i + 100).map((h) => new PublicKey(h.owner)))));
  }
  const people = owners.filter((h, i) => {
    const info = infos[i];
    if (!info) return true; // an owner with no account of its own is a plain wallet that never held SOL
    return !info.executable && info.owner.equals(new PublicKey('11111111111111111111111111111111'));
  });
  return people.sort((a, b) => (a.balance > b.balance ? -1 : a.balance < b.balance ? 1 : 0));
}

export { PUMP_AMM_PROGRAM };
