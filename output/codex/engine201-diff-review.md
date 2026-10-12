---
title: engine.201 adversarial source-diff review
created: 2026-09-13
updated: 2026-09-13
type: reference
tags: [engine, review, codex]
sources:
  - "git diff 50a8538f f4dba779 -- phase01-config phase02-world-state phase04-events phase05-citizens utilities"
  - docs/plans/2026-09-10-inactivity-is-regression.md
---

# engine.201 source review — Codex

**Disposition:** four confirmed correctness findings and one plausible eligibility finding, ranked below. The confirmed probes executed immutable `f4dba779` source in local Node VM contexts with synthetic citizens and in-memory Sheets substitutes. They establish code behavior, not occurrence in LIVE data. No live Cycle, external service, tracked-file edit, or commit was performed.

All source line numbers below refer to **f4dba779**. The review diff contains 12 changed files; none of the named phase01-config, phase02-world-state, or phase04-events paths changes in this range. Unchanged callers were inspected only to establish reachability and consequences.

## 1. P1 — An explicit absent owner POPID can redirect the closure memory to another citizen — CONFIRMED

**Location:** `phase05-citizens/applyBusinessDynamics.js:277`–`278`, called on actual closure at `:457`.

When a Key_Personnel entry supplies a POPID, failure to find that ID falls through to the name index. This treats a different citizen with the same name as the referenced owner. The function comment promises POPID resolution when present, otherwise name resolution; the implementation also substitutes a name when the supplied ID is absent.

**Concrete failure:** a closed business still names an archived/departed owner's POPID. A current ledger citizen shares that person's name. The current citizen receives `RoutineRetrenched` and an openness reduction for a business they did not own.

**Executed:** real `applyBusinessDynamics_` closed a synthetic retail venture with Key_Personnel `POP-99999 (Synthetic Alpha, Owner)`. The ledger contained `POP-99001 / Synthetic Alpha` and another citizen, but no `POP-99999`. Result: `RoutineRetrenched` counts **[1, 0]**. Closure thresholds and the supplied-ID parser both ran; this was not a direct call to the new note helper.

**Repair direction:** a supplied but unresolved POPID should fail closed. Use unique-name resolution only for entries without a POPID. Retain the existing ambiguous-name exclusion.

## 2. P1 — Venture closures write new lived memories to non-Active owners — CONFIRMED

**Location:** `phase05-citizens/applyBusinessDynamics.js:260`–`270`, `:281`–`284`.

The new owner index checks POPID presence but never reads Status. Every resolvable row is eligible for the new LifeHistory line.

**Concrete failure:** a deceased or inactive citizen remains in the Simulation_Ledger until archive, while their business reaches its closure threshold. The engine writes that citizen a new experience of watching the business close. The new tag can subsequently feed the ordinary dial fold.

**Executed:** the same real closure fixture was run separately with owner statuses `Deceased`, `Inactive`, `Hospitalized`, `Critical`, and `Active`. Every run produced **[1, 0]** owner-line counts. The deceased and inactive cases are the clear correctness failures; the other results document that there is no Active gate at all.

**Repair direction:** apply the intended citizen eligibility rule when building/resolving the owner index. At minimum, gone/inactive rows must not acquire a new lived closure event. Decide explicitly whether hospitalized owners remain eligible instead of inheriting eligibility from name resolution.

## 3. P1 — A first pressure cause can inherit another cause's adaptation — CONFIRMED

**Location:** `utilities/citizenDialMap.js:425`–`435`, especially `:430`–`432`; unfiltered legacy scan at `:399`–`409`.

Whenever a particular cause has no record, the initializer scans all Friction/Strain/Stumble history. It does this even when DialState already has modern pressure records for other causes. The supposed legacy fallback therefore manufactures a consecutive run for a genuinely new cause.

**Concrete failure:** a citizen has six overworked Cycles and then experiences their first rent breach. Rent is treated as already adapted, so neither the first Friction line nor its new outabout consequence fires. Independent slots do not prevent this: the contamination occurs in run initialization, across Cycles.

**Executed:** called real `emitPressureTag_` for overwork in C101–C106, carrying the same row's DialState through fresh Cycle summaries. First rent call in C107 returned **null**, leaving:

```json
{"overwork":{"n":6,"l":106},"rent":{"n":7,"l":107}}
```

There was no earlier rent call or rent text. This is a modern-state case, not an unavoidable ambiguity in pre-migration history.

**Repair direction:** distinguish an uninitialized legacy pressure envelope from an absent cause in an initialized envelope. Seed legacy runs using attributable cause text where available; a known-new cause must start at its first breach. Preserve adaptation across that cause's own silent calls.

## 4. P2 — Normal compression erases the career evidence required to sustain unemployment pressure — CONFIRMED

**Location:** `phase05-citizens/runCareerEngine.js:208`–`213`, consumed at `:1358`. Existing raw-window trim is `utilities/compressLifeHistory.js:634`–`635`.

The positive-income exception depends on finding the latest bracketed career-move tag in the current LifeHistory string. Compression keeps 20 raw entries. Once the layoff moves into the compressed summary, the regex no longer recognizes it. No hire or other recovery is required to switch the citizen back to the positive-income exclusion.

**Concrete failure:** an unemployed citizen still receives residual income after a layoff. Routine memories push the career line out of the raw window. Their unemployment pressure stops even though their employer remains blank and their economic state did not recover.

**Executed:** through the real W1 career fixture, used a C187 layoff, 25 later ordinary lines, blank employer, and income 60000. Ran `runCareerEngine_` on the untrimmed row, then on its real `compressLifeHistory_` output. Unemployment pressure count changed **1 → 0**. Employer remained **""**, income remained **60000**. A separate direct probe showed the layoff word surviving in the compressed summary while `latestCareerMoveIsLayoff_` changed **true → false**.

