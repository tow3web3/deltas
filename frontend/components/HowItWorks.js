'use client';

// How it works, drawn as the route a fee takes on Solana: a pump.fun coin's
// trades set a creator fee aside, DELTA collects it into the dev wallet, the
// routing splits it into channels of light, every destination is paid. The
// drawing runs across the page on the ground itself (no panel), in three
// stretches; each step is written in glass under its stretch. On a narrow
// screen the same route runs down a trunk and branches into the destinations.
import { motion, useReducedMotion } from 'motion/react';
import { PlatformIcon, Burn } from './Icons';
import StockLogo from './StockLogo';
import { Glass, FlowChip, BEAM, EASE } from './ui/Light';
import { Fan } from './RouteMap';
import { BRAND } from '../lib/brand';
import { getXStock } from '../lib/xstocks';

const VBEAM = 'linear-gradient(180deg, #2FA8FF 0%, #5FE3FF 55%, #7B5CFF 100%)';
const GLOW = '0 0 16px rgba(47,168,255,0.55)';

function XLogo({ t, size = 'h-5 w-5' }) {
  const s = getXStock(t);
  return <StockLogo address={s.mint} meta={{ symbol: s.symbol, image: s.logo }} size={size} text="text-[5px]" />;
}
// eslint-disable-next-line @next/next/no-img-element
const Sol = ({ className = 'h-5 w-5' }) => <img src="/sol.png" alt="" className={`shrink-0 rounded-full ${className}`} />;

// Where one cycle of fees goes. The handles are placeholders on purpose.
const DESTS = [
  { key: 'holders', share: 40, label: 'Holders', sub: 'paid in NVDAx, pro rata', icon: <XLogo t="NVDA" /> },
  { key: 'youtube', share: 20, label: '@yourchannel', sub: 'YouTube · its own vault', icon: <PlatformIcon platform="youtube" className="h-5 w-5" /> },
  { key: 'github', share: 10, label: 'your-project', sub: 'GitHub · claimed, paid direct', icon: <PlatformIcon platform="github" className="h-5 w-5" /> },
  { key: 'burn', share: 10, label: 'Buyback and burn', sub: 'bought on Jupiter, burned', icon: <Burn className="h-5 w-5 text-orange-700" /> },
  { key: 'treasury', share: 10, label: 'Treasury', sub: 'held in SPYx', icon: <XLogo t="SPY" /> },
  { key: 'wallet', share: 10, label: 'Your wallet', sub: 'paid in SOL', icon: <Sol /> },
];
const ROW = 58;
const GAP = 8;
const H = DESTS.length * ROW + (DESTS.length - 1) * GAP;
const ENDS = DESTS.map((d, i) => ({ key: d.key, share: d.share, at: (i * (ROW + GAP) + ROW / 2) / H }));
// The narrow layout: the trunk runs down at this x, through the coin's centre.
const TRUNK = 24;

const STEPS = [
  { n: '01', tag: 'Fees in', title: 'Every trade sets a fee aside', body: `A coin launched on pump.fun sets a creator fee aside on every trade, on the bonding curve and on PumpSwap after it graduates. Each cycle ${BRAND} collects it into the coin's dev wallet and keeps 0.02 SOL for fees.` },
  { n: '02', tag: 'The routing', title: 'The routing splits it', body: 'Each destination has its share: holders, wallets, a buyback and burn, a treasury in xStocks, any page on the internet. Swaps go through Jupiter; one that would return less than 90% of the fair price pays that share in SOL instead.' },
  { n: '03', tag: 'Paid out', title: 'Every destination is paid', body: 'Holders are paid in batches of about 18 transfers per transaction, a hundred in a few seconds. Each page fills its own vault until its owner proves it; from then on it is paid directly. Every cycle leaves a receipt.' },
];

// The stage and the steps share one set of columns, so each step sits under its stretch.
const COLS = 'lg:grid-cols-[minmax(0,1fr)_minmax(0,0.7fr)_minmax(0,1.1fr)]';

/** A beam of light in the page, with pulses running along it. `pellet` 'sol' sends small SOL coins instead of white dots. */
function Beam({ vertical = false, pellet = 'dot', className = '', style = {} }) {
  const still = useReducedMotion();
  const axis = vertical ? 'top' : 'left';
  const pos = className.split(' ').includes('absolute') ? '' : 'relative';
  return (
    <span className={`${pos} block rounded-full ${vertical ? 'w-[5px]' : 'h-[5px]'} ${className}`} style={{ backgroundImage: vertical ? VBEAM : BEAM, boxShadow: GLOW, ...style }}>
      {!still && [0, 1, 2].map((k) => (
        <motion.span
          key={k}
          className={`absolute ${vertical ? 'left-1/2' : 'top-1/2'} -translate-x-1/2 -translate-y-1/2`}
          initial={{ [axis]: '0%', opacity: 0 }}
          animate={{ [axis]: '100%', opacity: [0, 1, 1, 0] }}
          transition={{ duration: 2.1, delay: k * 0.7, repeat: Infinity, ease: 'linear' }}
        >
          {pellet === 'sol' ? <Sol className="h-3.5 w-3.5 shadow-[0_0_10px_rgba(95,227,255,0.7)]" /> : <span className="block h-2 w-2 rounded-full bg-white shadow-[0_0_10px_#fff]" />}
        </motion.span>
      ))}
    </span>
  );
}

/** The coin: a pump.fun coin, drawn as a lit disc. */
function Coin({ size = 'h-14 w-14' }) {
  return (
    <span className={`relative flex ${size} shrink-0 items-center justify-center rounded-full border border-white/15 bg-[rgba(5,7,12,0.85)] shadow-[0_0_34px_rgba(47,168,255,0.3)]`}>
      <span aria-hidden="true" className="absolute inset-[4px] rounded-full border border-cyan-500/30" />
      <span className="font-mono text-[10px] font-medium tracking-[0.06em] text-ink">$COIN</span>
    </span>
  );
}

