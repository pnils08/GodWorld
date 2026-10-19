---
title: Economy native rebuild — salaries, education, career stage born right
created: 2026-08-10
updated: 2026-08-10
type: plan
tags: [engine, citizens, active]
sources:
  - output/simulation_ledger_snapshot.jsonl (S364 audit, this doc §Audit)
  - data/economic_parameters.json (198 roles)
  - data/role_mapping.json
  - lib/economicLookup.js
  - phase05-citizens/generationalWealthEngine.js (calculateCitizenIncomes_)
  - scripts/linkCitizensToEmployers.js
pointers:
  - "[[../engine/ROLLOUT_PLAN]] — engine.104 row"
  - "[[2026-08-09-wealthlevel-networth-bands]] — the pattern this wave repeats"
  - "[[../SIM_DOCTRINE]] — no real-world imports"
---

# Economy native rebuild (S364, Mike-direct)

**Everything here is gated by S362: kimi or codex vets before any Claude lane
touches code. This doc is the plan, not the work.**

## The doctrines this plan serves (Mike-direct, 2026-08-10 session)

Declared during the S364 session; every task below must satisfy all five.

1. **No sim state changes without a life event.** A citizen's row moves only
   because something happened to them in the world.
2. **No code can fix citizens.** Instruments (formulas, tables, vocab) are
   fixable by engineers; citizen rows are not. Corrections reach citizens as
   lived events or not at all.
3. **Nothing regenerates from scratch.** No re-seeding, no re-rolling of
   existing lives. New citizens enter only as arrivals/births — lives that
   start with an event.
4. **No sheet is ever created (or deleted) by an engine run.** Structure is
   built deliberately at setup; an engine finding structure missing stops
   loudly. (Catches: Hospital_Ledger lazy-create in buildCyclePacket;
   engine.94 self-arm pattern; linkCitizensToEmployers delete-recreate.)
5. **No code ever waits after bench proof** (see MEMORY
   feedback_no-code-ever-waits) — and its complement: nothing unproven
   ships.

## Audit (verified S364, all commands run against live data this session)

- **role_mapping coverage hole:** 461/940 citizens (49%) carry RoleTypes
  absent from `role_mapping.json` — 212 distinct titles incl. case variants
  ("Line cook"/"Line Cook"). Unmapped ⇒ income never derived; fallback
  numbers cluster $28–43K regardless of role.
- **Mapped-but-stale:** of 336 mapped Active working-age citizens, 85 (25%)
  sit below their role's own floor (5× "AI Safety Researcher (Anthropic)"
  at $28–33K vs $320K median; quantum researchers $31K; attorneys $31K).
  Seeded once, never re-derived — the engine's skip-if-nonzero guard
  (calculateCitizenIncomes_, S319) correctly preserves the wrong values.
- **CareerStage vocab fractured:** entry/entry-level, mid/mid-career,
  early/early-career, none, blanks — 10 spellings for ~5 concepts.
- **EducationLevel vocab fractured:** 13 spellings ("hs-diploma" 515 vs
  "high school" 17; elementary/grade-school). Only 2 age-inconsistent rows.
- **Provenance:** the dollar figures are real-world imports (formula comment
  admitted "recalibrated for 2041 Oakland"; role names cite real
  institutions). GodWorld has no native source of salary truth.
- **Not broken:** the engine does NOT churn salaries (fill-only since S319);
  raises flow through career events. The birth/write discipline is the
  defect, not the update discipline.

## Design

### D1 — Controlled role vocabulary (kills the lookup)
RoleType becomes a closed vocabulary: the 198 `economic_parameters.json`
roles (extended as needed — that file is the pay book). At citizen creation
(move-in, intake, any minting path) a title not in the book is a **loud
failure**, not a fallback. `role_mapping.json` retires once no live citizen
carries an unmapped title. Doctrine 3/4-safe: applies at creation only.

