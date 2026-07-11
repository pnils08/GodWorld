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
- **Status:** [x] **DONE S311** — `fileDeskArticles()` added to `scripts/postRunFiling.js` (runs first on every check, all run types): mirrors `output/reporters/<r>/articles/c{XX}_*.md` into `output/desks/{desk}/articles/<reporter>__<file>.md`. Desk resolves from the article's own byline (piped + desk-only forms, `Section`/`Desk` suffixes stripped, freelance/accountability/metro→civic aliases) with roster-JSON fallback for byline-less first-person features. Verified on C98 (5/5 filed) + C100 (5/5 across civic/culture/sports/business). Idempotent, never guesses — unresolvable desks logged + skipped.

### Task 2: Byline + desk ingest tags
- **What:** Add `byline` + `desk` to the metadata maps in `scripts/ingestEdition.js` + `scripts/ingestEditionWiki.js` (today: `cycle`/`type`/`citizen`, no byline/desk).
- **Verify:** a bay-tribune query filtered on byline returns that reporter's pieces — the "what I've said" / self-knowledge capability.
- **Note:** Task 1 + Task 2 = the dual-axis-growth substrate. Apply *canonize meaning, not metrics* to WHAT gets ingested — story-level records (finding, blind-spot, who-to-watch), not stat dumps.
- **Status:** [x] **DONE S311** — `ingestEdition.js`: per-chunk `extractBylineMeta()` merges `byline` + `desk` into each chunk's metadata (tested on c100 text: 6 bylines, 4 desks extracted clean). `ingestEditionWiki.js`: citizen-appearance records gain `reporters` metadata. **Bonus defect fixed:** wiki `addMemory()` accepted metadata and silently DROPPED it — the v4 payload never included the field, so recordType/citizen/cycle/sections never reached Supermemory since the endpoint switch; now sent per-item (official SDK sends metadata first-class; non-2xx rejects loudly so a shape mismatch can't fail silent). Live retrieval verify (byline-filtered bay-tribune query) rides the next edition ingest — C101, media's approval-gated run. Sibling `ingestCivicWiki.js` has the same dropped-metadata shape — flagged, not touched (no metadata maps to carry yet).

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

- **D1 — RESOLVED (S289).** Desks write per-desk (stored + searchable per-desk); collected into the edition envelope at publish; the strongest piece takes front page. Selection at combine-time is Mike's call.
- **D2 — source-search subagent cap.** Default 3 (proofs used 3); tunable per desk; over-spawn guard.
- **D3 — RESOLVED (S289): build-and-test side fork, cutover gated on process-completeness.** An earlier same-session pass at this row said "full-edition-by-default" — corrected. The new fork (working name `/sift-dispatch`, see [[2026-07-03-sift-deep-dispatch-reconcile]]) builds and tests alongside the live `/sift` → `/write-edition` all-desks-parallel path, which stays untouched and keeps publishing. Cutover happens once the fork proves it puts out complete desk editions end-to-end, not on a fixed cycle. The original subset-first instinct was closer to right than the immediate-full-edition reading this row first carried.
- **D4 — world-summary reconciliation priority.** Surface `engine_anomalies` `cover-as-story` items in `buildWorldSummary.js`. NOT a deep-dispatch prereq (deep desk reaches `engine_anomalies` directly). File as a **parallel engine-sheet fix** benefiting the legacy path + sift-orientation + city-hall. Independent priority.

## Status log

### Phase 2 BUILT — S274 (research-build designs; media executes)

Tasks 3–6 shipped as design artifacts (Phase 2 is RB-builds-media-executes; no Phase 1 dependency for the *design* — only the Phase 3 pilot needs the substrate):

