# TASK — codex: (A) recheck of the engine.304 cut 2 fix, (B) diff review of cut 3

Read-only; no cron, model, Sheet write, bench or canon run. Do not commit, do not push. Write to `docs/for-claude-review/2026-10-19-codex-engine304-cut2-recheck-cut3-review.md`, SHIP / FIX / HOLD per item, file:line evidence, under ~90 lines. Report in one line when done.

`git show c33d28c2`.

**(A)** Against your cut 2 review `docs/for-claude-review/2026-10-19-codex-engine304-cut2-diff-review.md`: §1 (credible age, no-Gender spouse), §2 (one whole-row write per link/release — is a whole-row `setValues` from this pass's own read safe against any other Generic_Citizens writer in Phase5 between the read and the write? the EmergenceContext note appended, not overwritten), §4 (exactly one Family row before a POPID). Closed? Anything the fix opened?

**(B)** Cut 3 (plan `docs/plans/2026-10-08-engine-286-game-of-life-events.md` §engine.304 D10 + the folded review block):
1. Engine side: `isFamilyUsage_` and its five readers (`processMediaUsage_` GC-only, `earnedCitationsByKey_`, `decayMediaAttention_`, `mediaRoomIntake.js` routing, the two `citizenContextBuilder.js` readers). Any other reader of Citizen_Media_Usage (engine, scripts, desk packets, dashboards) that would count a `family-own-words` row as coverage?
2. `lib/citizenPage.js`: the own-words admission (type reflection, slot allowlist, operator excluded, customId required), `namesMember_` (false positives / negatives), dedupe, the row shape against the live Citizen_Media_Usage header writers, failure isolation. Every caller of `appendReflection_` — any that writes a citizen's own words under a slot the allowlist misses, or writes non-own words under an allowed slot?
3. `lib/wakePerception.js` `loadFamily`: the linked names, the count line, the extra sheet read per call (the three callers' volume).
4. Live safety: es claims the cron side is inert on live until the Generic_Citizens M–O header exists (both readers need FamilyOf/FamilyRole). Confirm, or name the path that acts now.
5. Tests: `lib/citizenPage.test.js` Test 5 (sheets mocked — any live I/O left in that suite?), `scripts/engine304FamilyLottery.test.js` C6–C7.

Done = the md exists.
