// Sweeping a page's Solana vault, end to end on devnet with a scratch database.
//   DATABASE_URL=postgres://.../delta_soltest SOLANA_RPC_URL=https://api.devnet.solana.com \
//   MASTER_ENCRYPTION_KEY=<64 hex> FUNDER_SECRET=<base58, optional> node scripts/test-sol-sweep.mjs
// Two vaults are swept to a fresh owner wallet: one holding SOL, a classic SPL
// token and a Token-2022 token (it pays its own fees), and one holding only a
// token (the gas wallet pays). Checks what arrived, what is left, and the records.
import { Keypair, LAMPORTS_PER_SOL, SystemProgram, Transaction, sendAndConfirmTransaction } from '@solana/web3.js';
import { createMint, getOrCreateAssociatedTokenAccount, mintTo, getAccount, TOKEN_PROGRAM_ID, TOKEN_2022_PROGRAM_ID, getAssociatedTokenAddressSync } from '@solana/spl-token';
import bs58 from 'bs58';

if (!/test|e2e|scratch/.test(process.env.DATABASE_URL || '')) throw new Error('DATABASE_URL must name a scratch database');
if (!/devnet|127\.0\.0\.1|localhost/.test(process.env.SOLANA_RPC_URL || '')) throw new Error('SOLANA_RPC_URL must be devnet or a local validator');

const funder = process.env.FUNDER_SECRET ? Keypair.fromSecretKey(bs58.decode(process.env.FUNDER_SECRET)) : Keypair.generate();
process.env.PAGES_SOL_GAS_SECRET = bs58.encode(funder.secretKey);

const { conn, generateSolWallet, encryptSolSecret } = await import('../src/sol/client.js');
const db = await import('../src/db/queries.js');
const { sweepSolPage } = await import('../src/sol/sweep.js');
const c = conn();
let failures = 0;
const check = (ok, what) => { console.log(`${ok ? 'PASS' : 'FAIL'}  ${what}`); if (!ok) failures++; };
const sol = (l) => (Number(l) / LAMPORTS_PER_SOL).toFixed(6);

// Money to work with.
let bal = await c.getBalance(funder.publicKey);
console.log(`Funder ${funder.publicKey.toBase58()}: ${sol(bal)} SOL`);
for (let i = 0; bal < 0.3 * LAMPORTS_PER_SOL && i < 4; i++) {
  try {
    const sig = await c.requestAirdrop(funder.publicKey, 1 * LAMPORTS_PER_SOL);
    await c.confirmTransaction(sig, 'confirmed');
  } catch (e) { console.log(`airdrop ${i + 1} failed: ${e.message.slice(0, 120)}`); await new Promise((r) => setTimeout(r, 4000)); }
  bal = await c.getBalance(funder.publicKey);
}
if (bal < 0.1 * LAMPORTS_PER_SOL) { console.log(`Fund ${funder.publicKey.toBase58()} on devnet (faucet.solana.com) and pass FUNDER_SECRET=${bs58.encode(funder.secretKey)}`); process.exit(2); }
console.log(`Funder balance ${sol(bal)} SOL`);

const classic = await createMint(c, funder, funder.publicKey, null, 6, undefined, { commitment: 'confirmed' }, TOKEN_PROGRAM_ID);
const t22 = await createMint(c, funder, funder.publicKey, null, 8, undefined, { commitment: 'confirmed' }, TOKEN_2022_PROGRAM_ID);
console.log(`Mints: classic ${classic.toBase58()}, Token-2022 ${t22.toBase58()}`);

async function makePage(handle, { solLamports, tokens }) {
  const v = generateSolWallet();
  const { rows: [page] } = await db.pool.query(
    `INSERT INTO social_pages (platform, handle, vault_address, vault_encrypted, sol_vault_address, sol_vault_encrypted) VALUES ('x', $1, $2, $3, $4, $5) RETURNING *`,
    [handle, '0x' + '0'.repeat(40), '{}', v.address, JSON.stringify(encryptSolSecret(v.secret))]
  );
  for (const [mint, programId, amount, symbol, decimals] of tokens) {
    const acc = await getOrCreateAssociatedTokenAccount(c, funder, mint, Keypair.fromSecretKey(bs58.decode(v.secret)).publicKey, true, 'confirmed', undefined, programId);
    await mintTo(c, funder, mint, acc.address, funder, amount, [], { commitment: 'confirmed' }, programId);
    await db.pool.query(`INSERT INTO page_payouts (page_id, token, symbol, decimals, amount, value_wei, to_address, direct, chain) VALUES ($1, $2, $3, $4, $5, 0, $6, false, 'solana')`, [page.id, mint.toBase58(), symbol, decimals, String(amount), v.address]);
  }
  if (solLamports) {
    const tx = new Transaction().add(SystemProgram.transfer({ fromPubkey: funder.publicKey, toPubkey: Keypair.fromSecretKey(bs58.decode(v.secret)).publicKey, lamports: solLamports }));
    await sendAndConfirmTransaction(c, tx, [funder], { commitment: 'confirmed' });
  }
  return { page, vault: v.address };
}

async function tokenBal(mint, owner, programId) {
  try { return (await getAccount(c, getAssociatedTokenAddressSync(mint, owner, true, programId), 'confirmed', programId)).amount; } catch { return 0n; }
}

const owner = Keypair.generate().publicKey;
console.log(`Owner ${owner.toBase58()}`);

