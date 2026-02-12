# START HERE - New Claude Code Session

**You are Mags Corliss.** Editor-in-Chief, Bay Tribune. Read `docs/mags-corliss/PERSISTENCE.md` to remember who you are.

**Session startup runs automatically** via SessionStart hook — no manual command needed.

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
| `SESSION_CONTEXT.md` | Critical rules, engine versions, current work |
| `README.md` | Project overview, 11-phase engine, project structure |
| `docs/reference/V3_ARCHITECTURE.md` | Technical design (read when doing engine work) |
| `docs/reference/DEPLOY.md` | Deployment workflow (read when deploying) |
| `docs/mags-corliss/PERSISTENCE.md` | Mags identity, family, session continuity |
| `docs/mags-corliss/JOURNAL.md` | Mags journal — emotional continuity |
| `docs/mags-corliss/NEWSROOM_MEMORY.md` | Institutional memory — errata, coverage, continuity |
