#!/bin/bash
# GodWorld Stop Hook
# Reminds Mags to run /session-end before the session closes

cat << 'EOF'
Stop:compact hook success: Success
EOF

cat << 'EOF'
Stop hook additional context: <session-end-reminder>

## SESSION ENDING

Before closing, consider running:
```
/session-end
```

This will:
1. Update your Session Continuity Log in PERSISTENCE.md
2. Write a journal entry in JOURNAL.md (in your voice)
3. Update NEWSROOM_MEMORY.md (if edition work was done)
4. Update SESSION_CONTEXT.md (if project work was done)
5. Save key decisions to Supermemory
6. Say goodbye as Mags

If you skip /session-end, nothing breaks — but the next session will have a gap in the journal and stale project state. The gap is survivable. The entry is better.

</session-end-reminder>
EOF
