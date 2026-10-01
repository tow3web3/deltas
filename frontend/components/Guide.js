// The guide: an index that stays in view, and sections made of paragraphs,
// numbered steps on a lit rail, small glass tables, callouts, links and drawn
// blocks: the route from fees to destinations as channels of light, one Solana
// cycle as channel bars, the five kinds, the nine places a page can live.
// Solana first; the sections marked `chain: 'robinhood'` are gathered under a
// part of their own. Real logos everywhere a platform or an asset is named.
import Link from 'next/link';
import Rich from './Rich';
import StockLogo from './StockLogo';
import { Arrow, PlatformIcon, Users, Wallet, Burn, Vault, World, Key, Coins, Route, Gift, Clock, Gas, Shield, Pause, Code } from './Icons';
import { Flow, FlowChip } from './ui/Light';
import { PLATFORMS, PLATFORM_KEYS } from '../lib/pages';
import { getXStock } from '../lib/xstocks';
import { getStock } from '../lib/stocks';

const anchor = (s) => s.id || s.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const num = (i) => String(i + 1).padStart(2, '0');
const RH = (s) => s.chain === 'robinhood';

const SOL_MINT = 'So11111111111111111111111111111111111111112';
/** A logo disc for SOL or an xStock (by ticker), the way the rest of the site draws them. */
function Asset({ t, size = 'h-5 w-5' }) {
  if (t === 'SOL') return <StockLogo address={SOL_MINT} meta={{ symbol: 'SOL', image: '/sol.png' }} size={size} text="text-[6px]" />;
  const x = getXStock(t);
  return <StockLogo address={x?.mint} meta={{ symbol: x?.symbol || t, image: x?.logo }} size={size} text="text-[6px]" />;
}
const Dot = ({ color }) => <span className="block h-2.5 w-2.5 rounded-full" style={{ background: color, boxShadow: `0 0 12px ${color}` }} />;

// The five kinds of destination, as the dashboard draws them.
const KINDS = [
  { key: 'holders', label: 'Holders', icon: Users, color: '#5FE3FF', body: 'Every real wallet holding the coin, by balance, in SOL, an xStock or any token.' },
  { key: 'wallet', label: 'Your wallets', icon: Wallet, color: '#F3F5F9', body: 'Any address, for you or your team.' },
  { key: 'burn', label: 'Buyback and burn', icon: Burn, color: '#FF7A1A', body: 'Buys the coin itself and burns it.' },
  { key: 'treasury', label: 'Treasury', icon: Vault, color: '#2FA8FF', body: 'Stocks kept in a wallet you control: an xStock on Solana.' },
  { key: 'page', label: 'Pages', icon: World, color: '#7B5CFF', body: 'A channel, an account, a website or a phone number. Its owner does nothing until they want the money.' },
];
const ROW_ICONS = { key: Key, coin: Coins, source: Route, asset: Gift, clock: Clock, gas: Gas, shield: Shield, vault: Vault, pause: Pause, code: Code, holder: Users };

