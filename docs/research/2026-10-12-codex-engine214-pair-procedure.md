---
title: Codex review of the engine.214 paired-step procedure
created: 2026-10-12
updated: 2026-10-12
type: reference
tags: [engine, infrastructure, research]
sources:
  - docs/archive/for-claude-review/2026-10-12-engine214-pair-procedure-review-TASK.md
  - docs/reference/DEPLOY.md
  - output/engine-sheet/stage4.sha256
  - output/engine-sheet/stage5-e214.sha256
pointers:
  - "[[reference/DEPLOY]] — reviewed six-step pair"
---

# engine.214 pair procedure — Codex review

**Overall: HOLD the procedure as written.** Restore and read back the bench guard before either clear, reconcile the actual checkpoint generation, verify deployment identity, and establish identical reset inputs. The new result must be declared as a C112 stage-4/stage-5 contrast on live-C111 state, not a remeasurement of the old C111 −0.10 step.

Scope: only the six-step paragraph at `docs/reference/DEPLOY.md:59`. No engine implementation review or change. The task's post-sync C111/.017/60 readback is supplied evidence, not a fresh read by Codex. No network calls, Sheets reads/writes, fires, deployment operations, or commits were performed.

## Evidence boundary

Checkout reviewed at `838875ed`; the initial tree was eight commits ahead of origin with substantial pre-existing generated-output dirt. It was left intact.

Local package proof: all **168/168 hashes** matched each recorded manifest against these retained staging directories:

- **A** = `/tmp/claude-0/-root-GodWorld/f7641f01-8734-4610-ad47-e4d3c34acc81/scratchpad/stage4/bench`.
- **B** = `/tmp/claude-0/-root-GodWorld/f7641f01-8734-4610-ad47-e4d3c34acc81/scratchpad/stage5`.

`A/<path>:line` below means that exact local package. B's cited engine files match the checkout; ordinary repository citations below therefore also describe the verified B package. The packages differ in exactly the seven files named by the pointer. Hashes establish local package identity, not the current remote deployment/version mapping.

## Six verdicts

1. **HOLD / unresolved actual carry values:** C114-stamped carry is rejected for C112 by both packages, but sync alone does not prove that every property is correctly stamped or that the copied ring supplies C111; unstamped and older properties remain trusted (`phase01-config/loadPreviousEvening.js:159–186`; `A/phase01-config/loadPreviousEvening.js:159–186`). Inventory and required reads below.
2. **FIX / high:** `clearfire cycle=114` is correct for the stated last admission, not 111; after A the value is 112. Both clear actions first require guard 0, and `clearcheckpoint force=1` alone is insufficient for a manifest with a generation (`utilities/webTrigger.js:111–155`). Checkpoint clearing is conditional, not proof of a checkpoint having existed.
3. **PASS command semantics / unresolved remote target:** explicit `-i <actual web-app deployment ID> -V 23` or `24` updates that deployment in the configured script project; the staging `.clasp.json` alone cannot select the web app. Verify the full ID and entry-point URL from the 1004 project's deployment listing and read back the selected version (`/usr/lib/node_modules/@google/clasp/build/src/commands/create-deployment.js:19–35`; `/usr/lib/node_modules/@google/clasp/build/src/core/project.js:305–348`).
4. **FIX / high; unresolved installed automation:** set and verify `fireGuardMinutes=0` after **each** sync, before the clears. Audit checkpoint controls and surviving bench triggers/aim; syncing cell values neither imports live triggers nor removes existing bench triggers (`scripts/syncSandboxFromLive.js:55–75`, `:117–133`; `phase10-persistence/cycleCheckpoint.js:287–295`, `:384–397`; `utilities/utilityFunctions.js:204–248`).
5. **PASS seed mechanism / FIX attribution wording:** no clock-seeded draw was found on the reviewed fire path; CityEvents explicitly uses the injected RNG, initialized from Cycle 112. A Date-seeded CityEvents explanation is contradicted by code. Equal seeds do not alone prove that a particular event-name difference came from only one changed term (`utilities/cycleModes.js:186–198`; `phase04-events/buildCityEvents.js:46–50`, `:489–496`, `:579–611`).
6. **FIX / high for the declaration:** the new pair can compare A with B on a common C111 baseline, but is not numerically interchangeable with the original C110→C111 experiment. The changed Cycle/seed/calendar, .017 home-loss setting, business population, carry history, and package contrast must accompany the result; both resets must use demonstrably identical inputs (`utilities/cycleModes.js:186–195`; `phase01-config/advanceSimulationCalendar.js:47–85`; `phase05-citizens/generationalWealthEngine.js:2223–2247`; `scripts/syncSandboxFromLive.js:63–75`).

