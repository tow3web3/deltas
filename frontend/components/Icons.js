import {
  Coins as PhCoins, Swap as PhSwap, Gift as PhGift, Target as PhTarget, Clock as PhClock, LockKey, ChartLineUp, ArrowRight, Lightning, ShieldCheck,
  UsersThree, Pause as PhPause, Flame as PhFlame, BellRinging, TrendUp as PhTrendUp, DiceFive, Stack, Ticket, Scales, Wallet as PhWallet,
  Medal as PhMedal, Bank as PhBank, Check as PhCheck, Copy as PhCopy, Vault as PhVault, Broadcast, SealCheck, Fingerprint, GitFork, Key as PhKey,
  PaperPlaneTilt, Trophy as PhTrophy, Crown as PhCrown, Brain as PhBrain, Rocket as PhRocket, ChartPieSlice, Robot as PhRobot, Fire, Receipt as PhReceipt,
  GasPump, Warning as PhWarning, Globe as PhGlobe, MagnifyingGlass, Hourglass, Diamond, Megaphone, Link as PhLink, Code as PhCode, Eye as PhEye,
} from '@phosphor-icons/react/dist/ssr';
import { useId } from 'react';
import { PLATFORM_PATHS } from '../lib/platformPaths';

// The icon set of the site: Phosphor, in its duotone weight, so an icon has a
// body and a tint instead of a thin outline. Size and colour come from
// className. Controls that are part of the chrome (arrows, checks) are bold.
// Never an emoji in place of an icon, and a token or a platform always shows
// its own logo (StockLogo, PlatformIcon), not one of these.
const duo = (Icon) => function Duotone(p) { return <Icon weight="duotone" aria-hidden="true" {...p} />; };
const bold = (Icon) => function Bold(p) { return <Icon weight="bold" aria-hidden="true" {...p} />; };

export const Coins = duo(PhCoins);
export const Swap = duo(PhSwap);
export const Gift = duo(PhGift);
export const Target = duo(PhTarget);
export const Clock = duo(PhClock);
export const Lock = duo(LockKey);
export const Chart = duo(ChartLineUp);
export const Bolt = duo(Lightning);
export const Shield = duo(ShieldCheck);
export const Users = duo(UsersThree);
export const Flame = duo(PhFlame);
export const Bell = duo(BellRinging);
export const TrendUp = duo(PhTrendUp);
export const Dice = duo(DiceFive);
export const Layers = duo(Stack);
export const Vote = duo(Ticket);
export const Scale = duo(Scales);
export const Wallet = duo(PhWallet);
export const Medal = duo(PhMedal);
export const Bank = duo(PhBank);
export const Vault = duo(PhVault);
export const Live = duo(Broadcast);
export const Verified = duo(SealCheck);
export const Proof = duo(Fingerprint);
export const Route = duo(GitFork);
export const Key = duo(PhKey);
export const Send = duo(PaperPlaneTilt);
export const Trophy = duo(PhTrophy);
export const Crown = duo(PhCrown);
export const Brain = duo(PhBrain);
export const Rocket = duo(PhRocket);
export const Pie = duo(ChartPieSlice);
export const Robot = duo(PhRobot);
export const Burn = duo(Fire);
export const Receipt = duo(PhReceipt);
export const Gas = duo(GasPump);
export const Warning = duo(PhWarning);
export const World = duo(PhGlobe);
export const Search = duo(MagnifyingGlass);
export const Wait = duo(Hourglass);
export const Gem = duo(Diamond);
export const Announce = duo(Megaphone);
export const Chain = duo(PhLink);
export const Code = duo(PhCode);
export const Eye = duo(PhEye);

export const Arrow = bold(ArrowRight);
export const Pause = bold(PhPause);
export const Check = bold(PhCheck);
export const Copy = bold(PhCopy);

