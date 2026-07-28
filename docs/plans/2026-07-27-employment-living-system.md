---
title: Employment Living System Plan
created: 2026-07-27
updated: 2026-07-27
type: plan
tags: [engine, citizens, economy, active]
sources:
  - docs/research/2026-07-27-employment-as-a-living-system.md (research basis)
  - docs/engine/ROLLOUT_PLAN.md — engine.83, engine.84
  - Mike-direct S335 — businesses carry true employment numbers; citizens born into tracked jobs; kids at 18 take these jobs; media-invented businesses become canon; headcount drops fire people
pointers:
  - "[[../engine/ROLLOUT_PLAN]] — parent rollout (engine.83)"
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
  1. ~~Re-scope: the overage is accumulated drift, not the category defaults.~~ **That re-scope was WRONG and is withdrawn (S335).** The count coincidence misled me — 62 was simply the resolver's own tracked count from a prior run, not evidence the config was correct. Measured properly: of the 97 at `BIZ-00030`, only **24 were `Tech & Innovation`**. 51 were `Professional` and 21 `2041-Specific`, i.e. 73 collateral. The category defaults were the problem all along, exactly as first diagnosed.
  2. For the remaining `unmatched` (283 at last dry-run), add keyword rules that generalise. Rules, never per-citizen edits.
  3. A citizen with no plausible tracked employer stays blank. Blank is honest; the bucket is not.
  4. **Settle whether 62 is real before anyone is fired.** `BIZ-00030` reads 62 stated against 97 tracked — 35 over. Mike's read: if 62 is accurate the business must shed 35, that is a major headline, and the displaced get rehired into other tech openings. But 62 was itself produced BY the pre-S334 overwrite (engine.84), so it may be another fossilised sample count rather than a real headcount. **Establish provenance first.** If 62 is real, this is the sim's largest economic event and belongs in print. If it is a fossil, the true number is higher, nobody was ever laid off, and firing 35 citizens would be the sim manufacturing grief from a bookkeeping artifact. The distinction is "the business shrank" versus "our data was wrong", and only the first is a story.
