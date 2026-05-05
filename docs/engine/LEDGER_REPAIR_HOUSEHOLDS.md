---
title: Household Pairing & Youth Population — Ledger Repair Plan
created: 2026-05-04
updated: 2026-05-04
type: plan
tags: [engine, citizens, ledger, active]
sources:
  - S201 live audit — Simulation_Ledger MaritalStatus + HouseholdId scan (engine-sheet)
  - "[[engine/ROLLOUT_PLAN]] §Data & Pipeline — 'FIX: Youth population gap'"
  - "[[engine/ENGINE_REPAIR]] Row 20 (this plan)"
  - "[[engine/LEDGER_AUDIT]] §Current State — S199 refresh"
pointers:
  - "[[engine/LEDGER_REPAIR]] — S94 historical recovery record (different scope — read first)"
  - "[[engine/LEDGER_AUDIT]] — current ledger state authority"
  - "[[engine/ENGINE_REPAIR]] — tactical tracker; Row 20 points here"
  - "[[plans/2026-04-28-female-citizen-balance]] — sibling pattern (S184 ingest of 150 female citizens — generator + verification gates this plan mirrors)"
  - "phase05-citizens/householdFormationEngine.js — `generateBirths_()` is currently a stub (line 428 'TODO: Implement birth generation')"
---

# Household Pairing & Youth Population — Ledger Repair Plan

Forward-build plan for the citizen ledger. Sibling to [[engine/LEDGER_REPAIR]] but
different scope — that doc is the S94 historical recovery record (DO NOT re-analyze).
This plan addresses three structural gaps that prevent realistic family-event simulation.

**Status:** drafted S201, parked for a dedicated session. Three-stage build, executes in order.

---

## The Gaps (S201 live audit)

### Gap 1 — Married citizens have no actual partners

S184 demographic backfill set `MaritalStatus` for every citizen via a CDF
(49.6% married). The backfill held — live distribution:

| Status | Count | % |
|---|---|---|
| married | 375 | 44.9% |
| single | 165 | 19.7% |
| divorced | 118 | 14.1% |
| (empty) | 79 | 9.4% |
| partnered | 51 | 6.1% |
| widowed | 48 | 5.7% |

**But no spouse linkage exists.** Citizens are flagged "married" with no
`SpouseId` field, no shared `HouseholdId`, no shared-children backlink.
The 426 paired citizens (married + partnered) reference 426 ghost partners.

### Gap 2 — Households are singletons

| Metric | Value |
|---|---|
| Citizens with HouseholdId set | 532 |
| Citizens with HouseholdId empty | 304 |
| Distinct HouseholdIds | 529 |
| Size-1 households (singletons) | 526 |
| Size-2 households | **3** (HH-0084-001, HH-0084-002, HH-0084-004) |

Of 426 married/partnered citizens: 303 have a singleton HHid, 123 have no HHid,
**6 are in actual shared households** (the 3 size-2 examples — likely Tier-1
manual edits or canon pairs).

### Gap 3 — Youth population is functionally empty

| Bracket | Count | % |
|---|---|---|
| 0-4 (preschool) | 1 | 0.1% |
| 5-12 (elem/middle) | 2 | 0.2% |
| **13-17 (HS)** | **0** | 0% |
| 18-22 (college/early adult) | 17 | 2.0% |
| 23-29 (young adult) | 65 | 7.8% |
| 30-44 (adult) | 217 | 26.0% |
| 45-64 (mid) | 376 | 45.0% |
| 65-79 (senior) | 148 | 17.7% |
| 80+ | 10 | 1.2% |

**Total under-18 = 3 (0.4%).** Zero teenagers. The simulation has 543 adults
claiming 1,161 children via `NumChildren`, but only 3 actual youth exist on
the ledger.

`runYouthEngine.js` runs every cycle, finds ~21 eligible citizens (5-22),
and effectively no-ops. `householdFormationEngine.js:428 generateBirths_()`
is a stub: `// TODO: Implement birth generation`.

---

## Root cause

S184 ingest set MaritalStatus + NumChildren via independent CDFs without
generating relational backlinks. Each field is statistically plausible in
isolation but collectively meaningless — there are no actual marriages,
no actual parent-child relations, and no actual households.

The structural fix has dependencies:

```
Stage 1 (pair married → households)
   ↓
Stage 2 (reconcile NumChildren claims)
   ↓
Stage 3 (add ~120 youth attached to real parents)
```

You cannot add youth without households. You cannot form households without
pairing partners. So the order is fixed.

---

## Stage 1 — `pairMarriedCitizens.js`

**Goal:** assign shared `HouseholdId` to married/partnered couples. Optionally
add `SpouseId` field to Simulation_Ledger if not already present (verify
schema; if absent, the link via shared HouseholdId is sufficient).

### Pairing rule (Mike-decided S201)

Primary: **age range** within ±5 years.
Preference: **same neighborhood** within the age-range pool.
Tier-1 citizens: **bypassed** for manual review (canonical biographies may
declare specific spouses, separations, or deliberate single-parent status).

Deterministic pairing via POPID hash to ensure idempotent re-runs.

