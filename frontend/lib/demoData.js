// Sample policy shown on the dashboard before a wallet is connected: a real-looking
// pump.fun coin on Solana, a five-leg routing (one of them a page), the creator
// wallet's SOL and two past cycles. Nothing here is saved: the coin, the wallets,
// the vault and the transactions are placeholders (random keys, nobody's), and the
// page is not somebody's channel. The xStocks are the real ones.
import { ZERO, SOL_MINT } from './stocks';
import { getXStock } from './xstocks';

const xs = (t) => getXStock(t);
const NVDAX = xs('NVDA').mint;
const SPYX = xs('SPY').mint;
const GLDX = xs('GLD').mint;
const xmeta = (t) => ({ symbol: xs(t).symbol, name: xs(t).name, image: xs(t).logo, decimals: xs(t).decimals, marketCap: null });

// Solana placeholders: a pump.fun-style mint, the creator wallet, a partner, a treasury, a page vault.
const DEMO_TOKEN = 'DemoCoin1111111111111111111111111111111pump';
const DEV = 'ALAEv6ze7zqqWuSzzcMQzKeAc9reU2rMX8y7Akz3uVUv';
const PARTNER = 'HVGMzyeBFVbKze43oksLjinQWizAX6HXToNXcnHhz2Fr';
const TREASURY = 'HFQxDuPVeivtEJWDuAQ5vMsFprgstgFSiusyokbEEAYd';
const VAULT = 'BsBScTP5Tpe721FRbpt4tZt4ZvJZVX2vRm5DFh5YoJBH';
const TX1 = '44kUrfCtm4oaRvud1DzsXBsyPcezxDwGxN7ZGF9UcHrJv7nCfrxhpzLvx7kQ5qhacywQqG8WbSp4vyaaJM8rGEgW';
const TX0 = '3TQE4bmzFvDfAJ9xbtipoDNNRqu27PXx4seDiZkMBH6n6B1T2EnJj7FBoiHNFc92iCcquCVB98azEJyqHRNLyaLL';
// The empty creator wallet of a blank canvas: Solana's all-zero key, as 0x000… is on Robinhood Chain.
const SOL_NONE = '11111111111111111111111111111111';
// The coin of a blank canvas on Robinhood Chain.
const RH_DEMO_TOKEN = '0x00000000000000000000000000000000000d3m0';
const now = Date.now();

