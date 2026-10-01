#!/usr/bin/env bash
# Put the project token live on the site and in the bot, in one go.
# Usage (from the repo root, Git Bash):
#   bash deploy/set-token.sh <mint or 0x address> [min hold to set up a coin] [symbol]
#   bash deploy/set-token.sh <the $DELTAS mint> 0 DELTAS
# What it does:
#   1. checks the token: Jupiter for a Solana mint (a pump.fun coin), eth_call for a 0x token.
#      Right after a launch Jupiter can lag a few minutes: a mint that exists on Solana is then
#      taken with the symbol given as the third argument;
#   2. writes it into the bot's env on the VM and restarts the bot once no cycle is running;
#   3. sets it on Vercel and redeploys the site (NEXT_PUBLIC_* values are baked in at build time).
# The minimum hold is the holders-only gate, in the bot and on the dashboard: 0 means anyone
# can set up a coin; N means the creator wallet must hold N tokens first.
set -euo pipefail
CA="${1:-}"; MIN_HOLD="${2:-0}"; GIVEN_SYMBOL="${3:-}"
VM="root@65.20.103.177"; KEY="$HOME/.ssh/delta-cr"
DIR="${DELTA_DIR:-/root/routepay}"; SERVICE="${DELTA_BOT_SERVICE:-routepay-bot}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
[[ "$MIN_HOLD" =~ ^[0-9]+$ ]] || { echo "The minimum hold must be a whole number of tokens"; exit 1; }

if [[ "$CA" =~ ^0x[0-9a-fA-F]{40}$ ]]; then
  CHAIN="Robinhood Chain"; CA="$(echo "$CA" | tr 'A-F' 'a-f')"; RPC="https://rpc.mainnet.chain.robinhood.com"
  call() { curl -s -X POST "$RPC" -H "Content-Type: application/json" -d "{\"jsonrpc\":\"2.0\",\"id\":1,\"method\":\"eth_call\",\"params\":[{\"to\":\"$CA\",\"data\":\"$1\"},\"latest\"]}" | python -c "import sys,json; print(json.load(sys.stdin).get('result',''))"; }
  SYMBOL="$(python -c "
import sys; r=sys.argv[1][2:]
b=bytes.fromhex(r) if r else b''
print(b[64:64+int.from_bytes(b[32:64],'big')].decode(errors='ignore') if len(b)>64 else '')" "$(call 0x95d89b41)")"
  NAME="$SYMBOL"
