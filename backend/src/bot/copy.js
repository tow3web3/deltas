// Every screen the bot shows, in one place. Markdown (Telegram legacy flavour):
// *bold*, _italic_, `code`. Keep lines short: phones read this.
import { BRAND, SITE_URL, X_URL, COMMUNITY_URL } from '../brand.js';

export const links = {
  site: () => SITE_URL,
  dashboard: () => `${SITE_URL}/app`,
  stocks: () => `${SITE_URL}/stocks`,
  pages: () => `${SITE_URL}/pages`,
  claim: () => `${SITE_URL}/claim`,
  community: () => COMMUNITY_URL,
  x: () => X_URL,
  docs: () => `${SITE_URL}/#how`,
};

// Where a page can live. Pages are added on the web canvas, never in the bot.
const PLATFORMS = 'YouTube, GitHub, X, Instagram, Facebook, TikTok, Twitch, a domain, a phone number';

export const welcome = () =>
  `🔀 *${BRAND}*\n_Route your coin's creator fees anywhere. Solana first, Robinhood Chain too._\n\n` +
  `Your pump.fun coin earns a creator fee on every trade. ${BRAND} collects it and decides where it goes, every cycle:\n\n` +
  `🎁 a share to your holders, paid in SOL, in an xStock (NVDAx, SPYx…) or any token\n` +
  `👤 a share to you, or to a partner wallet\n` +
  `🔥 a buyback that burns supply\n` +
  `🏦 a treasury in real stocks, with a published book value\n` +
  `🌐 a share to any page on the internet: ${PLATFORMS}\n\n` +
  `Pages are added on the web canvas (${links.dashboard()}), not in this bot. Everything else can be set up right here. This bot is your remote: status, receipts, changes on the go.\n\n` +
  `Pick a door 👇`;

export const welcomeBack = (config, shortAddr, scheduleLabel) =>
  `🔀 *Welcome back*\n\n` +
  `Your policy is ${config.is_active ? '🟢 *running*' : '⏸️ *paused*'}: holders of \`${shortAddr}\` are paid ${scheduleLabel}.\n\n` +
  `What do you want to do?`;

export const menu = (config) =>
  config
    ? `🔀 *Menu*\n\nPolicy ${config.is_active ? '🟢 running' : '⏸️ paused'}. Everything below is also on the canvas, with sliders. Pages are added there.`
    : `🔀 *Menu*\n\nTwo ways to start: the canvas on the web, or the guided setup here.`;

export const help = () =>
  `❓ *Help*\n\n` +
  `*Commands*\n` +
  `/start · menu\n` +
  `/setup · guided setup, five steps\n` +
  `/status · wallet, schedule, last cycle\n` +
  `/dashboard · open the canvas\n` +
  `/stocks · the stocks a coin can pay out\n` +
  `/announce · post receipts in a group (send it inside the group)\n` +
  `/burns · post every burn of a token in a group\n` +
  `/faq · questions people ask\n` +
  `/community · the ${BRAND} group\n\n` +
  `*The loop, in one breath*\n` +
  `On schedule, ${BRAND} collects the creator fees (pump.fun on Solana), sweeps the dev wallet, splits it according to your routing, pays holders, wallets and pages, and posts a receipt.\n\n` +
  `*What this bot does*\n` +
  `Setup, shares for holders, wallets, buyback and burn and the treasury, reward mode, record date, schedule, pause and resume, receipts and alerts.\n\n` +
  `*What lives on the canvas only*\n` +
  `Routing to a page (${PLATFORMS}) is added on the web canvas: ${links.dashboard()}. The canvas is also the full editor: drag legs, pick payout assets, see holdings and cycles.\n\n` +
  `*Safety*\n` +
  `🔐 Keys are AES-256 encrypted, decrypted in memory only, at run time.\n` +
  `⚖️ Every swap is checked against the real market price (Jupiter on Solana). Below 90% of it, no swap: that leg pays in SOL or in kind instead.\n` +
  `⏸️ Pause, resume or delete anytime.`;

export const howItWorks = () =>
  `📖 *How ${BRAND} works*\n\n` +
  `*1. Fees land*\nOn Solana, pump.fun sets a creator fee aside on every trade of your coin; ${BRAND} collects it into your dev wallet each cycle. On Robinhood Chain, your launchpad pays the dev wallet in ETH and Stock Tokens.\n\n` +
  `*2. You draw the routing*\nOn the canvas (${links.dashboard()}) fees flow from the dev wallet to as many legs as you want, each with a share:\n` +
  `🎁 Holders, the dividend\n👤 Wallets: you, a partner, marketing, a DAO\n🔥 Buyback & burn of your own token\n🏦 Treasury: retained earnings in stocks, book value published\n🌐 Pages: ${PLATFORMS} (canvas only)\n\n` +
  `*3. You pick the payout*\nEach leg pays in SOL, or converts on Jupiter into an xStock (NVDAx, SPYx, GLDx…) or any token by mint. On Robinhood Chain: in kind, a Stock Token, ETH or any ERC-20.\n\n` +
  `*4. You set the rules*\n🏅 Record date: weight ramps 1x to 2x over 30 days, minimum hold, selling resets the clock\n🔔 Schedule: every 1 to 60 minutes, or the closing bell (4:00 pm New York), market hours only if you want\n🎛️ The reward: fixed, stock roulette, top gainer, portfolio baskets, or a holder vote\n\n` +
  `*5. It runs*\nEvery cycle: sweep, split, pay, receipt in your group with a Share on X button. A page's share goes to its vault until the owner claims it. Holders get a statement page, your coin gets a public page with its yield.\n\n` +
  `Ready? Tap *Set up* here, or open the canvas.`;

