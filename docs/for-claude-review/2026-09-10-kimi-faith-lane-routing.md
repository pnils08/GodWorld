---
title: Faith lane — engine routing fixes (storyHook deskMap, seed contract, faithStorySignals)
created: 2026-09-10
updated: 2026-09-10
type: reference
tags: [research, faith, newsroom, pipeline68, active]
sources:
  - S441 kimi session — faith-lane audit and scripts-side fix (builder-directed, lane-by-lane media data program)
  - docs/plans/2026-09-07-beat-slices-from-sheets-plan.md — pipeline.68 (Task 4 built the faith slice; these are the engine-side gaps found behind it)
  - output/agent_engine-wiring_2026-09-10T05-21-25.md — wiring card for Faith_Ledger (attached below)
pointers:
  - "[[../plans/2026-09-07-beat-slices-from-sheets-plan]] — the plan this extends"
  - "[[../SIM_DOCTRINE]] §13 — gate the facts, not the color"
---

# Faith lane — engine routing fixes

**Verdict: adopt.** The engine produces a real faith event stream and aims it at
Elliot Graye in three places; all three die one hop short of the newsroom. The
scripts-side half landed this session (kimi); the three engine cuts below are
proposed for engine-sheet.

## Findings (verified against code + the C106 beat dump)

1. **Faith_Ledger is written every cycle and read by no one in the newsroom.**
   Phase4-FaithEvents (`phase04-events/faithEventsEngine.js:79`) writes up to 5
   events/cycle (6 types: regular_service, holy_day, community_program,
   interfaith_dialogue, outreach, crisis_response) via
   `utilities/ensureFaithLedger.js:615`. Only `scripts/buildFaithDigest.js` and
   `scripts/buildFaithCards.js` ever read it — the digest feeds the *culture
   desk* briefing (`scripts/buildDeskFolders.js:486`), not Graye. **Fixed
   scripts-side this session:** Faith_Ledger added to `scripts/dumpBeatTabs.js`;
   `scripts/buildFaithSlice.js` v FAITH-SLICE-2 leads with the last 7 cycles of
   events (he publishes Thursdays), crisis/holy-day first, and puts event-org
   leaders on the record.

2. **Story_Hook_Deck FAITH rows all route to "City Desk".**
   `phase07-evening-media/storyHook.js:99-120` `deskMap` has no `FAITH` key, so
   `getDesks()` falls through to `'City Desk'` (line ~119) and
   `suggestStoryAngle_` never names Graye. Live evidence: 47 FAITH-domain rows
   in the C106 dump, every one `SuggestedDesks: "City Desk"`,
   `SuggestedJournalist: ""`.

3. **Story_Seed_Deck faith seeds route to the culture desk.**
   `phase07-evening-media/buildContractSeeds.js:42` maps `'faith-event' → 'COMMUNITY'`
   and lines 61-68 map `COMMUNITY → 'culture'`; `CONTRACT_SEED_SIGNAL` (238-245)
   has no FAITH entry. Every holy_day seed leaves the engine stamped for the
   culture desk.

4. **`S.faithStorySignals` is produced for Graye and consumed by nothing.**
   `getFaithStorySignals_` (`phase01-config/godWorldEngine2.js:433-441`) tags
   signals `desk: 'faith'`, `reporter: 'Elliot Graye'` — correct targeting, no
   reader anywhere in the repo.

5. **Fixed scripts-side, no engine action:** `buildFaithSlice.js` SEAT.popid was
   `POP-00159` — that POPID is **Sharon Okafor** (Lifestyle). The ledger's Graye
   is `POP-00012` (verified against `output/simulation_ledger_snapshot.jsonl`;
   `utilities/rosterLookup.js:47` agrees). Slice and test corrected.

## Proposed engine cuts (gated — phase*/utilities land through engine-sheet)

**Cut 1 — storyHook.js deskMap.** Add `'FAITH': 'Faith Desk'` to the `deskMap`
at `phase07-evening-media/storyHook.js:99-120`, and give `suggestStoryAngle_`
(:192-195) a faith theme match so `SuggestedJournalist: 'Elliot Graye'` lands on
FAITH hooks. Note: the world-event hook loop (:910-925) only hooks severity
`'medium'` — for faith that means only `crisis_response`. That is fine; holy
days and outreach already reach the slice via Faith_Ledger.

**Cut 2 — buildContractSeeds.js seed contract.** Add a FAITH row to all three
tables: `CONTRACT_SEED_DOMAIN` (`'faith-event' → 'FAITH'`, line 42),
`CONTRACT_SEED_DESK` (`'FAITH' → 'faith'`, lines 61-68), `CONTRACT_SEED_SIGNAL`
(lines 238-245). Verify against `utilities/rosterLookup.js:829` that the faith
signal scores Graye rather than the COMMUNITY generalist pool.

**Cut 3 — `S.faithStorySignals`: persist or delete.** Either write the signals
into Story_Hook_Deck (they are already correctly tagged for Graye — cheapest
consumer is cut 1 + 2 doing that job) or delete the field as dead state.
Recommend: delete once cuts 1-2 land, since the hook deck becomes the carrier.

## Out of scope, noted

- `scripts/buildEveningSlice.js:713` still carries a Graye "faith bag" with
  "Packet institutions only" — dead for his seat since S434 (he leaves the
  evening pack), swept by pipeline.68 Task 5.
- The C106 dump predates the Faith_Ledger tab; the slice fails loud until
  `dumpBeatTabs.js` re-runs (next cycle's Step 5.56, or a manual run).

## Wiring card — Faith_Ledger

Full report: `output/agent_engine-wiring_2026-09-10T05-21-25.md` (haiku, 14
turns, 5 files opened). Load-bearing lines verified during the scripts-side
work:

- SCHEMA (append-safe, engine.119): `Timestamp, Cycle, Organization,
  FaithTradition, EventType, EventDescription, Neighborhood, Attendance, Status`
  — `utilities/ensureFaithLedger.js:20-30`, ensured by `ensureFaithLedgerSchema_`
  (:393).
- WRITERS: `runFaithEventsEngine_` @ `phase04-events/faithEventsEngine.js:79` →
  `batchRecordFaithEvents_` @ `ensureFaithLedger.js:615` →
  `queueBatchAppendIntent_` (:638), Phase4 BEFORE Phase10-ExecuteIntents.
- READERS (pre-existing): `scripts/buildFaithCards.js:437`,
  `scripts/buildFaithDigest.js:76`.
- CYCLE ROLLBACK: `cycleCol: 'Cycle'` @ `utilities/cycleRollback.js:52, 278`.
- MANIFEST: `docs/engine/SHEETS_MANIFEST.md:44` — "Events generated by faith
  communities."
