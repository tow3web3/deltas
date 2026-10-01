// One check for a message signed by a wallet on either chain: ed25519 for a
// Solana address (base58 signature), EIP-191 for a 0x address (hex signature).
import { verifySignature } from './evm';
import { verifySolSignature } from './solSignature';
import { chainOf } from './chains';

export async function verifyWalletSignature({ message, signature, wallet }) {
  const chain = chainOf(wallet);
  if (chain === 'solana') return verifySolSignature({ message, signature, wallet });
  if (chain === 'robinhood') return await verifySignature({ message, signature, wallet });
  return false;
}
