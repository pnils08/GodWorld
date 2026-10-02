---
title: Task 8 census second confirm review
created: 2026-10-01
updated: 2026-10-01
type: reference
tags: [engine, research, draft]
sources:
  - commit a22fa428 — response to the two remaining Task 8 census findings
  - docs/for-claude-review/2026-10-01-codex-task8-census-confirm.md — prior HOLD
  - docs/plans/2026-09-21-care-and-justice-system.md — Task 8 Revision 2 contract
pointers:
  - "[[plans/2026-09-21-care-and-justice-system]] — owning Task 8 design"
---

# SHIP — Task 8 census second confirm pass

**Verdict: SHIP commit `a22fa428` for the two prior blockers.** This is a read-only source review of shared `main`; no Sheet, engine Cycle, or deployment was run. One lower severity tail-validation gap remains below.

## Prior finding dispositions

1. **Closed — a foreign row in the write target is refused before `setValues`.** `careJusticeWritePlan_` now marks an append as replacing zero rows and an in-place rewrite as replacing only the known run (`utilities/careJusticeAccounting.js:803-809,829-834`). On every retry, the writer reads target cells through the sheet's last populated row and checks every cell beyond those known replacements (`phase10-persistence/buildCyclePacket.js:1204-1217`; `utilities/careJusticeAccounting.js:837-852`). The fresh-tab blank-Cycle/nonblank-System case and a foreign row below a prior block both throw with the row intact (`scripts/careJusticeCensus.test.js:254-266`). A blank target needs no scan past `getLastRow`; the check covers the entire pending write range that could overwrite content.

2. **Closed — a different case of the same citizen no longer proves a judicial exit landed.** Derivation records closures by `SourceEventId` only when `ResolveCycle` equals C, and the receipt cross-check uses that ID (`utilities/careJusticeAccounting.js:507-514,679-680`). The test closes case A, leaves case B open, and aims B's exit receipt at B; the census is `incomplete` (`scripts/careJusticeCensus.test.js:313-320`). Hospital lifecycle exits have no event ID; the new count rule requires two closed rows for two exits from one citizen, including a close/reopen sequence (`utilities/careJusticeAccounting.js:659-676`; `scripts/careJusticeCensus.test.js:321-326`). This is a count cross-check for hospital exits, not a row-identity proof; it matches the available receipt shape.

## Residual and timing

- **MEDIUM, follow-up — a nonblank row with blank Cycle below an already complete C block is invisible on a skip.** `readTail()` anchors on the last nonblank column-A cell (`phase10-persistence/buildCyclePacket.js:1165-1180`); an orphan below that anchor is not in the tail. When the C block compares equal, `careJusticeWritePlan_` returns `skip` (`utilities/careJusticeAccounting.js:829-830`), so the new target check and post-write verification do not run (`phase10-persistence/buildCyclePacket.js:1207-1225`). No content is overwritten, but the R2-8 rule that only all-cell-blank rows follow C is not enforced on that path. Detect the orphan on a future validation pass; this does not reopen the prior data-loss finding.
- **Timing disposition: accept this cut at the measured size; measure again as the tab grows.** The column-A scan remains unbounded and runs on the initial read, the retried write, and write readback (`phase10-persistence/buildCyclePacket.js:1165-1180,1183,1204-1224`). The supplied SANDBOX C110–C114 runs took 157–205 seconds, within the six-minute limit and in the pre-census range reported in the plan (`docs/plans/2026-09-21-care-and-justice-system.md:862-869`). At 216 rows per Cycle, the tab adds about 11,232 rows per 52-Cycle year. Those short-run measurements do not prove long-history latency; there is no present evidence that bounding the scan is required before this cut ships.

## Local validation

`node scripts/careJusticeCensus.test.js`: **80/80 passed**. `node scripts/careJusticeAccounting.test.js`: **55/55 passed**. `node --check` passed on the changed test, accounting helper, and packet writer. This review does not establish PROD activation or live Sheet behavior.
