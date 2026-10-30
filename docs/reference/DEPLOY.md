# Deploy to Apps Script

**Deploys are the engine-sheet terminal's function (S282).** The full checklist (pre-flight,
verification, bookkeeping) lives in `.claude/skills/deploy/SKILL.md` — this file is the
minimal manual procedure plus CURRENT state. Full proving/deploy history: [[DEPLOY_HISTORY]].

**Deploy gate (S282):** `clasp push` is blocked unless `CLAUDE_CTL=1` is set — an opt-in
speed bump so other agents can't deploy to the live engine (same pattern as the S274 git
control-plane gate). `npm install` re-arms the gate automatically via `postinstall`.

## From this repo (usual path)

```bash
cd /root/GodWorld
CLAUDE_CTL=1 npx clasp push
```

**`push` alone does NOT change what a fire runs.** The web-app deployments are
pinned to a script VERSION, so `clasp push` updates the project's files while the
`/exec` URL keeps serving the old version. A pull-back can verify byte-identical
and the next fire still runs the previous code — engine.188 (S443) burned two
bench cycles that way, and the result looked like the fix had failed rather than
like it had never been loaded. Always check, then cut a version:

```bash
npx clasp deployments                     # "@12" = pinned; "@HEAD" = follows push
CLAUDE_CTL=1 npx clasp deploy -i <deploymentId> -d "<what changed>"
npx clasp deployments                     # read back: the id should now say @13
```

Only a deployment listed as `@HEAD` picks up a bare push.

**After a version cut, wait ~5 min before the fire.** The `/exec` URL keeps serving the previous version for a propagation window: C120 on 0908 ran @20 after @21 was cut, and C112 on 1004 (2026-10-16) ran @32 when fired ~30 s after @33 — a clean `ok`, the old code's output, no error. The fire's own readback must show the new code's effect; a fire inside the window is a wasted bench cycle, not a failed fix.

## From Cloud Shell (manual fallback)

```bash
cd ~/GodWorld
git pull
npm install          # also re-arms the deploy gate
CLAUDE_CTL=1 npx clasp push
```

## First time setup (only once)

```bash
cd ~
git clone https://github.com/pnils08/GodWorld.git
cd GodWorld
npm install
npx clasp login
CLAUDE_CTL=1 npx clasp push
```

## If Cloud Shell resets

Cloud Shell sometimes clears installed packages. If clasp fails, run `npm install` first.

## Current state

**Current bench pointer (2026-10-20, engine.214 8a Cut B):** SANDBOX 1004 web app **@70 = stage 15** = stage 14 + `phase05-citizens/generateCitizensEvents.js` at `3ed34b61` (manifest `output/engine-sheet/stage15-e214b.sha256`), at C113 after the Cut B pair's leg B; **@69 = stage 14** (= PROD @151, rebuilt by the e305 bench push at `ea777cae`, manifest checked against `stage14-e305.sha256`) fired leg A. Each leg from `BASELINE-1004-C112b` + the bench MaritalStatus migration + the Generic_Citizens M–O header. Push `output/engine-sheet/2026-10-20-push-e214b-bench.sh <commit> <manifest> "<files>" ea777cae`; pair `2026-10-20-e214b-pair.sh`, receipt `2026-10-20-e214b-receipt.js`. Detail: plan engine.214 step 8 §Cut B bench. **Previous bench pointer (2026-10-19 late, engine.305):** SANDBOX 1004 web app **@68 = stage 13** (rebuilt by the bench push from `ac5acf2a`, = `output/engine-sheet/stage13-e304.sha256`), at C113 after the engine.305 pair's leg-A re-fire; **@67 = stage 14** (stage 13 + 2 engine.305 files at `ea777cae`, manifest `output/engine-sheet/stage14-e305.sha256` = PROD @151) fired leg B. Each leg from `BASELINE-1004-C112b` + the bench MaritalStatus migration + the Generic_Citizens M–O header. Push `output/engine-sheet/2026-10-19-push-e305-bench.sh <commit> <manifest> "<files>" ac5acf2a`; pair `2026-10-19-e305-pair.sh`, re-fire `2026-10-19-e305-legA2.sh`, receipt `2026-10-19-e305-receipt.js`. Detail: [[DEPLOY_HISTORY]] §PROD stage 14. **Previous bench pointer (2026-10-19 night, engine.304):** SANDBOX 1004 web app **@66 = stage 13** = stage 9 + 9 engine.304 Apps Script files at `ac5acf2a` (manifest `output/engine-sheet/stage13-e304.sha256` = the PROD candidate; at C123 after the cut 4 sitting + the D11 probe). Before that: @64 = stage 11 = stage 9 + 8 files at `fc89b332` (manifest `output/engine-sheet/stage11-e304.sha256`; push `output/engine-sheet/push-e304-bench.sh <commit> <manifest> "<files>" 25ee233c^`), at C133 after the 20-Cycle sitting from `BASELINE-1004-C112b` + MaritalStatus migration + the Generic_Citizens M–O header, and the arrival probe. Bench-only state: the M–O header and two probe rows. Detail: [[../plans/2026-10-08-engine-286-game-of-life-events]] §engine.304 Bench. **Previous bench pointer (2026-10-19, engine.302):** SANDBOX 1004 web app **@61 = stage 9** = stage 5 + the 8 engine.302 Apps Script files at `90eccf6e` (manifest `output/engine-sheet/stage9-e302.sha256`), at C114 after a 2-Cycle smoke from `BASELINE-1004-C112b` + the bench MaritalStatus migration. Push = `output/engine-sheet/push-e302-bench.sh <commit> <manifest>`; soak loop `output/engine-sheet/2026-10-19-e302-soakloop.sh`; readback `2026-10-19-e302-soakread.js` / `-smokeread.js`. Detail: [[DEPLOY_HISTORY]] §SANDBOX 1004 @58–@61. **Previous bench pointer (2026-10-19, engine.214 PROD wave):** SANDBOX 1004 web app **@57 = stage 5 = the PROD candidate** (stage 4p + 10 files at `81bca5ba`; manifest `output/engine-sheet/stage5-e214.sha256`), running the engine.300 soak from `BASELINE-1004-C112b` (sitting 1 C113–C122 PASS). **PROD @148 = stage 5** (pushed 2026-10-19 on the builder's go, see Live below). Soak done: C113–C132 20/20 PASS, bench at C132 on @57. Pair legs @54 (A) / @55 (B) / @56 (C). Resynced from live C112 2026-10-19 (84/84 tabs; World_Config 249 keys = live by key; guard 0), frozen as Drive copy `BASELINE-1004-C112` (`1orX0qlIQloaM5gqCRJa3LHdkwajIufmcbCTHUWHda4E`, builder's Drive via the Drive connector, service account reader; typed compare 0 diffs). Reset = `output/engine-sheet/2026-10-19-reset-from-baseline-c112.js` (titles asserted before the sync loads). Aim proven by a checkpoint-cell marker read through the bench script (`output/engine-sheet/2026-10-19-aimcheck.js`). Procedure: [[../plans/2026-10-10-engine-214-mood-per-hood]] §PROD wave procedure. **Previous (2026-10-18, engine.299 Task 13):** SANDBOX 1004 web app **@54 = stage 4p = PROD @147**; at C112 after the fire (resynced from live C111 13:40, guard 0, clearfire 112, clearcheckpoint, fired 13:49 `&expect=111`). Resync from live (and set fireGuardMinutes 0) before the next fire. Previous: @53 = 4o + caps + agy fold (no GameNight suffix, no least-used repeat); @49 = PROD 4o. Bench identifiers, so nobody digs again: spreadsheet `1tByPpT8QIgJppabjpEdAqPlTjcq2RBSkL_QDrGk8YcA` ("Sandox_104_c109-live_Simulation_Narrative", 84 tabs), script `1gbJmGeDilxIhe25TC8SrSei89uJTEgVYgN2aOClEHHKJiykADzPVAIC2`, web app `AKfycbxxCwKERRGb3Gk6SYg6T2nrGKf8NrKQ-pY-BOG5sdaKclEkf2jGqS3IBhgrs5IDdlmC`. A resync from live copies live's `fireGuardMinutes` 60 — set it to 0 on the bench before `clearfire` / `clearcheckpoint`, or both are refused. @42 (11334296) fired C112 on live-C111 state: ok 131 s, persist 714/0, EE 4 → 4, LifeHistory_Log C112 1,658 lines / 1,136 graded / 139 inert (`docs/plans/2026-10-18-event-engines-move-dials.md` §Changelog).

