---
title: Civic deep seats — engine routing cuts (hook consumption, conduct events, tab drift)
created: 2026-09-15
updated: 2026-09-15
type: reference
tags: [research, civic, newsroom, pipeline68, active]
sources:
  - S443+ kimi session — civic-lane audit + scripts-side fix (builder-directed lane program; scope FULL COURSE ruled 2026-09-15)
  - docs/plans/2026-09-07-beat-slices-from-sheets-plan.md — pipeline.68
  - docs/research/2026-09-10-kimi-faith-lane-routing.md — storyHook machinery (engine.189)
pointers:
  - "[[../plans/2026-09-07-beat-slices-from-sheets-plan]] — the plan this extends"
  - "[[../SIM_DOCTRINE]] §13 — gate the facts, not the color"
---

# Civic deep seats — engine routing cuts

**Verdict: adopt.** The deepest-data desk saw the least raw data; that is now
closed scripts-side. What remains is engine-side.

## What landed scripts-side (kimi + delegated coder, this session)

- `scripts/dumpBeatTabs.js` — four civic tabs added as OPTIONAL:
  `Initiative_Tracker` (6 rows), `Civic_Office_Ledger` (999 rows live, of which
  ~964 are pre-sized blanks — the builders filter to the 35 real ones),
  `Election_Log` (exists, empty — no elections run yet), `Civic_Ledger`
  (exists, empty — see drift note below). Dump is 16 core + 6 optional = 22
  tabs.
- `scripts/buildCivicDomainSlice.js` (Carmen/Luis only; the four legacy
  fallback seats untouched):
  - Carmen: `trackerFacts` — initiatives whose Status/ImplementationPhase/
    VoteCycle/Outcome moved vs `prev/`, plus current office holders with
    approvals — appended to anchorFacts (record facts); her named CIVIC hooks
    as colour.
  - Luis: his named CIVIC hooks (65 all-time — the best-addressed seat in the
    deck), `stalling` (initiatives with identical status+phase vs prev/),
    `factions` (Faction/VotingPower standings). Colour/pointers only.
- `scripts/buildJaxSlice.js`: `scandalRows` — offices with Status scandal OR
  `AutoScandalUntilCycle` >= current cycle (the live scandal field — Status
  stays `active` during a seeded scandal; `AutoScandalSource` carried) + his
  named hooks.
- Both builders soft-attach: absent/stale dump = empty structures, spine
  (desk_signal / stink-scanner) unchanged, never a throw.
- Live smoke at C107: Luis already picks up a real CIVIC hook from the dump;
  no scandal rows this cycle (correct).

## Proposed engine cuts (gated — phase*/utilities land through engine-sheet)

**Cut 1 — cross-desk theme leak.** Hal Richmond (sports historian) is named on
17 all-time CIVIC hooks — the `suggestStoryAngle_` theme scorer leaks across
desks. Same fix family as the SPORTS monopoly cut
(`docs/for-claude-review/2026-09-15-kimi-sports-lane.md`): honor the desk's
signal-map seat before theme scoring, or cap per-journalist assignments.

**Cut 2 — conduct events are memory-only.** `runConductEngine.js` writes
conduct events to LifeHistory_Log and `S.conductEvents` (line 328) — the
accountability desk's core material — but nothing persists them to a tab or
hook. The newsroom's only windows are the office-ledger scandal fields (now
dumped) and whatever ripples into desk_signal. Proposed: emit a CIVIC hook
per conduct event (they fit makeHook's world-event path) or persist
S.conductEvents to a tab. Jax and Luis are the consumers.

**Drift to fix — `Civic_Ledger` the tab has no writer.**
docs/engine/SHEETS_MANIFEST.md lists `Civic_Ledger` as the factions tab, but
`updateCivicLedgerFactions.js` actually writes `Faction`/`VotingPower` onto
`Civic_Office_Ledger`. The tab exists and is empty. Either delete it and fix
the manifest, or give it a writer. (Slices now read factions from the office
ledger, with Civic_Ledger as fallback.)

## Wiring card status

OpenRouter key-limit 403 persists — no card run possible this session. Civic
tab contracts verified by direct code read against the writers
(civicInitiativeEngine.js, updateCivicApprovalRatings.js, runCivicElectionsv1.js,
updateCivicLedgerFactions.js) and the live C107 dump contents.

## Note — 2026-09-15 (kimi)

Wiring card landed after the OpenRouter limit was lifted:
`output/agent_engine-wiring_2026-09-15T22-05-35.md` (Initiative_Tracker). The
"wiring card status" section above is superseded.
