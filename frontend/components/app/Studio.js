'use client';

// The Studio: one screen where the creator draws their fee routing.
// Left node = the dev wallet (what lands there each cycle). Right nodes = legs:
// holders, wallets, buyback, treasury, and pages (a YouTube channel, a GitHub
// account, a domain...). Edges carry the share. The inspector on
// the right edits whatever is selected. Save writes the routing table; the
// scheduler applies it on the next cycle.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { ReactFlow, Background, Controls, Handle, Position, BaseEdge, EdgeLabelRenderer, getBezierPath, ReactFlowProvider, useNodesState } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { useReducedMotion } from 'motion/react';
import StockLogo from '../StockLogo';
import Countdown from '../Countdown';
import { Bolt, Pause, Play, Arrow, Copy, Check, PlatformIcon, Users, World, Wallet, Burn, Vault, Warning, Gas, Receipt, Telegram, InKind, Convert, External, Plus, Close } from '../Icons';
import { PageAvatar } from '../pages/PageParts';
import { LoyaltyEditor, RewardEditor, ScheduleEditor } from './Editors';
import { Button, Seg, Slider, Toggle, StockPicker, SOL_SCHEDULES, inputCls, focusCls, useToast, useCustomToken, useTokenResearch, shortAddr, fmtUsd, fmtNum, units, scheduleValue, parseSchedule } from './ui';
import TokenCard from './TokenCard';
import Wizard from './Wizard';
import SharePanel from './Share';
import { describeAddress, explorerAddress, explorerTx, getStock, ZERO, SOL_MINT } from '../../lib/stocks';
import { getXStock } from '../../lib/xstocks';
import { chainOf, isEvmAddress, isSolAddress, sameAddress } from '../../lib/chains';
import { PLATFORMS, PLATFORM_KEYS, parsePage, pageName, pagePath } from '../../lib/pages';
import { BRAND, BOT_USERNAME } from '../../lib/brand';

// A kind of destination is told by its icon and its colour, on the node, on its edge and in the inspector.
const KIND = {
  holders: { label: 'Holders', icon: Users, color: '#2FA8FF', text: 'text-hood-600', hint: 'The dividend. Weighted by balance and loyalty.' },
  page: { label: 'Page', icon: World, color: '#5FE3FF', text: 'text-cyan-500', hint: 'A YouTube channel, a GitHub account, a domain, any page. Its owner claims by signing in.' },
  wallet: { label: 'Wallet', icon: Wallet, color: '#F3F5F9', text: 'text-ink', hint: 'Any address: you, a partner, marketing, a DAO.' },
  burn: { label: 'Buyback & burn', icon: Burn, color: '#FF7A1A', text: 'text-orange-700', hint: 'Buys your own coin back and burns it.' },
  treasury: { label: 'Treasury', icon: Vault, color: '#7B5CFF', text: 'text-violet-700', hint: 'Retained earnings. Book value published on the dashboard.' },
};
const sharePct = (bps) => (bps / 100).toFixed(bps % 100 ? 1 : 0);
// A kind colour (#RRGGBB) with an alpha: the lit edges and glows of the canvas.
const alpha = (hex, a) => `${hex}${Math.round(a * 255).toString(16).padStart(2, '0')}`;
// The beam running down: the lit edge of a bar or a callout.
const BEAM_DOWN = 'linear-gradient(180deg, #2FA8FF 0%, #5FE3FF 50%, #7B5CFF 100%)';
// Glass that floats over the canvas: darker than a panel, so it reads over the light.
const floatGlass = '!bg-[rgba(9,12,19,0.84)] backdrop-blur-xl';
// A channel of light: the bar of a share, the lit one glowing in its colour.
const channel = (color, lit = true) => ({ background: `linear-gradient(90deg, ${alpha(color, 0.45)}, ${color})`, boxShadow: lit ? `0 0 10px ${alpha(color, 0.7)}` : 'none' });
const ADDR = /^0x[0-9a-fA-F]{40}$/;

/* ---------------- the chain of the canvas ---------------- */
// The coin's chain: the config's, else the shape of the coin's address, else (before setup) the
// signed-in wallet's. Robinhood Chain when nothing says otherwise, so older data keeps working.
const chainOfData = (data) => {
  const c = data?.config?.chain;
  if (c === 'solana' || c === 'robinhood') return c;
  return chainOf(data?.config?.source_token_address) || (data?.user?.chain === 'solana' ? 'solana' : 'robinhood');
};
// A destination address on the canvas's chain: base58 on Solana (case kept), 0x on Robinhood Chain.
const validAddr = (chain, a) => (chain === 'solana' ? isSolAddress(a) : ADDR.test(a));
// What a Solana treasury holds by default: the S&P 500, as on Robinhood Chain.
const SPYX = getXStock('SPY')?.mint;
// On Solana, a reward is SOL or a mint; nothing set, or a 0x value left by a default, means SOL.
const solReward = (v) => (!v || v === SOL_MINT || v === 'SOL' || /^0x/i.test(v) ? 'SOL' : v);
// The kind hints that say something else on Solana: holders are paid by balance, the burn buys on Jupiter.
const kindHint = (kind, chain) => (chain === 'solana' && kind === 'holders' ? 'The dividend. Paid by balance.' : chain === 'solana' && kind === 'burn' ? 'Buys your own coin on Jupiter and burns it.' : KIND[kind].hint);
// The decimals of a cycle's asset: SOL and the xStocks are known; the rest comes from the metadata.
const decimalsOf = (addr, meta, chain) => (addr === SOL_MINT ? 9 : meta?.[addr]?.decimals ?? (getXStock(addr)?.mint === addr ? getXStock(addr).decimals : chain === 'solana' ? 6 : 18));

const SOURCE_ID = 'source';
const LEG_X = 480;
const TG_ID = 'tg'; // the Telegram action node
const ACTION_X = LEG_X + 330;
const LEG_GAP = 168;

/* ---------------- draft model ---------------- */
function legsFromData(data) {
  const { config, legs } = data;
  if (legs?.length) {
    return legs.map((l, i) => ({
      key: `l${l.id}`, kind: l.kind, shareBps: Number(l.share_bps), address: l.address || '', asset: l.asset || '', label: l.label || KIND[l.kind].label, posX: l.pos_x ?? LEG_X, posY: l.pos_y ?? 30 + i * LEG_GAP,
      ...(l.kind === 'page' ? { page: l.page_handle ? { platform: l.page_platform, handle: l.page_handle, slug: l.page_slug || null, claimed: Boolean(l.page_claimed), vault: l.page_vault || null, avatar: l.page_avatar || null } : null, pageInput: '' } : {}),
    }));
  }
  // Legacy split → legs
  const out = [];
  const push = (kind, bps, extra = {}) => bps > 0 && out.push({ key: `legacy-${kind}`, kind, shareBps: bps, address: '', asset: '', label: kind === 'wallet' ? 'You' : KIND[kind].label, posX: LEG_X, posY: 30 + out.length * LEG_GAP, ...extra });
  push('holders', Number(config.split_holders_bps));
  push('wallet', Number(config.split_creator_bps), { address: config.creator_address || '' });
  push('burn', Number(config.split_burn_bps));
  push('treasury', Number(config.split_treasury_bps), { address: config.treasury_address || '', asset: config.treasury_asset || '' });
  if (!out.length) push('holders', 10000);
  return out;
}
/**
 * The legs of a Solana coin, as the engine reads them: a 0x asset means SOL (in kind), a burn
 * has no asset, and the holders are paid in their leg's asset or else the fixed reward, so the
 * holders leg shows (and saves) that reward when it names none of its own.
 */
function solLegs(legs, reward) {
  return legs.map((l) => {
    const asset = l.kind === 'burn' || /^0x/i.test(l.asset) ? '' : l.asset;
    return { ...l, asset: l.kind === 'holders' && !asset && reward !== 'SOL' ? reward : asset };
  });
}
function draftFromData(data) {
  const c = data.config;
  const sol = chainOfData(data) === 'solana';
  const reward = sol ? solReward(c.target_token_address) : null;
  return {
    legs: sol ? solLegs(legsFromData(data), reward) : legsFromData(data),
    // Solana pays one asset (SOL, an xStock or a mint): the rotating reward modes are Robinhood Chain only.
    reward: sol ? { rewardMode: 'fixed', reward, basket: c.basket || 'MAG7' } : { rewardMode: c.reward_mode || 'fixed', reward: c.target_token_address === ZERO ? 'ETH' : c.target_token_address, basket: c.basket || 'MAG7' },
    schedule: { schedule: scheduleValue(c), marketHoursOnly: Boolean(c.market_hours_only), feeSource: c.fee_source || 'wallet' },
    loyalty: { enabled: Boolean(c.loyalty_enabled), maxBps: Number(c.loyalty_max_bps || 20000), rampDays: Number(c.loyalty_ramp_days || 30), minHoldHours: Number(c.loyalty_min_hold_hours || 0), sellReset: Boolean(c.loyalty_sell_reset) },
    sourcePos: { x: 40, y: 60 },
  };
}
// What counts as a change worth saving: not positions, not what the creator is still typing, not a page's live status.
const stripPos = (d) => ({ ...d, legs: d.legs.map(({ posX, posY, pageInput, page, ...l }) => (l.kind === 'page' ? { ...l, page: page ? `${page.platform}:${page.handle}` : null } : l)), sourcePos: undefined });
const totalBps = (legs) => legs.reduce((s, l) => s + l.shareBps, 0);
const legProblem = (l, chain = 'robinhood') => {
  if ((l.kind === 'wallet' || l.kind === 'treasury') && !validAddr(chain, l.address)) return chain === 'solana' && isEvmAddress(l.address) ? 'needs a Solana address' : 'needs an address';
  if (l.kind === 'page' && !l.page) return 'needs a page';
  // A Solana treasury holds an xStock.
  if (chain === 'solana' && l.kind === 'treasury' && !getXStock(l.asset)) return 'needs an xStock';
  return null;
};

/* ---------------- nodes ---------------- */
function AssetChip({ asset: given, meta, kind, fallback, chain = 'robinhood' }) {
  // On Solana the fees arrive as SOL, so in kind is SOL: shown with its own logo.
  const asset = given || (chain === 'solana' ? SOL_MINT : given);
  const custom = useCustomToken(asset && !getStock(asset) && asset !== ZERO ? asset : null);
  // No conversion: the share leaves as it arrived. The treasury still turns its ETH into SPY.
  if (!asset) {
    return (
      <span className="inline-flex min-w-0 items-center gap-1.5 font-mono text-[10.5px] text-mut">
        <InKind className="h-3.5 w-3.5 shrink-0" /><span className="truncate">{fallback}</span>
        {kind === 'treasury' && <StockLogo address={getStock('SPY').address} size="h-3.5 w-3.5" text="text-[5px]" />}
      </span>
    );
  }
  const d = describeAddress(asset, meta?.[asset] || (custom?.symbol ? { symbol: custom.symbol, image: custom.image } : null));
  return (
    <span className="inline-flex min-w-0 items-center gap-1.5 font-mono text-[10.5px] text-mut">
      <StockLogo address={asset} meta={{ symbol: d.symbol, image: custom?.image ?? (chain === 'solana' ? meta?.[asset]?.image : undefined) }} size="h-4 w-4" text="text-[5px]" />
      <span className="truncate">{kind === 'holders' ? 'paid in' : kind === 'treasury' ? 'holds' : 'in'} <span className="font-medium text-ink">{d.symbol}</span></span>
    </span>
  );
}

/** A state in two words, with a dot: the small print of a node. */
function Note({ tone = 'mut', children, title }) {
  const c = tone === 'live' ? ['bg-cyan-500 shadow-[0_0_6px_#5FE3FF]', 'text-cyan-500'] : tone === 'gold' ? ['bg-gold-400', 'text-gold-600'] : tone === 'red' ? ['bg-down', 'text-down'] : ['bg-dim', 'text-mut'];
  return <span title={title} className={`inline-flex shrink-0 items-center gap-1.5 font-mono text-[9.5px] uppercase tracking-[0.14em] ${c[1]}`}><span className={`h-1 w-1 rounded-full ${c[0]}`} />{children}</span>;
}

