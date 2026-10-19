---
title: Codex fourth review — engine.299 Task 1
created: 2026-10-18
updated: 2026-10-18
type: reference
tags: [engine, citizens, research]
sources:
  - commit 2854dc10a20103ce7acad8e9ea44ab4eafce863e
  - commit f709fe4d54fc50b265ce26dfd2887aee55ad0294
  - docs/for-claude-review/2026-10-18-codex-engine299-task1-diff-review-3.md
pointers:
  - "[[plans/2026-10-18-event-engines-move-dials]]"
---

# SHIP — scoped Task 1 code; review-3 blockers closed

Reviewed both named commits with git show. HEAD was f709fe4d; the generator, resolver and writer test had no working-tree changes against it. Runtime remains 2854dc10; f709fe4d repairs the test fixture. Scope is the resolver plus generateCitizensEvents, per the plan Task 1 row (:58); other emitters remain Tasks 3–4. Historical bare kinds remain inert. This verdict supersedes review 3's remaining Hunt 6 FIX.

## Hunt 1 — SHIP: history stays inert; new lines grade or skip

No resolver change in these two commits. `utilities/citizenDialMap.js:303-367` retains graded parsing; the writer carries primaryTag into both cell and log (`phase05-citizens/generateCitizensEvents.js:3629-3653`). The current writer test passes historical-empty-kind and no-new-inert-line assertions (`scripts/engine299Graded.test.js:68-76`). This does not authorize retagging existing history.

## Hunt 2 — SHIP: R3.1 and R3.2 closed

- **R3.1:** `generateCitizensEvents.js:1105-1128` has no hood-band argument or fallback. Patrol entries carry explicit signs at `:1475-1480`. Current T7b observes **16** “felt watched but not necessarily safer” lines at q=0.8, **all Down**, zero non-Down.
- **R3.2:** QoL entries receive the bank's direction and their cause's dial before selection (`:1456-1468`). Current T7c at q=0.4 observes **17 QoL lines, all Down, zero source:qol skips**. The moderate-low path no longer disappears.
- **Unsigned source boundary:** an independently extracted current gradedTagFor_ returns an empty grade for `['source:qol']`, `['source:qol','qol:high']` and `['source:qol','qol:low']`. Source and ambient QoL do not supply a sign. This checks the resolver directly; the string-pool fixture correctly exercises source:neighborhood, not a nested source:qol object.
- **Unsigned hood line:** T7a writes zero exact synthetic unsigned lines at q=0.2/0.5/0.8, 300 seeds each. Admission remains before bias intents, fame hooks, ripples and context enrichment (`:3538-3556`). No random sign draw or default-up branch was added.

## Hunt 3 — SHIP: readers retain their reviewed behavior

These commits change no tag format or reader. The street correction remains at `scripts/newsroomSourcing.js:12-13,313`, and its test passes. Phase 9's two fold paths remain at `utilities/compressLifeHistory.js:1636,1653`. No new reader regression was found in this cut; review 3's closed consumer findings stay closed.

## Hunt 4 — SHIP: local annotation/fixture changes

The runtime diff removes the external QoL-band rule and adds explicit metadata to existing entries. It adds no RNG draw, engine file or Sheet writer. The inherited write-path qualification from prior reviews is unchanged. Own-fact truth remains in `docs/engine/TAG_REGISTRY.md:49` and `docs/engine/EVENT_SYSTEM_MAP.md:50`; `docs/engine/ENGINE_STUB_MAP.md:1899-1900` records engine299 telemetry. Plan :42 preserves historical bare kinds. No new contract needing another mapping format was introduced.

## Hunt 5 — SHIP: no new owner-engine event

The diff signs existing QoL/patrol text and repairs tests. It adds no divorce, promotion, layoff, marriage, birth, death, hospital or move trigger. Broader pool-premise work remains in the owning plan's later tasks.

## Hunt 6 — SHIP: repaired tests detect the actual regressions

The stub now returns **strings**, scoped to the texture caller (`scripts/engine299Graded.test.js:81-84`), matching the consumer at `generateCitizensEvents.js:2742-2745`. T6 observed **32 source:neighborhood rejections** and zero unsigned writes; its absence assertion is no longer searching for text lost inside an object. T7b/c require positive observations (`test:123-124`). T8 uses the same actual string (`:125-138`): zero matching hooks/ripples, while **93 other hooks and 93 ripples** were observed.

**Negative controls:** ran the current test unchanged except for substituting the generator source read in memory with each historical commit. No repository source was edited.

| Generator supplied to current test | Result | Reproduced failure |
|---|---|---|
| Current 2854dc10 runtime | **12 passed, 0 failed** | All regression cases pass |
| d5266294 | **10 passed, 2 failed** | T7b: 16 patrol lines non-Down, zero Down. T7c: zero QoL lines, 17 QoL skips |
| 11334296 | **8 passed, 4 failed** | T7a: unsigned lines written low=14/mid=0/high=12. T7b: 16 non-Down patrol lines. T8: 2 rejected-text hooks and 2 ripples. T9: calendar/gridlock skips |

Thus the review-3 fixture blocker is closed: the repaired tests fail on both known-broken implementations and pass on the repaired runtime. T6 need not fail on those parents, which already reject a neutral unsigned line; T7a and T8 expose their distinct context/order defects.

Additional local validation: citizenDials **75 passed**, griefPeriod **38 passed**, newsroomSourcing **PASS**; node --check passes for the generator and writer test.

Full offline suite, `GODWORLD_LEDGER_FAILS=0 npm test`: **286/290 files passed**, 148.15 seconds. The same four files reported in review 3 fail: cron-civic-tick (spawnSync node EPERM), fireGuard, ingestEdition and rateEditionCoverage. Log: `/tmp/engine299-review4-tests.log`. This review does **not** reproduce the author's 290/290 result or establish a new full-suite regression. These repeated local-suite failures are separate from the now-closed targeted findings.

## Hunt 7 — SHIP: bounded cleanup

2854dc10 adjusts the existing generator/test and plan/deployment documentation; f709fe4d adjusts the existing test and plan. No engine, ledger, scheduler or replacement system was added.

## Evidence boundary and final gate

Bench 1004 @44 = 2854dc10 firing C112 is **builder-reported**. No @44 receipt or Sheet readback was fetched here; @43's recorded numbers belong to d5266294 and cannot prove @44. Bench/live outcome remains unverified. The required bench and other plan gates remain separate from this code verdict.

**Final: SHIP the scoped Task 1 code. No remaining review-3 FIX.** No claim that all emitters are graded, the full suite is green here, or deployment/live verification is complete. Only this review file was written in the repository; no commit, push, model, cron, bench or canon operation was performed.
