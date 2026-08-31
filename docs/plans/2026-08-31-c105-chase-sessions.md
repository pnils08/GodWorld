---
title: C105 Chase — Session Breakdown
created: 2026-08-31
updated: 2026-08-31
type: plan
tags: [engine, chase, active]
sources:
  - output/execution_log_c105.md §Annotations
  - output/production_log_run_cycle_c105_gaps.md §G-PF14–G-PF32
  - docs/engine/ROLLOUT_PLAN.md engine.138
pointers:
  - "[[engine/ROLLOUT_PLAN]] — parent rollout (engine.138)"
  - "[[2026-08-29-employment-system-cascade]] — the unfinished cascade plan; S2 feeds it"
  - "[[../for-claude-review/2026-08-30-grok-education-system]] — the education build that follows the chase"
  - "[[index]] — add entry in same commit"
---

# C105 Chase — Session Breakdown

**Goal:** Clear the C105 anomaly backlog in bounded, single-cluster sessions, so no further cycle runs on top of known-broken world logic.

**Architecture:** This is not a build plan — it is a **scheduling** plan. The C105 fire left 13 lettered execution-log annotations and 26 gap-log entries; the ones still open are live every cycle. This file carves them into sessions that each own ONE cluster, name their entry point and exit condition, and declare up front whether they produce engine code (bench-gated) or Node-side code (not). Ordering is by world damage, not by ease.

**Terminal:** engine/sheet

**Standing constraints (these shape the whole schedule):**

1. **Deploy is blocked on a new sandbox.** The current bench (SANDBOX 0827 @19) predates the C105 live run, so it cannot prove anything against current state. Standing up a fresh one is a builder action. **Therefore: batch every engine-code fix so ONE bench wave covers them all.** A session that produces engine code ends at "committed, undeployed" — never at a deploy.
2. **One cluster per session.** Cost is the binding constraint. A session that ends mid-cluster costs more than one that closes a small cluster, because the next session re-reads the context.
3. **Chase before build.** The business cascade is unfinished and education is queued behind it, but a running sim with known-broken civic logic manufactures new anomalies every cycle. Chase first.
4. **Every chase session uses the maps, not grep-by-hand.** `node scripts/ctxMap.js <field>` for field wiring, `ENGINE_STUB_MAP` / `ENGINE_STUB_REVERSE` for function shape, and the `engine-wiring` subagent for any target touching more than two files. Sonnet for reasoning fan-out, Haiku for grunt. Never Fable in a subagent.
5. **Verify the log line before believing the finding.** S405 precedent: of three "confirmed" C105 findings chased, **two were misread log lines** (G-PF16's mechanism, A2's "zero denominator"). Read the emitting code before accepting what an annotation says a number means.

---

## Session order

| # | Session | Cluster | Code side | Why here |
|---|---------|---------|-----------|----------|
| S-A | Civic contradiction | B1/G-PF19 + B2 | ENGINE (bench) | The city's most visible number is wrong every cycle |
| S-B | Storyline resolution | B3/G-PF20 + C1 + G-PF28 | ENGINE (bench) | `/sift` opens on an empty slate; blocks the newsroom |
| S-C | Pipeline chain hygiene | G-PF24 + G-PF25 + G-PF23 + G-PF26 | NODE (no bench) | Cheap, offloadable, unblocks content quality |
| S-D | Dead-file triage | G-PF32 | mixed | 35 files; decides what is history vs missing feature |
| S-E | Instrumentation debt | A5 + A6 + A7 + G-PF22 + G-PF14 + G-PF30 + G-PF31 | mixed | Diagnostic only; batch and close |
| — | *then* | business cascade finish → education | — | Build resumes once the sim stops generating anomalies |

**B4 needs no session — it is already answered.** The hood swings it flagged wanted `cascadeAudit`'s spread lane run against post-C105 state; S405 did that and it PASSes at 2.74pp with all five invariants green. Close B4 citing `output/audit-reports/cascade-audit-2026-08-31.md` when S-A next touches the log.

**A2 + A4 do not belong in the chase.** A2 is closed (misread log line). A4 (`updateHeritage_` all counters zero) is a business-formation path reporting nothing — same domain as the unfinished cascade. It rides the business-cascade plan, not a chase session.

---

## Tasks

