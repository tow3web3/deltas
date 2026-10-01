// The messages a creator signs on the dashboard, built here for both sides: the
// browser signs them, the server rebuilds them byte for byte to check the
// signature. A Solana address keeps its case; a 0x address is written in lower case.
import { SITE_HOST } from './brand';
import { chainOf, normAddress } from './chains';

const chainLine = (wallet) => (chainOf(wallet) === 'solana' ? 'Solana' : 'Robinhood Chain (4663)');

export const loginMessage = ({ wallet, nonce, issuedAt }) =>
  `DELTA dashboard login\nChain: ${chainLine(wallet)}\nWallet: ${wallet}\nNonce: ${nonce}\nIssued: ${issuedAt}\n\nThis signature costs no gas and only proves you own this wallet.`;

export const revealMessage = ({ wallet, devWallet, nonce, issuedAt }) =>
  `DELTA: reveal my dev wallet private key\nDev wallet: ${normAddress(String(devWallet))}\nSigned in as: ${normAddress(String(wallet))}\nNonce: ${nonce}\nIssued: ${issuedAt}\n\nOnly sign this on ${SITE_HOST}. Anyone holding the key controls the fees.`;
