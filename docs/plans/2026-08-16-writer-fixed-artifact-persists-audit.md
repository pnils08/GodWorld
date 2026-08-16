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

### Task 1: Enumerate candidate writer scripts

- **Files:** `scripts/**/*.js` — read only
- **Steps:**
  1. `grep -rln -- '--wipe\|wipeOld\|deleteOld\|upsert\|ensureLedger\|ensure[A-Z]' scripts/` to build the candidate list
  2. For each hit, check whether the script's delete/replace step's failure path is caught, logged-and-continued, or thrown
- **Verify:** a list of scripts with a yes/no on "partial failure changes exit code"
- **Status:** [ ] not started

### Task 2: File one rollout row per confirmed instance

- **Files:** `docs/engine/ROLLOUT_PLAN.md` — modify
- **Steps:**
  1. For every script confirmed to swallow a partial failure, add a one-line pointer row (`engine.*` or `pipeline.*`, tagged to owning terminal) — do not inline the finding, point to this file's §Findings
  2. Log the finding under a `## Findings` section added to this file as Task 1 completes
- **Verify:** `grep -c "^| engine\.\|^| pipeline\." docs/engine/ROLLOUT_PLAN.md` count increases by exactly the number of confirmed instances
- **Status:** [ ] not started

### Task 3: Decide on a standing check

- **Steps:**
  1. If 3+ instances confirmed: design a lightweight audit script (`scripts/auditWriterExitCodes.js` or similar) that greps for the pattern and flags scripts with no exit-code guard — file as its own `governance.*` build row, does not get built inline in this plan
  2. If 0–2 instances confirmed: document that finding here and close the plan without a standing check
- **Verify:** this plan's `## Findings` section states the decision and why
- **Status:** [ ] not started

---

## Open questions

- [ ] None yet — audit (Task 1) not started.

---

## Changelog

- 2026-08-16 — Initial draft, filed off a cross-lane message from engine-sheet (S375, research-build) naming the pattern after engine.110 and civic.20 §11.3a surfaced it twice in one night.