/** The dev wallet (the creator wallet on Solana): where the light enters. Glass lit on the left, the beam leaving from its right. */
function SourceNode({ data }) {
  const { src, config, assets, selected, chain } = data;
  const sol = chain === 'solana';
  // On Solana a cycle routes the SOL above the fee reserve, nothing else the wallet holds.
  const payable = (assets?.assets || []).filter((a) => (a.isNative ? a.spendable > 0.0005 : !sol && a.usd >= 1)).slice(0, 4);
  return (
    <div className={`frame w-[280px] overflow-visible transition-shadow ${floatGlass} ${selected ? 'shadow-glow' : 'shadow-soft'}`}>
      {/* the exit of the beam, a glow on the right edge where the channels start */}
      <span aria-hidden="true" className="pointer-events-none absolute -right-px top-1/2 h-16 w-[2px] -translate-y-1/2 rounded-full bg-cyan-500 shadow-[0_0_14px_#5FE3FF]" />
      <div className="flex items-center gap-3 px-4 pt-3.5">
        <StockLogo address={config.source_token_address} meta={src} size="h-9 w-9" text="text-[10px]" />
        <div className="min-w-0 flex-1">
          <div className="truncate font-display text-[15px] font-medium tracking-[-0.02em] text-ink">{src.name || `$${src.symbol || 'TOKEN'}`}</div>
          <div className="truncate font-mono text-[10.5px] text-mut">{sol ? 'creator wallet' : 'dev wallet'} {shortAddr(config.dev_wallet_public)}</div>
        </div>
        <Note tone={config.is_active ? 'live' : 'mut'} title={config.is_active ? 'Cycles fire on schedule' : 'Nothing goes out until you resume'}>{config.is_active ? 'live' : 'paused'}</Note>
      </div>
      <div className="mt-3.5 flex items-end justify-between gap-2 px-4 pb-3.5">
        <div className="shrink-0">
          <div className="label whitespace-nowrap !text-[9.5px]">In the wallet</div>
          <div className="figure mt-1.5 text-[28px] font-medium leading-none tracking-[-0.03em] text-ink">{assets ? fmtUsd(assets.totalUsd || 0) : '…'}</div>
        </div>
        <div className="min-w-0 text-right">
          <div className="label whitespace-nowrap !text-[9.5px]">Goes out</div>
          <div className="mt-1 truncate font-mono text-[10.5px] text-cyan-500">{config.scheduleLabel?.toLowerCase()}</div>
        </div>
      </div>
      {/* What the next cycle can pay, asset by asset */}
      {payable.length ? (
        <div className="grid grid-cols-2 gap-1.5 border-t border-white/[0.07] p-2.5">
          {payable.map((a, i) => (
            <div key={a.address} className={`flex min-w-0 items-center gap-1.5 rounded-xl bg-white/[0.04] px-2.5 py-1.5 ${payable.length % 2 && i === payable.length - 1 ? 'col-span-2' : ''}`}>
              <StockLogo address={a.address} meta={{ symbol: a.symbol, image: a.image }} size="h-4 w-4" text="text-[5px]" />
              <span className="truncate font-mono text-[10.5px] tabular-nums text-ink">{fmtNum(a.isNative ? a.spendable : a.amount)}</span>
              <span className="ml-auto font-mono text-[9.5px] text-mut">{a.symbol}</span>
            </div>
          ))}
        </div>
      ) : <div className="border-t border-white/[0.07] px-4 py-2.5 font-mono text-[10.5px] text-mut">{sol ? 'Nothing to route yet. Creator fees are collected here each cycle.' : 'Nothing payable yet. Fees land here first.'}</div>}
      <Handle type="source" position={Position.Right} className="!h-2.5 !w-2.5 !rounded-full !border-0 !bg-cyan-500 !shadow-[0_0_10px_#5FE3FF]" />
    </div>
  );
}

function LegNode({ data }) {
  const { leg, selected, meta, sourceSymbol, source, chain } = data;
  const k = KIND[leg.kind];
  const Icon = k.icon;
  const page = leg.kind === 'page' && leg.page ? leg.page : null;
  const problem = legProblem(leg, chain);
  const dest = leg.kind === 'holders' ? `every ${sourceSymbol ? `$${sourceSymbol}` : ''} holder` : leg.kind === 'burn' ? `buys $${sourceSymbol || 'TOKEN'}, burns it`
    : leg.kind === 'page' ? (leg.page ? `${PLATFORMS[leg.page.platform]?.label || leg.page.platform} · ${pageName(leg.page.platform, leg.page.handle)}` : 'no page yet')
      : validAddr(chain, leg.address) ? shortAddr(leg.address) : 'no address yet';
  // A glass chip lit on its left edge in the colour of its kind (the warning colour while it is incomplete).
  const lit = problem ? '#FF5C33' : k.color;
  const shadow = selected
    ? `0 0 0 1px ${alpha(k.color, 0.55)}, 0 0 46px -10px ${alpha(k.color, 0.6)}, 0 20px 50px rgba(0,0,0,0.5)`
    : `-18px 0 38px -28px ${lit}, 0 20px 50px rgba(0,0,0,0.45)`;
  return (
    <div className={`panel w-[250px] transition-shadow ${floatGlass} ${problem && !selected ? 'border-down/40' : ''}`} style={{ borderLeftColor: alpha(lit, 0.75), boxShadow: shadow }}>
      <span aria-hidden="true" className="pointer-events-none absolute inset-y-4 -left-px w-[2px] rounded-full" style={{ background: lit, boxShadow: `0 0 12px ${lit}` }} />
      <Handle type="target" position={Position.Left} className="!h-2.5 !w-2.5 !rounded-full !border-0" style={{ background: k.color, boxShadow: `0 0 10px ${k.color}` }} />
      {(leg.kind === 'holders' || (leg.kind === 'burn' && chain !== 'solana')) && <Handle type="source" position={Position.Right} className={`!h-1.5 !w-1.5 !rounded-full !border-0 ${data.notify ? '!bg-cyan-500 !shadow-[0_0_8px_#5FE3FF]' : '!bg-white/20'}`} />}
      <div className="flex items-start gap-2.5 px-3.5 pt-3">
        {page
          ? <PageAvatar page={page} size="h-8 w-8" badge="h-3.5 w-3.5" />
          : <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl" style={{ background: alpha(k.color, 0.1) }}><Icon className="h-[18px] w-[18px]" style={{ color: k.color }} /></span>}
        <div className="min-w-0 flex-1">
          <div className={`label truncate !text-[9.5px] ${k.text}`}>{page ? PLATFORMS[page.platform]?.label || page.platform : k.label}</div>
          <div className="truncate font-display text-[15px] font-medium leading-tight tracking-[-0.02em] text-ink">{leg.label}</div>
        </div>
        <div className="figure text-[26px] font-medium leading-none tracking-[-0.03em] text-ink">{sharePct(leg.shareBps)}<span className="ml-px text-sm text-mut">%</span></div>
      </div>
      <div className={`mt-2 flex items-center gap-1 truncate px-3.5 font-mono text-[10.5px] ${problem ? 'text-down' : 'text-mut'}`}>
        {problem ? <><Warning className="h-3 w-3 shrink-0" />{problem}</> : <span className="truncate">{dest}</span>}
      </div>
      {/* The share again, as a channel of light: the legs of a routing compare at a glance. */}
      <div className="mx-3.5 mt-2.5 h-[3px] rounded-full bg-white/[0.06]"><div className="h-full rounded-full transition-all" style={{ width: `${Math.min(100, leg.shareBps / 100)}%`, ...channel(k.color) }} /></div>
      <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1 px-3.5 py-2.5">
        {leg.kind === 'burn'
          ? <span className="inline-flex min-w-0 items-center gap-1.5 font-mono text-[10.5px] text-mut"><StockLogo address={source?.address} meta={source?.meta} size="h-4 w-4" text="text-[5px]" /><span className="truncate">buys back <span className="font-medium text-ink">${sourceSymbol || 'TOKEN'}</span></span></span>
          : <AssetChip asset={leg.asset} meta={meta} kind={leg.kind} chain={chain} fallback={leg.kind === 'treasury' ? 'in kind, ETH buys SPY' : 'in kind'} />}
        {page && (page.claimed
          ? <Note tone="live" title="Claimed: its share is paid straight to its owner">paid direct</Note>
          : <Note tone="gold" title="Not claimed yet: the share waits in a vault for its owner">in its vault</Note>)}
        {data.notify && <span title="Posts in Telegram when this leg pays" className="inline-flex shrink-0 items-center gap-1 font-mono text-[9.5px] uppercase tracking-[0.14em] text-mut"><Telegram className="h-3.5 w-3.5 text-[#2AABEE]" />posts</span>}
      </div>
    </div>
  );
}

/**
 * The channel from the dev wallet to a leg, drawn as light: a soft band whose
 * thickness is the share, a lit core in the beam that ends in the colour of the
 * leg, and a white pulse travelling along it while the policy runs.
 */
function ShareEdge({ id, sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, data }) {
  const [path, lx, ly] = getBezierPath({ sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition });
  const still = useReducedMotion();
  const share = data.shareBps / 10000;
  const w = 2 + share * 10;
  const on = data.active !== false;
  const g = `se-${id}`;
  // The glow's box in canvas units, so a nearly flat channel keeps room for its light, and a leg
  // dragged left of the wallet (where the curve bows out by xyflow's control offset) is not clipped.
  const m = 40 + (sourceX > targetX ? 0.25 * 25 * Math.sqrt(sourceX - targetX) : 0);
  const fx = Math.min(sourceX, targetX) - m;
  const fy = Math.min(sourceY, targetY) - 40;
  return (
    <>
      <defs>
        <linearGradient id={`${g}-beam`} gradientUnits="userSpaceOnUse" x1={sourceX} y1={sourceY} x2={targetX} y2={targetY}>
          <stop offset="0" stopColor="#2FA8FF" /><stop offset="0.45" stopColor="#5FE3FF" /><stop offset="1" stopColor={data.color} />
        </linearGradient>
        <filter id={`${g}-glow`} filterUnits="userSpaceOnUse" x={fx} y={fy} width={Math.abs(targetX - sourceX) + 2 * m} height={Math.abs(targetY - sourceY) + 80}>
          <feGaussianBlur stdDeviation="5" result="b" /><feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>
      <BaseEdge id={id} path={path} style={{ stroke: `url(#${g}-beam)`, strokeWidth: w, strokeLinecap: 'round', opacity: on ? 0.26 : 0.12 }} />
      <path d={path} fill="none" stroke={`url(#${g}-beam)`} strokeWidth={Math.max(1.5, w * 0.45)} strokeLinecap="round" filter={`url(#${g}-glow)`} opacity={on ? 0.95 : 0.4} />
      {on && !still && (
        <circle r={Math.max(2.5, w * 0.45)} fill="#fff" filter={`url(#${g}-glow)`}>
          <animateMotion dur={`${Math.max(1.6, 3.2 - share * 1.6).toFixed(2)}s`} repeatCount="indefinite" path={path} keyPoints="0;1" keyTimes="0;1" calcMode="spline" keySplines="0.4 0 0.2 1" />
        </circle>
      )}
      <EdgeLabelRenderer>
        <div className="pointer-events-none absolute rounded-full border border-white/10 bg-[rgba(5,7,12,0.85)] px-2 py-0.5 font-mono text-[10.5px] tabular-nums text-cyan-500 backdrop-blur-md" style={{ transform: `translate(-50%, -50%) translate(${lx}px, ${ly}px)` }}>{sharePct(data.shareBps)}%</div>
      </EdgeLabelRenderer>
    </>
  );
}

/** Actions: what happens off-chain when a leg pays. Today: Telegram notifications. */
function ActionNode({ data }) {
  const { selected, telegram, sourceSymbol, chain } = data;
  // Group burn alerts run on Robinhood Chain only: a Solana coin binds receipts.
  const withBurns = chain !== 'solana';
  const receipts = telegram?.receiptsChatId ? telegram.receiptsTitle || 'your group' : null;
  const burns = withBurns && telegram?.burnAlerts?.length ? telegram.burnAlerts[0].title || 'your group' : null;
  const bound = Boolean(receipts || burns);
  const Row = ({ icon: RowIcon, label, to }) => (
    <div className="flex items-center gap-2 px-3.5 py-1.5">
      <RowIcon className={`h-3.5 w-3.5 shrink-0 ${to ? 'text-cyan-500' : 'text-dim'}`} />
      <span className="text-[11px] text-ink">{label}</span>
      <span className={`ml-auto min-w-0 truncate font-mono text-[10.5px] ${to ? 'text-cyan-500' : 'text-mut'}`}>{to || 'not bound'}</span>
    </div>
  );
  // Off chain, so drawn dashed; lit on its left edge once a group is bound.
  return (
    <div className={`panel w-[250px] border-dashed transition-shadow ${floatGlass}`}
      style={{ ...(bound ? { borderLeftColor: 'rgba(95,227,255,0.55)', borderLeftStyle: 'solid' } : {}), boxShadow: selected ? '0 0 0 1px rgba(95,227,255,0.45), 0 0 46px -10px rgba(47,168,255,0.5), 0 20px 50px rgba(0,0,0,0.5)' : '0 20px 50px rgba(0,0,0,0.45)' }}>
      <Handle type="target" position={Position.Left} className={`!h-2.5 !w-2.5 !rounded-full !border-0 ${bound ? '!bg-cyan-500 !shadow-[0_0_10px_#5FE3FF]' : '!bg-mut'}`} />
      <div className="flex items-start gap-2.5 px-3.5 pb-2.5 pt-3">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[#2AABEE]/10"><Telegram className="h-5 w-5 text-[#2AABEE]" /></span>
        <div className="min-w-0">
          <div className="label !text-[9.5px]">Action · off chain</div>
          <div className="truncate font-display text-[15px] font-medium leading-tight tracking-[-0.02em] text-ink">Telegram notifications</div>
        </div>
      </div>
      <div className="divide-y divide-white/[0.06] border-y border-white/[0.07]">
        <Row icon={Receipt} label="Dividend receipts" to={receipts} />
        {withBurns && <Row icon={Burn} label="Burn alerts" to={burns} />}
      </div>
      <div className="px-3.5 py-2.5 font-mono text-[10.5px] text-mut">{bound ? 'posts in Telegram every cycle' : `click to connect a group for $${sourceSymbol || 'TOKEN'}`}</div>
    </div>
  );
}

/** Thin dashed link from a leg to an action, with a word on it: lit cyan once bound. */
function NotifyEdge({ id, sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, data }) {
  const [path, lx, ly] = getBezierPath({ sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition });
  return (
    <>
      <BaseEdge id={id} path={path} style={{ stroke: data.active ? '#5FE3FF' : '#5A6275', strokeWidth: 1.5, strokeDasharray: '3 6', strokeLinecap: 'round', opacity: data.active ? 0.6 : 0.45 }} />
      <EdgeLabelRenderer>
        <div className={`pointer-events-none absolute rounded-full border border-white/10 bg-[rgba(5,7,12,0.85)] px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.14em] backdrop-blur-md ${data.active ? 'text-cyan-500' : 'text-mut'}`} style={{ transform: `translate(-50%, -50%) translate(${lx}px, ${ly}px)` }}>{data.label}</div>
      </EdgeLabelRenderer>
    </>
  );
}

const nodeTypes = { source: SourceNode, leg: LegNode, action: ActionNode };
const edgeTypes = { share: ShareEdge, notify: NotifyEdge };

/* ---------------- inspector panels ---------------- */
/** Loud state: a play sign with moving bars while the policy runs, a pause sign when it does not. */
function RunBadge({ active }) {
  if (!active) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-gold-300 bg-gold-50 px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.14em] text-gold-600" title="Nothing goes out until you resume">
        <Pause className="h-2.5 w-2.5" />Paused
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-cyan-500/30 bg-cyan-500/[0.08] px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.14em] text-cyan-500 shadow-[0_0_18px_-6px_rgba(95,227,255,0.5)]" title="Cycles fire on schedule">
      <Play className="h-2.5 w-2.5" />
      Running
      <span className="run-bars flex h-2.5 items-end gap-[2px]" aria-hidden><i /><i /><i /></span>
    </span>
  );
}