- **Task 3 — charge-brief template:** [[../media/charge_brief_template]] (four-part charge: project + beat + cycle + canon-map-as-pointers; latitude over angle AND subject; two LOCKED forks restated; two S272 craft lines — lived-anchor + canonize-meaning; freshness writer-backstop) + worked exemplar [[../media/examples/charge_brief_c100_civic_exemplar]] reconstructing the C100 civic charge that produced Carmen's A piece.
- **Task 4 — dispatch-inversion harness:** new skill `.claude/skills/deep-dispatch/SKILL.md` (v0.1). **Inverts write-edition Step 1 ONLY**, then returns control to the existing Step 2 review + Step 3 compile/parser-gate — the published `.txt` + ingest stay single-sourced (do not fork the S240-fragile parser contract). Both LOCKED forks enforced (orchestrator spawns ≤3 Explore searches / desk only writes, no Agent grant; charge = pointers not data). Build-alongside; baseline stays pristine for the Phase 3 comparison.
- **Task 5 (orchestrator half) — freshness guard:** reconcile pass at skill Step 3 (cross-check ≤3 returns; newer/primary wins on specific civic facts; contradicted scope = HARD STOP) + the writer-backstop FRESHNESS line in the charge template. (Raw-data *routing* half stays engine-sheet substrate — independent.)
- **Task 6 — floor recalibration:** **refined against Rhea's actual scope.** Rhea is sourcing-only and already verifies specifics in `vote-civic-verification` (check 2); the C100 suppress-reflex was NOT Rhea's — it happened at sift→civic-voice→edition. So: **bug-is-event** (cover-the-anomaly, translate-don't-suppress) → `docs/media/story_evaluation.md` §Anomalies Are Events (selection-side) + the charge PROJECT block (write-side); **don't-strangle-reach** → `.claude/agents/rhea-morgan/RULES.md` §Deep-Dispatch Calibration (verify-side: reach/real-entity-comps/interpretation are not sourcing failures; verify the freely-reached specifics harder). No blunt edit to a wrong file.

Registered same commit (index.md ×2, ROLLOUT state flip to Phase 2 DONE). **Phase 1 (engine-sheet) still UNSTARTED — it blocks the Phase 3 pilot, flagged to engine-sheet for parallel build.** Phase 3 pilot is media, gated on Phase 1.

### S289 — deep-dispatch is where editions are headed; built as a side fork off sift, not a default-path flip (Mike-direct, research-build)

Mike's build directive: stop running all desks in parallel is the direction, but this cycle's actual build is a **side skill forking off `/sift`** — the existing `/sift` → `/write-edition` all-desks-parallel path stays untouched and keeps publishing editions while the new fork is built and tested. Full addendum in [[../adr/0012-autonomous-deep-dispatch-write-edition]] (corrected same-session — an earlier pass at this addendum said deep-dispatch supersedes the cost-gate and becomes default now; that overstated it). Summary here:

- **Cutover gate is process-completeness, not cost.** Phase 3 cost/depth measurement still rides along, but the actual gate is: the new fork has to be able to put out complete desk editions end-to-end before anything takes over.
- **D1 resolved:** per-desk write → combine into envelope at publish → strongest piece takes front page.
- **D3 resolved:** build-and-test side fork; existing pipeline stays live; cutover gated on the fork proving out, not a fixed cycle.
- **Operating model** for the new fork (uses the existing deep-dispatch skill mechanics, adds no new spawn capability): a new side skill — working name `/sift-dispatch` — forks off sift's inputs and assigns all potential storylines with a per-storyline format tag (feature/interview/dispatch — supplementals stay outside this run); a storyline is written only if it clears a why-this-story test at assignment (write-gate, not a publish-gate) — unwritten assignments still save to the journalist's file/corpus; desks run staggered within the new fork; both LOCKED forks (orchestrator spawns / desk only writes) hold unchanged. `/sift` itself is NOT edited.
- **Testing has value before cutover:** the S272 concept proofs (Hal's sports piece, Carmen's civic piece) prove test output from this shape can be canon-worthy on its own, not just a pass/fail signal.
- **New build item scoped:** [[2026-07-03-sift-deep-dispatch-reconcile]] — the new side-skill plan (scope changed mid-session from "edit `/sift` in place" to "new skill, sift untouched").
- **Still blocking:** Phase 1 substrate (engine-sheet, unstarted) — the harness runs without it, but the visible-unwritten-assignment / self-knowledge benefit doesn't land until per-desk storage + byline/desk tags exist.

### research.20 — status (drained from ROLLOUT, 2026-06-26 / S274)

**Autonomous deep-dispatch — `/write-edition` retool** (S272 Mike-direct, off the storytelling-depth seed). Invert the back half of `/write-edition`: one-desk-deep + orchestrator-spawned bounded source-search (≤3) + **charge-brief** (project+beat+cycle+**canon-map-as-pointers**, latitude over angle AND subject) replacing the prescriptive packet; raw data **REACHED at runtime** (not pre-assembled — pre-packaging rebuilds the bone-filtered packet); floor recalibrated to **verify-specifics** (vote math/scope/dates) + **bug-is-event** (translate-don't-suppress — the C100 G-EC33 scrub was the no-metrics rule over-applied) NOT strangle-reach (real-entity comps OK); per-desk corpus + byline/desk ingest tags (self-knowledge / dual-axis growth, canonize meaning not metrics). **Two A-graded floor proofs S272** (sports Tier-1; civic best-civic-ever/#2 — independently surfaced the C100 Coliseum crime-spike + sentiment anomaly the live pipeline suppressed; external review flagged emergent lane-differentiation = the moat). **Two LOCKED forks:** orchestrator spawns search / desk only writes (desk agents keep current tools, no Agent capability — dodges S256); canon-map = pointers+tools NOT pre-assembled data. Build **alongside** (don't rip out the monolith first), ~4× agent-count/edition est., **cost-gated migration** at Phase 3. ADR-0012. **Phase 1 substrate → engine-sheet** (reactivate `output/desks/{desk}/articles/` per-desk corpus + add `byline`/`desk` to `ingestEdition.js`/`ingestEditionWiki.js`); Phase 2 harness+floor = research-build designs / media executes; Phase 3 pilot+measure. Open D1–D4 (edition-artifact shape / subagent cap / pilot scope / **D4 world-summary reconciliation = parallel engine-sheet fix, NOT a prereq** since the deep desk reaches `engine_anomalies` directly).

---

## Relocated ROLLOUT_PLAN row detail — 2026-07-02 (S286 pointer-collapse)

Verbatim rows moved out of ROLLOUT_PLAN.md when it collapsed to pointer-only. This is the working detail for the open job(s); the rollout row is one line pointing here.

### research.20

| research.20 | **Autonomous deep-dispatch — `/write-edition` retool** (S272 Mike-direct, off the storytelling-depth seed). Invert the back half of `/write-edition`: one-desk-deep + orchestrator-spawned bounded source-search (≤3) + **charge-brief** (project+beat+cycle+**canon-map-as-pointers**, latitude over angle AND subject) replacing the prescriptive packet; raw data **REACHED at runtime** (not pre-assembled — pre-packaging rebuilds the bone-filtered packet); floor recalibrated to **verify-specifics** (vote math/scope/dates) + **bug-is-event** (translate-don't-suppress — the C100 G-EC33 scrub was the no-metrics rule over-applied) NOT strangle-reach (real-entity comps OK); per-desk corpus + byline/desk ingest tags (self-knowledge / dual-axis growth, canonize meaning not metrics). **Two A-graded floor proofs S272** (sports Tier-1; civic best-civic-ever/#2 — independently surfaced the C100 Coliseum crime-spike + sentiment anomaly the live pipeline suppressed; external review flagged emergent lane-differentiation = the moat). **Two LOCKED forks:** orchestrator spawns search / desk only writes (desk agents keep current tools, no Agent capability — dodges S256); canon-map = pointers+tools NOT pre-assembled data. Build **alongside** (don't rip out the monolith first), ~4× agent-count/edition est., **cost-gated migration** at Phase 3. ADR-0012. **Phase 1 substrate → engine-sheet** (reactivate `output/desks/{desk}/articles/` per-desk corpus + add `byline`/`desk` to `ingestEdition.js`/`ingestEditionWiki.js`) — UNSTARTED, blocks the Phase 3 pilot. **Phase 2 BUILT S274 (research-build):** charge-brief template [[../media/charge_brief_template]] + C100 civic exemplar; `/deep-dispatch` skill (inverts write-edition Step 1 only, reuses existing Step 2/3 compile — no parser-contract fork; two LOCKED forks enforced; Task 5 reconcile-pass = orchestrator half); floor recalibration (bug-is-event into `story_evaluation.md` selection-side + Rhea RULES.md verify-side don't-strangle-reach — verify-specifics already lived in Rhea check 2, suppress-reflex was NOT Rhea's, it was sift→civic-voice→edition). Phase 3 pilot+measure = media, gated on Phase 1. **STALE-ROW FIX S291 (research-build):** D1 + D3 RESOLVED S289 (see plan §Open decisions) — this row's "Open D1–D4" language predates that resolution and was never cleared. Only D2 (subagent cap, defaulted to 3) and D4 (independent parallel fix) remain, neither blocking. | Phase 1 substrate → engine.46 (its own ROLLOUT row, filed S291 so engine-sheet's boot-read surfaces it); Phase 2 DONE S274; Phase 3 pilot → media (gated on Phase 1/engine.46) | research-build (design+Phase 2 DONE) → engine-sheet (engine.46) → media (pilot) | [[../adr/0012-autonomous-deep-dispatch-write-edition]] + [[../plans/2026-06-25-deep-dispatch-write-edition-build]] |

