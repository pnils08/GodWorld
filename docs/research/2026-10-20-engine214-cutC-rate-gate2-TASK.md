# TASK — codex: rate gate recheck, engine.214 Cut C spot rate (stage 17)

Read-only: code + docs + `output/` dumps; no cron, model, Sheet, bench, clasp, commit or push. Write to `docs/for-claude-review/2026-10-20-codex-engine214-cutC-rate-gate2.md`, SHIP / HOLD per hunt and one final SHIP / HOLD for PROD, file:line evidence, under ~30 lines. Report in one line when done.

**Your rate gate** (`docs/research/2026-10-20-codex-engine214-cutC-rate-gate.md`): diff, rate, bench, push script SHIP; PROD HOLD on the equal-weight contract (archetype trait text boosts reach a spot line through its business name). Folded at `9ac1ea99`:
- A spot entry skips the archetype pass (`git diff 80ce64a2 9ac1ea99 -- phase05-citizens/generateCitizensEvents.js`).
- C9f (`scripts/testNeighborhoodLoop.js`): the real generator with a tap after the T5 loop; citizens with social / reflective / driven 0.9, a spot named "Clockwork Noticed Coordinated Cafe" with every fact; every spot entry must weigh `SPOT_LINE_WEIGHT_`. It fails on `80ce64a2` (12.65) and passes on `9ac1ea99`; 59/59, npm 296/296.
- One clean bench leg on `9ac1ea99` (`output/engine-sheet/2026-10-20-e214c-rate1.{sh,log}`): line set byte-identical to v2 (`…-receipt-Brate-c113.lines.tsv` vs `…-v2-receipt-Brate-c113.lines.tsv`, sha `13046273`), so v2's tapped rate (0.092 per holder per fact) stands for this tree.
- Manifest `output/engine-sheet/stage17-e214c-rate.sha256` regenerated (stage 16 + the generator at `9ac1ea99`, one line differs). Push script unchanged (`…-push-e214c-rate-prod.sh`; it pushes only the one file, never the commit range).

## Hunts
1. **Fold.** Does `9ac1ea99` close the HOLD with nothing else changing (an archetype-tag weight never matched a spot tag, so skipping the whole pass for a spot entry drops only the text boosts)? Any other pass between pool build and `pickWeighted_` that can move a spot entry's weight?
2. **Proof.** Is C9f mutation-proof and is the identical line set the right proof that v2's rate applies?
3. **PROD.** SHIP or HOLD for pushing stage 17 (`9ac1ea99`, the manifest above).

Done = the md exists.
