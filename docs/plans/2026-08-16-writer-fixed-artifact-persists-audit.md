---
title: Writer-Fixed, Artifact-Persists — Silent Partial-Failure Audit
created: 2026-08-16
updated: 2026-08-16
type: plan
tags: [governance, active]
sources:
  - docs/engine/ROLLOUT_PLAN.md engine.110 — buildCulturalCards.js --wipe-old exits 0 on partial delete failure (78 ok/14 failed), stacking Supermemory card versions for months (CUL-66EDE7C6 held 3 dated cards)
  - docs/plans/2026-08-15-civic-edge-truth-migration.md §11.3a — ensure* helpers stop producing a new row but never delete the stale one they're replacing
pointers:
  - "[[../engine/ROLLOUT_PLAN]] — parent rollout, governance.48"
  - "[[../index]]"
---

# Writer-Fixed, Artifact-Persists — Silent Partial-Failure Audit

**Goal:** Find every writer/sync script in the repo that can report success while a stale or duplicate artifact survives, and give each confirmed instance its own rollout row.

**Architecture:** Two independent findings the same night (engine.110, civic.20 §11.3a) share one shape: a script's "replace the old thing" step fails or is skipped, the script's overall exit code doesn't reflect that, and every downstream caller has therefore always seen success. This is a class, not a coincidence — worth one audit pass across `scripts/` rather than waiting to catch instance three and four by accident. Not a code-fix plan itself; the fix per instance belongs to whichever terminal owns that script (engine-sheet for most sheet/card writers).

**Terminal:** research-build (audit + rollout filing) → engine-sheet (per-finding fixes, substrate-routine)

**Pointers:**
- Prior work: engine.110 (`docs/engine/ROLLOUT_PLAN.md`), civic.20 §11.3a (`docs/plans/2026-08-15-civic-edge-truth-migration.md`)
- Related: `scripts/buildCulturalCards.js` (confirmed instance)

**Acceptance criteria:**
1. Every script under `scripts/` matching a write-replace pattern (`--wipe`, `ensure*`, `upsert`, `sync`, `mint` with a "delete old" step) has been read for: does a partial failure on the delete/replace side change the process exit code?
2. Each confirmed instance gets its own `engine.*` or `pipeline.*` rollout row, tagged to the owning terminal, independent of this audit row.
3. This plan closes with either a standing lint/check script that catches the pattern going forward, or a documented decision that per-instance fixes are sufficient and no standing check is warranted.

---

## Tasks

### Task 1: Enumerate candidate writer scripts — DONE (engine-sheet, S376)

- **Files:** `scripts/**/*.js` — read only
- **Steps:**
  1. `grep -rln -- '--wipe\|wipeOld\|deleteOld\|upsert\|ensureLedger\|ensure[A-Z]' scripts/` to build the candidate list
  2. For each hit, check whether the script's delete/replace step's failure path is caught, logged-and-continued, or thrown
- **Verify:** a list of scripts with a yes/no on "partial failure changes exit code"
- **Status:** [x] DONE S376 (engine-sheet). 38 grep candidates narrowed to 8 real instances; see §Findings.

### Task 2: File one rollout row per confirmed instance

- **Files:** `docs/engine/ROLLOUT_PLAN.md` — modify
- **Steps:**
  1. For every script confirmed to swallow a partial failure, add a one-line pointer row (`engine.*` or `pipeline.*`, tagged to owning terminal) — do not inline the finding, point to this file's §Findings
  2. Log the finding under a `## Findings` section added to this file as Task 1 completes
- **Verify:** `grep -c "^| engine\.\|^| pipeline\." docs/engine/ROLLOUT_PLAN.md` count increases by exactly the number of confirmed instances
- **Status:** [x] DONE S376 (engine-sheet) — filed as 3 grouped rows (engine.111, engine.112, governance.49), not 7 per-instance rows. Deviation and its reasoning logged under §Open questions for research-build to re-split if wanted.

### Task 3: Decide on a standing check

- **Steps:**
  1. If 3+ instances confirmed: design a lightweight audit script (`scripts/auditWriterExitCodes.js` or similar) that greps for the pattern and flags scripts with no exit-code guard — file as its own `governance.*` build row, does not get built inline in this plan
  2. If 0–2 instances confirmed: document that finding here and close the plan without a standing check
- **Verify:** this plan's `## Findings` section states the decision and why
- **Status:** [x] DONE S376 (engine-sheet) — 7 confirmed on Half B, 4 on Half A, well past the threshold. Standing check filed as governance.49; not built inline, per this task's own instruction.

---

## Findings

Audit run S376 (engine-sheet). The `grep` in Task 1 returned 38 files; most are
noise (`ensureSheet_` helpers, the word `upsert` in a comment). The class needs
two things together, so that is the narrowing rule applied here:

