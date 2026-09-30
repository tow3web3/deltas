// Checks the page side of the routing engine against a scratch database:
//   DATABASE_URL=... MASTER_ENCRYPTION_KEY=... node scripts/test-pages.mjs
// It reads how a page leg resolves before and after a claim, the sweep queue
// and its back-off, and sweeps an empty vault (read-only on chain: an empty
// vault sends nothing). Writes test rows: never run it against production.
import crypto from 'node:crypto';
import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts';
import pool from '../src/db/connection.js';
import * as db from '../src/db/queries.js';
import { encryptPrivateKey } from '../src/services/encryption.js';
import { legsFor, legsLabel, splitAmounts, mdEscape, pageLabel } from '../src/services/legs.js';
import { sweepPage } from '../src/services/pages.js';

let failed = 0;
const ok = (cond, label, extra = '') => { console.log(`${cond ? 'ok  ' : 'FAIL'} ${label}${extra ? `  ${extra}` : ''}`); if (!cond) failed++; };
const addr = () => `0x${crypto.randomBytes(20).toString('hex')}`;

try {
  const key = generatePrivateKey();
  const vault = privateKeyToAccount(key).address.toLowerCase();
  const handle = `test_${crypto.randomBytes(3).toString('hex')}`;
  const { rows: [user] } = await pool.query('INSERT INTO users (wallet_address) VALUES ($1) RETURNING id', [addr()]);
  const { rows: [page] } = await pool.query(
    'INSERT INTO social_pages (platform, handle, vault_address, vault_encrypted) VALUES ($1, $2, $3, $4) RETURNING *',
    ['x', handle, vault, JSON.stringify(encryptPrivateKey(key))]);
  const { rows: [config] } = await pool.query(
    `INSERT INTO bot_configs (user_id, dev_wallet_encrypted, dev_wallet_public, source_token_address, target_token_address, is_active, legs_enabled)
     VALUES ($1, '{}', $2, $3, '0x0000000000000000000000000000000000000000', false, true) RETURNING *`, [user.id, addr(), addr()]);
  await pool.query(`INSERT INTO policy_legs (config_id, kind, share_bps, sort_order) VALUES ($1, 'holders', 6000, 0)`, [config.id]);
  await pool.query(`INSERT INTO policy_legs (config_id, kind, share_bps, sort_order, page_id, asset) VALUES ($1, 'page', 3333, 1, $2, '0x0000000000000000000000000000000000000000')`, [config.id, page.id]);
  await pool.query(`INSERT INTO policy_legs (config_id, kind, share_bps, sort_order, address) VALUES ($1, 'wallet', 667, 2, $2)`, [config.id, addr()]);

  // Unclaimed: the leg pays the vault.
  let legs = await legsFor(config);
  let leg = legs.find((l) => l.kind === 'page');
  ok(leg?.address === vault && leg.page?.claimed === false && leg.page.handle === handle, 'unclaimed page leg pays the vault');
  ok(leg.label === pageLabel('x', handle), 'the leg is named after the page', leg.label);
  const label = await legsLabel(legs);
  ok(label.includes(`33.33% X ${handle} in ETH`), 'routing label', label);
  ok(mdEscape(label).includes(handle.replace('_', '\\_')), 'underscores are escaped for Telegram');
  const amounts = splitAmounts(1_000_000_007n, legs);
  ok(amounts.reduce((a, b) => a + b, 0n) === 1_000_000_007n && amounts[1] === 333_300_002n, 'shares add up to the whole amount, remainder to holders', amounts.join(' / '));

  // The ledger and the sweep queue.
  await db.insertPagePayout({ pageId: page.id, configId: config.id, sourceToken: config.source_token_address, token: '0x0000000000000000000000000000000000000000', symbol: 'ETH', decimals: 18, amount: 10n ** 16n, valueWei: 10n ** 16n, to: vault, direct: false, txHash: `0x${'ab'.repeat(32)}`, cycleKey: 'test' });
  ok(!(await db.getPagesToSweep()).some((p) => p.id === page.id), 'an unclaimed page is never in the sweep queue');

  // Claimed: the very next read pays the owner.
  const owner = addr();
  await pool.query('UPDATE social_pages SET claimed_wallet = $2, claimed_at = NOW(), sweep_pending = true WHERE id = $1', [page.id, owner]);
  legs = await legsFor(config);
  leg = legs.find((l) => l.kind === 'page');
  ok(leg.address === owner && leg.page.claimed === true, 'claimed page leg pays the owner');
  ok((await db.getPagesToSweep()).some((p) => p.id === page.id), 'a claimed page with a vault payment is queued for a sweep');

  await db.markPageSwept(page.id, 'no gas');
  let row = await db.getPage(page.id);
  ok(row.sweep_pending === true && row.sweep_error === 'no gas' && row.last_swept_at === null, 'a failed sweep stays pending');
  ok(!(await db.getPagesToSweep()).some((p) => p.id === page.id), 'and waits before the next try');
  await pool.query(`UPDATE social_pages SET sweep_tried_at = NOW() - INTERVAL '31 minutes' WHERE id = $1`, [page.id]);
  ok((await db.getPagesToSweep()).some((p) => p.id === page.id), 'then is retried after half an hour');
  await db.markPageSwept(page.id, null);
  row = await db.getPage(page.id);
  ok(row.sweep_pending === false && row.sweep_error === null && row.last_swept_at !== null, 'a clean sweep clears the queue');
  ok(!(await db.getPagesToSweep()).some((p) => p.id === page.id), 'and the page leaves the queue');

  // The sweep itself, on a vault that holds nothing.
  await pool.query('UPDATE social_pages SET sweep_pending = true, last_swept_at = NULL WHERE id = $1', [page.id]);
  const swept = await sweepPage(page.id);
  if (swept.error && /fetch|HTTP|timeout|request/i.test(swept.error)) console.log(`skip sweep on chain: RPC unreachable (${swept.error.slice(0, 80)})`);
  else ok(!swept.error && swept.moved.length === 0, 'sweeping an empty vault sends nothing and succeeds', swept.error || '');
  await pool.query('UPDATE social_pages SET vault_address = $2 WHERE id = $1', [page.id, addr()]);
  ok(/does not match/.test((await sweepPage(page.id)).error || ''), 'a vault key that does not match its address is refused');
  await pool.query('UPDATE social_pages SET vault_address = $2, claimed_wallet = NULL WHERE id = $1', [page.id, vault]);
  ok(/not claimed/.test((await sweepPage(page.id)).error || ''), 'an unclaimed vault cannot be swept');

  // A page that was deleted leaves a leg without destination: the share goes back to holders.
  await pool.query('DELETE FROM social_pages WHERE id = $1', [page.id]);
  leg = (await legsFor(config)).find((l) => l.kind === 'page');
  ok(leg && leg.page === null && leg.address === null, 'a leg whose page is gone has no destination');

  await pool.query('DELETE FROM bot_configs WHERE id = $1', [config.id]);
  await pool.query('DELETE FROM users WHERE id = $1', [user.id]);
} catch (e) {
  console.error('Crashed:', e);
  failed++;
} finally {
  await pool.end();
}
console.log(failed ? `\n${failed} check(s) failed` : '\nAll checks passed');
process.exit(failed ? 1 : 0);
