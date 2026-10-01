// One scene per routing option, for the stage of the Modes section. Pure SVG
// and SMIL, no JavaScript timers. Every scene speaks the site's grammar: glass
// panes with one lit edge, channels of light (a faint wide stroke, a bright
// core, a white pulse travelling along it), soft halos behind what matters,
// mono captions, figures in Geist, real logos on discs (xStocks, SOL, the
// platforms). What matters is on screen at every frame; the motion only adds
// to it. ViewBox 440 x 230. The coins of the examples ($GLOW, $ORBIT) are drawn,
// not borrowed: they stand for any pump.fun coin.
import { getXStock, FEATURED_XSTOCKS, XSTOCKS_TOTAL } from '../lib/xstocks';
import { getStock } from '../lib/stocks';
import { BRAND } from '../lib/brand';

const INK = '#F3F5F9', MUT = '#8A93A6', DIM = '#5A6275', BLUE = '#2FA8FF', CYAN = '#5FE3FF', VIOLET = '#7B5CFF', ORANGE = '#FF7A1A', DOWN = '#FF5C33';
const GLASS = 'rgba(255,255,255,0.035)', EDGE = 'rgba(255,255,255,0.09)', HAIR = 'rgba(255,255,255,0.08)', TRACK = 'rgba(255,255,255,0.06)', DARK = '#0B0F17';
const MONO = { fontFamily: 'var(--font-mono), ui-monospace, monospace' };
const SANS = { fontFamily: 'var(--font-sans), system-ui, sans-serif', fontVariantNumeric: 'tabular-nums' };

const SOL = '/sol.png';
// An xStock's logo as StockLogo picks it: the site's own file for the company first, then the issuer's.
const xs = (t) => getStock(t)?.logo || getXStock(t)?.logo || null;
const sym = (t) => getXStock(t)?.symbol || `${t}x`;
const platform = (p) => `/logos/platforms/${p}.svg`;

function Svg({ label, children }) {
  return (
    <svg viewBox="0 0 440 230" className="h-full w-full" style={{ overflow: 'visible' }} role="img" aria-label={label}>
      <defs>
        {/* user space, so a straight channel keeps its colour (a bounding box of zero height paints nothing) */}
        <linearGradient id="ms-beam" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="440" y2="0">
          <stop offset="0" stopColor={BLUE} /><stop offset="0.5" stopColor={CYAN} /><stop offset="1" stopColor={VIOLET} />
        </linearGradient>
        <linearGradient id="ms-bar" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor={BLUE} /><stop offset="0.45" stopColor={CYAN} /><stop offset="1" stopColor={VIOLET} />
        </linearGradient>
        <linearGradient id="ms-sheen" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#FFFFFF" stopOpacity="0.07" /><stop offset="0.45" stopColor="#FFFFFF" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="ms-fall" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={CYAN} stopOpacity="0.2" /><stop offset="1" stopColor={BLUE} stopOpacity="0" />
        </linearGradient>
        <radialGradient id="ms-halo"><stop offset="0" stopColor={BLUE} stopOpacity="0.5" /><stop offset="1" stopColor={BLUE} stopOpacity="0" /></radialGradient>
        <radialGradient id="ms-halo-hot"><stop offset="0" stopColor={ORANGE} stopOpacity="0.6" /><stop offset="1" stopColor={ORANGE} stopOpacity="0" /></radialGradient>
        <radialGradient id="ms-coin-a" cx="0.35" cy="0.3" r="0.8"><stop offset="0" stopColor={CYAN} /><stop offset="0.55" stopColor={BLUE} /><stop offset="1" stopColor="#123A7A" /></radialGradient>
        <radialGradient id="ms-coin-b" cx="0.35" cy="0.3" r="0.8"><stop offset="0" stopColor="#A996FF" /><stop offset="0.55" stopColor={VIOLET} /><stop offset="1" stopColor="#2A2460" /></radialGradient>
        <filter id="ms-glow" filterUnits="userSpaceOnUse" x="-60" y="-60" width="560" height="350">
          <feGaussianBlur stdDeviation="3.5" result="b" /><feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
        <filter id="ms-blur" filterUnits="userSpaceOnUse" x="-60" y="-60" width="560" height="350"><feGaussianBlur stdDeviation="12" /></filter>
        <clipPath id="ms-round" clipPathUnits="objectBoundingBox"><circle cx="0.5" cy="0.5" r="0.5" /></clipPath>
      </defs>
      {children}
    </svg>
  );
}

/* ---------------- the grammar ---------------- */

/** A glass pane: translucent fill, hairline edge, the sheen, one lit edge, and an optional glow from within. */
function Pane({ x, y, w, h, r = 12, lit = 'none', glow = null, stroke = EDGE }) {
  return (
    <g>
      {glow && <rect x={x + 8} y={y + 8} width={Math.max(0, w - 16)} height={Math.max(0, h - 16)} rx={r} fill={glow} opacity="0.3" filter="url(#ms-blur)" />}
      <rect x={x + 0.5} y={y + 0.5} width={w - 1} height={h - 1} rx={r} fill={GLASS} stroke={stroke} />
      <rect x={x + 0.5} y={y + 0.5} width={w - 1} height={h - 1} rx={r} fill="url(#ms-sheen)" />
      {lit === 'left' && <line x1={x + 0.5} x2={x + 0.5} y1={y + r} y2={y + h - r} stroke={CYAN} strokeOpacity="0.75" strokeWidth="1.2" filter="url(#ms-glow)" />}
      {lit === 'top' && <line x1={x + r} x2={x + w - r} y1={y + 0.5} y2={y + 0.5} stroke={CYAN} strokeOpacity="0.75" strokeWidth="1.2" filter="url(#ms-glow)" />}
    </g>
  );
}

/** A white pulse travelling along a path. A negative begin puts it in motion from the first frame. */
function Pulse({ d, dur = 2.6, begin = 0, r = 2.6 }) {
  return (
    <circle r={r} fill="#FFFFFF" filter="url(#ms-glow)">
      <animateMotion dur={`${dur}s`} begin={`${-begin}s`} repeatCount="indefinite" path={d} keyPoints="0;1" keyTimes="0;1" calcMode="spline" keySplines="0.4 0 0.2 1" />
    </circle>
  );
}

/** A channel of light: the faint wide stroke is the share, the bright core carries the pulse. */
function Channel({ d, w = 6, dur = 2.6, begin = 0, pulse = true }) {
  return (
    <g>
      <path d={d} fill="none" stroke="url(#ms-beam)" strokeWidth={w} strokeLinecap="round" opacity="0.22" />
      <path d={d} fill="none" stroke="url(#ms-beam)" strokeWidth={Math.max(1.4, w * 0.42)} strokeLinecap="round" filter="url(#ms-glow)" opacity="0.95" />
      {pulse && <Pulse d={d} dur={dur} begin={begin} r={Math.max(2.2, w * 0.42)} />}
    </g>
  );
}

