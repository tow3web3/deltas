import { ImageResponse } from 'next/og';
import { getWalletStatement } from '../../../../../lib/queries';
import { fetchTokenMeta } from '../../../../../lib/tokenMeta';
import { CARD, COLORS, loadFonts, logoCandidates, inlineLogo, fmtUnits, siteUrl, Monogram, Wordmark } from '../../../../../lib/og';
import { isAnyAddress } from '../../../../../lib/chains';
import { BRAND } from '../../../../../lib/brand';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request, { params }) {
  const { address } = await params;
  if (!isAnyAddress(address)) return new Response('Bad address', { status: 400 });
  const site = siteUrl();
  const { totals } = await getWalletStatement(address);
  const meta = await fetchTokenMeta(totals.flatMap((t) => [t.source_token, t.reward_token]));

  // Aggregate by reward token for the headline.
  const byReward = new Map();
  for (const t of totals) {
    const k = t.reward_token;
    const cur = byReward.get(k) || { total: 0n, n: 0 };
    cur.total += BigInt(t.total);
    cur.n += t.n;
    byReward.set(k, cur);
  }
  const rows = [...byReward.entries()].sort((a, b) => b[1].n - a[1].n).slice(0, 4);
  const logos = Object.fromEntries(await Promise.all(rows.map(async ([reward]) => [reward, await inlineLogo(logoCandidates(reward, meta[reward], site), 144)])));
  const dividends = totals.reduce((s, t) => s + t.n, 0);
  const sources = [...new Set(totals.map((t) => t.source_token))];
  const fonts = await loadFonts();
  const font = fonts.length ? 'Manrope' : undefined;
  const short = `${address.slice(0, 6)}…${address.slice(-4)}`;

  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', background: COLORS.ground, fontFamily: font, color: COLORS.ink, padding: 56, position: 'relative' }}>
        <div style={{ position: 'absolute', top: -200, right: -100, width: 560, height: 560, borderRadius: 560, background: 'rgba(47, 168, 255,0.16)' }} />
        <div style={{ position: 'absolute', bottom: -220, left: 100, width: 460, height: 460, borderRadius: 460, background: 'rgba(246,195,67,0.1)' }} />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Wordmark siteUrl={site} />
          <span style={{ fontSize: 18, color: COLORS.mut, letterSpacing: 2 }}>DIVIDEND STATEMENT · {short}</span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', flex: 1, justifyContent: 'center' }}>
          <div style={{ fontSize: 26, color: COLORS.mut }}>{dividends > 0 ? `${dividends} dividends from ${sources.length} token${sources.length === 1 ? '' : 's'} on Robinhood Chain` : 'No dividends yet'}</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 20 }}>
            {rows.length === 0 && <div style={{ fontSize: 64, fontWeight: 800, color: COLORS.green }}>Hold a token on {BRAND}.</div>}
            {rows.map(([reward, v]) => {
              const m = meta[reward] || {};
              const logo = logos[reward];
              return (
                <div key={reward} style={{ display: 'flex', alignItems: 'center', gap: 22 }}>
                  {logo ? <img src={logo} width={72} height={72} style={{ borderRadius: 72, border: '3px solid #fff' }} alt="" /> : <Monogram text={m.symbol} size={72} />}
                  <span style={{ fontSize: 72, fontWeight: 800, letterSpacing: -3, color: COLORS.green, lineHeight: 1 }}>+{fmtUnits(v.total, m.decimals ?? 18)}</span>
                  <span style={{ fontSize: 48, fontWeight: 800, letterSpacing: -1 }}>{m.symbol || 'ETH'}</span>
                  <span style={{ fontSize: 22, color: COLORS.mut, marginLeft: 8 }}>{v.n} payouts</span>
                </div>
              );
            })}
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 20, color: COLORS.mut }}>
          <span>Real stocks, earned by holding.</span>
          <span>{site.replace(/^https?:\/\//, '')}/wallet</span>
        </div>
      </div>
    ),
    { ...CARD, fonts, headers: { 'Cache-Control': 'public, max-age=600' } }
  );
}
