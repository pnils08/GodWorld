# Engine.102 — City/Hood Cascade Integrity

**Rollout:** engine.102 | **Drafted:** 2026-08-08 (kimi, on Mike's go) | **Pointer from:** [[../engine/ROLLOUT_PLAN]] | **Review basis:** [[../research/2026-08-07-city-neighborhood-cascade-team-review]]

## Problem

The five-pass cascade review (grok/gemini/codex/kimi/builder) found three live integrity failures in the city↔hood cascade: (1) three different denominators across writers — `WorldPulse.IllnessLevel` counts generic citizens only while `cascadeDrift` and `cityStats` use full-pop counts, so the same illness prints as different citywide rates depending on which face you read; (2) event writers roll hood-level per-hood deltas with `Math.random()` and never reconcile to the city total, so summed hood deltas drift from the city dial they supposedly disaggregate; (3) the engine audit (kimi cascadeAudit.js) confirmed all three invariant FAILs on live data. Plus: `East Oakland` is in `Neighborhood_Map` but absent from `Neighborhood_Demographics`, so any ND-layer per-hood math silently skips a hood.

## Tasks

### Task 1: Cascade audit script (kimi, scripts/)

- **Files:** `scripts/cascadeAudit.js` (new), report → `output/cascade-audit-c{XX}.md`
- **Steps:** measure the three denominators (WP generic-only vs cascadeDrift full-pop vs cityStats full-pop); quantify each invariant FAIL; identify the East Oakland ND gap.
- **Status:** [x] done (2026-08-08, kimi) — script + first report; three denominators measured, 3 invariant FAILs quantified, East Oakland ND gap identified.

### Task 2: W2a/W2b patch proposals (kimi, output/kimi/engine102/)

- **Files:** patch proposals with verified line refs in `output/kimi/engine102/`
- **Status:** [x] done (2026-08-08, kimi) — proposals written; handoff to engine-sheet for Tasks 3–7.

### Task 3: W2a denominator unification (engine-sheet, substrate)

- **Status:** [x] done (engine-sheet, S361) — `4f7f934b`; bench C105 clean, invariant PASS +6.1%.

### Task 4: W2b probe binding (engine-sheet, substrate)

- **Status:** [x] done (engine-sheet, S361, folded into Tasks 4+5) — 18 keys on bench+live, probe bound on C107.

### Task 5: WP stat ownership fix (engine-sheet, substrate)

- **Status:** [x] done (engine-sheet, S361) — `e181e0d5`: 3 writers → 1, applyDemographicDrift sole owner.

### Task 6: W3 hood-scoped dose + wake health read (engine-sheet, substrate)

- **Status:** [x] done (engine-sheet, S361) — `87e68f94`: hood-scoped dose + wake health read, criterion 4 PASS on bench C109.

### Task 7: W4 admission cause + talk-back + ghost-bed reconcile (mags code, kimi proof)

- **Files:** `phase10-persistence/buildCyclePacket.js` (`persistHospitalLedger_` Cause wiring), `phase03-population/applyDemographicDrift.js` (census → next WP illness)
- **Verify:** acceptance criterion 5 on bench.
- **Status:** [x] done (2026-08-09, kimi bench proof) — W4 shipped unflipped by mags (`febd6492` admission cause + talk-back, `5a989406` legacy blank-cause backfill, `29df2d2d` ghost-bed reconcile). **Criterion 5 PASS on SANDBOX 0720 fires C114–C115** (token-fired per AGENTS.md §Deployment carve-out, 128 phases ok:true ×2): C115 minted two new admissions with populated epidemic-aware Causes (POP-00662 "a serious respiratory infection amid the local outbreak", POP-00990 "complications from the illness sweeping the neighborhood"); six lifecycle closures (3 recovered/3 deceased); ghost reconcile correctly idle (ledger clean); census talk-back correctly inactive at load 4 ≪ capacity 100 — binding math proven by `scripts/hospitalTalkback.test.js` (24/24, exact-delta above/below capacity). Grief validator ran clean in-code both fires (six keys present on sandbox).

### Task 8: W5 dashboard half — provenance chip (kimi, dashboard/)

- **Files:** `dashboard/server.js` (provenance field on metric payloads), `dashboard/src/components/tabs/CityMap.jsx` + `CityTab.jsx` (dice-vs-supported chip)
- **Steps:** once Task 5 lands and a support flag exists per metric, surface it. Blocked until then; do not invent the flag client-side.
- **Status:** [x] done (2026-08-09, kimi) — ungated by Mike after Task 5 landed (S361). `GET /api/cascade` (audit-driven support state per metric, 10-min cache) + `SupportChip.jsx` on CityMap + CityTab. Live on production (PM2 restart approved+run 2026-08-09); employment gap semantics corrected in unemployment space (`924dcc8a`, matches audit invariant exactly). Chip shows honest current state — illness + employment CITY DIAL, migration NO DATA — and flips to SUPPORTED as Tasks 6–7 ground support lands.

### Task 9: W5 media half — no bare rate leads (research-build → media)

- **Files:** sift/desk guidance (scoped ban: illness/employment/crisis rates until supported; migration flows allowed with label)
- **Status:** [~] cron half done (2026-08-09, kimi) — `cascadeRateRule` block in `scripts/cron-desk-writer.js` shared system prompt (static ban until support lands, then flip off). **/sift skill half: exact diff drafted 2026-08-10 (kimi) at `output/kimi/engine102/sift-rate-guidance-proposal.md`** — `.claude/skills/` is control-plane; landing + rollout flip ride whoever owns it post-Claude.

---

## Open questions

- [x] ND (21 hoods) vs NM (22 hoods): which hood is missing from which — **ANSWERED by Task 1 audit (2026-08-08): `East Oakland` is in Neighborhood_Map but absent from Neighborhood_Demographics.** Task 3's divisor normalization should count hoods from the ND layer it writes, and the missing ND row is engine-sheet's call (likely related to the S360 East Oakland NM seed).

## Changelog

- 2026-08-08 (kimi) — Initial draft on Mike's go, per the five-pass cascade review with kimi amendments. kimi builds Tasks 1–2 (+8 later); engine-sheet lands/deploys substrate Tasks 3–7.
- 2026-08-08 (kimi) — Tasks 1–2 complete same session: `scripts/cascadeAudit.js` + first report (three denominators measured, 3 invariant FAILs quantified, East Oakland ND gap identified); W2a/W2b patch proposals in `output/kimi/engine102/` with verified line refs. Handoff to engine-sheet for Tasks 3–7.
- 2026-08-08 (engine-sheet, S361) — Task 3 done: W2a landed (`4f7f934b`), bench C105 clean, invariant PASS +6.1%. Detail in Task 3 status.
- 2026-08-08 (engine-sheet, S361) — Tasks 4+5 done: W2b landed, 18 keys on bench+live, probe bound on C107. Detail in task statuses.
- 2026-08-08 (engine-sheet, S361) — WP stat ownership fix (`e181e0d5`): 3 writers → 1, applyDemographicDrift sole owner. Detail in Task 5 status.
- 2026-08-09 (engine-sheet, S361) — Task 6 done (`87e68f94`): hood-scoped dose + wake health read, criterion 4 PASS on bench C109. Detail in Task 6 status.
- 2026-08-09 (kimi) — Task 8 done S361 (dashboard provenance chip, live). Task 7 code found landed-but-unflipped (mags commits); Node proof `hospitalTalkback.test.js` 24/24 + bench proof C114–C115 (criterion 5 PASS; detail in Task 7 status + DEPLOY.md). Task 9 cron half landed (`a65497b6` rate rule); /sift half remains control-plane. engine.102 effectively closes except the /sift guidance half.
- 2026-08-10 (kimi) — /sift skill half unblocked as far as this lane can take it: exact SKILL.md diff + landing checklist drafted at `output/kimi/engine102/sift-rate-guidance-proposal.md` (anchor: S245 neighborhood-state block, mirrors the cron rule verbatim-in-substance, same flip-off condition). Remaining: control-plane owner lands it and flips the rollout row.
