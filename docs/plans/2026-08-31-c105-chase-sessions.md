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
| S-E | Instrumentation debt | A5 + A6 + A7 + G-PF22 + G-PF14 + G-PF30 + G-PF31 | mixed | **DONE S409** — 7/7 closed, none deferred |
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

#### S-A addendum — G-PF33 fixed the same session (builder rulings, S406)

Three rulings came back on the same turn, and the third was work:

1. **Initiatives stay hand-fed.** `createInitiative_` stays unwired — revisited only when city-hall seats work a full week autonomously and there is something to author *from*. This holds the standing 2026-08-27 line (civic machinery exists to repair broken numbers, never for its own sake).
2. **Approval scoring is unchanged.** Confirms the S-A ruling above.
3. **Do the re-stamp** — G-PF33 option (a).

**Built: `engineClockHold_`,** a pure helper in `civicInitiativeEngine.js`, called after the v1.9 reschedule and before the vote trigger. An expired `NextActionCycle` on a row the engine has no in-cycle path to advance is held forward one cycle and marked in `Notes` as `[ENGINE-CLOCK n=<used> from=C<origin>]`.

**The design decision that matters is the bound.** An unbounded hold would delete `silence` from the system — a row the chain abandoned would read healthy forever, which is a worse failure than the false blame it fixes. So the hold is capped at **3 consecutive cycles**, after which the row is released to silence: by then it is genuinely stalled and that is the honest reading. Any chain apply re-arms the clock, clears the marker and resets the budget, so the counter only ever measures consecutive cycles with no civic chain behind them. Without a `Notes` column there is nowhere to bound the grace, so the hold declines to engage rather than run unbounded.

**Cover:** 13 cases (Q0–Q12) — accrual, origin preservation, exhaustion→silence, re-arm reset, engine-will-act and unexpired no-ops, Notes round-trip. **76/76**; 0 collisions across 1198 GAS globals; full suite 190/192.