/** A channel bar: a dark track and the beam over the share. `values` animates the beam's width. */
function Bar({ x, y, w, h = 6, share = 1, values, keyTimes, dur = '8s', fill = 'url(#ms-bar)', glow = true }) {
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} rx={h / 2} fill={TRACK} />
      <rect x={x} y={y} width={w * share} height={h} rx={h / 2} fill={fill} filter={glow ? 'url(#ms-glow)' : undefined}>
        {values && <animate attributeName="width" values={values} keyTimes={keyTimes} dur={dur} repeatCount="indefinite" />}
      </rect>
    </g>
  );
}

/** A real logo on a disc: an xStock, SOL, a platform. */
function Disc({ x = 0, y = 0, r = 10, src, ring = 'rgba(255,255,255,0.16)', halo = false, opacity, children }) {
  return (
    <g transform={`translate(${x} ${y})`} opacity={opacity}>
      {halo && <circle r={r * 2.1} fill="url(#ms-halo)" />}
      <circle r={r} fill={DARK} />
      {src && <image href={src} x={-r} y={-r} width={2 * r} height={2 * r} clipPath="url(#ms-round)" preserveAspectRatio="xMidYMid slice" />}
      <circle r={r} fill="none" stroke={ring} strokeWidth="1" />
      {children}
    </g>
  );
}

/** The example coins: $GLOW (an orb of light) and $ORBIT (a ringed violet). */
function Coin({ x = 0, y = 0, r = 10, kind = 'glow', opacity, children }) {
  return (
    <g transform={`translate(${x} ${y})`} opacity={opacity}>
      <circle r={r} fill={`url(#${kind === 'orbit' ? 'ms-coin-b' : 'ms-coin-a'})`} />
      {kind === 'orbit' ? (
        <>
          <ellipse rx={r * 0.62} ry={r * 0.26} fill="none" stroke="#FFFFFF" strokeOpacity="0.85" strokeWidth={Math.max(0.8, r * 0.09)} transform="rotate(-24)" />
          <circle r={r * 0.2} fill="#FFFFFF" />
        </>
      ) : <circle r={r * 0.34} fill="#FFFFFF" opacity="0.92" />}
      <circle r={r} fill="none" stroke="rgba(255,255,255,0.2)" />
      {children}
    </g>
  );
}

function Lock({ x, y, color = MUT }) {
  return (
    <g transform={`translate(${x} ${y})`} fill="none" stroke={color} strokeWidth="1.2">
      <path d="M -3.5 -1 V -3.5 A 3.5 3.5 0 0 1 3.5 -3.5 V -1" />
      <rect x={-5} y={-1} width={10} height={8} rx={2} fill={color} fillOpacity="0.2" />
    </g>
  );
}

const Cap = ({ x, y, children, anchor = 'start', fill = DIM, size = 7.5 }) => (
  <text x={x} y={y} textAnchor={anchor} fill={fill} fontSize={size} fontWeight="500" letterSpacing="1.3" style={{ ...MONO, textTransform: 'uppercase' }}>{children}</text>
);
const Mono = ({ x, y, children, anchor = 'start', fill = INK, size = 9 }) => (
  <text x={x} y={y} textAnchor={anchor} fill={fill} fontSize={size} style={MONO}>{children}</text>
);
const Txt = ({ x, y, children, anchor = 'start', fill = INK, size = 10, weight = 500 }) => (
  <text x={x} y={y} textAnchor={anchor} fill={fill} fontSize={size} fontWeight={weight} style={SANS}>{children}</text>
);
const Fig = ({ x, y, children, anchor = 'start', fill = INK, size = 16 }) => (
  <text x={x} y={y} textAnchor={anchor} fill={fill} fontSize={size} fontWeight="500" letterSpacing={-0.03 * size} style={SANS}>{children}</text>
);
const Hair = ({ x1, x2, y1, y2, dash, stroke = HAIR }) => <line x1={x1} x2={x2} y1={y1} y2={y2} stroke={stroke} strokeWidth="1" strokeDasharray={dash} />;

/** Visible from `from` to `to` (fractions of the loop). */
const blink = (from, to, dur = '8s') => (
  <animate attributeName="opacity" values="0;0;1;1;0;0" keyTimes={`0;${from};${Math.min(from + 0.03, to)};${to};${Math.min(to + 0.03, 1)};1`} dur={dur} repeatCount="indefinite" />
);

/* ---------------- where fees go ---------------- */

/* Payout ratio: one beam, two channels, their widths are the split. */
function Payout() {
  const kt = '0;0.32;0.35;0.65;0.68;0.98;1';
  const sets = [['100%', '0%', 0, 0.32], ['80%', '20%', 0.35, 0.65], ['70%', '30%', 0.68, 0.98]];
  const hold = 'M 178 115 C 222 115, 220 70, 262 70';
  const mine = 'M 178 115 C 222 115, 220 160, 262 160';
  return (
    <Svg label="The split between holders and your own wallet, sent every cycle">
      <Cap x={24} y={30}>Payout ratio</Cap>
      <Cap x={416} y={30} anchor="end">Sent every cycle</Cap>

      <Pane x={24} y={86} w={110} h={58} lit="left" />
      <Cap x={37} y={104}>Dev wallet</Cap>
      <Disc x={46} y={125} r={8.5} src={SOL} />
      <Fig x={60} y={130} size={14}>4.82 SOL</Fig>
      <line x1={134} x2={178} y1={115} y2={115} stroke="url(#ms-beam)" strokeWidth="7" strokeLinecap="round" filter="url(#ms-glow)" opacity="0.9" />

      {/* the holders' channel: its width is the share */}
      <path d={hold} fill="none" stroke="url(#ms-beam)" strokeLinecap="round" opacity="0.22" strokeWidth="11">
        <animate attributeName="stroke-width" values="11;11;9;9;8;8;11" keyTimes={kt} dur="9s" repeatCount="indefinite" />
      </path>
      <path d={hold} fill="none" stroke="url(#ms-beam)" strokeLinecap="round" filter="url(#ms-glow)" strokeWidth="4.6">
        <animate attributeName="stroke-width" values="4.6;4.6;3.8;3.8;3.4;3.4;4.6" keyTimes={kt} dur="9s" repeatCount="indefinite" />
      </path>
      <Pulse d={hold} dur={2.4} r={3.6} />
      {/* yours: dark at 100/0, lit when you keep a share */}
      <g opacity="0.12">
        <animate attributeName="opacity" values="0.12;0.12;1;1;1;1;0.12" keyTimes={kt} dur="9s" repeatCount="indefinite" />
        <path d={mine} fill="none" stroke="url(#ms-beam)" strokeLinecap="round" opacity="0.22" strokeWidth="2">
          <animate attributeName="stroke-width" values="2;2;5;5;6.5;6.5;2" keyTimes={kt} dur="9s" repeatCount="indefinite" />
        </path>
        <path d={mine} fill="none" stroke="url(#ms-beam)" strokeLinecap="round" filter="url(#ms-glow)" strokeWidth="1.2">
          <animate attributeName="stroke-width" values="1.2;1.2;2.2;2.2;2.8;2.8;1.2" keyTimes={kt} dur="9s" repeatCount="indefinite" />
        </path>
        <Pulse d={mine} dur={2.8} begin={1.1} r={2.6} />
      </g>

      <Pane x={262} y={46} w={154} h={48} />
      <circle cx={280} cy={70} r={4} fill={CYAN} filter="url(#ms-glow)" />
      <Txt x={294} y={67} size={11}>Holders</Txt>
      <Mono x={294} y={81} size={7.5} fill={MUT}>pro rata · SOL</Mono>
      {sets.map(([h, , a, b]) => <g key={h} opacity="0"><Fig x={404} y={77} anchor="end" size={18}>{h}</Fig>{blink(a, b, '9s')}</g>)}

      <Pane x={262} y={136} w={154} h={48} />
      <rect x={274.5} y={155.5} width={12} height={9} rx={2.5} fill="none" stroke={INK} strokeOpacity="0.75" />
      <circle cx={283} cy={160} r={1.2} fill={INK} />
      <Txt x={294} y={157} size={11}>Your wallet</Txt>
      <Mono x={294} y={171} size={7.5} fill={MUT}>7xKX…9fGh</Mono>
      {sets.map(([h, y, a, b], k) => <g key={h} opacity="0"><Fig x={404} y={167} anchor="end" size={18} fill={k ? INK : DIM}>{y}</Fig>{blink(a, b, '9s')}</g>)}

      {['100 / 0', '80 / 20', '70 / 30'].map((p, k) => {
        const x = 24 + k * 84;
        return (
          <g key={p}>
            <rect x={x + 0.5} y={190.5} width={76} height={22} rx={11} fill={GLASS} stroke={EDGE} />
            <g opacity="0">
              <rect x={x + 0.5} y={190.5} width={76} height={22} rx={11} fill="rgba(47,168,255,0.12)" stroke="url(#ms-beam)" filter="url(#ms-glow)" />
              {blink(sets[k][2], sets[k][3], '9s')}
            </g>
            <Mono x={x + 38.5} y={204.5} anchor="middle" size={9}>{p}</Mono>
          </g>
        );
      })}
      <Cap x={416} y={205} anchor="end">Your call</Cap>
    </Svg>
  );
}

