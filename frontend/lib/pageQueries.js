// Pages in the database: creating one (with its vault), reading what it
// received, claiming it. The encrypted vault key never leaves this file: every
// reader goes through PUBLIC, which does not select it.
import { getSql } from './db';
import { encryptPrivateKey, generateDevWallet } from './crypto';
import crypto from 'crypto';
import { PLATFORMS, normalizeHandle, maskPhone } from './pages';

const lc = (a) => (a ? String(a).toLowerCase() : null);
const PUBLIC = 'id, platform, handle, slug, external_id, display_name, avatar_url, vault_address, claimed_wallet, claimed_at, sweep_pending, last_swept_at, created_at';

/** The public address of a phone page: a keyed hash of the number. Nobody can walk back from it to the number. */
export function phoneSlug(e164) {
  const key = process.env.SESSION_SECRET;
  if (!key) throw new Error('SESSION_SECRET is not set');
  return crypto.createHmac('sha256', key).update(`phone.${e164}`).digest('base64url').replace(/[-_]/g, '').slice(0, 12).toLowerCase();
}

// A phone number never leaves this file in full unless the caller says so: every
// reader gets it masked. Only the claim, which speaks to the owner, asks for it raw.
const scrub = (row) => (row && row.platform === 'phone' && row.handle && !row.handle.includes('•') ? { ...row, handle: maskPhone(row.handle), number: undefined } : row);

async function query(text, values = []) {
  const { getPool } = await import('./dbPool');
  const { rows } = await getPool().query(text, values);
  return rows;
}

export async function getPage(platform, handle, { raw = false } = {}) {
  const h = normalizeHandle(platform, handle);
  const out = (row) => (raw ? row : scrub(row));
  // A phone page answers to its number (from a claim) and to its slug (from its address).
  if (!h && platform === 'phone' && /^[a-z0-9]{12}$/.test(String(handle || ''))) {
    const rows = await query(`SELECT ${PUBLIC} FROM social_pages WHERE platform = 'phone' AND slug = $1`, [String(handle)]);
    return out(rows[0] || null);
  }
  if (!h) return null;
  const rows = await query(`SELECT ${PUBLIC} FROM social_pages WHERE platform = $1 AND handle = $2`, [platform, h]);
  return out(rows[0] || null);
}

export async function getPageById(id, { raw = false } = {}) {
  const rows = await query(`SELECT ${PUBLIC} FROM social_pages WHERE id = $1`, [id]);
  return raw ? rows[0] || null : scrub(rows[0] || null);
}

/**
 * The page for (platform, handle), created with a fresh vault when it does not
 * exist yet. Two creators adding the same page at the same moment get the same
 * row: the second insert hits the unique key and reads the first one back.
 */
export async function ensurePage(platform, handle, userId = null) {
  if (!PLATFORMS[platform]) throw new Error(`Unknown platform "${platform}"`);
  const h = normalizeHandle(platform, handle);
  if (!h) throw new Error(`That is not a valid ${PLATFORMS[platform].label} page`);
  const existing = await getPage(platform, h, { raw: true });
  if (existing) return existing;
  const vault = generateDevWallet();
  const rows = await query(
    `INSERT INTO social_pages (platform, handle, slug, vault_address, vault_encrypted, created_by)
     VALUES ($1, $2, $3, $4, $5, $6) ON CONFLICT (platform, handle) DO NOTHING RETURNING ${PUBLIC}`,
    [platform, h, platform === 'phone' ? phoneSlug(h) : null, lc(vault.address), JSON.stringify(encryptPrivateKey(vault.privateKey)), userId]
  );
  return rows[0] || (await getPage(platform, h, { raw: true }));
}

/** Totals per asset, split between what is waiting in the vault's ledger and what went straight to the owner. */
export async function pageTotals(pageId) {
  const sql = getSql();
  const [sum] = await sql`
    SELECT COALESCE(SUM(value_wei), 0)::text AS value_wei,
           COALESCE(SUM(value_wei) FILTER (WHERE direct), 0)::text AS direct_wei,
           COUNT(*)::int AS payments,
           COUNT(DISTINCT source_token)::int AS coins,
           MIN(created_at) AS first_at, MAX(created_at) AS last_at
    FROM page_payouts WHERE page_id = ${pageId}`;
  const assets = await sql`
    SELECT token, MAX(symbol) AS symbol, MAX(decimals)::int AS decimals, SUM(amount)::text AS amount, COALESCE(SUM(value_wei), 0)::text AS value_wei
    FROM page_payouts WHERE page_id = ${pageId} GROUP BY token ORDER BY SUM(value_wei) DESC`;
  return { ...sum, assets };
}

export async function pagePayouts(pageId, limit = 25) {
  const sql = getSql();
  return await sql`
    SELECT id, source_token, token, symbol, decimals, amount::text AS amount, value_wei::text AS value_wei, to_address, direct, tx_hash, created_at
    FROM page_payouts WHERE page_id = ${pageId} ORDER BY created_at DESC LIMIT ${limit}`;
}

export async function pageSweeps(pageId, limit = 25) {
  const sql = getSql();
  return await sql`
    SELECT token, symbol, decimals, amount::text AS amount, wallet, tx_hash, created_at
    FROM page_sweeps WHERE page_id = ${pageId} ORDER BY created_at DESC LIMIT ${limit}`;
}

