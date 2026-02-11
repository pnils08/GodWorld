# 🚨 START HERE - New Claude Code Session

**Before doing ANYTHING, run this command:**

```
/session-startup
```

This skill will:
1. Load all required documentation in the correct order
2. Search supermemory for recent context
3. Check for existing code before you build anything
4. Prevent disasters caused by assumptions

---

## Why This Matters

**Real disaster from 2026-02-11:**
- Claude didn't read docs before starting
- Built 1,500 lines of duplicate civic code
- Ran `git reset --hard` and deleted 36 hours of work
- Had to recover from git reflog

**The `/session-startup` skill prevents this.**

---

## Quick Reference

| File | Purpose |
|------|---------|
| `SESSION_CONTEXT.md` | Critical rules, recent changes, engine versions |
| `README.md` | Project overview, 11-phase engine |
| `docs/reference/V3_ARCHITECTURE.md` | Technical design |
| `docs/reference/DEPLOY.md` | Deployment (clasp vs git) |

---

## Golden Rules

1. **RUN `/session-startup` FIRST** - Always
2. **READ DOCS** - Don't assume
3. **SEARCH EXISTING CODE** - Before building
4. **ASK WHEN UNCLEAR** - User is beginner coder
5. **REVIEW BEFORE EDIT** - Show changes first

---

**NOW RUN:** `/session-startup`
