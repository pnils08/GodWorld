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

1. ~~**Deploy is blocked on a new sandbox.**~~ **UNBLOCKED 2026-08-31 (S405, later the same session).** SANDBOX 0827 predated the C105 run and is retired; **SANDBOX 0831** is a Mike-made post-C105 copy — IDs, `SIM_SSID`, `CYCLE_TRIGGER_TOKEN` and auth are all set (`docs/reference/DEPLOY.md` §Sandbox). Code is **not staged yet**: the first fire needs the tree pushed via the temp-dir route, staged from a `clasp-real pull` of live and overlaid — never from repo HEAD (5 HELD engine.131 T7 files must stay at base).
   - **`CARRY_FORWARD_COLD_START_OK` is NOT needed — verified read-only against the bench, 2026-08-31.** Protocol step 3c warns that `assertCarryForwardPresent_` aborts a fresh bench's first fire, and script properties do not copy with a spreadsheet. But the gate reads *two* layers (`loadPreviousEvening.js:88-98`), and the sheet layer came across with the copy: `Carry_Forward_Store` on SANDBOX 0831 holds `PREV_EVENING_JSON` (1554 chars) and `PREV_CYCLE_STATE_JSON` (6443 chars), both stamped `Cycle=105`, both parsing to `cycle: 105`, both in col D where `readCarryForwardFromSheet_` looks. Sandbox `cycleCount` = 105, matching live. The gate will find them and re-seed the properties on read. **Do not set the override** — it is one-shot and consumed on use, so setting it needlessly spends the escape hatch and masks a real cold start later.
   - Still true: **batch every engine-code fix so ONE bench wave covers them all.** A chase session that produces engine code still ends at "committed, undeployed" — the bench wave is its own session, not a tail on a chase session.
2. **One cluster per session.** Cost is the binding constraint. A session that ends mid-cluster costs more than one that closes a small cluster, because the next session re-reads the context.
3. **Chase before build.** The business cascade is unfinished and education is queued behind it, but a running sim with known-broken civic logic manufactures new anomalies every cycle. Chase first.
4. **Every chase session uses the maps, not grep-by-hand.** `node scripts/ctxMap.js <field>` for field wiring, `ENGINE_STUB_MAP` / `ENGINE_STUB_REVERSE` for function shape, and the `engine-wiring` subagent for any target touching more than two files. Sonnet for reasoning fan-out, Haiku for grunt. Never Fable in a subagent.
5. **Verify the log line before believing the finding.** S405 precedent: of three "confirmed" C105 findings chased, **two were misread log lines** (G-PF16's mechanism, A2's "zero denominator"). Read the emitting code before accepting what an annotation says a number means.

---

## Session order

| # | Session | Cluster | Code side | Why here |
|---|---------|---------|-----------|----------|
| ~~S-A~~ | ~~Civic contradiction~~ **DONE S406** | B1/G-PF19 + B2 + B4 closed; G-PF33 opened | ENGINE (bench) | Ruled: no contradiction — three questions, three correct answers; one label fixed |
| S-B | Storyline resolution | B3/G-PF20 + C1 + G-PF28 | ENGINE (bench) | `/sift` opens on an empty slate; blocks the newsroom |
| S-C | Pipeline chain hygiene | G-PF24 + G-PF25 + G-PF23 + G-PF26 | NODE (no bench) | Cheap, offloadable, unblocks content quality |
| S-D | Dead-file triage | G-PF32 | mixed | 35 files; decides what is history vs missing feature |
| S-E | Instrumentation debt | A5 + A6 + A7 + G-PF22 + G-PF14 + G-PF30 + G-PF31 | mixed | Diagnostic only; batch and close |
| — | *then* | business cascade finish → education | — | Build resumes once the sim stops generating anomalies |

**B4 needs no session — it is already answered.** The hood swings it flagged wanted `cascadeAudit`'s spread lane run against post-C105 state; S405 did that and it PASSes at 2.74pp with all five invariants green. ~~Close B4 citing `output/audit-reports/cascade-audit-2026-08-31.md` when S-A next touches the log.~~ **Closed on the execution log, S406.**

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

#### DONE — S406, 2026-08-31

**Ruling: there was no contradiction. Three systems, three questions, three correct answers.** Verified against the six live `Initiative_Tracker` rows read at C105, not against the log's wording — the plan's own step-5 discipline, and it paid again.

