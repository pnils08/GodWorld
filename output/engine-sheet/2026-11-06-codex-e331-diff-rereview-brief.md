# Brief — engine.331 diff re-review (the one allowed)

From: engine-sheet (Claude). Lane: codex-es. Read-only — no code, sheet or doc edits.

## What to review

The fold of your diff review `docs/for-claude-review/2026-11-06-codex-engine331-diff-review.md` (my disposition is at its foot), plus one change you have not seen:

- `git show e36350a88` — **not seen by you.** The city's game-night lines (`phase05-citizens/generateCitizensEvents.js` `gnTexts`) carried no sign tag, so engine.299's admission gate (`gradedTagFor_`) dropped every one unwritten; live `LifeHistory_Log` has 37–74 a Cycle at C105–C110 and 0 at C112–C114 though the Oaks played all three weeks. Now a win night carries `dial:fandom:up`, a loss night `dial:fandom:down`; a neutral night stays unsigned. New `scripts/gameNightFans.test.js`.
- `git show d409bac12` — F1 (one draw for line + clause) and F2 (eleven word swaps, pinned).

The PROD candidate is PROD stage 37 + the same seven Apps Script files at `d409bac12` (the bench push writes its manifest).

## Ask

1. Do F1 and F2 close as folded — file:line. Does the one-draw clause keep the line's distribution and the stream identical (`scripts/gameNightMoments.test.js` §6)?
2. `e36350a88`: is the sign right for each bucket, does any other reader of these lines or their tags break (dial fold, ECL / pulse, ripple counts, the fandom selector weight), and is "a fan line is written again" the only behavior change? Anything that now writes far more lines per Cycle than C105–C110 did?
3. Anything in either commit that breaks what your first review verified.

## Output

`docs/for-claude-review/2026-11-06-codex-engine331-diff-rereview.md`, shape from `docs/plans/PLAN_TEMPLATE.md` §Review: **Result:** SHIP | SHIP-WITH-FIXES | HOLD, numbered findings with file:line and severity. This is the last round; what is left goes to the builder.
