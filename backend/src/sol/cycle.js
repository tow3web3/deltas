// One cycle of a coin on Solana. The same story as the EVM cycle, told in SOL:
// collect the pump.fun creator fees into the dev wallet, sweep what sits above
// the gas reserve, split it over the legs, pay each one (a page's vault, a
// wallet, a buyback that burns, a treasury in an xStock), then pay the holders
// in SOL or in the asset they were promised, in a few transactions.
import { LAMPORTS_PER_SOL } from '@solana/web3.js';
import * as db from '../db/queries.js';
import { legsFor, legsLabel, splitAmounts, mdEscape } from '../services/legs.js';
import { calculateDistributions } from '../services/airdrop.js';
import { sendNotification } from '../bot/telegram.js';
import { announceSolCycle } from './announce.js';
import { keypairFromEncrypted, solBalance, formatSol, explorerTx, generateSolWallet, encryptSolSecret, isSolAddress, pk } from './client.js';
import { readBondingCurve, pendingCreatorFees, collectCreatorFeeInstructions, isPumpMint, ata, tokenProgramOf } from './pump.js';
import { sendTx, conn } from './client.js';
import { tokenHolders } from './holders.js';
import { paySol, paySpl, sendSol, sendSpl, burnSpl, splBalance, ATA_RENT } from './payouts.js';
import { quote, swap, prices, SOL_MINT, tokenInfo } from './jupiter.js';
import { getXStock } from './xstocks.js';

const GAS_RESERVE = BigInt(process.env.SOL_GAS_RESERVE_LAMPORTS || 20_000_000); // 0.02 SOL kept for fees
const MIN_DISTRIBUTE = BigInt(process.env.SOL_MIN_DISTRIBUTE_LAMPORTS || 5_000_000); // 0.005 SOL
const MIN_FAIR_RATIO = parseFloat(process.env.SOL_MIN_SWAP_FAIR_RATIO || '0.9');
const running = new Set();
export const busySolConfigs = () => [...running];

const note = (log, msg) => { log.errorMessage = [log.errorMessage, msg].filter(Boolean).join('; '); };
const newLog = (config, cycleKey) => ({
  configId: config.id, cycleKey, chain: 'solana', claimedEthWei: 0n, boughtTokenAmount: 0n, holderCount: 0, totalAirdropped: 0n,
  status: 'failed', errorMessage: null, rewardTokenUsed: null, rewardModeUsed: config.reward_mode || 'fixed',
  swapTx: null, claimTx: null, destination: 'holders', burnAmount: 0n, burnTx: null, treasuryAmount: 0n, treasuryToken: null, treasuryTx: null,
  creatorAmount: 0n, creatorTx: null, assetToken: SOL_MINT, assetAmount: 0n,
});
const fmt = (raw, decimals, d = 4) => (Number(raw) / 10 ** decimals).toFixed(d);

/** What an asset is on Solana: SOL, an xStock, or any mint Jupiter knows. */
export async function describeSolAsset(mint) {
  if (!mint || mint === SOL_MINT || mint === 'SOL') return { address: SOL_MINT, symbol: 'SOL', name: 'Solana', decimals: 9, isNative: true, isStock: false };
  const x = await getXStock(mint);
  if (x) return { address: x.mint, symbol: x.symbol, name: x.name, decimals: x.decimals, isNative: false, isStock: true, ticker: x.ticker, logo: x.icon };
  const t = await tokenInfo(mint);
  if (!t) throw new Error(`Unknown token ${mint}`);
  return { address: t.address, symbol: t.symbol, name: t.name, decimals: t.decimals, isNative: false, isStock: false, logo: t.icon };
}

/**
 * Buy `mint` with `lamports` of SOL through Jupiter, guarded: the fill must be
 * worth at least MIN_FAIR_RATIO of the reference price. Returns { signature, outAmount, ratio }.
 */
