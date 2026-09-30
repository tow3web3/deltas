// The whole page story, end to end, on a fork of Robinhood Chain: real
// contracts, fake money. A coin routes 100% of its fees to a page; a cycle pays
// the vault; the owner claims; the vault is swept to them; the next cycle pays
// them directly. Needs anvil forking the chain and a scratch database:
//   anvil --fork-url https://rpc.mainnet.chain.robinhood.com --port 8555 --chain-id 4663
//   DATABASE_URL=postgres://.../delta_e2e RH_RPC_URL=http://127.0.0.1:8555 MASTER_ENCRYPTION_KEY=... node scripts/e2e-fork.mjs
// Writes rows and moves fork money only. Never point it at production.
import crypto from 'node:crypto';
import { createPublicClient, http, parseEther, formatEther, formatUnits, erc20Abi } from 'viem';
import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts';
import pool from '../src/db/connection.js';
import { encryptPrivateKey } from '../src/services/encryption.js';
import { executeBotConfig } from '../src/scheduler/executor.js';
import { sweepPage } from '../src/services/pages.js';
import { robinhoodChain } from '../src/chain/config.js';
import { getStock } from '../src/chain/stocks.js';

const RPC = process.env.RH_RPC_URL || 'http://127.0.0.1:8555';
if (!/127\.0\.0\.1|localhost/.test(RPC)) throw new Error('This script only runs against a local fork');
if (!/e2e|test|scratch/.test(process.env.DATABASE_URL || '')) throw new Error('DATABASE_URL must name a scratch database (…e2e, …test)');

const client = createPublicClient({ chain: robinhoodChain, transport: http(RPC) });
const rpc = async (method, params = []) => {
  const r = await fetch(RPC, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }) }).then((x) => x.json());
  if (r.error) throw new Error(`${method}: ${r.error.message}`);
  return r.result;
};
let failed = 0;
const ok = (cond, label, extra = '') => { console.log(`${cond ? 'ok  ' : 'FAIL'} ${label}${extra ? `  (${extra})` : ''}`); if (!cond) failed++; };
const eth = async (a) => client.getBalance({ address: a });
const bal = async (token, a) => client.readContract({ address: token, abi: erc20Abi, functionName: 'balanceOf', args: [a] });

// Anvil's first accounts: the dev wallet of the coin, and the owner of the page.
const DEV_KEY = '0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d';
// The owner is a fresh, empty wallet: anvil's pre-funded accounts report a stale balance on a fork.
const OWNER = privateKeyToAccount(generatePrivateKey()).address;
const dev = privateKeyToAccount(DEV_KEY);
const COIN = process.env.E2E_COIN || '0x4d0873e333b48262b4f8ba523e0783cfcf53a553';
const STOCK = getStock('NVDA');
let STOCK_DECIMALS = 18;

