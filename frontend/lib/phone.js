// Proving a phone number: a six-digit code sent over WhatsApp or SMS through
// Twilio Verify, then checked. Twilio keeps the code and its attempts; this file
// adds the limits that stop someone from making the site send codes in bulk.
import { normalizePhone, maskPhone } from './pages';
import { rememberIdentity } from './oauth';

const env = (k) => process.env[k] || '';
export const phoneEnabled = () => Boolean(env('TWILIO_ACCOUNT_SID') && env('TWILIO_AUTH_TOKEN') && env('TWILIO_VERIFY_SID'));
export const CHANNELS = ['whatsapp', 'sms'];

// Sends: 3 per number per hour, 6 per visitor per hour. Checks: 8 per number per hour.
const WINDOW = 3600_000;
const buckets = new Map();
function allow(key, max) {
  const now = Date.now();
  const list = (buckets.get(key) || []).filter((t) => now - t < WINDOW);
  if (list.length >= max) return false;
  list.push(now);
  buckets.set(key, list);
  if (buckets.size > 20_000) buckets.clear();
  return true;
}

async function twilio(path, form) {
  const sid = env('TWILIO_VERIFY_SID');
  const auth = Buffer.from(`${env('TWILIO_ACCOUNT_SID')}:${env('TWILIO_AUTH_TOKEN')}`).toString('base64');
  const res = await fetch(`https://verify.twilio.com/v2/Services/${sid}/${path}`, {
    method: 'POST', headers: { Authorization: `Basic ${auth}`, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(form), cache: 'no-store', signal: AbortSignal.timeout(15_000),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    console.error(`Twilio ${path} answered ${res.status}: ${JSON.stringify(data).slice(0, 400)}`);
    // 60200: invalid number. 60203: too many sends. 60205: SMS not supported for landlines. 21608 / 60220: trial account, unverified number.
    const code = data.code;
    if (code === 60200) throw new Error('That number cannot receive a code');
    if (code === 60203) throw new Error('Too many codes were sent to this number. Try again in a while.');
    if (code === 60205) throw new Error('That number cannot receive messages. Try another one.');
    if (code === 21608 || code === 60220) throw new Error('This number is not on the list of the test account yet');
    throw new Error('The code could not be sent right now. Try again in a minute.');
  }
  return data;
}

/** Send a code. Returns the masked number, so the page can say where it went. */
export async function sendCode({ number, channel, ip }) {
  if (!phoneEnabled()) throw new Error('Phone numbers cannot be claimed yet');
  const e164 = normalizePhone(number);
  if (!e164) throw new Error('Write the number with its country code: +33 6 12 34 56 78');
  const ch = CHANNELS.includes(channel) ? channel : 'whatsapp';
  if (!allow(`send:${e164}`, 3) || !allow(`send:ip:${ip}`, 6)) throw new Error('Too many codes asked for. Wait an hour, or use the code you already received.');
  await twilio('Verifications', { To: e164, Channel: ch });
  return { number: e164, masked: maskPhone(e164), channel: ch };
}

/** Check a code. On success the number joins the proved identities of this browser, like a sign-in would. */
export async function checkCode({ number, code, ip }) {
  if (!phoneEnabled()) throw new Error('Phone numbers cannot be claimed yet');
  const e164 = normalizePhone(number);
  if (!e164) throw new Error('That is not a valid number');
  const c = String(code || '').replace(/\D/g, '');
  if (c.length < 4 || c.length > 10) throw new Error('The code has 6 digits');
  if (!allow(`check:${e164}`, 8) || !allow(`check:ip:${ip}`, 20)) throw new Error('Too many attempts. Ask for a new code in an hour.');
  let data;
  try {
    data = await twilio('VerificationCheck', { To: e164, Code: c });
  } catch (e) {
    // Twilio answers 404 once a code expired or was already used.
    if (/not be sent|right now/.test(e.message)) throw new Error('This code expired. Ask for a new one.');
    throw e;
  }
  if (data.status !== 'approved') throw new Error('Wrong code. Check the message and try again.');
  await rememberIdentity('phone', [{ id: e164, handles: [e164], name: maskPhone(e164), avatar: null }]);
  return { number: e164, masked: maskPhone(e164) };
}
