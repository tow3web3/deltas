// One drawn scene per routing option, for the stage of the Modes section. Pure
// SVG + SMIL, no JavaScript timers. Every scene shares one language: hairline
// boxes, mono captions, figures in the display face, green for money moving,
// real logos on discs. What matters in a scene is always on screen; the motion
// only adds to it. ViewBox is 440 x 230.
import { getStock } from '../lib/stocks';

const D = 'var(--font-display), var(--font-sans), system-ui, sans-serif';
const F = 'var(--font-sans), system-ui, sans-serif';
const M = 'var(--font-mono), ui-monospace, monospace';
const GREEN = '#2FA8FF', MINT = '#4DB8FF', INK = '#F4F5F4', MUT = '#8A9099', LINE = '#2A2E33', FAINT = '#17191C', PAPER = '#101112', SLAB = '#15171A', RED = '#FF5C33', GOLD = '#F6C343', GREY = '#4A5058';

const TOKENS = { PONS: '/logos/tokens/PONS.png', NASDUCK: '/logos/tokens/NASDUCK.png' };
const PLATFORM = (p) => `/logos/platforms/${p}.svg`;
const logoOf = (t) => (t === 'ETH' ? '/eth.svg' : TOKENS[t] || getStock(t)?.logo);

function Svg({ label, children }) {
  return (
    <svg viewBox="0 0 440 230" className="h-full w-full" role="img" aria-label={label}>
      <defs><clipPath id="ms-round" clipPathUnits="objectBoundingBox"><circle cx="0.5" cy="0.5" r="0.5" /></clipPath></defs>
      {children}
    </svg>
  );
}

/** A logo on a disc. Stocks and ETH sit on white with a margin, a coin or a platform fills its disc. */
function Disc({ x = 0, y = 0, r = 10, t, href, ring = LINE, opacity, children }) {
  const full = Boolean(href) || Boolean(TOKENS[t]);
  const pad = full ? 0 : r * 0.2;
  return (
    <g transform={`translate(${x} ${y})`} opacity={opacity}>
      <circle r={r} fill={full ? PAPER : '#FFFFFF'} />
      <image href={href || logoOf(t)} x={-r + pad} y={-r + pad} width={2 * (r - pad)} height={2 * (r - pad)} clipPath="url(#ms-round)" preserveAspectRatio="xMidYMid slice" />
      <circle r={r} fill="none" stroke={ring} strokeWidth="1" />
      {children}
    </g>
  );
}
/** The Telegram mark: the plane on its blue disc. */
function Telegram({ x, y, r = 8 }) {
  const s = (r * 1.25) / 24;
  return (
    <g transform={`translate(${x} ${y})`}>
      <circle r={r} fill="#26A5E4" />
      <path transform={`translate(${-r * 0.7} ${-r * 0.62}) scale(${s})`} fill="#FFFFFF" d="M21.9 4.6 18.6 20c-.2 1-.9 1.3-1.8.8l-4.9-3.6-2.4 2.3c-.3.3-.5.5-1 .5l.4-5 9.2-8.3c.4-.4-.1-.6-.6-.2L6.1 13.7 1.3 12.2c-1-.3-1-1 .2-1.5L20.6 3.1c.9-.3 1.6.2 1.3 1.5z" />
    </g>
  );
}

const Cap = ({ x, y, children, anchor = 'start', fill = MUT, size = 8 }) => (
  <text x={x} y={y} textAnchor={anchor} fill={fill} fontSize={size} fontWeight="500" fontFamily={M} letterSpacing="1" style={{ textTransform: 'uppercase' }}>{children}</text>
);
const Mono = ({ x, y, children, anchor = 'start', fill = INK, size = 9 }) => (
  <text x={x} y={y} textAnchor={anchor} fill={fill} fontSize={size} fontFamily={M}>{children}</text>
);
const Txt = ({ x, y, children, anchor = 'start', fill = INK, size = 10, weight = 500 }) => (
  <text x={x} y={y} textAnchor={anchor} fill={fill} fontSize={size} fontWeight={weight} fontFamily={F}>{children}</text>
);
const Fig = ({ x, y, children, anchor = 'start', fill = INK, size = 16, weight = 500 }) => (
  <text x={x} y={y} textAnchor={anchor} fill={fill} fontSize={size} fontWeight={weight} fontFamily={D} letterSpacing="-0.3" style={{ fontVariantNumeric: 'tabular-nums' }}>{children}</text>
);
const Box = ({ x, y, w, h, fill = PAPER, stroke = LINE, r = 5 }) => <rect x={x + 0.5} y={y + 0.5} width={w} height={h} rx={r} fill={fill} stroke={stroke} strokeWidth="1" />;
const Rule = ({ x1, x2, y1, y2, stroke = LINE, dash }) => <line x1={x1} x2={x2} y1={y1} y2={y2} stroke={stroke} strokeWidth="1" strokeDasharray={dash} />;

