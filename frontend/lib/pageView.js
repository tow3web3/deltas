// What the site and the public API show about a page: the row, what it
// received, where it comes from, what waits in its vault. One builder so the
// profile page and /api/pages/... never drift apart.
import { pageTotals, pagePayouts, pageSweeps, pageSources } from './pageQueries';
import { walletAssets } from './walletAssets';
import { fetchTokenMeta } from './tokenMeta';
import { getQuotes } from './prices';
import { PLATFORMS, pageUrl, pageName, pagePath } from './pages';
import { SITE_URL } from './brand';

const usd = (wei, ethUsd) => (Number(wei || 0) / 1e18) * ethUsd;

export async function ethPrice() {
  const q = await getQuotes(['ETH-USD']).catch(() => ({}));
  return q['ETH-USD']?.price || 0;
}

/** The short form, for lists. Works on a page row or a directory row. */
export function pageCard(p, ethUsd = 0) {
  return {
    platform: p.platform,
    platformLabel: PLATFORMS[p.platform]?.label || p.platform,
    handle: p.handle,
    name: p.display_name || pageName(p.platform, p.handle),
    avatar: p.avatar_url || null,
    slug: p.slug || null,
    url: pageUrl(p.platform, p.handle),
    path: pagePath(p.platform, p.handle, p.slug),
    claimed: Boolean(p.claimed ?? p.claimed_wallet),
    vault: p.vault_address,
    receivedUsd: p.value_wei != null ? usd(p.value_wei, ethUsd) : null,
    payments: p.payments ?? null,
    coins: p.coins ?? null,
    lastAt: p.last_at || null,
  };
}

export async function pageView(page) {
  const [totals, payouts, sweeps, sources, vault, ethUsd] = await Promise.all([
    pageTotals(page.id),
    pagePayouts(page.id, 25),
    pageSweeps(page.id, 10),
    pageSources(page.id),
    // An unclaimed vault is the balance to claim; a claimed one is only what landed since the last sweep.
    walletAssets(page.vault_address, 0n).catch(() => null),
    ethPrice(),
  ]);
  const meta = await fetchTokenMeta([...new Set([...sources.map((s) => s.token), ...payouts.map((p) => p.source_token)].filter(Boolean))]).catch(() => ({}));
  const coin = (a) => (a ? { address: a, symbol: meta[a]?.symbol || null, name: meta[a]?.name || null, image: meta[a]?.image || null } : null);
  return {
    ...pageCard({ ...page, value_wei: totals.value_wei, payments: totals.payments, coins: sources.filter((s) => s.is_active).length, last_at: totals.last_at }, ethUsd),
    link: `${SITE_URL}${pagePath(page.platform, page.handle, page.slug)}`,
    claimedAt: page.claimed_at || null,
    claimedWallet: page.claimed_wallet || null,
    sweepPending: Boolean(page.sweep_pending),
    firstAt: totals.first_at || null,
    paidToOwnerUsd: usd(totals.direct_wei, ethUsd),
    vaultBalance: vault ? { totalUsd: vault.totalUsd, assets: vault.assets.filter((a) => a.amount > 0).map((a) => ({ address: a.address, symbol: a.symbol, amount: a.amount, usd: a.usd, isNative: a.isNative })) } : null,
    received: totals.assets.map((a) => ({ token: a.token, symbol: a.symbol, amount: Number(a.amount) / 10 ** Number(a.decimals ?? 18), usd: usd(a.value_wei, ethUsd) })),
    sources: sources.map((s) => ({ ...coin(s.token), shareBps: s.share_bps, active: s.is_active })),
    payouts: payouts.map((p) => ({ id: p.id, from: coin(p.source_token), token: p.token, symbol: p.symbol, amount: Number(p.amount) / 10 ** Number(p.decimals ?? 18), usd: usd(p.value_wei, ethUsd), direct: p.direct, to: p.to_address, tx: p.tx_hash, at: p.created_at })),
    sweeps: sweeps.map((s) => ({ symbol: s.symbol, amount: Number(s.amount) / 10 ** Number(s.decimals ?? 18), wallet: s.wallet, tx: s.tx_hash, at: s.created_at })),
  };
}
