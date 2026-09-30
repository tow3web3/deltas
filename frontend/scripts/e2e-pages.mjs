// End-to-end check of pages, against a running site and its database:
//   node scripts/e2e-pages.mjs http://localhost:3001
// Needs DATABASE_URL and SESSION_SECRET in the environment (the same values the
// site runs with). It signs in with a throwaway wallet, routes a share of a
// policy to a page, records a payment, then claims the page with a forged
// platform sign-in (the cookie is signed with SESSION_SECRET, so this only
// works for someone who already holds the server's secret).
// Writes test rows to the database: run it against a scratch database only.
import crypto from 'node:crypto';
import pg from 'pg';
import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts';

const BASE = (process.argv[2] || 'http://localhost:3001').replace(/\/$/, '');
const { DATABASE_URL, SESSION_SECRET } = process.env;
if (!DATABASE_URL || !SESSION_SECRET) { console.error('Set DATABASE_URL and SESSION_SECRET'); process.exit(1); }

const pool = new pg.Pool({ connectionString: DATABASE_URL });
const account = privateKeyToAccount(generatePrivateKey());
const owner = privateKeyToAccount(generatePrivateKey());
const HANDLE = `e2e-${crypto.randomBytes(3).toString('hex')}`;
let cookie = '';
let failed = 0;
const ok = (cond, label, extra = '') => { console.log(`${cond ? 'ok  ' : 'FAIL'} ${label}${extra ? `  ${extra}` : ''}`); if (!cond) failed++; };

async function api(path, { method = 'GET', body, jar = cookie } = {}) {
  const res = await fetch(`${BASE}${path}`, { method, redirect: 'manual', headers: { ...(body ? { 'Content-Type': 'application/json' } : {}), ...(jar ? { cookie: jar } : {}) }, body: body ? JSON.stringify(body) : undefined });
  const set = res.headers.getSetCookie?.() || [];
  const text = await res.text();
  let data = null;
  try { data = JSON.parse(text); } catch { /* html */ }
  return { status: res.status, data, text, set, location: res.headers.get('location') };
}
const nonce = () => api('/api/app/auth/nonce').then((r) => r.data);

// The site's host, as the signed messages spell it (NEXT_PUBLIC_SITE_URL must be BASE).
const host = new URL(BASE).host;

