---
title: Child-Age Event Gating Plan
created: 2026-08-02
updated: 2026-08-02
type: plan
tags: [engine, citizens, content-ledger, active]
sources:
  - docs/engine/ROLLOUT_PLAN.md §engine.97
  - Live Simulation_Ledger read, S350 (931 rows) — counts in §Findings
  - Live Event_Content_Ledger read, S350 (252 rows) — 7 `children>=1` rows enumerated in §Findings
pointers:
  - "[[engine/ROLLOUT_PLAN]] — parent rollout (engine.97)"
  - "[[plans/2026-07-01-persistence-seams-content-ledger]] — the ECL conditions micro-DSL this extends"
  - "[[SIMULATION_LEDGER]] — NumChildren (col W), ParentIds (X), ChildrenIds (Y)"
  - "[[index]] — registered same commit"
---

# Child-Age Event Gating Plan

**Goal:** Content that claims a young child at home only reaches citizens who actually have one.

**Architecture:** A new derived attribute `childstage` is computed alongside `deriveLifeState_` in `phase05-citizens/citizenContextBuilder.js`, exposed as an enum field in the Event_Content_Ledger conditions DSL (`phase02-world-state/loadEventContentLedger.js`), and used to gate the three hardcoded `family:kids` pool lines in `phase05-citizens/generateCitizensEvents.js`. Resolution is a two-tier ladder: **exact** when the ledger can name the children, **proxy off parent age** only when it can't. It fails closed — a citizen the ledger can't resolve never draws minor-child content. Nothing new is minted and no column is added.

**Terminal:** research-build (design, this doc) → **engine-sheet (all execution)**

**Pointers:**
- Prior work: [[2026-07-01-persistence-seams-content-ledger]] §Design A (the conditions DSL), engine.67 step 5 (`band` life-state vocabulary, S325)
- Related: [[2026-07-06-content-ledger-auto-authoring]] — the drafter must learn the new field so auto-authored rows gate correctly
- Empirical basis: §Findings below, all read live from the sheet this session

**Acceptance criteria:**
1. `deriveChildStage_` returns one of `none|minor|grown|unknown` for every ledger row, is a pure function of the ledger snapshot (no `ctx.rng`, no `Math.random`), and returns the same value for the same row on repeat cycles.
2. Of the 7 ECL rows currently gated `children>=1`, the 5 that claim a young child are re-gated to `childstage=minor`; the 2 age-neutral rows are left on `children>=1`.
3. The three hardcoded `family:kids` lines split 1 age-neutral / 2 minor-gated per §Line classification.
4. A citizen with `NumChildren>=1` whose resolvable children are all ≥18 (POP-00005, POP-00594 — verified this session) draws zero minor-child lines across a 5-cycle bench run.
5. The ECL loader rejects a row whose Conditions name `childstage` with a value outside the enum (existing fail-closed path, no new mechanism).

---

## Findings — the empirical picture

All read live from `Simulation_Ledger` (931 rows) and `Event_Content_Ledger` (252 rows) on 2026-08-02.

| Measure | Count |
|---|---|
| Citizens with `NumChildren >= 1` | **556** |
| Citizens under 18 in the entire ledger | **48** |
| Parents whose `ChildrenIds` is populated | 53 |
| Parents whose `ChildrenIds` is blank | **503** |
| `ParentIds` cells that are literally `[]` | 593 of 643 populated |
| Distinct parents recoverable by reverse-ParentIds | 53 (same set) |
| Households containing ≥1 minor | 48 |
| Parents resolvable by **any** exact path | **54** |
| Parents **not resolvable at all** | **502** |
| Parents aged 60+ | 190 |
| Parents aged under 40 | 92 |

**The headline is not "2 citizens are affected."** That number only appears if you count all-adult households you can *resolve*, and you can resolve 54 of 556. The real shape: 556 citizens draw minor-child content, ~51 have a verifiable minor at home, ~190 are 60+ and near-certainly empty nesters, and 502 cannot be answered from ledger data at all. `NumChildren` is a lifetime count that never decrements when children grow up, and in ~90% of rows it has no entity behind it.

**Loose thread, not part of this build:** 7 rows carry a blank `BirthYear` — POP-01022 through POP-01028 (Wilson Shepard, Adash Stanley, AJ Dybantsa, Dame Sarr, Coen Carr, Austin Reaves, Wendell Carter Jr.). They are Oaks roster mints. A blank BirthYear bands as `senior` in `deriveLifeState_`, so they mis-band today, independent of this plan. Sports layer is Paulson's; flagged, not fixed here.

---

## Design

### The resolution ladder

`deriveChildStage_(row, familyIndex, ledgerIndex)` walks the ladder in order and returns at the first hit. Pure function of the snapshot — a citizen must not have a child at home one cycle and not the next.

