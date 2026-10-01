// Shared bits for the server-rendered cards (receipts, wallet statements, token
// OG images). Rendered with next/og (Satori): flex layouts only, absolute image
// URLs, fonts passed in as buffers.
import fs from 'fs';
import path from 'path';
import { STOCK_BY_ADDRESS, isNative } from './stocks';
import { BRAND, SITE_URL } from './brand';

export const CARD = { width: 1200, height: 630 };
// Dark only, like the site: ink is the text colour, ground and paper are the
// fills, coal is the text on a solid accent, disc is the white disc behind a logo.
export const COLORS = { green: '#2FA8FF', greenDeep: '#4DB8FF', gold: '#F6C343', ink: '#F4F5F4', mut: '#8A9099', line: '#24272B', paper: '#101112', ground: '#0A0A0A', tint: '#0D1A2E', coal: '#0A0A0A', disc: '#FFFFFF' };

let fontCache = null;
/** Manrope 800 as a TTF buffer (Satori needs TTF/OTF/WOFF, never woff2). Falls back to the default font. */
export async function loadFonts() {
  if (fontCache) return fontCache;
  try {
    const css = await fetch('https://fonts.googleapis.com/css2?family=Manrope:wght@800&display=swap', {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; WOW64; rv:27.0) Gecko/20100101 Firefox/27.0' },
      signal: AbortSignal.timeout(6000),
    }).then((r) => r.text());
    const url = css.match(/src: url\(([^)]+)\) format\('(?:truetype|woff)'\)/)?.[1];
    if (!url) throw new Error('no ttf url');
    const data = await fetch(url, { signal: AbortSignal.timeout(6000) }).then((r) => r.arrayBuffer());
    fontCache = [{ name: 'Manrope', data, weight: 800, style: 'normal' }];
  } catch {
    fontCache = [];
  }
  return fontCache;
}

export function assetLogo(address, siteUrl) {
  if (isNative(address)) return `${siteUrl}/eth.svg`;
  const s = STOCK_BY_ADDRESS[String(address || '').toLowerCase()];
  if (s) return s.logo; // a path under public/, read from disk by inlineLogo
  return null;
}

/** Candidate logo URLs for an asset, best first: the screener image, then the stock or ETH artwork. */
export function logoCandidates(address, meta, siteUrl) {
  return [meta?.image || null, assetLogo(address, siteUrl)].filter(Boolean);
}

// Satori draws nothing for an <img> it cannot decode, and the CDNs answer with
// AVIF or WebP (or a redirect) when asked by a plain fetch. So every logo is
// fetched here, converted to PNG with sharp and inlined as a data URL.
const inlineCache = new Map();
const INLINE_TTL = 60 * 60 * 1000;
export async function inlineLogo(candidates, size = 256) {
  for (const url of candidates || []) {
    if (!url) continue;
    if (url.startsWith('data:')) return url;
    const hit = inlineCache.get(url);
    if (hit && Date.now() - hit.ts < INLINE_TTL) { if (hit.data) return hit.data; continue; }
    let data = null;
    try {
      let buf;
      let type = '';
      if (url.startsWith('/')) {
        buf = fs.readFileSync(path.join(process.cwd(), 'public', url));
        type = url.endsWith('.svg') ? 'image/svg+xml' : 'image/png';
      } else {
        const res = await fetch(url, { headers: { Accept: 'image/png,image/jpeg,image/svg+xml,image/*;q=0.8', 'User-Agent': `Mozilla/5.0 (${BRAND} card renderer)` }, redirect: 'follow', signal: AbortSignal.timeout(6000) });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        type = res.headers.get('content-type') || '';
        buf = Buffer.from(await res.arrayBuffer());
      }
      if (type.includes('svg')) {
        data = 'data:image/svg+xml;base64,' + buf.toString('base64');
      } else {
        const sharp = (await import('sharp')).default;
        const png = await sharp(buf).resize(size, size, { fit: 'cover' }).png().toBuffer();
        data = 'data:image/png;base64,' + png.toString('base64');
      }
    } catch { data = null; }
    inlineCache.set(url, { data, ts: Date.now() });
    if (data) return data;
  }
  return null;
}

export const fmtUnits = (raw, decimals = 18, digits = 4) => {
  const n = Number(raw || 0) / 10 ** Number(decimals ?? 18);
  if (n >= 1000) return n.toLocaleString('en-US', { maximumFractionDigits: 0 });
  return n.toFixed(n >= 1 ? 2 : digits);
};

export function siteUrl() {
  return SITE_URL;
}

/** Monogram fallback when a logo cannot be fetched (Satori renders nothing for a broken img). */
export function Monogram({ text, color = COLORS.green, size = 96 }) {
  return (
    <div style={{ width: size, height: size, borderRadius: size, background: color, color: COLORS.coal, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: size * 0.3, fontWeight: 800 }}>
      {String(text || '?').slice(0, 4)}
    </div>
  );
}

/** The mark as a data URL: Satori cannot always fetch the site from inside the server. */
let logoData = null;
export function logoUrl(site) {
  if (logoData) return logoData;
  for (const p of [path.join(process.cwd(), 'public', 'brand', 'delta-256.png'), path.join(process.cwd(), 'frontend', 'public', 'brand', 'delta-256.png')]) {
    try { logoData = 'data:image/png;base64,' + fs.readFileSync(p).toString('base64'); return logoData; } catch { /* next */ }
  }
  return `${site}/brand/delta-256.png`;
}

export function Wordmark({ siteUrl: site, size = 28, color = COLORS.ink, chain = null }) {
  const label = chain === 'solana' ? 'SOLANA' : chain === 'robinhood' ? 'ROBINHOOD CHAIN' : null;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <img src={logoUrl(site)} width={size + 8} height={size + 8} alt="" />
      <span style={{ display: 'flex', fontSize: size, fontWeight: 800, letterSpacing: -0.5, color }}>{BRAND}</span>
      {label && <span style={{ fontSize: 13, fontWeight: 800, color: COLORS.greenDeep, border: `1px solid ${COLORS.green}55`, background: COLORS.tint, borderRadius: 999, padding: '3px 10px', letterSpacing: 1.5 }}>{label}</span>}
    </div>
  );
}
