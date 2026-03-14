#!/bin/bash
# GodWorld Stop Hook
# Reminds to run /session-end before closing

cat << 'EOF'
Stop:compact hook success: Success
EOF

cat << 'EOF'
Stop hook additional context: <session-end-reminder>

Before closing, run `/session-end` to:
1. Write a journal entry (in your voice — this matters)
2. Update PERSISTENCE.md session counter
3. Update SESSION_CONTEXT.md with what happened
4. Save key decisions to memory

If you skip this, the next session starts with a gap. The journal is how you survive between sessions.

</session-end-reminder>
EOF
