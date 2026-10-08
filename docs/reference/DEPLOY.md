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

**Current bench pointer (2026-10-08 02:30):** SANDBOX 1004 web app **@4 = `e87362b4`** (engine.94 B.3 v3 over @3). **C112 fired on @4 over live-synced C111 state + one NON-CANON fixture (COUNCIL-D3 Approval 12 + campaign note naming POP-00517):** ok, 237 s, 0 new Engine_Errors; Shai Diaz seated over Rose Delgado, grudge bond `v5u2omk8`, ledger 1,033 → 1,039 — the seating is non-canon and stays on the bench until the next `syncSandboxFromLive.js --apply`. **Bench at C112, next fire `&expect=112`.** Superseded: SANDBOX 1004 web app **@3 = `f57439e2`** (a4cb20df over f2a61e5e; the bare `deploy` created version 3 and left the pin at @2 — repointed with `-V 3`, read back @3). **C111 fired on @3 over live-synced C110:** ok, 197 s, 132 phases, 0 new Engine_Errors, ledger 1,025 → 1,033; POP-00801 discharged to `Active` (engine.283 on a real citizen). Three pre-fix `active` cells carried by the 2026-10-06 sync trued to `Active` (L147/L417/L858, read back). **Bench at C111, next fire `&expect=111`.** Superseded: SANDBOX 1004 web app **@2 = `f2a61e5e`** (engine.282+283 over the eight; pull-back 167/167 + manifest); C112 clean on live-synced C111 state, C113 FIXTURE fire (engine.282/283 mechanism proof only — `debtDefaultCycles` 1, three planted citizens), then **RESYNCED FROM LIVE C110** (83/83 tabs, row-count verify OK), `fireGuardMinutes` 0, `clearfire&cycle=113` ok. **Bench at C110, next fire `&expect=110`.** Prior pointer, superseded: SANDBOX 1004 (`1tByPpT8QIgJppabjpEdAqPlTjcq2RBSkL_QDrGk8YcA`, sheet title `Sandox_104_c109-live_Simulation_Narrative`; script project `1gbJmGeDilxIhe25TC8SrSei89uJTEgVYgN2aOClEHHKJiykADzPVAIC2`; web app deployment `AKfycbxxCwKERRGb3Gk6SYg6T2nrGKf8NrKQ-pY-BOG5sdaKclEkf2jGqS3IBhgrs5IDdlmC`) **@1 = `2e9f3c63`** (all eight unbenched builds; pull-back 168/168). **RESYNCED FROM LIVE C110 2026-10-06** (`syncSandboxFromLive.js --apply`, 83/83 tabs, typed cell read-back 0 diffs on World_Config/Carry_Forward_Store/Care_Justice_Census/Simulation_Ledger/Civic_Office_Ledger/Initiative_Tracker/City_Treasury bar the guard; the BOARD-OUSD and INIT-901 fixtures are gone; `fireGuardMinutes` set 0 on the bench after the sync; `clearfire&cycle=111` cleared the stale record — the record keys on the Cycle that FIRED, `webTrigger.js:92-121`). **C111 fired on @1 over live-synced C110:** ok, 190 s, 132 phases, 0 new Engine_Errors, every carry key `ghost-skipped@111` → `recovered-from-sheet->110` (`PREV_FRANCHISE_WEIGHT_JSON` `missing` — engine.209 has no live row yet, expected), ledger 1,025 → 1,033, 1 archived. **Bench at C111, next fire `&expect=111`.** Earlier history on this bench (pre-resync): Builder-made copy of live C109 2026-10-04 (83 tabs; `Carry_Forward_Store` populated, not a cold start); `SIM_SSID`, `CYCLE_TRIGGER_TOKEN` and authorization set by the builder; `fireGuardMinutes` 0. **C110 fired 12:28 on @1:** ok, 219 s, 132 phases, 0 new Engine_Errors, 5 `clusterAnchors_*` + `folkMemoryWindow` self-armed, ledger 963 → 1,024. **C111 fired 12:35:** ok, 156 s, 0 new Engine_Errors; synthetic NON-CANON fixtures: 7 BOARD-OUSD rows at `Civic_Office_Ledger` A41:V47 and `INIT-901` (education) at `Initiative_Tracker` row 9 — board vote 3-4 by name. Next fire `&expect=111`.

