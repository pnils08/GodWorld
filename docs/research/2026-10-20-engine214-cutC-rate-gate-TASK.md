# TASK — codex: one gate before PROD, engine.214 Cut C spot rate (stage 17)

Read-only: code + docs + `output/` dumps; no cron, model, Sheet, bench, clasp, commit or push. Write to `docs/for-claude-review/2026-10-20-codex-engine214-cutC-rate-gate.md`, SHIP / HOLD per hunt and one final SHIP / HOLD for PROD, file:line evidence, under ~50 lines. Report in one line when done.

**Builder ruling (verbatim, plan engine.214 step 8):** "Let’s change the ratio to happen 1 every 10 cycles". The rate reported at stage 16 was ≈ 1 in 30–60 Cycles per holder per fact. es reads one number as one rate: every spot fact at one weight.

**Candidate:** PROD @153 (stage 16) + `phase05-citizens/generateCitizensEvents.js` at `80ce64a2` (`git diff 72dacd68 80ce64a2`): (a) `ab85b32f` — `SPOT_LINE_WEIGHT_ = 11` for every spot fact, was chaos 3 / quiet 2–5 by streak / shed 2 / recovery 2 / lift 1.5; (b) `80ce64a2` — a spot line skips the 12% "near <venue>" append (`spotTag_`), found on the first rate bench ("has watched Ivy Hill Market go quiet lately near a small park"). Manifest `output/engine-sheet/stage17-e214c-rate.sha256`. Push script `output/engine-sheet/2026-10-20-push-e214c-rate-prod.sh` (copied from `…-push-e214c-prod.sh`).

## Evidence
Plan engine.214 step 8, block "Cut C rate build + bench"; `output/engine-sheet/2026-10-20-e214c-rate.{sh,log}`; receipts `…-receipt-{Brate,Bratediag}-c113.json` + `.lines.tsv`, tap row `…-ratediag-c113.json` (first run: `…-v1-*`). Taps: `git diff 80ce64a2 ab198c16` (v1: `git diff ab85b32f d8536789`, the same taps).
- v1 `ab85b32f`: sha `a0a9ee9f` both legs; offered 151 spot lines; expDraws 14.53 → 0.096 per offered line; drawn 15; a quiet line drew "… go quiet lately near a small park" → fix (b).
- v2 `80ce64a2`: sha `13046273` both legs; offered 147 (lift 132 / quiet 11 / shed 4); expDraws 13.50 → 0.092 (lift 0.090, quiet 0.104, shed 0.113); drawn 8 lift; 4 first-draw pulses Up, Jack London; 0 wrong-spot, 0 strays, 0 "near" on spot lines.
- The `Spot_Diag` tab is not in the baseline, so reset leaves earlier rows; the script reads the last C113 row (rows 3 at v2; the read row carries `expByEv`, which only the new taps write).
- Stage 17 manifest vs stage 16: one line, `generateCitizensEvents.js`.

## Hunts
1. **Diff.** Is `72dacd68..80ce64a2` only the weight and the venue skip (tags, texts, facts, pick and pulse untouched)? Is the venue skip placed before `chanceHit(0.12)` acceptable (no rng consumed for a spot line), and is C9d's new assertion mutation-proof? Does anything downstream cap or rescale a `source:nbhdState` entry without a `react:` tag (archetype weights, T5 dial loop, grief, continuity penalty, `balanceContentLedgerPoolWeights_`) so that 11 is not what reaches `pickWeighted_`?
2. **Rate.** Do the taps measure what the ruling asks (per holder per fact, ≈ 0.10)? Is `expDraws` (sum over slots of spot mass / usable mass) the right estimator of draws given the within-Cycle no-repeat and the recent-text filter? Are the taps neutral (line-set sha Bratediag = Brate)?
3. **Bench.** 0 lines naming a spot that is not the citizen's; grade by fact; first-draw pulses land on the parent hood with the line's sign.
4. **Push script.** PRE `72dacd68`, base manifest stage 16, one file, manifest pinned and committed as-is. Anything that could push a tree other than the benched one?
5. **PROD.** SHIP or HOLD for pushing stage 17. C113 watch and rollback (the file from `72dacd68`).

Done = the md exists.
