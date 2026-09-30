// Solana: the connection, the keys, and sending a transaction until it lands.
// One RPC (Helius) for everything; the DAS methods live on the same URL.
import { Connection, Keypair, PublicKey, Transaction, ComputeBudgetProgram, LAMPORTS_PER_SOL, SystemProgram } from '@solana/web3.js';
import bs58 from 'bs58';
import { encryptPrivateKey, decryptPrivateKey } from '../services/encryption.js';

export const SOL_RPC_URL = process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com';
export const SOL_EXPLORER = 'https://solscan.io';
export const explorerTx = (sig) => `${SOL_EXPLORER}/tx/${sig}`;
export const explorerAddress = (a) => `${SOL_EXPLORER}/account/${a}`;
export { LAMPORTS_PER_SOL, PublicKey, Keypair, SystemProgram };

let connection = null;
export function conn() {
  connection ??= new Connection(SOL_RPC_URL, { commitment: 'confirmed', confirmTransactionInitialTimeout: 90_000 });
  return connection;
}

/** JSON-RPC straight to the endpoint, for the Helius methods web3.js does not know. */
export async function rpc(method, params) {
  const res = await fetch(SOL_RPC_URL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }), signal: AbortSignal.timeout(30_000) });
  const data = await res.json();
  if (data.error) throw new Error(`${method}: ${data.error.message}`);
  return data.result;
}

/* ---------------- keys ---------------- */
export const isSolAddress = (s) => { try { return typeof s === 'string' && s.length >= 32 && s.length <= 44 && Boolean(new PublicKey(s)); } catch { return false; } };
export const pk = (s) => (s instanceof PublicKey ? s : new PublicKey(s));

/** A new keypair; the secret is the 64-byte secret key in base58, encrypted like the EVM keys. */
export function generateSolWallet() {
  const kp = Keypair.generate();
  return { address: kp.publicKey.toBase58(), secret: bs58.encode(kp.secretKey) };
}
export const encryptSolSecret = (secret) => encryptPrivateKey(secret);
export function keypairFromEncrypted(encrypted) {
  return keypairFromSecret(decryptPrivateKey(encrypted));
}
/** Accepts a base58 64-byte secret key, a base58 32-byte seed, or a JSON array (Phantom / solana-keygen export). */
export function keypairFromSecret(secret) {
  const s = String(secret).trim();
  if (s.startsWith('[')) return Keypair.fromSecretKey(Uint8Array.from(JSON.parse(s)));
  const bytes = bs58.decode(s);
  if (bytes.length === 64) return Keypair.fromSecretKey(bytes);
  if (bytes.length === 32) return Keypair.fromSeed(bytes);
  throw new Error('That is not a Solana secret key');
}
export const isValidSolSecret = (secret) => { try { return Boolean(keypairFromSecret(secret)); } catch { return false; } };

/* ---------------- sending ---------------- */
const PRIORITY_MICROLAMPORTS = Number(process.env.SOL_PRIORITY_FEE_MICROLAMPORTS || 50_000);

/**
 * Build, sign and send a transaction with the given instructions, then wait
 * for confirmation. Retries once with a fresh blockhash if the first attempt
 * expires. Returns the signature.
 */
export async function sendTx(instructions, signers, { payer = signers[0], computeUnits = 200_000, label = 'tx' } = {}) {
  const c = conn();
  let lastError = null;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const { blockhash, lastValidBlockHeight } = await c.getLatestBlockhash('confirmed');
      const tx = new Transaction({ feePayer: payer.publicKey, blockhash, lastValidBlockHeight });
      tx.add(ComputeBudgetProgram.setComputeUnitLimit({ units: computeUnits }));
      tx.add(ComputeBudgetProgram.setComputeUnitPrice({ microLamports: PRIORITY_MICROLAMPORTS }));
      for (const ix of instructions) tx.add(ix);
      tx.sign(...signers);
      const sig = await c.sendRawTransaction(tx.serialize(), { skipPreflight: false, maxRetries: 3 });
      const conf = await c.confirmTransaction({ signature: sig, blockhash, lastValidBlockHeight }, 'confirmed');
      if (conf.value.err) throw new Error(`${label} failed on chain: ${JSON.stringify(conf.value.err)}`);
      return sig;
    } catch (e) {
      lastError = e;
      if (!/expired|block height exceeded|Blockhash not found/i.test(e.message)) throw e;
    }
  }
  throw lastError;
}

export const lamportsToSol = (l) => Number(l) / LAMPORTS_PER_SOL;
export const formatSol = (l, d = 4) => lamportsToSol(l).toFixed(d);
export async function solBalance(address) {
  return BigInt(await conn().getBalance(pk(address), 'confirmed'));
}
