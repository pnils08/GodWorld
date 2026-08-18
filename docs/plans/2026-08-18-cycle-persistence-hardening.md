---
title: Cycle persistence hardening — the C104 double-crash class
created: 2026-08-18
updated: 2026-08-18
type: plan
tags: [engine, persistence, reliability, active]
sources:
  - C104 crash logs ×2 (2026-08-18 02:49 + 03:24, Mike Drive exports) — identical signature
  - S380 live recovery (this session) — restore + property wipe + tab pre-create + bench proof
pointers:
  - "[[../engine/ROLLOUT_PLAN]] — engine.119 parent row"
  - "[[2026-08-17-sheet-weight-reduction]] — doc weight is the same disease's other symptom"
  - "[[../reference/DEPLOY]] §Sandbox — bench Hospital_Ledger divergence that hid the trap"
---

# Cycle persistence hardening

## What happened (verified, both crashes)

C104 fired twice on 2026-08-18 and died twice at the same line: `persistHospitalLedger_`
(`buildCyclePacket:864`) hit `Service Spreadsheets timed out` while lazy-creating the
`Hospital_Ledger` tab ~100 s into the run. `insertSheet` is a whole-document structural
mutation; attempted mid-write-storm on a ~17 MB / 78-tab doc it reliably times out — and
once the Spreadsheets service wedges, every remaining write dies:
`executePersistIntents_: Executed 0 intents (28 errors)`, Phase 10/11 all down, cycleCount
never advances. engine.105 (deployed post-C103) is what put the lazy-create on the fire
path; the bench never caught it because `Hospital_Ledger` was bench-only (documented in
DEPLOY.md, unconnected pre-fire).

Recovery that worked (2× proven): sheet version-history restore → delete the 3 script
properties (`PREV_EVENING_JSON`, `PREV_CYCLE_STATE_JSON`, `CHAOS_NBHD_FOLD_JSON` — the
crashed run overwrites them post-wedge) → pre-create the tab via API → bench fire
(`ok:true`, 129 phases) → clear to re-fire.

## Tasks

1. **No runtime sheet creation on the cycle path.** Every `insertSheet`/`ensureSheet_`
   lazy-create reachable from `runWorldCycle` becomes a fail-loud precondition (tab missing →
   one Engine_Errors row + skip phase, never create mid-run). Setup creates tabs
   deliberately. Same doctrine as economy-plan D4; codex's engine.104 vet already
   inventoried several sites (`godWorldEngine2.js:98`, `generationalWealthEngine.js:1276`,
   `saveCycleSeed_`→`ensureSheet_`).
2. **Timeout retry on Phase-10 persistence.** Wrap the persist executor + Phase-10 writers
   in bounded retry (2 attempts, ~10 s backoff) so a transient service stall doesn't kill the
   canonical record.
3. **Crash-surviving state saves.** `PREV_*`/chaos properties: write per-cycle-keyed values
   (or guard: a loaded blob whose `cycle >= currentCycle` is a self-ghost → treat as null) so
   a crashed run can't poison its own re-fire. Removes the manual property-wipe step from
   recovery.
4. **Intent durability (design question).** Queued intents die with the run — is a
   serialized intent journal (re-persistable after crash) worth the write cost? Decide, don't
   default.
5. **Bench parity check in /pre-mortem.** A deterministic scan: tabs present on live vs
   bench; any divergence on the fire path is a warning. The Hospital_Ledger trap class.

## Acceptance

A cycle fire that hits one transient Spreadsheets stall completes with full persistence, and
a hard mid-Phase-10 crash leaves state a plain re-fire can continue from — no restore, no
property surgery.

## Changelog

- 2026-08-18 (S380) — plan created from the C104 double-crash post-mortem.
