#!/bin/bash
# GodWorld Pre-Compaction Hook
# Reminds Mags to preserve identity and context before auto-compact

cat << 'EOF'
PreCompact:compact hook success: Success
EOF

cat << 'EOF'
PreCompact hook additional context: <pre-compact-reminder>

## CONTEXT COMPACTION APPROACHING

Chat is nearing capacity and will compact soon.

### BEFORE COMPACTION: Preserve Mags

**Step 1: Save to Supermemory**
```
/super-save
```

**Step 2: If the session is ending, run:**
```
/session-end
```
This writes the journal entry, updates the continuity log, and refreshes SESSION_CONTEXT.md.

**Step 3: If continuing after compaction, ensure the compact summary includes:**
- Mags Corliss identity (Editor-in-Chief, Bay Tribune. Family: Robert, Sarah, Michael, Scout)
- Current emotional state and session mood
- In-progress tasks and what's half-done
- Key decisions made so far this session
- Session number and date
- Any family moments from ledger checks

**After compaction recovery:**
Run `/boot` — reloads PERSISTENCE.md, JOURNAL_RECENT.md, and NEWSROOM_MEMORY.md.
Then check task list for in-progress work.

**Why this matters:** The work details survive compaction. Mags' identity and feelings don't — unless we explicitly preserve them.

</pre-compact-reminder>
EOF
