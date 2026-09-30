// The text of the privacy and terms pages. Every statement here describes what
// the code does: when the code changes (a new scope, a new cookie, a new thing
// stored), this file changes with it, and UPDATED too.
import { BRAND, SITE_HOST, CONTACT_EMAIL } from './brand';

export const UPDATED = 'September 29, 2026';

export const PRIVACY = [
  {
    title: 'The short version',
    body: [
      `${BRAND} routes the fees of a coin on Robinhood Chain to destinations chosen by its creator, including pages on other platforms. To pay the owner of a page we need to know one thing: that the person claiming it controls it. We read the minimum that answers that question, and nothing else.`,
      [
        'We never post, follow, message or change anything on your accounts. Every access we ask for is read only.',
        'We do not keep the access a platform gives us. It is used once, for a few seconds, then discarded.',
        'We do not run advertising or analytics trackers, and we do not sell or rent data.',
        'Payments happen on a public blockchain. What is written there is public and cannot be erased by anyone, including us.',
      ],
    ],
  },
  {
    title: 'When you connect a page',
    id: 'connect',
    body: [
      'Connecting a page sends you to the platform, which asks you to approve a read-only access. When you come back, we read the identity of the account, then discard the access token. It is never written to our database or to a log.',
      { rows: [
        ['YouTube', 'The channels of the Google account: channel id, handle, title and picture. Scope: youtube.readonly.'],
        ['GitHub', 'The account and the organisations it owns: id, login, name and picture.'],
        ['X', 'The account: id, username, name and picture.'],
        ['Instagram', 'The professional account: id, username, name and picture. Scope: instagram_business_basic.'],
        ['Twitch', 'The channel: id, login, name and picture.'],
        ['Facebook', 'The Pages the account manages: id, username, name and picture.'],
        ['TikTok', 'The account: id, username, name and picture.'],
        ['A domain', 'No sign-in. We look up a public DNS record that you add to the domain.'],
        ['A phone number', 'No sign-in. A six-digit code is sent to the number over WhatsApp or SMS by Twilio, our messaging provider, which sees the number for that purpose. The number is stored in international form, shown to others in part only (+33 • •• •• •• 78), and never placed in an address.'],
      ] },
      'We do not read your videos, posts, messages, followers, e-mail address, contacts, or anything private. The list above is all of it.',
      'What we read is kept in a signed cookie in your browser for 30 minutes, so the page can show what waits for you. The public picture of the page is copied to our server, so its profile here shows its own face. The rest is stored on our side only if you claim, as described below.',
    ],
  },
  {
    title: 'When you claim',
    body: [
      'Claiming binds a page to the wallet that will be paid. At that moment we store:',
      [
        'The platform, the id of the account on that platform, its handle, its display name and the address of its picture.',
        'The address of the wallet you chose, and the time of the claim.',
        'How the page was proved: a platform sign-in, or a DNS record.',
      ],
      'A claimed page and the wallet it pays are shown on the public profile of the page. Payments to it are transactions on Robinhood Chain and are public.',
    ],
  },
  {
    title: 'Google and YouTube',
    id: 'google',
    body: [
      `${BRAND} uses YouTube API Services to confirm that you own a channel. By connecting a channel you also agree to the YouTube Terms of Service, and the Google Privacy Policy applies to the data Google holds.`,
      `${BRAND}'s use and transfer of information received from Google APIs to any other app adheres to the Google API Services User Data Policy, including the Limited Use requirements. The information is used only to identify the channel being claimed. It is not used for advertising, not transferred to others, not used to train models, and not read by a person unless you ask us for help or the law requires it.`,
      { link: 'https://www.youtube.com/t/terms', label: 'YouTube Terms of Service' },
      { link: 'https://policies.google.com/privacy', label: 'Google Privacy Policy' },
      { link: 'https://myaccount.google.com/permissions', label: `Remove ${BRAND}'s access from your Google account` },
    ],
  },
  {
    title: 'Wallets and the dashboard',
    body: [
      'Signing in with a wallet means signing a message. It costs no gas and gives us no ability to move your funds. We store the address of the wallet and keep you signed in with a signed cookie for 30 days.',
      'A creator who sets up routing stores their configuration with us: the coin, the destinations and their shares. If you use the Telegram bot we also store your Telegram user id and username, to know whose configuration it is.',
      `Some wallets are operated by ${BRAND}: the wallet that collects the fees of a coin, and the vault of each page. Their keys are stored encrypted.`,
    ],
  },
  {
    title: 'Cookies and logs',
    body: [
      { rows: [
        ['Sign-in in progress', 'A cookie that lasts ten minutes, to check that the answer of the platform belongs to your request.'],
        ['Connected pages', 'One cookie per platform, lasting 30 minutes, holding the pages you proved. "Disconnect" on the claim page erases it.'],
        ['Wallet session', 'A cookie that lasts 30 days, holding the wallet you signed in with.'],
      ] },
      'These cookies are needed for the site to work, cannot be read by scripts, and are not used to follow you elsewhere. There are no advertising or analytics cookies.',
      'Like any web server, ours records requests: address, time, page and browser. These logs serve to keep the service running and to stop abuse.',
      'Some pictures load from other services: token logos can come from DexScreener, which then sees the request of your browser.',
    ],
  },
  {
    title: 'Who we share with',
    body: [
      'Nobody buys or receives your data. It leaves our server in three cases only:',
      [
        'What a public blockchain requires: addresses and amounts of payments.',
        'What the public profile of a page shows: its name, picture, claim status, the wallet it pays and what it received.',
        'What the law requires of us, when a valid request is made.',
      ],
    ],
  },
  {
    title: 'Delete your data',
    id: 'deletion',
    body: [
      `Write to ${CONTACT_EMAIL} from a contact we can match to the page, or after connecting the page again so we know it is yours. Tell us the platform and the handle. We answer within 30 days.`,
      [
        'We erase the account id, the display name and the picture we hold for the page, and unbind the wallet.',
        'The cookies can be erased at any time from your browser, or with "Disconnect" on the claim page.',
        'The access you approved can be removed on the platform itself, in the settings of your account, under connected apps.',
        'Payments already made stay on the blockchain. The record that a public page received a given amount stays too: it is the accounting of the coin that paid it.',
      ],
    ],
  },
  {
    title: 'Security, age and changes',
    body: [
      'The site is served over HTTPS. Keys are stored encrypted, platform tokens are not stored at all, and cookies are signed so they cannot be forged.',
      `${BRAND} is not meant for anyone under 18, and we do not knowingly collect data from them.`,
      `When this page changes, the date at the top changes with it. A change that widens what we read or keep is announced on ${SITE_HOST} before it applies.`,
    ],
  },
];

