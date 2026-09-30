// Proving a phone number. POST { number, channel } sends a code over WhatsApp or
// SMS; POST { number, code } checks it and, when right, marks the number as
// proved for this browser: the claim then goes like any other page.
import { sendCode, checkCode } from '../../../../lib/phone';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const ipOf = (request) => (request.headers.get('x-forwarded-for') || '').split(',')[0].trim() || request.headers.get('x-real-ip') || 'local';

export async function POST(request) {
  try {
    const { number, channel, code } = await request.json();
    const ip = ipOf(request);
    if (code != null) return Response.json({ ok: true, ...(await checkCode({ number, code, ip })) });
    return Response.json({ ok: true, ...(await sendCode({ number, channel, ip })) });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 400 });
  }
}
