#!/bin/bash
# ============================================================
# GodWorld Daily Backup
# ============================================================
# Backs up critical local-only files to:
#   1. Local timestamped archive (keeps 7 days)
#   2. Google Drive (via saveToDrive.js)
#
# What's backed up:
#   - Claude-Mem database (41MB, all auto-captured observations)
#   - Discord conversation logs
#   - .env (API keys, tokens)
#   - .clasp.json (Apps Script project ID)
#   - credentials/ (service account)
#   - ~/.clasprc.json (clasp auth tokens)
#   - settings.local.json (permission overrides)
#
# What's NOT backed up (already durable):
#   - Code/docs → GitHub
#   - Simulation data → Google Sheets
#   - Curated knowledge → Supermemory
#   - Editions → Google Drive
#   - output/drive-files/ → re-crawlable from Drive
#   - output/desk-packets/ → regenerated every cycle
#
# Usage:
#   bash scripts/backup.sh           # Full backup + upload
#   bash scripts/backup.sh --local   # Local only, no Drive upload
#   bash scripts/backup.sh --test    # Dry run, show what would be backed up
#
# Cron (11 PM Central = 5 AM UTC):
#   0 5 * * * cd /root/GodWorld && bash scripts/backup.sh >> logs/backup.log 2>&1
# ============================================================

set -e

GODWORLD="/root/GodWorld"
BACKUP_DIR="$GODWORLD/backups"
TIMESTAMP=$(date +%Y-%m-%d_%H%M)
ARCHIVE_NAME="godworld_backup_${TIMESTAMP}.tar.gz"
ARCHIVE_PATH="$BACKUP_DIR/$ARCHIVE_NAME"
KEEP_DAYS=7
LOCAL_ONLY=false
TEST_MODE=false

# Parse args
for arg in "$@"; do
  case $arg in
    --local) LOCAL_ONLY=true ;;
    --test)  TEST_MODE=true ;;
  esac
done

echo "=== GodWorld Backup — $(date) ==="

# Create backup directory
mkdir -p "$BACKUP_DIR"

# Build list of files to back up
BACKUP_FILES=()

# Claude-Mem database (the big one — 41MB of observations)
if [ -f /root/.claude-mem/claude-mem.db ]; then
  BACKUP_FILES+=("/root/.claude-mem/claude-mem.db")
  echo "  + Claude-Mem DB ($(du -sh /root/.claude-mem/claude-mem.db | cut -f1))"
fi

# Discord conversation logs
if [ -d "$GODWORLD/logs/discord-conversations" ]; then
  BACKUP_FILES+=("$GODWORLD/logs/discord-conversations")
  COUNT=$(ls "$GODWORLD/logs/discord-conversations" 2>/dev/null | wc -l)
  echo "  + Discord logs ($COUNT files)"
fi

# .env (API keys)
if [ -f "$GODWORLD/.env" ]; then
  BACKUP_FILES+=("$GODWORLD/.env")
  echo "  + .env"
fi

# .clasp.json (Apps Script project ID)
if [ -f "$GODWORLD/.clasp.json" ]; then
  BACKUP_FILES+=("$GODWORLD/.clasp.json")
  echo "  + .clasp.json"
fi

# credentials/ (service account)
if [ -d "$GODWORLD/credentials" ]; then
  BACKUP_FILES+=("$GODWORLD/credentials")
  echo "  + credentials/"
fi

# clasp auth tokens (home directory)
if [ -f /root/.clasprc.json ]; then
  BACKUP_FILES+=("/root/.clasprc.json")
  echo "  + ~/.clasprc.json"
fi

# settings.local.json
if [ -f "$GODWORLD/.claude/settings.local.json" ]; then
  BACKUP_FILES+=("$GODWORLD/.claude/settings.local.json")
  echo "  + settings.local.json"
fi

if [ ${#BACKUP_FILES[@]} -eq 0 ]; then
  echo "ERROR: No files found to back up!"
  exit 1
fi

echo ""
echo "Files to archive: ${#BACKUP_FILES[@]}"

# Test mode — just show what would happen
if [ "$TEST_MODE" = true ]; then
  echo ""
  echo "TEST MODE — no backup created."
  echo "Would create: $ARCHIVE_PATH"
  echo "Would keep $KEEP_DAYS days of local backups."
  [ "$LOCAL_ONLY" = false ] && echo "Would upload to Google Drive."
  exit 0
fi

# Create tar.gz archive
echo ""
echo "Creating archive: $ARCHIVE_NAME"
tar -czf "$ARCHIVE_PATH" "${BACKUP_FILES[@]}" 2>/dev/null
ARCHIVE_SIZE=$(du -sh "$ARCHIVE_PATH" | cut -f1)
echo "Archive size: $ARCHIVE_SIZE"

# Upload to Google Drive (unless --local)
if [ "$LOCAL_ONLY" = false ]; then
  echo ""
  echo "Uploading to Google Drive..."
  # Use the publications root as backup destination
  # saveToDrive.js supports raw folder IDs
  cd "$GODWORLD"
  if node scripts/saveToDrive.js "$ARCHIVE_PATH" publications 2>&1; then
    echo "Drive upload complete."
  else
    echo "WARNING: Drive upload failed. Local backup preserved at: $ARCHIVE_PATH"
  fi
fi

# Rotate old local backups (keep KEEP_DAYS)
echo ""
echo "Rotating local backups (keeping $KEEP_DAYS days)..."
DELETED=0
for old_backup in $(ls -1t "$BACKUP_DIR"/godworld_backup_*.tar.gz 2>/dev/null | tail -n +$((KEEP_DAYS + 1))); do
  rm -f "$old_backup"
  DELETED=$((DELETED + 1))
done
echo "Deleted $DELETED old backup(s)."

# Summary
REMAINING=$(ls -1 "$BACKUP_DIR"/godworld_backup_*.tar.gz 2>/dev/null | wc -l)
echo ""
echo "=== Backup Complete ==="
echo "Archive: $ARCHIVE_PATH ($ARCHIVE_SIZE)"
echo "Local backups: $REMAINING"
[ "$LOCAL_ONLY" = false ] && echo "Drive: uploaded"
echo "========================"
