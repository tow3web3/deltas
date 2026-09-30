'use client';

// Look a coin up. The answer is a record, the way a registry would print it:
// the coin with its own logo, its routing as one bar with every segment named,
// what it pays in, its schedule and the way to its public page. Before a
// search the record is there, empty, so the visitor sees what they will get.
import { useRef, useState } from 'react';
import Link from 'next/link';
import { AnimatePresence, motion } from 'motion/react';
import { Arrow, Find, PlatformIcon, Dice, Rocket, Pie, Vote, Telegram } from './Icons';
import StockLogo from './StockLogo';
import { Mark } from './Logo';
import { legsFrom } from './PolicyMini';
import { ago } from './pages/PageParts';
import { BRAND, BOT_URL, SITE_HOST } from '../lib/brand';
import { describeAddress } from '../lib/stocks';
import { isAnyAddress } from '../lib/chains';
import { pageName } from '../lib/pages';

const EASE = [0.16, 1, 0.3, 1];

function short(a) {
  return a ? `${a.slice(0, 6)}…${a.slice(-4)}` : '';
}

const MODE = {
  fixed: null,
  roulette: { label: 'Stock Roulette', Icon: Dice },
  gainer: { label: 'Top Gainer', Icon: Rocket },
  portfolio: { label: 'Portfolio', Icon: Pie },
  vote: { label: 'Community Vote', Icon: Vote },
};
const KIND = {
  holders: { label: 'Holders', color: '#2FA8FF' },
  wallet: { label: 'Wallet', color: '#F4F5F4' },
  burn: { label: 'Buyback and burn', color: '#FF7A1A' },
  treasury: { label: 'Treasury', color: '#F6C343' },
  page: { label: 'Page', color: '#5B9DFF' },
  lottery: { label: 'Lottery', color: '#FF3D8A' },
};
const pct = (bps) => `${(bps / 100).toFixed(bps % 100 ? 1 : 0)}%`;

function Row({ label, children, className = '' }) {
  return (
    <div className={`px-5 py-4 ${className}`}>
      <div className="label mb-2">{label}</div>
      {children}
    </div>
  );
}

/** The record before a search, and while the chain is being read. */
function Blank({ busy }) {
  const bar = `h-2.5 rounded-full bg-line ${busy ? 'animate-pulse' : ''}`;
  return (
    <div className="flex h-full flex-col divide-y divide-line">
      <div className="flex items-center gap-4 px-5 py-5">
        <span className={`h-12 w-12 shrink-0 rounded-full border border-dashed border-line ${busy ? 'animate-pulse' : ''}`} />
        <div className="flex-1 space-y-2.5"><div className={`${bar} w-32`} /><div className={`${bar} w-52 max-w-full opacity-60`} /></div>
      </div>
      <Row label="Routing">
        <div className="flex h-2 gap-px overflow-hidden rounded-full">
          {[46, 22, 14, 10, 8].map((w, i) => <span key={i} className={`bg-line ${busy ? 'animate-pulse' : ''}`} style={{ width: `${w}%`, animationDelay: `${i * 120}ms` }} />)}
        </div>
      </Row>
      <div className="grid flex-1 grid-cols-2 divide-x divide-line">
        <Row label="Paid in"><div className={`${bar} w-20`} /></Row>
        <Row label="Schedule"><div className={`${bar} w-28`} /></Row>
      </div>
      <div className="flex items-center gap-2.5 bg-ground/60 px-5 py-3 text-sm text-mut">
        {busy ? <><span className="animate-pulse"><Mark className="h-5 w-5" /></span>Reading the chain…</> : 'Paste an address: the record of the coin prints here.'}
      </div>
    </div>
  );
}

