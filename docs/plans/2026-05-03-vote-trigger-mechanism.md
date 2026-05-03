---
title: Vote-Trigger Mechanism Plan
created: 2026-05-03
updated: 2026-05-03
type: plan
tags: [civic, architecture, draft]
sources:
  - output/production_log_city_hall_c93_run_gaps.md G-R11 (vote-that-didn't-trigger)
  - output/production_log_city_hall_c93_run_gaps.md G-R6, G-R7, G-R10 (project agents invented votes when no mechanism existed)
  - .claude/skills/city-hall-prep/SKILL.md (Voice Data Routing — Wave 2 update)
  - .claude/skills/city-hall/SKILL.md
pointers:
  - "[[engine/ROLLOUT_PLAN]] — parent rollout"
  - "[[plans/2026-05-03-c93-gap-triage-execution]] — Wave 4 parent"
  - "[[SCHEMA]] — doc conventions"
---

# Vote-Trigger Mechanism Plan

**Goal:** When an initiative reaches `phase=vote-ready` + `NextActionCycle=current`, the council vote actually fires, produces a deterministic tally with all 9 council members accounted for, and advances the initiative's phase. Project agents read the tally as canon — they never invent it.

**Architecture:** Two complementary mechanisms layered. (a) `/city-hall-prep` adds a "vote-this-cycle detection" pass that routes vote-ready initiatives to ALL 9 council voices via the 3 faction-bloc agents (`opp-faction` covering Carter D1 + Delgado D3 + Rivers D5 + Chen D8 + Mobley D9; `crc-faction` covering Ashford D7 + Crane D6; `ind-swing` covering Vega D4 + Tran D2) + the relevant district owner. Currently only the district owner sees the vote — leaving 8/9 positions undefined. (b) New `/council-vote` skill runs between Layer 2 (voice agents) and Layer 3 (project agents), takes initiative + faction bloc positions + member-specific overrides + Mayor cascade, computes deterministic tally, advances phase. Project agents read `output/council_votes_c{XX}.json`; their RULES.md prohibition against fabricating tallies (Wave 2) becomes enforceable because the data is now there.

**Terminal:** research-build (design + skill writing) → civic (validation in next /city-hall run); engine-sheet only if /council-vote needs deterministic tally script

**Pointers:**
- Gap entry: `output/production_log_city_hall_c93_run_gaps.md` §G-R11 (full diagnosis)
- Related canon-fabrication cluster: G-R6, G-R7, G-R10, G-W12 (Wave 2 RULES hardening addresses the *prohibition* side; this plan addresses the *data-availability* side — both are needed)
- Sibling but distinct: Wave 3 BUNDLE-D `assembleDecisions.js` (consolidates voice JSONs into per-initiative `decisions_c{XX}.json`). That bridges voices → tracker. This plan bridges initiative-vote-due → 9 positions → tally → phase advance. Different layer.
- Wave 2 commit `cd89cc5` — RULES.md text now hard-prohibits fabricating tallies; without this plan landing, agents have nothing to read instead.

**Acceptance criteria:**
1. C94 cycle: an initiative with `phase=vote-ready` and `NextActionCycle=94` produces a real 9-member tally written to `output/council_votes_c{XX}.json` without any project-agent invention.
2. `/city-hall-prep` Step 2 (Topic Assignments) detects vote-this-cycle initiatives and routes each to all 3 faction-bloc agents + the relevant district owner — every pending_decisions.md affected gets the vote on its desk.
3. `/council-vote` skill (NEW) runs after Layer 2 voices, before Layer 3 projects. Reads voice statements + faction-bloc positions + member-specific overrides + Mayor cascade. Computes tally. Writes `council_votes_c{XX}.json` with member-by-member positions, abstentions/absences clearly distinguished from votes, final tally, phase-advance recommendation.
4. Project agents' RULES.md prohibition (Wave 2) holds because the tally exists in `council_votes_c{XX}.json` for them to read; they describe operational reality conditioned on the tally without inventing it.

---

## Phase 1 — Design (research-build, must complete before Phase 2)

Open questions resolve here. Output: this plan's §Open Questions section all answered. Then move to Phase 2.

### Task 1.1: Resolve absence/abstention semantics

- **Question:** When a council member has no voice statement this cycle (faction-bloc agent didn't speak for them, no member-override), is their vote `ABSENT`, `ABSTAIN`, or `NOT_VOTING`? How does it affect tally?
- **Anchor:** Health Center C93: "Crane was ABSENT (recovering), NOT voting no" — agent RULES.md flagged this as a rule violation (recasting absence as opposition). The tally semantics need to honor this distinction.
- **Recommended default:** member with no statement = `NOT_VOTING` (does not count toward yes/no/abstain); explicit "absent" requires explicit signal (Mara directive or Mayor cascade noting the member's recovery/travel/etc.); `ABSTAIN` requires the member's voice agent to explicitly state abstention.
- **Output:** spec table in `/council-vote` SKILL — ABSENT vs ABSTAIN vs NOT_VOTING tally treatment.
- **Status:** [ ] not started

### Task 1.2: Resolve faction-bloc vs member-override conflict

- **Question:** When opp-faction speaks "OPP bloc votes YES" but a specific OPP member has a member-override statement saying "I vote NO" — which wins?
- **Recommended default:** member-override wins (matches real-world legislative reality where bloc whips can be defied; protects narrative space for emergent dissent).
- **Output:** conflict resolution rule in /council-vote SKILL.
- **Status:** [ ] not started

### Task 1.3: Resolve tie-breaking

- **Question:** 9-member council. 4-4 with one absence — does that pass or fail? Does Council President (Vega D4) get a tie-breaker beyond his own vote?
- **Anchor:** Real-world Oakland City Council canon — Council President's vote counts as one but does NOT have tie-breaking authority (some bodies do; Oakland's typically don't). Tie = motion fails by default.
- **Recommended default:** 4-4-1 = motion fails. 5+ YES = passes. Council President is one vote.
- **Output:** tie-break rule.
- **Status:** [ ] not started

### Task 1.4: Resolve sequencing — when does the vote fire relative to Mayor cascade?

- **Question:** Mayor's positions cascade into voice agents (Layer 1 → Layer 2). Does the vote fire AFTER all voice statements are in (preferred — voices have full context) or DURING Layer 2?
- **Recommended default:** AFTER Layer 2 completes — /council-vote is its own layer between Layer 2 and Layer 3. Voice agents get to react to the Mayor; council-vote then aggregates their positions.
- **Status:** [ ] not started

### Task 1.5: Resolve who writes the canonical tally — model-reasoning vs deterministic script

- **Question:** Is `/council-vote` a model-reasoning skill (Mags reads voices + faction positions, judges the tally) OR a deterministic script (rule-based tally computation)?
- **Tradeoff:** model-reasoning handles novel situations (a faction member's statement is ambiguous; how to read it?) but is non-deterministic. Script is deterministic but rigid on edge cases.
- **Recommended split:** skill text describes how Mags resolves position ambiguities BEFORE calling the script; deterministic script `scripts/computeCouncilTally.js` consumes resolved positions and computes the tally per Phase 1 rules. Skill = judgment, script = arithmetic.
- **Status:** [ ] not started

---

## Phase 2 — `/city-hall-prep` extension (research-build)

### Task 2.1: Vote-this-cycle detection pass

- **Files:**
  - `.claude/skills/city-hall-prep/SKILL.md` — modify
- **Steps:**
  1. New §Step 2.5 "Vote-this-cycle Routing" — after topic assignments, scan Initiative_Tracker for rows where `phase=vote-ready AND NextActionCycle=<current>`
  2. For each match: ensure pending_decisions.md is written for `civic-office-opp-faction`, `civic-office-crc-faction`, `civic-office-ind-swing`, plus the district owner if not already in those blocs
  3. Each routed pending_decisions.md gets a §Vote Required block with initiative + Mayor cascade + faction positions from prior cycle + the question being voted on
- **Verify:** dry-run against C93 — Transit Hub initiative routes to all 3 faction-bloc agents + the relevant district owner instead of just Vega
- **Status:** [ ] not started

---

## Phase 3 — `/council-vote` skill (research-build)

### Task 3.1: Create `/council-vote` SKILL.md

- **Files:**
  - `.claude/skills/council-vote/SKILL.md` — create
- **Steps:**
  1. Goal: produce `output/council_votes_c{XX}.json` with deterministic tally
  2. Inputs: all Layer 2 voice JSONs from `output/civic-voice/*_c{XX}.json`, Mayor cascade from `mayor_c{XX}.json`, faction-bloc positions, member-override statements
  3. Per-initiative process: collect 9 member positions (resolving Phase 1 Task 1.2 conflicts), apply Phase 1 rules (absent/abstain/not_voting + tie-break + sequencing), compute tally via `scripts/computeCouncilTally.js`, recommend phase advance
  4. Output schema (TBD per Phase 1 Task 1.1 + 1.5 outcomes — likely `{ initiative, members: [{district, name, position, source}], tally: {yes, no, abstain, not_voting, absent}, outcome: pass|fail, phaseAdvance: <new-phase>|null }`)
- **Verify:** `/council-vote 94` (when C94 runs) produces tally for every vote-ready initiative
- **Status:** [ ] not started

### Task 3.2: Wire `/council-vote` into `/city-hall` ordering

- **Files:**
  - `.claude/skills/city-hall/SKILL.md` — modify
- **Steps:**
  1. Insert new Step 4.5 "Council Votes" between Step 4 (Layer 2 voices) and Step 5 (Layer 3 projects)
  2. Step 4.5 invokes `/council-vote <cycle>`; output gates Step 5 (project agents must see the tally before they write)
- **Verify:** `/city-hall` runs Layer 2 → /council-vote → Layer 3 in that order
- **Status:** [ ] not started

### Task 3.3: Build deterministic tally script

- **Files:**
  - `scripts/computeCouncilTally.js` — create (engine-sheet may pick this up)
- **Steps:**
  1. Read resolved positions from `/council-vote` skill output
  2. Apply Phase 1 rules deterministically
  3. Return tally JSON
- **Verify:** unit test on C93 Transit Hub fixture — produces a real tally given hypothetical voice positions
- **Status:** [ ] not started

---

## Phase 4 — Project-agent RULES.md update (research-build)

### Task 4.1: Add "read the tally" rule to 5 project-agent RULES.md

- **Files:** Same 5 project agents from Wave 2 (transit-hub, stabilization-fund, oari, health-center, baylight-authority) — modify each
- **Steps:**
  1. Add to §Council Canon section: "If a vote occurred this cycle on your initiative, read `output/council_votes_c{XX}.json` for the tally. Reference it as canon. Do NOT recompute or re-narrate the tally beyond what the JSON contains. Per-member positions, outcome (pass/fail), and phase-advance recommendation all come from the JSON."
- **Verify:** `grep -l "council_votes_c" .claude/agents/civic-project-*/RULES.md .claude/agents/civic-office-baylight-authority/RULES.md` returns ≥5 files
- **Status:** [ ] not started

---

## Phase 5 — C94 validation (civic terminal)

### Task 5.1: Run /city-hall C94 with vote-trigger mechanism live

- Acceptance criteria 1-4 above all hold
- If Transit Hub still has a vote scheduled C94, this is the immediate fixture
- **Status:** [ ] not started

---

## Open questions

- [ ] Phase 1 Task 1.1 — absent/abstain/not_voting semantics (recommended: NOT_VOTING default, ABSENT requires explicit signal)
- [ ] Phase 1 Task 1.2 — bloc vs member-override conflict (recommended: override wins)
- [ ] Phase 1 Task 1.3 — tie-breaking + Council President role (recommended: tie = motion fails; CP is one vote)
- [ ] Phase 1 Task 1.4 — sequencing (recommended: vote fires AFTER Layer 2)
- [ ] Phase 1 Task 1.5 — model-reasoning vs deterministic-script split (recommended: skill = judgment, script = arithmetic)

All five recommendations are research-build defaults pending Mike's grill before Phase 2 starts.

---

## Changelog

- 2026-05-03 — Initial draft (S197). Wave 4 of [[plans/2026-05-03-c93-gap-triage-execution]]. Status: DRAFT — Phase 1 open questions must resolve before Phase 2 starts. Approved by Mike S197 without per-plan review ("I don't need to see these tbh I'm not aware of all that was logged") — plan content is research-build's editorial synthesis from gap logs, defaults marked recommended-pending-grill.
