// Turn what a creator pasted into a page, and say what is already known about
// it. Reads only: the page and its vault are created when the routing is saved.
import { parsePage, pageUrl, pageName, pagePath, PLATFORMS } from '../../../../lib/pages';
import { getPage } from '../../../../lib/pageQueries';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    const sp = new URL(request.url).searchParams;
    const parsed = parsePage(sp.get('input') || '', sp.get('platform'));
    if (parsed.error) return Response.json({ error: parsed.error }, { status: 400 });
    const page = await getPage(parsed.platform, parsed.handle);
    return Response.json({
      platform: parsed.platform, platformLabel: PLATFORMS[parsed.platform].label, handle: parsed.platform === 'phone' ? pageName('phone', parsed.handle) : parsed.handle,
      name: page?.display_name || pageName(parsed.platform, parsed.handle),
      avatar: page?.avatar_url || null,
      url: pageUrl(parsed.platform, parsed.handle), path: page ? pagePath(parsed.platform, parsed.handle, page.slug) : parsed.platform === 'phone' ? null : pagePath(parsed.platform, parsed.handle), slug: page?.slug || null,
      exists: Boolean(page), claimed: Boolean(page?.claimed_wallet), vault: page?.vault_address || null,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