| Step | Test | Result |
|---|---|---|
| 0 | `NumChildren < 1` or blank | `none` |
| 1 | `ChildrenIds` parses to ≥1 POPID present in the ledger | youngest resolved age `<18` → `minor`, else `grown` |
| 2 | Reverse index: citizens whose `ParentIds` contains this POPID | same rule as step 1 |
| 3 | `HouseholdId` contains ≥1 citizen under 18 who is not this citizen | `minor` |
| 4 | `BirthYear` unusable (blank / NaN / outside 1900–2041) | `unknown` |
| 5 | Proxy off parent age — `age < 42` | `minor` |
| 6 | Proxy off parent age — `age >= 58` | `grown` |
| 7 | otherwise | `unknown` |

**Proxy constants and why.** Assume first birth around 28. A 42-year-old's eldest is then ~14 — still a minor, so under 42 leans `minor`. A 58-year-old's eldest is ~30, and with 3 children spaced ~3 years the youngest is ~24 — so 58+ leans `grown`. The 42–57 band is genuinely unknowable and returns `unknown`. Declare `CHILDSTAGE_PROXY_MINOR_MAX = 42` and `CHILDSTAGE_PROXY_GROWN_MIN = 58` as named constants at the top of the resolver so they are tunable without hunting literals.

**Fail-closed rule:** `unknown` never satisfies `childstage=minor`. It is a distinct value rather than an alias for `grown` so that authors can deliberately write to it later, and so telemetry can count how much of the population is still unresolvable.

**Exact beats proxy, always.** Steps 1–3 run before the proxy so the 54 citizens the ledger *can* answer get the true answer. A single proxy applied to all 556 would misfire on exactly the households that are verifiable — including POP-00005 and POP-00594, whose proxy band (53 and 57) would say `unknown` while their actual children are 25 and 22.

### The family index

Steps 2 and 3 need reverse lookups. Building them per-citizen is O(n²) across 931 rows. Build once per cycle and memoize on `ctx`:

- `ctx.familyIndex.childrenOf` — `{ parentPopId: [childPopId, ...] }` from every row's `ParentIds`
- `ctx.familyIndex.minorsByHousehold` — `{ householdId: count }` for citizens under 18
- `ctx.familyIndex.ageOf` — `{ popId: 2041 - BirthYear }`, skipping unusable BirthYears

Build lazily from `ctx.ledger` on first call and cache on `ctx`; `initSimulationLedger.js` already loads the ledger into `ctx.ledger` at Phase 1, so no new read. Age uses the 2041 anchor per the standing convention — compute live, never trust a precomputed Age field.

### Line classification

The gate is only half the fix. Of the 10 affected lines, 3 are age-neutral and need no gate at all — gating them would wrongly strip texture from empty-nesters who still have adult children.

**Event_Content_Ledger — currently `children>=1`:**

| PoolKey | Text | Verdict |
|---|---|---|
| family.parenting | sat in the bleachers at the recreation center and watched their kid strike out looking | → `childstage=minor` |
| family.parenting | explained the Baylight construction to a six-year-old using entirely made-up words | → `childstage=minor` |
| family.parenting | helped with math homework they barely understood themselves and faked the confidence perfectly | → `childstage=minor` |
| family.parenting | did the mental math on the grocery run to make sure the kids' lunches were covered for the week | → `childstage=minor` |
| sports.as | taught the kid to boo respectfully — an Oakland art form | → `childstage=minor` |
| family.parenting | woke up at 5 AM just to have thirty minutes of total silence before the house woke up | keep `children>=1` |
| family.parenting | checked the front door lock three times after everyone else was asleep | keep `children>=1` |

**Hardcoded pool, `generateCitizensEvents.js` L2352–2354:**

| Text | Verdict |
|---|---|
| negotiated bedtime like a seasoned diplomat, and lost gracefully | → minor-gated |
| found a school drawing folded in a jacket pocket and kept it | → minor-gated |
| one of the kids asked a question at dinner that stopped the room | age-neutral, keep on `kidCount > 0` |

**Opportunity the field unlocks (not required for close):** `childstage=grown` becomes an authorable condition, so empty-nest content can finally be aimed. One row already exists and is correctly written for it — `retirement.depth`: *"fixed a squeaky hinge that had been squeaking since the kids left home"* — currently gated only on `lifestate=retired`.

---

## Tasks

### Task 1: Build the family index

- **Files:** `phase05-citizens/citizenContextBuilder.js` — modify
- **Steps:**
  1. Add `buildFamilyIndex_(ctx)` that walks `ctx.ledger.rows` once and returns `{childrenOf, minorsByHousehold, ageOf}` per §The family index.
  2. Memoize on `ctx.familyIndex`; return the cached object if already present.
  3. Skip rows with unusable `BirthYear` when populating `ageOf` (do not coerce blank to 0 — that yields age 2041).
- **Verify:** `node -e` harness over a ledger snapshot → `childrenOf` has 53 keys, `minorsByHousehold` has 48 keys, `ageOf` omits POP-01022…01028.
- **Status:** [ ] not started

### Task 2: Add the resolver

