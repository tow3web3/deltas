// Fee routing legs. A config routes each cycle's fees to N destinations:
//   holders   the dividend, weighted by balance and loyalty
//   wallet    any address (the creator, a partner, a marketing wallet)
//   burn      buy back the project token and burn it
//   treasury  a wallet you control, recorded in the treasury ledger (book value)
//   page      a page on the internet (a YouTube channel, a GitHub account, a
//             domain...): paid into the page's vault until its owner claims,
//             then straight to the wallet they bound
// Every leg carries a share (bps, all legs sum to 10000) and an optional asset:
//   asset = null       pay in kind, whatever landed in the dev wallet
//   asset = 0x0…0      convert to ETH first
//   asset = <token>    buy that token first (a stock, or any ERC-20 by address)
// Configs made before routing existed derive their legs from the legacy split
// columns, so the executor only ever deals with legs.
import { isNative, isAddress, short, formatEth, formatUnits, explorerTx, NATIVE_ETH } from '../chain/config.js';
import { parsePhoneNumberFromString } from 'libphonenumber-js/min';
import { swapEthForToken, swapTokenForEth } from './swap.js';
import { burnTokens } from './airdrop.js';
import { describeReward } from './rewards.js';
import { stockOracle, tokenOracle } from './oracle.js';
import { effectiveSplit, sendAsset, DEFAULT_TREASURY_ASSET } from './treasury.js';
import * as db from '../db/queries.js';

export const LEG_KINDS = ['holders', 'wallet', 'burn', 'treasury', 'page'];

/** Legs for a config: the routing table when set, else the legacy 4-way split. */
export async function legsFor(config) {
  if (config.legs_enabled) {
    const rows = await db.getPolicyLegs(config.id);
    if (rows.length) return rows.map((r) => normalizeLeg(r, config.chain || 'robinhood'));
  }
  const s = effectiveSplit(config);
  const legs = [];
  if (s.holders > 0) legs.push({ id: 'holders', kind: 'holders', shareBps: s.holders, address: null, asset: null, label: 'Holders' });
  if (s.creator > 0 && isAddress(config.creator_address)) legs.push({ id: 'creator', kind: 'wallet', shareBps: s.creator, address: config.creator_address, asset: null, label: 'You' });
  if (s.burn > 0) legs.push({ id: 'burn', kind: 'burn', shareBps: s.burn, address: null, asset: null, label: 'Buyback & burn' });
  if (s.treasury > 0 && isAddress(config.treasury_address)) legs.push({ id: 'treasury', kind: 'treasury', shareBps: s.treasury, address: config.treasury_address, asset: null, label: 'Treasury', treasuryAsset: config.treasury_asset || DEFAULT_TREASURY_ASSET });
  return legs;
}

