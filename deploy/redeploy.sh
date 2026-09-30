#!/usr/bin/env bash
# Ship the repo to the VM and restart both services.
# Usage (from the repo root, Git Bash): bash deploy/redeploy.sh
# Never touches the .env files on the VM.
set -euo pipefail
VM="root@65.20.103.177"
KEY="$HOME/.ssh/delta-cr"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
STAMP="$(date +%Y%m%d-%H%M%S)"

echo "Packing sources"
tar -C "$ROOT" \
  --exclude=node_modules --exclude=.next --exclude=.git --exclude='*.env' --exclude='.env.*' --exclude=.vercel \
  -czf "/tmp/delta-$STAMP.tgz" backend frontend contracts deploy README.md

echo "Uploading"
scp -i "$KEY" "/tmp/delta-$STAMP.tgz" "$VM:/root/delta-$STAMP.tgz"

ssh -i "$KEY" "$VM" bash -s "$STAMP" <<'EOF'
set -euo pipefail
STAMP="$1"
mkdir -p /root/delta
cd /root/delta
# Keep a backup of the previous sources (env files excluded from the tarball, so they survive).
if [ -d backend ]; then tar -czf "/root/delta-prev-$STAMP.tgz" --exclude=node_modules --exclude=.next backend frontend 2>/dev/null || true; fi
# Three backups are enough: older ones only fill the disk.
ls -t /root/delta-prev-*.tgz 2>/dev/null | tail -n +4 | xargs -r rm -f
# Clear the source folders first: unpacking over them would keep every file that
# was deleted from the repo. The env files and node_modules live outside of them.
rm -rf backend/src backend/scripts frontend/app frontend/components frontend/lib frontend/public frontend/scripts contracts deploy
tar -xzf "/root/delta-$STAMP.tgz"
rm -f "/root/delta-$STAMP.tgz"

echo "Backend deps + migrate"
cd /root/delta/backend && npm ci --omit=dev --no-audit --no-fund 2>&1 | tail -1
# Subshell: backend/.env sets NODE_ENV=production, which must not leak into the frontend install
# (npm would skip tailwindcss and the build fails).
( set -a; . ./.env; set +a; node src/db/migrate.js | tail -1 )

echo "Frontend deps + build"
cd /root/delta/frontend && npm ci --include=dev --no-audit --no-fund 2>&1 | tail -1
( set -a; . ./.env.local; set +a; NODE_OPTIONS=--max-old-space-size=2048 npx next build 2>&1 | grep -E "Compiled|rror" | head -3 )
# Standalone output needs the static assets next to server.js.
SA="$(dirname "$(find .next/standalone -maxdepth 2 -name server.js | head -1)")"
mkdir -p "$SA/.next" && cp -r .next/static "$SA/.next/" && cp -r public "$SA/"

echo "Waiting for running cycles to finish before restarting the bot"
for i in $(seq 1 72); do
  H="$(curl -sf --max-time 5 http://127.0.0.1:5400/api/health || echo '"busy":[]')"
  if ! printf '%s' "$H" | grep -qF '"busy"'; then break; fi
  if printf '%s' "$H" | grep -qF '"busy":[]'; then break; fi
  echo "  cycle in flight ($H), waiting"
  sleep 5
done
systemctl restart delta-bot delta-web
sleep 3
systemctl is-active delta-bot delta-web
EOF
echo "Deployed. https://deltas.world"
