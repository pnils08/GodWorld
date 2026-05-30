---
title: Household & Family Simulation — Representative Sample Model
created: 2026-05-04
updated: 2026-05-29
type: plan
tags: [engine, citizens, ledger, family, active]
sources:
  - S201 live audit — Simulation_Ledger MaritalStatus + HouseholdId scan (engine-sheet)
  - S243 model reframe (Mike-direct) — tracked citizens are a representative SAMPLE of ~375,985 simulated Oaklanders; families materialize through publication, not backfill
  - "[[engine/ROLLOUT_PLAN]] §Data & Pipeline — engine.5"
  - "[[engine/ENGINE_REPAIR]] Row 20 (this plan)"
  - "[[engine/LEDGER_AUDIT]] §Current State"
pointers:
  - "[[engine/LEDGER_REPAIR]] — S94 historical recovery record (different scope — read first)"
  - "[[engine/LEDGER_AUDIT]] — current ledger state authority"
  - "[[engine/ENGINE_REPAIR]] — tactical tracker; Row 20 points here"
  - "phase05-citizens/householdFormationEngine.js — `generateBirths_()` stub (line ~428) is the home for the engine birth simulation"
  - "phase05-citizens/runYouthEngine.js — youth lifecycle engine; currently no-ops (no youth on ledger)"
---

# Household & Family Simulation — Representative Sample Model

**Status:** REWRITTEN S243 (2026-05-29). The S201 three-stage backfill (pair-married →
reconcile-NumChildren → ingest-youth) is **superseded** — it was built on a wrong premise.
This doc now carries the Representative Sample model + the engine-driven family build.

Sibling to [[engine/LEDGER_REPAIR]] (S94 historical recovery — different scope, DO NOT
re-analyze).

---

## The premise correction (S243)

The S201 plan treated the tracked citizens as **the population** and tried to wire internal
family structure into it — pair every "married" citizen to another tracked citizen, reconcile
NumChildren against tracked kids, bulk-ingest youth attached to tracked parents. Building it
surfaced why it's wrong: a 232M/180F gender imbalance made opposite-gender pairing
arithmetically cap at ~84%, and the only way to "complete" households was to fabricate couples
between independent citizens and rename ~173 of them. That's manufacturing relationships that
don't exist. **Make-believe.**

The correction: **the ~858 tracked citizens are a representative SAMPLE of ~375,985 simulated
Oaklanders** (≈1 tracked citizen per 438 people). They are the voices for the greater populace.

### The model (locked S243)

1. **Tier = tracking status.** Tier 1–4 live in `Simulation_Ledger` = the tracked sample. Tier 5
   = the ~375k untracked masses. To be in the ledger at all you are Tier 4+.
2. **Demographic flags are properties of a representative voice, not promises of tracked relations.**
   "Married" / "NumChildren = 2" describe the citizen as a representative of married / 2-child
   Oaklanders. The spouse and children live **off-sample** (Tier 5) by default.
3. **Distributions across the tracked sample mirror real Oakland** — calibrated to census-class
   rates — *with a documented selection skew*: tracked citizens are story-participants (civic
   figures, athletes, media subjects, workers), so the set skews adult. We do not force a full
   age-representative redraw; we seed enough youth that the engine and youth coverage can function.
4. **Families materialize through PUBLICATION.** When an edition names a family member — Benji
   Dillon's wife, his son Rick — the post-publish "new citizens" ingestion promotes them
   Tier 5 → Tier 4 and attaches them to the household. This is the *only* mechanism that grows
   tracked households. Canon-driven, organic, already the pipeline's job.
5. **The engine simulates life over cycles** — marriage, births, aging, household co-location —
   by calibrated random chance at real rates. Not a one-time backfill.
6. **INVARIANT — a tracked child requires ≥1 tracked adult in its household** (not necessarily a
   parent). No orphan tracked youth. A tracked kid needs only one tracked parent, or none, as
   long as this invariant holds.

### What this supersedes

