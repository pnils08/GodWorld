# TASK — codex diff review: pipeline.93 owed responses (research-build, 2026-10-29)

**Target:** commit `933883b6` (`git show 933883b6`) — `lib/wakePerception.js`, `scripts/citizen-wake.js`, `lib/wakePerception.test.js`, plan `docs/plans/2026-10-29-owed-responses.md` (§Builder's rulings, §What the citizen is shown, §Build).

**What it does.** A listed event hitting a named citizen (high-severity chaos car, casino stake over 1,000 or net win over 500, hospital admission, arrest) holds that citizen one of R reserved wakes per Cycle, window = the event's Cycle and the next. Low-severity chaos citizen hits take the slots only from a Cycle where no listed event fired. The woken citizen's own event line is pinned in the five-line life block the voice reads.

**Builder rule to hold it against (2026-10-29):** owed picks who wakes, never what the citizen is told — no "you owe a response," no new instruction; the citizen sees its life and speaks freely. Thresholds, R=6, M=2 and absorption are the builder's calls (plan §Builder's rulings) — review the code against them, not the values.

**Gate state.** The crons run this working tree directly, so `OWED_RESERVE = 0` in the library: the live wake takes the old path. `--owed-reserve=N` is the replay override. PROD = set `OWED_RESERVE = 6` (+ its test line) after your verdict.

**Hunt, in particular:**
1. With `OWED_RESERVE = 0`, is the live wake byte-for-byte the old behavior (draw, perception, state file, logs)? `lifeTailOf` with no pins vs the old inline tail — evidence: `output/research-build/pipeline93-tail-equiv.js` (1,053/1,053 rows identical); check the claim.
2. `owedFrom` reads: severity from `utilities/chaosCarsConfig.js` (`textureOutcomes`), casino status/bar semantics (`>` not `>=`; void and open slips excluded), Judicial `ArrestCycle` as the detention trigger. Is any of these a hand table posing as derivation, or a mismatch with the writers (`phase04-events/chaosCarsEngine.js` `writeCitizenEvent_` / `chaosEventText_`, `phase05-citizens/casinoLedgerEngine.js`, `phase05-citizens/judicialLifecycle.js`)?
3. The pin: stamp `simTag(cycle)` + exact chaos text / casino and arrest regex. Can it pin the wrong line, miss the right one, or push the block past five?
4. Spend/receipts: spent only after the landed page write; a reserved wake counted once per wake; receipts and counts aged with the window; failed wake → not spent. Reserve exhaustion and forced runs.
5. Silent fallbacks: owed read failure is logged and non-fatal (same as the lived-events read) — acceptable or not?
6. Anything in the prompt path that now tells the citizen to respond, or that leaks ids/numbers it did not before.

**Evidence on disk:** `output/research-build/2026-10-29-pipeline93-c113-replay.txt` (live read-only C113 replay: 6 owed, ranking, each pinned block; one full `--dry-run --owed-reserve=6`; tail equivalence). Scripts beside it. Read them as claims. Local: `node lib/wakePerception.test.js` (137/138; the 1 failure is infrastructure.13's stale 180-cap test, pre-existing). Known, not this build: `--dry-run` still appends to `logs/citizen-wake-offered.jsonl`.

**Not allowed:** no live wake without `--dry-run`, no `--owed-reserve` on a live run, no state-file or sheet write, no code changes. A `--dry-run` makes one OpenRouter voice call + one classifier call — optional; the replay file already has one.

**Deliverable:** `docs/for-claude-review/2026-10-29-codex-pipeline93-owed-diff-review.md` with SHIP / SHIP-WITH-FIXES / HOLD, every finding with file:line and input → wrong output, registered per that folder's README, committed with a `codex:` message — your own commit only; push it if `git log origin/main..HEAD` shows only yours.
