---
title: Initiative_Tracker Contract — schema, ImplementationPhase vocabulary, lifecycle, add-procedure
created: 2026-06-11
updated: 2026-06-11
type: reference
tags: [civic, engine, schema, architecture, active]
sources:
  - "phase02-world-state/applyInitiativeImplementationEffects.js §PHASE_INTENSITY — the engine's de-facto ImplementationPhase authority (20 phases + intensities); this doc canonicalizes it"
  - "Live Initiative_Tracker sheet (28 cols) read S256 via lib/sheets"
  - "[[../research/2026-06-01-initiative-tracker-state]] — the diagnosis + read/write graph this contract closes"
  - "[[../plans/2026-06-01-initiative-tracker-contract]] — civic.14 plan (this is Phase 1 / D-1.1)"
pointers:
  - "[[INITIATIVE_TRACKER_VOTER_LOGIC]] — Status-column lifecycle + vote math (its 17-col schema is SUPERSEDED by §1 here)"
  - "[[CIVIC_GOVERNANCE_MASTER_REFERENCE]] §Initiative Status Lifecycle — the Status arc (distinct column from ImplementationPhase)"
  - "[[../plans/2026-05-11-civic-tracker-collision-schema]] — trackerOwner WHO-writes contract (ES-5); this is the WHAT/lifecycle contract"
---

# Initiative_Tracker Contract

**The authority for what goes in the Initiative_Tracker sheet.** Every writer — `/city-hall`, the voice agents, the 5 project agents, any future add-an-initiative agent — conforms to this doc. It exists because the tracker had no canonical contract: the engine's `PHASE_INTENSITY` map was the de-facto authority, writers free-formed against it, and **unrecognized `ImplementationPhase` strings are silently zeroed** by the engine (an initiative goes dark — no ripple, then false-flagged "stuck" next cycle). This doc canonicalizes the vocabulary so a write either conforms or is explicitly proposed as an addition — never free-formed.

**Two columns, two arcs (don't conflate):**
- **`Status`** tracks the *legislative* arc (proposed → … → passed/failed). Lifecycle + vote math live in [[INITIATIVE_TRACKER_VOTER_LOGIC]]; this doc does not redefine it.
- **`ImplementationPhase`** tracks the *operational* arc (announced → … → disbursement-active → complete) and is the field the engine maps to a ripple **intensity**. This column is the gap this contract closes — §2–§3 are its authority.

---

## §1 — Schema (28 columns)

The live sheet is 28 columns. This supersedes the stale 17-col schema in [[INITIATIVE_TRACKER_VOTER_LOGIC]] (which back-links here).

| # | Column | Meaning |
|---|--------|---------|
| 1 | `InitiativeID` | `INIT-00N`, zero-padded, unique. Assigned at add-time (§4). Primary key. |
| 2 | `Name` | Human title (e.g. "West Oakland Stabilization Fund"). |
| 3 | `Type` | One of `vote` / `visioning` / `program` (§3 lifecycles key off this). |
| 4 | `Status` | Legislative-arc state. Vocabulary + transitions: [[INITIATIVE_TRACKER_VOTER_LOGIC]] §Status Lifecycle. |
| 5 | `Budget` | Dollar figure, `$NNM` form (e.g. `$28M`). Total project budget; line-items are not contradictions. |
| 6 | `VoteRequirement` | Vote threshold, `Y-N` form (e.g. `6-3`). |
| 7 | `VoteCycle` | Cycle the vote is/was held. |
| 8 | `Projection` | Pre-vote read (e.g. `lean pass`, `needs 1 swing`). |
| 9 | `LeadFaction` | Faction sponsoring (`OPP` / `CRC` / `IND`). |
| 10 | `OppositionFaction` | Faction opposing. |
| 11 | `SwingVoter` | Named swing council member. |
| 12 | `Outcome` | Vote result (`PASSED` / `FAILED`). |
| 13 | `SwingVoter2` | Second named swing voter. |
| 14 | `SwingVoter2Lean` | Their lean (`lean-yes` / `toss-up` / …). |
| 15 | `Consequences` | One-line cascade summary of the decision. |
| 16 | `Notes` | Free-text running log (cycle-stamped). |
| 17 | `LastUpdated` | Date of last write. |
| 18 | `AffectedNeighborhoods` | Comma-list of canonical neighborhood names. |
| 19 | `PolicyDomain` | One of the 9 engine domains (§2 footnote). Drives the neighborhood-effect map. |
| 20 | `MayoralAction` | `none` / `signed` / `veto` / … |
| 21 | `MayoralActionCycle` | Cycle of the mayoral action. |
| 22 | `VetoReason` | Text, if vetoed. |
| 23 | `OverrideVoteCycle` | Cycle of an override vote, if any. |
| 24 | `OverrideOutcome` | Override result. |
| 25 | **`ImplementationPhase`** | **Operational-arc state — the contract spine (§2). Engine maps it to ripple intensity. Unrecognized = silently zeroed.** |
| 26 | `MilestoneNotes` | Cycle-stamped operational progress (`C96: …`). The engine-false-flag disambiguator reads this (city-hall-prep auto-investigate). |
| 27 | `NextScheduledAction` | The next concrete step. |
| 28 | `NextActionCycle` | Cycle that step is due. |

---

## §2 — ImplementationPhase vocabulary (the spine)

**These 20 values are the ONLY valid `ImplementationPhase` strings.** They are the engine's `PHASE_INTENSITY` keys (`applyInitiativeImplementationEffects.js`). The intensity is the per-cycle ripple weight the engine applies; a value not in this table resolves to **zero intensity** (the initiative goes dark) unless it contains a known phase as a substring (the engine's partial-match fallback — do not rely on it).