try {
  // 1. Sign in.
  const n = await nonce();
  const login = `DELTA dashboard login\nChain: Robinhood Chain (4663)\nWallet: ${account.address}\nNonce: ${n.nonce}\nIssued: ${n.issuedAt}\n\nThis signature costs no gas and only proves you own this wallet.`;
  const l = await api('/api/app/auth/login', { method: 'POST', body: { wallet: account.address, nonce: n.nonce, issuedAt: n.issuedAt, signature: await account.signMessage({ message: login }) } });
  ok(l.status === 200, 'wallet login', l.data?.error || '');
  cookie = l.set.map((c) => c.split(';')[0]).join('; ');
  const userId = l.data?.user?.id;

  // 2. A policy, written straight to the database so the check does not depend on the chain.
  const token = `0x${crypto.randomBytes(20).toString('hex')}`;
  const { rows: [cfg] } = await pool.query(
    `INSERT INTO bot_configs (user_id, dev_wallet_encrypted, dev_wallet_public, source_token_address, target_token_address, is_active)
     VALUES ($1, '{}', $2, $3, '0x0000000000000000000000000000000000000000', false) RETURNING id`,
    [userId, account.address.toLowerCase(), token]);

  // 3. Route 30% to a page.
  const bad = await api('/api/app/config', { method: 'PATCH', body: { legs: [{ kind: 'holders', shareBps: 7000 }, { kind: 'page', shareBps: 3000, pageInput: 'https://youtube.com/watch?v=x' }] } });
  ok(bad.status === 400, 'a video link is refused', bad.data?.error);
  const twice = await api('/api/app/config', { method: 'PATCH', body: { legs: [{ kind: 'holders', shareBps: 4000 }, { kind: 'page', shareBps: 3000, page: { platform: 'github', handle: HANDLE } }, { kind: 'page', shareBps: 3000, pageInput: `github.com/${HANDLE.toUpperCase()}` }] } });
  ok(twice.status === 400, 'the same page twice is refused', twice.data?.error);
  const saved = await api('/api/app/config', { method: 'PATCH', body: { legs: [{ kind: 'holders', shareBps: 7000 }, { kind: 'page', shareBps: 3000, asset: '0x0000000000000000000000000000000000000000', pageInput: `https://github.com/${HANDLE}` }] } });
  ok(saved.status === 200, 'routing with a page saved', saved.data?.error || '');
  const leg = saved.data?.legs?.find((x) => x.kind === 'page');
  ok(leg?.page_handle === HANDLE && /^0x[0-9a-f]{40}$/.test(leg?.page_vault || ''), 'the page has a vault', leg?.page_vault);
  ok(!JSON.stringify(saved.data).includes('vault_encrypted') && !JSON.stringify(saved.data).includes('authTag'), 'the vault key is not in the response');
  const { rows: [row] } = await pool.query('SELECT * FROM social_pages WHERE platform = $1 AND handle = $2', ['github', HANDLE]);
  const again = await api('/api/app/config', { method: 'PATCH', body: { legs: [{ kind: 'holders', shareBps: 5000 }, { kind: 'page', shareBps: 5000, page: { platform: 'github', handle: HANDLE } }] } });
  const { rows: pagesNow } = await pool.query('SELECT id, vault_address FROM social_pages WHERE platform = $1 AND handle = $2', ['github', HANDLE]);
  ok(again.status === 200 && pagesNow.length === 1 && pagesNow[0].vault_address === row.vault_address, 'saving again keeps the same page and vault');
  const { rows: [mirror] } = await pool.query('SELECT split_holders_bps + split_creator_bps + split_burn_bps + split_treasury_bps AS total, legs_enabled FROM bot_configs WHERE id = $1', [cfg.id]);
  ok(Number(mirror.total) === 10000 && mirror.legs_enabled, 'legacy split still adds up to 100%');

  // 4. A payment into the vault, as the executor records it.
  await pool.query(
    `INSERT INTO page_payouts (page_id, config_id, source_token, token, symbol, decimals, amount, value_wei, to_address, direct, tx_hash, cycle_key)
     VALUES ($1, $2, $3, '0x0000000000000000000000000000000000000000', 'ETH', 18, '50000000000000000', '50000000000000000', $4, false, $5, 'e2e')`,
    [row.id, cfg.id, token, row.vault_address, `0x${crypto.randomBytes(32).toString('hex')}`]);

  // 5. Public reads.
  const dir = await api('/api/pages', { jar: '' });
  ok(dir.status === 200 && dir.data.pages.some((p) => p.handle === HANDLE), 'directory lists the page', dir.data?.error || '');
  ok(dir.data?.recent?.some((p) => p.handle === HANDLE && p.amount === 0.05), 'recent payments list the payment');
  const one = await api(`/api/pages/github/${HANDLE}`, { jar: '' });
  ok(one.status === 200 && one.data.payments === 1 && one.data.claimed === false && one.data.sources?.[0]?.shareBps === 5000, 'page API', one.data?.error || '');
  ok(!one.text.includes('encrypted') && !one.text.includes('authTag'), 'page API does not leak the vault key');
  const res = await api(`/api/pages/resolve?input=${encodeURIComponent(`github.com/${HANDLE}`)}`, { jar: '' });
  ok(res.status === 200 && res.data.exists && res.data.vault === row.vault_address, 'resolve finds it');
  for (const path of ['/', '/pages', `/pages?platform=github&q=${HANDLE}`, `/p/github/${HANDLE}`, '/p/github/nobody-routes-here', '/claim', `/claim?platform=github&handle=${HANDLE}`, '/app']) {
    const r = await api(path, { jar: '' });
    ok(r.status === 200, `GET ${path}`, r.status === 200 ? '' : `${r.status}`);
  }
  ok((await api('/p/myspace/tom', { jar: '' })).status === 404, 'unknown platform is a 404');

  // 6. Claim: refused without a proof, refused for someone else's handle, accepted for the owner.
  const claim = async (handle, jar, signer = owner, wallet = owner.address) => {
    const c = await nonce();
    const message = `DELTA: claim a page\nPage: github:${handle}\nPay to: ${wallet.toLowerCase()}\nNonce: ${c.nonce}\nIssued: ${c.issuedAt}\n\nFees routed to this page will be sent to this wallet. This signature costs no gas. Only sign this on ${host}.`;
    return api('/api/claim', { method: 'POST', jar, body: { platform: 'github', handle, wallet, nonce: c.nonce, issuedAt: c.issuedAt, signature: await signer.signMessage({ message }) } });
  };
  const seal = (ids) => {
    const payload = Buffer.from(JSON.stringify({ ids, exp: Date.now() + 600_000 })).toString('base64url');
    return `rp_ident=${payload}.${crypto.createHmac('sha256', SESSION_SECRET).update(`oauth.${payload}`).digest('base64url')}`;
  };
  ok((await claim(HANDLE, '')).status === 403, 'claim without sign-in is refused');
  const forged = seal({ github: [{ id: 'u1', handles: [HANDLE], name: 'E2E', avatar: null }] }).replace(/.$/, (c) => (c === 'A' ? 'B' : 'A'));
  ok((await claim(HANDLE, forged)).status === 403, 'a tampered sign-in cookie is refused');
  const other = seal({ github: [{ id: 'u2', handles: ['someone-else'], name: 'Other', avatar: null }] });
  ok((await claim(HANDLE, other)).status === 403, 'signing in as someone else is refused');
  const mine = seal({ github: [{ id: 'u1', handles: [HANDLE], name: 'E2E', avatar: null }] });
  ok((await claim(HANDLE, mine, account, owner.address)).status === 401, 'a signature from another wallet is refused');
  const state = await api('/api/claim', { jar: mine });
  ok(state.status === 200 && state.data.proved?.[0]?.handle === HANDLE && state.data.platforms.domain === true, 'claim state shows the proved page');
  const done = await claim(HANDLE, mine);
  ok(done.status === 200 && done.data.wallet === owner.address.toLowerCase(), 'the owner claims', done.data?.error || '');
  const { rows: [after] } = await pool.query('SELECT claimed_wallet, external_id, sweep_pending FROM social_pages WHERE id = $1', [row.id]);
  ok(after.claimed_wallet === owner.address.toLowerCase() && after.external_id === 'u1' && after.sweep_pending === true, 'the page is bound and a sweep is queued');
  const squatter = seal({ github: [{ id: 'u9', handles: [HANDLE], name: 'New owner of the handle', avatar: null }] });
  const stolen = await claim(HANDLE, squatter);
  ok(stolen.status === 400 && /different account/.test(stolen.data?.error || ''), 'the same handle under another account id is refused');
  const view = await api(`/api/pages/github/${HANDLE}`, { jar: '' });
  ok(view.data?.claimed === true && view.data?.claimedWallet === owner.address.toLowerCase(), 'the profile shows the claim');

  // 7. Sign-in plumbing.
  const start = await api('/api/oauth/github/start?return=/claim?platform=github', { jar: '' });
  ok(start.status === 302 && /^https:\/\/github\.com\/login\/oauth\/authorize\?/.test(start.location || '') && start.set.some((c) => c.startsWith('rp_oauth=') && /HttpOnly/i.test(c)), 'start redirects to GitHub with a state cookie');
  const evil = await api('/api/oauth/github/start?return=//evil.example/x', { jar: '' });
  const evilState = JSON.parse(Buffer.from((evil.set.find((c) => c.startsWith('rp_oauth=')) || '').split('=')[1]?.split('.')[0] || 'e30', 'base64url').toString() || '{}');
  ok(evilState.returnTo === '/claim', 'an off-site return path is dropped');
  const cb = await api('/api/oauth/github/callback?code=x&state=wrong', { jar: (start.set.find((c) => c.startsWith('rp_oauth=')) || '').split(';')[0] });
  ok(cb.status === 302 && /error=/.test(cb.location || ''), 'a wrong state is refused');
  const off = await api('/api/oauth/twitch/start', { jar: '' });
  ok(off.status === 302 && /not%20available/.test(off.location || ''), 'a platform without credentials says so');

  await pool.query('DELETE FROM bot_configs WHERE id = $1', [cfg.id]);
  await pool.query('DELETE FROM social_pages WHERE id = $1', [row.id]);
  await pool.query('DELETE FROM users WHERE id = $1', [userId]);
} catch (e) {
  console.error('Crashed:', e);
  failed++;
} finally {
  await pool.end();
}
console.log(failed ? `\n${failed} check(s) failed` : '\nAll checks passed');
process.exit(failed ? 1 : 0);
