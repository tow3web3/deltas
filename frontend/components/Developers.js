'use client';

// The API, as a reference you can use on the spot: the endpoints on a rail, the
// selected one on the stage with its parameters, the request in two languages
// and the response, in dark glass panes set in mono. "Run" calls the real
// endpoint and prints what it answers. The samples are a pump.fun coin paying
// its holders in NVDAx; the one Robinhood Chain example is the launchpad hook
// below, with its signed webhooks.
import { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Arrow, Check, Copy, External, Play } from './Icons';
import { BRAND, BOT_URL, CONTACT_EMAIL, SITE_URL } from '../lib/brand';
import { STOCKS, getStock } from '../lib/stocks';
import { getXStock } from '../lib/xstocks';

const EASE = [0.16, 1, 0.3, 1];
const BASE = SITE_URL;
const json = (o) => JSON.stringify(o, null, 2);

// Solana: a pump.fun coin (its mint ends in "pump", shortened here), paying NVDAx.
const MINT = '9xQe…pump';
const SOL_MINT = 'So11111111111111111111111111111111111111112';
const NVX = getXStock('NVDA');
const NVDAX = NVX.mint;
const VAULT = '5Hd2…Vq8n';
// Robinhood Chain: a coin from a launchpad there, paying the NVDA stock token.
const RH_TOKEN = '0x322f…3b2d';
const RH_NVDA = getStock('NVDA').address;