/** A route: a hairline with green dashes moving along it. */
function Flow({ d, dur = '1.6s', live = true, children }) {
  return (
    <g>
      <path d={d} fill="none" stroke={LINE} strokeWidth="1" />
      {live && (
        <path d={d} fill="none" stroke={GREEN} strokeWidth="1.5" strokeDasharray="2 8" strokeLinecap="round">
          <animate attributeName="stroke-dashoffset" from="0" to="-40" dur={dur} repeatCount="indefinite" />
          {children}
        </path>
      )}
    </g>
  );
}
/** Visible from `from` to `to` (fractions of the loop). */
const blink = (from, to, dur = '8s') => (
  <animate attributeName="opacity" values="0;0;1;1;0;0" keyTimes={`0;${from};${Math.min(from + 0.03, to)};${to};${Math.min(to + 0.03, 1)};1`} dur={dur} repeatCount="indefinite" />
);

/* Pay-through in kind: what the launchpad pays is what each holder receives. */
function InKind() {
  const rows = [['0x8a2f', 47, '+0.0142'], ['0x3d17', 115, '+0.0087'], ['0xc4a9', 183, '+0.0031']];
  return (
    <Svg label="NVDA fees are paid to holders as NVDA">
      <Box x={24} y={83} w={120} h={64} />
      <Cap x={36} y={101}>Launchpad pays</Cap>
      <Disc x={48} y={125} r={11} t="NVDA" />
      <Fig x={66} y={130} size={15}>NVDA</Fig>
      <Cap x={172} y={106} anchor="middle" fill={MINT}>No swap</Cap>
      <Flow d="M 144 115 H 200" />
      {rows.map(([addr, y, amt], k) => {
        const d = `M 200 115 C 240 115 240 ${y} 280 ${y}`;
        return (
          <g key={addr}>
            <Flow d={d} dur={`${1.6 + k * 0.2}s`} />
            <Box x={280} y={y - 19} w={136} h={38} />
            <Mono x={292} y={y + 3}>{addr}</Mono>
            <Fig x={382} y={y + 4} anchor="end" size={11} fill={MINT}>{amt}</Fig>
            <Disc x={398} y={y} r={9} t="NVDA" />
            <Disc r={7} t="NVDA" ring={GREEN} opacity="0">
              <animateMotion dur="5s" repeatCount="indefinite" path={`M 144 115 H 200 C 240 115 240 ${y} 280 ${y}`} keyPoints="0;0;1;1" keyTimes={`0;${0.08 + k * 0.1};${0.5 + k * 0.1};1`} calcMode="linear" />
              <animate attributeName="opacity" values="0;0;1;1;0;0" keyTimes={`0;${0.08 + k * 0.1};${0.12 + k * 0.1};${0.46 + k * 0.1};${0.5 + k * 0.1};1`} dur="5s" repeatCount="indefinite" />
            </Disc>
          </g>
        );
      })}
      <Cap x={24} y={170}>NVDA in, NVDA out</Cap>
      <Cap x={24} y={183}>pro rata, every cycle</Cap>
    </Svg>
  );
}

/* Payout ratio: the split between holders and the creator. */
function Payout() {
  const W = 392;
  const sets = [['100%', '0%', 1, 0, 0.3], ['80%', '20%', 0.8, 0.33, 0.63], ['70%', '30%', 0.7, 0.66, 0.97]];
  return (
    <Svg label="The split between holders and your payout address">
      <Cap x={24} y={40} fill={MINT}>Holders</Cap>
      <Cap x={416} y={40} anchor="end">Your payout address</Cap>
      {sets.map(([h, y, , a, b]) => (
        <g key={h} opacity="0">
          <Fig x={24} y={92} size={48}>{h}</Fig>
          <Fig x={416} y={92} size={48} anchor="end" fill={MUT}>{y}</Fig>
          {blink(a, b, '9s')}
        </g>
      ))}
      <rect x="24" y="112" width={W} height="12" rx="2" fill={FAINT} stroke={LINE} />
      <rect x="24" y="112" height="12" rx="2" fill={GREEN}>
        <animate attributeName="width" values={`${W};${W};${W * 0.8};${W * 0.8};${W * 0.7};${W * 0.7};${W}`} keyTimes="0;0.3;0.34;0.63;0.67;0.97;1" dur="9s" repeatCount="indefinite" />
      </rect>
      {Array.from({ length: 11 }, (_, k) => <Rule key={k} x1={24 + k * 39.2} x2={24 + k * 39.2} y1={130} y2={k % 5 === 0 ? 138 : 134} />)}
      {sets.map(([h, , , a, b], k) => (
        <g key={h}>
          <Box x={24 + k * 136} y={160} w={120} h={32} />
          <g opacity="0"><Box x={24 + k * 136} y={160} w={120} h={32} fill="rgba(47, 168, 255,0.08)" stroke={GREEN} />{blink(a, b, '9s')}</g>
          <Mono x={84 + k * 136} y={180} anchor="middle" size={10}>{['100 / 0', '80 / 20', '70 / 30'][k]}</Mono>
        </g>
      ))}
      <Cap x={24} y={212}>Your call, sent each cycle</Cap>
    </Svg>
  );
}

