// Send the visitor to the platform to sign in. The state lives in a signed cookie.
import { begin, isEnabled, PROVIDERS, safeReturn } from '../../../../../lib/oauth';
import { SITE_URL } from '../../../../../lib/brand';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request, { params }) {
  const { provider } = await params;
  const back = safeReturn(new URL(request.url).searchParams.get('return'));
  const fail = (msg) => Response.redirect(`${SITE_URL}${back}${back.includes('?') ? '&' : '?'}error=${encodeURIComponent(msg)}`, 302);
  if (!PROVIDERS[provider]) return fail('Unknown platform');
  if (!isEnabled(provider)) return fail(`Sign in with ${PROVIDERS[provider].label} is not available yet`);
  try {
    return Response.redirect(await begin(provider, back), 302);
  } catch (e) {
    return fail(e.message);
  }
}
