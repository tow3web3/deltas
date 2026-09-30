// The guide: an index that stays in view, and sections made of paragraphs,
// numbered steps on a rail, small tables, callouts, links and drawn blocks
// (the route from fees to destinations, the five kinds, the eight platforms).
// Logos everywhere a platform or an asset is named.
import Link from 'next/link';
import Rich from './Rich';
import StockLogo from './StockLogo';
import { Mark } from './Logo';
import { Arrow, PlatformIcon, Users, Wallet, Burn, Vault, World, Key, Coins, Route, Gift, Clock, Gas, Shield, Pause, Code } from './Icons';
import { PLATFORMS, PLATFORM_KEYS } from '../lib/pages';
import { getStock } from '../lib/stocks';

const anchor = (s) => s.id || s.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const num = (i) => String(i + 1).padStart(2, '0');

// The five kinds of destination, drawn as the dashboard draws them.
const KINDS = [
  { key: 'holders', label: 'Holders', icon: Users, color: '#2FA8FF', body: 'Every real wallet holding the coin, pro rata, in the asset you pick.' },
  { key: 'wallet', label: 'Your wallets', icon: Wallet, color: '#F4F5F4', body: 'Any address, for you or your team.' },
  { key: 'burn', label: 'Buyback and burn', icon: Burn, color: '#FF7A1A', body: 'Buys your own coin on Uniswap and burns it.' },
  { key: 'treasury', label: 'Treasury', icon: Vault, color: '#F6C343', body: 'Stocks kept in a wallet you control, with a published book value.' },
  { key: 'page', label: 'Pages', icon: World, color: '#5B9DFF', body: 'A channel, an account or a website. Its owner does nothing until they want the money.' },
];
const ROW_ICONS = { key: Key, coin: Coins, source: Route, asset: Gift, clock: Clock, gas: Gas, shield: Shield, vault: Vault, pause: Pause, code: Code };

/** The route: fees in (stocks, ETH), the engine, destinations out. */
function Flow() {
  const fees = ['NVDA', 'TSLA', 'SPY', 'ETH'];
  return (
    <div className="grid items-center gap-4 rounded-2xl border border-line bg-paper p-5 sm:grid-cols-[auto_1fr_auto_1fr_auto]">
      <div>
        <div className="label mb-2">Fees in</div>
        <div className="flex -space-x-2">
          {fees.map((t) => <span key={t} className="rounded-full ring-2 ring-paper"><StockLogo address={t === 'ETH' ? '0x0000000000000000000000000000000000000000' : getStock(t)?.address} meta={{ symbol: t }} size="h-9 w-9" text="text-[8px]" /></span>)}
        </div>
        <div className="mt-2 font-mono text-[10.5px] text-mut">stock tokens, ETH</div>
      </div>
      <Dash />
      <div className="flex flex-col items-center">
        <span className="flex h-16 w-16 items-center justify-center rounded-2xl border border-hood-300 bg-hood-50"><Mark className="h-11 w-11" /></span>
        <div className="label mt-2">every cycle</div>
      </div>
      <Dash />
      <div>
        <div className="label mb-2">Paid out</div>
        <div className="flex flex-wrap items-center gap-1.5">
          {KINDS.slice(0, 4).map(({ key, icon: I, color, label }) => <span key={key} title={label} className="flex h-9 w-9 items-center justify-center rounded-full border border-line bg-ground"><I className="h-4 w-4" style={{ color }} /></span>)}
          <span className="mx-1 h-6 w-px bg-line" />
          {PLATFORM_KEYS.map((k) => <span key={k} title={PLATFORMS[k].label} className="flex h-9 w-9 items-center justify-center rounded-full border border-line bg-ground"><PlatformIcon platform={k} className="h-4 w-4" /></span>)}
        </div>
        <div className="mt-2 font-mono text-[10.5px] text-mut">holders, wallets, buyback, treasury, and any page</div>
      </div>
    </div>
  );
}
const Dash = () => <span aria-hidden="true" className="hidden h-px flex-1 border-t border-dashed border-hood-300 sm:block" />;

function Destinations() {
  return (
    <ul className="grid gap-2 sm:grid-cols-2">
      {KINDS.map(({ key, label, icon: I, color, body }) => (
        <li key={key} className={`flex gap-3 rounded-xl border border-line bg-paper p-3.5 ${key === 'page' ? 'sm:col-span-2' : ''}`}>
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-line bg-ground"><I className="h-[18px] w-[18px]" style={{ color }} /></span>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm font-semibold text-ink">
              {label}
              {key === 'page' && <span className="flex items-center gap-1">{PLATFORM_KEYS.map((k) => <PlatformIcon key={k} platform={k} className="h-3.5 w-3.5" />)}</span>}
            </div>
            <p className="mt-0.5 text-sm text-mut">{body}</p>
          </div>
        </li>
      ))}
    </ul>
  );
}

/** The eight places a page can live, with how each one proves its owner. */
function Platforms() {
  return (
    <ul className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      {PLATFORM_KEYS.map((k) => (
        <li key={k} className="rounded-xl border border-line bg-paper px-3 py-3">
          <PlatformIcon platform={k} className="h-6 w-6" />
          <div className="mt-2 text-sm font-semibold text-ink">{PLATFORMS[k].label}</div>
          <div className="font-mono text-[10.5px] text-mut">{PLATFORMS[k].placeholder}</div>
          <div className="label mt-2 !text-[9.5px]">{k === 'domain' ? 'DNS record' : k === 'phone' ? 'code by WhatsApp or SMS' : 'sign-in'}</div>
        </li>
      ))}
    </ul>
  );
}

