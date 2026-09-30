'use client';

// The API, as a reference you can use on the spot: the endpoints on a rail, the
// selected one on the stage with its parameters, the request in two languages
// and the response. "Run" calls the real endpoint and prints what it answers.
// Below, the launchpad hook: three steps beside the calls and the signed webhook.
import { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Arrow, Check, Copy, External, Play } from './Icons';
import { BRAND, BOT_URL, CONTACT_EMAIL, SITE_URL } from '../lib/brand';
import { STOCKS, getStock } from '../lib/stocks';

const EASE = [0.16, 1, 0.3, 1];
const BASE = SITE_URL;
const TOKEN = '0x322f…3b2d';
const NV = getStock('NVDA');
const NVDA = NV.address;
const json = (o) => JSON.stringify(o, null, 2);

const GROUPS = [
  {
    label: 'Network',
    items: [
      {
        id: 'root', name: 'Index', path: '/api/v1', run: true,
        desc: 'The index of the API: the chain it reads and the endpoints it serves.',
        sample: { name: `${BRAND} Public API`, version: 'v1', chain: { name: 'Robinhood Chain', id: 4663, explorer: 'https://robinhoodchain.blockscout.com' }, endpoints: { stats: { method: 'GET', path: '/api/v1/stats', description: 'Global stats.' } } },
        note: 'Sample trimmed to one endpoint.',
      },
      {
        id: 'stats', name: 'Global stats', path: '/api/v1/stats', run: true,
        desc: 'ETH routed, cycles run, coins routing and the number of stock tokens that can be paid.',
        sample: { ethPaidOut: '8.8600', dividends: 55, activeBots: 1, creators: 1, stocksAvailable: STOCKS.length, timestamp: '2026-09-29T03:09:07.582Z' },
      },
      {
        id: 'activity', name: 'Activity', path: '/api/v1/activity?limit=20', run: true,
        params: [['limit', 'query', 'How many events, 20 by default, 50 at most.']],
        desc: 'The latest events of the network: a coin linked, a dividend paid.',
        sample: { events: [{ type: 'paid', token: TOKEN, tokenSymbol: 'PONS', rewardToken: NVDA, rewardSymbol: 'NVDA', holderCount: 412, airdropped: '42100000000000000', claimedEth: '140000000000000000', time: '2026-09-28T23:46:25.443Z' }], timestamp: '2026-09-29T03:09:10.609Z' },
      },
      {
        id: 'stocks', name: 'Stock registry', path: '/api/v1/stocks', run: true,
        desc: `The ${STOCKS.length} Robinhood Stock Tokens with their addresses, their sector and whether they are liquid today.`,
        sample: { chainId: 4663, count: STOCKS.length, liquid: ['AAPL', 'MSFT', 'NVDA'], stocks: [{ ticker: NV.ticker, name: NV.name, sector: NV.sector, address: NVDA, logo: `${BASE}/logos/stocks/NVDA.png`, liquid: true }] },
        note: 'Sample trimmed: one stock, three liquid tickers. The response also lists the baskets.',
      },
      {
        id: 'launchpads', name: 'Launchpads', path: '/api/v1/launchpads', run: true,
        desc: 'The launchpads that integrated the hook and how many coins each one linked.',
        sample: { count: 1, launchpads: [{ slug: 'your-launchpad', name: 'Your launchpad', website: 'https://yoursite.com', launches: 18, linkedTokens: 7, since: '2026-08-02T10:00:00.000Z' }] },
      },
    ],
  },
  {
    label: 'Coins',
    items: [
      {
        id: 'tokens', name: 'Coins routing', path: '/api/v1/tokens', run: true,
        desc: 'Every coin routing its fees, with its reward, its policy, its schedule and its yield. Sorted by yield.',
        sample: { count: 1, tokens: [{ address: TOKEN, symbol: 'PONS', rewardSymbol: 'NVDA', rewardMode: 'fixed', payoutMode: 'in_kind', policy: { holders: 7000, creator: 2000, burn: 0, treasury: 1000 }, payoutRatio: 70, loyalty: { maxMultiplier: 2, rampDays: 30 }, scheduleLabel: 'at the closing bell', distributions: 31, yieldApy: 12.4, eth30d: 1.284, dashboardUrl: `${BASE}/${TOKEN}`, badgeUrl: `${BASE}/api/badge/${TOKEN}` }], timestamp: '2026-09-29T03:09:22.646Z' },
        note: 'Sample trimmed. Shares are in basis points: 7000 is 70%.',
      },
      {
        id: 'token', name: 'One coin', path: '/api/v1/token/{address}',
        params: [['address', 'path', 'The contract address of the coin on Robinhood Chain.']],
        desc: 'Is a coin linked? If it is: its reward, its split, its schedule, its yield and its last ten cycles. If not, the answer is { "linked": false }.',
        sample: { linked: true, address: TOKEN, rewardToken: NVDA, rewardSymbol: 'NVDA', rewardMode: 'fixed', split: { holders: 7000, creator: 2000, burn: 0, treasury: 1000 }, payoutMode: 'in_kind', schedule: 'at the closing bell', marketHoursOnly: false, active: true, yield: { apy: 12.4, eth30d: 1.284, usd30d: 3412.5, cycles30d: 31, windowDays: 30 }, stats: { feesUsedEth: '1.2840', dividends: 31, holdersPaid: 412, holdersIndexed: 468, lastExecution: '2026-09-28T20:00:04.120Z' }, dashboardUrl: `${BASE}/${TOKEN}` },
        note: 'Sample trimmed: recentExecutions is left out.',
      },
      {
        id: 'badge', name: 'Yield badge', path: '/api/badge/{address}', svg: true,
        params: [['address', 'path', 'The contract address of the coin.'], ['style', 'query', 'Set to reward for the badge that names the reward instead of the yield.']],
        desc: 'An SVG badge with the live dividend yield of a coin, to embed on any site. Cached five minutes.',
        embed: `<a href="${BASE}/${TOKEN}">\n  <img src="${BASE}/api/badge/${TOKEN}" alt="Dividend yield" height="22" />\n</a>`,
      },
    ],
  },
  {
    label: 'Pages',
    items: [
      {
        id: 'pages', name: 'Pages being paid', path: '/api/pages?limit=24', run: true,
        params: [['limit', 'query', 'How many pages, 24 by default.'], ['platform', 'query', 'Only one platform: youtube, github, x, instagram, facebook, tiktok, twitch or domain.'], ['q', 'query', 'Search by name or handle.']],
        desc: 'The directory of pages receiving fees, the most paid first, with the latest payments.',
        sample: { stats: { pages: 5, claimed: 1, payments: 20, routedUsd: 5981.08 }, pages: [{ platform: 'github', platformLabel: 'GitHub', handle: 'your-project', name: 'your-project', url: 'https://github.com/your-project', path: '/p/github/your-project', claimed: true, vault: '0x2222…2222', receivedUsd: 972.92, payments: 4, coins: 1, lastAt: '2026-09-28T23:30:37.752Z' }], recent: [] },
        note: 'Sample trimmed: recent holds the last twelve payments.',
      },
      {
        id: 'page', name: 'One page', path: '/api/pages/{platform}/{handle}',
        params: [['platform', 'path', 'youtube, github, x, instagram, facebook, tiktok, twitch or domain.'], ['handle', 'path', 'The handle on that platform, or the domain name. URL-encoded.']],
        desc: 'What a page received, whether its owner claimed it, and what waits in its vault. Answers 404 while no coin routes fees to it.',
        sample: { platform: 'github', handle: 'your-project', name: 'your-project', path: '/p/github/your-project', claimed: true, vault: '0x2222…2222', receivedUsd: 972.92, payments: 4, coins: 1, claimedWallet: '0x0000…00b2', paidToOwnerUsd: 972.92, vaultBalance: { totalUsd: 57.16, assets: [{ address: '0x0000000000000000000000000000000000000000', symbol: 'ETH', amount: 0.02123, usd: 56.44, isNative: true }] } },
        note: 'Sample trimmed.',
      },
    ],
  },
];
const ENDPOINTS = GROUPS.flatMap((g) => g.items);