const smallBtn = `inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 font-mono text-[10.5px] text-mut transition-colors hover:border-cyan-500/50 hover:text-ink ${focusCls}`;
const textLink = 'inline-flex items-center gap-0.5 text-[11px] font-medium text-hood-600 hover:text-hood-700 hover:underline';

function CopyBtn({ text, label = 'Copy' }) {
  const [ok, setOk] = useState(false);
  return (
    <button type="button" onClick={async () => { try { await navigator.clipboard.writeText(text); setOk(true); setTimeout(() => setOk(false), 1200); } catch { /* ignore */ } }} className={smallBtn}>
      {ok ? <Check className="h-3 w-3 text-cyan-500" /> : <Copy className="h-3 w-3" />}{ok ? 'Copied' : label}
    </button>
  );
}

/** A callout inside the inspector: glass, its left edge lit (the beam for information, a warning colour otherwise), and the icon of what it is about. */
function Callout({ tone = 'gold', icon: CalloutIcon, children, className = '' }) {
  const c = tone === 'red' ? ['#FF5C33', 'rgba(255,92,51,0.6)', 'text-down'] : tone === 'live' ? [BEAM_DOWN, 'rgba(47,168,255,0.7)', 'text-cyan-500'] : ['#F6C343', 'rgba(246,195,67,0.55)', 'text-gold-400'];
  return (
    <div className={`relative flex items-start gap-2 overflow-hidden rounded-xl border border-white/10 bg-white/[0.03] py-2 pl-3.5 pr-3 text-xs leading-snug text-mut ${className}`}>
      <span aria-hidden="true" className="absolute inset-y-1.5 left-0 w-[2px] rounded-full" style={{ background: c[0], boxShadow: `0 0 8px ${c[1]}` }} />
      {CalloutIcon && <CalloutIcon className={`mt-px h-3.5 w-3.5 shrink-0 ${c[2]}`} />}
      <span className="min-w-0">{children}</span>
    </div>
  );
}

function Section({ title, children, aside }) {
  return (
    <section className="border-b border-white/[0.07] px-4 py-4 last:border-b-0">
      <div className="mb-3 flex items-center justify-between gap-2"><h3 className="label">{title}</h3>{aside}</div>
      {children}
    </section>
  );
}

/** The head of an inspector: what is selected, in the colour of its kind. */
function InspectorHead({ caption, children }) {
  return (
    <div className="border-b border-white/[0.07] px-4 py-4">
      {caption && <div className="label">{caption}</div>}
      {children}
    </div>
  );
}

function LegInspector({ leg, draft, setDraft, meta, sourceSymbol, onRemove, chain = 'robinhood' }) {
  const k = KIND[leg.kind];
  const KindIcon = k.icon;
  const sol = chain === 'solana';
  const patch = (p) => setDraft((d) => ({ ...d, legs: d.legs.map((l) => (l.key === leg.key ? { ...l, ...p } : l)) }));
  // Solana holders: one asset, written on the leg and as the fixed reward, so the engine and the public pages agree. SOL is in kind.
  const setHoldersAsset = (v) => setDraft((d) => ({
    ...d,
    reward: { ...d.reward, rewardMode: 'fixed', reward: v === SOL_MINT ? 'SOL' : v },
    legs: d.legs.map((l) => (l.key === leg.key ? { ...l, asset: v === SOL_MINT ? '' : v } : l)),
  }));
  const total = totalBps(draft.legs);
  const balanceOthers = () => setDraft((d) => {
    const others = d.legs.filter((l) => l.key !== leg.key);
    const room = 10000 - leg.shareBps;
    const otherTotal = totalBps(others);
    let acc = 0;
    const scaled = others.map((l, i) => {
      const v = i === others.length - 1 ? room - acc : otherTotal ? Math.round((l.shareBps / otherTotal) * room) : Math.round(room / others.length);
      acc += v;
      return { ...l, shareBps: Math.max(0, v) };
    });
    return { ...d, legs: d.legs.map((l) => (l.key === leg.key ? l : scaled.find((s) => s.key === l.key))) };
  });
  const convertMode = leg.asset ? 'convert' : 'kind';
  return (
    <>
      <InspectorHead>
        <div className="flex items-center justify-between gap-3">
          <span className={`label flex items-center gap-1.5 ${k.text}`}><KindIcon className="h-4 w-4" style={{ color: k.color }} />{k.label}</span>
          <span className="figure text-2xl font-medium leading-none tracking-[-0.03em] text-ink">{sharePct(leg.shareBps)}<span className="ml-px text-sm text-mut">%</span></span>
        </div>
        <input value={leg.label} onChange={(e) => patch({ label: e.target.value.slice(0, 40) })} aria-label="Name of this destination" className="mt-2 w-full border-b border-transparent bg-transparent pb-0.5 font-display text-lg font-medium tracking-[-0.02em] text-ink outline-none transition-colors hover:border-white/15 focus:border-cyan-500/60" />
        <p className="mt-1 text-xs leading-snug text-mut">{kindHint(leg.kind, chain)}</p>
      </InspectorHead>
      <Section title="Share of every cycle" aside={total !== 10000 && <button type="button" onClick={balanceOthers} className={textLink}>Balance the others to 100%</button>}>
        <Slider label={k.label} value={leg.shareBps / 100} step={0.5} onChange={(v) => patch({ shareBps: Math.round(v * 100) })} format={(v) => `${v}%`} color={k.color} />
        {/* Every leg on one bar of channels, this one lit */}
        <div className="mt-3.5 flex h-1.5 w-full gap-0.5">
          {draft.legs.map((l) => <div key={l.key} className="rounded-full transition-all" style={{ width: `${l.shareBps / 100}%`, ...channel(KIND[l.kind].color, l.key === leg.key), opacity: l.key === leg.key ? 1 : 0.25 }} />)}
        </div>
        <div className={`mt-1.5 flex items-center justify-between font-mono text-[10.5px] ${total === 10000 ? 'text-mut' : 'text-down'}`}><span>all legs{total !== 10000 ? ', must be 100%' : ''}</span><span className="tabular-nums">{(total / 100).toFixed(1)}%</span></div>
      </Section>
      {(leg.kind === 'wallet' || leg.kind === 'treasury') && (
        <Section title={leg.kind === 'wallet' ? 'Destination address' : 'Treasury wallet'}>
          {/* A Solana address is base58 and case-sensitive: kept exactly as pasted. */}
          <input value={leg.address} onChange={(e) => patch({ address: e.target.value.trim() })} placeholder={sol ? 'A Solana wallet address' : '0x…'} spellCheck={false} autoCapitalize="off" autoCorrect="off" autoComplete="off" className={inputCls} />
          {leg.address && !validAddr(chain, leg.address) && <p className="mt-1 text-xs text-down">{!sol ? 'Not a valid address.' : isEvmAddress(leg.address) ? 'This coin lives on Solana: paste a Solana address, not a 0x one.' : 'Not a Solana address.'}</p>}
          {leg.kind === 'treasury' && <p className="mt-1.5 text-xs text-mut">A wallet you control. {BRAND} only sends to it. Its holdings become the book value on the public dashboard.</p>}
        </Section>
      )}
      {leg.kind === 'page' && <PageSection leg={leg} patch={patch} chain={chain} taken={draft.legs.filter((l) => l.key !== leg.key && l.page).map((l) => `${l.page.platform}:${l.page.handle}`)} />}
      {leg.kind === 'burn' && (
        <Section title="What burns">
          {sol
            ? <p className="text-xs leading-snug text-mut">This share buys <span className="font-mono font-medium text-ink">${sourceSymbol || 'your token'}</span> on Jupiter and burns it: the tokens are destroyed, supply shrinks every cycle. If no route fills at 90% of the fair price, the share goes to the holders that cycle.</p>
            : <p className="text-xs leading-snug text-mut">This share buys <span className="font-mono font-medium text-ink">${sourceSymbol || 'your token'}</span> back and sends it to the burn address. Stocks in this share are sold for ETH first. Supply shrinks every cycle.</p>}
        </Section>
      )}
      {leg.kind === 'holders' && sol && (
        <Section title="Holders are paid in">
          <div className="space-y-2">
            <StockPicker chain="solana" value={leg.asset || SOL_MINT} onChange={setHoldersAsset} />
            <AssetResearch address={leg.asset} />
            <p className="text-[11px] leading-snug text-mut">SOL, an xStock, or any Solana token by mint. Bought on Jupiter each cycle with a 90% fair-price guard; if no route fills, holders are paid in SOL that cycle.</p>
          </div>
          <Callout tone="live" className="mt-2.5 !text-[11px]">Paid by balance, about 18 holders per SOL transaction or 7 per token transaction. Paying in a token skips, for that cycle, a holder whose share is worth less than opening a token account (about 0.002 SOL).</Callout>
        </Section>
      )}
      {leg.kind === 'treasury' && sol && (
        <Section title="Held in">
          <div className="space-y-2">
            <StockPicker chain="solana" value={leg.asset} onChange={(v) => patch({ asset: v })} allowEth={false} allowAddress={false} />
            <AssetResearch address={leg.asset} />
            <p className="text-[11px] leading-snug text-mut">The treasury holds an xStock: each cycle its share buys it on Jupiter with the 90% fair-price guard. If no route fills, that share reaches the treasury in SOL.</p>
          </div>
        </Section>
      )}
      {(leg.kind === 'wallet' || leg.kind === 'page') && sol && (
        <Section title="Payout asset">
          {leg.kind === 'page' && <p className="mb-2.5 text-xs leading-snug text-mut">Pages are paid in SOL unless you choose otherwise. When the owner claims, everything the vault holds is swept to their Solana wallet.</p>}
          <Seg size="sm" value={convertMode} onChange={(v) => patch({ asset: v === 'kind' ? '' : SPYX })}
            options={[{ value: 'kind', icon: InKind, label: 'In SOL' }, { value: 'convert', icon: Convert, label: 'Convert to' }]} />
          {convertMode === 'convert' && (
            <div className="mt-2.5 space-y-2">
              <StockPicker chain="solana" value={leg.asset} onChange={(v) => patch({ asset: v })} />
              <AssetResearch address={leg.asset} />
              <p className="text-[11px] leading-snug text-mut">SOL, an xStock, or any token by mint. Bought on Jupiter with the fair-price guard; if no route fills, this leg is paid in SOL that cycle.</p>
            </div>
          )}
        </Section>
      )}
      {leg.kind === 'holders' && !sol && (
        <Section title="ETH fees convert to">
          <RewardEditor value={draft.reward} onChange={(v) => setDraft((d) => ({ ...d, reward: v }))} />
          <Callout tone="live" className="mt-2.5 !text-[11px]">Not a stock? The second tab of the picker takes any token by contract address, and holders get paid in that token.</Callout>
        </Section>
      )}
      {leg.kind !== 'burn' && !sol && (
        <Section title={leg.kind === 'holders' ? 'Stock fees' : 'Payout asset'}>
          {leg.kind === 'page' && <p className="mb-2.5 text-xs leading-snug text-mut">Pages are paid in ETH unless you choose otherwise: a vault that holds ETH can pay for its own sweep when the owner claims.</p>}
          <Seg size="sm" value={convertMode} onChange={(v) => patch({ asset: v === 'kind' ? '' : leg.kind === 'treasury' ? getStock('SPY').address : leg.kind === 'holders' && draft.reward.rewardMode === 'fixed' && draft.reward.reward !== 'ETH' ? draft.reward.reward : getStock('SPY').address })}
            options={[{ value: 'kind', icon: InKind, label: leg.kind === 'holders' ? 'Paid in kind' : leg.kind === 'treasury' ? 'In kind, ETH buys SPY' : 'As it arrives' }, { value: 'convert', icon: Convert, label: 'Convert all to' }]} />
          {convertMode === 'convert' && (
            <div className="mt-2.5 space-y-2">
              <StockPicker value={leg.asset === ZERO ? 'ETH' : leg.asset} onChange={(v) => patch({ asset: v === 'ETH' ? ZERO : v })} allowEth={leg.kind !== 'treasury'} />
              <AssetResearch address={leg.asset} />
              <p className="text-[11px] leading-snug text-mut">A stock, ETH, or any token by contract address. Swapped with the fair-price guard; if no route fills, this leg pays in kind that cycle.</p>
            </div>
          )}
        </Section>
      )}
      {/* Loyalty weighting runs on Robinhood Chain only: Solana holders are paid by balance. */}
      {leg.kind === 'holders' && !sol && (
        <Section title="Record date and loyalty">
          <LoyaltyEditor value={draft.loyalty} onChange={(v) => setDraft((d) => ({ ...d, loyalty: v }))} />
        </Section>
      )}
      <Section title="Remove">
        <Button variant="danger" className="!py-1.5 text-xs" onClick={onRemove} disabled={draft.legs.length <= 1}>Remove this leg</Button>
        {draft.legs.length <= 1 && <p className="mt-1 text-xs text-mut">Keep at least one destination.</p>}
      </Section>
    </>
  );
}

