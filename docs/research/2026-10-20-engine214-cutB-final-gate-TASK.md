# TASK — codex: final gate before PROD, engine.214 8a Cut B (engine 3ed34b61, tests + bench e33f56b6)

Read-only except Node test runs. No cron, model, Sheet write, bench, clasp or canon run. Do not commit, do not push. Write to `docs/for-claude-review/2026-10-20-codex-engine214-cutB-final-gate.md`, SHIP / HOLD per item, file:line evidence, under ~50 lines. Report in one line when done.

1. **C8f** (`git show e33f56b6 -- scripts/testNeighborhoodLoop.js`): the post-T5 tap on the real generator source closes your tests-recheck item 2 (one-sided complain multiplier)? es mutation run: T5 complain forced to 1 at composure ≥ 1 → C8f FAILS (complain 1.19 want 0.595), restored clean. Is the tap read-only and the anchor guard sound?
2. **Bench receipts** against the plan's acceptance (`docs/plans/2026-10-10-engine-214-mood-per-hood.md` step 8, "Cut B build + bench" bullet; `output/engine-sheet/2026-10-20-e214b-receipt-{A,B}-c113.json`, `2026-10-20-e214b-pair.log`, `2026-10-20-e214b-receipt.js`): both legs from the same baseline, A = stage 14 (manifest check), B = stage 15; do the receipts support es's reading (2:1 with:against, per-hood shifts within noise and traced, no old text in B, no new text in A)? Is the receipt script counting what it says (text matching incl. the venue suffix and hood-named texts; eligible/effective offer from the BASELINE copy)?
3. **PROD stage**: `output/engine-sheet/2026-10-20-push-e214b-prod.sh` — fresh PROD must equal `stage14-e305.sha256`, the one file at `ea777cae` must equal its stage-14 copy, the built stage must equal `stage15-e214b.sha256`, pull-back compared after. Any gap in the guard?

Done = the md exists.
