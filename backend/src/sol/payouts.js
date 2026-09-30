// Moving value on Solana: SOL to many wallets in a few transactions, an SPL
// token to many wallets (creating their token accounts when needed), one
// transfer, one burn. Every batch reports who was paid and who was not.
import { SystemProgram, PublicKey } from '@solana/web3.js';
import { createTransferCheckedInstruction, createBurnCheckedInstruction, getAccount, TOKEN_PROGRAM_ID } from '@solana/spl-token';
import { conn, pk, sendTx, explorerTx } from './client.js';
import { ata, createAtaIx, tokenProgramOf } from './pump.js';

// SOL transfers are tiny: 18 fit in one transaction with the compute budget lines.
const SOL_BATCH = 18;
// A token transfer plus a possible account creation: 7 recipients per transaction stay under the size limit.
const SPL_BATCH = 7;
// What a new token account costs its payer, in lamports. A payout below it is not worth creating one.
export const ATA_RENT = 2_039_280n;

/**
 * Pay SOL to many recipients. distributions: [{ address, amount (lamports, bigint), holderBalance }].
 * Returns { successful, failed, totalSent, txHashes }, the same shape the EVM side uses.
 */
export async function paySol(keypair, distributions) {
  const results = { successful: [], failed: [], totalSent: 0n, txHashes: [] };
  for (let i = 0; i < distributions.length; i += SOL_BATCH) {
    const batch = distributions.slice(i, i + SOL_BATCH);
    const ixs = batch.map((d) => SystemProgram.transfer({ fromPubkey: keypair.publicKey, toPubkey: pk(d.address), lamports: d.amount }));
    try {
      const sig = await sendTx(ixs, [keypair], { computeUnits: 20_000 + 5_000 * batch.length, label: `SOL wave ${Math.floor(i / SOL_BATCH) + 1}` });
      for (const d of batch) results.successful.push({ ...d, hash: sig });
      results.totalSent += batch.reduce((s, d) => s + d.amount, 0n);
      results.txHashes.push(sig);
      console.log(`   Wave ${Math.floor(i / SOL_BATCH) + 1}/${Math.ceil(distributions.length / SOL_BATCH)}: ${batch.length} paid (${explorerTx(sig)})`);
    } catch (e) {
      for (const d of batch) results.failed.push({ ...d, error: e.message });
      console.log(`   Wave ${Math.floor(i / SOL_BATCH) + 1} failed: ${e.message.slice(0, 160)}`);
    }
  }
  return results;
}

/**
 * Pay an SPL token to many recipients, creating token accounts where missing.
 * Creating one costs the payer ~0.002 SOL: recipients whose share is worth less
 * than that (in lamports, via `lamportsPerUnit`) and who have no account yet are
 * skipped and reported, so rent never eats the dividend.
 */
export async function paySpl(keypair, mint, decimals, distributions, { lamportsPerRaw = null } = {}) {
  const programId = await tokenProgramOf(mint);
  const mintKey = pk(mint);
  const source = ata(mintKey, keypair.publicKey, programId);
  const c = conn();
  const results = { successful: [], failed: [], totalSent: 0n, txHashes: [], skipped: [] };
  // Which recipients already have an account for this token.
  const targets = distributions.map((d) => ({ ...d, ata: ata(mintKey, d.address, programId) }));
  const infos = [];
  for (let i = 0; i < targets.length; i += 100) infos.push(...(await c.getMultipleAccountsInfo(targets.slice(i, i + 100).map((t) => t.ata))));
  const ready = [];
  targets.forEach((t, i) => {
    const has = Boolean(infos[i]);
    if (!has && lamportsPerRaw != null && (BigInt(d2(t.amount)) * lamportsPerRaw) < ATA_RENT) { results.skipped.push({ ...t, reason: 'share below the cost of a token account' }); return; }
    ready.push({ ...t, create: !has });
  });
  for (let i = 0; i < ready.length; i += SPL_BATCH) {
    const batch = ready.slice(i, i + SPL_BATCH);
    const ixs = [];
    for (const t of batch) {
      if (t.create) ixs.push(createAtaIx(keypair.publicKey, mintKey, t.address, programId));
      ixs.push(createTransferCheckedInstruction(source, mintKey, t.ata, keypair.publicKey, t.amount, decimals, [], programId));
    }
    try {
      const sig = await sendTx(ixs, [keypair], { computeUnits: 40_000 + 30_000 * batch.length, label: `token wave ${Math.floor(i / SPL_BATCH) + 1}` });
      for (const t of batch) results.successful.push({ ...t, hash: sig });
      results.totalSent += batch.reduce((s, t) => s + t.amount, 0n);
      results.txHashes.push(sig);
      console.log(`   Wave ${Math.floor(i / SPL_BATCH) + 1}/${Math.ceil(ready.length / SPL_BATCH)}: ${batch.length} paid (${explorerTx(sig)})`);
    } catch (e) {
      for (const t of batch) results.failed.push({ ...t, error: e.message });
      console.log(`   Wave ${Math.floor(i / SPL_BATCH) + 1} failed: ${e.message.slice(0, 160)}`);
    }
  }
  if (results.skipped.length) console.log(`   ${results.skipped.length} holders skipped: their share is below the cost of creating a token account`);
  return results;
}
const d2 = (v) => (typeof v === 'bigint' ? v : BigInt(v));

/** One SOL transfer. Returns the signature. */
export async function sendSol(keypair, to, lamports, label = 'transfer') {
  return await sendTx([SystemProgram.transfer({ fromPubkey: keypair.publicKey, toPubkey: pk(to), lamports })], [keypair], { computeUnits: 20_000, label });
}

/** One SPL transfer, creating the recipient's token account if needed. Returns the signature. */
export async function sendSpl(keypair, mint, decimals, to, amount, label = 'token transfer') {
  const programId = await tokenProgramOf(mint);
  const mintKey = pk(mint);
  const ixs = [createAtaIx(keypair.publicKey, mintKey, to, programId), createTransferCheckedInstruction(ata(mintKey, keypair.publicKey, programId), mintKey, ata(mintKey, to, programId), keypair.publicKey, amount, decimals, [], programId)];
  return await sendTx(ixs, [keypair], { computeUnits: 80_000, label });
}

/** Burn `amount` raw units of a mint from the keypair's own token account. Returns the signature. */
export async function burnSpl(keypair, mint, decimals, amount) {
  const programId = await tokenProgramOf(mint);
  const mintKey = pk(mint);
  const ix = createBurnCheckedInstruction(ata(mintKey, keypair.publicKey, programId), mintKey, keypair.publicKey, amount, decimals, [], programId);
  return await sendTx([ix], [keypair], { computeUnits: 40_000, label: 'burn' });
}

/** The raw balance of a mint held by an owner, 0n when there is no account. */
export async function splBalance(mint, owner) {
  try {
    const programId = await tokenProgramOf(mint);
    const acc = await getAccount(conn(), ata(pk(mint), pk(owner), programId), 'confirmed', programId);
    return BigInt(acc.amount);
  } catch {
    return 0n;
  }
}

export { TOKEN_PROGRAM_ID, PublicKey };
