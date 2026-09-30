// The picture of a page: the avatar of the channel or the account, the favicon
// of the site. Always answers with an image, so nothing that shows a page is
// ever left blank: when the page's own picture cannot be found, it is the
// platform's logo. The picture is fetched here, once, and cached, so visitors
// are not sent to third parties and a slow source never blocks a list.
import fs from 'node:fs/promises';
import path from 'node:path';
import { PLATFORMS, normalizeHandle } from '../../../../../../lib/pages';
import { getPage } from '../../../../../../lib/pageQueries';
import { fetchImage, readAvatar } from '../../../../../../lib/avatarStore';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const TTL = 24 * 3600 * 1000;
const MISS_TTL = 30 * 60 * 1000;
const cache = new Map();

/** Where the picture of a page can be found, best first. The handle is already validated. */
function sources(platform, handle, stored) {
  const h = encodeURIComponent(handle);
  const list = [stored];
  if (platform === 'github') list.push(`https://github.com/${h}.png?size=160`);
  // Google first: it serves the large icon of a site when there is one (128 px against 32 to 48).
  if (platform === 'domain') list.push(`https://www.google.com/s2/favicons?domain=${h}&sz=128`, `https://icons.duckduckgo.com/ip3/${h}.ico`);
  if (platform !== 'domain') list.push(`https://unavatar.io/${platform}/${encodeURIComponent(handle.replace(/^@/, ''))}?fallback=false`);
  return list.filter((u) => typeof u === 'string' && /^https:\/\//.test(u));
}

/** The picture of a Facebook Page, asked to Meta with the keys of the app. Empty without them. */
async function facebookPicture(handle) {
  const id = process.env.OAUTH_FACEBOOK_CLIENT_ID;
  const secret = process.env.OAUTH_FACEBOOK_CLIENT_SECRET;
  if (!id || !secret) return [];
  try {
    const res = await fetch(`https://graph.facebook.com/v21.0/${encodeURIComponent(handle)}/picture?type=large&redirect=false&access_token=${encodeURIComponent(`${id}|${secret}`)}`, { cache: 'no-store', signal: AbortSignal.timeout(8000) });
    const d = await res.json();
    return res.ok && d?.data?.url && !d.data.is_silhouette ? [d.data.url] : [];
  } catch {
    return [];
  }
}

let platformLogos = null;
async function platformLogo(platform) {
  platformLogos ??= new Map();
  if (!platformLogos.has(platform)) {
    const file = path.join(process.cwd(), 'public', 'logos', 'platforms', `${platform}.svg`);
    platformLogos.set(platform, await fs.readFile(file));
  }
  return { body: platformLogos.get(platform), type: 'image/svg+xml', fallback: true };
}

export async function GET(request, { params }) {
  const { platform, handle: raw } = await params;
  if (!PLATFORMS[platform]) return new Response('Unknown platform', { status: 400 });
  // A number has no picture anywhere, and must not be looked up by anyone: the logo, always.
  if (platform === 'phone') { const logo = await platformLogo('phone'); return new Response(logo.body, { headers: { 'Content-Type': logo.type, 'Cache-Control': 'public, max-age=86400', 'X-Content-Type-Options': 'nosniff' } }); }
  const handle = normalizeHandle(platform, decodeURIComponent(raw));
  if (!handle) return new Response('Invalid handle', { status: 400 });

  const key = `${platform}:${handle}`;
  const hit = cache.get(key);
  let image = hit && Date.now() - hit.ts < (hit.image.fallback ? MISS_TTL : TTL) ? hit.image : null;
  // The copy made when the owner connected comes first: it is the one that lasts.
  if (!image || image.fallback) image = (await readAvatar(platform, handle)) || image;
  if (!image) {
    const stored = await getPage(platform, handle).then((p) => p?.avatar_url || null).catch(() => null);
    const list = sources(platform, handle, stored);
    if (platform === 'facebook') list.splice(stored ? 1 : 0, 0, ...(await facebookPicture(handle)));
    for (const url of list) {
      try { image = await fetchImage(url); } catch { image = null; }
      if (image) break;
    }
    image ??= await platformLogo(platform);
    if (cache.size > 1500) cache.clear();
    cache.set(key, { image, ts: Date.now() });
  }
  return new Response(image.body, {
    headers: {
      'Content-Type': image.type,
      'Cache-Control': `public, max-age=${image.fallback ? 1800 : 86400}`,
      // The picture comes from somewhere else: it is an image and nothing more.
      'Content-Security-Policy': "default-src 'none'; style-src 'unsafe-inline'; sandbox",
      'X-Content-Type-Options': 'nosniff',
    },
  });
}
