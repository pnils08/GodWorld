# Brief for agy — adversarial review: pipeline.111 second pass — the morning tool loop, ask_worker, Graye, the trimmed records

**From:** research-build · **Date:** 2026-11-23 · **Your output:** `output/antigravity/2026-11-23-review-pipeline111-pass2.md` · read-only on code. LIVE on disk: Jordan Velez (business desk) writes today, Mon 2026-11-23 18:15; Elliot Graye Thu 11-26; the five culture seats Fri 11-27.

Your first review (`output/antigravity/2026-11-23-review-pipeline111-reporters.md`) was folded at `36f0eec26` (#1–#5). This pass is the work after it.

## The diff

`git log --oneline d504b94cd^..132a58668 -- scripts .claude/agents` (research-build, `pipeline.111`). Files:
- `scripts/cron-desk-run.js` — `seatMorningPlan` (a seat-file reporter's W1 plan through the writer's `openRouterToolLoop`), the W3 pass-before-packet check, ask_worker in the morning exec
- `scripts/cron-desk-writer.js` — `toolSearchWorld` export, `GODWORLD_SEAT_TOOLS` (Cultural_Ledger on sheet_read), `SEAT_ASK` + the `ask_worker` branch of `execOpenRouterTool`, worker answers → manifest
- new `scripts/workerAsk.js` — `askWorker` / `askWorkerTool` / `askExecutor` (a worker woken on `workerWake.buildWake` with a question and who asks it)
- `scripts/livedExperiencePacketV2.js` — `appendWorkerQuotes`
- `scripts/buildEconomySlice.js` (ECONOMY-SLICE-3: movers only + sector line), `scripts/buildNeighborhoodSlice.js` (HOOD-SLICE-6: one resident a hood, programs as a count), `scripts/buildFaithSlice.js` (FAITH-SLICE-3), `scripts/buildTrendsSlice.js`, `scripts/citizenVoice.js`, `scripts/newsroom-fanout.js`, `scripts/newsroom-wake-packages.json`, their tests, `.claude/agents/*/SEAT.md`

## Attack these — each against the code

1. **The morning loop.** `seatMorningPlan` returns the envelope the angle stage validates. Any path where its reply breaks `validateAngleOutput`, the resample loop, the cap-hit check (`usage` shape), or the pass handling. `require('./cron-desk-writer')` from cron-desk-run: every top-level side effect of that require (argv parsing, `TEST_SEAT`, `SEAT_FILE_PATH`, env reads) and whether any leaks into the cron's own run. `process.env.GODWORLD_SEAT_TOOLS` set in-process: anything else that reads it or inherits it (child processes the cron spawns later).
2. **ask_worker.** `workerAsk.askWorker` on `workerWake.buildWake({question, askerLine})`: any write it can cause (memory, page, moves ledger, patrol stage, Reflection_Intake) — it must cause none. The lever filter (`/_set$/`). The 2-asks cap across the morning and the writer (two separate executors — is the cap per stage or per wake?). Failure paths: a worker with no fill, a model error, a cut-off reply — what the reporter sees and whether the wake fails.
3. **Worker answers → manifest.** `appendWorkerQuotes`: the packet still passes `assertBase('W3')`; quote ids unique; the speaker an approved subject; `manifest.id` recomputed; the state file written back before the gate reads it (order against the tool-fact amend and `renderPacketIntake`). Whether `cron-rhea-gate.js` shows a `worker-answer` quote to Rhea as the named citizen's speech. A morning-only ask whose answer the writer quotes (not in the manifest) — what the gate does with it.
4. **The W3 pass fix.** The early pass read in `runWrite` — any regate or test-shell path it changes; a malformed angle file.
5. **The trimmed records.** Jordan: every business that changed headcount or sits in negative growth still on the record; the sector line; the movers cut (top 10 each way) — ties, NaN growth, a business with no prev row. Maria: one resident a hood — ordering by POPID, a hood with only staff residents. Graye: every congregation and leader; the 7-cycle window; leaders with no ledger row (`K.person` fallback) and the staff filter.
6. **Cost and loops.** The morning loop's `maxToolCalls` (6) plus ask_worker's own loop (4 reads each): the worst-case calls and tokens per reporter per wake; any path that loops past the caps.

Each finding: file:line, the failure scenario, severity. Verify every claim against the code before you write it. Do not propose a different goal or design; review what is built.
