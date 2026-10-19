---
title: Codex third review — engine.299 Task 1
created: 2026-10-18
updated: 2026-10-18
type: reference
tags: [engine, citizens, research]
sources:
  - commit d52662942917edcfea30716eb0674094420c9249
  - commit 2854dc10a20103ce7acad8e9ea44ab4eafce863e
  - docs/for-claude-review/2026-10-18-codex-engine299-task1-diff-review-2.md
pointers:
  - "[[plans/2026-10-18-event-engines-move-dials]]"
---

# FIX — regression-test fixture; QoL runtime findings closed by 2854dc10

**Current verdict, including the builder-requested follow-up `2854dc10`:** R3.1/R3.2 are closed; Hunt 2 is now SHIP for those reviewed runtime fixes. Hunt 6 remains FIX because the test fixture still cannot detect the regressions. The dated addendum below supersedes the original runtime findings and final gate. The original assessment is retained as the evidence trail for `d5266294`.

## Original assessment — d5266294

The ordinary unsigned-line, calendar and admission-order fixes work in independent local probes. The new QoL exception still derives a sign from hood rank for patrol lines and drops genuine moderate-low QoL events. T7/T8 also pass against the broken parent because they retain the wrong-shaped helper stub identified in review 2.

Reviewed `git show d5266294`; HEAD and reviewed runtime files matched that commit. Scope remains the dial resolver plus generateCitizensEvents; other emitters are Tasks 3–4. Historical bare kinds must remain inert. Existing dirty/untracked work was untouched. No commit, push, model, cron, bench, Sheet or canon run; only this review is delivered.

## Hunt 1 — SHIP: historical map and cell/log grade

The resolver is unchanged by this cut (`utilities/citizenDialMap.js:303-367`). Both the cell and log retain primaryTag (`phase05-citizens/generateCitizensEvents.js:3627-3651`), and both Phase 9 fold paths use the same resolver (`utilities/compressLifeHistory.js:1636,1653`). Historical-kind and resolver assertions pass. No historical texture retag is proposed.

## Hunt 2 — FIX: the source:qol exception is not an own-fact rule

**R3.1 — High: patrol text receives opposite signs from hood QoL.** `generateCitizensEvents.js:1114-1115` assigns composure direction whenever tags contain `source:qol`, using the external qolBand argument. The caller derives that argument from nhQoL (`:3544`). But `patrolPoolFor_` also uses `source:qol`, without a QoL-band fact (`:1473-1478`). Consequently the exception's assumption that every such line came from a band-keyed QoL pool is false.

Independent reproduction used the committed synthetic writer harness, empty hood texture, seeds 1–400, and `summary.crimeMetrics.context.city = {patrolStrategy:'suppress_hotspots',hotspotHoods:['Temescal']}` with `byHood.Temescal.qualityOfLifeIndex = q`:

| q | Exact patrol line written | Result |
|---|---:|---|
| 0.2 | 17 | `[QoL-Composure-Down-S] felt watched but not necessarily safer` |
| 0.8 | 16 | `[QoL-Composure-Up-S] felt watched but not necessarily safer` |

The same negative/uneasy observation becomes Up solely because the hood scores high. This violates “a source never decides the sign” and “the line's own fact.” Use a fact carried by the actual entry; do not infer a patrol outcome from source:qol plus neighborhood rank.

**R3.2 — Medium: genuine moderate-low QoL lines now disappear.** The actual QoL pool creates entries with `qol:moderate-low` at q in (0.35, 0.45] (`:1460-1464`). The caller supplies null for that band (`:3544`), while the generic fact scan now discards every `qol:` tag (`:1119`). Therefore these explicitly signed entries resolve to no grade and are skipped.

With the same fixture but **no patrol configuration**, seeds 1–400 at q=0.4 produced **17 source:qol skips and zero QoL lines**. At q=0.2 the corresponding probe produced 20 graded QoL lines and zero skips. Resolve the entry's own low/moderate-low/high/moderate-high tag before context enrichment; give patrol entries their own supported fact or skip them. This closes both defects without a new system.