export const DEMO_DATA = {
  demo: true,
  user: { id: 0, wallet: null, chain: 'solana', telegramLinked: false, telegramUsername: null },
  // Group burn alerts are a Robinhood Chain feature: the sample binds receipts only.
  telegram: { receiptsChatId: '-1', receiptsTitle: 'DEMO Community', burnAlerts: [] },
  config: {
    id: 0, chain: 'solana', is_active: true, source_token_address: DEMO_TOKEN, dev_wallet_public: DEV, target_token_address: NVDAX,
    reward_mode: 'fixed', basket: null, schedule_kind: 'interval', interval_minutes: 10, market_hours_only: false, fee_source: 'wallet',
    split_holders_bps: 6000, split_creator_bps: 1000, split_burn_bps: 500, split_treasury_bps: 1000, creator_address: DEV, treasury_address: TREASURY, treasury_asset: SPYX, payout_mode: 'in_kind',
    loyalty_enabled: false, loyalty_min_hold_hours: 0, loyalty_ramp_days: 30, loyalty_max_bps: 20000, loyalty_sell_reset: false,
    legs_enabled: true, scheduleLabel: 'every 10 min',
  },
  legs: [
    { id: 1, kind: 'holders', share_bps: 6000, address: null, asset: NVDAX, label: 'Holders', sort_order: 0, pos_x: 480, pos_y: 30 },
    { id: 2, kind: 'page', share_bps: 1500, address: null, asset: null, label: '@yourchannel', sort_order: 1, pos_x: 480, pos_y: 198, page_id: 1, page_platform: 'youtube', page_handle: '@yourchannel', page_vault: VAULT, page_claimed: false },
    { id: 3, kind: 'wallet', share_bps: 1000, address: PARTNER, asset: GLDX, label: 'Partner wallet', sort_order: 2, pos_x: 480, pos_y: 366 },
    { id: 4, kind: 'burn', share_bps: 500, address: null, asset: null, label: 'Buyback & burn', sort_order: 3, pos_x: 480, pos_y: 534 },
    { id: 5, kind: 'treasury', share_bps: 1000, address: TREASURY, asset: SPYX, label: 'Treasury', sort_order: 4, pos_x: 480, pos_y: 702 },
  ],
  // The creator wallet: pump.fun creator fees land as SOL; 0.02 SOL stays for network fees.
  assets: {
    totalUsd: 205.46,
    assets: [
      { address: SOL_MINT, symbol: 'SOL', name: 'Solana', decimals: 9, amount: 1.2841, spendable: 1.2641, usd: 205.46, isNative: true, image: '/sol.png' },
    ],
  },
  logs: [
    // Amounts in each asset's own units: lamports for SOL (9 decimals), 8 decimals for xStocks, 6 for the coin.
    { id: 9001, cycle_key: 'demo-1', status: 'success', error_message: null, execution_time: new Date(now - 86400e3).toISOString(), holder_count: 412, claimed_eth_wei: '1150000000', total_airdropped: '61230000', reward_token_used: NVDAX, asset_token: SOL_MINT, asset_amount: '1150000000', creator_amount: '115000000', burn_amount: '1240000000000', treasury_amount: '2830000', treasury_token: SPYX, tx_hash: TX1,
      legs: [
        { kind: 'page', label: '@yourchannel', page: { platform: 'youtube', handle: '@yourchannel', claimed: false }, output: { token: SOL_MINT, symbol: 'SOL', amount: '172500000', decimals: 9 } },
        { kind: 'wallet', label: 'Partner wallet', output: { token: GLDX, symbol: 'GLDx', amount: '6130000', decimals: 8 } },
        { kind: 'burn', label: 'Buyback & burn', output: { token: DEMO_TOKEN, symbol: 'DEMO', amount: '1240000000000', decimals: 6 } },
        { kind: 'treasury', label: 'Treasury', output: { token: SPYX, symbol: 'SPYx', amount: '2830000', decimals: 8 } },
      ] },
    { id: 9000, cycle_key: 'demo-0', status: 'success', error_message: null, execution_time: new Date(now - 2 * 86400e3).toISOString(), holder_count: 398, claimed_eth_wei: '290000000', total_airdropped: '174000000', reward_token_used: SOL_MINT, asset_token: SOL_MINT, asset_amount: '290000000', creator_amount: '29000000', burn_amount: '310000000000', treasury_amount: '710000', treasury_token: SPYX, tx_hash: TX0, legs: [] },
  ],
  meta: {
    [DEMO_TOKEN]: { symbol: 'DEMO', name: 'Your coin', image: '/brand/delta-256.png', decimals: 6, marketCap: 1250000 },
    [SOL_MINT]: { symbol: 'SOL', name: 'Solana', image: '/sol.png', decimals: 9, marketCap: null },
    [NVDAX]: xmeta('NVDA'),
    [SPYX]: xmeta('SPY'),
    [GLDX]: xmeta('GLD'),
  },
  yield: { apy: 12.4 },
  timestamp: new Date(now).toISOString(),
};

/**
 * Blank canvas for a wallet that has no policy yet: one holders leg, nothing else.
 * It lives on the chain of the signed-in wallet: Solana (SOL, base58 placeholders) unless
 * the wallet is a Robinhood Chain one (ETH, 0x placeholders).
 */
export const blankData = (user) => {
  const chain = user?.chain || 'solana';
  const sol = chain === 'solana';
  const token = sol ? DEMO_TOKEN : RH_DEMO_TOKEN;
  return {
    setup: true,
    user,
    config: {
      id: 0, chain, is_active: false, source_token_address: token, dev_wallet_public: sol ? SOL_NONE : ZERO, target_token_address: sol ? SOL_MINT : ZERO,
      reward_mode: 'fixed', basket: 'MAG7', schedule_kind: 'closing_bell', interval_minutes: 1440, market_hours_only: false, fee_source: 'wallet',
      split_holders_bps: 10000, split_creator_bps: 0, split_burn_bps: 0, split_treasury_bps: 0, creator_address: null, treasury_address: null, treasury_asset: null, payout_mode: 'in_kind',
      // Loyalty weighting is a Robinhood Chain feature: on Solana holders are paid by balance.
      loyalty_enabled: !sol, loyalty_min_hold_hours: 24, loyalty_ramp_days: 30, loyalty_max_bps: 20000, loyalty_sell_reset: true,
      legs_enabled: true, ...(sol ? {} : { gas_reserve_wei: '2000000000000000' }), scheduleLabel: 'at the closing bell',
    },
    legs: [{ id: 1, kind: 'holders', share_bps: 10000, address: null, asset: null, label: 'Holders', sort_order: 0, pos_x: 480, pos_y: 60 }],
    assets: sol ? { totalUsd: 0, assets: [] } : { totalUsd: 0, gasReserveEth: 0.002, assets: [] },
    logs: [],
    meta: { [token]: { symbol: '…', name: 'Your coin', image: '/brand/delta-256.png', decimals: sol ? 6 : 18, marketCap: null } },
    yield: null,
    timestamp: new Date().toISOString(),
  };
};
