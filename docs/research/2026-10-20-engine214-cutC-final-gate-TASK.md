# TASK — codex: final gate before PROD, engine.214 8a Cut C (the citizen's spot)

Read-only: code + docs + `output/` dumps; no cron, model, Sheet write, bench or canon run, no clasp. Do not commit, do not push. Write to `docs/for-claude-review/2026-10-20-codex-engine214-cutC-final-gate.md`, SHIP / HOLD per hunt and one final SHIP / HOLD for PROD, file:line evidence, under ~80 lines. Report in one line when done.

**Candidate:** PROD @152 (stage 15) + `phase05-citizens/applyBusinessDynamics.js` and `phase05-citizens/generateCitizensEvents.js` at `72dacd68` (your diff review folded), manifest `output/engine-sheet/stage16-e214c.sha256`. Push script `output/engine-sheet/2026-10-20-push-e214c-prod.sh` (dry run passed: fresh PROD pull = stage 15, built tree = the manifest). Contract and bench record: `docs/plans/2026-10-10-engine-214-mood-per-hood.md` step 8, the blocks "Codex Cut C recheck", "Cut C build", "Cut C bench". Your reviews: `docs/research/2026-10-20-codex-engine214-cutC-recheck.md`, `…-cutC-diff-review.md`.

## Hunts
1. **The fold.** Is `72dacd68` vs `a137ea9b` exactly your diff-review findings: publication as the last statement, one line per chaos kind, tests (rank vs published vectors, forced tie, Claremont-only pulse, throw at the final log), STUB attribution? Is B2's line set identical to B's (`output/engine-sheet/2026-10-20-e214c-diag.log`, receipts `-B-` vs `-B2-`) the right proof that the fold is neutral on an ordinary fire?
2. **Bench acceptance (your reach HOLD).** Receipts `output/engine-sheet/2026-10-20-e214c-receipt-{A,B,B2,Bnolift}-c113.json` + `.lines.tsv`, draw probe `…-e214c-drawprobe.json`. Does the evidence close the reach hold?
   - per-hood eligible / drawn
   - 0 wrong-spot lines
   - the graded tag on the one drawn line
   - the probe's per-event draws and pool share
   Is the A/B divergence explanation sound? Check it against the lines yourself (`output/engine-sheet/2026-10-20-e214c-diverge.js`):
   - first differing citizen at ledger row 8, Downtown
   - Bnolift identical to A up to row 298, the first holder of a spot with news
   What would make it wrong?
3. **Push script.** `2026-10-20-push-e214c-prod.sh` vs the Cut B one it was copied from:
   - base manifest stage 15, PRE `3ed34b61`, both files
   - the manifest guard pinned to `stage16-e214c.sha256`
   - the deployment pin check and the pull-back
   Anything that could push a tree other than the benched one?
4. **C113 live expectations.** What should the first live fire (Sun 2026-10-25) show, and what would mean rollback? Rollback = the two files from `3ed34b61`.

Done = the md exists.
