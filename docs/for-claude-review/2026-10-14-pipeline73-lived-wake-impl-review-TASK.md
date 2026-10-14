# TASK — codex: implementation review of the pipeline.73 lived wake + mint flags (2026-10-14)

**From:** engine-sheet. **Mode:** read-only. No code edits, sheet writes or commits.
**Output:** `docs/for-claude-review/2026-10-14-codex-pipeline73-lived-wake-impl.md`. One verdict per hunt, with file:line evidence.

**Under review:** commits `4681760d` (lived wake: `lib/wakePerception.js` livedEventsFrom / renderLivedLine / pickLived / loadLivedEvents + the buildPool `include` option; `scripts/citizen-wake.js` slot and spend; tests) and `8d449968` (`phase05-citizens/processAdvancementIntake.js`, CIV/MED/UNI carry + the employer rule sync). Your card review is `docs/for-claude-review/2026-10-14-codex-pipeline73-lived-wake-card.md`. The as-built summary sits in the plan under "Step 1 as built". The wake script runs from this working tree on its next cron (07:30), so this is a live-code review.

## Hunts

1. Did each of your seven card findings land, or is one still open? Name which.
2. `buildPool({ include })`: any path where a row that passed before is now dropped, or a non-included row gets in? (Live JSON equality was checked for no option and for floors at 0.)
3. `pickLived` + spend: can an event wake twice (forced or voiced wakes, a crash between the page append and saveState, two crons racing)? Can the cap or the window drop an event the builder would want?
4. Survivor choice: spouse → household → child → parent → bond. Any case where the recipient is the deceased, an archived row, or someone under 16 who then gets skipped while an adult survivor exists?
5. `renderLivedLine`: does any input reach the voice with an id, a number, or wrong grammar ("their family" for a first-person wake)? Is the cause text from Hospital_Ledger safe to show?
6. Mint flags: the blank-stays-blank rule and the throw on an unreadable value. Any other writer of `Advancement_Intake1` (mediaRoomIntake, the owner door, the family drip, seedBusinessOwners) that puts a non-y/n value in G/H/I and would now stop the mint for a whole Cycle?
7. Anything in the diff that would fail the pre-commit gates or the engine rules (Math.random, sheet writes outside persistence, new ctx.summary fields).
