---
title: Vote-Trigger Wiring Plan (Engine Investigation)
created: 2026-05-03
updated: 2026-05-03
type: plan
tags: [engine, civic, draft]
sources:
  - output/production_log_city_hall_c93_run_gaps.md G-R11 (vote-that-didn't-trigger)
  - phase05-citizens/civicInitiativeEngine.js (existing 9-seat vote resolver, lines 130-460)
pointers:
  - "[[engine/ROLLOUT_PLAN]] — parent rollout"
  - "[[plans/2026-05-03-c93-gap-triage-execution]] — Wave 4 parent"
  - "[[SCHEMA]] — doc conventions"
---

# Vote-Trigger Wiring Plan (Engine Investigation)

**Goal:** Find the missing path that schedules a follow-up vote on an initiative after the initial vote has resolved, and wire it. C93 Transit Hub had a vote scheduled this cycle that silently didn't fire because no code wrote `VoteCycle = 93` onto the Initiative_Tracker row for the follow-up vote.

**Why the original draft was wrong:** Initial draft (S197) proposed a `/council-vote` skill + `/city-hall-prep` route-to-9 mechanism. **Engine already owns vote resolution** (`phase05-citizens/civicInitiativeEngine.js` line 204 — fires when `VoteCycle === cycle && status in ['active','pending-vote']`; uses faction math + swing voters + Tier-3 demographics + sentiment to compute the tally; handles veto + override votes). It does NOT need 9 voice statements — that was a skill-side misread of the architecture. Skill-layer mechanism would have duplicated engine logic.

**Real bug class:** Follow-up votes have no scheduling path. The engine handles three lifecycle transitions on its own:
- `proposed` → `active` when `voteCycle` is within 3 cycles (line 339)
- `active` → `pending-vote` when `voteCycle === cycle + 1` (line 346)
- Veto override votes scheduled explicitly via `OverrideVoteCycle` (line 307)

What's missing: a path that writes `VoteCycle = cycle + N` when an initiative needs a SECOND vote (re-vote after defeat, ratification vote after milestone, conditional re-confirmation). Without that path, an initiative reaches `vote-ready` skill-side but the engine row's `VoteCycle` stays at its prior value (or 0), so the trigger condition on line 204 is never satisfied and the vote silently no-ops.

**Terminal:** engine-sheet (investigation + fix); civic for C94 validation if a follow-up vote is scheduled.

**Pointers:**
- Gap entry: `output/production_log_city_hall_c93_run_gaps.md` §G-R11
- Engine resolver: `phase05-citizens/civicInitiativeEngine.js` — full vote machinery already present (vote types, swing voter handling, faction math, veto, override)
- Wave 2 RULES.md hardening (commit `cd89cc5`) already says project agents must NEVER fabricate tallies and must describe pre-vote operational reality if a vote didn't fire — that rule holds. Project agents read engine output, do not invent.
- Sibling but distinct: Wave 3 BUNDLE-D `assembleDecisions.js` (consolidates voice JSONs into per-initiative decisions). That bridges voices → tracker. This plan fixes engine-side rescheduling.

**Acceptance criteria:**
1. Engine-sheet identifies where follow-up vote scheduling SHOULD happen (likely `applyInitiativeConsequences_` or sibling — the path that runs post-vote and could write `row[iVoteCycle] = cycle + N` when an outcome flags follow-up needed).
2. Wiring landed: when an initiative resolves with a flag indicating a follow-up vote (re-vote schedule, ratification milestone, conditional re-confirmation), `VoteCycle` is written forward and `status` returns to `active` so the engine's existing `proposed`/`active`/`pending-vote` lifecycle picks it up at the right cycle.
3. C94 cycle (or next applicable) demonstrates a follow-up vote firing automatically — engine writes the tally to `S.votesThisCycle`, updates Initiative_Tracker, project agent reads the canonical outcome.
4. Optional verification: confirm engine's `VoteRequirement` default `5-4` resolves 4-4-1 (one absent) as motion fails. Quick code-read, no design needed.

---

## Phase 1 — Engine investigation (engine-sheet)

### Task 1.1: Locate the rescheduling gap

- **Files:**
  - `phase05-citizens/civicInitiativeEngine.js` — read
  - Any sibling that processes vote outcomes (`applyInitiativeConsequences_`, etc.)
  - Initiative_Tracker schema (which columns govern follow-up vote intent — does one exist? `FollowUpCycle`? `ReVoteCycle`? Or does the row reuse `VoteCycle` and need it bumped post-resolution?)
- **Steps:**
  1. Trace what happens to an initiative row after `voteCycle === cycle` fires and the vote resolves (PASSED / FAILED / VETOED).
  2. Identify whether the schema even supports follow-up vote intent. If not, decide between (a) reusing `VoteCycle` (overwrite post-resolution when follow-up flagged), (b) adding a `FollowUpVoteCycle` column, (c) using existing `OverrideVoteCycle` semantics generalized.
  3. Identify what data source flags a follow-up: Mara directive? Initiative milestone? Phase advance triggered by skill-side? Engine-internal logic?
- **Output:** decision recorded in this plan §Findings before coding.
- **Status:** [ ] not started

### Task 1.2: Investigate the C93 Transit Hub specific case

- **Steps:**
  1. Read INIT-003 row in Initiative_Tracker — what did `VoteCycle` and `Status` actually contain at C93 cycle start?
  2. Was a prior vote scheduled and resolved (e.g., C90, C91)? What was the outcome?
  3. Was the C93 follow-up vote intent expressed anywhere — Mara directive, prior cycle's project state, MilestoneNotes?
- **Output:** ground truth for the bug — was VoteCycle just stale (not bumped), or was the follow-up never expressed at all?
- **Status:** [ ] not started

---

## Phase 2 — Wiring fix (engine-sheet)

### Task 2.1: Implement the rescheduling path

- **Files:**
  - `phase05-citizens/civicInitiativeEngine.js` — modify (likely in `applyInitiativeConsequences_` or post-vote handler)
  - Schema additions if Phase 1.1 chose path (b)
- **Steps:**
  1. When vote resolves with follow-up flag, write `VoteCycle = cycle + N` (N from initiative spec or default).
  2. Reset `Status` to `active` (so the lifecycle's `proposed`/`active`/`pending-vote` auto-bump on lines 339/346 catches it cleanly).
  3. Note in `Notes` field that this is a follow-up vote scheduled at C<cycle> for resolution at C<cycle+N>.
- **Status:** [ ] not started

### Task 2.2: Validate at C94

- **Steps:**
  1. Run /run-cycle 94 (or next cycle with a scheduled follow-up).
  2. Confirm engine's `S.votesThisCycle` includes the follow-up.
  3. Confirm Initiative_Tracker row updated correctly.
  4. Confirm project agent reads the canonical outcome (no fabrication).
- **Status:** [ ] not started

---

## Phase 3 — C94 cycle validation (civic)

### Task 3.1: Run /city-hall C94

- Acceptance criteria 1-3 above hold
- Project agent for the relevant initiative describes outcome conditioned on engine's tally
- Wave 2 RULES.md prohibition holds because the data exists for them to read
- **Status:** [ ] not started

---

## Open questions

Tally semantics (5 questions in original draft) are not open — engine already resolves them:
- Faction math + swing-voter probabilities + sentiment determine member positions (no skill-side absent/abstain/not_voting design needed)
- Voting requirement is per-initiative via `VoteRequirement` field, default `5-4` (line 171, 752)
- Mayor has veto, doesn't vote (line 458, 530, 678)
- 9-seat council, faction blocs handled via Civic_Office_Ledger
- Override votes have separate `OverrideVoteCycle` lifecycle (v1.7)

Remaining open question is narrow:
- [ ] Phase 1 Task 1.1 — schema decision: reuse `VoteCycle` (overwrite post-resolution) vs add `FollowUpVoteCycle` column vs generalize `OverrideVoteCycle` semantics. Engine-sheet to decide based on what's cleanest given existing post-vote handler.

---

## Findings (filled during Phase 1)

*To be populated by engine-sheet during investigation.*

- INIT-003 actual row state at C93 start: TBD
- Where post-vote resolution writes back to the row: TBD
- Whether any path expresses follow-up vote intent today: TBD
- Schema decision: TBD

---

## Changelog

- 2026-05-03 — Initial draft (S197). Wave 4 of [[plans/2026-05-03-c93-gap-triage-execution]]. Two-mechanism design (`/council-vote` skill + `/city-hall-prep` route-to-9). Five Phase 1 design questions on tally semantics. Status: DRAFT awaiting grill.
- 2026-05-03 — REWRITTEN IN PLACE (S198). Original draft retired — Mike corrected the architectural diagnosis: votes are engine-handled, not skill-handled. The engine has a complete 9-seat resolver in `phase05-citizens/civicInitiativeEngine.js` (faction math + swing voters + Tier-3 demographics + sentiment; handles veto + override). Skill-layer `/council-vote` would duplicate engine logic. Real bug class is much narrower: follow-up votes have no scheduling path — `VoteCycle` doesn't get bumped after a vote resolves with follow-up intent. Replacement plan is an engine-sheet investigation + wiring fix in `civicInitiativeEngine.js` (or its post-vote handler). Five Phase 1 tally-semantics questions retired (engine already resolves them). One narrow Phase 1 schema question remains: reuse `VoteCycle` vs add `FollowUpVoteCycle` vs generalize `OverrideVoteCycle`. Tags shifted `[civic, architecture, draft]` → `[engine, civic, draft]`. Title changed from "Vote-Trigger Mechanism Plan" to "Vote-Trigger Wiring Plan (Engine Investigation)". File slug preserved so existing inbound links keep resolving.
