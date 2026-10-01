// Page vaults on Solana. A page that a Solana coin routes fees to gets a vault
// of its own (a keypair made on its first payment, encrypted like a dev
// wallet). Once its owner has proved the page and bound a Solana wallet on the
// site, everything the vault holds is swept to that wallet: each token account
// is emptied into the owner's account and closed, then the SOL follows.
import { Transaction, ComputeBudgetProgram, SystemProgram } from '@solana/web3.js';
import { createTransferCheckedInstruction, createCloseAccountInstruction, TOKEN_PROGRAM_ID, TOKEN_2022_PROGRAM_ID } from '@solana/spl-token';
import * as db from '../db/queries.js';
import { conn, pk, sendTx, keypairFromEncrypted, keypairFromSecret, isSolAddress, solBalance, formatSol, explorerTx } from './client.js';
import { ata, createAtaIx } from './pump.js';

export const SOL_MINT = 'So11111111111111111111111111111111111111112';
const PRIORITY_MICROLAMPORTS = Number(process.env.SOL_PRIORITY_FEE_MICROLAMPORTS || 50_000);

// A vault paid only in tokens has no SOL for fees. The gas wallet pays them and
// the rent of the owner's token account; closing the vault's account gives that rent back.
const GAS_SECRET = process.env.PAGES_SOL_GAS_SECRET || '';
// What one token move can cost its payer before the close refunds the rent: a new
// account (Token-2022 accounts with extensions cost a little more) plus fees.
const PER_TOKEN_NEED = 2_600_000n;

const sweeping = new Set();
const short = (a) => (a ? `${String(a).slice(0, 4)}…${String(a).slice(-4)}` : '');

/** Every token account the vault owns, on both token programs. */
async function tokenAccounts(owner) {
  const out = [];
  for (const programId of [TOKEN_PROGRAM_ID, TOKEN_2022_PROGRAM_ID]) {
    const res = await conn().getParsedTokenAccountsByOwner(pk(owner), { programId }, 'confirmed');
    for (const { pubkey, account } of res.value) {
      const info = account.data?.parsed?.info;
      if (!info) continue;
      out.push({ account: pubkey, mint: info.mint, amount: BigInt(info.tokenAmount.amount), decimals: Number(info.tokenAmount.decimals), programId });
    }
  }
  return out;
}

/** The symbols the cycles recorded for this page's payouts, by mint. */
async function knownSymbols(pageId) {
  const { rows } = await db.pool.query("SELECT token, MAX(symbol) AS symbol FROM page_payouts WHERE page_id = $1 AND chain = 'solana' GROUP BY token", [pageId]);
  return Object.fromEntries(rows.map((r) => [r.token, r.symbol]));
}

/**
 * Send every lamport of `from` to `to`. The fee is asked of the network for this
 * exact message, so the account ends at zero: a balance left under the rent
 * minimum would make the transfer fail.
 */
async function sendAllSol(from, to) {
  const c = conn();
  const balance = await solBalance(from.publicKey);
  const build = (lamports, blockhash, lastValidBlockHeight) => {
    const tx = new Transaction({ feePayer: from.publicKey, blockhash, lastValidBlockHeight });
    tx.add(ComputeBudgetProgram.setComputeUnitLimit({ units: 20_000 }));
    tx.add(ComputeBudgetProgram.setComputeUnitPrice({ microLamports: PRIORITY_MICROLAMPORTS }));
    tx.add(SystemProgram.transfer({ fromPubkey: from.publicKey, toPubkey: pk(to), lamports }));
    return tx;
  };
  const { blockhash, lastValidBlockHeight } = await c.getLatestBlockhash('confirmed');
  const probe = build(1, blockhash, lastValidBlockHeight);
  const fee = BigInt((await c.getFeeForMessage(probe.compileMessage(), 'confirmed')).value ?? 0);
  if (!fee || balance <= fee) return { amount: 0n, sig: null };
  const amount = balance - fee;
  const tx = build(Number(amount), blockhash, lastValidBlockHeight);
  tx.sign(from);
  const sig = await c.sendRawTransaction(tx.serialize(), { skipPreflight: false, maxRetries: 3 });
  const conf = await c.confirmTransaction({ signature: sig, blockhash, lastValidBlockHeight }, 'confirmed');
  if (conf.value.err) throw new Error(`SOL sweep failed on chain: ${JSON.stringify(conf.value.err)}`);
  return { amount, sig };
}

/**
 * Sweep a claimed page's Solana vault to the wallet its owner bound. Safe to
 * call again: it moves whatever is there. Returns { moved, left, error }.
 */
