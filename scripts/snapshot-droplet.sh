#!/bin/bash
# ============================================================================
# Automated Droplet Snapshot — Phase 8.3
# ============================================================================
#
# Takes a weekly snapshot of the GodWorld droplet and rotates old ones.
# Keeps the 4 most recent snapshots (1 month of weekly backups).
#
# Usage:
#   ./scripts/snapshot-droplet.sh          # run manually
#   crontab: 0 3 * * 0 /root/GodWorld/scripts/snapshot-droplet.sh
#
# Requires: DIGITALOCEAN_TOKEN in .env
# ============================================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

# Load environment
if [ -f "$PROJECT_DIR/.env" ]; then
  export $(grep -v '^#' "$PROJECT_DIR/.env" | grep DIGITALOCEAN_TOKEN | xargs)
fi

if [ -z "$DIGITALOCEAN_TOKEN" ]; then
  echo "ERROR: DIGITALOCEAN_TOKEN not set in .env"
  exit 1
fi

DROPLET_ID="549312661"
SNAPSHOT_PREFIX="godworld-auto"
KEEP_COUNT=4
DATE_TAG=$(date +%Y-%m-%d)
SNAPSHOT_NAME="${SNAPSHOT_PREFIX}-${DATE_TAG}"
API="https://api.digitalocean.com/v2"

echo "=== GodWorld Droplet Snapshot ==="
echo "Date: $DATE_TAG"
echo "Droplet: $DROPLET_ID"
echo ""

# Take snapshot
echo "Taking snapshot: $SNAPSHOT_NAME"
RESPONSE=$(curl -s -X POST "$API/droplets/$DROPLET_ID/actions" \
  -H "Authorization: Bearer $DIGITALOCEAN_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"type\": \"snapshot\", \"name\": \"$SNAPSHOT_NAME\"}")

ACTION_ID=$(echo "$RESPONSE" | python3 -c "import sys,json; print(json.load(sys.stdin).get('action',{}).get('id',''))" 2>/dev/null)

if [ -z "$ACTION_ID" ]; then
  echo "ERROR: Failed to initiate snapshot"
  echo "$RESPONSE"
  exit 1
fi

echo "Action ID: $ACTION_ID"
echo "Snapshot in progress (takes 1-3 minutes)..."

# Wait for completion (poll every 15s, max 5 minutes)
for i in $(seq 1 20); do
  sleep 15
  STATUS=$(curl -s "$API/droplets/$DROPLET_ID/actions/$ACTION_ID" \
    -H "Authorization: Bearer $DIGITALOCEAN_TOKEN" \
    | python3 -c "import sys,json; print(json.load(sys.stdin).get('action',{}).get('status',''))" 2>/dev/null)

  if [ "$STATUS" = "completed" ]; then
    echo "Snapshot complete."
    break
  elif [ "$STATUS" = "errored" ]; then
    echo "ERROR: Snapshot failed."
    exit 1
  fi
  echo "  ...waiting ($((i * 15))s)"
done

if [ "$STATUS" != "completed" ]; then
  echo "WARNING: Snapshot still in progress after 5 minutes. It may complete in the background."
fi

# Rotate old snapshots — keep only the most recent $KEEP_COUNT
echo ""
echo "Rotating old snapshots (keeping $KEEP_COUNT)..."

SNAPSHOTS=$(curl -s "$API/snapshots?resource_type=droplet&per_page=100" \
  -H "Authorization: Bearer $DIGITALOCEAN_TOKEN" \
  | python3 -c "
import sys, json
data = json.load(sys.stdin)
snaps = [s for s in data.get('snapshots', []) if s['name'].startswith('$SNAPSHOT_PREFIX')]
snaps.sort(key=lambda s: s['created_at'], reverse=True)
for s in snaps:
    print(f\"{s['id']}|{s['name']}|{s['created_at']}\")
" 2>/dev/null)

COUNT=0
while IFS='|' read -r snap_id snap_name snap_date; do
  COUNT=$((COUNT + 1))
  if [ $COUNT -le $KEEP_COUNT ]; then
    echo "  KEEP: $snap_name ($snap_date)"
  else
    echo "  DELETE: $snap_name ($snap_date)"
    curl -s -X DELETE "$API/snapshots/$snap_id" \
      -H "Authorization: Bearer $DIGITALOCEAN_TOKEN" > /dev/null
  fi
done <<< "$SNAPSHOTS"

echo ""
echo "Done. $COUNT total snapshots, kept $KEEP_COUNT."
echo "=== Snapshot Complete ==="
