// Sign in with the platform, to prove a page is yours. One provider per
// platform; each is enabled by setting its client id and secret. The access
// token is used once, to read who signed in and which pages they run, then
// dropped: nothing is stored but the identities, in a signed cookie that
// expires in thirty minutes.
import crypto from 'crypto';
import dns from 'dns';
import { cookies } from 'next/headers';
import { SITE_URL } from './brand';
import { normalizeHandle } from './pages';
import { saveAvatar } from './avatarStore';

const STATE_COOKIE = 'dl_oauth';
const IDENT_COOKIE = 'dl_ident';
const STATE_TTL = 10 * 60;
const IDENT_TTL = 30 * 60;
const MAX_IDENTITIES = 12;

const env = (k) => process.env[k] || '';
const form = (o) => new URLSearchParams(o).toString();
const json = { Accept: 'application/json' };

async function getJson(url, init = {}) {
  const res = await fetch(url, { ...init, headers: { ...json, ...(init.headers || {}) }, signal: AbortSignal.timeout(12_000), cache: 'no-store' });
  const text = await res.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch { /* not JSON: reported below */ }
  if (!res.ok || !data) {
    // The platform's own words say why: a plain status code does not. The answer of
    // a refused call carries no token, so it is safe in the log and on the page.
    const u = new URL(url);
    const why = data?.detail || data?.error_description || data?.error?.message || data?.title || (typeof data?.error === 'string' ? data.error : '') || data?.message || '';
    console.error(`OAuth: ${u.hostname}${u.pathname} answered ${res.status}: ${text.slice(0, 600)}`);
    throw new Error(`${u.hostname} answered ${res.status}${why ? `: ${String(why).slice(0, 140)}` : ''}`);
  }
  return data;
}
const bearer = (token) => ({ Authorization: `Bearer ${token}` });
const postForm = (url, body, headers = {}) => getJson(url, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded', ...headers }, body: form(body) });

/**
 * Each provider: where to send the user, how to trade the code for a token, and
 * `identities(token)`, which returns the pages the signed-in account controls
 * as [{ id, handles: [...], name, avatar }]. `id` is the platform's permanent id.
 */
export const PROVIDERS = {
  github: {
    platform: 'github', label: 'GitHub', envPrefix: 'OAUTH_GITHUB',
    authorize: 'https://github.com/login/oauth/authorize', scope: 'read:org',
    token: (p) => postForm('https://github.com/login/oauth/access_token', p),
    async identities(token) {
      const h = { ...bearer(token), 'X-GitHub-Api-Version': '2022-11-28', 'User-Agent': 'DELTAS' };
      const me = await getJson('https://api.github.com/user', { headers: h });
      const out = [{ id: `u${me.id}`, handles: [me.login], name: me.name || me.login, avatar: me.avatar_url }];
      // Organisations count when the account is one of their owners.
      const orgs = await getJson('https://api.github.com/user/memberships/orgs?state=active&per_page=100', { headers: h }).catch(() => []);
      for (const m of Array.isArray(orgs) ? orgs : []) {
        if (m.role === 'admin' && m.organization?.login) out.push({ id: `o${m.organization.id}`, handles: [m.organization.login], name: m.organization.login, avatar: m.organization.avatar_url });
      }
      return out;
    },
  },
  youtube: {
    platform: 'youtube', label: 'Google', envPrefix: 'OAUTH_GOOGLE',
    authorize: 'https://accounts.google.com/o/oauth2/v2/auth', scope: 'https://www.googleapis.com/auth/youtube.readonly',
    extra: { access_type: 'online', prompt: 'select_account consent' },
    token: (p) => postForm('https://oauth2.googleapis.com/token', p),
    async identities(token) {
      const d = await getJson('https://www.googleapis.com/youtube/v3/channels?part=snippet&mine=true&maxResults=50', { headers: bearer(token) });
      return (d.items || []).map((c) => ({ id: c.id, handles: [c.snippet?.customUrl, c.id].filter(Boolean), name: c.snippet?.title || c.id, avatar: c.snippet?.thumbnails?.default?.url || null }));
    },
  },
  x: {
    platform: 'x', label: 'X', envPrefix: 'OAUTH_X', pkce: true,
    authorize: 'https://x.com/i/oauth2/authorize', scope: 'users.read tweet.read',
    token: (p, c) => postForm('https://api.x.com/2/oauth2/token', { grant_type: p.grant_type, code: p.code, redirect_uri: p.redirect_uri, code_verifier: p.code_verifier, client_id: c.id }, { Authorization: `Basic ${Buffer.from(`${c.id}:${c.secret}`).toString('base64')}` }),
    async identities(token) {
      const d = await getJson('https://api.x.com/2/users/me?user.fields=profile_image_url', { headers: bearer(token) });
      return d.data ? [{ id: d.data.id, handles: [d.data.username], name: d.data.name || d.data.username, avatar: d.data.profile_image_url || null }] : [];
    },
  },
  twitch: {
    platform: 'twitch', label: 'Twitch', envPrefix: 'OAUTH_TWITCH',
    authorize: 'https://id.twitch.tv/oauth2/authorize', scope: '',
    token: (p) => postForm('https://id.twitch.tv/oauth2/token', p),
    async identities(token, c) {
      const d = await getJson('https://api.twitch.tv/helix/users', { headers: { ...bearer(token), 'Client-Id': c.id } });
      return (d.data || []).map((u) => ({ id: u.id, handles: [u.login], name: u.display_name || u.login, avatar: u.profile_image_url || null }));
    },
  },
  facebook: {
    platform: 'facebook', label: 'Facebook', envPrefix: 'OAUTH_FACEBOOK',
    authorize: 'https://www.facebook.com/v21.0/dialog/oauth', scope: 'pages_show_list',
    token: (p) => getJson(`https://graph.facebook.com/v21.0/oauth/access_token?${form({ client_id: p.client_id, client_secret: p.client_secret, redirect_uri: p.redirect_uri, code: p.code })}`),
    async identities(token) {
      // Pages the account manages. A personal profile is not a page and cannot be claimed.
      const d = await getJson(`https://graph.facebook.com/v21.0/me/accounts?${form({ fields: 'id,name,username,picture{url}', limit: '100', access_token: token })}`);
      return (d.data || []).map((p) => ({ id: p.id, handles: [p.username, p.id].filter(Boolean), name: p.name || p.username || p.id, avatar: p.picture?.data?.url || null }));
    },
  },
  instagram: {
    platform: 'instagram', label: 'Instagram', envPrefix: 'OAUTH_INSTAGRAM',
    authorize: 'https://www.instagram.com/oauth/authorize', scope: 'instagram_business_basic',
    token: (p) => postForm('https://api.instagram.com/oauth/access_token', p),
    async identities(token) {
      const d = await getJson(`https://graph.instagram.com/v21.0/me?${form({ fields: 'user_id,username,name,profile_picture_url', access_token: token })}`);
      return d.username ? [{ id: String(d.user_id || d.id), handles: [d.username], name: d.name || d.username, avatar: d.profile_picture_url || null }] : [];
    },
  },
  tiktok: {
    platform: 'tiktok', label: 'TikTok', envPrefix: 'OAUTH_TIKTOK', pkce: true, clientIdParam: 'client_key',
    authorize: 'https://www.tiktok.com/v2/auth/authorize/', scope: 'user.info.basic,user.info.profile',
    token: (p) => postForm('https://open.tiktokapis.com/v2/oauth/token/', { client_key: p.client_id, client_secret: p.client_secret, code: p.code, grant_type: p.grant_type, redirect_uri: p.redirect_uri, code_verifier: p.code_verifier }),
    async identities(token) {
      const d = await getJson('https://open.tiktokapis.com/v2/user/info/?fields=open_id,union_id,username,display_name,avatar_url', { headers: bearer(token) });
      const u = d.data?.user;
      return u?.username ? [{ id: u.union_id || u.open_id, handles: [u.username], name: u.display_name || u.username, avatar: u.avatar_url || null }] : [];
    },
  },
};

export function credentials(provider) {
  const p = PROVIDERS[provider];
  if (!p) return null;
  const id = env(`${p.envPrefix}_CLIENT_ID`);
  const secret = env(`${p.envPrefix}_CLIENT_SECRET`);
  return id && secret ? { id, secret } : null;
}
export const isEnabled = (provider) => Boolean(credentials(provider));
/** platform -> true when its sign-in is configured. Domains prove themselves with DNS, always available. */
export const enabledPlatforms = () => Object.fromEntries([...Object.keys(PROVIDERS).map((k) => [k, isEnabled(k)]), ['domain', true], ['phone', Boolean(env('TWILIO_ACCOUNT_SID') && env('TWILIO_AUTH_TOKEN') && env('TWILIO_VERIFY_SID'))]]);
// Every platform that keeps an identity cookie: the sign-ins, and the phone (proved by a code).
const IDENTITY_PLATFORMS = [...Object.keys(PROVIDERS), 'phone'];
export const redirectUri = (provider) => `${SITE_URL}/api/oauth/${provider}/callback`;

/* ---------------- signed cookies ---------------- */
function secret() {
  const s = process.env.SESSION_SECRET;
  if (!s) throw new Error('SESSION_SECRET is not set');
  return s;
}
const sign = (payload) => crypto.createHmac('sha256', secret()).update(`oauth.${payload}`).digest('base64url');
function seal(data, ttl) {
  const payload = Buffer.from(JSON.stringify({ ...data, exp: Date.now() + ttl * 1000 })).toString('base64url');
  return `${payload}.${sign(payload)}`;
}
function unseal(token) {
  if (!token || !token.includes('.')) return null;
  const [payload, sig] = token.split('.');
  const expected = sign(payload);
  if (!sig || sig.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
  try {
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    return data.exp && data.exp > Date.now() ? data : null;
  } catch {
    return null;
  }
}
const cookieOpts = (maxAge) => ({ httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', path: '/', maxAge });

// One cookie per platform, each kept small: a browser drops a cookie over 4 KB
// and a proxy refuses headers that grow too large. Pictures go first (the
// addresses Meta gives are long), then the identities at the end of the list.
const identCookie = (platform) => `${IDENT_COOKIE}_${platform}`;
const IDENT_MAX = 1800;
function fit(found) {
  let ids = found;
  let sealed = seal({ ids }, IDENT_TTL);
  if (sealed.length > IDENT_MAX) {
    ids = ids.map((i) => ({ ...i, avatar: null }));
    sealed = seal({ ids }, IDENT_TTL);
  }
  while (sealed.length > IDENT_MAX && ids.length > 1) {
    ids = ids.slice(0, -1);
    sealed = seal({ ids }, IDENT_TTL);
  }
  return sealed;
}

/** Only same-site paths: the callback must never forward a visitor to another host. */
export const safeReturn = (p) => (typeof p === 'string' && /^\/(?![/\\])[\w\-./?=&%@:+~]*$/.test(p) && p.length < 300 ? p : '/claim');

/** Step 1: remember state (and the PKCE verifier), return the provider's consent URL. */
export async function begin(provider, returnTo) {
  const p = PROVIDERS[provider];
  const c = credentials(provider);
  if (!p || !c) throw new Error('This sign-in is not available yet');
  const state = crypto.randomBytes(24).toString('base64url');
  const verifier = p.pkce ? crypto.randomBytes(48).toString('base64url') : null;
  const jar = await cookies();
  jar.set(STATE_COOKIE, seal({ provider, state, verifier, returnTo: safeReturn(returnTo) }, STATE_TTL), cookieOpts(STATE_TTL));
  const params = { response_type: 'code', [p.clientIdParam || 'client_id']: c.id, redirect_uri: redirectUri(provider), state, ...(p.scope ? { scope: p.scope } : {}), ...(p.extra || {}) };
  if (verifier) {
    params.code_challenge = crypto.createHash('sha256').update(verifier).digest('base64url');
    params.code_challenge_method = 'S256';
  }
  return `${p.authorize}?${form(params)}`;
}

/** Step 2: check state, trade the code, read the identities, keep only those. Returns { returnTo, count }. */
export async function complete(provider, { code, state }) {
  const p = PROVIDERS[provider];
  const c = credentials(provider);
  if (!p || !c) throw new Error('This sign-in is not available yet');
  const jar = await cookies();
  const saved = unseal(jar.get(STATE_COOKIE)?.value);
  jar.set(STATE_COOKIE, '', cookieOpts(0));
  if (!saved || saved.provider !== provider) throw new Error('The sign-in expired. Start again.');
  const a = Buffer.from(String(state || ''));
  const b = Buffer.from(saved.state);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) throw new Error('The sign-in could not be verified. Start again.');
  if (!code) throw new Error('The platform returned no authorisation code');

  const tok = await p.token({ grant_type: 'authorization_code', code: String(code), redirect_uri: redirectUri(provider), client_id: c.id, client_secret: c.secret, ...(saved.verifier ? { code_verifier: saved.verifier } : {}) }, c);
  // Instagram wraps its answer in a list on some versions of its API.
  const accessToken = tok.access_token || tok.data?.access_token || tok.data?.[0]?.access_token;
  if (!accessToken) throw new Error(tok.error_description || tok.error?.message || tok.error || 'The platform returned no access token');

  const found = (await p.identities(accessToken, c)).slice(0, MAX_IDENTITIES).map((i) => ({
    id: String(i.id),
    handles: [...new Set((i.handles || []).map((h) => normalizeHandle(p.platform, h)).filter(Boolean))],
    name: String(i.name || '').slice(0, 80),
    avatar: typeof i.avatar === 'string' && /^https:\/\//.test(i.avatar) ? i.avatar.slice(0, 400) : null,
  })).filter((i) => i.handles.length);

  // Keep the pictures: the addresses platforms give stop working after a few days.
  await Promise.allSettled(found.flatMap((i) => (i.avatar ? i.handles.map((h) => saveAvatar(p.platform, h, i.avatar)) : [])));
  jar.set(identCookie(p.platform), fit(found), cookieOpts(IDENT_TTL));
  return { returnTo: saved.returnTo, count: found.length };
}

/** { platform: [{ id, handles, name, avatar }] } for what this visitor proved in the last half hour. */
export async function readIdentities() {
  const jar = await cookies();
  const all = {};
  for (const k of IDENTITY_PLATFORMS) {
    const ids = unseal(jar.get(identCookie(k))?.value)?.ids;
    if (ids?.length) all[k] = ids;
  }
  return Object.keys(all).length ? all : null;
}

export async function forgetIdentities() {
  const jar = await cookies();
  for (const k of IDENTITY_PLATFORMS) jar.set(identCookie(k), '', cookieOpts(0));
}

/** Keep an identity proved outside a sign-in (a phone number, by its code), like the others: 30 minutes, signed. */
export async function rememberIdentity(platform, identities) {
  const jar = await cookies();
  jar.set(identCookie(platform), fit(identities), cookieOpts(IDENT_TTL));
}

/** The proved identity that owns (platform, handle), or null. */
export async function identityFor(platform, handle) {
  const h = normalizeHandle(platform, handle);
  if (!h) return null;
  const ids = (await readIdentities())?.[platform] || [];
  return ids.find((i) => i.handles.includes(h)) || null;
}

/* ---------------- domains: a DNS TXT record ---------------- */
export const DNS_PREFIX = '_deltas';
/** The code a domain owner publishes. Bound to the wallet, so a record proves "this domain pays this wallet". */
export function domainCode(domain, wallet) {
  const mac = crypto.createHmac('sha256', secret()).update(`domain.${String(domain).toLowerCase()}.${String(wallet).toLowerCase()}`).digest('hex');
  return `deltas-verify=${mac.slice(0, 40)}`;
}

export async function domainProved(domain, wallet) {
  const want = domainCode(domain, wallet);
  try {
    const records = await dns.promises.resolveTxt(`${DNS_PREFIX}.${domain}`);
    return records.some((chunks) => chunks.join('').trim() === want);
  } catch {
    return false;
  }
}