### Session S-A: the civic contradiction — three systems, six initiatives, three answers

**Entry:** `output/production_log_run_cycle_c105_gaps.md` §G-PF19; `output/execution_log_c105.md` B1 + B2.

**The contradiction, stated precisely.** On C105 the approval engine docked Mayor Santana 2 points on each of six initiatives for "sitting, nothing free" (82 → 69) and hit council seats the same way (Carter −7, Delgado −7, Rivers −5). In the same cycle the engine audit counted **four of those six as improvements** (OARI → implementation-active, Youth Apprenticeship → pilot-active, Transit Hub → visioning, Baylight → vote-scheduled). And `civicInitiativeEngine v1.6` reported `Processed 0 initiatives | Votes: 0 | Grants: 0` — a third reading, in which there was nothing to work on at all.

**Work:**
1. `engine-wiring` card on `updateCivicApprovalRatings_` and `civicInitiativeEngine_`; `ctxMap.js` on whatever field carries initiative phase into each.
2. Determine what "sitting, nothing free" actually measures — phase advancement, or a free *action slot*, or neither. Read the emitting code; do not trust the log's wording (S405 precedent).
3. Determine why the initiative engine's scope is empty while the approval engine reads six.
4. Fix the one that is wrong. If "sitting" is measuring an action slot and that is intentional, the defect is the **wording**, and the fix is the log line plus a note — not the scoring.

**Exit:** one ruling per system, the disagreeing one fixed or documented as intentional, G-PF19 and B1/B2 closed or re-scoped. Engine code committed undeployed.

**Do not:** retro-correct the mayor's stored approval number. Engine output is canon; a wrong number that fired is an event citizens lived. Fix forward.

---

### Session S-B: storylines have no way to end

**Entry:** §G-PF20; execution log B3 + C1. Related: §G-PF28.

