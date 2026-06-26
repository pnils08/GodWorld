---
title: Autonomous Deep-Dispatch — write-edition Build Plan
created: 2026-06-25
updated: 2026-06-25
type: plan
tags: [newsroom, write-edition, dispatch, autonomy, active]
sources:
  - "[[../adr/0012-autonomous-deep-dispatch-write-edition]] — the decision this plan executes"
  - "[[../RESEARCH]] — S272 finding (two floor proofs, C100 failure trace, the deltas)"
  - "[[../EDITION_PIPELINE]] — the /write-edition stage being retooled (structure upstream unchanged)"
  - "test artifacts: output/desk-test/sports_c100_deep_hal.md, output/desk-test/civic_c100_deep_carmen.md"
pointers:
  - "[[../engine/ROLLOUT_PLAN]] — parent rollout; engine-sheet substrate rows land here"
  - "[[../adr/0012-autonomous-deep-dispatch-write-edition]] — load-bearing decision"
  - "[[SCHEMA]] — doc conventions"
  - "[[index]] — registered same commit"
  - "[[2026-06-26-citizen-signal-story-emergence]] — research.21 supplies the aggregation+consumption half of report-through-citizens this plan's reporting-shift needed; complementary (deep-dispatch reshapes HOW a desk writes, that generates WHAT gets written about, bottom-up)"
---

# Autonomous Deep-Dispatch — write-edition Build Plan

**Goal:** Make deep-dispatch a runnable, measured production path for `/write-edition` — one-desk-deep with a charge-brief + orchestrator-spawned source-search + a recalibrated floor — pilot it on a live cycle, measure depth + cost against the parallel-template baseline, and cost-gate the migration. "Done" = the new path runs a full cycle, the numbers are in, and the migration decision is data-backed. **Build alongside; do not rip out the monolith first.**

**Architecture:** Retool the back half of `/write-edition`. Two forks are **LOCKED** — getting either wrong silently rebuilds the thing we're killing:

- **Orchestration — the orchestrating skill spawns the source-search subagents; the desk agent only writes.** Desk agents keep their current tools (Read/Glob/Grep/Write/Edit); they are NOT granted Agent capability. Both S272 proofs ran exactly this way (Mags-as-orchestrator spawned search, handed assembled sourcing to a writer). This also keeps us out of the 25-agent-file swamp (S256): nothing in the agent files changes.
- **The canon-map is pointers + tools, NOT pre-assembled data.** The charge *points* the source-search subagents at the raw sources (`engine_anomalies`, sheets, `neighborhoodState`) and grants the tools; the subagents reach raw data at runtime. Do NOT build a script that pre-packages raw data into the charge — that recreates the bone-filtered packet with more fields, which is the failure mode the whole retool exists to kill.

Build order: **substrate (engine-sheet) → harness + floor (research-build designs / media executes) → pilot + measure (gate).**

**Terminal:** research-build (this design). Execution routes per task: substrate → engine-sheet; charge/harness/floor → research-build builds, media executes; pilot → media + research-build.

**Cost shape (back-of-envelope, up front — Mike relaxed the worry but raised it; the architecture *is* the cost):** today ≈ 9 parallel desk agents per edition. Deep-dispatch ≈ 9 desks × (≤3 source-search + 1 writer) ≈ **36 agent runs — roughly 4× the agent count per edition.** The pitch is depth-per-token; absolute $ is unknown until measured. Levers: the subagent cap (D2) and which desks go deep (D3). Phase 3 measures it — this estimate just makes the shape visible before the build, not after.

**Acceptance criteria:**
1. The deep-dispatch path runs end-to-end for one desk on a live cycle, writing to a per-desk store, passing the recalibrated floor.
2. A pilot produces per-desk depth grades + a token-cost number vs the parallel-template baseline.
3. The floor catches a planted specific-fact error (vote math / scope / date) AND does NOT flag a legitimate real-entity comp or a covered engine anomaly.
4. The migration decision (full / partial / hold) is recorded with the cost + depth data behind it.

---

## Phase 1 — Substrate (engine-sheet). Only what blocks the harness.

### Task 1: Per-desk corpus storage (live)
- **What:** Reactivate `output/desks/{desk}/articles/` as the live per-desk article store, written each run (dead since c90 — scaffolding exists).
- **Verify:** after a run, each desk's pieces land in its own store.

