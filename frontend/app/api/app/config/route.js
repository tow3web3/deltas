// Create, update or delete the logged-in creator's routing policy. Mirrors the bot.
import { parseAbi } from 'viem';
import { sessionUser } from '../../../../lib/session';
import { getConfigForUser, createConfig, updateConfig, deleteConfig, replaceLegs, getLegs, activeConfigForToken } from '../../../../lib/appQueries';
import { encryptPrivateKey, isValidPrivateKey, normalizeKey, addressOf, generateDevWallet } from '../../../../lib/crypto';
import { reschedule, policyCreated } from '../../../../lib/internal';
import { rpc } from '../../../../lib/evm';
import { EVM_ADDR, getStock, ZERO } from '../../../../lib/stocks';
import { BRAND, CONTACT_EMAIL } from '../../../../lib/brand';
import { isSolAddress } from '../../../../lib/chains';
import { SOL_MINT } from '../../../../lib/stocks';
import { getXStock } from '../../../../lib/xstocks';
import { jupiterTokens, pumpCurve } from '../../../../lib/solana';
import { parseSolSecret } from '../../../../lib/solKeys';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const erc20 = parseAbi(['function symbol() view returns (string)', 'function name() view returns (string)']);

async function tokenExists(address) {
  try {
    const symbol = await rpc().readContract({ address, abi: erc20, functionName: 'symbol' });
    return String(symbol);
  } catch {
    return null;
  }
}

function resolveReward(input) {
  const v = String(input || '').trim();
  if (!v || /^eth$/i.test(v)) return ZERO;
  const s = getStock(v);
  if (s) return s.address;
  if (EVM_ADDR.test(v)) return v;
  return null;
}

/** A Solana reward: SOL, an xStock by ticker or symbol, or any mint Jupiter knows. Returns a mint or null. */
async function resolveSolReward(input) {
  const v = String(input || '').trim();
  if (!v || /^\$?sol$/i.test(v) || v === SOL_MINT) return SOL_MINT;
  const xs = getXStock(v);
  if (xs) return xs.mint;
  if (isSolAddress(v)) return (await jupiterTokens([v]).catch(() => ({})))[v] ? v : null;
  return null;
}

/**
 * A Solana coin, set up from the dashboard as the bot does it: the key of the
 * wallet that created the coin on pump.fun (its creator fees accrue there and
 * only it can collect them), the mint, the reward, the schedule.
 */
async function createSolana(user, b) {
  const mint = String(b.sourceToken || '').trim();
  if (!isSolAddress(mint)) return Response.json({ error: 'That is not a Solana mint address' }, { status: 400 });
  const meta = (await jupiterTokens([mint]).catch(() => ({})))[mint];
  if (!meta) return Response.json({ error: 'Jupiter does not know that mint yet. Check the address, or try again once the coin has traded.' }, { status: 422 });
  const taken = await activeConfigForToken(mint, user.id);
  if (taken) return Response.json({ error: `$${meta.symbol} already runs a ${BRAND} policy from another wallet. If you are its creator and that policy is not yours, write to ${CONTACT_EMAIL}.` }, { status: 409 });

  const key = parseSolSecret(b.wallet?.privateKey);
  if (!key) return Response.json({ error: 'That is not a Solana private key. Paste it as Phantom shows it (base58), or as a JSON array.' }, { status: 400 });

  const targetToken = await resolveSolReward(b.reward);
  if (!targetToken) return Response.json({ error: 'Holders can be paid in SOL, an xStock (NVDA, SPY, GLD...) or a mint Jupiter knows' }, { status: 400 });

  const scheduleKind = ['interval', 'closing_bell'].includes(b.scheduleKind) ? b.scheduleKind : 'interval';
  const intervalMinutes = scheduleKind === 'interval' ? ([1, 2, 5, 10, 30, 60].includes(Number(b.intervalMinutes)) ? Number(b.intervalMinutes) : 5) : 1440;
  const curve = await pumpCurve(mint).catch(() => null);

  const config = await createConfig(user.id, {
    chain: 'solana',
    devWalletEncrypted: encryptPrivateKey(key.secret),
    devWalletPublic: key.publicKey,
    sourceToken: mint,
    targetToken,
    feeSource: 'wallet',
    rewardMode: 'fixed',
    basket: null,
    scheduleKind, intervalMinutes,
    marketHoursOnly: Boolean(b.marketHoursOnly),
    split: { holders: 10000, creator: 0, burn: 0, treasury: 0 },
    creatorAddress: null, treasuryAddress: null,
    payoutMode: targetToken === SOL_MINT ? 'in_kind' : 'convert',
    loyalty: { enabled: false },
  });
  await reschedule(config.id);
  policyCreated(config.id).catch(() => {});
  return Response.json({
    ok: true, configId: config.id, chain: 'solana', devWallet: key.publicKey, symbol: meta.symbol,
    creator: { isCreator: curve?.creator ? curve.creator === key.publicKey : null, creator: curve?.creator || null, complete: curve ? curve.complete : null },
  }, { status: 201 });
}

