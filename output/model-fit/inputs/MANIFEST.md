# Model-fit-test frozen inputs — Task 1

Plan: [[../../../docs/plans/2026-09-22-agent-model-fit-test]]. Staged 2026-09-28 (S501, research-build, 6/9); open-character tier finished 2026-09-29 (kimi, 9/9).

## Staged (9 of 9)

| File | Tier | Source | Cycle |
|---|---|---|---|
| `structured-seat-1_council-d1-c104.md` | Structured decision seat | `output/cron-civic/packets/civic-office-council-d1_pending_decisions_c104.md` | C104 |
| `structured-seat-2_council-d4-c106.md` | Structured decision seat | `output/cron-civic/packets/civic-office-council-d4_pending_decisions_c106.md` | C106 |
| `structured-seat-3_council-d9-c108.md` | Structured decision seat | `output/cron-civic/packets/civic-office-council-d9_pending_decisions_c108.md` | C108 |
| `semi-open-voice-1_carmen-delaine-c104.json` | Semi-open voice | `output/cron-compare/civic_c104_carmen-delaine_packet-v2_packet.json` | C104 |
| `semi-open-voice-2_carmen-delaine-c106.json` | Semi-open voice | `output/cron-compare/civic_c106_carmen-delaine_packet-v2_packet.json` | C106 |
| `semi-open-voice-3_carmen-delaine-c108.json` | Semi-open voice | `output/cron-compare/civic_c108_carmen-delaine_packet-v2_packet.json` | C108 |
| `open-character-1_mags-narration-c108.json` | Open character — Mags | `edition_curation_c108.json` + `output/cron-compare/staged/*` (assembled by `scripts/freezeModelFitInputs.js`) | C108 |
| `open-character-2_elias-varek-interview-c108.json` | Open character — Elias Varek | **constructed** — persona files verbatim off disk + dispatch prompt per `/interview` Step 2-3 (see below) | C108 |
| `open-character-3_mags-narration-c105.json` | Open character — Mags | `edition_curation_c105.json` + `output/cron-compare/staged/*` (second stored cycle) | C105 |

**Verification basis (per Task 1's "each replays through its existing validators"):** these are not synthetic — each is the exact input pack a real production cycle already fed to its agent (council seat's `pending_decisions` datawake pack; Carmen Delaine's `stage: report` packet, confirmed via the JSON's own `stage`/`desk`/`cycle` fields) and each produced real output without failure at the time. No separate validator script exists for either pack shape to re-run standalone; production consumption IS the replay proof here. Picked 3 different districts/cycles per tier for spread, not cherry-picked for content.

## Open character voice — staged 2026-09-29 (kimi), 9 of 9 complete

**Call-shape traces (both confirmed against code this pass):**

- **Mags's Saturday narration** — `cron-saturday-run.js` `stepNarrate` (`:867-886`) calls `anthropicChat(NARRATOR_MODEL, NARRATOR_CHARGE(cycle), digest, 2200)`. Frozen input = `NARRATOR_CHARGE(cycle)` (system) + the curated-article digest (user), rebuilt from the stored curation file and staged set via `scripts/freezeModelFitInputs.js`, which uses the script's own exported `loadStagedSet` so the production proof gates (Rhea hash, contamination, style) apply. All 9 curated stems resolved and passed the gates at both C108 and C105 — nothing dropped.
- **Elias Varek interview** — NOT `citizenVoice.js` (that is the generic-citizen quote-supply path, DeepSeek). The authored interview path is the Claude Code subagent `citizen-voice-elias-varek` (`model: sonnet`), dispatched per turn by `/interview` Mode 1 Step 3: the agent boots its own persona files (SKILL.md steps 1-5: IDENTITY → disposition cache superseding IDENTITY §Your disposition → LENS → RULES → CANON_RULES) and each turn's prompt carries the brief theme + transcript-so-far + an INTERVIEW TURN framing. The frozen pack maps that onto a system/user pair: system = the full boot assembly verbatim off disk, user = the dispatch prompt.

**Elias pack is constructed, not stored.** No Elias interview exists in C104-C108 (`output/interviews/` is empty; the only interview transcript on disk is the C94 Paulson one). Per this file's earlier option 2, the pack is built from the persona files + a brief written per `/interview` Step 2, themed on real stored canon (the C108 Varek–Paulson waterfront exchange, `output/exchanges/exchange_c108_2026-09-27_conversation.md`, plus the IDENTITY.md franchise clock). `constructed: true` is set in the pack; weigh it accordingly in the report. Two caveats: the disposition cache embedded in the pack reads `Refreshed: c109` (the current cache — just outside the C104-C108 window), and the reporter's Q1 in the dispatch prompt is desk-authored for this test, not a stored artifact.

**Third input choice:** a second Mags cycle (C105) rather than a fabricated Elias follow-up turn — a follow-up would need invented Elias answers in the transcript-so-far, which the canon rules forbid. Mags's assembly is uniform across cycles, so the second pack costs nothing in fidelity and gives the tier a second stored week.

**Verification:** `node scripts/freezeModelFitInputs.js --verify` rebuilds all three packs from stored material and byte-compares (system, user, stems; persona-source SHA-256s for Elias). All three replay byte-identical as of 2026-09-29. No API calls, no network — `--verify` is local-only.

## Next (Task 2)

Scratch runner script — calls a model with a frozen input, records the plan's measures to `output/model-fit/runs.jsonl`. Not started this tick.
