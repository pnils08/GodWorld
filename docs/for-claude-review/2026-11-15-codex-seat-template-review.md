# Seat template review — commit `463e3d009`

**Verdict: HOLD**

## Findings

1. **Mayor event data can include build metadata in the seat's wake.** `scripts/seatWake.js:99-100` falls back to `JSON.stringify(e)` when an event has no `text`, `summary`, or `label`. The supplied Mayor print demonstrates this at `output/engine-sheet/2026-11-15-seat-wake-print.mayor.txt:69-71`: the wake includes `sourceRef` file paths and `retrievalKey` values. For example, an event with only `{fact: "...", sourceRef: "output/beats/feed.jsonl:238", retrievalKey: "event/EV-1"}` is handed over with those build fields intact. This violates the data-block boundary and risks making retrieval/file details part of seat-facing input. Render a selected fact field or omit events without a human-facing field.

2. **A missing/unreadable resident snapshot is reported as an empty city ledger.** `scripts/seatWake.js:50-54` converts every read error into `[]`; `ledgerResidents` at `:235-236` uses that result directly. Then `toolExecutor` at `:261-271` tells the seat a named resident is not on the ledger (or no resident lives in a neighborhood). Concrete input: `simulation_ledger_snapshot.jsonl` is missing or unreadable and the tool receives `{name: "Ada Lane", question: "How is the block?"}`; it returns `no one by the name Ada Lane is on the city's ledger` instead of saying the lookup is unavailable. This is a silent data failure, not a true negative lookup.

3. **Repeated proposal calls in one wake bypass the `already filed` guard.** `scripts/seatWake.js:246-253` deduplicates only when `raw.initiativeId` is truthy, but `initiative_propose` builds a `propose` move without an `initiativeId` at `:283-285`. Concrete input: the model calls `initiative_propose` twice with the same title, purpose, category, reach, hoods, and budget. Both calls return `filed`; `validateDatawakeMoves` accepts both under `perRuleMoves` (`scripts/cron-civic-run.js:3088-3093`), and the ledger assigns them separate IDs (`scripts/seatWake.js:301-308`). At close, the second same-title candidate is skipped by the retry-identity check in `scripts/applyTrackerUpdates.js:760-777`, but the duplicate call was already recorded as accepted and is treated as a successful candidate outcome. The wake therefore records two filed decisions for one proposal, with misleading continuity/outcome history.

## Checks and limits

- `node --test scripts/seatWake.test.js` — PASS (exit 0).
- Source trace: `SEAT_TEMPLATE` requires `--seat-template` plus `--dry-run` or `--no-write` (`scripts/cron-civic-run.js:3745-3747`). The live writing branch begins after the no-write branch and does not call `runSeatDatawake`; its existing seat path remains in place. The chief's worker path was not changed by this commit.
- `perRuleMoves` is set only by `seatMoveCtx` (`scripts/cron-civic-run.js:3749-3764`); the ordinary legacy validator path retains its one-consequential-move cap. Call-vote and renewal each check one pending move per initiative against the weekly ledger (`scripts/cron-civic-run.js:2895-2901`, `2945-2951`), and district/row eligibility checks remain active.
- New `:2`/`:3` IDs are folded as opaque `moveId` keys by the inspected move-ledger readers; no inspected reader parses a suffix or assumes one move per seat-day.
- `resident_call` uses `citizenVoice.js --json` without `--record` (`scripts/seatWake.js:223-226`); `citizenVoice.js:13-18, 356-374` documents that default as read-only. The child has a 180-second timeout. I did not execute the seat wake or resident call because those make model API calls.
- The required wiring-card command (`node scripts/runEngineAgent.js --agent engine-wiring --model anthropic/claude-haiku-4.5 --task "Target: runSeatDatawake, validateDatawakeMoves"`) failed with `[FATAL] Connection error`; no retry was made. Wiring-card verification remains unavailable.
