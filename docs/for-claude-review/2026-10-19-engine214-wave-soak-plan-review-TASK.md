# TASK — codex: adversarial review of the engine.214 PROD wave + engine.300 soak plan (2026-10-19)

**From:** engine-sheet. **Mode:** read-only. No sheet writes, no fires, no deploys, no commits.
**Output:** `docs/for-claude-review/2026-10-19-codex-engine214-wave-soak-plan.md`. One verdict per hunt (PASS / FIX / HOLD / unresolved), each with file:line evidence.

## Why

NEXT[engine-sheet] (1): engine.214 + 287 + 288 to PROD before live C113 (Sun 2026-10-25), and the builder's 20-Cycle soak (ROLLOUT engine.300; `docs/plans/2026-10-08-engine-286-game-of-life-events.md` §Bench soak) rides the same bench. The pair procedure itself was reviewed (`docs/research/2026-10-12-codex-engine214-pair-procedure.md`) and applied 2026-10-13. What is new here: the soak, the order, the readback, and a fresh baseline at C112.

## The plan (bench order)

0. **PROD tree vs HEAD.** `clasp pull` PROD @147 into a scratch dir; diff against HEAD over the clasp-pushed tree. Expected delta: the engine.214 stack (Tasks 1–20, engine.287, engine.288) + engine.299 `a7564342`, `014f31bc`, `7acb6a25`. Anything else rides nothing until explained.
1. **Bench pre-check.** 1004 sits at C112 on @54 (= PROD @147), fired from live C111 2026-10-18 (DEPLOY.md:61). Read the DialState column (rule: a resync destroys bench-only evidence). Read `FIRE_ADMISSION_JSON` by `getprop` (read-only, `utilities/webTrigger.js:172`).
2. **Resync from live C112.** `syncSandboxFromLive.js` dry → `--apply`; World_Config `fireGuardMinutes` 0 and a displayed-value check against live (the 2026-10-13 format trap); `clearfire cycle=<the record's cycle>`; `clearcheckpoint` only as the checkpoint state requires. Freeze a Drive copy `BASELINE-1004-C112` (copy-as-source route, `81de1f13`).
3. **Pair (engine.214 Acceptance 4/5).** Leg A = deployment @54 fires C113. Reset from `BASELINE-1004-C112`. Leg B = @54 tree + the engine.214 stack only, fires C113. Declare per-hood and CitySentiment step in DEPLOY_HISTORY; spread across the 22 ≥ 0.18; 0 new Engine_Errors; state that it is not interchangeable with the C110→C111 step (your 2026-10-12 verdict 6).
4. **The three engine.299 commits on B as one stacked fire (C114)**, readback attributing each by its lines (a7564342 drops a `d:null` line from the neighborhood pick pool; 014f31bc adds 22 bespoke up lines; 7acb6a25 renames the utility truck and an Intake mapping).
5. **Soak (engine.300) — not a PROD gate.** Reset from `BASELINE-1004-C112`, push the proven candidate (step 3 + 4 tree), fire C113 → C132 one at a time.
   - Loop keys on sheet state, not the response: fire `expect=N` → wait until `World_Config.cycleCount` reads N+1 → Riley_Digest last row + Engine_Errors count → readback → next. Halt on: no advance, double advance, new Engine_Errors, quota text in the JSON. Never re-fire. Split across sittings if a quota error shows.
   - Readback: a scratchpad script that requires `lib/env` then sets `GODWORLD_SHEET_ID` to the bench (DEPLOY.md traps 1/2b), confirms the target by a value that differs from live, and calls the exported `buildCitizenScoreboard` / `buildCitizenStates` / `cycleStamp` (`scripts/engineAuditor.js:578`) with prior states carried in the scratchpad. It never runs `engineAuditor.js` `main()`, which writes `output/engine_audit_c<N>.json` (:478–497) that the live chain reads as prior (`loadPreviousAudits` :128).
   - Per Cycle it also reads: Relationship_Bonds count by BondType × Status, romance and courtship counts, bonds at/above the wedding bar and crossings this Cycle; `LifeEvent-Promotion-*` lines by dir × band beside `Promotion` tags (S/M are texture lines; L calls `careerApplyPromotion_`, `phase05-citizens/runCareerEngine.js:570–580`); ledger rows minted with ParentIds and their household.
   - Output: `output/engine-sheet/2026-10-19-engine300-soak-c113-c132.{json,md}`, one series row per Cycle.
