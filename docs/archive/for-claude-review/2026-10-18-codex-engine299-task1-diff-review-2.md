---
title: Codex re-review — engine.299 Task 1
created: 2026-10-18
updated: 2026-10-18
type: reference
tags: [engine, citizens, research]
sources:
  - commits 6db7b48f, bbe19647, 11334296, fd98763b
  - docs/for-claude-review/2026-10-18-engine299-task1-diff-review-TASK.md
pointers:
  - "[[plans/2026-10-18-event-engines-move-dials]]"
---

# FIX — HOLD Task 1's code approval

The original negative-sentiment fallback and street-source loss are fixed. Three in-scope defects remain: ambient QoL supplies signs to unsigned entries, conditional hardcoded pools still skip, and rejected entries can already have emitted story hooks/ripples. The new writer test does not cover these cases.

Reviewed the three requested commits and rb's `fd98763b` with `git show`; HEAD was `11334296`, and reviewed runtime files matched it. The current request and plan Task 1 (`docs/plans/2026-10-18-event-engines-move-dials.md:58`) supersede the older TASK's scope: other emitters belong to Tasks 3–4 and are NOT blockers here. Historical bare kinds remain intentionally inert. Existing dirty/untracked work was untouched; no commit, push, model, cron, bench, Sheet or canon run. Only this review is delivered.

## Hunt 1 — SHIP: resolver and persisted grade

`utilities/citizenDialMap.js:303-367` still resolves the graded tag before the bare map, retains historical bare effects, and strips grades for kind readers. `generateCitizensEvents.js:3609-3635` retains the grade in both the cell bracket and log tag. Both Phase 9 folds still call `nudgesForEvent_` on the cell tag (`utilities/compressLifeHistory.js:1636,1653`). The 20-history-kind assertion passes. No historical retagging is required or proposed.

## Hunt 2 — FIX: unsigned-entry guard and pool coverage

**F1 — High: neighborhood rank still supplies the sign to an unsigned line.**

- `phase05-citizens/generateCitizensEvents.js:3576-3577` adds `qol:low` / `qol:high` to EVERY selected entry. `gradedTagFor_` scans those enriched tags with generic suffix regexes (`:1094-1095,1113-1119`), and the guard passes that enriched array (`:3599`). These are citizen/hood context tags, not the selected line's signed fact.
- Reproduction: reused the committed writer harness's `ctxFor` and real generator, with a correctly shaped string-returning hood helper for caller `generateCitizensEvents_` only. The single synthetic entry was `SYNTHETIC unsigned observation`; no fact/dial tag. Set `summary.crimeMetrics.context = {city:{},byHood:{Temescal:{qualityOfLifeIndex:q}}}` and ran seeds 1–400 separately for each q.

| QoL | Exact unsigned line written | Example |
|---|---:|---|
| 0.2 | 17 | `[Neighborhood-Outabout-Down-S] SYNTHETIC unsigned observation` |
| 0.5 | 0 | Rejected; 96 total noDial skips across the harness's pools. |
| 0.8 | 14 | `[Neighborhood-Outabout-Up-S] SYNTHETIC unsigned observation` |

- The same unsigned observation acquires opposite effects solely from hood QoL. This contradicts the claimed unsigned-entry rejection and reintroduces rank-driven texture grading. Restrict grading to the entry's own signed facts; keep generic context annotations out of sign inference. A genuine `source:qol` entry can still carry its own fact.

**F2 — Medium: “every hardcoded pool is signed / nothing skips” is false outside the test's one scenario.**

- FirstFriday and CreationDay are still built with source-only tags (`generateCitizensEvents.js:2257-2266`); holiday strings are wrapped with only source/calendar tags (`:2245-2255,2742-2745`). Gridlock's hardcoded line carries `evening:traffic`, which has no directional mapping (`:1600-1604` versus `:1053-1074`). These are inside the re-scoped writer, not other emitters or unfinished ECL authoring.
- With the committed fixture unchanged except the named summary field, real-generator seeds 1–400 produced **111 `source:firstFriday` skips** for `isFirstFriday:true`, **57 `source:holiday` skips** for `holiday:'Thanksgiving'`, and **16 `source:prevEvening` skips** for `previousEvening:{eveningTraffic:'gridlock'}`. These probes used neutral QoL; no external inputs or writes.
- Skipping an unsigned line is correct guard behavior, but it disproves the claimed hardcoded-pool completion. Supply supported per-line facts for the remaining in-scope pools, or explicitly revise the completion claim; do not restore a source-wide sign default.

**F3 — High: rejected events have already created observable downstream effects.**

- The guard rejects at `generateCitizensEvents.js:3598-3607`, AFTER bias intents (`:3526-3529`), FAME_WATCH hooks (`:3545-3550`) and `recordRipple_` (`:3554-3566`). Thus “not written” does not mean the event failed admission before its consequences.
- Local reproduction: the same unsigned string helper, neutral QoL, the committed synthetic citizen fixture, `culturalStatusByPop_` returning fameScore 60, and an in-memory `recordRipple_` capture. **Seed 126** produced `noDialBySource['source:neighborhood']=1`, no matching LifeHistory line, but **one FAME_WATCH hook and one fame-event ripple** for `SYNTHETIC unsigned observation`. Seed 1100 independently reproduced it. No actual ripple persistence was invoked.
- Validate/grade before event-dependent effects, or buffer those effects until admission. Keep source evidence and downstream consequences aligned. The bias-intent path has the same source-confirmed ordering hazard, though the reproduction above targets fame.