## 1. Surviving stores and contamination

For **every carry key in the following table**, the writer also writes the script property **`<key>_CYCLE`**. These are separate properties, not fields inferred from the JSON. The common saver writes both, deletes both on a property-size failure, and always attempts the sheet mirror (`phase01-config/loadPreviousEvening.js:125–141`). Thus these are the complete reachable carry write sites, not proof that every optional write succeeded during C114.

| Property, plus its `_CYCLE` sibling | C114 B writer | Run-A reader | Does C114 contaminate A? |
|---|---|---|---|
| `PREV_EVENING_JSON` | `phase09-digest/finalizeCycleState.js:424` | `A/phase01-config/loadPreviousEvening.js:239` | No if stamped 114: rejected; recover copied ring. |
| `PREV_CYCLE_STATE_JSON` | `phase09-digest/finalizeCycleState.js:504` | `A/phase01-config/loadPreviousEvening.js:276` | Same; carries the broad prior-world snapshot. |
| `PREV_HOOD_ECON_JSON` | `phase09-digest/finalizeCycleState.js:508–511` | `A/phase01-config/loadPreviousEvening.js:334` | Same; optional writer/reader, so verify presence. |
| `PREV_ACTIVITY_OBS_JSON` | `phase09-digest/finalizeCycleState.js:516–519` | `A/phase01-config/loadPreviousEvening.js:398` | Same; affects relative activity baselines. |
| `PREV_RELOC_FLOW_JSON` | `phase09-digest/finalizeCycleState.js:544–546` | `A/phase01-config/loadPreviousEvening.js:425` | Same; carried movers affect demographics. |
| `PREV_FRANCHISE_WEIGHT_JSON` | `phase09-digest/finalizeCycleState.js:551–555` | `A/phase01-config/loadPreviousEvening.js:365` | Same; save is conditional on usable drift output. |
| `PREV_CITY_DYN_JSON` | `phase09-digest/finalizeCycleState.js:559–562` | `A/phase01-config/loadPreviousEvening.js:452` | Same; carries city momentum. |
| `CHAOS_NBHD_FOLD_JSON` | `phase04-events/chaosCarsEngine.js:592–602`, `:642` | `phase04-events/chaosCarsEngine.js:576–588`, `:609` (identical in A) | Same; real fire routes through the guarded loader, not the direct-property test fallback. |
| `PREV_STORY_SEEDS_JSON` | `phase09-digest/finalizeCycleState.js:525–528` | **None in A** | Cannot affect A. B reads it at `phase01-config/loadPreviousEvening.js:399`. |
| `PREV_CONTRACT_SEEDS_JSON` | `phase09-digest/finalizeCycleState.js:533–536` | **None in A** | Cannot affect A. B reads it at `phase01-config/loadPreviousEvening.js:401`. |

The eighth A-readable carry pair plus the seven preceding pairs are **16 properties**, with **four additional B-only seed properties**. A does not rewrite the seed pairs, so they can remain stamped C114 until B. B rejects them for C112 too. If live's ring has no eligible seed list, B starts without that list; first adoption is explicitly allowed, whereas an established missing list logs a fault (`phase01-config/loadPreviousEvening.js:415–439`). Record which happened, rather than expecting a carried-seed effect on the first B fire.

**`FIRE_ADMISSION_JSON`** is the other C114-written property read by A: admission writes it, close records `done`, and a prior Cycle beyond the sheet counter refuses a fresh fire (`phase01-config/godWorldEngine2.js:300–323`, `:343–345`, `:437–438`). This is a blocker, not a hidden numerical carry. The retained C114 response reports `state: done`, Cycle 114, zero persistence errors (`output/engine-sheet/2026-10-11-stage5-e214-bench-c114-@24.json:1–10`). It does not expose all final property writes.

**Other non-sheet state:** checkpointing can create an installed `resumeWorldCycle` trigger; it survives a cell sync and can execute independently (`phase10-persistence/cycleCheckpoint.js:323–338`, `:384–397`, `:547`). The recorded `done` C114 run supplies no evidence that this branch armed a trigger, but does not inventory older triggers. No persistent CacheService, user-property, or document-property write/read carrier was found in either package. `ctx`, sheet-cache queues, RNG closures, diagnostic arrays, and script locks are invocation state, not a durable C114 input. Exported Drive artifacts and logs have no read-back edge into the reviewed fire path. `_CycleCheckpoint` and `Carry_Forward_Store` are **sheet stores**, considered separately below.