/* Pages: nine kinds of page, each with a vault that fills until its owner proves it. */
const PAGE_KINDS = ['youtube', 'github', 'x', 'instagram', 'facebook', 'tiktok', 'twitch', 'domain', 'phone'];
function Vault() {
  const shown = [['youtube', 'youtube.com/@yourchannel', 0, 0.32], ['github', 'github.com/your-org', 0.34, 0.65], ['phone', '+33 • •• •• •• 78', 0.67, 0.98]];
  return (
    <Svg label="A share of fees fills the vault of a page until its owner proves it and takes it">
      {shown.map(([p, name, a, b]) => (
        <g key={p} opacity="0">
          <Disc x={34} y={40} r={10} src={platform(p)} />
          <Txt x={51} y={43.5} size={10.5}>{name}</Txt>
          {blink(a, b, '24s')}
        </g>
      ))}
      {PAGE_KINDS.map((p, k) => {
        const on = shown.find((s) => s[0] === p);
        const x = 240 + k * 21;
        return (
          <g key={p}>
            <Disc x={x} y={40} r={8} src={platform(p)} />
            {on && <g opacity="0"><circle cx={x} cy={40} r={10.5} fill="none" stroke={CYAN} strokeWidth="1.2" filter="url(#ms-glow)" />{blink(on[2], on[3], '24s')}</g>}
          </g>
        );
      })}
      <Hair x1={24} x2={416} y1={62.5} y2={62.5} />

      <Pane x={24} y={88} w={100} h={60} lit="left" />
      <Cap x={37} y={106}>Share of fees</Cap>
      <Disc x={46} y={129} r={9} src={SOL} />
      <Fig x={61} y={133.5} size={13}>SOL</Fig>
      <Channel d="M 124 118 H 168" w={5} dur={1.8} />

      <Pane x={168} y={78} w={140} h={80} lit="left" glow={BLUE} />
      <Cap x={181} y={96} fill={CYAN}>Its own vault</Cap>
      {[['0.12 SOL', 0, 0.2], ['0.31 SOL', 0.22, 0.42], ['0.58 SOL', 0.44, 0.7], ['0.00 SOL', 0.74, 0.98]].map(([v, a, b], k) => (
        <g key={v} opacity="0"><Fig x={181} y={128} size={21} fill={k === 3 ? DIM : INK}>{v}</Fig>{blink(a, b)}</g>
      ))}
      <Bar x={181} y={140} w={114} h={4} share={0.5} values="26;26;62;62;114;114;0;0" keyTimes="0;0.2;0.22;0.42;0.44;0.7;0.74;1" />

      <g opacity="0"><Channel d="M 308 118 H 346" w={5} dur={1.2} />{blink(0.68, 0.98)}</g>
      <Pane x={346} y={88} w={70} h={60} />
      <Cap x={357} y={106}>Owner</Cap>
      <Mono x={357} y={124} size={8.5}>9wQe…3kLm</Mono>
      <g opacity="0"><Cap x={357} y={140}>Waiting</Cap>{blink(0, 0.68)}</g>
      <g opacity="0"><Cap x={357} y={140} fill={CYAN}>Proved</Cap>{blink(0.7, 0.98)}</g>

      <Cap x={24} y={192}>1 Paste a link</Cap>
      <Cap x={168} y={192}>2 The vault fills</Cap>
      <Cap x={416} y={192} anchor="end">3 The owner proves it</Cap>
      <Mono x={24} y={208} size={7.5} fill={MUT}>public, on chain</Mono>
      <Mono x={416} y={208} anchor="end" size={7.5} fill={MUT}>sign-in · DNS record · code by WhatsApp or SMS</Mono>
    </Svg>
  );
}

