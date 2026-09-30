// Read-only checks of the Solana modules against mainnet. No key, no sending.
//   SOLANA_RPC_URL=... node scripts/test-sol.mjs
import { readBondingCurve, pendingCreatorFees, collectCreatorFeeInstructions, tokenProgramOf, TOKEN_2022_PROGRAM_ID } from '../src/sol/pump.js';
import { tokenHolders } from '../src/sol/holders.js';
import { quote, prices, SOL_MINT, tokenInfo } from '../src/sol/jupiter.js';
import { xStocks, getXStock } from '../src/sol/xstocks.js';
import { formatSol, generateSolWallet, keypairFromSecret, encryptSolSecret, keypairFromEncrypted } from '../src/sol/client.js';

let failed = 0;
const ok = (c, label, extra = '') => { console.log(`${c ? 'ok  ' : 'FAIL'} ${label}${extra ? `  (${extra})` : ''}`); if (!c) failed++; };
const t0 = Date.now();

// keys
process.env.MASTER_ENCRYPTION_KEY ||= '0'.repeat(64);
const w = generateSolWallet();
const kp = keypairFromEncrypted(encryptSolSecret(w.secret));
ok(kp.publicKey.toBase58() === w.address, 'a generated key survives encryption', w.address.slice(0, 8));
ok(keypairFromSecret(JSON.stringify([...kp.secretKey])).publicKey.toBase58() === w.address, 'a JSON-array secret is accepted too');

// pump.fun: a graduated coin (Fartcoin) and its creator vault
const FART = '9BB6NFEcjBCtnNLFko2FqVQBq8HHM13kCyYcdQbgpump';
const curve = await readBondingCurve(FART);
ok(curve && curve.complete === true, 'bonding curve of a graduated coin reads as complete', curve ? `creator ${curve.creator.slice(0, 8)}` : 'no curve');
const fees = await pendingCreatorFees(curve.creator);
ok(typeof fees.total === 'bigint', 'pending creator fees read', `curve ${formatSol(fees.curve)} SOL, amm ${formatSol(fees.amm)} SOL`);
const ixs = collectCreatorFeeInstructions({ payer: w.address, creator: curve.creator });
ok(ixs.length === 2 && ixs[0].keys.length === 12 && ixs[1].keys.length === 10, 'collect instructions built with the documented account counts');
const notPump = await readBondingCurve(SOL_MINT);
ok(notPump === null, 'a non-pump mint has no bonding curve');

// holders of a smaller pump coin
const OTC = 'MukLDtJ8Cx9DxLbeyLRSWPSposTMWuwHANbuaudpump';
const holders = await tokenHolders(OTC);
ok(holders.length > 0, 'holders read through Helius', `${holders.length} owners, top ${holders[0]?.owner.slice(0, 8)} with ${holders[0]?.balance}`);
ok(holders.every((h) => h.balance > 0n), 'every holder has a positive balance');

// jupiter
const q = await quote({ inputMint: SOL_MINT, outputMint: 'Xsc9qvGR1efVDFGLrVsmkzv3qi45LTBjeUKSPmx9qEh', amount: 100_000_000 });
ok(Number(q.outAmount) > 0, 'Jupiter quotes 0.1 SOL -> NVDAx', `${Number(q.outAmount) / 1e8} NVDAx via ${q.routePlan?.map((r) => r.swapInfo.label).join(' > ')}`);
const p = await prices([SOL_MINT, 'Xsc9qvGR1efVDFGLrVsmkzv3qi45LTBjeUKSPmx9qEh']);
ok(p[SOL_MINT]?.usdPrice > 0 && p['Xsc9qvGR1efVDFGLrVsmkzv3qi45LTBjeUKSPmx9qEh']?.usdPrice > 0, 'Jupiter prices', `SOL $${p[SOL_MINT]?.usdPrice?.toFixed(2)}, NVDAx $${p['Xsc9qvGR1efVDFGLrVsmkzv3qi45LTBjeUKSPmx9qEh']?.usdPrice?.toFixed(2)}`);
const fair = (0.1 * p[SOL_MINT].usdPrice) / p['Xsc9qvGR1efVDFGLrVsmkzv3qi45LTBjeUKSPmx9qEh'].usdPrice;
ok(Number(q.outAmount) / 1e8 > fair * 0.97, 'the quote is within 3% of the fair price', `${((Number(q.outAmount) / 1e8 / fair) * 100).toFixed(2)}% of fair`);
const info = await tokenInfo(OTC);
ok(info?.symbol, 'token info from Jupiter', `${info?.symbol} ${info?.name}`);

// xStocks
const list = await xStocks();
ok(list.length > 50, 'xStocks registry loaded', `${list.length} tokens`);
const nvda = await getXStock('NVDA');
ok(nvda?.mint === 'Xsc9qvGR1efVDFGLrVsmkzv3qi45LTBjeUKSPmx9qEh' && nvda.decimals === 8 && nvda.icon, 'NVDA resolves to its mint with a logo', nvda?.icon);
ok((await tokenProgramOf(nvda.mint)).equals(TOKEN_2022_PROGRAM_ID), 'xStocks are Token-2022 mints');

console.log(`\n${failed ? `${failed} check(s) failed` : 'The Solana foundation works against mainnet.'} (${((Date.now() - t0) / 1000).toFixed(1)}s)`);
process.exit(failed ? 1 : 0);
