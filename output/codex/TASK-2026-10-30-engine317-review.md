# TASK — review engine.317 (engine-sheet, 2026-10-30)

One review round + at most one re-review, then engine-sheet decides. Origin: your engine.301 gate 3 recheck (`docs/archive/for-claude-review/2026-10-25-codex-engine301-gate3-recheck.md`, "Smallest acceptable evidence": an authenticated read-only path to the same PROD project's `FIRE_ADMISSION_JSON`).

## What changed
- `3b746f0c` — `utilities/webTrigger.js` `doGet`: `action=admission` returns `{ok:true, admission:<raw FIRE_ADMISSION_JSON or null>}`; runs nothing, writes nothing. Its own key, script property `ADMISSION_READ_TOKEN`; the fire key (`CYCLE_TRIGGER_TOKEN`) also reads. Probe 2026-10-30: the PROD web app answers HTTP 200 and has NO `CYCLE_TRIGGER_TOKEN` (`{"ok":false,"error":"CYCLE_TRIGGER_TOKEN script property not set"}` on a read-only `action=checkpoint`), so PROD cannot be fired from outside; setting the read key must not change that.
- Tests: `scripts/cycleCheckpointWiring.test.js` §engine.317.
- Reader: `output/engine-sheet/2026-10-30-e317-door.js` (validates the record shape the admission code enforces, `phase01-config/godWorldEngine2.js:300-311`).
- Bench: `output/engine-sheet/2026-10-30-e317-bench.sh` → log `2026-10-30-e317-bench.log` (door reads equal + cycleCount unchanged; one fire PASS; the door then shows that Cycle done). Stage 33 manifest `output/engine-sheet/stage33-e317.sha256`.

## What to hunt
1. Any parameter combination where `action=admission` reaches `runWorldCycle`, a write, or another property; any path where the read key fires or reads anything but the record.
2. Token comparison: empty / missing / null properties, either key unset, both set.
3. What the push scripts need from the record to prove "no Cycle admitted across the window" (state, cycle, startedMs unchanged), and whether `2026-10-30-e317-door.js`'s validation matches the admission writer's states.
4. Anything else this door exposes on PROD.

## Scope
Read-only plus your review file. No web-app call, no Sheet, no deploy. Wiring card: `node scripts/runEngineAgent.js --agent engine-wiring --model anthropic/claude-haiku-4.5 --task "Target: doGet"`. Write `docs/for-claude-review/2026-10-30-codex-engine317-review.md` (file:line + input → wrong output; SHIP / SHIP-WITH-FIXES / HOLD), commit it alone.