/* Pages: a share fills a public vault until the owner of the page claims it. */
function Vault() {
  const others = ['github', 'x', 'instagram', 'tiktok', 'twitch', 'facebook', 'domain'];
  return (
    <Svg label="A share of fees fills the vault of a page until its owner claims">
      <Disc x={36} y={38} r={10} href={PLATFORM('youtube')} />
      <Mono x={54} y={41.5} size={10}>youtube.com/@yourchannel</Mono>
      {others.map((p, k) => <Disc key={p} x={408 - k * 19} y={38} r={7} href={PLATFORM(p)} />)}
      <Rule x1={24} x2={416} y1={60.5} y2={60.5} />

      <Box x={24} y={84} w={100} h={72} />
      <Cap x={36} y={102}>Share of fees</Cap>
      <Disc x={46} y={130} r={11} t="PONS" />
      <Fig x={64} y={134} size={13}>PONS</Fig>
      <Flow d="M 124 120 H 168" />

      <Box x={168} y={74} w={140} h={92} stroke="#1A3F73" />
      <Cap x={180} y={92} fill={MINT}>Page vault, public</Cap>
      {[['0.012 ETH', 0, 0.2], ['0.031 ETH', 0.22, 0.42], ['0.058 ETH', 0.44, 0.68], ['0.000 ETH', 0.74, 0.98]].map(([v, a, b], k) => (
        <g key={v} opacity="0"><Fig x={180} y={128} size={22} fill={k === 3 ? MUT : INK}>{v}</Fig>{blink(a, b)}</g>
      ))}
      <rect x="180" y="144" width="116" height="4" rx="1" fill={FAINT} />
      <rect x="180" y="144" height="4" rx="1" fill={GREEN}>
        <animate attributeName="width" values="24;24;62;62;116;116;0;0" keyTimes="0;0.2;0.22;0.42;0.44;0.7;0.74;1" dur="8s" repeatCount="indefinite" />
      </rect>

      <Rule x1={308} x2={344} y1={120.5} y2={120.5} />
      <path d="M 308 120.5 H 344" fill="none" stroke={GREEN} strokeWidth="1.5" strokeDasharray="2 8" strokeLinecap="round" opacity="0">
        <animate attributeName="stroke-dashoffset" from="0" to="-40" dur="1.2s" repeatCount="indefinite" />
        {blink(0.66, 0.98)}
      </path>
      <Box x={344} y={84} w={72} h={72} />
      <Cap x={354} y={102}>Owner</Cap>
      <Mono x={354} y={126}>0x8a2f</Mono>
      <g opacity="0"><Cap x={354} y={143} fill={MINT}>Claimed</Cap>{blink(0.72, 0.98)}</g>

      <Cap x={24} y={200}>1 Paste a link</Cap>
      <Cap x={168} y={200}>2 Vault fills</Cap>
      <Cap x={416} y={200} anchor="end">3 Owner claims</Cap>
    </Svg>
  );
}

/* Record date and loyalty: hold time raises the weight, selling resets it. */
function Loyalty() {
  const rows = [['0x8a2f', 44, 0.72], ['0x3d17', 94, 0.86], ['0xc4a9', 144, null]];
  return (
    <Svg label="Holding time raises the dividend weight from 1x to 2x over 30 days">
      <Rule x1={130.5} x2={130.5} y1={26} y2={182} dash="2 4" />
      {rows.map(([addr, y, full]) => (
        <g key={addr}>
          <Mono x={24} y={y + 3}>{addr}</Mono>
          <rect x="90" y={y - 4} width="250" height="8" rx="2" fill={FAINT} stroke={LINE} />
          {full ? (
            <>
              <rect x="90" y={y - 4} height="8" rx="2" fill={GREEN}><animate attributeName="width" values="0;250;250" keyTimes={`0;${full};1`} dur="8s" repeatCount="indefinite" /></rect>
              <g opacity="0"><Fig x={416} y={y + 5} anchor="end" fill={MUT}>1.0x</Fig>{blink(0, full * 0.4)}</g>
              <g opacity="0"><Fig x={416} y={y + 5} anchor="end">1.5x</Fig>{blink(full * 0.4 + 0.03, full - 0.03)}</g>
              <g opacity="0"><Fig x={416} y={y + 5} anchor="end" fill={MINT}>2.0x</Fig>{blink(full, 1)}</g>
            </>
          ) : (
            <>
              <rect x="90" y={y - 4} height="8" rx="2" fill={RED}><animate attributeName="width" values="0;110;110;0;0;60" keyTimes="0;0.4;0.5;0.52;0.6;1" dur="8s" repeatCount="indefinite" /></rect>
              <g opacity="0"><Fig x={416} y={y + 5} anchor="end" fill={MUT}>1.0x</Fig>{blink(0, 0.46)}</g>
              <g opacity="0"><Cap x={416} y={y + 3} anchor="end" fill={RED}>Sold, reset</Cap>{blink(0.5, 0.72)}</g>
              <g opacity="0"><Fig x={416} y={y + 5} anchor="end" fill={MUT}>1.0x</Fig>{blink(0.76, 1)}</g>
            </>
          )}
        </g>
      ))}
      <Rule x1={90} x2={340} y1={182.5} y2={182.5} />
      {[90, 130, 340].map((x) => <Rule key={x} x1={x + 0.5} x2={x + 0.5} y1={182} y2={188} />)}
      <Cap x={90} y={202}>Day 0</Cap>
      <Cap x={134} y={202}>Minimum hold</Cap>
      <Cap x={340} y={202} anchor="end">Day 30</Cap>
      <Cap x={416} y={202} anchor="end" fill={MINT}>Weight</Cap>
    </Svg>
  );
}

