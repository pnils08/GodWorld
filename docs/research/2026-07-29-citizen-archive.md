---
title: Citizen Archive — research
created: 2026-07-29
updated: 2026-07-29
type: reference
tags: [research, citizens, engine, active]
sources:
  - Mike-direct 2026-07-29 — create a separate post-intake project for citizens who die or permanently leave Oakland; never reuse a POPID; health cases remain in the existing hospital lifecycle
  - schemas/SCHEMA_HEADERS.md §Simulation_Ledger and §LifeHistory_Archive — current active-citizen and event-archive shapes
  - phase04-events/generationalEventsEngine.js — health lifecycle, deceased state, and death cascade
  - phase10-persistence/buildCyclePacket.js §persistHospitalLedger_ — existing Hospital_Ledger ownership
  - utilities/archiveLifeHistory.js — current event-log archival contract
  - docs/engine/LEDGER_AUDIT.md and docs/engine/LEDGER_REPAIR.md — traded-status doctrine and historical POPID-reuse evidence
  - phase05-citizens/checkForPromotions.js, processIntakeV3.js, and bondEngine.js — current Simulation_Ledger-only POPID allocation
pointers:
  - "[[2026-07-27-oakland-sports-feed-entry-dashboard]] — preceding sports-intake work; trade-away events eventually hand off to this separate lifecycle project"
  - "[[../engine/ENGINE_REPAIR]] §engine.77 — sports event/state intake sibling"
  - "[[../engine/ROLLOUT_PLAN]] — engine.90 discovery pointer for the separately sequenced project"
  - "[[index]] — research registration"
---

# Citizen Archive — research

**Source:** Internal lifecycle, health, archive, POPID-allocation, and
`Simulation_Ledger` consumer trace on 2026-07-29, triggered by Mike's decision
that citizens who die or permanently leave Oakland should leave the active
simulation without surrendering their identity or history.

**What this addresses:** What should happen to deceased citizens and players
traded away from Oakland; how their full citizen state can leave
`Simulation_Ledger` without breaking canon; and how GodWorld can guarantee that
a POPID is never reassigned. This is a separate project sequenced after sports
intake, not another phase of the sports-entry interface.

**What it does:** The proposed `Citizen_Archive` becomes the full-row cold home
for citizens who have permanently exited the Oakland simulation. The active
`Simulation_Ledger` remains the current Oakland cohort. A centralized identity
resolver and POPID allocator treat active and archived citizens as one permanent
identity namespace, so movement between ledgers changes location and lifecycle
state but never who a POPID means.

## Extraction — what is usable

- **Permanent identity → POPID authority.** A POPID identifies one citizen for
  all time. No removal, trade, death, migration, cleanup, or roster rebuild makes
  that identifier available again.
- **Active state versus historical state → two ledger roles.**
  `Simulation_Ledger` is the active Oakland simulation surface;
  `Citizen_Archive` is the proposed full-row historical surface. An archive move
  changes which engine surface owns the citizen, not their canon identity.
- **Archive only terminal exits → preserve the health engine.** Injury, illness,
  hospitalization, critical care, and recovery remain active health states.
  Their existing owner is the Phase 4 health lifecycle plus
  `Hospital_Ledger`; they do not enter `Citizen_Archive`.
- **Consequence first, archive last → preserve lived history.** Death, trade
  away, or permanent migration must finish every same-Cycle consequence before
  the active row can move: LifeHistory, `LifeHistory_Log`, dials, hospital
  outcome, inheritance, household and bond consequences, roster/employment
  changes, story arcs, and Ripple attribution.
- **Copy, verify, then remove → fail-loud movement.** A future mover stages the
  full archive row, verifies it by POPID and content hash/read-back, and only
  then removes the active row. A failed archive write leaves the active row
  intact.
- **One resolver → cross-ledger continuity.** Cards, family queries, canon
  checks, newsroom context, roster tools, and relationship consumers need a
  shared POPID resolver that searches the active ledger first and historical
  storage second.
- **Same POPID on return → reversible departure.** A traded-away or permanently
  migrated citizen who later returns to Oakland re-enters
  `Simulation_Ledger` under the same POPID. Their archived exit remains
  historical evidence rather than being deleted.
- **Central allocation → no reuse after active-row removal.** Every POPID minting
  path must use one allocation authority backed by the highest identifier ever
  issued or an equivalent permanent registry. Computing the maximum from the
  current `Simulation_Ledger` is insufficient once rows can move out.

## Verified current boundaries

### `Simulation_Ledger`

The current ledger contains 54 columns of citizen identity, current state,
relationships, economics, LifeHistory, dials, and lineage. Deceased, traded,
pending, and inactive citizens are usually retained in the sheet and excluded
by consumer-specific status gates.

