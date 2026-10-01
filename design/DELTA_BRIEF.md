# Brief for the DELTA redesign pass

Read `design/DELTA_DESIGN.md` first (the visual system), then this file (what is true about the product, and the working rules).

## The product, as it is today

DELTA routes the creator fees of a coin to the destinations its creator draws, every cycle, on chain, with a receipt.

- **Solana is the principal chain.** Coins launch on **pump.fun**. pump.fun sets a creator fee aside on every trade (bonding curve, then PumpSwap after graduation); DELTA collects it into the coin's dev wallet each cycle (`collect_creator_fee`), keeps 0.02 SOL for fees, routes the rest.
- **Robinhood Chain is the second chain.** Coins from launchpads there (PONS among them); fees land in the dev wallet as ETH and Robinhood Stock Tokens (195); swaps on Uniswap V2/V3/V4 or the PONS bonding curve.
- **Destinations ("legs")**, each with a share of every cycle: holders (pro rata, optional loyalty weighting), wallets, buyback and burn of the coin itself, a treasury (held in stocks), and **pages**.
- **Holders are paid in** SOL, an **xStock** (tokenized stocks and ETFs on Solana by Backed Finance, Token-2022; `lib/xstocks.js` has 173 familiar ones, the engine can pay any of the ~1,171 Jupiter verifies), or any SPL token. On Robinhood Chain: ETH, a Robinhood Stock Token, or any ERC-20.
- **Swaps on Solana go through Jupiter.** The fair-price guard refuses a swap that returns less than 90% of the reference price (Jupiter's price API); that share is paid in SOL instead, and the receipt says so. On Robinhood Chain the reference is Yahoo Finance for stocks, DexScreener for coins.
- **Payouts on Solana** are batched: about 18 SOL transfers per transaction, so a hundred holders are paid in a few seconds. A holder whose share is worth less than the cost of opening a token account (~0.002 SOL) is skipped for that cycle when paying in a token.
- **Pages:** any page on the internet can be a destination: YouTube channel, GitHub account or org, X, Instagram, Facebook page, TikTok, Twitch, a domain, a **phone number** (nine kinds). Each page gets its own vault (one per chain), paid every cycle. The owner proves it (platform sign-in; DNS TXT record for a domain; a 6-digit code by WhatsApp or SMS for a phone), connects a wallet, signs once (no gas), and the vault is swept to them; later cycles pay them directly. Phone numbers are shown masked (`+33 • •• •• •• 78`) and never put in a URL.
- **Set up**: from the dashboard (`/app`) or the Telegram bot (`/setup`, five steps). Schedules: every 1, 2, 5, 10, 30 or 60 minutes, or once a day at the closing bell; market-hours-only option.
- **Token: $DELTA**, on Solana, routes its own fees. The mint is not out yet: the site shows "soon" until `NEXT_PUBLIC_TOKEN_CA` is set.
- **Public**: every coin has a page at `/<mint or address>` with its routing, cycles, receipts; every page has a profile at `/p/<platform>/<handle>`; a free read-only API at `/api/v1`; webhooks signed with HMAC.

Do not invent features, numbers or partners. If a section claims something not listed here, cut it or ask yourself whether it is in the code.

## Copy rules

- Solana first in every headline and example; Robinhood Chain appears as "also on Robinhood Chain" or in a second example, never as the only chain.
- Examples use Solana things: SOL amounts, xStocks with their logos (`NVDAx`, `SPYx`, `GLDx`…), a pump.fun coin, Solscan links. One Robinhood example per section at most.
- Plain sentences, no hype words ("revolutionary", "seamless", "unlock"), no exclamation marks, no emoji anywhere on the site.
- The brand is written **DELTA** (all caps) and the token **$DELTA**. Never mention any previous product name.

## Working rules for this pass

- Edit **only the files assigned to you**. Do not touch `app/globals.css`, `tailwind.config.js`, `components/ui/Light.js`, `lib/brand.js`, `lib/chains.js`, `lib/xstocks.js`, or any API route, unless your assignment names it. If you need a new small shared piece, put it inside one of your own files.
- Keep every component's props, exports and data fetching as they are: the pages that import them must not break. Change presentation and copy, not contracts.
- Use the system: `.frame` / `.panel` / `Glass` for surfaces, `.btn-primary` / `.btn-ghost`, `.label`, `.eyebrow`, `.figure`, `.text-beam` / `.beam`, `Flow` + `FlowChip` where a split is shown, `<Cut />` between sections if you own the section spacing. Real logos via `PlatformIcon`, `StockLogo`, `Mark`. Tailwind colour roles: `ink`, `mut`, `dim`, `line`, `hood-*` (the blue), `cyan-500`, `violet-500`, `gold-*` and `down` for warnings only.
- **Never run `next build`, `next dev`, `next start`, `npm install`, or take screenshots**: other people are editing the same tree and the coordinator builds and reviews visually. Check syntax with `node scripts/check-jsx.mjs <your files>` (from `frontend/`) after every edit, and fix what it reports.
- Do not commit. The coordinator commits.
- Finish with a short report: files changed, what each section looks like now in one or two lines, anything you were unsure about.