/** Coins that route a share to this page right now. */
export async function pageSources(pageId) {
  const sql = getSql();
  return await sql`
    SELECT bc.source_token_address AS token, SUM(l.share_bps)::int AS share_bps, bc.is_active, bc.schedule_kind, bc.interval_minutes
    FROM policy_legs l JOIN bot_configs bc ON bc.id = l.config_id
    WHERE l.page_id = ${pageId} AND l.kind = 'page' AND bc.legs_enabled = true
    GROUP BY bc.id ORDER BY bc.is_active DESC, SUM(l.share_bps) DESC LIMIT 50`;
}

/** The directory: pages ranked by what they received. Pages nobody routes to and nobody paid stay out. */
export async function topPages({ limit = 24, platform = null, q = null } = {}) {
  const like = q ? `%${String(q).toLowerCase().replace(/[%_\\]/g, '')}%` : null;
  return (await query(
    `SELECT p.id, p.platform, p.handle, p.slug, p.display_name, p.avatar_url, p.vault_address, p.claimed_wallet IS NOT NULL AS claimed, p.created_at,
            COALESCE(t.value_wei, 0)::text AS value_wei, COALESCE(t.payments, 0)::int AS payments, t.last_at,
            COALESCE(s.coins, 0)::int AS coins
     FROM social_pages p
     LEFT JOIN (SELECT page_id, SUM(value_wei) AS value_wei, COUNT(*) AS payments, MAX(created_at) AS last_at FROM page_payouts GROUP BY page_id) t ON t.page_id = p.id
     LEFT JOIN (SELECT l.page_id, COUNT(DISTINCT l.config_id) AS coins FROM policy_legs l JOIN bot_configs bc ON bc.id = l.config_id AND bc.legs_enabled = true WHERE l.kind = 'page' GROUP BY l.page_id) s ON s.page_id = p.id
     WHERE (COALESCE(t.payments, 0) > 0 OR COALESCE(s.coins, 0) > 0)
       AND ($1::text IS NULL OR p.platform = $1)
       AND ($2::text IS NULL OR (p.platform <> 'phone' AND p.handle LIKE $2) OR LOWER(COALESCE(p.display_name, '')) LIKE $2)
     ORDER BY COALESCE(t.value_wei, 0) DESC, COALESCE(s.coins, 0) DESC, p.id DESC
     LIMIT $3`,
    [platform && PLATFORMS[platform] ? platform : null, like, Math.min(100, Math.max(1, Number(limit) || 24))]
  )).map(scrub);
}

export async function recentPagePayouts(limit = 20) {
  const sql = getSql();
  return (await sql`
    SELECT pp.id, pp.source_token, pp.token, pp.symbol, pp.decimals, pp.amount::text AS amount, pp.value_wei::text AS value_wei, pp.direct, pp.tx_hash, pp.created_at,
           p.platform, p.handle, p.slug, p.display_name, p.avatar_url
    FROM page_payouts pp JOIN social_pages p ON p.id = pp.page_id
    ORDER BY pp.created_at DESC LIMIT ${limit}`).map(scrub);
}

export async function pagesStats() {
  const sql = getSql();
  const [r] = await sql`
    SELECT (SELECT COUNT(*) FROM social_pages p WHERE EXISTS (SELECT 1 FROM page_payouts pp WHERE pp.page_id = p.id) OR EXISTS (SELECT 1 FROM policy_legs l WHERE l.page_id = p.id))::int AS pages,
           (SELECT COUNT(*) FROM social_pages WHERE claimed_wallet IS NOT NULL)::int AS claimed,
           (SELECT COALESCE(SUM(value_wei), 0) FROM page_payouts)::text AS value_wei,
           (SELECT COUNT(*) FROM page_payouts)::int AS payments`;
  return r;
}

/**
 * Bind a wallet to a page after its owner proved it. `externalId` is the
 * platform's permanent id for the account: once a page carries one, only the
 * same account can claim it again, so a handle that changes hands cannot be
 * used to redirect fees meant for its previous owner.
 */
export async function claimPage({ pageId, wallet, proof, externalId = null, externalHandle = null, displayName = null, avatarUrl = null }) {
  const { getPool } = await import('./dbPool');
  const client = await getPool().connect();
  try {
    await client.query('BEGIN');
    const { rows } = await client.query('SELECT id, external_id, claimed_wallet FROM social_pages WHERE id = $1 FOR UPDATE', [pageId]);
    const page = rows[0];
    if (!page) throw new Error('Page not found');
    if (page.external_id && externalId && String(page.external_id) !== String(externalId)) {
      throw new Error('This page was claimed by a different account with the same handle. Contact us to resolve it.');
    }
    if (page.external_id && !externalId) throw new Error('This page must be claimed by signing in with the account that claimed it first');
    await client.query(
      `UPDATE social_pages SET claimed_wallet = $2, claimed_at = NOW(), sweep_pending = true, sweep_error = NULL, sweep_tried_at = NULL,
         external_id = COALESCE(external_id, $3), display_name = COALESCE($4, display_name), avatar_url = COALESCE($5, avatar_url)
       WHERE id = $1`,
      [pageId, lc(wallet), externalId ? String(externalId).slice(0, 64) : null, displayName ? String(displayName).slice(0, 120) : null, avatarUrl ? String(avatarUrl).slice(0, 500) : null]
    );
    await client.query('INSERT INTO page_claims (page_id, wallet, proof, external_id, external_handle) VALUES ($1, $2, $3, $4, $5)',
      [pageId, lc(wallet), proof, externalId ? String(externalId).slice(0, 64) : null, externalHandle ? String(externalHandle).slice(0, 255) : null]);
    await client.query('COMMIT');
    return { previousWallet: page.claimed_wallet || null };
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}
