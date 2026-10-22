# TASK — codex: engine.310 diff gate (the fix + its bench, before PROD)

Read-only: code + docs + `output/` files; no cron, model, Sheet, bench, clasp, commit or push. Write to `docs/for-claude-review/2026-10-21-codex-engine310-diff-gate.md`, one SHIP / FIX per item with file:line evidence, under ~20 lines. Report in one line when done.

**State:** your plan review (`docs/research/2026-10-21-codex-engine310-plan.md`) is folded (the plan TASK's last section). The fix is `ffad3bf8`, one engine file. The bench ran on SANDBOX 1004; the bench code is restored to stage 18 (pull-back = `stage18-e306.sha256`).

1. **Code** — `git show ffad3bf8 -- phase08-v3-chicago/v3NeighborhoodWriter.js`. It adds the top-level pure `eventAttractBase_(S)` plus `EVENT_ATTRACT_EVENT_WORDS` / `EVENT_ATTRACT_STORY_WORDS`; the inline :368-400 loops and the local `eventText` go, and so do three locals that nothing else read.
   - Hunt: semantics vs the folded plan; an Apps Script global-name collision across the project; regex statefulness (no `g` flag); unchanged behaviour for every other column; the stub maps (`docs/engine/ENGINE_STUB_*`) regenerated only for this.
2. **Fixtures** — `output/engine-sheet/2026-10-21-e310-fixtures.{js,json}` (PASS). The old rule is cut by marker from `50d433b7`, so the old block is exact rather than re-typed.
   - Hunt: anything your plan-review step 3 asked for that is still missing.
3. **Bench** — `2026-10-21-e310-pair.{sh,log}`, judge `2026-10-21-e310-check.{js,json}` (**ACCEPT**). The tap is `2026-10-21-e310-eatap.patch` (bench-only `e87cdddd`, never merged).
   - **B3** = stage 18 + the fix, B start, C113:
     - readers and spots deep-equal pair-3 B2 except each hood's EventAttractiveness;
     - LifeHistory sha is `bb0ac98b0284f1cd`;
     - the fire record agrees.
   - **B3t** = B3 + the tap:
     - readers, spots and fire record equal B3;
     - one EA_Diag row: base 5 = city 3 (B2's col Q names) + seed 2 (both `community`) + hook 0 + ev 0, residual 0;
     - the per-phase draw marks deep-equal B2t's;
     - per hood, `mod` / `pulseDelta` / `chaosEA` and their inputs equal B2t's, and the stage arithmetic reproduces the sheet.
   - **Prediction:** B2t's per-hood inputs with base 5 give B3's saved EA exactly. Every hood rises by 1 or 2 (e.g. Jack London 5.08 → 7.08, Adams Point 2 → 3).
   - Hunt: is ACCEPT earned — anything in the run not compared, or compared by a key that hides a difference.
4. **PROD plan** — stage 19 = stage 18 + `v3NeighborhoodWriter.js` at `ffad3bf8`; the bench-built manifest is `output/engine-sheet/stage18-e310-B3.sha256`. The push copies `2026-10-21-push-e306-prod.sh` (base = stage 18). The order is the C113 read (Sun 2026-10-25) first, then the push, then C114 as the first live fire. Rollback = `v3NeighborhoodWriter.js` from `2896c46c`.
   - Live EA sums ran 114–704 over C103–C112 (DEPLOY_HISTORY §PROD stage 18), against a bench C113 sum of 72.6, so live bases are larger and their share of false hits is unmeasured: seeds are on no sheet, and hooks are in Story_Hook_Deck.
   - Hunt: is a pre-push estimate from the live Story_Hook_Deck + Riley_Digest cols Q/U worth requiring, or is the C114 read enough. Name any C114 watch line this needs.

Done = the md exists.

## Codex diff gate — folded (`docs/research/2026-10-21-codex-engine310-diff-gate.md`: code / fixtures / bench SHIP, PROD HOLD)

- **Item 3 (bounded SHIP):** the judge is now two-sided over keys, and compares B3t's Phase-5 snapshot with B2t's and the tap's hood set with the sheet's. Rerun: ACCEPT (`2026-10-21-e310-check.{js,json}`).
- **Item 4 (FIX):**
  - **Push script.** `output/engine-sheet/2026-10-21-push-e310-prod.sh <commit> <manifest>`:
    - stage-18 preimage: a fresh PROD pull = `stage18-e306.sha256`, and the writer on PROD = the `2896c46c` copy;
    - the writer comes from `ffad3bf8`, and the built tree must equal the committed `stage18-e310-B3.sha256` byte for byte;
    - pinned deployment, version check and pull-back, as in stage 18;
    - before any push (after the dry-run exit), `2026-10-21-e306-livewatch-diff-c113.json` must exist and read ACCEPT-CANDIDATE.
    - Dry run 2026-10-21: fresh PROD pull = stage 18, built stage = the benched tree byte for byte.
    - Rollback = the writer from `2896c46c`.
  - **C114 watch.** `output/engine-sheet/2026-10-21-e310-c114watch.js` — `snap 113` after the C113 read and before the push, then `diff 114` after C114.
    - It covers: Riley col Q staged count, WorldEvents domain / whole-word hits, StorySeedCount, HookText whole-word hits, all 22 saved EA with sum / range against C113, and Engine_Errors for the Cycle.
    - HOLD on a missing input or a Phase10 / NeighborhoodMap / persist error. DIAGNOSE (never auto-attributed) on an all-hood move or a sum outside 0.5×..2×.
    - Dry run on live C112 (`-c114watch-c112-dryrun.json`): sum 114.29, 4 staged events (Volunteer Boost Rally, Winter Lights, Waterfront Stroll, Street Vendors Block — none counted under the old rule), base lower bound 5.
    - C115: read migration / trajectory moves against C114 EA (manual).
  - **No pre-push estimate is required** — codex agreed; seeds and folds are unobservable on live.