/* Retained earnings: a treasury held in xStocks, with its balance sheet in public. */
function Treasury() {
  const rows = [['SPY', 80, 0.92, '$1,204'], ['NVDA', 116, 0.7, '$902'], ['GLD', 152, 0.42, '$546']];
  const kt = '0;0.3;0.34;0.63;0.67;0.97;1';
  return (
    <Svg label="A treasury held in xStocks, with its balance sheet and book value per token">
      <Cap x={24} y={34}>Book value per token</Cap>
      {[['$0.0012', 0, 0.3], ['$0.0027', 0.33, 0.63], ['$0.0041', 0.66, 0.97]].map(([v, a, b]) => (
        <g key={v} opacity="0"><Fig x={24} y={70} size={30}>{v}</Fig>{blink(a, b)}</g>
      ))}
      <Cap x={24} y={100}>Market cap backed</Cap>
      <Bar x={24} y={108} w={160} h={5} share={0.1} values="16;16;34;34;52;52;16" keyTimes={kt} />

      <Cap x={24} y={152}>SOL in, swapped on Jupiter</Cap>
      <Disc x={34} y={174} r={9} src={SOL} />
      <Channel d="M 46 174 H 206" w={5} dur={2.2} />
      <Cap x={24} y={206}>Held by a wallet you control</Cap>

      <Pane x={206} y={24} w={210} h={182} lit="left" />
      <Cap x={220} y={43}>Treasury</Cap>
      <Cap x={404} y={43} anchor="end" fill={CYAN}>Public</Cap>
      <Hair x1={207} x2={415} y1={56.5} y2={56.5} />
      {rows.map(([t, y, w, v]) => (
        <g key={t}>
          <Disc x={231} y={y} r={10} src={xs(t)} />
          <Txt x={248} y={y + 3.5} size={11}>{sym(t)}</Txt>
          <Bar x={296} y={y - 2} w={64} h={4} share={w} values={[0.3, 0.3, 0.65, 0.65, 1, 1, 0.3].map((f) => (64 * w * f).toFixed(1)).join(';')} keyTimes={kt} />
          <Fig x={404} y={y + 4} anchor="end" size={11}>{v}</Fig>
          <Hair x1={207} x2={415} y1={y + 18.5} y2={y + 18.5} />
        </g>
      ))}
      <Cap x={220} y={192}>Total</Cap>
      <Fig x={404} y={194} anchor="end" size={15} fill={CYAN}>$2,652</Fig>
    </Svg>
  );
}

/* Buyback and burn: SOL buys the coin on Jupiter, the coin is burned, supply shrinks. */
function Burn() {
  return (
    <Svg label="A share buys the coin on Jupiter and burns it: supply shrinks every cycle">
      <Pane x={24} y={26} w={106} h={50} lit="left" />
      <Cap x={37} y={44}>Buyback</Cap>
      <Disc x={45} y={62} r={7.5} src={SOL} />
      <Mono x={58} y={65} size={8} fill={MUT}>share of fees</Mono>
      <Channel d="M 130 51 H 176" w={5} dur={1.8} />
      <Pane x={176} y={37} w={82} h={28} r={14} />
      <Txt x={217} y={54.5} anchor="middle" size={10}>Jupiter</Txt>
      <Channel d="M 258 51 H 300" w={5} pulse={false} />
      {[0, 1].map((k) => (
        <g key={k} opacity="0">
          <Coin r={7} />
          <animateMotion dur="6s" repeatCount="indefinite" path="M 262 51 H 304" keyPoints="0;0;1;1" keyTimes={`0;${0.12 + k * 0.333};${0.3 + k * 0.333};1`} calcMode="linear" />
          <animate attributeName="opacity" values="0;0;1;1;0;0" keyTimes={`0;${0.12 + k * 0.333};${0.15 + k * 0.333};${0.27 + k * 0.333};${0.3 + k * 0.333};1`} dur="6s" repeatCount="indefinite" />
        </g>
      ))}
      <circle cx={358} cy={51} r={48} fill="url(#ms-halo-hot)" opacity="0.15">
        <animate attributeName="opacity" values="0.15;0.15;0.75;0.15;0.15;0.75;0.15;0.15" keyTimes="0;0.29;0.31;0.42;0.62;0.645;0.76;1" dur="6s" repeatCount="indefinite" />
      </circle>
      <Pane x={300} y={26} w={116} h={50} stroke="rgba(255,122,26,0.4)" />
      <Cap x={313} y={44} fill={ORANGE}>Burned</Cap>
      <Mono x={313} y={64} size={8.5}>$GLOW, on Solana</Mono>

      <Cap x={24} y={116}>Circulating supply</Cap>
      <Coin x={35} y={145} r={10} />
      {[['1,000,000,000', 0, 0.31], ['998,640,000', 0.33, 0.64], ['997,310,000', 0.66, 0.97]].map(([v, a, b]) => (
        <g key={v} opacity="0"><Fig x={53} y={154} size={26}>{v}</Fig>{blink(a, b, '6s')}</g>
      ))}
      <rect x={24} y={172} width={392} height={8} rx={4} fill="rgba(255,122,26,0.18)" />
      <rect x={24} y={172} width={392} height={8} rx={4} fill="url(#ms-bar)" filter="url(#ms-glow)">
        <animate attributeName="width" values="392;392;370;370;348;348;392" keyTimes="0;0.31;0.33;0.64;0.66;0.97;1" dur="6s" repeatCount="indefinite" />
      </rect>
      <Cap x={24} y={202}>Shrinks every cycle</Cap>
      <Cap x={416} y={202} anchor="end">Next to the dividend</Cap>
    </Svg>
  );
}

/* ---------------- what holders are paid in ---------------- */

/* Pay-through in kind: pump.fun pays SOL, holders receive SOL, about 18 to a transaction. */
function InKind() {
  const rows = [['7xKX…9fGh', 44, '+0.0142'], ['Bq3m…Tz8R', 106, '+0.0087'], ['E5wa…kP2c', 168, '+0.0031']];
  return (
    <Svg label="SOL fees are paid to holders as SOL, with no swap">
      <Pane x={24} y={74} w={118} h={64} lit="left" />
      <Cap x={37} y={92}>pump.fun pays</Cap>
      <Disc x={48} y={118} r={11} src={SOL} />
      <Fig x={66} y={123} size={15}>SOL</Fig>
      <Cap x={170} y={96} anchor="middle" fill={CYAN}>No swap</Cap>
      <line x1={142} x2={198} y1={106} y2={106} stroke="url(#ms-beam)" strokeWidth="6" strokeLinecap="round" filter="url(#ms-glow)" opacity="0.9" />
      {rows.map(([addr, y, amt], k) => (
        <g key={addr}>
          <Channel d={`M 198 106 C 234 106, 232 ${y}, 268 ${y}`} w={4.5} dur={2.2 + k * 0.3} begin={k * 0.6} />
          <Pane x={268} y={y - 18} w={148} h={36} />
          <Mono x={281} y={y + 3.5} size={9}>{addr}</Mono>
          <Fig x={386} y={y + 4} anchor="end" size={11} fill={CYAN}>{amt}</Fig>
          <Disc x={401} y={y} r={7.5} src={SOL} />
        </g>
      ))}
      <Cap x={24} y={170}>One transaction</Cap>
      {Array.from({ length: 18 }, (_, k) => (
        <circle key={k} cx={29 + k * 12} cy={188} r={3} fill={DIM} filter="url(#ms-glow)">
          <animate attributeName="fill" values={`${DIM};${DIM};${CYAN};${CYAN};${DIM}`} keyTimes={`0;${(k * 0.04).toFixed(2)};${(k * 0.04 + 0.02).toFixed(2)};0.9;1`} dur="4s" repeatCount="indefinite" />
        </circle>
      ))}
      <Cap x={24} y={208}>About 18 holders paid at once</Cap>
    </Svg>
  );
}