/* Retained earnings: a stock treasury with a published balance sheet. */
function Treasury() {
  const rows = [['NVDA', 76, 80, '$1,204'], ['SPY', 112, 60, '$902'], ['GLD', 148, 36, '$546']];
  return (
    <Svg label="A stock treasury with its balance sheet and book value per token">
      <Cap x={24} y={40}>Book value per token</Cap>
      {[['$0.0012', 0, 0.3], ['$0.0027', 0.33, 0.63], ['$0.0041', 0.66, 0.97]].map(([v, a, b]) => (
        <g key={v} opacity="0"><Fig x={24} y={80} size={32}>{v}</Fig>{blink(a, b)}</g>
      ))}
      <Cap x={24} y={118}>Market cap backed</Cap>
      <rect x="24" y="128" width="150" height="5" rx="1" fill={FAINT} stroke={LINE} />
      <rect x="24" y="128" height="5" rx="1" fill={GREEN}><animate attributeName="width" values="14;14;30;30;46;46;14" keyTimes="0;0.3;0.34;0.63;0.67;0.97;1" dur="8s" repeatCount="indefinite" /></rect>
      <Cap x={24} y={192}>Held by a wallet</Cap>
      <Cap x={24} y={205}>you control</Cap>

      <Box x={206} y={24} w={210} h={182} />
      <Cap x={218} y={43}>Balance sheet</Cap>
      <Cap x={404} y={43} anchor="end" fill={MINT}>Public</Cap>
      <Rule x1={206} x2={416} y1={54.5} y2={54.5} />
      {rows.map(([t, y, w, v], k) => (
        <g key={t}>
          <Disc x={230} y={y} r={10} t={t} />
          <Fig x={248} y={y + 4} size={12}>{t}</Fig>
          <rect x="286" y={y - 2} width="80" height="4" rx="1" fill={FAINT} />
          <rect x="286" y={y - 2} height="4" rx="1" fill={k === 0 ? GREEN : GREY}><animate attributeName="width" values={`${w * 0.3};${w * 0.3};${w * 0.65};${w * 0.65};${w};${w};${w * 0.3}`} keyTimes="0;0.3;0.34;0.63;0.67;0.97;1" dur="8s" repeatCount="indefinite" /></rect>
          <Fig x={404} y={y + 4} size={11} anchor="end">{v}</Fig>
          <Rule x1={206} x2={416} y1={y + 18.5} y2={y + 18.5} />
        </g>
      ))}
      <Cap x={218} y={190}>Total</Cap>
      <Fig x={404} y={192} size={14} anchor="end" fill={MINT}>$2,652</Fig>
    </Svg>
  );
}

/* Buyback and burn: a share buys the coin and sends it to the burn address. */
function Burn() {
  return (
    <Svg label="A share buys the coin and burns it, supply shrinks each cycle">
      <Box x={24} y={28} w={116} h={54} />
      <Cap x={36} y={46}>Buyback</Cap>
      <Disc x={45} y={64} r={8} t="ETH" />
      <Mono x={59} y={67} size={8.5} fill={MUT}>share of fees</Mono>
      <Flow d="M 140 55 H 300" />
      {[0, 1, 2].map((k) => (
        <Disc key={k} r={9} t="PONS" opacity="0">
          <animateMotion dur="6s" repeatCount="indefinite" path="M 146 55 H 296" keyPoints="0;0;1;1" keyTimes={`0;${0.05 + k * 0.28};${0.3 + k * 0.28};1`} calcMode="linear" />
          <animate attributeName="opacity" values="0;0;1;1;0;0" keyTimes={`0;${0.05 + k * 0.28};${0.09 + k * 0.28};${0.26 + k * 0.28};${0.3 + k * 0.28};1`} dur="6s" repeatCount="indefinite" />
        </Disc>
      ))}
      <Box x={300} y={28} w={116} h={54} />
      <Cap x={312} y={46} fill={GOLD}>Burned</Cap>
      <Mono x={312} y={67}>0x0000…dEaD</Mono>

      <Cap x={24} y={122}>Circulating supply</Cap>
      <Disc x={34} y={148} r={10} t="PONS" />
      {[['1,000,000,000', 0, 0.3], ['994,120,000', 0.33, 0.63], ['988,310,000', 0.66, 0.97]].map(([v, a, b]) => (
        <g key={v} opacity="0"><Fig x={52} y={157} size={26}>{v}</Fig>{blink(a, b, '6s')}</g>
      ))}
      <rect x="24" y="176" width="392" height="8" rx="2" fill={FAINT} stroke={LINE} />
      <rect x="24" y="176" height="8" rx="2" fill={INK}>
        <animate attributeName="width" values="392;392;370;370;348;348;392" keyTimes="0;0.3;0.34;0.63;0.67;0.97;1" dur="6s" repeatCount="indefinite" />
      </rect>
      <Cap x={24} y={204}>Shrinks every cycle</Cap>
      <Cap x={416} y={204} anchor="end">Alongside the dividend</Cap>
    </Svg>
  );
}

