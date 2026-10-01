'use client';

// The public page of a coin, at /<mint or address>. Read top to bottom it
// answers three questions: who the coin is (the masthead), where its fees go
// (the routing, drawn as light), and what proves it (the figures, the cycles
// with their receipts, the recipients, the treasury).
import { useEffect, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { motion, useInView } from 'motion/react';
import Navigation from '../../components/Navigation';
import TickerTape from '../../components/TickerTape';
import Footer from '../../components/Footer';
import StockLogo from '../../components/StockLogo';
import Countdown from '../../components/Countdown';
import PolicyMini, { legsFrom, NativeLogo, AssetLogo, isNativeAsset } from '../../components/PolicyMini';
import { PageAvatar } from '../../components/pages/PageParts';
import { Glass, Cut, EASE } from '../../components/ui/Light';
import { Arrow, Copy, Check, External, Clock, Burn, Vault, Wallet, Users, World, Dice, TrendUp, Pie, Vote, Rise as Up, Fall as Down } from '../../components/Icons';
import { describeAddress } from '../../lib/stocks';
import { CHAINS, explorerTx, explorerAddress, explorerTokenFor } from '../../lib/chains';
import { PLATFORMS, pageName, pagePath } from '../../lib/pages';
import { getXStock } from '../../lib/xstocks';
import { BRAND } from '../../lib/brand';

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
  if (v < 0.000001) return '<0.000001';
  // four significant digits at most, without trailing zeros
  return String(Number(v.toPrecision(v < 0.0001 ? 2 : 3)));
};
const pct = (bps) => `${(bps / 100).toFixed(bps % 100 ? 1 : 0)}%`;
const day = (d) => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
const clock = (d) => new Date(d).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });

/** Symbol and name of an asset, the chain's own currency included (describeAddress alone only knows ETH). */
function assetInfo(address, meta, native) {
  if (isNativeAsset(address)) return { symbol: native, name: native === 'SOL' ? 'Solana' : 'Ether', isNative: true, isStock: false };
  const xs = getXStock(address);
  if (xs) return { symbol: xs.symbol, name: xs.name, isNative: false, isStock: true };
  return describeAddress(address, meta);
}

const MODE = {
  fixed: null,
  roulette: { label: 'Stock Roulette', Icon: Dice, hint: 'a random liquid stock each cycle' },
  gainer: { label: 'Top Gainer', Icon: TrendUp, hint: "the day's best stock" },
  portfolio: { label: 'Portfolio', Icon: Pie, hint: 'rotating through a basket' },
  vote: { label: 'Community Vote', Icon: Vote, hint: 'holders pick the reward' },
};

// Kinds of route that have no logo of their own are told by a glyph.
const KIND = {
  holders: { label: 'Holders', Icon: Users, tone: 'text-cyan-500' },
  wallet: { label: 'Wallet', Icon: Wallet, tone: 'text-ink' },
  burn: { label: 'Buyback and burn', Icon: Burn, tone: 'text-orange-700' },
  treasury: { label: 'Treasury', Icon: Vault, tone: 'text-hood-600' },
  page: { label: 'Page', Icon: World, tone: 'text-hood-600' },
  lottery: { label: 'Lottery', Icon: Dice, tone: 'text-pink-600' },
};

