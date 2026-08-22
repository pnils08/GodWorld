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

## Changelog

- 2026-08-10 — Written S364 from the live-session audit; awaiting S362 vet.
- 2026-08-10 — Restored after repo deletion (original uncommitted copy lost).
- 2026-08-18 — S380: codex vet verdict transcribed from terminal scrollback (engine-sheet); plan needs revision before engine.104 moves.