const GROUPS = [
  {
    label: 'Network',
    items: [
      {
        id: 'root', name: 'Index', path: '/api/v1', run: true,
        desc: 'The index of the API: its version and the endpoints it serves.',
        sample: { name: `${BRAND} Public API`, version: 'v1', chains: [{ key: 'solana', name: 'Solana', native: 'SOL' }, { key: 'robinhood', name: 'Robinhood Chain', id: 4663, native: 'ETH' }], endpoints: { tokens: { method: 'GET', path: '/api/v1/tokens', description: 'Every token with an active bot.' } } },
        note: 'Sample trimmed to one endpoint.',
      },
      {
        id: 'stats', name: 'Global stats', path: '/api/v1/stats', run: true,
        desc: 'The totals of the network: cycles that paid holders, coins routing, creators, the SOL routed on Solana and the ETH on Robinhood Chain, and how many xStocks and stock tokens can be paid.',
        sample: { solPaidOut: '142.3100', ethPaidOut: '8.8600', dividends: 58, activeBots: 3, creators: 3, xStocksAvailable: 1171, stocksAvailable: STOCKS.length, timestamp: '2026-09-30T14:32:07.582Z' },
      },
      {
        id: 'activity', name: 'Activity', path: '/api/v1/activity?limit=20', run: true,
        params: [['limit', 'query', 'How many events, 20 by default, 50 at most.']],
        desc: 'The latest events of the network, both chains: a coin linked, holders paid.',
        sample: { events: [{ type: 'paid', token: MINT, tokenSymbol: 'COIN', rewardToken: NVDAX, rewardSymbol: 'NVDAx', holderCount: 412, airdropped: '279300000', claimedEth: '4820000000', time: '2026-09-30T14:32:04.443Z' }], timestamp: '2026-09-30T14:33:10.609Z' },
        note: 'On Solana the amounts are raw units: claimedEth holds lamports (4820000000 is 4.82 SOL), airdropped the reward\'s own units (8 decimals for an xStock).',
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
        desc: 'Every coin routing its fees, on Solana and Robinhood Chain, with its reward, its split and its schedule. Sorted by yield.',
        sample: { count: 1, tokens: [{ address: MINT, name: 'Your coin', symbol: 'COIN', rewardToken: NVDAX, rewardSymbol: 'NVDAx', rewardMode: 'fixed', policy: { holders: 7000, creator: 1000, burn: 1000, treasury: 1000 }, payoutRatio: 70, intervalMinutes: 10, scheduleLabel: 'every 10 min', marketHoursOnly: false, distributions: 31, yieldApy: 12.4, eth30d: 31.6, native: 'SOL', lastExecution: '2026-09-30T14:32:04.120Z', dashboardUrl: `${BASE}/${MINT}`, badgeUrl: `${BASE}/api/badge/${MINT}` }], timestamp: '2026-09-30T14:33:22.646Z' },
        note: 'Sample trimmed. Shares are in basis points: 7000 is 70%. eth30d counts the chain currency of the coin, named in native: SOL here.',
      },
      {
        id: 'token', name: 'One coin', path: '/api/v1/token/{address}',
        params: [['address', 'path', 'The mint of the coin on Solana, or its 0x address on Robinhood Chain.']],
        desc: 'Is a coin linked? If it is: its reward, its split, its schedule and its last ten cycles. If not, the answer is { "linked": false }.',
        sample: { linked: true, address: MINT, rewardToken: NVDAX, rewardSymbol: 'NVDAx', rewardMode: 'fixed', split: { holders: 7000, creator: 1000, burn: 1000, treasury: 1000 }, schedule: 'every 10 min', marketHoursOnly: false, active: true, stats: { dividends: 31, holdersPaid: 412, lastExecution: '2026-09-30T14:32:04.120Z' }, dashboardUrl: `${BASE}/${MINT}` },
        note: 'Sample trimmed: yield, part of stats and recentExecutions are left out.',
      },
      {
        id: 'badge', name: 'Yield badge', path: '/api/badge/{address}', svg: true,
        params: [['address', 'path', 'The mint of the coin, or its 0x address.'], ['style', 'query', 'Set to reward for the badge that names the reward instead of the yield.']],
        desc: 'An SVG badge with the live yield of a coin, to embed on any site. Cached five minutes.',
        embed: `<a href="${BASE}/${MINT}">\n  <img src="${BASE}/api/badge/${MINT}" alt="Dividend yield" height="22" />\n</a>`,
      },
    ],
  },
  {
    label: 'Pages',
    items: [
      {
        id: 'pages', name: 'Pages being paid', path: '/api/pages?limit=24', run: true,
        params: [['limit', 'query', 'How many pages, 24 by default.'], ['platform', 'query', 'Only one platform: youtube, github, x, instagram, facebook, tiktok, twitch, domain or phone.'], ['q', 'query', 'Search by name or handle.']],
        desc: 'The directory of pages receiving fees, the most paid first, with the latest payments.',
        sample: { stats: { pages: 5, claimed: 1, payments: 20, routedUsd: 5981.08 }, pages: [{ platform: 'github', platformLabel: 'GitHub', handle: 'your-project', name: 'your-project', url: 'https://github.com/your-project', path: '/p/github/your-project', claimed: false, vault: VAULT, receivedUsd: 972.92, payments: 4, coins: 1, lastAt: '2026-09-30T14:32:05.752Z' }], recent: [] },
        note: 'Sample trimmed: recent holds the last twelve payments.',
      },
      {
        id: 'page', name: 'One page', path: '/api/pages/{platform}/{handle}',
        params: [['platform', 'path', 'youtube, github, x, instagram, facebook, tiktok, twitch, domain or phone.'], ['handle', 'path', 'The handle on that platform, or the domain name, URL-encoded. A phone page answers to its own code only, never to the number.']],
        desc: 'What a page received, whether its owner claimed it, and what waits in its vault. Answers 404 while no coin routes fees to it.',
        sample: { platform: 'github', handle: 'your-project', name: 'your-project', path: '/p/github/your-project', claimed: false, vault: VAULT, receivedUsd: 972.92, payments: 4, coins: 1, claimedWallet: null, vaultBalance: { totalUsd: 46.88, assets: [{ address: SOL_MINT, symbol: 'SOL', amount: 0.3125, usd: 46.88, isNative: true }] } },
        note: 'Sample trimmed: received, sources and payouts are left out.',
      },
    ],
  },
  {
    label: 'Robinhood Chain',
    items: [
      {
        id: 'stocks', name: 'Stock registry', path: '/api/v1/stocks', run: true,
        desc: `The ${STOCKS.length} Robinhood Stock Tokens on Robinhood Chain, with their addresses, their sector and whether they are liquid today.`,
        sample: { chainId: 4663, count: STOCKS.length, liquid: ['AAPL', 'MSFT', 'NVDA'], stocks: [{ ticker: 'NVDA', name: getStock('NVDA').name, sector: getStock('NVDA').sector, address: RH_NVDA, logo: `${BASE}/logos/stocks/NVDA.png`, liquid: true }] },
        note: 'Sample trimmed: one stock, three liquid tickers. The response also lists the baskets.',
      },
    ],
  },
];
const ENDPOINTS = GROUPS.flatMap((g) => g.items);

