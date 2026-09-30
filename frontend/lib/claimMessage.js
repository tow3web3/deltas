// The message a page owner signs to bind a wallet. Built here for both sides:
// the browser signs it, the server rebuilds it to check the signature.
import { BRAND, SITE_HOST } from './brand';

export const claimMessage = ({ platform, handle, wallet, nonce, issuedAt }) =>
  `${BRAND}: claim a page\nPage: ${platform}:${handle}\nPay to: ${String(wallet).toLowerCase()}\nNonce: ${nonce}\nIssued: ${issuedAt}\n\nFees routed to this page will be sent to this wallet. This signature costs no gas. Only sign this on ${SITE_HOST}.`;
