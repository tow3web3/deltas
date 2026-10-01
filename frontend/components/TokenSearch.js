'use client';

// Look a coin up: does it route its fees through DELTAS? Solana first (a
// pump.fun mint), Robinhood Chain too (a 0x address). The answer is a glass
// card: the coin with its own logo, its routing as channels of light (one bar
// per destination, as long as its share), what holders are paid in, the
// schedule, and the way to its public page and to the explorer. Before a search
// the card is there, empty, so the visitor sees what they will get.
import { useRef, useState } from 'react';
import Link from 'next/link';
import { AnimatePresence, motion } from 'motion/react';
import { Arrow, Find, PlatformIcon, Dice, Rocket, Pie, Vote, Telegram, External } from './Icons';
import StockLogo from './StockLogo';
import { Mark } from './Logo';
import { legsFrom } from './PolicyMini';
import { ago } from './pages/PageParts';
import { BRAND, BOT_URL, SITE_HOST, TOKEN, TOKEN_CA } from '../lib/brand';
import { describeAddress } from '../lib/stocks';
import { getXStock } from '../lib/xstocks';
import { CHAINS, chainOf, isAnyAddress, isSolAddress, explorerTokenFor, shortAddress } from '../lib/chains';
import { pageName } from '../lib/pages';

const EASE = [0.16, 1, 0.3, 1];
const SOL_MINT = 'So11111111111111111111111111111111111111112';
const EXPLORER_NAME = { solana: 'Solscan', robinhood: 'Blockscout' };

const MODE = {
  fixed: null,
  roulette: { label: 'Stock Roulette', Icon: Dice },
  gainer: { label: 'Top Gainer', Icon: Rocket },
  portfolio: { label: 'Portfolio', Icon: Pie },
  vote: { label: 'Community Vote', Icon: Vote },
};
// What sits at the start of each channel: a dot of the destination's colour (pages show their platform).
const KIND = {
  holders: { label: 'Holders', dot: 'bg-cyan-500 shadow-[0_0_10px_#5FE3FF]' },
  wallet: { label: 'Wallet', dot: 'bg-ink shadow-[0_0_10px_rgba(243,245,249,0.5)]' },
  burn: { label: 'Buyback and burn', dot: 'bg-[#FF7A1A] shadow-[0_0_10px_#FF7A1A]' },
  treasury: { label: 'Treasury', dot: 'bg-hood-500 shadow-[0_0_10px_#2FA8FF]' },
  page: { label: 'Page', dot: 'bg-hood-400' },
  lottery: { label: 'Lottery', dot: 'bg-pink-600' },
};
const pct = (bps) => `${(bps / 100).toFixed(bps % 100 ? 1 : 0)}%`;
const amount = (n) => (n >= 100 ? n.toFixed(1) : n >= 1 ? n.toFixed(2) : n > 0 ? n.toFixed(4) : '0');

/** What holders are paid in: SOL, an xStock with its logo, or whatever the chain's registry says. */
function rewardView(target, chain) {
  const a = target?.address;
  if (chain === 'solana' && (!a || a === SOL_MINT || a === 'SOL' || /^0x/.test(a))) return { address: SOL_MINT, symbol: 'SOL', meta: { symbol: 'SOL', image: '/sol.png' }, native: true };
  const x = isSolAddress(a) ? getXStock(a) : null;
  if (x) return { address: x.mint, symbol: x.symbol, meta: { symbol: x.symbol, image: x.logo }, native: false };
  const d = describeAddress(a, target);
  return { address: a, symbol: d.isStock || d.isNative ? d.symbol : `$${d.symbol}`, meta: target, native: d.isNative };
}

function ChainChip({ chain }) {
  return (
    <span className="label flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-2 py-0.5 !text-[9.5px] !text-mut">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      {chain === 'solana' ? <img src="/sol.png" alt="" className="h-3 w-3 rounded-full" /> : <span className="h-1.5 w-1.5 rounded-full bg-hood-500" />}
      {CHAINS[chain].label}
    </span>
  );
}

function Row({ label, children, className = '' }) {
  return (
    <div className={`px-5 py-4 sm:px-6 ${className}`}>
      <div className="label mb-2.5">{label}</div>
      {children}
    </div>
  );
}

