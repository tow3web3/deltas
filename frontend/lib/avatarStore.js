// Pictures of pages, kept on disk. Some platforms (Instagram first) give the
// picture of an account to nobody but its owner, and the address they give
// stops working after a few days: when the owner connects, the picture is
// copied here, so the page keeps its own face.
import crypto from 'crypto';
import fs from 'fs/promises';
import os from 'os';
import path from 'path';

const DIR = process.env.AVATAR_DIR || path.join(os.homedir(), '.delta', 'avatars');
const MAX_BYTES = 600_000;
const TYPES = /^image\/(png|jpeg|webp|avif|gif|x-icon|vnd\.microsoft\.icon)$/;
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Safari/537.36';

const file = (platform, handle) => path.join(DIR, crypto.createHash('sha256').update(`${platform}:${handle}`).digest('hex'));

/** The image behind an address, or null when it is not a picture we can serve. */
export async function fetchImage(url) {
  // The key of the picture service opens the platforms it keeps for subscribers (Instagram, Facebook).
  const key = process.env.UNAVATAR_KEY && new URL(url).hostname === 'unavatar.io' ? { 'x-api-key': process.env.UNAVATAR_KEY } : {};
  const res = await fetch(url, { headers: { 'User-Agent': UA, Accept: 'image/avif,image/webp,image/png,image/jpeg,image/*;q=0.8', ...key }, redirect: 'follow', cache: 'no-store', signal: AbortSignal.timeout(8000) });
  // The favicon services answer 404 with a placeholder globe: only a 200 is the real picture.
  if (res.status !== 200) return null;
  const type = (res.headers.get('content-type') || '').split(';')[0].trim();
  if (!TYPES.test(type)) return null;
  const body = Buffer.from(await res.arrayBuffer());
  if (body.length < 100 || body.length > MAX_BYTES) return null;
  return { body, type };
}

/** Copy the picture of a page to disk. Never throws: a picture is not worth failing a sign-in. */
export async function saveAvatar(platform, handle, url) {
  try {
    const image = await fetchImage(url);
    if (!image) return false;
    await fs.mkdir(DIR, { recursive: true });
    const f = file(platform, handle);
    await fs.writeFile(`${f}.bin`, image.body);
    await fs.writeFile(`${f}.type`, image.type);
    return true;
  } catch {
    return false;
  }
}

export async function readAvatar(platform, handle) {
  try {
    const f = file(platform, handle);
    const [body, type] = await Promise.all([fs.readFile(`${f}.bin`), fs.readFile(`${f}.type`, 'utf8')]);
    return TYPES.test(type) && body.length >= 100 ? { body, type } : null;
  } catch {
    return null;
  }
}
