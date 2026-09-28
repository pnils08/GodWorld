# Model-fit-test frozen inputs — Task 1

Plan: [[../../../docs/plans/2026-09-22-agent-model-fit-test]]. Staged 2026-09-28 (S501, research-build).

## Staged (6 of 9)

| File | Tier | Source | Cycle |
|---|---|---|---|
| `structured-seat-1_council-d1-c104.md` | Structured decision seat | `output/cron-civic/packets/civic-office-council-d1_pending_decisions_c104.md` | C104 |
| `structured-seat-2_council-d4-c106.md` | Structured decision seat | `output/cron-civic/packets/civic-office-council-d4_pending_decisions_c106.md` | C106 |
| `structured-seat-3_council-d9-c108.md` | Structured decision seat | `output/cron-civic/packets/civic-office-council-d9_pending_decisions_c108.md` | C108 |
| `semi-open-voice-1_carmen-delaine-c104.json` | Semi-open voice | `output/cron-compare/civic_c104_carmen-delaine_packet-v2_packet.json` | C104 |
| `semi-open-voice-2_carmen-delaine-c106.json` | Semi-open voice | `output/cron-compare/civic_c106_carmen-delaine_packet-v2_packet.json` | C106 |
| `semi-open-voice-3_carmen-delaine-c108.json` | Semi-open voice | `output/cron-compare/civic_c108_carmen-delaine_packet-v2_packet.json` | C108 |

**Verification basis (per Task 1's "each replays through its existing validators"):** these are not synthetic — each is the exact input pack a real production cycle already fed to its agent (council seat's `pending_decisions` datawake pack; Carmen Delaine's `stage: report` packet, confirmed via the JSON's own `stage`/`desk`/`cycle` fields) and each produced real output without failure at the time. No separate validator script exists for either pack shape to re-run standalone; production consumption IS the replay proof here. Picked 3 different districts/cycles per tier for spread, not cherry-picked for content.

## Not staged — open character voice (3 of 9)

Elias Varek interview prompt + Mags's Saturday narration prompt. Searched `output/` for stored C104-C108 invocations of either — none found (no interview log, no narration output under either name). This is not a new gap: the plan's own Open Questions (§Open questions, line 2) already flagged "which real Elias Varek and Mags prompts to freeze" as unresolved when filed 2026-09-21. Two ways to close it, for whoever picks this back up:

1. Run each agent once for real (via whatever normally invokes them — Discord interview flow for Elias, the Saturday narration skill for Mags), archive that real output's input pack. Costs one real invocation per agent before the test even starts.
2. Construct the prompt from the persona file + a frozen ledger snapshot (persona facts must come from the ledger, never memory, per the plan) — not a "real" production pack, so this weakens the test's premise a little; flag it in the report if used.

Did not decide between these — it is a real call, not obviously mine to make solo, and the plan already parks it as an open question rather than a rb ruling.

## Next (Task 2)

Scratch runner script — calls a model with a frozen input, records the plan's measures to `output/model-fit/runs.jsonl`. Not started this tick.