- **Files:** `phase05-citizens/citizenContextBuilder.js` — modify
- **Steps:**
  1. Add `CHILDSTAGE_PROXY_MINOR_MAX = 42` and `CHILDSTAGE_PROXY_GROWN_MIN = 58` as top-of-file named constants.
  2. Add `deriveChildStage_(row, familyIndex)` implementing the ladder in §The resolution ladder exactly, in order.
  3. Return `childStage` from `deriveLifeState_`'s result object (the existing `{age, band, isMinor, working, statusNorm, married, hasKids, wealthBand}` shape gains one key). No `ctx.rng`, no `Math.random`.
- **Verify:** POP-00594 → `grown`; POP-00005 → `grown`; a citizen with a household minor → `minor`; a 50-year-old parent with blank ChildrenIds → `unknown`. Same input twice → same output.
- **Status:** [ ] not started

### Task 3: Add `childstage` to the conditions DSL

- **Files:** `phase02-world-state/loadEventContentLedger.js` — modify
- **Steps:**
  1. Add to `CONTENT_LEDGER_DSL_FIELDS`: `childstage: { kind: 'enum', values: { none: 1, minor: 1, grown: 1, unknown: 1 } }`.
  2. Wire `childstage` into the condition evaluator to read the resolver's value, matching how `band` and `lifestate` already resolve (case-insensitive at eval, canonical enum keys).
- **Verify:** a row with `Conditions = childstage=minor` loads; `childstage=teen` is rejected and counted in `skipped` (existing fail-closed path).
- **Status:** [ ] not started

### Task 4: Gate the hardcoded pool lines

- **Files:** `phase05-citizens/generateCitizensEvents.js` — modify (L2349–2355 region)
- **Steps:**
  1. Split the `kidCount > 0` block: keep the dinner-question line on `kidCount > 0`; move the bedtime and school-drawing lines behind `childStage === 'minor'`.
  2. Leave the `maritalStatus` and wealth blocks below untouched.
- **Verify:** bench run over POP-00594 across 5 cycles → zero draws of the bedtime or school-drawing lines; the dinner-question line still eligible.
- **Status:** [ ] not started

### Task 5: Re-gate the 5 ECL rows

- **Files:** `Event_Content_Ledger` sheet — modify (5 rows, Conditions column F)
- **Steps:**
  1. Set Conditions to `childstage=minor` on the 4 `family.parenting` rows and the 1 `sports.as` row named in §Line classification.
  2. Preserve the existing `wealth<=5` term on the grocery-run row → `childstage=minor; wealth<=5`.
  3. Leave the 2 age-neutral rows on `children>=1`.
- **Verify:** re-run the loader → 252 rows loaded, 0 skipped (the loader's own row telemetry, engine.79).
- **Status:** [ ] not started

### Task 6: Tests

- **Files:** `phase05-citizens/` test file alongside the existing `contentLedgerLoader.test.js` pattern — create
- **Steps:**
  1. Ladder table test: one case per step 0–7, asserting the returned value.
  2. Determinism test: same row twice → identical result.
  3. Exact-beats-proxy test: a 53-year-old with resolvable adult children returns `grown`, not the proxy's `unknown`.
  4. Loader test: `childstage=minor` accepted, `childstage=teen` rejected.
- **Verify:** `node --test` → all pass.
- **Status:** [ ] not started

### Task 7: True up the docs in the same commit

- **Files:** `docs/SIMULATION_LEDGER.md`, `docs/engine/ENGINE_STUB_MAP.md` — modify
- **Steps:**
  1. Note on `NumChildren` (col W) that it is a lifetime count, does not decrement, and is not a has-a-minor-at-home signal — `childstage` is.
  2. Regenerate STUB_MAP (`/stub-engine`) so the new resolver is mapped.
- **Verify:** `NumChildren` row mentions `childstage`; STUB_MAP contains `deriveChildStage_`.
- **Status:** [ ] not started

---

## Rejected for now — minting the phantom children

556 parents claim children; 48 minors exist as rows. Under universal protagonism the doctrinally correct fix is that every one of those children is a citizen with their own row, their own school, their own life — not a scalar in their parent's row.

Rejected for **this** build because it is a world-scale population change, not a mechanism fix: ~500+ new rows against a 931-row ledger, each needing household placement, school assignment, an age that reconciles with the parent's, and a POPID from the allocator that is itself under repair (`generationalWealthEngine.js:1499`). That is Mike's call on the shape of the world, not a decision this plan should make by implication.

The proxy gate above is compatible with minting later: once children exist as rows, ladder steps 1–3 resolve them exactly and the proxy stops being reached. Nothing here has to be unwound.

---

## Open questions

- [ ] Tier-1 citizens should arguably never fall through to the proxy — their families are authored canon. Options: hand-backfill `ChildrenIds` for Tier-1 parents, or treat Tier-1 + unresolvable as a loud warning rather than `unknown`. Blocks nothing; affects Task 2's step-4 behavior. **Mike's call.**

---

## Changelog

- 2026-08-02 — Initial draft (S350, research-build). Defect found at boot: POP-00594 (Robert Corliss, children aged 25 and 22) drew "watched their kid strike out looking." Empirical basis read live before design; `ChildrenIds`-only resolution rejected after measuring it blank on 503 of 556 parents.