export async function buyWithSol({ keypair, mint, lamports, decimals }) {
  const q = await quote({ inputMint: SOL_MINT, outputMint: mint, amount: lamports.toString(), slippageBps: 150 });
  const out = BigInt(q.outAmount);
  let ratio = null;
  try {
    const p = await prices([SOL_MINT, mint]);
    const fairUnits = (Number(lamports) / LAMPORTS_PER_SOL) * (p[SOL_MINT].usdPrice / p[mint].usdPrice);
    ratio = Number(out) / 10 ** decimals / fairUnits;
    if (ratio < MIN_FAIR_RATIO) throw new Error(`No route delivers ${Math.round(MIN_FAIR_RATIO * 100)}% of fair value (best ${(ratio * 100).toFixed(1)}%)`);
  } catch (e) {
    if (/fair value/.test(e.message)) throw e;
    // No reference price for this mint: the quote stands on its own.
  }
  const { signature } = await swap({ keypair, quoteResponse: q });
  console.log(`   Route: Jupiter ${q.routePlan?.map((r) => r.swapInfo.label).join(' > ')}${ratio != null ? ` at ${(ratio * 100).toFixed(1)}% of fair` : ''} (${explorerTx(signature)})`);
  return { signature, outAmount: out, ratio };
}

/** The Solana vault of a page, created on first use. Returns the address. */
async function ensureSolVault(pageId) {
  const { rows: [p] } = await db.pool.query('SELECT sol_vault_address FROM social_pages WHERE id = $1', [pageId]);
  if (p?.sol_vault_address) return p.sol_vault_address;
  const w = generateSolWallet();
  await db.pool.query('UPDATE social_pages SET sol_vault_address = $2, sol_vault_encrypted = $3 WHERE id = $1 AND sol_vault_address IS NULL', [pageId, w.address, JSON.stringify(encryptSolSecret(w.secret))]);
  const { rows: [again] } = await db.pool.query('SELECT sol_vault_address FROM social_pages WHERE id = $1', [pageId]);
  return again.sol_vault_address;
}

/** One non-holders leg for SOL. Returns { ...result } or { failed }. */
async function runSolLeg({ config, keypair, lamports, leg, cycleKey }) {
  if (lamports <= 0n) return null;
  const base = { legId: leg.id, kind: leg.kind, label: leg.label, address: leg.address, input: { token: SOL_MINT, symbol: 'SOL', amount: lamports.toString() } };
  if (leg.page) base.page = leg.page;
  try {
    let out = { address: SOL_MINT, symbol: 'SOL', decimals: 9, amount: lamports, isNative: true, swapTx: null };
    const target = leg.kind === 'burn' ? config.source_token_address : leg.kind === 'treasury' ? leg.treasuryAsset : leg.asset;
    if (target && target !== SOL_MINT && target !== 'SOL' && !/^0x/.test(target)) {
      const asset = await describeSolAsset(target);
      try {
        const bought = await buyWithSol({ keypair, mint: asset.address, lamports, decimals: asset.decimals });
        out = { ...asset, amount: bought.outAmount, isNative: false, swapTx: bought.signature };
      } catch (e) {
        if (leg.kind === 'burn') throw e;
        console.log(`   ${leg.label}: paid in SOL, conversion skipped: ${e.message.slice(0, 120)}`);
        base.note = `paid in SOL, conversion skipped: ${e.message.slice(0, 120)}`;
      }
    }
    let sig;
    if (leg.kind === 'burn') {
      sig = await burnSpl(keypair, out.address, out.decimals, out.amount);
      console.log(`   Burn: ${fmt(out.amount, out.decimals, 2)} ${out.symbol} burned (${explorerTx(sig)})`);
    } else {
      let to = leg.address;
      if (leg.kind === 'page') {
        if (!leg.page) throw new Error('the page no longer exists');
        if (!to) to = await ensureSolVault(leg.page.id);
      }
      if (!isSolAddress(to)) throw new Error('no destination address on Solana');
      sig = out.isNative ? await sendSol(keypair, to, out.amount, `${leg.kind} leg`) : await sendSpl(keypair, out.address, out.decimals, to, out.amount, `${leg.kind} leg`);
      console.log(`   ${leg.label}: ${fmt(out.amount, out.decimals)} ${out.symbol} to ${leg.kind === 'page' ? (leg.page.claimed ? 'the owner ' : 'the vault ') : ''}${to.slice(0, 6)}… (${explorerTx(sig)})`);
      if (leg.kind === 'page') {
        await db.insertPagePayout({
          pageId: leg.page.id, configId: config.id, sourceToken: config.source_token_address, token: out.address, symbol: out.symbol, decimals: out.decimals,
          // The ledger's value column holds the native amount of the chain: lamports here.
          amount: out.amount, valueWei: lamports,
          to, direct: leg.page.claimed, txHash: sig, cycleKey, chain: 'solana',
        }).catch((e) => console.error(`   Page ledger write failed for ${leg.label}: ${e.message}`));
      }
      if (leg.kind === 'treasury') {
        await db.insertTreasuryLedger({ configId: config.id, token: out.address, amount: out.amount, ethSpent: lamports, txHash: sig }).catch(() => {});
      }
    }
    return { ...base, output: { token: out.address, symbol: out.symbol, decimals: out.decimals, amount: out.amount.toString() }, tx: sig, swapTx: out.swapTx, out };
  } catch (e) {
    const failed = (e.message || String(e)).slice(0, 200);
    console.log(`   ${leg.label} leg failed: ${failed}`);
    return { ...base, failed };
  }
}

