// Checks a message signed by a Solana wallet: an ed25519 signature (base58)
// over the UTF-8 text, made by the key the address is.
import bs58 from 'bs58';
import nacl from 'tweetnacl';
import { isSolAddress } from './chains';

export function verifySolSignature({ message, signature, wallet }) {
  try {
    if (!isSolAddress(wallet) || typeof signature !== 'string') return false;
    const pub = bs58.decode(wallet);
    const sig = bs58.decode(signature);
    if (pub.length !== 32 || sig.length !== 64) return false;
    return nacl.sign.detached.verify(new TextEncoder().encode(message), sig, pub);
  } catch {
    return false;
  }
}