`Traded` currently means departed Oakland, not merely moved to another depth
chart. Career, bond, neighborhood, relationship, education, civic/media, youth,
and daily-life paths exclude traded citizens. Retired citizens remain in
Oakland unless a separate departure event says otherwise.

### `Hospital_Ledger`

Health handling is already a living subsystem:

```text
Simulation_Ledger health status
  ├─ injured
  ├─ serious-condition
  ├─ hospitalized
  ├─ critical
  └─ recovering
       │
       ▼
Phase 4 health transition
       │
       ├─ still in care → Hospital_Ledger open admission
       ├─ active        → recovered discharge
       └─ deceased      → deceased outcome + death cascade
```

`Hospital_Ledger` is lazy-created with admission, cause, transition, discharge,
outcome, and time-in-care fields. It closes an admission when the citizen
returns to `active` or becomes `deceased`. Therefore:

- injured, sick, hospitalized, critical, and recovering citizens stay in
  `Simulation_Ledger`;
- the hospital subsystem remains their state owner;
- only after a deceased outcome and all death consequences finish can the
  citizen become archive-eligible.

### `LifeHistory_Archive`

`LifeHistory_Archive` is not a citizen archive. It has seven columns and stores
old `LifeHistory_Log` events:

```text
Timestamp · POPID · Name · EventTag · EventText · Neighborhood · Cycle
```

It cannot reconstruct the citizen's full identity, family, economic, roster,
status, dial, lineage, or employment state. Reusing it for full citizen rows
would mix two schemas and break its retention contract.

### POPID allocation

Multiple current writers independently find the largest numeric POPID in
`Simulation_Ledger` and increment it. Examples include advancement intake,
promotion, spouse materialization, and bond-driven marriage.

That is safe only while the ledger permanently retains its highest row. Once a
citizen can move out, the active maximum can fall and an allocator can mint a
previously used identifier. Citizen archival therefore cannot ship before POPID
allocation is centralized.

Historical repair documentation records that 18 removed NBA-player POPIDs were
once reused for new citizens. A later ledger doctrine says every deployed POPID
is a master code and duplicate identities should be repaired without deleting
or reusing IDs. The archive project must treat this as legacy collision debt:
audit the affected identifiers and decide how historical references resolve
before enforcing the new invariant prospectively.

## Proposed archive eligibility

| Citizen condition | Active ledger | Existing owner | Archive eligibility |
|---|---|---|---|
| Active Oakland resident | Remains | Simulation engines | No |
| Injured or sick | Remains | Health lifecycle | No |
| Hospitalized or critical | Remains | Health lifecycle + `Hospital_Ledger` | No |
| Recovering | Remains | Health lifecycle + `Hospital_Ledger` | No |
| Retired but living in Oakland | Remains | Citizen/daily-life engines | No |
| Roster demotion, benching, or call-up | Remains | Sports roster/state | No |
| Player traded away from Oakland | Leaves after consequences | Sports intake + citizen lifecycle | Yes |
| Permanent migration/departure | Leaves after consequences | Migration/citizen lifecycle | Yes |
| Deceased | Leaves after death cascade and persistence | Generational/health lifecycle | Yes |

`pending`, `inactive`, rejected-intake, and temporary-absence policies remain
open. They must not be folded into archive eligibility merely because their
rows are currently skipped by some consumers.

## Proposed `Citizen_Archive` record

The archive needs the complete `Simulation_Ledger` row at exit plus explicit
movement metadata. The exact schema belongs to a future plan, but the research
requires at least:

```text
full Simulation_Ledger snapshot
· ArchiveReason
· ExitCycle
· SourceEventId
· LastActiveStatus
· ReturnEligible
· SchemaVersion
```

`ArchiveReason` should be a controlled lifecycle value such as deceased,
traded-away, or permanent-migration—not free-form prose. The LifeHistory event
holds what happened; the archive metadata explains why storage ownership
changed.

The archive may contain more than one historical exit snapshot for a citizen who
leaves, returns, and later exits again. The global invariant is one active row at
most; historical archive records may remain append-only.

## Required movement protocol

```text
1. Validate terminal exit and resolve POPID
2. Write the objective LifeHistory event and structured log row
3. Apply same-Cycle health / family / bond / inheritance / roster / Ripple effects
4. Commit and verify all consequences
5. Append the full citizen snapshot plus exit metadata to Citizen_Archive
6. Read back and verify POPID, schema version, and required fields
7. Remove the active Simulation_Ledger row
8. Reconcile active + archive identity uniqueness and dangling references
```

The archive step needs a verified post-commit finalization point. It must not run
mid-Cycle while later Phases still expect the citizen in `ctx.ledger`, and a
future plan must prove the exact engine order instead of assuming a Phase number.