export async function sweepSolPage(pageId) {
  if (sweeping.has(pageId)) return { moved: [], skipped: 'already sweeping' };
  sweeping.add(pageId);
  try {
    const page = await db.getPage(pageId);
    if (!page) return { moved: [], error: 'Page not found' };
    // The destination comes from the database row written by a verified claim, never from the caller.
    if (!isSolAddress(page.sol_claimed_wallet)) return { moved: [], error: 'Page is not claimed on Solana' };
    if (!page.sol_vault_address || !page.sol_vault_encrypted) {
      await db.markSolPageSwept(page.id, null);
      return { moved: [], left: [] };
    }
    const to = page.sol_claimed_wallet;
    const vault = keypairFromEncrypted(page.sol_vault_encrypted);
    if (vault.publicKey.toBase58() !== page.sol_vault_address) throw new Error('vault key does not match the vault address');
    if (to === page.sol_vault_address) return { moved: [], error: 'The bound wallet is the vault itself' };

    const accounts = await tokenAccounts(vault.publicKey);
    const full = accounts.filter((a) => a.amount > 0n);
    const moved = [];
    const left = [];
    const label = page.platform === 'phone' ? page.slug || '(number)' : page.handle;
    console.log(`Sweeping ${page.platform}:${label} Solana vault ${short(page.sol_vault_address)} to ${short(to)}: ${full.length} token${full.length === 1 ? '' : 's'}, ${formatSol(await solBalance(vault.publicKey), 6)} SOL`);

    // Who pays the fees and the owner's new token accounts: the vault when it can, else the gas wallet.
    let payer = vault;
    if (accounts.length) {
      const need = BigInt(full.length) * PER_TOKEN_NEED + 50_000n;
      if ((await solBalance(vault.publicKey)) < need) {
        if (!GAS_SECRET) throw new Error(`the vault holds tokens but not enough SOL to move them (${formatSol(need, 4)} SOL needed); set PAGES_SOL_GAS_SECRET or wait for a SOL payment`);
        payer = keypairFromSecret(GAS_SECRET);
        console.log(`   Fees paid by the gas wallet ${short(payer.publicKey.toBase58())}`);
      }
    }
    const signers = payer === vault ? [vault] : [payer, vault];
    const symbols = full.length ? await knownSymbols(page.id) : {};

    for (const a of accounts) {
      const symbol = symbols[a.mint] || short(a.mint);
      try {
        const ixs = [];
        const dest = ata(a.mint, to, a.programId);
        // When the owner has no account for this token yet the payer opens one, and the
        // rent of the vault's closed account pays it back. Otherwise that rent is the owner's.
        const opens = a.amount > 0n && !(await conn().getAccountInfo(dest, 'confirmed'));
        if (a.amount > 0n) {
          if (opens) ixs.push(createAtaIx(payer.publicKey, a.mint, to, a.programId));
          ixs.push(createTransferCheckedInstruction(a.account, pk(a.mint), dest, vault.publicKey, a.amount, a.decimals, [], a.programId));
        }
        ixs.push(createCloseAccountInstruction(a.account, opens ? payer.publicKey : pk(to), vault.publicKey, [], a.programId));
        const sig = await sendTx(ixs, signers, { payer, computeUnits: 90_000, label: `${symbol} sweep` });
        if (a.amount > 0n) {
          await db.insertPageSweep({ pageId: page.id, wallet: to, token: a.mint, symbol, decimals: a.decimals, amount: a.amount, txHash: sig, chain: 'solana' });
          moved.push({ symbol, amount: a.amount.toString(), decimals: a.decimals, tx: sig });
          console.log(`   ${Number(a.amount) / 10 ** a.decimals} ${symbol} swept (${explorerTx(sig)})`);
        }
      } catch (e) {
        if (a.amount > 0n) left.push({ symbol, error: e.message });
        console.log(`   ${symbol} sweep failed: ${e.message}`);
      }
    }

    // SOL last, all of it: the vault pays its own fee and ends at zero.
    try {
      const { amount, sig } = await sendAllSol(vault, to);
      if (sig) {
        await db.insertPageSweep({ pageId: page.id, wallet: to, token: SOL_MINT, symbol: 'SOL', decimals: 9, amount, txHash: sig, chain: 'solana' });
        moved.push({ symbol: 'SOL', amount: amount.toString(), decimals: 9, tx: sig });
        console.log(`   ${formatSol(amount, 6)} SOL swept (${explorerTx(sig)})`);
      }
    } catch (e) {
      left.push({ symbol: 'SOL', error: e.message });
      console.log(`   SOL sweep failed: ${e.message}`);
    }

    const error = left.length ? left.map((l) => `${l.symbol}: ${l.error}`).join('; ').slice(0, 500) : null;
    await db.markSolPageSwept(page.id, error);
    return { moved, left, error };
  } catch (e) {
    const error = (e.message || 'sweep failed').slice(0, 500);
    console.error(`Solana sweep of page ${pageId} failed: ${error}`);
    await db.markSolPageSwept(pageId, error).catch(() => {});
    return { moved: [], error };
  } finally {
    sweeping.delete(pageId);
  }
}

/** Every minute: sweep the Solana vaults of claimed pages that still hold something. */
export async function tickSolPageSweeps() {
  const pages = await db.getSolPagesToSweep();
  for (const page of pages) await sweepSolPage(page.id);
}
