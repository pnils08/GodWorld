# TASK — codex: final gate 2 before PROD, engine.214 8a Cut C

Read-only: code + docs + `output/` dumps; no cron, model, Sheet, bench, clasp, commit or push. Write to `docs/for-claude-review/2026-10-20-codex-engine214-cutC-final-gate2.md`, SHIP / HOLD per hunt and one final SHIP / HOLD for PROD, file:line evidence, under ~60 lines. Report in one line when done.

**Your gate 1** (`docs/research/2026-10-20-codex-engine214-cutC-final-gate.md`): fold, push script and watch contract SHIP; PROD HOLD because the reach read lacked real-fire offered / filtered / whole-pool / pulse. Folded since then:
- The push script refuses a manifest that is not committed as-is (`output/engine-sheet/2026-10-20-push-e214c-prod.sh`).
- A real-fire spot receipt (plan step 8, block "Real-fire spot receipt", `docs/plans/2026-10-10-engine-214-mood-per-hood.md`).

## The receipt
- **Bdiag:** `72dacd68` plus read-only taps, a dangling bench-only commit `15a1e2ac` (never merged; `git show 15a1e2ac -- phase05-citizens/generateCitizensEvents.js`). It wrote one `Spot_Diag` row (`output/engine-sheet/2026-10-20-e214c-spotdiag-c113.json`).
- **Neutral taps:** its C113 line set sha is `330ba1da`, identical to B2 (`output/engine-sheet/2026-10-20-e214c-spotdiag.log`, receipts `-Bdiag-` / `-B2-`). The taps don't move the run, so the counts are B2's fire.
- **Offered:**
  - 915 citizens through the pool build, 148 offered a spot line (lift 135 / quiet 13 / shed 4)
  - offered spot mass 262.5 against a mean whole pool of 267.5 per offered citizen
- **Draw slots:**
  - 2351 slots, 368 with a spot line usable
  - spot weight 659 of usable mass 97,582 at those slots
  - 2 spot entries filtered at draw
  - expected ≈ 2.5 draws, drawn 1
- **Pulse:** the one drawn line was not a first draw (`firstDraw: 0`), so 0 spot pulses is the correct outcome, not a missing receipt. The pulse path on the real generator is C9e (`scripts/testNeighborhoodLoop.js`, the Claremont-only run and the sign / parent-hood assertion).
- **Halted first sitting:** it HALTed on a sheet-wide Spreadsheets timeout at persistence (every tab, `bench advanced 0`, live untouched). It was retried once after a clean read.

## Hunts
1. **Taps.** Are the `15a1e2ac` taps read-only and placed where they claim (pool complete after T5, usable pool after the balance and before `pickWeighted_`, the drawn entry, the first-draw pulse)? Is the sha match sufficient proof that they did not change the fire?
2. **Reach.** Do the receipt numbers close your reach HOLD (offered, filtered, whole-pool, drawn, pulse)? The rate they imply is ≈ 1 in 30–60 Cycles per holder per fact at these weights. That rate is a sim dial for the builder, not a gate. Say if anything in the numbers contradicts the mechanism.
3. **The halt.** Is anything about the timed-out first sitting a risk to PROD (the code under test, or only the bench document)?
4. **PROD.** With the fold, the push-script guard and this receipt: SHIP or HOLD for pushing stage 16 (`72dacd68`, `output/engine-sheet/stage16-e214c.sha256`)?

Done = the md exists.
