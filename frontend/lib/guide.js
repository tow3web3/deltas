// The guide, section by section. Each body item is a paragraph (string, with the
// markers of components/Rich.js), a list of steps ({ steps: [{ title, body, p }] },
// `p` a platform whose logo marks the step), a table ({ rows: [[k, v, kind?]] }),
// a callout ({ note }), a link ({ link, label }), or one of the drawn blocks:
// { flow: true } the route from fees to destinations, { destinations: true } the
// five kinds as cards, { platforms: true } the eight places a page can live.
// What it says is what the product does today: a change in the flow is a change here.
import { BRAND, BOT_USERNAME, BOT_URL } from './brand';

const bot = BOT_USERNAME ? `{c:@${BOT_USERNAME}}` : `the ${BRAND} bot`;

export const GUIDE = [
  {
    title: 'In one minute',
    body: [
      `A coin on Robinhood Chain earns fees on every trade. Its launchpad sends them to the wallet that created the coin, in stock tokens like {s:NVDA} or {s:TSLA}, or in {s:ETH}. ${BRAND} sweeps that wallet on a schedule and pays each destination its share.`,
      { flow: true },
      { destinations: true },
      'Everything is public: the routing, every payment, every vault. Holders can check what the coin promised against what it paid.',
    ],
  },
  {
    title: 'Set up a coin from the dashboard',
    id: 'dashboard',
    body: [
      'Open the dashboard and sign in with the wallet you use for the coin. Signing in is a signature, not a transaction: no gas.',
      { link: '/app', label: 'Open the dashboard' },
      { steps: [
        { title: 'Which wallet created your coin', body: `Two ways. {b:My connected wallet}: ${BRAND} lists the coins it created and makes a dedicated dev wallet for the fees, because a bot cannot sign with your browser wallet. You then set that dev wallet as fee recipient on your launchpad. {b:Import a key}: paste the private key of the wallet that already receives the fees; it becomes the dev wallet, encrypted the moment it arrives.` },
        { title: 'Which coin', body: 'Pick it in the list of coins the wallet created, or paste its contract address. Any ERC-20 on Robinhood Chain works, from any launchpad.' },
        { title: 'Launch with the default', body: 'The default routing is 100% to holders, paid in kind, with loyalty weighting (1x to 2x over 30 days, 24 hours minimum hold) and a cycle at the closing bell, 4:00 pm New York time on weekdays. Nothing moves until fees land in the dev wallet.' },
        { title: 'Draw your routing', body: 'On the canvas, add destinations and give each its share of every cycle. The shares must add up to 100%; {b:Balance the others} does the arithmetic. Save, and the next cycle follows the new routing.' },
      ] },
      { note: 'Use a dedicated wallet as dev wallet, funded with what cycles need. Never your main holdings. The dashboard shows its gas and warns when it runs low.' },
    ],
  },
  {
    title: 'Set up a coin from Telegram',
    id: 'telegram',
    body: [
      `The bot runs the same engine as the dashboard, on the same account. Open ${bot} and send {c:/start}. It walks you through five steps.`,
      ...(BOT_URL ? [{ link: BOT_URL, label: `Open @${BOT_USERNAME} on Telegram` }] : []),
      { rows: [
        ['1. Dev wallet', 'The private key of the wallet that receives the fees. Encrypted on arrival.', 'key'],
        ['2. Your coin', 'Its contract address.', 'coin'],
        ['3. Fee source', 'The dev wallet, or a Uniswap V3 position you hold.', 'source'],
        ['4. The dividend asset', 'What holders receive: the same stock the launchpad paid, one stock of your choice, or any ERC-20.', 'asset'],
        ['5. Schedule', 'Every 1, 2, 5, 10, 30 or 60 minutes, or once a day at the closing bell. Any schedule can be limited to market hours.', 'clock'],
      ] },
      '{c:/status} shows the routing, the last cycle and the next one. Finer routing (several wallets, pages, shares) is drawn on the dashboard canvas, and the bot picks it up.',
    ],
  },
  {
    title: 'Route fees to a page',
    id: 'pages',
    body: [
      'On the canvas, add a destination of kind {b:Page} and paste the link of the page: {c:youtube.com/@channel}, {c:github.com/name}, {c:x.com/handle}, a domain, or a phone number with its country code. The page appears with its picture; give it a share and save.',
      { platforms: true },
      { steps: [
        { title: 'A vault is created', body: 'Each page gets a wallet of its own the moment a coin routes to it. Its address and balance are on the public profile of the page, at {c:/p/<platform>/<name>}, and on chain.' },
        { title: 'Every cycle pays into it', body: 'The share of the page is paid to its vault in the same assets as everyone else: {s:NVDA} in, {s:NVDA} to the vault. Nothing is required from the owner.' },
        { title: 'The owner claims when they want', body: 'They connect the page and a wallet at {l:/claim|/claim}. The vault is emptied to their wallet, and every later cycle pays that wallet directly.' },
      ] },
      'Tell the owner. The profile of the page shows what waits for them; sending them that link is usually enough.',
      { note: 'Routing to a page needs no permission from its owner, and creates no partnership with them. Do not present a page as backing your coin unless its owner says so.' },
    ],
  },
  {
    title: 'Claim a page that receives fees',
    id: 'claim',
    body: [
      'Someone routed fees to your channel, account or site. Here is how to take them. It costs no gas: one platform sign-in and one wallet signature.',
      { link: '/claim', label: 'Go to the claim page' },
      { steps: [
        { title: 'Connect the page', body: `Click your platform. {p:youtube|YouTube}, {p:github|GitHub}, {p:x|X}, {p:instagram|Instagram}, {p:facebook|Facebook}, {p:tiktok|TikTok} and {p:twitch|Twitch} open a sign-in on the platform itself, read only: ${BRAND} sees which pages your account runs and nothing else, and keeps no access afterwards. Your connected pages then appear with what waits in their vault.`, p: 'youtube' },
        { title: 'For a website, add a DNS record', body: 'Type the domain and connect your wallet. The page gives you a TXT record to add on {c:_delta.<yourdomain>}. Once it spreads, usually within minutes, the domain is yours to claim.', p: 'domain' },
        { title: 'For a phone number, a code', body: 'Type the number with its country code and choose {p:phone|WhatsApp} or SMS. A six-digit code arrives; type it, and the number is proved. The site shows the number in part only, and its address is a code of its own, so nobody reads a number off a profile.', p: 'phone' },
        { title: 'Connect the wallet that gets paid', body: 'MetaMask, Rabby or any wallet on Robinhood Chain. Sign the message: it says which page pays which wallet, and nothing else.' },
        { title: 'Receive', body: 'What waited in the vault arrives within minutes. Every later cycle pays your wallet directly. To change the wallet later, sign again from the new one.' },
      ] },
      { note: 'Only the owner of an account can claim its page, and the platform is the one who says who owns it. There is no form, no support ticket and no way around the sign-in.' },
    ],
  },
  {
    title: 'What happens every cycle',
    body: [
      { steps: [
        { title: 'Sweep', body: 'Everything in the dev wallet above a small gas reserve: every Robinhood Stock Token and {s:ETH}. With a Uniswap V3 source, the LP fees too.' },
        { title: 'Snapshot', body: 'Holders and their weights are rebuilt from Transfer logs on chain. Pools, routers, contracts and the dev wallet are excluded. With loyalty on, recent buyers weigh less and sellers restart their clock.' },
        { title: 'Pay each destination', body: 'Stock fees pass through in kind by default: {s:NVDA} in, {s:NVDA} out. When a swap is needed, the price is checked against a fair reference: if no route on Uniswap delivers at least 90% of it, that leg is paid in {s:ETH} instead, and the receipt says so.' },
        { title: 'Publish', body: 'A receipt per cycle on the dashboard and on the public page of the coin, and a post in the Telegram groups bound to it.' },
      ] },
    ],
  },
  {
    title: 'Telegram alerts for your community',
    body: [
      `Add ${bot} to your group as an administrator, then send {c:/burns} in the group. It binds the group to your coin: every cycle posts what was paid, and every buyback posts what was burned.`,
      'To move the receipts to another group, or to keep only them, send {c:/announce} followed by the address of your coin in that group. The Telegram section of the dashboard shows which groups are bound.',
    ],
  },
  {
    title: 'Answers to what comes up',
    body: [
      { rows: [
        ['The cycle skipped', 'Nothing above the gas reserve to sweep, or the dev wallet is out of gas. The dashboard says which.', 'gas'],
        ['A leg was paid in ETH', 'The fair-price guard refused a thin pool. Fees never disappear into price impact.', 'shield'],
        ['A page shows "unclaimed"', 'Its owner has not claimed yet. The money is in its vault, visible on its profile, and stays there.', 'vault'],
        ['I want to stop', 'Pause on the dashboard. Nothing goes out until you resume. Fees keep landing in the dev wallet meanwhile.', 'pause'],
        ['Reading the numbers', 'The public API at {c:/api/v1} answers with the same data the pages show. See the Developers section.', 'code'],
      ] },
      { link: '/#faq', label: 'The full FAQ' },
      { link: '/#developers', label: 'Developers: API and webhooks' },
    ],
  },
];