/** Paste a link, see the page. The page and its vault are created when the routing is saved. */
function PageSection({ leg, patch, taken, chain = 'robinhood' }) {
  const sol = chain === 'solana';
  const [text, setText] = useState(leg.pageInput || '');
  const [state, setState] = useState({ status: 'idle' });
  const seq = useRef(0);
  useEffect(() => {
    const raw = text.trim();
    if (!raw) { setState({ status: 'idle' }); return undefined; }
    const parsed = parsePage(raw);
    if (parsed.error) { setState({ status: 'error', error: parsed.error }); return undefined; }
    if (taken.includes(`${parsed.platform}:${parsed.handle}`)) { setState({ status: 'error', error: 'This page already has a leg. Raise its share instead.' }); return undefined; }
    const mine = ++seq.current;
    setState({ status: 'loading' });
    const t = setTimeout(async () => {
      let info = null;
      try { const res = await fetch(`/api/pages/resolve?input=${encodeURIComponent(raw)}&chain=${chain}`); if (res.ok) info = await res.json(); } catch { /* offline or demo: the parsed page is enough */ }
      if (mine !== seq.current) return;
      // A page has a vault per chain: only one on this coin's chain is shown (on Solana it is made on the first payment).
      const vault = info?.vault && validAddr(chain, info.vault) ? info.vault : null;
      const page = { platform: parsed.platform, handle: parsed.handle, claimed: Boolean(info?.claimed), vault, avatar: info?.avatar || null };
      patch({ page, pageInput: '', ...(KIND_LABELS.has(leg.label) ? { label: pageName(page.platform, page.handle).slice(0, 40) } : {}) });
      setText('');
      setState({ status: 'idle' });
    // Long enough for a name typed by hand to be finished.
    }, 1000);
    return () => clearTimeout(t);
  }, [text]); // eslint-disable-line react-hooks/exhaustive-deps
  const p = leg.page;
  return (
    <Section title="The page" aside={p && <Link href={pagePath(p.platform, p.handle, p.slug)} target="_blank" className={textLink}>Public profile<External className="h-2.5 w-2.5" /></Link>}>
      {p && (
        <div className="mb-2.5 flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-2.5">
          <PageAvatar page={p} size="h-9 w-9" badge="h-4 w-4" lit={p.claimed} />
          <div className="min-w-0 flex-1">
            <div className="truncate text-[13px] font-medium text-ink">{pageName(p.platform, p.handle)}</div>
            <div className="truncate font-mono text-[10.5px] text-mut">{PLATFORMS[p.platform]?.label} {PLATFORMS[p.platform]?.noun}{p.vault ? ` · vault ${shortAddr(p.vault)}` : sol ? ' · vault made on its first payment' : ' · vault created on save'}</div>
          </div>
          <Note tone={p.claimed ? 'live' : 'gold'}>{p.claimed ? 'claimed' : 'unclaimed'}</Note>
        </div>
      )}
      <input value={text} onChange={(e) => setText(e.target.value)} placeholder={p ? 'Paste another link to change it' : 'youtube.com/@yourchannel, github.com/your-project, yoursite.com'} className={inputCls} />
      {state.status === 'loading' && <p className="mt-1.5 flex items-center gap-2 font-mono text-[10.5px] text-mut"><span className="h-3 w-3 shrink-0 animate-spin rounded-full border border-white/10 border-t-cyan-500" />Looking it up…</p>}
      {state.status === 'error' && <p className="mt-1.5 text-xs text-down">{state.error}</p>}
      <div className="mt-2.5 flex items-center gap-2.5">
        <span className="label !text-[9.5px]">Reads</span>
        <span className="flex items-center gap-2">{PLATFORM_KEYS.map((pk) => <span key={pk} title={PLATFORMS[pk].label}><PlatformIcon platform={pk} className="h-3.5 w-3.5" /></span>)}</span>
      </div>
      <p className="mt-2.5 text-xs leading-snug text-mut">{p?.claimed
        ? 'The owner of this page has claimed it: its share goes straight to their wallet every cycle.'
        : sol
          ? 'The owner does not need an account. The share is held in a Solana vault of its own, visible on the public profile. They sign in with the platform (or add a DNS record for a domain), connect a Solana wallet, and receive everything that waited.'
          : 'The owner does not need an account. The share is held in a vault of its own, visible on the public profile. They sign in with the platform (or add a DNS record for a domain), connect a wallet, and receive everything that waited.'}</p>
    </Section>
  );
}
// A leg still wearing a default name takes the name of its page.
const KIND_LABELS = new Set(['Page', 'Wallet', 'Partner wallet']);

function AssetResearch({ address }) {
  const info = useTokenResearch(address || null);
  if (!address) return null;
  if (!info || info.loading) return <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.03] px-3 py-3 font-mono text-[10.5px] text-mut"><span className="h-3 w-3 animate-spin rounded-full border border-white/10 border-t-cyan-500" /> Researching…</div>;
  if (info.error) return <Callout tone="red" icon={Warning}>{info.error}</Callout>;
  return <TokenCard token={info} compact />;
}

function DevKeyReveal({ onRevealKey, address, chain = 'robinhood' }) {
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const [key, setKey] = useState(null);
  const sol = chain === 'solana';
  const reveal = async () => {
    setBusy(true);
    try {
      const r = await onRevealKey();
      // 0x compared without case, base58 exactly.
      if (r?.address && address && !sameAddress(r.address, address)) throw new Error(`Key does not match this ${sol ? 'creator' : 'dev'} wallet`);
      setKey(r.privateKey);
    } catch (e) { toast(e.message, 'err'); } finally { setBusy(false); }
  };
  if (!onRevealKey) return null;
  return (
    <div className="mt-3 rounded-2xl border border-white/10 bg-white/[0.03] p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="text-xs leading-snug"><span className="font-medium text-ink">Your wallet, your key.</span> <span className="text-mut">{sol ? 'Kept encrypted on the server. Reveal it anytime with a fresh signature.' : 'Export it anytime to import the dev wallet elsewhere.'}</span></div>
        {!key && <Button variant="ghost" className="shrink-0 !px-3 !py-1 !text-[11px]" onClick={reveal} busy={busy}>Reveal key</Button>}
      </div>
      {key && (
        <div className="mt-2.5 border-t border-white/[0.07] pt-2.5">
          <div className="break-all rounded-xl border border-down/40 bg-down/[0.08] p-2.5 font-mono text-[10.5px] leading-relaxed text-ink">{key}</div>
          <div className="mt-2 flex items-center gap-1.5"><CopyBtn text={key} label="Copy key" /><button type="button" onClick={() => setKey(null)} className={smallBtn}>Hide</button></div>
          <p className="mt-2 flex items-start gap-1.5 text-[11px] leading-snug text-down"><Warning className="mt-px h-3.5 w-3.5 shrink-0" />Anyone holding this key controls the fees. Store it offline, never paste it in a chat.</p>
        </div>
      )}
    </div>
  );
}

function ActionInspector({ data, act, busy, tg, demo }) {
  const { config, user, telegram } = data;
  const bot = BOT_USERNAME;
  // Group burn alerts run on Robinhood Chain only: a Solana coin binds dividend receipts.
  const sol = chainOfData(data) === 'solana';
  const receipts = telegram?.receiptsChatId ? telegram.receiptsTitle || `chat ${telegram.receiptsChatId}` : null;
  const burns = !sol && telegram?.burnAlerts?.length ? telegram.burnAlerts.map((b) => b.title || `chat ${b.chatId}`).join(', ') : null;
  const Status = ({ ok, icon: StatusIcon, label, to }) => (
    <div className="flex items-center gap-2.5 px-3 py-2">
      <StatusIcon className={`h-4 w-4 shrink-0 ${ok ? 'text-cyan-500' : 'text-dim'}`} />
      <span className="text-xs text-ink">{label}</span>
      <span className={`ml-auto min-w-0 truncate font-mono text-[10.5px] ${ok ? 'text-cyan-500' : 'text-mut'}`}>{ok ? to : 'not bound'}</span>
    </div>
  );
  const Step = ({ n, children }) => (
    <li className="grid grid-cols-[1.25rem_1fr] gap-x-2 text-xs leading-snug text-mut"><span className="font-mono text-[10.5px] leading-[1.5] text-cyan-500">{String(n).padStart(2, '0')}</span><div className="min-w-0">{children}</div></li>
  );
  const Command = ({ shown, text }) => (
    <div className="mt-1.5 flex items-center gap-1.5"><code className="min-w-0 truncate rounded-xl border border-white/10 bg-black/30 px-2.5 py-1 font-mono text-[10.5px] text-ink">{shown}</code><CopyBtn text={text} label="Copy" /></div>
  );
  return (
    <>
      <InspectorHead>
        <span className="label flex items-center gap-1.5"><Telegram className="h-4 w-4 text-[#2AABEE]" />Action · Telegram</span>
        <div className="mt-2 font-display text-lg font-medium tracking-[-0.02em] text-ink">Tell your community, every cycle</div>
        <p className="mt-1 text-xs leading-snug text-mut">{sol
          ? 'The bot posts in your group when the holders leg pays: a receipt card with Share on X.'
          : 'The bot posts in your group when the holders leg pays (a receipt card with Share on X) and when the burn leg burns (the amount, the share of supply gone, the transaction).'}</p>
      </InspectorHead>
      <Section title="Bound groups">
        <div className="divide-y divide-white/[0.07] overflow-hidden rounded-2xl border border-white/10 bg-white/[0.02]">
          <Status ok={Boolean(receipts)} icon={Receipt} label="Dividend receipts" to={receipts} />
          {!sol && <Status ok={Boolean(burns)} icon={Burn} label="Burn alerts" to={burns} />}
        </div>
      </Section>
      {sol ? (
        <Section title="How to bind a group">
          <ol className="space-y-3">
            <Step n={1}>Add {bot ? <a href={`https://t.me/${bot}`} target="_blank" rel="noopener noreferrer" className="font-mono text-hood-600 hover:underline">@{bot}</a> : <>the {BRAND} bot</>} to your Telegram group as admin.</Step>
            <Step n={2}>Link your own Telegram below, so the bot knows your coin.</Step>
            <Step n={3}>In the group, send:<Command shown="/announce" text="/announce" /></Step>
          </ol>
          <p className="mt-3 text-[11px] leading-snug text-mut">Send the command inside a topic to post there. <span className="font-mono text-ink">/announce off</span> stops it. Group burn alerts run on Robinhood Chain only.</p>
        </Section>
      ) : (
      <Section title="How to bind a group">
        <ol className="space-y-3">
          <Step n={1}>Add {bot ? <a href={`https://t.me/${bot}`} target="_blank" rel="noopener noreferrer" className="font-mono text-hood-600 hover:underline">@{bot}</a> : <>the {BRAND} bot</>} to your Telegram group as admin.</Step>
          <Step n={2}>In the group, send one command. It binds both alerts for this coin:<Command shown="/burns" text="/burns" /></Step>
          <Step n={3}>Receipts only, or to move them to another group:<Command shown={`/announce ${shortAddr(config.source_token_address)}`} text={`/announce ${config.source_token_address}`} /></Step>
        </ol>
        <p className="mt-3 text-[11px] leading-snug text-mut">Send the command inside a topic to post there. <span className="font-mono text-ink">/burns off</span> or <span className="font-mono text-ink">/announce off</span> stops it.</p>
      </Section>
      )}
      <Section title="Alerts for you">
        {user.telegramLinked ? (
          <p className="text-xs text-mut">Your account is linked{user.telegramUsername ? ` to @${user.telegramUsername}` : ''}: every cycle's result also reaches you in a private chat.</p>
        ) : (
          <div className="space-y-2">
            <p className="text-xs text-mut">Link your own Telegram to get each cycle's result privately and to steer the policy from your phone.</p>
            {tg ? <a href={tg} target="_blank" rel="noopener noreferrer" className="btn-primary !py-1.5 text-xs">Open Telegram to link <Arrow className="h-3.5 w-3.5" /></a> : <Button variant="ghost" className="!py-1.5 text-xs" onClick={() => act('tg')} busy={busy === 'tg'} disabled={demo}>Link Telegram</Button>}
          </div>
        )}
      </Section>
    </>
  );
}