/* Convert: SOL in, swapped on Jupiter, one xStock out. */
function Convert() {
  const row = FEATURED_XSTOCKS.slice(0, 12);
  const picks = [['NVDA', 0, 0.32], ['SPY', 0.34, 0.65], ['GLD', 0.67, 0.98]];
  return (
    <Svg label="SOL is swapped on Jupiter into the xStock holders are paid in">
      <Cap x={24} y={30}>SOL in</Cap>
      <Cap x={416} y={30} anchor="end">One xStock out</Cap>
      <Disc x={60} y={92} r={24} src={SOL} halo />
      <Fig x={60} y={136} anchor="middle" size={13}>SOL</Fig>
      <Channel d="M 86 92 H 176" w={6} dur={2} />
      <Pane x={176} y={78} w={82} h={28} r={14} />
      <Txt x={217} y={95.5} anchor="middle" size={10}>Jupiter</Txt>
      <Channel d="M 258 92 H 348" w={6} dur={2} begin={0.8} />
      {picks.map(([t, a, b]) => (
        <g key={t} opacity="0">
          <Disc x={378} y={92} r={26} src={xs(t)} halo ring="rgba(95,227,255,0.6)" />
          <Fig x={378} y={136} anchor="middle" size={13}>{sym(t)}</Fig>
          {blink(a, b, '9s')}
        </g>
      ))}

      <Hair x1={24} x2={416} y1={156.5} y2={156.5} />
      <Cap x={24} y={176}>{`Any of the ${XSTOCKS_TOTAL.toLocaleString('en-US')} xStocks Jupiter verifies`}</Cap>
      {row.map((s, k) => {
        const pick = picks.find((p) => p[0] === s.ticker);
        return (
          <g key={s.ticker}>
            <Disc x={33 + k * 22} y={198} r={9} src={xs(s.ticker)} />
            {pick && <g opacity="0"><circle cx={33 + k * 22} cy={198} r={11.5} fill="none" stroke={CYAN} strokeWidth="1.2" filter="url(#ms-glow)" />{blink(pick[1], pick[2], '9s')}</g>}
          </g>
        );
      })}
      <Cap x={416} y={202} anchor="end">and more</Cap>
    </Svg>
  );
}

/* Any token, by mint: paste it, Jupiter finds the route, holders are paid in it. */
function AnyToken() {
  return (
    <Svg label="Holders of a coin are paid in any token, set by pasting its mint">
      <defs>
        <clipPath id="ms-type">
          <rect x="37" y="44" height="18" width="0"><animate attributeName="width" values="0;0;200;200" keyTimes="0;0.05;0.4;1" dur="7s" repeatCount="indefinite" /></rect>
        </clipPath>
      </defs>
      <Pane x={24} y={22} w={392} h={48} lit="left" />
      <Cap x={37} y={39}>Reward token · mint</Cap>
      <g clipPath="url(#ms-type)"><Mono x={37} y={58} size={11}>7Gq3Vb9yKcXw2RtLm5ZpQe…TkCvWr</Mono></g>
      <rect y={47} width={1.5} height={14} fill={CYAN} x={37}>
        <animate attributeName="x" values="37;37;230;230" keyTimes="0;0.05;0.4;1" dur="7s" repeatCount="indefinite" />
        <animate attributeName="opacity" values="1;0;1" dur="0.9s" repeatCount="indefinite" />
      </rect>

      <Channel d="M 220 70 V 90" w={4} dur={1.4} />
      <Pane x={24} y={90} w={392} h={46} />
      <Coin x={50} y={113} r={13} kind="orbit" />
      <Fig x={72} y={111} size={14}>$ORBIT</Fig>
      <Mono x={72} y={125} size={8.5} fill={MUT}>any token Jupiter can route</Mono>
      <g opacity="0"><Cap x={404} y={116} anchor="end" fill={CYAN}>Route found</Cap>{blink(0.42, 0.97, '7s')}</g>

      <Channel d="M 220 136 V 160" w={4} dur={1.4} begin={0.5} />
      <Pane x={24} y={160} w={392} h={46} lit="left" />
      <Coin x={48} y={183} r={11} />
      <Fig x={68} y={181} size={13}>$GLOW holders</Fig>
      <Mono x={68} y={195} size={8.5} fill={MUT}>paid in $ORBIT, every cycle</Mono>
      {[0, 1, 2].map((k) => (
        <Coin key={k} x={398 - k * 15} y={183} r={8} kind="orbit" opacity="0.3">
          <animate attributeName="opacity" values="0.3;0.3;1;1;0.3" keyTimes={`0;${0.5 + k * 0.1};${0.54 + k * 0.1};0.96;1`} dur="7s" repeatCount="indefinite" />
        </Coin>
      ))}
    </Svg>
  );
}

