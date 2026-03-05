#!/bin/bash
# ============================================================================
# Weekly Autonomous Maintenance — Phase 6.7
# ============================================================================
#
# Runs engine health checks without a session. Cron: Wednesdays 4 AM UTC.
# Logs results. Sends Discord alert if critical issues found.
#
# Checks:
#   1. Engine file integrity (all 11 phases exist)
#   2. Stale file audit (desk packets, edition brief older than 14 days)
#   3. PM2 process health
#   4. Disk and memory
#   5. Dashboard API health
#
# ============================================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
LOG_FILE="$PROJECT_DIR/logs/weekly-maintenance.log"
ISSUES=0
REPORT=""

# Load environment for Discord webhook
if [ -f "$PROJECT_DIR/.env" ]; then
  export $(grep -v '^#' "$PROJECT_DIR/.env" | grep DISCORD_WEBHOOK_URL | xargs 2>/dev/null)
fi

add_report() {
  REPORT="$REPORT\n$1"
}

add_issue() {
  ISSUES=$((ISSUES + 1))
  REPORT="$REPORT\n⚠️ $1"
}

echo "=== GodWorld Weekly Maintenance ===" | tee "$LOG_FILE"
echo "Date: $(date)" | tee -a "$LOG_FILE"
echo "" | tee -a "$LOG_FILE"

# 1. Engine directory integrity
add_report "--- Engine Directories ---"
MISSING_PHASES=0
PHASE_DIRS="phase01-config phase02-world-state phase03-population phase04-events phase05-citizens phase06-analysis phase07-evening-media phase08-v3-chicago phase09-digest phase10-persistence phase11-media-intake"
for PDIR in $PHASE_DIRS; do
  if [ ! -d "$PROJECT_DIR/$PDIR" ]; then
    add_issue "Missing engine directory: $PDIR"
    MISSING_PHASES=$((MISSING_PHASES + 1))
  fi
done
if [ $MISSING_PHASES -eq 0 ]; then
  add_report "All 11 engine phase directories present."
fi

# 2. Stale file audit
add_report ""
add_report "--- Stale File Audit ---"
STALE_DAYS=14

# Check desk packets
PACKETS_DIR="$PROJECT_DIR/output/desk-packets"
if [ -d "$PACKETS_DIR" ]; then
  NEWEST_PACKET=$(find "$PACKETS_DIR" -name "*.json" -type f -printf '%T@\n' 2>/dev/null | sort -rn | head -1)
  if [ -n "$NEWEST_PACKET" ]; then
    AGE_SECS=$(echo "$(date +%s) - ${NEWEST_PACKET%.*}" | bc 2>/dev/null)
    AGE_DAYS=$((AGE_SECS / 86400))
    if [ "$AGE_DAYS" -gt "$STALE_DAYS" ]; then
      add_issue "Desk packets are ${AGE_DAYS} days old (threshold: ${STALE_DAYS})"
    else
      add_report "Desk packets: ${AGE_DAYS} days old (OK)"
    fi
  fi
fi

# Check edition brief
BRIEF="$PROJECT_DIR/output/latest_edition_brief.md"
if [ -f "$BRIEF" ]; then
  BRIEF_AGE=$(( ($(date +%s) - $(stat -c %Y "$BRIEF")) / 86400 ))
  if [ "$BRIEF_AGE" -gt "$STALE_DAYS" ]; then
    add_issue "Edition brief is ${BRIEF_AGE} days old (threshold: ${STALE_DAYS})"
  else
    add_report "Edition brief: ${BRIEF_AGE} days old (OK)"
  fi
fi

# 3. PM2 process health
add_report ""
add_report "--- PM2 Health ---"
if command -v pm2 &> /dev/null; then
  ERRORED=$(pm2 jlist 2>/dev/null | python3 -c "import sys,json; procs=json.load(sys.stdin); errs=[p['name'] for p in procs if p.get('pm2_env',{}).get('status')=='errored']; print(','.join(errs) if errs else '')" 2>/dev/null)
  if [ -n "$ERRORED" ]; then
    add_issue "PM2 errored processes: $ERRORED"
  else
    add_report "All PM2 processes healthy."
  fi

  # Check restart counts
  HIGH_RESTARTS=$(pm2 jlist 2>/dev/null | python3 -c "import sys,json; procs=json.load(sys.stdin); high=[f\"{p['name']}({p.get('pm2_env',{}).get('restart_time',0)})\" for p in procs if p.get('pm2_env',{}).get('restart_time',0)>10]; print(','.join(high) if high else '')" 2>/dev/null)
  if [ -n "$HIGH_RESTARTS" ]; then
    add_issue "High restart counts: $HIGH_RESTARTS"
  fi
else
  add_issue "PM2 not found"
fi

# 4. Disk and memory
add_report ""
add_report "--- System Resources ---"
DISK_PCT=$(df / | awk 'NR==2 {print $5}' | tr -d '%')
if [ "$DISK_PCT" -gt 80 ]; then
  add_issue "Disk usage at ${DISK_PCT}% (threshold: 80%)"
else
  add_report "Disk: ${DISK_PCT}% used (OK)"
fi

MEM_AVAIL=$(free -m | awk '/^Mem:/ {print $7}')
if [ "$MEM_AVAIL" -lt 100 ]; then
  add_issue "Available memory: ${MEM_AVAIL}MB (threshold: 100MB)"
else
  add_report "Memory: ${MEM_AVAIL}MB available (OK)"
fi

# 5. Dashboard API health
add_report ""
add_report "--- Dashboard API ---"
DASH_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:3001/api/citizens?limit=1" --max-time 5 2>/dev/null)
if [ "$DASH_STATUS" = "200" ]; then
  add_report "Dashboard API: responding (200)"
else
  add_issue "Dashboard API returned $DASH_STATUS"
fi

# Summary
echo "" | tee -a "$LOG_FILE"
echo -e "$REPORT" | tee -a "$LOG_FILE"
echo "" | tee -a "$LOG_FILE"
echo "=== Maintenance Complete: $ISSUES issue(s) found ===" | tee -a "$LOG_FILE"

# Send Discord alert if issues found
if [ "$ISSUES" -gt 0 ] && [ -n "$DISCORD_WEBHOOK_URL" ]; then
  ALERT_MSG=$(echo -e "**Weekly Maintenance Alert** — $ISSUES issue(s)\n$REPORT" | head -c 1900)
  curl -s -X POST "$DISCORD_WEBHOOK_URL" \
    -H "Content-Type: application/json" \
    -d "{\"content\": \"$ALERT_MSG\"}" > /dev/null 2>&1
fi