export async function POST(request) {
  try {
    const user = await sessionUser();
    if (!user) return Response.json({ error: 'Not logged in' }, { status: 401 });
    if (await getConfigForUser(user.id)) return Response.json({ error: `You already have a ${BRAND} policy. Delete it first to start over.` }, { status: 409 });

    const b = await request.json();
    if (b.chain === 'solana' || (isSolAddress(b.sourceToken || '') && !EVM_ADDR.test(b.sourceToken || ''))) return await createSolana(user, b);
    if (!EVM_ADDR.test(b.sourceToken || '')) return Response.json({ error: 'Token address is invalid' }, { status: 400 });
    const symbol = await tokenExists(b.sourceToken);
    if (!symbol) return Response.json({ error: 'No ERC-20 found at that address on Robinhood Chain' }, { status: 422 });
    const taken = await activeConfigForToken(b.sourceToken, user.id);
    if (taken) return Response.json({ error: `$${symbol} already runs a ${BRAND} policy from another wallet. If you are its creator and that policy is not yours, write to ${CONTACT_EMAIL}.` }, { status: 409 });

    // Dev wallet: generated here, or imported.
    let privateKey;
    let generated = false;
    if (b.wallet?.mode === 'import') {
      if (!isValidPrivateKey(b.wallet.privateKey)) return Response.json({ error: 'Private key must be 64 hex characters' }, { status: 400 });
      privateKey = normalizeKey(b.wallet.privateKey);
    } else {
      privateKey = generateDevWallet().privateKey;
      generated = true;
    }
    const devWalletPublic = addressOf(privateKey);

    const targetToken = resolveReward(b.reward);
    if (!targetToken) return Response.json({ error: 'Reward must be a stock ticker, ETH, or a token address' }, { status: 400 });
    if (!(targetToken === ZERO || getStock(targetToken) || (await tokenExists(targetToken)))) return Response.json({ error: 'Reward token not found on chain' }, { status: 422 });

    const split = { holders: Number(b.split?.holders ?? 10000), creator: Number(b.split?.creator ?? 0), burn: Number(b.split?.burn ?? 0), treasury: Number(b.split?.treasury ?? 0) };
    if (Object.values(split).some((x) => !Number.isInteger(x) || x < 0 || x > 10000) || split.holders + split.creator + split.burn + split.treasury !== 10000) {
      return Response.json({ error: 'The policy must add up to 100%' }, { status: 400 });
    }
    const addr = (v) => (v && EVM_ADDR.test(v) ? v : null);
    const scheduleKind = ['interval', 'closing_bell', 'opening_bell'].includes(b.scheduleKind) ? b.scheduleKind : 'interval';
    const intervalMinutes = scheduleKind === 'interval' ? ([1, 2, 5, 10, 30, 60].includes(Number(b.intervalMinutes)) ? Number(b.intervalMinutes) : 5) : 1440;

    const config = await createConfig(user.id, {
      devWalletEncrypted: encryptPrivateKey(privateKey),
      devWalletPublic,
      sourceToken: b.sourceToken,
      targetToken,
      feeSource: b.feeSource === 'univ3' ? 'univ3' : 'wallet',
      rewardMode: ['fixed', 'roulette', 'gainer', 'portfolio', 'vote'].includes(b.rewardMode) ? b.rewardMode : 'fixed',
      basket: ['MAG7', 'AI', 'DEGEN', 'HAVEN'].includes(b.basket) ? b.basket : null,
      scheduleKind, intervalMinutes,
      marketHoursOnly: Boolean(b.marketHoursOnly),
      split, creatorAddress: addr(b.creatorAddress), treasuryAddress: addr(b.treasuryAddress),
      payoutMode: b.payoutMode === 'convert' ? 'convert' : 'in_kind',
      loyalty: b.loyalty ? { enabled: Boolean(b.loyalty.enabled), minHoldHours: Number(b.loyalty.minHoldHours || 0), rampDays: Number(b.loyalty.rampDays || 30), maxBps: Number(b.loyalty.maxBps || 20000), sellReset: b.loyalty.sellReset !== false } : null,
    });
    await reschedule(config.id);
    policyCreated(config.id).catch(() => {});
    return Response.json({ ok: true, configId: config.id, devWallet: devWalletPublic, generated, symbol }, { status: 201 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(request) {
  try {
    const user = await sessionUser();
    if (!user) return Response.json({ error: 'Not logged in' }, { status: 401 });
    const config = await getConfigForUser(user.id);
    if (!config) return Response.json({ error: 'No policy yet' }, { status: 404 });
    const patch = await request.json();
    const sol = config.chain === 'solana';
    if (sol) {
      // What runs on Robinhood Chain only is refused when it would switch something on, and dropped otherwise.
      const rhOnly = (patch.reward_mode !== undefined && patch.reward_mode !== 'fixed')
        || (patch.fee_source !== undefined && patch.fee_source !== 'wallet')
        || patch.loyalty_enabled === true;
      if (rhOnly) return Response.json({ error: 'Rotating rewards, votes, loyalty and Uniswap fees run on Robinhood Chain only' }, { status: 400 });
      for (const k of ['reward_mode', 'basket', 'fee_source', 'loyalty_enabled', 'loyalty_min_hold_hours', 'loyalty_ramp_days', 'loyalty_max_bps', 'loyalty_sell_reset']) delete patch[k];
    }
    if (patch.reward !== undefined) {
      const t = sol ? await resolveSolReward(patch.reward) : resolveReward(patch.reward);
      if (!t) return Response.json({ error: sol ? 'Holders can be paid in SOL, an xStock or a mint Jupiter knows' : 'Reward must be a stock ticker, ETH, or a token address' }, { status: 400 });
      patch.target_token_address = t;
      delete patch.reward;
    }
    if (sol && patch.treasury_asset) {
      const xs = getXStock(patch.treasury_asset);
      if (!xs) return Response.json({ error: 'The treasury holds an xStock' }, { status: 400 });
      patch.treasury_asset = xs.mint;
    } else if (patch.treasury_asset && !getStock(patch.treasury_asset)) {
      const t = resolveReward(patch.treasury_asset);
      if (!t || t === ZERO) return Response.json({ error: 'Treasury asset must be a stock' }, { status: 400 });
      patch.treasury_asset = t;
    }
    let legs = null;
    if (patch.legs !== undefined) {
      legs = await replaceLegs(config.id, patch.legs, user.id, sol ? 'solana' : 'robinhood');
      delete patch.legs;
    }
    const updated = Object.keys(patch).length ? await updateConfig(config.id, patch) : { ...(await getConfigForUser(user.id)) };
    await reschedule(config.id);
    const { dev_wallet_encrypted, ...pub } = updated;
    void dev_wallet_encrypted;
    return Response.json({ ok: true, config: pub, legs: legs || (await getLegs(config.id)) });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 400 });
  }
}

export async function DELETE() {
  try {
    const user = await sessionUser();
    if (!user) return Response.json({ error: 'Not logged in' }, { status: 401 });
    const config = await getConfigForUser(user.id);
    if (!config) return Response.json({ error: 'No policy yet' }, { status: 404 });
    await updateConfig(config.id, { is_active: false });
    await reschedule(config.id);
    await deleteConfig(config.id);
    return Response.json({ ok: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