/* ---------- a few spans of colour ---------- */
const RULES = {
  json: [[/"(?:\\.|[^"\\])*"(?=\s*:)/, 'text-ink'], [/"(?:\\.|[^"\\])*"/, 'text-hood-700'], [/\b(?:true|false|null)\b/, 'text-orange-700'], [/-?\b\d+(?:\.\d+)?(?:e[+-]?\d+)?\b/, 'text-gold-600'], [/^… .*$/, 'text-mut']],
  sh: [[/'[^']*'|"[^"]*"/, 'text-hood-700'], [/(?<=\s)-{1,2}[A-Za-z]+/, 'text-gold-600'], [/\bcurl\b/, 'text-ink'], [/\\$/, 'text-mut']],
  js: [[/\/\/.*$/, 'text-mut'], [/'[^']*'|`[^`]*`/, 'text-hood-700'], [/\b(?:import|from|const|await|return|if|throw|new)\b/, 'text-orange-700'], [/\b\d+\b/, 'text-gold-600']],
  http: [[/^POST\b/, 'text-gold-600'], [/^[A-Za-z-]+(?=:)/, 'text-ink'], [/sha256=\S+/, 'text-hood-700'], [/#.*$/, 'text-mut']],
  html: [[/"[^"]*"/, 'text-hood-700'], [/<\/?[a-z]+|\/?>/, 'text-orange-700'], [/\b[a-z]+(?==)/, 'text-gold-600']],
};
function paint(text, lang) {
  const rules = RULES[lang];
  if (!rules) return text;
  const re = new RegExp(rules.map(([r]) => `(${r.source})`).join('|'), 'gm');
  const out = [];
  let last = 0;
  let m;
  while ((m = re.exec(text))) {
    if (m[0] === '') { re.lastIndex += 1; continue; }
    if (m.index > last) out.push(text.slice(last, m.index));
    const k = m.slice(1).findIndex((g) => g !== undefined);
    out.push(<span key={m.index} className={rules[k][1]}>{m[0]}</span>);
    last = m.index + m[0].length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

function CopyButton({ text, label = 'Copy', className = '' }) {
  const [done, setDone] = useState(false);
  const copy = async () => {
    try { await navigator.clipboard.writeText(text); setDone(true); setTimeout(() => setDone(false), 1500); } catch { /* ignore */ }
  };
  return (
    <button type="button" onClick={copy} className={`label inline-flex shrink-0 items-center gap-1.5 rounded-md border border-line px-2 py-1 transition-colors hover:border-mut hover:!text-ink ${done ? '!text-hood-600' : ''} ${className}`}>
      {done ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}{done ? 'Copied' : label}
    </button>
  );
}

/** A pane of code: tabs or a title on the left, a status and the copy button on the right. */
function Pane({ tabs, tab, onTab, title, status, blocks, copy, tall = false }) {
  return (
    <div className="overflow-hidden rounded-xl border border-line bg-tape">
      <div className="flex items-center justify-between gap-3 border-b border-line pl-1 pr-2">
        <div className="flex min-w-0 items-center overflow-x-auto">
          {title && <span className="label px-3 py-2.5">{title}</span>}
          {tabs?.map(([key, name]) => (
            <button key={key} type="button" onClick={() => onTab(key)} aria-pressed={tab === key} className={`label relative whitespace-nowrap px-3 py-2.5 transition-colors ${tab === key ? '!text-ink' : 'hover:!text-ink'}`}>
              {name}
              {tab === key && <span className="absolute inset-x-3 bottom-0 h-px bg-hood-500" />}
            </button>
          ))}
        </div>
        <div className="flex shrink-0 items-center gap-3">
          {status}
          <CopyButton text={copy ?? blocks.map((b) => b.text).join('\n\n')} />
        </div>
      </div>
      <pre className={`overflow-auto px-4 py-3.5 font-mono text-[12.5px] leading-[1.7] text-ink/70 ${tall ? 'max-h-[430px]' : 'max-h-[340px]'}`}>
        {blocks.map((b, i) => <code key={i} className="block">{i > 0 && '\n'}{paint(b.text, b.lang)}</code>)}
      </pre>
    </div>
  );
}

const Method = ({ m = 'GET', className = '' }) => <span className={`font-mono text-[10.5px] font-semibold tracking-wider ${m === 'GET' ? 'text-hood-600' : 'text-gold-600'} ${className}`}>{m}</span>;

/** A path with its parameters picked out. */
function Path({ path }) {
  return path.split(/(\{[a-z]+\})/g).map((p, i) => (/^\{/.test(p) ? <span key={i} className="text-gold-600">{p}</span> : <span key={i}>{p}</span>));
}

function requestOf(e, lang) {
  const url = `${BASE}${e.path.replace('{address}', TOKEN).replace('{platform}', 'github').replace('{handle}', 'your-project')}`;
  if (lang === 'sh') return `curl ${url}`;
  if (e.svg) return `const svg = await fetch('${url}').then((r) => r.text());`;
  return `const res = await fetch('${url}');\nconst data = await res.json();`;
}

function clip(text, max = 60) {
  const lines = text.split('\n');
  return lines.length > max ? `${lines.slice(0, max).join('\n')}\n… ${lines.length - max} more lines` : text;
}

function Reference() {
  const [id, setId] = useState('tokens');
  const [lang, setLang] = useState('sh');
  const [live, setLive] = useState({});
  const e = ENDPOINTS.find((x) => x.id === id);
  const got = live[id];

  const run = async () => {
    setLive((l) => ({ ...l, [id]: { loading: true } }));
    const t0 = performance.now();
    try {
      const r = await fetch(e.path, { cache: 'no-store' });
      const raw = await r.text();
      let text = raw;
      try { text = JSON.stringify(JSON.parse(raw), null, 2); } catch { /* not JSON: print as it came */ }
      setLive((l) => ({ ...l, [id]: { status: r.status, ms: Math.round(performance.now() - t0), text: clip(text) } }));
    } catch {
      setLive((l) => ({ ...l, [id]: { status: 0, ms: 0, text: '{ "error": "The request did not go through." }' } }));
    }
  };

  const response = e.svg
    ? { title: 'Embed', blocks: [{ lang: 'html', text: e.embed }] }
    : { title: 'Response', blocks: [{ lang: 'json', text: got?.text || json(e.sample) }] };

  return (
    <div className="frame mt-7 overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-1 border-b border-line px-5 py-2.5">
        <div className="label flex flex-wrap items-center gap-x-4 gap-y-1">
          <span className="text-ink">v1</span>
          <span>base <span className="normal-case tracking-normal text-ink/80">{BASE}</span></span>
          <span className="hidden sm:inline">chain id <span className="text-ink/80">4663</span></span>
          <span className="hidden sm:inline">JSON · CORS open · no key</span>
        </div>
        <a href="/api/v1" target="_blank" rel="noopener noreferrer" className="label group inline-flex items-center gap-1 !text-hood-600">Open the API root <External className="h-3 w-3" /></a>
      </div>

      <div className="grid lg:grid-cols-[270px_minmax(0,1fr)] lg:divide-x lg:divide-line">
        {/* the rail */}
        <nav aria-label="Endpoints" className="flex gap-1 overflow-x-auto border-b border-line px-3 py-2 lg:block lg:overflow-visible lg:border-b-0 lg:p-0 lg:pb-3">
          {GROUPS.map((g) => (
            <div key={g.label} className="flex gap-1 lg:block">
              <div className="label hidden px-5 pb-1.5 pt-4 !text-[9.5px] lg:block">{g.label}</div>
              {g.items.map((x) => {
                const on = x.id === id;
                return (
                  <button key={x.id} type="button" onClick={() => setId(x.id)} aria-current={on} className={`relative shrink-0 rounded-lg px-3 py-2 text-left transition-colors lg:block lg:w-full lg:rounded-none lg:px-5 ${on ? 'bg-tile/70' : 'hover:bg-tile/30'}`}>
                    {on && <motion.span layoutId="dev-endpoint" className="absolute inset-y-2 left-0 hidden w-[2px] rounded-full bg-hood-500 lg:block" transition={{ duration: 0.3, ease: EASE }} />}
                    <span className={`block whitespace-nowrap text-[13px] ${on ? 'font-semibold text-ink' : 'text-ink/75'}`}>{x.name}</span>
                    <span className="mt-0.5 hidden items-center gap-1.5 font-mono text-[11px] text-mut lg:flex"><Method className="!text-[9.5px]" /><span className="truncate">{x.path.split('?')[0]}</span></span>
                  </button>
                );
              })}
            </div>
          ))}
        </nav>

        {/* the stage */}
        <AnimatePresence mode="wait" initial={false}>
          <motion.div key={id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.25, ease: EASE }} className="min-w-0 p-5 sm:p-6">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
              <Method className="rounded border border-hood-300 bg-hood-50 px-1.5 py-0.5" />
              <code className="min-w-0 break-all font-mono text-[15px] text-ink"><Path path={e.path} /></code>
              <span className="ml-auto flex items-center gap-2">
                <CopyButton text={`${BASE}${e.path}`} label="Copy URL" />
                {e.run && (
                  <button type="button" onClick={run} disabled={got?.loading} className="label inline-flex items-center gap-1.5 rounded-md border border-hood-300 bg-hood-50 px-2 py-1 !text-hood-600 transition-colors hover:border-hood-500 disabled:opacity-60">
                    <Play className="h-2.5 w-2.5" />{got?.loading ? 'Running' : 'Run'}
                  </button>
                )}
              </span>
            </div>
            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-mut">{e.desc}</p>

            {e.params && (
              <dl className="mt-4 divide-y divide-line border-y border-line">
                {e.params.map(([name, where, what]) => (
                  <div key={name} className="grid grid-cols-[110px_1fr] gap-x-4 gap-y-0.5 py-2 sm:grid-cols-[110px_60px_1fr]">
                    <dt className="font-mono text-[12.5px] text-gold-600">{name}</dt>
                    <dd className="label self-center !text-[9.5px]">{where}</dd>
                    <dd className="col-span-2 text-[13px] text-mut sm:col-span-1">{what}</dd>
                  </div>
                ))}
              </dl>
            )}

            <div className="mt-5 space-y-3">
              <Pane tabs={[['sh', 'curl'], ['js', 'JavaScript']]} tab={lang} onTab={setLang} blocks={[{ lang, text: requestOf(e, lang) }]} />
              <Pane
                title={response.title}
                blocks={response.blocks}
                status={e.svg ? null : got?.text
                  ? <span className={`label flex items-center gap-1.5 ${got.status === 200 ? '!text-hood-600' : '!text-down'}`}><span className={`h-1.5 w-1.5 rounded-full ${got.status === 200 ? 'bg-hood-500' : 'bg-down'}`} />{got.status || 'failed'} · {got.ms} ms · live</span>
                  : <span className="label"><span className="text-hood-600">200</span> · sample</span>}
              />
              {e.note && !got?.text && <p className="text-xs text-mut">{e.note}</p>}
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

/* ---------- the launchpad hook ---------- */
const HOOK = {
  create: [
    { lang: 'sh', text: `curl -X POST ${BASE}/api/v1/hooks/launch \\\n  -H "Authorization: Bearer bmr_…" \\\n  -H "Content-Type: application/json" \\\n  -d '{
    "token": "${TOKEN}",
    "creatorWallet": "0xaC97…030b",
    "feeSource": "wallet",
    "reward": "NVDA"
  }'` },
    { lang: 'json', text: json({ code: 'K7Q2MX4P', status: 'pending', token: { address: TOKEN, symbol: 'PONS', name: 'Pons' }, telegramUrl: `${BOT_URL || 'https://t.me/<bot>'}?start=l_K7Q2MX4P`, dashboardUrl: `${BASE}/${TOKEN}`, badgeUrl: `${BASE}/api/badge/${TOKEN}`, statusUrl: `${BASE}/api/v1/hooks/launch?code=K7Q2MX4P` }) },
  ],
  status: [
    { lang: 'sh', text: `curl ${BASE}/api/v1/hooks/launch?code=K7Q2MX4P` },
    { lang: 'json', text: json({ code: 'K7Q2MX4P', status: 'linked', token: TOKEN, launchpad: 'your-launchpad', createdAt: '2026-09-28T18:02:11.000Z', linkedAt: '2026-09-28T18:05:40.000Z', config: { active: true, rewardMode: 'fixed', rewardToken: NVDA, scheduleKind: 'closing_bell', intervalMinutes: null }, dashboardUrl: `${BASE}/${TOKEN}`, badgeUrl: `${BASE}/api/badge/${TOKEN}` }) },
  ],
  webhook: [
    { lang: 'http', text: 'POST https://yoursite.com/webhooks/delta\nContent-Type: application/json\nX-Delta-Event: dividend.paid\nX-Delta-Signature: sha256=9f2c41…e07b\nUser-Agent: DELTA-Webhooks/1.0' },
    { lang: 'json', text: json({ event: 'dividend.paid', sentAt: '2026-09-28T20:00:09.412Z', token: TOKEN, launchCode: 'K7Q2MX4P', executionId: 1204, asset: { address: NVDA, symbol: 'NVDA', amount: '60142857142857142', valueWei: '140000000000000000' }, reward: { address: NVDA, symbol: 'NVDA', decimals: 18, isStock: true, mode: 'fixed', note: null }, amount: '42100000000000000', holdersPaid: 412, holdersEligible: 468, txHash: '0xc16a…af39', receiptUrl: `${BASE}/receipt/1204`, dashboardUrl: `${BASE}/${TOKEN}`, badgeUrl: `${BASE}/api/badge/${TOKEN}` }) },
  ],
  verify: [
    { lang: 'js', text: `import crypto from 'node:crypto';\n\n// HMAC-SHA256 over the raw body, with the webhook secret of your launchpad.\nconst expected = 'sha256=' + crypto.createHmac('sha256', WEBHOOK_SECRET).update(rawBody).digest('hex');\nconst received = req.headers['x-delta-signature'];\n\nconst ok = received.length === expected.length\n  && crypto.timingSafeEqual(Buffer.from(received), Buffer.from(expected));\nif (!ok) throw new Error('Bad signature');` },
  ],
};
const HOOK_TABS = [['create', 'Create the link'], ['status', 'Poll the status'], ['webhook', 'Webhook'], ['verify', 'Verify']];

const STEPS = [
  { tab: 'create', call: 'POST /api/v1/hooks/launch', title: 'Send the launch', body: <>Send the token address, plus the creator wallet and fee source if you know them. You get back <code className="font-mono text-[12.5px] text-ink">telegramUrl</code>, <code className="font-mono text-[12.5px] text-ink">dashboardUrl</code> and <code className="font-mono text-[12.5px] text-ink">badgeUrl</code>.</> },
  { tab: 'status', call: 'telegramUrl', title: 'Show the link', body: 'The creator opens Telegram, sends the dev key, picks a stock and a schedule. Token and fee source are already filled in.' },
  { tab: 'webhook', call: 'token.linked · dividend.paid', title: 'Receive webhooks', body: <>HMAC-signed with <code className="font-mono text-[12.5px] text-ink">X-Delta-Signature</code>. Poll <code className="font-mono text-[12.5px] text-ink">GET ?code=</code> if you prefer.</> },
];

function Launchpads() {
  const [tab, setTab] = useState('create');
  return (
    <div id="launchpads" className="frame mt-3 grid scroll-mt-20 overflow-hidden lg:grid-cols-12 lg:divide-x lg:divide-line">
      <div className="flex flex-col p-6 lg:col-span-5">
        <div className="label !text-gold-600">For launchpads</div>
        <h3 className="mt-2 font-display text-2xl font-medium leading-tight tracking-tight text-ink">Your creators earn stocks. Make their holders earn them too.</h3>
        <p className="mt-3 text-sm leading-relaxed text-mut">You already pay creators in stock tokens. One call per launch adds fee routing on top: the creator gets a Telegram link that pre-fills the setup, you get a signed webhook for every dividend, a yield badge and a balance sheet for the token page.</p>

        <ol className="mt-6 flex-1">
          {STEPS.map((s, i) => {
            const on = s.tab === tab || (tab === 'verify' && s.tab === 'webhook');
            return (
              <li key={s.title} className="relative pb-5 pl-9 last:pb-0">
                {i < STEPS.length - 1 && <span className="absolute bottom-0 left-[11px] top-7 w-px bg-line" />}
                <span className={`figure absolute left-0 top-0 flex h-[23px] w-[23px] items-center justify-center rounded-full border text-[11px] transition-colors ${on ? 'border-gold-400 text-gold-600' : 'border-line text-mut'}`}>{i + 1}</span>
                <button type="button" onClick={() => setTab(s.tab)} className="group text-left">
                  <span className="flex flex-wrap items-baseline gap-x-2.5">
                    <span className="text-[15px] font-semibold text-ink">{s.title}</span>
                    <span className="font-mono text-[11px] text-gold-600">{s.call}</span>
                  </span>
                </button>
                <p className="mt-1 text-sm leading-relaxed text-mut">{s.body}</p>
              </li>
            );
          })}
        </ol>

        <div className="mt-6 flex flex-wrap items-center gap-x-4 gap-y-3 border-t border-line pt-5">
          <a href={`mailto:${CONTACT_EMAIL}?subject=Launchpad%20integration`} className="btn-ink !py-2 text-xs">Request an API key <Arrow className="h-3.5 w-3.5" /></a>
          <p className="w-full text-xs leading-relaxed text-mut">No API key? Any site can still link <code className="break-words font-mono text-ink/80">{BOT_URL || 'https://t.me/<bot>'}?start=t_&lt;tokenAddress&gt;</code> to pre-fill the token.</p>
        </div>
      </div>

      <div className="min-w-0 border-t border-line p-4 sm:p-5 lg:col-span-7 lg:border-t-0">
        <Pane tall tabs={HOOK_TABS} tab={tab} onTab={setTab} blocks={HOOK[tab]} copy={HOOK[tab][0].text} />
        <p className="mt-3 text-xs leading-relaxed text-mut">Each event is a JSON POST, signed over the raw body. Delivery is best effort with one retry, and a failed delivery never affects the cycle.</p>
      </div>
    </div>
  );
}

export default function Developers() {
  return (
    <div id="developers" className="scroll-mt-20">
      <div className="grid items-end gap-6 lg:grid-cols-[1fr_auto]">
        <div className="max-w-2xl">
          <div className="eyebrow mb-3">Developers</div>
          <h2 className="font-display text-3xl font-medium tracking-tight text-ink sm:text-4xl">Build on {BRAND}</h2>
          <p className="mt-3 text-[15px] leading-relaxed text-mut">A free, public, read-only API. No key required. Query token links, payouts, live stats, the stock registry and the pages being paid.</p>
        </div>
        <dl className="flex gap-8 lg:text-right">
          <div><dd className="figure font-display text-3xl font-medium tracking-tight text-ink">{ENDPOINTS.length}</dd><dt className="label mt-0.5">endpoints</dt></div>
          <div><dd className="figure font-display text-3xl font-medium tracking-tight text-ink">0</dd><dt className="label mt-0.5">keys needed</dt></div>
        </dl>
      </div>
      <Reference />
      <Launchpads />
    </div>
  );
}