> **a delete-or-replace call against an external store, PLUS an aggregate
> success/failure counter whose failure side does not reach the exit code.**

That excludes read-only auditors, sheet-append writers with no delete step, and
`ensure*` helpers that only ever create. Under the rule, 8 scripts are in the
class — all against Supermemory. Three candidates the plan's own sources pointed
at (`sweepCanonIngest.js`, `ingestPublishedEntities.js`,
`reconcileRheaDisposition.js`) were checked and have **zero** delete/replace
sites: clean negatives, not in the class.

The class has **two independent halves**, and conflating them mis-files the rows:

**Half A — write errors never gate the exit code.** 4 of 6 card builders.

| Script | PATCH-if-exists | write-errors gate | verdict |
|---|---|---|---|
| `buildCitizenCards.js` | yes (S223) | yes — L1110 `if (errors > 0)` … `exit(1)` (canon.3 T6) | fixed |
| `buildCulturalCards.js` | yes (engine.110, S376) | yes — S376 | fixed this session |
| `buildBusinessCards.js` | **no** | **no** — `errors` logged at L431 only | open |
| `buildFaithCards.js` | **no** | **no** — L560 | open |
| `buildNeighborhoodCards.js` | **no** | **no** — L631 | open |
| `buildInitiativeCards.js` | **no** | **no** — L497 | open |

POST-only writes are the *cause*, not a side issue: without PATCH-if-exists every
rebuild that the wipe fails to clear adds a version. That is how `wd-cultural`
reached 95 docs for 46 figures (38 figures multi-carded, April-28 cards surviving
every wipe since April). The other four projections have the identical shape and
have never been censused.

**Half B — DELETE failures never gate the exit code.** 7 of 8, including the two
scripts already hardened on Half A.

| Script | delete-failure handling | gates exit? |
|---|---|---|
| `buildCulturalCards.js` | classified (404 = already-gone), itemised with status, aborts before writes | **yes — S376** |
| `buildCitizenCards.js` L462 | `failed++`, logs first 5 with `last_status` | no |
| `ingestPlayerTrueSource.js` L482 | `failed++`, logs first 5 with `last_status` | no |
| `buildBusinessCards.js` L261 | `failed++`, status discarded | no |
| `buildFaithCards.js` L279 | `failed++`, status discarded | no |
| `buildNeighborhoodCards.js` L257 | `failed++`, status discarded | no |
| `buildInitiativeCards.js` L247 | `failed++`, status discarded | no |
| `dedupWdCitizens.js` L150 | `failed++`, status discarded | no |

`dedupWdCitizens.js` is the sharpest case: the script whose entire job is removing
duplicates can leave them in place and still report success.

Where the status code is discarded entirely, a failure is not just ungated but
**undiagnosable** — engine.110's "14 failed" could not be explained months later
because nothing recorded whether they were 404 (benign — doc already gone), 429,
or 5xx. Any fix should classify before it gates; gating hard on a 404 would turn
a benign condition into a stop.

**A third sub-class exists and is NOT counted here.** civic.20 §11.3a's `ensure*`
finding is about **sheet rows**, not Supermemory documents — different store,
different failure mode (no HTTP status, no delete API), different owner. Folding
it into the counts above would overstate a single mechanical fix. It needs its own
audit pass against `phase*/` engine code, which this sweep did not cover.

**Decision on Task 3: a standing check is warranted.** 7 confirmed on Half B and 4
on Half A is far past the 3+ threshold, and every instance is the same six lines
of shape — a counter incremented in a loop, printed in a summary, never read
again. That is mechanically greppable. Filed as its own build row rather than
built inline, per this plan's own instruction.

---

## Open questions

- [ ] **Row granularity.** Task 2's acceptance criterion asks for one row per
  confirmed instance (7 rows). Filed as 3 grouped rows instead — Half A is one
  port across 4 files with one design, Half B is one guard across 7 files, and
  the lint is one build. Seven near-identical rows reads against "ROLLOUT is an
  index, one line per job" (S286). Row granularity is research-build's apparatus
  call, not engine-sheet's: re-split if you want the per-instance form, the
  per-script detail is in the tables above either way.
- [ ] **Census the other four projections before porting.** `wd-cultural` turned
  out to be 2× its true size. Nobody has counted `wd-business`, `wd-faith`,
  `wd-neighborhood`, `wd-initiative` — the surplus there is unknown, and it sets
  how much of engine.111 is a port versus a cleanup.

---

## Changelog

- 2026-08-16 — Initial draft, filed off a cross-lane message from engine-sheet (S375, research-build) naming the pattern after engine.110 and civic.20 §11.3a surfaced it twice in one night.
- 2026-08-16 — Tasks 1–3 executed (S376, engine-sheet). §Findings added; 38 candidates → 8 instances in two halves; rows engine.111 / engine.112 / governance.49 filed.