/** The card before a search, and while the chain is being read. */
function Blank({ busy }) {
  const bar = `h-2.5 rounded-full bg-white/[0.07] ${busy ? 'animate-pulse' : ''}`;
  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-4 px-5 py-5 sm:px-6">
        <span className={`h-12 w-12 shrink-0 rounded-full border border-dashed border-white/15 ${busy ? 'animate-pulse' : ''}`} />
        <div className="flex-1 space-y-2.5"><div className={`${bar} w-32`} /><div className={`${bar} w-52 max-w-full opacity-60`} /></div>
      </div>
      <Row label="Routing" className="border-t border-white/10">
        <div className="space-y-3">
          {[62, 24, 14].map((w, i) => (
            <div key={i} className="h-1.5 overflow-hidden rounded-full bg-white/[0.05]">
              <span className={`block h-full rounded-full bg-white/[0.09] ${busy ? 'animate-pulse' : ''}`} style={{ width: `${w}%`, animationDelay: `${i * 120}ms` }} />
            </div>
          ))}
        </div>
      </Row>
      <div className="grid flex-1 grid-cols-2 divide-x divide-white/10 border-t border-white/10">
        <Row label="Holders paid in"><div className={`${bar} w-20`} /></Row>
        <Row label="Schedule"><div className={`${bar} w-28`} /></Row>
      </div>
      <div className="flex items-center gap-2.5 border-t border-white/10 bg-black/20 px-5 py-3 text-sm text-mut sm:px-6">
        {busy ? <><span className="animate-pulse"><Mark className="h-5 w-5" /></span>Reading the chain…</> : 'Paste a mint: the routing of the coin shows here.'}
      </div>
    </div>
  );
}

