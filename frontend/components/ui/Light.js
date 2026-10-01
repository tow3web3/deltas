'use client';

// The visual system of DELTA, in a few parts every section shares: the glass
// panel, the beam gradient, and the routing drawn as channels of light (one
// beam entering, splitting into channels whose thickness is their share, pulses
// travelling along them).
import { motion } from 'motion/react';

export const EASE = [0.16, 1, 0.3, 1];
export const BEAM = 'linear-gradient(90deg, #2FA8FF 0%, #5FE3FF 45%, #7B5CFF 100%)';
export const CYAN = '#5FE3FF';

/** A glass panel. `lit`: which edge carries the light (left, top, none). */
export function Glass({ children, className = '', lit = 'left', style = {}, as: Tag = 'div', ...rest }) {
  return (
    <Tag className={`${lit === 'top' ? 'frame frame-top' : lit === 'none' ? 'panel' : 'frame'} overflow-hidden ${className}`} style={style} {...rest}>
      {children}
    </Tag>
  );
}

/** The section divider: the diagonal cut of the logo. */
export function Cut({ className = '' }) {
  return <div aria-hidden="true" className={`cut mx-auto max-w-6xl ${className}`} />;
}

/**
 * The flow. `channels`: [{ key, share, node }] where `node` is what sits at the
 * end of the channel (any element). Width and height are the SVG box; the
 * channels end at `split` of the width, the nodes take the rest.
 */
export function Flow({ channels, width = 640, height = 420, split = 0.67, beamLabel = null, className = '' }) {
  const W = width, H = height, x0 = 40, x1 = Math.round(W * split);
  const n = channels.length;
  const ys = channels.map((_, i) => (n === 1 ? H / 2 : 40 + (i * (H - 80)) / (n - 1)));
  const path = (y) => `M ${x0} ${H / 2} C ${x0 + (x1 - x0) * 0.45} ${H / 2}, ${x1 - (x1 - x0) * 0.4} ${y}, ${x1} ${y}`;
  const maxShare = Math.max(...channels.map((c) => c.share || 1), 1);
  const uid = `fl${Math.round(W)}${n}`;
  return (
    <div className={`relative ${className}`}>
      <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" style={{ overflow: 'visible' }}>
        <defs>
          <linearGradient id={`${uid}-beam`} x1="0" x2="1"><stop offset="0" stopColor="#2FA8FF" /><stop offset="0.5" stopColor="#5FE3FF" /><stop offset="1" stopColor="#7B5CFF" /></linearGradient>
          <filter id={`${uid}-glow`} x="-20%" y="-50%" width="140%" height="200%"><feGaussianBlur stdDeviation="6" result="b" /><feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
        </defs>
        <line x1={-40} y1={H / 2} x2={x0} y2={H / 2} stroke={`url(#${uid}-beam)`} strokeWidth={14} strokeLinecap="round" filter={`url(#${uid}-glow)`} opacity={0.9} />
        {beamLabel && <text x={x0 - 30} y={H / 2 - 16} fill="#5A6275" fontSize="10" fontFamily="var(--font-mono), monospace" letterSpacing="2">{beamLabel}</text>}
        {channels.map((c, i) => {
          const w = 2 + ((c.share || 1) / maxShare) * 10;
          const d = path(ys[i]);
          return (
            <g key={c.key}>
              <path d={d} stroke={`url(#${uid}-beam)`} strokeWidth={w} fill="none" strokeLinecap="round" opacity={0.28} />
              <path d={d} stroke={`url(#${uid}-beam)`} strokeWidth={Math.max(1.5, w * 0.45)} fill="none" strokeLinecap="round" filter={`url(#${uid}-glow)`} opacity={0.95} />
              <circle r={Math.max(3, w * 0.5)} fill="#fff" filter={`url(#${uid}-glow)`}>
                <animateMotion dur={`${2.6 + i * 0.35}s`} begin={`${i * 0.5}s`} repeatCount="indefinite" path={d} keyPoints="0;1" keyTimes="0;1" calcMode="spline" keySplines="0.4 0 0.2 1" />
              </circle>
            </g>
          );
        })}
      </svg>
      <div className="pointer-events-none absolute inset-y-0 right-0 flex flex-col justify-between py-[2%]" style={{ width: `${Math.round((1 - split) * 100) - 1}%` }}>
        {channels.map((c, i) => (
          <motion.div key={c.key} initial={{ opacity: 0, x: 14 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 + i * 0.12, duration: 0.7, ease: EASE }} className="pointer-events-auto">
            {c.node}
          </motion.div>
        ))}
      </div>
    </div>
  );
}

/** A destination chip at the end of a channel: icon, name, note, share. */
export function FlowChip({ icon, label, sub, share, href = null }) {
  const body = (
    <>
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white/5">{icon}</span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[13px] font-medium text-ink">{label}</span>
        {sub && <span className="block truncate text-[11px] text-mut">{sub}</span>}
      </span>
      {share != null && <span className="font-mono text-sm tabular-nums text-cyan-500">{share}%</span>}
    </>
  );
  const cls = 'flex items-center gap-3 rounded-2xl border border-white/10 bg-[rgba(5,7,12,0.7)] px-3.5 py-2.5 backdrop-blur-md transition-colors hover:border-cyan-500/50';
  return href ? <a href={href} className={cls}>{body}</a> : <div className={cls}>{body}</div>;
}
