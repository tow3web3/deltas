#!/usr/bin/env bash
# One-time move of the VM install from the old name to DELTA: folder, systemd
# services, nginx site, database name. Env files move with the folder. Run on
# the VM as root, with the site's domain as the argument:
#   bash rename-remote.sh deltas.world
# Idempotent: every step checks what is already done.
set -euo pipefail
HOST="${1:-deltas.world}"
OLD=/root/routepay; NEW=/root/delta

if systemctl list-units --type=service --all | grep -q routepay-bot; then
  echo "Stopping the old services"; systemctl stop routepay-bot routepay-web || true
fi
if [ -d "$OLD" ] && [ ! -d "$NEW" ]; then echo "Moving $OLD to $NEW"; mv "$OLD" "$NEW"; fi
[ -d "$NEW" ] || { echo "Nothing at $NEW"; exit 1; }

# The database keeps its rows and takes the new name; the env files point at it.
if sudo -u postgres psql -Atc "select 1 from pg_database where datname='routepay'" | grep -q 1 && ! sudo -u postgres psql -Atc "select 1 from pg_database where datname='delta'" | grep -q 1; then
  echo "Renaming the database"
  sudo -u postgres psql -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = 'routepay' AND pid <> pg_backend_pid();" >/dev/null
  sudo -u postgres psql -c "ALTER DATABASE routepay RENAME TO delta;"
  sed -i -E 's#(DATABASE_URL=postgres(ql)?://[^/]+/)routepay#\1delta#' "$NEW/backend/.env" "$NEW/frontend/.env.local"
fi
grep -q "^NEXT_PUBLIC_SITE_URL=" "$NEW/frontend/.env.local" && sed -i "s|^NEXT_PUBLIC_SITE_URL=.*|NEXT_PUBLIC_SITE_URL=https://$HOST|" "$NEW/frontend/.env.local" || echo "NEXT_PUBLIC_SITE_URL=https://$HOST" >> "$NEW/frontend/.env.local"
for k in WEBSITE_URL FRONTEND_URL; do grep -q "^$k=" "$NEW/backend/.env" && sed -i "s|^$k=.*|$k=https://$HOST|" "$NEW/backend/.env" || true; done

# Services: the unit files in deploy/ already carry the new names and paths.
for svc in bot web; do
  cp "$NEW/deploy/delta-$svc.service" /etc/systemd/system/delta-$svc.service
  systemctl disable routepay-$svc 2>/dev/null || true; rm -f /etc/systemd/system/routepay-$svc.service
done
systemctl daemon-reload
systemctl enable delta-bot delta-web >/dev/null

# nginx: the new site file, the old one removed. The certificate for the new host comes from setup.sh / certbot.
if [ -f /etc/nginx/sites-enabled/routepay ]; then rm -f /etc/nginx/sites-enabled/routepay /etc/nginx/sites-available/routepay; fi
sed "s/deltas.world www.deltas.world delta.65-20-103-177.sslip.io/$HOST www.$HOST delta.65-20-103-177.sslip.io/" "$NEW/deploy/nginx-delta.conf" > /etc/nginx/sites-available/delta
ln -sf /etc/nginx/sites-available/delta /etc/nginx/sites-enabled/delta
nginx -t && systemctl reload nginx

systemctl start delta-bot delta-web
sleep 4
systemctl is-active delta-bot delta-web
echo "Moved. Next: DNS for $HOST to this VM, then: /snap/bin/certbot --nginx -d $HOST -d www.$HOST"
