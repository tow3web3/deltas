import { verifyWalletSignature } from '../../../../../lib/walletSignature';
import { consumeNonce, getOrCreateUserByWallet } from '../../../../../lib/appQueries';
import { loginMessage, setSessionCookie } from '../../../../../lib/session';
import { isAnyAddress, chainOf, normAddress } from '../../../../../lib/chains';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request) {
  try {
    const { wallet, nonce, issuedAt, signature } = await request.json();
    const missing = [!isAnyAddress(wallet || '') && 'wallet', !nonce && 'nonce', !issuedAt && 'issuedAt', !signature && 'signature'].filter(Boolean);
    if (missing.length) return Response.json({ error: `Missing ${missing.join(', ')}${missing.includes('signature') ? ': the wallet returned no signature' : ''}` }, { status: 400 });
    if (Math.abs(Date.now() - new Date(issuedAt).getTime()) > 15 * 60_000) return Response.json({ error: 'Login request expired, try again' }, { status: 400 });
    const message = loginMessage({ wallet, nonce, issuedAt });
    if (!(await verifyWalletSignature({ message, signature, wallet }))) return Response.json({ error: 'Invalid signature' }, { status: 401 });
    if (!(await consumeNonce(nonce))) return Response.json({ error: 'Nonce already used, try again' }, { status: 400 });
    const user = await getOrCreateUserByWallet(normAddress(wallet));
    await setSessionCookie(user);
    return Response.json({ ok: true, user: { id: user.id, wallet: user.wallet_address, chain: chainOf(user.wallet_address), telegramLinked: Boolean(user.telegram_id) } });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
