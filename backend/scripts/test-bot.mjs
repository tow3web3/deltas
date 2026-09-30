// Drives the Telegram bot through every command and every button with a fake
// Telegram API, and checks what it would have sent: every inline button has a
// link or a callback, every Markdown message parses, no handler throws.
// Usage: DATABASE_URL=... TELEGRAM_BOT_TOKEN=x node scripts/test-bot.mjs
import 'dotenv/config';
import { Telegram } from 'telegraf';
import { initBot } from '../src/bot/telegram.js';

const bot = initBot();
const sent = [];
const problems = [];

// Legacy Markdown, as Telegram reads it: *, _ and ` must pair up outside code and links.
function markdownOk(text) {
  // Escaped characters, links and code do not count.
  let s = String(text).replace(/\\[*_`\[]/g, 'E').replace(/\[[^\]]*\]\([^)]*\)/g, 'L').replace(/`[^`]*`/g, 'C');
  for (const ch of ['*', '_', '`']) if ((s.split(ch).length - 1) % 2) return `unpaired ${ch}`;
  return null;
}

function checkPayload(method, p) {
  if (!p) return;
  if (p.text && (p.parse_mode || '').toLowerCase() === 'markdown') {
    const bad = markdownOk(p.text);
    if (bad) problems.push(`${method}: ${bad} in "${String(p.text).slice(0, 80).replace(/\n/g, ' ')}…"`);
  }
  if (p.text && p.text.length > 4096) problems.push(`${method}: text of ${p.text.length} chars, Telegram stops at 4096`);
  const rows = p.reply_markup?.inline_keyboard;
  if (rows) {
    for (const row of rows) {
      if (!row.length) problems.push(`${method}: empty keyboard row`);
      for (const b of row) {
        if (!b.text) problems.push(`${method}: button without text`);
        if (!b.url && !b.callback_data && !b.web_app && !b.switch_inline_query) problems.push(`${method}: button "${b.text}" has no link and no callback`);
        if (b.url && !/^(https?:\/\/|tg:\/\/)/.test(b.url)) problems.push(`${method}: button "${b.text}" links to "${b.url}"`);
        if (b.callback_data && Buffer.byteLength(b.callback_data) > 64) problems.push(`${method}: callback "${b.callback_data}" over 64 bytes`);
      }
    }
    if (rows.length > 100) problems.push(`${method}: ${rows.length} rows`);
  }
}

// Telegraf makes a fresh Telegram client per update: the fake goes on the prototype.
Telegram.prototype.callApi = async function callApi(method, payload) {
  sent.push({ method, payload });
  checkPayload(method, payload);
  if (method === 'getMe') return { id: 1, is_bot: true, first_name: 'test', username: 'test_bot' };
  if (method === 'sendMessage' || method === 'editMessageText') return { message_id: sent.length, chat: { id: payload.chat_id }, date: 0, text: payload.text };
  return true;
};

let USER = { id: 424242, is_bot: false, first_name: 'Test', username: 'tester' };
let CHAT = { id: 424242, type: 'private' };
const as = (id) => { USER = { ...USER, id }; CHAT = { ...CHAT, id }; };
let n = 0;
const text = (t) => ({ update_id: ++n, message: { message_id: n, date: 0, chat: CHAT, from: USER, text: t, entities: t.startsWith('/') ? [{ type: 'bot_command', offset: 0, length: t.split(' ')[0].length }] : [] } });
const press = (data) => ({ update_id: ++n, callback_query: { id: String(n), from: USER, chat_instance: 'x', data, message: { message_id: n, date: 0, chat: CHAT, from: { id: 1, is_bot: true, first_name: 'bot' }, text: 'previous' } } });

const failures = [];
let current = '';
async function run(label, update) {
  current = label;
  const before = problems.length;
  try {
    await bot.handleUpdate(update);
  } catch (e) {
    failures.push(`${label}: threw ${e.message}`);
  }
  for (const p of problems.slice(before)) failures.push(`${label}: ${p}`);
}

// Every command a user can type, then every callback the handlers register.
const commands = ['/start', '/help', '/setup', '/status', '/stocks', '/announce', '/dashboard', '/canvas', '/faq', '/how', '/community', '/routing', '/burns', '/burnalerts', '/feed'];
const buttons = ['menu', 'help', 'how', 'faq', 'faq_1', 'faq_2', 'faq_3', 'faq_4', 'announce_help', 'stocks', 'setup', 'warning_accept', 'warning_cancel', 'source_wallet', 'source_univ3',
  'reward_NVDA', 'reward_roulette', 'interval_1h', 'confirm_yes', 'confirm_no', 'status', 'runnow', 'pause', 'resume', 'settings', 'change_interval', 'editint_1h', 'change_target',
  'editreward_NVDA', 'reward_mode', 'mode_fixed', 'mode_roulette', 'mode_gainer', 'mode_portfolio', 'mode_vote', 'basket_mag7', 'market_hours', 'loyalty', 'loy_toggle', 'loy_min',
  'loy_ramp', 'loy_max', 'loy_reset', 'split', 'split_100-0-0-0', 'split_70-20-10-0', 'creator_address', 'payout_mode', 'treasury_address', 'treasury_asset', 'tasset_SPY', 'cancel', ...(process.env.DESTRUCTIVE ? ['stop', 'confirm_delete'] : ['stop'])];

// Silence the bot's own error logging while we drive it; failures are collected instead.
const origError = console.error;
console.error = (...a) => { if (!String(a[0]).startsWith('Bot error')) origError(...a); else failures.push(`${current}: handler error: ${String(a[1]?.message || a[1]).slice(0, 160)}`); };

for (const c of commands) await run(c, text(c));
for (const b of buttons) await run(`[${b}]`, press(b));
// Free text in a private chat with no setup in progress, and a few things people paste.
for (const t of ['hello', '0x0000000000000000000000000000000000000001', 'NVDA', '5b62bd7c']) await run(`text "${t}"`, text(t));

// The guided setup, start to finish, as a new user. The token is a stock token on the chain (needs the RPC).
as(424243);
const KEY = '0x' + '7'.repeat(63) + '1';
for (const [label, u] of [['/setup', text('/setup')], ['[warning_accept]', press('warning_accept')], ['key', text(KEY)], ['token', text('0x117cc2133c37b721f49de2a7a74833232b3b4c0c')],
  ['[source_wallet]', press('source_wallet')], ['[reward_NVDA]', press('reward_NVDA')], ['[interval_1h]', press('interval_1h')], ['[confirm_yes]', press('confirm_yes')], ['/status after setup', text('/status')], ['[split]', press('split')], ['[settings]', press('settings')]]) await run(`setup ${label}`, u);
// The guided setup on Solana, as another new user: a Phantom-style key, a pump.fun mint, SOL as the reward.
as(424244);
const SOL_KEY = JSON.stringify([...(await import('@solana/web3.js')).Keypair.generate().secretKey]);
const echo = (label) => console.log(`   ${label} ->`, (sent.at(-1)?.payload?.text || '').split(String.fromCharCode(10))[0].slice(0, 110));
for (const [label, u] of [['/setup', text('/setup')], ['[warning_accept]', press('warning_accept')], ['sol key', text(SOL_KEY)], ['mint', text('9BB6NFEcjBCtnNLFko2FqVQBq8HHM13kCyYcdQbgpump')],
  ['[reward_NVDAx]', press('reward_NVDAx')], ['[interval_30]', press('interval_30')], ['[confirm_yes]', press('confirm_yes')], ['/status on Solana', text('/status')]]) { await run(`solana setup ${label}`, u); if (process.env.SHOW) echo(label); }
console.log('solana setup, last messages:', sent.slice(-3).map((x) => (x.payload?.text || '').split(String.fromCharCode(10))[0].slice(0, 70)).join(' | '));

console.log('setup flow, last messages:', sent.slice(-4).map((x) => (x.payload?.text || '').split('\n')[0].slice(0, 70)).join(' | '));

console.error = origError;
const uniq = [...new Set(failures)];
console.log(`${sent.length} API calls, ${commands.length} commands, ${buttons.length} buttons.`);
if (uniq.length) {
  console.log(`${uniq.length} problem(s):`);
  for (const f of uniq) console.log(' -', f);
  process.exit(1);
}
console.log('Every screen the bot sends is one Telegram accepts.');
process.exit(0);