**This file is protocol + CURRENT pointers only.** Per-wave proving narrative and bench-write logs go to the wave's own plan doc (builder rule 2026-08-30) or to [[DEPLOY_HISTORY]] — a session that finds itself writing a paragraph here is writing in the wrong file.

**Previous bench pointer (2026-10-17, engine.197 + engine.296 fix):** SANDBOX 1004 @40 = PROD 4l + `compressLifeHistory.js` (113e78aa) + `buildEveningFamous.js` (01ea836f); C112 ok 253 s (`output/engine-sheet/2026-10-17-engine197-bench-c112-@40.md`).

**Previous bench:** `SANDBOX 0908` (`1FFpUs98L0wrEcfAaQy6-Ir2xYiCq9baCc0SzqzAMrtM`) — RETIRED 2026-10-04: its script project hit Apps Script's 200-version cap (push lands, no new deployment; web app frozen @200 = `d7ac5fff`, C119). Full trail: [[DEPLOY_HISTORY]] §Retired sandboxes.


**Live:** PROD engine files = **stage 15** = stage 14 + `phase05-citizens/generateCitizensEvents.js` at `3ed34b61` (engine.214 8a Cut B: the hood trajectory reaches a citizen as a dial-gated reaction — brag / humble / complain / defend, 2:1 with the hood at neutral dials — not a fact about the hood; the storefront, new-spot and block's-energy lines are gone). Web app **@152**, pushed 2026-10-20 ~11:55 CDT by `bash output/engine-sheet/2026-10-20-push-e214b-prod.sh 3ed34b61 output/engine-sheet/stage15-e214b.sha256` (fresh PROD pull = stage 14; manifest pinned; the pinned deployment lists @152; pull-back 167 js + manifest byte-identical). Bench proof: 1004 pair C113 @69 (A) / @70 (B) + five-Cycle replicate + the draw probe (DEPLOY_HISTORY §PROD stage 15). Codex final gate 3 SHIP: `docs/research/2026-10-20-codex-engine214-cutB-final-gate3.md`. First live fire: C113, Sun 2026-10-25, stacked on stages 5, 9, 13 and 14. Rollback: `phase05-citizens/generateCitizensEvents.js` from `ea777cae` + version cut. Previous: **stage 14** = stage 13 + the 2 engine.305 files at `ea777cae` (`phase05-citizens/generateCitizensEvents.js`, `utilities/neighborhoodPulseMap.js`: a Neighborhood-kind line graded Down pulses its hood −1 instead of +1 — the crime-watch, rent, decay and down lines had been lifting their hoods). Web app **@151**, pushed 2026-10-19 ~21:55 CDT by `bash output/engine-sheet/2026-10-19-push-e305-prod.sh ea777cae output/engine-sheet/stage14-e305.sha256` (no sheet precondition; fresh PROD pull = stage 13; pull-back 167 js + manifest byte-identical). Bench proof: 1004 pair C113 @68/@66 (A) vs @67 (B), line sets identical, saved hood Sentiment B − A 15 hoods −0.01…−0.07, mean −0.026. Codex SHIP: `docs/research/2026-10-19-codex-engine305-recheck2.md`. First live fire: C113, Sun 2026-10-25, stacked on stages 5, 9 and 13. Rollback: the 2 files from `ac5acf2a` + version cut (DEPLOY_HISTORY §PROD stage 14). Previous: **stage 13** = stage 9 + the 9 engine.304 files at `ac5acf2a` (the family lottery: 1% tier-weighted draw links a background spouse / child / parent, the link waits in Generic_Citizens until usage brings it on wired; kids + women into the pool; the wake names linked family; own words are usage; the dead keep their family, the household declares a dead parent). Web app **@150**, pushed 2026-10-19 ~19:50 CDT by `bash output/engine-sheet/push-e304-prod.sh ac5acf2a output/engine-sheet/stage13-e304.sha256` (builder go; live Generic_Citizens M–O header written and read back first; fresh PROD pull = stage 9; pull-back 167 js + manifest byte-identical). Bench proof: 1004 @64 20/20 + @65 10/10 + probes, @66 = this tree. First live fire: C113, Sun 2026-10-25, stacked on stages 5 and 9. Rollback: data first (`output/engine-sheet/2026-10-19-e304-rollback-data.js --target live --apply --go`), then the 9 files from stage 9 + version cut (DEPLOY_HISTORY §PROD stage 13). Previous: **stage 9** = stage 5 + the 8 engine.302 files at `90eccf6e` (the bond system: five marital statuses, divorced + widowed court, widowing on death, no hood gate, no bond cap, deepening, wedding window 24–58, GC courtship, divorce on stacked crisis). Web app **@149**, pushed 2026-10-19 ~11:20 CDT by `bash output/engine-sheet/push-e302-prod.sh 90eccf6e output/engine-sheet/stage9-e302.sha256` (builder go; fresh PROD pull = stage 5 first; pull-back 167 js + manifest byte-identical). Live MaritalStatus migration landed first the same session (156 cells, backup `output/engine-sheet/2026-10-19-engine302-marital-backup-live.json`, read back clean). Bench proof: 1004 @58 soak 20/20 + @61 smoke = this tree. First live fire: C113, Sun 2026-10-25. Rollback: the eight files from `0125b59a^` + version cut (DEPLOY_HISTORY §PROD stage 9). Previous: **stage 5** = stage 4p + 10 files at `81bca5ba` — the engine.214/287/288 stack (mood per hood, the clusters gone, crime floor + half share, both seed lists into the mood gates) with the agy fold (holiday blocks before the Scenes boosts; carried seeds read the Cycle's calendar), and the engine.299 main-only three (unsigned chaos line out of the pool, rb's 22 bespoke up lines, the Estuary truck). Web app **@148**, pushed 2026-10-19 ~03:40 CDT by `bash output/engine-sheet/push-stage5-prod.sh` (builder go; fresh PROD pull matched 4p 168/168 first; pull-back 167 js + manifest = `output/engine-sheet/stage5-e214.sha256`). Live sheet the same session: `Advancement_Intake1!L3` `Lake Merrit` → `Lake Merritt`; the five `clusterAnchors_*` World_Config rows deleted (`output/engine-sheet/2026-10-19-delete-cluster-rows-live.js`, 252 → 247 rows, no other key changed — the 16 rows below shifted up, so the next bench resync needs the World_Config display check). Bench proof: SANDBOX 1004 @57 = this tree, the pair on live-C112 state and the engine.300 20-Cycle soak, 20/20 PASS (DEPLOY_HISTORY §SANDBOX 1004 @54–@57). First live fire: C113, Sun 2026-10-25 — first adoption of the two seed carry keys (`missing`, graceful), city sentiment steps down while the hoods rise. Rollback: clasp push from `output/engine299/prod-stage-4p-8acd5f30` + version cut. Previous: **stage 4p** = stage 4o + the 4 engine.299 Task 13 files in `output/engine299/stage4p-files.txt` at `8acd5f30` (the citywide EVENT_LIMIT caps gone from the neighborhood (6), generic (25) and game-mode (15) engines — SIM_DOCTRINE §1; the neighborhood pool holds only writable lines; the generic engine prefers a line no one drew this Cycle and repeats the least-used, never nothing; `GameNight` is a texture suffix). Web app **@147**, pushed 2026-10-18 14:07 CDT by `output/engine299/push-prod-4p.sh --go` from `output/engine299/prod-stage-4p-8acd5f30` (168/168 = `output/engine-sheet/stage4p-e299.sha256`, differs from 4o in exactly the 4 files, pull-back byte-identical). Review: agy `output/antigravity/2026-10-18-engine299-task13-caps-read.md` — builder 2026-10-18 13:30 "agy is enough, push the caps". Bench proof: SANDBOX 1004 @54 C112 on live-C111 state — ok 192 s, persist 747/0, EE 4 → 4, 2,344 lines, 0 inert, offender scan acceptanceEmpty true (`output/engine299/offenders-bench-c112-at54.json`). First live fire: C112, Sun 2026-10-18. Rollback: clasp push from `output/engine299/prod-stage-4o-c8235de3` + version cut (`push-prod-4o.sh` STOPs on HEAD drift by design). Previous: **stage 4o** = stage 4n + the 18 engine.299 files in `output/engine299/stage4o-files.txt` at `c8235de3` (every hardcoded event that fires moves a dial: each writer logs `<Kind>-<Dial>-<Up|Down>-<Band>` by what the line says or skips and counts; hood texture lines carry their own direction; moves graded on the citizen's record; mode writers graded; real-Oakland premise text out of the migration engine; the authored crime table emptied — builder 2026-10-18). Web app **@146**, pushed 2026-10-18 12:20 CDT from `output/engine299/prod-stage-4o-c8235de3` (168/168 = `output/engine-sheet/stage4o-e299.sha256`, pull-back byte-identical). Codex: `docs/archive/for-claude-review/2026-10-18-codex-engine299-rereview-2.md` (engine code SHIP). Bench proof: SANDBOX 1004 @49 C112 on live-C111 state — 2,249 lines, 0 inert, offender scan acceptanceEmpty true. engine.214/288/290 files on main are NOT in this stage. First live fire: C112, Sun 2026-10-18. Previous: **stage 4n** = stage 4m + `utilities/citizenDialMap.js` + `phase05-citizens/generateCitizensEvents.js` at `2854dc10` (engine.299 Task 1: every event that fires moves a dial — the graded form `<Kind>-<Dial>-<Up|Down>-<S|M|L>`, admission before any effect, a line with no signed fact is not written; bare `{}` kinds stay history). Web app **@145**, pushed 2026-10-18 05:19 CDT from `output/engine299/prod-stage` (168/168 = `output/engine-sheet/stage4n-e299.sha256`, pull-back byte-identical). Codex SHIP: `docs/archive/for-claude-review/2026-10-18-codex-engine299-task1-diff-review-4.md`. Bench proof: SANDBOX 1004 @44 C112 on live-C111 state. First live fire: C112, Sun 2026-10-18 (the Sunday cron). Previous: **stage 4m** = stage 4l + `utilities/compressLifeHistory.js` at `113e78aa` (engine.197: a LifeHistory line stamped past the current Cycle never folds or moves `DialState.folded`) + `phase07-evening-media/buildEveningFamous.js` at `01ea836f` (engine.296: a legend is MLB-origin and retired OR named a legend on RoleType) — **PROD web app @144**, pushed 2026-10-17 ~01:20 CDT by engine-sheet (`output/engine197/push-prod.sh --go`; fresh PROD pull matched 4l 168/168 first), pull-back 168 = `output/engine-sheet/stage4m-e197.sha256`. Stage 4l = 4k + `buildEveningFamous.js` at `173b9e49` (@143, `stage4l-e296.sha256`). Rollback: `output/engine296/prod-stage` (= 4l) push + version cut.

