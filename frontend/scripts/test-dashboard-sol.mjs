// The dashboard on Solana, end to end against a local server on a scratch
// database: sign in with a Solana key, set up a pump.fun coin, edit its routing,
// reveal the key; then check a Robinhood Chain sign-in still works.
//   BASE=http://localhost:3111 npx tsx scripts/test-dashboard-sol.mjs
import nacl from 'tweetnacl';
import bs58 from 'bs58';
import { loginMessage, revealMessage } from '../lib/walletMessages.js';
import { getXStock } from '../lib/xstocks.js';

const BASE = process.env.BASE || 'http://localhost:3111';
if (!/localhost|127\.0\.0\.1/.test(BASE)) throw new Error('local server only');
const SOL_MINT = 'So11111111111111111111111111111111111111112';
let failures = 0;
const check = (ok, what) => { console.log(`${ok ? 'PASS' : 'FAIL'}  ${what}`); if (!ok) failures++; };

function jar() {
  let cookie = '';
  return async (path, init = {}) => {
    const res = await fetch(`${BASE}${path}`, { ...init, headers: { 'Content-Type': 'application/json', ...(init.headers || {}), ...(cookie ? { cookie } : {}) } });
    const set = res.headers.getSetCookie?.() || [];
    for (const c of set) { const [kv] = c.split(';'); const [k] = kv.split('='); cookie = [...cookie.split('; ').filter((x) => x && !x.startsWith(`${k}=`)), kv].join('; '); }
    let body = null; try { body = await res.json(); } catch { /* none */ }
    return { status: res.status, body };
  };
}
const nonce = async (call) => (await call('/api/app/auth/nonce')).body;

// A pump.fun coin to set up: any mint ending in "pump" that Jupiter lists.
const search = await (await fetch('https://lite-api.jup.ag/tokens/v2/search?query=pump')).json();
const coin = (Array.isArray(search) ? search : []).find((t) => String(t.id).endsWith('pump'));
if (!coin) throw new Error('no pump.fun mint found to test with');
console.log(`Test coin: ${coin.symbol} ${coin.id}`);

// 1. Solana sign-in
const call = jar();
const kp = nacl.sign.keyPair();
const wallet = bs58.encode(kp.publicKey);
const sign = (text) => bs58.encode(nacl.sign.detached(new TextEncoder().encode(text), kp.secretKey));
let n = await nonce(call);
const bad = await call('/api/app/auth/login', { method: 'POST', body: JSON.stringify({ wallet, nonce: n.nonce, issuedAt: n.issuedAt, signature: bs58.encode(nacl.sign.detached(new TextEncoder().encode('other'), kp.secretKey)) }) });
check(bad.status === 401, `a wrong Solana signature is refused (${bad.status})`);
n = await nonce(call);
const login = await call('/api/app/auth/login', { method: 'POST', body: JSON.stringify({ wallet, nonce: n.nonce, issuedAt: n.issuedAt, signature: sign(loginMessage({ wallet, nonce: n.nonce, issuedAt: n.issuedAt })) }) });
check(login.status === 200 && login.body?.user?.wallet === wallet && login.body?.user?.chain === 'solana', `Solana sign-in keeps the address's case (${login.status} ${JSON.stringify(login.body?.user)})`);
let me = await call('/api/app/me');
check(me.body?.user?.chain === 'solana' && me.body?.config === null, 'the profile says Solana, no coin yet');

// 2. Token lookup
const creatorKey = nacl.sign.keyPair();
const creator = bs58.encode(creatorKey.publicKey);
const tok = await call(`/api/app/token?address=${coin.id}&wallet=${creator}`);
check(tok.status === 200 && tok.body?.chain === 'solana' && tok.body?.symbol, `the mint is looked up on Solana (${tok.body?.symbol}, pump: ${JSON.stringify(tok.body?.pump)})`);
check(tok.body?.isCreator === false || tok.body?.pump === null, 'a key that did not create the coin is not called its creator');

