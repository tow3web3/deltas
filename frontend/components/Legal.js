// The layout of the privacy and terms pages: a numbered index that stays in
// view on the left, the text on the right. The text itself lives in lib/legal.js.
import Link from 'next/link';
import { CONTACT_EMAIL } from '../lib/brand';

const anchor = (s) => s.id || s.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const num = (i) => String(i + 1).padStart(2, '0');

/** A paragraph is a string, a list is an array of strings, a table is { rows: [[left, right]] }. */
function Block({ b }) {
  if (typeof b === 'string') return <p>{b}</p>;
  if (Array.isArray(b)) {
    return (
      <ul className="space-y-2">
        {b.map((t) => <li key={t} className="grid grid-cols-[14px_1fr] gap-2"><span aria-hidden="true" className="mt-[0.7em] h-px w-2.5 bg-hood-500" /><span>{t}</span></li>)}
      </ul>
    );
  }
  if (b.rows) {
    return (
      <dl className="overflow-hidden rounded-xl border border-line">
        {b.rows.map(([k, v]) => (
          <div key={k} className="grid gap-1 border-b border-line bg-paper px-4 py-3 last:border-b-0 sm:grid-cols-[180px_1fr] sm:gap-4">
            <dt className="text-sm font-semibold text-ink">{k}</dt>
            <dd className="text-sm text-mut">{v}</dd>
          </div>
        ))}
      </dl>
    );
  }
  if (b.link) return <p><a href={b.link} target="_blank" rel="noopener noreferrer" className="text-hood-500 underline decoration-hood-300 underline-offset-4 transition hover:text-hood-400">{b.label}</a></p>;
  return null;
}

export default function Legal({ eyebrow, title, intro, updated, sections, other }) {
  return (
    <div className="grid gap-10 lg:grid-cols-[220px_1fr] lg:gap-16">
      <aside className="hidden lg:sticky lg:top-24 lg:block lg:self-start">
        <div className="label">On this page</div>
        <ol className="mt-3 space-y-1.5 border-l border-line">
          {sections.map((s, i) => (
            <li key={s.title}>
              <a href={`#${anchor(s)}`} className="-ml-px flex gap-2.5 border-l border-transparent py-0.5 pl-3 text-sm text-mut transition hover:border-hood-500 hover:text-ink">
                <span className="figure font-mono text-[11px] leading-5 text-mut/60">{num(i)}</span>{s.title}
              </a>
            </li>
          ))}
        </ol>
        <div className="mt-6 text-sm"><Link href={other.href} className="text-mut transition hover:text-ink">{other.label} →</Link></div>
      </aside>

      <article className="min-w-0 max-w-2xl">
        <div className="eyebrow">{eyebrow}</div>
        <h1 className="mt-3 font-display text-4xl font-medium leading-[1.05] tracking-tight text-ink sm:text-5xl">{title}</h1>
        <p className="mt-4 text-base leading-relaxed text-mut">{intro}</p>
        <div className="label mt-4">Last updated {updated}</div>

        <div className="mt-10 space-y-12">
          {sections.map((s, i) => (
            <section key={s.title} id={anchor(s)} className="scroll-mt-24">
              <div className="flex items-baseline gap-3 border-b border-line pb-3">
                <span className="figure font-mono text-xs text-hood-500">{num(i)}</span>
                <h2 className="font-display text-xl font-medium tracking-tight text-ink">{s.title}</h2>
              </div>
              <div className="mt-4 space-y-4 text-[15px] leading-relaxed text-mut">
                {s.body.map((b, j) => <Block key={j} b={b} />)}
              </div>
            </section>
          ))}
        </div>

        <div className="mt-12 rounded-xl border border-line bg-paper px-5 py-4 text-sm text-mut">
          A question about this page: <a href={`mailto:${CONTACT_EMAIL}`} className="font-mono text-ink transition hover:text-hood-500">{CONTACT_EMAIL}</a>
        </div>
      </article>
    </div>
  );
}