6. **Code cuts, one at a time** (wiring card → cut → tests → bench fire from the baseline → your diff review): (a) the decay storefront line fires only on a real hood fact — today it is gated on `trajectory === 'decay'` alone (`phase05-citizens/generateCitizensEvents.js:1713–1717`); (b) `$VENUE` / `$INSTITUTION` from the hood's consumer-facing Business_Ledger rows.
7. **PROD:** @147 tree + proven stack, `/deploy`, sheet-side replays (the five `clusterAnchors_*` World_Config rows deleted — engine.214 Acceptance 6; any config key whose `ensure*` has no cycle-path caller), smoke note naming C113 Sun 2026-10-25. Agy reviews the stacked diff vs @147 before the push.

## Live facts the plan rests on (read 2026-10-19)

- Relationship_Bonds live: 619 rows. Types: family, friendship, professional, rivalry, alliance, neighbor, mentorship, sports_rival, tension. **0 romance, 0 courtship.** Weddings come only from bonds (`phase05-citizens/bondEngine.js:316`; `processRomanceAndMarriage_` :2109).
- Scoreboard tags: `scripts/engineAuditor.js:185–195`.
- `syncSandboxFromLive.js` takes its source from `GODWORLD_SHEET_ID` after `lib/env` (:22–27).

## Hunts

1. **Soak code version.** The soak runs the candidate (step 5), not PROD @147. Does anything in the engine.214 stack or the 299 commits feed a life-event, bond, career or home rate (mood/sentiment into the dice, the romance flip, hiring)? Cite the readers. If nothing does, say so — then the series also reads for @147.
2. **Baseline reset.** How does the copy-as-source route (`81de1f13`, DEPLOY.md) reset 1004 from a Drive copy when `syncSandboxFromLive.js` takes its source from `GODWORLD_SHEET_ID` after `lib/env`? Any step that can write to live, or read live as the "baseline"?
3. **State that survives resets.** After the soak the carry ring and props are stamped up to C132; then the cuts reset to `BASELINE-1004-C112` and fire C113. Does the loader step back cleanly (engine.119 T3), or can a C132-stamped prop ghost a C113 fire? Same for `FIRE_ADMISSION_JSON` and the checkpoint.
4. **Readback answers the builder's four questions** — scoreboard leaves zero and at what rate; bonds advance fast enough to reach a wedding in 20 Cycles; kids reachable; promotions reachable. Name the column/field for the wedding bar (intensity and type), the friendship→romance→courtship transitions, the child mint, the promotion writer. Flag any count the reads miss (cell-only writers, `compressLifeHistory` trimming stamps inside 20 Cycles, births that never write `[Birth]`).
5. **Loop safety.** Read `webTrigger.js` and the `expect` guard in `runWorldCycle`: with the loop keyed on sheet state, can any response path still double-advance or leave a half Cycle the next fire builds on? Apps Script quota exposure of ~20 × 250 s web-app executions in one day?
6. **Contamination.** Does a bench fire write outside the bench sheet (Drive, Discord, external fetch, shared stores, repo `output/`)? Does any repo script this plan runs write cycle-keyed `output/` files the live C113 chain would read?
7. **Stacking.** Is each of the three 299 commits attributable by its lines alone in one fire, or should they go one per fire?

## Rules

Verify against code; don't infer from docs. Where the code doesn't settle a hunt, say "unresolved" and name the read that would settle it.
