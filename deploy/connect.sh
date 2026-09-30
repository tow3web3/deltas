#!/usr/bin/env bash
# Switch on the connector of a platform: store its OAuth credentials on the VM
# and restart the site. Run from the repo root (Git Bash):
#   bash deploy/connect.sh github <client id> <client secret>
# Platforms: github, youtube, x, twitch, facebook, instagram, tiktok.
# The values go to frontend/.env.local on the VM and nowhere else. They travel
# over ssh on standard input, so they do not show in the process list of the VM.
set -euo pipefail
VM="root@65.20.103.177"
KEY="$HOME/.ssh/delta-cr"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PLATFORM="${1:-}"
ID="${2:-}"
SECRET="${3:-}"
case "$PLATFORM" in
  github) PREFIX=OAUTH_GITHUB ;;
  youtube) PREFIX=OAUTH_GOOGLE ;;
  x) PREFIX=OAUTH_X ;;
  twitch) PREFIX=OAUTH_TWITCH ;;
  facebook) PREFIX=OAUTH_FACEBOOK ;;
  instagram) PREFIX=OAUTH_INSTAGRAM ;;
  tiktok) PREFIX=OAUTH_TIKTOK ;;
  *) echo "Usage: bash deploy/connect.sh <github|youtube|x|twitch|facebook|instagram|tiktok> <client id> <client secret>"; exit 1 ;;
esac
[ -n "$ID" ] && [ -n "$SECRET" ] || { echo "Both the client id and the client secret are needed."; exit 1; }

scp -q -i "$KEY" "$ROOT/deploy/connect-remote.sh" "$VM:/root/delta/connect-remote.sh"
printf '%s\n%s\n' "$ID" "$SECRET" | ssh -i "$KEY" "$VM" bash /root/delta/connect-remote.sh "$PREFIX" "$PLATFORM"
echo "Callback to declare on the platform: https://deltas.world/api/oauth/$PLATFORM/callback"
