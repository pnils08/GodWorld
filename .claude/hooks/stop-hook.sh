#!/bin/bash
# GodWorld Stop Hook
# Reminds to run /session-end before closing

cat << 'EOF'
Stop:compact hook success: Success
EOF

cat << 'EOF'
Stop hook additional context: <session-end-reminder>

Before closing, run `/session-end` to:
1. Update SESSION_CONTEXT.md — the PIN + your terminal's NEXT line (the carried set)
2. Update ROLLOUT_PLAN.md — open work, closed rows
3. Run the mechanical orchestrator, then commit + push

If you skip this, the next session boots on a stale PIN + NEXT line. (The journal
is retired S300 — Mags' reflections land on her citizen page during /sift now,
not at session close. pipe.40 T4.)

</session-end-reminder>
EOF
