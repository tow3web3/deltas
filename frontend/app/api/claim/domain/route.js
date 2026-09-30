// A domain proves itself with a DNS record. This returns the record to publish
// for (domain, wallet) and whether it is visible yet. The value is derived from
// both, so a record only ever authorises the wallet it was made for.
import { domainCode, domainProved, DNS_PREFIX } from '../../../../lib/oauth';
import { normalizeHandle } from '../../../../lib/pages';
import { EVM_ADDR } from '../../../../lib/stocks';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request) {
  try {
    const { domain: raw, wallet } = await request.json();
    const domain = normalizeHandle('domain', raw);
    if (!domain) return Response.json({ error: 'That is not a valid domain name' }, { status: 400 });
    if (!EVM_ADDR.test(wallet || '')) return Response.json({ error: 'Connect the wallet that should be paid first' }, { status: 400 });
    return Response.json({
      domain,
      record: { type: 'TXT', host: `${DNS_PREFIX}.${domain}`, name: DNS_PREFIX, value: domainCode(domain, wallet) },
      found: await domainProved(domain, wallet),
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