export const faqPages = () => [
  `❓ *FAQ · 1/4 · money*\n\n` +
  `*Where do the fees come from?*\nOn Solana, from pump.fun: every trade of your coin sets a creator fee aside for its creator wallet, and ${BRAND} collects it each cycle. On Robinhood Chain, from your launchpad into the dev wallet. ${BRAND} only routes what lands there.\n\n` +
  `*Where can the fees go?*\nTo holders, to wallets, to a buyback and burn, to a treasury, and to any page on the internet. Each leg has its own share.\n\n` +
  `*What can holders be paid in?*\nOn Solana: SOL, an xStock (tokenized stocks and ETFs: NVDAx, SPYx, GLDx and about 1,170 more) or any token by mint, swapped on Jupiter. On Robinhood Chain: in kind, a Stock Token, ETH or any ERC-20.\n\n` +
  `*What is the fair-price guard?*\nEvery swap is compared with the real market price (Jupiter's price on Solana; Yahoo Finance and DexScreener on Robinhood Chain). Below 90% of fair value, no swap: that share is paid in SOL or in kind that cycle, and the receipt says so.\n\n` +
  `*How fast are holders paid?*\nOn Solana, about 18 holders per transaction: a hundred holders take a few seconds. A holder whose share is worth less than opening a token account (about 0.002 SOL) is skipped that cycle when paying in a token.`,

  `❓ *FAQ · 2/4 · pages*\n\n` +
  `*How do pages, vaults and claiming work?*\n` +
  `A page is a YouTube channel, a GitHub account, an X, Instagram, TikTok or Twitch account, a Facebook page, a domain or a phone number. You add it as a leg on the web canvas (${links.dashboard()}), not in this bot.\n\n` +
  `Each page gets its own vault, one per chain: a wallet ${BRAND} creates for that page, with its key encrypted at rest like a dev wallet. Every cycle the page's share is sent to the vault. Anyone can see the vault and its balance on the page's public profile, for example ${links.site()}/p/github/your-project. The directory of pages receiving fees is at ${links.pages()}.\n\n` +
  `The owner of the page claims at ${links.claim()}: they sign in with the platform (Google for YouTube, or GitHub, X, Instagram, Facebook, TikTok, Twitch), add a DNS TXT record for a domain, or type the code sent by WhatsApp or SMS for a phone number, then connect a wallet. The vault is swept to that wallet. After that, every cycle pays that wallet directly.\n\n` +
  `The owner does not need to know about ${BRAND} beforehand. The funds wait in the vault until they are claimed.`,

  `❓ *FAQ · 3/4 · holders*\n\n` +
  `*Who counts as a holder?*\nReal wallets only. Pools, routers, the token contract and other contracts are excluded automatically.\n\n` +
  `*How is the dividend split?*\nBy balance, times a loyalty multiplier when the record date is on: 1x for a new wallet up to 2x after 30 days of holding. A minimum hold can be required. Selling resets the clock.\n\n` +
  `*Can snipers farm it?*\nA wallet that bought minutes before the cycle weighs 1x or is below the minimum hold. A wallet that held a month weighs 2x. Same bag, half the say.\n\n` +
  `*What is the holder vote?*\nA reward mode. Holders sign a gasless vote on the public page, weighted like the dividend. The winner is the next cycle's payout asset.\n\n` +
  `*How do holders see what they earned?*\nEvery cycle posts a receipt card here (send /announce in your group). Every wallet has a statement page on the site.`,

  `❓ *FAQ · 4/4 · safety and control*\n\n` +
  `*Are my funds safe?*\nThe dev wallet key is AES-256 encrypted at rest and decrypted in memory at run time. Use a dedicated wallet, never your main one. ${BRAND} can collect the creator fees, swap (Jupiter on Solana, Uniswap on Robinhood Chain) and send to the legs you drew. Nothing else.\n\n` +
  `*Can I change the policy later?*\nAnytime. Sliders on the canvas, buttons here. The next cycle follows the new routing.\n\n` +
  `*Can I stop?*\nPause, resume or delete from the menu. Deleting removes the bot's access to the wallet; move the funds out first.\n\n` +
  `*Bot or canvas?*\nBoth, same account. Link them from the dashboard (Telegram remote) and every cycle's result arrives here. Pages are the one thing you add on the canvas only.\n\n` +
  `*I run a launchpad. Can I plug in?*\nYes: one link and a token lands in ${BRAND} already configured. Docs at ${links.site()}/#developers.`,
];

export const announceHelp = () =>
  `📣 *Receipts in your group*\n\n` +
  `1. Add this bot to your holders' group.\n` +
  `2. Send */announce* in the group (as the creator of the policy).\n` +
  `3. Every dividend posts a receipt card there, with the amount, the wallets paid and a Share on X button.\n\n` +
  `Topics are supported: send /announce inside the topic you want.\n\n` +
  `🔥 Burns too: send */burns* in the group and every buyback & burn posts there, with the share of supply burned and the transaction.`;

export const stocksIntro = (count, liquid) =>
  `📈 *${count} Robinhood Stock Tokens*\n\nAny of them can be a dividend. The liquid ones fill at fair value today:\n\`${liquid}\`\n\nThe full list, by sector, with addresses: ${links.stocks()}\n\n`;
