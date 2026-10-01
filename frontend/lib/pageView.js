// What the site and the public API show about a page: the row, what it
// received, where it comes from, what waits in its vault. One builder so the
// profile page and /api/pages/... never drift apart.
//
// Amounts are stored in the chain's own smallest unit: wei on Robinhood Chain,
// lamports on Solana. Every USD figure here is converted with the price of the
// chain it was paid on, and a page shows both of its vaults, Solana first.
import { pageTotals, pagePayouts, pageSweeps, pageSources } from './pageQueries';
import { walletAssets } from './walletAssets';
import { solWalletAssets, solPrices, SOL_MINT } from './solana';
import { fetchTokenMeta } from './tokenMeta';
import { getQuotes } from './prices';
import { PLATFORMS, pageUrl, pageName, pagePath } from './pages';
import { SITE_URL } from './brand';

const keyOf = (chain) => (chain === 'solana' ? 'solana' : 'robinhood');
const UNIT = { robinhood: 1e18, solana: 1e9 };

/** USD for a raw native amount paid on `chain`. */
export const usdIn = (raw, chain, prices) => (Number(raw || 0) / UNIT[keyOf(chain)]) * (prices?.[keyOf(chain)] || 0);

/** ETH and SOL in USD, keyed by chain. */
export async function nativePrices() {
  const [q, sol] = await Promise.all([
    getQuotes(['ETH-USD']).catch(() => ({})),
    solPrices([SOL_MINT]).then((p) => p[SOL_MINT] || 0).catch(() => 0),
  ]);
  return { robinhood: q['ETH-USD']?.price || 0, solana: sol };
}

/** What one lamport is worth in wei today, for ranking pages paid on both chains. */
export const lamportWeight = (prices) => (prices?.robinhood > 0 && prices?.solana > 0 ? (1e9 * prices.solana) / prices.robinhood : 5e7);

/** A row of the recent-payments feed: a page card plus what was paid. */
export function payoutRow(r, prices, meta = {}) {
  const { receivedUsd, payments, coins, lastAt, ...card } = pageCard(r, prices);
  void receivedUsd; void payments; void coins; void lastAt;
  return {
    ...card,
    chain: keyOf(r.chain),
    amount: Number(r.amount) / 10 ** Number(r.decimals ?? 18), token: r.token, symbol: r.symbol, usd: usdIn(r.value_wei, r.chain, prices), direct: r.direct, tx: r.tx_hash, at: r.created_at,
    from: r.source_token ? { address: r.source_token, symbol: meta[r.source_token]?.symbol || null, image: meta[r.source_token]?.image || null } : null,
  };
}

/** Directory totals in USD, both chains together. */
export const statsUsd = (stats, prices) => usdIn(stats?.value_wei, 'robinhood', prices) + usdIn(stats?.value_lamports, 'solana', prices);

/** The short form, for lists. Works on a page row or a directory row. */
export function pageCard(p, prices = null) {
  return {
    platform: p.platform,
    platformLabel: PLATFORMS[p.platform]?.label || p.platform,
    handle: p.handle,
    name: p.display_name || pageName(p.platform, p.handle),
    avatar: p.avatar_url || null,
    slug: p.slug || null,
    url: pageUrl(p.platform, p.handle),
    path: pagePath(p.platform, p.handle, p.slug),
    claimed: Boolean(p.claimed ?? (p.claimed_wallet || p.sol_claimed_wallet)),
    vault: p.vault_address || null,
    solVault: p.sol_vault_address || null,
    receivedUsd: p.value_wei != null || p.value_lamports != null ? usdIn(p.value_wei, 'robinhood', prices) + usdIn(p.value_lamports, 'solana', prices) : null,
    payments: p.payments ?? null,
    coins: p.coins ?? null,
    lastAt: p.last_at || null,
  };
}

const held = (balance, chain) => (balance?.assets || []).filter((a) => a.amount > 0).map((a) => ({ chain, address: a.address, symbol: a.symbol, amount: a.amount, usd: a.usd, isNative: a.isNative, image: a.image || null }));

export async function pageView(page) {
  const [totals, payouts, sweeps, sources, evmVault, solVault, prices] = await Promise.all([
    pageTotals(page.id),
    pagePayouts(page.id, 25),
    pageSweeps(page.id, 10),
    pageSources(page.id),
    // An unclaimed vault is the balance to claim; a claimed one is only what landed since the last sweep.
    page.vault_address ? walletAssets(page.vault_address, 0n).catch(() => null) : null,
    page.sol_vault_address ? solWalletAssets(page.sol_vault_address, 0n).catch(() => null) : null,
    nativePrices(),
  ]);
  const meta = await fetchTokenMeta([...new Set([...sources.map((s) => s.token), ...payouts.map((p) => p.source_token)].filter(Boolean))]).catch(() => ({}));
  const coin = (a) => (a ? { address: a, symbol: meta[a]?.symbol || null, name: meta[a]?.name || null, image: meta[a]?.image || null } : null);
  // Solana first: it is where most coins live.
  const vaults = [
    page.sol_vault_address && { chain: 'solana', address: page.sol_vault_address, totalUsd: solVault?.totalUsd || 0, assets: held(solVault, 'solana') },
    page.vault_address && { chain: 'robinhood', address: page.vault_address, totalUsd: evmVault?.totalUsd || 0, assets: held(evmVault, 'robinhood') },
  ].filter(Boolean);
  const anyBalance = Boolean(evmVault || solVault);
  return {
    ...pageCard({ ...page, value_wei: totals.value_wei, value_lamports: totals.value_lamports, payments: totals.payments, coins: sources.filter((s) => s.is_active).length, last_at: totals.last_at }, prices),
    link: `${SITE_URL}${pagePath(page.platform, page.handle, page.slug)}`,
    claimedAt: page.claimed_at || null,
    claimedWallet: page.claimed_wallet || null,
    claimedSolWallet: page.sol_claimed_wallet || null,
    sweepPending: Boolean(page.sweep_pending),
    firstAt: totals.first_at || null,
    paidToOwnerUsd: usdIn(totals.direct_wei, 'robinhood', prices) + usdIn(totals.direct_lamports, 'solana', prices),
    vaults,
    vaultBalance: anyBalance ? { totalUsd: vaults.reduce((s, x) => s + x.totalUsd, 0), assets: vaults.flatMap((x) => x.assets) } : null,
    received: totals.assets
      .map((a) => ({ chain: keyOf(a.chain), token: a.token, symbol: a.symbol, amount: Number(a.amount) / 10 ** Number(a.decimals ?? 18), usd: usdIn(a.value_wei, a.chain, prices) }))
      .sort((a, b) => b.usd - a.usd),
    sources: sources.map((s) => ({ ...coin(s.token), shareBps: s.share_bps, active: s.is_active })),
    payouts: payouts.map((p) => ({ id: p.id, chain: keyOf(p.chain), from: coin(p.source_token), token: p.token, symbol: p.symbol, amount: Number(p.amount) / 10 ** Number(p.decimals ?? 18), usd: usdIn(p.value_wei, p.chain, prices), direct: p.direct, to: p.to_address, tx: p.tx_hash, at: p.created_at })),
    sweeps: sweeps.map((s) => ({ chain: keyOf(s.chain), symbol: s.symbol, amount: Number(s.amount) / 10 ** Number(s.decimals ?? 18), wallet: s.wallet, tx: s.tx_hash, at: s.created_at })),
  };
}
