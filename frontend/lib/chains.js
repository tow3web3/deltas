// The two chains the product runs on, told apart by the shape of an address.
// Solana first (base58, 32 to 44 characters), Robinhood Chain second (0x + 40 hex).
// No I/O: the browser and the server share it.
export const CHAINS = {
  solana: { key: 'solana', label: 'Solana', native: 'SOL', nativeDecimals: 9, explorer: 'https://solscan.io', dex: 'solana', color: '#9945FF' },
  robinhood: { key: 'robinhood', label: 'Robinhood Chain', native: 'ETH', nativeDecimals: 18, explorer: 'https://robinhoodchain.blockscout.com', dex: 'robinhood', color: '#2FA8FF' },
};
export const DEFAULT_CHAIN = 'solana';

export const isEvmAddress = (a) => /^0x[0-9a-fA-F]{40}$/.test(String(a || ''));
export const isSolAddress = (a) => /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(String(a || ''));
export const isAnyAddress = (a) => isEvmAddress(a) || isSolAddress(a);
/** Which chain an address belongs to, from its shape. Null when it is neither. */
export const chainOf = (a) => (isEvmAddress(a) ? 'robinhood' : isSolAddress(a) ? 'solana' : null);
/** Stored form: EVM lowercase, base58 as is. */
export const normAddress = (a) => (a == null ? a : isEvmAddress(a) ? String(a).toLowerCase() : String(a));
export const sameAddress = (a, b) => normAddress(a) === normAddress(b);

export function explorerTxFor(chain, hash) {
  return chain === 'solana' ? `${CHAINS.solana.explorer}/tx/${hash}` : `${CHAINS.robinhood.explorer}/tx/${hash}`;
}
export function explorerAddressFor(chain, address) {
  return chain === 'solana' ? `${CHAINS.solana.explorer}/account/${address}` : `${CHAINS.robinhood.explorer}/address/${address}`;
}
export function explorerTokenFor(chain, address) {
  return chain === 'solana' ? `${CHAINS.solana.explorer}/token/${address}` : `${CHAINS.robinhood.explorer}/token/${address}`;
}
export const dexScreenerFor = (chain, address) => `https://dexscreener.com/${CHAINS[chain]?.dex || 'solana'}/${address}`;
/** Links for an address whose chain is read from its shape. */
export const explorerTx = (hash) => explorerTxFor(/^0x[0-9a-fA-F]{64}$/.test(hash) ? 'robinhood' : 'solana', hash);
export const explorerAddress = (a) => explorerAddressFor(chainOf(a) || DEFAULT_CHAIN, a);
export const explorerToken = (a) => explorerTokenFor(chainOf(a) || DEFAULT_CHAIN, a);
export const shortAddress = (a) => (a ? `${String(a).slice(0, 4)}…${String(a).slice(-4)}` : '');