Existing `SIM_SSID`, `ALLOW_CROSS_TARGET`, `CARRY_FORWARD_COLD_START_OK`, the fire override, and the trigger token are configuration/control properties, **not properties written by a successful C114 fire**. They are not reset by sync. In particular a cold-start override bypasses the carry assertion (`phase01-config/loadPreviousEvening.js:205–219`); it is not a substitute for reset proof.

**Read that settles hunt 1:** a restricted, non-secret read of the named carry blobs/stamps and fire record, plus typed `Carry_Forward_Store` rows. Verify the chosen blob is C111, valid JSON, and the intended copied value. The generic loader accepts any stamp below 112, trusts missing stamps, and picks the newest eligible ring row rather than requiring C111 (`phase01-config/loadPreviousEvening.js:95–109`, `:165–185`). Two required blobs gate presence; optional carriers can quietly be absent. A's C112 properties must similarly be rejected after the reset before B. Do not dump all script properties or tokens. The current web property whitelist does not expose all these keys/stamps (`utilities/webTrigger.js:95–100`).

## 2. Reset and checkpoint order

With the stated C114 admission and sheet counter 111, the correct first clear is **114**. Supplying 111 is refused before deletion. Set/read back guard 0 **first**, otherwise even the correct 114 is refused. Repeat that bench override after the second sync, then reconcile admission 112.

`clearcheckpoint` reads `_CycleCheckpoint!A1`. If absent/blank, it succeeds and deletes resume triggers without needing `force`. If a manifest exists, supply its exact `gen`; `force=1` is additionally required for `ready`/`resuming`. A committed manifest does not itself require force. See `utilities/webTrigger.js:122–127` and `phase10-persistence/cycleCheckpoint.js:222–230`.

The sync overwrites only live-listed grid tabs and leaves bench-only tabs untouched (`scripts/syncSandboxFromLive.js:55–61`, `:117–131`). Therefore neither “84/84” nor a completed fire proves `_CycleCheckpoint` is empty: it may have been copied from live or left bench-only. A held manifest is routed **before the ordinary fire guard** (`phase01-config/godWorldEngine2.js:281–288`); a matching ready checkpoint can resume its old payload instead of running the selected engine afresh (`phase10-persistence/cycleCheckpoint.js:408–422`).

**Unresolved:** whether any checkpoint/trigger actually remains after this sync. Read A1 (and payload if held), plus the installed resume-trigger inventory. Keep explicit cleanup in the corrected procedure, but make it state-aware; do not claim `force=1` is universally needed or sufficient.

## 3. Repoint identity

The installed clasp implementation reads the command's explicit `deploymentId`, converts `-V` to a number, and calls `deploy`. It creates a version only if `versionNumber` is undefined; with `-i` it calls `projects.deployments.update` using both the configured `scriptId` and the supplied deployment ID. Thus `-V 23/24` neither pushes local source nor creates another version. A stale `-i` cannot automatically resolve to the correct web app.

Both retained staging configs name script `1gbJmGeDilxIhe25TC8SrSei89uJTEgVYgN2aOClEHHKJiykADzPVAIC2` and have no `deploymentId`. Config loading uses `config.scriptId` (`/usr/lib/node_modules/@google/clasp/build/src/core/clasp.js:149–169`). This supports the intended project, not the remote endpoint mapping. **Unresolved read:** that project's deployment listing/API response showing the full `AKfycbxxCw…` ID, web-app entry-point URL, and version before/after each authorized repoint. The URL used for the fire must match that entry point. Do not substitute a script ID or a stale deployment field for `-i`.

## 4. Settings and external effects

The confirmed bench-specific override is guard 0. Also inspect `wallBudgetMs`, `tailReserveMs`, `checkpointSaveMs`, `checkpointForce`, `checkpointFaultAt`, and `checkpointResumeFaultAt`. The last three are bench fault controls, normally zero; positive timing values can arm clock-dependent checkpoint routing, and force can override the normal arming test (`phase01-config/engine94SheetContract.js:338–343`; `phase10-persistence/cycleCheckpoint.js:287–295`, `:319–330`, `:497`). Match intended controls across A/B and require completed `done` readbacks, not merely a checkpoint acknowledgment.

No World_Config key in the reviewed normal fire path was found to turn on email/Discord/Drive publishing. Sheet intake and archive writes remain active simulation behavior (`phase01-config/godWorldEngine2.js:875–877`). The value-only sync does not copy Apps Script time triggers. Existing bench triggers nevertheless survive: the optional export installer creates a six-hour `fullExportAndMirror` trigger and its exporter writes Drive files (`phase10-persistence/cycleExportAutomation.js:344–369`, `:456–469`); checkpoint cleanup deletes only resume handlers. Do not mistake cleanup of one handler for an all-trigger audit.

