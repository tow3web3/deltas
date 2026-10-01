# DELTA · the visual system

DELTA routes a coin's creator fees anywhere: holders, wallets, buybacks, a treasury in real stocks (xStocks on Solana, Robinhood Stock Tokens on Robinhood Chain), and any page on the internet. Solana first, Robinhood Chain second. The look is **glass and light** around the logo: a white D with an electric blue-to-violet glow on black.

Reference implementation: `frontend/components/Hero.js`, `frontend/components/ui/Light.js`, `frontend/app/preview/page.js` (the approved preview), `frontend/app/globals.css` (base classes), `frontend/tailwind.config.js` (tokens).

## Tokens (Tailwind)

| Role | Class | Value |
|---|---|---|
| Ground | `bg-ground` | `#05070C`, lit by the body gradients (blue top-left, violet bottom-right) |
| Panel fill | `bg-paper` (rarely needed: use `.panel`/`.frame`) | `#0B0F17` |
| Raised tile | `bg-tile` | `#111726` |
| Hairline | `border-line`, or `border-white/10` on glass | `#1B2232` |
| Text | `text-ink` / `text-mut` / `text-dim` | `#F3F5F9` / `#8A93A6` / `#5A6275` |
| Accent blue | `hood-500` (`#2FA8FF`), tints `hood-50…300`, lighter `hood-600…900` | the glow |
| Accent cyan | `text-cyan-500` (`#5FE3FF`) | lit edges, "live" dots, shares |
| Accent violet | `violet-500` (`#7B5CFF`) | the far end of gradients only |
| Gradient | `.beam` (background), `.text-beam` (text) | blue → cyan → violet |
| Warnings | `gold-*`, `down`, `orange-*` | unchanged roles |

## Type

Geist everywhere (`font-sans` = `font-display`), Geist Mono for addresses, figures, labels. Headlines weight 500, tracking -0.03em, leading ≤1.05. Never bold (600 is the max). `.label` = mono 10.5px uppercase tracking 0.2em dim. `.figure` = tabular digits.

## Surfaces

- `.frame`: glass panel with the **left** edge lit cyan (the light comes from the left). `.frame.frame-top` lights the top edge instead. `.panel`: glass without a lit edge.
- Glass = `rgba(255,255,255,0.035)` fill, `rgba(255,255,255,0.08)` border, sheen gradient, `backdrop-filter: blur(18px)`. Radii: `rounded-xl` 14px, `rounded-2xl` 20px, `rounded-3xl` 26px.
- No corner brackets, no hairline "instrument" boxes, no solid lime. Shadows: `shadow-soft` (depth), `shadow-glow` (lit), `shadow-beam` (behind primary buttons).
- Inside a glass panel, separators are `border-white/10`, chips are `rounded-2xl border border-white/10 bg-white/5`.

## Buttons

`.btn-primary`: pill, `.beam` gradient, dark text, soft glow. `.btn-ghost`: glass pill. `.btn-ink`: white pill. Links in text: `text-hood-600` underline on hover.

## The signature: light flows

The routing is drawn as light: one beam enters from the left, splits into channels whose thickness is their share, white pulses travel along them, destinations sit at the ends as glass chips with real logos. Use `Flow` and `FlowChip` from `components/ui/Light.js`. Any place that shows a split (a coin's routing, a receipt, a page's sources) should use a flow or a horizontal **channel bar** (`.beam` bar whose width is the share) rather than a table of percentages.

## Section grammar

- `.eyebrow` (mono, dot) above a headline; headline 36–44px; body `text-mut` 16px, max-w-sm/md.
- Sections differ in composition: split (text left, object right), centred (headline then a wide object), bleed (full-width band). Never two identical cards grids in a row.
- Between sections: `<Cut />` (the diagonal hairline) or generous space (`space-y-24`). No section borders.
- Logos always real: platforms via `PlatformIcon`, stocks/tokens via `StockLogo`, the mark via `Mark`.
- Motion: entrance `opacity 0→1, y 14→0`, 0.6s, ease `[0.16,1,0.3,1]`; counters count up; pulses on flows. Nothing bounces.
- No emoji anywhere on the site. Copy says Solana first; Robinhood Chain is mentioned as the second chain, never as the only one.

## Chains

Native currency comes from `lib/chains.js` (`CHAINS[chain].native`: SOL or ETH). Explorer links through `explorerTx/Address/Token` (they pick Solscan or Blockscout from the address). Amounts: `0.0525 SOL`, never a hard-coded "ETH".
