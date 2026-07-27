---
title: Employment Living System Plan
created: 2026-07-27
updated: 2026-07-27
type: plan
tags: [engine, citizens, economy, active]
sources:
  - docs/research/2026-07-27-employment-as-a-living-system.md (research basis)
  - docs/engine/archive/ROLLOUT_PLAN.md — engine.83, engine.84
  - Mike-direct S335 — businesses carry true employment numbers; citizens born into tracked jobs; kids at 18 take these jobs; media-invented businesses become canon; headcount drops fire people
pointers:
  - "[[../engine/archive/ROLLOUT_PLAN]] — parent rollout (engine.83)"
  - "[[../research/2026-07-27-employment-as-a-living-system]] — research basis; the rules and hazards live there"
  - "[[2026-07-26-employment-reconciliation]] — the static repair this builds on"
  - "[[SCHEMA]] — doc conventions"
  - "[[../index]] — registered same commit"
---

# Employment Living System Plan

**Goal:** Employment becomes a loop instead of a one-time assignment — businesses carry true headcounts, headcount movement hires and fires real citizens, and no citizen is born into a workplace the world does not track.

**Architecture:** Four tables already carry employment; the pipeline runs one direction only. `linkCitizensToEmployers.js` resolves citizen → business in five layers. The reverse edge does not exist, but its **signal already does** — `runCareerEngine` emits `careerSignals.businessDeltas` and `.layoffs`, and `economicRippleEngine` consumes both for narrative ripples. This plan adds the write-back consumer, the `Generic_Citizens` employer column that makes "born into a tracked job" expressible, and completeness on the 23 business rows that currently cannot participate in an economy at all.

**Terminal split — by MODEL fit (Mike-direct S335):** terminals are now a model axis, not a lane fence. **research-build runs Opus 5** and is the cheaper seat, so it takes volume-plus-judgment work. **engine-sheet runs Fable 5**, better at complex coding, so it takes the multi-phase engine internals.

| Owner | Model | Work |
|---|---|---|
| research-build | Opus 5 | Tasks 1, 2, 3, 6 — sheet completeness, headcount truth, config tail, canon-gate design |
| engine-sheet | Fable 5 | Tasks 4, 5 — the write-back consumer and the birth/age-18 employment path |

**Pointers:**
- Resolver: `scripts/linkCitizensToEmployers.js` (five layers, config in `data/employer_mapping.json`)
- Existing hire/fire signal: `phase05-citizens/runCareerEngine.js` → `careerSignals.businessDeltas`, `.layoffs`
- Existing consumer (narrative only): `phase06-analysis/economicRippleEngine.js` v2.5, `MAJOR_LAYOFFS` at 3+/cycle
- Career progression: `phase05-citizens/educationCareerEngine.js`
- Feeder pool: `Generic_Citizens` (292 rows, has `Occupation`, no `EmployerBizId`)
- Promotion path: `phase05-citizens/processAdvancementIntake.js` (`checkEmergencePromotions_`, GC → SL at EmergenceCount ≥ 3)

**The three rules that bound every task (from the research):**

1. **Never invent employees.** `Simulation_Ledger` is a ~1:443 qualitative sample. DigitalOcean legitimately employs 800 with 3 tracked. The **only** illegal state is tracked > stated.
2. **Firing is a life event.** If headcount movement fires a tracked citizen, they lived it — `LifeHistory`, dials, possibly the paper. Never a silent `EmployerBizId` blanking.
3. **Re-runs must not undo lived state.** `--fill-blanks-only` exists because career-engine hires are truth. Any write-back composes with it.

**Acceptance criteria:**
1. Zero `Business_Ledger` rows lack `Employee_Count`, `Avg_Salary`, `Annual_Revenue` or `Growth_Rate` (today: 23).
2. Zero businesses have tracked employees exceeding stated `Employee_Count` (today: 11).
3. A cycle where a business's headcount falls below its tracked count produces firings recorded as life events, not blanked cells.
4. `Generic_Citizens` carries an employer, and a citizen promoted from the pool arrives with a tracked workplace — never a job title with no employer.
5. A citizen reaching 18 takes a tracked job, or is explicitly recorded as not-employed with a reason.
6. `unmatched` in the resolver falls under 60 and `BIZ-00030` no longer exceeds its stated headcount.

