// One page: what it received, from which coins, what waits in its vault. Public.
import { getPage } from '../../../../../lib/pageQueries';
import { pageView } from '../../../../../lib/pageView';
import { PLATFORMS } from '../../../../../lib/pages';
import { apiJson, apiOptions } from '../../../../../lib/apiResponse';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const OPTIONS = apiOptions;

export async function GET(request, { params }) {
  try {
    const { platform, handle } = await params;
    if (!PLATFORMS[platform]) return apiJson({ error: 'Unknown platform' }, 400);
    // A phone page answers to its slug only: asking by number would tell anyone whether a number receives fees.
    if (platform === 'phone' && !/^[a-z0-9]{12}$/.test(decodeURIComponent(handle))) return apiJson({ error: 'Page not found' }, 404);
    const page = await getPage(platform, decodeURIComponent(handle));
    if (!page) return apiJson({ error: 'Page not found', message: 'No coin routes fees to this page yet' }, 404);
    return apiJson(await pageView(page));
  } catch (error) {
    return apiJson({ error: error.message }, 500);
  }
}
