// The message a page owner signs to bind a wallet. Built here for both sides:
// the browser signs it, the server rebuilds it to check the signature.
import { BRAND, SITE_HOST } from './brand';
import { CHAINS, chainOf, normAddress } from './chains';

// A Solana address keeps its case (base58); a 0x address is written in lower case.
export const claimMessage = ({ platform, handle, wallet, nonce, issuedAt }) =>
  `${BRAND}: claim a page\nPage: ${platform}:${handle}\nPay to: ${normAddress(String(wallet))}\nChain: ${CHAINS[chainOf(wallet)]?.label || 'unknown'}\nNonce: ${nonce}\nIssued: ${issuedAt}\n\nFees routed to this page on this chain will be sent to this wallet. This signature costs no gas. Only sign this on ${SITE_HOST}.`;