try {
  // The dev wallet holds a little ETH, as if a launchpad had paid it, plus some NVDA taken from a holder on the fork.
  await rpc('anvil_setBalance', [dev.address, `0x${parseEther('0.05').toString(16)}`]);
  let stockIn = 0n;
  try {
    STOCK_DECIMALS = Number(await client.readContract({ address: STOCK.address, abi: erc20Abi, functionName: 'decimals' }));
    const head = await client.getBlockNumber();
    const raw = await rpc('eth_getLogs', [{ address: STOCK.address, fromBlock: `0x${(head - 5000n).toString(16)}`, toBlock: `0x${head.toString(16)}`, topics: ['0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef'] }]);
    const holders = [...new Set(raw.map((l) => `0x${l.topics[2].slice(26)}`))].filter((a) => a !== '0x0000000000000000000000000000000000000000');
    for (const h of holders.slice(-30).reverse()) {
      const b = await bal(STOCK.address, h);
      if (b > 10n ** 12n) {
        const amount = b / 2n;
        await rpc('anvil_impersonateAccount', [h]);
        await rpc('anvil_setBalance', [h, `0x${parseEther('1').toString(16)}`]);
        const data = `0xa9059cbb${dev.address.slice(2).padStart(64, '0')}${amount.toString(16).padStart(64, '0')}`;
        const tx = await rpc('eth_sendTransaction', [{ from: h, to: STOCK.address, data, gas: '0x30000' }]);
        await client.waitForTransactionReceipt({ hash: tx });
        await rpc('anvil_stopImpersonatingAccount', [h]);
        stockIn = await bal(STOCK.address, dev.address);
        break;
      }
    }
  } catch (e) { console.log(`   (no NVDA for the dev wallet: ${e.message.split('\n')[0].slice(0, 120)})`); }
  console.log(`Dev wallet ${dev.address}: ${formatEther(await eth(dev.address))} ETH, ${formatUnits(stockIn, STOCK_DECIMALS)} NVDA`);

  // The coin, its dev wallet, and one page that gets everything.
  const { rows: [user] } = await pool.query('INSERT INTO users (wallet_address) VALUES ($1) RETURNING id', [`0x${crypto.randomBytes(20).toString('hex')}`]);
  const { rows: [config] } = await pool.query(
    `INSERT INTO bot_configs (user_id, dev_wallet_encrypted, dev_wallet_public, source_token_address, target_token_address, is_active, legs_enabled, fee_source, interval_minutes)
     VALUES ($1, $2, $3, $4, '0x0000000000000000000000000000000000000000', true, true, 'wallet', 60) RETURNING *`,
    [user.id, JSON.stringify(encryptPrivateKey(DEV_KEY)), dev.address.toLowerCase(), COIN]);
  const vaultKey = generatePrivateKey();
  const vault = privateKeyToAccount(vaultKey).address.toLowerCase();
  const handle = `e2e_${crypto.randomBytes(3).toString('hex')}`;
  const { rows: [page] } = await pool.query('INSERT INTO social_pages (platform, handle, vault_address, vault_encrypted) VALUES ($1, $2, $3, $4) RETURNING *', ['x', handle, vault, JSON.stringify(encryptPrivateKey(vaultKey))]);
  await pool.query(`INSERT INTO policy_legs (config_id, kind, share_bps, sort_order, page_id) VALUES ($1, 'page', 10000, 0, $2)`, [config.id, page.id]);
  console.log(`Coin ${COIN} routes 100% to X ${handle}, vault ${vault}`);

  // 1. A cycle pays the vault.
  console.log('\n--- Cycle 1: the page is unclaimed, the vault gets paid');
  await executeBotConfig(config, { force: true });
  const { rows: payouts1 } = await pool.query('SELECT token, symbol, amount::text, direct, to_address, tx_hash FROM page_payouts WHERE page_id = $1 ORDER BY id', [page.id]);
  ok(payouts1.length >= 1, 'a payout was recorded for the page', `${payouts1.length} row(s)`);
  ok(payouts1.every((p) => p.to_address.toLowerCase() === vault && p.direct === false), 'it went to the vault, marked not direct');
  const vaultEth1 = await eth(vault);
  const vaultStock1 = await bal(STOCK.address, vault);
  ok(vaultEth1 > 0n, 'the vault holds ETH on chain', `${formatEther(vaultEth1)} ETH`);
  if (stockIn > 0n) ok(vaultStock1 > 0n, 'the vault holds NVDA on chain', `${formatUnits(vaultStock1, STOCK_DECIMALS)} NVDA`);
  for (const p of payouts1) {
    const receipt = await client.getTransactionReceipt({ hash: p.tx_hash }).catch(() => null);
    ok(receipt?.status === 'success', `payout tx ${p.symbol} confirmed`, p.tx_hash.slice(0, 18));
  }
  const { rows: [log1] } = await pool.query('SELECT status, error_message FROM execution_logs WHERE config_id = $1 ORDER BY id DESC LIMIT 1', [config.id]);
  ok(log1?.status === 'success', 'the cycle logged success', log1?.error_message || '');

  // 2. The owner claims: the wallet is bound (what the signed claim does), then the vault is swept.
  console.log('\n--- Claim: the owner binds a wallet, the vault is swept to it');
  await pool.query('UPDATE social_pages SET claimed_wallet = $1, claimed_at = NOW(), sweep_pending = true, external_id = $2 WHERE id = $3', [OWNER.toLowerCase(), 'e2e', page.id]);
  await pool.query('INSERT INTO page_claims (page_id, wallet, proof, external_id) VALUES ($1, $2, $3, $4)', [page.id, OWNER.toLowerCase(), 'oauth', 'e2e']).catch(() => {});
  const ownerEthBefore = await eth(OWNER);
  const ownerStockBefore = await bal(STOCK.address, OWNER);
  const sweep = await sweepPage(page.id);
  console.log('   sweep:', JSON.stringify(sweep, (k, v) => (typeof v === 'bigint' ? v.toString() : v)).slice(0, 300));
  const vaultEth2 = await eth(vault);
  const vaultStock2 = await bal(STOCK.address, vault);
  ok(vaultEth2 < parseEther('0.0005'), 'the vault is empty of ETH (gas dust at most)', `${formatEther(vaultEth2)} ETH left`);
  if (stockIn > 0n) ok(vaultStock2 === 0n, 'the vault is empty of NVDA');
  ok((await eth(OWNER)) > ownerEthBefore, 'the owner received the ETH', `+${formatEther((await eth(OWNER)) - ownerEthBefore)} ETH`);
  if (stockIn > 0n) ok((await bal(STOCK.address, OWNER)) > ownerStockBefore, 'the owner received the NVDA');
  const { rows: sweeps } = await pool.query('SELECT symbol, amount::text, tx_hash FROM page_sweeps WHERE page_id = $1', [page.id]);
  ok(sweeps.length >= 1, 'the sweep was recorded', sweeps.map((s) => s.symbol).join(', '));
  const { rows: [pg] } = await pool.query('SELECT sweep_pending, last_swept_at, sweep_error FROM social_pages WHERE id = $1', [page.id]);
  ok(pg.sweep_pending === false && pg.last_swept_at && !pg.sweep_error, 'the page is marked swept', pg.sweep_error || '');

  // 3. The next cycle pays the owner directly.
  console.log('\n--- Cycle 2: the page is claimed, the owner is paid directly');
  await rpc('anvil_setBalance', [dev.address, `0x${parseEther('0.03').toString(16)}`]);
  const ownerEth2 = await eth(OWNER);
  await executeBotConfig(config, { force: true });
  const { rows: payouts2 } = await pool.query('SELECT to_address, direct, tx_hash FROM page_payouts WHERE page_id = $1 AND id > $2', [page.id, payouts1.at(-1)?.id || 0]);
  const { rows: allPayouts } = await pool.query('SELECT id FROM page_payouts WHERE page_id = $1', [page.id]);
  ok(allPayouts.length > payouts1.length, 'a second payout was recorded');
  const { rows: latest } = await pool.query('SELECT to_address, direct FROM page_payouts WHERE page_id = $1 ORDER BY id DESC LIMIT 1', [page.id]);
  ok(latest[0]?.to_address.toLowerCase() === OWNER.toLowerCase() && latest[0].direct === true, 'it went straight to the owner, marked direct');
  ok((await eth(OWNER)) > ownerEth2, 'the owner balance grew again', `+${formatEther((await eth(OWNER)) - ownerEth2)} ETH`);
  ok((await eth(vault)) === vaultEth2, 'the vault did not receive anything more');

  console.log(failed ? `\n${failed} check(s) failed` : '\nEvery step of the page story works on the fork.');
  process.exit(failed ? 1 : 0);
} catch (e) {
  console.error('\nThe run stopped:', e);
  process.exit(1);
}