/** Which of these owners already have a token account for the mint. */
async function hasTokenAccount(mint, owners) {
  const programId = await tokenProgramOf(mint);
  const keys = owners.map((o) => ata(mint, o, programId));
  const out = [];
  for (let i = 0; i < keys.length; i += 100) out.push(...(await conn().getMultipleAccountsInfo(keys.slice(i, i + 100))));
  return out.map(Boolean);
}

/**
 * Holders a past cycle could not pay (their batch failed) are owed tokens that
 * stayed in the dev wallet. Pay them first, from that balance, before anything
 * new is routed; the token accounts this opens are paid from the wallet's SOL.
 */
async function payStranded(config, keypair) {
  const dev = keypair.publicKey.toBase58();
  const { rows } = await db.pool.query(
    `SELECT at.id, at.holder_address, at.airdrop_amount::text AS amount, el.reward_token_used AS mint
     FROM airdrop_transactions at JOIN execution_logs el ON el.id = at.execution_log_id
     WHERE el.config_id = $1 AND at.status = 'failed' AND el.reward_token_used IS NOT NULL AND el.reward_token_used <> $2
       AND el.execution_time > NOW() - INTERVAL '14 days'
     ORDER BY at.id LIMIT 400`, [config.id, SOL_MINT]);
  if (!rows.length) return;
  const byMint = new Map();
  for (const r of rows) { if (!byMint.has(r.mint)) byMint.set(r.mint, []); byMint.get(r.mint).push(r); }
  for (const [mint, list] of byMint) {
    try {
      // Decimals straight from the mint account; the symbol only for the log.
      const parsed = await conn().getParsedAccountInfo(pk(mint), 'confirmed');
      const decimals = parsed?.value?.data?.parsed?.info?.decimals;
      if (decimals == null) throw new Error('mint not readable');
      const asset = { decimals, symbol: (await describeSolAsset(mint).catch(() => null))?.symbol || `${mint.slice(0, 4)}…` };
      let tokens = await splBalance(mint, dev);
      const has = await hasTokenAccount(mint, list.map((r) => r.holder_address));
      // SOL for the accounts to open: what the wallet holds above half the gas reserve.
      let sol = (await solBalance(dev)) - GAS_RESERVE / 2n;
      const pay = [];
      list.forEach((r, i) => {
        const amount = BigInt(r.amount);
        const cost = has[i] ? 10_000n : ATA_RENT + 10_000n;
        if (amount <= 0n || amount > tokens || cost > sol) return;
        tokens -= amount; sol -= cost;
        pay.push({ id: r.id, address: r.holder_address, amount, holderBalance: 0n });
      });
      if (!pay.length) { console.log(`   ${list.length} holders still owed ${asset.symbol}: not enough ${asset.symbol} or SOL in the dev wallet yet`); continue; }
      console.log(`   Paying ${pay.length} holders the ${asset.symbol} a past cycle owed them`);
      const res = await paySpl(keypair, mint, asset.decimals, pay);
      for (const t of res.successful) await db.pool.query("UPDATE airdrop_transactions SET status = 'success', tx_hash = $2 WHERE id = $1", [t.id, t.hash]);
    } catch (e) {
      console.log(`   Owed ${mint.slice(0, 6)}… payouts not sent: ${e.message.slice(0, 160)}`);
    }
  }
}

