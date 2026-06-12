---
title: civic.7 — INIT-005 phase-advance investigation + MilestoneNotes reader
created: 2026-05-11
updated: 2026-05-12
type: plan
tags: [civic, engine, investigation, closed]
sources:
  - "[[../../output/production_log_city_hall_c93_gaps.md]] §G-11 — origin gap"
  - "[[../engine/ROLLOUT_PLAN]] §civic.7 — parent ROLLOUT entry"
  - "output/civic-voice/health_center_c92.json — Chen-Ramirez C92 commitment record"
  - "output/civic-voice/mayor_c92.json — Mayor C92 architect-contract directive"
  - "output/engine_review_c93.md — surfaces the unmoved INIT-005 phase"
pointers:
  - "[[../engine/ROLLOUT_PLAN]] civic.7 — engine-sheet picker-grab row"
  - "[[../adr/0005-rollout-plan-structure]] §How to add work — pointer convention"
---

# civic.7 — INIT-005 Phase-Advance Investigation

**Closes:** civic.7 (gap-log G-11 from city-hall-prep S192 run).

## The discrepancy

C92 produced two on-record commitments to advance INIT-005 (Temescal Community Health Center) into design-phase during C93:

1. **Mayor Santana C92 directive:** Architect contract executes by C93.
2. **Chen-Ramirez (Health Center Director) C92 voice JSON commitment:** "Atlas Bay Architects contract executes C93. Design kickoff C93 week 1."

C93 engine review says INIT-005 design-phase has not moved (`mitigator-stuck`, `remedy-not-firing` flags). Two scenarios fit the data:

- **Scenario A:** Contract didn't actually execute in C93. Chen-Ramirez's deadline slipped without surfacing to /city-hall as a missed commitment.
- **Scenario B:** Contract executed but the tracker phase didn't flip. Engine writeback bug — parallel class to the coverage-rating drift Webb caught at C92.

From prep-side data alone, the two scenarios are indistinguishable. The investigation needs to disambiguate, then close whichever path is real.

## Investigation procedure (engine-sheet)

### Phase 1 — Disambiguate scenarios A vs B

1. **Read Initiative_Tracker INIT-005 row directly from the sheet:**
   ```bash
   node scripts/queryLedger.js initiative INIT-005
   ```
   (or whatever the canonical Initiative_Tracker reader is — `lib/sheets.js` direct read on the INIT-005 row if no helper exists)

2. **Inspect the MilestoneNotes field for C93 entries:**
   - Grep the MilestoneNotes string for `C93` (e.g., `MilestoneNotes` cell containing `"C93: Atlas Bay Architects contract executed, design kickoff scheduled C93 week 1"` or similar).
   - Also check `MayoralAction` + `MayoralActionCycle` columns for any C93-stamped action.
   - Also check `NextScheduledAction` + `NextActionCycle` for whether the design-phase action was scheduled for C93 but unfired vs scheduled for a later cycle.

3. **Decision tree:**
   - **MilestoneNotes has a C93 entry naming the architect contract executing** → **Scenario B** (writeback bug). Phase column says `design-phase` not yet moved, but the cycle's work landed in notes. Proceed to Phase 2a.
   - **MilestoneNotes has no C93 entry** → **Scenario A** (commitment slipped). Chen-Ramirez's voice didn't write a C93 update. Proceed to Phase 2b.
   - **MilestoneNotes has a C93 entry that contradicts the commitment** (e.g., "C93: contract execution delayed pending council approval") → **Scenario A-variant** (commitment slipped with documented reason). Proceed to Phase 2b.

### Phase 2a — Scenario B: writeback bug investigation

If Scenario B is confirmed, the fix path:

1. **Read Chen-Ramirez C93 voice JSON** if it exists (`output/civic-voice/health_center_c93.json`). Check whether the statement's `trackerUpdates` field includes `ImplementationPhase: "design-phase-active"` or equivalent.
   - **trackerUpdates field present + correctly set** → writeback didn't fire. Likely `applyTrackerUpdates.js` bug. Re-read the C93 dry-run output if cached at `output/civic-voice/_applyTrackerUpdates_c93_dryrun.log` (or wherever the run log lives); look for the INIT-005 line. If dry-run looked clean but --apply didn't write, that's a sheet-write bug.
   - **trackerUpdates field present but malformed** (e.g., `ImplementationPhase: ""` or wrong phase name) → agent-side issue. Chen-Ramirez's voice agent emitted bad data; engine-sheet's `applyTrackerUpdates.js` properly refused the write.
   - **trackerUpdates field absent entirely** → agent didn't think it owned the phase flip. Likely rolls into civic.9 (multi-voice tracker collision discipline — primary-owner field would have made this explicit).

2. **Patch the actual bug** in whichever file the trace landed:
   - `applyTrackerUpdates.js` if the write didn't happen — investigate the write path
   - `civic-project-health-center/SKILL.md` if the agent didn't include the field — clarify "you own ImplementationPhase advance on Health Center"
   - Sheet permission / service-account if the write attempted but was rejected

3. **Re-run C94 with the fix** and verify INIT-005 advances.

### Phase 2b — Scenario A: commitment slipped

If Scenario A is confirmed, the fix is civic-side, not engine-side:

1. **Surface the slip to /city-hall-prep** for C94: Chen-Ramirez has an outstanding C93 commitment that wasn't met. C94 pending_decisions for `civic-project-health-center` includes "C93 commitment slipped — explain or re-commit" as a required decision.

