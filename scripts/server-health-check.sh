#!/bin/bash
# server-health-check.sh — Monitors disk, memory, PM2 processes
# Sends Discord webhook alert when thresholds are crossed.
# Install: crontab -e → 0 */6 * * * /root/GodWorld/scripts/server-health-check.sh

set -euo pipefail

# Load webhook URL from .env
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
WEBHOOK_URL=$(grep DISCORD_WEBHOOK_URL "$SCRIPT_DIR/../.env" | cut -d'=' -f2-)

if [ -z "$WEBHOOK_URL" ]; then
  echo "DISCORD_WEBHOOK_URL not found in .env"
  exit 1
fi

ALERTS=""

# --- Disk usage ---
DISK_PCT=$(df / --output=pcent | tail -1 | tr -d ' %')
if [ "$DISK_PCT" -gt 80 ]; then
  ALERTS="${ALERTS}Disk usage at ${DISK_PCT}%\n"
fi

# --- Available memory ---
AVAIL_MB=$(free -m | awk '/^Mem:/{print $7}')
if [ "$AVAIL_MB" -lt 100 ]; then
  ALERTS="${ALERTS}Available memory low: ${AVAIL_MB}MB\n"
fi

# --- PM2 process health ---
if command -v pm2 &>/dev/null; then
  ERRORED=$(pm2 jlist 2>/dev/null | python3 -c "
import json, sys
procs = json.load(sys.stdin)
errored = [p['name'] for p in procs if p.get('pm2_env', {}).get('status') == 'errored']
print(','.join(errored))
" 2>/dev/null || echo "")
  if [ -n "$ERRORED" ]; then
    ALERTS="${ALERTS}PM2 errored processes: ${ERRORED}\n"
  fi

  # Check restart counts (>10 suggests crash loop)
  HIGH_RESTARTS=$(pm2 jlist 2>/dev/null | python3 -c "
import json, sys
procs = json.load(sys.stdin)
high = [f\"{p['name']}({p.get('pm2_env',{}).get('restart_time',0)})\" for p in procs if p.get('pm2_env',{}).get('restart_time',0) > 10]
print(','.join(high))
" 2>/dev/null || echo "")
  if [ -n "$HIGH_RESTARTS" ]; then
    ALERTS="${ALERTS}High restart counts: ${HIGH_RESTARTS}\n"
  fi
fi

# --- Dashboard health check ---
DASH_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3001/api/health 2>/dev/null || echo "000")
if [ "$DASH_STATUS" != "200" ]; then
  ALERTS="${ALERTS}Dashboard health check failed (HTTP ${DASH_STATUS})\n"
fi

# --- Send alert if any ---
if [ -n "$ALERTS" ]; then
  PAYLOAD=$(python3 -c "
import json
alerts = '''$ALERTS'''.strip()
msg = f'**Server Health Alert**\n{alerts}\nDisk: ${DISK_PCT}% | RAM avail: ${AVAIL_MB}MB'
print(json.dumps({'content': msg}))
")
  curl -s -H "Content-Type: application/json" -d "$PAYLOAD" "$WEBHOOK_URL" >/dev/null 2>&1
  echo "Alert sent: $ALERTS"
else
  echo "All clear — Disk: ${DISK_PCT}% | RAM: ${AVAIL_MB}MB available"
fi
