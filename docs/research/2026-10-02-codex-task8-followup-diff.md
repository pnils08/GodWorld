---
verdict: SHIP
title: Task 8 rows-below follow-up diff review
created: 2026-10-02
updated: 2026-10-02
type: reference
tags: [engine, research, draft]
sources:
  - git diff 7805ea2b..3c25827d -- phase10-persistence/buildCyclePacket.js utilities/careJusticeAccounting.js scripts/careJusticeCensus.test.js
  - docs/plans/2026-09-21-care-and-justice-system.md — Follow-up cut and Cut review
  - docs/research/2026-10-01-codex-task8-census-confirm2.md — follow-up (a)
pointers:
  - "[[plans/2026-09-21-care-and-justice-system]] — owning Task 8 contract"
---

# SHIP — Task 8 rows-below follow-up diff

Read-only review of the three-file diff. No blocking code finding. This verdict covers source behavior and local tests, not a Sheet read, engine Cycle, or deployment.

## Findings

1. **LOW — combined paths lack committed regression assertions.** `scripts/careJusticeCensus.test.js:172-177,180-207,275-358`: the retry test has no orphan, the gap test has no orphan, and the new section does not run the next Cycle after a post-write throw. A first-census append with an orphan beyond its block and a healthy equal-length rewrite also have no direct assertion. The implementation paths passed separate read-only, in-memory probes for gap blocks plus append, first-attempt-landed retry with an orphan, and the next Cycle after a post-write throw. Add these combinations to the suite when touching it next; their absence does not reveal a failing path in this cut.

2. **LOW — older plan text describes every throw as a missing census.** `docs/plans/2026-09-21-care-and-justice-system.md:860`: R2-9 says a throw leaves no C census and triggers an R2-7 restart. The later follow-up at `docs/plans/2026-09-21-care-and-justice-system.md:903` explicitly places this throw after a verified write, so C stands. Reconcile the older sentence in the owning plan; the diff follows the newer cut.

## Path checks

- **Healthy tab / census rows:** `phase10-persistence/buildCyclePacket.js:1226-1256` takes a post-write read-back as `standing`; a skip retains the attempt read. A tab ending at the anchor performs no rows-below read. The new healthy write/skip assertion passes (`scripts/careJusticeCensus.test.js:327-343`), as do the existing healthy append, skip, short-run rewrite, and whitespace paths. An orphan report cannot name a newly written census row because the post-write anchor includes the complete block. A first attempt that landed and is then found equal on retry uses that second attempt's read (`phase10-persistence/buildCyclePacket.js:1206-1229`).
- **Orphans within reach:** `phase10-persistence/buildCyclePacket.js:1245-1255` scans every row and column from anchor + 1 through `min(sheetLast, anchor + tailMax)` and reports the first non-whitespace cell. `utilities/careJusticeAccounting.js:843-861` keeps the same trim rule for target refusal and below-block reporting. The new tests name the orphan's exact row and value after skip, append, short-run rewrite, and equal-length rewrite (`scripts/careJusticeCensus.test.js:294-325`). The pre-write target check still refuses an orphan inside a pending write span (`phase10-persistence/buildCyclePacket.js:1211-1221`). Content beyond the window is intentionally silent until the census approaches it.
- **Post-write throw / next Cycle:** the throw is after `setValues`, read-back, and the success log (`phase10-persistence/buildCyclePacket.js:1221-1255`). The next Cycle's `readTail()` still sees that written C, and `planCareJusticeCensus_` derives its opening from it (`utilities/careJusticeAccounting.js:601-616,686-698`); no artificial R2-7 gap is introduced. If the orphan enters that next Cycle's write span, the existing target check refuses it before writing, as specified.
- **Tests discriminate the specified mistakes:** both named suites pass: `careJusticeCensus.test.js` **93/93**, `careJusticeAccounting.test.js` **55/55**. Read-only in-memory mutations of the packet source made the census suite fail: removing the check caused seven failed assertions; feeding it the pre-write anchor threw on a healthy C112 census row; removing the cap threw on the intentionally out-of-window orphan. `git diff --check` passed. The only production changes in this diff are the specified tail metadata, after-outcome scan, and shared first-content helper; the remaining changes are targeted tests.
