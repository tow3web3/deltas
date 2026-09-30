'use client';

// The public page of a coin. Read top to bottom it answers three questions:
// who the coin is (masthead), where its fees go (the routing, the one frame
// that owns the page), and what proves it (figures, cycles as a ledger,
// recipients as a ranking, the treasury as a balance sheet).
import { useEffect, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { motion, useInView } from 'motion/react';
import PerformanceChart from '../../components/PerformanceChart';
import Navigation from '../../components/Navigation';
import TickerTape from '../../components/TickerTape';
import Footer from '../../components/Footer';
import StockLogo from '../../components/StockLogo';
import Countdown from '../../components/Countdown';
import PolicyMini from '../../components/PolicyMini';
import { PageAvatar } from '../../components/pages/PageParts';
import { Arrow, Copy, Check, External, Clock, Burn, Vault, Wallet, Dice, TrendUp, Pie, Vote, Users, Rise as Up, Fall as Down } from '../../components/Icons';
import { describeAddress, explorerTx, explorerToken, explorerAddress } from '../../lib/stocks';
import { PLATFORMS, pageName, pagePath } from '../../lib/pages';
import { BRAND } from '../../lib/brand';

const EASE = [0.16, 1, 0.3, 1];
const short = (a) => (a ? `${a.slice(0, 6)}…${a.slice(-4)}` : '');
const fmt = (n) => new Intl.NumberFormat('en-US').format(n || 0);
const compact = (n) => new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 2 }).format(n || 0);
const nativeAmount = (raw, decimals, d = 4) => (Number(raw || 0) / 10 ** decimals).toFixed(d);
const units = (raw, decimals) => Number(raw || 0) / 10 ** Number(decimals ?? 18);
/** An amount of any asset: compact when large, enough decimals to stay readable when small. */
const amount = (n) => {
  const v = Number(n) || 0;
  if (v === 0) return '0';
  if (v >= 1000) return compact(v);
  if (v >= 1) return v.toFixed(2);
  return v.toFixed(v < 0.0001 ? 6 : 4);
};
const pct = (bps) => `${(bps / 100).toFixed(bps % 100 ? 1 : 0)}%`;
const day = (d) => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
const clock = (d) => new Date(d).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });

const MODE = {
  fixed: null,
  roulette: { label: 'Stock Roulette', Icon: Dice, hint: 'a random liquid stock each cycle' },
  gainer: { label: 'Top Gainer', Icon: TrendUp, hint: "the day's best stock" },
  portfolio: { label: 'Portfolio', Icon: Pie, hint: 'rotating through a basket' },
  vote: { label: 'Community Vote', Icon: Vote, hint: 'holders pick the reward' },
};

// The colour of each kind of route, the same ones the diagram draws its flows in.
const KIND = {
  holders: { label: 'Holders', color: '#2FA8FF', Icon: Users },
  wallet: { label: 'Wallet', color: '#F4F5F4', Icon: Wallet },
  burn: { label: 'Buyback and burn', color: '#FF7A1A', Icon: Burn },
  treasury: { label: 'Treasury', color: '#F6C343', Icon: Vault },
  page: { label: 'Page', color: '#7DB4FF', Icon: null },
  lottery: { label: 'Lottery', color: '#FF3D8A', Icon: Dice },
};

/** Legs from the API, or the four-way split when the canvas was never used. */
function routesOf({ legs, split }) {
  if (Array.isArray(legs) && legs.length) return legs;
  const out = [];
  const s = split || { holders: 10000 };
  if (s.holders > 0) out.push({ kind: 'holders', shareBps: s.holders, label: 'Holders' });
  if (s.creator > 0) out.push({ kind: 'wallet', shareBps: s.creator, label: 'Creator' });
  if (s.burn > 0) out.push({ kind: 'burn', shareBps: s.burn, label: 'Buyback and burn' });
  if (s.treasury > 0) out.push({ kind: 'treasury', shareBps: s.treasury, label: 'Treasury' });
  return out;
}

/** A block that rises into place the first time it is seen. */
function Enter({ children, delay = 0, className = '', as = 'div' }) {
  const ref = useRef(null);
  const seen = useInView(ref, { once: true, amount: 0.05 });
  const Tag = motion[as] || motion.div;
  return (
    <Tag ref={ref} initial={{ opacity: 0, y: 12 }} animate={seen ? { opacity: 1, y: 0 } : {}} transition={{ duration: 0.6, delay, ease: EASE }} className={className}>
      {children}
    </Tag>
  );
}

function Change({ value, digits = 2 }) {
  if (typeof value !== 'number') return null;
  const Icon = value >= 0 ? Up : Down;
  return <span className={`figure inline-flex items-center gap-0.5 ${value >= 0 ? 'up' : 'dn'}`}><Icon className="h-2.5 w-2.5" />{Math.abs(value).toFixed(digits)}%</span>;
}

function Out({ href, children, className = '' }) {
  return <a href={href} target="_blank" rel="noopener noreferrer" className={`inline-flex items-center gap-1 transition-colors hover:text-ink ${className}`}>{children}<External className="h-3 w-3 shrink-0" /></a>;
}

/** A term of the policy: caption on the left, value on the right, a hairline between lines. */
function Term({ label, children }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-2.5">
      <dt className="label shrink-0">{label}</dt>
      <dd className="text-right text-sm text-ink">{children}</dd>
    </div>
  );
}

