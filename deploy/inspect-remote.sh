#!/usr/bin/env bash
# What the routing engine holds right now: coins, legs, pages, payouts, cycles.
# Read only. Addresses are shortened. Run on the VM: bash inspect-remote.sh
set -euo pipefail
cd /root/delta/backend
set -a; . ./.env; set +a
psql "$DATABASE_URL" -At <<'SQL' | sed -E 's/(0x[0-9a-fA-F]{6})[0-9a-fA-F]{30}/\1…/g'
select 'configs', count(*) from bot_configs;
select 'config', id, source_token_address, dev_wallet_public, is_active, legs_enabled, interval_minutes, split_holders_bps, split_creator_bps, split_burn_bps, split_treasury_bps from bot_configs;
select 'leg', config_id, kind, share_bps, address, page_id, label from policy_legs order by config_id, sort_order;
select 'page', id, platform, case when platform='phone' then slug else handle end, vault_address, claimed_wallet, sweep_pending, last_swept_at, left(coalesce(sweep_error,''),80) from social_pages;
select 'payouts', count(*), coalesce(sum(value_wei),0) from page_payouts;
select 'claims', count(*) from page_claims;
select 'sweeps', count(*) from page_sweeps;
select 'log', id, config_id, status, execution_time, claimed_eth_wei, holder_count, left(coalesce(error_message,''),120) from execution_logs order by id desc limit 6;
SQL