**Unresolved reads:** installed bench triggers, the explicit non-secret aim properties, and the named World_Config settings. `openSimSpreadsheet_` uses `SIM_SSID` or a production fallback; its cross-target guard only blocks when a container is identifiable (`utilities/utilityFunctions.js:202–248`). A correctly aimed deployment should keep normal simulation writes on the bench, but a staging `.clasp.json` is not sheet-target proof. No notification/trigger inventory was fetched in this review.

## 5. Determinism and the historical claim

The scheduler advances time before `initializeSeededRng_` (`phase01-config/godWorldEngine2.js:555–558`). The injected generator is seeded by the actual Cycle, **112**, not the wall clock or World_Config.rngSeed. Both CityEvents and weather prefer that injected generator; seed-config fallbacks are secondary paths (`phase04-events/buildCityEvents.js:46–50`; `phase02-world-state/applyWeatherModel.js:181–184`). The same initialization and CityEvents selection are present in historical commits `331d5dc7` and `89a59860`, the pointer's original A/B pair.

CityEvents' pool and hood rankings depend on city/hood dynamics and thresholds (`phase04-events/buildCityEvents.js:55–64`, `:240–242`, `:489–496`); upstream conditional draws can also change the shared generator's position (`phase01-config/godWorldEngine2.js:1368–1381`). A deterministic engine change can therefore alter event names without any clock noise. The pointer's later explanation is consistent with this mechanism, but two matching B runs alone do not prove the exact A→B causal attribution. That requires identical input evidence and, for a specific attribution, the event pool/weights and incoming draw position.

This is not a claim of whole-output byte determinism: timestamps and timings differ (`phase01-config/godWorldEngine2.js:513–521`; `phase01-config/loadPreviousEvening.js:79`), and checkpoint routing can vary with runtime. The remaining `Math.random` quote helper is an off-cycle entry point with no fire-path callers found (`phase05-citizens/citizenContextBuilder.js:1158–1159`); it is not evidence of a CityEvents clock seed.

## 6. What the new step can establish

C111 and C112 use different RNG seeds and different positions in the simulated calendar (`utilities/cycleModes.js:186–195`; `phase01-config/advanceSimulationCalendar.js:47–85`). The .017 setting changes the at-risk-owner draw threshold and can produce a household sale and downstream effects (`phase05-citizens/generationalWealthEngine.js:2223–2247`). BIZ-00183/00184 are task-supplied additions; their actual rows were not fetched here. If eligible, business rows enter the ordinary dynamics reader and its carried state (`phase05-citizens/applyBusinessDynamics.js:507–538`). These facts invalidate treating the old −0.10 as an invariant expected result; they do **not** by themselves invalidate a matched A/B comparison on the new base.

The package contrast has also changed: this is the full seven-file engine.214/287/288 stack over stage 4, not only the original mood cut. B's two seed carriers may legitimately have no C111 live input on adoption; disclose that first-fire boundary. Report the measured per-hood values and CitySentiment alongside baseline identity, .017, the business additions, carry recovery/adoption diagnostics, package versions, and completed-fire evidence.

**Additional comparison blocker:** step 5 rereads mutable live data. `syncSandboxFromLive.js:63–75` issues multiple current-live reads, rather than replaying one immutable snapshot. A constant `cycleCount=111` does not exclude intake/business/config changes between the resets. Its verification only compares row counts on five tabs (`scripts/syncSandboxFromLive.js:138–152`), and its size cap can truncate any oversized string (`:82–93`). Neither proves input identity. Use a single approved frozen reset image for both legs, or obtain full typed pre-fire input comparisons with only declared bench-control differences; verify carry JSON is intact and identical. Name any truncations and bench-only tabs. Do not declare a pure engine step from two independent live syncs on the strength of equal counters alone.

## Local validation and next action

Twenty in-memory Node/VM assertions passed: ten each against hash-verified A/B source. Cases covered C114 and C112 ghost rejection in favor of synthetic C111 ring data; the unstamped-property trust exception; guard-60 refusal; wrong/right clearfire Cycle; missing/matching checkpoint generation; empty-checkpoint cleanup; and equal Cycle-seeded draws. Synthetic data remained entirely in memory. These checks prove the cited branches, not real Sheet contents, installed triggers, deployment identity, or an actual paired result.

Engine-sheet should correct the procedure and collect the named non-secret readbacks before running the pair. No numerical step is declared by this review. This finished artifact is the sole write; inbox registration/landing remains with the receiving Claude seat under `docs/for-claude-review/README.md`.
