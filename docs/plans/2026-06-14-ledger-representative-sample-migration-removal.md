---
title: Simulation_Ledger is a Representative Sample — Permanent Nodes, Migration-Off-Ledger Removal, Ingest Reject-Not-Mint
created: 2026-06-14
type: plan
status: open
owner: engine-sheet
tags: [engine, simulation-ledger, migration, ingest, lifecycle, architecture, S257-directive]
sources:
  - Mike-direct, S257 (2026-06-14) — the core design principle + the directives below
  - scripts/ingestPublishedEntities.js (ingest append path — engine-sheet owned)
  - phase05-citizens/migrationTrackingEngine.js (writes the 6 ledger migration cols)
pointers:
  - "[[../index]] — registered same commit"
  - "[[../engine/ROLLOUT_PLAN]] — pointer row"
  - "[[2026-05-30-citizen-lifecycle-fame-system]] — death/retirement (same 1:438 flaw)"
---

# Simulation_Ledger is a Representative Sample — the load-bearing principle

**Mike-direct, S257.** This document captures the design logic a prior session
failed to hold, so the next session starts from truth. It is the WHY behind
three directives (migration removal, the deletion flaw, ingest reject-not-mint).

## The principle (everything below follows from this)

**The Simulation_Ledger is a REPRESENTATIVE SAMPLE, not a 1:1 census.**
Ratio ≈ **1 ledger node : 438 sim-people** (Mike, S257 — reconcile the exact
figure against canonical population before relying on it; the *principle* is the
point, not the digit).

**Therefore every node is PERMANENT.** A node cannot move out, die, or retire
*as an individual event*, because:

> One node represents ~438 people. If a single node "moves / dies / retires,"
> you are asserting **438 people moved / died / retired** that cycle — and you'd
> need engine output at that scale to justify it. The engine would never produce
> that. So an individual-node lifecycle-exit is **invalid by construction.**

This is not a style preference — it is arithmetic. Individual-node removal on a
representative-sample ledger silently multiplies the event by the ratio.

## What this invalidates (current flaws)

1. **The per-citizen migration loop on the ledger.** 6 columns —
   `DisplacementRisk`, `MigrationIntent`, `MigrationReason`,
   `MigrationDestination`, `MigratedCycle`, `ReturnedCycle` — model an
   *individual* citizen leaving. That's the inversion: a node can't leave.
2. **Citizen deletion.** Worse than "marked as moving," the mechanism appears to
   **drop nodes** — there are **115 POPID gaps** in POP-00001..01021 (verify
   which are removed-citizens vs never-minted). Nodes must never be deleted.
3. **Individual death / retirement** (engine.29 / engine.5 lifecycle work) carries
   the **same 1:438 flaw** — a node dying is 438 deaths. Any lifecycle-exit
   modeled at the node level must be re-examined under this principle, not just
   migration. (Cross-link: [[2026-05-30-citizen-lifecycle-fame-system]].)

## Directives (S257)

### D1 — Migration moves to the aggregate layer (World_Population), off the ledger
Migration as a *concept stays* and should still produce world texture: events,
neighborhoods gaining/losing density, crowded streets, displacement pressure as
a *neighborhood/world* signal. But it is modeled at **World_Population**
(aggregate), **never** as an individual node departing the Simulation_Ledger.

- Remove the 6 columns from Simulation_Ledger (frees columns).
- **This is a massive blast-radius job, NOT a column delete.** Every writer,
  reader, and downstream ripple must be found and rewired to the aggregate layer:
  - Known writer: `phase05-citizens/migrationTrackingEngine.js`
    (`processMigrationTracking_`, `updateMigrationIntent_`).
  - Also touches: `gentrificationEngine.js`, `applyMigrationDrift.js`,
    neighborhood demographics, any brief/desk/card consumer reading these fields.
  - **Measure-twice before removal:** full caller-graph of all 6 columns +
    every consumer; map each to its aggregate-layer replacement; nothing
    removed until its ripple is rewired (else mid-cycle breakage).
- **Authorize the deploy sequence** — column removal is a destructive live-sheet
  structural change; it ships only after the rewire is complete and on Mike's go.