**AMENDED S409 (2026-09-01) from the bench wave — two limits of the hold as deployed, both real, neither fixed tonight (third change on two unsmoked ones):**
1. **The expiry cycle itself is unprotected.** The approval engine reads the tracker sheet; the hold's re-stamp is a Phase-10 write. So the cycle in which a clock expires still scores `silence`, and the hold protects from expiry+1 for its three-cycle budget. Evidence: bench C108, six rows `silence` (−12) in the same cycle four of them got `[ENGINE-CLOCK n=1 from=C108]`. The "Mayor 69 → ~53" fall this option was meant to prevent therefore still happens once on live: with live rows 001/002/003/006 at `NextActionCycle` 105 and 005/007 at 106, the next live cycle (C106) reads silence ×4 (−12) + sitting ×2 (−3) + civic media −1 (C103 rating −2) + decay −1 → **Santana ≈ 52**. Same-cycle protection needs the approval engine to read the held value (ctx, not sheet) — a builder call for a later wave.
3. **FOUND AND FIXED S409 (same night, from the builder's bench C107 execution log): the hold retired its own marker.** It stamps the clock to cycle+1; on that cycle the row reads "not expired", which the clear branch treated as a chain re-arm — `INIT-001 clock re-armed by the chain — grace cleared` with no chain run. Grace never accrued and the three-cycle bound never engaged: hold / expired-silence, alternating, forever. Fix `d7…` (see git): a marker whose clock reads exactly `cycle` is the hold's own stamp and holds again; a chain re-arm lands strictly beyond. The old Q3 test fed an already-expired clock the loop can never produce, which is how it hid; re-chained through the hold's outputs, Q3b added, 92/92. **Bench-proven C108–C110 on @4:** 005/007 n=2 → n=3 → released to silence with the marker and clock frozen; 001/003 n=1 → n=2 → n=3. Committed undeployed; live push after the live C106 smoke of @14. Limits 1 and 2 above still stand.
2. **`passed`+`signed` rows are never held.** `civicInitiativeEngine_` skips them at `:201` before the hold runs, so INIT-002 and INIT-006 sit at 105 forever and score their owner `silence` every cycle (−6−3 = −9 on top of the rest) until the offline chain re-arms them. On the bench that took Santana 26 → 21 → demoted at C110 with a challenger seated at 37 who immediately drew a campaign. On live the same clock runs: at ~−13/cycle Santana crosses the 40 campaign line at C107 unless the Saturday chain applies first. Whether passed+signed rows belong under the hold ("rows the engine has no in-cycle path to advance" describes them exactly) is the builder's call.

**What the mayor's number actually has behind it.** Asked during the session and worth pinning, because it reframes the whole civic layer: approval has exactly **four** inputs, and three can only subtract — negative civic media (`≤ -3 → -2`; "positive coverage does not pay"), decay toward 50 (`-1` above 50, with no recovery below it), and the ceiling scandal. The fourth, initiative motion, is the sole positive path and pays only at `complete`, seven phase-steps away on a clock the offline chain winds weekly. **With initiatives stalled there is no restoring force in the system at all** — every seat trends to the floor, and the only story the number can tell is the initiative story. The clock hold buys three cycles of honesty against that; it does not add a second input.

#### SUPERSEDED SAME SESSION — engine.139 / G-PF34 (builder-direct)

The S-A **ruling** above stands. Its **design conclusion** — "scoring untouched, advancement credit needs a builder ruling" — got that ruling within the hour, and it went the other way, for a reason worth recording: *"this just wired correctly, so any decision made before today never saw it work."*

Three findings made the reversal safe rather than reckless:

1. **Three of four approval inputs can only subtract.** Negative media, decay above 50 with no recovery below it, and the ceiling scandal. The fourth paid only at `complete`. With initiatives stalled there is **no restoring force in the system at all**.
2. **The media arm was OFF, not negative-only.** Live CIVIC ratings over 15 cycles: `1,0,2,1,0,2,3,-2,-2,-1,2,1,2,-2,-2` — range **-2..+3** against a `<= -3` gate. It never fired. 57 of 86 rated rows across all domains sit in the dead band.
3. **The C103→95 inflation bug was never actually fixed.** The v1.3 clamps treated the symptom. The cause is that a row parked at `complete` pays its owner **+3 every cycle forever** — the approval engine filters its initiative list on `if (!initName) continue;` and nothing else. Still armed, dormant only because nothing has ever finished. **Adding advancement credit without fixing this would have re-armed the pin** — so fixing it is not scope creep, it is the precondition.

**The new rule: positives are EVENTS, negatives are CONDITIONS.** Transitions pay once (`advanced` +2 owned / +1 district, `completed` +3/+1); terminal states pay nothing (`complete-held` 0); not-finished and overdue still drain per cycle. Lifetime yield per initiative is bounded at ~6 transitions + 1 completion, so it cannot pin anyone at ceiling. Media is symmetric and graded inside its real range (`±2 → ±1`, `±4 → ±2`), totalling **+1** across the live record — texture, not an inflator. `sitting` and `advanced` get mirrored width ladders (`[-2,-1,-1]` / `[2,1,1]`, capping at ∓4), closing the gap obs 58092 flagged; `silence` keeps its heavier v1.7 curve.

Carrier is `previousCycleState.initiativePhases`, written Phase 5, serialized Phase 9, **gated on the blob being exactly one cycle old** so a stale carry-forward cannot double-pay an old transition. Absent it, nothing reads as a transition.

**Counterfactual, mayor owning all six:** C104 (four advanced) was -13 → now **0**, holding at 82. C105 (nothing moved) was -13 → now **-5**. Volatile instead of monotonic.

**Cover:** 22 cases (P1–P13, R1–R6, F5/F6 rewritten off the old contract). 91/91. `ctxMap`: `initiativePhases` CONNECTED.

**Proving note for the bench wave:** `advanced` **cannot be proven by a plain bench fire** — no chain runs on a bench, so no phase changes and the transition path never executes. A standard two-cycle wave proves only the degraded path and the sitting ladder. The wave needs a hand-staged phase edit on the bench tracker between fires, with the C104 counterfactual as the expected shape.

**Blocked, named rather than skipped:** `/stub-engine` regeneration is owed for the new helper but was **not** committed. The regen picks up `phase05-citizens/casinoLedgerEngine.js` — grok's in-flight, untracked, unwired, not-yet-signed-off build — producing 45 lines of another lane's work against 1 line of mine, including a `SHEETS_MANIFEST` §9 entry blessing a tab Mike has not approved. All four generated docs reverted. Re-run the regen once the casino build lands or is dropped.

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

#### DONE — S407, 2026-08-31

**Ruling: the finding was real and pointed at a corpse.** `updateStorylineStatus_` was ageing `Storyline_Tracker`, DISCONTINUED 2026-08-05 (Mike-direct) and superseded by `Storyline_Ledger`. There is no missing `concluded` transition to build — step 2 of this session's plan is void. The engine was correct; the tab it was correct about is dead.

**The loop, traced end to end.**

| Piece | State found |
|---|---|
| `Storyline_Ledger` (23 rows) | live; Saturday cron step 6b accumulates reporter slugs weekly |
| readers of that tab | **zero**, repo-wide — `scripts/`, `lib/`, `phase*/`, `.claude/`, `docs/` |
| `buildDeskPackets.js` | fed reporters from the DISCONTINUED tracker — which Phase 8 had just emptied |
| the live daily writers | never read desk-packets at all; their prompt is `desk_signal_c{N}.json`, which carried no threads |

So every writer met the cycle blind. `cron-desk-run.js:1051` has always offered the full verb vocabulary — `advanced / opened / closed / referenced` — but you cannot close a story you were never shown. Across 23 threads, `Closed` is 0 and `FirstCycle == LastCycle` on every row. **Not a scoring bug: a missing return path.**

**Second defect, found in the data.** Five ledger rows were 13 columns wide with the slug duplicated into `FirstCycle`. `lib/sheets.updateRangeByPosition` takes a **0-indexed** startCol; step 6b passed `1`, so every cross-week update wrote the row at B..M and left the stale slug in A. Updates only fire when a slug recurs, and one run has ever had recurrences — 2026-08-29, `5 row(s) updated` (`logs/saturday-run.log.1.gz:70`) — exactly the 5 corrupted rows. Same class as the S366 engine82 incident. Fixed, and the 5 rows repaired live and read back clean (24 rows, uniform at 12 columns).

**Built (`b12bb4f1`, `1c772aae`, `0b6f6fed`).**

1. `buildWorldSummary.js` deskSignal **v1.2** — `openThreadEntries`, pure: Storyline_Ledger → a `kind:'thread'` entry per desk, routed by the row's own `Desks` column, unrouted falling to civic rather than being dropped. Freshest first, then most-covered, capped 12/desk. Emitted as **`openThreads`, a sibling of `lanes`, never inside one**: six scripts consume the lanes and treat every entry as an assignable cycle signal (`newsroom-fanout` seeds, the safety / civic-domain / Jax slices, `stink-scanner`, `sportsSubstrate`), and a thread is a summary of past coverage, not an event that happened this cycle. Guarded by test, not by care.
2. `cron-desk-run.js` — threads render in their **own block**, not mixed into the pointer list; they are the only entries a writer can continue rather than open. The block asks for the slug back character-for-character on the INTAKE STORYLINE line.
3. `buildDeskPackets.js` — repointed at the live tab through `normalizeStorylineLedger`, an adapter into the Tracker-shaped fields the three consumption sites already read.
4. **engine.140** (UNDEPLOYED) — `Phase8-StorylineStatus` commented at both call sites, file convention, retained for reversibility. Writes nothing to ctx, so the removal cascades nowhere.

**The design ruling that matters: showing is not validating.** The 2026-08-05 anti-pigeonhole contract holds unchanged — slugs stay reporter-authored free-form kebab, checked against no list. A thread is a continuation *candidate*; a genuinely new piece still mints its own slug. Dormancy stays derived from `LastCycle` age and is never stored, because stored-derived columns are what rotted the old tracker. Windows carry the tracker's tuning: live under 5 cycles, dormant 5–14, dropped at 15+.

**Exit criteria, one by one.**

- **G-PF20 / B3 — CLOSED by ruling.** Not "no concluded path"; a dead tab plus a missing return path. Both fixed.
- **C1 — CLOSED, not a defect.** `Articles: 0, Storylines: 0` is a correct report of an empty queue. `Media_Intake` (240 rows) and `Storyline_Intake` (362 rows) read live are **100% `Status=processed`**, last entries from E89 — the feeder is the retired `/write-edition` intake path. The newsroom→engine return path is the Saturday cron now, and that path is what this session wired. A corpse's silence, not a stall.
- **G-PF28 — DETACHED from S-B.** `S.mediaEffects` read at Phase 5 / written at Phase 7 is an engine phase-ordering seam, unrelated to the tracker/ledger split. It rides the bench wave on its own; it was mis-bundled here.
- **engine.141 opened** — `monitorStorylineHealth_` still reads the dead tracker and publishes `S.storyHooks` + `S.storylineHealth` into ctx. The one live path still carrying that tab's data into the world; needs its own caller-graph pass.

**Cover:** 22 new cases in `buildWorldSummary.test.js` (routing, multi-desk, unrouted-to-civic, dormancy boundaries at 4/5/14/15, closed omitted, blank slug, lane cap, empty ledger, emitDeskSignal wiring, meta contract) — **218/218**. Full suite 190/192; the two failures (`djDirect`, `rateEditionCoverage`) reproduce on a clean stash and pre-date this work. 1198 GAS globals, 0 collisions.

**Verified against the live ledger, not asserted:** 23 threads route 11 civic / 3 sports / 6 culture / 3 business at C105, all marked dormant at C109, all dropped at C120; POPIDs resolve to real ledger names (`POP-00001` → Vinnie Keane).

**Live now, not waiting on C106.** `output/desk_signal_c105.json` was regenerated so tomorrow's wakes carry threads rather than the return path sitting dormant until the next manual Step 5. Proven additive: lanes diff +0/−0 across all four against the pre-existing artifact; the only changes are the `openThreads` key and the version string. `world_summary_c105.md` untouched.

**Acceptance is the next unattended run**, not a demo: the next writer wake renders the block, and the Saturday cron (Sep 5, 16:00) exercises the repaired write path. The shape to watch for is the first `closed` verb the ledger has ever recorded.


---

#### S-B correction — S408, 2026-09-01 (first unattended render)

**The S407 block never reached a writer.** Tonight's 18:15 wake was the first run with the wiring, and 0 of 7 state files carried "Open threads on your beat" while `desk_signal_c105.json` held 23 threads (civic 11, culture 6, sports 3, business 3). Two reasons: (1) the block was rendered in `buildLaneState`, the legacy lane path — the live wake writes a typed Packet through `livedExperiencePacketV2.buildWritePacket` and never calls it; (2) even had it rendered, `renderPacketIntake` (ADR-0017) discards the model's footer and mints `STORYLINE: <hood-name-kind> | opened` deterministically, so no writer could ever say `advanced` or `closed`. That is why `closed` was never once used: the verb was hard-coded.

**Fix (same session):** the desk's open threads ride the Packet as `signal.openThreads`; the writer matches deterministically — an article **advances** the thread whose interviewed person it actually prints (popid overlap on `exposure.sources`/`subjects` present in the body, hood + recency as tie-breaks) — and the model owns one bit, a final `THREAD-CLOSED: <slug>` line that counts only for the thread the evidence matched (stripped from prose). No match still mints. Tests: writer (advanced / closed / wrong-slug ignored / no-match) + Packet passthrough. `buildLaneState`'s block stays for the legacy path. **First real render is the next 18:15 write wake; `closed` is now reachable.**

### Session S-C: pipeline chain hygiene (Node-side, offloadable)

**Entry:** §G-PF23, §G-PF24, §G-PF25, §G-PF26. No engine code — nothing here is bench-gated, so this session's output is live the moment it lands.

1. **G-PF25 — chain order.** Step 5.57 `buildWorldState.js` runs before Step 5.8 `buildDeskPackets.js` but reads the `base_context.json` that 5.8 produces. Either reorder or have the fold declare its dependency and fail loudly. **Do this one first** — it corrupts every downstream artifact in the run.
2. **G-PF24 — dead hood gate.** `draftContentRows.js` rejected 5 of 6 candidates on snake_case hood tokens (`lake_merritt`) that the gate vocabulary does not match. Confirm which vocabulary is canonical, then align one side.
3. **G-PF23 — canon identity.** `buildNeighborhoodTexture.js` reads blocklists but never `docs/canon/INSTITUTIONS.md`, so hood texture is written from what it must avoid rather than from what the hood *is*. Feed the per-hood institution set in.
4. **G-PF26 — sports-feed validation.** Nothing validates names at write time; `Oakland_Sports_Feed!E212` carried a missing comma merging two pitchers plus a misspelling, consumed at Phase 2 without complaint. Run the `canon-name-check` resolve at write time. **Sports is the world — this one matters more than its severity label suggests.**

**Offload candidate:** 2–4 are strict-pattern recurring work. Route to a cheap helper with the acceptance criteria written out; keep 1 (the ordering call) here.

**Exit:** four entries closed; no bench needed.

#### DONE — S407, 2026-09-01

All four closed, plus G-PF11 free (same file as G-PF26). Nothing here was bench-gated, so it is all live on land.

| Entry | Ruling |
|---|---|
| **G-PF25** chain order | **Both remedies, not either.** Step 5.57 → **5.85**, after 5.8. And `buildWorldState.js` now refuses to write on ABSENT canon — the distinction is the fix: STALE degrades-and-flags (the edition pipeline is frozen, lag is expected), ABSENT means the chain ran out of order. Every consumer falls back correctly when the fold is *missing*; none can tell when it is *gutted*. Proven on all three branches: absent → exit 1 nothing written, absent+`--allow-no-canon` → 5,484 B, restored → 55,684 B `canon current`. Checked before moving: no reverse dependency, and the only two readers in the repo (`lib/mags.js`, `lib/wakePerception.js`) are cron-side. |
| **G-PF26** sports names | **Pre-flight, not write-time — and that choice is the substance.** The dashboard write path already refuses a bad name at entry and E212 landed anyway; it was typed into the sheet, and no code path guards that. The check goes where every row passes regardless of who wrote it, reusing `resolveFeedNames` rather than adding a fourth name resolver to this repo. A missing-comma heuristic rides along because "does NOT resolve" alone would not have pointed at the defect. Reports by sheet row. WARNING, not blocker — a name typo degrades one story, it does not corrupt engine state. Replayed against the real cell: as-was → both defects flagged; comma-fixed → `MISSPELLED — rescued to "Carmen Mesa" (POP-00081)`; as repaired → clean. |
| **G-PF24** hood gate | **Canon names, and the gate was right.** `hood` is `{ kind: 'str' }` (`loadEventContentLedger.js:71`) matched against the citizen row's Neighborhood, so `hood=lake_merritt` could never have fired. Rejecting was correct; rejecting was the wrong *remedy* — a slug is recoverable and the lines were good. `normalizeHoodGate` repairs and stores the corrected string (passing our own check without fixing the stored value would write a row the engine can never match — the silent version of the same bug). Prompt gained an enumerated verbatim allow-list. All five C105 rejects recover. |
| **G-PF23** canon identity | **IDENTITY + CANON NAMES, and the split is the safety property.** 22 hood paragraphs from §Neighborhoods, condensed and figure-scrubbed, rendered `IDENTITY (do not print)` as register — not content. Landmarks from `### Tier 1 — Use real names` sections ONLY, so the feed *structurally* cannot surface a Tier-2 name needing a substitute; Tier 2 stays the blocklist's job. Canon sweep over the entire injected feed: **0 hits** against 39 blocklist names. |
| **G-PF11** (rode free) | `/pre-flight` with no argument had always exited 2 — the deriver grepped for `Cycle: N`, a token the PIN has never carried. Reads `canonical C<N>` now. Live no-arg run: Cycle 105, READY, exit 0. |

**Acceptance is the next unattended run**, not a demo — the next cycle exercises the reordered chain, the repaired hood gates, and the identity-fed texture in one pass. Suite 190/192 throughout; `djDirect` and `rateEditionCoverage` reproduce on a clean stash and pre-date this work.


---

### Session S-D: dead-file triage

**Entry:** §G-PF32. Regenerate the list with `node scripts/ctxMap.js | sed -n '/^DEAD FILES/,$p'`.

35 files have **no** top-level function reachable from `runWorldCycle()`. Most are menu/setup utilities or the entry points that call the cycle — benign. The rest are wired-looking engines carrying live `ctx.summary` reads that never execute: `storyHook.js` (32 reads, `storyHookEngine_` has zero call sites), `mediaRoomBriefingGenerator.js` (49, `safePhaseCall_` commented out), `processArcLifeCyclev1.js` (12), `domainTracker.js` (10), `prePublicationValidation.js` (9), the three v3-chicago writers (31), `exportCycleArtifacts.js` (15).

**Work:** one classification pass — *retired on purpose* (annotate or delete) vs *fell out of the call graph* (rewire, or file a row). Subagent-friendly: give a Sonnet agent the list and the git history per file, have it return the classification with evidence; the lead makes the delete/rewire calls.

**Do not** delete anything on the agent's word alone. `prePublicationValidation` sounds like a gate; confirm before removing a gate.

**Exit:** every one of the 35 classified; deletions and rewires filed as their own rows.

#### DONE — S408, 2026-09-01

**The instrument was the first defect.** Seven of the 35 "dead" files run every cycle. `ctxMap.js` missed three call shapes: (1) a phase closure whose callee sits on a later line behind `typeof fn_ === 'function'` — Phase6-InitiativeRipple, Phase6-TransitSignals, Phase6-FaithSignals, **Phase6.5-Validation**, so `prePublicationValidation.js` was listed as a dead gate while live at `godWorldEngine2.js:438/2164`; (2) direct calls in `runWorldCycle()`'s body outside any closure — the whole Phase-0 setup (`ensureEngine94SheetContract_`, `ensureEngine133Config_`, `ensureEngine135Config_`, `initSimulationLedger_` …) and the close — so `engine94SheetContract.js` and `initSimulationLedger.js` read dead while running first thing every cycle; (3) `v3Integration_`'s `V3_FUNCTIONS` registry, which names its modules with a `typeof` guard and dispatches by string at Phase8-V3Integration — `domainTracker_`, `storyHookEngine_`, `chicagoSatelliteEngine_` run every cycle (and `chicagoSatellite.js:55` reaches `v3ChicagoWriter.js`). Two ctxMap commits (`cad4f180`, `75657fe6`): slots 125 → 142, DEAD 36 → 29, ordering/undefaulted counts unchanged, `domainTracker` now credited as the live `domainPresence` writer.

**Classification of the 29** (Sonnet agent with git evidence, verified by an independent reference sweep of engine/lib/scripts/tests/skills/html): **21 off-cycle by design** (menu items, `onOpen`, `doGet`, one-shot setup/recovery, operator exports), **8 retired with a recorded rationale** (S313 arc loop ×3, S229 Chicago Path B, S325 parseMediaIntake, S328 Media_Briefing, S407 storyline ager), **1 never wired** (`processIntakeV3.js` — the write-intent intake rewrite; live Phase5-Intake calls `processIntake_` in the engine file, ENGINE_MAP row corrected), **0 fell out of the call graph.** The gap entry's fear — a missing feature nobody noticed — did not materialise.

**Landed:** every one of the 29 carries a first-line `// @cycle-status:` header naming what invokes it or when and why it was retired; ctxMap reads the tag and now reports **UNDECLARED** dead files as the signal (0 today) with the declared set listed for the record. A new dead file is a real question again. Deletions filed as **engine.142** (six files, zero live references) — the cost is ~15 truth-doc rows, not the rm, so it is its own row. `updateStorylineStatusv1.2.js` stays with engine.141; `generateChicagoCitizensv1.js` stays for the frozen pool.

---

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

#### DONE — S409, 2026-09-01

Seven items, seven commits, each closed — none deferred. Node-side items are live now; the four Apps Script items are committed undeployed and ride the bench wave. Every close was verified against code or live data, not the log's wording — three of the seven turned out to be wording or measurement defects, the same class S-A found.

| Item | Ruling | Fix | Commit |
|---|---|---|---|
| **G-PF31** | Real. Write regex matched `===`; 27 phantom writer edges across 15 fields | `=(?!=)`; regen. `civicLoad` 3→1, `cycleWeight` 2→1, `shockFlag` 3→1. `writeCycleWeightToDigest_` deleted (0 callers). `Riley_Digest` in manifest §1 | `a94e4dc8` |
| **G-PF14** | **Not the suite — a coin flip in the test.** Fixtures said `CYCLE 900`; real editions say `THE CYCLE PULSE — EDITION 102`. Detection fell to the first digit run in the FULL tmp path, present only when mkdtemp's suffix had one (~65%). Reproduced 2/5 in isolation | Fixtures carry the real header; rater path fallback reads basename only; `lib/sheets` lazy-required in the apply branch; `run-tests.js` prints exit/signal on failure. 6/6 after | `ec6bf5e4` |
| **G-PF22** | Real but ad-hoc. Every engine `indexOf('Name')` reads a tab that HAS a Name column; the S405 miss was a hand query | `lib/sheets.js` `citizenFullName` / `matchCitizensByName` / `findCitizensByName`; SIMULATION_LEDGER §Identity note. Does not make a bare `indexOf` loud — said so | `6239897f` |
| **A5** | Real and worse than instrumentation: divide-by-1.5 was **non-monotone** — CIVIC×crisis 11.7→7.8 ranked below plain CIVIC 9; the crisis boost was a penalty for top-tier domains. **Live consumer (missed in the first pass, caught on review): `scripts/engine-auditor/routePatternSeeds.js` orders the pattern-seed deck by `priorityScore` — Node-side, so the fix is in effect at the next `/engine-review`, not wave-gated.** Under the old divide INFRA HIGH 7.0 sat below ENVIRONMENT HIGH 9.0 in that deck | `min(raw, 10)`; 4 regression cases, 89/89. Deck sort tiebreaks ties-at-10 on domain weight so HEALTH > SAFETY/CIVIC > INFRA survives | `b128ec05` + correction |
| **A6** | **Not blind.** 210 = 143 `City-wide` employers (no hood by design) + 67 `UNTRACKED` (S357 off-ledger sentinel the commute engine filed as a dangling ID). Real failures: 0 | `offLedger` class, excluded like City-wide; log v1.1 prints the breakdown; `commuteFlowEngine.test.js` 11/11 | `ffca2df6` |
| **A7** | **Wording.** `(fallback source: World_Config)` printed whenever the config key existed; C105 read live 387975. Decimals: legacy fractional seed cell (live 389122.0135) plus integer deltas forever | `populationSource` names what answered; `Math.round` at the queueWrite heals the fraction forward | `7b9f76ec` |
| **G-PF30** | Real. `runCyclePhases_` dropped two slots; `Phase9-DigestSummary` writes `S.compressedLine`/`S.cycleSummary` that `buildCyclePacket_` reads, so the dry-run packet was short | Both slots inserted at production positions; live lists diff identical. Not unified into one list (refactor, not a chase fix) | `535ff9cf` |

**Wave pin:** the bench push for this batch is commit **`2902f969`** (A5 correction, last commit before engine.143 landed) via DEPLOY.md's temp-dir route — `clasp push` from HEAD would carry the education loop with it and break one-change-in-flight. **Bench-wave additions (GAS, undeployed):** `applyCycleWeight.js`, `priorityEngine.js`, `commuteFlowEngine.js`, `applyMigrationDrift.js`, `godWorldEngine2.js`. **Proving notes for the wave, on an unchanged ledger:** six C105-shape clamp lines read `final=10.00`; `buildCommuteFlows_ v1.1: … 210 unresolved (143 city-wide/non-hood, 67 off-ledger, 0 dangling biz-id, 0 biz without hood)`; `applyMigrationDrift_: totalPopulation=<int> … (source: World_Population)` and an integer `World_Population.totalPopulation` cell after the fire; a dry run's packet carries `compressedLine`. Plus S-A's owed `Examined 6 | In-scope 4 | Resolved 0`.

**Acceptance for A5 is Node-side and immediate:** the next engine-auditor deck lists HIGH seeds HEALTH → SAFETY/CIVIC → INFRASTRUCTURE → the rest, with no HIGH top-domain seed below a MED one.

**Verified, not inferred:** 0 GAS global collisions (`COMMUTE_OFF_LEDGER` is the only new global); ctxMap unchanged (no new `S.*` fields); stub maps regenerated in the G-PF31 commit and no function was added or removed after it.

---

## Open questions

1. ~~**Does S-A's fix change stored civic numbers?**~~ **ANSWERED, S406: no, and the question dissolved.** The scoring was ruled correct, so there was nothing to retro-correct even if the standing answer had allowed it. The Mayor's 69 stands as an event citizens lived.
2. **Is a fresh sandbox stood up before or after S-A/S-B?** Both produce engine code and both wait on the same bench wave. Building the bench once, after S-B, covers both — but only if nothing between them fires live.
3. **How much of S-C offloads cleanly?** Offload ROI is volume × context-portability; items 2–4 look portable, item 1 is a judgment call and stays.

---

## Proving record — wave 1: engine.139 + G-PF33 + engine.140 + casino + S408 headers + S-E (S409, 2026-09-01)

**Bench: SANDBOX 0831 @2, code = live @12 pull + the pinned `2902f969` overlay (38 changed files + `casinoLedgerEngine.js` new), the four HELD engine.131 T7 files kept at live base.** Delta classified before staging: 29 files header-comment-only (S408 `@cycle-status`), 9 with code, 4 HELD (0 commits since S405, real code deltas).

| | C108 | C109 |
|---|---|---|
| result | ok:true, 165s, 129 phases | ok:true, 177s, 129 phases |
| Engine_Errors | 0 | 0 |
| `World_Population.totalPopulation` (A7) | 391427.0135 → **392598** | **393772** |
| `Riley_Digest` rows (G-PF31 dead-writer delete) | 105 → 106 | 107 |
| `Initiative_Tracker` clock hold (G-PF33) | `[ENGINE-CLOCK n=1 from=C108]` on 001/003/005/007, `NextActionCycle` 105/106 → 109; 002/006 (passed+signed, skipped at `:201`) untouched | marker cleared on the four moved rows (re-arm rule) |
| `PREV_CYCLE_STATE_JSON.initiativePhases` (engine.139 carrier) | present, 6 rows | present, reflects the C109 edits |
| Mayor approval | 39 → **26** (−13) | 26 → **21** (−5; predicted 20) |

**C108's −13 attributed without the execution log:** the approval engine reads the tracker sheet (`getDataRange`, `:246`) and the hold's re-stamp lands at Phase 10, so all six rows read `silence` (owned ladder −6−3−2−1 = −12) + civic media −1 (last CIVIC rating C103 = −2) + decay 0 (below 50). Observed one-cycle lag on the hold — see the G-PF33 amendment below.

**C109 — the `advanced` path, proven by hand-staging (per the §S-A proving note):** four phases edited between fires (001 disbursement-active→operational, 003 visioning→visioning-complete, 005 construction-active→operational, 007 pilot-active→operational). Prediction: advanced owned +2+1+1+0 = +4, two unheld silence rows −6−3 = −9, media −1 → 26 → 20. Counterfactual with no advancement: sitting −4, silence −9, media −1 → 12. Observed **21** — the transition path paid; the 1-point gap fits the media term rolling out of its window (C103 rating now 6 cycles back). The exact reason string is log-only — asked of the builder after the next live cycle.

**Bench-only state after the wave — never replay to live:** the four phase edits, approvals/office state (Santana demoted C110, Ariana Lee seated), carry-forward, rivalries.

**Live: PROD @13 (2026-09-01)** — same stage with the prod `.clasp.json` written last, sandbox script + sheet IDs grep-absent, pull-back byte-verified 172/172, 0 test files, HELD four confirmed at base. Then wave 2 (engine.143) followed as **PROD @14** after its own two bench cycles (education plan §Changelog).

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

- 2026-09-01 (S409, late) — Builder's bench C107 execution log confirmed 5 of 6 proving lines (clamp lines absent because no coverage crisis sits in the window — CIVIC rating C103 is the last, so raw stays 9; A5 is test-covered) and exposed the hold's clear-branch bug (§S-A addendum amendment 3). Fixed, bench-proven C108–C110 on @4, committed undeployed pending the live smoke.
- 2026-09-01 (S409) — Wave 1 bench-proven on SANDBOX 0831 @2 (C108, C109) and LIVE at PROD @13; wave 2 (engine.143) followed at @14. Proving record above. Chase S-A…S-E fully landed; engine.138's only open item is the S-B wake acceptance (Tue 09-02 18:15).
- 2026-09-01 (S409) — S-E DONE: all seven instrumentation items closed in seven commits (`a94e4dc8`…`535ff9cf`); three were wording/measurement defects (G-PF14 test coin-flip, A6 by-design classes, A7 log), four real fixes (G-PF31 regex, A5 non-monotone clamp, G-PF30 phase list, G-PF22 resolver). Chase sessions S-A…S-E all done; what remains on engine.138 is proving: the S-B wake acceptance (Tue 09-02 18:15) and the bench wave.
- 2026-08-31 (S405) — engine.137 + G-PF18 bench-proven on SANDBOX 0831 (C106, C107) and deployed live at PROD @12. Proving record added above. Both previously-unreachable mechanisms fire and self-limit; recovery went from overloadScore 1/"none" on live C105 to 8/"moderate" then 4/"light" on the bench.
- 2026-08-31 (S405) — Constraint 1 updated: deploy UNBLOCKED, SANDBOX 0831 stood up post-C105 (relayed by research-build, verified independently). `CARRY_FORWARD_COLD_START_OK` confirmed unnecessary by a read-only check of the bench's `Carry_Forward_Store` — both blobs present, C105-stamped, parseable.
- 2026-08-31 (S405) — Plan created (engine-sheet). Backlog carved into five sessions after the builder ruled that chase work precedes both the unfinished business cascade and the education build, and that sandbox staleness blocks all deploys. B4 marked already-answered by the S405 cascadeAudit re-run; A2/A4 routed to the cascade plan rather than the chase.