| ImplementationPhase | Intensity | Arc | Meaning |
|---------------------|----------:|-----|---------|
| `announced` | 0.00 | pre-vote | Publicly announced, no legislative motion yet. |
| `legislation-filed` | 0.05 | pre-vote | Filed; faintest operational signal. |
| `vote-scheduled` | 0.00 | pre-vote | Vote on calendar; no effect until ready. |
| `vote-ready` | 0.15 | pre-vote | At the vote threshold this cycle (routes to faction blocs for the tally). |
| `visioning` | 0.10 | visioning | Community-visioning underway (visioning-Type initiatives). |
| `visioning-complete` | 0.15 | visioning | Visioning closed; ready to design. |
| `design-phase` | 0.20 | build | Design/engineering work. |
| `construction-planning` | 0.30 | build | Pre-construction planning, permits, contracts. |
| `construction-active` | 0.80 | build | Active construction. |
| `implementation-active` | 0.80 | operational | Program implementing at scale. |
| `disbursement-active` | 1.00 | operational | Funds/services actively flowing (max positive intensity). |
| `dispatch-live` | 1.00 | operational | Live operational dispatch (e.g. OARI crews on the street). |
| `pilot-active` | 0.60 | operational | Pilot running. |
| `pilot_evaluation` | 0.60 | operational | Pilot under evaluation (note the underscore — canonical as-is). |
| `operational` | 0.90 | operational | Steady-state ongoing program. |
| `complete` | 0.50 | operational | Delivered; residual ongoing effect. |
| `stalled` | −0.50 | negative | Lost momentum (negative ripple). |
| `blocked` | −0.70 | negative | Blocked by an obstacle. |
| `suspended` | −0.60 | negative | Paused. |
| `defunded` | −1.00 | negative | Funding pulled (max negative intensity). |

*PolicyDomain (col 19) vocabulary — drives the neighborhood-effect map in the same engine file: `health` · `transit` · `economic` · `housing` · `safety` · `sports` · `workforce` · `environment` · `education`. Anything else falls to default effects.*

---

## §3 — Lifecycle / transition rules

The valid phase *order* depends on `Type` (col 3). An agent advances an initiative to the **next phase in its arc** — it does not skip to an unrelated arc. Negative phases (`stalled`/`blocked`/`suspended`/`defunded`) may be entered from any active phase and exited back to the arc when resolved.