**Closed portions of review 2:**

- **F1, ordinary neighborhood entries:** a contract-correct string-returning helper, scoped to caller `generateCitizensEvents_`, yielded zero exact `SYNTHETIC unsigned observation` lines at q=0.2/0.5/0.8 across 400 seeds each. Neighborhood rejection counts were 61/64/61. Admission precedes context merging (`:3525-3555`, context at `:3612-3623`); the remaining exception is R3.1 above.
- **F2, named calendar/gridlock pools:** separate 400-seed probes for CreationDay, FirstFriday, Thanksgiving, championship season and gridlock all had zero skips. Observed graded output included 65 CreationDay, 103 FirstFriday, 52 Thanksgiving and 47 championship lines. Gridlock now has its own negative mapping (`:1074`); the calendar/season pools have explicit metadata (`:2249-2280,2749-2776`). No random sign draw was added.
- **F3, bias/hook/ripple ordering:** admission at `:3543-3552` precedes bias intents (`:3568-3571`), FAME_WATCH and its ripple (`:3587-3608`). Repeating the correctly shaped unsigned-entry probe with fameScore 60 for seeds 1–1200 produced **204 neighborhood rejections, zero hooks and zero ripples for that rejected text**. The reproduced runtime defect is closed.

## Hunt 3 — SHIP: tag readers unchanged

The rb street-source correction remains (`scripts/newsroomSourcing.js:12-13,313`); its test passes. This cut introduces no new graded-tag format or reader. Pulse/dedupe retain lineKind (`generateCitizensEvents.js:3667,3672`). No additional active exact-kind reader loss was found in this diff.

## Hunt 4 — SHIP: requested truth-doc corrections

`docs/engine/TAG_REGISTRY.md:49` and `docs/engine/EVENT_SYSTEM_MAP.md:50` now state the own-fact rule without source-sign defaults. Plan `docs/plans/2026-10-18-event-engines-move-dials.md:42` now preserves historical empty kinds. The prior STUB_MAP additions remain. R3.1 is code violating that corrected contract, not a reason to restore the old wording. No new RNG mechanism, direct Sheet writer or engine file was introduced; the inherited write-path exception remains as recorded in review 2.

## Hunt 5 — SHIP: no new owner-engine event

The cut annotates existing calendar/season text and moves admission. It does not add a divorce, promotion, layoff, marriage, birth, death, hospital stay or move trigger.

## Hunt 6 — FIX: T7/T8 do not detect their target regressions

- `scripts/engine299Graded.test.js:81` still returns **objects** from hoodTexturePool_. The consumer wraps each returned item as **text** (`generateCitizensEvents.js:2740-2743`), so the object becomes `[object Object]`; its text/tags/weight are not consumed as entry metadata. T7 and T8 inherit that stub and search for `creative energy shifting` (`test:100,113-115`), text that is absent from the actual carrier.
- **Parent substitution proof:** ran the current test in memory while substituting only the generator source with `git show d5266294^:phase05-citizens/generateCitizensEvents.js`. **T7 and T8 both passed on the known-broken parent.** T9 correctly failed with calendar/gridlock skips; total was 9 passed, 1 failed. No repository code was edited. Thus T9 is a meaningful regression check, while T7/T8 do not reproduce the earlier probes.
- Replace the object stub with a string array for the event-pool caller only; keep venue/institution calls empty. Assert that the target entry actually reaches rejection, then verify exact cell/hook/ripple absence. Require the corrected T7/T8 to fail against the parent. Add q=0.4 and the high-QoL patrol case above. T6 needs the same fixture repair.
- Current focused results: `engine299Graded` **10 passed**, `citizenDials` **75 passed**, `griefPeriod` **38 passed**, `newsroomSourcing` PASS. Both changed JavaScript files passed `node --check`. Independent probes above use string fixtures and the actual generator, with in-memory ripple capture only.
- `GODWORLD_LEDGER_FAILS=0 npm test`: **286/290 files passed**, four failed, 162.25 seconds, offline default. Same four failures as reviews 1–2: `cron-civic-tick.test.js` (spawnSync node EPERM), `fireGuard.test.js` (phase-order subprocess/no slot count), `ingestEdition.test.js` (ingest-loop/rerun assertions), `rateEditionCoverage.test.js` (subprocess-output assertions). No new full-suite failure established; 290/290 was not reproduced here. Log: `/tmp/engine299-review3-tests.log`; no unsandboxed rerun.

