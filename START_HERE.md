# 🚨 START HERE - New Claude Code Session

**Session startup runs automatically!**

A **SessionStart hook** now runs at the beginning of every session:
1. Loads all required documentation in the correct order
2. Reminds Claude to search supermemory for recent context
3. Enforces checking for existing code before building
4. Prevents disasters caused by assumptions

**No manual command needed** - it's automatic!

---

## Why This Matters

**Real disasters prevented by this system:**

**2026-02-11: Duplicate Code Disaster**
- Claude didn't read docs before starting
- Built 1,500 lines of duplicate civic code
- Ran `git reset --hard` and deleted 36 hours of work
- Had to recover from git reflog

**2026-02-12: Dry-Run Cycle Bug**
- Dry-run mode (`runDryRunCycle`) still advances cycle counter
- Wrote data to 7 summary sheets (46 rows total)
- Had to rollback cycle 81 → 80 before testing new engines
- **Lesson:** Dry-run has bugs - verify cycle doesn't advance

**The automatic SessionStart hook prevents code disasters.
Manual verification prevents cycle disasters.**

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
6. **VERIFY CYCLES DON'T RUN** - Dry-run has bugs, check cycle counter before/after

---

## Deployment Workflow

**When code changes are ready to deploy:**

**Claude (local environment):**
1. Make code changes
2. Commit locally: `git commit -m "message"`
3. **Push to GitHub:** `git push origin main`

**User (Cloud Shell):**
4. Pull from GitHub: `git pull origin main`
5. Deploy to Apps Script: `clasp push`

**Key:** Claude pushes to GitHub first, THEN user pulls and deploys from Cloud Shell.

---

**NOW RUN:** `/session-startup`