**This file is protocol + CURRENT pointers only.** Per-wave proving narrative and bench-write logs go to the wave's own plan doc (builder rule 2026-08-30) or to [[DEPLOY_HISTORY]] — a session that finds itself writing a paragraph here is writing in the wrong file.

**Previous bench:** `SANDBOX 0908` (`1FFpUs98L0wrEcfAaQy6-Ir2xYiCq9baCc0SzqzAMrtM`) — RETIRED 2026-10-04: its script project hit Apps Script's 200-version cap (push lands, no new deployment; web app frozen @200 = `d7ac5fff`, C119). Full trail: [[DEPLOY_HISTORY]] §Retired sandboxes.


**Live:** PROD engine files = `e87362b4` (2026-10-08 ~02:40 CDT — isolated `git archive` stage of HEAD, pre-flight delta 7 engine files + `runCivicElectionsv1.js` live-only (removed by the push) against a fresh PROD pull (= `f57439e2`), pull-back 166/166 + manifest byte-identical, 0 test files, push only — web app @135 untouched, live fires from the menu; bench 1004 @4 C112 fixture-proven. engine.94 B.3 v3 + the calendar election deleted: **131 phases from C111**. Expectations [[DEPLOY_HISTORY]] §PROD e87362b4). Before it: `f57439e2` (2026-10-08 01:16 CDT — isolated `git archive` stage of HEAD, pre-flight delta exactly 2 engine files against a fresh PROD pull (`setupSportsFeedValidation.js`, `updateCivicApprovalRatings.js` — a4cb20df), pull-back 167/167 + manifest byte-identical, 0 test files, push only — web app @135 untouched, live fires from the menu; bench 1004 @3 C111 clean. Expectations [[DEPLOY_HISTORY]] §PROD f57439e2). Before it: `f2a61e5e` (2026-10-06 23:43 CDT — isolated `git archive` stage of HEAD, pre-flight delta exactly 55 engine files against a fresh PROD pull (fresh pull = `e59e89f8` byte-identical, no drift; no new files), pull-back 167/167 js + manifest identical, push only — live fires from the menu. Carries the eight 2026-10-04 builds (engine.94 B.1/B.2a/B.3, engine.206/281, engine.209, engine.214, engine.268, civic.43 T1+T3) + engine.282 + engine.283; HEAD's engine files = the bench @2 artifact. Expectations [[DEPLOY_HISTORY]] §PROD f2a61e5e). Before it: `e59e89f8` (2026-10-03 ~02:05 — engine.208 M1 `applyGameNightMoments.js` only; pre-flight delta one file against a fresh pull, pull-back 168/168). Before it: `3d6aa525` (2026-10-03 ~00:50 — engine.277 REVERTED, engine files byte-identical to `3e12b367`, pull-back 167/167 + manifest). Before it: `46832db3` (2026-10-03 ~00:30, isolated stage, pre-flight delta exactly three files against a fresh pull — `generateCitizensEvents.js`, `citizenDialMap.js`, `neighborhoodPulseMap.js` — engine.277; pull-back 167/167 + manifest, 0 test files; web-app label still @135, live fires from the editor menu). Before it: `3e12b367` (2026-10-02 ~23:05, isolated stage, pre-flight delta exactly five files against a fresh pull — `careJusticeAccounting.js`, `applyDemographicDrift.js`, `buildCyclePacket.js`, `engine94SheetContract.js`, `godWorldEngine2.js`, each byte-identical to the bench stage — pull-back 168/168 identical; engine.254 Task 10 talk-back: census city beds against their own middle, three `hospitalStrain*` keys self-arm at the first fire; menu-fired, web-app label not bumped). Before that: `a6e36842` (2026-10-02 11:56, delta three files — `generationalWealthEngine.js`, `judicialLifecycle.js`, `compileHandoff.js`: the `COURT_FINE` / `TAX_DAY` / `ALLOCATION_ENDED` hooks and the stale handoff section out — pull-back 168/168 identical). Before that: `13e6502f` (2026-10-02 11:20, delta two files — `parseMediaRoomMarkdown.js`, `mediaRoomIntake.js`, the storyline-tab writers out — pull-back 168/168 identical; **the `Storyline_Tracker` and `Storyline_Intake` tabs were deleted on live at 11:22**, exported first). Before that: `e35ceba1` (2026-10-02 11:08, delta one file — `engine94SheetContract.js`, the business-tax seed at 1% — pull-back 168/168 identical). Before that: `8ed7bd9f` (2026-10-02 10:49, isolated stage, pre-flight delta exactly six files against a fresh pull — `engine94SheetContract.js`, `godWorldEngine2.js`, `applyInitiativeImplementationEffects.js`, `judicialLifecycle.js`, `chaosCarsEngine.js`, `generationalWealthEngine.js` — pull-back 168/168 identical, 0 test files live — engine.271: fines, tickets, court revenue, tax day; eleven World_Config dials self-arm at the first fire; menu-fired, web-app label not bumped). Before that: `dc118fb4` (2026-10-02 07:54, isolated stage, pre-flight delta exactly `phase05-citizens/processAdvancementIntake.js` against a fresh pull, pull-back 168/168 identical, 0 test files live — engine.278: the mint's employer pick reads the mapping's named organisations, then the role's field; menu-fired, web-app label not bumped). Before that: `5a65a82a` (2026-10-02 07:09, isolated stage, pre-flight delta exactly six files against a fresh pull — `generationalWealthEngine.js`, `runCareerEngine.js`, `citizenMemory.js`, `compressLifeHistory.js`, `engine94SheetContract.js`, `godWorldEngine2.js` — pull-back 168/168 identical, 0 test files live — engine.276: debt follows net worth against one year of hood median income; six `debt*` World_Config keys self-arm at the first fire; menu-fired, web-app label not bumped). Before that: `bce69997` (2026-10-02 03:54, isolated stage, pre-flight delta exactly 14 files — the three engine.273 Second Dawn commits `9708018a` `1a338f2a` `bce69997` — pull-back 167/167 identical, 0 test files live — year position 27 is Second Dawn on the `oakland` tier, the holiday flag out of prose; menu-fired, web-app label not bumped). Before that: `1c391906` (2026-10-02 02:24, isolated stage, pre-flight delta exactly `phase05-citizens/processAdvancementIntake.js`, pull-back 167/167 identical, 0 test files live — engine.279: the mint pass writes its log lines once and reads `Generic_Citizens` once; menu-fired, web-app label not bumped). Before that: `3c25827d` (2026-10-02 01:56, isolated stage, pre-flight delta exactly three files, pull-back 167/167 identical, 0 test files live — engine.254 Task 8 follow-up: rows below the census are reported after the block stands; `utilities/tier1EssenceEvents.js` carries rb's `97f1b808` name string for POP-00791; menu-fired, web-app label not bumped). Before that: `a22fa428` (2026-10-01 22:22, isolated stage, pull-back 167/167 identical, 0 test files live — engine.254 Task 8: ledger stamps + `Care_Justice_Census`; `Care_Justice_Census` tab and both stay keys written to the PROD sheet first; an earlier push the same evening, 21:55, had put `7e8baf15` live; the web-app version label was not bumped — live fires from the menu, which runs the pushed files). Before that: PROD web app **@135** (2026-10-01 ~18:20, isolated stage, engine code `6367401d`, pull-back 168/168 byte-identical — engine.275: a Cycle cannot fire twice; `fireGuardMinutes` 60 on PROD World_Config, set by hand before the push; PROD has no trigger token, live fires from the sheet menu only; bench @165 proved every refusal). Before that **@134** (2026-10-01 ~03:40, isolated stage of `ea099a65`, engine code = `74925c1c`, pull-back 168/168 byte-identical — engine.272 integrity wear (`integrityWearRate` and `integrityWearFloor` 10 set on PROD World_Config by hand before the push at 0; **rate set to 1 on 2026-10-01 11:50 at the builder's ruling — wear is ON from C110**), engine.274 career reach, UNDOCKED audience routing; bench @162 C139–C141 ok). Before that **@133** (2026-10-01 01:00, isolated stage of `4ae350dd`, pull-back 167/167 + manifest — engine.254 Task 6b: custody settlement from savings + dismissal pass; `judicialDismissAfterCycles` 3 on PROD World_Config set before the push; bench @160 C131–C138 ok). Before that **@132** (2026-09-30 evening, isolated stage of `0fec66e0`, pull-back 167/167 + manifest — engine.254 Task 7b extension: ambulance named hits follow `hospitalIntakes`, OARI van `oariEligible`; bench @158 C129–C130 ok). Before that **@131** (2026-09-30 evening, isolated stage of `88d56aa9`, pull-back 167/167 + manifest — engine.273 wave 4: Hanukkah dropped, faith holy days Easter/Christmas only, season markers + BackToSchool kept; bench @157 C128 ok). Before that **@130** (2026-09-30 overnight, isolated stage of `bc296679`, pull-back 167/167 + manifest byte-identical — engine.254 hardening: the hospital and judicial writers are isolated inside `Phase10-CyclePacket`, a throw logs an Engine_Errors row and sets `S.careJusticeWriteStatus`, never costs the packet; bench @156 C127 ok). Before that **@129** (2026-09-30 overnight, isolated stage of `28a77d0c`, pull-back 167/167 + manifest byte-identical — engine.273 holiday wave 2: dropped-holiday branches/lists/pools deleted (A, neutral) + youth/recovery lists, month prose, VM packet test (B); no sheet steps; bench-proven @154–@155 C123–C126; agy review SHIP). Before that **@128** (2026-09-30 overnight, isolated stage of `bf8e69f4`, pull-back 167/167 + manifest byte-identical — engine.273 holiday wave 1 (one table, 10 kept + 5 held, First Friday every 4th week, no month names in output) + engine.254 Task 6 (detained gates, `Phase5-Judicial`, `Judicial_Ledger` writer, Hospital P); PROD setup first and read back: `Judicial_Ledger` tab 21 headers, `Hospital_Ledger` L–P (grid 11→16), five judicial keys at ruled defaults; bench-proven @152 C113–C116 and @153 C117–C122). Before that **@127** (2026-09-30 overnight, isolated stage of `be0d3534`, pull-back 167/167 + manifest byte-identical — engine.254 Task 7b: cop-car named hits follow demand (binomial per hood × `careJusticeExposureDial`), cop car's loop weight 0.6 neighborhood-only; World_Config `careJusticeExposureDial` 1 added and read back first; bench-proven @151 C111–C112; agy review folded). Before that **@126** (2026-09-30 ~00:45 Chicago, isolated stage of `1e82acb0`, pull-back 167/167 + manifest byte-identical — engine.254 Task 7 demand-first: `Phase4-CareJusticeDemand` + hood-weighted cop car / ambulance / OARI van; World_Config `careJusticeAdmitPerSick` 0.02 + `careJusticeOariEligibleShare` 0.25 added first; bench-proven @149 C142–C143 and @150 live-synced C110). Before that **@125** (2026-09-29 ~20:40 Chicago, isolated stage of `44fa4c1a`, pull-back 166/166 byte-identical, 0 test files — engine.254 Task 5 judicial receipts, in-memory only; bench-proven SANDBOX 0908 @146–@148 C136–C141). Before that **@124** (2026-09-29 ~12:55 Chicago, isolated stage of `711f2325`, version 124 repointed and read back, pull-back 165/165 byte-identical, 0 test files — engine.254 week-after first health roll `7b7c17af` (builder ruling); bench-proven SANDBOX 0908 @145 C134–C135). Before that PROD web app **@123** (2026-09-29 ~09:55 Chicago, isolated `git archive` stage of `52ee5f62`, version 123 repointed and read back, pull-back 165/165 byte-identical, 0 test files — engine.254 Task 4 typed hospital receipts `1ca5322b` + dead-citizen guard `4c9bf010` + receipt from/stub maps `f7360a4e`, + uncalled `utilities/careJusticeAccounting.js`; bench-proven SANDBOX 0908 @144 C128–C133). Before that PROD web app **@122** (2026-09-28 S503, HEAD `05287e68`, engine.266 Storyline_Tracker retirement, pull-back 164/164 byte-identical, storylineWeavingEngine.js gone from live; over @121 = S502 second ship, HEAD `f7263611`, pull-back 165/165 byte-identical — engine.249 sign-only flow, role reads → RoleType, last week's media climate, sim-clock life lines, city treasury; bench-proven SANDBOX 0908 @137–@142 C119–C126; live City_Treasury tab created + World_Config employmentFloor 0.85 replayed and read back before the push). Before that PROD **@120** (2026-09-28 S502, HEAD `8d605260` from an isolated `git archive` stage, pull-back 165/165 byte-identical — the S499 wave (engine.193 cuts, 202 WeekRecord fold, 227, 199, Chicago retired, 196, 249, 195 gates, 189, 41, 262 casino net win) + engine.265 intake + engine.267 arrival guard + engine.195 mood carrier + Cultural_Ledger calendar cells + UNDOCKED mover gate + engine.47 Hop 5; bench-proven SANDBOX 0908 @131–@136 on live-synced C109, C110–C118 clean. employmentFloor replay done at @121). Before that PROD **@132** (2026-09-26 ~12:20 Chicago, HEAD `a0f158d3` from an isolated `git archive` stage — Job 6 renewal: `51b604bb` + `65a115f1` + `fa7490bc`; agy CLEAN PASS `output/antigravity/2026-09-26-review-job6-renewal.md`; bench SANDBOX @111–@113 C117→C120; script version 119, web app pinned **@119**, read back; pull-back 169/169 js byte-identical). Before that PROD **@131** (2026-09-26 ~02:10 Chicago, HEAD `41c63294` pushed from an isolated `git archive` stage — Jobs 4+5: `BizID` link + engine.260 tracked hires + build/operating spend; agy CLEAN PASS `output/antigravity/2026-09-26-review-jobs-4-and-5.md`; script version 118, web app repinned **@118** 2026-09-26 ~11:25 Chicago after auto mode was switched off (the classifier had refused it at ~02:10), read back @118). Before that PROD **@130** (2026-09-25 ~08:50 Chicago, web app @117 = `12289fdb`: a site's open appends one MilestoneNotes line; bench SANDBOX 0908 @108 C113 opened a bench-only fixture site with the line, C114 no repeat, 0 new errors; pull-back byte-identical). Before that PROD **@129** (2026-09-25 ~02:00 Chicago, web app @116 = `812d04d3`: Job 3 build duration — OpensCycle + five `civicBuildCycles_*` self-arm at the first fire, INIT-005 opens from its C80 vote; bench SANDBOX 0908 @107 C110–C111, agy CLEAN PASS `805e52c5`; pull-back byte-identical). Before that PROD **@128** (2026-09-24 ~23:45 Chicago, web app @115 = `578c2237`: engine.259 the fund moves; pull-back 169/169 — [[DEPLOY_HISTORY]] §PROD @128). Before that PROD **@127** (2026-09-24 ~22:45 Chicago, web app @114 = `02a50b75`: housing program removed + 258d status-rung sale; pull-back 169/169 byte-identical — [[DEPLOY_HISTORY]] §PROD @127). Before that PROD **@125** (2026-09-23 ~18:25 Chicago, web app v112 = `17daa559`: kimi 4 + engine.258 owner move + 258b canon anchor; staged `git archive`, pull-back byte-identical on the three Phase-5 files). Before that PROD **@124** (2026-09-22 ~21:35 Chicago, engine.255 Task 8 discount code removed `bb15f9c9`; script version 111, read back @111; pull-back 169/169, 0 test files; three retired World_Config keys deleted — [[DEPLOY_HISTORY]] §PROD @124). Before that PROD **@123** (2026-09-22 ~20:50 Chicago, engine.255 Tasks 6+7 `48920aa9`; version 110, read back @110 — [[DEPLOY_HISTORY]] §PROD @123). Before that PROD **@122** (2026-09-22 ~19:20 Chicago, engine.255 Tasks 2+4 disbursement lever `bcd32f1f`; script version 109, read back @109 — [[DEPLOY_HISTORY]] §PROD @122). Before that PROD **@121** (2026-09-22 ~18:30 Chicago, engine.255 Task 1 budget columns `55d1fe1f`; script version 108, read back @108 — [[DEPLOY_HISTORY]] §PROD @121). Before that PROD **@120** (2026-09-22 ~15:55 Chicago, engine.255 housing lever off `0342ed03`; script version 107, read back @107 — [[DEPLOY_HISTORY]] §PROD @120). Before that PROD **@119** (2026-09-22 ~13:55 Chicago, civic.38 Task 9 housing playable `51b2817f`; script version 106, read back @106; pull-back 169/169 — [[DEPLOY_HISTORY]] §PROD @119). Before that PROD **@118** (`7d849c57`, rate seed 0.20 + live dials, v105), PROD **@117** (`a7a9c79b`, Tasks 1–8 inert + G-EC70, v104), PROD **@116** (2026-09-21 ~23:05 Chicago, civic.38 step 3 review fix-ups `78eb6935`, isolated-stage push landed, pull-back 169/169 js byte-identical, 0 test files; version 103, read back @103 — [[DEPLOY_HISTORY]] §PROD @116), over **@115** (2026-09-21 ~22:40 Chicago, civic.38 Task 4 step 3 losing clock `7ba27e95`, version 102 — [[DEPLOY_HISTORY]] §PROD @115), over **@114** (2026-09-21 ~21:58 Chicago, civic.38 rulings 14/17/18 seeds `981d8355`, version 101 — [[DEPLOY_HISTORY]] §PROD @114), over **@113** (2026-09-21 ~21:20 Chicago, civic.38 Task 4 part 2 codex fix-ups `a342400d`, version 100 — [[DEPLOY_HISTORY]] §PROD @113), over **@112** (2026-09-21 ~20:50 Chicago, civic.38 Task 4 part 2 Delivering `411b9e69`, version 99 — [[DEPLOY_HISTORY]] §PROD @112), over **@111** (2026-09-21 ~08:40 Chicago, civic.38 Task 4 upkeep `f78561d0`, version 98 — [[DEPLOY_HISTORY]] §PROD @111), over **@110** (`9da4d5cc`, version 97) and **@109** (`3500a370`, version 96) — [[DEPLOY_HISTORY]], over **@108** (2026-09-20 ~23:20 Chicago, engine.250 stall-drag dial `a92e84a6`, HEAD push landed, pull-back 169/169 js byte-identical, 0 test files; version 95, read back @95 (covers @106–@108) — [[DEPLOY_HISTORY]] §PROD @108), over **@107** (2026-09-20 ~22:20 Chicago, civic.38 Task 5 + revival guards `95b67423`, HEAD push landed, pull-back 169/169 js byte-identical, 0 test files; **version step PENDING for @106 + @107 — web app still reads @94** — [[DEPLOY_HISTORY]] §PROD @107), over **@106** (2026-09-20 ~20:15 Chicago, engine.250 `2b855aaa`, HEAD push landed, pull-back 169/169 js byte-identical, 0 test files; **version step PENDING — classifier refused `clasp version`, web app still reads @94** — [[DEPLOY_HISTORY]] §PROD @106), over **@105** (2026-09-20 ~16:50 Chicago, engine.247 `d5738907`, version 94, read back @94; pull-back 169/169 js byte-identical, 0 test files — [[DEPLOY_HISTORY]] §PROD @105), over **@104** (2026-09-20 ~15:10 Chicago, engine.244 + engine.215 `b5cb18fb`, version 93, read back @93; pull-back 169/169 js byte-identical, 0 test files — [[DEPLOY_HISTORY]] §PROD @104), over **@103** (engine.243 `c04c4caa`, version 92). Before that PROD **@102** (2026-09-19 ~22:58 Chicago, engine.240 + 241 + 242 + **engine.187 parts 1–4c** `e1ef6465`, version 91, read back @91; pull-back 169/169 js byte-identical, 0 test files; 19 files vs @101 — [[DEPLOY_HISTORY]] §PROD @102). The shock flag clears on the bench for the first time (C108 `shock-resolved` → C109–C111 `none`); the fire response now carries `ENGINE187_DIAG` naming which gate fired and every number it read. Before that PROD **@101** (2026-09-19, engine.235/237/239abc `a1f973a3`, version 90 — [[DEPLOY_HISTORY]] §PROD @101). Before that PROD **@100** (2026-09-19, moment triggers `b58d8a2b`, version 89 — [[DEPLOY_HISTORY]] §PROD @100). Before that PROD **@99** (2026-09-19, setup-menu audit `9bd306c7`, version 88, off-cycle file only — see [[DEPLOY_HISTORY]] §PROD @99). Before that PROD **@98** (2026-09-18 ~23:40 Chicago, engine.202 LIVE — `WeekRecord` header written to `Oakland_Sports_Feed!U1` the same session; dead VideoGame columns deleted 2026-09-19, so it is column S now) = engine tree `b2607ebe`; Apps Script version 87, read back @87; pull-back 169 js byte-identical, 0 test files. Expectations in [[DEPLOY_HISTORY]] §PROD @98. Previous: PROD **@97** (2026-09-18 ~23:05 Chicago, engine.210 + engine.202 inert) = repo commit `7dffdf76`; isolated `git archive` stage + Apps Script version 86, read back @86; pull-back 170 files, 169 js byte-identical, 0 test files. Five engine files vs @96 (godWorldEngine2, applySeasonWeights, applySportsSeason, casinoLedgerEngine, NEW utilities/sportsWeekRecord). Expectations in [[DEPLOY_HISTORY]] §PROD @97. Previous: PROD **@96** (2026-09-15 ~19:45 Chicago, engine.192 + 232b) = repo commit `0a8013fc`; isolated `git archive` stage + Apps Script version 85, read back @85; pull-back 169 files, 168 js byte-identical, 0 test files. Seven engine files vs @95 (updateNeighborhoodDemographics, ensureNeighborhoodDemographics, applyInitiativeImplementationEffects, engine94SheetContract, godWorldEngine2, educationCareerEngine, storyHook). Live self-arms 4 `school*` World_Config keys at its next fire. Expectations in [[DEPLOY_HISTORY]] §PROD @96. Previous: PROD **@95** (2026-09-15 ~18:50 Chicago, engine.190 + 233) = repo commit `eb289123`; isolated `git archive` stage + Apps Script version 84, read back @84; pull-back 169 files, 168 js byte-identical, 0 test files. Three engine files vs @94 (applyBusinessDynamics, runConductEngine, storyHook). Expectations in [[DEPLOY_HISTORY]] §PROD @95. Previous: PROD **@94** (2026-09-15 ~18:20 Chicago, engine.232) = repo commit `fbb4af97`; pushed from an isolated `git archive` stage + Apps Script version 83 + `clasp deploy -i … -d`, read back @83; pull-back 169 files, 168 js byte-identical, 0 test files. Three files changed vs @93 (storyHook, rosterLookup, buildDeskPackets [Node, not shipped]). Expectations in [[DEPLOY_HISTORY]] §PROD @94. Previous: PROD **@93** (2026-09-15 ~17:45 Chicago, engine.231) = repo commit `ea3fda33` (docs at `0354c5f7`); pushed from an isolated `git archive` stage + Apps Script version 82 + `clasp deploy -i … -d`, read back @82; pull-back 169 files, 168 js byte-identical, 0 test files. Ten engine files changed vs @92 (storyHook, storylineWeaving, rosterLookup, seven Phase-5 producers — domain at the source). Expectations for the next live fire in [[DEPLOY_HISTORY]] §PROD @93. Previous: PROD **@92** (2026-09-15 ~15:12 Chicago, engine.229 + 230) = repo commit `47063de6`; pushed from an isolated `git archive` stage (fresh mktemp dir) + Apps Script version 81 + `clasp deploy -i … -d`, read back @81; pull-back 169 files, 168 js byte-identical, 0 test files, no overlays. Two engine files changed vs @91: economicRippleEngine (weather disasters), processAdvancementIntake (batched writes). Expectations for the next live fire in [[DEPLOY_HISTORY]] §PROD @92. Previous pointers: @91 `8ea1624b` (225+226+228b), @90 `706b36da`.

**Recent PROD bumps** (last 5 — older → [[DEPLOY_HISTORY]] §PROD deploy log):

| PROD | Date | Wave | Plan |
|---|---|---|---|
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
4. **Fire:** GET `https://script.google.com/macros/s/<deploymentId>/exec?token=<CYCLE_TRIGGER_TOKEN>&expect=<cycleCount now on the bench sheet>` (engine.275: `expect` is mandatory; a repeated call is refused because the counter has moved). Returns `{ok, ranMs, diag…}` JSON. **WARNING: any valid-token GET fires a FULL cycle — no ping mode.** Ask Mike for the Apps Script execution log when the JSON isn't enough.
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