elif [[ "$CA" =~ ^[1-9A-HJ-NP-Za-km-z]{32,44}$ ]]; then
  CHAIN="Solana"
  read -r SYMBOL NAME < <(curl -s "https://lite-api.jup.ag/tokens/v2/search?query=$CA" | python -c "
import sys, json
mint = sys.argv[1]
d = json.load(sys.stdin)
t = next((x for x in (d if isinstance(d, list) else []) if x.get('id') == mint), None)
print((t['symbol'] + ' ' + t['name']) if t else '')" "$CA")
  if [ -z "${SYMBOL:-}" ]; then
    # Not on Jupiter yet: is the mint on chain at all?
    EXISTS="$(curl -s https://api.mainnet-beta.solana.com -H 'Content-Type: application/json' -d "{\"jsonrpc\":\"2.0\",\"id\":1,\"method\":\"getAccountInfo\",\"params\":[\"$CA\",{\"encoding\":\"base64\"}]}" | python -c "import sys,json; print('yes' if (json.load(sys.stdin).get('result') or {}).get('value') else '')")"
    if [ -n "$EXISTS" ] && [ -n "$GIVEN_SYMBOL" ]; then SYMBOL="$GIVEN_SYMBOL"; NAME="$GIVEN_SYMBOL (not on Jupiter yet)";
    elif [ -n "$EXISTS" ]; then echo "The mint exists but Jupiter does not list it yet: wait a minute, or pass the symbol as the third argument."; exit 1;
    else echo "No mint at $CA on Solana yet: launch the coin first."; exit 1; fi
  fi
else
  echo "Give the token's address: a Solana mint (base58) or a 0x address"; exit 1
fi
[ -n "${SYMBOL:-}" ] || { echo "No token answers at $CA on $CHAIN. If the coin was just launched, wait a minute for Jupiter to list it."; exit 1; }
SYMBOL="$(echo "$SYMBOL" | tr -d '$')"
echo "Token: $NAME (\$$SYMBOL) on $CHAIN"
[ -f "$ROOT/frontend/public/logos/tokens/$SYMBOL.png" ] || echo "  Note: no logo at frontend/public/logos/tokens/$SYMBOL.png; the screener's image will be used."
echo "Holders-only gate: $([ "$MIN_HOLD" = 0 ] && echo 'off, anyone can set up a coin' || echo "the creator wallet must hold $MIN_HOLD \$$SYMBOL")"

echo "1/3 The bot (VM)"
ssh -i "$KEY" "$VM" bash -s "$CA" "$SYMBOL" "$MIN_HOLD" "$DIR" "$SERVICE" <<'EOF'
set -euo pipefail
CA="$1"; SYMBOL="$2"; MIN_HOLD="$3"; DIR="$4"; SERVICE="$5"
B="$DIR/backend/.env"
cp "$B" "$B.bak-$(date +%Y%m%d-%H%M%S)"; chmod 600 "$B".bak-* 2>/dev/null || true
put() { local k="$1" v="$2"; if grep -q "^$k=" "$B"; then sed -i "s|^$k=.*|$k=$v|" "$B"; else printf '%s=%s\n' "$k" "$v" >> "$B"; fi; }
put PROJECT_TOKEN_ADDRESS "$CA"
put PROJECT_TOKEN_SYMBOL "$SYMBOL"
put MIN_HOLD_TO_ACTIVATE "$MIN_HOLD"
echo "  $(grep -E '^(PROJECT_TOKEN_(ADDRESS|SYMBOL)|MIN_HOLD_TO_ACTIVATE)=' "$B" | tr '\n' ' ')"
for i in $(seq 1 72); do
  H="$(curl -sf --max-time 5 http://127.0.0.1:5400/api/health || echo '"busy":[]')"
  printf '%s' "$H" | grep -qF '"busy":[]' && break
  echo "  cycle in flight, waiting"; sleep 5
done
systemctl restart "$SERVICE"; sleep 3
echo "  bot $(systemctl is-active "$SERVICE")"
EOF

echo "2/3 The site settings (Vercel)"
cd "$ROOT/frontend"
setenv() { npx vercel env rm "$1" production --yes >/dev/null 2>&1 || true; printf '%s' "$2" | npx vercel env add "$1" production >/dev/null; echo "  $1 set"; }
setenv NEXT_PUBLIC_TOKEN_CA "$CA"
setenv NEXT_PUBLIC_TOKEN_SYMBOL "$SYMBOL"
setenv MIN_HOLD_TO_ACTIVATE "$MIN_HOLD"

echo "3/3 Rebuilding the site"
LAST="$(npx vercel ls deltas 2>/dev/null | grep -Eo 'https://deltas-[a-z0-9]+-[a-z0-9-]+\.vercel\.app' | head -1)"
[ -n "$LAST" ] || { echo "  Could not find the last deployment: push any commit to main to rebuild."; exit 1; }
npx vercel redeploy "$LAST" --target production 2>&1 | tail -1

echo
echo "Live checks"
curl -s -o /dev/null -w "  coin page %{http_code} (404 until the coin is set up on the dashboard)\n" "https://deltas.world/$CA"
curl -s "https://deltas.world/" | grep -q "$CA" && echo "  the header shows the address" || echo "  the header does not show the address yet (the build may still be finishing)"
echo "Done. Next: set up \$$SYMBOL on https://deltas.world/app with its creator wallet, run the first cycle, then post the address."
