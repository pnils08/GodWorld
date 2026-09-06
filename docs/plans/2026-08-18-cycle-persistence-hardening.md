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
   `saveCycleSeed_`→`ensureSheet_`). **DONE S428 (Wave A):** `requireTab_` in
   `utilities/utilityFunctions.js`; 25 cycle-path literals converted across 19 phase/utility
   files (the `engine-wiring` card of 2026-09-06 is the inventory: 13 direct `insertSheet`
   sites + 7 `ensureSheet_` callers in `phase*/`, plus 6 `ensure*Schema_` creators in
   `utilities/`); the executor's replace/sheet paths record-and-skip a missing tab;
   `executeEnsureIntent_` stays the one sanctioned creator (`queueEnsureTabIntent_`,
   priority 25, drained before the storm). Gate run before conversion: every literal
   present on live (79 tabs) and bench (80). `Business_Archive` (the one ensure-intent
   target missing on live) pre-created on live with `BIZ_ARCHIVE_HEADERS` the same session.
2. **Timeout retry on Phase-10 persistence.** Wrap the persist executor + Phase-10 writers
   in bounded retry (2 attempts, ~10 s backoff) so a transient service stall doesn't kill the
   canonical record. **Finding (S428):** the executor has had `persistWithRetry_` (0/2/5/12 s,
   transient classes only) since S271 — the plan's own premise was half-stale. What had NO
   retry was the crash site itself, `persistHospitalLedger_`, a Phase-10 direct writer outside
   the executor and (until S428) missing from SHEETS_MANIFEST §9. **DONE S428 (Wave A):** its
   five setValues run under `persistWithRetry_`, its two appends via the new
   `appendRowWithRetry_` (compute the tail once, setValues under retry — appendRow is not
   retry-safe); same for `mirrorCarryForwardToSheet_`. The eight v3 Phase-10 writers
   (bonds/domains/seeds/hooks/textures/packet/cycle-seed/weather) stay unwrapped — filed as
   the remainder, not this wave.
3. **Crash-surviving state saves.** `PREV_*`/chaos properties: write per-cycle-keyed values
   (or guard: a loaded blob whose `cycle >= currentCycle` is a self-ghost → treat as null) so
   a crashed run can't poison its own re-fire. Removes the manual property-wipe step from
   recovery.
4. **Intent durability (design question).** Queued intents die with the run — is a
   serialized intent journal (re-persistable after crash) worth the write cost? Decide, don't
   default. **DECIDED S428: no journal.** The crash-during-executor case is exactly the case
   where the Spreadsheets service is wedged, so a journal write fails with the intents it was
   meant to save; and the two things that actually made recovery manual — a mid-run
   `insertSheet` (Task 1) and a self-ghosting carry-forward blob (Task 3) — are removed at
   the source, leaving a plain re-fire viable. A journal would double the Phase-10 write
   cost for a case the fix makes rare.
5. **Bench parity check in /pre-mortem.** A deterministic scan: tabs present on live vs
   bench; any divergence on the fire path is a warning. The Hospital_Ledger trap class.
   **DONE S428:** `scripts/preMortemScan.js` scan 7 — every `requireTab_(…, '<Tab>')` literal
   diffed against the live tab list (missing = CRITICAL, the phase will throw) and, with
   `--bench=<id>`, against the bench plus the live↔bench tab divergence (warnings).

## Acceptance

A cycle fire that hits one transient Spreadsheets stall completes with full persistence, and
a hard mid-Phase-10 crash leaves state a plain re-fire can continue from — no restore, no
property surgery.

## Changelog

- 2026-09-06 (S428, engine-sheet) — **Wave A bench proof, SANDBOX 0831 @58, C106:** ok:true 155 s, 131 phases, cycleCount 105→106, Engine_Errors 0 rows (no `requireTab_` throw — every literal present), Carry_Forward_Store keys all @106 (mirror under retry, no create), Hospital_Ledger 2→3 rows via `appendRowWithRetry_`, Cycle_Weather row 106. Predicted before the fire, every number held.
- 2026-09-06 (S428, engine-sheet) — **Wave B bench proof, SANDBOX 0831 @60:** C107 clean (ok:true 167 s, 131 phases, cycleCount 107, 0 Engine_Errors, ring = 106 + 107 rows per key, `carryForward` absent on a clean fire). Then the simulated crash: World_Config.cycleCount rolled 107→106 on the bench, re-fire → `carryForward` in the response = `PREV_EVENING_JSON` / `PREV_CYCLE_STATE_JSON` / `CHAOS_NBHD_FOLD_JSON` each `ghost-skipped` (stamped 107 ≥ cycleId 107) then `recovered-from-sheet` cycle 106; ok:true 126 s, cycleCount back to 107, 0 Engine_Errors, ring still 6 rows with only the 107 slots re-stamped (05:56Z) and the 106 rows untouched. No property wipe, no restore — the acceptance criterion as written. Recovery from a hard mid-Phase-10 crash is now: re-fire.
- 2026-09-06 (S428, engine-sheet) — Wave A shipped: Tasks 1, 2 (hospital ledger + carry-forward mirror), 4 (decided: no journal), 5. Task 3 is Wave B, its own bench proof. Wiring cards for `ensureSheet_` and `executePersistIntents_` (engine-wiring, 2026-09-06) were the inventory; the persist-executor card found `persistWithRetry_` already live since S271 and `persistHospitalLedger_` absent from SHEETS_MANIFEST §9.

- 2026-08-18 (S380) — plan created from the C104 double-crash post-mortem.