- **`pairMarriedCitizens.js` (built S243, shelved):** wrong tool. Pre-wiring couples between
  independent sample points is the make-believe the model rejects. Kept on disk until this
  plan's build phases land, then removed.
- **Old Stage 2 (reconcile NumChildren):** moot. NumChildren is a demographic attribute; the
  kids are off-sample until a story names one or the engine births one. Do not reconcile it to
  tracked rows. It updates only when a real tracked child is attached.
- **Singleton households are correct,** not a defect. Independent sample points. The S201 "526 of
  529 are singletons" framing was reading a feature as a bug.

---

## Current state & multi-session roadmap (S243)

Self-contained handoff so a fresh session executes without reconstructing tonight's work.

| Phase | State | What's left |
|---|---|---|
| **1 — youth seed** | ✅ **DONE + verified S243** | 45 youth live (POP-00974..01018), 858→903, under-18 3→48. `scripts/seedYouthBalance.js`. Nothing left. |
| **2a — unfreeze (plumbing)** | ✅ **FIXED + deployed S244** | `simYear` was the ordinal `godWorldYear` (=2), not a calendar year → every age ≈ −2000 → all age-gated events rejected. Fixed `advanceSimulationCalendar.js:208` → `2040 + (godWorldYear-1)`. Events now fire. **This was plumbing, not the mission.** |
| **2b — events must MEAN something (the real work)** | 🔴 **NOT STARTED — this is the actual engine.5** | Events fire into a VACUUM. See §Phase 2b below. This is where the session should live. |
| **3 — publication materialization** | ⏭️ not started | Verify post-publish new-citizen ingestion; wire household attachment + invariant. Scope when Phase 2 lands. |

