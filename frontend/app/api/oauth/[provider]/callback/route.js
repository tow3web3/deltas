// The platform sends the visitor back here. The code is traded for a token,
// the token is used to read which pages the account runs, then it is dropped.
import { complete, PROVIDERS } from '../../../../../lib/oauth';
import { SITE_URL } from '../../../../../lib/brand';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request, { params }) {
  const { provider } = await params;
  const sp = new URL(request.url).searchParams;
  const to = (path, extra) => Response.redirect(`${SITE_URL}${path}${path.includes('?') ? '&' : '?'}${new URLSearchParams(extra)}`, 302);
  if (!PROVIDERS[provider]) return to('/claim', { error: 'Unknown platform' });
  const platform = PROVIDERS[provider].platform;
  if (sp.get('error')) return to('/claim', { platform, error: sp.get('error') === 'access_denied' ? 'Sign-in cancelled' : String(sp.get('error_description') || sp.get('error')).slice(0, 160) });
  try {
    const { returnTo, count } = await complete(provider, { code: sp.get('code'), state: sp.get('state') });
    return to(returnTo, count ? { platform, signed: '1' } : { platform, error: `That ${PROVIDERS[provider].label} account has no page to claim` });
  } catch (e) {
    return to('/claim', { platform, error: String(e.message).slice(0, 160) });
  }
}