- **Verify:** `--dry-run` shows `unmatched` under 60 and `BIZ-00030` at or under its stated headcount
- **Status:** [x] DONE S335 (bucket drained; tail partially — see the new gap below).
  **The provenance question resolved to "the data was wrong", so NOBODY was fired.** `BIZ-00030` now reads 62 stated / **25 tracked** — 24 `Tech & Innovation` plus one profile-less row — a normal sample relationship. The 35-over was a mis-assignment artifact, not a contraction.
  Config fixed (`employer_mapping.json` v1.3): `Professional` → `SELF_EMPLOYED` (private practice is honest for vets, CPAs, insurance agents, event planners and private-practice attorneys); the `2041-Specific` default **removed** entirely because no one employer fits both a gene-therapy clinician and a drone-fleet manager; 11 per-role keyword rules route the placeable specialists — Digital Twin / Drone Fleet / Autonomous Vehicle → `BIZ-00052` Civis Systems (which literally is the city's digital twin), Gene Therapy → the Hospital, Climate Adaptation → the City, Smart Building → Baylight, Marine Biologist / Vertical Farm → East Bay Regional Parks, Architect → Atlas Bay, Affordable Housing → Housing Authority, Urban Planner → the City. Only `Tech & Innovation` still defaults to `BIZ-00030`.
  Drained by blanking the 72 non-tech occupants and re-running the REAL resolver via `--fill-blanks-only`, deliberately rather than reimplementing the five-layer logic — a second copy would drift. Before-state saved. The resolver then wrote 44, kept 733, and reported **"no business has more tracked citizens than stated employees"** — zero violations across all 99 rows.
  Side benefit: the config now AGREES with the manual civic fixes rather than fighting them. Elena Vásquez resolves to `BIZ-00017` by keyword where she previously resolved back to the bucket.
  **Acceptance criterion 6 is NOT met and should not be forced:** 149 citizens still carry a blank employer, but **119 of them have no economic profile at all** — they cannot be routed by category because they have no career field. That is a different defect (see the new gap) and blank is the honest state for them. Of the rest, 15 are `2041-Specific` specialists with no plausible tracked employer, 14 `Professional`, 1 `Healthcare`.

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
- **Status:** [x] BUILT + bench-proven S336 (engine-sheet) — `runCareerEngine.js` v2.6 tail step `reconcileBusinessHeadcounts_`: deltas move `Employee_Count` via `queueCellIntent_` (Phase 5 → Phase 10 executor, per the answered open question); stated-below-tracked fires the difference (deterministic: lowest `[CareerState]` level → income → POPID; income cut matches the layoff path; `Career-Layoff` LifeHistory rides the existing batch flush; `careerSignals.layoffs`/`businessDeltas` incremented so the Phase-6 MAJOR_LAYOFFS ripple sees it). Blank counts skipped, never invented. Bench 18/18 incl. the plan's exact 90-stated/93-tracked → 3-fired case. **DEPLOYED LIVE S336 (prod @6)** after full bench proof on SANDBOX 0720 (two groundhog C103 fires, deploy @23/@24): round 1 caught a sector-classifier substring collision ('Cloud Infrastructure'→Transit routed a Driver to DigitalOcean); fixed + full live-sector audit; round 2 all green — 7 hires every one verified field-matched, 2 Career-FieldChange, 0 layoffs, 0 post-cycle violations, write-back moving stated headcounts (AC Transit 2100→2101). engine.79's PoolKey sandbox proof closed in the same fire (max draw exactly 40, 101 distinct rows), clearing the shared push gate. Live smoke = next Mike-fired cycle (bench-proof-is-the-gate, S328).

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
- **Status:** [x] BUILT + bench-proven S336 (engine-sheet) — (1) `EmployerBizId` column live on `Generic_Citizens` (col L, SCHEMA_HEADERS regenerated); (2) promotion chain carries it end-to-end: `checkEmergencePromotions_` copies a GC-assigned employer into the intake row, the mint (`processAdvancementRows_`) honors it **capacity-checked** (carried-but-full goes elsewhere — rule 1 binds both paths), else draws capacity-aware from the final RoleType (deterministic seed-hash), else writes "Seeking work (no tracked opening for {role})" into LifeHistory; (3) age-18: extended the EXISTING `settleAdulthood_` hook (engine.60/62, answering the open question) — `buildSettleBizPool_` v2.2 returns per-business stated counts, the draw filters to businesses with room (tracked + same-cycle reservations below stated; blank counts can't prove room and take no hires), and the no-opening case stamps "seeking work (no tracked opening)" on the `[Adulthood]` line. Hires register in `businessDeltas` for the Phase-6 ripple. Bench 16/16 (one-open-slot contention, carried-with-room kept, carried-full rerouted, seeking-work recorded, capacity invariant held).

### Task 6: Media-invented business → canon mint (design) — research-build

- **Files:** design only; no code this task
- **Steps:**
  1. Specify the path: an article names a business → the name becomes canon → a `Business_Ledger` row exists that tracked citizens can be employed by. Same pattern as S334's civic establishments (`BIZ-00094`–`00098`).
  2. Specify the **gate**. This is the whole risk: a desk agent hallucinating a name would mint economic canon. Route through the review `docs/canon/INSTITUTIONS.md` governs; a mint is a deliberate act, never a side effect of publication.
  3. Decide who mints — post-publish is the natural seam, but it is media-adjacent and media never builds. Name the executor explicitly.
- **Verify:** the gate is written down and names its executor before any code exists
- **Status:** [x] DONE S335 — and the design question turned out to be answered already, with a different defect underneath it.
  **THE PATH EXISTS.** `/post-publish` Step 5 runs `scripts/ingestPublishedEntities.js`, which reads the edition's `BUSINESSES NAMED` section and appends new rows to `Business_Ledger`. Media invention already becomes canon.
  **THE GATE EXISTS TOO, so my hazard note was overstated.** I warned that a hallucinating desk agent could mint economic canon. It cannot: the script is `--dry-run` by default and requires `--apply`, and `/post-publish` runs behind the mandatory user approval gate. A desk agent names a business in prose; *publication* mints it, and publication is approved by Mike. The gate is the publish approval, and it is sufficient. No new gate is needed.
  **THE REAL DEFECT IS THE BIRTH, NOT THE GATE.** Line 814: `rowsToAppend.push([bizId, c.name, c.sector, c.neighborhood, '', '', '', '', ''])` — cols A–D filled, E–I blank, documented as intentional at the file header. **Every media-minted business is born economically dead**: no `Employee_Count`, so it cannot hire, fire, or be checked against the tracked sample. That is exactly the 23 rows Task 1 filled by hand (`BIZ-00070+`), and it regenerates as debt on every edition that names a new business.
  Fix specified as Task 8 below. Executor: **engine-sheet** — `scripts/` is substrate, and media never builds.

### Task 8: Mint businesses economically alive — engine-sheet

- **Files:**
  - `scripts/ingestPublishedEntities.js` — modify (the append at ~L814)
  - a sector→scale lookup — location engine-sheet's call
- **Steps:**
  1. The append must populate `Employee_Count`, `Avg_Salary`, `Annual_Revenue` and `Growth_Rate` at mint time. A business born blank cannot participate in the loop Tasks 4 and 7 build.
  2. Scale from `Sector`, which the mint already has. Task 1 established the shape by hand and it generalises: a cafe is ~11 staff / $720k, a retail shop ~4 / $380k, a faith organisation ~5–30 with revenue as contributions, a professional firm ~26–34 / $6–9M. A median-per-sector table is enough; precision is not the point, participation is.
  3. `Employee_Count` must be the REAL headcount for that kind of business, never a tracked count — see the S335 sizing rule in the research. A newly minted business has ZERO tracked citizens, so any positive figure is legal.
  4. Leave `Key_Personnel` blank. It is 84% blank across the sheet and nothing reads it yet.
- **Verify:** mint a business in a dry-run and confirm all four economic columns arrive populated; re-scan `Business_Ledger` for blanks after the next real edition
- **Status:** [x] DONE S336 (engine-sheet) — `economicSeedForSector()` in `ingestPublishedEntities.js`: 9 keyword classes + a small-neighborhood-business fallback (never blank), scales generalising Task 1's hand-filled shapes; `Growth_Rate` in the sheet's percent-integer convention (live range 0–40). Retail ordered before food so "Retail & Food" classifies by kind. `Employee_Count` is a real institutional headcount — a fresh mint has zero tracked citizens, so any positive figure is legal. `Key_Personnel` stays blank by design. Verified against real sheet sector strings; all 5 existing ingest test suites green (62 assertions) + exported for testability.

---

### Task 7: Field-matched rehiring — engine-sheet (Fable)

**Raised by Mike S335 alongside Task 4: a fired citizen should be rehired in their own field, not at random.**

- **Files:** engine-sheet's call; depends on where Task 4's consumer lands
- **Steps:**
  1. The taxonomy already exists — do not build one. `EconomicProfileKey` resolves through `data/economic_parameters.json` (198 roles) to a `category`, 15 of them, plus `economicOutputCategory`. Every employed citizen already sits in a field.
  2. Consider storing the resolved category on the citizen row. Today it is a JSON lookup, so nothing can ask "who works in tech" without the join — which a matcher needs to do cheaply, every cycle.
  3. Build the matcher: a citizen fired by Task 4 is offered same-`category` employers before anything else. Cross-field moves should be possible but rarer, and should read as a career change rather than a shuffle.
  4. **Skill tags are the mechanism Mike wants for this (S335)** — a new multi-valued column, NOT a repurposed `RoleType`. Measured blast radius if `RoleType` were repurposed: `data/role_mapping.json` keys 296 exact RoleType strings to economic profiles across five consumers, and `generateCitizensEvents` stamps `"occupation:" + roleType` into event tags that `loadEventContentLedger` matches exactly. Both break. Detail and the affiliation-vs-capability warning: [[../research/2026-07-27-employment-as-a-living-system]].
  5. **Define "opening".** It cannot be `stated − tracked`: stated is real headcount against a ~1:443 sample, so that subtraction is meaningless. `Growth_Rate` is the most plausible signal — a growing business is hiring, a contracting one is not. Whatever is chosen must be stated explicitly, because every rehire depends on it.
- **Verify:** a bench cycle where a business sheds staff shows the displaced landing at same-field employers, with any cross-field move logged as such
- **Status:** [ ] prerequisites LIVE S336 (engine-sheet): `SkillTags` column on Simulation_Ledger (col BB) — pipe-separated category tags from the 15-field taxonomy, holding BOTH truths (current job's field + trained field; e.g. `The Vulnerable|Healthcare`). Backfilled 740 Active adults. engine.86 closed with it: 158 blank keys stamped (119 exact `role_mapping` + 39 exact profile-name matches, canonical casing; conservative — no fuzzy fills, a wrong profile corrupts income physics); 37 adults stay honestly key-blank (true vocabulary gaps: trades variants like Barista/Janitor/Construction worker + OakTown Echo seats — **role_mapping.json additions are rb config-lane follow-up**) but carry keyword-derived category tags so the matcher can still route them. engine.87 closed as folded — nothing adjudicated. **BUILT + bench-proven S336 second pass (engine-sheet), runCareerEngine v2.7:** the matcher runs before the v2.6 reconciliation (hires grow stated same-cycle; the freshly fired wait a cycle — unemployment is a lived state). **"Opening" defined explicitly (step 5):** perCycle = Employee_Count × Growth_Rate/100 ÷ 52; floor(perCycle) openings, small growers (0<perCycle<1) hire 1 every clamp(round(1/perCycle),1,52) cycles on a row-phased deterministic cadence. Same-field first (SkillTags must contain the business's category via `sectorCategory_`, vocab-synced to the 15 canonical strings); poorest-first then POPID tie-break, no rng draw. **Cross-field is rare by construction** — only a window with zero same-field candidates AND (cycle+row)%4==0 takes one career-changer, logged as `Career-FieldChange` naming the new field. Sports orgs opted out (Paulson's domain; regex guards against 'S**port**s' substring). Same-field rehire recovers income +5–10%, career change starts flat. Tag stamping at both birth points shipped with it (settlement `settleSkillTag_`, mint via `classifyMintSector_`→category map) so new citizens are matchable from day one. Bench 18/18 (openings math, exclusions incl. untagged/65+/GAME, cross-field gate open+closed, determinism twice-run, write-back growth 2600→2602, both stamps); v2.6 + Task-5 regression benches still green (52 total).

---

## Open questions

- [x] **RESOLVED (S336):** the consumer lands INSIDE `runCareerEngine_` (Phase5-Career) as a v2.6 tail step — before `Phase10-ExecuteIntents`, so writes are `queueCellIntent_` write-intents (precedent: `applyChaosDecay.js` Business_Ledger intents from Phase 5). No new file: the career engine already reads Business_Ledger, owns the layoff mutation semantics, and flushes LifeHistory via `queueBatchAppendIntent_` — FIX-don't-ADD.
- [x] **RESOLVED (S336):** the age-18 hook exists — `settleAdulthood_` (engine.60 T4, Phase5-EducationCareer Step 7) already assigned role/income/econ-key/employer. Task 5 extended it (capacity + explicit seeking-work) rather than adding a trigger.

---

## Changelog

- 2026-07-27 — Initial draft (S335). Split by model fit per Mike: Opus 5 takes volume+judgment, Fable 5 takes the engine internals.
- 2026-07-27 (S336, engine-sheet) — Tasks 4 + 5 BUILT + bench-proven (34 assertions green); both open questions resolved. **Live deploy of the Task 4 reconciliation is gated on Tasks 2–3** — detail in the task statuses.
- 2026-07-27 (S336, engine-sheet, second pass) — Task 4 data gate verified CLEAR (deploy now waits on engine.79 only — see Task 4 status); SkillTags schema live + engine.86/87 closed (detail in Task 7 status).
- 2026-07-27 (S336, engine-sheet, third pass) — Tasks 7 + 8 BUILT: rehire matcher (v2.7) + mint economics; every engine-sheet task in this plan is now built. Deploy of the whole employment set rides the engine.79 gate.