**Related risk — PLAUSIBLE:** `noteRetrenchAfterFieldChange_` at `runCareerEngine.js:193`–`200` similarly needs the raw stamped move. A field change can leave the 20-entry window before its 13-Cycle retrenchment window ends. The unemployment failure above was executed; the corresponding field-change/layoff sequence was not separately run.

**Repair direction:** preserve the latest career move and its Cycle independently of the disposable raw-history window, or protect the latest necessary career record during trimming. Do not infer a recovery merely from missing raw text.

## 5. P2 — The new GC activity tag inherits an Inactive-citizen eligibility hole — PLAUSIBLE

**Location:** new retag at `phase05-citizens/generateCitizensEvents.js:3154`–`3157`; existing eligibility filter at `:2111`.

GC excludes deceased, traded, and pending statuses, but not inactive. An otherwise eligible inactive Tier 1–4 citizen in a qualifying hood can therefore receive the newly consequential `ActivityExpanded` tag when GC picks its ordinary Neighborhood line. The neighboring `runNeighborhoodEngine_` path explicitly excludes inactive rows, so the two producers disagree.

**Concrete scenario:** an Inactive ENGINE citizen remains in the ledger, their hood is an unpressured top-quarter hood, and GC selects a Neighborhood entry. The new retag turns that entry into outabout +1 for an inactive citizen.

This is an inherited gate exposed by the new retag, not a newly introduced Status comparison. I traced the source but did **not** execute a complete GC fixture for this case. Retired citizens are intentionally retained by the existing comment and are not the basis of this finding.

## Requested checks that did not produce a new blocking defect

### Shared globals and ES5

- Acorn parsed all **12 changed files as ECMAScript 5**, at both endpoints.
- Compared the **20 newly introduced top-level names** against declarations across **168 deployment-candidate phase/utility JS files**, excluding test and Node-only files. **No collision** involving a new name was found.
- Evaluated those 168 files together in a shared VM context. **No top-level load exception** occurred. This is a local load check, not an Apps Script service integration test.

### DialState rewrites

- The pressure writer's raw JSON update preserved existing base, mood, streak, folded, maneuver/push, chaosExposure, and an unrelated synthetic extension field.
- Actual `compressLifeHistory_` preserved the newly added pressure envelope together with maneuver/push and chaosExposure, and advanced folded from 100 to 107 after a new Promotion.
- Inputs `broken-json`, `null`, and `42` returned null from `pressureRunFromState_` and left the original cell strings unchanged.
- The compressor and chaos writer still use the existing known-field serializer. Arbitrary future extension preservation is not guaranteed by that older contract; no new loss of a currently supported field was reproduced.

### Re-entry and LifeHistory growth

**CONFIRMED, existing limitation:** three rent calls with fresh summaries but the same row and absolute Cycle produced three Friction lines while the persisted run remained `{n:1,l:107}`. The guard at `citizenDialMap.js:427` correctly prevents counter double counting. It does not make the emitter's LifeHistory/log writes idempotent when the summary-level slot cache is recreated.

The ordinary same-context path checks `pressureTagged[popId|slot]` before entering the writer. Fresh-context retry duplication also existed with the old summary-only emitter; it is not presented as a new engine.201 regression. A partial retry before compression can nevertheless amplify that Cycle's dial contribution, so a caller must not interpret the new run guard as write deduplication.

Normal per-Cycle line limits from this diff are structural: four pressure slots per citizen (housing, debt, unemployed, overwork); one bond-shift line per citizen/tag in the summary cache; career lines only on actual moves, with a possible additional retrenchment line; closure lines per resolved owner per newly closed business. The GC/neighborhood changes retag existing lines. Triangle TrustGuarded writes bypass the new bond-shift dedupe helper and retain the older triangle producer's per-rival-pair behavior. No new unbounded retry loop was found.

**CONFIRMED, existing helper limitation:** a folded synthetic Cycle containing seven Promotions nets drive +56. Current value becomes 100 with base 50, mood 56, streak 1. `roomScaled_` at `citizenMemory.js:79` protects against overshoot only for delta magnitude below 50 (the source comment states the limitation); per-Cycle aggregation can exceed that. The baseline also pins on this artificial volume. A LIVE producer combination delivering that volume to one citizen was not established, so this is a conditional remaining no-pins limitation, not a claimed live regression.

### RNG draw counts

- AST comparison found **no added or removed RNG-call counts outside runConductEngine** among `rng`, `roll`, `cRng`, `seedUnit_`, `Math.random`, `safeRand_`, `pickOne`, and `chanceHit` in changed files. New helper bodies contain no random draws.
- Paired baseline/head executions used **1 bond RNG draw** for the same romantic-bond fixture and **2 seeded business draws** for the same closure fixture at both revisions.
- This does not promise identical future random streams after intended state changes alter later eligibility. No live shared-stream replay was run.
- The 108 modified citizenDerivation catalog entries only change notes. The 306-role order and all non-note fields compare equal. No catalog-selection order change was found.

## Reproduction and scope record

The immutable source bundle is `/tmp/engine201-sources.json`; the local audit driver is `/tmp/engine201-review.js`; captured results are `/tmp/engine201-review-results.txt`. Rerun locally with:

```sh
node /tmp/engine201-review.js
```

The driver loads Git-object source captured for `50a8538f` and `f4dba779`, uses the committed synthetic closure/career harness patterns, and never opens an external Sheet. These scratch files are diagnostic conveniences; the findings, scenarios, and observed values above are the durable report. This requested output file is the only repository artifact authored for this review; no tracked index or source was modified.