export async function executeSolConfig(config, { force = false } = {}) {
  if (running.has(config.id)) { console.log(`Config ${config.id} is still running, skipping`); return; }
  running.add(config.id);
  const cycleKey = `${config.id}-${Date.now().toString(36)}`;
  console.log(`\nCycle ${cycleKey} for ${config.source_token_address.slice(0, 6)}… on Solana`);
  try {
    const keypair = keypairFromEncrypted(config.dev_wallet_encrypted);
    const dev = keypair.publicKey.toBase58();
    const mint = config.source_token_address;

    // 1. Collect the creator fees pump.fun holds for this wallet.
    console.log('1. Collecting creator fees');
    let claimTx = null;
    if (isPumpMint(mint)) {
      const curve = await readBondingCurve(mint);
      const creator = curve?.creator && curve.creator !== '11111111111111111111111111111111' ? curve.creator : dev;
      if (creator !== dev) console.log(`   note: the coin's creator on pump.fun is ${creator.slice(0, 8)}…, not the dev wallet; fees accrue there`);
      const pending = await pendingCreatorFees(creator);
      if (pending.total > 100_000n && creator === dev) {
        const ixs = collectCreatorFeeInstructions({ payer: dev, creator: dev, includeAmm: Boolean(curve?.complete) });
        try {
          claimTx = await sendTx(ixs, [keypair], { computeUnits: 200_000, label: 'collect creator fees' });
          console.log(`   Collected ${formatSol(pending.total)} SOL of creator fees (${explorerTx(claimTx)})`);
        } catch (e) {
          if (curve?.complete) {
            // The AMM sweep can fail when nothing sits there yet: collect the curve vault alone.
            claimTx = await sendTx(collectCreatorFeeInstructions({ payer: dev, creator: dev, includeAmm: false }), [keypair], { computeUnits: 120_000, label: 'collect creator fees' });
            console.log(`   Collected ${formatSol(pending.curve)} SOL of creator fees (${explorerTx(claimTx)})`);
          } else throw e;
        }
      } else console.log(`   note: ${formatSol(pending.total)} SOL pending, nothing to collect`);
    } else console.log('   note: not a pump.fun coin, the dev wallet balance is what gets routed');

    // 1b. Holders a past cycle could not pay come first.
    await payStranded(config, keypair).catch((e) => console.log(`   Owed payouts skipped: ${e.message.slice(0, 160)}`));

    // 2. What is payable: everything above the gas reserve.
    const balance = await solBalance(dev);
    const payable = balance > GAS_RESERVE ? balance - GAS_RESERVE : 0n;
    console.log(`2. Payable: ${formatSol(payable)} SOL`);
    if (payable < MIN_DISTRIBUTE) {
      const log = newLog(config, cycleKey); log.status = 'success'; log.errorMessage = 'Nothing to distribute yet'; log.claimTx = claimTx;
      await db.createExecutionLog(log); await db.updateLastExecution(config.id);
      return;
    }

    // 3. The legs.
    const legs = await legsFor(config);
    const holdersLeg = legs.find((l) => l.kind === 'holders') || null;
    const routingLabel = await legsLabel(legs).catch(() => legs.map((l) => `${l.shareBps / 100}% ${l.label}`).join(' · '));
    console.log(`3. Routing: ${routingLabel}`);
    const amounts = splitAmounts(payable, legs);
    let holdersAmount = holdersLeg ? amounts[legs.indexOf(holdersLeg)] : 0n;
    const log = newLog(config, cycleKey);
    log.claimTx = claimTx; log.claimedEthWei = payable; log.assetAmount = payable;
    const legResults = [];
    const pages = [];
    for (let i = 0; i < legs.length; i++) {
      const leg = legs[i];
      if (leg.kind === 'holders') continue;
      const r = await runSolLeg({ config, keypair, lamports: amounts[i], leg, cycleKey });
      if (!r) continue;
      legResults.push({ ...r, out: undefined });
      if (r.failed) {
        if (holdersLeg) { holdersAmount += amounts[i]; note(log, `${leg.label} share paid to holders: ${r.failed}`); } else note(log, `${leg.label} share carried: ${r.failed}`);
        continue;
      }
      if (r.note) note(log, `${leg.label}: ${r.note}`);
      if (leg.kind === 'wallet') { log.creatorAmount += amounts[i]; log.creatorTx ||= r.tx; }
      if (leg.kind === 'burn') { log.burnAmount += r.out.amount; log.burnTx = r.tx; }
      if (leg.kind === 'treasury') { log.treasuryAmount += r.out.amount; log.treasuryToken = r.out.address; log.treasuryTx = r.tx; }
      if (leg.kind === 'page') pages.push(`${fmt(r.out.amount, r.out.decimals)} ${r.out.symbol} to ${mdEscape(leg.label)}${leg.page.claimed ? '' : ' (vault)'}`);
    }
    log.legs = legResults;

    // 4. The holders.
    if (holdersAmount < MIN_DISTRIBUTE) {
      log.status = 'success';
      if (holdersLeg && holdersAmount > 0n) note(log, 'Holders share below the minimum, carried to the next cycle');
      const saved = await db.createExecutionLog(log);
      if (legResults.length) await db.setExecutionLegs(saved.id, legResults).catch(() => {});
      await db.updateLastExecution(config.id);
      return;
    }
    // In SOL unless the holders leg (or the fixed reward) names another asset.
    let reward = await describeSolAsset(holdersLeg?.asset || (config.reward_mode === 'fixed' && config.target_token_address && !/^0x/.test(config.target_token_address) ? config.target_token_address : null));
    const raw = await tokenHolders(mint, { exclude: [dev, config.treasury_address, config.creator_address].filter(Boolean), minBalance: BigInt(config.min_holder_amount || 0) });
    const holders = raw.map((h) => ({ address: h.owner, balance: h.balance, weight: h.balance, multiplierBps: 10000 }));
    log.holderCount = holders.length;
    console.log(`   ${holders.length} holders`);
    if (!holders.length) {
      log.status = 'success'; note(log, 'No eligible holders');
      const saved = await db.createExecutionLog(log); if (legResults.length) await db.setExecutionLegs(saved.id, legResults).catch(() => {});
      await db.updateLastExecution(config.id);
      return;
    }
    let toDistribute = holdersAmount;
    let swapped = holdersAmount;
    if (!reward.isNative) {
      // A holder paid in a token needs a token account; opening one costs ~0.002 SOL, paid
      // by the dev wallet. Count the holders who need one (and whose share is worth it) and
      // keep that SOL out of the swap, so every batch can open its accounts.
      try {
        const provisional = calculateDistributions(holders, holdersAmount, 1n);
        const has = await hasTokenAccount(reward.address, provisional.map((d) => d.address));
        const opening = provisional.filter((d, i) => !has[i] && BigInt(d.amount) >= ATA_RENT).length;
        const reserve = BigInt(opening) * (ATA_RENT + 10_000n);
        if (reserve * 2n > holdersAmount) {
          console.log(`   ${opening} holders would need a new ${reward.symbol} account: paying SOL this cycle`);
          note(log, `Paid SOL: ${opening} holders have no ${reward.symbol} account yet and their shares are too small to open one`);
          reward = await describeSolAsset(null);
        } else {
          swapped = holdersAmount - reserve;
          if (opening) console.log(`   ${formatSol(reserve)} SOL kept to open ${opening} ${reward.symbol} accounts`);
        }
      } catch (e) {
        console.log(`   Could not count token accounts (${e.message.slice(0, 80)}): paying SOL this cycle`);
        reward = await describeSolAsset(null);
      }
    }
    if (!reward.isNative) {
      try {
        console.log(`   Buying ${reward.symbol} with ${formatSol(swapped)} SOL`);
        const bought = await buyWithSol({ keypair, mint: reward.address, lamports: swapped, decimals: reward.decimals });
        log.swapTx = bought.signature; log.boughtTokenAmount = bought.outAmount; toDistribute = bought.outAmount;
      } catch (e) {
        console.log(`   Swap skipped: ${e.message.slice(0, 120)}. Paying SOL instead.`);
        note(log, `Paid SOL: ${e.message.slice(0, 120)}`);
        reward = await describeSolAsset(null);
        swapped = holdersAmount;
      }
    }
    log.rewardTokenUsed = reward.address;
    const distributions = calculateDistributions(holders, toDistribute, 1n);
    console.log(`   Paying ${distributions.length} holders in ${reward.symbol}`);
    let results;
    if (reward.isNative) {
      results = await paySol(keypair, distributions);
      if (results.skipped?.length) note(log, `${results.skipped.length} holders skipped: their wallet would stay below the rent minimum`);
    } else {
      const lamportsPerRaw = swapped > 0n && toDistribute > 0n ? swapped / toDistribute : null; // how much SOL one raw unit was worth
      results = await paySpl(keypair, reward.address, reward.decimals, distributions, { lamportsPerRaw });
      if (results.skipped?.length) note(log, `${results.skipped.length} holders skipped: share below the cost of a token account`);
    }
    log.totalAirdropped = results.totalSent;
    log.status = 'success';
    const saved = await db.createExecutionLog(log);
    if (legResults.length) await db.setExecutionLegs(saved.id, legResults).catch(() => {});
    const rows = [];
    for (const tx of results.successful) rows.push({ executionLogId: saved.id, holderAddress: tx.address, holderBalance: tx.holderBalance.toString(), airdropAmount: tx.amount.toString(), txHash: tx.hash, status: 'success' });
    for (const tx of results.failed) rows.push({ executionLogId: saved.id, holderAddress: tx.address, holderBalance: tx.holderBalance?.toString() || '0', airdropAmount: tx.amount?.toString() || '0', txHash: null, status: 'failed' });
    if (rows.length) await db.createAirdropTransactionsBatch(rows);
    await db.updateLastExecution(config.id);

    const summary = `SOL: ${fmt(results.totalSent, reward.decimals)} ${reward.symbol} to ${results.successful.length}/${holders.length} holders` +
      (log.burnAmount > 0n ? ` · burned ${fmt(log.burnAmount, 6, 2)}` : '') + (pages.length ? ` · ${pages.join(' · ')}` : '') + (results.failed.length ? ` · ${results.failed.length} failed` : '');
    await notifyUser(config.user_id, `✅ *Cycle done*\n\n${summary}\n\n💼 Routing: ${mdEscape(routingLabel)}`);
    await announceSolCycle({ config, logId: saved.id, reward, results, holdersTotal: holders.length, extras: [log.burnAmount > 0n ? `Burned ${fmt(log.burnAmount, 6, 2)}` : null, ...pages].filter(Boolean) });
    console.log(`   Cycle ${cycleKey} done`);
  } catch (error) {
    console.error('Cycle failed:', error);
    const log = newLog(config, cycleKey); log.errorMessage = (error.message || String(error)).slice(0, 500);
    await db.createExecutionLog(log).catch(() => {});
    await notifyUser(config.user_id, `❌ *Cycle failed*\n\n${log.errorMessage}\n\nCheck the dev wallet holds SOL for fees.`);
  } finally {
    running.delete(config.id);
  }
}

async function notifyUser(userId, message) {
  try {
    const { rows } = await db.pool.query('SELECT telegram_id FROM users WHERE id = $1', [userId]);
    if (rows.length) await sendNotification(rows[0].telegram_id, message);
  } catch (e) { console.error('Error notifying user:', e.message); }
}

export { splBalance, pk, payStranded as payStrandedForTests };
