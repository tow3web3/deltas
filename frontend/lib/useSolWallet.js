'use client';

import { useCallback, useEffect, useState } from 'react';
import bs58 from 'bs58';

// Minimal Solana wallet hook (Phantom, Solflare, Backpack). The site only asks a
// Solana wallet for its address and one message signature, so the injected
// providers are enough. The shape matches useWallet, so a page can swap them.
const provider = () => {
  if (typeof window === 'undefined') return null;
  return window.phantom?.solana || window.solflare || window.backpack?.solana || window.backpack || window.solana || null;
};

const DISCONNECTED_KEY = 'dl:sol-wallet-disconnected';
const wasDisconnected = () => { try { return sessionStorage.getItem(DISCONNECTED_KEY) === '1'; } catch { return false; } };
const setDisconnected = (v) => { try { v ? sessionStorage.setItem(DISCONNECTED_KEY, '1') : sessionStorage.removeItem(DISCONNECTED_KEY); } catch { /* ignore */ } };
const keyOf = (pk) => (pk ? (typeof pk === 'string' ? pk : pk.toBase58?.() || pk.toString()) : null);
export const NO_SOL_WALLET = 'No Solana wallet found. Install Phantom, Solflare or Backpack.';

export function useSolWallet() {
  const [address, setAddress] = useState(null);
  const [available, setAvailable] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Extensions inject a little after the page loads: look again once.
    let p = provider();
    const attach = () => {
      p = provider();
      setAvailable(Boolean(p));
      if (!p) return undefined;
      if (!wasDisconnected()) {
        if (p.publicKey) setAddress(keyOf(p.publicKey));
        // Phantom and Backpack reconnect silently to a site the user already trusted.
        try { p.connect?.({ onlyIfTrusted: true })?.then?.((r) => setAddress(keyOf(r?.publicKey || p.publicKey)))?.catch?.(() => {}); } catch { /* ignore */ }
      }
      const onChange = (pk) => { if (!wasDisconnected()) setAddress(keyOf(pk || p.publicKey)); };
      p.on?.('accountChanged', onChange);
      return () => p.removeListener?.('accountChanged', onChange) ?? p.off?.('accountChanged', onChange);
    };
    let detach = attach();
    const t = p ? null : setTimeout(() => { detach = attach(); }, 600);
    return () => { if (t) clearTimeout(t); detach?.(); };
  }, []);

  const connect = useCallback(async () => {
    setError(null);
    const p = provider();
    if (!p) { setError(NO_SOL_WALLET); return null; }
    try {
      const r = await p.connect();
      const a = keyOf(r?.publicKey || p.publicKey);
      setDisconnected(false);
      setAddress(a);
      return a;
    } catch (e) {
      setError(e.message);
      return null;
    }
  }, []);

  const disconnect = useCallback(() => {
    setDisconnected(true);
    setAddress(null);
    try { provider()?.disconnect?.(); } catch { /* ignore */ }
  }, []);

  // Solana wallets have no account picker request: disconnecting and connecting
  // again lets the user pick the account active in the extension.
  const switchAccount = useCallback(async () => {
    setError(null);
    const p = provider();
    if (!p) { setError(NO_SOL_WALLET); return null; }
    try { await p.disconnect?.(); } catch { /* ignore */ }
    return await connect();
  }, [connect]);

  // Signs the UTF-8 text and returns the signature in base58.
  const signMessage = useCallback(async (message) => {
    const p = provider();
    if (!p) throw new Error(NO_SOL_WALLET);
    if (!p.signMessage) throw new Error('This wallet cannot sign messages. Try Phantom or Solflare.');
    let res;
    try {
      res = await p.signMessage(new TextEncoder().encode(message), 'utf8');
    } catch (e) {
      if (/reject|denied|cancel/i.test(e.message || '')) throw new Error('Signature rejected in the wallet');
      throw e;
    }
    const sig = res?.signature || res;
    const bytes = sig instanceof Uint8Array ? sig : sig?.data ? Uint8Array.from(sig.data) : Array.isArray(sig) ? Uint8Array.from(sig) : null;
    if (!bytes || bytes.length !== 64) throw new Error('The wallet did not return a signature. Try another wallet or reload the page.');
    return bs58.encode(bytes);
  }, []);

  return { address, connected: Boolean(address), available, error, connect, disconnect, switchAccount, signMessage, chain: 'solana' };
}
