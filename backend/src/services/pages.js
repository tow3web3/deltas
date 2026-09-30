// Page vaults. A page (a YouTube channel, a GitHub account, a domain...) that a
// coin routes fees to owns a vault wallet, created with the page and encrypted
// like a dev wallet. The vault only ever does one thing: once the owner has
// proved the page is theirs and bound a wallet (on the site), everything it
// holds is swept to that wallet. Tokens first, ETH last, because ETH pays the gas.
import { parseEther } from 'viem';
import * as db from '../db/queries.js';
import { publicClient, walletFor, accountFromKey, confirm, erc20Abi, isAddress, isNative, short, formatEth, formatUnits, explorerTx, NATIVE_ETH } from '../chain/config.js';
import { decryptPrivateKey } from './encryption.js';
import { stockBalances, MULTICALL3 } from './assets.js';

// A vault paid in stocks only has no ETH to move them. The gas wallet lends it
// what the sweep costs; without one such a vault waits for an ETH payment.
const GAS_KEY = process.env.PAGES_GAS_PRIVATE_KEY || '';
const GAS_TOPUP_MAX = parseEther(process.env.PAGES_GAS_TOPUP_MAX_ETH || '0.002');
// Headroom on every gas estimate: the base fee moves between the estimate and the send.
const GAS_MARGIN_BPS = 13000n;

const sweeping = new Set();

/** What a vault holds: ETH, every stock token, and any other token a cycle ever paid into it. */
export async function vaultHoldings(page) {
  const client = publicClient();
  const owner = page.vault_address;
  const out = [];
  const held = await stockBalances(owner);
  for (const { stock, amount } of held) out.push({ address: stock.address, symbol: stock.ticker, decimals: 18, amount, isNative: false });
  const seen = new Set(out.map((a) => a.address.toLowerCase()));
  const others = (await db.getPageVaultTokens(page.id)).filter((t) => !isNative(t) && !seen.has(t.toLowerCase()));
  if (others.length) {
    const res = await client.multicall({
      contracts: others.flatMap((t) => [
        { address: t, abi: erc20Abi, functionName: 'balanceOf', args: [owner] },
        { address: t, abi: erc20Abi, functionName: 'decimals' },
        { address: t, abi: erc20Abi, functionName: 'symbol' },
      ]),
      multicallAddress: MULTICALL3,
      allowFailure: true,
    });
    others.forEach((t, i) => {
      const [bal, dec, sym] = [res[i * 3], res[i * 3 + 1], res[i * 3 + 2]];
      if (bal.status === 'success' && bal.result > 0n) out.push({ address: t, symbol: sym.status === 'success' ? String(sym.result) : 'TOKEN', decimals: dec.status === 'success' ? Number(dec.result) : 18, amount: bal.result, isNative: false });
    });
  }
  const eth = await client.getBalance({ address: owner });
  if (eth > 0n) out.push({ address: NATIVE_ETH, symbol: 'ETH', decimals: 18, amount: eth, isNative: true });
  return out;
}

async function gasPrice() {
  const fees = await publicClient().estimateFeesPerGas().catch(() => null);
  return fees?.maxFeePerGas || (await publicClient().getGasPrice());
}
const withMargin = (v) => (v * GAS_MARGIN_BPS) / 10000n;

/**
 * Sweep a claimed page's vault to the wallet its owner bound. Safe to call again:
 * it moves whatever is there. Returns { moved, left, error }.
 */