// 3. Setup
const badKey = await call('/api/app/config', { method: 'POST', body: JSON.stringify({ chain: 'solana', sourceToken: coin.id, wallet: { mode: 'import', privateKey: 'not-a-key' }, reward: 'SOL' }) });
check(badKey.status === 400, `a bad key is refused (${badKey.body?.error})`);
const created = await call('/api/app/config', { method: 'POST', body: JSON.stringify({ chain: 'solana', sourceToken: coin.id, wallet: { mode: 'import', privateKey: bs58.encode(creatorKey.secretKey) }, reward: 'SOL', scheduleKind: 'interval', intervalMinutes: 30, marketHoursOnly: false }) });
check(created.status === 201 && created.body?.chain === 'solana' && created.body?.devWallet === creator, `a Solana coin is created (${created.status} ${JSON.stringify(created.body)})`);
me = await call('/api/app/me');
const cfg = me.body?.config;
check(cfg?.chain === 'solana' && cfg?.source_token_address === coin.id && cfg?.dev_wallet_public === creator && cfg?.target_token_address === SOL_MINT && cfg?.interval_minutes === 30, 'the config is stored with the mint, the creator wallet and SOL, case kept');
const solRow = me.body?.assets?.assets?.find((a) => a.isNative);
check(solRow && solRow.address === SOL_MINT && 'spendable' in solRow, `the creator wallet is read on Solana (${JSON.stringify(solRow)})`);

// 4. Routing
const nvda = getXStock('NVDA');
const partner = bs58.encode(nacl.sign.keyPair().publicKey);
const legs = [
  { kind: 'holders', shareBps: 7000, asset: '' },
  { kind: 'treasury', shareBps: 2000, address: partner, asset: nvda.mint, label: 'Treasury' },
  { kind: 'wallet', shareBps: 1000, address: partner, asset: SOL_MINT, label: 'Partner' },
];
const put = await call('/api/app/config', { method: 'PATCH', body: JSON.stringify({ legs }) });
const stored = put.body?.legs || [];
check(put.status === 200 && stored.find((l) => l.kind === 'treasury')?.asset === nvda.mint && stored.find((l) => l.kind === 'wallet')?.address === partner, `Solana legs are saved with their case (${put.status} ${put.body?.error || ''})`);
const evmLeg = await call('/api/app/config', { method: 'PATCH', body: JSON.stringify({ legs: [{ kind: 'holders', shareBps: 9000, asset: '' }, { kind: 'wallet', shareBps: 1000, address: '0x' + '1'.repeat(40) }] }) });
check(evmLeg.status === 400, `a 0x destination is refused on a Solana coin (${evmLeg.body?.error})`);
const reward = await call('/api/app/config', { method: 'PATCH', body: JSON.stringify({ reward: 'NVDA' }) });
check(reward.status === 200 && reward.body?.config?.target_token_address === nvda.mint, 'a reward ticker becomes the xStock mint');
const roulette = await call('/api/app/config', { method: 'PATCH', body: JSON.stringify({ reward_mode: 'roulette' }) });
check(roulette.status === 400, `rotating rewards are refused on Solana (${roulette.body?.error})`);

// 5. Reveal the key with a fresh signature
n = await nonce(call);
const reveal = await call('/api/app/config/key', { method: 'POST', body: JSON.stringify({ nonce: n.nonce, issuedAt: n.issuedAt, signature: sign(revealMessage({ wallet, devWallet: creator, nonce: n.nonce, issuedAt: n.issuedAt })) }) });
check(reveal.status === 200 && reveal.body?.privateKey === bs58.encode(creatorKey.secretKey), `the key is revealed to the signed-in wallet (${reveal.status} ${reveal.body?.error || ''})`);

// 6. Robinhood Chain sign-in still works
const { privateKeyToAccount, generatePrivateKey } = await import('viem/accounts');
const evm = privateKeyToAccount(generatePrivateKey());
const call2 = jar();
n = await nonce(call2);
const evmLogin = await call2('/api/app/auth/login', { method: 'POST', body: JSON.stringify({ wallet: evm.address, nonce: n.nonce, issuedAt: n.issuedAt, signature: await evm.signMessage({ message: loginMessage({ wallet: evm.address, nonce: n.nonce, issuedAt: n.issuedAt }) }) }) });
check(evmLogin.status === 200 && evmLogin.body?.user?.chain === 'robinhood' && evmLogin.body?.user?.wallet === evm.address.toLowerCase(), `a Robinhood Chain sign-in still works (${evmLogin.status})`);

// clean up the coin
await call('/api/app/config', { method: 'DELETE' });
console.log(failures ? `${failures} check(s) failed` : 'All checks passed');
process.exit(failures ? 1 : 0);