**Closed from review 1:** source maps now hold dial names only (`:1078-1092`); negative sentiment routes Down; absent `nudgesForEvent_` returns true from `kindMovesNothing_` (`:1097-1098`), forcing grade-or-skip. The explicit signs added to human-domain, season and age lines are deterministic, not random sign draws. F1 concerns enrichment after selection, not the old source-default implementation.

## Hunt 3 — SHIP: street-source fix

`scripts/newsroomSourcing.js:12-13,313` classifies with `gradedParts_().kind` while retaining the full original tag in the evidence (`:321`). `newsroomSourcing.test.js:66-73` proves a graded PrevEvening line remains a candidate; the test passed. Pulse/dedupe still receive lineKind (`generateCitizensEvents.js:3651,3656`). No new tag-reader regression found in these follow-up changes; the first review's dead TAG_TRAIT_MAP lookup is not an active blocker.

## Hunt 4 — FIX: remaining truth-doc drift; STUB_MAP fixed

- `docs/engine/ENGINE_STUB_MAP.md:1899-1900,3967-3971` now records S.engine299 and the three graded helpers; reverse indexes were regenerated in `bbe19647`.
- `docs/engine/TAG_REGISTRY.md:49` still says “else the source's default,” and `docs/engine/EVENT_SYSTEM_MAP.md:50` still says dial **and sign** may come from a “source default.” Both contradict the repaired rule. Plan prose `docs/plans/2026-10-18-event-engines-move-dials.md:42` still says DIAL_MAP has no `{}`, despite corrected Task 1 at `:58`. True these statements; do not change the historical map to match stale prose.
- No new Math.random call or RNG mechanism was introduced. The inherited seeded fallback and direct log writer remain (`generateCitizensEvents.js:527-531,3692-3694`); this review does not promote their pre-existing rule/exception mismatch into a newly introduced defect. The new test file is explicitly within this re-review's authorized scope; no new engine file was added.

## Hunt 5 — SHIP: owner-engine events stay out of this cut

The follow-ups attach dial metadata to existing text; they add no divorce, promotion, layoff, marriage, birth, death, hospital stay or move trigger. References to an earlier move or a family memory do not create a new owner-engine event. F3 is an admission-order defect, not a new lifecycle engine.

## Hunt 6 — FIX: passing tests overclaim coverage

- Focused tests passed: `engine299Graded` **7**, `citizenDials` **75**, `griefPeriod` **38**, `contentLedgerCompose` **63**, `unlivedEcho` **8**, `citizensEventsFame.t3` **19** assertions; `newsroomSourcing` PASS. Syntax checks passed for the generator, dial map, new writer test, three re-trued tests and street reader/test.
- T5 runs one Summer adult fixture with only sentiment varied (`scripts/engine299Graded.test.js:37-43,57-77`), while stubbing hood pools empty (`:27`). It never activates the calendar, gridlock or QoL cases above. “800 runs” is seed coverage, not every-pool coverage.
- T6's helper returns **entry objects** (`:81`), but the real consumer expects **strings** and wraps each one in makeEntry (`generateCitizensEvents.js:2730-2733`; helper contract `phase01-config/canonNeighborhoodLoader.js:265-278`). Its supplied weight 500 and tags are not used as entry metadata. The prose searched at test `:87` therefore is not the actual emitted text. With that exact stub and QoL 0.8, a local probe emitted **8** lines beginning `[Neighborhood-Outabout-Up-S] [object Object]` across seeds 1–200. Use a contract-correct stub and assert the exact carrier, not absence of text that was never supplied in the expected shape.
- Add negative tests for unsigned entries at low/high QoL, conditional hardcoded pools, and zero hooks/ripples/intents from rejected entries. Preserve the passing historical-bare-kind check. The current tests do not establish the full acceptance invariant.
- `GODWORLD_LEDGER_FAILS=0 npm test`: **286/290 files passed**, four failed, 151.15 seconds, offline default. Same failures as review 1: `cron-civic-tick.test.js` (spawnSync node EPERM), `fireGuard.test.js` (phase-order subprocess/no slot count), `ingestEdition.test.js` (ingest-loop/rerun assertions), `rateEditionCoverage.test.js` (subprocess output assertions). Log: `/tmp/engine299-review2-tests.log`. No new full-suite failure established, but the stated 290/290 was not reproduced in this environment; no unsandboxed rerun performed.

## Hunt 7 — SHIP: bounded scope, no rebuild

The changes remain a graded-tag helper, writer admission/sign metadata, reader normalization, tests and docs in existing systems. Other emitters and unsigned ECL authoring remain Tasks 3–4 as requested; they are not reasons for this FIX.

**Final gate:** FIX F1–F3, correct the test fixture/coverage and stale truth docs, then re-review Task 1. Resolver/history and street-reader findings are closed. Bench, deployed code, Sheets persistence and population effects remain unverified.
