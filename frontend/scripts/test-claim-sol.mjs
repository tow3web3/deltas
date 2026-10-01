// The Solana claim as the browser makes it, against a local server on a scratch
// database: a proved identity cookie (sealed with the local SESSION_SECRET), a
// nonce, an ed25519 signature from a fresh Solana key, then POST /api/claim.
//   SESSION_SECRET=localtest node --import tsx scripts/test-claim-sol.mjs   (server on :3111)
import crypto from 'node:crypto';
import nacl from 'tweetnacl';
import bs58 from 'bs58';
import { claimMessage } from '../lib/claimMessage.js';

const BASE = process.env.BASE || 'http://localhost:3111';
if (!/localhost|127\.0\.0\.1/.test(BASE)) throw new Error('local server only');
const secret = process.env.SESSION_SECRET || 'localtest';
const handle = `sol_streamer_${Date.now() % 100000}`;
const seal = (ids) => {
  const payload = Buffer.from(JSON.stringify({ ids, exp: Date.now() + 1800_000 })).toString('base64url');
  return `${payload}.${crypto.createHmac('sha256', secret).update(`oauth.${payload}`).digest('base64url')}`;
};
const cookie = `dl_ident_twitch=${seal([{ id: `t-${handle}`, handles: [handle], name: 'Sol Streamer', avatar: null }])}`;
const kp = nacl.sign.keyPair();
const wallet = bs58.encode(kp.publicKey);
const signWith = (secretKey, body) => bs58.encode(nacl.sign.detached(new TextEncoder().encode(claimMessage(body)), secretKey));
let failures = 0;
const check = (ok, what) => { console.log(`${ok ? 'PASS' : 'FAIL'}  ${what}`); if (!ok) failures++; };
const post = (body, withCookie = true) => fetch(`${BASE}/api/claim`, { method: 'POST', headers: { 'Content-Type': 'application/json', ...(withCookie ? { cookie } : {}) }, body: JSON.stringify(body) });

const nonce = async () => (await fetch(`${BASE}/api/app/auth/nonce`)).json();
const n = await nonce();
const body = { platform: 'twitch', handle, wallet, nonce: n.nonce, issuedAt: n.issuedAt };
const signature = signWith(kp.secretKey, body);

// 1. Another key's signature for this address is refused.
const other = nacl.sign.keyPair();
const bad = await post({ ...body, signature: signWith(other.secretKey, body) });
check(bad.status === 401, `a signature from another key is refused (${bad.status} ${(await bad.json()).error})`);
// 2. Without the sign-in, refused.
const noid = await post({ ...body, signature }, false);
check(noid.status === 403, `no sign-in is refused (${noid.status})`);
// 3. The real claim.
const res = await post({ ...body, signature });
const d = await res.json();
check(res.ok && d.chain === 'solana' && d.wallet === wallet, `the claim binds the Solana wallet with its case (${res.status} ${JSON.stringify(d)})`);
// 4. The same nonce again is refused.
const replay = await post({ ...body, signature });
check(replay.status === 400, `a replayed nonce is refused (${replay.status})`);
// 5. The page says claimed on Solana, to this wallet, and not on Robinhood Chain.
const after = await (await fetch(`${BASE}/api/claim`, { headers: { cookie } })).json();
const p = after.proved.find((x) => x.handle === handle);
check(p?.claimedOn?.solana === wallet && !p?.claimedOn?.robinhood, `claimed on Solana only (${JSON.stringify(p?.claimedOn)})`);
// 6. An EVM claim of the same page is independent.
const { privateKeyToAccount, generatePrivateKey } = await import('viem/accounts');
const evm = privateKeyToAccount(generatePrivateKey());
const n2 = await nonce();
const body2 = { platform: 'twitch', handle, wallet: evm.address, nonce: n2.nonce, issuedAt: n2.issuedAt };
const res2 = await post({ ...body2, signature: await evm.signMessage({ message: claimMessage(body2) }) });
const d2 = await res2.json();
check(res2.ok && d2.chain === 'robinhood', `an EVM wallet claims the Robinhood Chain side (${res2.status} ${d2.wallet})`);
const after2 = await (await fetch(`${BASE}/api/claim`, { headers: { cookie } })).json();
const p2 = after2.proved.find((x) => x.handle === handle);
check(p2?.claimedOn?.solana === wallet && p2?.claimedOn?.robinhood === evm.address.toLowerCase(), 'both chains keep their own wallet');

console.log(failures ? `${failures} check(s) failed` : 'All checks passed');
process.exit(failures ? 1 : 0);