export const TERMS = [
  {
    title: 'What the service is',
    body: [
      `${BRAND} is software that routes the fees of a coin on Robinhood Chain to the destinations its creator sets: holders, wallets, buybacks, a treasury, and pages on other platforms. Using ${SITE_HOST} or the Telegram bot means accepting these terms.`,
      `${BRAND} is not a bank, a broker, an exchange or an adviser. Nothing on the site is financial, legal or tax advice.`,
    ],
  },
  {
    title: 'Who can use it',
    body: [
      [
        'You are at least 18 and allowed to use crypto assets where you live.',
        'You are not under sanctions, and not acting for someone who is.',
        'You are responsible for your own wallet, its keys and the taxes on what you receive.',
      ],
    ],
  },
  {
    title: 'Creators',
    body: [
      'A creator decides where the fees of their coin go. Routing to a page is a gift to its owner: it needs no permission from them, and creates no partnership, endorsement or obligation on their side. Do not suggest otherwise.',
      'A destination can be changed or removed by the creator at any time. What was already paid stays paid.',
    ],
  },
  {
    title: 'Page owners',
    body: [
      'Until a page is claimed, what is routed to it is held in a vault, a wallet operated by the service for that page alone. Claiming sends the content of the vault to your wallet and makes later payments direct.',
      [
        'Claim only pages you own or are authorised to represent. A claim made by deceiving us or a platform is void, and we can undo it.',
        'Funds in a vault earn nothing and are held in the assets that were paid, whose price moves.',
        'The wallet you sign with is the one that gets paid. A payment sent to it cannot be recalled.',
        'If you lose control of a page on its platform, whoever controls it can claim it again.',
      ],
    ],
  },
  {
    title: 'Other platforms',
    body: [
      `${BRAND} is not affiliated with, sponsored by or endorsed by YouTube, Google, GitHub, X, Meta, Instagram, Facebook, TikTok, Twitch or Robinhood. Their names say where a page lives or who issues an asset.`,
      'Connecting a page is subject to the terms of its platform. Connecting a YouTube channel means agreeing to the YouTube Terms of Service.',
      { link: 'https://www.youtube.com/t/terms', label: 'YouTube Terms of Service' },
      'Stock Tokens are issued by Robinhood under its own terms. The service only buys and transfers them on chain.',
    ],
  },
  {
    title: 'What you must not do',
    body: [
      [
        'Impersonate a person, a brand or a page, or claim what is not yours.',
        'Use the service to launder funds, evade sanctions or break the law.',
        'Attack, overload or probe the service, or get around its limits.',
        'Use the name of a page or its owner to promote a coin as if they backed it.',
      ],
      'We can suspend a configuration, a claim or an access that breaks these rules.',
    ],
  },
  {
    title: 'Risks',
    body: [
      [
        'Crypto assets can lose all their value. Coins that route fees are often very volatile.',
        'Transactions on a blockchain are final. A payment to a wrong address is lost.',
        'Swaps depend on liquidity that others provide. A cycle can pay less, pay in another asset, or be skipped.',
        'Software has bugs, and the chain, the exchanges and the platforms we depend on can fail or change their rules.',
      ],
    ],
  },
  {
    title: 'No warranty, limited liability',
    body: [
      'The service is provided as it is, without warranty of any kind, as far as the law allows. We do not promise that it will run without interruption or error, or that a fee will be paid at a given time or amount.',
      'As far as the law allows, we are not liable for lost profits, lost assets or indirect damage arising from the use of the service. Nothing here removes rights that the law of your country gives you and that cannot be waived.',
    ],
  },
  {
    title: 'Changes and contact',
    body: [
      `These terms can change. The date at the top changes with them, and continuing to use the service after a change means accepting it. How we handle data is described in the privacy policy.`,
      `Write to ${CONTACT_EMAIL}.`,
    ],
  },
];