**Phase 2 — what's PROVEN (don't re-derive):**
- Logic is healthy — `/tmp/trace_generational.js` replayed the exact checks against 770 real citizens × 95 cycles → 81 weddings / 12 births / 119 promotions / 95 retirements / 23 graduations.
- RNG is healthy — `/tmp/rng_proof.js`: live `seededRng_` profiles statistically uniform (0.45% < 0.004, 5.2% < 0.05). The `state*1103515245 > 2^53` overflow smell does NOT degrade the distribution. (Tidy-up candidate, not the bug.)
- All 6 milestone checks gate on `&& birthYear` (`phase04-events/generationalEventsEngine.js` L281/292/306/318/330/342). Non-gated `checkHealthEvent_` DOES fire (Health/Recovery tags exist; life-milestones don't).
- **Leading hypothesis:** at runtime `birthYear` (or a shared column index) reads falsy from `ctx.ledger.rows`, so every gated check is skipped before the dice. Reads fine from the raw sheet → why the harness works and the live engine doesn't. Full proof: ENGINE_REPAIR Row 23.

### Phase 2 execution roadmap — NEXT SESSION (fresh, focused; deploy + cycle gated)

**Acceptance criteria:** (1) one fired cycle produces > 0 weddings/births in the SL `LifeHistory` column; (2) `generationalEventsEngine` fix deployed + smoke-tested; (3) dead `householdFormationEngine` retired; (4) determinism preserved (no `Math.random`, `ctx.rng` only).

- **Task 2a — Instrument (read-only, no behavior change).** In `phase04-events/generationalEventsEngine.js runGenerationalEngine_`, after the loop, log to a debug sink (Engine_Errors INFO row or a temp tab): `iBirthYear`, count of citizens passing the `birthYear` gate, count of `chance_` clears per type. **Verify:** pre-commit hook passes (no Math.random/direct-write). **Deploy-gated (Mike go).**
- **Task 2b — Deploy + fire one cycle.** `clasp push` (Mike go) → Mike fires C96 → read the debug sink via service account. **Verify:** the instrumentation reveals whether `iBirthYear` is −1 / `birthYear` falsy / gate count 0.
- **Task 2c — Fix the pinpointed cause.** Almost certainly small (column-index resolution in `ctx.ledger`, or the `&& birthYear` gate). Apply, re-deploy, fire a cycle. **Verify:** SL `LifeHistory` column gains `[Wedding]`/`[Birth]` tags; counts ≈ harness rates.
- **Task 2d — Retire the dead duplicate.** `householdFormationEngine` (Status-case bug, Row 22) — decide with Mike: fix-and-keep (resurrects structural formation/income/stress) vs retire (delete the birth/marriage/divorce stubs + the engine if its unique structural work isn't wanted). **Blast-radius decision — Mike's call (which engine owns households).**
- **Task 2e — Calibrate + design calls.** Once alive: tune rates to real Oakland; decide the wedding-gate on births + whether milestones sync to NumChildren/MaritalStatus columns.

**Out of scope for the kill-shot:** building the `householdFormationEngine` stubs (they're dead duplicates — see ENGINE_REPAIR Row 20/23).

---

## Phase 2b — Events must MEAN something (the vacuum) — THE REAL ENGINE.5

**Captured S244 so it never has to be re-derived.** The S244 simYear fix unfroze the
event-firing layer, but firing a `[Wedding]` tag into a column is confetti, not a life.
The engine has the *event* layer; the layer that makes an event *mean* something was
never built. This is the actual mission ("give the citizens a life") and the whole
session's worth of design below must NOT evaporate again.

### What "in a vacuum" means — confirmed in code (don't re-investigate)

`applyMilestone_` (generationalEventsEngine L1020) writes ONLY `row[iLife]` (the LifeHistory
tag) + `row[iLastU]`. It never touches structural state. Consequence:

- **Wedding → binds no one.** `spouseId` is null unless a romantic bond already existed
  (`checkWedding_` L675), so it's almost always one citizen "marrying" nobody. `MaritalStatus`
  is never updated by any life event (only `processAdvancementIntake` writes it — the manual
  intake path, L498).
- **Birth → creates no child.** `triggerBirthCascade_` pushes a `priority_shift` cascade flag.
  No new citizen, no household growth, `NumChildren`/`ChildrenIds` untouched.
- **Promotion → changes no job.** `triggerPromotionCascade_` only tweaks existing bond
  intensities. `CareerStage`/`TierRole`/`Income` stay exactly as they were.
- **No accumulation.** Events are independent dice rolls, not a trajectory. A life is
  married → kids → career arc → retirement → death, connected. The engine has none of that chain.
- The `householdFormationEngine` birth/marriage/divorce functions that were SUPPOSED to do
  this connecting work are bare `// TODO` stubs (ENGINE_REPAIR Row 20/23).

### What the model ALREADY decides (these are NOT open — build them as specified)

The Representative Sample model (locked S243, top of this doc) settles the connecting layer.
Do not re-open these as questions:

1. **Wedding** → off-sample spouse by default (model point 2). The event flips the citizen's
   `MaritalStatus`; the partner stays Tier-5/implicit. Tracked-couple binding is rare and
   publication-driven, not the common path.
2. **Accumulation + surfacing** → the engine weaves the life-chain by calibrated random chance
   (point 5); publication materializes named family Tier-5→Tier-4 (point 4). The accumulated
   life surfaces in the citizen's own structural columns + coverage.

### The ONE genuine seam — RESOLVED S248 (Mike's word): option (a), births stay off-sample

Model **point 4** said publication is *"the only mechanism that grows tracked households."*
The older **Phase 2 — Births** text below said *"a birth creates a tracked Tier-4 infant."*
Both could not be true. **Mike's decision (S248): option (a) — births stay off-sample.**
A `[Birth]` increments the parent's `NumChildren` only; the child lives Tier-5 (untracked)
until a published story names it. **Publication remains THE only mechanism that grows the
tracked-citizen count** (model point 4 stands, unsoftened). Rationale: keeps the ~903 tracked
set a curated representative-voice sample rather than ballooning with storyless engine-born
infants. The Phase-2 "birth creates a tracked infant" text below is **superseded** — do not
create tracked infant rows in the engine.

### Build — TWO TRACKS (S248 measure-twice split; seam settled = option (a))

The S248 caller-graph + live-ledger quant (Status: `Active=872/Retired=9/pending=22`;
`householdFormationEngine.loadCitizens_` admits **0** today, case-fold admits **872**) split
this into two independent tracks. **Track 1 is the mission-central, no-fork work and ships
first; Track 2 is a separate dormant-subsystem reactivation that needs its own canon-safety pass.**

**Track 1 — events MEAN something (`generationalEventsEngine.applyMilestone_`).** This is where
milestones already fire every cycle. Make the milestone path mutate the citizen's structural
columns in `ctx.ledger`, not just the LifeHistory tag:
- **wedding** → flip `MaritalStatus` to married (+ spouse linkage only in the rare tracked-couple
  case where `spouseId` is non-null);
- **birth** → `NumChildren`++ on the parent's row ONLY (off-sample, per the S248 seam decision —
  NO tracked infant row created);
- **promotion** → `CareerStage` / `TierRole` / `Income`.
- The wedding-gate on births (birth requires a prior `[Wedding]` tag — L682) stays per the model.
- Determinism preserved (`ctx.rng` only); writes go through `ctx.ledger` (Phase 42 §5.6), never
  direct sheet writes. Deploy HELD until C96 confirms the S244 simYear fix (Track 1 age-math
  rides on it — deploying life-event mutations on an unverified age-fix would write garbage).

**Track 2 — household reactivation (`householdFormationEngine`, Row 22).** Keep-and-fix, NOT
retire — the engine owns live-intended `formNewHouseholds_` / `updateHouseholdIncomes_` /
`detectHouseholdStress_` / `dissolveStressedHouseholds_` machinery, all dormant only because
`loadCitizens_` returns 0. The Row 22 case-fold reactivates all of it 0→872 in one line —
**cityDynamics S136 class.** Before flipping: calibrate/suppress the rent-burden-crisis hooks
(`rentBurden≥0.50 → generateRentBurdenHook_`) for prosperity canon (deprivation-coding hazard,
S245 class) + verify the formation/dissolve Household_Ledger writes are canon-safe. Its
birth/marriage/divorce stubs stay **retired** — those live in Track 1. Separate session/deploy.

---

## Build sequence

```
Phase 1 (youth seed — small, functional)        ← prerequisite: gives the engine live material
   ↓
Phase 2 (engine life-event simulation)          ← the meat: births, marriage, household formation
   ↓
Phase 3 (publication ingestion + invariant)     ← how tracked families grow, going forward
```

### Phase 1 — Youth seed (functional, ~30–60)

**Goal:** promote a small cohort of Tier-5 youth to Tier-4 so (a) the engine's youth/birth/aging
logic has live data to operate on, and (b) youth coverage has subjects. NOT a representative
age redraw. Reframed correctly: **promotion to tracked, not fabrication of lives.**

**Spec (PENDING AUDIT VALIDATION — Step 2 of this session confirms every field against live schema + engine expectations):**

| Field | Value |
|---|---|
| POPID | sequential from **POP-00974** (live max is POP-00973 — S229 consumed 952–973; do NOT reuse the S201 plan's 952 range) |
| Tier | 4 |
| ClockMode | ENGINE |
| Status | Active (canonical case) |
| RoleType | student (per generateGenericCitizens age-5–22 rule — VALIDATE) |
| Age spread | ~30–60 youth across 0–17, weighted toward 5–17 (engine-readable brackets) |
| BirthYear | 2041 − target_age |
| HouseholdId | an EXISTING tracked adult's household (satisfies the invariant) |
| Neighborhood | the host adult's neighborhood |
| Last | inherits the host adult's surname |
| ParentIds | optional — one tracked guardian or empty (invariant is adult-in-household, not parent-specific) |
| Gender | ~50/50 deterministic by hash |
| MaritalStatus | single |
| NumChildren | 0 |
| EducationLevel | age-appropriate band (VALIDATE against what runEducationEngine expects) |

**Host-adult selection:** place each seed youth into a tracked adult's household. Prefer adults
who are age-plausible guardians (≈25–60) and flagged with NumChildren > 0 (honors the demographic
hint without destructively reconciling it). One youth per host household in v1; the host adult
becomes the tracked adult satisfying the invariant (parent or not). The host adult is already the
`HeadOfHousehold` of their `Household_Ledger` row — that stays; the youth joins as a member.

**DUAL-WRITE (Step-2 audit catch — plan v1 of this rewrite missed it):** the engine has TWO
parallel household stores and the seed must write **both**, or the engine won't see the youth:
1. **`Simulation_Ledger`** row — POPID, BirthYear, Status, Neighborhood, HouseholdId (= host
   adult's HH), Last, etc. (`runYouthEngine.getNamedYouth_` reads here; picks up age-5–17
   automatically next cycle.)
2. **`Household_Ledger`** — append the youth POPID to the host household's `Members` JSON array;
   flip `HouseholdType` singleton→`family` if it was a solo household. (`loadHouseholds_` +
   `updateHouseholdIncomes_` + `generationalWealthEngine` read Members here.)
`Family_Relationships` is **skipped** — it holds 2 vestigial rows with malformed IDs (`POP-0001`,
4-digit) and is not the live model; SL `ParentIds`/`ChildrenIds` + `Household_Ledger.Members` are.

**ParentIds decision:** seed youth get **empty `ParentIds` (`[]`)** — parents are off-sample.
`generationalWealthEngine` uses ParentIds for wealth inheritance; empty = no inheritance, which is
correct for an off-sample parent. (Only set a tracked parent when one genuinely exists, e.g. via
publication.)

**Age weighting (audit catch):** `runYouthEngine` processes ages **5–22 only** (MIN_AGE 5). Ages
0–4 are inert to it — household texture, no events. Weight the seed toward **5–17** so the engine
has live material; include a few 0–4 for realism knowing they're event-silent until they age up.

**Acceptance gates (FINALIZED after Step 2 audit):**

| Gate | Target |
|---|---|
| Youth added | 30–60 |
| Every youth's household contains ≥1 tracked adult | 100% (the invariant) |
| Every youth's Last matches host adult's Last | 100% |
| Every youth's Neighborhood matches host adult's | 100% |
| POPID sequential from 00974, no collision | 100% |
| Determinism (re-run zero-diff) | 100% |
| `runYouthEngine.js` finds N youth post-seed | N rises from ~0 |

Dry-run first; the full row set is shown before any write; apply is gated on Mike's go-call
(many-row ledger ADD = cross-boundary per TERMINAL.md).

### Phase 2 — Engine life-event simulation

**Goal:** the citizen lives are simulated by the engine, by calibrated random chance at real rates.

**S243 DISCOVERY — DO NOT build the household-engine stubs. The life-event engine ALREADY EXISTS
and is wired every cycle (`generationalEventsEngine.runGenerationalEngine_`) — but it fires
near-zero milestones (SL LifeHistory column: 0 weddings/births/promotions/graduations,
1 death, all-time). See ENGINE_REPAIR Row 23 for the full diagnosis + ruled-out causes. Phase 2
is therefore: (a) `/diagnose` why `chance_` near-never clears in the working engine and fix it
[the real work — citizen lives are frozen], (b) retire the dead duplicate `householdFormationEngine`,
(c) calibrate rates + decide the wedding-gate / column-sync design questions. The
`generateBirths_`/`processMarriages_`/`processDivorces_` stubs below are dead duplicates to
retire, NOT to implement.**

**PREREQUISITE — fix the Status-case bug first (Step-2 audit catch, latent/masked).**
`householdFormationEngine.loadCitizens_` filters `citizen.status === 'active'` (lowercase, strict),
but the SL enum is `"Active"` (827 rows, capitalized). The engine currently loads **~zero** real
citizens — masked today only because `generateBirths_`/`processMarriages_`/`processDivorces_` are
stubs that no-op. The moment Phase 2 implements them they'd operate on an empty/wrong set. Fix to
case-fold (`String(status).toLowerCase() === 'active'`) before building any life-event logic.
`runYouthEngine` already case-folds — the inconsistency is the tell. File as an ENGINE_REPAIR row.

All three life-event functions are confirmed **bare stubs** (`// TODO`). Both `runHouseholdEngine_`
and `processHouseholdFormation_` ARE wired into the cycle (Phase 5, godWorldEngine2 L277/290 +
cycle-phases L1595/1608) — they fire every cycle and no-op on births/marriages/divorces.

- **Births** — implement `householdFormationEngine.generateBirths_()` (currently a stub). Eligible
  tracked adults (age, household, marital signal) roll a per-cycle birth chance calibrated to real
  Oakland fertility. A birth creates a tracked Tier-4 infant attached to the household (invariant
  holds — the parent is the tracked adult). Off-sample births are NOT created (they're implicit).
- **Marriage / partnership transitions** — tracked citizens roll marital-status transitions
  (single→married, married→divorced/widowed) at real rates; this updates the demographic flag.
  Forming a *tracked* couple (both spouses tracked) happens only when chance links two compatible
  tracked citizens OR via publication — rare by design.
- **Aging** — youth age up each cycle; education bands advance; the seed cohort matures so teens
  exist within a few cycles without a representative bulk-add.

Real-rate anchors (census-class, refine in Step 2):

| Attribute | Real Oakland (~) | Engine target |
|---|---|---|
| Under 18 | ~21% of general pop | functional seed, then organic growth (tracked set skews adult) |
| Now-married (total pop) | ~32–38% | hold tracked flag distribution near this band |
| Annual birth rate | ~12 / 1,000 | scale to per-cycle, per-eligible-adult chance |

This is the largest build — its own session(s). Each sub-engine is a separate guarded change with
caller-graph + dry-run discipline.

### Phase 3 — Publication ingestion + invariant enforcement

**Goal:** wire the canon-driven family materialization (model point 4) + enforce the invariant
(point 6).

- **VERIFY FIRST (no guessing):** what does the current post-publish "new citizens" ingestion do
  today? Does it set HouseholdId / ParentIds / ChildrenIds and attach the named family member to
  the host citizen's household, or just append a bare row? Step 2 audit reads the ingestion path
  (`mediaRoomIntake.js` / advancement intake / post-publish) and reports actual behavior.
- **Wire household attachment** if absent: a named family member ingested as Tier-4 joins the
  named citizen's household, inherits surname/neighborhood, sets the relation backlink.
- **Enforce the invariant** in validation (pre-flight / a guard): reject/flag any tracked child
  (age < 18) whose household has no tracked adult.

---

## What the Step-2 audit must answer

Before this plan is trusted, the ledger + engine audit (this session, Step 2) must establish:

1. **Family-column reality** — completeness + value shapes for HouseholdId, MaritalStatus,
   NumChildren, ParentIds, ChildrenIds (formats: JSON arrays? POPID lists? counts?). How many
   empty, how many malformed.
2. **Engine expectations** — caller-graph every engine consumer of those columns
   (`householdFormationEngine`, `runYouthEngine`, `generationalWealthEngine`,
   `migrationTrackingEngine`, `seedRelationBondsv1`, education/career engines). What format each
   reads, what each writes, what invariants each assumes. Specifically: does anything read the
   "household members share a neighborhood" or "child has a parent" invariant?
3. **Youth-engine readiness** — what exactly `runYouthEngine.js` looks for (age band, fields) so
   the seed produces rows it will actually process.
4. **Ingestion behavior** — what post-publish new-citizen ingestion does with family fields today.
5. **Seed-spec validation** — confirm every Phase-1 field value against the live schema + engine
   reads; finalize the acceptance gates.

### Step-2 audit findings (S243 — answered)

1. **Family-column reality.** HouseholdId 62% (`HH-NNNN-NNN` + 1 `HH-KEANE`), MaritalStatus 88.9%,
   NumChildren 98.1%, ParentIds/ChildrenIds 69.6%/69.5% (JSON arrays of POPID strings; 594/592 are
   `[]`). **Only 4 citizens have tracked children** — the Corliss + Dillon Tier-1 canonical families
   (POP-00005/00594→00595/00596; POP-00018/00742→00743). **543 of 547** adults with NumChildren>0
   have zero tracked children → off-sample, exactly as the model predicts. Confirmed.
2. **Engine expectations:**
   - `runYouthEngine.getNamedYouth_` — reads SL via `ctx.ledger`; youth = age **5–22** (BirthYear-
     derived), Status≠deceased; reads POPID/First/Last/BirthYear/Neighborhood. Ignores HouseholdId.
   - `householdFormationEngine.loadCitizens_` — reads SL family cols (ParentIds/ChildrenIds JSON-
     parsed). **Status-case bug** (see Phase 2 prereq). `loadHouseholds_` reads `Household_Ledger`.
   - `generationalWealthEngine` — reads ParentIds (inheritance) + HouseholdId (household-wealth agg).
   - **No engine enforces "household members share a neighborhood"** — co-location is cosmetic.
3. **Youth-engine readiness** — seed rows with BirthYear→age 5–17 + Status=Active are processed
   automatically next cycle. 0–4 inert.
4. **Backing sheets** — `Household_Ledger` **529 populated rows** (Members JSON, HeadOfHousehold,
   HouseholdType, income); parallel to SL → **dual-write required** (see Phase 1). `Family_Relationships`
   = 2 vestigial malformed rows, effectively dead.
5. **Ingestion behavior (Phase 3)** — still to verify at Phase-3 scoping (post-publish new-citizen
   path); not blocking the seed.

**Net plan revisions from the audit:** (a) dual-write SL + Household_Ledger.Members; (b) ParentIds
empty for seed; (c) age-weight 5–17; (d) Phase-2 Status-case-bug prerequisite; (e) Family_Relationships
out of scope for seed. All folded into the sections above. The plan is now grounded in live state.

---

## Out of scope (unchanged intent)

- Tier-1 manual review of named-character family (Mike, by hand).
- Adoption / step-parent modeling (engine v2).
- MaritalStatus enum case canonicalization (functional lowercase; future pass).
- Trait/career/school backfill for new youth (engines fill on triggers).

---

## Changelog

- 2026-05-04 (S201, engine-sheet) — Initial draft. Three-stage backfill (pair-married → reconcile
  NumChildren → ingest 120 youth). Age-range pairing + Tier-1 bypass + shared-surname policy.
- 2026-05-29 (S243, engine-sheet, Mike-direct) — **Full rewrite.** Premise corrected: tracked
  citizens are a representative SAMPLE of ~375,985, not the population. Backfill pairing
  superseded (`pairMarriedCitizens.js` built then shelved). New model: off-sample families,
  publication-driven materialization, engine-simulated life events at real rates, functional
  youth seed, and the tracked-child-needs-tracked-adult invariant. Build resequenced to
  seed → engine simulation → publication ingestion. Step-2 ledger+engine audit pending before build.
- 2026-05-29 (S243, engine-sheet) — **Phase 1 shipped + Phase 2 diagnosed in one session.** Phase 1
  youth seed live (45 youth, verified). Phase 2 cornered: trace harness proved logic healthy + RNG
  uniform → freeze is live execution (birthYear-gate hypothesis). Consolidated into this one plan
  (§Current state & multi-session roadmap) as the self-contained handoff. NO code/deploy this
  session by design — Phase 2 kill-shot (instrument → deploy → fire cycle → fix) is next session's
  focused work. Full diagnosis: ENGINE_REPAIR Row 23.
