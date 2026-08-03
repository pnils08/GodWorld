---
title: Neighborhood Truth-Source Migration — ADR-0016 first application
created: 2026-08-02
updated: 2026-08-02
type: plan
tags: [engine, architecture, neighborhoods, active]
sources:
  - docs/adr/0016-data-ledgers-are-the-truth-source.md — the decision this executes
  - Mike-direct 2026-08-02 (S349) — "a week dedicated to this"; discovery is a primary output, not a side effect
  - "Survey S349: 85 files hardcode a hood literal → 53 structural (>=8 literals, 38,769 lines) + 6 incidental + 26 trivial; signature clustering shows 20 files share ONE identical 12-hood list, 6 share another, rest are 1-2 file groups"
  - .claspignore:19,22-24 — lib/** and scripts/** never deploy; why engine code cannot import shared truth
  - phase02-world-state/loadNeighborhoodState.js:25,74 — already reads Neighborhood_Map into S.neighborhoodState every cycle (the half-built seam)
pointers:
  - "[[../adr/0016-data-ledgers-are-the-truth-source]] — the ADR; read it before this plan"
  - "[[../engine/ROLLOUT_PLAN]] — parent rollout (engine.99)"
  - "[[2026-07-31-per-hood-political-consequence]] — engine.93; its COMMUTE_HOOD_ALIASES map is retired by Cohort 2"
  - "[[../SPREADSHEET]] — Neighborhood_Map tab contract"
  - "[[../index]] — registered same commit"
---

# Neighborhood Truth-Source Migration — ADR-0016 first application

**Goal:** Every engine and script consumer reads the neighborhood set from
`Neighborhood_Map` instead of its own hardcoded list, and a detector fails any
new hardcoded hood literal.

**Architecture:** A canonical accessor in a **pushed** engine file, seeded from
`Neighborhood_Map` once per cycle at Phase 1 into a single `ctx` field.
Node-side consumers (`lib/`, `scripts/`) use `lib/canonNeighborhoods.js`, which
is reconciled against the sheet by the same detector. `lib/` cannot serve the
engine — `.claspignore` excludes it and Apps Script has no imports; that wall is
the root cause of the drift, not a detail.

**Terminal:** engine-sheet

**Framing (Mike-direct):** this is a **week**, and **discovery is a primary
output**. The cohorts are the vehicle; the findings are the product. Every
finding is triaged on the spot — fix in cohort / escalate per ADR-0016 §7 / file
as its own row — and recorded in the running log below. A finding that lives
only in a commit message is a finding we paid for and did not keep.

**Estimate is a floor, not a range.** 4–5 sessions prices the *known* work.
Anything found mid-dig adds to it, which is the point. Re-price after Cohort 1.

**Acceptance criteria:**
1. One canonical neighborhood set, loaded from `Neighborhood_Map`, reachable
   from both engine (GAS) and Node consumers.
2. A drift detector fails any hood literal in a migrated file that is not in the
   canonical set; wired into the audit suite so later cohorts self-verify.
3. Every structural file in a completed cohort reads the canonical set; zero
   private alias maps survive their cohort (starting with engine.93 Task 9's
   `COMMUTE_HOOD_ALIASES`).
4. No behavioral change except where a namespace divergence was itself the bug —
   those are called out explicitly, never folded in silently.
5. Findings log below is populated and triaged.

---

## Measured scope (S349 survey — do not re-derive)

| Bucket | Files | Note |
|---|---|---|
| Structural (≥8 hood literals) | **53** (38,769 lines) | the real work |
| Incidental (2–7 literals) | 6 | check, usually leave |
| Trivial (0–1 literal) | 26 | comments/strings, likely no-op |

**Signature clustering — the cost saver:** 20 structural files share ONE
identical 12-hood list; 6 share another; the rest are 1–2 file groups. This is
~8 distinct namespaces copy-pasted, not 53 independent decisions.

**Runtime split:** 36 structural files are engine (`phase*/`, `utilities/` —
need the pushed loader); 17 are Node (`lib/`, `scripts/` — can require directly).

---

## Tasks

### Cohort 1: the seam (do this first, then re-price everything)

### Task 1: Read the ledger's own truth
- **Files:** `Neighborhood_Map` (sheet) — read
- **Steps:** Record the exact hood set + spellings the sheet holds today, and
  diff against `lib/canonNeighborhoods.js` (21) and the 12/18/19-hood code
  lists. Any name in code but not the sheet, or vice versa, is a finding —
  triage it before writing the loader, because the loader will make the sheet
  authoritative and silently drop the rest.
- **Verify:** hood set + diff recorded in Findings below
- **Status:** [ ] not started

### Task 2: Canonical accessor (pushed engine file)
- **Files:** new engine-side module — placement is engine-sheet's call, but it
  MUST be under a clasp-pushed path (`phase01-config/` or `utilities/`), never
  `lib/`
- **Steps:** Load the hood set from `Neighborhood_Map` once at Phase 1 into one
  `ctx` field; expose a canonical list + a membership test. **Fail loud if the
  sheet is unreadable — never fall back to an embedded list** (ADR-0016; a
  silent fallback recreates the drift with extra steps). Reuse
  `loadNeighborhoodState_`'s existing read if it can serve both without a second
  fetch.
- **Verify:** sandbox — engine phases see the sheet's set; a missing tab raises
- **Status:** [ ] not started

### Task 3: Drift detector
- **Files:** the audit-script surface (`scripts/`), wired like
  `auditFunctionCollisions.js`
- **Steps:** Fail any hood literal in a **migrated** file that is not in the
  canonical set. Migrated-file scope is explicit (a list or a marker), so
  unmigrated cohorts don't drown the signal. Land this in Cohort 1 — later
  cohorts self-verify instead of being hand-checked.
- **Verify:** detector red on a seeded bad literal, green on the migrated set
- **Status:** [ ] not started

### Task 4: Migrate the Node group (4 files)
- **Files:** `lib/canonNeighborhoods.js`, `lib/districtMap.js`,
  `lib/citizenDerivation.js`, `lib/photoGenerator.js`
- **Steps:** Point each at the canonical module; reconcile
  `canonNeighborhoods.js` itself against the sheet (it becomes a cache of ledger
  truth, not an independent authority).
- **Verify:** detector green on all four; no consumer behavior change
- **Status:** [ ] not started

### Task 5: Re-price
- **Steps:** With the seam built and four files migrated, re-estimate Cohorts
  2–4 from measured effort, not from the survey. Update this plan and the
  rollout row.
- **Verify:** revised estimate recorded below
- **Status:** [ ] not started

### Cohort 2: the 20-file identical-list group (est. 1–2 sessions, RE-PRICE FIRST)
One decision applied 20 times. Candidate for cheap-model fan-out (Sonnet does
the mechanical repoint with the caller list, lead reviews every diff —
`docs/MODEL_HIERARCHY.md` §8). Retires engine.93 Task 9's
`COMMUTE_HOOD_ALIASES`. **Hazard:** any file whose hood list feeds a seeded draw
needs bench proof that determinism did not move.

### Cohort 3: the 6-file group + oddballs (est. 2 sessions)
Includes `phase06-analysis/economicRippleEngine.js`, the nastiest case: its
private mapper collapses 18 hoods to 11. **This is a behavioral question, not a
rename** — hoods currently folded together will stop being folded, and numbers
will move. Needs its own decision before the edit.

### Cohort 4: the 17 Node scripts (est. half a session)
Mechanical once Cohort 1's accessor exists.

---

## Findings log (the week's primary output)

Every finding: what, where, and its triage — `fix-in-cohort` / `escalate`
(ADR-0016 §7) / `file-as-row`. Recorded when found, not reconstructed after.

| # | Finding | Where | Triage |
|---|---|---|---|
| — | *(none yet — Cohort 1 not started)* | | |

---

## Open questions

- [ ] Does `Neighborhood_Map` hold every hood the code uses, or do some code-only
  hoods exist? Task 1 answers this and it gates Task 2's fail-loud behavior.
- [ ] Does `economicRippleEngine`'s 18→11 collapse encode a real design intent
  (coarse economic zones) or is it an artifact? Blocks Cohort 3 only.

---

## Changelog

- 2026-08-02 (S349) — Initial draft (engine-sheet). Executes ADR-0016; cohorts
  ordered from the S349 signature-clustering survey. Written at session end as
  the handoff artifact so Cohort 1 starts in a fresh context with the survey
  already durable.