**The finding.** `updateStorylineStatus_ v1.2` reported `Dormant: 0, Concluded: 0, Abandoned: 9, Reactivated: 0` — every open thread dropped in one pass. Several *should* have concluded (OARI's "whether the program launches is the story" — it launched that cycle). 9/9 abandoned with zero concluded is the signature of a status engine with no "this resolved" path: everything either persists or is abandoned. `/sift` therefore opens C105 on an empty slate. C1 pairs with it — `processMediaIntake_` ingested 0 articles and 0 storylines while routing 11 citizens, so the newsroom→engine return path moved almost nothing.

**Work:**
1. `ctxMap.js` + stub map on the storyline status path; establish whether a `concluded` transition exists in code at all or only in the enum.
2. If it does not exist, build it: a storyline whose subject reached a terminal state concludes rather than being abandoned. Abandonment should mean "nobody carried it," not "it finished."
3. C1: trace why intake ingests zero articles while routing citizens.
4. **G-PF28 rides here** — `S.mediaEffects` is read at Phase5 and written at Phase7, so media feedback has never reached citizen events. Same media↔engine seam, and the carrier decision is the same shape as G-PF18's (add to the `finalizeCycleState_` carry-forward payload, or move `mediaFeedbackEngine_` earlier). Pick the payload route unless moving the phase is provably free.

**Exit:** storylines can conclude; G-PF20, B3, C1, G-PF28 closed. Engine code committed undeployed.

---

### Session S-C: pipeline chain hygiene (Node-side, offloadable)

**Entry:** §G-PF23, §G-PF24, §G-PF25, §G-PF26. No engine code — nothing here is bench-gated, so this session's output is live the moment it lands.

1. **G-PF25 — chain order.** Step 5.57 `buildWorldState.js` runs before Step 5.8 `buildDeskPackets.js` but reads the `base_context.json` that 5.8 produces. Either reorder or have the fold declare its dependency and fail loudly. **Do this one first** — it corrupts every downstream artifact in the run.
2. **G-PF24 — dead hood gate.** `draftContentRows.js` rejected 5 of 6 candidates on snake_case hood tokens (`lake_merritt`) that the gate vocabulary does not match. Confirm which vocabulary is canonical, then align one side.
3. **G-PF23 — canon identity.** `buildNeighborhoodTexture.js` reads blocklists but never `docs/canon/INSTITUTIONS.md`, so hood texture is written from what it must avoid rather than from what the hood *is*. Feed the per-hood institution set in.
4. **G-PF26 — sports-feed validation.** Nothing validates names at write time; `Oakland_Sports_Feed!E212` carried a missing comma merging two pitchers plus a misspelling, consumed at Phase 2 without complaint. Run the `canon-name-check` resolve at write time. **Sports is the world — this one matters more than its severity label suggests.**

**Offload candidate:** 2–4 are strict-pattern recurring work. Route to a cheap helper with the acceptance criteria written out; keep 1 (the ordering call) here.

**Exit:** four entries closed; no bench needed.

---

### Session S-D: dead-file triage

**Entry:** §G-PF32. Regenerate the list with `node scripts/ctxMap.js | sed -n '/^DEAD FILES/,$p'`.

35 files have **no** top-level function reachable from `runWorldCycle()`. Most are menu/setup utilities or the entry points that call the cycle — benign. The rest are wired-looking engines carrying live `ctx.summary` reads that never execute: `storyHook.js` (32 reads, `storyHookEngine_` has zero call sites), `mediaRoomBriefingGenerator.js` (49, `safePhaseCall_` commented out), `processArcLifeCyclev1.js` (12), `domainTracker.js` (10), `prePublicationValidation.js` (9), the three v3-chicago writers (31), `exportCycleArtifacts.js` (15).

**Work:** one classification pass — *retired on purpose* (annotate or delete) vs *fell out of the call graph* (rewire, or file a row). Subagent-friendly: give a Sonnet agent the list and the git history per file, have it return the classification with evidence; the lead makes the delete/rewire calls.

**Do not** delete anything on the agent's word alone. `prePublicationValidation` sounds like a gate; confirm before removing a gate.

**Exit:** every one of the 35 classified; deletions and rewires filed as their own rows.

---

### Session S-E: instrumentation debt (batch and close)

Low world impact, diagnostic. Batch them precisely because none deserves its own session.

- **A5** — six identical `priorityEngine` clamps (`raw=11.70 final=7.80 CIVIC MED`) in one second. Either the CIVIC ceiling is too low or the raw scorer over-weights; a clamp firing once is a guardrail, six identical is a ranking problem hiding.
- **A6** — `buildCommuteFlows_` leaves 210 of 915 commuters unresolved (23%), and commute feeds transit + city dynamics.
- **A7** — `applyMigrationDrift_` running on a `World_Config` fallback source.
- **G-PF22** — `Simulation_Ledger` has no `Name` column; the snapshot synthesizes one, so any sheet query using `headers.indexOf('Name')` silently reads `undefined`. Add a guard that makes that failure loud.
- **G-PF14** — `rateEditionCoverage.test.js` intermittent under the full suite only (passes isolated, filtered, and with the runner's env). Confirmed again S405: failed in one full run, passed standalone immediately after.
- **G-PF30** — `runCyclePhases_` (dry-run/replay) omits `Phase7-StorylineWeaving` and `Phase9-DigestSummary`, so a dry run does not answer "what will the live cycle do."
- **G-PF31** — `ENGINE_STUB_REVERSE.json` counts `===` comparisons as writes (poisons every wiring card); `writeCycleWeightToDigest_` is an orphaned direct writer absent from `SHEETS_MANIFEST` §9; `Riley_Digest` is absent from the manifest entirely.

**Exit:** each closed or explicitly deferred with a reason. **G-PF31 first** — it corrupts the maps every other session depends on.

---

## Open questions

1. **Does S-A's fix change stored civic numbers?** Standing answer is no — fix forward, never retro-correct canon. Confirm at the session, since the mayor's approval is the most visible number in the world.
2. **Is a fresh sandbox stood up before or after S-A/S-B?** Both produce engine code and both wait on the same bench wave. Building the bench once, after S-B, covers both — but only if nothing between them fires live.
3. **How much of S-C offloads cleanly?** Offload ROI is volume × context-portability; items 2–4 look portable, item 1 is a judgment call and stays.

---

## Changelog

- 2026-08-31 (S405) — Plan created (engine-sheet). Backlog carved into five sessions after the builder ruled that chase work precedes both the unfinished business cascade and the education build, and that sandbox staleness blocks all deploys. B4 marked already-answered by the S405 cascadeAudit re-run; A2/A4 routed to the cascade plan rather than the chase.