function Found({ data, ca }) {
  const { sourceToken, targetToken, config, stats } = data;
  const d = describeAddress(sourceToken.address, sourceToken);
  const legs = legsFrom({ legs: data.legs, split: config.split });
  const total = legs.reduce((s, l) => s + l.shareBps, 0);
  const mode = MODE[config.rewardMode];
  const reward = describeAddress(targetToken.address, targetToken);
  return (
    <div className="flex h-full flex-col divide-y divide-line">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-3 px-5 py-5">
        <StockLogo address={sourceToken.address} meta={sourceToken} size="h-12 w-12" text="text-xs" />
        <div className="min-w-[160px] flex-1">
          <div className="flex items-center gap-2.5">
            <span className="truncate font-display text-2xl font-medium tracking-tight text-ink">{d.isStock ? d.symbol : `$${d.symbol}`}</span>
            <span className={`label flex items-center gap-1.5 rounded-full border px-2 py-0.5 !text-[9.5px] ${config.isActive ? 'border-hood-300 !text-hood-600' : 'border-line'}`}>
              <span className={`h-1.5 w-1.5 rounded-full ${config.isActive ? 'bg-hood-500' : 'bg-mut'}`} />{config.isActive ? 'Active' : 'Paused'}
            </span>
          </div>
          <div className="mt-0.5 truncate text-[13px] text-mut">{sourceToken.name ? `${sourceToken.name} · ` : ''}<span className="font-mono text-xs">{short(sourceToken.address)}</span></div>
        </div>
        <dl className="flex w-full gap-6 border-t border-line pt-3 sm:w-auto sm:border-0 sm:pt-0 sm:text-right">
          <div><dd className="figure text-2xl font-medium leading-none text-ink">{(stats?.totalExecutions ?? 0).toLocaleString('en-US')}</dd><dt className="label mt-1.5 !text-[9.5px]">cycles</dt></div>
          <div><dd className="figure text-2xl font-medium leading-none text-ink">{stats?.lastExecution ? ago(stats.lastExecution).replace(' ago', '') : 'none'}</dd><dt className="label mt-1.5 !text-[9.5px]">{stats?.lastExecution ? 'since the last' : 'yet'}</dt></div>
        </dl>
      </div>

      <Row label={`Routing · ${legs.length} route${legs.length === 1 ? '' : 's'}`}>
        <div className="flex h-2 gap-px overflow-hidden rounded-full bg-line">
          {legs.map((l, i) => <motion.span key={i} initial={{ width: 0 }} animate={{ width: `${l.shareBps / 100}%` }} transition={{ duration: 0.7, delay: 0.1 + i * 0.05, ease: EASE }} style={{ background: (KIND[l.kind] || KIND.wallet).color }} />)}
        </div>
        <ul className="mt-3 grid gap-x-6 gap-y-1.5 sm:grid-cols-2">
          {legs.map((l, i) => {
            const k = KIND[l.kind] || KIND.wallet;
            return (
              <li key={i} className="flex min-w-0 items-center gap-2 text-[13px]">
                <span className="h-3 w-[3px] shrink-0 rounded-full" style={{ background: k.color }} />
                {l.kind === 'page' && l.page && <PlatformIcon platform={l.page.platform} className="h-3.5 w-3.5 shrink-0" />}
                <span className="truncate text-ink/85">{l.kind === 'page' && l.page ? pageName(l.page.platform, l.page.handle) : l.label || k.label}</span>
                {l.assetSymbol && <span className="label shrink-0 !text-[9.5px]">in {l.assetSymbol}</span>}
                <span className="figure ml-auto shrink-0 text-ink">{pct(l.shareBps)}</span>
              </li>
            );
          })}
          {total < 10000 && (
            <li className="flex items-center gap-2 text-[13px]">
              <span className="h-3 w-[3px] shrink-0 rounded-full bg-line" />
              <span className="text-mut">Not assigned</span>
              <span className="figure ml-auto text-mut">{pct(10000 - total)}</span>
            </li>
          )}
        </ul>
      </Row>

      <div className="grid flex-1 grid-cols-2 divide-x divide-line">
        <Row label="Dividends paid in">
          {mode ? (
            <span className="inline-flex items-center gap-2 text-[15px] font-semibold text-ink"><mode.Icon className="h-5 w-5 text-gold-600" />{mode.label}</span>
          ) : (
            <span className="inline-flex items-center gap-2 text-[15px] font-semibold text-ink">
              <StockLogo address={targetToken.address} meta={targetToken} size="h-6 w-6" text="text-[7px]" />
              {reward.isStock || reward.isNative ? reward.symbol : `$${reward.symbol}`}
              {!reward.isNative && <span className="font-mono text-xs font-normal text-mut">{short(targetToken.address)}</span>}
            </span>
          )}
        </Row>
        <Row label="Schedule">
          <span className="text-[15px] font-semibold text-ink first-letter:uppercase">{config.scheduleLabel}</span>
          {config.marketHoursOnly && <span className="mt-0.5 block text-xs text-mut">market hours only</span>}
        </Row>
      </div>

      <Link href={`/${ca}`} className="group flex items-center justify-between gap-3 bg-ground/60 px-5 py-3 transition-colors hover:bg-tile/50">
        <span className="min-w-0 truncate font-mono text-xs text-mut">{SITE_HOST}/{short(ca)}</span>
        <span className="inline-flex shrink-0 items-center gap-1.5 text-sm font-semibold text-hood-600">Open its public page <Arrow className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" /></span>
      </Link>
    </div>
  );
}

function Verdict({ tone = 'mut', label, title, children, address }) {
  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 px-5 py-6">
        <div className={`label ${tone === 'gold' ? '!text-gold-600' : ''}`}>{label}</div>
        <div className="mt-3 font-display text-2xl font-medium tracking-tight text-ink">{title}</div>
        {address && <div className="mt-2 break-all font-mono text-xs text-mut">{address}</div>}
        <div className="mt-3 max-w-md text-sm leading-relaxed text-mut">{children}</div>
      </div>
    </div>
  );
}