/* ---------- a few spans of colour ---------- */
const RULES = {
  json: [[/"(?:\\.|[^"\\])*"(?=\s*:)/, 'text-ink'], [/"(?:\\.|[^"\\])*"/, 'text-hood-700'], [/\b(?:true|false|null)\b/, 'text-violet-700'], [/-?\b\d+(?:\.\d+)?(?:e[+-]?\d+)?\b/, 'text-cyan-500'], [/^… .*$/, 'text-dim']],
  sh: [[/'[^']*'|"[^"]*"/, 'text-hood-700'], [/(?<=\s)-{1,2}[A-Za-z]+/, 'text-cyan-500'], [/\bcurl\b/, 'text-ink'], [/\\$/, 'text-dim']],
  js: [[/\/\/.*$/, 'text-dim'], [/'[^']*'|`[^`]*`/, 'text-hood-700'], [/\b(?:import|from|const|await|return|if|throw|new)\b/, 'text-violet-700'], [/\b\d+\b/, 'text-cyan-500']],
  http: [[/^POST\b/, 'text-violet-700'], [/^X-Deltas-[A-Za-z]+(?=:)/, 'text-cyan-500'], [/^[A-Za-z-]+(?=:)/, 'text-ink'], [/sha256=\S+/, 'text-hood-700'], [/#.*$/, 'text-dim']],
  html: [[/"[^"]*"/, 'text-hood-700'], [/<\/?[a-z]+|\/?>/, 'text-violet-700'], [/\b[a-z]+(?==)/, 'text-cyan-500']],
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
    <button type="button" onClick={copy} className={`label inline-flex shrink-0 items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 transition-colors hover:border-cyan-500/50 hover:!text-ink ${done ? '!text-cyan-500' : ''} ${className}`}>
      {done ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}{done ? 'Copied' : label}
    </button>
  );
}

/** A pane of code in dark glass: tabs or a title on the left, a status and the copy button on the right. */
function Pane({ tabs, tab, onTab, title, status, blocks, copy, tall = false }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-white/10 bg-[rgba(3,5,8,0.78)] shadow-soft backdrop-blur-md">
      <div className="flex items-center justify-between gap-3 border-b border-white/10 pl-1 pr-2">
        <div className="flex min-w-0 items-center overflow-x-auto">
          {title && <span className="label px-3 py-2.5">{title}</span>}
          {tabs?.map(([key, name]) => (
            <button key={key} type="button" onClick={() => onTab(key)} aria-pressed={tab === key} className={`label relative whitespace-nowrap px-3 py-2.5 transition-colors ${tab === key ? '!text-ink' : 'hover:!text-ink'}`}>
              {name}
              {tab === key && <span className="beam absolute inset-x-3 bottom-0 h-[2px] rounded-full" />}
            </button>
          ))}
        </div>
        <div className="flex shrink-0 items-center gap-3">
          {status}
          <CopyButton text={copy ?? blocks.map((b) => b.text).join('\n\n')} />
        </div>
      </div>
      <pre className={`overflow-auto px-4 py-4 font-mono text-[12.5px] leading-[1.7] text-ink/70 ${tall ? 'max-h-[430px]' : 'max-h-[340px]'}`}>
        {blocks.map((b, i) => <code key={i} className="block">{i > 0 && '\n'}{paint(b.text, b.lang)}</code>)}
      </pre>
    </div>
  );
}

const Method = ({ m = 'GET', className = '' }) => <span className={`font-mono text-[10.5px] font-medium tracking-wider ${m === 'GET' ? 'text-cyan-500' : 'text-violet-700'} ${className}`}>{m}</span>;

/** A path with its parameters picked out. */
function Path({ path }) {
  return path.split(/(\{[a-z]+\})/g).map((p, i) => (/^\{/.test(p) ? <span key={i} className="text-violet-700">{p}</span> : <span key={i}>{p}</span>));
}

function requestOf(e, lang) {
  const url = `${BASE}${e.path.replace('{address}', MINT).replace('{platform}', 'github').replace('{handle}', 'your-project')}`;
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
    <div className="frame mt-8 overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-1 border-b border-white/10 px-5 py-3">
        <div className="label flex flex-wrap items-center gap-x-4 gap-y-1">
          <span className="text-ink">v1</span>
          <span>base <span className="normal-case tracking-normal text-ink/80">{BASE}</span></span>
          <span className="hidden sm:inline">Solana <span className="text-dim">+</span> Robinhood Chain</span>
          <span className="hidden md:inline">JSON · CORS open · no key</span>
        </div>
        <a href="/api/v1" target="_blank" rel="noopener noreferrer" className="label group inline-flex items-center gap-1 !text-hood-600 transition-colors hover:!text-hood-700">Open the API root <External className="h-3 w-3" /></a>
      </div>

      <div className="grid lg:grid-cols-[260px_minmax(0,1fr)] lg:divide-x lg:divide-white/10">
        {/* the rail */}
        <nav aria-label="Endpoints" className="flex gap-1 overflow-x-auto border-b border-white/10 px-3 py-2 lg:block lg:overflow-visible lg:border-b-0 lg:p-0 lg:pb-4">
          {GROUPS.map((g) => (
            <div key={g.label} className="flex gap-1 lg:block">
              <div className="label hidden px-5 pb-1.5 pt-5 !text-[9.5px] lg:block">{g.label}</div>
              {g.items.map((x) => {
                const on = x.id === id;
                return (
                  <button key={x.id} type="button" onClick={() => setId(x.id)} aria-current={on} className={`relative shrink-0 rounded-xl px-3 py-2 text-left transition-colors lg:block lg:w-full lg:rounded-none lg:px-5 ${on ? 'bg-white/[0.06]' : 'hover:bg-white/[0.03]'}`}>
                    {on && <motion.span layoutId="dev-endpoint" className="beam absolute inset-y-2 left-0 hidden w-[2px] rounded-full shadow-[0_0_12px_#5FE3FF] lg:block" transition={{ duration: 0.3, ease: EASE }} />}
                    <span className={`block whitespace-nowrap text-[13px] ${on ? 'font-medium text-ink' : 'text-ink/70'}`}>{x.name}</span>
                    <span className="mt-0.5 hidden items-center gap-1.5 font-mono text-[11px] text-dim lg:flex"><Method className="!text-[9.5px]" /><span className="truncate">{x.path.split('?')[0]}</span></span>
                  </button>
                );
              })}
            </div>
          ))}
        </nav>

        {/* the stage */}
        <AnimatePresence mode="wait" initial={false}>
          <motion.div key={id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.25, ease: EASE }} className="min-w-0 p-5 sm:p-7">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
              <Method className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5" />
              <code className="min-w-0 break-all font-mono text-[15px] text-ink"><Path path={e.path} /></code>
              <span className="ml-auto flex items-center gap-2">
                <CopyButton text={`${BASE}${e.path}`} label="Copy URL" />
                {e.run && (
                  <button type="button" onClick={run} disabled={got?.loading} className="beam inline-flex items-center gap-1.5 rounded-full px-3 py-1 font-mono text-[10.5px] font-medium uppercase tracking-[0.2em] text-coal shadow-beam transition-[filter] hover:brightness-110 disabled:opacity-60">
                    <Play className="h-2.5 w-2.5" />{got?.loading ? 'Running' : 'Run'}
                  </button>
                )}
              </span>
            </div>
            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-mut">{e.desc}</p>

            {e.params && (
              <dl className="mt-4 divide-y divide-white/10 rounded-2xl border border-white/10 bg-white/[0.02] px-4">
                {e.params.map(([name, where, what]) => (
                  <div key={name} className="grid grid-cols-[110px_1fr] gap-x-4 gap-y-0.5 py-2.5 sm:grid-cols-[110px_60px_1fr]">
                    <dt className="font-mono text-[12.5px] text-violet-700">{name}</dt>
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
                  ? <span className={`label flex items-center gap-1.5 ${got.status === 200 ? '!text-cyan-500' : '!text-down'}`}><span className={`h-1.5 w-1.5 rounded-full ${got.status === 200 ? 'bg-cyan-500 shadow-[0_0_8px_#5FE3FF]' : 'bg-down'}`} />{got.status || 'failed'} · {got.ms} ms · live</span>
                  : <span className="label"><span className="text-cyan-500">200</span> · sample</span>}
              />
              {e.note && !got?.text && <p className="text-xs leading-relaxed text-mut">{e.note}</p>}
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

/* ---------- the launchpad hook: the one Robinhood Chain example ---------- */
const HOOK = {
  create: [
    { lang: 'sh', text: `curl -X POST ${BASE}/api/v1/hooks/launch \\\n  -H "Authorization: Bearer <apiKey>" \\\n  -H "Content-Type: application/json" \\\n  -d '{
    "token": "${RH_TOKEN}",
    "creatorWallet": "0xaC97…030b",
    "feeSource": "wallet",
    "reward": "NVDA"
  }'` },
    { lang: 'json', text: json({ code: 'K7Q2MX4P', status: 'pending', token: { address: RH_TOKEN, symbol: 'PONS', name: 'Pons' }, telegramUrl: `${BOT_URL || 'https://t.me/<bot>'}?start=l_K7Q2MX4P`, dashboardUrl: `${BASE}/${RH_TOKEN}`, badgeUrl: `${BASE}/api/badge/${RH_TOKEN}`, statusUrl: `${BASE}/api/v1/hooks/launch?code=K7Q2MX4P` }) },
  ],
  status: [
    { lang: 'sh', text: `curl ${BASE}/api/v1/hooks/launch?code=K7Q2MX4P` },
    { lang: 'json', text: json({ code: 'K7Q2MX4P', status: 'linked', token: RH_TOKEN, launchpad: 'your-launchpad', createdAt: '2026-09-28T18:02:11.000Z', linkedAt: '2026-09-28T18:05:40.000Z', config: { active: true, rewardMode: 'fixed', rewardToken: RH_NVDA, scheduleKind: 'closing_bell', intervalMinutes: null }, dashboardUrl: `${BASE}/${RH_TOKEN}`, badgeUrl: `${BASE}/api/badge/${RH_TOKEN}` }) },
  ],
  webhook: [
    { lang: 'http', text: 'POST https://yoursite.com/webhooks/deltas\nContent-Type: application/json\nX-Deltas-Event: dividend.paid\nX-Deltas-Signature: sha256=9f2c41…e07b\nUser-Agent: DELTAS-Webhooks/1.0' },
    { lang: 'json', text: json({ event: 'dividend.paid', sentAt: '2026-09-28T20:00:09.412Z', token: RH_TOKEN, launchCode: 'K7Q2MX4P', executionId: 1204, asset: { address: RH_NVDA, symbol: 'NVDA', amount: '60142857142857142', valueWei: '140000000000000000' }, reward: { address: RH_NVDA, symbol: 'NVDA', decimals: 18, isStock: true, mode: 'fixed', note: null }, amount: '42100000000000000', holdersPaid: 412, holdersEligible: 468, txHash: '0xc16a…af39', receiptUrl: `${BASE}/receipt/1204`, dashboardUrl: `${BASE}/${RH_TOKEN}`, badgeUrl: `${BASE}/api/badge/${RH_TOKEN}` }) },
  ],
  verify: [
    { lang: 'js', text: `import crypto from 'node:crypto';\n\n// HMAC-SHA256 over the raw body, with the webhook secret of your launchpad.\nconst expected = 'sha256=' + crypto.createHmac('sha256', WEBHOOK_SECRET).update(rawBody).digest('hex');\nconst received = req.headers['x-delta-signature'] || '';\n\nconst ok = received.length === expected.length\n  && crypto.timingSafeEqual(Buffer.from(received), Buffer.from(expected));\nif (!ok) throw new Error('Bad signature');` },
  ],
};
const HOOK_TABS = [['create', 'Create the link'], ['status', 'Poll the status'], ['webhook', 'Webhook'], ['verify', 'Verify']];
const mono = (t) => <code className="font-mono text-[12.5px] text-ink">{t}</code>;

const STEPS = [
  { tab: 'create', call: 'POST /api/v1/hooks/launch', title: 'Send the launch', body: <>The coin&apos;s address, plus the creator wallet and the fee source if you know them. You get back {mono('telegramUrl')}, {mono('dashboardUrl')} and {mono('badgeUrl')}.</> },
  { tab: 'status', call: 'telegramUrl', title: 'Show the link', body: 'The creator opens Telegram, sends the dev key, picks a stock and a schedule. The coin and the fee source are already filled in.' },
  { tab: 'webhook', call: 'token.linked · dividend.paid', title: 'Receive webhooks', body: <>Every event names itself in {mono('X-Deltas-Event')} and is signed with HMAC-SHA256 in {mono('X-Deltas-Signature')}. Poll {mono('GET ?code=')} if you prefer.</> },
];

function Launchpads() {
  const [tab, setTab] = useState('create');
  return (
    <div id="launchpads" className="panel mt-3 grid scroll-mt-20 overflow-hidden lg:grid-cols-12 lg:divide-x lg:divide-white/10">
      <div className="flex flex-col p-6 sm:p-7 lg:col-span-5">
        <div className="label flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-hood-500 shadow-[0_0_8px_#2FA8FF]" />For launchpads · Robinhood Chain</div>
        <h3 className="mt-3 font-display text-[26px] font-medium leading-[1.1] tracking-[-0.025em] text-ink">Your creators earn stocks. Make their holders earn them too.</h3>
        <p className="mt-3 text-sm leading-relaxed text-mut">Launchpads on Robinhood Chain pay their creators in stock tokens. One call per launch adds fee routing on top: the creator gets a Telegram link that pre-fills the setup, and you get a signed webhook for every cycle and a yield badge for the coin page.</p>

        <ol className="mt-7 flex-1">
          {STEPS.map((s, i) => {
            const on = s.tab === tab || (tab === 'verify' && s.tab === 'webhook');
            return (
              <li key={s.title} className="relative pb-5 pl-10 last:pb-0">
                {i < STEPS.length - 1 && <span className="absolute bottom-0 left-[12px] top-8 w-px bg-white/10" />}
                <span className={`figure absolute left-0 top-0 flex h-[25px] w-[25px] items-center justify-center rounded-full border font-mono text-[11px] transition-all ${on ? 'border-cyan-500/70 text-cyan-500 shadow-[0_0_14px_rgba(95,227,255,0.35)]' : 'border-white/10 text-dim'}`}>{i + 1}</span>
                <button type="button" onClick={() => setTab(s.tab)} className="group text-left">
                  <span className="flex flex-wrap items-baseline gap-x-2.5">
                    <span className="text-[15px] font-medium text-ink transition-colors group-hover:text-hood-700">{s.title}</span>
                    <span className="font-mono text-[11px] text-cyan-500">{s.call}</span>
                  </span>
                </button>
                <p className="mt-1 text-sm leading-relaxed text-mut">{s.body}</p>
              </li>
            );
          })}
        </ol>

        <div className="mt-7 flex flex-wrap items-center gap-x-4 gap-y-3 border-t border-white/10 pt-5">
          <a href={`mailto:${CONTACT_EMAIL}?subject=Launchpad%20integration`} className="btn-ink !py-2 text-xs">Request an API key <Arrow className="h-3.5 w-3.5" /></a>
          <p className="w-full text-xs leading-relaxed text-mut">No API key? Any site can still link <code className="break-words font-mono text-ink/80">{BOT_URL || 'https://t.me/<bot>'}?start=t_&lt;0x address&gt;</code> to pre-fill a coin on Robinhood Chain.</p>
        </div>
      </div>

      <div className="min-w-0 border-t border-white/10 p-4 sm:p-5 lg:col-span-7 lg:border-t-0">
        <Pane tall tabs={HOOK_TABS} tab={tab} onTab={setTab} blocks={HOOK[tab]} copy={HOOK[tab][0].text} />
        <p className="mt-3 text-xs leading-relaxed text-mut">Each event is a JSON POST, signed over the raw body with your launchpad&apos;s webhook secret. Delivery is best effort with one retry, and a failed delivery never affects the cycle.</p>
      </div>
    </div>
  );
}

export default function Developers() {
  return (
    <div id="developers" className="scroll-mt-20">
      <div className="grid items-end gap-6 lg:grid-cols-[1fr_auto]">
        <div className="max-w-2xl">
          <div className="eyebrow mb-4">Developers</div>
          <h2 className="font-display text-[36px] font-medium leading-[1.05] tracking-[-0.03em] text-ink sm:text-[44px]">Build on {BRAND}.</h2>
          <p className="mt-4 max-w-md text-[16px] leading-relaxed text-mut">A free, public, read-only API. No key. The coins routing on Solana and Robinhood Chain, their cycles, the pages being paid, and webhooks signed with HMAC for launchpads.</p>
        </div>
        <dl className="flex gap-8 lg:text-right">
          <div><dd className="figure text-4xl font-medium tracking-[-0.03em] text-ink">{ENDPOINTS.length}</dd><dt className="label mt-1">endpoints</dt></div>
          <div><dd className="figure text-4xl font-medium tracking-[-0.03em] text-ink">0</dd><dt className="label mt-1">keys needed</dt></div>
        </dl>
      </div>
      <Reference />
      <Launchpads />
    </div>
  );
}