function normalizeLeg(r, chain = 'robinhood') {
  const leg = { id: r.id, kind: r.kind, shareBps: Number(r.share_bps), address: r.address || null, asset: r.asset || null, label: r.label || defaultLabel(r.kind), treasuryAsset: r.kind === 'treasury' ? (r.asset || DEFAULT_TREASURY_ASSET) : null };
  if (r.kind !== 'page') return leg;
  // The destination of a page leg is never stored on the leg: it is read from the
  // page at every cycle, so a claim redirects the very next payment.
  // A page has one vault per chain; the coin's chain decides which one is paid.
  const sol = chain === 'solana';
  const wallet = sol ? r.page_sol_wallet : r.page_wallet;
  const vault = sol ? r.page_sol_vault : r.page_vault;
  const claimed = sol ? Boolean(wallet) : isAddress(wallet);
  return {
    ...leg,
    address: claimed ? wallet : vault || null,
    label: r.label || (r.page_handle ? pageLabel(r.page_platform, r.page_handle) : 'Page'),
    page: r.page_id && r.page_handle ? { id: r.page_id, platform: r.page_platform, handle: r.page_handle, slug: r.page_slug || null, claimed } : null,
  };
}
const defaultLabel = (kind) => ({ holders: 'Holders', wallet: 'Wallet', burn: 'Buyback & burn', treasury: 'Treasury', page: 'Page' }[kind] || kind);
const PLATFORM_LABEL = { youtube: 'YouTube', github: 'GitHub', x: 'X', instagram: 'Instagram', facebook: 'Facebook', tiktok: 'TikTok', twitch: 'Twitch', domain: '', phone: 'Phone' };
/** A number as anyone may read it: country code and last two digits. The rest is hidden. */
export function maskPhone(e164) {
  const n = parsePhoneNumberFromString(String(e164 || ''));
  if (!n) return '+•• •• •• ••';
  const national = n.formatNational().replace(/^0/, '').replace(/[()]/g, '').trim();
  const digits = national.replace(/\D/g, '');
  let seen = 0;
  return `+${n.countryCallingCode} ${national.replace(/\d/g, (d) => (++seen > digits.length - 2 ? d : '•'))}`;
}
/** Telegram (legacy Markdown) reads _ * ` [ as formatting: handles are full of underscores. */
export const mdEscape = (s) => String(s ?? '').replace(/([_*`\[])/g, '\\$1');
/** "GitHub your-project", "YouTube @yourchannel", "example.com". */
export const pageLabel = (platform, handle) => [PLATFORM_LABEL[platform] ?? platform, platform === 'phone' ? maskPhone(handle) : handle].filter(Boolean).join(' ');
// A phone page is addressed by its slug, never by the number.
export const pagePath = (page) => (page.platform === 'phone' ? `/p/phone/${encodeURIComponent(page.slug || 'unknown')}` : `/p/${page.platform}/${encodeURIComponent(page.handle)}`);

/** Human summary of a routing table: "70% holders · 20% 0x8a2f (GLD) · 10% treasury". */
export async function legsLabel(legs) {
  const parts = [];
  for (const l of legs) {
    let asset = '';
    if (l.asset) { try { asset = ` in ${(await describeReward(l.asset)).symbol}`; } catch { asset = ''; } }
    const who = l.kind === 'wallet' ? (l.label && l.label !== 'Wallet' ? l.label : short(l.address))
      : l.kind === 'page' ? (l.page ? pageLabel(l.page.platform, l.page.handle) : l.label)
        : l.label.toLowerCase();
    parts.push(`${l.shareBps / 100}% ${who}${asset}`);
  }
  return parts.join(' · ');
}

/** Amounts per leg for one asset, remainder to the holders leg (else the first leg). */
export function splitAmounts(total, legs) {
  const amounts = legs.map((l) => (total * BigInt(l.shareBps)) / 10000n);
  const used = amounts.reduce((a, b) => a + b, 0n);
  const sink = Math.max(0, legs.findIndex((l) => l.kind === 'holders'));
  if (amounts.length) amounts[sink] += total - used;
  return amounts;
}

/**
 * Convert an amount of one asset into another token via ETH. Returns the new
 * asset description with the amount received. Throws when no fair route exists.
 */
export async function convertAsset({ config, privateKey, asset, amount, toToken }) {
  let wei = amount;
  let sellTx = null;
  if (!asset.isNative) {
    const sold = await swapTokenForEth({ privateKey, token: asset.address, amountRaw: amount, slippageBps: 300 });
    if (!sold) throw new Error(`no ETH route for ${asset.symbol}`);
    wei = sold.ethOut;
    sellTx = sold.hash;
  }
  if (isNative(toToken)) return { address: NATIVE_ETH, symbol: 'ETH', decimals: 18, amount: wei, isNative: true, swapTx: sellTx };
  const target = await describeReward(toToken);
  const oracle = target.isStock ? await stockOracle(target.ticker) : await tokenOracle(target.address);
  console.log(`   Converting ${asset.isNative ? formatEth(wei, 4) + ' ETH' : formatUnits(amount, asset.decimals, 4) + ' ' + asset.symbol} into ${target.symbol}`);
  const swap = await swapEthForToken({ privateKey, token: target.address, decimals: target.decimals, amountWei: wei, slippageBps: config.slippage_bps || 150, oracle });
  return { address: target.address, symbol: target.symbol, decimals: target.decimals, amount: swap.outputAmount, isNative: false, swapTx: swap.hash };
}

/**
 * Run one non-holders leg for one asset. Never throws: returns { failed } so the
 * executor can fold the share back into the dividend.
 */
export async function runLeg({ config, privateKey, asset, amount, leg, cycleKey = null }) {
  if (amount <= 0n) return null;
  const base = { legId: leg.id, kind: leg.kind, label: leg.label, address: leg.address, input: { token: asset.address, symbol: asset.symbol, amount: amount.toString() } };
  if (leg.page) base.page = leg.page;
  try {
    let out = { address: asset.address, symbol: asset.symbol, decimals: asset.decimals, amount, isNative: asset.isNative, swapTx: null };
    let note = null;
    const target = leg.kind === 'burn' ? config.source_token_address : leg.kind === 'treasury' && asset.isNative ? leg.treasuryAsset : leg.asset;
    if (target && target.toLowerCase() !== asset.address.toLowerCase()) {
      try {
        out = await convertAsset({ config, privateKey, asset, amount, toToken: target });
      } catch (e) {
        if (leg.kind === 'burn') throw e;
        note = `paid in kind, conversion skipped: ${e.shortMessage || e.message}`;
        console.log(`   ${leg.label}: ${note}`);
      }
    }
    let hash;
    if (leg.kind === 'burn') {
      hash = await burnTokens(privateKey, config.source_token_address, out.amount);
      console.log(`   Burn: ${formatUnits(out.amount, 18, 2)} ${short(config.source_token_address)} burned (${explorerTx(hash)})`);
    } else {
      if (leg.kind === 'page' && !leg.page) throw new Error('the page no longer exists');
      if (!isAddress(leg.address)) throw new Error('no destination address');
      hash = await sendAsset({ privateKey, asset: out, amount: out.amount, to: leg.address, label: `${leg.kind} leg` });
      console.log(`   ${leg.label}: ${formatUnits(out.amount, out.decimals, 4)} ${out.symbol} to ${leg.kind === 'page' ? (leg.page.claimed ? 'the owner ' : 'the vault ') : ''}${short(leg.address)} (${explorerTx(hash)})`);
      if (leg.kind === 'page') {
        // The transfer is done: a ledger write that fails must not turn it into a failed leg.
        await db.insertPagePayout({
          pageId: leg.page.id, configId: config.id, sourceToken: config.source_token_address, token: out.address, symbol: out.symbol, decimals: out.decimals,
          amount: out.amount, valueWei: asset.valueWei && asset.amount ? (asset.valueWei * amount) / asset.amount : 0n,
          to: leg.address, direct: leg.page.claimed, txHash: hash, cycleKey,
        }).catch((e) => console.error(`   Page ledger write failed for ${leg.label}: ${e.message}`));
      }
      if (leg.kind === 'treasury') {
        await db.insertTreasuryLedger({ configId: config.id, token: out.address, amount: out.amount, ethSpent: asset.isNative ? amount : (asset.valueWei && asset.amount ? (asset.valueWei * amount) / asset.amount : 0n), txHash: hash });
      }
    }
    return { ...base, output: { token: out.address, symbol: out.symbol, decimals: out.decimals, amount: out.amount.toString() }, tx: hash, swapTx: out.swapTx, note, out };
  } catch (e) {
    const failed = e.shortMessage || e.message;
    console.log(`   ${leg.label} leg failed: ${failed}`);
    return { ...base, failed };
  }
}
