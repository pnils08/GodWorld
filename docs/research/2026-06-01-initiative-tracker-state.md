---
title: Initiative_Tracker subsystem — research
created: 2026-06-01
updated: 2026-06-01
type: reference
tags: [research, civic, engine, active]
sources:
  - Live Initiative_Tracker sheet (7 rows / 28 cols) read via lib/sheets S251
  - phase02-world-state/applyInitiativeImplementationEffects.js (PHASE_INTENSITY map — de-facto phase vocabulary)
  - phase05-citizens/civicInitiativeEngine.js (vote-ready exact-string trigger)
  - scripts/applyTrackerUpdates.js + scripts/assembleDecisions.js (the writers; ES-5 trackerOwner dispatch)
  - output/production_log_city_hall_c95_run_gaps.md §G-R1 (the silent-skip gap)
  - docs/mara-vance/INITIATIVE_TRACKER_VOTER_LOGIC.md (Status lifecycle + STALE 17-col schema)
  - docs/mara-vance/CIVIC_GOVERNANCE_MASTER_REFERENCE.md §Initiative Status Lifecycle
  - docs/plans/2026-05-11-civic-tracker-collision-schema.md (trackerOwner = who-writes contract)
  - .claude/agent-memory/health-center/MEMORY.md (drift source — agent mints its own phase strings)
pointers:
  - "[[../engine/ROLLOUT_PLAN]] — pending-state home"
  - "[[index]] — register here, same commit"
---

# Initiative_Tracker subsystem — research

**Source:** The live Initiative_Tracker (Google Sheet, 7 rows / 28 cols) plus its full read/write graph in the engine and skill layer — investigated S251 when Mike flagged engine.20c (suspected C95 sheet-write failure) and then named the tracker "becoming a mess … a crucial part of the reporting." This is the measure-twice substrate behind [[../plans/2026-06-01-initiative-tracker-contract]].

**What this addresses:** The Initiative_Tracker is load-bearing twice over — it drives the engine's Phase-2 civic ripple (neighborhood sentiment/effects) AND it's the canonical state every civic edition reports from. It has accreted multi-layer drift; the trigger was finding two of the most load-bearing initiatives (Health Center, Baylight) silently contributing ZERO engine effect.

**What it does:** Each initiative is one row. The `Status` column tracks the legislative arc (announced→passed); the `ImplementationPhase` column tracks the operational arc (announced→…→disbursement-active) and is the field the engine maps to a ripple *intensity*. Voice agents (via /city-hall) emit `trackerUpdates` objects; `assembleDecisions.js` picks one primary per (initiative, cycle) via the ES-5 `trackerOwner` contract; `applyTrackerUpdates.js` writes the sheet. The engine then reads the sheet next cycle.

**Extraction — what's usable:**
- **No canonical `ImplementationPhase` contract exists → the engine's `PHASE_INTENSITY` map (20 phases, `applyInitiativeImplementationEffects.js`) is the de-facto authority.** Any fix reconciles *to* that map. The documented "Status Lifecycle" (VOTER_LOGIC / GOVERNANCE_MASTER) is a *different column* and doesn't cover ImplementationPhase.
- **Free-form writer + fixed reader = silent drift → the root failure mode.** Pre-flight enum-policing was removed S230 (Mike: "trust engine writer validation"), but no writer actually canonicalizes the phase; the Phase-2 map silently drops unrecognized strings (intensity 0 → skipped). INIT-005 `design-development-active` + INIT-006 `active-construction-phase-2-planning` are both dark to the engine right now.
- **The drift source is the agent's own memory → fix must reach the writers, not just the sheet.** `.claude/agent-memory/health-center/MEMORY.md` tracks `design-development-active → awaiting-hcai-state-review` — the agent invents richer industry-real phase strings each cycle. Normalizing the sheet alone re-drifts next cycle.
- **The tolerance pattern already exists on one side → mirror it, don't reinvent.** `applyTrackerUpdates.js:366-383` already partial-matches these strings for *sentiment* (`design-development-active`→0.3, `active-construction…`→0.6). The Apps Script Phase-2 ripple map just never got the same tolerance. Durable fix = mirror that into the engine map (code, clasp).
- **Exact-string blast radius is small → sheet normalization is contained.** Only `civicInitiativeEngine.js:246` (`implPhase==='vote-ready'`) and `detectStuckInitiatives.js:114` (self-comparison) key on exact phase values; neither target string hits them. Safe to normalize the two rows as a stopgap.
- **The MCP/civic-packet layer disagrees with the sheet → a third drift surface.** `lookup_initiative` returned stale `disbursement-ordered`/`design-phase` (≈E89) while the sheet has `disbursement-active`/`design-development-active`. The packet the MCP reads lags the sheet.
- **"Add an initiative" has no documented procedure → blocks autonomy.** No schema/required-field/ID-assignment doc exists for minting a new INIT-00N. A human reverse-engineers it; an autonomous agent cannot do it at all.

**Not applicable / hazard:**
- **C96 deploy-attribution fence (S250):** the engine-side drift-tolerance fix is code → a 2nd clasp deploy stacked on the un-smoke-tested S247 stack (cityDynamics + simYear). It must NOT ride C96. Engine tolerance is post-C96.
- **Normalizing-down loses canon:** `design-development-active` (real "85% design + active" state) is *richer* than the map's `design-phase`. A data stopgap flattens it; the richer vocabulary deserves to be *honored* (Phase-2 tolerance), not erased. Stopgap is explicitly a patch, ratified by Mike per-row.
- **Cycle ordering caps the stopgap's reach:** /city-hall is post-engine (S248 lock), so C96's own Phase-2 ripple reads the *pre-C96* sheet regardless; a fix landing via city-hall affects C97. The stopgap is to make C96's read correct off the current rows, not to capture C96's own civic motion.

**Verdict:** `adopt` — ignites the contract-and-fine-tune plan. The subsystem works partially and has a clear, bounded repair path: a canonical contract doc (the authority), an engine that tolerates the canonical vocabulary, writers that emit it, and a documented add-initiative procedure.

**Ignited plans:** [[../plans/2026-06-01-initiative-tracker-contract]]

---

## Applications (living)

*Where this research gets used — append a dated line each time it's cited for a new corner.*

- 2026-06-01 (S251) — ignited [[../plans/2026-06-01-initiative-tracker-contract]]; engine.20c re-scoped on the G-R1 finding (the "stuck" premise is the assembler skip, not a clock reset).

---

## Changelog

- 2026-06-01 — Initial extraction (S251, engine-sheet). Diagnosis assembled from the live sheet + full read/write graph during the engine.20c investigation Mike requested. Confirms the missing `ImplementationPhase` contract is the root; existing docs cover only the `Status` column.
