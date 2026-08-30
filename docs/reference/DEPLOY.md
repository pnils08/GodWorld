# Deploy to Apps Script

**Deploys are the engine-sheet terminal's function (S282).** The full checklist (pre-flight,
verification, bookkeeping) lives in `.claude/skills/deploy/SKILL.md` — this file is the
minimal manual procedure.

**Deploy gate (S282):** `clasp push` is blocked unless `CLAUDE_CTL=1` is set — an opt-in
speed bump so other agents can't deploy to the live engine (same pattern as the S274 git
control-plane gate). `npm install` re-arms the gate automatically via `postinstall`.

## From this repo (usual path)

```bash
cd /root/GodWorld
CLAUDE_CTL=1 npx clasp push
```

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

## Sandbox (vetting environment — Mike-direct 2026-07-06)

**All upgrades are vetted on the sandbox before a new live cycle runs.** If something
accidentally deploys to live, Mike can cycle live back via its version history — but the
sandbox is the intended target for anything unverified.

**Bench proof IS the gate (Mike-direct S328):** nothing is gated on a live run — the synced
bench is the same state as live, so the bench fire + sheet verify is the smoke. Live runs
clear whenever Mike fires them; they confirm, they don't gate.

**CURRENT: `SANDBOX 0827` (stood up 2026-08-27, Mike-made copy).** Clean copy of live at C104 — the proving bench for the engine.131 wave and the engine.126/128/129 backlog that shipped live with it.
- Spreadsheet ID `14-dUy_Uz_B90bKidZeBL-WHzhJ828kTpf24Lebu9GXA`
- **Bench-side sheet writes to REPLAY at the engine.135 live deploy (log every one here):** (1) 2026-08-29 `Neighborhood_Map` — six appended cols `IncomeTier, BoomExposure, BoomIndex, EmployerCharacter, WealthMin, WealthMax` + `MedianIncome` re-based, 22 rows (scratchpad `hoodProfile.js --apply`, table in the employment-cascade plan §B1; grid resized 24→30). (2) 2026-08-29 `World_Config` B24–B26: `employmentFallbackRate` 0.91→0.96, `employmentFloor` 0.80→0.88, `employmentAttractor` 0.90→0.96; `World_Population!D2 employmentRate` ← hood-lived aggregate **computed at write time** (bench: 0.9109→0.9344; live will differ — recompute, never paste) (scratchpad `phaseA.js --apply`). The four engine.135 physics keys (`employmentAttractorPull`, `employmentHoodWeightMin/Max`, `employmentConvergenceRate`) self-arm via `ensureEngine135Config_` on first fire — no replay. (3) 2026-08-29 S398 `Neighborhood_Demographics` — **East Oakland row appended** (B3; ND was 21 hoods vs Neighborhood_Map 22, and the loaded-set rule skips a hood with no row). Values are **recomputed from the target sheet at write time, never pasted**: Students = mean(San Antonio, Fruitvale) × 1.2 (NEIGHBORHOOD_PROFILES studentMod), Adults/Seniors = peer mean, Unemployed = Adults × (1 − WP.employmentRate), Sick = pop × WP.illnessRate, LastUpdated = WP.cycle, the five school cols = peer mean. Bench result C130: 795/2500/523/156/136. NOT via `seedNeighborhoodDemographicsFromLedger_` — that path counts ledger rows (would land ~46 people against peers at ~2,500 adults). Replay on live with the same formula (live peers ≈ 335/1315/262 at C104).
- Bound Apps Script ID `1BPdOpFkGSzNpRL-m5BANCdKOegMobp2g00Owf3qJbIPDuZJfaQCNEQyW`
- Web-app deployment `AKfycbzdYHHwdrFBtrW0l38np_EGg6C1feMWCs1vXAE0O8xVdNbAvh54v4G7VYMgmKWSpkBQ` @1 (created 2026-08-27 via temp-dir route). **WARNING: any valid-token GET fires a FULL cycle — no ping mode.**
- Code current at exact main `799fd841`. Pushed via temp-dir route with the S316 ID grep-guard; pull-back matched all 7 payload files byte-for-byte, 0 test files, 172 files pulled.
- Bench baseline verified by service account at standup: `cycleCount` 104, `Neighborhood_Map` latest C104 / 22 rows / `SportsSeason` = `off-season` ×22, `Oakland_Sports_Feed` 206 rows through C104. Mirrors live — this is the pre-engine.131 "before" state the wave proves against.
- **BLOCKED at first fire 2026-08-27: HTTP 403 "You need access."** The manifest is `executeAs: USER_DEPLOYING` and a brand-new script copy has never had its OAuth scopes granted; `clasp deploy` creates the deployment but cannot grant consent. Unblocking is a Mike action — open the bound script once, run any function, accept the authorization prompt. **Add this as step 3b to the standup protocol below** — it is not currently in it, and it is the second protocol gap found at a first fire (cf. the S319 `SIM_SSID` omission).
- Script Properties `SIM_SSID` (self-aimed at the copy) + `CYCLE_TRIGGER_TOKEN`: set by Mike 2026-08-27, verified by a fire that reached engine code.
- **First fire after authorize returned the cold-start FATAL** — `carry-forward memory missing for cycle 105 … The world must not run without yesterday`. Correct, designed behavior on a fresh bench (PropertiesService does not copy). Needs `CARRY_FORWARD_COLD_START_OK=1` to proceed.
- **Proving fires 2026-08-27:** C105 (cold start, control — no feed row, correctly `off-season`) and C106 (seeded A's `late-season` feed row -> `SportsSeason` late-season x22, 0 `Engine_Errors`, 5 sports `Ripple_Ledger` rows). Both HTTP 200, all phases ok.
- **Bench carries one bench-only test row** on `Oakland_Sports_Feed` (`Cycle=106`, Notes `BENCH TEST ROW (engine.131 proving, sandbox 0827) — not canon`). Test data — **never replay to live.**
- **engine.132 proving 2026-08-29 — deployment @4, code = `799fd841` + the engine.132 diff only** (`git diff 95da9e52 95a7359a` on the two files, applied over `git archive 799fd841`, so the HELD engine.131 T7 / civic-override code is NOT on the bench). Fires C108, C109, C110: HTTP 200, 130 phases ok, 0 new `Engine_Errors` (the 2 FATAL rows are the 08-27 cold start). C108–C109 proved gap-scaled convergence (every hood stepped ≈25% of its remaining gap, each step ≈0.75× the prior; small hoods scale the same). C110 proved the relief wire: Temescal +10 vs size-peer Downtown +26 with the health center delivering. **Second bench-only data write:** `Initiative_Tracker!Y5` (INIT-005 Temescal Community Health Center) `ImplementationPhase` set `construction-active → operational` for the C110 proof — **never replay to live**; live's row stays `construction-active` until the civic chain advances it. Bench sick levels now sit at ~8% of hood population (the engine's own `illnessRate` target), up from the flat ~104 residue — live will show the same climb over ~5 cycles once engine.132 ships.
- **engine.133 proving 2026-08-29 — deployment @5, code = `799fd841` + engine.132 delta + engine.133 (`01a1549e`: engine94SheetContract, godWorldEngine2, loadNeighborhoodState, applyDemographicDrift, updateNeighborhoodDemographics, applyStorySeeds).** HELD engine.131 T7 files stay at base (verified per-file before push). **Third bench-only data write (22 cells, never replay as-is):** `Neighborhood_Demographics!F2:F22` Sick reset to LIVE C104's flat residue (bench hoods had climbed to ~7.8% under engine.132's flat target) and `World_Population!C2` `illnessRate` 0.1063 → **0.0518** = the hood-lived aggregate. That second cell IS the live deploy's one data write (a diff-restore of the ratchet number, so the hoods don't chase a city rate nobody lived — Mike's pushback 2026-08-29, plan changelog) and needs Mike's go at the live gate; the ND reset is bench-only. C111: HTTP 200 / 155s / 0 new `Engine_Errors`; `ensureEngine133Config_` self-armed all 5 keys; WP 0.0518 → 0.0501 (attractor step 0.0020, predicted); hoods converging toward uneven targets (Chinatown 5.3% top, Baylight 1.6% bottom), 0 ≥ 6%. Bench hood pops run ~20% above live (its own C105–C110 migration), so rates land lower than the live forecast — mechanism identical.
  **C112–C119 (8 groundhog fires, all HTTP 200 / 128–151s / 0 new errors):** WP 0.0487 → 0.0472 → 0.0456 → 0.0443 → 0.0432 → 0.0420 → 0.0413 → **0.0405** — 68% of the gap to baseline closed in 9 cycles, 1−0.88⁹ = 0.68 to the decimal; no cycle moved up (no salient weather fired: Cycle_Weather C111–C119 = mild/clear/breeze/wind/overcast). Hood aggregate tracked just under the envelope every cycle (band −0.68 → −0.16pp); spread settled 3.3 → 2.5 (small hoods still climbing off the reset); Chinatown crossed the 6% watch bar at C114 and held 6.1–6.2% (top on age × density × income), Baylight/Uptown/Lake Merritt bottom. `cascadeAudit` against the bench: `sick-rate-band` PASS, `sick-rate-spread` PASS (2.56), `sample-support` PASS. [Health] milestones C111+: 21, spread across hoods. **Not exercised on the bench:** a salient weather bump (criterion 4 — the weather engine's dice rolled none in 9 fires; unit-proven A3) and an 8% crossing (criterion 5 — Chinatown topped at 6.2%; seed unit-proven block C, priority 2/3 both). **Deployment @6** = @5 + a text-only phrasing polish in the HEALTH seed (single-hood case). C120 confirm: HTTP 200 / 143s / 0 new errors, WP 0.0405 → 0.0396, band −0.15pp, spread 2.55, Chinatown 6.0% top — and **Temescal 2.4%, bottom three**: the engine.132 relief wire (health center operational on this bench) pulling its hood under its structural share inside the envelope, exactly the D3 relief-after-normalization shape. **Criterion-5 closer, C121–C126 (fourth bench-only write, reverted):** `World_Config!illnessSupportThreshold` 0.08 → **0.055** so Chinatown's 5.7–6.0% counts as a crossing; 5 fires (one `ok:false` "Service Spreadsheets failed" Google transient at 11s — no cycle consumed; the rest 130–181s, 0 new errors); key reverted to 0.08 and read back. Result: **8 of the 10 `[Health]` LifeHistory events in C122–C125 belong to Chinatown citizens** (resolved by POPID against the ledger — milestone rows leave the log's Name/Neighborhood blank by standing directive, so never count by the log's hood column), ≈2/cycle against 69 active × (0.057/3) ≈ 1.3/cycle expected; severities shifted up ("serious medical condition", "emergency medical care", "placed under care after a worrying diagnosis"). The epidemic floor → citizen dose → milestone path is bench-proven; the in-engine seed reads those same `S.generationalEvents` objects (name + hood intact in memory) and is proven in test block C. Bench left at **C126, @6**, all keys at plan defaults.
- **engine.122's mirror PROVED on the C105 fire** — `Carry_Forward_Store` went 0 -> 3 rows (`PREV_EVENING_JSON` 977b, `PREV_CYCLE_STATE_JSON` 5784b, `CHAOS_NBHD_FOLD_JSON` 223b). First execution in its life. Live's own tab stays empty until live's next cycle.
- **FINDING (2026-08-27) — engine.122's Layer-2 carry-forward mirror is UNPROVEN on live.** The bench's `Carry_Forward_Store` copied over with headers and **zero rows**, which means live's tab is empty too (verified directly against the production sheet ID: 0 rows). Not a defect: `mirrorCarryForwardToSheet_` is wired at `finalizeCycleState.js:374`/`:417` and `chaosCarsEngine.js:475`, but engine.122 landed `d1ce6936` at 2026-08-19 22:54 and live's `lastRun` is 8/19/2026 — the cycle fired *before* the mirror existed, and no live cycle has run since. So the mirror has never executed once.
  Consequence worth holding: **live carry-forward currently survives in script properties only.** The sheet-layer recovery path that `loadCarryForwardBlob_` advertises, and that the FATAL gate tells operators to lean on, has nothing in it to recover from. The next live cycle is its first exercise. Note that `mirrorCarryForwardToSheet_` try/catches and only `Logger.log`s on failure, so a broken mirror would fail **silently** — the bench fire is the cheapest place to confirm rows actually appear.

**RETIRED: `SANDBOX 0814` (stood up S370, 2026-08-14 → superseded 2026-08-27).** Drifted a cycle past live (`cycleCount` 105 vs live 104) and carries bench-only state (`Hospital_Ledger`, an `Undocked_Feed` test row). Still reachable by service account if history is needed. Copy of live at post-C103 state (Mike-made copy per §Standing up a NEW sandbox). This is the bench for engine-wave vetting under the Groundhog model.
- Spreadsheet ID `1j1Xj6dcpxMImqz079w7bEf4N58R-ct_lOmVO2imEmsQ`
- Bound Apps Script ID: `1WlAG5UUK5SOwlie7PnQHGXkidm-4Yhm_yKS_E5b_HYp3N9vngoaybiBM`
- Code current at exact main `f350f97c` (S378 deploy wave — infrastructure.6 ghost-tabs + civic.22 `createInitiative_` + research.27 2.3/2.4). Pushed via temp-dir route, pull-back matched 171/171 byte-for-byte, 0 test files. *(Prior: `1348e685`, 172 files, before `continuityNotesParser.js` was deleted.)*
- Web-app deployment `AKfycbwMojhZb2Y1hopBVqii2FDBB-C7JAqauKc_PXxaX9IHcOUdmSXKZE5juiwx0NRBhBfw` @6. **WARNING: any valid-token GET fires a FULL cycle — no ping mode.**
- **Bench sheet state: synced from live at S378 (cycleCount reset 111 → 103), then fired C104.** Carries one bench-only test row on `Undocked_Feed` (`TargetCycle=104`, POP-00962, EpisodeId `undocked-bench-s378-c104`) seeded to exercise the feed path — test data, NOT a live replay candidate. Live's own `Undocked_Feed` row targets C103.
- **The bench is NOT a perfect live proxy — `Hospital_Ledger` is bench-only** (verified S378: absent on live, present on bench, reported by the sync as bench-only/untouched). Any wave touching hospital code (engine.102 lineage) would prove against a tab live does not have. Pre-existing, unrelated to any one deploy — check before trusting a hospital bench result.
- **Feed timing, proven empirically S378: `loadUndockedFeed_` matches `TargetCycle` against `cycleCount + 1`**, i.e. the cycle the next fire will PRODUCE, not the current stored value. Bench at cycleCount 103 fired C104 and matched the `TargetCycle=104` row while filtering out `103`. A feed row authored for the cycle that just ran is therefore permanently orphaned, and the failure is SILENT (`Phase2-UndockedFeed` returns ok:true with zero entries, indistinguishable from "no show aired"). Author feed rows one cycle AHEAD.
- Service-account read verified from Node (941 ledger rows, `GODWORLD_SHEET_ID` override — env default points at PROD).
- Script Properties (`SIM_SSID` = sandbox sheet ID, `CYCLE_TRIGGER_TOKEN` = shared env-file value): Mike sets per protocol step 3 — first fire proves them.
- First fire is a COLD START (PropertiesService doesn't copy) — carry-dependent channels prove from the second fire on.

**RETIRED: `SANDBOX 0720` (S328 2026-07-20 → gone 2026-08-11).** Was: copy of live at post-C102 canonical state (prod code engine.57-.71 incl. weather/transit/crisis coupling; C102 fired live by Mike, verify PASS). Purpose: vet the next engine wave (Row 24 career-unfreeze prod window, engine.72 triage fixes) before live carries it. Sheet name `SANDBOX_0720_Simulation_Narrative` (71 tabs).
- Spreadsheet ID `1SHlquj9iLCK129SQEcXcvFCNkuGMgwLItDPj_ERiofI`
- Bound Apps Script ID: `1ntl6YwpLt-KwIX7HWCU-swMk-cGQ8aZR0aKNh5qUjz93m4OPUVhIB5nV`
- Code current at exact main `d3b70f3c` (2026-08-09 Codex engine.94 code-only deployment safety correction; temp-dir route, sandbox target verified and production target untouched). Remote pull-back matched all 172 deployed files byte-for-byte with zero test files. Service-account read access verified from Node.
- SIM_SSID Script Property set (Mike, S328).
- Web-app deployment `AKfycbztm3ZXPO-V43KICxyFGJKS63jkZQJqATBotcuynuL9yl4lty3kaaO1YpYW4WUIMStq` @41 (2026-08-09: exact main `d3b70f3c`; engine.94 code now self-arms all 14 config rows and 3 headers before world-state mutation. Pull-back matched 172/172 with zero tests; C116 returned `ok:true`, 128 phases, zero engine errors, config 14/14 and headers 3/3 retained). CYCLE_TRIGGER_TOKEN set (Mike, S328 — 0717/0716c lineage value; properties don't copy with the sheet). Token value lives in the shared godworld env file (`CYCLE_TRIGGER_TOKEN`, added S363) — any authorized lane loads it from there; kimi/codex proving-loop rights per AGENTS.md §Deployment carve-out.
- Staging dir `sandbox-0720` (recreated per-session in scratchpad via `git archive HEAD`).
- S328 proving fires C103–C105 (Row 24 release 25→17→13 promotions, crisis detection C104, faith-join, 0 errors ×3).
- 2026-08-09 (research-build S363) proving fire C117 @42 — engine.103 WealthLevel v15 bench confirm, token-fired: ok:true 160s; post-fire WL vs band(NetWorth) deviation 952 exact / 4 at +1 / 0 beyond (old formula would scatter ±6). All 11 tiers populated. Live-sheet WL column already direct-written to v15 bands same session (707 cells, read-back verified).
- 2026-08-09 (kimi) proving fires C114–C115 — engine.102 Task 7 (W4 hospital) criterion-5 bench proof, token-fired per the §Groundhog carve-out, 128 phases ok:true ×2. C115: two new admissions with populated epidemic-aware Causes (POP-00662, POP-00990), six lifecycle bed closures (3 recovered / 3 deceased), no ghost reconciles needed (ledger clean), WP illness 0.1109→0.111 with talk-back correctly inactive (load 4 ≪ capacity 100 — binding math proven by `scripts/hospitalTalkback.test.js` 24/24). Grief config validated live in-code (validator passed, keys present). C114 also served as Codex's pending approval-ceiling smoke; independent post-hoc assertions are recorded below.
- 2026-08-09 (codex) engine.94 approval-ceiling read-back after the shared fires — C115 retained config 8/8 and contiguous state columns 3/3; all four elected offices at approval ≥80 persisted streak 2, all six below threshold remained at 0, no auto/manual scandal fired before the third qualifying Cycle, and `Engine_Errors` was zero for both C114 and C115.
- 2026-08-09 (codex) engine.94 code-only safety correction — exact main `d3b70f3c` deployed @41 and token-fired C116. The self-arm was idempotent on the prepared bench; all four qualifying offices reached streak 3, the seeded 5% rolls missed, no premature scandal appeared, one naturally active grief register carried one machine source, and C116 logged zero engine errors. Fresh-Sheet creation/conflict behavior is covered by the 24/24 offline first-live-Cycle harness; production remained untouched.

### LIVE — engine.132 + engine.133 DEPLOYED 2026-08-29 22:45 (S397 engine-sheet)

Steps 1–2 executed: staged `799fd841` + the six engine.133 files at HEAD + the engine.132 delta (patch onto base verified byte-exact against an independent apply); repo `.clasp.json` copied last, prod script ID present, sandbox ID absent, `**/*.test.js` ignored; `clasp push -f` → **prod deployment @7** (`AKfycbwUvd4…`, description "engine.132+133"); pull-back 171 files / 0 tests, all 7 wave files byte-identical to the stage. Data cell: `World_Population!C2 illnessRate` **0.1023 → 0.0518** (Σ Sick 1805 / Σ pop 34879, computed live at write time, read-back 0.0518). HELD engine.131 T7 files remain at base. **Step 3 is Mike's fire — predictions below stand as written.** Then `node scripts/cascadeAudit.js`.

### LIVE checklist — engine.132 + engine.133 as one wave (rewritten 2026-08-29 15:10 — a live cycle runs 2026-08-30)

**Mike-direct 2026-08-29: the cycle runs tomorrow, and whoever deploys this does the sheet write too, so the cycle runs clean.** So the order is deploy → cell → cycle; the earlier "smoke under old code first" step is dropped (its only value was failure attribution for the engine.131 T1-T4 backlog, and a cycle under old illness code would just be one more ratchet step). Tomorrow's cycle is the first new-code fire AND the standing wave's smoke.

0. **Prod has NO `CYCLE_TRIGGER_TOKEN` script property** (probed 2026-08-29 15:01 — refused, no cycle ran). Live fires are Mike's (`runWorldCycle()` in the editor) unless he arms that property once.
1. **Stage = the bench-proven tree, not repo HEAD.** Prod was pulled read-only 2026-08-29 and matches `799fd841` on every engine file except the 7 this wave changes — so: `git archive 799fd841` + `git show HEAD:` for the six engine.133 files (`phase01-config/engine94SheetContract.js`, `phase01-config/godWorldEngine2.js`, `phase02-world-state/loadNeighborhoodState.js`, `phase03-population/applyDemographicDrift.js`, `phase03-population/updateNeighborhoodDemographics.js`, `phase07-evening-media/applyStorySeeds.js`) + `git diff 95da9e52 95a7359a -- phase02-world-state/applyInitiativeImplementationEffects.js | patch -p1` (the engine.132 delta only — the HELD engine.131 T7 files stay at base). Copy the repo-root `.clasp.json` in LAST; grep the prod script ID present and the sandbox ID `1BPdOpFkGS…` absent; `find -name '*.test.js'` ships 0 (`.claspignore`). `CLAUDE_CTL=1 npx clasp push -f` from the staging dir, then **bump the prod deployment** (`CLAUDE_CTL=1 npx clasp deploy --deploymentId <repo .clasp.json deploymentId> --description "engine.132+133"`). Pull-back byte-verify the 7 files.
2. **The one data cell — computed at write time, never replayed.** Live's hood layer IS the lived record; touch nothing on `Neighborhood_Demographics`. Dry-run, read the printed target ID (PROD default from `lib/env`), then `--apply` and read back:
   ```bash
   node -e "
   require('./lib/env'); const s=require('./lib/sheets'); const apply=process.argv.includes('--apply');
   (async()=>{ console.log('TARGET', process.env.GODWORLD_SHEET_ID, apply?'(APPLY)':'(dry)');
     const nd=await s.getSheetData('Neighborhood_Demographics'); const H=nd[0]; let P=0,SK=0;
     for(const r of nd.slice(1)){ const pop=+r[H.indexOf('Students')]+ +r[H.indexOf('Adults')]+ +r[H.indexOf('Seniors')]; if(!pop) continue; P+=pop; SK+=+r[H.indexOf('Sick')]; }
     const agg=Math.round(SK/P*10000)/10000; const wp=await s.getSheetData('World_Population'); const iI=wp[0].indexOf('illnessRate'); const col=String.fromCharCode(65+iI);
     console.log('World_Population!'+col+'2 illnessRate', wp[1][iI], '->', agg, '(Σ Sick '+SK+' / Σ pop '+P+')');
     if(apply){ await s.updateRange('World_Population!'+col+'2',[[agg]]); const b=await s.getSheetData('World_Population'); console.log('read-back', b[1][iI]); } })();" -- --apply
   ```
   Expected on 2026-08-30 before the cycle: 0.1023 → **0.0518** (live C104 aggregate; recompute, don't paste).
3. **The cycle (Mike fires).** Predict before: cycleCount 105; `ensureEngine133Config_` appends 5 `World_Config` rows (`illnessBaseline` 0.035, `illnessAttractorPull` 0.12, `illnessEventStrain` 0.015, `illnessHoodWeightMin` 0.5, `illnessHoodWeightMax` 2.0); WP ← 0.0518 × 0.88 + 0.035 × 0.12 ≈ **0.0498** + the day's calendar pushes (~+0.0003 winter); hoods start redistributing (Chinatown/Ivy Hill/Piedmont Ave up toward ~1.2–1.5× city, Baylight/Jack London/Temescal down), aggregate ~5.1%, inside the envelope; `Carry_Forward_Store` 0 → 3 rows (engine.122's first live exercise); 0 new `Engine_Errors`. Then `node scripts/cascadeAudit.js` (PROD default): `sick-rate-band` may read −3pp on this one cycle only; `sick-rate-spread` will still read flat (<1.3) for ~3–5 cycles — that is the convergence lag, not a defect.
4. **Second cycle, same discipline** — WP step ≈ 0.88 × gap; spread growing past 1.3 by ~C108; no hood near 8% (the bench topped at 6.2%).

Rollback: `git checkout 799fd841 -- <the 7 files>` in a staging dir, push, bump; the data cell needs no rollback.

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
4. **Fire:** GET `https://script.google.com/macros/s/<deploymentId>/exec?token=<CYCLE_TRIGGER_TOKEN>`. Returns `{ok, ranMs, diag…}` JSON. **WARNING: any valid-token GET fires a FULL cycle — no ping mode.** Ask Mike for the Apps Script execution log when the JSON isn't enough.
5. **Verify** against the sandbox sheet via service account (explicit sheet ID — env default points at PROD). Run as many groundhog cycles as the change needs; repeat 2–5 until clean.
6. **Deploy proven code to live** (repo-root `CLAUDE_CTL=1 npx clasp push`, /deploy pre-flight).
7. **Terminal syncs the bench from live** for the next build wave: `node scripts/syncSandboxFromLive.js <sandboxSheetId> --apply` (S328, Mike-approved — replaces the manual version-history revert, which lost any direct writes postdating the sandbox's copy snapshot; live is the complete truth since every sheet write replays there). Values-only, batched under API write quota, oversized Media_Briefing cells truncated (regenerated display artifacts), read-back verified on the 5 biggest tabs. Dry-run without `--apply`. Refuses to run against the live ID. Bench 0720 is the PERMANENT bench under this model — no more per-wave sandbox stand-ups.

**Sheet writes are a different animal (Mike-direct S328): anything not in CODE does not carry over.** A `clasp push` to live carries code only. Schema changes, new tabs, column adds, data migrations, backfills — anything written to the SANDBOX SHEET during proving — must be **replayed against the live sheet explicitly** (dry-run → apply → read-back verify, per protocol step 5). Track every bench-side sheet write during a wave and replay it at the live deploy, or live runs new code against old schema. Self-arming schema code (ensure*Schema_ patterns) re-arms itself on live's first fire and needs no replay — everything else does. **QUALIFIED 2026-08-15: only if the ensure fn actually has a cycle-path caller.** `ensureCrimeMetricsSchema_` does (`updateCrimeMetrics.js:122`); `ensureNeighborhoodDemographicsSchema_` does not, so nothing about it re-arms and its changes need an explicit replay like any other data migration. Verify the caller before relying on this sentence.

**PropertiesService is per-script (S328 finding):** prev-cycle state (PREV_EVENING_JSON etc.) does not copy with the sheet. A fresh bench's FIRST fire is a cold start — carry-dependent channels (hospital→crisis detection, streak-gated weather alerts, prevRate) only prove from the SECOND bench fire on. Don't read a quiet first fire as a failed channel.

**Cold starts must be declared (engine.122, 2026-08-19):** past cycle 1, `assertCarryForwardPresent_` ABORTS any fire that finds no carry-forward in script properties OR the `Carry_Forward_Store` tab — a missing memory is fatal, never a silent "first cycle" line (the C104 incident class). For a legitimate fresh-bench cold start, set script property `CARRY_FORWARD_COLD_START_OK=1` before the first fire; the override is consumed on use. (If the bench sheet was synced from live, the tab rides the sync and no override is needed.)

**RETIRED: `SANDBOX 0717` — GROUNDHOG BENCH (S322→S327; retired S328, superseded by post-C102 live copy).** Served the C102 groundhog era: engine.64/.64b proving (93 households, 0 errors), engine.70/71 + Row-24 proving fires C112–C117, bench closed at abs C117 @31. Live C102 (2026-07-20) is the canonical continuation; this bench's state predates it.
- Spreadsheet ID `1ZP9kiwjXngDNqOtnRby9jGxFZnSahpP3T9SLnJoTwS8`
- Bound Apps Script ID: `1e9xNz0f13kRjk0XP0lUNwAsAOnLYI-uaLJTkJN5L2O43Mqv1q6g3UckT`
- Web-app deployment `AKfycbzlOhkYsWwP7wbyNAkaiHZqzwktwJc3THRKUnG8AAQhaRXDjpVHp9_mxGFqbuWf-TLC` @31; SIM_SSID + CYCLE_TRIGGER_TOKEN set (token in sl-engine-sheet). **WARNING: any valid-token GET still fires a FULL cycle on this retired bench.**

**RETIRED: `SANDBOX 0716c` — CONTAMINATED, NEVER TOUCH (S322).** Its S321 "canon" C102+C103 are VOID — heritage/marriage contamination; live was restored to canon C101 (2026-07-17 12:30 backup) and the heritage/marriage code fully reverted (442d1ca8).
- Spreadsheet ID `1erYtwSm8s6TczRTiLFbUQ302viC_MmVULWScITKRues`
- Bound Apps Script ID: `12W_j60_flC3rr6KyiWrRiU8AcpRY-GDbvGmuNbD-NmR059NFnJTHCwOv`

**RETIRED: `SANDBOX 0716b` — CONTAMINATED, NEVER TOUCH (S322)** (S321 — served engine.59/.60/.61 proving fires C102-C119; retired with 0716c, same contamination class)
- Spreadsheet ID `1reNGLnvimH5vmMs2opPylA1QRpNDKwiVRiN8aYXeAVU`
  URL: https://docs.google.com/spreadsheets/d/1reNGLnvimH5vmMs2opPylA1QRpNDKwiVRiN8aYXeAVU/edit
- Bound Apps Script ID: `1iA6aG5bk_KOC3QeAu_9P8blRMG7lbrRrL0t3hVmyNwl4-TuJbSQrFjSa`
- **SIM_SSID Script Property = the Spreadsheet ID above — Mike must set this before the first fire (protocol step 3; the 0714 incident step)**

**RETIRED: `SANDBOX 0716`** (S320 — proved engine.58 across 2 cycles + kill-list fixes: 48/48 family HH incomes true, 0 minor salaries, EducationLevel stable, full-ledger education fill)
- Spreadsheet `13Ri5mujcno19KGp4yF19ojQ8-TIVeATRWrxcfBnJJPw` / script `1fS4u4UWbH-FArX0CjFyetB37fcwHRLVkGQy5g9Z7enf5XsdOLze-lT1T`

**RETIRED: `SANDBOX 0715`** (S320 — served engine.58 proving run C102/Y2C52 + Y3C1: 21 emergence ticks, Isaac Green lottery promotion end-to-end; superseded by post-S320-live copy)
- Spreadsheet `1HgJPjcS4t6a5CGSOgDuQoRr8tTTc1OQfGfSS1wuuxgA` / script `18cODsLhYWoRojEoqinlqXxntFFjjrCdW38ca8ZWmyhuVkhwRGqYGJ7Kn`

**RETIRED: `SANDBOX 0714`** (S319 — served C102-C104 engine.57 proving run; superseded by post-go-live copy)
- Spreadsheet `1wmZTGqIbYL7eVYCplq3iCb2oOGDZ0Inq-pWCtnD1lzc` / script `1h523JicgvHOXoD-lTBCZxFyxybYnvMApgJDqHIfVH6jLq2SKcpL6hIiX`

**RETIRED: `SANDBOX_0702`** (S318 — broken col-Q incident C134; do not deploy or write)
- Spreadsheet `1syShVWfudY0eCC9rnR7AWZ8-b-fs5RpJW2bhn6nZtzs` / script `1bT3o5r6adZhSv20pa0ijoHv_HdeEbONtBT2bsw_8U-sHbWgyJz94ueIW`

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
3c. **Mike (REQUIRED on a fresh bench, added 2026-08-27):** Script Properties →
   `CARRY_FORWARD_COLD_START_OK` = `1`. A new copy has no `PREV_EVENING_JSON` /
   `PREV_CYCLE_STATE_JSON` (PropertiesService does not copy) and the
   carry-forward gate correctly aborts the first fire — *"The world must not
   run without yesterday."* This is the third manual property a fresh bench
   needs, alongside `SIM_SSID` and `CYCLE_TRIGGER_TOKEN`.
   **Order matters: authorize (3b) BEFORE bumping the deployment**, or the
   deployment pins an unauthorized version and every GET 404s.
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

4. **Isolation is by construction** — verified S318: the engine contains zero
   `openById` calls; the bound script only ever touches its own container. No
   wrapper needed. (Node scripts are the only cross-container access and take
   explicit sheet IDs — never rely on env default when targeting a sandbox.)
5. **Terminal:** update THIS section (new IDs, retire the old ones), then clasp
   push via the temp-dir route below, then replay any pending data migrations
   against the new sheet ID (dry-run → apply → read-back verify).
6. Triggers do NOT copy — sandbox cycles are Mike-fired from the sheet, which is
   the intended mode.
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
- Cycle runs are Mike-fired from the sandbox sheet; SANDBOX 0714 starts at C102.