// On Solana the engine keeps this much SOL in the creator wallet for network fees and routes the rest.
const SOL_RESERVE = 0.02;

/** Solana: the schedules the engine runs there and the market-hours hold. Fees come from pump.fun, so there is no fee source to pick. */
function SolScheduleEditor({ value, onChange }) {
  const set = (p) => onChange({ ...value, ...p });
  return (
    <div className="space-y-3">
      <div>
        <div className="label mb-1.5">A cycle fires</div>
        <Seg value={value.schedule} onChange={(v) => set({ schedule: v })} options={SOL_SCHEDULES} size="sm" />
      </div>
      <Toggle checked={value.marketHoursOnly} onChange={(v) => set({ marketHoursOnly: v })} label="Market hours only" hint="Skip cycles outside 9:30 to 16:00 New York time, weekdays" />
      <p className="text-[11px] leading-snug text-mut">Each cycle collects the coin&apos;s pump.fun creator fees (bonding curve and PumpSwap) into the creator wallet, then routes them. Under 0.005 SOL to route, the cycle waits for the next one.</p>
    </div>
  );
}

function SourceInspector({ data, draft, setDraft, act, busy, tg, onRevealKey }) {
  const { config, assets, user } = data;
  const chain = chainOfData(data);
  const sol = chain === 'solana';
  const eth = assets?.assets?.find((a) => a.isNative);
  const lowGas = eth && eth.amount < (sol ? SOL_RESERVE : assets.gasReserveEth || 0.002);
  return (
    <>
      <InspectorHead caption={sol ? 'Creator wallet' : 'Dev wallet'}>
        <div className="mt-2 break-all font-mono text-xs leading-relaxed text-ink">{config.dev_wallet_public}</div>
        <div className="mt-2 flex gap-1.5"><CopyBtn text={config.dev_wallet_public} label="Copy address" /><a href={explorerAddress(config.dev_wallet_public)} target="_blank" rel="noopener noreferrer" className={smallBtn}>{sol ? 'Solscan' : 'Explorer'}<External className="h-2.5 w-2.5" /></a></div>
        <p className="mt-2.5 text-xs leading-snug text-mut">{sol
          ? `The wallet that created the coin on pump.fun. Each cycle collects its creator fees here, keeps ${SOL_RESERVE} SOL for network fees and routes the rest.`
          : 'Set this address as the fee recipient on your launchpad. Whatever lands here is what the next cycle routes.'}</p>
        {lowGas && (sol
          ? <Callout icon={Gas} className="mt-2.5">Under the fee reserve: <span className="font-mono text-ink">{fmtNum(eth.amount)} SOL</span>. Cycles keep {SOL_RESERVE} SOL here for network fees and route only what is above it.</Callout>
          : <Callout icon={Gas} className="mt-2.5">Low gas: <span className="font-mono text-ink">{fmtNum(eth.amount)} ETH</span>. Send about 0.005 ETH so cycles can pay transfers.</Callout>)}
        <DevKeyReveal onRevealKey={onRevealKey} address={config.dev_wallet_public} chain={chain} />
      </InspectorHead>
      <Section title="Holdings" aside={assets && <span className="figure text-sm text-ink">{fmtUsd(assets.totalUsd)}</span>}>
        {assets?.error && <p className="text-xs text-down">{assets.error}</p>}
        <div className="divide-y divide-white/[0.06]">
          {(assets?.assets || []).map((a) => (
            <div key={a.address} className="grid grid-cols-[auto_1fr_auto_4.5rem] items-center gap-2 py-2">
              <StockLogo address={a.address} meta={{ symbol: a.symbol, image: a.image }} size="h-5 w-5" text="text-[6px]" />
              <span className="truncate font-mono text-xs text-ink">{a.symbol}</span>
              <span className="font-mono text-[11px] tabular-nums text-mut">{fmtNum(a.amount)}</span>
              <span className="figure text-right text-xs text-ink">{fmtUsd(a.usd)}</span>
            </div>
          ))}
          {assets && !(assets.assets || []).some((a) => a.usd >= 0.01 || a.amount > 0) && <div className="py-2 text-xs text-mut">Empty so far.</div>}
        </div>
        {sol && assets && <p className="mt-2 text-[11px] leading-snug text-mut">A cycle routes the SOL above the {SOL_RESERVE} SOL reserve. Other tokens in this wallet stay where they are.</p>}
      </Section>
      <Section title={sol ? 'Schedule' : 'Schedule and fee source'}>
        {sol
          ? <SolScheduleEditor value={draft.schedule} onChange={(v) => setDraft((d) => ({ ...d, schedule: v }))} />
          : <ScheduleEditor value={draft.schedule} onChange={(v) => setDraft((d) => ({ ...d, schedule: v }))} />}
      </Section>
      <Section title="Telegram remote">
        {user.telegramLinked ? (
          <p className="text-xs text-mut">Linked{user.telegramUsername ? ` to @${user.telegramUsername}` : ''}. Send <span className="font-mono text-ink">/announce</span> in your group so each dividend posts a receipt card there.</p>
        ) : (
          <div className="space-y-2">
            <p className="text-xs text-mut">Cycle results, receipt cards in your group, and the same routing controllable from the bot.</p>
            {tg ? <a href={tg} target="_blank" rel="noopener noreferrer" className="btn-primary !py-1.5 text-xs">Open Telegram to link <Arrow className="h-3.5 w-3.5" /></a> : <Button variant="ghost" className="!py-1.5 text-xs" onClick={() => act('tg')} busy={busy === 'tg'}>Link Telegram</Button>}
          </div>
        )}
      </Section>
      <Section title="Danger zone">
        <p className="mb-2 text-xs text-mut">{sol ? `Deleting stops the cycles and removes ${BRAND}'s copy of the creator wallet key. The wallet and its funds stay yours.` : "Deleting removes the bot's access to the dev wallet. Move its funds out first."}</p>
        <Button variant="danger" className="!py-1.5 text-xs" onClick={() => act('delete')} busy={busy === 'delete'}>Delete this policy</Button>
      </Section>
    </>
  );
}

function DevWalletCard({ data, select }) {
  const { config, assets } = data;
  if (!config?.dev_wallet_public) return null;
  const sol = chainOfData(data) === 'solana';
  const list = (assets?.assets || []).filter((a) => a.amount > 0 || a.usd >= 0.01);
  const eth = list.find((a) => a.isNative);
  const lowGas = eth ? eth.amount < (sol ? SOL_RESERVE : assets?.gasReserveEth || 0.002) : Boolean(assets);
  const top = list.filter((a) => !a.isNative).sort((a, b) => (b.usd || 0) - (a.usd || 0)).slice(0, 4);
  // On Solana what waits is the SOL above the reserve: its dollar value, from the SOL row's own price.
  const solRoutableUsd = eth && eth.amount > 0 && eth.usd != null ? eth.usd * ((eth.spendable ?? eth.amount) / eth.amount) : 0;
  return (
    <div className="border-b border-white/[0.07] px-4 py-4">
      <div className="flex items-center justify-between gap-2">
        <div className="label">{sol ? 'Creator wallet' : 'Dev wallet'}</div>
        <div className="flex items-center gap-1.5"><CopyBtn text={config.dev_wallet_public} label={shortAddr(config.dev_wallet_public)} /><a href={explorerAddress(config.dev_wallet_public)} target="_blank" rel="noopener noreferrer" title={sol ? 'Open in Solscan' : 'Open in the explorer'} className={`${smallBtn} !px-2`}><External className="h-3 w-3" /></a></div>
      </div>
      {sol ? (
        <div className="mt-3 flex items-end justify-between gap-3">
          <div className="min-w-0">
            <div className="figure text-4xl font-medium leading-none tracking-[-0.03em] text-ink">{assets ? fmtNum(eth?.spendable || 0) : '…'}<span className="ml-1.5 text-base text-mut">SOL</span></div>
            <div className="mt-1.5 text-[11px] text-mut">{assets ? `${fmtUsd(solRoutableUsd)} ` : ''}waiting to be routed {config.scheduleLabel ? config.scheduleLabel.toLowerCase() : ''}</div>
          </div>
          {eth && <div title={`SOL in the creator wallet; ${SOL_RESERVE} SOL stays for network fees`} className={`flex shrink-0 items-center gap-1 font-mono text-[10.5px] tabular-nums ${lowGas ? 'text-gold-600' : 'text-mut'}`}><Gas className="h-3.5 w-3.5" />{fmtNum(eth.amount)} SOL</div>}
        </div>
      ) : (
      <div className="mt-3 flex items-end justify-between gap-3">
        <div>
          <div className="figure text-4xl font-medium leading-none tracking-[-0.03em] text-ink">{assets ? fmtUsd(assets.totalUsd || 0) : '…'}</div>
          <div className="mt-1.5 text-[11px] text-mut">waiting to be routed {config.scheduleLabel ? config.scheduleLabel.toLowerCase() : ''}</div>
        </div>
        {eth && <div title="Gas in the dev wallet" className={`flex items-center gap-1 font-mono text-[10.5px] tabular-nums ${lowGas ? 'text-gold-600' : 'text-mut'}`}><Gas className="h-3.5 w-3.5" />{fmtNum(eth.amount)} ETH</div>}
      </div>
      )}
      {assets?.error && <p className="mt-2 text-xs text-down">{assets.error}</p>}
      {top.length > 0 && sol && <div className="label mt-3.5 !text-[9.5px]">Other tokens here, not routed</div>}
      {top.length > 0 && (
        <div className={`${sol ? 'mt-1.5' : 'mt-3.5'} divide-y divide-white/[0.06] border-y border-white/[0.07]`}>
          {top.map((a) => (
            <div key={a.address} className="grid grid-cols-[auto_1fr_auto_4.5rem] items-center gap-2 py-1.5">
              <StockLogo address={a.address} meta={{ symbol: a.symbol, image: a.image }} size="h-4 w-4" text="text-[5px]" />
              <span className="truncate font-mono text-xs text-ink">{a.symbol}</span>
              <span className="font-mono text-[11px] tabular-nums text-mut">{fmtNum(a.amount)}</span>
              <span className="figure text-right text-xs text-ink">{fmtUsd(a.usd)}</span>
            </div>
          ))}
        </div>
      )}
      {assets && list.length === 0 && <p className="mt-2.5 text-xs leading-snug text-mut">{sol ? 'Empty so far. Each cycle collects the pump.fun creator fees of your coin here, then routes them.' : 'Empty so far. Point your launchpad fee recipient here; the next cycle routes whatever lands.'}</p>}
      {lowGas && assets && <Callout icon={Gas} className="mt-2.5">{sol ? `Under the ${SOL_RESERVE} SOL fee reserve. Cycles keep that much here for network fees and route what is above it.` : 'Low gas. Send about 0.005 ETH so cycles can pay the transfers.'}</Callout>}
      <button type="button" onClick={() => select(SOURCE_ID)} className={`mt-2.5 ${textLink}`}>All holdings and settings<Arrow className="h-2.5 w-2.5" /></button>
    </div>
  );
}