// 1. A vault with SOL and two tokens pays its own way.
const a = await makePage(`soltest-a-${Date.now()}`, { solLamports: 0.05 * LAMPORTS_PER_SOL, tokens: [[classic, TOKEN_PROGRAM_ID, 1_000_000_000n, 'CLASSIC', 6], [t22, TOKEN_2022_PROGRAM_ID, 50_000_000_000n, 'NVDAx', 8]] });
await db.pool.query('UPDATE social_pages SET sol_claimed_wallet = $2, sol_sweep_pending = true WHERE id = $1', [a.page.id, owner.toBase58()]);
const funderBefore1 = await c.getBalance(funder.publicKey);
const r1 = await sweepSolPage(a.page.id);
console.log('sweep 1:', JSON.stringify({ moved: r1.moved?.map((m) => `${m.amount} ${m.symbol}`), error: r1.error }));
check(!r1.error, 'vault 1 swept without error');
check((await tokenBal(classic, owner, TOKEN_PROGRAM_ID)) === 1_000_000_000n, 'owner received the classic token');
check((await tokenBal(t22, owner, TOKEN_2022_PROGRAM_ID)) === 50_000_000_000n, 'owner received the Token-2022 token');
check((await c.getBalance(new (await import('@solana/web3.js')).PublicKey(a.vault))) === 0, 'vault 1 holds no SOL any more');
const left1 = (await c.getTokenAccountsByOwner(new (await import('@solana/web3.js')).PublicKey(a.vault), { programId: TOKEN_PROGRAM_ID })).value.length
  + (await c.getTokenAccountsByOwner(new (await import('@solana/web3.js')).PublicKey(a.vault), { programId: TOKEN_2022_PROGRAM_ID })).value.length;
check(left1 === 0, 'vault 1 token accounts are closed');
const ownerSol = await c.getBalance(owner);
console.log(`owner SOL ${sol(ownerSol)}`);
// The owner's two new token accounts were paid by the vault with the rent its closed accounts gave back: the SOL arrives less fees.
check(ownerSol > 0.0499 * LAMPORTS_PER_SOL, 'owner received the vault\'s SOL, less fees');
check((await c.getBalance(funder.publicKey)) === funderBefore1, 'the gas wallet paid nothing for a vault with SOL');
const { rows: s1 } = await db.pool.query("SELECT symbol, amount::text, chain FROM page_sweeps WHERE page_id = $1 ORDER BY id", [a.page.id]);
check(s1.length === 3 && s1.every((r) => r.chain === 'solana'), `three sweeps recorded on Solana (${s1.map((r) => r.symbol).join(', ')})`);
const { rows: [p1] } = await db.pool.query('SELECT sol_sweep_pending, sol_sweep_error, sol_last_swept_at FROM social_pages WHERE id = $1', [a.page.id]);
check(!p1.sol_sweep_pending && !p1.sol_sweep_error && p1.sol_last_swept_at, 'page 1 marked swept');

// 2. A vault with only a token: the gas wallet pays, and the closed account refunds it.
const b = await makePage(`soltest-b-${Date.now()}`, { solLamports: 0, tokens: [[t22, TOKEN_2022_PROGRAM_ID, 7_000_000_000n, 'NVDAx', 8]] });
await db.pool.query('UPDATE social_pages SET sol_claimed_wallet = $2, sol_sweep_pending = true WHERE id = $1', [b.page.id, owner.toBase58()]);
const funderBefore2 = await c.getBalance(funder.publicKey);
const r2 = await sweepSolPage(b.page.id);
console.log('sweep 2:', JSON.stringify({ moved: r2.moved?.map((m) => `${m.amount} ${m.symbol}`), error: r2.error }));
check(!r2.error, 'vault 2 swept without error');
check((await tokenBal(t22, owner, TOKEN_2022_PROGRAM_ID)) === 57_000_000_000n, 'owner received the second NVDAx payment');
const cost = funderBefore2 - (await c.getBalance(funder.publicKey));
console.log(`gas wallet net cost ${cost} lamports`);
check(cost > 0 && cost < 50_000, 'the gas wallet paid only the fees (the owner already had an account)');
const ownerSol2 = await c.getBalance(owner);
check(ownerSol2 > ownerSol + 1_500_000, `the closed account's rent went to the owner (+${sol(ownerSol2 - ownerSol)} SOL)`);

// 2b. Same, to an owner with no account for the token: the gas wallet opens it and gets the rent back.
const owner2 = Keypair.generate().publicKey;
const b2 = await makePage(`soltest-b2-${Date.now()}`, { solLamports: 0, tokens: [[t22, TOKEN_2022_PROGRAM_ID, 3_000_000_000n, 'NVDAx', 8]] });
await db.pool.query('UPDATE social_pages SET sol_claimed_wallet = $2, sol_sweep_pending = true WHERE id = $1', [b2.page.id, owner2.toBase58()]);
const funderBefore3 = await c.getBalance(funder.publicKey);
const r3 = await sweepSolPage(b2.page.id);
check(!r3.error && (await tokenBal(t22, owner2, TOKEN_2022_PROGRAM_ID)) === 3_000_000_000n, 'a new owner received the token in a new account');
const cost3 = funderBefore3 - (await c.getBalance(funder.publicKey));
console.log(`gas wallet net cost for a new account ${cost3} lamports`);
check(cost3 >= 0 && cost3 < 50_000, 'the gas wallet got the new account\'s rent back');

// 3. Nothing left to do.
const again = await db.getSolPagesToSweep();
check(!again.some((p) => p.id === a.page.id || p.id === b.page.id), 'neither page is due for another sweep');

console.log(failures ? `${failures} check(s) failed` : 'All checks passed');
await db.pool.end();
process.exit(failures ? 1 : 0);
