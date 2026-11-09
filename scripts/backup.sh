#!/bin/bash
# ============================================================
# GodWorld Daily Backup — the whole server, minus logins
# ============================================================
# Purpose (builder 2026-11-09): if the server is wiped or expires, everything
# can be rebuilt from Drive. Nothing is left out on the assumption that it
# lives somewhere else.
#
# Logins and keys are NOT archived: the builder keeps every key and password
# on a ledger in Drive already (2026-11-09). Restore them from that ledger.
#
# Each night it writes five archives to Google Drive (GodWorld_Backups folder):
#   1-godworld-project      the repo, unpushed commits, uncommitted output, audio
#   2-mags-memory           claude-mem database (+ wal) and its search index
#   3-claude-chats          ~/.claude transcripts, memory, settings
#   4-helper-lanes          codex, kimi, grok, gemini, aider, worktrees
#   5-system-state          crontab, pm2 process names, pm2 service unit, versions, packages
# Archives over 1.9 GB are split into numbered parts (join: cat X.part* > X).
#
# Left out: logins/keys (see above); node_modules and .venv (rebuilt by
# install); GodWorld/backups and .claude-mem/backups (old archives).
#
# Staged in /var/tmp (outside /root, so it never archives itself); the
# staging copy is replaced each night, so the server keeps one copy only.
#
# Usage:
#   bash scripts/backup.sh           # Full backup + upload
#   bash scripts/backup.sh --local   # Build archives, no Drive upload
#   bash scripts/backup.sh --test    # Show what would be archived
#
# Cron (5 AM UTC):
#   0 5 * * * cd /root/GodWorld && bash scripts/backup.sh >> logs/backup.log 2>&1
# Restore: docs/reference/DISASTER_RECOVERY.md
# ============================================================

set -u

GODWORLD="/root/GodWorld"
STAGE="/var/tmp/godworld-backup"
TIMESTAMP=$(date +%Y-%m-%d_%H%M)
PART_BYTES=1900000000
LOCAL_ONLY=false
TEST_MODE=false

for arg in "$@"; do
  case $arg in
    --local) LOCAL_ONLY=true ;;
    --test)  TEST_MODE=true ;;
  esac
done

echo "=== GodWorld Backup — $(date) ==="

# Keep only what exists, so a missing optional folder never fails the run
existing() { for p in "$@"; do [ -e "/root/$p" ] && echo "$p"; done; }

# Never archived, in any set
NO_LOGINS=(--exclude='*.env' --exclude='.env*' --exclude='*/credentials' --exclude='.credentials.json'
           --exclude='auth.json' --exclude='.clasprc.json' --exclude='*/.ssh' --exclude='*token*.json')
NO_REBUILDABLE=(--exclude='*/node_modules' --exclude=GodWorld/.venv)

SET_PROJECT=(--exclude=GodWorld/backups GodWorld)
SET_MAGS=(--exclude=.claude-mem/backups .claude-mem)
SET_CHATS=($(existing .claude))
SET_HELPERS=($(existing .codex .kimi-code .grok .gemini .aider .agents .openclaw gemini gemini-writer work GodWorld-wake GodWorld-wt-packet))

if [ "$TEST_MODE" = true ]; then
  echo "1-godworld-project: ${SET_PROJECT[*]}"
  echo "2-mags-memory:      ${SET_MAGS[*]}"
  echo "3-claude-chats:     ${SET_CHATS[*]}"
  echo "4-helper-lanes:     ${SET_HELPERS[*]}"
  echo "5-system-state:     crontab, pm2 names, pm2 unit, versions, packages"
  echo "Excluded everywhere: ${NO_LOGINS[*]} ${NO_REBUILDABLE[*]}"
  echo "Stage: $STAGE   Upload: $([ "$LOCAL_ONLY" = true ] && echo no || echo yes)"
  exit 0
fi

# Replace last night's staging copy
rm -rf "$STAGE"
mkdir -p "$STAGE/system-state"

# System state that lives outside the home folder
crontab -l > "$STAGE/system-state/crontab.txt" 2>/dev/null
pm2 jlist 2>/dev/null | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{try{for(const p of JSON.parse(s))console.log(p.name+"\t"+p.pm2_env.pm_exec_path+"\t"+p.pm2_env.pm_cwd)}catch(e){}})' > "$STAGE/system-state/pm2-processes.tsv"
cp -a /etc/systemd/system/pm2-root.service "$STAGE/system-state/" 2>/dev/null
{ echo "node $(node -v)"; echo "npm $(npm -v)"; uname -a; } > "$STAGE/system-state/versions.txt"
dpkg -l > "$STAGE/system-state/installed-packages.txt" 2>/dev/null

FAILED=0
make_archive() {
  local name="$1"; shift
  local out="$STAGE/${TIMESTAMP}_${name}.tar.gz"
  echo "  + $name"
  # tar exit 1 = a file changed while being read (live db/logs); still a usable archive
  tar -czf "$out" "${NO_LOGINS[@]}" "${NO_REBUILDABLE[@]}" "$@" 2>>"$STAGE/tar-warnings.log"
  local rc=$?
  if [ $rc -gt 1 ]; then echo "    ERROR: tar exit $rc"; FAILED=$((FAILED + 1)); fi
  echo "    $(du -h "$out" | cut -f1)"
}

cd /root
make_archive 1-godworld-project "${SET_PROJECT[@]}"
make_archive 2-mags-memory "${SET_MAGS[@]}"
make_archive 3-claude-chats "${SET_CHATS[@]}"
make_archive 4-helper-lanes "${SET_HELPERS[@]}"
make_archive 5-system-state -C "$STAGE" system-state

# Split big archives so each Drive upload stays a manageable size
cd "$STAGE"
for f in *.tar.gz; do
  if [ "$(stat -c %s "$f")" -gt "$PART_BYTES" ]; then
    split -b "$PART_BYTES" -d -a 2 "$f" "$f.part" && rm -f "$f"
  fi
done

UPLOADED=0
UPLOAD_FAILED=0
if [ "$LOCAL_ONLY" = false ]; then
  echo ""
  echo "Uploading to Google Drive..."
  cd "$GODWORLD"
  for f in "$STAGE"/${TIMESTAMP}_*; do
    if node scripts/saveToDrive.js "$f" backup >/dev/null 2>&1; then
      UPLOADED=$((UPLOADED + 1)); echo "  uploaded $(basename "$f")"
    else
      UPLOAD_FAILED=$((UPLOAD_FAILED + 1)); echo "  WARNING: upload failed: $(basename "$f")"
    fi
  done
fi

echo ""
echo "=== Backup Complete ==="
echo "Total: $(du -sh "$STAGE" | cut -f1) in $STAGE"
echo "Archive errors: $FAILED   Uploaded: $UPLOADED   Upload failures: $UPLOAD_FAILED"
echo "========================"
[ $FAILED -eq 0 ] && [ $UPLOAD_FAILED -eq 0 ]