/** A block that rises into place the first time it is seen. */
function Enter({ children, delay = 0, className = '', as = 'div' }) {
  const ref = useRef(null);
  const seen = useInView(ref, { once: true, amount: 0.05 });
  const Tag = motion[as] || motion.div;
  return (
    <Tag ref={ref} initial={{ opacity: 0, y: 14 }} animate={seen ? { opacity: 1, y: 0 } : {}} transition={{ duration: 0.6, delay, ease: EASE }} className={className}>
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

/** A channel bar: a beam as wide as its share. */
function Channel({ share, className = 'block h-1.5' }) {
  return (
    <span className={`relative overflow-hidden rounded-full bg-white/5 ${className}`} aria-hidden="true">
      <span className="beam absolute inset-y-0 left-0 rounded-full shadow-[0_0_10px_rgba(95,227,255,0.45)]" style={{ width: `${Math.max(0, Math.min(100, share))}%` }} />
    </span>
  );
}

/** A term of the policy: caption on the left, value on the right. */
function Term({ label, children }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-3">
      <dt className="label shrink-0">{label}</dt>
      <dd className="text-right text-sm text-ink">{children}</dd>
    </div>
  );
}

/** A figure of the masthead, in a glass tile lit from the top. */
function Stat({ label, title, children }) {
  return (
    <div className="frame frame-top min-w-0 px-5 py-4" title={title}>
      <div className="label truncate">{label}</div>
      <div className="figure mt-2 truncate text-[26px] font-medium leading-none tracking-[-0.02em] text-ink">{children}</div>
    </div>
  );
}

/** One route of the policy: who is paid, in what, and how much of every cycle. */
function RouteLine({ leg, source, native }) {
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
  const paidIn = leg.kind === 'burn'
    ? { logo: <StockLogo address={source?.address} meta={source} size="h-4 w-4" text="text-[5px]" />, text: 'buyback' }
    : leg.asset || leg.assetSymbol
      ? { logo: <AssetLogo address={leg.asset} meta={{ symbol: leg.assetSymbol }} native={native} size="h-4 w-4" text="text-[5px]" />, text: leg.assetSymbol || assetInfo(leg.asset, null, native).symbol }
      : null;
  const share = (Number(leg.shareBps) || 0) / 100;

  const lead = isPage
    ? <PageAvatar page={leg.page} size="h-9 w-9" badge="h-4 w-4" />
    : leg.kind === 'holders'
      ? <StockLogo address={source?.address} meta={source} size="h-9 w-9" text="text-[8px]" />
      : leg.kind === 'burn'
        ? <span className="shrink-0 rounded-full shadow-[0_0_14px_rgba(255,122,26,0.65)]"><StockLogo address={source?.address} meta={source} size="h-9 w-9" text="text-[8px]" /></span>
        : <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/5"><k.Icon className={`h-4 w-4 ${k.tone}`} /></span>;

  const body = (
    <>
      {lead}
      <span className="min-w-0">
        <span className="flex items-center gap-2">
          <span className="truncate text-sm font-medium text-ink transition-colors group-hover:text-hood-700">{name}</span>
          {isPage && <span className={`label shrink-0 ${leg.page.claimed ? '!text-cyan-500' : '!text-gold-400'}`}>{leg.page.claimed ? 'claimed' : 'unclaimed'}</span>}
        </span>
        <span className="block truncate text-xs text-mut">
          {where}{isPage ? ` · ${leg.page.claimed ? 'paid to its owner' : 'held in its vault'}` : ''}
          <span className="sm:hidden"> · {paidIn ? paidIn.text : 'in kind'}</span>
        </span>
      </span>
      <span className="hidden sm:block">
        {paidIn
          ? <span className="inline-flex items-center gap-1.5 text-xs text-ink">{paidIn.logo}{paidIn.text}</span>
          : <span className="text-xs text-mut">in kind</span>}
      </span>
      <Channel share={share} className="hidden h-1.5 w-full md:block" />
      <span className="figure w-14 text-right text-lg font-medium text-ink">{pct(Number(leg.shareBps) || 0)}</span>
    </>
  );
  const cls = 'group grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-x-3 px-5 py-3.5 sm:grid-cols-[auto_minmax(0,1fr)_7rem_auto] sm:px-6 md:grid-cols-[auto_minmax(0,1fr)_7rem_9rem_auto] md:gap-x-5';
  if (isPage) return <Link href={leg.page.path || pagePath(leg.page.platform, leg.page.handle, leg.page.slug)} className={`${cls} transition-colors hover:bg-white/[0.04]`}>{body}</Link>;
  if ((leg.kind === 'wallet' || leg.kind === 'treasury') && leg.address) return <a href={explorerAddress(leg.address)} target="_blank" rel="noopener noreferrer" className={`${cls} transition-colors hover:bg-white/[0.04]`}>{body}</a>;
  return <div className={cls}>{body}</div>;
}

/** A line of the figures: caption, what it counts, the figure on the right. */
function Fact({ label, figure, children }) {
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-1.5 px-6 py-4">
      <div className="label">{label}</div>
      <div className="figure row-span-2 text-right text-2xl font-medium leading-none tracking-[-0.02em] text-ink">{figure}</div>
      <div className="min-h-[20px] text-xs text-mut">{children}</div>
    </div>
  );
}

