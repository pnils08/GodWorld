# TASK — codex: gate 3 (bench receipt → PROD) on engine.301 F1, candidate `1e6beff5`, one round

Read-only; no cron, model, Sheet write, bench or canon run. Do not commit, do not push. Write to `docs/archive/for-claude-review/2026-10-25-codex-engine301-gate3.md`, SHIP / HOLD with file:line evidence, under ~40 lines. Report in one line when done.

Your gate 2 (`docs/archive/for-claude-review/2026-10-25-codex-engine301-diff-gate2.md`): code SHIP; the receipt / probe FIXes are folded in `e778f99d`. The bench ran on `1e6beff5` with those scripts:
- Log: `output/engine-sheet/2026-10-25-e301-bench.log` (stage 26 push + pull-back, both resets, every fire, every receipt line, the restore to the stage-25 manifest).
- Leg P (intervention probe — Fruitvale wave on the C112 carry = consumer; Baylight PropertyCrimeIndex −10 = producer; post-probe snapshot `output/engine-sheet/2026-10-25-e301-crime-P-c112.json`): `…-e301-receipt-P-c113.json`, `…-P-c114.json` (window inside c114).
- Leg S (organic, C113–C137): `…-e301-receipt-S-c113.json` … `…-S-c137.json`; window in `…-S-c137.json` (`window`).
- Note: C114 and C127 carry 12 and 14 measured rises citywide in both legs (leg S has no probe) — the crime engine's own rhythm, not the intervention.
- PROD push (dry-run passed 2026-10-25 04:4x: fresh PROD = stage 25, built = `stage26-e301.sha256`, live at C112): `output/engine-sheet/2026-10-25-push-e301-prod.sh`.

1. Do the receipts show what your gate 2 §3 required: typed C/C−1 carry, the producer's observed delta and carry (P C113), the consumer's level 3 + receipt + Phase-5 lines (P C113 Fruitvale, P C114 Baylight), a complete S window with zero holds, zero Engine_Errors, and the stage-25 restore manifest?
2. The PROD push script vs the stage-25 scripts it copies: anything that would push a tree other than the benched one, or miss a straddle with tonight's live fire?
3. SHIP or HOLD for PROD. (Zero organic waves in 25 Cycles is the measured rate — the builder's call, not a gate.)

Done = the md exists.