## Hunt 7 — SHIP: bounded cleanup

Five existing files changed: generator, writer test, two truth docs and plan. No new engine, ledger or scheduler was added. Remaining fixes are local QoL-tag routing and the existing test fixture.

## Bench evidence boundary and final gate

Bench 1004 @42 numbers are **builder-reported and recorded in the plan** (`:126`): 1,658 lines, 1,136 graded, 139 inert, on pre-fix `11334296`. They were not independently read back in this review. @43 was firing when requested; no @43 outcome is asserted here. Aggregate graded/inert counts do not validate the sign of a patrol line or demonstrate moderate-low coverage.

**Final gate: FIX R3.1/R3.2 and the T6–T8 fixture; then re-review.** Calendar fixes, ordinary unsigned-line rejection, bias/hook/ripple admission order, street-source handling and requested truth-doc corrections are closed. No deploy or live approval is implied.

## Addendum — 2026-10-18, 2854dc10 included in verdict

Read `git show 2854dc10`; HEAD and reviewed generator/test matched it. This addendum is authorized by the builder's request to include that commit in review 3.

- **R3.1 CLOSED / SHIP:** `generateCitizensEvents.js:1105-1124` no longer accepts or reads a hood-band argument. QoL entries carry an explicit dial/sign at construction (`:1456-1468`); patrol entries have explicit signs (`:1475-1480`). Repeating the real-generator patrol probe, 400 seeds per q, produced 17/17/16 “felt watched but not necessarily safer” lines at q=0.2/0.4/0.8, **all Composure-Down-S**, with zero source:qol skips. Extracted-helper probes returned an empty grade for both `['source:qol']` and `['source:qol','qol:high']`; ambient context cannot supply the sign there.
- **R3.2 CLOSED / SHIP:** the same q=0.4 run now emitted **31 negative mood-bank QoL lines** and zero QoL skips. The moderate-low pool carries its bank's explicit down tag through the same constructor as low; the cause-to-dial mapping is local to that pool. No replay or history change is involved.
- **Hunt 6 remains FIX:** `scripts/engine299Graded.test.js:96-99` adds another object to the same wrong-shaped string-pool stub. `generateCitizensEvents.js:2742-2745` wraps each item as text with newly assigned source:neighborhood tags. Thus the nested `source:qol` is NOT handed to the grader; both objects become text objects, and the test searches for prose absent from their string representation. T8 inherits this stub too. The additional object does not repair the defect reported above.
- **Decisive negative control:** ran the current 2854dc10 test with only its generator-source read substituted in memory by `git show d5266294:phase05-citizens/generateCitizensEvents.js`. **All 10 assertions passed on d5266294**, including T7, despite its reproduced QoL defects. Correct the event-pool stub to return strings and scope it by caller; exercise an unsigned source:qol entry through an input path that actually accepts tagged entries, or directly test that resolver boundary. Require the regression cases to fail against the broken implementation. Preserve non-vacuous rejection/selection counts.
- Current focused writer test: **10 passed**; both changed JavaScript files pass `node --check`. The independent runtime probes above passed. The full suite was not rerun for this addendum; the earlier 286/290 local result applies to d5266294, not 2854dc10. The commit's 290/290 remains an author-reported result.
- Bench update: the added plan changelog reports @43 on **d5266294**, with 2,349 lines, 1,801 graded and 82 inert. That is not a bench of 2854dc10. No bench/Sheet receipt was independently fetched here; no deployment or live-state claim follows from the local probes.

**Superseding final gate:** runtime R3.1/R3.2 SHIP; overall **FIX limited to the T6–T8 regression fixture and meaningful negative controls**. The other closed findings stay closed. Review 3 now includes both d5266294 and 2854dc10.