function Found({ data, ca }) {
  const { sourceToken, targetToken, config, stats } = data;
  const chain = CHAINS[config?.chain] ? config.chain : chainOf(ca) || 'solana';
  const native = config?.native || CHAINS[chain].native;
  const decimals = config?.nativeDecimals ?? CHAINS[chain].nativeDecimals;
  const routed = Number(stats?.totalEthClaimed || 0) / 10 ** decimals;
  const d = describeAddress(sourceToken.address, sourceToken);
  const legs = legsFrom({ legs: data.legs, split: config.split });
  const total = legs.reduce((s, l) => s + l.shareBps, 0);
  const mode = MODE[config.rewardMode];
  // On Solana the engine pays holders in their leg's asset when the leg names one, the coin's reward otherwise.
  const holdersLeg = chain === 'solana' ? legs.find((l) => l.kind === 'holders' && l.asset) : null;
  const reward = rewardView(holdersLeg ? { address: holdersLeg.asset, symbol: holdersLeg.assetSymbol } : targetToken, chain);
  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-3 px-5 py-5 sm:px-6">
        <StockLogo address={sourceToken.address} meta={sourceToken} size="h-12 w-12" text="text-xs" />
        <div className="min-w-[160px] flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="truncate font-display text-2xl font-medium tracking-tight text-ink">{d.isStock ? d.symbol : `$${d.symbol}`}</span>
            <span className={`label flex items-center gap-1.5 rounded-full border px-2 py-0.5 !text-[9.5px] ${config.isActive ? 'border-cyan-500/40 !text-cyan-500' : 'border-white/10'}`}>
              <span className={`h-1.5 w-1.5 rounded-full ${config.isActive ? 'bg-cyan-500 shadow-[0_0_8px_#5FE3FF]' : 'bg-mut'}`} />{config.isActive ? 'Active' : 'Paused'}
            </span>
            <ChainChip chain={chain} />
          </div>
          <div className="mt-0.5 truncate text-[13px] text-mut">
            {sourceToken.name ? `${sourceToken.name} · ` : ''}
            <a href={explorerTokenFor(chain, sourceToken.address)} target="_blank" rel="noopener noreferrer" className="font-mono text-xs transition-colors hover:text-hood-600">{shortAddress(sourceToken.address)}</a>
          </div>
        </div>
        <dl className="flex w-full gap-6 border-t border-white/10 pt-3 sm:w-auto sm:border-0 sm:pt-0 sm:text-right">
          <div><dd className="figure text-2xl font-medium leading-none text-ink">{(stats?.totalExecutions ?? 0).toLocaleString('en-US')}</dd><dt className="label mt-1.5 !text-[9.5px]">cycles</dt></div>
          <div><dd className="figure text-2xl font-medium leading-none text-ink">{amount(routed)}<span className="ml-1 font-mono text-[11px] font-normal text-mut">{native}</span></dd><dt className="label mt-1.5 !text-[9.5px]">routed</dt></div>
          <div><dd className="figure text-2xl font-medium leading-none text-ink">{stats?.lastExecution ? ago(stats.lastExecution).replace(' ago', '') : 'none'}</dd><dt className="label mt-1.5 !text-[9.5px]">{stats?.lastExecution ? 'since the last' : 'yet'}</dt></div>
        </dl>
      </div>

      <Row label={`Routing · ${legs.length} route${legs.length === 1 ? '' : 's'}`} className="border-t border-white/10">
        <ul className="space-y-3">
          {legs.map((l, i) => {
            const k = KIND[l.kind] || KIND.wallet;
            return (
              <li key={i}>
                <div className="flex min-w-0 items-center gap-2 text-[13px]">
                  {l.kind === 'page' && l.page ? <PlatformIcon platform={l.page.platform} className="h-3.5 w-3.5 shrink-0" /> : <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${k.dot}`} />}
                  <span className="truncate text-ink/90">{l.kind === 'page' && l.page ? pageName(l.page.platform, l.page.handle) : l.label || k.label}</span>
                  {l.assetSymbol && <span className="label shrink-0 !text-[9.5px]">in {l.assetSymbol}</span>}
                  <span className="ml-auto shrink-0 font-mono text-[13px] tabular-nums text-cyan-500">{pct(l.shareBps)}</span>
                </div>
                <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-white/[0.05]">
                  <motion.span className="beam block h-full rounded-full shadow-[0_0_12px_rgba(95,227,255,0.45)]" initial={{ width: 0 }} animate={{ width: `${l.shareBps / 100}%` }} transition={{ duration: 0.8, delay: 0.1 + i * 0.07, ease: EASE }} />
                </div>
              </li>
            );
          })}
          {total < 10000 && (
            <li className="flex items-center gap-2 text-[13px]">
              <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-white/20" />
              <span className="text-mut">Not assigned</span>
              <span className="ml-auto font-mono text-[13px] tabular-nums text-mut">{pct(10000 - total)}</span>
            </li>
          )}
        </ul>
      </Row>

      <div className="grid flex-1 grid-cols-2 divide-x divide-white/10 border-t border-white/10">
        <Row label="Holders paid in">
          {mode ? (
            <span className="inline-flex items-center gap-2 text-[15px] font-medium text-ink"><mode.Icon className="h-5 w-5 text-cyan-500" />{mode.label}</span>
          ) : (
            <span className="inline-flex min-w-0 items-center gap-2 text-[15px] font-medium text-ink">
              <StockLogo address={reward.address} meta={reward.meta} size="h-6 w-6" text="text-[7px]" />
              {reward.symbol}
              {!reward.native && reward.address && <span className="hidden truncate font-mono text-xs font-normal text-mut sm:inline">{shortAddress(reward.address)}</span>}
            </span>
          )}
        </Row>
        <Row label="Schedule">
          <span className="text-[15px] font-medium text-ink first-letter:uppercase">{config.scheduleLabel}</span>
          {config.marketHoursOnly && <span className="mt-0.5 block text-xs text-mut">market hours only</span>}
        </Row>
      </div>

      <div className="grid border-t border-white/10 bg-black/20 sm:grid-cols-[minmax(0,1fr)_auto]">
        <Link href={`/${ca}`} className="group flex items-center justify-between gap-3 px-5 py-3 transition-colors hover:bg-white/[0.04] sm:px-6">
          <span className="min-w-0 truncate font-mono text-xs text-mut">{SITE_HOST}/{shortAddress(ca)}</span>
          <span className="inline-flex shrink-0 items-center gap-1.5 text-sm font-medium text-hood-600">Its public page <Arrow className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" /></span>
        </Link>
        <a href={explorerTokenFor(chain, ca)} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 border-t border-white/10 px-5 py-3 text-sm text-mut transition-colors hover:bg-white/[0.04] hover:text-ink sm:border-l sm:border-t-0 sm:px-6">
          {EXPLORER_NAME[chain]}<External className="h-3.5 w-3.5" />
        </a>
      </div>
    </div>
  );
}

function Verdict({ tone = 'mut', label, title, children, address }) {
  const chain = chainOf(address);
  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 px-5 py-6 sm:px-6">
        <div className={`label ${tone === 'gold' ? '!text-gold-600' : ''}`}>{label}</div>
        <div className="mt-3 font-display text-2xl font-medium tracking-tight text-ink">{title}</div>
        {address && (
          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
            <span className="break-all font-mono text-xs text-mut">{address}</span>
            {chain && <a href={explorerTokenFor(chain, address)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-hood-600 transition-colors hover:text-hood-700">{EXPLORER_NAME[chain]}<External className="h-3 w-3" /></a>}
          </div>
        )}
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
  const typedChain = chainOf(typed);
  const stateLabel = phase === 'searching' ? 'reading' : phase === 'done' && result ? { found: 'routing', notfound: 'not routing', invalid: 'not an address', error: 'no answer' }[result.kind] : 'empty';

  return (
    <div id="check" className="grid scroll-mt-20 items-start gap-x-12 gap-y-8 lg:grid-cols-12">
      <div className="lg:col-span-5">
        <div className="eyebrow mb-4">Coin check</div>
        <h2 className="font-display text-[34px] font-medium leading-[1.05] tracking-[-0.03em] text-ink sm:text-[42px]">Does this coin route its fees <span className="text-beam">here?</span></h2>
        <p className="mt-4 max-w-md text-[15px] leading-relaxed text-mut">Paste a pump.fun mint or any coin address. Solana first; a Robinhood Chain address works too.</p>

        <form onSubmit={onSubmit} className="mt-8">
          <div className="label mb-2 flex items-center justify-between gap-3">
            <label htmlFor="check-address">Mint or address</label>
            <span className={typedChain ? '!text-cyan-500' : ''}>
              {typedChain === 'solana' ? 'Solana mint' : typedChain === 'robinhood' ? 'Robinhood Chain' : typed.length ? <><span className="text-ink">{typed.length}</span> characters</> : 'Solana · Robinhood Chain'}
            </span>
          </div>
          <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] py-1.5 pl-4 pr-1.5 backdrop-blur-md transition-[border-color,box-shadow] focus-within:border-cyan-500/60 focus-within:shadow-glow">
            <Find className={`h-4 w-4 shrink-0 ${typedChain ? 'text-cyan-500' : 'text-mut'}`} />
            <input
              id="check-address"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="pump.fun mint or 0x address"
              spellCheck={false}
              autoComplete="off"
              className="min-w-0 flex-1 bg-transparent py-2 font-mono text-[13px] text-ink outline-none placeholder:text-mut/60"
            />
            <button type="submit" className="btn-primary shrink-0 !px-4 !py-2" disabled={phase === 'searching'}>
              {phase === 'searching' ? 'Checking…' : 'Check'}
              <Arrow className="h-4 w-4" />
            </button>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2">
            {TOKEN_CA && (
              <button type="button" onClick={() => setQuery(TOKEN_CA)} className="chip transition-colors hover:border-cyan-500/40 hover:text-ink">
                <StockLogo address={TOKEN_CA} size="h-4 w-4" text="text-[5px]" />Try {TOKEN}
              </button>
            )}
            <p className="text-xs leading-relaxed text-mut">A Solana mint is 32 to 44 characters; pump.fun mints usually end in <span className="font-mono text-ink/80">pump</span>. Nothing is sent but the address.</p>
          </div>
        </form>
      </div>

      <div className="lg:col-span-7">
        <div className="frame flex min-h-[360px] flex-col overflow-hidden shadow-soft">
          <div className="label flex items-center justify-between border-b border-white/10 px-5 py-3 sm:px-6">
            <span>{BRAND} · routing on record</span>
            <span className={phase === 'done' && result?.kind === 'found' ? '!text-cyan-500' : phase === 'done' && result?.kind === 'invalid' ? '!text-gold-600' : ''}>{stateLabel}</span>
          </div>
          <div className="relative flex-1" aria-live="polite">
            <AnimatePresence mode="wait" initial={false}>
              <motion.div key={phase === 'done' ? `done-${run}` : phase} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.3, ease: EASE }} className="h-full">
                {phase !== 'done' && <Blank busy={phase === 'searching'} />}
                {phase === 'done' && result?.kind === 'found' && <Found data={result.data} ca={result.ca} />}
                {phase === 'done' && result?.kind === 'notfound' && (
                  <Verdict label="No routing on record" title="Not routing here yet" address={result.ca}>
                    This coin isn&apos;t running {BRAND}. Its creator can set it up from the dashboard or the Telegram bot to start routing its fees.
                    <span className="mt-5 flex flex-wrap gap-2">
                      <Link href="/app" className="btn-primary !py-2">Open the dashboard <Arrow className="h-4 w-4" /></Link>
                      {BOT_URL && <a href={BOT_URL} target="_blank" rel="noopener noreferrer" className="btn-ghost !py-2"><Telegram className="h-4 w-4 text-[#2AABEE]" />Use Telegram</a>}
                    </span>
                  </Verdict>
                )}
                {phase === 'done' && result?.kind === 'invalid' && (
                  <Verdict tone="gold" label="Cannot be read" title="That is not a Solana mint or a Robinhood Chain address.">
                    A Solana mint is 32 to 44 characters of base58. A Robinhood Chain address starts with 0x and is 42 characters long.
                  </Verdict>
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