/** One route of the policy: who is paid, in what, and how much of every cycle. */
function RouteLine({ leg, source }) {
  const k = KIND[leg.kind] || KIND.wallet;
  const sym = source?.symbol ? `$${source.symbol}` : 'the coin';
  const isPage = leg.kind === 'page' && leg.page;
  const name = isPage ? pageName(leg.page.platform, leg.page.handle) : leg.label || k.label;
  const where = isPage
    ? `${PLATFORMS[leg.page.platform]?.label || leg.page.platform} ${PLATFORMS[leg.page.platform]?.noun || 'page'}`
    : leg.kind === 'holders' ? `every holder of ${sym}, by weight`
      : leg.kind === 'burn' ? `buys ${sym} on the market and burns it`
        : leg.kind === 'lottery' ? 'one holder wins, every 24h'
          : leg.address ? short(leg.address) : 'address not set';
  const paidIn = leg.kind === 'burn' ? { address: source?.address, meta: source, text: 'buyback' }
    : leg.asset ? { address: leg.asset, meta: { symbol: leg.assetSymbol }, text: leg.assetSymbol || describeAddress(leg.asset).symbol }
      : null;

  const lead = isPage
    ? <PageAvatar page={leg.page} size="h-9 w-9" badge="h-4 w-4" />
    : leg.kind === 'holders' || leg.kind === 'burn'
      ? <StockLogo address={source?.address} meta={source} size="h-9 w-9" text="text-[8px]" />
      : <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-line bg-tile" style={{ color: k.color }}><k.Icon className="h-4 w-4" /></span>;

  const title = <span className="truncate text-sm font-semibold text-ink transition-colors group-hover:text-hood-600">{name}</span>;
  const asset = paidIn
    ? <span className="inline-flex items-center gap-1.5 text-xs text-ink"><StockLogo address={paidIn.address} meta={paidIn.meta} size="h-4 w-4" text="text-[5px]" />{paidIn.text}</span>
    : <span className="text-xs text-mut">in kind</span>;

  const body = (
    <>
      {lead}
      <span className="min-w-0">
        <span className="flex items-center gap-2">
          {title}
          {isPage && (
            <span className={`label shrink-0 ${leg.page.claimed ? '!text-hood-600' : '!text-gold-400'}`}>{leg.page.claimed ? 'claimed' : 'unclaimed'}</span>
          )}
        </span>
        <span className="block truncate text-xs text-mut">
          {where}{isPage ? ` · ${leg.page.claimed ? 'paid to its owner' : 'held in its vault'}` : ''}
          <span className="sm:hidden"> · {paidIn ? paidIn.text : 'in kind'}</span>
        </span>
      </span>
      <span className="hidden sm:block">{asset}</span>
      <span className="hidden h-1 w-28 overflow-hidden rounded-full bg-line md:block"><span className="block h-full rounded-full" style={{ width: `${Math.min(100, leg.shareBps / 100)}%`, background: k.color }} /></span>
      <span className="figure w-14 text-right text-lg font-medium text-ink">{pct(leg.shareBps)}</span>
    </>
  );
  const cls = 'group grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-x-3 px-4 py-3 sm:grid-cols-[auto_minmax(0,1fr)_7rem_auto] sm:px-6 md:grid-cols-[auto_minmax(0,1fr)_7rem_7rem_auto] md:gap-x-5';
  if (isPage) return <Link href={pagePath(leg.page.platform, leg.page.handle)} className={`${cls} transition-colors hover:bg-tile/50`}>{body}</Link>;
  if ((leg.kind === 'wallet' || leg.kind === 'treasury') && leg.address) return <a href={explorerAddress(leg.address)} target="_blank" rel="noopener noreferrer" className={`${cls} transition-colors hover:bg-tile/50`}>{body}</a>;
  return <div className={cls}>{body}</div>;
}

/** A line of the figures ledger: caption, what it counts, the figure on the right. */
function Count({ label, figure, children }) {
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-1.5 px-6 py-4">
      <div className="label">{label}</div>
      <div className="row-span-2 text-right font-display text-2xl font-medium leading-none tracking-tight text-ink">{figure}</div>
      <div className="min-h-[20px] text-xs text-mut">{children}</div>
    </div>
  );
}

/** The links of a cycle: its receipt on the site, its transactions on the explorer. */
function CycleLinks({ e, hashes = false }) {
  return (
    <span className="flex flex-wrap items-center justify-end gap-x-3 gap-y-1 font-mono text-[11px]">
      <Link href={`/receipt/${e.id}`} className="text-hood-600 transition-colors hover:text-hood-700">receipt</Link>
      {e.swapTx && <Out href={explorerTx(e.swapTx)} className="text-mut">{hashes ? `swap ${short(e.swapTx)}` : 'swap'}</Out>}
      {e.burnTx && <Out href={explorerTx(e.burnTx)} className="text-orange-400">{hashes ? `burn ${short(e.burnTx)}` : 'burn'}</Out>}
      {e.txHash && <Out href={explorerTx(e.txHash)} className="text-mut">{hashes ? `payout ${short(e.txHash)}` : 'payout'}</Out>}
    </span>
  );
}