For a return:

```text
1. Resolve the archived POPID
2. Validate that no active row already owns it
3. Restore current state under the same POPID
4. Append a Return/Arrival LifeHistory event and Ripple attribution
5. Keep the prior archive record as history
```

## Cross-ledger consumers that must be measured

The current codebase has many direct `Simulation_Ledger` readers rather than one
citizen repository. The plan must inventory at least:

- POPID allocators and intake writers;
- family, spouse, parent/child, household, and inheritance lookup;
- `Relationship_Bonds` and grief/death cascades;
- citizen cards, voice workspaces, wake perception, and canon search;
- newsroom packets and edition validation;
- employment, civic, media, faith, cultural, and sports roster joins;
- migrations, returns, and historical queries;
- audits that assume every known POPID remains in one sheet.

Moving rows before these consumers can resolve archived citizens would convert
ledger cleanup into canon loss.

## Options evaluated

### Keep every row in `Simulation_Ledger`

This is the current safe behavior. Status gates prevent most deceased/traded
citizens from generating new life, and all references remain resolvable. It does
not create a clean active cohort and leaves POPID permanence dependent on every
consumer understanding every terminal status.

### Move rows directly with no shared resolver

Rejected. It would break family and historical lookup, citizen cards, canon
checks, and POPID allocation. Sheet row deletion also changes row positions
while many writers operate over an in-memory ledger.

### Reuse `LifeHistory_Archive`

Rejected. It is an event-log archive with a different schema and maintenance
contract.

### Minimal tombstone registry only

A minimal POPID/name/status directory would prevent reuse, but it would not
preserve the complete citizen state needed for family, canon, economic, roster,
or return queries. It is useful only as an optional index in front of a full
archive.

### Full `Citizen_Archive` plus shared resolver and allocator

Adopt. This meets the builder's active-versus-departed boundary while preserving
identity, history, and returnability. It is a lifecycle migration, not a Sheet
cleanup.

## Not applicable / hazard

- Do not archive health states. `Hospital_Ledger` already owns injury, illness,
  hospitalization, critical care, recovery, and discharge.
- Do not archive retirement automatically. Retired citizens may still live in
  Oakland and continue household, neighborhood, media, or family life.
- Do not delete first and reconstruct later from LifeHistory events.
- Do not use the current active-ledger maximum as the post-archive POPID
  allocator.
- Do not assume `Status=Traded` is a reversible roster flag; current consumers
  treat it as gone from Oakland.
- Do not silently rewrite the historical NBA POPID-reuse incident. Audit and
  document its resolution.
- Do not move a citizen before same-Cycle death/trade/migration consequences
  finish.
- Do not expose archived citizens as current-state canon, but keep them
  retrievable as historical canon.

## Decisions and remaining questions

Builder decisions recorded:

- citizen archival is a separate project from sports intake;
- it is sequenced after the intake work;
- POPIDs are permanent and must never be reused;
- deceased and traded-away citizens are the motivating terminal exits;
- injured, sick, hospitalized, critical, and recovering citizens remain with
  the existing hospital lifecycle.

Questions for a future implementation plan:

- Does the archive use one immutable exit snapshot per departure or one mutable
  tombstone per POPID?
- Is a small permanent POPID directory needed, or can the archive plus a
  persisted high-water allocator be the identity authority?
- Which permanent-migration statuses qualify, and are any departures
  return-eligible?
- Which consumers require full archived rows versus minimal identity lookup?
- What post-commit engine location can move a row without invalidating
  `ctx.ledger` or Phase 10 persistence?
- How will active/archive reconciliation fail loud on duplicates, missing rows,
  or dangling relationship references?
- How will the historical reused NBA-player POPIDs be represented without
  inventing replacement canon?

**Verdict:** `adopt` — create a full-row `Citizen_Archive` project with permanent
POPID identity, a shared active-plus-archive resolver, centralized allocation,
copy/read-back/remove safety, and explicit handoff from terminal lifecycle
events. Preserve the existing health and hospital path unchanged.

**Ignited plans:** none yet. Rollout discovery is `engine.90`. Mike sequenced
this separate project after sports intake; its self-contained implementation
plan requires a later, separate approval.

---

## Applications (living)

- 2026-07-29 — Established the future boundary for sports intake: a verified
  trade-away event can hand the citizen to the archive lifecycle, while injury
  and recovery remain in `Hospital_Ledger`.
- 2026-07-29 — Filed `engine.90` as the separate post-intake rollout discovery
  pointer.

---

## Changelog

- 2026-07-29 — Initial internal extraction, builder decisions, and `engine.90`
  rollout pointer recorded.
