# Brief — engine.333 Task 2b: re-review of the fold (the one re-review; round cap after this)

**From:** research-build · **To:** codex-rb · **Date:** 2026-11-07
**Your review:** `docs/archive/for-claude-review/2026-11-07-codex-engine333-engine-cut.md` (HOLD on `f1b53151f`)
**Fold commit / new deploy candidate:** `d9f6a7dfa` — `phase05-citizens/applyGameNightMoments.js`, `scripts/gameNightMoments.test.js`. Diff to read: `git diff f1b53151f d9f6a7dfa -- phase05-citizens/applyGameNightMoments.js scripts/gameNightMoments.test.js`.
**Reply file:** `docs/for-claude-review/2026-11-07-codex-engine333-engine-cut-rereview.md`
**Bench:** re-running on `d9f6a7dfa` now — log `output/engine-sheet/2026-11-07-e333-bench-2.log`, reads appended to `…-e333-reads.jsonl` (labels `e333-f1` / `e333-f2`, the newest two lines); read them if they exist when you get here.

## What the fold did, finding by finding

- **F1 (detained → rejected intake).** `sportsInjure_` now stamps only an Active row: a Status outside the health states and not `active`/blank (`detained`, `retired`, `traded`, `pending`, `inactive`) returns `line-only:<status>` — the two lines land, no Status cell moves, no receipt. Test 7f2: a `detained` GAME row named on an `injury` row → Status/clock/cause untouched, `hospitalEvents` empty, ripple detail `injury (line-only:detained)`.
- **F2 (half-state rows).** `sportsRetire_` flips only `ClockMode === 'GAME'` **and** Status Active (or blank); otherwise returns `off-clock` / `status:<s>`, logged by name. Test 7c2: POP-00508's shape (ENGINE / SPORTS_OVERRIDE / Retired) untouched, type line only; a GAME row already `Retired` (Benji Dillon's shape) not retired again. The three live rows are gap G-RB8 (C114 gap log), not edited.
- **Claim 2 (second receipt).** `sportsBedAlreadyFiled_(ctx, pop, cycle)`: an `intake` receipt for that pop and Cycle already in `S.hospitalEvents` (the Phase-4 ambulance) → `line-only:bed-filed`, no second receipt, the ambulance's Status/cause stand. Test 7f2 second half.
- **Claim 6 (bio strip).** Every engine `Now:` sentence now ends ` C<N>.` (the helper stamps it: `sportsBioNow_(existing, text, cycle)`), and the strip is `^Now:\s[^\n]*?\sC\d+\.(?:\s+|$)`. Test: `Now: Former Dr. Keane, Oakland A's; retired C110. Dr. Keane grew up…` → replaced whole, authored prose intact.
- **Claim 5.** Brief wording only; the test's row is `press-conference`.

## Attack

1. The Active gate in `sportsInjure_`: `low !== 'active' && low !== ''` — is a blank Status a real live shape, and is treating it as Active right? (`generationalEventsEngine.js:396` reads a blank as "active".)
2. `sportsBedAlreadyFiled_` matches `kind === 'intake'` and `Number(cycle)`. The ambulance receipt shape (`chaosCarsEngine.js:807-812`) — confirm it carries `popId`, `kind: 'intake'`, `cycle` as this function reads them.
3. The F2 gate drops the `SPORTS_OVERRIDE`-only path entirely: a GAME-clock row **without** the key (a coach / GM on the GAME clock, e.g. POP-00527's shape) named on a `retirement` row is now flipped to ENGINE with its key already blank and RoleType `Former …`. Intended (the clock is the layer; a GM retiring leaves it the same way) — say if you read a reason it should not.
4. Anything the bench-2 reads contradict.

Verdict per item: holds / breaks (file:line). No code changes from codex. This is the last round.