---

## Tasks

### Task 1: Complete the 23 economically-empty business rows — research-build

- **Files:** `Business_Ledger` via `lib/sheets.js`
- **Steps:**
  1. Fill `Employee_Count`, `Avg_Salary`, `Annual_Revenue`, `Growth_Rate` for all 23. They are: 14 faith organisations (`BIZ-00078`–`00088`, `00092`, `00093`), 7 venues/small businesses (`BIZ-00070`–`00073`, `00075`–`00077`, `00091`), and 2 professional firms (`BIZ-00089` Atlas Bay Architects, `BIZ-00090` Calderon-Nishi).
  2. Scale each to its kind, not to a formula — a neighbourhood cafe is not a cathedral. Faith orgs run small paid staff with large congregations; `Annual_Revenue` for a congregation is contributions, not sales.
  3. `Employee_Count` is the REAL headcount and must exceed the tracked count for that row.
  4. `BIZ-00077` Nino's sits in the Chicago layer — scale it like its siblings, do not treat it as Oakland.
- **Verify:** re-scan → zero rows with a missing or non-numeric economic column
- **Status:** [x] DONE S335 — all 23 filled, scaled to kind: 13 faith orgs (Cathedral of Christ the Light 30 staff / $3.1M contributions down to East Bay Meditation Center 4 / $210k), 8 venues and small businesses, 2 professional firms (Atlas Bay Architects 26 / $6.2M, Calderon-Nishi 34 / $8.9M). A 24th surfaced during verification: `BIZ-00074` Oakland Oaks still carried `Employee_Count` 7 — the fossilised tracked count — with no revenue or growth. Set to 185 staff / $61M / growth 14, banded with the A's and high because it is an expansion franchise; `Avg_Salary` left for the resolver to derive. **`Business_Ledger` is now 0 blanks across all four economic columns on all 99 rows.**

### Task 2: Restore true headcounts on the 11 violations — research-build

- **Files:** `Business_Ledger`
- **Steps:**
  1. These are fossilised sample counts left by the pre-S334 overwrite (engine.84): Anthropic 10/12 tracked, Oakmesh Systems 3/7, Port of Oakland 28/36, AC Transit 4/6, Oakland Hospital 66/68, Oakland Unified 24/31, Baylight Construction 35/50, Fruitvale Community Clinic 1/3, W Oakland Community Center 44/51, Oakland Housing Authority 22/33, plus `BIZ-00030`.
  2. Set each to a real institutional headcount. AC Transit is a transit agency, Oakland Unified a school district — the stored figures are absurd on their face.
  3. **`BIZ-00030` is the exception: do NOT raise it.** Its violation means citizens are still parked there who do not belong. Task 3 drains it; raising the number would legitimise the bucket.
- **Verify:** zero violations except `BIZ-00030`, which Task 3 closes
- **Status:** [x] DONE S335 — all 10 restored: Anthropic 10→85, Oakmesh 3→45, Port of Oakland 28→1500, AC Transit 4→2100, Oakland Hospital 66→2400, Oakland Unified 24→5200, Baylight Construction 35→450, Fruitvale Clinic 1→38, W Oakland Community Center 44→95, Housing Authority 22→320. Every write guarded on tracked count; zero refusals. `BIZ-00030` deliberately untouched — the only remaining violation in the sheet (62 stated, 97 tracked) and Task 3's to close.

### Task 3: Drain the bucket and the tail — research-build

- **Files:** `data/employer_mapping.json`
- **Steps:**
  1. Re-scope first: the S334 dry-run showed the current config produces `BIZ-00030` at exactly 62, its stated count, while the ledger holds 97. So the overage is accumulated drift, **not** the `Professional`/`2041-Specific` category defaults I originally blamed. Confirm that before editing `categoryDefaults`.
  2. For the remaining `unmatched` (283 at last dry-run), add keyword rules that generalise. Rules, never per-citizen edits.
  3. A citizen with no plausible tracked employer stays blank. Blank is honest; the bucket is not.