2. **Add to `.claude/skills/city-hall-prep/SKILL.md` Step 1**: when reading prior-cycle voice JSONs (Step 1 Disk source #4 + #5 per S197), grep them for `NextScheduledAction` + `NextActionCycle` matching prior cycle. If a prior cycle scheduled an action FOR THIS cycle, surface it to topic assignments as "outstanding commitment requiring closure." This catches future slips at prep-time, not three cycles later when the engine notices the phase didn't move.

3. **Optional:** add an explicit "commitment-tracking" sub-section to the city-hall production log so slips are visible at /city-hall close, not just at /engine-review next cycle.

### Phase 3 — MilestoneNotes reader for prep skill (both scenarios)

Regardless of scenario, the prep skill needs to be able to do Phase 1 step 2 automatically going forward. Build a small helper:

1. **`scripts/readInitiativeMilestoneNotes.js`** (NEW) — takes `<initiative-id> <cycle>` args, reads the Initiative_Tracker row, prints the MilestoneNotes field with C{XX} entries highlighted.

   ```bash
   node scripts/readInitiativeMilestoneNotes.js INIT-005 93
   # Output:
   # INIT-005 (Temescal Community Health Center)
   # ImplementationPhase: design-phase-pending
   # MilestoneNotes:
   #   C90: ...
   #   C91: ...
   #   C92: Mayor directed architect contract by C93.
   #   [No C93 entry found — investigate scenario A vs B per civic.7 plan]
   ```

2. **Wire into `.claude/skills/city-hall-prep/SKILL.md` Step 1** as part of the disk-input read for active initiatives. When an initiative shows `mitigator-stuck` or `remedy-not-firing` in engine review, automatically run the MilestoneNotes reader and surface the highlighted C{XX} history to topic assignments.

## Acceptance for civic.7 close

- Phase 1 investigation completes: scenario A or B named with evidence
- If B: actual writeback bug patched + C94 run shows INIT-005 advance OR retry of C93 advances cleanly
- If A: civic-side surfacing in place (pending_decisions slip-tracking, prep skill grep)
- Phase 3 helper script shipped + wired into city-hall-prep Step 1
- Gap-log G-11 status updated with the resolution
- ROLLOUT_PLAN.md civic.7 row flipped `needs-info` → `done-pending-archive` with full closure detail

## Why this is engine-sheet's pickup

The investigation requires sheet reads + applyTrackerUpdates trace + potentially a script fix in the engine layer. The agent-side and skill-text edits (Phase 2b commitment-tracking, Phase 3 prep skill wiring) cross into research-build but are small and can be done in the same engine-sheet session OR handed back to research-build as a sub-task.

If Phase 1 reveals Scenario B with a writeback bug, the whole row stays engine-sheet. If Phase 1 reveals Scenario A, engine-sheet ships the helper script (Phase 3) and flags Phase 2b for research-build as a follow-up commit.

## What this plan does NOT cover

- The broader civic-commitment-tracking pattern (every voice's `NextScheduledAction` should be checked at the prep step of the cycle it falls into). civic.7 closes the INIT-005 specific case; the general pattern would be a separate civic.* row if the prep-skill grep proves load-bearing across cycles.
- The trackerOwner field interaction (civic.9a/9b just shipped) — Chen-Ramirez's ownership of ImplementationPhase on INIT-005 is implicit in the current schema; once civic.9b's trackerOwner taxonomy is in effect, this kind of "did the right voice own the write" question is structurally answerable. civic.7 closes the immediate gap; civic.9 prevents the class.

## Changelog

- 2026-05-11 — Plan filed (S215 research-build close). Engine-sheet picker-grab. Investigation procedure + acceptance criteria + helper-script spec inline. Registered in [[../index]].
- 2026-05-12 — Closed (S216 engine-sheet). Outcome: **Scenario C — engine auditor false positive**, neither A (commitment slipped) nor B (writeback bug). Phase 1 read of Initiative_Tracker INIT-005 row directly: `ImplementationPhase = "design-development-active"` (advanced from C92's `design-phase`); MilestoneNotes contains C93 entry naming Atlas Bay Architects executing $4.5M fixed-fee contract + Sarah Huang on-site + 30% schematic + 52-resident community workshop. Chen-Ramirez C93 voice JSON wrote `trackerUpdates.ImplementationPhase = "design-development-active"` correctly; applyTrackerUpdates fired correctly. Bug located in `scripts/engine-auditor/detectStuckInitiatives.js` v1.0.0 — `cyclesInPhase()` walked priors, found INIT-005 in `design-phase` ≠ current `design-development-active`, exited loop with `cyclesInState=null`, triggered cold-start vote-cycle fallback (93−80=13), false-flagged stuck. Fix v1.1.0: `everSeenInPriors` flag + break-on-snapshot-phase-mismatch. Cold-start fallback now only fires when initiative was NEVER in any prior audit. Verified: detector re-run on C93 data drops INIT-005 + INIT-003 from stuck-initiative list (both phase-advanced this cycle); 3 stable-phase initiatives (INIT-001/002/006) still report inflated counts from carry-forward poisoning of older bad seed values — split out as ROLLOUT engine.12 (needs-info; options: regenerate priors / sanity clamp / one-cycle reset pass). Phase 3 helper `scripts/readInitiativeMilestoneNotes.js` shipped — reads single Initiative_Tracker row, splits MilestoneNotes on C{NN} boundaries, highlights matching cycle entry with star marker. City-hall-prep Step 1 wiring (Phase 3.2 of plan) split out as ROLLOUT civic.11 (research-build domain).
