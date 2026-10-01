// Holders a cycle could not pay are paid first on the next one: devnet test
// with a scratch database. A Token-2022 mint, a dev wallet holding tokens and a
// little SOL, nine failed payouts to wallets with no token account.
//   DATABASE_URL=postgres://.../delta_soltest SOLANA_RPC_URL=<devnet> MASTER_ENCRYPTION_KEY=<64 hex> FUNDER_SECRET=<base58> node scripts/test-sol-owed.mjs
import { Keypair, LAMPORTS_PER_SOL, SystemProgram, Transaction, sendAndConfirmTransaction } from '@solana/web3.js';
import { createMint, getOrCreateAssociatedTokenAccount, mintTo, getAccount, getAssociatedTokenAddressSync, TOKEN_2022_PROGRAM_ID } from '@solana/spl-token';
import bs58 from 'bs58';

if (!/test|e2e|scratch/.test(process.env.DATABASE_URL || '')) throw new Error('scratch database only');
if (!/devnet/.test(process.env.SOLANA_RPC_URL || '')) throw new Error('devnet only');
const { conn, encryptSolSecret } = await import('../src/sol/client.js');
const db = await import('../src/db/queries.js');
const { payStrandedForTests } = await import('../src/sol/cycle.js');
const c = conn();
const funder = Keypair.fromSecretKey(bs58.decode(process.env.FUNDER_SECRET));
let failures = 0;
const check = (ok, what) => { console.log(`${ok ? 'PASS' : 'FAIL'}  ${what}`); if (!ok) failures++; };

const dev = Keypair.generate();
await sendAndConfirmTransaction(c, new Transaction().add(SystemProgram.transfer({ fromPubkey: funder.publicKey, toPubkey: dev.publicKey, lamports: 0.06 * LAMPORTS_PER_SOL })), [funder], { commitment: 'confirmed' });
const mint = await createMint(c, funder, funder.publicKey, null, 8, undefined, { commitment: 'confirmed' }, TOKEN_2022_PROGRAM_ID);
const devAta = await getOrCreateAssociatedTokenAccount(c, funder, mint, dev.publicKey, false, 'confirmed', undefined, TOKEN_2022_PROGRAM_ID);
await mintTo(c, funder, mint, devAta.address, funder, 1_000_000_000n, [], { commitment: 'confirmed' }, TOKEN_2022_PROGRAM_ID);

// a config, a cycle that used this mint, nine payouts that failed
const { rows: [u] } = await db.pool.query("INSERT INTO users (telegram_id, username) VALUES ($1, 'owed-test') RETURNING id", [Date.now()]);
const { rows: [cfg] } = await db.pool.query(
  `INSERT INTO bot_configs (user_id, dev_wallet_encrypted, dev_wallet_public, source_token_address, target_token_address, chain)
   VALUES ($1, $2, $3, $4, $5, 'solana') RETURNING *`,
  [u.id, JSON.stringify(encryptSolSecret(bs58.encode(dev.secretKey))), dev.publicKey.toBase58(), Keypair.generate().publicKey.toBase58(), mint.toBase58()]);
const { rows: [log] } = await db.pool.query(
  "INSERT INTO execution_logs (config_id, status, holder_count, reward_token_used, chain) VALUES ($1, 'success', 9, $2, 'solana') RETURNING id", [cfg.id, mint.toBase58()]);
const owners = Array.from({ length: 9 }, () => Keypair.generate().publicKey);
for (const o of owners) await db.pool.query("INSERT INTO airdrop_transactions (execution_log_id, holder_address, holder_balance, airdrop_amount, status) VALUES ($1, $2, 0, 25000000, 'failed')", [log.id, o.toBase58()]);

await payStrandedForTests(cfg, dev);

let paid = 0;
for (const o of owners) {
  try { const a = await getAccount(c, getAssociatedTokenAddressSync(mint, o, false, TOKEN_2022_PROGRAM_ID), 'confirmed', TOKEN_2022_PROGRAM_ID); if (a.amount === 25_000_000n) paid++; } catch { /* no account */ }
}
check(paid === 9, `all nine owed holders received their 0.25 token (${paid}/9)`);
const { rows: st } = await db.pool.query('SELECT status, COUNT(*)::int AS n FROM airdrop_transactions WHERE execution_log_id = $1 GROUP BY status', [log.id]);
check(st.length === 1 && st[0].status === 'success' && st[0].n === 9, `the nine rows are marked paid (${JSON.stringify(st)})`);
// a second pass pays nobody twice
await payStrandedForTests(cfg, dev);
const left = (await getAccount(c, devAta.address, 'confirmed', TOKEN_2022_PROGRAM_ID)).amount;
check(left === 1_000_000_000n - 9n * 25_000_000n, `a second pass pays nobody twice (dev wallet keeps ${left})`);

console.log(failures ? `${failures} check(s) failed` : 'All checks passed');
await db.pool.end();
process.exit(failures ? 1 : 0);