/* Dividend yield: thirty days of fees, annualized against market cap. */
function Yield() {
  const pts = [[24, 190], [63, 184], [102, 186], [141, 172], [180, 176], [219, 160], [258, 163], [297, 148], [336, 140], [375, 132], [416, 124]];
  const d = pts.map(([x, y], i) => `${i ? 'L' : 'M'} ${x} ${y}`).join(' ');
  return (
    <Svg label="The dividend yield of a coin over thirty days">
      <Cap x={24} y={40}>Dividend yield</Cap>
      <Fig x={24} y={86} size={42}>12.4%</Fig>
      <Cap x={24} y={104}>30 days of fees, annualized vs market cap</Cap>
      <Box x={300} y={28} w={116} h={30} />
      <Disc x={316} y={43.5} r={8} t="PONS" />
      <Mono x={330} y={46.5} size={9}>12.4% yield</Mono>
      <Cap x={416} y={72} anchor="end">Badge to embed</Cap>
      {[130, 160, 190].map((y) => <Rule key={y} x1={24} x2={416} y1={y + 0.5} y2={y + 0.5} dash="2 4" />)}
      <path d={`${d} L 416 206 L 24 206 Z`} fill={GREEN} fillOpacity="0.1" />
      <path d={d} fill="none" stroke={LINE} strokeWidth="1" />
      <path d={d} fill="none" stroke={GREEN} strokeWidth="1.75" strokeLinejoin="round" strokeLinecap="round" pathLength="100" strokeDasharray="100" strokeDashoffset="0">
        <animate attributeName="stroke-dashoffset" values="100;0;0" keyTimes="0;0.45;1" dur="7s" repeatCount="indefinite" />
      </path>
      <circle cx="416" cy="124" r="3" fill={GREEN} />
      <Rule x1={24} x2={416} y1={206.5} y2={206.5} />
    </Svg>
  );
}

/* Closing bell: one payout a day at 4:00 pm New York time, weekdays only. */
function Bell() {
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  return (
    <Svg label="One dividend a day at 4 pm New York time, on weekdays">
      <Fig x={24} y={58} size={32}>4:00 pm</Fig>
      <Cap x={24} y={77}>New York time, weekdays only</Cap>
      <Cap x={416} y={77} anchor="end" fill={MINT}>A dividend calendar</Cap>
      <Box x={24} y={94} w={392} h={112} />
      {days.map((d, k) => {
        const x = 24 + k * 56;
        const open = k < 5;
        return (
          <g key={d}>
            {!open && <rect x={x + 1} y="95" width={k === 6 ? 55 : 56} height="111" fill={FAINT} />}
            {k > 0 && <Rule x1={x + 0.5} x2={x + 0.5} y1={94} y2={206} />}
            <Cap x={x + 28} y={112} anchor="middle" fill={open ? INK : MUT}>{d}</Cap>
            {open ? (
              <Disc x={x + 28} y={168} r={11} t="SPY" ring={GREEN} opacity="0">
                <animate attributeName="opacity" values="0;0;1;1;0" keyTimes={`0;${0.06 + k * 0.14};${0.1 + k * 0.14};0.96;1`} dur="8s" repeatCount="indefinite" />
                <animateTransform attributeName="transform" type="translate" values={`${x + 28} 136;${x + 28} 136;${x + 28} 168;${x + 28} 168`} keyTimes={`0;${0.06 + k * 0.14};${0.14 + k * 0.14};1`} dur="8s" repeatCount="indefinite" />
              </Disc>
            ) : <Cap x={x + 28} y={171} anchor="middle">Closed</Cap>}
          </g>
        );
      })}
      <Rule x1={24} x2={304} y1={168.5} y2={168.5} stroke={GREEN} dash="2 5" />
      <Mono x={30} y={196} size={8} fill={MINT}>16:00 ET</Mono>
    </Svg>
  );
}

/* Market hours only: cycles outside the session are skipped. */
function Hours() {
  const X = (h) => 24 + (h / 24) * 392;
  const open = (h) => h >= 9.5 && h < 16;
  return (
    <Svg label="Cycles run during market hours and are skipped when Wall Street is closed">
      <Cap x={24} y={40}>Every 1 to 60 minutes</Cap>
      <Cap x={416} y={40} anchor="end">Skipped when Wall Street is closed</Cap>
      <rect x={X(9.5)} y="76" width={X(16) - X(9.5)} height="76" rx="3" fill="rgba(47, 168, 255,0.07)" stroke="#1A3F73" />
      <Cap x={(X(9.5) + X(16)) / 2} y={68} anchor="middle" fill={MINT}>Market open</Cap>
      {Array.from({ length: 48 }, (_, k) => {
        const h = k / 2 + 0.25;
        const on = open(h);
        return <line key={k} x1={X(h)} x2={X(h)} y1={on ? 94 : 107} y2={on ? 134 : 121} stroke={on ? GREEN : GREY} strokeWidth={on ? 1.5 : 1} />;
      })}
      <line x1="0" x2="0" y1="72" y2="156" stroke={INK} strokeWidth="1">
        <animateTransform attributeName="transform" type="translate" from="24 0" to="416 0" dur="9s" repeatCount="indefinite" />
      </line>
      <Rule x1={24} x2={416} y1={162.5} y2={162.5} />
      {[0, 9.5, 16, 24].map((h) => <Rule key={h} x1={X(h)} x2={X(h)} y1={162} y2={168} />)}
      <Mono x={24} y={181} size={8} fill={MUT}>00:00</Mono>
      <Mono x={X(9.5)} y={181} size={8} anchor="middle">09:30</Mono>
      <Mono x={X(16)} y={181} size={8} anchor="middle">16:00</Mono>
      <Mono x={416} y={181} size={8} anchor="end" fill={MUT}>24:00</Mono>
      <Cap x={(24 + X(9.5)) / 2} y={206} anchor="middle">Skipped</Cap>
      <Cap x={(X(9.5) + X(16)) / 2} y={206} anchor="middle" fill={MINT}>Paid</Cap>
      <Cap x={(X(16) + 416) / 2} y={206} anchor="middle">Skipped</Cap>
    </Svg>
  );
}