export default function TokenSearch() {
  const [query, setQuery] = useState('');
  const [phase, setPhase] = useState('idle');
  const [result, setResult] = useState(null);
  const [run, setRun] = useState(0);
  const runRef = useRef(0);

  async function onSubmit(e) {
    e.preventDefault();
    const ca = query.trim();
    setRun((r) => r + 1);
    if (!isAnyAddress(ca)) { setResult({ kind: 'invalid' }); setPhase('done'); return; }

    const myRun = ++runRef.current;
    setPhase('searching');
    setResult(null);
    const started = Date.now();
    let res;
    try {
      const r = await fetch(`/api/dashboard/${ca}`, { cache: 'no-store' });
      if (r.ok) res = { kind: 'found', data: await r.json(), ca };
      else if (r.status === 404) res = { kind: 'notfound', ca };
      else res = { kind: 'error' };
    } catch {
      res = { kind: 'error' };
    }
    const wait = Math.max(0, 1000 - (Date.now() - started));
    setTimeout(() => {
      if (runRef.current !== myRun) return;
      setResult(res);
      setPhase('done');
      setRun((r) => r + 1);
    }, wait);
  }

  const typed = query.trim();
  const valid = isAnyAddress(typed);
  const stateLabel = phase === 'searching' ? 'reading' : phase === 'done' && result ? { found: 'on file', notfound: 'not on file', invalid: 'not an address', error: 'no answer' }[result.kind] : 'empty';

  return (
    <div id="check" className="grid scroll-mt-20 gap-x-10 gap-y-7 lg:grid-cols-12">
      <div className="lg:col-span-5">
        <div className="eyebrow mb-3">Token check</div>
        <h2 className="font-display text-3xl font-medium tracking-tight text-ink sm:text-4xl">Does a token route its fees?</h2>
        <p className="mt-3 text-[15px] leading-relaxed text-mut">Paste a Robinhood Chain contract address to find out.</p>

        <form onSubmit={onSubmit} className="mt-7">
          <div className="label mb-2 flex items-center justify-between">
            <label htmlFor="check-address">Contract address</label>
            <span className={valid ? '!text-hood-600' : ''}><span className={typed.length ? 'text-ink' : ''}>{typed.length}</span> / 42</span>
          </div>
          <div className="flex items-center gap-2 rounded-xl border border-line bg-paper py-1.5 pl-3.5 pr-1.5 transition-colors focus-within:border-hood-500">
            <Find className={`h-4 w-4 shrink-0 ${valid ? 'text-hood-600' : 'text-mut'}`} />
            <input
              id="check-address"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="0x…"
              spellCheck={false}
              autoComplete="off"
              className="min-w-0 flex-1 bg-transparent py-2 font-mono text-[13px] text-ink outline-none placeholder:text-mut/60"
            />
            <button type="submit" className="btn-primary shrink-0 !px-4 !py-2" disabled={phase === 'searching'}>
              {phase === 'searching' ? 'Checking…' : 'Check'}
              <Arrow className="h-4 w-4" />
            </button>
          </div>
          <p className="mt-2.5 text-xs text-mut">Starts with 0x, 42 characters. Nothing is sent but the address.</p>
        </form>
      </div>

      <div className="lg:col-span-7">
        <div className="frame flex min-h-[340px] flex-col overflow-hidden">
          <div className="label flex items-center justify-between border-b border-line px-5 py-2.5">
            <span>{BRAND} record</span>
            <span className={phase === 'done' && result?.kind === 'found' ? '!text-hood-600' : phase === 'done' && result?.kind === 'invalid' ? '!text-gold-600' : ''}>{stateLabel}</span>
          </div>
          <div className="relative flex-1" aria-live="polite">
            <AnimatePresence mode="wait" initial={false}>
              <motion.div key={phase === 'done' ? `done-${run}` : phase} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.3, ease: EASE }} className="h-full">
                {phase !== 'done' && <Blank busy={phase === 'searching'} />}
                {phase === 'done' && result?.kind === 'found' && <Found data={result.data} ca={result.ca} />}
                {phase === 'done' && result?.kind === 'notfound' && (
                  <Verdict label="No routing on record" title="Not linked yet" address={result.ca}>
                    This token isn&apos;t running {BRAND}. Set it up from the dashboard or the Telegram bot to start routing its fees.
                    <span className="mt-5 flex flex-wrap gap-2">
                      <Link href="/app" className="btn-primary !py-2">Open the dashboard <Arrow className="h-4 w-4" /></Link>
                      {BOT_URL && <a href={BOT_URL} target="_blank" rel="noopener noreferrer" className="btn-ghost !py-2"><Telegram className="h-4 w-4 text-[#2AABEE]" />Use Telegram</a>}
                    </span>
                  </Verdict>
                )}
                {phase === 'done' && result?.kind === 'invalid' && (
                  <Verdict tone="gold" label="Cannot be read" title="That doesn't look like a Robinhood Chain address.">Paste a 0x address (42 characters).</Verdict>
                )}
                {phase === 'done' && result?.kind === 'error' && (
                  <Verdict label="No answer" title="Couldn't check right now.">Please try again.</Verdict>
                )}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}