function Shell({ children }) {
  return (
    <>
      <TickerTape />
      <Navigation />
      <main className="mx-auto flex min-h-[60vh] max-w-6xl items-center px-5 py-16">{children}</main>
      <Footer />
    </>
  );
}

export default function TokenDashboard() {
  const params = useParams();
  const tokenAddress = params.tokenAddress;
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);

  const copyCA = async () => {
    try { await navigator.clipboard.writeText(tokenAddress); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch { /* ignore */ }
  };

  useEffect(() => {
    async function load() {
      try {
        const response = await fetch(`/api/dashboard/${tokenAddress}`);
        if (!response.ok) throw new Error('Token not found or not active');
        setData(await response.json());
        setLoading(false);
      } catch (err) {
        setError(err.message);
        setLoading(false);
      }
    }
    load();
    const interval = setInterval(load, 30000);
    return () => clearInterval(interval);
  }, [tokenAddress]);

  if (loading) {
    return (
      <Shell>
        <div className="w-full">
          <div className="label flex items-center gap-2"><span className="h-1.5 w-1.5 animate-pulse rounded-full bg-hood-500" />Reading the routing</div>
          <div className="mt-3 break-all font-mono text-sm text-mut">{tokenAddress}</div>
          <div className="mt-8 h-px w-full overflow-hidden bg-line"><div className="h-full w-1/3 animate-pulse bg-hood-500" /></div>
        </div>
      </Shell>
    );
  }

  if (error) {
    return (
      <Shell>
        <div className="grid w-full gap-8 border-t border-line pt-8 lg:grid-cols-12">
          <div className="lg:col-span-7">
            <div className="label">No routing on this address</div>
            <h1 className="mt-3 font-display text-4xl font-medium tracking-tight text-ink">Token not found</h1>
            <p className="mt-3 max-w-md text-sm text-mut">This token doesn't have an active {BRAND} configuration yet.</p>
            <Link href="/" className="btn-primary mt-7">Go home <Arrow className="h-4 w-4" /></Link>
          </div>
          <div className="lg:col-span-5">
            <div className="label">Address asked for</div>
            <div className="mt-3 break-all font-mono text-sm text-ink">{tokenAddress}</div>
          </div>
        </div>
      </Shell>
    );
  }

  const src = data.sourceToken;
  const tgt = data.targetToken;
  // The chain's own currency: SOL on Solana, ETH on Robinhood Chain.
  const NATIVE = data.config.native || 'ETH';
  const eth = (raw, d = 4) => nativeAmount(raw, data.config.nativeDecimals || 18, d);
  const reward = describeAddress(tgt.address, tgt);
  const mode = MODE[data.config.rewardMode];
  const rewardDecimals = Number(tgt.decimals ?? 18);
  const ethClaimed = eth(data.stats.totalEthClaimed);
  const quote = tgt.quote;
  const routes = routesOf({ legs: data.legs, split: data.config.split });
  const routedBps = routes.reduce((a, l) => a + (Number(l.shareBps) || 0), 0);
  const cycles = data.recentExecutions;
  const latest = cycles[0];
  const earlier = cycles.slice(1, 12);
  const ticks = cycles.slice(0, 24).reverse();
  const tickMax = Math.max(...ticks.map((e) => Number(e.claimedEth || 0)), 0);
  const topMax = Math.max(...data.topRecipients.map((r) => units(r.totalReceived, r.rewardDecimals ?? rewardDecimals)), 0);
  const apy = data.yield?.apy ? (data.yield.apy >= 100 ? Math.round(data.yield.apy) : data.yield.apy >= 10 ? data.yield.apy.toFixed(1) : data.yield.apy.toFixed(2)) : null;
  const updated = new Date(data.timestamp).toLocaleTimeString();
  const SPLIT = data.config.split ? [
    ['Payout ratio', data.config.split.holders, 'bg-hood-500'],
    ['Pages', data.config.split.pages || 0, 'bg-[#5B9DFF]'],
    ['Wallets', data.config.split.creator || 0, 'bg-ink'],
    ['Buyback', data.config.split.burn, 'bg-orange-700'],
    ['Retained', data.config.split.treasury, 'bg-gold-400'],
  ] : [];

  return (
    <>
      <TickerTape />
      <Navigation />
      <main className="mx-auto max-w-6xl px-5 pb-12 pt-8 sm:pt-10">
        {/* Masthead: who the coin is */}
        <Enter as="header" className="grid gap-x-8 gap-y-6 lg:grid-cols-12 lg:items-end">
          <div className="flex min-w-0 items-start gap-4 sm:gap-5 lg:col-span-8">
            <StockLogo address={src.address} meta={src} size="h-14 w-14 sm:h-[72px] sm:w-[72px]" text="text-xs" />
            <div className="min-w-0 flex-1">
              <div className="label flex flex-wrap items-center gap-x-2 gap-y-1">
                {data.config.isActive ? (
                  <>
                    <span className="relative flex h-1.5 w-1.5"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-hood-500 opacity-60" /><span className="relative h-1.5 w-1.5 rounded-full bg-hood-500" /></span>
                    <span className="text-hood-600">Routing live</span>
                    <span>· {data.config.scheduleLabel} · next dividend in</span>
                    <span className="figure text-[13px] tracking-normal text-ink"><Countdown intervalMinutes={data.config.intervalMinutes} scheduleKind={data.config.scheduleKind} /></span>
                  </>
                ) : (
                  <><span className="h-1.5 w-1.5 rounded-full bg-mut" /><span>Paused · {data.config.scheduleLabel}</span></>
                )}
              </div>
              <h1 className="mt-2 flex flex-wrap items-baseline gap-x-3 gap-y-1 font-display text-3xl font-medium leading-none tracking-tight text-ink sm:text-5xl">
                <span className="min-w-0 break-words">{src.name || `$${src.symbol || short(src.address)}`}</span>
                {src.symbol && <span className="font-mono text-base font-medium tracking-normal text-mut">${src.symbol}</span>}
              </h1>
              <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 font-mono text-xs text-mut">
                <button onClick={copyCA} title="Copy contract address" className="inline-flex min-w-0 items-center gap-1.5 transition-colors hover:text-ink">
                  <span className="hidden md:inline">{src.address}</span>
                  <span className="md:hidden">{short(src.address)}</span>
                  {copied ? <Check className="h-3.5 w-3.5 shrink-0 text-hood-600" /> : <Copy className="h-3.5 w-3.5 shrink-0" />}
                </button>
                <Out href={explorerToken(src.address)}>{data.config.chain === 'solana' ? 'Solscan' : 'Blockscout'}</Out>
                {data.config.marketHoursOnly && <span className="inline-flex items-center gap-1.5 text-ink"><Clock className="h-3.5 w-3.5 text-mut" />Market hours only</span>}
                {data.config.destination === 'burn' && <span className="inline-flex items-center gap-1.5 text-orange-700"><Burn className="h-3.5 w-3.5" />Buyback and burn</span>}
              </div>
            </div>
          </div>

          <div className="flex items-stretch divide-x divide-line border-y border-line lg:col-span-4 lg:border-y-0">
            <div className="flex-1 py-3 pr-5 lg:py-0">
              <div className="label">Market cap</div>
              <div className="figure mt-1.5 text-2xl font-medium leading-none text-ink">{src.marketCap ? `$${compact(src.marketCap)}` : <span className="text-mut">not listed</span>}</div>
            </div>
            <div className="flex-1 py-3 pl-5 lg:py-0" title={data.yield?.apy ? `${data.yield.eth30d.toFixed(4)} ETH returned over the last ${data.yield.windowDays} days, annualized against market cap` : undefined}>
              <div className="label">{apy ? 'Dividend yield' : 'Returned · 30d'}</div>
              <div className="figure mt-1.5 text-2xl font-medium leading-none text-gold-400">
                {apy ? `${apy}%` : data.yield?.cycles30d ? <>{data.yield.eth30d.toFixed(4)} <span className="text-sm text-mut">{NATIVE}</span></> : <span className="text-mut">none yet</span>}
              </div>
            </div>
            {data.config.rewardMode === 'vote' && (
              <div className="flex items-center py-3 pl-5 lg:py-0">
                <Link href="/vote" className="btn-primary px-3 py-2 text-xs">Vote now <Arrow className="h-3.5 w-3.5" /></Link>
              </div>
            )}
          </div>
        </Enter>

        {/* The routing: where every cycle's fees go */}
        <Enter as="section" delay={0.08} className="frame mt-8 overflow-hidden">
          <div className="grid lg:grid-cols-12">
            <aside className="flex flex-col border-b border-line p-6 sm:p-7 lg:col-span-4 lg:border-b-0 lg:border-r">
              <span className="eyebrow">The routing</span>
              <h2 className="mt-4 font-display text-2xl font-medium leading-tight tracking-tight text-ink sm:text-[28px]">
                Every cycle, the fees leave the dev wallet and go out on {routes.length === 1 ? 'one route' : `${routes.length} routes`}.
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-mut">Where every cycle's fees go, exactly as the creator drew it.</p>

              <div className="mt-7 lg:mt-auto lg:pt-8">
                {data.config.isActive && (
                  <div className="border-t border-line pb-4 pt-4">
                    <div className="label">Next dividend · countdown</div>
                    <div className="figure mt-1.5 text-5xl font-medium leading-none tracking-tight text-hood-500"><Countdown intervalMinutes={data.config.intervalMinutes} scheduleKind={data.config.scheduleKind} /></div>
                  </div>
                )}
                <dl className="divide-y divide-line border-t border-line">
                  <Term label="Schedule">{data.config.scheduleLabel}{data.config.marketHoursOnly ? ', market hours only' : ''}</Term>
                  <Term label="Fee source">{data.config.feeSource === 'univ3' ? 'Uniswap V3 LP fees' : data.config.chain === 'solana' ? 'pump.fun creator fees, into the dev wallet' : 'Dev wallet balance (ETH)'}</Term>
                  <Term label="Loyalty weighting">
                    {data.config.loyalty?.enabled ? (
                      <>
                        1x to {data.config.loyalty.maxMultiplier.toFixed(1)}x over {data.config.loyalty.rampDays} days
                        {data.config.loyalty.minHoldHours > 0 ? `, min hold ${data.config.loyalty.minHoldHours}h` : ''}
                        {data.config.loyalty.sellReset ? ', selling resets the clock' : ''}
                      </>
                    ) : <span className="text-mut">off, weight = balance</span>}
                  </Term>
                  <Term label="Last dividend">{data.stats.lastExecution ? new Date(data.stats.lastExecution).toLocaleString() : 'Never'}</Term>
                </dl>
              </div>
            </aside>

            <div className="min-w-0 p-3 sm:p-4 lg:col-span-8">
              <PolicyMini source={data.sourceToken} devWallet={data.devWallet} schedule={data.config.scheduleLabel} legs={data.legs} split={data.config.split} countdown={{ intervalMinutes: data.config.intervalMinutes, scheduleKind: data.config.scheduleKind, active: data.config.isActive }} />
            </div>
          </div>

          {/* The same routes, as lines you can read and follow */}
          <div className="border-t border-line">
            <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 px-4 pb-3 pt-4 sm:px-6">
              <span className="label">{routes.length} route{routes.length === 1 ? '' : 's'} · <span className="text-ink">{pct(routedBps)}</span> of every cycle</span>
              <span className="label">Updated {updated}</span>
            </div>
            <div className="mx-4 flex h-1.5 gap-px overflow-hidden rounded-full bg-line sm:mx-6" aria-hidden="true">
              {routes.map((l, i) => <span key={i} style={{ width: `${Math.min(100, l.shareBps / 100)}%`, background: (KIND[l.kind] || KIND.wallet).color }} />)}
            </div>
            <div className="mt-3 divide-y divide-line border-t border-line">
              {routes.map((l, i) => <RouteLine key={i} leg={l} source={src} />)}
            </div>
          </div>
        </Enter>

        {/* The evidence, first in figures */}
        <Enter as="section" className="mt-3 grid gap-3 lg:grid-cols-12">
          <div className="panel min-w-0 p-6 sm:p-7 lg:col-span-8">
            <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-1">
              <span className="label">Fees turned into dividends · all time</span>
              <span className="label">in {NATIVE}, last {cycles.length} cycles</span>
            </div>
            <div className="mt-4 flex flex-wrap items-end gap-x-5 gap-y-2">
              <div className="flex items-center gap-3">
                <StockLogo address={null} size="h-9 w-9" />
                <span className="figure text-5xl font-medium leading-[0.9] tracking-tight text-ink sm:text-6xl">{ethClaimed}</span>
                <span className="self-end pb-0.5 font-display text-xl text-mut">{NATIVE}</span>
              </div>
              {data.yield?.cycles30d ? (
                <div className="pb-0.5 text-sm text-mut">
                  <span className="figure text-hood-600">{data.yield.eth30d.toFixed(4)} {NATIVE}</span> of it in the last 30 days
                  <br />over <span className="figure text-ink">{fmt(data.yield.cycles30d)}</span> cycles
                </div>
              ) : null}
            </div>
            <div className="mt-6">
              <h2 className="sr-only">Fees paid out per cycle</h2>
              {cycles.length > 0 ? (
                <PerformanceChart data={cycles} />
              ) : (
                <div className="flex h-64 items-center justify-center border-t border-dashed border-line text-sm text-mut">No dividend yet. The first cycle is coming.</div>
              )}
            </div>
          </div>

          <div className="panel flex flex-col divide-y divide-line overflow-hidden lg:col-span-4">
            <div className="flex items-center gap-4 px-6 py-5">
              <StockLogo address={tgt.address} meta={tgt} size="h-12 w-12" text="text-xs" />
              <div className="min-w-0 flex-1">
                <div className="label flex items-center gap-1.5">{mode ? <><mode.Icon className="h-3.5 w-3.5 text-hood-600" />{mode.label}</> : 'Dividends paid in'}</div>
                {mode ? (
                  <>
                    <div className="mt-1 font-display text-lg font-medium leading-snug tracking-tight text-ink">{mode.hint}</div>
                    {data.config.basket && <div className="mt-0.5 font-mono text-xs text-mut">{data.config.basket.label}: {data.config.basket.tickers?.join(' > ')}</div>}
                    <div className="mt-0.5 text-xs text-mut">Fallback reward: <span className="font-mono font-semibold text-ink">{reward.symbol}</span></div>
                  </>
                ) : (
                  <>
                    <div className="mt-1 flex items-baseline gap-2">
                      <span className="font-display text-2xl font-medium leading-none tracking-tight text-ink">{reward.symbol}</span>
                      <span className="truncate text-sm text-mut">{reward.name}</span>
                    </div>
                    {quote ? (
                      <div className="mt-1 flex items-center gap-2 text-sm">
                        <span className="figure text-ink">${quote.price.toFixed(2)}</span>
                        <Change value={quote.changePct} />
                        <span className="text-xs text-mut">Yahoo Finance</span>
                      </div>
                    ) : reward.isStock ? null : (
                      <div className="mt-1 font-mono text-xs text-mut">{short(tgt.address)}</div>
                    )}
                  </>
                )}
              </div>
            </div>

            <Count label="Dividend cycles" figure={fmt(data.stats.totalExecutions)}>
              <div className="flex h-5 items-end gap-[3px]" aria-hidden="true">
                {(ticks.length ? ticks : Array.from({ length: 24 }, () => null)).map((e, i) => (
                  <span key={i} className={`w-[4px] rounded-[1px] ${e ? 'bg-gold-400' : 'bg-line'}`} style={{ height: e && tickMax > 0 ? 5 + (Number(e.claimedEth || 0) / tickMax) * 15 : 5 }} />
                ))}
              </div>
            </Count>
            <Count label="Holders indexed" figure={fmt(data.stats.holderCount)}>
              {latest ? <>last cycle paid <span className="figure text-ink">{fmt(latest.holderCount)}</span></> : 'counted at every cycle'}
            </Count>
            <Count label={mode ? 'Paid out (all rewards)' : `Paid out in ${reward.symbol}`} figure={mode ? `${fmt(data.stats.totalExecutions)} drops` : amount(units(data.stats.totalAirdropped, rewardDecimals))}>
              {mode ? 'the reward changes with the cycle' : <span className="inline-flex items-center gap-1.5"><StockLogo address={tgt.address} meta={tgt} size="h-4 w-4" text="text-[5px]" />{reward.name}</span>}
            </Count>
            <Count label="Bought back" figure={mode ? <span className="text-base text-mut">varies per cycle</span> : amount(units(data.stats.totalBoughtBack, rewardDecimals))}>
              {mode ? null : <span className="inline-flex items-center gap-1.5"><StockLogo address={tgt.address} meta={tgt} size="h-4 w-4" text="text-[5px]" />{reward.symbol} bought with the fees</span>}
            </Count>
          </div>
        </Enter>

        {/* The policy in four numbers, and the treasury as a balance sheet */}
        {data.config.split && (
          <Enter as="section" className="panel mt-3 grid overflow-hidden lg:grid-cols-12">
            <div className="border-b border-line p-6 sm:p-7 lg:col-span-5 lg:border-b-0 lg:border-r">
              <h3 className="label">Dividend policy</h3>
              <p className="mt-2 text-sm text-mut">{data.config.payoutMode === 'convert' ? 'Stock fees converted to the reward before payout.' : 'Stock fees paid in kind: what the launchpad pays, holders receive.'}</p>
              <div className="mt-5 flex h-2 w-full gap-px overflow-hidden rounded-full bg-tile">
                {SPLIT.map(([l, v, c]) => (v > 0 ? <div key={l} className={c} style={{ width: `${v / 100}%` }} title={l} /> : null))}
              </div>
              <dl className="mt-4 divide-y divide-line">
                {SPLIT.map(([l, v, c]) => (
                  <div key={l} className="flex items-center gap-3 py-2">
                    <span className={`h-2 w-2 rounded-[2px] ${v > 0 ? c : 'bg-line'}`} />
                    <dt className={`text-sm ${v > 0 ? 'text-ink' : 'text-mut'}`}>{l}</dt>
                    <dd className={`figure ml-auto text-lg font-medium ${v > 0 ? 'text-ink' : 'text-mut'}`}>{v / 100}%</dd>
                  </div>
                ))}
              </dl>
            </div>

            {data.treasury ? (
              <div className="min-w-0 lg:col-span-7">
                <div className="grid gap-x-6 gap-y-4 p-6 sm:grid-cols-[minmax(0,1fr)_auto] sm:p-7">
                  <div>
                    <h3 className="label flex items-center gap-1.5 !text-gold-400"><Vault className="h-3.5 w-3.5" />Balance sheet</h3>
                    <div className="figure mt-2 text-4xl font-medium leading-none tracking-tight text-ink">${data.treasury.totalUsd.toLocaleString('en-US', { maximumFractionDigits: 0 })}</div>
                    <Out href={explorerAddress(data.treasury.treasuryAddress)} className="mt-2 font-mono text-[11px] text-mut">{short(data.treasury.treasuryAddress)}</Out>
                  </div>
                  <dl className="flex gap-6 sm:text-right">
                    <div>
                      <dt className="label">Book value / token</dt>
                      <dd className="figure mt-1.5 text-lg font-medium text-ink">{data.treasury.bookValuePerToken != null ? `$${data.treasury.bookValuePerToken < 0.01 ? data.treasury.bookValuePerToken.toExponential(2) : data.treasury.bookValuePerToken.toFixed(4)}` : '-'}</dd>
                    </div>
                    <div>
                      <dt className="label">Backed</dt>
                      <dd className={`figure mt-1.5 text-lg font-medium ${data.treasury.backedPct != null && data.treasury.backedPct >= 100 ? 'text-hood-600' : 'text-ink'}`}>{data.treasury.backedPct != null ? `${data.treasury.backedPct.toFixed(1)}% of mcap` : '-'}</dd>
                    </div>
                  </dl>
                </div>
                {data.treasury.holdings.length === 0 ? (
                  <div className="border-t border-line px-6 py-5 text-sm text-mut sm:px-7">Treasury is empty so far. The next cycle starts filling it.</div>
                ) : (
                  <div className="border-t border-line">
                    <div className="label grid grid-cols-[minmax(0,1fr)_auto_5.5rem] gap-x-4 px-6 py-2 sm:grid-cols-[minmax(0,1fr)_7rem_6rem_4.5rem] sm:px-7">
                      <span>Asset</span><span className="text-right">Held</span><span className="text-right">Value</span><span className="hidden text-right sm:block">Day</span>
                    </div>
                    <div className="divide-y divide-line border-t border-line">
                      {data.treasury.holdings.map((h) => (
                        <div key={h.address} className="grid grid-cols-[minmax(0,1fr)_auto_5.5rem] items-center gap-x-4 px-6 py-2.5 sm:grid-cols-[minmax(0,1fr)_7rem_6rem_4.5rem] sm:px-7">
                          <div className="flex min-w-0 items-center gap-2.5">
                            <StockLogo address={h.address} meta={{ symbol: h.symbol }} size="h-7 w-7" text="text-[8px]" />
                            <div className="min-w-0">
                              <div className="text-sm font-semibold text-ink">{h.symbol}</div>
                              <div className="truncate text-[11px] text-mut">{h.name}</div>
                            </div>
                          </div>
                          <div className="figure text-right text-sm text-ink">{h.amount < 1 ? h.amount.toFixed(4) : h.amount.toLocaleString('en-US', { maximumFractionDigits: 2 })}</div>
                          <div className="text-right">
                            <div className="figure text-sm font-medium text-ink">${h.usd.toLocaleString('en-US', { maximumFractionDigits: 0 })}</div>
                            <div className="text-[11px] sm:hidden"><Change value={h.changePct} digits={1} /></div>
                          </div>
                          <div className="hidden text-right text-xs sm:block"><Change value={h.changePct} digits={1} /></div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex flex-col justify-center p-6 sm:p-7 lg:col-span-7">
                <h3 className="label flex items-center gap-1.5"><Vault className="h-3.5 w-3.5" />Balance sheet</h3>
                <p className="mt-3 max-w-md font-display text-xl font-medium leading-snug tracking-tight text-ink">No treasury address set.</p>
                <p className="mt-2 max-w-md text-sm text-mut">The creator can route a share of fees into a stock treasury from Telegram (Settings, Fee split).</p>
              </div>
            )}
          </Enter>
        )}

        {/* The cycles as a ledger, the recipients as a ranking */}
        <Enter as="section" className="mt-3 grid gap-3 lg:grid-cols-12 lg:items-start">
          <div className="frame min-w-0 overflow-hidden lg:col-span-7">
            <div className="flex items-baseline justify-between gap-4 px-5 pb-4 pt-5 sm:px-6">
              <h2 className="font-display text-lg font-medium tracking-tight text-ink">Dividend history</h2>
              <span className="label">{cycles.length} cycles</span>
            </div>

            {latest ? (
              <>
                {/* The latest cycle, written out in full */}
                <div className="grid gap-x-6 gap-y-4 border-y border-line bg-tile/40 px-5 py-5 sm:grid-cols-[minmax(0,1fr)_auto] sm:px-6">
                  <div className="min-w-0">
                    <div className="label flex items-center gap-2"><span className="text-hood-600">Latest</span><span>#{latest.id} · {new Date(latest.executionTime).toLocaleString()}</span></div>
                    <div className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-mut">
                      <StockLogo address={latest.rewardToken} meta={{ symbol: latest.rewardSymbol }} size="h-6 w-6" text="text-[7px]" />
                      <span className="figure text-lg font-medium text-ink">{amount(units(latest.totalAirdropped, latest.rewardDecimals ?? rewardDecimals))} {describeAddress(latest.rewardToken, { symbol: latest.rewardSymbol }).symbol}</span>
                      {latest.destination === 'burn' ? <span>burned</span> : <span>to {latest.holderCount} holders</span>}
                    </div>
                    {BigInt(latest.burnAmount || 0) > 0n && (
                      <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-mut">
                        <StockLogo address={src.address} meta={src} size="h-6 w-6" text="text-[7px]" />
                        <span className="figure text-lg font-medium text-orange-400">{amount(units(latest.burnAmount, 18))} ${src.symbol || ''}</span>
                        <span>bought back and burned</span>
                      </div>
                    )}
                    {latest.note && <div className="mt-2 text-xs text-gold-400">{latest.note}</div>}
                  </div>
                  <div className="sm:text-right">
                    <div className="label">From fees</div>
                    <div className="figure mt-1 text-3xl font-medium leading-none tracking-tight text-hood-600">{eth(latest.claimedEth)} <span className="text-sm text-mut">{NATIVE}</span></div>
                  </div>
                  <div className="sm:col-span-2 [&>span]:justify-start"><CycleLinks e={latest} hashes /></div>
                </div>

                <div className="label hidden grid-cols-[6.5rem_minmax(0,1fr)_6rem_9rem] gap-x-4 px-6 py-2 sm:grid">
                  <span>When</span><span>Paid out</span><span className="text-right">From fees</span><span className="text-right">Proof</span>
                </div>
                <div className="divide-y divide-line sm:border-t sm:border-line">
                  {earlier.map((e) => {
                    const r = describeAddress(e.rewardToken, { symbol: e.rewardSymbol });
                    return (
                      <div key={e.id} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-1 px-5 py-2.5 transition-colors hover:bg-tile/40 sm:grid-cols-[6.5rem_minmax(0,1fr)_6rem_9rem] sm:px-6">
                        <span className="text-xs text-mut" title={new Date(e.executionTime).toLocaleString()}><span className="text-ink">{day(e.executionTime)}</span> {clock(e.executionTime)}</span>
                        <span className="figure text-right text-sm font-medium text-hood-600 sm:order-3">{eth(e.claimedEth)} <span className="text-[11px] text-mut">{NATIVE}</span></span>
                        <span className="flex min-w-0 items-center gap-1.5 text-xs text-mut sm:order-2">
                          <StockLogo address={e.rewardToken} meta={{ symbol: e.rewardSymbol }} size="h-4 w-4" text="text-[5px]" />
                          <span className="figure text-ink">{amount(units(e.totalAirdropped, e.rewardDecimals ?? rewardDecimals))} {r.symbol}</span>
                          <span className="truncate">{e.destination === 'burn' ? 'burned' : `to ${e.holderCount} holders`}</span>
                          {BigInt(e.burnAmount || 0) > 0n && <span className="shrink-0 text-orange-400" title="bought back and burned">· {amount(units(e.burnAmount, 18))} burned</span>}
                          {e.note && <span className="shrink-0 text-gold-400" title={e.note}>· note</span>}
                        </span>
                        <span className="sm:order-4"><CycleLinks e={e} /></span>
                      </div>
                    );
                  })}
                </div>
              </>
            ) : (
              <div className="border-t border-dashed border-line px-6 py-14 text-sm text-mut">No cycles yet</div>
            )}
          </div>

          <div className="panel min-w-0 overflow-hidden lg:col-span-5">
            <div className="flex items-baseline justify-between gap-4 px-5 pb-4 pt-5 sm:px-6">
              <h2 className="font-display text-lg font-medium tracking-tight text-ink">Top recipients</h2>
              <span className="label">by dividends received</span>
            </div>
            {data.topRecipients.length > 0 ? (
              <ol className="divide-y divide-line border-t border-line">
                {data.topRecipients.map((r, i) => {
                  const got = units(r.totalReceived, r.rewardDecimals ?? rewardDecimals);
                  return (
                    <li key={r.address}>
                      <a href={explorerAddress(r.address)} target="_blank" rel="noopener noreferrer" className="group relative grid grid-cols-[1.75rem_minmax(0,1fr)_auto] items-center gap-x-3 px-5 py-3 transition-colors hover:bg-tile/50 sm:px-6">
                        <span className={`figure text-lg font-medium leading-none ${i === 0 ? 'text-hood-600' : 'text-mut'}`}>{i + 1}</span>
                        <span className="min-w-0">
                          <span className="block truncate font-mono text-sm text-ink">{short(r.address)}</span>
                          <span className="block truncate text-[11px] text-mut">
                            {r.airdropCount} dividends
                            {r.heldDays != null ? ` · holding ${r.heldDays < 1 ? `${Math.max(1, Math.round(r.heldDays * 24))}h` : `${Math.floor(r.heldDays)}d`}` : ''}
                          </span>
                        </span>
                        <span className="flex items-center gap-1.5">
                          <StockLogo address={r.rewardToken || tgt.address} meta={{ symbol: r.rewardSymbol || reward.symbol }} size="h-4 w-4" text="text-[5px]" />
                          <span className="figure text-sm font-medium text-ink">{amount(got)} {r.rewardSymbol || reward.symbol}</span>
                        </span>
                        <span className="absolute inset-x-5 bottom-0 h-px sm:inset-x-6" aria-hidden="true"><span className="block h-full bg-hood-500/70" style={{ width: `${topMax > 0 ? Math.max(2, (got / topMax) * 100) : 0}%` }} /></span>
                      </a>
                    </li>
                  );
                })}
              </ol>
            ) : (
              <div className="border-t border-line">
                <ol aria-hidden="true" className="divide-y divide-line">
                  {[64, 46, 30].map((w, i) => (
                    <li key={w} className="grid grid-cols-[1.75rem_minmax(0,1fr)_auto] items-center gap-x-3 px-5 py-3.5 sm:px-6">
                      <span className="figure text-lg font-medium leading-none text-line">{i + 1}</span>
                      <span className="h-1.5 rounded-full bg-tile" style={{ width: `${w}%` }} />
                      <span className="h-1.5 w-12 rounded-full bg-tile" />
                    </li>
                  ))}
                </ol>
                <p className="border-t border-line px-5 py-5 text-sm text-mut sm:px-6">No dividends yet</p>
              </div>
            )}
          </div>
        </Enter>

        {/* The badge, for the creator's own pages */}
        <Enter as="section" className="mt-10 grid gap-x-8 gap-y-4 border-t border-line pt-6 lg:grid-cols-12 lg:items-center">
          <div className="lg:col-span-5">
            <div className="text-sm font-semibold text-ink">Embed the yield badge</div>
            <div className="mt-1 text-xs text-mut">Live SVG for your README, website or X bio link. Add <span className="font-mono text-ink">?style=reward</span> for the reward badge.</div>
          </div>
          <div className="flex min-w-0 flex-wrap items-center gap-3 lg:col-span-7 lg:justify-end">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={`/api/badge/${tokenAddress}`} alt="dividend yield badge" className="h-[22px]" />
            <code className="min-w-0 max-w-full break-all rounded-md border border-line bg-tile px-2 py-1 font-mono text-[11px] text-ink">{`${typeof window !== 'undefined' ? window.location.origin : ''}/api/badge/${tokenAddress}`}</code>
          </div>
        </Enter>
        <div className="label mt-6 flex flex-wrap gap-x-5 gap-y-1">
          <span>Robinhood Chain (4663)</span>
          <span>Updated {updated}</span>
        </div>
      </main>
      <Footer />
    </>
  );
}