### Task 2: Byline + desk ingest tags
- **What:** Add `byline` + `desk` to the metadata maps in `scripts/ingestEdition.js` + `scripts/ingestEditionWiki.js` (today: `cycle`/`type`/`citizen`, no byline/desk).
- **Verify:** a bay-tribune query filtered on byline returns that reporter's pieces — the "what I've said" / self-knowledge capability.
- **Note:** Task 1 + Task 2 = the dual-axis-growth substrate. Apply *canonize meaning, not metrics* to WHAT gets ingested — story-level records (finding, blind-spot, who-to-watch), not stat dumps.

*(World-summary ↔ engine_anomalies reconciliation is deliberately NOT in Phase 1 — see D4. The deep desk reaches `engine_anomalies` directly, so it does not gate this build.)*

## Phase 2 — Harness + Floor (research-build designs / media executes).

### Task 3: Charge-brief template
- **What:** The four-part charge (project + beat + cycle + **canon-map-as-pointers**) replacing the packet. Latitude over angle AND subject (present the citizen pool; the desk picks who carries the story). Carries: the bug-is-event framing; one **lived-experience-anchor** line (a resident/officer/business owner, a sentence of lived experience — the deep pieces skew "relentless"); and the no-engine-metrics rule clarified as **translate the event, strip the number** (not suppress).
- **Verify:** a desk run off the template produces a piece that picks its own angle/subject and traces facts to sources.

### Task 4: Dispatch-inversion harness
- **What:** The one-desk-at-a-time loop — orchestrator builds the charge → spawns ≤N bounded source-search subagents (distinct angles) → hands assembled sourcing to the desk writer → desk writes to its per-desk store. Default cap **N=3** (over-spawn guard, RESEARCH.md:1146). **Orchestrator spawns; desk writes — LOCKED fork.**
- **Verify:** the loop runs a desk deep end-to-end without granting the desk agent Agent capability.

### Task 5: Source-search freshness guard
- **What:** A pre-write reconcile step + charge instruction: cross-check contradictory subagent returns; verify scope/dates/vote-math via MCP before the write. (Fixes the C100 OARI-scope error — a stale subagent return propagated unchecked.)
- **Verify:** a planted stale return is caught/reconciled before the writer sees it.

### Task 6: Floor recalibration (verify-specifics + bug-is-event)
- **What:** Update Rhea's rubric + criteria docs (`docs/media/story_evaluation.md`): (a) verify specific civic facts (vote math, program scope, dates); (b) STOP flagging journalistic reach / real-entity comps (the A's are a real entity — a Rickey Henderson comp is correct); (c) codify **bug-is-event** — engine anomalies / watch-flags are `cover-as-story`, **translate don't suppress**.
- **Trace (done S272):** there is no single hardcoded suppress rule. The C100 G-EC33 scrub was the *legitimate* no-engine-metrics-in-prose rule over-applied into **deleting the event** rather than translating it (Carmen translated it correctly: "aggregate measurement that doesn't disaggregate"). Fix = codify the *translate-the-event / strip-the-number* distinction in the criteria + Rhea rubric, not a line-deletion.
- **Verify:** AC-3 (catches planted specific-fact error; does NOT flag a real-entity comp or a covered anomaly).

## Phase 3 — Pilot + Measure (the gate).

### Task 7: Live-cycle pilot
- **What:** Run deep-dispatch on a live cycle (C101+, against the richer chaos-cars + deeper-packet substrate). Run-time decision: subset of desks deep vs full edition (D3).
- **Verify:** per-desk pieces produced, floor passed.

### Task 8: Cost + depth measurement → migration decision
- **What:** Measure tokens/deep-desk vs template-desk-slice + review grades. Present cost vs depth. Decide full / partial / hold.
- **GATE:** cost-acceptable before killing the monolith. Depth is proven; the bill is not.

---

## Open decisions (resolve at execution; named now)

- **D1 — the post-monolith "edition" artifact.** Storage flips per-desk; the published edition `.txt` + bay-tribune ingest are monolithic (format contract). **Recommend:** desks write per-desk (stored + searchable per-desk), then collected into the edition envelope at publish — keep the format contract + ingest, gain per-desk storage. Confirm at build.
- **D2 — source-search subagent cap.** Default 3 (proofs used 3); tunable per desk; over-spawn guard.
- **D3 — pilot scope.** Subset (2–3 desks deep + rest template — cheaper, partial comparison) vs full edition (true comparison, ~4× cost for one cycle). **Recommend** subset for the first pilot.
- **D4 — world-summary reconciliation priority.** Surface `engine_anomalies` `cover-as-story` items in `buildWorldSummary.js`. NOT a deep-dispatch prereq (deep desk reaches `engine_anomalies` directly). File as a **parallel engine-sheet fix** benefiting the legacy path + sift-orientation + city-hall. Independent priority.