/* Roulette, Top Gainer, Portfolio: three ways for the reward to change every cycle. */
function Reel() {
  const list = ['AMD', 'META', 'GME', 'AAPL', 'COIN', 'GLD', 'TSLA', 'SPY', 'MSFT', 'PLTR', 'NVDA', 'AMZN', 'GOOGL', 'QQQ', 'HOOD', 'MSTR'].filter((t) => getXStock(t));
  const land = list.indexOf('NVDA');
  const col = (k) => 24 + k * (392 / 3);
  return (
    <Svg label="A random stock, the top gainer of the day, or a basket in rotation">
      <defs><clipPath id="ms-reel"><rect x="24" y="24" width="392" height="72" rx="12" /></clipPath></defs>
      <circle cx={220} cy={60} r={52} fill="url(#ms-halo)" />
      <Pane x={24} y={24} w={392} h={72} />
      <g clipPath="url(#ms-reel)">
        <g>
          {list.map((t, k) => <Disc key={t} x={220 + (k - land) * 58} y={60} r={18} src={xs(t)} />)}
          <animateTransform attributeName="transform" type="translate" values="320 0;320 0;0 0;0 0" keyTimes="0;0.06;0.6;1" dur="7s" repeatCount="indefinite" calcMode="spline" keySplines="0 0 1 1;0.2 0.7 0.2 1;0 0 1 1" />
        </g>
      </g>
      <rect x={192.5} y={30.5} width={55} height={59} rx={12} fill="none" stroke="url(#ms-beam)" strokeWidth="1.5" filter="url(#ms-glow)" />
      <Cap x={416} y={112} anchor="end" fill={CYAN}>This cycle</Cap>

      {[1, 2].map((k) => <Hair key={k} x1={col(k) - 8} x2={col(k) - 8} y1={124} y2={206} />)}
      <Cap x={col(0)} y={134}>Roulette</Cap>
      {['AAPL', 'COIN', 'GME'].map((t, k) => <Disc key={t} x={col(0) + 10 + k * 24} y={164} r={10} src={xs(t)} ring={k === 1 ? CYAN : undefined} halo={k === 1} />)}
      <Mono x={col(0)} y={198} size={8} fill={MUT}>a random liquid stock</Mono>

      <Cap x={col(1)} y={134}>Top gainer</Cap>
      <Disc x={col(1) + 10} y={164} r={10} src={xs('NVDA')} halo />
      <Fig x={col(1) + 28} y={169} size={14} fill={CYAN}>+3.4%</Fig>
      <Mono x={col(1)} y={198} size={8} fill={MUT}>the best stock of the day</Mono>

      <Cap x={col(2)} y={134}>Portfolio</Cap>
      {['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'META', 'NVDA', 'TSLA'].map((t, k) => <Disc key={t} x={col(2) + 10 + k * 15} y={164} r={10} src={xs(t)} ring={DARK} />)}
      <Mono x={col(2)} y={198} size={8} fill={MUT}>a basket, in rotation</Mono>
    </Svg>
  );
}

/* Community vote: holders pick the next reward. */
function VoteScene() {
  const rows = [['NVDA', 72, 0.52, '52%'], ['GLD', 112, 0.31, '31%'], ['SPY', 152, 0.17, '17%']];
  return (
    <Svg label="Holders vote on the next reward, weighted by balance and loyalty">
      <Cap x={24} y={36}>Next reward</Cap>
      <Cap x={416} y={36} anchor="end">Gasless, one signature</Cap>
      {rows.map(([t, y, p, label], k) => {
        const full = (258 * p).toFixed(1);
        return (
          <g key={t}>
            <Disc x={36} y={y} r={11} src={xs(t)} halo={k === 0} ring={k === 0 ? CYAN : undefined} />
            <Txt x={55} y={y + 4} size={12}>{sym(t)}</Txt>
            <Bar x={110} y={y - 4} w={258} h={8} share={p} glow={k === 0} fill={k === 0 ? 'url(#ms-bar)' : 'rgba(138,147,166,0.4)'} values={`0;${(258 * p * 0.5).toFixed(1)};${full};${full}`} keyTimes="0;0.2;0.5;1" dur="7s" />
            <Fig x={416} y={y + 5} anchor="end" size={15} fill={k === 0 ? CYAN : INK}>{label}</Fig>
          </g>
        );
      })}
      <Hair x1={24} x2={416} y1={180.5} y2={180.5} />
      <Mono x={24} y={202} size={9}>7xKX…9fGh signed</Mono>
      <Cap x={416} y={202} anchor="end">Weight = balance × loyalty</Cap>
    </Svg>
  );
}

/* ---------------- when, and who qualifies ---------------- */

/* Closing bell: one payout a day at 4:00 pm New York time, weekdays only. */
function Bell() {
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  return (
    <Svg label="One payout a day at 4 pm New York time, on weekdays">
      <Fig x={24} y={54} size={30}>4:00 pm</Fig>
      <Cap x={24} y={74}>New York time, weekdays</Cap>
      <Cap x={416} y={74} anchor="end" fill={CYAN}>A dividend calendar</Cap>
      <Pane x={24} y={88} w={392} h={120} lit="top" />
      <line x1={30} x2={298} y1={166} y2={166} stroke="url(#ms-beam)" strokeWidth="1.5" filter="url(#ms-glow)" opacity="0.7" />
      {days.map((d, k) => {
        const x = 24 + k * 56;
        const open = k < 5;
        const t0 = 0.06 + k * 0.12;
        return (
          <g key={d}>
            {k > 0 && <Hair x1={x + 0.5} x2={x + 0.5} y1={96} y2={200} />}
            <Cap x={x + 28} y={110} anchor="middle" fill={open ? INK : DIM}>{d}</Cap>
            {open ? (
              <>
                <circle r="3" fill="#FFFFFF" filter="url(#ms-glow)" opacity="0">
                  <animateMotion dur="8s" repeatCount="indefinite" path={`M ${x + 28} 120 V 166`} keyPoints="0;0;1;1" keyTimes={`0;${t0};${t0 + 0.06};1`} calcMode="linear" />
                  <animate attributeName="opacity" values="0;0;1;0;0" keyTimes={`0;${t0};${t0 + 0.03};${t0 + 0.06};1`} dur="8s" repeatCount="indefinite" />
                </circle>
                <Disc x={x + 28} y={166} r={11} src={xs('SPY')} ring={CYAN} halo opacity="0">
                  <animate attributeName="opacity" values="0;0;1;1;0" keyTimes={`0;${t0 + 0.05};${t0 + 0.08};0.95;1`} dur="8s" repeatCount="indefinite" />
                </Disc>
              </>
            ) : <Cap x={x + 28} y={169} anchor="middle">Closed</Cap>}
          </g>
        );
      })}
      <Mono x={30} y={196} size={8} fill={CYAN}>16:00 ET</Mono>
    </Svg>
  );
}

/* Market hours only: cycles outside the session are skipped. */
function Hours() {
  const X = (h) => 24 + (h / 24) * 392;
  const open = (h) => h >= 9.5 && h < 16;
  return (
    <Svg label="Cycles run while the market is open and are skipped when Wall Street is closed">
      <Cap x={24} y={36}>Every 1 to 60 minutes</Cap>
      <Cap x={416} y={36} anchor="end">Skipped while Wall Street is closed</Cap>
      <rect x={X(9.5) + 6} y={84} width={X(16) - X(9.5) - 12} height={60} rx={10} fill={BLUE} opacity="0.25" filter="url(#ms-blur)" />
      <rect x={X(9.5)} y={76} width={X(16) - X(9.5)} height={76} rx={10} fill="rgba(47,168,255,0.07)" stroke="rgba(95,227,255,0.4)" />
      <Cap x={(X(9.5) + X(16)) / 2} y={68} anchor="middle" fill={CYAN}>Market open</Cap>
      {Array.from({ length: 48 }, (_, k) => {
        const h = k / 2 + 0.25;
        const on = open(h);
        return <line key={k} x1={X(h)} x2={X(h)} y1={on ? 92 : 106} y2={on ? 136 : 122} stroke={on ? 'url(#ms-beam)' : DIM} strokeWidth={on ? 2 : 1} strokeLinecap="round" filter={on ? 'url(#ms-glow)' : undefined} opacity={on ? 1 : 0.6} />;
      })}
      <g>
        <line x1={0} x2={0} y1={70} y2={158} stroke="#FFFFFF" strokeWidth="1.2" filter="url(#ms-glow)" />
        <animateTransform attributeName="transform" type="translate" from="24 0" to="416 0" dur="9s" repeatCount="indefinite" />
      </g>
      <Hair x1={24} x2={416} y1={164.5} y2={164.5} />
      {[0, 9.5, 16, 24].map((h) => <Hair key={h} x1={X(h)} x2={X(h)} y1={164} y2={170} />)}
      <Mono x={24} y={183} size={8} fill={DIM}>00:00</Mono>
      <Mono x={X(9.5)} y={183} size={8} anchor="middle">09:30</Mono>
      <Mono x={X(16)} y={183} size={8} anchor="middle">16:00</Mono>
      <Mono x={416} y={183} size={8} anchor="end" fill={DIM}>24:00</Mono>
      <Cap x={(24 + X(9.5)) / 2} y={206} anchor="middle">Skipped</Cap>
      <Cap x={(X(9.5) + X(16)) / 2} y={206} anchor="middle" fill={CYAN}>Paid</Cap>
      <Cap x={(X(16) + 416) / 2} y={206} anchor="middle">Skipped</Cap>
    </Svg>
  );
}

/* Record date and loyalty: holding time raises the weight, selling resets it. */
function Loyalty() {
  const rows = [['7xKX…9fGh', 46, 0.72], ['Bq3m…Tz8R', 96, 0.86], ['E5wa…kP2c', 146, null]];
  return (
    <Svg label="Holding time raises the weight from 1x to 2x over 30 days; selling resets it">
      <line x1={130.5} x2={130.5} y1={28} y2={180} stroke={CYAN} strokeOpacity="0.35" strokeDasharray="2 4" />
      {rows.map(([addr, y, full]) => (
        <g key={addr}>
          <Mono x={24} y={y + 3} size={9}>{addr}</Mono>
          <rect x={90} y={y - 4} width={250} height={8} rx={4} fill={TRACK} />
          {full ? (
            <>
              <rect x={90} y={y - 4} width={250} height={8} rx={4} fill="url(#ms-bar)" filter="url(#ms-glow)">
                <animate attributeName="width" values="0;250;250" keyTimes={`0;${full};1`} dur="8s" repeatCount="indefinite" />
              </rect>
              <g opacity="0"><Fig x={416} y={y + 5} anchor="end" size={15} fill={DIM}>1.0x</Fig>{blink(0, full * 0.4)}</g>
              <g opacity="0"><Fig x={416} y={y + 5} anchor="end" size={15}>1.5x</Fig>{blink(full * 0.4 + 0.03, full - 0.03)}</g>
              <g opacity="0"><Fig x={416} y={y + 5} anchor="end" size={15} fill={CYAN}>2.0x</Fig>{blink(full, 1)}</g>
            </>
          ) : (
            <>
              <rect x={90} y={y - 4} width={60} height={8} rx={4} fill="url(#ms-bar)">
                <animate attributeName="width" values="0;110;110;0;0;60" keyTimes="0;0.4;0.5;0.52;0.6;1" dur="8s" repeatCount="indefinite" />
              </rect>
              <rect x={90} y={y - 4} width={110} height={8} rx={4} fill={DOWN} opacity="0" filter="url(#ms-glow)">
                <animate attributeName="opacity" values="0;0;0.9;0;0" keyTimes="0;0.49;0.51;0.6;1" dur="8s" repeatCount="indefinite" />
              </rect>
              <g opacity="0"><Fig x={416} y={y + 5} anchor="end" size={15} fill={DIM}>1.0x</Fig>{blink(0, 0.46)}</g>
              <g opacity="0"><Cap x={416} y={y + 3} anchor="end" fill={DOWN}>Sold, reset</Cap>{blink(0.5, 0.72)}</g>
              <g opacity="0"><Fig x={416} y={y + 5} anchor="end" size={15} fill={DIM}>1.0x</Fig>{blink(0.76, 1)}</g>
            </>
          )}
        </g>
      ))}
      <Hair x1={90} x2={340} y1={182.5} y2={182.5} />
      {[90, 130, 340].map((x) => <Hair key={x} x1={x + 0.5} x2={x + 0.5} y1={182} y2={188} />)}
      <Cap x={90} y={202}>Day 0</Cap>
      <Cap x={136} y={202}>Minimum hold</Cap>
      <Cap x={340} y={202} anchor="end">Day 30</Cap>
      <Cap x={416} y={202} anchor="end" fill={CYAN}>Weight</Cap>
    </Svg>
  );
}

/* ---------------- safety and reporting ---------------- */

/* Fair-price guard: a fill under 90% of Jupiter's price is refused, that share is paid in SOL. */
function Guard() {
  const X = (p) => 150 + ((p - 50) / 50) * 254;
  const rows = [
    { key: 'nvda', y: 92, p: 98.6, tone: CYAN, v: '98.6%', note: 'swap fills', icon: <Disc x={36} y={92} r={11} src={xs('NVDA')} /> },
    { key: 'orbit', y: 150, p: 71.2, tone: DOWN, v: '71.2%', note: 'thin pool, refused', icon: <Coin x={36} y={150} r={11} kind="orbit" /> },
  ];
  return (
    <Svg label="Every swap is checked against Jupiter's price; below 90% the share is paid in SOL">
      <Cap x={24} y={36}>Fill vs Jupiter&apos;s price</Cap>
      <Cap x={X(90)} y={58} anchor="middle" fill={CYAN}>90%</Cap>
      <Cap x={X(100)} y={58} anchor="middle">100%</Cap>
      <rect x={X(90)} y={64} width={X(100) - X(90)} height={112} rx={6} fill="rgba(95,227,255,0.07)" />
      <line x1={X(90)} x2={X(90)} y1={64} y2={176} stroke={CYAN} strokeWidth="1.2" filter="url(#ms-glow)" />
      <line x1={X(100)} x2={X(100)} y1={64} y2={176} stroke={HAIR} />
      {rows.map((r) => (
        <g key={r.key}>
          {r.icon}
          <Fig x={56} y={r.y + 1} size={16} fill={r.tone}>{r.v}</Fig>
          <Mono x={56} y={r.y + 14} size={8} fill={MUT}>{r.note}</Mono>
          <Hair x1={150} x2={404} y1={r.y + 0.5} y2={r.y + 0.5} />
          {[50, 60, 70, 80, 90, 100].map((t) => <Hair key={t} x1={X(t)} x2={X(t)} y1={r.y - 3} y2={r.y + 4} />)}
          <g transform={`translate(${X(r.p)} 0)`}>
            <line x1={0} x2={0} y1={r.y - 12} y2={r.y + 12} stroke={r.tone} strokeWidth="2" filter="url(#ms-glow)" />
            <circle cx={0} cy={r.y} r={3.5} fill={r.tone} filter="url(#ms-glow)" />
            <animateTransform attributeName="transform" type="translate" values={`150 0;${X(r.p)} 0;${X(r.p)} 0`} keyTimes="0;0.3;1" dur="7s" repeatCount="indefinite" calcMode="spline" keySplines="0.2 0.7 0.2 1;0 0 1 1" />
          </g>
        </g>
      ))}
      <Hair x1={24} x2={416} y1={182.5} y2={182.5} />
      <Disc x={34} y={204} r={9} src={SOL} />
      <Txt x={50} y={207.5} size={9.5}>Below 90%, no swap: that share is paid in SOL, and the receipt says so</Txt>
    </Svg>
  );
}

/* Encrypted keys: ciphertext at rest, the key exists in memory only while a cycle runs. */
function Keys() {
  const cipher = ['9f3a c41e 7b02 e6d1 08af', '52c7 1d9b a4f0 3e68 b1c5', 'e07d 6a21 f98c 40b3 7d2e', '3b8f d5a6 19c0 e274 6f91'];
  return (
    <Svg label="The dev wallet key is encrypted at rest and decrypted in memory while a cycle runs">
      <Pane x={24} y={34} w={160} h={140} lit="left" />
      <Cap x={37} y={53}>At rest</Cap>
      <Lock x={168} y={49} />
      {cipher.map((c, k) => <Mono key={c} x={37} y={78 + k * 16} size={9} fill={MUT}>{c}</Mono>)}
      <Hair x1={25} x2={183} y1={146.5} y2={146.5} />
      <Cap x={37} y={163} fill={CYAN}>AES-256-GCM</Cap>

      <Cap x={220} y={96} anchor="middle">Decrypt</Cap>
      <line x1={184} x2={256} y1={106} y2={106} stroke={HAIR} />
      <g opacity="0"><Channel d="M 184 106 H 256" w={5} dur={1.1} />{blink(0.3, 0.8)}</g>

      <g opacity="0">
        <rect x={262} y={40} width={148} height={128} rx={12} fill={BLUE} opacity="0.3" filter="url(#ms-blur)" />
        {blink(0.32, 0.8)}
      </g>
      <Pane x={256} y={34} w={160} h={140} />
      <Cap x={269} y={53}>In memory, at run time</Cap>
      <g opacity="0"><Mono x={269} y={104} size={12}>4s8K…pQ2v</Mono><Cap x={269} y={163} fill={CYAN}>Cycle running</Cap>{blink(0.34, 0.8)}</g>
      <g>
        <Mono x={269} y={104} size={12} fill={DIM}>not loaded</Mono>
        <Cap x={269} y={163}>Idle</Cap>
        <animate attributeName="opacity" values="1;1;0;0;1;1" keyTimes="0;0.32;0.35;0.8;0.83;1" dur="8s" repeatCount="indefinite" />
      </g>
      <Hair x1={257} x2={415} y1={146.5} y2={146.5} />
      <Cap x={24} y={202}>The key never sits in clear</Cap>
      <Cap x={416} y={202} anchor="end">Use a dedicated wallet</Cap>
    </Svg>
  );
}

/* Dividend yield: thirty days of fees, annualized against market cap. */
function Yield() {
  const pts = [[24, 190], [63, 184], [102, 186], [141, 172], [180, 176], [219, 160], [258, 163], [297, 148], [336, 140], [375, 132], [416, 124]];
  const d = pts.map(([x, y], i) => `${i ? 'L' : 'M'} ${x} ${y}`).join(' ');
  return (
    <Svg label="The dividend yield of a coin: thirty days of fees, annualized against market cap">
      <Cap x={24} y={34}>Dividend yield</Cap>
      <Fig x={24} y={78} size={42} fill="url(#ms-bar)">12.4%</Fig>
      <Cap x={24} y={98}>30 days of fees, annualized vs market cap</Cap>
      <Pane x={300} y={24} w={116} h={34} r={17} />
      <Coin x={318} y={41} r={9} />
      <Mono x={333} y={44.5} size={9}>$GLOW 12.4%</Mono>
      <Cap x={416} y={74} anchor="end">On the coin&apos;s page</Cap>
      {[130, 160, 190].map((y) => <Hair key={y} x1={24} x2={416} y1={y + 0.5} y2={y + 0.5} dash="2 4" />)}
      <path d={`${d} L 416 206 L 24 206 Z`} fill="url(#ms-fall)" />
      <path d={d} fill="none" stroke="url(#ms-beam)" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" filter="url(#ms-glow)" pathLength="100" strokeDasharray="100" strokeDashoffset="0">
        <animate attributeName="stroke-dashoffset" values="100;0;0" keyTimes="0;0.45;1" dur="7s" repeatCount="indefinite" />
      </path>
      <circle cx={416} cy={124} r={3.5} fill="#FFFFFF" filter="url(#ms-glow)">
        <animate attributeName="r" values="3;5;3" dur="1.6s" repeatCount="indefinite" />
      </circle>
      <Hair x1={24} x2={416} y1={206.5} y2={206.5} />
    </Svg>
  );
}

/* Receipts and statements: the slip of a cycle, and the three places it leads. */
function Receipts() {
  const out = [['Every cycle', 'a public receipt', 'every tx on Solscan', 52], ['Every holder', 'a statement page', 'at /wallet', 114], ['Every coin', 'a public page', 'routing, cycles, yield', 176]];
  return (
    <Svg label="Every cycle leaves a receipt, every holder a statement, every coin a public page">
      <Pane x={24} y={20} w={236} h={192} lit="left" />
      <Cap x={38} y={38}>{`${BRAND} · receipt`}</Cap>
      <Cap x={246} y={38} anchor="end" fill={INK}>No. 000129</Cap>
      <Coin x={48} y={62} r={12} />
      <Cap x={67} y={58}>Holders of</Cap>
      <Txt x={67} y={72} size={12}>$GLOW</Txt>
      <Hair x1={36} x2={248} y1={88.5} y2={88.5} dash="3 3" />
      {[['Fees collected', '4.80 SOL', 104], ['Holders’ share', '2.40 SOL', 120], ['Swapped on Jupiter', 'SPYx', 136]].map(([l, v, y]) => (
        <g key={l}>
          <Txt x={38} y={y} size={9} fill={MUT}>{l}</Txt>
          <Mono x={246} y={y} anchor="end" size={9}>{v}</Mono>
        </g>
      ))}
      <Hair x1={36} x2={248} y1={146.5} y2={146.5} />
      <Cap x={38} y={164}>Received · 412 wallets</Cap>
      <Disc x={47} y={183} r={9} src={xs('SPY')} />
      <Fig x={246} y={189} anchor="end" size={20} fill={CYAN}>0.74 SPYx</Fig>
      <Mono x={38} y={205} size={7.5} fill={MUT}>solscan.io/tx/5Kq9…xR2v</Mono>
      <Mono x={246} y={205} anchor="end" size={8} fill={CYAN}>↗</Mono>

      {out.map(([cap, a, b, y], k) => (
        <g key={cap}>
          <Channel d={`M 260 116 C 274 116, 272 ${y}, 286 ${y}`} w={3} dur={2 + k * 0.3} begin={k * 0.5} />
          <Mono x={292} y={y - 9} size={8} fill={CYAN}>{`0${k + 1}`}</Mono>
          <Cap x={308} y={y - 9}>{cap}</Cap>
          <Txt x={292} y={y + 5} size={10}>{a}</Txt>
          <Mono x={292} y={y + 18} size={7.5} fill={MUT}>{b}</Mono>
        </g>
      ))}
    </Svg>
  );
}

const SCENES = { vault: Vault, inkind: InKind, payout: Payout, loyalty: Loyalty, treasury: Treasury, burn: Burn, yield: Yield, bell: Bell, hours: Hours, anytoken: AnyToken, convert: Convert, reel: Reel, vote: VoteScene, guard: Guard, keys: Keys, receipts: Receipts };
export const SCENE_KINDS = Object.keys(SCENES);

/** The scene alone, filling its parent at 440:230. The parent is the frame. */
export default function ModeScene({ kind, className = '' }) {
  const S = SCENES[kind];
  if (!S) return null;
  return (
    <div className={`mode-stage aspect-[440/230] w-full ${className}`}>
      <S />
    </div>
  );
}
