#!/usr/bin/env bash
# Put the project token live on the site and in the bot, in one go.
# Usage (from the repo root, Git Bash):
#   bash deploy/set-token.sh <contract address> [symbol] [min hold to set up a coin]
#   bash deploy/set-token.sh 0xabc… ROUTE 0
# What it does: checks the address is an ERC-20 on Robinhood Chain, writes the
# token into both env files on the VM, then rebuilds and restarts (the site
# bakes NEXT_PUBLIC_* values in at build time). The holders-only gate of the bot
# is MIN_HOLD_TO_ACTIVATE: 0 means anyone can set up a coin; N means the dev
# wallet must hold N tokens first.
set -euo pipefail
CA="${1:-}"; SYMBOL="${2:-ROUTE}"; MIN_HOLD="${3:-0}"
VM="root@65.20.103.177"; KEY="$HOME/.ssh/delta-cr"; RPC="https://rpc.mainnet.chain.robinhood.com"
[[ "$CA" =~ ^0x[0-9a-fA-F]{40}$ ]] || { echo "Give the token's contract address (0x + 40 hex characters)"; exit 1; }
[[ "$MIN_HOLD" =~ ^[0-9]+$ ]] || { echo "The minimum hold must be a whole number of tokens"; exit 1; }
CA="$(echo "$CA" | tr 'A-F' 'a-f')"

call() { curl -s -X POST "$RPC" -H "Content-Type: application/json" -d "{\"jsonrpc\":\"2.0\",\"id\":1,\"method\":\"eth_call\",\"params\":[{\"to\":\"$CA\",\"data\":\"$1\"},\"latest\"]}" | python -c "import sys,json; print(json.load(sys.stdin).get('result',''))"; }
decode() { python -c "
import sys; r=sys.argv[1][2:]
b=bytes.fromhex(r) if r else b''
print(b[64:64+int.from_bytes(b[32:64],'big')].decode(errors='ignore') if len(b)>64 else '')" "$1"; }
echo "Checking $CA on Robinhood Chain"
CHAIN_SYMBOL="$(decode "$(call 0x95d89b41)")"
CHAIN_NAME="$(decode "$(call 0x06fdde03)")"
DECIMALS="$(python -c "import sys; r=sys.argv[1]; print(int(r,16) if r and r!='0x' else '')" "$(call 0x313ce567)")"
[ -n "$CHAIN_SYMBOL" ] || { echo "No ERC-20 answers at that address. Check the chain and the address."; exit 1; }
echo "  $CHAIN_NAME (\$$CHAIN_SYMBOL), $DECIMALS decimals"
if [ "$(echo "$CHAIN_SYMBOL" | tr 'a-z' 'A-Z')" != "$(echo "$SYMBOL" | tr 'a-z' 'A-Z')" ]; then
  echo "  The contract says \$$CHAIN_SYMBOL, you said \$$SYMBOL. Using \$$CHAIN_SYMBOL."; SYMBOL="$CHAIN_SYMBOL"
fi
[ -f "frontend/public/logos/tokens/$SYMBOL.png" ] || echo "  Note: no logo at frontend/public/logos/tokens/$SYMBOL.png; the screener's image will be used."

echo "Writing the token into both env files on the VM"
ssh -i "$KEY" "$VM" bash -s "$CA" "$SYMBOL" "$MIN_HOLD" <<'EOF'
set -euo pipefail
CA="$1"; SYMBOL="$2"; MIN_HOLD="$3"
put() { local f="$1" k="$2" v="$3"; if grep -q "^$k=" "$f"; then sed -i "s|^$k=.*|$k=$v|" "$f"; else echo "$k=$v" >> "$f"; fi; }
F=/root/delta/frontend/.env.local; B=/root/delta/backend/.env
cp "$F" "/root/.env.local.backup-$(date +%Y%m%d-%H%M%S)"; cp "$B" "/root/.env.backup-$(date +%Y%m%d-%H%M%S)"; chmod 600 /root/.env*.backup-* 2>/dev/null || true
put "$F" NEXT_PUBLIC_TOKEN_CA "$CA"
put "$F" NEXT_PUBLIC_TOKEN_SYMBOL "$SYMBOL"
put "$B" PROJECT_TOKEN_ADDRESS "$CA"
put "$B" PROJECT_TOKEN_SYMBOL "$SYMBOL"
put "$B" MIN_HOLD_TO_ACTIVATE "$MIN_HOLD"
echo "  site: $(grep -E '^NEXT_PUBLIC_TOKEN_(CA|SYMBOL)=' "$F" | tr '\n' ' ')"
echo "  bot:  $(grep -E '^(PROJECT_TOKEN_(ADDRESS|SYMBOL)|MIN_HOLD_TO_ACTIVATE)=' "$B" | tr '\n' ' ')"
EOF

echo "Rebuilding and restarting"
bash "$(dirname "$0")/redeploy.sh" | tail -3
echo
echo "Live checks"
curl -s -o /dev/null -w "  site %{http_code}\n" "https://deltas.world/$CA"
curl -s "https://deltas.world/" | grep -qi "CA soon" && echo "  header still says 'CA soon' (build cache?)" || echo "  header shows the address"
echo "Done. Next: link \$$SYMBOL in the dashboard so it routes its own fees, and post the address."