**Recent PROD bumps** (last 5 — older → [[DEPLOY_HISTORY]] §PROD deploy log):

| PROD | Date | Wave | Plan |
|---|---|---|---|
| @151 | 2026-10-19 | engine.305 hood pulse follows the line's sign — a Down-graded Neighborhood line pulses −1 (was +1) — 2 files over stage 13 (stage 14); bench 1004 pair C113, line sets identical, 15 hoods −0.01…−0.07 | [[../plans/2026-10-10-engine-214-mood-per-hood]] |
| @150 | 2026-10-19 | engine.304 family lottery — 1% tier-weighted links, kids + women into the pool, the wake names family, own words are usage, the dead keep their family — 9 files over stage 9 (stage 13); live Generic_Citizens M–O header first; bench 1004 @64 20/20 + @65 10/10 + probes | [[../plans/2026-10-08-engine-286-game-of-life-events]] |
| @149 | 2026-10-19 | engine.302 bond system — five marital statuses, courting widened, no bond cap, deepening, window 24–58, GC courtship, divorce on stacked crisis — 8 files over stage 5 (stage 9); live MaritalStatus migration first (156 cells); bench 1004 @58 soak 20/20 + @61 smoke | [[../plans/2026-10-08-engine-286-game-of-life-events]] |
| @148 | 2026-10-19 | engine.214 wave — mood per hood + 287/288 + agy fold, engine.299 main-only three — 10 files over stage 4p (stage 5); bench 1004 @57 pair + engine.300 soak 20/20 | [[../plans/2026-10-10-engine-214-mood-per-hood]] |
| @147 | 2026-10-18 | engine.299 Task 13 — the citywide event caps gone (neighborhood 6, generic 25, game-mode 15), generic variety (least-used repeat), GameNight suffix — 4 files over stage 4o (stage 4p); bench 1004 @54 C112 acceptance clean, 192 s | [[../plans/2026-10-18-event-engines-move-dials]] |
| @146 | 2026-10-18 | engine.299 Tasks 3/4/7 — every hardcoded event moves a dial; crime table reset — 18 files over stage 4n (stage 4o); bench 1004 @49 C112 acceptance clean | [[../plans/2026-10-18-event-engines-move-dials]] |
| @145 | 2026-10-18 | engine.299 Task 1: every event that fires moves a dial — graded tags, admission first, no unsigned line written — 2 files over stage 4m (stage 4n); bench 1004 @44 C112 | [[../plans/2026-10-18-event-engines-move-dials]] |
| @144 | 2026-10-17 | engine.197 a LifeHistory line stamped past the current Cycle never folds (13 spouses' Y3C29 counted, not repaired) + engine.296 Davis legend predicate — 2 files over stage 4l (stage 4m) | ROLLOUT engine.197, engine.296; codex `docs/archive/for-claude-review/2026-10-17-codex-dial-fixes-review.md` |
| @143 | 2026-10-16 | engine.296 the sports-legend sightings read the ledger's retired MLB-origin citizens, no hardcoded names — 1 file over stage 4k (stage 4l); 3 template Cultural_Ledger rows → Inactive | ROLLOUT engine.296; [[../plans/2026-10-16-celeste-dead-slice-legends-and-interview-guards]] |
| @142 | 2026-10-16 | engine.98 step 1 a household animal survives every dial rewrite (`DialState.pet`) — 2 files over stage 4j (stage 4k); Scout, Mags's cat, stamped on live POP-00005 | ROLLOUT engine.98; [[../plans/2026-09-26-future-build-ideas]] §engine.98 |
| @141 | 2026-10-16 | engine.285 (2–6) a fire killed mid-write no longer doubles or strands records — 6 files over stage 4i (stage 4j) | ROLLOUT engine.285; [[../research/2026-10-16-codex-engine285-hazards2-6-review]] |
| @140 | 2026-10-16 | engine.285 (1/6) the LifeHistory trim writes kept rows first, clears the tail after — `archiveLifeHistory.js` over stage 4h (stage 4i) | ROLLOUT engine.285; `docs/research/2026-10-08-codex-engine95-design.md` §7 |
| @139 | 2026-10-16 | engine.293 (1) the promotion door prices arrivals by the job — `checkForPromotions.js` over stage 4g (stage 4h) | ROLLOUT engine.293; [[../plans/2026-08-10-economy-native-rebuild]] §Read 2026-10-16 |
| @138 | 2026-10-16 | engine.291 fixes + engine.294 — `$LEADER` self-exclusion, a/an before `$PILOTROLE`, no raw-token fragment (2 files over stage 4f; stage 4g) | ROLLOUT engine.291, engine.294 |
| @137 | 2026-10-16 | engine.291 the city names who is flying UNDOCKED — 2 files over stage 4e (stage 4f) | ROLLOUT engine.291; [[../plans/2026-10-16-undocked-crossover-the-city-knows-its-pilots]] §Move 4 |
| @136 | 2026-10-16 | engine.292 a zero night pushes — `casinoLedgerEngine.js` over stage 4d (1 file; stage 4e) | ROLLOUT engine.292; agy `output/antigravity/2026-10-16-review-research29-undocked-crossover.md` §Hunt 3 |
| @64 | 2026-09-06 | engine.163 `describeUsageContext_` — packet stem stops at the ops key (1 file) | gap log G-EC57 (`output/production_log_run_cycle_c105_gaps.md`) |
| @63 | 2026-09-06 | engine.90 C8 ArchiveNote at exit + Traded gate in the migration engine | [[../plans/2026-08-21-citizen-archive]] |
| @62 | 2026-09-06 | engine.90 C6 heritage archive resolve + C12 GAS half | [[../plans/2026-08-21-citizen-archive]] |
| @61 | 2026-09-06 | engine.90 Citizen Archive code — allocator, resolver, Phase-11 mover (flag 0), restore planner | [[../plans/2026-08-21-citizen-archive]] |
| @58 | 2026-09-05 | engine.148 P3 door guard — Intake folds/refuses an authored hood | [[../plans/2026-09-05-hood-blind-engines-plan]] |
| @57 | 2026-09-05 | engine.148 P3 texture by place label + `Scenes` column | [[../plans/2026-09-05-hood-blind-engines-plan]] |
| @53 | 2026-09-05 | engine.99 #9 child areas are ledger truth | [[../plans/2026-08-02-neighborhood-truth-source-migration]] |
| @52 | 2026-09-05 | engine.131 T7 lit (option 2) + engine.134 T2–3 | [[../plans/2026-08-27-sports-coupling-restore]] |
| @51 | 2026-09-05 | engine.134 T4–8 + civic.18 4c/4d | [[../plans/2026-08-30-hood-identity-remainder-plan]] |
| @50 | 2026-09-04 | engine.109 household door | [[../plans/2026-08-16-new-life-intake]] |
| @49 | 2026-09-04 | engine.141 tracker readers retired | [[../plans/2026-08-31-c105-chase-sessions]] |

**Retired / contaminated sandboxes — never target these IDs** (full trail per ID: [[DEPLOY_HISTORY]] §Retired sandboxes):

| Sandbox | Spreadsheet ID | Why retired |
|---|---|---|
| `SANDBOX 0908` | `1FFpUs98L0wrEcfAaQy6-Ir2xYiCq9baCc0SzqzAMrtM` | Superseded by 1004 (2026-10-04): script project at the 200-version cap; carries bench-only synthetic BOARD-OUSD rows (A41:V47) and C118/C119 feed rows |
| `SANDBOX 0831` | `18BOJmzlO7EoaEhvUsUaqLIZvgrTC1yltUYk_Gz3I3W8` | Superseded by 0908 (2026-09-08). Carries BENCH-ONLY state that never replays: `Undocked_Draw` tab (18 rows, casts for c120–c122), 4 seeded `Undocked_Feed` rows at TargetCycle 121, the engine.175 C119–C121 proof slips; C107–C121 drift past live |
| `SANDBOX 0827` | `14-dUy_Uz_B90bKidZeBL-WHzhJ828kTpf24Lebu9GXA` | Superseded by 0831 (predates C105) |
| `SANDBOX 0814` | `1j1Xj6dcpxMImqz079w7bEf4N58R-ct_lOmVO2imEmsQ` | Superseded by 0827; drifted a cycle past live |
| `SANDBOX 0720` | `1SHlquj9iLCK129SQEcXcvFCNkuGMgwLItDPj_ERiofI` | Gone 2026-08-11, superseded |
| `SANDBOX 0717` | `1ZP9kiwjXngDNqOtnRby9jGxFZnSahpP3T9SLnJoTwS8` | Groundhog-era bench, superseded S328 |
| `SANDBOX 0716c` | `1erYtwSm8s6TczRTiLFbUQ302viC_MmVULWScITKRues` | **CONTAMINATED** — heritage/marriage bug, void canon |
| `SANDBOX 0716b` | `1reNGLnvimH5vmMs2opPylA1QRpNDKwiVRiN8aYXeAVU` | **CONTAMINATED** — same class as 0716c |
| `SANDBOX 0716` | `13Ri5mujcno19KGp4yF19ojQ8-TIVeATRWrxcfBnJJPw` | Superseded post-S320 |
| `SANDBOX 0715` | `1HgJPjcS4t6a5CGSOgDuQoRr8tTTc1OQfGfSS1wuuxgA` | Superseded post-S320 |
| `SANDBOX 0714` | `1wmZTGqIbYL7eVYCplq3iCb2oOGDZ0Inq-pWCtnD1lzc` | Superseded post-go-live copy |
| `SANDBOX_0702` | `1syShVWfudY0eCC9rnR7AWZ8-b-fs5RpJW2bhn6nZtzs` | Broken col-Q incident, do not deploy or write |

## Sandbox doctrine (vetting environment — Mike-direct 2026-07-06)

**All upgrades are vetted on the sandbox before a new live cycle runs.** If something
accidentally deploys to live, Mike can cycle live back via its version history — but the
sandbox is the intended target for anything unverified.

**Bench proof IS the gate (Mike-direct S328):** nothing is gated on a live run — the synced
bench is the same state as live, so the bench fire + sheet verify is the smoke. Live runs
clear whenever Mike fires them; they confirm, they don't gate.

### Groundhog proving loop (Mike-direct S328 — how engine waves ship)

The trigger token exists so the TERMINAL runs the proving loop itself, no Mike in the loop until the live fire:

1. **Build** on main, commit as-you-go.
2. **Push to bench** via the temp-dir route (sandbox `.clasp.json` written LAST, ID grep-verified — S316 gotcha).
3. **Bump the deployment** — `CLAUDE_CTL=1 npx clasp deploy --deploymentId AKfycbztm3… --description "<change>"`. **⚠️ `clasp push` alone does NOT change what the web-app fires (S325 incident)** — the deployment serves a PINNED version.

   **RELEARNED 2026-08-27, in a shape the S325 note did not cover — a deployment created BEFORE the script was authorized stays pinned to an unauthorized version, and bumping is what releases it.** The tell is that the failure *moves* instead of clearing, and neither code looks like an auth problem:

   | Response | Means | Fix |
   |---|---|---|
   | `403` + Drive "You need access" HTML | fresh script never granted OAuth consent | Mike opens the script, runs any function, accepts (standup step 3b) |
   | `404` + "Sorry, unable to open the file at this time" | deployment pinned to a pre-authorize version | **bump the deployment** — authorizing does NOT retroactively fix an existing one |
   | `200` + JSON | engine code reached | read `ok` / `error` |

   Both non-200s return **Drive-branded HTML, not JSON**, so they read as sharing or URL mistakes rather than deployment-version state — which is why S325's lesson did not transfer on sight. A 404 here does not mean the URL is wrong. The rule generalizes: **any time the served version could predate the current script state — new deployment, fresh authorize, new copy — bump before concluding anything from the response.** Curl with `-w "HTTP %{http_code}"` and read the code first; the HTML body is noise.
4. **Fire:** GET `https://script.google.com/macros/s/<deploymentId>/exec?token=<CYCLE_TRIGGER_TOKEN>&expect=<cycleCount now on the bench sheet>` (engine.275: `expect` is mandatory; a repeated call is refused because the counter has moved). **After a reset, clear first** — the guard's admission record survives the sheet sync (trap 6): `clearfire cycle=<the Cycle it names>`, then `clearcheckpoint force=1`, then fire. Returns `{ok, ranMs, diag…}` JSON. **WARNING: any valid-token GET fires a FULL cycle — no ping mode.** Ask Mike for the Apps Script execution log when the JSON isn't enough.
5. **Verify** against the sandbox sheet via service account (explicit sheet ID — env default points at PROD). Run as many groundhog cycles as the change needs; repeat 2–5 until clean.
6. **Deploy proven code to live** (repo-root `CLAUDE_CTL=1 npx clasp push`, /deploy pre-flight).
7. **Terminal syncs the bench from live** for the next build wave: `node scripts/syncSandboxFromLive.js <sandboxSheetId> --apply` (S328, Mike-approved — replaces the manual version-history revert, which lost any direct writes postdating the sandbox's copy snapshot; live is the complete truth since every sheet write replays there). Values-only, batched under API write quota, oversized Media_Briefing cells truncated (regenerated display artifacts), read-back verified on the 5 biggest tabs. Dry-run without `--apply`. Refuses to run against the live ID. Bench 0720 is the PERMANENT bench under this model — no more per-wave sandbox stand-ups.

**Sheet writes are a different animal (Mike-direct S328): anything not in CODE does not carry over.** A `clasp push` to live carries code only. Schema changes, new tabs, column adds, data migrations, backfills — anything written to the SANDBOX SHEET during proving — must be **replayed against the live sheet explicitly** (dry-run → apply → read-back verify, per protocol step 5). Track every bench-side sheet write during a wave and replay it at the live deploy, or live runs new code against old schema. Self-arming schema code (ensure*Schema_ patterns) re-arms itself on live's first fire and needs no replay — everything else does. **QUALIFIED 2026-08-15: only if the ensure fn actually has a cycle-path caller.** `ensureCrimeMetricsSchema_` does (`updateCrimeMetrics.js:122`); `ensureNeighborhoodDemographicsSchema_` does not, so nothing about it re-arms and its changes need an explicit replay like any other data migration. Verify the caller before relying on this sentence.

**PropertiesService is per-script (S328 finding):** prev-cycle state (PREV_EVENING_JSON etc.) does not copy with the sheet. A fresh bench's FIRST fire is a cold start — carry-dependent channels (hospital→crisis detection, streak-gated weather alerts, prevRate) only prove from the SECOND bench fire on. Don't read a quiet first fire as a failed channel.

**Cold starts must be declared (engine.122, 2026-08-19):** past cycle 1, `assertCarryForwardPresent_` ABORTS any fire that finds no carry-forward in script properties OR the `Carry_Forward_Store` tab — a missing memory is fatal, never a silent "first cycle" line (the C104 incident class). For a legitimate fresh-bench cold start, set script property `CARRY_FORWARD_COLD_START_OK=1` before the first fire; the override is consumed on use. (If the bench sheet was synced from live, the tab rides the sync and no override is needed.)

**No property wipe, ever again (engine.119 T3, 2026-09-06, PROD @59):** each carry-forward blob is cycle-stamped (`<key>_CYCLE` beside it) and `Carry_Forward_Store` is a 3-slot ring per key. A prop stamped at or past the cycle about to run is a self-ghost — a crashed run's, or a stale bench's after a re-sync — and the loader steps back to the ring's newest lower row on its own, reporting it as `carryForward` in the fire JSON. Recovery from a mid-Phase-10 crash is: re-fire. A bench re-sync no longer needs the three blobs deleted first (there are six props now: the three blobs + their `_CYCLE` stamps); a stale set is skipped and re-seeded from the synced tab.

### Verified bench run — exact sequence + the traps that bit (2026-08-15)

A full proving run executed end-to-end this session (4a + E2 → SANDBOX 0814 → fire
C109 → verify). The steps above are correct but under-specified in five places that
each cost a failure or a near-miss. This is the sequence that actually worked.

```bash
# 1. STAGE — fresh dir every time. Do NOT `rm -rf` a previous one; the rm-guard
#    hook blocks it and the run dies mid-setup.
STAGE=<scratchpad>/bench-s1 ; mkdir -p "$STAGE"
git archive HEAD | tar -x -C "$STAGE"        # HEAD, so commit first

# 2. CONFIRM THE HAZARD IS REAL, then overwrite LAST
grep -o '"scriptId": *"[^"]*"' "$STAGE/.clasp.json"   # => PRODUCTION id. Every time.
#    ...write the sandbox .clasp.json now, as the final setup step...
grep -q "$SANDBOX_ID" "$STAGE/.clasp.json" && echo OK    # must pass
grep -q "$PROD_ID"    "$STAGE/.clasp.json" && echo FAIL  # must NOT match

# 3. Confirm the staged copy carries the change you think it does (grep for a
#    marker from THIS commit — a stale staging dir looks identical otherwise)

# 4. PUSH + BUMP. `clasp push` alone changes nothing the web app fires (S325).
cd "$STAGE" && CLAUDE_CTL=1 npx clasp push -f
CLAUDE_CTL=1 npx clasp deploy --deploymentId <sandbox-deployment> --description "<change>"

# 5. SHEET WRITES — target explicitly, dry-run first, READ THE PRINTED TARGET ID
node scripts/<seeder>.js --sheet-id=<SANDBOX_SHEET_ID>            # dry
node scripts/<seeder>.js --sheet-id=<SANDBOX_SHEET_ID> --apply

# 6. FIRE — takes ~125s, which EXCEEDS a 120s default timeout. Background it or
#    raise the timeout, or the run reports failure on a cycle that succeeded.
```

**Traps, each one hit or narrowly avoided this session:**

| # | Trap | What happens | Guard |
|---|---|---|---|
| 1 | **`GODWORLD_SHEET_ID=<sb> node …` does not redirect** | `lib/env` loads dotenv with `override: true`, so the `.env` PRODUCTION id wins. The write lands on **LIVE**, silently, with correct-looking output. Caught by probe seconds before a 14-cell seed. | Script-level `--sheet-id=` set **after** the `lib/env` require; print the resolved id before writing; dry-run and read it |
| 2 | **`git archive` lands the PRODUCTION `.clasp.json`** | The S316 incident, still live — confirmed again this run. A staging dir looks ready but points at prod. | Write sandbox `.clasp.json` LAST; grep-verify sandbox present **and** prod absent |
| 2b | **`GODWORLD_SHEET_ID=<bench> node …` silently reads PRODUCTION** | `lib/env.js` loads the env file with `override: true`, so a shell-prefixed sheet ID is replaced by the prod ID at `require('./lib/env')`. Every read looks like the bench and is live. Caught 2026-08-29: a C108 bench fire appeared to have written nothing because all four verification reads were prod. | Set `process.env.GODWORLD_SHEET_ID` AFTER the `require`, or pass `--sheet-id` to a script that applies it itself. Confirm by reading a value that differs between bench and live (e.g. `Riley_Digest` last cycle). |
| 3 | **`ensure*` prefix ≠ self-arming** | `ensureCrimeMetricsSchema_` IS called each cycle (`updateCrimeMetrics.js:122`) so literal edits self-heal. `ensureNeighborhoodDemographicsSchema_` has **zero** cycle-path callers — an identical-looking edit is completely inert. | Before claiming a schema fix self-heals on live, `grep` for an actual caller. The naming convention is not evidence |
| 4 | **Verifying against a guessed column name** | Read `Cycle` on `Crime_Metrics`; the column is `LastUpdated`. `findIndex` returned −1, every row read as blank, and the run looked like a total failure when it had fully succeeded. | Dump the header row before asserting on any column. A uniform-blank result means suspect the index, not the data |
| 5b | **An HTTP 404 on a fire can mean the Cycle ran twice** | 2026-09-30: one GET answered 404 and the bench advanced two Cycles (C113 and C114); S509's C128 404 was the same shape. | After any non-200, read `World_Population` / `Cycle_Packet` for the last cycle before anything else; never re-fire to "retry" |
| 5 | **Fire exceeds the default command timeout** | 125s against a 120s default — the cycle succeeds, the caller reports timeout. | Background it or raise the timeout; then read the JSON, don't re-fire (a second GET runs a whole second cycle) |
| 6 | **After a bench RESET, the fire guard still remembers the last admitted Cycle** | 2026-10-10: the sheet synced back to C110 but the script property `FIRE_ADMISSION_JSON` still said "Cycle 112 admitted (done)". The first `&expect=110` was refused (engine.275) AND logged a `Phase1-FireGuard` row to Engine_Errors — a clean bench picks up a false error row. The record is one slot naming one Cycle; `clearfire` with a different `cycle=` is refused and names the right one. | **Reset → `clearfire cycle=<the Cycle the record names>` → `clearcheckpoint force=1` → fire.** Both clears are form-encoded POSTs with the token (a JSON body reads as `bad token`). If a refusal row landed anyway, name it in the readback — it is the guard working, not a cycle defect |
| 7 | **A long fire can return Google's HTML wrapper page instead of JSON** | 2026-10-10: C111 (207 s) and C112 (176 s) came back HTTP 200 with an HTML page (`ppConfig`, no `{ok:…}`); both Cycles had run to completion. Grepping the body for `"ok":true` reads a false negative — and a chained script that keys the next step on it stops (or, worse, re-fires). | Truth is the sheet: read `World_Config.cycleCount` and the last Riley_Digest row, then the Engine_Errors count. Never re-fire on an HTML body. Key a chain on the sheet state, not the response |
| 8 | **A `values.append` with `INSERT_ROWS` on World_Config shifts its cell formats one row** | 2026-10-30: after engine.206's bench appended a `sportsStreakHeadline` row, B24 (`lastRun`) and B25 (`cycleCount`) had traded number formats on SANDBOX 1004. A reset rewrites values, not formats, so `cycleCount` 112 read as the date 4/21/1900 and engine.275 refused the fire (one `Engine_Errors` row, bench advanced 0). | Before a bench run, compare World_Config `FORMATTED_VALUE` bench vs baseline; copy the baseline's `numberFormat` onto any differing cell (`updateCells`, fields `userEnteredFormat.numberFormat`). Format fixes survive later resets |

**What a clean proof looks like** — for reference, the C109 run: `{ok:true}`, 128
phases, then a per-claim read-back against the sandbox sheet with the *specific*
before/after numbers predicted in advance (District 22/22 not 8/22; Coliseum frozen
at 108 while Montclair moved to 109). Predicting the numbers before the fire is what
turned a passing cycle into a proof — and it is what exposed trap 3, since the
demographics prediction failed while the others held.

### Standing up a NEW sandbox (protocol, S318)
1. **Mike:** in Drive, File → Make a copy of the live spreadsheet (the bound Apps
   Script copies with it — automatically bound to the copy).
2. **Mike:** open the copy → Extensions → Apps Script → Project Settings → copy the
   **Script ID** to the terminal.
3. **Mike (REQUIRED — every new copy):** same Project Settings page → **Script
   Properties** → Add script property: `SIM_SSID` = the copy's own spreadsheet ID.
   Script Properties do NOT copy with the spreadsheet; without this the script
   falls back to the hardcoded LIVE id (`DEFAULT_SIM_SSID`,
   `utilities/utilityFunctions.js:182`) and the AIM-GUARD blocks every run.
   (S319 incident: SANDBOX 0714's first C102 fire died on exactly this — step was
   missing from the S318 protocol.)
3b. **Mike (REQUIRED — every new copy, added 2026-08-27):** open the bound script
   in the Apps Script editor, run any function once, and accept the
   authorization prompt. The manifest is `executeAs: USER_DEPLOYING` with zero
   declared `oauthScopes`, so a fresh copy has never granted consent and every
   web-app GET returns **HTTP 403 "You need access"** — which reads like a
   permissions/sharing problem and is not one. `clasp deploy` creates the
   deployment but cannot grant consent. (SANDBOX 0827's first fire died on
   exactly this — the same shape as the S319 `SIM_SSID` omission: a manual step
   the protocol did not name, found only at a first fire.)
3c. **Check `Carry_Forward_Store` FIRST (corrected 2026-08-31, SANDBOX 0831 finding)
   — only set `CARRY_FORWARD_COLD_START_OK` if it's actually empty.**
   `assertCarryForwardPresent_` reads two layers: script properties AND the
   `Carry_Forward_Store` sheet (`loadCarryForwardBlob_` falls back to it,
   `loadPreviousEvening.js:88-98`). That sheet copies with the spreadsheet — a
   copy made from a live sheet that already had carry-forward rows is NOT a
   cold start, even though script properties never carry over. Read the sheet
   before assuming. If and only if it's genuinely empty: Script Properties →
   `CARRY_FORWARD_COLD_START_OK` = `1` — the carry-forward gate would otherwise
   correctly abort the first fire (*"The world must not run without
   yesterday"*). **The override is one-shot, consumed on use** — setting it
   when the sheet already has data wastes it against a real cold start later.
   **Order matters: authorize (3b) BEFORE bumping the deployment**, or the
   deployment pins an unauthorized version and every GET 404s.
4. **Isolation is by construction** — verified S318: the engine contains zero
   `openById` calls; the bound script only ever touches its own container. No
   wrapper needed. (Node scripts are the only cross-container access and take
   explicit sheet IDs — never rely on env default when targeting a sandbox.)
5. **Terminal:** update THIS file's §Current state (new IDs, retire the old ones
   into the table above), then clasp push via the temp-dir route below, then
   replay any pending data migrations against the new sheet ID (dry-run → apply
   → read-back verify).
6. Triggers do NOT copy — sandbox cycles are Mike-fired from the sheet, which is
   the intended mode.

### Does a bench cycle contaminate the crons? No — verified empirically 2026-08-27

A bench fire runs the FULL engine, including packet builders, so the question
"is the sandbox updating cron packets?" is the right one to ask. It is not, and
here is the evidence rather than the reasoning:

**Live sheet after two bench cycles (C105, C106) — every value unchanged:**

| | before bench | after |
|---|---|---|
| `cycleCount` / `lastRun` | 104 / 8/19/2026 | 104 / 8/19/2026 |
| `Neighborhood_Map` max cycle | C104, `SportsSeason` off-season x22 | identical |
| `Cycle_Packet` | 63 rows, max C104 | identical |
| `Carry_Forward_Store` | 0 rows | 0 rows |

**Cron output after an overnight run:** 81 files touched in `output/`, and every
cycle-tagged cron artifact is `c104` — 56 of 56. The bench sheet id appears in
**zero** files under `output/`. No crontab entry sets a sheet id, so all 28 jobs
resolve `GODWORLD_SHEET_ID` to live from the env file.

**Why it holds structurally:**
- The cycle-path packet builders write only through `ctx.ss` — `buildCyclePacket_`
  uses `ensureSheet_(ctx.ss, 'Cycle_Packet', …)`, `buildMediaPacket_` likewise. On
  a bench fire `ctx.ss` IS the bench, so packets land on the bench sheet.
- The Drive exporters that *would* be shared — `cycleExportAutomation.js`,
  `exportCycleArtifacts.js`, `exportCitizensSnapshot.js`, `textCrawler.js` — are
  **not on the cycle path**; zero `safePhaseCall_` sites in `godWorldEngine2.js`.
  They are operator/trigger-fired. This matters because they resolve folders by
  NAME (`DriveApp.getFoldersByName('exports')`), and bench and live run as the
  same Google account, so they would collide. **Any future work that puts one of
  these on the cycle path breaks bench isolation** — that is the thing to guard.
- No outbound calls on the cycle path. The lone `UrlFetchApp` mention in
  `applyInitiativeImplementationEffects.js` is a comment; the code uses
  `require('fs')`, undefined in Apps Script, inside a try/catch.
- Crons are Node scripts reading live by env default; they never learn a bench id.

### Pushing to the sandbox

- **Sandbox clasp deploy:** copy repo to a temp dir, drop a `.clasp.json` with the sandbox
  Script ID + the project `.claspignore`, `CLAUDE_CTL=1 npx clasp push -f`. The production
  `.clasp.json` at repo root is never touched. (Route defined in
  [[../plans/2026-07-04-ripple-ledger-attribution]] §Sandbox identity.)
  **⚠️ `.clasp.json` is GIT-TRACKED with the PRODUCTION script ID** — any repo-copy step
  (`git archive | tar -x`, `cp -r`, `rsync`) lands the production ID in the staging dir.
  Writing the sandbox `.clasp.json` must be the LAST step before push, and every sandbox
  push is preceded by verifying the staged file carries the sandbox ID
  (`grep 1bT3o5r6 .clasp.json`). S316 incident: a re-extract over an existing staging dir
  silently restored the production ID and one sandbox-intended push landed on the
  production script.
- **Node scripts against the sandbox:** `GODWORLD_SHEET_ID` in the env points at
  **production** — always pass the sandbox explicitly.

  **⚠️ A SHELL VARIABLE DOES NOT WORK, AND FAILS SILENTLY TO LIVE (verified
  2026-08-15).** `lib/env` loads dotenv with `override: true`, so the `.env` file's
  production `GODWORLD_SHEET_ID` clobbers anything exported into the shell. Running
  `GODWORLD_SHEET_ID=<sandbox> node scripts/foo.js --apply` resolves straight back to
  the production id and **writes to LIVE** with no warning — confirmed by probe
  before a seed write, which would otherwise have landed on production. Any script
  that does `require('lib/env')` is affected, which is all of them.

  The target must be set **after** the loader runs — a `--sheet-id=<id>` flag that
  assigns `process.env.GODWORLD_SHEET_ID` post-require (see
  `scripts/seedNeighborhoodDistrict.js`, which also prints the resolved id before
  writing). **Before any sandbox `--apply`, dry-run first and read the printed target
  id.** Example of the pattern to follow, not to trust blindly:
  `node scripts/draftContentRows.js --cycle {XX} --apply --sheet-id 1wmZTGqIbYL7eVYCplq3iCb2oOGDZ0Inq-pWCtnD1lzc`
- Cycle runs are Mike-fired from the sandbox sheet.

### Sandbox sync value types

`scripts/syncSandboxFromLive.js` reads underlying values (`UNFORMATTED_VALUE`, date serials) and writes them with `RAW`. Formatted display strings are not a valid transport: percentages, currency, dates and booleans can change meaning when stored as text. Before declaring a proving reset equivalent, compare underlying values and types in World_Config, Carry_Forward_Store and the affected ledgers; matching row counts or displayed text alone is insufficient. The existing 49,900-character truncation remains limited in the verified C107 source to 11 historical Media_Briefing cells. D7 proving evidence: [[../plans/2026-08-29-employment-system-cascade]].

## Changelog

- 2026-09-14 (codex) — Sandbox sync preserves source value types; regression fails before the correction and passes 4/4 afterward. Critical-tab typed readback is part of reset acceptance.

- 2026-09-04 (S418, research-build) — Restructured to protocol + current-state only, per Mike-direct ("deploy.md needs to be a MD that is clear and concise + a changelog that serves it"). Full per-wave proving narrative (was ~250 lines of stacked history) relocated verbatim to new [[DEPLOY_HISTORY]]; added a §Current state section (bench/live one-liners + a 5-row recent-bumps table) and a retired-sandbox ID table replacing the full retired-sandbox prose. 366 lines → ~185 lines.
