---
title: Casino ledger 4b — review build (grok)
created: 2026-08-31
updated: 2026-08-31
type: plan
tags: [engine, citizens, draft]
sources:
  - docs/for-claude-review/2026-08-31-grok-casino-ledger.md
  - scripts/casinoLedger.js
  - phase05-citizens/casinoLedgerEngine.js
pointers:
  - "[[../for-claude-review/2026-08-31-grok-casino-ledger]] — the design this implements"
---

# Casino ledger 4b — review build (grok)

**Reviewer note:** Companion to the design in `2026-08-31-grok-casino-ledger.md`. This is the code. It is fail-closed. It has not been clasped, the tab has not been minted, ECL lines have not been `--apply`'d. On accept: land SCHEMA_HEADERS from `output/grok/casino-ledger/SCHEMA_HEADERS.snippet.md`, mint `Casino_Ledger` on bench with a HOUSE row at 250000, then bench-prove. Live deploy stays a separate Mike sign-off.

**Goal of this file:** point at every artifact so engine-sheet can review without reconstructing the session.

---

## What is in the tree

| Path | Role |
|---|---|
| `scripts/undockedEclPool.js` | Task 0 — six `ecl:kind:wager` lines (no numbers) |
| `scripts/undockedEclPool.test.js` | wager-talk assertions |
| `scripts/casinoLedger.js` | Pure Node spec (odds, resolve, stake, batch) |
| `scripts/casinoLedger.test.js` | 40+ fixture cases, `POP-TEST-*` only |
| `phase05-citizens/casinoLedgerEngine.js` | ES5 engine port, `processCasinoLedger_` |
| `phase05-citizens/generationalWealthEngine.js` | One `typeof` call before `processMoneyLoop_` |
| `scripts/casinoLedgerEngine.test.js` | Missing-tab no-op, settle, no Tier/job writes, re-run |
| `docs/engine/SHEETS_MANIFEST.md` | Tab + §9 carve-outs |
| `docs/SIMULATION_LEDGER.md` | Z is 0–12; AE is 0–6 *level*; AC writer list |
| `docs/SPREADSHEET.md` | Casino_Ledger row (unarmed) |
| `output/grok/casino-ledger/SCHEMA_HEADERS.snippet.md` | Payload for `schemas/SCHEMA_HEADERS.md` (gated — not applied) |

## What it does at runtime today

Nothing, on any spreadsheet that lacks `Casino_Ledger`. `processCasinoLedger_` logs `missing — no-op (4b not armed)` and returns. The wealth pass continues.

Once the tab exists with the 15 headers + a HOUSE row, it will settle open slips against `S.undockedFeedEntries` / `S.sportsFeedEntries` and place new ones against TargetCycle+1 UNDOCKED rows and the standing A's moneyline.

## Verify (already run 2026-08-31)

```
node scripts/casinoLedger.test.js          → casinoLedger: ok
node scripts/casinoLedgerEngine.test.js    → casinoLedgerEngine: ok
node scripts/undockedEclPool.test.js       → undockedEclPool: ok
```

## Still not this package

- `schemas/SCHEMA_HEADERS.md` (gated; snippet only)
- Live or bench `insertSheet('Casino_Ledger')`
- `node scripts/undockedEclPoolApply.js --apply`
- clasp push / live cycle
- Initiative_Tracker / faction routing
- ECL `casinosettle` flag (Task 11, parked)

## Lander steps (engine-sheet)

1. Read the design. Then read `casinoLedgerEngine.js` header.
2. Copy SCHEMA snippet into `schemas/SCHEMA_HEADERS.md`.
3. Bench only: create `Casino_Ledger` with the 15 headers, freeze row 1, one HOUSE row `HouseFloatAfter=250000`.
4. Fire a sandbox cycle. Confirm the log line `processCasinoLedger_: settled …` or `missing` if the tab was skipped.
5. Confirm Simulation_Ledger `Tier` / `RoleType` / `EmployerBizId` diffs are empty for non-test citizens on a dry read-back.
6. Do not live-deploy until Mike signs 4b.

## Wiring card pointers

- `processMoneyLoop_` @ `generationalWealthEngine.js:286` — casino now runs immediately above it
- `loadUndockedFeed_` @ `loadEventContentLedger.js:291` — unread by casino for upcoming; upcoming is a separate Undocked_Feed read of TargetCycle+1
- `Phase5-GenerationalWealth` @ `godWorldEngine2.js:374` / `:2092` — no new safePhaseCall_