function RoutingSummary({ draft, meta, select, data, chain = 'robinhood' }) {
  const total = totalBps(draft.legs);
  const sol = chain === 'solana';
  return (
    <>
      {data && <DevWalletCard data={data} select={select} />}
      <div className="px-4 pt-4">
        <div className="label">Routing</div>
        <div className="mt-2 font-display text-lg font-medium tracking-[-0.02em] text-ink">Where every cycle goes</div>
        <p className="mt-1 text-xs leading-snug text-mut">Click a node to edit it. Drag to arrange. Shares must total 100%.</p>
        {/* The split as one bar of channels, each lit in the colour of its leg */}
        <div className="mt-4 flex h-2 w-full gap-0.5">{draft.legs.map((l) => <div key={l.key} style={{ width: `${l.shareBps / 100}%`, ...channel(KIND[l.kind].color) }} className="rounded-full transition-all" />)}</div>
      </div>
      {/* The routing as a ledger: one line per destination, in the order of the canvas */}
      <div className="mt-4 divide-y divide-white/[0.06] border-y border-white/[0.07]">
        {draft.legs.map((l) => {
          const k = KIND[l.kind];
          const RowIcon = k.icon;
          const bad = legProblem(l, chain);
          // On Solana in kind is SOL: every leg but the burn shows what it pays in.
          const shown = l.asset || (sol && l.kind !== 'burn' ? SOL_MINT : '');
          return (
            <button key={l.key} type="button" onClick={() => select(l.key)} className="group relative flex w-full items-center gap-2.5 px-4 py-2.5 text-left transition-colors hover:bg-white/[0.04] focus-visible:bg-white/[0.04] focus-visible:outline-none">
              <span aria-hidden="true" className="absolute inset-y-2 left-0 w-[2px] rounded-full opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100" style={{ background: k.color, boxShadow: `0 0 10px ${k.color}` }} />
              {l.kind === 'page' && l.page ? <PageAvatar page={l.page} size="h-5 w-5" badge="" /> : <RowIcon className="h-5 w-5 shrink-0" style={{ color: k.color }} />}
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[13px] text-ink">{l.label}</span>
                <span className={`block truncate font-mono text-[10px] ${bad ? 'text-down' : 'text-mut'}`}>{bad || (l.kind === 'page' && l.page ? PLATFORMS[l.page.platform]?.label : (l.kind === 'wallet' || l.kind === 'treasury') && validAddr(chain, l.address) ? shortAddr(l.address) : k.label.toLowerCase())}</span>
              </span>
              {shown ? <StockLogo address={shown} meta={meta?.[shown]} size="h-4 w-4" text="text-[5px]" /> : null}
              <span className="figure w-12 text-right text-sm text-cyan-500">{sharePct(l.shareBps)}%</span>
              <Arrow className="h-3 w-3 shrink-0 text-mut opacity-0 transition-opacity group-hover:opacity-100" />
            </button>
          );
        })}
      </div>
      <div className={`flex items-center justify-between px-4 py-2.5 ${total === 10000 ? 'text-mut' : 'text-down'}`}><span className="label !text-current">Total</span><span className="figure text-sm">{(total / 100).toFixed(1)}%</span></div>
    </>
  );
}

