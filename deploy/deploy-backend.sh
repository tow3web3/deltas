#!/usr/bin/env bash
# Ship the backend (bot, scheduler, internal API) to the VM and restart it.
# The site runs on Vercel and deploys on push; this is the other half.
# Usage (from the repo root, Git Bash): bash deploy/deploy-backend.sh
# Never touches the .env file on the VM.
set -euo pipefail
VM="root@65.20.103.177"
KEY="$HOME/.ssh/delta-cr"
# Where the install lives today, and its service name. They move to /root/delta
# and delta-bot when deploy/rename-remote.sh is run.
DIR="${DELTA_DIR:-/root/routepay}"
SERVICE="${DELTA_BOT_SERVICE:-routepay-bot}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
STAMP="$(date +%Y%m%d-%H%M%S)"

tar -C "$ROOT" --exclude=node_modules --exclude='*.env' --exclude='.env.*' -czf "/tmp/delta-backend-$STAMP.tgz" backend
scp -q -i "$KEY" "/tmp/delta-backend-$STAMP.tgz" "$VM:/root/delta-backend-$STAMP.tgz"
ssh -i "$KEY" "$VM" bash -s "$STAMP" "$DIR" "$SERVICE" <<'EOF'
set -euo pipefail
STAMP="$1"; DIR="$2"; SERVICE="$3"
cd "$DIR"
tar -czf "/root/delta-backend-prev-$STAMP.tgz" --exclude=node_modules backend 2>/dev/null || true
ls -t /root/delta-backend-prev-*.tgz 2>/dev/null | tail -n +4 | xargs -r rm -f
# Clear the code folders first so files deleted from the repo go too; .env and node_modules stay.
rm -rf backend/src backend/scripts
tar -xzf "/root/delta-backend-$STAMP.tgz" && rm -f "/root/delta-backend-$STAMP.tgz"
cd backend && npm ci --omit=dev --no-audit --no-fund 2>&1 | tail -1
( set -a; . ./.env; set +a; node src/db/migrate.js | tail -1 )
echo "Waiting for running cycles to finish"
for i in $(seq 1 72); do
  H="$(curl -sf --max-time 5 http://127.0.0.1:5400/api/health || echo '"busy":[]')"
  printf '%s' "$H" | grep -qF '"busy":[]' && break
  echo "  cycle in flight, waiting"; sleep 5
done
systemctl restart "$SERVICE"
sleep 3
systemctl is-active "$SERVICE"
EOF
echo "Backend deployed."