| System | Question it answers | C105 answer | Verdict |
|---|---|---|---|
| `updateCivicApprovalRatings_` | *Is it finished?* | no × 6 → `sitting`, −2 owned each | correct, **intentional**, documented |
| engine audit | *Did the phase string change?* | yes × 4 → improvements | correct, **intentional**, unchanged |
| `civicInitiativeEngine_` | *Did a scheduled decision resolve?* | no × 6 | correct; **the label was wrong** |

**What "sitting" actually measures.** Neither phase advancement nor an action slot. `classifyInitiativeMotion_` (`updateCivicApprovalRatings.js:745`) takes only the *current* phase string and `NextActionCycle` — there is no prior-cycle comparison anywhere in the file, so **advancement is structurally invisible to the scorer by design**. Only `complete` pays; `isPerforming_:721` carries the reason in its own comment ("C103 sat at 95 on those and never built anything"). Six non-complete rows with unexpired clocks × −2 owned = −12, and decay supplies the last point of the observed −13. The scoring is not the defect and was not touched — adding advancement credit re-opens the exact inflation this design was written to kill, and that would be a builder call, not a chase edit. Ruling pinned in the function's doc comment.

**The one fix.** `Processed N` printed `S.initiativeEvents.length` — decisions that *resolved*, not rows looked at (single push site, `civicInitiativeEngine.js:338`, reachable only inside the `voteCycle === cycle` block). At C105 the honest numbers were examined 6, in-scope 4 (INIT-002 and INIT-006 are `passed`+`signed`, skipped at :201), resolved 0. Now logs `civicInitiativeEngine v2.0: Examined N | In-scope M | Resolved K | …`. `Examined 0` is the shape that should alarm; `Resolved 0` against a healthy `Examined` is a quiet cycle. A blank-row guard rides with it — `getDataRange()` returns the *used* range, so a formatted-but-empty trailing row would have inflated `Examined` and masked exactly the `Examined 0` shape the line exists to expose. Behaviour is unchanged for real rows: a blank row already fell through every gate (`''` is in no skip list; both auto-advance branches require `voteCycle > 0`).

**Two claims in this record were checked rather than inferred, on review.** (a) The `-1` completing the −13 is decay — verbatim from the live log, `execution_log_c105.md:96`: `… sitting, nothing free (-2) ×6, decay toward 50 (-1)`. Not derived by subtraction. (b) Nothing machine-parses the old `Processed N initiatives` string — grep across `scripts/`, `lib/`, `.claude/skills/`, `docs/` returns prose and session history only, no regex consumer. The rename cannot silently break a downstream scraper.

**Expected at the next bench fire:** `civicInitiativeEngine v2.0: Examined 6 | In-scope 4 | Resolved 0`. Anything else on an unchanged tracker is an over-count and the guard needs another look.

**Regression cover:** 6 cases appended to `scripts/civicApprovalCeiling.test.js` (P1–P6) driven by the real C105 rows — every row's classification, advancement-invisibility, the −12 total, and the C106 transition. **63/63 pass.**

**Opened, not chased — G-PF33.** `NextActionCycle` and `ImplementationPhase` are the fields the approval engine scores on, and the complete writer set is `scripts/applyTrackerUpdates.js` (offline chain, `--apply`) plus a birth-stamp in `createInitiative_:2757`. Nothing in-cycle advances either for an initiative already in implementation; the in-engine reschedule at `:246` needs `ImplementationPhase='vote-ready'`, itself chain-written, so INIT-003 cannot move under its own power. Four rows carry `NextActionCycle=105` and there is no `close_c105.json`/`gate_c105.json`, so absent a chain apply they fall to `silence` at C106 — bounded by v1.7's diminishing ladder to −12, plus −4 sitting: Mayor 69 → ~53, above the 40 campaign threshold. Real, one-way, and a cadence gap rather than an in-world decision. Three candidate shapes are in the gap entry; the one that changes canon needs a builder ruling.

**Also closed here:** B4 — `cascadeAudit` spread lane **PASSes at 2.74pp**, five invariants green (`output/audit-reports/cascade-audit-2026-08-31.md`), per plan line 49.

**Deploy state:** one engine file changed (`civicInitiativeEngine.js`, log line + two counters), **committed undeployed** per the standing batch constraint. Rides the same bench wave as S-B.

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

1. ~~**Does S-A's fix change stored civic numbers?**~~ **ANSWERED, S406: no, and the question dissolved.** The scoring was ruled correct, so there was nothing to retro-correct even if the standing answer had allowed it. The Mayor's 69 stands as an event citizens lived.
2. **Is a fresh sandbox stood up before or after S-A/S-B?** Both produce engine code and both wait on the same bench wave. Building the bench once, after S-B, covers both — but only if nothing between them fires live.
3. **How much of S-C offloads cleanly?** Offload ROI is volume × context-portability; items 2–4 look portable, item 1 is a judgment call and stays.

