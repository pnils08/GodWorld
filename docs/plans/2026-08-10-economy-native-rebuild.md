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

1. **The unmapped-role fallback.** `lib/citizenDerivation.js:42` `FALLBACK_INCOME = 60000` — `lookupIncome(roleType)` returns it for any RoleType not in `economic_parameters.json`. Nineteen Active citizens sit at exactly $60,000: the C110/C111 service mints (line cook, server, barista, delivery driver, taxi driver, bakery worker, warehouse worker, security guard, hair stylist, QA tester, IT support technician, EV mechanic, youth mentor, fleet dispatcher, vertical farm technician — POP-01085…01203) with CareerStage drawn independently of the pay (a line cook "senior" at $60k, a QA tester "mid-career" at $60k). The mint already tries the right things in order (`processAdvancementIntake.js:878–894`): hood reference pay `jobReferencePay_` (by role band, then field/sector category — `generationalWealthEngine.js:959`), then the salary-pool contains-match `rederiveIncomeForRole_` (engine.51 T5). For "Line cook", "Barista", "QA tester" and the rest both return null, `intakePay` stays null, and the profile's own derived Income stands — `utilities/citizenDerivation.js:79` `FALLBACK_INCOME_ = 60000`, written silently. **Fix shape (es):** when both paths return null, band the title by Tier and sector (the pay table's category bands already exist) instead of the flat constant, and log one Engine_Error naming the unmapped title so the 272 get mapped over time; the stage draw should read the pay band it landed in. Not a sweep of the 19 — D2/D3 say a correction reaches them as a lived event (a raise or a re-grade), or not at all.
2. **The owner door's pay scale.** Business owners minted through engine.96 Task 12 (`wireBusinessOwners_`) carry incomes of $8.1M–$83.7M with NetWorth ≈ 2× income: POP-01092 Managing Partner, Coastline Construction $83,652,927; 01093 Anchor Build $65.9M; 01094 Foothill Builders $43.6M; 01095 Northgate Construction $35.6M; 01096 Principal, Oakland Tech Collective $26.9M; 01097 Pacific Standard Architecture $18.8M; 01098 Ridgeline Studio $12.9M; 01099 Coliseum District Development $8.1M; the two founders (01109 Oakmesh $1.5M, 01110 Portside Bio $2.4M). Where the number comes from is not yet read (the owner-door code names no income; hunt for es: the business's revenue or valuation flowing into Income at mint). Whether a managing partner should earn the firm is a sim call — §6 line filed 2026-10-16. **es hunt (2026-10-16):** not the mint — `applyOwnerDraw_` (`phase05-citizens/generationalWealthEngine.js:1185`, engine.96 T10, every cycle from Step 1.5) sets an off-heritage Tier 3–4 owner's Income := max(0, profit × `OWNER_DRAW_SHARE` 0.5 ÷ owners), profit = `businessProfit_` = Annual_Revenue − Employee_Count × Avg_Salary (no non-payroll cost). Live check, all ten firms: ledger Income = ½ × (rev − payroll) within the week's revenue drift (Coastline BIZ-00056 rev 186,225,770, 221 × 85,000 → profit 167,440,770 → draw 83,720,385; ledger 83,652,927). NetWorth ≈ profit. Margins on the ten: 33% (Oakmesh) to 90% (Coastline). Dials if the builder rules a scale: the share, and a cost term in `businessProfit_`.

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

## Changelog

- 2026-08-10 — Written S364 from the live-session audit; awaiting S362 vet.
- 2026-08-10 — Restored after repo deletion (original uncommitted copy lost).
- 2026-08-18 — S380: codex vet verdict transcribed from terminal scrollback (engine-sheet); plan needs revision before engine.104 moves.
- 2026-08-22 — codex re-ran the S362 vet: still NOT safe for in-progress, same blocker classes (eventless citizen mutations, runtime sheet create/delete, safePhaseCall_ swallows fatal errors, D1 before D2, no event idempotency, stale C103 audit). engine.104 stays `ready`.
- 2026-10-16 — rb overnight read: audit refreshed from the C111 snapshot; two live birth defects named (flat $60k fallback for unmapped roles; owner-door incomes $8–84M); D4 CareerStage half found done; fix shape for the fallback handed to es (engine.293).