// Platforms: the official glyph of each one (lib/platformPaths.js), in its own
// colours as they read on a dark page. `mono` draws the bare glyph in the text colour.
const ON_DARK = { youtube: '#FF0000', github: '#FFFFFF', x: '#FFFFFF', facebook: '#0866FF', tiktok: '#FFFFFF', twitch: '#9146FF', domain: '#2FA8FF', phone: '#25D366' };
// What shows through the holes of a glyph: the play triangle of YouTube and the f of Facebook are white.
const UNDERLAY = {
  youtube: <path fill="#FFFFFF" d="M9.545 15.568V8.432L15.818 12z" />,
  facebook: <circle cx="12" cy="12" r="10.5" fill="#FFFFFF" />,
};
// Its own gradient per instance: a shared id breaks every copy as soon as the first one on the page is hidden.
function InstagramGlyph({ d, className }) {
  const id = `ig-${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <defs>
        <radialGradient id={id} cx="30%" cy="107%" r="150%">
          <stop offset="0" stopColor="#FDF497" /><stop offset="0.05" stopColor="#FDF497" /><stop offset="0.45" stopColor="#FD5949" /><stop offset="0.6" stopColor="#D6249F" /><stop offset="0.9" stopColor="#285AEB" />
        </radialGradient>
      </defs>
      <path fill={`url(#${id})`} d={d} />
    </svg>
  );
}
export function PlatformIcon({ platform, className, mono = false }) {
  const key = PLATFORM_PATHS[platform] ? platform : 'domain';
  const d = PLATFORM_PATHS[key];
  if (mono) return <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true"><path d={d} /></svg>;
  if (key === 'instagram') return <InstagramGlyph d={d} className={className} />;
  return <svg viewBox="0 0 24 24" className={className} aria-hidden="true">{UNDERLAY[key]}<path fill={ON_DARK[key]} d={d} /></svg>;
}

const glyph = (platform) => function Glyph(p) { return <svg viewBox="0 0 24 24" fill="currentColor" {...p}><path d={PLATFORM_PATHS[platform]} /></svg>; };
// The bare glyphs, in the text colour: for the brand's own links in the header and footer.
export const X = glyph('x');
export const Github = glyph('github');
export const Youtube = glyph('youtube');
export const Instagram = glyph('instagram');
export const Facebook = glyph('facebook');
export const Tiktok = glyph('tiktok');
export const Twitch = glyph('twitch');
export const Globe = glyph('domain');

// Added for the dashboard (the canvas, its inspector, the vote and missions boards).
import {
  Package as DashPackage, ArrowsClockwise as DashArrowsClockwise, SignOut as DashSignOut, Plant as DashPlant, Fish as DashFish,
  TelegramLogo as DashTelegramLogo, IdentificationCard as DashIdentificationCard, SunHorizon as DashSunHorizon, Timer as DashTimer,
  CaretDown as DashCaretDown, CaretRight as DashCaretRight, CaretUp as DashCaretUp, Play as DashPlay, Plus as DashPlus, X as DashX,
} from '@phosphor-icons/react/dist/ssr';
const dashSolid = (Icon) => function Solid(p) { return <Icon weight="fill" aria-hidden="true" {...p} />; };

// External and Handshake, which the dashboard also uses, are exported by the block below.
export const InKind = duo(DashPackage);
export const Convert = duo(DashArrowsClockwise);
export const SignOut = duo(DashSignOut);
export const Sprout = duo(DashPlant);
export const Whale = duo(DashFish);
export const Telegram = duo(DashTelegramLogo);
export const Identity = duo(DashIdentificationCard);
export const OpeningBell = duo(DashSunHorizon);
export const Timer = duo(DashTimer);
export const CaretDown = bold(DashCaretDown);
export const CaretRight = bold(DashCaretRight);
export const Plus = bold(DashPlus);
export const Close = bold(DashX);
export const Play = dashSolid(DashPlay);
export const Rise = dashSolid(DashCaretUp);
export const Fall = dashSolid(DashCaretDown);

// Added for the public pages (coin, receipt, statement, lottery).
import { ArrowsClockwise as PubArrowsClockwise, ArrowUpRight as PubArrowUpRight, Handshake as PubHandshake } from '@phosphor-icons/react/dist/ssr';
export const Refresh = bold(PubArrowsClockwise);
export const External = bold(PubArrowUpRight);
export const Handshake = duo(PubHandshake);

// Data sections: the ledger, the tables, the stock directory.
import { Drop as DataDrop, MagnifyingGlass as DataMagnifyingGlass } from '@phosphor-icons/react/dist/ssr';
export const Liquid = dashSolid(DataDrop);
export const Find = bold(DataMagnifyingGlass);

// Closing sections of the homepage: the reader, the specification sheet, the API reference.
import { ArrowLeft as EndArrowLeft, Prohibit as EndProhibit, Minus as EndMinus } from '@phosphor-icons/react/dist/ssr';
export const Back = bold(EndArrowLeft);
export const Blocked = bold(EndProhibit);
export const Dash = bold(EndMinus);