### D2 — Find and kill the node-deletion path
Citizens are permanent. Trace the 115 gaps: which POPIDs were minted-then-removed
vs never-assigned. Whatever removes a node (migration "left", a rebuild/re-import,
a cleanup) is a bug — citizens never leave the ledger. (A prior session grepped
for `deleteDimension`/`splice` on Simulation_Ledger and found none in current
code — so if nodes are vanishing, the path is historical or non-obvious; do not
conclude "it can't happen" from a clean grep. The gaps are the evidence.)

### D3 — Ingest must produce a complete, coherent record or REJECT (no auto-mint)
`scripts/ingestPublishedEntities.js` (engine-sheet owned) currently auto-mints a
ledger citizen from a freeform NAMES INDEX name with engine-defaulted fields.
That produced the POP-01021 garbage row. The defects are the script's design:
- **Incomplete** — `appendCitizens` fills ~15 derived fields and leaves the rest
  blank (~33 of 48 columns empty). A name reference is not a citizen.
- **Incoherent** — `EducationLevel` derived from age/neighborhood frequency,
  blind to role → a "Dr." lands `hs-diploma`.
- **Bad format** — honorific written as `First` ("Dr."), no person-validity check.
- **Real-world timestamp** — `CreatedAt`/`Last Updated` = `new Date().toISOString()`
  (UTC wall-clock). Violates the firmest project rule: **zero real-world clock
  timestamps; everything is cycle-based.** Must be the run cycle. (~145 such
  write-sites engine-wide per claude-mem — its own sweep.)

**Fix:** ingest does NOT auto-mint. A freeform name with insufficient data routes
to operator/canon-backfill review (the lane canon-drift already uses), so a
citizen only lands **complete + coherent + correctly-formatted + cycle-stamped.**
(The honorific/middle-name truncation matcher was already fixed S257 — commit
`6033c26` — so a future "Dr. X" resolves/rejects instead of minting a duplicate.)

### D4 — POP-01021 disposition (canon-identity, Mike's call)
POP-01021 ("Dr. Tran-Muñoz") is a junk row from the D3 defect. The C97 gap log
said "merge → POP-00781" — that was **wrong**: POP-00781 is **Vanessa Treary**, a
different citizen (a barista), not Dr. Vanessa Tran-Muñoz. There is **no**
Tran-Muñoz row on the ledger (the OARI director persona was never backfilled).
- Do NOT merge into POP-00781 (would corrupt Treary).
- Decide: delete POP-01021 as junk + backfill Dr. Tran-Muñoz a proper complete
  row, OR correct POP-01021 in place into her real row.
- Correct the `citizen_selection.md` / gap-log claim "she already holds POP-00781".

## Accountability

These are engine-sheet-owned scripts and the top-priority Simulation_Ledger. The
defects are the scripts' design and are owned here regardless of which session ran
them. A prior session deflected to "the C97 run did it" — that was wrong; the
output is the script's, the script is ours.

## Status

Open. No code or ledger changes made under this doc yet — it is the captured
logic + work-scope for the clean session. Nothing touches the live ledger
structure without a completed blast-radius map and Mike's explicit go.

## Status log

### engine.34 — status (drained from ROLLOUT, 2026-06-26 / S274)

**Ledger is a representative sample (1 node : ~438 people) → permanent nodes; remove the per-citizen migration loop off Simulation_Ledger** (S257 Mike-direct). An individual node can't move/die/retire — that asserts ×438 people, unsupported by engine output. **D1** the 6 migration cols (DisplacementRisk/MigrationIntent/MigrationReason/MigrationDestination/MigratedCycle/ReturnedCycle) come off the ledger → migration modeled at World_Population aggregate (still drives events/density/crowded-streets texture); **massive blast-radius rewire, NOT a column delete** — caller-graph every writer (migrationTrackingEngine, gentrificationEngine, applyMigrationDrift) + reader + ripple, rewire to aggregate, deploy only after rewire + Mike go. **D2** find+kill the node-deletion path (115 POPID gaps — minted-then-removed vs never-assigned). **D3** ingest (`ingestPublishedEntities.js`) must produce a complete/coherent/cycle-stamped record or REJECT to operator review — no auto-mint (POP-01021 garbage: real-world CreatedAt, "Dr." as First, ~33/48 cols blank, doctor=hs-diploma). **D4** POP-01021 disposition — gap-log "merge→POP-00781" was WRONG (00781 = Vanessa Treary, not Tran-Muñoz). Same 1:438 flaw hits death/retirement (engine.29/.5).
