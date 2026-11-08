---
title: Engine 334 deploy candidate diff review
created: 2026-11-08
updated: 2026-11-08
type: reference
tags: [engine, review, active]
sources:
  - output/codex/TASK-2026-11-08-engine334-diff-review.md
  - docs/plans/2026-11-05-story-seed-mixed-magnitudes.md
  - git diff c257efffa e15eb443f -- phase07-evening-media/buildContractSeeds.js phase07-evening-media/buildContractSeeds.test.js
  - output/engine-sheet/2026-11-08-engine334-replay-c110-c114.txt
pointers:
  - "[[../plans/2026-11-05-story-seed-mixed-magnitudes]] — engine.334 cut and remaining gates"
  - "[[2026-11-08-codex-engine334-plan-rereview]] — previous plan fold review"
---

# Engine.334 deploy candidate diff review

**Verdict: SHIP for the pinned `e15eb443f` code diff into the sandbox gate.** No code-backed finding in the requested diff. The source and offline checks below do not establish sandbox or PROD behavior; plan Tasks 6–7 still require their own receipts. The working-tree builder and test matched `e15eb443f` when reviewed. `output/engine-sheet/2026-11-08-push-e334-bench.sh:13-16,28-33` declares stage 45 as stage 44 plus this one Apps Script file, but I did not run that script or verify a staged deployment.

## Requested hunts

1. **Lead group and label — verified.** Clusters are nonempty because each key is created and immediately receives a ripple (`phase07-evening-media/buildContractSeeds.js:535-545`). The lead is a member of that group, chosen as its first non-carryover when present (`:551-559`); `contractSeedUnitGroups_` creates a key for every member, then puts `byKey[leadKey]` first (`:166-188`). Thus the lookup is defined for the actual builder inputs, even when that key was not the first seen. An offline synthetic probe gave `carryover +11` for an all-carryover pair and `business-closure -25; sector-impact:retail +16` when carryover preceded the closure. The latter also confirms the lead's effect label and the independent economic-points group. Tests 13e–13f cover closure-led and repeated-closure shapes (`phase07-evening-media/buildContractSeeds.test.js:469-480`).

2. **Class and rounding — verified.** The first unit alone receives the old cluster-size gate; later units receive size 0, so a three-effect cluster stays major without adding unlike figures (`phase07-evening-media/buildContractSeeds.js:592-598`; `:123-129`). For one `sum` unit, the accumulation and threshold are the old sum and old threshold (`:175-177,594-596`; pre-cut diff). Multiple rows in a `level` group instead use the signed peak and count, as the cut requires (`:176-178,192-195`). Class uses the unrounded figure and `What`/`Magnitude` round to hundredths (`:594-596,674-684`), matching the pre-cut order. The synthetic `-0.004` probe produced `What = sentiment 0`, numeric `Magnitude = -0`, and texture; the pre-cut `totalMag` expression has the same rounding and sign behavior. Tests 13a–13h cover the unit split, cancellation, and one major-to-texture case (`buildContractSeeds.test.js:450-489`).

3. **`What` and readers — verified within the cut.** A zero group figure appends no number; one `level` event prints its signed rounded value; repeated `level` events print `×N` (`buildContractSeeds.js:191-196,674-684`). The existing 5b.a, 5b.d, §11, and §12 assertions passed unchanged (`buildContractSeeds.test.js:209-212,397-434`). The source readers map `What` as text or use its words for matching, rather than parsing a numeric total: `scripts/beatSliceKit.js:146-160`, `scripts/buildTransitSlice.js:201-205`, `scripts/draftContentRows.js:208-216`, and `.claude/skills/sift/SKILL.md:252-259,450-455`. The changed words can affect those matches, so the replay's zero transit-word moves is relevant but is not a live reader test.

4. **Apps Script surface — verified.** A search for `CONTRACT_SEED_UNIT` and `contractSeedUnit` across `phase*`, `utilities`, `lib`, `dashboard`, and `editions` found declarations/usages only in this builder and its Node test (`buildContractSeeds.js:138-196,559,674,711-713`; `buildContractSeeds.test.js:491-495`). The diff adds no `Math.random`, Sheet write, or `ctx` field. It changes `S.contractSeeds` output fields already consumed by the existing writer (`buildContractSeeds.js:667-693`; `phase10-persistence/saveV3Seeds.js:91-143`).

5. **Replay receipt — verified offline.** Rerunning the pinned `--old c257efffa --json output/engine-sheet/2026-11-08-engine334-ripples-c110-c114.json` command rebuilt 228 seeds: 53 `What`, 52 `Magnitude`, one class flip (C114 COMMUNITY Citywide major → texture), and zero reported transit-word moves (`output/engine-sheet/2026-11-08-engine334-replay.js:18-28,52-94`). Its seed-by-seed lines match the saved receipt exactly. Only the final transit-count label differs because the helper now calls that probe an upper bound. The sports mood/head-count split, migration `×N`, fixed-tag counts, and C114 class flip agree with the plan's cut (`docs/plans/2026-11-05-story-seed-mixed-magnitudes.md:50-64`). No closure fired in this window, so its override is covered by the synthetic test, not by this receipt. The helper has no Sheet-sourced citizen/backdrop fields (`2026-11-08-engine334-replay.js:42-48,76-82`), so this is a `What`/`Magnitude`/`Class` replay, not a full live transit-slice reproduction.

## Wiring trace and evidence boundary

**Source-traced wiring card:** `recordRipple_` queues the Ripple_Ledger intent and appends the same cause/effect/magnitude to `S.rippleEvents` (`utilities/rippleLedger.js:59-92`). Phase 7 calls `buildContractSeeds_`, which clusters those in-context ripples and writes `S.contractSeeds` (`phase01-config/godWorldEngine2.js:760`; `phase07-evening-media/buildContractSeeds.js:513-559,667-693`). Phase 9 compacts non-coverage contract seeds into the next-cycle carry, mapping major/texture to priority 3/2 (`phase09-digest/finalizeCycleState.js:732-768`); Phase 1 restores the carry and Phase 2 reads it (`phase01-config/loadPreviousEvening.js:400-401`; `phase02-world-state/applyCityDynamics.js:207-218`). Phase 10 queues the deck rows in fixed columns, including `What`, `Class`, and `Magnitude` (`phase01-config/godWorldEngine2.js:835`; `phase10-persistence/saveV3Seeds.js:91-143`). Post-cycle transit and editorial readers are cited above. The required `engine-wiring` Haiku command for `buildContractSeeds_` and `Story_Seed_Deck` returned `[FATAL] Connection error`; no model-produced card was available, and it was not retried.

**Checks run:** focused Node suite `ALL PASS`; `node --check` clean on builder and test; `git diff --check c257efffa e15eb443f` clean; synthetic grouping and `-0` probes; pinned local JSON replay. No Sheet read/write, sandbox action, cron change, engine code edit, live Cycle, or PROD verification was performed. Concurrent dirty files were left untouched.

## Disposition

Filled by engine-sheet, 2026-11-08. SHIP with no finding; nothing to fold. The evidence boundary it names is closed by receipts outside this review: the sandbox run on the exact candidate (stage 45 @197, C115 + C116 PASS, deck = candidate 98/98 — DEPLOY_HISTORY §Current sandbox) and the PROD push of the same benched tree (DEPLOY_HISTORY §PROD stage 45).

**Reconciled in:** [[../plans/2026-11-05-story-seed-mixed-magnitudes]] §Reviews reconciled