function Cycles({ logs, meta, onClose, chain = 'robinhood' }) {
  return (
    <div className={`frame absolute bottom-4 left-4 z-20 flex max-h-[60%] w-[440px] max-w-[calc(100%-2rem)] flex-col overflow-hidden shadow-soft ${floatGlass}`}>
      <div className="flex shrink-0 items-center justify-between border-b border-white/[0.07] px-4 py-3"><span className="label">Recent cycles</span><button type="button" onClick={onClose} aria-label="Close" className="flex h-6 w-6 items-center justify-center rounded-full text-mut transition-colors hover:bg-white/[0.06] hover:text-ink"><Close className="h-3.5 w-3.5" /></button></div>
      <div className="min-h-0 divide-y divide-white/[0.06] overflow-y-auto">
        {logs.length === 0 && <p className="px-4 py-3 text-xs text-mut">No cycle yet.</p>}
        {logs.map((l) => {
          const r = describeAddress(l.reward_token_used, meta[l.reward_token_used]);
          const paid = Number(l.total_airdropped || 0) > 0;
          const state = l.status === 'success' ? (paid ? 'paid' : 'idle') : 'failed';
          return (
            <div key={l.id} className="px-4 py-2.5 text-xs">
              <div className="flex items-center justify-between gap-2">
                <span className="font-mono text-[10.5px] text-mut">{new Date(l.execution_time).toLocaleString()}</span>
                <span className="flex items-center gap-3">
                  {paid && <Link href={`/receipt/${l.id}`} className={textLink}>receipt</Link>}
                  {l.tx_hash && <a href={explorerTx(l.tx_hash)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-0.5 font-mono text-[10.5px] text-mut hover:text-ink">tx<External className="h-2.5 w-2.5" /></a>}
                  <Note tone={state === 'paid' ? 'live' : state === 'failed' ? 'red' : 'mut'}>{state}</Note>
                </span>
              </div>
              <div className="mt-1.5 space-y-1 text-mut">
                {paid && <div className="flex items-center gap-1.5"><StockLogo address={l.reward_token_used} meta={{ symbol: r.symbol }} size="h-4 w-4" text="text-[6px]" /><span className="font-mono tabular-nums text-ink">{fmtNum(units(l.total_airdropped, decimalsOf(l.reward_token_used, meta, chain)))} {r.symbol}</span> to {l.holder_count} holders</div>}
                {(l.legs || []).map((x, i) => {
                  const LegIcon = KIND[x.kind]?.icon || Wallet;
                  return (
                    <div key={i} className={`flex items-center gap-1.5 ${x.failed ? 'text-down' : ''}`}>
                      <LegIcon className="h-4 w-4 shrink-0" style={x.failed ? undefined : { color: KIND[x.kind]?.color }} />
                      {x.failed ? <span className="min-w-0">{x.label}: {x.failed}</span> : <span className="font-mono tabular-nums text-ink">{fmtNum(units(x.output?.amount, x.output?.decimals ?? (chain === 'solana' ? decimalsOf(x.output?.token, meta, chain) : 18)))} {x.output?.symbol || ''}</span>}
                      {!x.failed && x.page ? <span className="inline-flex min-w-0 items-center gap-1">to <PlatformIcon platform={x.page.platform} className="h-3 w-3 shrink-0" /><Link href={pagePath(x.page.platform, x.page.handle)} target="_blank" className="truncate font-medium text-hood-600 hover:underline">{pageName(x.page.platform, x.page.handle)}</Link></span> : null}
                    </div>
                  );
                })}
                {l.error_message && <div className="flex items-start gap-1.5 text-gold-600"><Warning className="mt-px h-3.5 w-3.5 shrink-0" />{l.error_message}</div>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ---------------- the studio ---------------- */
/** Step-by-step overlay shown once after the first policy is created. */
const TOUR = [
  { title: 'This is your coin', body: 'Fees from your launchpad land in this dev wallet. Everything that lands here gets routed at the closing bell. Click the node to see holdings, schedule and the Telegram link.', pos: 'left-[24%] top-[40%]' },
  { title: 'These are the legs', body: 'Each card is a destination with a share of every cycle. Holders is the dividend. Click a leg to change its share, its destination and the asset it is paid in: a stock, ETH, or any token by contract address.', pos: 'right-[26%] top-[30%]' },
  { title: 'Add destinations', body: 'A page on the internet (paste the link of a YouTube channel, a GitHub account, a domain), a partner wallet, a buyback and burn, a stock treasury. Add as many as you like; shares must add up to 100%.', pos: 'right-[26%] top-[6%]' },
  { title: 'Actions: your Telegram', body: 'The dashed node on the right is what happens off-chain: dividend receipts and burn alerts posted in your group. Click it to bind a group with one command.', pos: 'right-[26%] top-[50%]' },
  { title: 'Save, then let it run', body: 'Save routing writes the policy. Run now fires a cycle immediately. Cycles shows every payout with its receipt. You can change anything, any time.', pos: 'right-[6%] top-[12%]' },
];
// The same tour for a coin on Solana: pump.fun fees, SOL, xStocks, receipts only.
const SOL_TOUR = [
  { ...TOUR[0], body: 'Each cycle collects your coin\'s pump.fun creator fees into this creator wallet, keeps 0.02 SOL for network fees and routes the rest on your schedule. Click the node to see holdings, schedule and the Telegram link.' },
  { ...TOUR[1], body: 'Each card is a destination with a share of every cycle. Holders is the dividend. Click a leg to change its share, its destination and the asset it is paid in: SOL, an xStock, or any token by mint.' },
  { ...TOUR[2], body: 'A page on the internet (paste the link of a YouTube channel, a GitHub account, a domain), a partner wallet, a buyback and burn, a treasury in an xStock. Add as many as you like; shares must add up to 100%.' },
  { ...TOUR[3], body: 'The dashed node on the right is what happens off-chain: dividend receipts posted in your group. Click it to see how to bind a group.' },
  TOUR[4],
];
function Tour({ onDone, chain = 'robinhood' }) {
  const [i, setI] = useState(0);
  const steps = chain === 'solana' ? SOL_TOUR : TOUR;
  const step = steps[i];
  return (
    <div className="pointer-events-none absolute inset-0 z-40">
      <div className="pointer-events-auto absolute inset-0 bg-[rgba(5,7,12,0.66)] backdrop-blur-[2px]" onClick={onDone} />
      <div className={`frame pointer-events-auto absolute w-[360px] shadow-glow reveal-pop ${floatGlass} ${step.pos}`}>
        <div className="flex items-center justify-between gap-3 border-b border-white/[0.07] px-4 py-3">
          <span className="label text-cyan-500">Quick tour</span>
          <span className="flex items-center gap-1" aria-label={`Step ${i + 1} of ${steps.length}`}>{steps.map((_, n) => <span key={n} className={`h-1 w-4 rounded-full transition-all ${n <= i ? 'beam shadow-[0_0_6px_rgba(47,168,255,0.6)]' : 'bg-white/10'}`} />)}</span>
        </div>
        <div className="px-4 py-4">
          <div className="font-display text-lg font-medium tracking-[-0.02em] text-ink">{step.title}</div>
          <p className="mt-1 text-[13px] leading-snug text-mut">{step.body}</p>
        </div>
        <div className="flex items-center justify-between border-t border-white/[0.07] px-4 py-3">
          <button type="button" onClick={onDone} className="text-xs text-mut hover:text-ink">Skip</button>
          <Button className="!px-3.5 !py-1.5 text-xs" onClick={() => (i + 1 < steps.length ? setI(i + 1) : onDone())}>{i + 1 < steps.length ? 'Next' : 'Got it'}{i + 1 < steps.length && <Arrow className="h-3 w-3" />}</Button>
        </div>
      </div>
    </div>
  );
}

function StudioInner({ data, refresh, onLogout, onSwitchWallet, demo = false, onConnect, setup = false, onCreated, onRevealKey }) {
  const [guide, setGuide] = useState(true);
  const [tour, setTour] = useState(false);
  useEffect(() => {
    if (demo || setup) return;
    try { if (!localStorage.getItem('delta:tour-done')) setTour(true); } catch { /* ignore */ }
  }, [demo, setup]);
  const endTour = () => { setTour(false); try { localStorage.setItem('delta:tour-done', '1'); } catch { /* ignore */ } };
  const { config, assets, logs, meta, user } = data;
  // Everything the creator sees and writes follows the coin's chain: Solana or Robinhood Chain.
  const chain = chainOfData(data);
  const sol = chain === 'solana';
  const toast = useToast();
  const src = meta[config.source_token_address] || {};
  const initial = useMemo(() => draftFromData(data), [data]);
  const [draft, setDraft] = useState(initial);
  const [selected, setSelected] = useState(null);
  const [busy, setBusy] = useState(null);
  const [tg, setTg] = useState(null);
  const [showCycles, setShowCycles] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [launched, setLaunched] = useState(null);
  const dirty = JSON.stringify(stripPos(draft)) !== JSON.stringify(stripPos(initial));
  const initialKey = JSON.stringify(stripPos(initial));
  useEffect(() => { setDraft((d) => (JSON.stringify(stripPos(d)) === initialKey ? initial : d)); }, [initialKey, initial]); // refreshes keep the draft when dirty

  const total = totalBps(draft.legs);
  const problems = draft.legs.map((l) => legProblem(l, chain)).filter(Boolean);
  const canSave = dirty && total === 10000 && problems.length === 0 && draft.legs.length > 0;

  // React Flow owns node positions while dragging (no re-render of node contents per frame,
  // which is what made the logos blink). Positions are copied into the draft on drag stop;
  // node contents are rebuilt only when something other than a position changes.
  const [nodes, setNodes, onNodesChangeRF] = useNodesState([]);
  const contentSig = JSON.stringify([draft.legs.map(({ posX, posY, ...l }) => l), selected, src.symbol, config.is_active, config.scheduleLabel, config.dev_wallet_public, (assets?.assets || []).map((a) => [a.address, a.amount]), Object.keys(meta || {})]);
  useEffect(() => {
    setNodes((prev) => {
      const pos = new Map(prev.map((n) => [n.id, n.position]));
      return [
        { id: SOURCE_ID, type: 'source', position: pos.get(SOURCE_ID) || draft.sourcePos, data: { src, config, assets, chain, selected: selected === SOURCE_ID }, draggable: true },
        ...draft.legs.map((leg) => ({ id: leg.key, type: 'leg', position: pos.get(leg.key) || { x: leg.posX, y: leg.posY }, data: { leg, meta, chain, sourceSymbol: src.symbol, source: { address: config.source_token_address, meta: src }, selected: selected === leg.key, notify: leg.kind === 'holders' ? Boolean(data.telegram?.receiptsChatId) : leg.kind === 'burn' && !sol ? Boolean(data.telegram?.burnAlerts?.length) : false } })),
        { id: TG_ID, type: 'action', position: pos.get(TG_ID) || { x: Math.max(ACTION_X, ...draft.legs.map((l) => l.posX + 330)), y: draft.legs.length ? draft.legs.reduce((s, l) => s + l.posY, 0) / draft.legs.length : 30 }, data: { telegram: data.telegram, sourceSymbol: src.symbol, chain, selected: selected === TG_ID }, draggable: true },
      ];
    });
  }, [contentSig]); // eslint-disable-line react-hooks/exhaustive-deps
  // Discard (draft reset) must also snap nodes back to the saved positions.
  const posSig = JSON.stringify([draft.sourcePos, draft.legs.map((l) => [l.key, l.posX, l.posY])]);
  useEffect(() => {
    setNodes((prev) => prev.map((n) => {
      const leg = draft.legs.find((l) => l.key === n.id);
      const target = n.id === SOURCE_ID ? draft.sourcePos : leg ? { x: leg.posX, y: leg.posY } : null;
      return target && (target.x !== n.position.x || target.y !== n.position.y) ? { ...n, position: target } : n;
    }));
  }, [posSig]); // eslint-disable-line react-hooks/exhaustive-deps
  const edges = useMemo(() => [
    ...draft.legs.map((leg) => ({ id: `e-${leg.key}`, source: SOURCE_ID, target: leg.key, type: 'share', data: { shareBps: leg.shareBps, color: KIND[leg.kind].color, active: demo || setup ? true : Boolean(config.is_active) } })),
    // Group burn alerts run on Robinhood Chain only: on Solana the burn leg posts nothing.
    ...draft.legs.filter((l) => l.kind === 'holders' || (l.kind === 'burn' && !sol)).map((leg) => ({
      id: `n-${leg.key}`, source: leg.key, target: TG_ID, type: 'notify',
      data: { label: leg.kind === 'burn' ? 'burn alert' : 'receipt', active: leg.kind === 'burn' ? Boolean(data.telegram?.burnAlerts?.length) : Boolean(data.telegram?.receiptsChatId) },
    })),
  ], [draft.legs, config.is_active, demo, setup, data.telegram, sol]);

  const onNodesChange = useCallback((changes) => onNodesChangeRF(changes.filter((c) => c.type !== 'remove')), [onNodesChangeRF]);
  const onNodeDragStop = useCallback((_, node) => {
    const p = { x: Math.round(node.position.x), y: Math.round(node.position.y) };
    setDraft((d) => (node.id === SOURCE_ID ? { ...d, sourcePos: p } : { ...d, legs: d.legs.map((l) => (l.key === node.id ? { ...l, posX: p.x, posY: p.y } : l)) }));
  }, []);

  function addLeg(kind) {
    setAddOpen(false);
    if (kind === 'holders' && draft.legs.some((l) => l.kind === 'holders')) return toast('There is already a holders leg.', 'err');
    const key = `new-${Date.now().toString(36)}`;
    const share = 1000;
    setDraft((d) => {
      // take the new share from the biggest leg so the total stays at 100%
      const biggest = [...d.legs].sort((a, b) => b.shareBps - a.shareBps)[0];
      const legs = d.legs.map((l) => (biggest && l.key === biggest.key && l.shareBps >= share ? { ...l, shareBps: l.shareBps - share } : l));
      const taken = biggest && biggest.shareBps >= share;
      const ys = legs.map((l) => l.posY);
      // A new page is paid in the native coin (ETH on Robinhood Chain, SOL in kind on Solana). On Solana a treasury
      // starts in SPYx and a holders leg in the fixed reward, which the engine pays when the leg names nothing.
      const asset = sol ? (kind === 'treasury' ? SPYX || '' : kind === 'holders' && d.reward.reward !== 'SOL' ? d.reward.reward : '') : kind === 'page' ? ZERO : '';
      return { ...d, legs: [...legs, { key, kind, shareBps: taken ? share : 0, address: '', asset, label: kind === 'wallet' ? 'Partner wallet' : KIND[kind].label, posX: LEG_X, posY: (ys.length ? Math.max(...ys) : -LEG_GAP + 30) + LEG_GAP, ...(kind === 'page' ? { page: null, pageInput: '' } : {}) }] };
    });
    setSelected(key);
  }
  function removeLeg(key) {
    setDraft((d) => {
      const gone = d.legs.find((l) => l.key === key);
      const rest = d.legs.filter((l) => l.key !== key);
      const sink = rest.find((l) => l.kind === 'holders') || rest[0];
      return { ...d, legs: rest.map((l) => (sink && l.key === sink.key ? { ...l, shareBps: l.shareBps + (gone?.shareBps || 0) } : l)) };
    });
    setSelected(null);
  }

  async function save() {
    if (demo) { toast('This is the sample policy. Connect a wallet to route your own coin.'); onConnect?.(); return; }
    if (setup) { setGuide(true); return; }
    setBusy('save');
    try {
      const s = parseSchedule(draft.schedule.schedule);
      const body = sol ? {
        // Solana: addresses and mints exactly as typed (base58 is case-sensitive). In kind ('' → null) is SOL; a burn has no asset.
        legs: draft.legs.map((l, i) => ({ kind: l.kind, shareBps: l.shareBps, address: l.address || null, asset: l.kind === 'burn' ? null : l.asset || null, label: l.label, posX: l.posX, posY: l.posY, sortOrder: i, ...(l.kind === 'page' ? { page: { platform: l.page.platform, handle: l.page.handle } } : {}) })),
        // One reward: 'SOL', an xStock mint or any mint. Rotating modes, loyalty and the LP fee source are Robinhood Chain only, so they are not sent.
        reward_mode: 'fixed', basket: null, reward: draft.reward.reward || 'SOL',
        ...s, market_hours_only: draft.schedule.marketHoursOnly,
      } : {
        legs: draft.legs.map((l, i) => ({ kind: l.kind, shareBps: l.shareBps, address: l.address || null, asset: l.asset || null, label: l.label, posX: l.posX, posY: l.posY, sortOrder: i, ...(l.kind === 'page' ? { page: { platform: l.page.platform, handle: l.page.handle } } : {}) })),
        reward_mode: draft.reward.rewardMode, basket: draft.reward.rewardMode === 'portfolio' ? draft.reward.basket : null,
        ...(draft.reward.rewardMode === 'fixed' ? { reward: draft.reward.reward } : {}),
        ...s, market_hours_only: draft.schedule.marketHoursOnly, fee_source: draft.schedule.feeSource,
        loyalty_enabled: draft.loyalty.enabled, loyalty_max_bps: draft.loyalty.maxBps, loyalty_ramp_days: draft.loyalty.rampDays, loyalty_min_hold_hours: draft.loyalty.minHoldHours, loyalty_sell_reset: draft.loyalty.sellReset,
      };
      const res = await fetch('/api/app/config', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || 'Save failed');
      toast('Routing saved. The next cycle follows it.');
      refresh();
    } catch (e) {
      toast(e.message, 'err');
    } finally {
      setBusy(null);
    }
  }

  async function act(kind) {
    setAddOpen(false);
    if (demo) { toast(kind === 'tg' ? 'Connect a wallet first, then link Telegram.' : 'Connect a wallet to run this on your own coin.'); onConnect?.(); return; }
    if (setup) { setGuide(true); return; }
    setBusy(kind);
    try {
      if (kind === 'run') {
        const res = await fetch('/api/app/config/run', { method: 'POST' });
        const d = await res.json();
        if (!res.ok) throw new Error(d.error);
        toast('Cycle started. Results land in Cycles and on Telegram in a minute or two.');
      } else if (kind === 'pause' || kind === 'resume') {
        const res = await fetch('/api/app/config', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ is_active: kind === 'resume' }) });
        if (!res.ok) throw new Error((await res.json()).error);
        toast(kind === 'resume' ? 'Resumed.' : 'Paused. No cycles until you resume.');
        refresh();
      } else if (kind === 'delete') {
        if (!window.confirm(sol ? `Delete this policy? Cycles stop and ${BRAND} deletes its copy of the creator wallet key. The wallet stays yours.` : 'Delete this policy? The bot loses access to the dev wallet. Withdraw its funds first.')) return;
        const res = await fetch('/api/app/config', { method: 'DELETE' });
        if (!res.ok) throw new Error((await res.json()).error);
        toast('Deleted.');
        refresh();
      } else if (kind === 'tg') {
        const res = await fetch('/api/app/telegram-link', { method: 'POST' });
        const d = await res.json();
        if (!res.ok) throw new Error(d.error);
        setTg(d.url);
      }
    } catch (e) {
      toast(e.message, 'err');
    } finally {
      setBusy(null);
    }
  }

  useEffect(() => {
    const onKey = (e) => { if ((e.key === 'Delete' || e.key === 'Backspace') && selected && selected !== SOURCE_ID && !['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName)) removeLeg(selected); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [selected]); // eslint-disable-line react-hooks/exhaustive-deps

  const selectedLeg = draft.legs.find((l) => l.key === selected);

  return (
    <div className="relative flex h-full min-h-0 flex-col bg-ground">
      {/* Top bar */}
      {/* z-30: the blur makes the bar a layer of its own, so its menus must sit above the canvas (and under the tour and the guide) */}
      <div className="relative z-30 flex min-h-[3.5rem] shrink-0 flex-wrap items-stretch gap-y-2 border-b border-white/10 bg-[rgba(9,12,19,0.72)] backdrop-blur-xl">
        {/* Who: the coin */}
        <div className="flex min-w-0 items-center gap-3 px-4 py-2">
          <StockLogo address={config.source_token_address} meta={src} size="h-8 w-8" text="text-[9px]" />
          <div className="min-w-0">
            <div className="flex items-baseline gap-1.5"><span className="truncate font-display text-[15px] font-medium leading-tight tracking-[-0.02em] text-ink">{src.name || `$${src.symbol}`}</span><span className="font-mono text-[11px] text-mut">${src.symbol}</span></div>
            <div className="mt-0.5 flex items-center gap-1.5">
              <CopyBtn text={config.source_token_address} label={shortAddr(config.source_token_address)} />
              <Link href={`/${config.source_token_address}`} target="_blank" className={smallBtn} title="The public page of your coin: share it with your community">Community page<External className="h-2.5 w-2.5" /></Link>
            </div>
          </div>
        </div>
        {/* State: running or not, when, how much waits */}
        <div className="hidden items-center gap-4 border-l border-white/10 px-4 lg:flex">
          <RunBadge active={config.is_active} />
          {config.is_active && <div><div className="label !text-[9.5px]">Next cycle</div><div className="figure text-[15px] leading-tight text-cyan-500"><Countdown intervalMinutes={config.interval_minutes} scheduleKind={config.schedule_kind} /></div></div>}
          <div className="hidden xl:block"><div className="label !text-[9.5px]">Schedule</div><div className="text-xs leading-tight text-ink">{config.scheduleLabel}</div></div>
          {assets && <div className="hidden xl:block"><div className="label !text-[9.5px]">{sol ? 'Creator wallet' : 'Dev wallet'}</div><div className="figure text-[15px] leading-tight text-ink">{fmtUsd(assets.totalUsd || 0)}</div></div>}
          {data.yield?.apy ? <div className="hidden 2xl:block"><div className="label !text-[9.5px]">Yield</div><div className="figure text-[15px] leading-tight text-ink">{data.yield.apy.toFixed(1)}%</div></div> : null}
        </div>
        <div className="flex items-center lg:hidden"><RunBadge active={config.is_active} /></div>
        {/* Actions */}
        <div className="ml-auto flex flex-wrap items-center gap-1.5 px-4 py-2">
          <div className="relative">
            <Button variant="ghost" className="!px-3 !py-1.5 text-xs" aria-expanded={addOpen} onClick={() => setAddOpen((o) => !o)}><Plus className="h-3 w-3" />Add destination</Button>
            {addOpen && (
              <div className={`frame absolute right-0 top-full z-30 mt-2 w-80 overflow-hidden shadow-soft ${floatGlass}`}>
                <div className="label border-b border-white/[0.07] px-3.5 py-2.5">A new destination takes 10% from the largest leg</div>
                <div className="p-1.5">
                  {Object.entries(KIND).map(([k, v]) => {
                    const KindIcon = v.icon;
                    const taken = k === 'holders' && draft.legs.some((l) => l.kind === 'holders');
                    return (
                      <button key={k} type="button" onClick={() => addLeg(k)} className={`group flex w-full items-center gap-3 rounded-xl px-2.5 py-2 text-left transition-colors hover:bg-white/[0.05] focus-visible:bg-white/[0.05] focus-visible:outline-none ${taken ? 'opacity-50' : ''}`}>
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl" style={{ background: alpha(v.color, 0.1) }}><KindIcon className="h-5 w-5" style={{ color: v.color }} /></span>
                        <span className="min-w-0 flex-1"><span className="block text-[13px] font-medium text-ink">{v.label}{taken && <span className="ml-1.5 font-mono text-[10px] text-mut">already on the canvas</span>}</span><span className="block text-[11px] leading-snug text-mut">{kindHint(k, chain)}</span></span>
                        {k === 'page' ? <span className="flex shrink-0 items-center gap-1"><PlatformIcon platform="youtube" className="h-3 w-3" /><PlatformIcon platform="github" className="h-3 w-3" /><PlatformIcon platform="x" className="h-3 w-3" /></span> : <Plus className="h-3 w-3 shrink-0 text-mut opacity-0 transition-opacity group-hover:opacity-100" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
          <Button variant="ghost" className="!px-3 !py-1.5 text-xs" onClick={() => { setAddOpen(false); setShowCycles((s) => !s); }}><Receipt className="h-3.5 w-3.5" />Cycles</Button>
          <span className="mx-0.5 hidden h-5 w-px bg-white/10 sm:block" />
          <Button variant="ghost" className="!px-3 !py-1.5 text-xs" onClick={() => act('run')} busy={busy === 'run'} disabled={!config.is_active}><Bolt className="h-3.5 w-3.5" />Run now</Button>
          {config.is_active ? <Button variant="ghost" className="!px-2.5 !py-1.5 text-xs" aria-label="Pause" title="Pause" onClick={() => act('pause')} busy={busy === 'pause'}><Pause className="h-3.5 w-3.5" /></Button> : <Button variant="ink" className="!px-3 !py-1.5 text-xs" onClick={() => act('resume')} busy={busy === 'resume'}><Play className="h-3 w-3" />Resume</Button>}
          <span className="mx-0.5 hidden h-5 w-px bg-white/10 sm:block" />
          {dirty && <Button variant="ghost" className="!px-3 !py-1.5 text-xs" onClick={() => setDraft(initial)} disabled={busy === 'save'}>Discard</Button>}
          <Button className="!px-3.5 !py-1.5 text-xs" onClick={save} busy={busy === 'save'} disabled={demo ? false : !canSave}>{!demo && !setup && !dirty && <Check className="h-3 w-3" />}{demo ? 'Connect to save' : setup ? 'Pick your coin first' : dirty ? 'Save routing' : 'Saved'}</Button>
          <div className="relative">
            <Button variant="ghost" className="!px-3 !py-1.5 text-xs" aria-expanded={shareOpen} onClick={() => { setAddOpen(false); setShareOpen((o) => !o); }}>Share</Button>
            {shareOpen && (
              <div className={`frame absolute right-0 top-full z-30 mt-2 w-[22rem] max-w-[90vw] p-3.5 shadow-soft ${floatGlass}`}>
                <div className="label mb-2">The public page of your coin</div>
                <SharePanel address={config.source_token_address} symbol={src.symbol} compact />
              </div>
            )}
          </div>
          {!demo && onSwitchWallet && <button type="button" onClick={onSwitchWallet} className="ml-1 text-xs text-mut transition-colors hover:text-ink" title={`Signed in as ${data.user.wallet}`}>Switch wallet</button>}
          {!demo && <button type="button" onClick={onLogout} className="ml-1 text-xs text-mut transition-colors hover:text-ink">Sign out</button>}
        </div>
      </div>

      {setup && (
        // The empty state of the canvas: glass, lit by the beam on its left edge and along its foot.
        <div className="relative flex shrink-0 flex-wrap items-center justify-between gap-3 overflow-hidden border-b border-white/10 bg-white/[0.03] py-2.5 pl-5 pr-4 text-[13px] text-mut">
          <span aria-hidden="true" className="absolute inset-y-0 left-0 w-[3px]" style={{ background: BEAM_DOWN, boxShadow: '0 0 14px rgba(47,168,255,0.7)' }} />
          <span aria-hidden="true" className="beam pointer-events-none absolute inset-x-0 bottom-0 h-px opacity-50" />
          <span><span className="label mr-2 text-cyan-500">Blank canvas</span>Pick the wallet and the coin in the guide, launch, then draw the routing here.</span>
          <Button variant="ghost" className="!px-3 !py-1 text-xs" onClick={() => setGuide(true)}>Open the guide</Button>
        </div>
      )}
      {setup && guide && (
        <div className="absolute inset-0 z-50 flex items-start justify-center overflow-y-auto bg-[rgba(5,7,12,0.74)] p-4 pt-8 backdrop-blur-sm sm:pt-12">
          <div className="frame frame-top relative w-full max-w-2xl rounded-3xl !bg-[rgba(9,12,19,0.95)] p-5 shadow-soft reveal-pop sm:p-6">
            <button type="button" onClick={() => (launched ? onCreated(launched) : setGuide(false))} className={`absolute right-4 top-4 ${smallBtn}`}>{launched ? 'Close' : 'Look around first'}<Close className="h-2.5 w-2.5" /></button>
            <Wizard embedded user={data.user} onCreated={onCreated} onLaunched={setLaunched} onSwitchWallet={onSwitchWallet} onLogout={onLogout} />
          </div>
        </div>
      )}
      {tour && <Tour onDone={endTour} chain={chain} />}
      {demo && (
        // The first thing a visitor must understand: this canvas is a sample, and one button makes it theirs.
        <div className="sample-bar relative flex shrink-0 flex-wrap items-center justify-between gap-x-6 gap-y-3 overflow-hidden border-b border-white/10 bg-white/[0.035] py-3.5 pl-6 pr-4">
          {/* The light of the bar: a glow leaking from the left, the beam on its left edge and along its foot */}
          <span aria-hidden="true" className="pointer-events-none absolute -left-24 top-1/2 h-56 w-96 -translate-y-1/2 rounded-full bg-[radial-gradient(closest-side,rgba(47,168,255,0.26),transparent)]" />
          <span aria-hidden="true" className="absolute inset-y-0 left-0 w-[3px]" style={{ background: BEAM_DOWN, boxShadow: '0 0 16px rgba(47,168,255,0.8)' }} />
          <span aria-hidden="true" className="beam pointer-events-none absolute inset-x-0 bottom-0 h-px opacity-60" />
          <span className="relative flex min-w-0 flex-1 flex-wrap items-center gap-x-3 gap-y-1.5">
            <span className="beam inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 font-mono text-[10.5px] font-semibold uppercase tracking-[0.14em] text-coal shadow-beam">
              <span className="relative flex h-1.5 w-1.5"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-coal opacity-50" /><span className="relative h-1.5 w-1.5 rounded-full bg-coal" /></span>
              Sample policy
            </span>
            <span className="text-[15px] font-medium leading-snug tracking-[-0.01em] text-ink">This canvas is a demo. Play with it, then route your own coin.</span>
            <span className="w-full text-[13px] leading-snug text-mut">Drag the nodes, open them, change shares and payout assets. Nothing is saved until you connect a wallet and pick your coin.</span>
          </span>
          <Button className="sample-cta relative !px-5 !py-2.5 text-sm" onClick={onConnect}>Connect wallet and start<Arrow className="h-3.5 w-3.5" /></Button>
        </div>
      )}
      <div className="flex min-h-0 flex-1 flex-col md:flex-row">
        {/* Canvas: the ground lit like the site (blue from the top left, violet from the bottom right), a faint grid of dots */}
        <div className="relative min-h-[45%] min-w-0 flex-1">
          <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-[radial-gradient(640px_circle_at_0%_0%,rgba(47,168,255,0.13),transparent_62%),radial-gradient(680px_circle_at_100%_100%,rgba(123,92,255,0.11),transparent_62%)]" />
          <ReactFlow nodes={nodes} edges={edges} nodeTypes={nodeTypes} edgeTypes={edgeTypes} onNodesChange={onNodesChange} onNodeDragStop={onNodeDragStop}
            onNodeClick={(_, n) => setSelected(n.id)} onPaneClick={() => { setSelected(null); setAddOpen(false); }}
            fitView fitViewOptions={{ padding: 0.25, maxZoom: 1 }} minZoom={0.4} maxZoom={1.4} proOptions={{ hideAttribution: true }} nodesConnectable={false} elementsSelectable deleteKeyCode={null} panOnScroll>
            <Background gap={26} size={1.1} color="rgba(255,255,255,0.09)" />
            <Controls showInteractive={false} position="bottom-right"
              className="!overflow-hidden !rounded-2xl !border-white/10 !bg-[rgba(9,12,19,0.84)] backdrop-blur-xl [&_.react-flow__controls-button:hover]:!bg-white/[0.06] [&_.react-flow__controls-button:hover]:!text-ink [&_.react-flow__controls-button]:!border-b-white/[0.07] [&_.react-flow__controls-button]:!bg-transparent [&_.react-flow__controls-button]:!text-mut" />
          </ReactFlow>
          {total !== 10000 && <div className="pointer-events-none absolute left-1/2 top-3 z-10 flex -translate-x-1/2 items-center gap-1.5 whitespace-nowrap rounded-full border border-down/40 bg-[rgba(5,7,12,0.88)] px-3.5 py-1.5 text-xs text-down shadow-[0_0_24px_-8px_rgba(255,92,51,0.55)] backdrop-blur-md"><Warning className="h-3.5 w-3.5" />Shares total <span className="font-mono tabular-nums">{(total / 100).toFixed(1)}%</span>. Adjust a leg or use Balance.</div>}
          {problems.length > 0 && total === 10000 && <div className="pointer-events-none absolute left-1/2 top-3 z-10 flex -translate-x-1/2 items-center gap-1.5 whitespace-nowrap rounded-full border border-down/40 bg-[rgba(5,7,12,0.88)] px-3.5 py-1.5 text-xs text-down shadow-[0_0_24px_-8px_rgba(255,92,51,0.55)] backdrop-blur-md"><Warning className="h-3.5 w-3.5" />{problems.includes('needs a page') ? 'A page leg needs a link: paste it in the panel on the right.'
            : problems.includes('needs a Solana address') ? 'This coin lives on Solana: a wallet or treasury leg needs a Solana address.'
              : problems.includes('needs an address') ? (sol ? 'A wallet or treasury leg needs a Solana address.' : 'A wallet or treasury leg needs an address.')
                : problems.includes('needs an xStock') ? 'The treasury holds an xStock: pick one in the panel on the right.'
                  : 'A wallet or treasury leg needs an address.'}</div>}
          {showCycles && <Cycles logs={logs} meta={meta} chain={chain} onClose={() => setShowCycles(false)} />}
          {/* Legend: the key of the map, set on the canvas like the key of a drawing */}
          <div className="pointer-events-none absolute bottom-4 right-16 z-10 hidden items-stretch divide-x divide-white/[0.07] overflow-hidden rounded-full border border-white/10 bg-[rgba(5,7,12,0.78)] backdrop-blur-md lg:flex">
            {Object.entries(KIND).map(([k, v]) => { const KindIcon = v.icon; return <span key={k} className="flex items-center gap-1.5 px-3 py-1.5 font-mono text-[9.5px] uppercase tracking-[0.14em] text-mut"><KindIcon className="h-3.5 w-3.5" style={{ color: v.color, filter: `drop-shadow(0 0 4px ${alpha(v.color, 0.6)})` }} />{v.label}</span>; })}
          </div>
        </div>

        {/* Inspector */}
        <aside className="max-h-[50%] w-full shrink-0 overflow-y-auto border-t border-white/10 bg-white/[0.025] md:max-h-none md:w-[320px] md:border-l md:border-t-0 lg:w-[360px]">
          {selected === SOURCE_ID ? <SourceInspector data={data} draft={draft} setDraft={setDraft} act={act} busy={busy} tg={tg} onRevealKey={onRevealKey} />
            : selected === TG_ID ? <ActionInspector data={data} act={act} busy={busy} tg={tg} demo={demo} />
            : selectedLeg ? <LegInspector key={selectedLeg.key} leg={selectedLeg} draft={draft} setDraft={setDraft} meta={meta} sourceSymbol={src.symbol} chain={chain} onRemove={() => removeLeg(selectedLeg.key)} />
            : <RoutingSummary draft={draft} meta={meta} select={setSelected} data={setup ? null : data} chain={chain} />}
        </aside>
      </div>
    </div>
  );
}

export default function Studio(props) {
  return <ReactFlowProvider><StudioInner {...props} /></ReactFlowProvider>;
}
