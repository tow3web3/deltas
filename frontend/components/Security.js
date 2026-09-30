// The guarantees, as a specification sheet. Each line says what is guaranteed,
// how it is enforced and the value that can be checked. Beside it, the scope of
// the dev wallet key: the three calls a cycle makes, and nothing else.
import { Arrow, Check, Blocked } from './Icons';
import StockLogo from './StockLogo';
import { BRAND } from '../lib/brand';
import { getStock } from '../lib/stocks';

const SPEC = [
  {
    what: 'Key at rest',
    how: 'Your wallet key is encrypted the moment you send it and stored encrypted. It is only ever decrypted in memory, at execution time.',
    values: ['AES-256-GCM'],
  },
  {
    what: 'Least privilege',
    how: 'A cycle collects fees, swaps on Uniswap, and transfers each share to its route. Nothing else runs against your wallet.',
    values: ['collect', 'swap', 'transfer'],
  },
  {
    what: 'Price guard',
    how: 'A stock swap only executes when the pool delivers at least 90% of the Yahoo Finance price. Thin pools never eat your fees.',
    values: ['90% of fair price'],
  },
  {
    what: 'Page vaults',
    how: 'Each page has its own wallet. Its key is encrypted at rest like a dev wallet key, and the vault is only ever swept to the wallet its verified owner binds.',
    values: ['1 vault per page', 'AES-256-GCM'],
  },
  {
    what: 'Owner control',
    how: `Pause, resume, or delete your configuration from Telegram instantly. Deleting removes ${BRAND}'s access for good.`,
    values: ['pause', 'resume', 'delete'],
  },
];

const SCOPE = [
  { call: 'collect', note: 'the fees waiting in the dev wallet', ok: true },
  { call: 'swap', note: 'on Uniswap, behind the price guard', ok: true },
  { call: 'transfer', note: 'each share to its route', ok: true },
  { call: 'anything else', note: 'never runs', ok: false },
];

const ROUTES = ['holders', 'your wallets', 'burn address', 'treasury', 'page vaults'];

/** The guard as a gauge: the pool price against fair price, with the floor marked at 90%. */
function Guard() {
  const nvda = getStock('NVDA');
  return (
    <div className="border-t border-line px-5 py-5">
      <div className="flex items-center justify-between">
        <span className="label">Price guard</span>
        <span className="flex items-center gap-1.5 font-mono text-[11.5px] text-ink"><StockLogo address={null} size="h-4 w-4" text="text-[5px]" />ETH<Arrow className="h-3 w-3 text-mut" /><StockLogo address={nvda?.address} size="h-4 w-4" text="text-[5px]" />NVDA</span>
      </div>
      <div className="relative mt-7 h-[6px] rounded-full bg-line">
        <div className="absolute inset-y-0 left-0 w-[90%] rounded-l-full bg-down/40" />
        <div className="absolute inset-y-0 left-[90%] right-0 rounded-r-full bg-hood-500" />
        <div className="absolute -bottom-1.5 -top-1.5 left-[90%] w-px bg-ink" />
        <span className="figure absolute -top-6 left-[90%] -translate-x-1/2 text-xs text-ink">90%</span>
      </div>
      <div className="mt-2.5 flex items-start justify-between gap-4 text-[12.5px] leading-snug">
        <span className="text-mut">Pool below the floor:<br /><span className="text-ink/85">the cycle pays ETH instead</span></span>
        <span className="text-right text-mut">At or above:<br /><span className="text-hood-600">the swap runs</span></span>
      </div>
      <div className="label mt-3 !text-[9.5px]">pool price as a share of the Yahoo Finance price</div>
    </div>
  );
}

export default function Security() {
  return (
    <div id="security" className="scroll-mt-20">
      <div className="grid items-end gap-6 lg:grid-cols-[1fr_auto]">
        <div className="max-w-2xl">
          <div className="eyebrow mb-3">Security</div>
          <h2 className="font-display text-3xl font-medium tracking-tight text-ink sm:text-4xl">Built so your keys stay yours</h2>
          <p className="mt-3 text-[15px] leading-relaxed text-mut">{BRAND} handles a wallet key to automate on-chain actions, so it is designed around least privilege, encryption, a price guard, and full owner control.</p>
        </div>
        <div className="label lg:text-right">Specification<br /><span className="text-ink">{SPEC.length} guarantees</span></div>
      </div>

      <div className="mt-7 grid gap-3 lg:grid-cols-12">
        {/* The sheet */}
        <div className="frame flex flex-col overflow-hidden lg:col-span-8">
          <div className="label hidden grid-cols-[34px_130px_1fr_150px] gap-4 border-b border-line px-5 py-2.5 md:grid">
            <span>No</span><span>Guarantee</span><span>How it is enforced</span><span className="text-right">Value</span>
          </div>
          <ol className="grid flex-1 divide-y divide-line lg:auto-rows-fr">
            {SPEC.map((s, i) => (
              <li key={s.what} className="grid grid-cols-[34px_1fr] content-center gap-x-4 gap-y-2 px-5 py-4 md:grid-cols-[34px_130px_1fr_150px]">
                <span className="figure pt-px text-sm text-mut">{String(i + 1).padStart(2, '0')}</span>
                <h3 className="text-[15px] font-semibold leading-snug text-ink">{s.what}</h3>
                <div className="col-start-2 text-sm leading-relaxed text-mut md:col-start-auto">
                  {s.how}
                </div>
                <div className="col-start-2 flex flex-wrap content-start gap-1.5 md:col-start-auto md:justify-end">
                  {s.values.map((v) => <code key={v} className="h-fit whitespace-nowrap rounded border border-line bg-ground px-1.5 py-0.5 font-mono text-[11.5px] text-hood-600">{v}</code>)}
                </div>
              </li>
            ))}
          </ol>
        </div>

        {/* The scope of the key */}
        <div className="frame flex flex-col overflow-hidden lg:col-span-4">
          <div className="label border-b border-line px-5 py-2.5">What the dev wallet key is used for</div>
          <div className="flex-1 px-5 py-5">
            <div className="font-mono text-[12.5px] text-ink">dev wallet key</div>
            <ul className="relative ml-[5px] mt-1 border-l border-line">
              {SCOPE.map((s) => (
                <li key={s.call} className="relative pl-6 pt-4">
                  <span className="absolute left-0 top-[27px] h-px w-4 bg-line" />
                  <div className="flex items-center justify-between gap-3">
                    <code className={`font-mono text-[12.5px] ${s.ok ? 'text-hood-600' : 'text-mut line-through decoration-down/70'}`}>{s.call}</code>
                    {s.ok
                      ? <span className="label flex items-center gap-1 !text-[9.5px] !text-hood-600"><Check className="h-3 w-3" />runs</span>
                      : <span className="label flex items-center gap-1 !text-[9.5px] !text-down"><Blocked className="h-3 w-3" />blocked</span>}
                  </div>
                  <div className="mt-0.5 text-[13px] text-mut">{s.note}</div>
                  {s.call === 'transfer' && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {ROUTES.map((r) => <span key={r} className="rounded border border-line px-1.5 py-px font-mono text-[10.5px] text-ink/80">{r}</span>)}
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </div>
          <Guard />
          <p className="border-t border-line bg-ground/60 px-5 py-3 text-[13px] leading-relaxed text-mut">
            <span className="text-ink">Use a dedicated wallet</span>, funded with just what a cycle needs, never your main holdings.
          </p>
        </div>
      </div>
    </div>
  );
}
