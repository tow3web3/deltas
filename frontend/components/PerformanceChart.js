'use client';

import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const MONO = 'var(--font-mono), ui-monospace, monospace';
const TICK = { fill: '#8A9099', fontSize: 10, fontFamily: MONO, letterSpacing: '0.04em' };

function Tip({ active, payload }) {
  if (!active || !payload || !payload.length) return null;
  const p = payload[0].payload;
  return (
    <div className="frame min-w-[168px] px-3.5 py-3 shadow-soft">
      <div className="label">{p.time}</div>
      <div className="figure mt-2 text-xl font-medium leading-none tracking-tight text-ink">{p.eth.toFixed(4)}<span className="ml-1.5 font-mono text-[10px] font-normal text-mut">ETH</span></div>
      <div className="mt-2.5 border-t border-line pt-2 text-[11px] leading-snug text-mut">paid as <span className="font-mono text-ink/85">{p.symbol}</span>{p.holders ? <> to <span className="figure text-ink">{p.holders}</span> holders</> : null}</div>
    </div>
  );
}

// ETH turned into dividends per cycle (the common denominator across reward modes).
export default function PerformanceChart({ data }) {
  const chartData = data
    .map((e) => {
      const d = new Date(e.executionTime);
      return {
        time: d.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
        day: d.toLocaleString('en-US', { month: 'short', day: 'numeric' }),
        eth: Number(e.claimedEth || 0) / 1e18,
        symbol: e.rewardSymbol || 'reward',
        holders: e.holderCount,
      };
    })
    .reverse();
  // One label per day, on the first cycle of that day.
  const dayTicks = chartData.filter((d, i) => i === 0 || chartData[i - 1].day !== d.day).map((d) => d.time);
  const dayOf = Object.fromEntries(chartData.map((d) => [d.time, d.day]));
  const max = Math.max(...chartData.map((d) => d.eth), 0);
  const decimals = max >= 10 ? 1 : max >= 1 ? 2 : 3;

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData} margin={{ top: 8, right: 22, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="colorEth" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#2FA8FF" stopOpacity={0.16} />
              <stop offset="100%" stopColor="#2FA8FF" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} stroke="#24272B" strokeWidth={1} />
          <XAxis dataKey="time" tick={TICK} ticks={dayTicks} tickFormatter={(v) => dayOf[v] || v} tickLine={false} axisLine={{ stroke: '#24272B' }} tickMargin={10} minTickGap={40} />
          <YAxis tick={TICK} tickLine={false} axisLine={false} width={46} tickMargin={6} tickCount={5} tickFormatter={(v) => v.toFixed(decimals)} />
          <Tooltip content={<Tip />} cursor={{ stroke: '#F4F5F4', strokeOpacity: 0.25, strokeWidth: 1 }} isAnimationActive={false} offset={14} />
          <Area type="monotone" dataKey="eth" stroke="#2FA8FF" strokeWidth={1.75} fillOpacity={1} fill="url(#colorEth)" dot={false} activeDot={{ r: 3.5, fill: '#2FA8FF', stroke: '#0A0A0A', strokeWidth: 2 }} animationDuration={900} animationEasing="ease-out" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
