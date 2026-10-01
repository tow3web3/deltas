// The DELTA mark: the owner's artwork (design/delta-logo-source.png), a white D
// with an electric blue glow. delta-mark.png is the same artwork with its black
// ground turned into transparency; the square icons (delta-64, -256, -512) keep
// the ground for the browser tab and the share cards.
export function Mark({ className = 'h-10 w-10' }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src="/brand/delta-mark.png" alt="" aria-hidden="true" width={256} height={256} className={`shrink-0 object-contain ${className}`} />
  );
}

export function Wordmark({ className = 'text-lg' }) {
  return (
    <span className={`whitespace-nowrap font-display font-medium tracking-[-0.01em] text-ink ${className}`}>
      DELTA
    </span>
  );
}

export default function Logo({ mark = 'h-10 w-10', text = 'text-xl' }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <Mark className={mark} />
      <Wordmark className={text} />
    </span>
  );
}
