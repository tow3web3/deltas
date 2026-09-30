// How it works, drawn as the route a fee takes: out of the coin into the dev
// wallet, through the routing, into each destination. One map, three stops.
// On a wide screen the map runs across the frame with the three stops written
// under the part of the route they describe; on a narrow one the same map is
// cut at the stops and each piece sits above its text.
import { BRAND } from '../lib/brand';
import { getStock } from '../lib/stocks';

const D = 'var(--font-display), var(--font-sans), system-ui, sans-serif';
const F = 'var(--font-sans), system-ui, sans-serif';
const M = 'var(--font-mono), ui-monospace, monospace';
const GREEN = '#2FA8FF', MINT = '#4DB8FF', INK = '#F4F5F4', MUT = '#8A9099', LINE = '#2A2E33', PAPER = '#101112', DEEP = '#1A3F73', GOLD = '#F6C343';

// The map is 1056 wide. Each stop owns a stretch of it.
const ZONES = [{ x: 0, y: 68, w: 276, h: 204 }, { x: 276, y: 14, w: 368, h: 292 }, { x: 636, y: 14, w: 420, h: 292 }];
const H = 320;

const STEPS = [
  { n: '01', tag: 'Fees in', title: 'Link any coin', body: `Any ERC-20 on Robinhood Chain plugs in, from any launchpad. Its fees land in the dev wallet as stock tokens or ETH, and every cycle ${BRAND} sweeps everything above a small gas reserve.` },
  { n: '02', tag: 'The routing', title: 'Draw the routing', body: 'Give each route its share: holders, your own wallets, a buyback and burn, a treasury, and any page on the internet. A YouTube channel, a GitHub account or a domain is a route like any other.' },
  { n: '03', tag: 'Paid out', title: 'Every cycle pays each route', body: 'Holders and wallets are paid on chain. Each page gets its own vault, visible to anyone, and its owner claims by signing in with the platform and connecting a wallet.' },
];

const ROUTES = [
  { y: 48, share: '50%', logo: getStock('NVDA')?.logo, stock: true, name: 'Holders', sub: 'paid in NVDA, by balance and loyalty', state: 'Paid on chain' },
  { y: 104, share: '15%', logo: '/eth.svg', stock: true, name: 'Your wallets', sub: '0x3d17…9a02', state: 'Paid on chain' },
  { y: 160, share: '10%', logo: '/logos/tokens/PONS.png', name: 'Buyback and burn', sub: 'bought back, then burned', state: 'Burned' },
  { y: 216, share: '10%', logo: getStock('SPY')?.logo, stock: true, name: 'Treasury', sub: 'stocks, in a wallet you control', state: 'Held' },
  { y: 272, share: '15%', logo: '/logos/platforms/youtube.svg', name: 'youtube.com/@yourchannel', sub: 'its own vault, open to anyone', state: 'Owner claims', page: true },
];

function Disc({ x, y, r, href, clip, stock = false, ring = LINE, children }) {
  const pad = stock ? r * 0.2 : 0;
  return (
    <g transform={`translate(${x || 0} ${y || 0})`}>
      <circle r={r} fill={stock ? '#FFFFFF' : PAPER} />
      <image href={href} x={-r + pad} y={-r + pad} width={2 * (r - pad)} height={2 * (r - pad)} clipPath={`url(#${clip})`} preserveAspectRatio="xMidYMid slice" />
      <circle r={r} fill="none" stroke={ring} strokeWidth="1" />
      {children}
    </g>
  );
}
const Cap = ({ x, y, children, anchor = 'start', fill = MUT }) => (
  <text x={x} y={y} textAnchor={anchor} fill={fill} fontSize="8.5" fontWeight="500" fontFamily={M} letterSpacing="1.1" style={{ textTransform: 'uppercase' }}>{children}</text>
);
function Track({ d, dur = '1.8s' }) {
  return (
    <g>
      <path d={d} fill="none" stroke={LINE} strokeWidth="1" />
      <path d={d} fill="none" stroke={GREEN} strokeWidth="1.5" strokeDasharray="2 9" strokeLinecap="round">
        <animate attributeName="stroke-dashoffset" from="0" to="-44" dur={dur} repeatCount="indefinite" />
      </path>
    </g>
  );
}