### D2 — Native pay book
Replace imported dollar figures with GodWorld-derived bands: anchor to the
sim's own economy (Business_Ledger revenues, rent levels in the ledger,
existing NetWorth distribution) so every range has an in-world paper trail.
Same shape as the v15 WealthLevel bands
([[2026-08-09-wealthlevel-networth-bands]]): GodWorld-native, no import.
Vetting lane tunes against live data.

### D3 — Corrections as lived events (the 400-citizen problem)
Existing citizens with junk pay are NEVER batch-corrected (doctrines 1–3).
Route corrections through the career engine as market-adjustment /
promotion / job-change events, rate-limited per cycle so the city
experiences a raise season, not a lightning strike. A citizen's wrong
salary until their event fires is canon — it was always their story.
Ripple analysis (rent burden, displacement, migration readers of Income)
runs on the bench before the event type ships.

### D4 — Vocab canonicalization (CareerStage, EducationLevel)
One canonical enum each, documented in SCHEMA_HEADERS. Engines read via a
normalizer (case/synonym-tolerant) so no citizen row needs a rewrite —
doctrine-1-safe. New writes emit canonical values only.

### D5 — Loud-failure gates
Any economic derivation that cannot resolve (missing role, missing band,
missing stage) fails the cycle visibly (Engine_Errors row + nonzero diag),
never writes a silent default. Same for missing structure (doctrine 4):
persistHospitalLedger_-class lazy-creates become hard stops once setup
creates the tabs deliberately.

## Execution (phased, each phase bench-proven then deployed same session)

1. **Vet this plan** — kimi/codex review (S362). They may also simply
   execute it as their own lane work.
2. **D4 + D5 first** (smallest blast radius, pure instrument work).
3. **D1 creation-path gate** — move-ins born from the book. Urgent if the
   city repopulates via arrivals.
4. **D2 native bands** — research + tuning on bench.
5. **D3 event-driven correction** — design review with Mike on event
   framing and rate, then bench ripple proof, then live.

## Open decision (Mike's alone)

The 940 Deceased. Restore (Status flip back — data intact) or proceed with
the move-in repopulation. D1–D5 are valid either way: restored citizens
correct via D3 events; new arrivals are born right via D1/D2. The plan does
not touch this decision.

## Read 2026-10-16 (rb, overnight) — refreshed audit, two live birth defects

Codex's revision requirement 7 (refreshed audit figures), from `output/simulation_ledger_snapshot.jsonl` at C111 (1,032 rows; 988 Active / 44 Retired):

