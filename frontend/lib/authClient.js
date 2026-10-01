// Browser-side sign in: nonce, wallet signature, session cookie. Shared by the
// login screen and the wallet menu (switch account). The two message templates
// come from walletMessages.js, the same module the server checks them with.
import { loginMessage, revealMessage } from './walletMessages';

export const LOGIN_TEXT = (addr, nonce, issuedAt) => loginMessage({ wallet: addr, nonce, issuedAt });

export async function signIn(wallet, addr) {
  const n = await fetch('/api/app/auth/nonce', { cache: 'no-store' }).then((r) => r.json());
  if (!n?.nonce || !n?.issuedAt) throw new Error(n?.error || 'Could not get a login nonce. Reload and try again.');
  const signature = await wallet.signMessage(LOGIN_TEXT(addr, n.nonce, n.issuedAt), addr);
  const res = await fetch('/api/app/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ wallet: addr, nonce: n.nonce, issuedAt: n.issuedAt, signature }) });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Login failed');
  return data;
}

export async function signOut() {
  await fetch('/api/app/auth/logout', { method: 'POST' });
}

export const REVEAL_TEXT = (addr, devWallet, nonce, issuedAt) => revealMessage({ wallet: addr, devWallet, nonce, issuedAt });

/** Ask the wallet for a fresh signature, then fetch the decrypted dev key. Returned once, never stored in the page. */
export async function revealDevKey(wallet, addr, devWallet) {
  const n = await fetch('/api/app/auth/nonce', { cache: 'no-store' }).then((r) => r.json());
  if (!n?.nonce || !n?.issuedAt) throw new Error(n?.error || 'Could not get a nonce. Reload and try again.');
  const signature = await wallet.signMessage(REVEAL_TEXT(addr, devWallet, n.nonce, n.issuedAt), addr);
  const res = await fetch('/api/app/config/key', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ nonce: n.nonce, issuedAt: n.issuedAt, signature }) });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Could not reveal the key');
  return data;
}
