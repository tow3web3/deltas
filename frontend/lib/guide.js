// The guide, section by section. Each body item is a paragraph (string, with the
// markers of components/Rich.js), a list of steps ({ steps: [{ title, body, p }] },
// `p` a platform whose logo marks the step), a table ({ rows: [[k, v, kind?]] }),
// a callout ({ note }), a link ({ link, label }), or one of the drawn blocks:
// { flow: true } the route from fees to destinations as channels of light,
// { destinations: true } the five kinds, { platforms: true } the nine places a
// page can live, { cycle: true } one Solana cycle as channel bars.
// Solana comes first. A section with `chain: 'robinhood'` belongs to the second
// chain: the layout gathers those under a part of their own.
// What it says is what the product does today: a change in the flow is a change here.
import { BRAND, BOT_USERNAME, BOT_URL } from './brand';

const bot = BOT_USERNAME ? `{c:@${BOT_USERNAME}}` : `the ${BRAND} bot`;

export const GUIDE = [
  {
    title: 'In one minute',
    body: [
      `A coin on pump.fun earns a creator fee on every trade, set aside for the wallet that created it: on the bonding curve, then on PumpSwap once the coin graduates. ${BRAND} collects those fees on a schedule and pays each destination its share, in {s:SOL} or in what you chose: an xStock like {s:NVDAx}, or any token.`,
      { flow: true },
      { destinations: true },
      'Everything is public: the routing, every payment, every vault. Holders can check what the coin promised against what it paid, on the page of the coin and on Solscan.',
    ],
  },
  {
    title: 'Set up a pump.fun coin from Telegram',
    id: 'telegram',
    body: [
      `Open ${bot} and send {c:/setup}. It walks you through five steps; on Solana the third one is filled in for you.`,
      ...(BOT_URL ? [{ link: BOT_URL, label: `Open @${BOT_USERNAME} on Telegram` }] : []),
      { rows: [
        ['1. The creator wallet', 'The private key of the wallet that created the coin on pump.fun, the way Phantom exports it: base58, or the JSON array. It is encrypted the moment it arrives, and your message is deleted.', 'key'],
        ['2. Your coin', 'Its mint address; on pump.fun it ends in {c:pump}. The bot checks that this wallet is the creator pump.fun pays, and shows the fees already waiting.', 'coin'],
        ['3. Fee source', 'Set for you: the creator fees pump.fun holds for this wallet, collected into it every cycle.', 'source'],
        ['4. The reward', 'What holders receive: {s:SOL}, an xStock (type its ticker: NVDA for {s:NVDAx}, SPY for {s:SPYx}), or any mint Jupiter knows.', 'asset'],
        ['5. Schedule', 'Every 1, 2, 5, 10, 30 or 60 minutes, or once a day at the closing bell. Any schedule can be limited to market hours.', 'clock'],
      ] },
      '{c:/status} shows the routing, the wallet balance and the last cycle. Finer routing, several wallets, pages and their shares, is drawn on the dashboard canvas, and the bot picks it up.',
      { note: 'Keep a little SOL in the wallet: 0.02 SOL stays there every cycle to pay network fees. Use the wallet that created the coin, never your main holdings.' },
    ],
  },
  {
    title: 'Draw the routing on the dashboard',
    id: 'dashboard',
    body: [
      'The dashboard is where the routing is drawn, on a canvas. Send {c:/dashboard} to the bot for the link, or open it and sign in with your wallet: signing in is a signature, not a transaction, so no gas.',
      { link: '/app', label: 'Open the dashboard' },
      { steps: [
        { title: 'Add destinations', body: 'Holders, one of your wallets, a buyback and burn, a treasury, or a page. Each one becomes a channel of the routing.' },
        { title: 'Give each its share', body: 'The shares of a cycle must add up to 100%; {b:Balance the others} does the arithmetic. A treasury holds the stock you pick for it, {s:SPYx} for example.' },
        { title: 'Save', body: 'The next cycle follows the new routing, and the public page of the coin shows it.' },
      ] },
    ],
  },
  {
    title: 'Route fees to a page',
    id: 'pages',
    body: [
      'Add a destination of kind {b:Page} and paste the link of the page: {c:youtube.com/@channel}, {c:github.com/name}, {c:x.com/handle}, a domain, or a phone number with its country code. The page appears with its picture; give it a share and save.',
      { platforms: true },
      { steps: [
        { title: 'A vault is created', body: 'The first time a coin routes to it, the page gets a wallet of its own on that chain: one vault per page, per chain. Its address and balance are on the public profile of the page, at {c:/p/<platform>/<name>}, and on chain.' },
        { title: 'Every cycle pays into it', body: 'The share of the page goes to its vault in {s:SOL}, or in the asset set for that destination. Nothing is asked of the owner.' },
        { title: 'The owner claims when they want', body: 'They prove the page and connect a wallet at {l:/claim|/claim}. The vault is swept to that wallet, and every later cycle pays it directly.' },
      ] },
      'Tell the owner. The profile of the page shows what waits for them; sending them that link is usually enough.',
      { note: 'Routing to a page needs no permission from its owner, and creates no partnership with them. Do not present a page as backing your coin unless its owner says so.' },
    ],
  },
  {
    title: 'Claim a page that receives fees',
    id: 'claim',
    body: [
      'Someone routed fees to your channel, account, site or number. Here is how to take them. It costs no gas: one proof and one wallet signature.',
      { link: '/claim', label: 'Go to the claim page' },
      { steps: [
        { title: 'Sign in with the platform', body: `{p:youtube|YouTube}, {p:github|GitHub}, {p:x|X}, {p:instagram|Instagram}, {p:facebook|Facebook}, {p:tiktok|TikTok} and {p:twitch|Twitch} open a sign-in on the platform itself, read only: ${BRAND} sees which pages your account runs and nothing else. The access token is dropped right after, never stored. Your pages then appear with what waits in their vault.`, p: 'youtube' },
        { title: 'For a website, a DNS record', body: 'Type the domain and connect your wallet. The page gives you a TXT record to add on {c:_delta.<yourdomain>}. Once it spreads, usually within minutes, the domain is yours to claim.', p: 'domain' },
        { title: 'For a phone number, a code', body: 'Type the number with its country code and choose {p:phone|WhatsApp} or SMS. A six-digit code arrives; type it, and the number is proved. The site only ever shows the number masked, like {c:+33 • •• •• •• 78}, and a phone page has an address of its own, so no link carries the number.', p: 'phone' },
        { title: 'Connect the wallet that gets paid', body: 'Pick the chain: a Solana wallet (Phantom, Solflare, Backpack) for what Solana coins pay, a Robinhood Chain wallet (MetaMask, Rabby) for the rest. Sign the message: it says which page pays which wallet, on which chain, and nothing else. It is a signature, not a transaction.' },
        { title: 'Receive', body: 'What waited in the vault arrives within minutes. Every later cycle pays your wallet directly. To change the wallet later, sign again from the new one.' },
      ] },
      { note: 'Only the owner of a page can claim it, and the proof comes from the platform, the domain or the phone itself. There is no form, no support ticket and no way around it.' },
    ],
  },
  {
    title: 'What a cycle does on Solana',
    id: 'cycle',
    body: [
      'Here is one cycle of a coin that routes 70% to its holders in {s:NVDAx}, and 10% each to a treasury, a buyback and a page.',
      { cycle: true },
      { steps: [
        { title: 'Collect', body: 'The creator fees pump.fun holds for the wallet are collected into it: from the bonding curve and, once the coin has graduated, from PumpSwap.' },
        { title: 'Sweep', body: 'Everything above 0.02 {s:SOL} is routed; the 0.02 stays for network fees. With less than 0.005 SOL to route, the cycle waits for more.' },
        { title: 'Pay the destinations', body: 'Each one receives its share in SOL, or in its own asset bought on Jupiter: a treasury in {s:SPYx}, for example. A buyback buys the coin and burns it. When the best route returns less than 90% of the reference price, that share is paid in {s:SOL} instead (a buyback\'s goes to the holders), and the receipt says so.' },
        { title: 'Pay the holders', body: 'Their share is swapped into the reward, then paid by balance in batches: about 18 SOL transfers per transaction, 7 token transfers. A holder whose share is worth less than opening a token account, about 0.002 SOL, is skipped that cycle.' },
        { title: 'Publish', body: 'A receipt for the cycle on the public page of the coin, every transaction on Solscan, and a message from the bot to you.' },
      ] },
    ],
  },
  {
    title: 'Set up a coin on Robinhood Chain',
    id: 'robinhood',
    chain: 'robinhood',
    body: [
      'The second chain works the same way, with {s:ETH} where Solana uses SOL. Coins come from launchpads there, PONS among them, which pay their creators in {s:ETH} and Robinhood Stock Tokens like {s:NVDA} or {s:TSLA}, straight to the dev wallet.',
      { link: '/app', label: 'Open the dashboard' },
      { steps: [
        { title: 'Which wallet receives the fees', body: `Two ways. {b:My connected wallet}: ${BRAND} lists the coins it created and makes a dedicated dev wallet for the fees, because a bot cannot sign with your browser wallet; you then set that dev wallet as fee recipient on your launchpad. {b:Import a key}: paste the private key of the wallet that already receives the fees, 64 hex characters; it becomes the dev wallet, encrypted the moment it arrives.` },
        { title: 'Which coin', body: 'Pick it in the list of coins the wallet created, or paste its contract address. Any ERC-20 on Robinhood Chain works, from any launchpad.' },
        { title: 'Launch with the default', body: 'The default routing is 100% to holders, paid in kind, with loyalty weighting (1x to 2x over 30 days, 24 hours minimum hold) and a cycle at the closing bell, 4:00 pm New York time on weekdays. Nothing moves until fees land in the dev wallet.' },
      ] },
      'In Telegram, {c:/setup} asks the same five questions: the key, the contract address, the fee source (the dev wallet, or a Uniswap V3 position you hold), the reward (the stock the launchpad paid, one stock of your choice, or any ERC-20), and the schedule.',
    ],
  },
  {
    title: 'A cycle on Robinhood Chain',
    id: 'robinhood-cycle',
    chain: 'robinhood',
    body: [
      { steps: [
        { title: 'Sweep', body: 'Everything in the dev wallet above a small gas reserve: every Robinhood Stock Token and {s:ETH}. With a Uniswap V3 source, the LP fees too.' },
        { title: 'Snapshot', body: 'Holders and their weights are rebuilt from Transfer logs on chain. Pools, routers, contracts and the dev wallet are excluded. With loyalty on, recent buyers weigh less and sellers restart their clock.' },
        { title: 'Pay each destination', body: 'Stock fees pass through in kind by default: {s:NVDA} in, {s:NVDA} out. When a swap is needed, on Uniswap V2, V3 or V4 or the PONS bonding curve, the price is checked against Yahoo Finance for a stock and DexScreener for a coin: below 90% of it, that leg is paid in {s:ETH} instead, and the receipt says so.' },
        { title: 'Publish', body: 'A receipt per cycle on the dashboard and on the public page of the coin, and a post in the Telegram groups bound to it.' },
      ] },
    ],
  },
  {
    title: 'Telegram alerts for your community',
    id: 'alerts',
    chain: 'robinhood',
    body: [
      `Add ${bot} to your group as an administrator, then send {c:/burns} in the group. It binds the group to your coin: every cycle posts what was paid, and every buyback posts what was burned.`,
      'To move the receipts to another group, or to keep only them, send {c:/announce} followed by the address of your coin in that group. The Telegram section of the dashboard shows which groups are bound.',
    ],
  },
  {
    title: 'Answers to what comes up',
    id: 'answers',
    body: [
      { rows: [
        ['The cycle skipped', 'Less than 0.005 {s:SOL} to route above the reserve, or the wallet is out of SOL for network fees. The dashboard says which.', 'gas'],
        ['A share was paid in SOL', 'The fair-price guard refused a route below 90% of the reference price. Fees never disappear into price impact. On Robinhood Chain the same share is paid in ETH.', 'shield'],
        ['A holder got nothing', 'Their share was worth less than opening a token account, about 0.002 SOL, so they were skipped that cycle. The receipt counts them.', 'holder'],
        ['A page shows "unclaimed"', 'Its owner has not claimed yet. The money is in its vault, visible on its profile, and stays there.', 'vault'],
        ['I want to stop', 'Pause from the bot or the dashboard. Nothing goes out until you resume; the fees keep accruing meanwhile.', 'pause'],
        ['Reading the numbers', 'The public API at {c:/api/v1} answers with the same data the pages show. See the Developers section.', 'code'],
      ] },
      { link: '/#faq', label: 'The full FAQ' },
      { link: '/#developers', label: 'Developers: API and webhooks' },
    ],
  },
];