- **role_mapping coverage hole is wider:** 545 of 988 Active citizens (55%) carry a RoleType absent from `data/role_mapping.json` — 272 distinct titles (August: 461/940, 212 titles).
- **CareerStage vocab is clean now:** 6 spellings (mid-career 380, senior 355, retired 102, entry-level 84, student 60, early-career 51). D4's CareerStage half is done by whoever landed it; the plan's "10 spellings" is history.
- **EducationLevel:** 12 spellings — the 6 canonical (`hs-diploma` 548, bachelors 204, masters 91, doctorate 59, trade-cert 40, associates 31) plus school stages for minors (High School 16, Elementary 13, Pre-K 9, Middle School 8) and two adult values outside the list (some-college 9, hs-dropout 4). The minors' stages are age truth, not drift; the two adult values are D4's remaining half.
- **Income distribution:** 0 → 81 (students/minors: 46 students, 1 with income), <30k 5, 30–60k 84, exactly 60k 19, 60–100k 368, 100–300k 415, 300k–1M 15, ≥1M 45 (athletes, coaches, the A's and Oaks front office, Elias Varek — roster-owned and authored, as designed).

**Two birth defects live today (the D1 premise holds, and it is concrete):**

1. **The unmapped-role fallback — CORRECTED by es (engine.293, 2026-10-16 ~03:50).** rb's first trace blamed the intake pay chain (`processAdvancementIntake.js:878`); es ran the 19 titles through the real `jobReferencePay_` and it prices 16 of them. The 18 flat-$60k citizens came through the **promotion door** `checkForPromotions_` (16 migration-wave arrivals C107–C111, 2 emergences), which priced by `lookupIncome_` alone — exact catalog hit, else `FALLBACK_INCOME_ 60000` — and POP-01035 is legacy (C102, before the intake chain existed). The 4 BART crew intake mints are not on that path. **Fix LIVE PROD @139 (stage 4h = 4g + `checkForPromotions.js` at `bdcfb5c4`):** the door runs the intake's job rule (stage → `jobReferencePay_` with real years → `lookupIncome_` last), seeded, no rng. Bench 1004, two C112 fires on one live-C111 base (@33 vs @34): the only differences are the 6 wave arrivals' Income (Transit operator 60,000 → 77,900 / 74,900; Server 50,000 → 42,200; Mechanic 80,000 → 78,700 / 64,600; Dishwasher 44,000 → 42,500) and NetWorth by $1–9; LifeHistory, bonds, businesses, World_Config, Engine_Errors identical; persist 635 both. Two deviations from rb's fix shape, both es's call and right: (a) no Tier/sector band when a job has no field — no Tier-only pay band exists, so that would be a new pay rule, not a fallback; such titles (QA tester, Youth mentor) keep 60000 until the title is mapped; (b) no Engine_Error — every readback gates on "0 new Engine_Errors"; the miss is one Logger line and the ledger is the channel (audit query: an arrival at exactly 60000 whose title the catalog and hints cannot place). The 19 on the ledger are untouched (D1/D2: a correction reaches them as a lived event or not at all).
2. **The owner door's pay scale — SOURCE FOUND by es: not the mint.** `applyOwnerDraw_` (`generationalWealthEngine.js:1185`) pays an off-heritage Tier 3–4 owner ½ × (Annual_Revenue − Employee_Count × Avg_Salary) every cycle, with no other cost; the live check matches all ten firms (margins 33–90%; Coastline Construction 90%). Owners at mint: POP-01092 Managing Partner, Coastline Construction $83,652,927; 01093 Anchor Build $65.9M; 01094 Foothill Builders $43.6M; 01095 Northgate Construction $35.6M; 01096 Principal, Oakland Tech Collective $26.9M; 01097 Pacific Standard Architecture $18.8M; 01098 Ridgeline Studio $12.9M; 01099 Coliseum District Development $8.1M; founders 01109 Oakmesh $1.5M, 01110 Portside Bio $2.4M. Whether a partner's draw should be half the firm's gross margin is a sim call — §6 line (rb) + mechanism line (es), 2026-10-16.

**What this does to the plan:** D4 is half done (CareerStage) and small (two adult EducationLevel values). D1 has a named defect with a fix shape that reuses live code. D2 (native pay book) is still the real work and still unvetted. Codex's blockers on eventless mutation paths, runtime sheet create/delete and fatal propagation stand as written and are engine-wide rules, not this plan's build. Next revision step: disposition of the two legacy mutating paths (the linker — see pipeline.68, now needs-info with its own blank-cell plan — and `generationalWealthEngine.js:420`), then the creation-path inventory.

## Codex vet result (2026-08-18, S380 — verdict: NOT ready for in-progress)

Codex (gpt-5.6-sol, high) ran the S362 vet. Verdict: the plan *expresses* all
five doctrines but does not yet *operationally satisfy* them — engine.104
stays `ready` until this plan is revised. No files changed by the vet.

Per-doctrine results:

- **D1 no-state-change-without-event — FAILS as written.** `generationalWealthEngine.js:420` zeroes minors' income / fills unseeded adults without a life event; `scripts/linkCitizensToEmployers.js:385` bulk-writes employer state eventlessly. D3 never explicitly retires these paths.
- **D2 no-code-fixes-citizens — FAILS as written.** The employer linker is a citizen-fixing tool; `processAdvancementIntake.js:631` can rewrite an existing citizen's tier/role/income. No exhaustive rule governs existing mutation paths.
- **D3 nothing-regenerates — PARTIAL.** Linker deletes+rebuilds Employment_Roster every applied run (`linkCitizensToEmployers.js:441`); salary calc has no durable event/idempotency key, so retries can reroll outcomes.
- **D4 no-runtime-sheet-creation — FAILS as written.** Wealth engine adds LineageId + creates Heritage_Ledger mid-cycle (`generationalWealthEngine.js:1276`); error logger lazy-creates Engine_Errors (`godWorldEngine2.js:98`); linker creates/deletes sheets.
- **D5 proven-ships / loud-failure — NOT enforceable yet.** Execution order activates D1 before D2 is proven (plan L105); no bench matrix, pass thresholds, proof artifact, rollback criterion, or fatal-cycle assertion. `godWorldEngine2.js:158` catches-logs-continues, so "fail the cycle" has no fatal propagation mechanism.

Additional blocking findings:

- `economic_parameters.json` embeds real-world institutions (ILWU/Port L3, fictional CA act L36, BART L223, Highland/Kaiser/CNA L333) — D2 must replace provenance, not just dollar figures.
- NetWorth-as-native-anchor launders imported thresholds (`economicLookup.js:99`, wealth-engine hardcoded bands L58).
- `role_mapping.json` has lossy mappings (Mayor→City Council Aide, Orthodontist→Dental Hygienist, Pharmacist→Pharmacy Technician, L160); no event-driven route defined for its retirement condition.
- Creation paths are not inventoried behind one gate: advancement intake mints independently (`processAdvancementIntake.js:660`); adulthood settlement assigns role/income/profile separately (`educationCareerEngine.js:784`).
- S364 audit figures stale: C103 snapshot is 961 citizens (861 active / 49 traded / 46 retired / 4 deceased / 1 injured); 489 unmapped rows across 235 distinct titles (not 461/212). The "940 Deceased" open decision no longer describes current state.

Revision requirements before in-progress: explicit disposition of the two
mutating legacy paths; complete creation/mutation-path inventory; event
idempotency; setup manifest for every sheet/header; fatal error propagation;
D2 proof before D1 activation; refreshed audit figures.

## Status log

### engine.104 — status (drained from ROLLOUT, 2026-10-19 / S580)

Mint economy: arrivals born right. Mint paths take job titles from lists outside the Economic_Parameters job table — the generic-citizen generator's own 32 titles (15 not in the table), the intake fallback pool (22 of 65), adulthood settlement; 453/988 Active RoleTypes are not in the table, 43 of them students (the 545 was against role_mapping.json). Revision still owes legacy mutating-path disposition + D2 proof (agy 2026-10-17)

## Changelog

- 2026-08-10 — Written S364 from the live-session audit; awaiting S362 vet.
- 2026-08-10 — Restored after repo deletion (original uncommitted copy lost).
- 2026-08-18 — S380: codex vet verdict transcribed from terminal scrollback (engine-sheet); plan needs revision before engine.104 moves.
- 2026-08-22 — codex re-ran the S362 vet: still NOT safe for in-progress, same blocker classes (eventless citizen mutations, runtime sheet create/delete, safePhaseCall_ swallows fatal errors, D1 before D2, no event idempotency, stale C103 audit). engine.104 stays `ready`.
- 2026-10-16 — rb overnight read: audit refreshed from the C111 snapshot; two live birth defects named (flat $60k fallback for unmapped roles; owner-door incomes $8–84M); D4 CareerStage half found done; fix shape for the fallback handed to es (engine.293).
- 2026-10-16 — es corrected the trace: the $60k arrivals came through the promotion door (`checkForPromotions_`), fixed LIVE PROD @139 (stage 4h, `bdcfb5c4`); owner pay = `applyOwnerDraw_` ½ × gross margin per cycle, builder's call.
- 2026-10-16 — builder: "we should scale or revisit how owners payout work" → **engine.295** (es): cost model under profit + draw cap at a multiple of the seat's reference pay + a read of the mint firms' revenue scale; bench numbers to the builder before PROD.
