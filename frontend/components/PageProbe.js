'use client';

// The hero's input: paste the link of any page and see it become a
// destination. The page is looked up for real (its picture, whether a coin
// already routes to it, whether its owner claimed it).
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { AnimatePresence, motion } from 'motion/react';
import { Arrow, PlatformIcon } from './Icons';
import { PLATFORMS, PLATFORM_KEYS, parsePage, pageName, pagePath, pageAvatar } from '../lib/pages';

const EASE = [0.16, 1, 0.3, 1];
// How long the typing must stop before the page is looked up.
const SETTLE = 900;
const HINTS = ['youtube.com/@channel', 'github.com/project', 'x.com/handle', 'yoursite.com', '+33 6 12 34 56 78', 'twitch.tv/channel', 'instagram.com/handle'];

// What a click on a platform writes in the field: the start of its address, ready for the name.
const PREFIX = { youtube: 'youtube.com/@', github: 'github.com/', x: 'x.com/', instagram: 'instagram.com/', facebook: 'facebook.com/', tiktok: 'tiktok.com/@', twitch: 'twitch.tv/', domain: '', phone: '+' };
const startOf = (raw) => PLATFORM_KEYS.find((k) => PREFIX[k] && raw.toLowerCase() === PREFIX[k]);

export default function PageProbe() {
  const [text, setText] = useState('');
  const [hint, setHint] = useState(0);
  const [state, setState] = useState({ status: 'idle' });
  const seq = useRef(0);
  const field = useRef(null);

  // A platform was clicked: write the start of its address and keep the name already typed.
  const choose = (k) => {
    const typed = state.status === 'found' && state.page.platform !== 'domain' && k !== 'domain' ? state.page.handle.replace(/^@/, '') : '';
    const next = k === 'domain' ? '' : PREFIX[k] + (/^UC[\w-]{20,}$/.test(typed) ? '' : typed);
    setText(next);
    requestAnimationFrame(() => {
      field.current?.focus();
      field.current?.setSelectionRange(next.length, next.length);
    });
  };

  useEffect(() => {
    if (text) return undefined;
    const t = setInterval(() => setHint((h) => (h + 1) % HINTS.length), 2600);
    return () => clearInterval(t);
  }, [text]);

  useEffect(() => {
    const raw = text.trim();
    // Whatever was being looked up is for a text that is gone.
    seq.current += 1;
    // Empty, or only the start of an address: the name is still to come.
    if (!raw || startOf(raw)) { setState({ status: 'idle' }); return undefined; }
    const parsed = parsePage(raw);
    if (parsed.error) { setState({ status: raw.length > 5 ? 'error' : 'idle', error: parsed.error }); return undefined; }
    const mine = ++seq.current;
    // The name shows at once, read from the text. Its picture and its state are
    // asked for only when the typing stops: a name half written is not a page.
    setState({ status: 'found', page: parsed, info: null, settled: false });
    const t = setTimeout(async () => {
      if (mine !== seq.current) return;
      setState({ status: 'found', page: parsed, info: null, settled: true });
      try {
        const res = await fetch(`/api/pages/resolve?input=${encodeURIComponent(raw)}`);
        const info = res.ok ? await res.json() : null;
        if (mine === seq.current && info) setState({ status: 'found', page: parsed, info, settled: true });
      } catch { /* the parsed page is enough to show */ }
    }, SETTLE);
    return () => clearTimeout(t);
  }, [text]);

  const page = state.page;
  const active = page?.platform || startOf(text.trim());
  return (
    <div className="max-w-xl">
      <label className="label mb-2 block" htmlFor="probe">Try it: paste the link of any page</label>
      <div className={`flex items-center gap-3 rounded-xl border bg-paper px-4 transition-colors focus-within:border-hood-500 ${state.status === 'error' ? 'border-red-300' : 'border-line'}`}>
        <span className="font-mono text-sm text-hood-600">→</span>
        <div className="relative flex-1">
          <input id="probe" ref={field} value={text} onChange={(e) => setText(e.target.value)} autoComplete="off" spellCheck={false} className="w-full bg-transparent py-3.5 font-mono text-sm text-ink outline-none" aria-describedby="probe-result" />
          {!text && (
            <span className="pointer-events-none absolute inset-0 flex items-center overflow-hidden font-mono text-sm text-mut/60">
              <AnimatePresence mode="popLayout" initial={false}>
                <motion.span key={hint} initial={{ y: 12, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -12, opacity: 0 }} transition={{ duration: 0.35, ease: EASE }}>{HINTS[hint]}</motion.span>
              </AnimatePresence>
            </span>
          )}
        </div>
        <span className="hidden items-center sm:flex">
          {PLATFORM_KEYS.map((k) => (
            <button key={k} type="button" onClick={() => choose(k)} title={PLATFORMS[k].placeholder} aria-label={`Write a ${PLATFORMS[k].label} ${PLATFORMS[k].noun}`}
              className={`rounded-md p-1 transition hover:bg-tile hover:opacity-100 ${active && active !== k ? 'opacity-25' : ''}`}>
              <PlatformIcon platform={k} className="h-3.5 w-3.5" />
            </button>
          ))}
        </span>
      </div>

      <div id="probe-result" className="min-h-[76px]" aria-live="polite">
        <AnimatePresence mode="wait" initial={false}>
          {state.status === 'found' && (
            <motion.div key={`${page.platform}:${page.handle}`} initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.3, ease: EASE }} className="mt-2 flex flex-wrap items-center gap-3 rounded-xl border border-line bg-ground px-4 py-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {state.settled
                ? <img src={pageAvatar(page.platform, page.handle)} alt="" className="h-10 w-10 rounded-full border border-line bg-tile object-cover" />
                : <span className="flex h-10 w-10 animate-pulse items-center justify-center rounded-full border border-line bg-tile"><PlatformIcon platform={page.platform} className="h-4 w-4 opacity-60" /></span>}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 text-sm font-semibold text-ink"><PlatformIcon platform={page.platform} className="h-3.5 w-3.5" /><span className="truncate">{state.info?.name || pageName(page.platform, page.handle)}</span></div>
                <div className="text-xs text-mut">
                  {PLATFORMS[page.platform].label} {PLATFORMS[page.platform].noun} ·{' '}
                  {state.info?.claimed ? 'claimed: paid straight to its owner' : state.info?.exists ? 'already receiving fees, held in its vault' : 'can receive fees today, no account needed'}
                </div>
              </div>
              <div className="flex items-center gap-2">
                {(page.platform !== 'phone' || state.info?.path) && <Link href={state.info?.path || pagePath(page.platform, page.handle)} className="text-xs font-semibold text-mut transition-colors hover:text-ink">Profile</Link>}
                <Link href="/app" className="btn-primary !px-3.5 !py-2 text-xs">Route fees to it <Arrow className="h-3.5 w-3.5" /></Link>
              </div>
            </motion.div>
          )}
          {state.status === 'error' && (
            <motion.p key="error" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="mt-2 px-1 text-xs text-red-600">{state.error}</motion.p>
          )}
          {state.status === 'idle' && (
            <motion.p key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="mt-2.5 px-1 text-xs leading-relaxed text-mut">
              A channel, an account, a site. It gets a vault of its own the moment a coin routes to it, and its owner claims by signing in.
            </motion.p>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