/** The fees of each cycle, one lit bar each, in the chain's currency. */
function FeeBars({ cycles, decimals, native, paidAs }) {
  const ref = useRef(null);
  const seen = useInView(ref, { once: true, amount: 0.2 });
  const [hover, setHover] = useState(null);
  const bars = cycles.slice(0, 48).reverse().map((e) => ({ e, v: Number(e.claimedEth || 0) / 10 ** decimals }));
  const max = Math.max(...bars.map((b) => b.v), 0);
  const at = hover ?? bars.length - 1;
  const shown = bars[at];
  return (
    <div ref={ref}>
      <div className="flex h-44 items-end gap-[3px]" onMouseLeave={() => setHover(null)}>
        {bars.map((b, i) => (
          <div key={b.e.id ?? i} className="flex h-full min-w-0 flex-1 items-end" onMouseEnter={() => setHover(i)}>
            <motion.div
              initial={{ scaleY: 0 }} animate={seen ? { scaleY: 1 } : { scaleY: 0 }}
              transition={{ duration: 0.6, delay: 0.1 + i * 0.012, ease: EASE }}
              className="w-full rounded-t-[3px] transition-[opacity,box-shadow] duration-200"
              style={{
                height: `${max > 0 ? Math.max(3, (b.v / max) * 100) : 3}%`,
                transformOrigin: 'bottom',
                background: 'linear-gradient(180deg, #5FE3FF 0%, #2FA8FF 55%, #7B5CFF 100%)',
                opacity: i === at ? 1 : 0.4,
                boxShadow: i === at ? '0 0 18px rgba(95,227,255,0.55)' : 'none',
              }}
            />
          </div>
        ))}
      </div>
      {shown && (
        <div className="mt-3 flex flex-wrap items-center justify-between gap-x-4 gap-y-1 border-t border-white/10 pt-3 font-mono text-[11px] text-mut">
          <span>{hover == null ? 'Latest · ' : ''}{new Date(shown.e.executionTime).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
          <span><span className="text-ink">{shown.v.toFixed(4)} {native}</span> paid as {paidAs(shown.e)}{shown.e.holderCount ? ` to ${shown.e.holderCount} holders` : ''}</span>
        </div>
      )}
    </div>
  );
}

/** The links of a cycle: its receipt on the site, its transactions on the explorer. */
function CycleLinks({ e, hashes = false, burn = true, className = '' }) {
  return (
    <span className={`flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[11px] ${className}`}>
      <Link href={`/receipt/${e.id}`} className="text-hood-600 transition-colors hover:text-hood-800">receipt</Link>
      {e.swapTx && <Out href={explorerTx(e.swapTx)} className="text-mut">{hashes ? `swap ${short(e.swapTx)}` : 'swap'}</Out>}
      {burn && e.burnTx && <Out href={explorerTx(e.burnTx)} className="text-orange-700">{hashes ? `burn ${short(e.burnTx)}` : 'burn'}</Out>}
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
        <Glass lit="left" className="w-full p-6 sm:p-8">
          <div className="label flex items-center gap-2 !text-cyan-500"><span className="h-1.5 w-1.5 animate-pulse rounded-full bg-cyan-500 shadow-[0_0_10px_#5FE3FF]" />Reading the routing</div>
          <div className="mt-3 break-all font-mono text-sm text-mut">{tokenAddress}</div>
          <div className="mt-8 h-1 w-full overflow-hidden rounded-full bg-white/5"><div className="beam h-full w-1/3 animate-pulse rounded-full" /></div>
        </Glass>
      </Shell>
    );
  }

  if (error) {
    return (
      <Shell>
        <Glass lit="left" className="grid w-full gap-8 p-6 sm:p-8 lg:grid-cols-12">
          <div className="lg:col-span-7">
            <div className="label">No routing on this address</div>
            <h1 className="mt-3 font-display text-4xl font-medium tracking-[-0.03em] text-ink">Token not found</h1>
            <p className="mt-3 max-w-md text-sm text-mut">This token doesn't have an active {BRAND} configuration yet.</p>
            <Link href="/" className="btn-primary mt-7">Go home <Arrow className="h-4 w-4" /></Link>
          </div>
          <div className="lg:col-span-5">
            <div className="label">Address asked for</div>
            <div className="mt-3 break-all font-mono text-sm text-ink">{tokenAddress}</div>
          </div>
        </Glass>
      </Shell>
    );
  }

  const src = data.sourceToken;
  const tgt = data.targetToken;
  const chain = data.config.chain || 'robinhood';
  const onSol = chain === 'solana';
  // The chain's own currency: SOL on Solana, ETH on Robinhood Chain.
  const NATIVE = data.config.native || CHAINS[chain]?.native || 'ETH';
  const nativeDecimals = data.config.nativeDecimals || CHAINS[chain]?.nativeDecimals || 18;
  const eth = (raw, d = 4) => nativeAmount(raw, nativeDecimals, d);
  const reward = assetInfo(tgt.address, tgt, NATIVE);
  const mode = MODE[data.config.rewardMode];
  const rewardDecimals = Number(tgt.decimals ?? 18);
  // Decimals of what a cycle paid: the chain's currency has its own.
  const decOf = (addr, d) => (isNativeAsset(addr) ? nativeDecimals : Number(d ?? rewardDecimals));
  const symOf = (addr, symbol) => assetInfo(addr, { symbol }, NATIVE).symbol;
  const srcDecimals = Number(src.decimals ?? (onSol ? 6 : 18));
  const ethClaimed = eth(data.stats.totalEthClaimed);
  const quote = tgt.quote;
  const routes = legsFrom({ legs: data.legs, split: data.config.split });
  const routedBps = routes.reduce((a, l) => a + (Number(l.shareBps) || 0), 0);
  const cycles = data.recentExecutions;
  const latest = cycles[0];
  const earlier = cycles.slice(1, 12);
  const cycleMax = Math.max(...cycles.slice(0, 12).map((e) => Number(e.claimedEth || 0)), 0);
  const ticks = cycles.slice(0, 24).reverse();
  const tickMax = Math.max(...ticks.map((e) => Number(e.claimedEth || 0)), 0);
  const topMax = Math.max(...data.topRecipients.map((r) => units(r.totalReceived, decOf(r.rewardToken || tgt.address, r.rewardDecimals))), 0);
  const apy = data.yield?.apy ? (data.yield.apy >= 100 ? Math.round(data.yield.apy) : data.yield.apy >= 10 ? data.yield.apy.toFixed(1) : data.yield.apy.toFixed(2)) : null;
  const updated = new Date(data.timestamp).toLocaleTimeString();
  const chainLabel = CHAINS[chain]?.label || chain;
  const SPLIT = data.config.split ? [
    ['Holders', data.config.split.holders || 0],
    ['Pages', data.config.split.pages || 0],
    ['Wallets', data.config.split.creator || 0],
    ['Buyback and burn', data.config.split.burn || 0],
    ['Treasury', data.config.split.treasury || 0],
  ] : [];
  const policyLine = onSol
    ? `pump.fun sets a creator fee aside on every trade. Each cycle it is collected into the dev wallet, 0.02 ${NATIVE} stays there for transaction fees, and the rest is split like this.`
    : data.config.payoutMode === 'convert' ? 'Stock fees are converted to the reward before payout.' : 'Stock fees are paid in kind: what the launchpad pays, holders receive.';
  const latestBurned = latest && BigInt(latest.burnAmount || 0) > 0n;
  const latestReward = latest ? symOf(latest.rewardToken, latest.rewardSymbol) : null;

  return (
    <>
      <TickerTape />
      <Navigation />
      <main className="mx-auto max-w-6xl px-5 pb-16 pt-10 sm:pt-14">
        {/* Masthead: who the coin is */}
        <Enter as="header" className="grid gap-x-10 gap-y-8 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
          <div className="flex min-w-0 items-start gap-5 sm:gap-7">
            <span className="relative isolate mt-1 shrink-0">
              <span aria-hidden="true" className="absolute -inset-5 -z-10 rounded-full blur-2xl" style={{ background: 'radial-gradient(circle, rgba(47,168,255,0.55), rgba(123,92,255,0.22) 55%, transparent 72%)' }} />
              <StockLogo address={src.address} meta={src} size="h-16 w-16 sm:h-[84px] sm:w-[84px]" text="text-xs" className="shadow-[0_0_0_1px_rgba(95,227,255,0.35),0_0_36px_rgba(47,168,255,0.4)]" />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="chip !text-ink">
                  {onSol
                    ? <NativeLogo native="SOL" className="h-3.5 w-3.5" />
                    : <span className="h-2 w-2 rounded-full" style={{ background: CHAINS[chain]?.color, boxShadow: `0 0 8px ${CHAINS[chain]?.color}` }} />}
                  {chainLabel}
                </span>
                {data.config.isActive ? (
                  <span className="chip !border-cyan-500/30 !text-cyan-500">
                    <span className="relative flex h-1.5 w-1.5"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-cyan-500 opacity-60" /><span className="relative h-1.5 w-1.5 rounded-full bg-cyan-500" /></span>
                    Routing live
                  </span>
                ) : (
                  <span className="chip"><span className="h-1.5 w-1.5 rounded-full bg-mut" />Paused</span>
                )}
                {data.config.marketHoursOnly && <span className="chip"><Clock className="h-3.5 w-3.5" />Market hours only</span>}
                {data.config.destination === 'burn' && <span className="chip !text-orange-700"><Burn className="h-3.5 w-3.5" />Buyback and burn</span>}
              </div>
              <h1 className="mt-4 flex flex-wrap items-baseline gap-x-4 gap-y-1 font-display text-4xl font-medium leading-[1.02] tracking-[-0.035em] text-ink sm:text-[56px]">
                <span className="min-w-0 break-words">{src.name || `$${src.symbol || short(src.address)}`}</span>
                {src.symbol && <span className="text-beam font-mono text-lg font-medium tracking-normal">${src.symbol}</span>}
              </h1>
              <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2">
                <button type="button" onClick={copyCA} title={onSol ? 'Copy the mint address' : 'Copy the contract address'} className="group inline-flex min-w-0 max-w-full items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 font-mono text-xs text-mut transition-colors hover:border-cyan-500/50 hover:text-ink">
                  <span className="hidden truncate md:inline">{src.address}</span>
                  <span className="md:hidden">{short(src.address)}</span>
                  {copied ? <Check className="h-3.5 w-3.5 shrink-0 text-cyan-500" /> : <Copy className="h-3.5 w-3.5 shrink-0" />}
                </button>
                <Out href={explorerTokenFor(chain, src.address)} className="font-mono text-xs text-mut">{onSol ? 'Solscan' : 'Blockscout'}</Out>
                {data.config.isActive && (
                  <span className="label">
                    {data.config.scheduleLabel} · next in <span className="figure text-[12px] tracking-normal text-ink"><Countdown intervalMinutes={data.config.intervalMinutes} scheduleKind={data.config.scheduleKind} /></span>
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 lg:w-[24rem]">
            <Stat label="Market cap">{src.marketCap ? `$${compact(src.marketCap)}` : <span className="text-lg text-mut">not listed</span>}</Stat>
            <Stat label={apy ? 'Dividend yield' : 'Returned · 30d'} title={data.yield?.apy ? `${data.yield.eth30d.toFixed(4)} ${NATIVE} returned over the last ${data.yield.windowDays} days, annualized against market cap` : undefined}>
              {apy ? <span className="text-beam">{apy}%</span> : data.yield?.cycles30d ? <>{data.yield.eth30d.toFixed(4)} <span className="text-sm text-mut">{NATIVE}</span></> : <span className="text-lg text-mut">none yet</span>}
            </Stat>
            {data.config.rewardMode === 'vote' && (
              <Link href="/vote" className="btn-primary col-span-2">Vote now <Arrow className="h-3.5 w-3.5" /></Link>
            )}
          </div>
        </Enter>

        {/* The routing: where every cycle's fees go, as light */}
        <Enter as="section" delay={0.08} className="mt-14 grid gap-4 lg:grid-cols-12">
          <div className="flex flex-col lg:col-span-4">
            <span className="eyebrow">The routing</span>
            <h2 className="mt-4 font-display text-[28px] font-medium leading-[1.08] tracking-[-0.03em] text-ink sm:text-[34px]">
              Every cycle, the fees leave the dev wallet on {routes.length === 1 ? 'one route' : `${routes.length} routes`}.
            </h2>
            <p className="mt-3 max-w-sm text-[15px] leading-relaxed text-mut">Where every cycle's fees go, exactly as the creator drew it.</p>
            <Glass lit="none" className="mt-6 px-5 lg:mt-auto">
              <dl className="divide-y divide-white/10">
                <Term label="Schedule">{data.config.scheduleLabel}{data.config.marketHoursOnly ? ', market hours only' : ''}</Term>
                <Term label="Fee source">{data.config.feeSource === 'univ3' ? 'Uniswap V3 LP fees' : onSol ? 'pump.fun creator fees, into the dev wallet' : `Dev wallet balance (${NATIVE})`}</Term>
                <Term label="Loyalty">
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
            </Glass>
          </div>

          <div className="min-w-0 lg:col-span-8">
            <PolicyMini source={data.sourceToken} devWallet={data.devWallet} schedule={data.config.scheduleLabel} legs={data.legs} split={data.config.split} countdown={{ intervalMinutes: data.config.intervalMinutes, scheduleKind: data.config.scheduleKind, active: data.config.isActive }} className="h-full" />
          </div>
        </Enter>

        {/* The same routes, as lines you can read and follow */}
        <Enter as="section" className="panel mt-4 overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 px-5 py-4 sm:px-6">
            <span className="label">{routes.length} route{routes.length === 1 ? '' : 's'} · <span className="text-ink">{pct(routedBps)}</span> of every cycle</span>
            <span className="label">Updated {updated}</span>
          </div>
          <div className="divide-y divide-white/10 border-t border-white/10">
            {routes.map((l, i) => <RouteLine key={i} leg={l} source={src} native={NATIVE} />)}
          </div>
        </Enter>

        <Cut className="my-16" />

        {/* The evidence, first in figures */}
        <Enter as="section" className="grid gap-4 lg:grid-cols-12">
          <Glass lit="left" className="min-w-0 p-6 sm:p-7 lg:col-span-8">
            <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-1">
              <span className="label">Fees turned into dividends · all time</span>
              <span className="label">in {NATIVE} · last {cycles.length} cycles</span>
            </div>
            <div className="mt-5 flex flex-wrap items-end gap-x-6 gap-y-3">
              <div className="flex items-center gap-3">
                <NativeLogo native={NATIVE} className="h-10 w-10 shadow-[0_0_30px_rgba(47,168,255,0.35)]" />
                <span className="figure text-5xl font-medium leading-[0.9] tracking-[-0.03em] text-ink sm:text-6xl">{ethClaimed}</span>
                <span className="self-end pb-1 font-display text-xl text-mut">{NATIVE}</span>
              </div>
              {data.yield?.cycles30d ? (
                <div className="pb-0.5 text-sm text-mut">
                  <span className="figure text-cyan-500">{data.yield.eth30d.toFixed(4)} {NATIVE}</span> of it in the last 30 days
                  <br />over <span className="figure text-ink">{fmt(data.yield.cycles30d)}</span> cycles
                </div>
              ) : null}
            </div>
            <div className="mt-8">
              <h2 className="sr-only">Fees paid out per cycle</h2>
              {cycles.length > 0 ? (
                <FeeBars cycles={cycles} decimals={nativeDecimals} native={NATIVE} paidAs={(e) => symOf(e.rewardToken, e.rewardSymbol)} />
              ) : (
                <div className="flex h-44 items-center justify-center rounded-2xl border border-dashed border-white/10 text-sm text-mut">No dividend yet. The first cycle is coming.</div>
              )}
            </div>
          </Glass>

          <Glass lit="none" className="flex flex-col divide-y divide-white/10 lg:col-span-4">
            <div className="flex items-center gap-4 px-6 py-5">
              <span className="relative isolate shrink-0">
                <span aria-hidden="true" className="absolute -inset-2 -z-10 rounded-full bg-hood-500/30 blur-xl" />
                <AssetLogo address={tgt.address} meta={tgt} native={NATIVE} size="h-12 w-12" text="text-xs" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="label flex items-center gap-1.5">{mode ? <><mode.Icon className="h-3.5 w-3.5 text-cyan-500" />{mode.label}</> : 'Dividends paid in'}</div>
                {mode ? (
                  <>
                    <div className="mt-1 font-display text-lg font-medium leading-snug tracking-[-0.02em] text-ink">{mode.hint}</div>
                    {data.config.basket && <div className="mt-0.5 font-mono text-xs text-mut">{data.config.basket.label}: {data.config.basket.tickers?.join(' > ')}</div>}
                    <div className="mt-0.5 text-xs text-mut">Fallback reward: <span className="font-mono font-medium text-ink">{reward.symbol}</span></div>
                  </>
                ) : (
                  <>
                    <div className="mt-1 flex items-baseline gap-2">
                      <span className="font-display text-2xl font-medium leading-none tracking-[-0.02em] text-ink">{reward.symbol}</span>
                      <span className="truncate text-sm text-mut">{reward.name}</span>
                    </div>
                    {quote ? (
                      <div className="mt-1 flex items-center gap-2 text-sm">
                        <span className="figure text-ink">${quote.price.toFixed(2)}</span>
                        <Change value={quote.changePct} />
                        <span className="text-xs text-mut">Yahoo Finance</span>
                      </div>
                    ) : reward.isStock || reward.isNative ? null : (
                      <div className="mt-1 font-mono text-xs text-mut">{short(tgt.address)}</div>
                    )}
                  </>
                )}
              </div>
            </div>

            <Fact label="Dividend cycles" figure={fmt(data.stats.totalExecutions)}>
              <div className="flex h-5 items-end gap-[3px]" aria-hidden="true">
                {(ticks.length ? ticks : Array.from({ length: 24 }, () => null)).map((e, i) => (
                  <span key={i} className={`w-[4px] rounded-[1px] ${e ? 'bg-cyan-500/80' : 'bg-white/10'}`} style={{ height: e && tickMax > 0 ? 5 + (Number(e.claimedEth || 0) / tickMax) * 15 : 5 }} />
                ))}
              </div>
            </Fact>
            <Fact label="Holders indexed" figure={fmt(data.stats.holderCount)}>
              {latest ? <>last cycle paid <span className="figure text-ink">{fmt(latest.holderCount)}</span></> : 'counted at every cycle'}
            </Fact>
            <Fact label={mode ? 'Paid out (all rewards)' : `Paid out in ${reward.symbol}`} figure={mode ? `${fmt(data.stats.totalExecutions)} drops` : amount(units(data.stats.totalAirdropped, decOf(tgt.address, tgt.decimals)))}>
              {mode ? 'the reward changes with the cycle' : <span className="inline-flex items-center gap-1.5"><AssetLogo address={tgt.address} meta={tgt} native={NATIVE} size="h-4 w-4" text="text-[5px]" />{reward.name}</span>}
            </Fact>
            <Fact label="Bought back" figure={mode ? <span className="text-base text-mut">varies per cycle</span> : amount(units(data.stats.totalBoughtBack, decOf(tgt.address, tgt.decimals)))}>
              {mode ? null : <span className="inline-flex items-center gap-1.5"><AssetLogo address={tgt.address} meta={tgt} native={NATIVE} size="h-4 w-4" text="text-[5px]" />{reward.symbol} bought with the fees</span>}
            </Fact>
          </Glass>
        </Enter>

        {/* The split by kind, and the treasury as a balance sheet */}
        {data.config.split && (
          <Enter as="section" className="mt-4 grid gap-4 lg:grid-cols-12">
            <Glass lit="none" className="p-6 sm:p-7 lg:col-span-5">
              <h3 className="label">The split, by kind</h3>
              <p className="mt-2 text-sm leading-relaxed text-mut">{policyLine}</p>
              <dl className="mt-6 space-y-4">
                {SPLIT.map(([l, v]) => (
                  <div key={l}>
                    <div className="flex items-baseline justify-between gap-3">
                      <dt className={`text-sm ${v > 0 ? 'text-ink' : 'text-dim'}`}>{l}</dt>
                      <dd className={`figure text-base font-medium ${v > 0 ? 'text-ink' : 'text-dim'}`}>{pct(v)}</dd>
                    </div>
                    <Channel share={v / 100} className="mt-1.5 block h-1.5" />
                  </div>
                ))}
              </dl>
            </Glass>

            {data.treasury ? (
              <Glass lit="left" className="min-w-0 lg:col-span-7">
                <div className="grid gap-x-6 gap-y-4 p-6 sm:grid-cols-[minmax(0,1fr)_auto] sm:p-7">
                  <div>
                    <h3 className="label flex items-center gap-1.5"><Vault className="h-3.5 w-3.5 text-hood-600" />Balance sheet</h3>
                    <div className="figure mt-2 text-4xl font-medium leading-none tracking-[-0.03em] text-ink">${data.treasury.totalUsd.toLocaleString('en-US', { maximumFractionDigits: 0 })}</div>
                    <Out href={explorerAddress(data.treasury.treasuryAddress)} className="mt-2 font-mono text-[11px] text-mut">{short(data.treasury.treasuryAddress)}</Out>
                  </div>
                  <dl className="flex gap-6 sm:text-right">
                    <div>
                      <dt className="label">Book value / token</dt>
                      <dd className="figure mt-1.5 text-lg font-medium text-ink">{data.treasury.bookValuePerToken != null ? `$${data.treasury.bookValuePerToken < 0.01 ? data.treasury.bookValuePerToken.toExponential(2) : data.treasury.bookValuePerToken.toFixed(4)}` : '-'}</dd>
                    </div>
                    <div>
                      <dt className="label">Backed</dt>
                      <dd className={`figure mt-1.5 text-lg font-medium ${data.treasury.backedPct != null && data.treasury.backedPct >= 100 ? 'text-cyan-500' : 'text-ink'}`}>{data.treasury.backedPct != null ? `${data.treasury.backedPct.toFixed(1)}% of mcap` : '-'}</dd>
                    </div>
                  </dl>
                </div>
                {data.treasury.holdings.length === 0 ? (
                  <div className="border-t border-white/10 px-6 py-5 text-sm text-mut sm:px-7">Treasury is empty so far. The next cycle starts filling it.</div>
                ) : (
                  <div className="border-t border-white/10">
                    <div className="label grid grid-cols-[minmax(0,1fr)_auto_5.5rem] gap-x-4 px-6 py-2.5 sm:grid-cols-[minmax(0,1fr)_7rem_6rem_4.5rem] sm:px-7">
                      <span>Asset</span><span className="text-right">Held</span><span className="text-right">Value</span><span className="hidden text-right sm:block">Day</span>
                    </div>
                    <div className="divide-y divide-white/10 border-t border-white/10">
                      {data.treasury.holdings.map((h) => (
                        <div key={h.address} className="grid grid-cols-[minmax(0,1fr)_auto_5.5rem] items-center gap-x-4 px-6 py-2.5 sm:grid-cols-[minmax(0,1fr)_7rem_6rem_4.5rem] sm:px-7">
                          <div className="flex min-w-0 items-center gap-2.5">
                            <AssetLogo address={h.address} meta={{ symbol: h.symbol }} native={NATIVE} size="h-7 w-7" text="text-[8px]" />
                            <div className="min-w-0">
                              <div className="text-sm font-medium text-ink">{h.symbol}</div>
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
              </Glass>
            ) : (
              <Glass lit="none" className="flex flex-col justify-center p-6 sm:p-7 lg:col-span-7">
                <h3 className="label flex items-center gap-1.5"><Vault className="h-3.5 w-3.5" />Treasury</h3>
                {data.config.treasuryAddress ? (
                  <>
                    <p className="mt-3 max-w-md font-display text-xl font-medium leading-snug tracking-[-0.02em] text-ink">A share of every cycle goes to the treasury wallet.</p>
                    <Out href={explorerAddress(data.config.treasuryAddress)} className="mt-2 font-mono text-xs text-mut">{short(data.config.treasuryAddress)}</Out>
                  </>
                ) : (
                  <>
                    <p className="mt-3 max-w-md font-display text-xl font-medium leading-snug tracking-[-0.02em] text-ink">No treasury address set.</p>
                    <p className="mt-2 max-w-md text-sm text-mut">A creator can route a share of every cycle into a treasury held in stocks, from the dashboard or the Telegram bot.</p>
                  </>
                )}
              </Glass>
            )}
          </Enter>
        )}

        {/* The cycles with their receipts, the recipients as a ranking */}
        <Enter as="section" className="mt-16 grid gap-4 lg:grid-cols-12 lg:items-start">
          <Glass lit="left" className="min-w-0 p-4 sm:p-5 lg:col-span-7">
            <div className="flex items-baseline justify-between gap-4 px-1 pb-4 pt-1">
              <h2 className="font-display text-xl font-medium tracking-[-0.02em] text-ink">Dividend history</h2>
              <span className="label">{cycles.length} cycles</span>
            </div>

            {latest ? (
              <>
                {/* The latest cycle, lit and written out in full */}
                <div className="relative overflow-hidden rounded-2xl border border-cyan-500/30 p-5 shadow-glow sm:p-6" style={{ background: 'linear-gradient(135deg, rgba(47,168,255,0.16), rgba(123,92,255,0.08) 60%, rgba(255,255,255,0.02))' }}>
                  <span aria-hidden="true" className="pointer-events-none absolute -left-16 -top-20 h-52 w-52 rounded-full bg-hood-500/25 blur-3xl" />
                  <div className="relative">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="label flex items-center gap-2 !text-cyan-500"><span className="h-1.5 w-1.5 rounded-full bg-cyan-500 shadow-[0_0_10px_#5FE3FF]" />Latest cycle</span>
                      <span className="label">#{latest.id} · {new Date(latest.executionTime).toLocaleString()}</span>
                    </div>
                    <div className="mt-5 grid gap-5 sm:grid-cols-3">
                      <div className="min-w-0">
                        <div className="label">From fees</div>
                        <div className="mt-2 flex items-center gap-2">
                          <NativeLogo native={NATIVE} className="h-6 w-6" />
                          <span className="figure text-3xl font-medium leading-none tracking-[-0.03em] text-ink">{eth(latest.claimedEth)}</span>
                          <span className="self-end text-sm text-mut">{NATIVE}</span>
                        </div>
                      </div>
                      <div className="min-w-0">
                        <div className="label">Paid</div>
                        <div className="mt-2 flex items-center gap-2">
                          <AssetLogo address={latest.rewardToken} meta={{ symbol: latest.rewardSymbol }} native={NATIVE} size="h-6 w-6" text="text-[7px]" />
                          <span className="figure truncate text-2xl font-medium leading-none tracking-[-0.02em] text-ink">{amount(units(latest.totalAirdropped, decOf(latest.rewardToken, latest.rewardDecimals)))}</span>
                          <span className="self-end text-sm text-mut">{latestReward}</span>
                        </div>
                        <div className="mt-1.5 text-xs text-mut">{latest.destination === 'burn' ? 'burned' : `to ${fmt(latest.holderCount)} holders`}</div>
                      </div>
                      <div className="min-w-0">
                        <div className="label">Burned</div>
                        {latestBurned ? (
                          <>
                            <div className="mt-2 flex items-center gap-2">
                              <span className="shrink-0 rounded-full shadow-[0_0_12px_rgba(255,122,26,0.6)]"><StockLogo address={src.address} meta={src} size="h-6 w-6" text="text-[7px]" /></span>
                              <span className="figure truncate text-2xl font-medium leading-none tracking-[-0.02em] text-orange-700">{amount(units(latest.burnAmount, srcDecimals))}</span>
                              <span className="self-end text-sm text-mut">${src.symbol || ''}</span>
                            </div>
                            {latest.burnTx
                              ? <Out href={explorerTx(latest.burnTx)} className="mt-1.5 font-mono text-[11px] text-orange-700">burn tx {short(latest.burnTx)}</Out>
                              : <div className="mt-1.5 text-xs text-mut">bought back and burned</div>}
                          </>
                        ) : (
                          <div className="mt-2 text-sm text-mut">no buyback this cycle</div>
                        )}
                      </div>
                    </div>
                    {latest.note && <div className="mt-4 text-xs text-gold-400">{latest.note}</div>}
                    <CycleLinks e={latest} hashes burn={false} className="mt-5 border-t border-white/10 pt-4" />
                  </div>
                </div>

                {/* Earlier cycles, each with its channel of fees */}
                {earlier.length > 0 && (
                  <ol className="mt-3 space-y-2">
                    {earlier.map((e) => {
                      const burned = BigInt(e.burnAmount || 0) > 0n;
                      return (
                        <li key={e.id} className="rounded-xl border border-white/[0.07] bg-white/[0.025] px-4 py-3 transition-colors hover:border-white/15 hover:bg-white/[0.045]">
                          <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-1.5 sm:grid-cols-[5.5rem_minmax(0,1fr)_auto]">
                            <span className="text-xs text-mut" title={new Date(e.executionTime).toLocaleString()}><span className="text-ink">{day(e.executionTime)}</span> {clock(e.executionTime)}</span>
                            <span className="figure text-right text-sm font-medium text-ink sm:order-3">{eth(e.claimedEth)} <span className="text-[11px] text-mut">{NATIVE}</span></span>
                            <span className="col-span-2 flex min-w-0 items-center gap-1.5 text-xs text-mut sm:order-2 sm:col-span-1">
                              <AssetLogo address={e.rewardToken} meta={{ symbol: e.rewardSymbol }} native={NATIVE} size="h-4 w-4" text="text-[5px]" />
                              <span className="figure shrink-0 text-ink">{amount(units(e.totalAirdropped, decOf(e.rewardToken, e.rewardDecimals)))} {symOf(e.rewardToken, e.rewardSymbol)}</span>
                              <span className="truncate">{e.destination === 'burn' ? 'burned' : `to ${e.holderCount} holders`}</span>
                              {burned && <span className="shrink-0 text-orange-700" title="bought back and burned">· {amount(units(e.burnAmount, srcDecimals))} burned</span>}
                              {e.note && <span className="shrink-0 text-gold-400" title={e.note}>· note</span>}
                            </span>
                          </div>
                          <div className="mt-2.5 flex items-center gap-4">
                            <Channel share={cycleMax > 0 ? (Number(e.claimedEth || 0) / cycleMax) * 100 : 0} className="h-1 flex-1" />
                            <CycleLinks e={e} className="shrink-0 justify-end" />
                          </div>
                        </li>
                      );
                    })}
                  </ol>
                )}
              </>
            ) : (
              <div className="rounded-2xl border border-dashed border-white/10 px-6 py-14 text-sm text-mut">No cycles yet</div>
            )}
          </Glass>

          <Glass lit="none" className="min-w-0 lg:col-span-5">
            <div className="flex items-baseline justify-between gap-4 px-5 pb-4 pt-5 sm:px-6">
              <h2 className="font-display text-xl font-medium tracking-[-0.02em] text-ink">Top recipients</h2>
              <span className="label">by dividends received</span>
            </div>
            {data.topRecipients.length > 0 ? (
              <ol className="divide-y divide-white/10 border-t border-white/10">
                {data.topRecipients.map((r, i) => {
                  const token = r.rewardToken || tgt.address;
                  const got = units(r.totalReceived, decOf(token, r.rewardDecimals));
                  const sym = symOf(token, r.rewardSymbol || (r.rewardToken ? null : tgt.symbol));
                  return (
                    <li key={r.address}>
                      <a href={explorerAddress(r.address)} target="_blank" rel="noopener noreferrer" className="group grid grid-cols-[1.75rem_minmax(0,1fr)_auto] items-center gap-x-3 gap-y-2 px-5 py-3 transition-colors hover:bg-white/[0.04] sm:px-6">
                        <span className={`figure text-lg font-medium leading-none ${i === 0 ? 'text-beam' : 'text-dim'}`}>{i + 1}</span>
                        <span className="min-w-0">
                          <span className="block truncate font-mono text-sm text-ink transition-colors group-hover:text-hood-700">{short(r.address)}</span>
                          <span className="block truncate text-[11px] text-mut">
                            {r.airdropCount} dividends
                            {r.heldDays != null ? ` · holding ${r.heldDays < 1 ? `${Math.max(1, Math.round(r.heldDays * 24))}h` : `${Math.floor(r.heldDays)}d`}` : ''}
                          </span>
                        </span>
                        <span className="flex items-center gap-1.5">
                          <AssetLogo address={r.rewardToken || tgt.address} meta={{ symbol: r.rewardSymbol || (r.rewardToken ? null : tgt.symbol) }} native={NATIVE} size="h-4 w-4" text="text-[5px]" />
                          <span className="figure text-sm font-medium text-ink">{amount(got)} {sym}</span>
                        </span>
                        <Channel share={topMax > 0 ? Math.max(2, (got / topMax) * 100) : 0} className="col-span-2 col-start-2 h-1 sm:col-span-2" />
                      </a>
                    </li>
                  );
                })}
              </ol>
            ) : (
              <div className="border-t border-white/10">
                <ol aria-hidden="true" className="divide-y divide-white/10">
                  {[64, 46, 30].map((w, i) => (
                    <li key={w} className="grid grid-cols-[1.75rem_minmax(0,1fr)_auto] items-center gap-x-3 px-5 py-3.5 sm:px-6">
                      <span className="figure text-lg font-medium leading-none text-white/10">{i + 1}</span>
                      <span className="h-1.5 rounded-full bg-white/5" style={{ width: `${w}%` }} />
                      <span className="h-1.5 w-12 rounded-full bg-white/5" />
                    </li>
                  ))}
                </ol>
                <p className="border-t border-white/10 px-5 py-5 text-sm text-mut sm:px-6">No dividends yet</p>
              </div>
            )}
          </Glass>
        </Enter>

        {/* The badge, for the creator's own pages */}
        <Enter as="section" className="mt-16">
          <Glass lit="none" className="grid gap-x-8 gap-y-4 p-6 lg:grid-cols-12 lg:items-center">
            <div className="lg:col-span-5">
              <div className="text-sm font-medium text-ink">Embed the yield badge</div>
              <div className="mt-1 text-xs text-mut">Live SVG for your README, website or X bio link. Add <span className="font-mono text-ink">?style=reward</span> for the reward badge.</div>
            </div>
            <div className="flex min-w-0 flex-wrap items-center gap-3 lg:col-span-7 lg:justify-end">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={`/api/badge/${tokenAddress}`} alt="dividend yield badge" className="h-[22px]" />
              <code className="min-w-0 max-w-full break-all rounded-xl border border-white/10 bg-black/30 px-2.5 py-1.5 font-mono text-[11px] text-ink">{`${typeof window !== 'undefined' ? window.location.origin : ''}/api/badge/${tokenAddress}`}</code>
            </div>
          </Glass>
        </Enter>
        <div className="label mt-6 flex flex-wrap gap-x-5 gap-y-1">
          <span>{chainLabel}{chain === 'robinhood' ? ' (4663)' : ''}</span>
          <span>Updated {updated}</span>
        </div>
      </main>
      <Footer />
    </>
  );
}