/** The whole route, or the stretch of one stop. */
function RouteMap({ zone = null, className = '' }) {
  const z = zone == null ? { x: 0, y: 0, w: 1056, h: H } : ZONES[zone];
  const fees = [['NVDA', 0], ['TSLA', 0.33], ['ETH', 0.66]];
  // One clip per drawing: the hidden copy of the map must not own the id the visible one points to.
  const clip = `hw-round-${zone == null ? 'map' : zone}`;
  return (
    <svg viewBox={`${z.x} ${z.y} ${z.w} ${z.h}`} className={`mode-stage block w-full ${className}`} role="img" aria-label="Fees leave the coin for the dev wallet, pass through the routing and reach holders, wallets, a buyback, a treasury and a page">
      <defs><clipPath id={clip} clipPathUnits="objectBoundingBox"><circle cx="0.5" cy="0.5" r="0.5" /></clipPath></defs>

      {/* 01: the coin and the dev wallet */}
      <Cap x={24} y={44}>Any ERC-20 on Robinhood Chain</Cap>
      <Disc clip={clip} x={62} y={160} r={32} href="/logos/tokens/PONS.png" ring={DEEP} />
      <text x="62" y="216" textAnchor="middle" fill={INK} fontSize="15" fontWeight="500" fontFamily={D}>PONS</text>
      <Cap x={62} y={232} anchor="middle">Your coin</Cap>
      <Cap x={122} y={146} anchor="middle" fill={MINT}>Fees</Cap>
      <Track d="M 94 160 H 150" />
      {fees.map(([t, at]) => (
        <Disc clip={clip} key={t} r={8} href={t === 'ETH' ? '/eth.svg' : getStock(t)?.logo} stock>
          <animateMotion dur="4.5s" begin={`-${at * 4.5}s`} repeatCount="indefinite" path="M 98 160 H 146" />
        </Disc>
      ))}
      <rect x="150.5" y="84.5" width="112" height="152" rx="5" fill={PAPER} stroke={LINE} />
      <Cap x={162} y={104}>Dev wallet</Cap>
      <text x="162" y="121" fill={INK} fontSize="9" fontFamily={M}>0x8a2f…41c0</text>
      <line x1="150" x2="262" y1="133.5" y2="133.5" stroke={LINE} />
      {[['NVDA', '0.4210'], ['TSLA', '0.1875'], ['ETH', '0.0620']].map(([t, v], k) => (
        <g key={t}>
          <Disc clip={clip} x={171} y={156 + k * 28} r={9} href={t === 'ETH' ? '/eth.svg' : getStock(t)?.logo} stock />
          <text x="186" y={159.5 + k * 28} fill={INK} fontSize="10" fontWeight="600" fontFamily={F}>{t}</text>
          <text x="252" y={159.5 + k * 28} textAnchor="end" fill={MUT} fontSize="10" fontFamily={D} style={{ fontVariantNumeric: 'tabular-nums' }}>{v}</text>
        </g>
      ))}
      <Cap x={150} y={256}>Gas reserve stays</Cap>
      <Cap x={282} y={148} fill={MINT}>Sweep</Cap>

      {/* 02: the routing */}
      <Track d="M 262 160 H 320" />
      <rect x="320.5" y="140.5" width="84" height="40" rx="5" fill={PAPER} stroke={DEEP} />
      <Cap x={362} y={164} anchor="middle" fill={MINT}>Routing</Cap>
      <Cap x={362} y={198} anchor="middle">Shares add</Cap>
      <Cap x={362} y={211} anchor="middle">up to 100%</Cap>
      {ROUTES.map((r, k) => (
        <g key={r.name}>
          <Track d={`M 404 160 C 500 160 480 ${r.y} 575 ${r.y} H 644`} dur={`${1.6 + k * 0.15}s`} />
          <text x="634" y={r.y - 7} textAnchor="end" fill={r.page ? MINT : INK} fontSize="14" fontWeight="500" fontFamily={D} style={{ fontVariantNumeric: 'tabular-nums' }}>{r.share}</text>
        </g>
      ))}

      {/* 03: the destinations */}
      {ROUTES.map((r) => (
        <g key={r.name}>
          <rect x="644.5" y={r.y - 22.5} width="388" height="45" rx="5" fill={r.page ? 'rgba(47, 168, 255,0.05)' : PAPER} stroke={r.page ? DEEP : LINE} />
          <Disc clip={clip} x={669} y={r.y} r={12} href={r.logo} stock={r.stock} />
          <text x="690" y={r.y - 2} fill={INK} fontSize={r.page ? 11 : 12} fontWeight={r.page ? 400 : 600} fontFamily={r.page ? M : F}>{r.name}</text>
          <text x="690" y={r.y + 12} fill={MUT} fontSize="8.5" fontFamily={M}>{r.sub}</text>
          <Cap x={1020} y={r.y + 3} anchor="end" fill={r.page ? GOLD : MINT}>{r.state}</Cap>
        </g>
      ))}
    </svg>
  );
}

function Stop({ step, className = '' }) {
  return (
    <div className={`px-5 py-5 sm:px-6 ${className}`}>
      <div className="flex items-baseline gap-3">
        <span className="figure text-[28px] font-medium leading-none text-hood-600">{step.n}</span>
        <span className="label">{step.tag}</span>
      </div>
      <h3 className="mt-3 font-display text-xl font-medium tracking-tight text-ink">{step.title}</h3>
      <p className="mt-1.5 text-sm leading-relaxed text-mut">{step.body}</p>
    </div>
  );
}

const COLS = 'lg:grid-cols-[276fr_368fr_412fr]';

export default function HowItWorks() {
  return (
    <div id="how" className="scroll-mt-20">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-x-10 gap-y-2">
        <div>
          <div className="eyebrow mb-2">How it works</div>
          <h2 className="font-display text-2xl font-medium tracking-tight text-ink sm:text-3xl lg:text-4xl">Follow a fee from the coin to the payout</h2>
        </div>
        <p className="label pb-1.5">Three stops, every cycle</p>
      </div>

      {/* wide: the map in one piece, the stops written under their stretch of it */}
      <div className="frame hidden lg:block">
        <div className="rounded-t-2xl bg-ground/60"><RouteMap /></div>
        <div className={`grid border-t border-line ${COLS}`} aria-hidden>
          {STEPS.map((s, i) => (
            <div key={s.n} className={`relative h-2 ${i ? 'border-l border-line' : ''}`}><span className="absolute left-0 top-0 h-px w-10 -translate-y-px bg-hood-500" /></div>
          ))}
        </div>
        <div className={`grid ${COLS}`}>
          {STEPS.map((s, i) => <Stop key={s.n} step={s} className={i ? 'border-l border-line' : ''} />)}
        </div>
      </div>

      {/* narrow: the map cut at each stop */}
      <div className="frame divide-y divide-line lg:hidden">
        {STEPS.map((s, i) => (
          <div key={s.n}>
            <div className={`border-b border-line bg-ground/60 ${i ? '' : 'rounded-t-2xl'}`}><RouteMap zone={i} className="mx-auto max-w-md" /></div>
            <Stop step={s} />
          </div>
        ))}
      </div>
    </div>
  );
}