### Last-name policy (Mike-decided S201)

**Couples share a last name.** Required for stage 3 — kids inherit a parent's
last name, so partners must agree on which one. Implementation:

1. Identify each couple's two last names (e.g., POP-A surname=Vega, POP-B surname=Patel)
2. Pick one via deterministic rule (alphabetical first OR partner-with-lower-POPID keeps theirs — TBD at build time; pick the simpler one)
3. Update the other partner's `Last` column to match
4. Log the change in their `LifeHistory` column with `[Engine] adopted partner surname C{XX}` event

This is destructive on the `Last` column for ~213 citizens. Tier-1 bypass
prevents canon-name changes (Robert Corliss won't be renamed to Robert Vega).

### Approach

1. Read Sim_Ledger, filter to non-Tier-1, MaritalStatus ∈ {married, partnered}, exclude already-paired (size-2 HH members)
2. Bucket by (neighborhood, age_decade) — e.g., (Fruitvale, 30s)
3. Within each bucket, sort by POPID; pair adjacent rows (POPID-N with POPID-N+1, etc.)
4. If bucket has odd count, last citizen pairs across-decade with closest match in same neighborhood
5. If still unpaired (no neighborhood-mates in similar age), pair across-neighborhood within age range
6. Generate HHid: `HH-C{XX}-XXX` format (matches existing HH-0084-XXX convention; bump cycle prefix)
7. Update both partners' rows: HouseholdId, Last (per policy), LifeHistory append
8. Output: `output/pair_married_citizens.json` with full pairing log + neighborhood-mismatch flags

### Acceptance gates

| Gate | Target |
|---|---|
| Married/partnered with shared HHid | ≥ 95% (allow up to 5% bypass for Tier-1 + edge cases) |
| Households with size 2 | ~213 (was 3) |
| Cross-neighborhood pairings | < 10% (most should match within neighborhood) |
| Cross-decade pairings | < 5% (age range was preference, age-decade ideal) |
| Tier-1 untouched | 100% — verify Tier-1 citizens have zero changes to HouseholdId or Last |
| Determinism | Re-run with same input produces zero-diff |

### Effort

~1 engine-sheet session. Mirrors S184 female-balance ingest pattern
(generator + dry-run + apply + verification gates).

---

## Stage 2 — `reconcileNumChildren.js` (optional)

**Goal:** decide what to do with the 1,161 claimed `NumChildren` total.

Three options:

**(a) Zero out + rebuild from Stage 3 actuals.** After Stage 3 ingests ~120
real youth with ParentIds set, each parent's `NumChildren` field updates
from actual count of children pointing to them. Cleanest end-state — every
NumChildren value reflects real ledger entries.

**(b) Trust as Stage 3 sizing hint.** Use the existing claims as a
distribution signal (which parents are flagged with how many kids). Stage 3
generates youth attached to those parents. Caveat: 1,161 claims with only
~120 youth means most claims won't get a real child.

**(c) Skip.** Leave NumChildren as-is. Engine code that reads NumChildren
gets noisy data but no breakage.

Recommend **(a)** — combined with Stage 3, end-state has ~120 NumChildren
total spread across ~80 parent rows. Honest data.

### Acceptance gates

| Gate | Target |
|---|---|
| Sum(NumChildren) post-reconcile | = count of youth in ledger (Stage 3 output) |
| Per-parent NumChildren | = count of rows with that POPID in ParentIds |
| LifeHistory event per change | logged for adults whose NumChildren changed |

### Effort

~30 min. Pure read + recompute + write. Runs AFTER Stage 3.

---

## Stage 3 — `ingestYouthBalance.js`

**Goal:** add ~120 youth (POP-00952..POP-01071) attached to real households
formed in Stage 1.

### Distribution

| Bracket | Add | Engine reads |
|---|---|---|
| 0-4 (preschool) | 30 | minimal — household texture only |
| 5-12 (elem/middle) | 50 | `runYouthEngine.js` school-level branches |
| 13-17 (HS) | 40 | `runYouthEngine.js` event types + emergence pipeline |
| 18-22 | 0 | already 17 — promotion path will sustain |
| **Total** | **120** | |

End-state: 123 under-18 / 956 total = **~13% under-18** (vs current 0.4%).

### Per-youth row spec

| Field | Value |
|---|---|
| POPID | sequential POP-00952.. |
| First | from name pool (need a 0-17 first-name pool — see open question) |
| Last | inherits from parent household |
| OriginGame | 'Engine' |
| ClockMode | 'ENGINE' |
| Tier | 4 |
| RoleType | 'student' (per `generateGenericCitizens.js:516` rule for age 5-22) |
| Status | 'Active' (canonical case — not 'active') |
| BirthYear | computed: 2041 − target_age (deterministic per row by hash) |
| Neighborhood | parent's neighborhood |
| HouseholdId | parent's HouseholdId (the post-Stage-1 shared HH) |
| ParentIds | JSON array `[motherPopId, fatherPopId]` |
| Gender | ~50/50 deterministic by hash |
| MaritalStatus | 'single' (canonical lowercase per S184 convention) |
| NumChildren | 0 |
| EducationLevel | 'in-progress' or age-appropriate band ('elementary', 'middle', 'high-school') |
| All other lifecycle fields | empty or 0 (engines fill on triggers) |

### Parent selection

1. Stage 1 produces ~213 couple households
2. Distribute 120 children across ~85-100 households (some have 1 child, some have 2)
3. Avoid households where both partners are 60+ (childless empty-nesters)
4. Avoid households where the older partner is < 22 (no parent-child age cliff)
5. Per-household child count: deterministic via household-POPID hash + Stage-2 NumChildren hint

### Acceptance gates

| Gate | Target |
|---|---|
| Total youth added | 120 (±2 for distribution rounding) |
| Per-bracket distribution | 30/50/40 ±10% per bucket |
| Every youth has HouseholdId | 100% |
| Every youth has ParentIds | 100% |
| Every youth's last name matches parent's | 100% |
| Every youth's neighborhood matches parent's | 100% |
| `runYouthEngine.js` finds N youth post-ingest | N ≈ 90 (5-22 range, was ~21) |
| Re-run determinism | zero-diff |

### Effort

~1 engine-sheet session.

---

## Out of scope

- **Tier-1 manual review.** ~17 named characters with canon biographies. Mike will
  pair / single-parent / re-spouse them by hand after Stage 1 completes.
- **`householdFormationEngine.js generateBirths_()` implementation.** The stub
  at line 428 generates new births per cycle. After Stages 1-3 land, future
  births can plug into the existing households cleanly. Separate multi-session
  build.
- **MaritalStatus enum case canonicalization.** Currently lowercase
  (`married` / `single` / etc.) — same pattern as the Status drift S201 closed.
  Engine consumers either case-fold or pattern-match lowercase, so live state
  is functional. Worth normalizing in a future pass but not blocking this build.
  Same writer (`scripts/ingestFemaleCitizensBalance.js:312` was the Status
  source — likely sets MaritalStatus the same way).
- **Citizen archetype + traits backfill for new youth.** Existing trait engines
  fill these on triggers; new youth land with empty trait fields. Engine fills
  over subsequent cycles.
- **SchoolQuality + Career fields for youth.** Age-appropriate engines populate
  these — youth at age 5-12 don't have `CareerStage` or `Income`; those land
  via `runEducationEngine` + `runCareerEngine` when they hit the right age band.

---

## Open questions for build session

1. **Last-name pick rule** when partners have different surnames. Options:
   alphabetical-first / lower-POPID-keeps / random-by-hash. Pick at build time.
2. **First-name pool for 0-17 youth.** Need an age-appropriate name pool
   (different from `generateGenericCitizens.js`'s adult pool). Generate via
   the same diversity-conscious pattern as S184 (multi-origin, gender-balanced,
   no Tier-3 real-public-figure names).
3. **Cross-neighborhood pairing handling.** What % is acceptable before
   bucket logic is reconsidered? S184 found ~5% inevitable cross-bucket
   distribution; Stage 1 is similar.
4. **Adoption / step-parent paths.** Skip for v1 — every youth gets two
   biological parents in their household. Future complexity.
5. **NumChildren reconcile order.** Stage 2 runs after Stage 3, but during
   Stage 3 dry-run we'd want to know existing claims. Resolve by: Stage 3
   reads NumChildren as hint (option b), Stage 2 reconciles after.

---

## Pre-build checklist

Before starting the build session, verify these still hold:

- [ ] Stage 0 — Re-audit MaritalStatus + HouseholdId post-C94 (engine cycle may
  shift values via cohort-C processing — verify no regression from the S201 numbers above)
- [ ] Stage 0 — Confirm `SpouseId` field absence on Sim_Ledger schema (47 cols
  A-AU per [[engine/LEDGER_AUDIT]] — no SpouseId currently)
- [ ] Stage 0 — Confirm Tier-1 list: 21 T1 citizens per S199 audit. Each gets
  a single-row review for canonical pair/spouse/single status
- [ ] Stage 0 — Reach decision on the 5 open questions above
- [ ] Plan clasp-push window: Stage 1 + Stage 3 are local/service-account writes;
  no Apps Script changes expected. Stage 2 NumChildren reconcile may touch
  every parent row — verify cohort-C alignment holds (post-C94 readback)

---

## Why this is a separate session

- ~3 scripts × ~300 LOC each = ~900 LOC of new code
- ~300+ destructive Sim_Ledger writes (HouseholdId + Last + ParentIds + new rows)
- Cascading-effects audit needed for each stage
- Verification gates need to run AFTER Mike fires C94 cycle (cohort-C processing
  may shift ledger state in ways that affect the pairing distribution)
- Tier-1 manual review by Mike is interleaved between stages

Estimated total: 2-3 engine-sheet sessions + 1 Mike-review session for Tier-1.

---

## Changelog

- 2026-05-04 (S201, engine-sheet) — Initial draft. Triggered by Mike's
  question on youth count; investigation surfaced household-pairing as the
  prerequisite. Three-stage plan locked. Last-name policy + age-range pairing
  + Tier-1 bypass per Mike's S201 directive.