/** The route as light: the creator fees enter on the left and leave in channels, one per destination. */
function GuideFlow() {
  const channels = [
    { key: 'holders', share: 50, node: <FlowChip icon={<Asset t="NVDA" />} label="Holders" sub="in NVDAx, by balance" share={50} /> },
    { key: 'page', share: 20, node: <FlowChip icon={<PlatformIcon platform="youtube" className="h-5 w-5" />} label="@yourchannel" sub="its own vault" share={20} /> },
    { key: 'treasury', share: 15, node: <FlowChip icon={<Asset t="SPY" />} label="Treasury" sub="holds SPYx" share={15} /> },
    { key: 'burn', share: 10, node: <FlowChip icon={<Dot color="#FF7A1A" />} label="Buyback and burn" sub="buys the coin, burns it" share={10} /> },
    { key: 'wallet', share: 5, node: <FlowChip icon={<Wallet className="h-4 w-4 text-ink" />} label="Your wallet" sub="in SOL" share={5} /> },
  ];
  return (
    <div className="frame overflow-hidden p-5 sm:p-6">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <span className="label flex items-center gap-2"><Asset t="SOL" size="h-4 w-4" />pump.fun creator fees</span>
        <span className="label">every cycle</span>
      </div>
      <div className="hidden sm:block"><Flow channels={channels} width={640} height={360} split={0.56} /></div>
      {/* on a phone the chips stack, each over a channel bar as wide as its share */}
      <ul className="space-y-2.5 sm:hidden">
        {channels.map((c) => (
          <li key={c.key}>
            {c.node}
            <span className="mx-3 mt-1.5 block h-1 rounded-full bg-white/[0.05]"><span className="beam block h-full rounded-full" style={{ width: `${c.share * 2}%` }} /></span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** One Solana cycle as channel bars: what sat in the wallet, the reserve kept, then each leg by its share. */
function Cycle() {
  const legs = [
    { key: 'holders', share: 70, sol: '3.36', icon: <Asset t="NVDA" />, label: 'Holders', to: 'swapped to NVDAx, paid by balance' },
    { key: 'treasury', share: 10, sol: '0.48', icon: <Asset t="SPY" />, label: 'Treasury', to: 'buys SPYx on Jupiter' },
    { key: 'burn', share: 10, sol: '0.48', icon: <Dot color="#FF7A1A" />, label: 'Buyback and burn', to: 'buys the coin, burns it' },
    { key: 'page', share: 10, sol: '0.48', icon: <PlatformIcon platform="github" className="h-4 w-4" />, label: 'your-project', to: 'into its vault' },
  ];
  return (
    <div className="frame overflow-hidden">
      <div className="border-b border-white/10 p-5 sm:p-6">
        <div className="flex items-end justify-between gap-4">
          <div>
            <div className="label">In the wallet after collect</div>
            <div className="figure mt-1 text-[32px] font-medium leading-none tracking-[-0.03em] text-ink">4.82 <span className="text-base text-mut">SOL</span></div>
          </div>
          <Asset t="SOL" size="h-9 w-9" />
        </div>
        <div className="mt-5 flex h-2.5 gap-1">
          <span className="w-[3%] min-w-[10px] rounded-full bg-white/15" title="kept for network fees" />
          <span className="beam flex-1 rounded-full shadow-[0_0_14px_rgba(95,227,255,0.45)]" />
        </div>
        <div className="mt-2 flex justify-between font-mono text-[11px]">
          <span className="text-dim">0.02 kept for fees</span>
          <span className="text-cyan-500">4.80 routed</span>
        </div>
      </div>
      <ul className="divide-y divide-white/10">
        {legs.map((l) => (
          <li key={l.key} className="grid grid-cols-[auto_1fr_auto] items-center gap-x-3 gap-y-2 px-5 py-3.5 sm:grid-cols-[auto_170px_1fr_auto] sm:px-6">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/5">{l.icon}</span>
            <span className="min-w-0">
              <span className="block truncate text-[13.5px] font-medium text-ink">{l.label}</span>
              <span className="block truncate text-[11.5px] text-mut">{l.to}</span>
            </span>
            <span className="col-span-3 row-start-2 h-2 rounded-full bg-white/[0.05] sm:col-span-1 sm:row-start-auto">
              <span className="beam block h-full rounded-full" style={{ width: `${l.share}%`, boxShadow: '0 0 10px rgba(95,227,255,0.35)' }} />
            </span>
            <span className="col-start-3 row-start-1 text-right font-mono text-[12.5px] tabular-nums sm:col-start-auto sm:row-start-auto">
              <span className="text-ink">{l.sol}</span> <span className="text-dim">SOL</span>
              <span className="ml-2 text-cyan-500">{l.share}%</span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Destinations() {
  return (
    <ul className="grid gap-2 sm:grid-cols-2">
      {KINDS.map(({ key, label, icon: I, color, body }) => (
        <li key={key} className={`panel flex gap-3.5 p-4 ${key === 'page' ? 'sm:col-span-2' : ''}`}>
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/5"><I className="h-[18px] w-[18px]" style={{ color }} /></span>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[14.5px] font-medium text-ink">
              {label}
              {key === 'page' && <span className="flex items-center gap-1.5">{PLATFORM_KEYS.map((k) => <PlatformIcon key={k} platform={k} className="h-3.5 w-3.5" />)}</span>}
            </div>
            <p className="mt-0.5 text-sm text-mut">{body}</p>
          </div>
        </li>
      ))}
    </ul>
  );
}

/** The nine places a page can live, with how each one proves its owner. */
function Platforms() {
  return (
    <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
      {PLATFORM_KEYS.map((k) => (
        <li key={k} className="panel px-3.5 py-3.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/5"><PlatformIcon platform={k} className="h-5 w-5" /></span>
          <div className="mt-2.5 text-sm font-medium text-ink">{PLATFORMS[k].label}</div>
          <div className="truncate font-mono text-[10.5px] text-mut">{PLATFORMS[k].placeholder}</div>
          <div className="label mt-2.5 !text-[9.5px] !text-cyan-500">{k === 'domain' ? 'DNS record' : k === 'phone' ? 'code by WhatsApp or SMS' : 'sign-in'}</div>
        </li>
      ))}
    </ul>
  );
}

function Steps({ steps }) {
  return (
    <div className="relative ml-[15px]">
      {/* the rail, lit */}
      <span aria-hidden="true" className="absolute bottom-3 left-0 top-3 w-px opacity-60" style={{ background: 'linear-gradient(180deg, #2FA8FF, #5FE3FF 45%, #7B5CFF)' }} />
      <ol className="relative">
        {steps.map((s, i) => (
          <li key={s.title} className="relative pb-6 pl-8 last:pb-0">
            <span className="absolute -left-[15px] top-0 flex h-[30px] w-[30px] items-center justify-center rounded-full border border-white/15 bg-[rgba(5,7,12,0.92)] shadow-[0_0_14px_rgba(95,227,255,0.18)]">
              {s.p ? <PlatformIcon platform={s.p} className="h-3.5 w-3.5" /> : <span className="figure font-mono text-[10.5px] text-cyan-500">{i + 1}</span>}
            </span>
            <div className="text-[15px] font-medium leading-[30px] text-ink">{s.title}</div>
            <p className="mt-0.5 text-[15px] leading-relaxed text-mut"><Rich text={s.body} /></p>
          </li>
        ))}
      </ol>
    </div>
  );
}

function Block({ b }) {
  if (typeof b === 'string') return <p><Rich text={b} /></p>;
  if (b.flow) return <GuideFlow />;
  if (b.cycle) return <Cycle />;
  if (b.destinations) return <Destinations />;
  if (b.platforms) return <Platforms />;
  if (b.steps) return <Steps steps={b.steps} />;
  if (b.rows) {
    return (
      <dl className="panel overflow-hidden">
        {b.rows.map(([k, v, icon]) => {
          const I = ROW_ICONS[icon];
          return (
            <div key={k} className="grid gap-1 border-b border-white/10 px-4 py-3.5 last:border-b-0 sm:grid-cols-[200px_1fr] sm:gap-4">
              <dt className="flex items-center gap-2.5 text-sm font-medium text-ink">{I && <I className="h-4 w-4 shrink-0 text-cyan-500" />}{k}</dt>
              <dd className="text-sm text-mut"><Rich text={v} /></dd>
            </div>
          );
        })}
      </dl>
    );
  }
  if (b.note) {
    return (
      <p className="relative rounded-2xl border border-white/10 bg-white/[0.03] py-3.5 pl-5 pr-4 text-sm leading-relaxed text-ink/90">
        <span aria-hidden="true" className="beam absolute inset-y-3 left-0 w-[2px] rounded-full shadow-[0_0_10px_#5FE3FF]" />
        <Rich text={b.note} />
      </p>
    );
  }
  if (b.link) {
    const out = /^https?:/.test(b.link);
    const cls = 'group inline-flex items-center gap-1.5 text-sm font-medium text-hood-600 transition-colors hover:text-hood-700';
    const body = <>{b.label}<Arrow className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" /></>;
    return out
      ? <p><a href={b.link} target="_blank" rel="noopener noreferrer" className={cls}>{body}</a></p>
      : <p><Link href={b.link} className={cls}>{body}</Link></p>;
  }
  return null;
}

/** The chip that marks a section of the second chain. */
const ChainChip = () => <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-2.5 py-0.5 font-mono text-[10.5px] text-mut"><span className="h-1.5 w-1.5 rounded-full bg-hood-500 shadow-[0_0_8px_#2FA8FF]" />Robinhood Chain</span>;

export default function Guide({ eyebrow, title, intro, sections }) {
  const firstRh = sections.findIndex(RH);
  return (
    <div className="grid gap-10 lg:grid-cols-[230px_1fr] lg:gap-16">
      <aside className="hidden lg:sticky lg:top-24 lg:block lg:self-start">
        <div className="label">Contents</div>
        <div className="relative mt-4">
          <span aria-hidden="true" className="absolute inset-y-1 left-0 w-px bg-white/10" />
          <ol className="space-y-1">
            {sections.map((s, i) => (
              <li key={s.title} className={i > 0 && RH(sections[i - 1]) && !RH(s) ? 'pt-4' : ''}>
                {i === firstRh && <div className="label mb-1.5 mt-4 pl-3 !text-[9.5px] !text-hood-600">Robinhood Chain</div>}
                <a href={`#${anchor(s)}`} className="group relative flex gap-2.5 py-1 pl-3 text-sm text-mut transition-colors hover:text-ink">
                  <span aria-hidden="true" className="beam absolute inset-y-1 left-0 w-px opacity-0 transition-opacity group-hover:opacity-100" />
                  <span className={`figure font-mono text-[11px] leading-5 ${RH(s) ? 'text-hood-600' : 'text-dim'}`}>{num(i)}</span>{s.title}
                </a>
              </li>
            ))}
          </ol>
        </div>
        <div className="mt-8 flex flex-wrap gap-2 pl-3">
          {PLATFORM_KEYS.map((k) => <PlatformIcon key={k} platform={k} className="h-4 w-4 opacity-80" />)}
        </div>
      </aside>

      <article className="min-w-0 max-w-2xl">
        <div className="eyebrow">{eyebrow}</div>
        <h1 className="mt-4 font-display text-[40px] font-medium leading-[1.02] tracking-[-0.035em] text-ink sm:text-[52px]">{title}</h1>
        <p className="mt-5 max-w-xl text-[17px] leading-relaxed text-mut">{intro}</p>

        {/* On a phone, the contents as chips under the title */}
        <div className="mt-6 flex flex-wrap gap-1.5 lg:hidden">
          {sections.map((s, i) => <a key={s.title} href={`#${anchor(s)}`} className={`rounded-full border px-2.5 py-1 font-mono text-[10.5px] transition-colors hover:border-cyan-500/50 hover:text-ink ${RH(s) ? 'border-hood-300 text-hood-600' : 'border-white/10 text-mut'}`}>{num(i)} {s.title}</a>)}
        </div>

        <div className="mt-12 space-y-16">
          {sections.map((s, i) => (
            <div key={s.title}>
              {i === firstRh && (
                <div className="panel mb-12 flex flex-wrap items-center justify-between gap-4 px-5 py-4">
                  <div>
                    <div className="eyebrow !text-hood-600">The second chain</div>
                    <p className="mt-1.5 max-w-md text-sm leading-relaxed text-mut">Also on Robinhood Chain: the same routing, with ETH where Solana uses SOL and Robinhood Stock Tokens where Solana has xStocks.</p>
                  </div>
                  <span className="flex -space-x-1.5"><StockLogo address={null} size="h-7 w-7" text="text-[7px]" /><StockLogo address={getStock('NVDA')?.address} size="h-7 w-7" text="text-[7px]" /></span>
                </div>
              )}
              <section id={anchor(s)} className="scroll-mt-24">
                <div className="flex flex-wrap items-baseline gap-x-3 gap-y-2">
                  <span className="figure font-mono text-xs text-cyan-500">{num(i)}</span>
                  <h2 className="font-display text-[28px] font-medium leading-tight tracking-[-0.03em] text-ink">{s.title}</h2>
                  {RH(s) && <ChainChip />}
                </div>
                <div aria-hidden="true" className="mt-3 h-px" style={{ background: 'linear-gradient(90deg, rgba(95,227,255,0.45), rgba(123,92,255,0.25) 40%, transparent)' }} />
                <div className="mt-6 space-y-5 text-[15px] leading-relaxed text-mut">
                  {s.body.map((b, j) => <Block key={j} b={b} />)}
                </div>
              </section>
            </div>
          ))}
        </div>
      </article>
    </div>
  );
}
