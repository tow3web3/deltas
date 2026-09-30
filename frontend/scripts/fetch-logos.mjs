// Downloads the logo of every Stock Token into public/logos/stocks/<TICKER>.png,
// so the site never depends on a third party to show one:
//   node scripts/fetch-logos.mjs          only the missing ones
//   node scripts/fetch-logos.mjs --all    refresh everything
// Each source is tried in turn; a file is kept only when it decodes as an image.
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { STOCK_LIST } from '../lib/stocks-data.js';

const OUT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'public', 'logos', 'stocks');
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Safari/537.36';
const SOURCES = [
  (t) => `https://financialmodelingprep.com/image-stock/${t}.png`,
  (t) => `https://raw.githubusercontent.com/nvstly/icons/main/ticker_icons/${t}.png`,
  (t) => `https://raw.githubusercontent.com/davidepalazzo/ticker-logos/main/ticker_icons/${t}.png`,
];
const all = process.argv.includes('--all');

async function grab(ticker) {
  for (const src of SOURCES) {
    try {
      const res = await fetch(src(ticker), { headers: { 'User-Agent': UA, Accept: 'image/*' }, signal: AbortSignal.timeout(15000) });
      if (!res.ok || !/^image\//.test(res.headers.get('content-type') || '')) continue;
      const buf = Buffer.from(await res.arrayBuffer());
      const meta = await sharp(buf).metadata();
      if (!meta.width || meta.width < 32) continue;
      // Same box for all of them: 128px, on the background the artwork was drawn for.
      // A logo made of white strokes on transparency disappears on a white disc, so it gets a dark one.
      // Artwork cut out on transparency gets a margin, or the round disc would clip its corners.
      // Artwork that fills its square (a photo, a coloured tile) keeps the whole box.
      const clear = { r: 0, g: 0, b: 0, alpha: 0 };
      const probe = await sharp(buf).resize(128, 128, { fit: 'contain', background: clear }).ensureAlpha().raw().toBuffer();
      const cutOut = [0, 127, 127 * 128, 128 * 128 - 1].every((px) => probe[px * 4 + 3] < 40);
      const box = cutOut
        ? sharp(buf).resize(100, 100, { fit: 'contain', background: clear }).extend({ top: 14, bottom: 14, left: 14, right: 14, background: clear }).ensureAlpha()
        : sharp(buf).resize(128, 128, { fit: 'contain', background: clear }).ensureAlpha();
      const { data } = await box.clone().raw().toBuffer({ resolveWithObject: true });
      let inked = 0;
      let light = 0;
      for (let p = 0; p < data.length; p += 4) {
        if (data[p + 3] <= 40) continue;
        inked++;
        if (0.299 * data[p] + 0.587 * data[p + 1] + 0.114 * data[p + 2] > 215) light++;
      }
      const whiteArtwork = inked > 0 && light / inked > 0.92 && inked / (128 * 128) < 0.9;
      return await box.flatten({ background: whiteArtwork ? '#111418' : '#ffffff' }).png({ compressionLevel: 9 }).toBuffer();
    } catch { /* next source */ }
  }
  return null;
}

await fs.mkdir(OUT, { recursive: true });
const tickers = STOCK_LIST.map(([t]) => t);
const missing = [];
let done = 0;
let i = 0;
await Promise.all(Array.from({ length: 6 }, async () => {
  while (i < tickers.length) {
    const t = tickers[i++];
    const file = path.join(OUT, `${t}.png`);
    if (!all && await fs.stat(file).then(() => true, () => false)) continue;
    const png = await grab(t);
    if (png) { await fs.writeFile(file, png); done++; } else missing.push(t);
  }
}));
console.log(`${done} logo(s) written to public/logos/stocks`);
if (missing.length) console.log(`No logo found for ${missing.length}: ${missing.join(', ')}`);
process.exit(missing.length ? 1 : 0);
