#!/usr/bin/env bash
# First install of DELTA on the VM. Run once, from the repo root (Git Bash):
#   bash deploy/setup.sh
# It creates the database, writes the two env files with fresh secrets, installs
# the systemd units and the nginx site, and asks for a certificate. Every step
# looks at what is already there first, so running it again changes nothing:
# existing env files and their secrets are never overwritten.
# The secrets are generated on the VM and never leave it.
# Then ship the code with:  bash deploy/redeploy.sh
set -euo pipefail
VM="root@65.20.103.177"
KEY="$HOME/.ssh/delta-cr"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
# The public name of the site, and the names nginx answers to. The sslip.io name
# resolves to the VM without any DNS setup, so the site can be checked before
# the domain points here.
SITE_URL="${SITE_URL:-https://deltas.world}"
HOSTS="${HOSTS:-deltas.world www.deltas.world delta.65-20-103-177.sslip.io}"

scp -q -i "$KEY" "$ROOT/deploy/delta-bot.service" "$ROOT/deploy/delta-web.service" "$ROOT/deploy/nginx-delta.conf" "$VM:/tmp/"

ssh -i "$KEY" "$VM" bash -s "$SITE_URL" "$HOSTS" <<'EOF'
set -euo pipefail
SITE_URL="$1"
# ssh hands the host list over word by word: everything after the first argument is a host.
shift
HOSTS="$*"
FIRST_HOST="${HOSTS%% *}"
APP=/root/delta
mkdir -p "$APP/backend" "$APP/frontend" /var/www/acme

for port in 5400 5401; do
  if ss -ltn | awk 'NR>1{print $4}' | grep -qE ":$port\$" && ! systemctl is-active -q delta-bot delta-web; then
    echo "Port $port is already used by something else. Nothing was changed."; exit 1
  fi
done

echo "Database"
if [ ! -f "$APP/backend/.env" ]; then
  DB_PASS="$(openssl rand -hex 24)"
  if sudo -u postgres psql -Atc "select 1 from pg_roles where rolname='delta'" | grep -q 1; then
    sudo -u postgres psql -qc "alter role delta with login password '$DB_PASS'"
  else
    sudo -u postgres psql -qc "create role delta with login password '$DB_PASS'"
  fi
  sudo -u postgres psql -Atc "select 1 from pg_database where datname='delta'" | grep -q 1 || sudo -u postgres createdb -O delta delta
  DB_URL="postgresql://delta:$DB_PASS@127.0.0.1:5432/delta"
  MASTER="$(openssl rand -hex 32)"
  INTERNAL="$(openssl rand -hex 24)"
  SESSION="$(openssl rand -hex 32)"

  echo "Env files"
  umask 077
  cat > "$APP/backend/.env" <<ENV
NODE_ENV=production
PORT=5400
DATABASE_URL=$DB_URL
RH_RPC_URL=https://rpc.mainnet.chain.robinhood.com
# From @BotFather. The API and the scheduler run without it; the bot starts once it is set.
TELEGRAM_BOT_TOKEN=
FRONTEND_URL=$SITE_URL
CARD_BASE_URL=http://127.0.0.1:5401
X_HANDLE=
COMMUNITY_URL=
PROJECT_TOKEN_ADDRESS=
PROJECT_TOKEN_SYMBOL=DELTA
MIN_HOLD_TO_ACTIVATE=1000000
# Encrypts dev wallets and page vaults. Losing it loses every vault: keep a copy somewhere safe.
MASTER_ENCRYPTION_KEY=$MASTER
TREASURY_PRIVATE_KEY=
PAGES_GAS_PRIVATE_KEY=
PAGES_GAS_TOPUP_MAX_ETH=0.002
MIN_SWAP_FAIR_RATIO=0.9
MIN_DISTRIBUTE_ETH=0.0005
DISPERSE_ADDRESS=
INDEX_CHUNK_BLOCKS=50000
INDEX_MAX_BLOCKS=4000000
EXCLUDED_ADDRESSES=
INTERNAL_API_KEY=$INTERNAL
ENV
  cat > "$APP/frontend/.env.local" <<ENV
NEXT_PUBLIC_SITE_URL=$SITE_URL
NEXT_PUBLIC_BOT_USERNAME=
NEXT_PUBLIC_X_URL=
NEXT_PUBLIC_COMMUNITY_URL=
NEXT_PUBLIC_GITHUB_URL=https://github.com/tow3web3/deltas
NEXT_PUBLIC_TOKEN_SYMBOL=DELTA
NEXT_PUBLIC_TOKEN_CA=
DATABASE_URL=$DB_URL
RH_RPC_URL=https://rpc.mainnet.chain.robinhood.com
HOOKS_ADMIN_KEY=$(openssl rand -hex 24)
SESSION_SECRET=$SESSION
MASTER_ENCRYPTION_KEY=$MASTER
INTERNAL_API_URL=http://127.0.0.1:5400
INTERNAL_API_KEY=$INTERNAL
ENV
  chmod 600 "$APP/backend/.env" "$APP/frontend/.env.local"
else
  echo "  env files already there, left as they are"
fi

echo "Services"
install -m 644 /tmp/delta-bot.service /tmp/delta-web.service /etc/systemd/system/
systemctl daemon-reload
systemctl enable -q delta-bot delta-web

echo "nginx and certificate for: $HOSTS"
CONF=/etc/nginx/sites-available/delta
full_site() {
  sed -e "s/server_name delta.65-20-103-177.sslip.io;/server_name $HOSTS;/" \
      -e "s#/etc/letsencrypt/live/delta.65-20-103-177.sslip.io/#/etc/letsencrypt/live/$FIRST_HOST/#" /tmp/nginx-delta.conf > "$CONF"
  ln -sf "$CONF" /etc/nginx/sites-enabled/delta
  nginx -t -q && systemctl reload nginx
}
if [ -f "/etc/letsencrypt/live/$FIRST_HOST/fullchain.pem" ]; then
  # The site stays up while the certificate is extended to the names it does not cover yet.
  full_site
else
  # Until the certificate exists nginx only serves the challenge over HTTP.
  cat > "$CONF" <<NGINX
server {
    listen 80;
    listen [::]:80;
    server_name $HOSTS;
    location /.well-known/acme-challenge/ { root /var/www/acme; }
    location / { return 404; }
}
NGINX
  ln -sf "$CONF" /etc/nginx/sites-enabled/delta
  nginx -t -q && systemctl reload nginx
fi
# The snap certbot is the one that works on this VM; the apt one is broken by a Python library.
CERTBOT="$( [ -x /snap/bin/certbot ] && echo /snap/bin/certbot || echo certbot )"
"$CERTBOT" certonly --webroot -w /var/www/acme --non-interactive --agree-tos --keep-until-expiring --expand --cert-name "$FIRST_HOST" $(printf -- '-d %s ' $HOSTS) 2>&1 | tail -2
full_site
rm -f /tmp/delta-bot.service /tmp/delta-web.service /tmp/nginx-delta.conf
echo "Set up. Now: bash deploy/redeploy.sh"
EOF
