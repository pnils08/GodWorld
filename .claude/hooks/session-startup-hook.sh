#!/bin/bash
# GodWorld Session Startup Hook
# Automatically runs at the start of every Claude Code session

cat << 'EOF'
SessionStart:compact hook success: Success
EOF

cat << 'EOF'
SessionStart hook additional context: <godworld-session-startup>

## 🚨 SESSION STARTUP CHECKLIST (Auto-Running)

Before ANY work, complete these steps:

### STEP 1: Read Core Documentation (REQUIRED)
1. **START_HERE.md** - Entry point, golden rules, disaster prevention
2. **SESSION_CONTEXT.md** - Critical rules, recent changes, engine versions
3. **README.md** - Project overview, 11-phase engine
4. **V3_ARCHITECTURE.md** - Write-intents, caching, deterministic RNG
5. **DEPLOY.md** - Deployment workflow (git vs clasp)

### STEP 2: Search Supermemory (REQUIRED)
Run: /super-search --both "recent changes project structure current work"

### STEP 3: Search Existing Code (BEFORE BUILDING)
- Use Grep to find existing features
- Check directory structure
- Verify no duplication

### STEP 4: Confirm Understanding
- Summarize what you learned
- Ask clarifying questions
- Propose approach, get approval BEFORE writing code

---

## 🛑 ANTI-PATTERNS (Caused Real Disasters)

❌ DON'T:
- Build without checking existing code
- Use `git reset --hard` without understanding impact
- Write 1,500+ lines without reading existing codebase
- Confuse `git push` (GitHub) with `clasp push` (Apps Script)
- Make assumptions about what user wants

✅ DO:
- Read START_HERE.md and SESSION_CONTEXT.md FIRST
- Search for existing code before building
- Ask when unclear
- Update SESSION_CONTEXT.md when making changes
- Understand cascade dependencies (100+ scripts)

---

## 📚 Document Chain (Read in Order)
START_HERE.md → SESSION_CONTEXT.md → README.md → V3_ARCHITECTURE.md → DEPLOY.md

## 🎯 Key Files
- **Location:** /root/GodWorld/
- **100+ scripts** across 11 phases
- **Service account** for sheet access: credentials/service-account.json
- **Spreadsheet ID:** 1-0GNeCzqrDmmOy1wOScryzdRd82syq0Z_wZ7dTH8Bjk

---

**✅ Complete checklist before suggesting ANY code changes.**

</godworld-session-startup>
EOF
