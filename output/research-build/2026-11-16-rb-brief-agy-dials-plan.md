# Brief for agy — adversarial review of the dials build plan (engine.347 / 349 / 350 / 351)

From research-build, 2026-11-16. Read-only: no edits to code, sheets or docs; no model runs. Write your review to `output/antigravity/2026-11-16-review-dials-plan.md`.

## What to review

`docs/plans/2026-11-16-every-saved-word-reaches-the-dials.md` — §Rulings after the read, §Tasks (2–11), the Order line, §Acceptance. The builder's words in §Rulings are fixed; do not argue with them. Attack how the plan carries them out.

The first cut to be built is **Task 2 + Task 6** (one bench run, one deploy). Spend most of your effort there.

## The job

1. **Task 2, each fix — what else does it touch?** For `[Business]`, `[Money]` and the mint sentence (`processAdvancementIntake.js:1122`) getting their own entries in `utilities/citizenDialMap.js`: list every other caller of `nudgesForEvent_` / `hasTag_` / `CONTENT_RULES` whose result changes (wake perception, resonance recall, the generators' own `kindMovesNothing_` check, the offender scan, tests that pin today's values). For the sign fixes in `phase05-citizens/generateCitizensEvents.js` (`family:divorced`, the PrevEvening crowd / safety lines): what else reads those tags. For "a 1-point push can stick above 68.75" (`utilities/citizenMemory.js:87-153`, `:205-211`): name the smallest change that removes the lock and say what it does to a citizen already at 90+ (does anyone pin at 100?).
2. **The 13 stuck watermarks.** Find from code and git the Cycle those 13 rows' watermark jumped at, and which of their lines were already folded before the jump. Is "set the watermark back to that Cycle" correct, or does it double-fold or skip lines? What does the trim (`compressLifeHistory.js:654`, `:713`) have already done to their cells?
3. **Task 6, the keys.** List every constant that would have to become a World_Config key for the builder to set speed without a deploy, where each is read, and every place the same number is duplicated (Node-side `lib/citizenDials.js`, `lib/wakePerception.js`, `scripts/backdateCitizenDials.js`, tests). Where is config loaded and validated (`loadConfig_`, the `ensureEngine*Config_` pattern) and what happens on a missing or malformed key under that pattern — which precedent should this follow?
4. **Task 6, the Dial_Moves tab.** One row per citizen per Cycle that moved is up to ~1,000 rows a Cycle. Is that affordable inside the Apps Script run (the end-of-run tail is already 38–74 s against a 60 s reserve)? What is the cheapest shape that still lets the builder see what moved whom? Where must the write be queued so Phase 10 executes it (an intent queued after `Phase10-ExecuteIntents` is dropped)? Which direct-to-base paths outside Phase 9 (chaos break in Phase 4, wear, the challenger mint) would a Phase-9 recorder miss?
5. **Order and acceptance.** Name the two or three weakest steps or sequencing choices in Tasks 2–11 and say what breaks. Is any acceptance line unmeasurable as written? Does acceptance 4 ("same DialState, cell for cell") hold if two bench fires draw different random lines?
6. **Tasks 3–5 (cron side).** If the grade string stops writing a row, what else read those rows (`citizen-signal-detector.js`, `buildCitizenWeekDigest.js`, `civicPetitions.js`, the grading scoreboard)? If the classifier vocabulary gains tags, what asserts the vocabulary today (`reflectionClassifier.test.js`, the dial map's own tests)?

## Not wanted

No rewritten code. No new mechanics beyond what a finding needs to be stated. No real-world Oakland. A claim without a file:line or a number you produced is not a finding. If you could not open or run something, say so.