function Steps({ steps }) {
  return (
    <ol className="relative ml-3 border-l border-line">
      {steps.map((s, i) => (
        <li key={s.title} className="relative pb-6 pl-8 last:pb-0">
          <span className="absolute -left-[15px] top-0 flex h-[29px] w-[29px] items-center justify-center rounded-full border border-hood-300 bg-ground">
            {s.p ? <PlatformIcon platform={s.p} className="h-3.5 w-3.5" /> : <span className="figure font-mono text-[10px] font-semibold text-hood-500">{i + 1}</span>}
          </span>
          <div className="text-[15px] font-semibold leading-[29px] text-ink">{s.title}</div>
          <p className="mt-0.5 text-[15px] leading-relaxed text-mut"><Rich text={s.body} /></p>
        </li>
      ))}
    </ol>
  );
}

function Block({ b }) {
  if (typeof b === 'string') return <p><Rich text={b} /></p>;
  if (b.flow) return <Flow />;
  if (b.destinations) return <Destinations />;
  if (b.platforms) return <Platforms />;
  if (b.steps) return <Steps steps={b.steps} />;
  if (b.rows) {
    return (
      <dl className="overflow-hidden rounded-xl border border-line">
        {b.rows.map(([k, v, icon]) => {
          const I = ROW_ICONS[icon];
          return (
            <div key={k} className="grid gap-1 border-b border-line bg-paper px-4 py-3 last:border-b-0 sm:grid-cols-[200px_1fr] sm:gap-4">
              <dt className="flex items-center gap-2 text-sm font-semibold text-ink">{I && <I className="h-4 w-4 shrink-0 text-hood-500" />}{k}</dt>
              <dd className="text-sm text-mut"><Rich text={v} /></dd>
            </div>
          );
        })}
      </dl>
    );
  }
  if (b.note) {
    return (
      <p className="relative rounded-xl border border-line bg-paper py-3 pl-5 pr-4 text-sm leading-relaxed text-ink">
        <span aria-hidden="true" className="absolute inset-y-3 left-0 w-[2px] rounded-full bg-hood-500" />
        <Rich text={b.note} />
      </p>
    );
  }
  if (b.link) {
    const out = /^https?:/.test(b.link);
    const cls = 'inline-flex items-center gap-1.5 text-sm font-semibold text-hood-500 transition hover:text-hood-400';
    return out
      ? <p><a href={b.link} target="_blank" rel="noopener noreferrer" className={cls}>{b.label}<Arrow className="h-3.5 w-3.5" /></a></p>
      : <p><Link href={b.link} className={cls}>{b.label}<Arrow className="h-3.5 w-3.5" /></Link></p>;
  }
  return null;
}

export default function Guide({ eyebrow, title, intro, sections }) {
  return (
    <div className="grid gap-10 lg:grid-cols-[220px_1fr] lg:gap-16">
      <aside className="hidden lg:sticky lg:top-24 lg:block lg:self-start">
        <div className="label">Contents</div>
        <ol className="mt-3 space-y-1.5 border-l border-line">
          {sections.map((s, i) => (
            <li key={s.title}>
              <a href={`#${anchor(s)}`} className="-ml-px flex gap-2.5 border-l border-transparent py-0.5 pl-3 text-sm text-mut transition hover:border-hood-500 hover:text-ink">
                <span className="figure font-mono text-[11px] leading-5 text-mut/60">{num(i)}</span>{s.title}
              </a>
            </li>
          ))}
        </ol>
        <div className="mt-8 flex flex-wrap gap-1.5 pl-3">
          {PLATFORM_KEYS.map((k) => <PlatformIcon key={k} platform={k} className="h-4 w-4 opacity-70" />)}
        </div>
      </aside>

      <article className="min-w-0 max-w-2xl">
        <div className="eyebrow">{eyebrow}</div>
        <h1 className="mt-3 font-display text-4xl font-medium leading-[1.05] tracking-tight text-ink sm:text-5xl">{title}</h1>
        <p className="mt-4 text-base leading-relaxed text-mut">{intro}</p>

        {/* On a phone, the contents as chips under the title */}
        <div className="mt-6 flex flex-wrap gap-1.5 lg:hidden">
          {sections.map((s, i) => <a key={s.title} href={`#${anchor(s)}`} className="rounded-full border border-line px-2.5 py-1 font-mono text-[10.5px] text-mut transition hover:border-hood-500 hover:text-ink">{num(i)} {s.title}</a>)}
        </div>

        <div className="mt-10 space-y-14">
          {sections.map((s, i) => (
            <section key={s.title} id={anchor(s)} className="scroll-mt-24">
              <div className="flex items-baseline gap-3 border-b border-line pb-3">
                <span className="figure font-mono text-xs text-hood-500">{num(i)}</span>
                <h2 className="font-display text-2xl font-medium tracking-tight text-ink">{s.title}</h2>
              </div>
              <div className="mt-5 space-y-5 text-[15px] leading-relaxed text-mut">
                {s.body.map((b, j) => <Block key={j} b={b} />)}
              </div>
            </section>
          ))}
        </div>
      </article>
    </div>
  );
}
