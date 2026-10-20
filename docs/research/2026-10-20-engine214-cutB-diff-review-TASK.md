# TASK — codex: diff review, engine.214 8a Cut B (commit 3ed34b61)

Read-only: code + docs + `output/` dumps; you may run `node scripts/testNeighborhoodLoop.js` and other Node tests. No cron, model, Sheet write, bench, clasp or canon run. Do not commit, do not push. Write to `docs/for-claude-review/2026-10-20-codex-engine214-cutB-diff-review.md`, SHIP / FIX / HOLD per hunt, file:line evidence, under ~100 lines. Report in one line when done.

**The contract:** `docs/plans/2026-10-10-engine-214-mood-per-hood.md` step 8 → "Codex recheck 3" block (commit `accf99a3`) — your recheck 3 (`docs/research/2026-10-20-codex-engine214-cutB-recheck3.md`) folded. **The diff:** `git show 3ed34b61 -- phase05-citizens/generateCitizensEvents.js scripts/testNeighborhoodLoop.js`.

## Hunts
1. **Contract fidelity.** Every pinned text, tag, side, weight (M/3 with, M/6 against, M = today's `pw(1.1, mi) + pw(1.0, mi)`), dial map and the 6 clamp, as written in the recheck 3 block. Anything built past it or missing.
2. **Pool path.** `hoodReactionSet_` → `makeEntry` → the T5 `react:` branch → clamp: does every entry reach the draw with the weight the contract says, at null DialState and at extreme bands? Is the `react:` branch placed so no other branch of the else-if chain is skipped for an entry that also carries another matched tag (these entries carry `source:nbhdState`, `state:trajectory-*`, `react:*`, `dial:outabout:*`)? Any other consumer of pool entries that reads tags and now meets `react:*` (dedupe, ECL drop, life-state gate, grief, continuity, normaliser, memory)?
3. **Apps Script scope.** Top-level `HOOD_REACTIONS_`, `hoodReactionSet_`, `hoodReactionMult_` in the shared GAS global scope: name collisions (`scripts/auditFunctionCollisions.js` says 0 functions; check the `var`), ES5-only syntax, `hasOwnProperty` on a plain object literal, `String.prototype.replace` with a hood name.
4. **Grade + pulse.** On the real path, each of the eight lines writes `Neighborhood-Outabout-Up|Down-S` and the first-draw pulse follows Cut A; nothing else in the line's consequences (dial nudge size, bias intents, ripple, FAME_WATCH, LifeHistory_Log tag) changes for these lines vs today's two except the sign each now carries.
5. **Tests.** Are C2g2–g4 and C8a–e real (would each fail on a plausible regression — e.g. a swapped sign, a dropped side, a reaction mapped to the wrong dial, a text with a banned substring)? Anything vacuous or seed-lucky in C8e?
6. **Determinism.** The pool now has four trajectory entries where it had two: the rng draw sequence changes for citizens in trajectory hoods (expected); does any other path consume rng differently because of the cut?

Done = the md exists.
