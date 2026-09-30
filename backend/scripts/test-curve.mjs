// Buys a PONS-launched coin from a funded wallet, through the same path the
// buyback leg takes. Meant for a local fork of the chain:
//   RH_RPC_URL=http://127.0.0.1:8555 node scripts/test-curve.mjs [token]
import { formatEther, formatUnits } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { curveFor, quoteCurveGuarded } from '../src/services/launchpad.js';
import { swapEthForToken } from '../src/services/swap.js';
import { tokenOracle } from '../src/services/oracle.js';
import { publicClient, erc20Abi } from '../src/chain/config.js';

const RPC = process.env.RH_RPC_URL || '';
if (!/127\.0\.0\.1|localhost/.test(RPC)) throw new Error('Run this against a local fork only (RH_RPC_URL)');
const TOKEN = (process.argv[2] || '0xd7b1cf6bf975442dfb517bda1211412cc07f65f3').toLowerCase();
const KEY = '0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d'; // anvil account 1
const me = privateKeyToAccount(KEY).address;
const client = publicClient();

const curve = await curveFor(TOKEN);
console.log('curve:', curve);
if (!curve) process.exit(1);
const amount = 29_400_000_000_000_000n; // the buyback share of cycle one
const q = await quoteCurveGuarded({ curve, amountWei: amount, recipient: me, minRatio: 0.8 });
console.log(`quote: ${formatEther(amount)} ETH -> ${formatUnits(q.out, 18)} tokens, ${(q.ratio * 100).toFixed(2)}% of spot${q.rejected ? ' (rejected)' : ''}`);
const oracle = await tokenOracle(TOKEN);
console.log('screener says:', oracle ? `$${oracle.stockUsd} per token, $${oracle.liquidityUsd} liquidity` : 'nothing');
const before = await client.readContract({ address: TOKEN, abi: erc20Abi, functionName: 'balanceOf', args: [me] });
const r = await swapEthForToken({ privateKey: KEY, token: TOKEN, decimals: 18, amountWei: amount, slippageBps: 150, oracle });
const after = await client.readContract({ address: TOKEN, abi: erc20Abi, functionName: 'balanceOf', args: [me] });
console.log(`bought via ${r.route}: +${formatUnits(after - before, 18)} tokens, tx ${r.hash}`);
const ok = after - before > 0n && r.route === 'PONS curve';
console.log(ok ? 'The buyback path works on the curve.' : 'Something is off.');
process.exit(ok ? 0 : 1);
