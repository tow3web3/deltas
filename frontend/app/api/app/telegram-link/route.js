import { sessionUser } from '../../../../lib/session';
import { setLinkCode } from '../../../../lib/appQueries';
import { BOT_URL } from '../../../../lib/brand';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST() {
  const user = await sessionUser();
  if (!user) return Response.json({ error: 'Not logged in' }, { status: 401 });
  const code = await setLinkCode(user.id);
  if (!BOT_URL) return Response.json({ error: 'The Telegram bot is not set up yet' }, { status: 503 });
  return Response.json({ code, url: `${BOT_URL}?start=w_${code}` });
}
