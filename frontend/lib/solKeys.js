// A Solana secret key as a creator pastes it: base58 of the 64-byte secret key
// (Phantom's export), base58 of a 32-byte seed, or the JSON array solana-keygen
// writes. Returns the public key and the secret normalised to base58 of 64
// bytes, the form the engine reads. Server and browser.
import bs58 from 'bs58';
import nacl from 'tweetnacl';

export function parseSolSecret(input) {
  const s = String(input || '').trim();
  if (!s) return null;
  try {
    let bytes;
    if (s.startsWith('[')) bytes = Uint8Array.from(JSON.parse(s));
    else bytes = bs58.decode(s);
    let kp;
    if (bytes.length === 64) {
      kp = nacl.sign.keyPair.fromSecretKey(bytes);
      // A 64-byte key carries its public half: it must match the seed, or the key is corrupt.
      const check = nacl.sign.keyPair.fromSeed(bytes.slice(0, 32));
      if (bs58.encode(check.publicKey) !== bs58.encode(kp.publicKey)) return null;
    } else if (bytes.length === 32) {
      kp = nacl.sign.keyPair.fromSeed(bytes);
    } else {
      return null;
    }
    return { publicKey: bs58.encode(kp.publicKey), secret: bs58.encode(kp.secretKey) };
  } catch {
    return null;
  }
}
