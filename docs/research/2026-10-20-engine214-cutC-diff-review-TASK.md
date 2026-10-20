# TASK — codex: diff review, engine.214 8a Cut C (the citizen's spot)

Read-only: code + docs + `output/` dumps; no cron, model, Sheet write, bench or canon run. Do not commit, do not push. Write to `docs/for-claude-review/2026-10-20-codex-engine214-cutC-diff-review.md`, SHIP / FIX / HOLD per hunt, file:line evidence, under ~100 lines. Report in one line when done.

**The diff:** `git show a137ea9b` (es build on your Cut C recheck). The contract is the plan block "Codex Cut C recheck" in `docs/plans/2026-10-10-engine-214-mood-per-hood.md` (step 8, after "Cut B build + bench"). Your recheck: `docs/research/2026-10-20-codex-engine214-cutC-recheck.md`. The bench pair (stage 15 vs stage 15 + Cut C, C113 on 1004) is running now; its receipts land in `output/engine-sheet/2026-10-20-e214c-receipt-{A,B}-c113.json` and the draw probe in `output/engine-sheet/2026-10-20-e214c-drawprobe.json`. Read them if they exist when you get there; don't wait for them.

## Hunts
1. **Source.** Is `S.hoodSpots` (`applyBusinessDynamics.js`) collected at the right point on the open path only? Is it published only at the phase end (a throw anywhere before leaves it unset)? Are the chaos filter and Cycle normalization against `runChaosCarsEngine_`'s stamp right? Do blank names, unmapped hoods and `d.cls` all hold? Anything else in the function that `continue`s or returns between collection and publication?
2. **Pick + lines.** `spotRank_` / `citizenSpotFor_` / `citizenSpotLines_` (`generateCitizensEvents.js`, after `hoodReactionMult_`): is the fmix32 correct and unsigned throughout, and the tie rule correct? Does each line come only from its fact, with the weights and signs the plan block pins? Is the `$` replacement safe?
3. **Placement + pulse.** The spot pool sits beside the state pool in the per-citizen loop. Is `citizenHood` safe when `S.canonHoods` is absent or the cell is blank? `recordPulse_` is now keyed by `citizenHood` for every line. Does any reader of `S.neighborhoodPulse` (Phase 8 writer and others) depend on the raw key? Are there other `recordPulse_` / `remember(...)` uses of `neighborhood` that should or should not follow?
4. **Tests.** `scripts/businessOwnerDials.test.js` Cut C block and `scripts/testNeighborhoodLoop.js` C9a–e: do they fail on the parent, and do they assert what their labels claim? What is missing (e.g. the closing-now exclusion is in the business test; is a duplicate chaos outcome on one spot sane)?
5. **Truth docs + scope.** STUB maps regenerated in the commit. Anything past the plan block, or a plan item not built (e.g. the receipts are bench scripts, not engine fields)?

Done = the md exists.
