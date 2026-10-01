// Claiming a page. GET says what this visitor has proved so far and what waits
// for them. POST binds a wallet to a page: it needs a proof that the page is
// theirs (a platform sign-in from the last half hour, or the DNS record for a
// domain) and a signature from the wallet that will be paid.
import { enabledPlatforms, readIdentities, identityFor, forgetIdentities, domainProved } from '../../../lib/oauth';
import { ensurePage, getPage, claimPage } from '../../../lib/pageQueries';
import { pageView } from '../../../lib/pageView';
import { PLATFORMS, normalizeHandle, pageName, pagePath } from '../../../lib/pages';
import { claimMessage } from '../../../lib/claimMessage';
import { consumeNonce } from '../../../lib/appQueries';
import { verifySignature } from '../../../lib/evm';
import { verifySolSignature } from '../../../lib/solSignature';
import { internal } from '../../../lib/internal';
import { chainOf, normAddress } from '../../../lib/chains';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const ids = (await readIdentities()) || {};
    const proved = [];
    for (const [platform, list] of Object.entries(ids)) {
      if (!PLATFORMS[platform]) continue;
      for (const identity of list) {
        // An account can answer to several handles (a YouTube channel has an @handle and an id),
        // and creators may have routed to either: show every page that exists, else the first handle.
        const pages = (await Promise.all(identity.handles.map((h) => getPage(platform, h, { raw: true })))).filter(Boolean);
        for (const page of pages.length ? pages : [null]) {
          const handle = page?.handle || identity.handles[0];
          const view = page ? await pageView(page) : null;
          proved.push({
            platform, handle, name: identity.name || pageName(platform, handle), avatar: identity.avatar, path: page ? pagePath(platform, handle, page.slug) : null,
            exists: Boolean(page), claimed: Boolean(page?.claimed_wallet || page?.sol_claimed_wallet),
            // Claimed per chain: each chain has its own vault and its own bound wallet.
            claimedOn: { solana: page?.sol_claimed_wallet || null, robinhood: page?.claimed_wallet || null },
            claimedWallet: page?.sol_claimed_wallet || page?.claimed_wallet || null,
            receivedUsd: view?.receivedUsd ?? 0, paidToOwnerUsd: view?.paidToOwnerUsd ?? 0, payments: view?.payments ?? 0, lastAt: view?.lastAt || null,
            vaultUsd: view?.vaultBalance?.totalUsd ?? 0, vaultAssets: view?.vaultBalance?.assets || [], coins: view?.coins ?? 0,
            sources: (view?.sources || []).filter((s) => s.active).slice(0, 6),
          });
        }
      }
    }
    return Response.json({ platforms: enabledPlatforms(), proved });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const { platform, handle: rawHandle, wallet, nonce, issuedAt, signature } = await request.json();
    if (!PLATFORMS[platform]) return Response.json({ error: 'Unknown platform' }, { status: 400 });
    const handle = normalizeHandle(platform, rawHandle);
    if (!handle) return Response.json({ error: `That is not a valid ${PLATFORMS[platform].label} page` }, { status: 400 });
    const chain = chainOf(wallet);
    if (!chain) return Response.json({ error: 'Connect the wallet that should be paid' }, { status: 400 });
    if (!nonce || !issuedAt || !signature) return Response.json({ error: 'The wallet returned no signature' }, { status: 400 });
    if (Math.abs(Date.now() - new Date(issuedAt).getTime()) > 15 * 60_000) return Response.json({ error: 'The request expired, try again' }, { status: 400 });

    // 1. The page is theirs.
    let identity = null;
    if (platform === 'domain') {
      if (!(await domainProved(handle, wallet))) return Response.json({ error: `The TXT record was not found on _deltas.${handle}. DNS changes can take a few minutes to spread.` }, { status: 403 });
    } else {
      identity = await identityFor(platform, handle);
      if (!identity) return Response.json({ error: platform === 'phone' ? 'Prove the number with the code first' : `Sign in with ${PLATFORMS[platform].label} as the owner of ${pageName(platform, handle)} first` }, { status: 403 });
    }

    // 2. The wallet is theirs, and it agreed to be the destination of this page.
    const message = claimMessage({ platform, handle, wallet, nonce, issuedAt });
    const valid = chain === 'solana' ? verifySolSignature({ message, signature, wallet }) : await verifySignature({ message, signature, wallet });
    if (!valid) return Response.json({ error: 'Invalid signature' }, { status: 401 });
    if (!(await consumeNonce(nonce))) return Response.json({ error: 'Nonce already used, try again' }, { status: 400 });

    // 3. Bind. A page nobody routes to yet can be claimed ahead: it is created here.
    const page = await ensurePage(platform, handle);
    await claimPage({
      pageId: page.id, wallet, chain, proof: platform === 'domain' ? 'dns' : platform === 'phone' ? 'otp' : 'oauth',
      externalId: identity?.id || null, externalHandle: handle, displayName: identity?.name || null, avatarUrl: identity?.avatar || null,
    });

    // 4. Empty the vault now. If the backend is unreachable its next tick does it.
    const sweep = await internal(`/pages/sweep/${page.id}${chain === 'solana' ? '?chain=solana' : ''}`);
    return Response.json({ ok: true, chain, page: pagePath(platform, handle, page.slug), wallet: normAddress(wallet), sweepStarted: Boolean(sweep.ok) });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 400 });
  }
}

/** Forget the platform sign-ins of this browser. */
export async function DELETE() {
  await forgetIdentities();
  return Response.json({ ok: true });
}
