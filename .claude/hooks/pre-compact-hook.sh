#!/bin/bash
# GodWorld Pre-Compaction Hook
# Reminds user to save important context before auto-compact

cat << 'EOF'
PreCompact:compact hook success: Success
EOF

cat << 'EOF'
PreCompact hook additional context: <pre-compact-reminder>

## 💾 CONTEXT COMPACTION APPROACHING

Chat is nearing capacity and will compact soon.

### BEFORE COMPACTION: Save Important Context

**Recommended action:**
```
/super-save
```

**What to save:**
- Architectural decisions made this session
- Important bug fixes or workarounds discovered
- Design patterns or implementation details
- Any critical context for future sessions

**Why this matters:**
- Compaction creates a summary, but details can be lost
- Supermemory preserves exact decisions and rationale
- Future sessions benefit from explicit memory saves

**After saving, you can:**
- Continue working (auto-compact will happen when needed)
- Run `/compact` manually to compact now

---

**Tip:** Update SESSION_CONTEXT.md for major changes before compacting.

</pre-compact-reminder>
EOF
