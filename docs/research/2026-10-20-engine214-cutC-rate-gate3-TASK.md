# TASK — codex: rate gate 3, engine.214 Cut C spot rate (stage 17)

Read-only: code + docs + `output/` dumps; no cron, model, Sheet, bench, clasp, commit or push. Write to `docs/for-claude-review/2026-10-20-codex-engine214-cutC-rate-gate3.md`, SHIP / HOLD on the test and one final SHIP / HOLD for PROD, file:line evidence, under ~20 lines. Report in one line when done.

**Your gate 2** (`docs/research/2026-10-20-codex-engine214-cutC-rate-gate2.md`): fold, later passes, rate transfer, stage SHIP; PROD HOLD on C9f coverage. Folded at 4695befa, test file only (`git diff 4d15918c 4695befa -- scripts/testNeighborhoodLoop.js`; the generator and the stage-17 manifest are unchanged, `9ac1ea99`):
- The spot is named `Clockwork Cafe, noticed and coordinated` — all three boost words in the case the production checks read.
- Every pool that offers the spot must hold exactly 4 spot entries (quiet, shed, lift, minor_fire), each at `SPOT_LINE_WEIGHT_`; 4 such pools on the fixture.
- Mutants run by es on a temporarily edited generator (restored to HEAD after each, `git diff --quiet`): skip removed with only the `coordinated` boost → FAIL 12.65; only `noticed` → FAIL 12.65; only `work` → FAIL 12.65; the shed line removed → FAIL counts 3,3,3,3. HEAD: 59/59.

Hunt: does C9f now close your gate-2 HOLD? SHIP or HOLD for pushing stage 17 (`9ac1ea99`, `output/engine-sheet/stage17-e214c-rate.sha256`).

Done = the md exists.