function DevWallet({ className = '' }) {
  return (
    <div className={`rounded-2xl border border-white/10 bg-[rgba(5,7,12,0.78)] px-4 py-3.5 backdrop-blur-md ${className}`}>
      <div className="label">Dev wallet</div>
      <div className="mt-1.5 flex items-center gap-2">
        <Sol className="h-5 w-5" />
        <span className="figure text-[26px] font-medium leading-none text-ink">4.82</span>
        <span className="text-sm text-mut">SOL</span>
      </div>
      <div className="mt-1.5 text-[11px] text-mut">0.02 SOL stays for fees</div>
    </div>
  );
}

function Step({ step, i }) {
  return (
    <motion.div className="h-full" initial={{ opacity: 0, y: 14 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.3 }} transition={{ delay: i * 0.08, duration: 0.6, ease: EASE }}>
      <Glass lit="top" className="h-full p-6">
        <div className="flex items-baseline justify-between gap-3">
          <span className="figure text-beam text-[30px] font-medium leading-none">{step.n}</span>
          <span className="label">{step.tag}</span>
        </div>
        <h3 className="mt-5 text-[19px] font-medium leading-snug tracking-[-0.02em] text-ink">{step.title}</h3>
        <p className="mt-2 text-[14px] leading-relaxed text-mut">{step.body}</p>
      </Glass>
    </motion.div>
  );
}

export default function HowItWorks() {
  return (
    <div id="how" className="scroll-mt-20">
      <div className="flex flex-wrap items-end justify-between gap-x-10 gap-y-4">
        <div className="max-w-xl">
          <div className="eyebrow mb-4">How it works</div>
          <h2 className="font-display text-[34px] font-medium leading-[1.04] tracking-[-0.03em] text-ink sm:text-[44px]">Follow a fee from the coin to the payout</h2>
        </div>
        <p className="max-w-xs pb-1 text-[15px] leading-relaxed text-mut">Three stops on Solana, every cycle, each one on chain with a receipt.</p>
      </div>

      {/* the route, on the ground: coin, dev wallet, the split, the destinations */}
      <div className="relative mt-14">
        <div aria-hidden="true" className="pointer-events-none absolute inset-x-[8%] top-1/2 h-48 -translate-y-1/2 rounded-full bg-hood-500/10 blur-3xl" />
        <div className={`relative grid grid-cols-[64px_minmax(0,1fr)] ${COLS}`}>
          {/* wide: the coin and the dev wallet on one line of light that runs into the split */}
          <div className="hidden h-full items-center lg:flex">
            <div className="relative">
              <Coin />
              <div className="absolute left-1/2 top-full mt-3 -translate-x-1/2 whitespace-nowrap text-center">
                <div className="text-[13px] font-medium text-ink">Your coin</div>
                <div className="label mt-0.5">on pump.fun</div>
              </div>
            </div>
            <div className="relative mx-3 min-w-[48px] flex-1">
              <span className="label absolute bottom-full left-1/2 mb-3 -translate-x-1/2 !text-cyan-500">fees</span>
              <Beam pellet="sol" />
            </div>
            <DevWallet className="w-[178px] shrink-0" />
            <Beam className="min-w-[20px] flex-[0.6]" />
          </div>

          {/* narrow: the same, down a trunk */}
          <div className="relative col-span-2 pb-7 lg:hidden">
            <Beam vertical className="absolute bottom-0 top-12" style={{ left: TRUNK - 2.5 }} />
            <div className="flex items-center gap-3">
              <Coin size="h-12 w-12" />
              <div>
                <div className="text-[13px] font-medium text-ink">Your coin</div>
                <div className="label mt-0.5">on pump.fun · a fee on every trade</div>
              </div>
            </div>
            <div className="relative mt-6" style={{ marginLeft: 64 }}>
              <span aria-hidden="true" className="absolute top-1/2 h-[5px] -translate-y-1/2 rounded-full" style={{ left: TRUNK - 64, width: 64 - TRUNK, backgroundImage: BEAM, boxShadow: GLOW }} />
              <DevWallet />
            </div>
          </div>

          {/* the split */}
          <Fan ends={ENDS} height={H} from="left" className="hidden lg:block" />
          <Fan ends={ENDS} height={H} from="top" x={TRUNK} className="lg:hidden" />

          {/* the destinations, each at the end of its channel */}
          <ul className="flex flex-col" style={{ gap: GAP }}>
            {DESTS.map((d, i) => (
              <motion.li key={d.key} className="flex items-center" style={{ height: ROW }} initial={{ opacity: 0, x: 14 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ delay: 0.2 + i * 0.08, duration: 0.6, ease: EASE }}>
                <div className="w-full"><FlowChip icon={d.icon} label={d.label} sub={d.sub} share={d.share} /></div>
              </motion.li>
            ))}
          </ul>
        </div>
      </div>

      <div className={`mt-12 grid gap-4 ${COLS}`}>
        {STEPS.map((s, i) => <Step key={s.n} step={s} i={i} />)}
      </div>

      <div className="mt-6 flex flex-wrap items-baseline justify-between gap-x-8 gap-y-2">
        <p className="label !normal-case !tracking-normal">A cycle every 1, 2, 5, 10, 30 or 60 minutes, or once a day at the closing bell.</p>
        <p className="text-[13px] text-mut">Also on Robinhood Chain, the second chain: fees in ETH and Robinhood Stock Tokens, swaps on Uniswap.</p>
      </div>
    </div>
  );
}
