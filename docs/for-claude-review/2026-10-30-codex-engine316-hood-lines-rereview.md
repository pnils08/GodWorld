---
title: Codex last-round rereview of engine.316 hood lines
created: 2026-10-30
updated: 2026-10-30
type: reference
tags: [engine, neighborhood, review, active]
sources:
  - output/codex/TASK-2026-10-30-engine316-hood-lines-rereview.md
  - commits 93e3ce71 and 5078d345
  - docs/for-claude-review/2026-10-30-codex-engine316-hood-lines-review.md
pointers:
  - "[[2026-10-30-codex-engine316-hood-lines-review]] — original F1–F4"
  - "[[../plans/2026-10-10-engine-214-mood-per-hood]] — engine.316 plan"
---

# engine.316 — last-round rereview

**Verdict: HOLD on the proof and bench guard, with F1 closed as decided.** The fold fixes the original zero-hit and wrong-hood exits, and the saved two-fire receipt shows one San Antonio line plus a stage-33 pullback. The checker can still pass on a non-Neighborhood log row, the EXIT trap can deploy stage 33 after an abort before any candidate push, and the source guard does not bind the deployed file to reviewed bytes. These are the remaining code-path findings for the seat to decide.

## Disposition of the original findings

| Item | Rereview | Evidence and remaining input → output |
| --- | --- | --- |
| F1 Baylight | **SHIP, as decided** | The waterfront-walk line became a harbor-side *block* (`phase05-citizens/runNeighborhoodEngine.js:224-230`); the TASK accepts resident-backed new units and blocks. No remaining line requires the planned promenade or another opened project amenity. The burger counter is supported by the saved Business_Ledger (`output/beats/Business_Ledger.jsonl:98`). |
| F2 checker | **HOLD, partial fold** | `Cycle > from` (`output/engine-sheet/2026-10-30-e316-check.js:18-19,29`), the log row's own `Neighborhood` (`:32`), and exit 3/4 for zero/wrong hits (`:35-36`) close the original cases. The wrapper captures the check exit and stops on nonzero (`output/engine-sheet/2026-10-30-e316-bench.sh:30-32`). Finding R1 below remains. |
| F3 restoration | **HOLD, partial fold** | The EXIT trap now calls a real restore (`output/engine-sheet/2026-10-30-e316-bench.sh:11-13`); a clean explicit restore sets `CODE=stage33`, so the subsequent EXIT trap returns without another push (`:12,33-35`). Finding R2 below remains. |
| F4 candidate guard | **HOLD, partial fold** | The guard requires ancestry from `6b0732f4` and checks subjects of later commits touching the engine file (`output/engine-sheet/2026-10-30-push-e316-bench.sh:38-41`). `a1201be2` carries the reviewed fold's engine-file blob `212513287b507917b72f3ffc6ed37c23c746d91e` (local Git object read). Finding R3 below remains. |

## Remaining findings

### R1 — text alone can certify a line the Neighborhood Engine never wrote (HOLD)

`output/engine-sheet/2026-10-30-e316-check.js:12-16,29-36` builds a text dictionary from the *working-tree* engine file and accepts any later `LifeHistory_Log.EventText` containing a dictionary phrase. It prints `r.EventTag` at `:33` but never tests it. Input: after `fromCycle`, a San Antonio log row with `EventTag=Daily`, `Neighborhood=San Antonio`, and `EventText` containing `noticed the lunch counters on International quieter than usual this week`, with zero engine.316 writes → `hits=1`, `wrong=0`, exit 0 and the wrapper can report PASS (`output/engine-sheet/2026-10-30-e316-bench.sh:30-35`). The intended writer stamps `Neighborhood-Outabout-Down-S` and writes the exact entry as EventText (`phase05-citizens/runNeighborhoodEngine.js:704-735`). Gate on that writer's tag and exact text, and derive the dictionary from the reviewed candidate rather than a mutable checkout. The saved two-fire row has the expected tag (`output/engine-sheet/2026-10-30-e316-bench-6b0732f4.log:18-19`); this is a reproducible false-positive input, not a claim that the saved row is false.

### R2 — a pre-push abort can deploy through the EXIT trap (HOLD)

`output/engine-sheet/2026-10-30-e316-bench.sh:11-13` installs `restore` while `CODE=unknown`; the first AIM rejection exits at `:19-20`, before the candidate push at `:21`. The trap still invokes the stage-33 push script. That script pulls the sandbox and, even if it was already stage 33, runs `clasp push --force` and deploy (`output/engine-sheet/2026-10-30-push-e316-bench.sh:24-25,35-36,47-53`). Input: AIM check returns anything other than `AIM = BENCH` while the sandbox is already stage 33 → output: the wrapper says `HALT aim not proven` but its EXIT trap creates a new sandbox deployment. The same path runs if the candidate guard rejects before pushing. Only restore after a push may have begun; a clean restore after a successful run already avoids a second push because `CODE` becomes `stage33` (`2026-10-30-e316-bench.sh:12,33-35`).

### R3 — a subject prefix is not a file-content guard (HOLD)

`output/engine-sheet/2026-10-30-push-e316-bench.sh:38-45` admits any descendant of `6b0732f4` whose later commits touching `runNeighborhoodEngine.js` have subjects matching `^engine.316`; it never compares the selected engine-file blob or diff to the reviewed `93e3ce71` fold. Input: a descendant commit with an unrelated change to that file and subject `engine.316x: ...` → the grep accepts it, `git show "$SRC:$F316"` stages its unrelated bytes, and the self-generated manifest/pullback can still report stage 34. Conversely, a reviewed engine.316 file change committed as `fix(engine.316): ...` is refused solely on its subject. The currently staged `a1201be2` file blob equals `93e3ce71` and is not evidence of a wrong push; this is the repeat-use guard's remaining failure mode. Bind admission to an explicit reviewed blob or an allowlist of reviewed engine-file commits.

## Bench receipt and verification boundary

The saved `output/engine-sheet/2026-10-30-e316-bench-6b0732f4.log:9-25` reports two PASS fires, one matching San Antonio line after C117, zero wrong-hood hits, and a stage-33 pullback. At this rereview, `output/engine-sheet/2026-10-30-e316-bench.log:1-8` shows the new three-fire candidate `a1201be2` through stage-34 pullback and propagation wait only; it does not yet show three fire verdicts, a checker result, or restoration. The pullback receipt supports stage bytes, not the unfinished behavioral gate.

**Wiring card (source-derived):** `Phase5-Neighborhoods` calls `runNeighborhoodEngine_` (`phase01-config/godWorldEngine2.js:633-635`). `hoodTexturePool_` combines the character and bespoke pools (`phase01-config/canonNeighborhoodLoader.js:265-278`); `textureSigned_` selects the hood trajectory's direction (`phase05-citizens/runNeighborhoodEngine.js:597-613`). A selected line enters citizen LifeHistory and a queued `LifeHistory_Log` row with EventTag, EventText, Neighborhood, and Cycle (`:704-739`). This card is static because the TASK prohibits network/model calls.

**Method:** Read the two fold commits, named TASK, prior review, current code, saved logs, and relevant local records. No tests, Sheet reads, bench fires, network calls, deployments, or code edits were run for this rereview. The original review's RNG/rate finding and the resident-backed Baylight units/blocks were decided in the TASK and are not reopened here.