/* Any token, by address: paste a contract, holders of the coin are paid in it. */
function AnyToken() {
  return (
    <Svg label="Holders of PONS are paid in NASDUCK, set by pasting its address">
      <Box x={24} y={24} w={392} h={46} />
      <Cap x={36} y={41}>Reward token address</Cap>
      <Mono x={36} y={59} size={11}>0x8a2f9c41d07be3a5…e7b0</Mono>
      <rect x="36" y="47" height="16" fill={PAPER}>
        <animate attributeName="x" values="36;36;204;204" keyTimes="0;0.05;0.4;1" dur="7s" repeatCount="indefinite" />
        <animate attributeName="width" values="178;178;0;0" keyTimes="0;0.05;0.4;1" dur="7s" repeatCount="indefinite" />
      </rect>
      <rect y="48" width="1.5" height="14" fill={GREEN}>
        <animate attributeName="x" values="36;36;204;204" keyTimes="0;0.05;0.4;1" dur="7s" repeatCount="indefinite" />
        <animate attributeName="opacity" values="1;0;1" dur="0.9s" repeatCount="indefinite" />
      </rect>

      <Rule x1={220.5} x2={220.5} y1={70} y2={88} />
      <Box x={24} y={88} w={392} h={46} />
      <Disc x={50} y={111} r={13} t="NASDUCK" />
      <Fig x={72} y={109} size={14}>NASDUCK</Fig>
      <Mono x={72} y={123} size={8.5} fill={MUT}>route V3 0.3%, swapped every cycle</Mono>
      <Cap x={404} y={114} anchor="end" fill={MINT}>Route found</Cap>

      <Flow d="M 220.5 134 V 160" />
      <Box x={24} y={160} w={392} h={46} />
      <Disc x={48} y={183} r={11} t="PONS" />
      <Fig x={68} y={181} size={13}>PONS holders</Fig>
      <Mono x={68} y={195} size={8.5} fill={MUT}>paid in NASDUCK</Mono>
      {[0, 1, 2].map((k) => (
        <Disc key={k} x={398 - k * 14} y={183} r={9} t="NASDUCK" ring={PAPER} opacity="0.35">
          <animate attributeName="opacity" values="0.35;0.35;1;1;0.35" keyTimes={`0;${0.5 + k * 0.1};${0.54 + k * 0.1};0.96;1`} dur="7s" repeatCount="indefinite" />
        </Disc>
      ))}
    </Svg>
  );
}

/* Convert mode: whatever comes in is converted to one reward. */
function Convert() {
  const inputs = [['NVDA', 46], ['GLD', 115], ['ETH', 184]];
  return (
    <Svg label="Mixed fees are converted into one stock before payout">
      <Cap x={24} y={24}>Whatever comes in</Cap>
      <Cap x={416} y={24} anchor="end">Any of the 195, or ETH</Cap>
      {inputs.map(([t, y], k) => {
        const d = `M 64 ${y} C 140 ${y} 130 115 190 115`;
        return (
          <g key={t}>
            <Flow d={d} dur={`${1.6 + k * 0.2}s`} />
            <Disc x={48} y={y} r={14} t={t} />
            <Mono x={48} y={y + 28} anchor="middle" size={8} fill={MUT}>{t}</Mono>
            <Disc r={7} t={t} opacity="0">
              <animateMotion dur="6s" repeatCount="indefinite" path={d} keyPoints="0;0;1;1" keyTimes={`0;${0.05 + k * 0.1};${0.4 + k * 0.1};1`} calcMode="linear" />
              <animate attributeName="opacity" values="0;0;1;1;0;0" keyTimes={`0;${0.05 + k * 0.1};${0.09 + k * 0.1};${0.36 + k * 0.1};${0.4 + k * 0.1};1`} dur="6s" repeatCount="indefinite" />
            </Disc>
          </g>
        );
      })}
      <Box x={190} y={97} w={68} h={36} stroke="#1A3F73" />
      <Cap x={224} y={118} anchor="middle" fill={MINT}>Convert</Cap>
      <Flow d="M 258 115 H 344" dur="1.2s" />
      <Disc r={7} t="SPY" opacity="0">
        <animateMotion dur="6s" repeatCount="indefinite" path="M 262 115 H 340" keyPoints="0;0;1;1" keyTimes="0;0.62;0.86;1" calcMode="linear" />
        <animate attributeName="opacity" values="0;0;1;1;0;0" keyTimes="0;0.62;0.66;0.82;0.86;1" dur="6s" repeatCount="indefinite" />
      </Disc>
      <Disc x={372} y={115} r={24} t="SPY" ring={GREEN} />
      <Fig x={372} y={162} anchor="middle" size={14}>SPY</Fig>
      <Cap x={372} y={178} anchor="middle">One stock out</Cap>
    </Svg>
  );
}