---

## Proving record — engine.137 + engine.138 G-PF18 (S405, 2026-08-31)

Kept here rather than in `DEPLOY.md`: that file is protocol + pointers, and per the builder rule the per-wave proving narrative lives in the wave's plan.

**Bench: SANDBOX 0831, deployment @1, code = live base + 3 payload files only** (`applyCycleRecovery.js`, `bondEngine.js`, `applyInitiativeImplementationEffects.js`). The 4 HELD engine.131 T7 files stayed at base — repo HEAD differs from live by 7 files, and staging from HEAD would have shipped 4 unproven ones and made the result unattributable.

| | C106 | C107 |
|---|---|---|
| result | ok:true, 172s, 130 phases | ok:true, 153s, 130 phases |
| Engine_Errors | 0 | 0 |
| cycleCount | 105 → 106 | 106 → 107 |

**Rivalry escalation (`bondEngine.js:710,714`) — was unreachable, now fires and self-limits.** Intensity sum 145.85 → 170.80 → 183.30; deltas +24.95 then +12.50 (decelerating). RIVALRY count 22 → 24 → 25. Max 7.5 → 8 → 8 against the hard cap of 10 at `bondEngine.js:820`; **zero bonds at the ceiling**. No runaway.

**Cycle recovery (`applyCycleRecovery.js:162-173`) — the sharpest before/after in the wave.** Live C105 under the OLD code scored `overloadScore=1`, `recoveryLevel="none"` **while holding `civicLoad="load-strain"`, `shockFlag="shock-flag"`, `civicLoadScore=28` in carry-forward**. The engine had every signal that the city was under serious strain, compared each against `undefined`, and scored it 1. Bench C106 under the new code: `overloadScore=8`, `recoveryLevel="moderate"` — matching the predicted contribution exactly (3 shockFlag + 3 civicLoad + 2 civicLoadScore≥15), with the early-phase event and hook counts contributing 0 because `Phase4-CycleRecovery` runs *before* `Phase4-WorldEvents`. C107 then eased to `4` / `"light"`. It responds and relaxes rather than pinning.

**G-PF18** — the absent path was proven in situ (no `World_Config` key → 0, no throw, 0 engine errors), which is exactly the state at first live deploy. The loaded / one-cycle-lag / stale / ahead-stamped / non-numeric / no-stamp / genuine-zero paths are covered by test instead (`scripts/applyTrackerUpdates.gate.test.js`, 26/26) because a bench fire cannot cheaply reach them and the staleness gate is the only new arithmetic.

**Live: PROD @12**, bumped from @11 on the repo's own deployment ID and verified with `list-deployments` rather than the command's output (prod `clasp deploy` has flaked under the auto-mode classifier before). Push pull-back byte-verified on all 3 payload files; 4 HELD files confirmed still at base; 0 test files; sandbox script and sheet IDs confirmed absent from the live stage before pushing.

**Open observation, not a blocker:** 14 of 25 bench rivalries settled at exactly 8.00. The only hard cap in code is 10, so 8 is an emergent equilibrium between the escalation and decay branches. Self-limiting, but 14 bonds landing on one identical value flattens rivalry texture — a tuning question (a why-call), deliberately not chased here.

**Bench state after the wave:** SANDBOX 0831 sits at C107, two proving cycles ahead of live, and its `Relationship_Bonds` intensities and recovery state carry the payload's world effects. **Never replay either to live.**

## Changelog

- 2026-08-31 (S405) — engine.137 + G-PF18 bench-proven on SANDBOX 0831 (C106, C107) and deployed live at PROD @12. Proving record added above. Both previously-unreachable mechanisms fire and self-limit; recovery went from overloadScore 1/"none" on live C105 to 8/"moderate" then 4/"light" on the bench.
- 2026-08-31 (S405) — Constraint 1 updated: deploy UNBLOCKED, SANDBOX 0831 stood up post-C105 (relayed by research-build, verified independently). `CARRY_FORWARD_COLD_START_OK` confirmed unnecessary by a read-only check of the bench's `Carry_Forward_Store` — both blobs present, C105-stamped, parseable.
- 2026-08-31 (S405) — Plan created (engine-sheet). Backlog carved into five sessions after the builder ruled that chase work precedes both the unfinished business cascade and the education build, and that sandbox staleness blocks all deploys. B4 marked already-answered by the S405 cascadeAudit re-run; A2/A4 routed to the cascade plan rather than the chase.