export async function sweepPage(pageId) {
  if (sweeping.has(pageId)) return { moved: [], skipped: 'already sweeping' };
  sweeping.add(pageId);
  try {
    const page = await db.getPage(pageId);
    if (!page) return { moved: [], error: 'Page not found' };
    // The destination comes from the database row written by a verified claim, never from the caller.
    if (!isAddress(page.claimed_wallet)) return { moved: [], error: 'Page is not claimed' };
    const to = page.claimed_wallet;
    const privateKey = decryptPrivateKey(page.vault_encrypted);
    const account = accountFromKey(privateKey);
    if (account.address.toLowerCase() !== page.vault_address.toLowerCase()) throw new Error('vault key does not match the vault address');
    if (to.toLowerCase() === account.address.toLowerCase()) return { moved: [], error: 'The bound wallet is the vault itself' };
    const { wallet } = walletFor(privateKey);
    const client = publicClient();

    const holdings = await vaultHoldings(page);
    const tokens = holdings.filter((h) => !h.isNative);
    const moved = [];
    const left = [];
    console.log(`Sweeping ${page.platform}:${page.platform === 'phone' ? page.slug || '(number)' : page.handle} vault ${short(account.address)} to ${short(to)}: ${holdings.length ? holdings.map((h) => `${formatUnits(h.amount, h.decimals, 4)} ${h.symbol}`).join(', ') : 'empty'}`);

    // Gas for the token transfers, borrowed from the gas wallet when the vault is short.
    if (tokens.length) {
      const price = await gasPrice();
      let need = 0n;
      for (const t of tokens) {
        const gas = await client.estimateContractGas({ account: account.address, address: t.address, abi: erc20Abi, functionName: 'transfer', args: [to, t.amount] }).catch(() => 120_000n);
        t.gas = withMargin(gas);
        need += t.gas * price;
      }
      need = withMargin(need);
      const have = await client.getBalance({ address: account.address });
      if (have < need) {
        const lend = need - have;
        if (!GAS_KEY) throw new Error(`the vault holds tokens but no ETH for gas (${formatEth(need, 6)} ETH needed); set PAGES_GAS_PRIVATE_KEY or wait for an ETH payment`);
        if (lend > GAS_TOPUP_MAX) throw new Error(`gas for this sweep (${formatEth(lend, 6)} ETH) is above PAGES_GAS_TOPUP_MAX_ETH`);
        const gasWallet = walletFor(GAS_KEY).wallet;
        const h = await gasWallet.sendTransaction({ to: account.address, value: lend });
        await confirm(h, 'vault gas top-up');
        console.log(`   Gas: lent ${formatEth(lend, 6)} ETH to the vault (${explorerTx(h)})`);
      }
    }

    for (const t of tokens) {
      try {
        const hash = await wallet.writeContract({ address: t.address, abi: erc20Abi, functionName: 'transfer', args: [to, t.amount], gas: t.gas });
        await confirm(hash, `${t.symbol} sweep`);
        await db.insertPageSweep({ pageId: page.id, wallet: to, token: t.address, symbol: t.symbol, decimals: t.decimals, amount: t.amount, txHash: hash });
        moved.push({ symbol: t.symbol, amount: t.amount.toString(), decimals: t.decimals, tx: hash });
        console.log(`   ${formatUnits(t.amount, t.decimals, 4)} ${t.symbol} swept (${explorerTx(hash)})`);
      } catch (e) {
        left.push({ symbol: t.symbol, error: e.shortMessage || e.message });
        console.log(`   ${t.symbol} sweep failed: ${e.shortMessage || e.message}`);
      }
    }

    // ETH last: everything minus what this one transfer costs. A contract wallet
    // as destination costs more than 21000, so the transfer is estimated, not assumed.
    const balance = await client.getBalance({ address: account.address });
    if (balance > 0n) {
      const price = await gasPrice();
      const gas = withMargin(await client.estimateGas({ account: account.address, to, value: 1n }).catch(() => 21_000n));
      const cost = gas * price;
      if (balance > cost) {
        const value = balance - cost;
        try {
          const hash = await wallet.sendTransaction({ to, value, gas, maxFeePerGas: price, maxPriorityFeePerGas: price < 1_000_000n ? price : 1_000_000n });
          await confirm(hash, 'ETH sweep');
          await db.insertPageSweep({ pageId: page.id, wallet: to, token: NATIVE_ETH, symbol: 'ETH', decimals: 18, amount: value, txHash: hash });
          moved.push({ symbol: 'ETH', amount: value.toString(), decimals: 18, tx: hash });
          console.log(`   ${formatEth(value, 6)} ETH swept (${explorerTx(hash)})`);
        } catch (e) {
          left.push({ symbol: 'ETH', error: e.shortMessage || e.message });
          console.log(`   ETH sweep failed: ${e.shortMessage || e.message}`);
        }
      }
      // Less than one transfer's gas is dust: it stays, the sweep is complete.
    }

    const error = left.length ? left.map((l) => `${l.symbol}: ${l.error}`).join('; ').slice(0, 500) : null;
    await db.markPageSwept(page.id, error);
    return { moved, left, error };
  } catch (e) {
    const error = (e.shortMessage || e.message || 'sweep failed').slice(0, 500);
    console.error(`Sweep of page ${pageId} failed: ${error}`);
    await db.markPageSwept(pageId, error).catch(() => {});
    return { moved: [], error };
  } finally {
    sweeping.delete(pageId);
  }
}

/** Every minute: sweep the vaults of claimed pages that still hold something. */
export async function tickPageSweeps() {
  const pages = await db.getPagesToSweep();
  for (const page of pages) await sweepPage(page.id);
}
