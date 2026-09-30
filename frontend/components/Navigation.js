'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { AnimatePresence, motion } from 'motion/react';
import { Arrow, X, Github } from './Icons';
import Logo from './Logo';
import CopyCA from './CopyCA';
import { BRAND, X_URL, COMMUNITY_URL, GITHUB_URL, BOT_URL, BOT_USERNAME, TOKEN, TOKEN_CA } from '../lib/brand';

const MAIN = [['Pages', '/pages'], ['Claim', '/claim'], ['Guide', '/guide'], ['Stocks', '/stocks']];
const MORE = [
  ['How it works', '/#how', 'The route, from fees in to every payout'],
  ['My payouts', '/wallet', 'What a wallet received, as a statement'],
  ['Token check', '/#check', 'Does a coin route its fees here'],
  ['Vote', '/vote', 'Holders choose the next payout asset'],
  ['Missions', '/missions', 'Tasks and rewards for holders'],
  ['API', '/#developers', 'Public endpoints and webhooks'],
];
const link = 'whitespace-nowrap rounded-lg px-2.5 py-1.5 text-[13px] font-medium text-mut transition-colors hover:text-ink';

const Telegram = (p) => (<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...p}><path d="M21.9 4.6 18.6 20c-.2 1-.9 1.3-1.8.8l-4.9-3.6-2.4 2.3c-.3.3-.5.5-1 .5l.4-5 9.2-8.3c.4-.4-.1-.6-.6-.2L6.1 13.7 1.3 12.2c-1-.3-1-1 .2-1.5L20.6 3.1c.9-.3 1.6.2 1.3 1.5z" /></svg>);

export default function Navigation() {
  const [open, setOpen] = useState(false);
  const menu = useRef(null);
  useEffect(() => {
    if (!open) return undefined;
    const close = (e) => { if (e.type === 'keydown' ? e.key === 'Escape' : !menu.current?.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', close);
    return () => { document.removeEventListener('mousedown', close); document.removeEventListener('keydown', close); };
  }, [open]);
  const more = [...MORE, ...(TOKEN_CA ? [[`${TOKEN} live`, `/${TOKEN_CA}`, 'The project token, routed by its own product'], ['Lottery', '/lottery', 'One holder wins a share of the fees, every day']] : [])];

  return (
    <nav className="sticky top-0 z-40 border-b border-line bg-ground/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-6 px-5">
        <Link href="/" className="flex shrink-0 items-center" aria-label={`${BRAND} home`}><Logo mark="h-11 w-11" text="text-xl" /></Link>

        <div className="hidden items-center gap-0.5 md:flex">
          {MAIN.map(([label, href]) => <Link key={href} href={href} className={link}>{label}</Link>)}
          <div className="relative" ref={menu}>
            <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-haspopup="true" className={`${link} inline-flex items-center gap-1 ${open ? '!text-ink' : ''}`}>
              More
              <svg viewBox="0 0 10 6" className={`h-1.5 w-2.5 transition-transform ${open ? 'rotate-180' : ''}`} aria-hidden><path d="M1 1l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </button>
            <AnimatePresence>
              {open && (
                <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }} className="frame absolute left-0 top-full mt-2 w-72 overflow-hidden shadow-soft">
                  <ul className="divide-y divide-line">
                    {more.map(([label, href, note]) => (
                      <li key={href}>
                        <Link href={href} onClick={() => setOpen(false)} className="group flex items-center justify-between gap-3 px-4 py-2.5 transition-colors hover:bg-tile/60">
                          <span><span className="block text-[13px] font-semibold text-ink">{label}</span><span className="block text-xs text-mut">{note}</span></span>
                          <Arrow className="h-3.5 w-3.5 shrink-0 text-mut opacity-0 transition group-hover:translate-x-0.5 group-hover:opacity-100" />
                        </Link>
                      </li>
                    ))}
                  </ul>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        <div className="ml-auto flex items-center gap-1">
          <CopyCA className="mr-2 hidden xl:inline-flex" />
          {X_URL && <a href={X_URL} target="_blank" rel="noopener noreferrer" aria-label={`${BRAND} on X`} className="hidden h-8 w-8 items-center justify-center rounded-lg text-mut transition-colors hover:text-ink sm:flex"><X className="h-[15px] w-[15px]" /></a>}
          {COMMUNITY_URL && <a href={COMMUNITY_URL} target="_blank" rel="noopener noreferrer" aria-label={`${BRAND} community on Telegram`} className="hidden h-8 w-8 items-center justify-center rounded-lg text-mut transition-colors hover:text-ink sm:flex"><Telegram className="h-4 w-4" /></a>}
          {/* The bot: the remote of the product, one tap away from every page */}
          {BOT_URL && (
            <a href={BOT_URL} target="_blank" rel="noopener noreferrer" aria-label={`Open @${BOT_USERNAME} on Telegram`} title={`@${BOT_USERNAME}`} className="hidden h-8 items-center gap-1.5 rounded-lg border border-line px-2.5 text-xs font-semibold text-ink transition-colors hover:border-[#2AABEE] hover:text-[#2AABEE] sm:flex">
              <Telegram className="h-4 w-4 text-[#2AABEE]" />Bot
            </a>
          )}
          <a href={GITHUB_URL} target="_blank" rel="noopener noreferrer" aria-label={`${BRAND} on GitHub`} className="hidden h-8 w-8 items-center justify-center rounded-lg text-mut transition-colors hover:text-ink sm:flex"><Github className="h-[17px] w-[17px]" /></a>
          <Link href="/app" className="btn-primary ml-2 whitespace-nowrap !px-3.5 !py-2 text-[13px]">Dashboard <Arrow className="h-3.5 w-3.5" /></Link>
        </div>
      </div>
      {/* On a phone the main links sit under the bar, in one scrollable line */}
      <div className="flex gap-0.5 overflow-x-auto border-t border-line px-3 py-1.5 md:hidden">
        {[...MAIN, ...more.map(([l, h]) => [l, h])].map(([label, href]) => <Link key={href} href={href} className={link}>{label}</Link>)}
      </div>
    </nav>
  );
}