**`vote` initiatives** (a council vote gates operations — e.g. Stab Fund, OARI):
```
announced → legislation-filed → vote-scheduled → vote-ready
  → (vote passes) → implementation-active | disbursement-active | dispatch-live | pilot-active
  → operational → complete
```

**`visioning` initiatives** (community visioning gates a build — e.g. Transit Hub, Health Center):
```
visioning → visioning-complete → design-phase → construction-planning
  → construction-active → operational → complete
```

**`program` initiatives** (a standing program, piloted then scaled — e.g. apprenticeship pipeline):
```
announced → legislation-filed → pilot-active → pilot_evaluation
  → operational → complete
```

**The paradox case (C95 OARI):** an initiative can be operationally `dispatch-live` (intensity 1.0, demonstrably working) yet remain phase-stuck if its phase isn't advanced. This is NOT a stuck-and-failing story — see city-hall-prep §Scenario D. Advance the phase on the strength of results rather than narrating manufactured stuck-drama.

---

## §4 — How to add an initiative

A new initiative is one new row. Minimum to be engine-legible:

1. **`InitiativeID`** — next `INIT-00N` after the current max (read the sheet; do not reuse a retired ID). Zero-pad to 3 digits.
2. **`Name`** — human title.
3. **`Type`** — `vote` / `visioning` / `program` (picks the §3 lifecycle).
4. **`Status`** — start at `proposed` (per [[INITIATIVE_TRACKER_VOTER_LOGIC]] §Status Lifecycle).
5. **`ImplementationPhase`** — start at the **first phase of the Type's arc** (§3): `announced` for vote/program, `visioning` for visioning. Never blank if the initiative is meant to ripple.
6. **`PolicyDomain`** — one of the 9 (§2 footnote). Required for the neighborhood-effect map to fire.
7. **`AffectedNeighborhoods`** — canonical neighborhood name(s), comma-separated.
8. **`Budget`** — `$NNM` if known; blank if pre-budget.
9. **`NextScheduledAction` + `NextActionCycle`** — the next concrete step and its due cycle.

Leave vote-specific columns (6–14, 20–24) blank until the legislative arc reaches them. `LastUpdated` = today. `MilestoneNotes` gets its first `C{XX}: …` entry the cycle work begins.

---

## §5 — The drift rule (why this contract exists)

**Emit only §2 values. Never free-form a phase.** A writer who has a real-world phase that isn't in §2 (e.g. "parcel-close", "Phase II technical-eval", "rollout-active" — the C96 cases) does ONE of:
1. **Map it to the nearest canonical phase** in the same arc (e.g. parcel-close → `construction-planning`; rollout-active → `implementation-active`), OR
2. **Propose adding it to §2** — flag it to research-build/civic with the intended intensity; the phase is added to both this doc AND the engine `PHASE_INTENSITY` map in the same change (the two must never diverge — that divergence is the root cause). Do not write the new string to the sheet until it's in the engine map, or it zeroes.

**Common drift variants → canonical (extend as encountered):**

| Drift string seen | Canonical |
|-------------------|-----------|
| `phase-two-activation`, `rollout-active` | `implementation-active` |
| `parcel-close`, `groundbreaking-authorization` | `construction-planning` |
| `Phase II technical-eval`, `technical-evaluation` | `design-phase` |
| `retail-recovery`, `expansion` | `implementation-active` (or `operational` if steady-state) |

The engine map (`PHASE_INTENSITY`) and this §2 table are **one source of truth in two places** — any edit to one rides the same commit as the other (engine rule, S250 keep-docs-true-in-real-time).

---

## Changelog

- 2026-06-11 — Initial contract (S256, civic.14 Phase 1 / D-1.1). 28-col schema (supersedes 17-col VOTER_LOGIC schema); 20-phase ImplementationPhase vocabulary canonicalized from engine `PHASE_INTENSITY`; per-Type lifecycle arcs; add-an-initiative procedure; drift rule + variant map. Phases 2 (engine drift-tolerance), 3 (writer enforcement), 4 (add-capability) build on this spine. Plan: [[../plans/2026-06-01-initiative-tracker-contract]].