/* Roulette, Top Gainer, Portfolio: three ways to pick the stock for ETH fees. */
function Reel() {
  const list = ['AMD', 'META', 'GME', 'AAPL', 'COIN', 'GLD', 'TSLA', 'SPY', 'MSFT', 'PLTR', 'NVDA', 'AMZN', 'GOOGL', 'QQQ', 'MU', 'RDDT'];
  const col = (k) => 24 + k * (392 / 3);
  return (
    <Svg label="A random stock, the top gainer of the day, or a rotating basket">
      <defs><clipPath id="ms-reel"><rect x="24" y="24" width="392" height="72" rx="5" /></clipPath></defs>
      <Box x={24} y={24} w={392} h={72} />
      <g clipPath="url(#ms-reel)">
        <g>
          {list.map((t, k) => <Disc key={t} x={220 + (k - 10) * 58} y={60} r={18} t={t} />)}
          <animateTransform attributeName="transform" type="translate" values="320 0;320 0;0 0;0 0" keyTimes="0;0.06;0.6;1" dur="7s" repeatCount="indefinite" calcMode="spline" keySplines="0 0 1 1;0.2 0.7 0.2 1;0 0 1 1" />
        </g>
      </g>
      <rect x="192.5" y="30.5" width="56" height="60" rx="5" fill="none" stroke={GREEN} />
      <Cap x={416} y={110} anchor="end" fill={MINT}>This cycle</Cap>

      {[1, 2].map((k) => <Rule key={k} x1={col(k) - 8} x2={col(k) - 8} y1={122} y2={206} />)}
      <Cap x={col(0)} y={132}>Roulette</Cap>
      {['AAPL', 'COIN', 'GME'].map((t, k) => <Disc key={t} x={col(0) + 10 + k * 24} y={162} r={10} t={t} ring={k === 1 ? GREEN : LINE} />)}
      <Mono x={col(0)} y={198} size={8} fill={MUT}>a random liquid stock</Mono>

      <Cap x={col(1)} y={132}>Top gainer</Cap>
      <Disc x={col(1) + 10} y={162} r={10} t="NVDA" />
      <Fig x={col(1) + 28} y={167} size={14} fill={MINT}>+3.4%</Fig>
      <Mono x={col(1)} y={198} size={8} fill={MUT}>best stock of the day</Mono>

      <Cap x={col(2)} y={132}>Portfolio</Cap>
      {['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'META', 'NVDA', 'TSLA'].map((t, k) => <Disc key={t} x={col(2) + 10 + k * 15} y={162} r={10} t={t} ring={PAPER} />)}
      <Mono x={col(2)} y={198} size={8} fill={MUT}>a rotating basket</Mono>
    </Svg>
  );
}

/* Community vote: holders pick the next dividend. */
function VoteScene() {
  const rows = [['NVDA', 70, 0.52, '52%'], ['GLD', 110, 0.31, '31%'], ['SPY', 150, 0.17, '17%']];
  return (
    <Svg label="Holders vote on the next dividend, weighted by balance and loyalty">
      <Cap x={24} y={38}>Next dividend</Cap>
      <Cap x={416} y={38} anchor="end">Gasless, one signature</Cap>
      {rows.map(([t, y, p, label], k) => (
        <g key={t}>
          <Disc x={36} y={y} r={11} t={t} ring={k === 0 ? GREEN : LINE} />
          <Fig x={56} y={y + 4.5} size={13}>{t}</Fig>
          <rect x="106" y={y - 4} width="262" height="8" rx="2" fill={FAINT} stroke={LINE} />
          <rect x="106" y={y - 4} height="8" rx="2" fill={k === 0 ? GREEN : GREY}>
            <animate attributeName="width" values={`0;${262 * p * 0.5};${262 * p};${262 * p}`} keyTimes="0;0.2;0.5;1" dur="7s" repeatCount="indefinite" />
          </rect>
          <Fig x={416} y={y + 5} anchor="end" size={15} fill={k === 0 ? MINT : INK}>{label}</Fig>
        </g>
      ))}
      <Rule x1={24} x2={416} y1={178.5} y2={178.5} />
      <Mono x={24} y={200} size={9}>0x8a2f signed</Mono>
      <Cap x={416} y={200} anchor="end">Weight = balance x loyalty</Cap>
    </Svg>
  );
}

/* Fair-price guard: a fill too far from the fair price is refused, holders get ETH. */
function Guard() {
  const X = (p) => 150 + ((p - 50) / 50) * 254;
  const rows = [['98.6%', 86, 98.6, MINT, 'swap executed'], ['71.2%', 150, 71.2, RED, 'thin pool, no fill']];
  return (
    <Svg label="A conversion is checked against the fair price before it is executed">
      <Cap x={24} y={38}>Fill vs fair price</Cap>
      <Cap x={404} y={38} anchor="end" fill={MINT}>Fair price</Cap>
      <rect x={X(94)} y="52" width={X(100) - X(94)} height="128" fill="rgba(47, 168, 255,0.08)" />
      <Rule x1={X(100)} x2={X(100)} y1={46} y2={180} stroke={GREEN} />
      {rows.map(([v, y, p, tone, note]) => (
        <g key={v}>
          <Disc x={36} y={y} r={11} t="NVDA" />
          <Fig x={56} y={y + 1} size={16} fill={tone}>{v}</Fig>
          <Mono x={56} y={y + 14} size={8} fill={MUT}>{note}</Mono>
          <Rule x1={150} x2={404} y1={y + 0.5} y2={y + 0.5} />
          {[50, 60, 70, 80, 90, 100].map((t) => <Rule key={t} x1={X(t)} x2={X(t)} y1={y - 3} y2={y + 4} />)}
          <g>
            <line x1="0" x2="0" y1={y - 12} y2={y + 12} stroke={tone} strokeWidth="2" />
            <circle cx="0" cy={y} r="3.5" fill={tone} />
            <animateTransform attributeName="transform" type="translate" values={`150 0;${X(p)} 0;${X(p)} 0`} keyTimes="0;0.3;1" dur="7s" repeatCount="indefinite" calcMode="spline" keySplines="0.2 0.7 0.2 1;0 0 1 1" />
          </g>
        </g>
      ))}
      <Rule x1={24} x2={416} y1={180.5} y2={180.5} />
      <Disc x={34} y={202} r={9} t="ETH" />
      <Txt x={50} y={205.5} size={10}>Holders get ETH that cycle instead of a bad price</Txt>
    </Svg>
  );
}

/* Encrypted keys: ciphertext at rest, the key only exists in memory while a cycle runs. */
function Keys() {
  const cipher = ['9f3a c41e 7b02 e6d1 08af', '52c7 1d9b a4f0 3e68 b1c5', 'e07d 6a21 f98c 40b3 7d2e', '3b8f d5a6 19c0 e274 6f91'];
  return (
    <Svg label="Keys are encrypted at rest and decrypted in memory at run time">
      <Box x={24} y={36} w={160} h={138} />
      <Cap x={36} y={55}>At rest</Cap>
      {cipher.map((c, k) => <Mono key={c} x={36} y={80 + k * 16} size={9} fill={MUT}>{c}</Mono>)}
      <Rule x1={24} x2={184} y1={146.5} y2={146.5} />
      <Cap x={36} y={163} fill={MINT}>AES-256-GCM</Cap>

      <Cap x={220} y={96} anchor="middle">Decrypt</Cap>
      <Rule x1={184} x2={256} y1={105.5} y2={105.5} />
      <path d="M 184 105.5 H 256" fill="none" stroke={GREEN} strokeWidth="1.5" strokeDasharray="2 8" strokeLinecap="round" opacity="0">
        <animate attributeName="stroke-dashoffset" from="0" to="-40" dur="1.2s" repeatCount="indefinite" />
        {blink(0.3, 0.8)}
      </path>

      <Box x={256} y={36} w={160} h={138} />
      <Cap x={268} y={55}>In memory, at run time</Cap>
      <g opacity="0"><Mono x={268} y={104} size={12}>0xa8f3…c91e</Mono><Cap x={268} y={163} fill={MINT}>Cycle running</Cap>{blink(0.34, 0.8)}</g>
      <g opacity="1">
        <Mono x={268} y={104} size={12} fill={GREY}>not loaded</Mono><Cap x={268} y={163}>Idle</Cap>
        <animate attributeName="opacity" values="1;1;0;0;1;1" keyTimes="0;0.32;0.35;0.8;0.83;1" dur="8s" repeatCount="indefinite" />
      </g>
      <Rule x1={256} x2={416} y1={146.5} y2={146.5} />
      <Cap x={24} y={200}>Wallet keys never sit in clear</Cap>
    </Svg>
  );
}

/* Receipts and statements: a card in the group, a statement per holder, a dashboard per token. */
function Receipts() {
  const out = [['Every dividend', 'a card in your Telegram group', 50], ['Every holder', 'a statement page', 112], ['Every token', 'a live dashboard', 174]];
  return (
    <Svg label="Each dividend posts a card to Telegram, with a statement and a dashboard">
      <Box x={24} y={24} w={236} h={182} />
      <Telegram x={42} y={44} r={9} />
      <Txt x={58} y={47.5} size={10} weight={600}>PONS holders</Txt>
      <Disc x={242} y={44} r={8} t="PONS" />
      <Rule x1={24} x2={260} y1={62.5} y2={62.5} />
      <g>
        <Box x={36} y={74} w={212} h={86} fill={SLAB} />
        <Cap x={48} y={92} fill={MINT}>Dividend paid</Cap>
        <Disc x={61} y={122} r={13} t="NVDA" />
        <Fig x={82} y={121} size={16}>0.0421 NVDA</Fig>
        <Mono x={82} y={135} size={8} fill={MUT}>to holders, this cycle</Mono>
        <animateTransform attributeName="transform" type="translate" values="0 10;0 0;0 0" keyTimes="0;0.12;1" dur="8s" repeatCount="indefinite" />
        <animate attributeName="opacity" values="0;1;1;0" keyTimes="0;0.12;0.97;1" dur="8s" repeatCount="indefinite" />
      </g>
      <Box x={36} y={170} w={102} h={24} />
      <Disc x={51} y={182.5} r={7} href={PLATFORM('x')} />
      <Txt x={64} y={186} size={9}>Share on X</Txt>
      <Box x={146} y={170} w={102} h={24} />
      <Txt x={197} y={186} size={9} anchor="middle">Statement</Txt>

      {out.map(([cap, body, y], k) => (
        <g key={cap}>
          {k > 0 && <Rule x1={284} x2={416} y1={y - 30.5} y2={y - 30.5} />}
          <Mono x={284} y={y - 8} size={8} fill={MINT}>{`0${k + 1}`}</Mono>
          <Cap x={302} y={y - 8}>{cap}</Cap>
          <Txt x={284} y={y + 8} size={9.5}>{body}</Txt>
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