- **Verify:** `--dry-run` shows `unmatched` under 60 and `BIZ-00030` at or under its stated headcount
- **Status:** [ ] not started

### Task 4: The write-back consumer — engine-sheet (Fable)

**The complex one. The signal exists; this closes the edge.**

- **Files:**
  - `phase05-citizens/runCareerEngine.js` — read (it already emits the signal)
  - `phase06-analysis/economicRippleEngine.js` — read (existing consumer, narrative only)
  - the new consumer — location is engine-sheet's call, but it must respect the Phase-10 write-intent rule
- **Steps:**
  1. Consume `careerSignals.businessDeltas` / `.layoffs` and move `Business_Ledger.Employee_Count` accordingly — growth hires, contraction sheds.
  2. Apply Mike's reconciliation rule: when stated headcount falls below the tracked count, the difference becomes **firings among tracked citizens at that business**. 100 → 90 with 93 tracked = 3 fired.
  3. Each firing writes a `LifeHistory` entry and moves the citizen's dials. A fired citizen's `EmployerBizId` clears only as the *result* of a recorded event — never as a bare cell edit (research §hazards).
  4. Selection of who gets fired must be deterministic via `ctx.rng`, never `Math.random()`, and should prefer a defensible signal (tenure, career stage) over pure chance.
  5. Writes route through `ctx.writeIntents` unless the consumer sits after Phase 10, in which case direct writes are the documented carve-out — check where it lands before choosing.
- **Verify:** a bench cycle where a business contracts produces N firings, N `LifeHistory` entries, and a headcount that still exceeds the remaining tracked count
- **Status:** [ ] not started

### Task 5: Born into a tracked job, and the age-18 ladder — engine-sheet (Fable)

- **Files:**
  - `Generic_Citizens` — schema add
  - `phase05-citizens/processAdvancementIntake.js` — modify (`checkEmergencePromotions_`)
  - `phase05-citizens/educationCareerEngine.js` — modify
- **Steps:**
  1. Add `EmployerBizId` to `Generic_Citizens`. Today the pool carries `Occupation` with no workplace, so a promoted citizen arrives with a job title and nowhere to work.
  2. On promotion (GC → SL at `EmergenceCount ≥ 3`), the citizen must arrive with a tracked employer consistent with their `Occupation`. Mike's constraint: **no citizen is ever born into a business we don't track.**
  3. Age-18 transition: a citizen reaching 18 takes a tracked job, or is explicitly recorded as not-employed with a reason. Silence is not an outcome.
  4. Both paths must respect rule 1 — a hire that pushes tracked past stated is illegal; either the business has room or the citizen goes elsewhere.
- **Verify:** a bench promotion arrives with a valid `EmployerBizId`; a bench 18th birthday either employs the citizen at a tracked business or records why not
- **Status:** [ ] not started

### Task 6: Media-invented business → canon mint (design) — research-build

- **Files:** design only; no code this task
- **Steps:**
  1. Specify the path: an article names a business → the name becomes canon → a `Business_Ledger` row exists that tracked citizens can be employed by. Same pattern as S334's civic establishments (`BIZ-00094`–`00098`).
  2. Specify the **gate**. This is the whole risk: a desk agent hallucinating a name would mint economic canon. Route through the review `docs/canon/INSTITUTIONS.md` governs; a mint is a deliberate act, never a side effect of publication.
  3. Decide who mints — post-publish is the natural seam, but it is media-adjacent and media never builds. Name the executor explicitly.
- **Verify:** the gate is written down and names its executor before any code exists
- **Status:** [ ] not started

---

## Open questions

- [ ] Task 4 step 5 — does the write-back consumer land before or after Phase 10? Determines write-intents vs direct writes. engine-sheet answers from the phase map.
- [ ] Task 5 — is there an existing age-18 hook in `educationCareerEngine`, or does the transition need a new trigger? Blocks step 3's shape, not its intent.

---

## Changelog

- 2026-07-27 — Initial draft (S335). Split by model fit per Mike: Opus 5 takes volume+judgment, Fable 5 takes the engine internals.
