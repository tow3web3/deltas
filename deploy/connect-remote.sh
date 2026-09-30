#!/usr/bin/env bash
# Runs on the VM, called by deploy/connect.sh. Reads the client id and the
# client secret from standard input, one per line, writes them to the env file
# of the site and restarts it.
set -euo pipefail
PREFIX="$1"
PLATFORM="$2"
read -r ID
read -r SECRET
[ -n "$ID" ] && [ -n "$SECRET" ] || { echo "Missing value"; exit 1; }
ENV=/root/delta/frontend/.env.local
cp "$ENV" "$ENV.bak"
grep -v -E "^${PREFIX}_CLIENT_(ID|SECRET)=" "$ENV.bak" > "$ENV" || true
printf '%s_CLIENT_ID=%s\n%s_CLIENT_SECRET=%s\n' "$PREFIX" "$ID" "$PREFIX" "$SECRET" >> "$ENV"
chmod 600 "$ENV"
rm -f "$ENV.bak"
systemctl restart delta-web
sleep 4
systemctl is-active delta-web
curl -s --max-time 20 http://127.0.0.1:5401/api/claim | grep -oE "\"$PLATFORM\":(true|false)"
