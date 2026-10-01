// Receipts for a Solana cycle, in the creator's Telegram group (bound with
// /announce): the receipt card the site renders, a short caption in SOL or the
// asset paid, and the Share, Receipt and Public page buttons. Never throws: a
// failed post must not fail the cycle.
import { Markup } from 'telegraf';
import bot from '../bot/telegram.js';
import { mdEscape } from '../services/legs.js';
import { scheduleLabel } from '../services/schedule.js';
import { SITE_URL as FRONTEND, CREDIT } from '../brand.js';
import { tokenInfo } from './jupiter.js';

const CARD_BASE = String(process.env.CARD_BASE_URL || FRONTEND).replace(/[/]+$/, '');
const fmt = (raw, decimals, digits = 4) => {
  const n = Number(raw || 0) / 10 ** Number(decimals ?? 9);
  if (n >= 1000) return n.toLocaleString('en-US', { maximumFractionDigits: 0 });
  return n.toFixed(n >= 1 ? 2 : digits);
};

export async function announceSolCycle({ config, logId, reward, results, holdersTotal, extras = [] }) {
  if (!config.announce_chat_id || !results?.successful?.length) return;
  try {
    const coin = await tokenInfo(config.source_token_address).catch(() => null);
    const sym = coin?.symbol || 'coin';
    const amount = fmt(results.totalSent, reward.decimals);
    const caption = [
      `*$${mdEscape(sym)} paid its holders*`,
      '',
      `${amount} ${mdEscape(reward.symbol)} to ${results.successful.length}/${holdersTotal} wallets, by balance, on Solana`,
      ...extras.map((e) => mdEscape(e)),
      '',
      `Next cycle ${scheduleLabel(config)}`,
    ].join('\n');
    const receipt = `${FRONTEND}/receipt/${logId}`;
    const share = `$${sym} just paid its holders ${amount} ${reward.symbol}\n${results.successful.length} wallets, by balance, on Solana.\nRouted by ${CREDIT}`;
    const keyboard = Markup.inlineKeyboard([
      [Markup.button.url('Share on X', `https://x.com/intent/tweet?text=${encodeURIComponent(share)}&url=${encodeURIComponent(receipt)}`)],
      [Markup.button.url('Receipt', receipt), Markup.button.url('Public page', `${FRONTEND}/${config.source_token_address}`)],
    ]);
    const thread = config.announce_thread_id ? { message_thread_id: config.announce_thread_id } : {};
    try {
      const res = await fetch(`${CARD_BASE}/api/card/receipt/${logId}`, { signal: AbortSignal.timeout(20_000) });
      if (!res.ok) throw new Error(`card ${res.status}`);
      const card = Buffer.from(await res.arrayBuffer());
      await bot.telegram.sendPhoto(config.announce_chat_id, { source: card, filename: `delta-receipt-${logId}.png` }, { caption, parse_mode: 'Markdown', ...keyboard, ...thread });
    } catch (e) {
      console.log(`   Receipt card unavailable (${e.message}), posting text`);
      await bot.telegram.sendMessage(config.announce_chat_id, caption, { parse_mode: 'Markdown', disable_web_page_preview: true, ...keyboard, ...thread });
    }
  } catch (e) {
    console.error(`   Solana receipt post failed for chat ${config.announce_chat_id}: ${e.message}`);
  }
}
