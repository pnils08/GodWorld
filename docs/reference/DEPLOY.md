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
- Bound Apps Script ID `1BPdOpFkGSzNpRL-m5BANCdKOegMobp2g00Owf3qJbIPDuZJfaQCNEQyW`
- Web-app deployment `AKfycbzdYHHwdrFBtrW0l38np_EGg6C1feMWCs1vXAE0O8xVdNbAvh54v4G7VYMgmKWSpkBQ` @1 (created 2026-08-27 via temp-dir route). **WARNING: any valid-token GET fires a FULL cycle — no ping mode.**
- Code current at exact main `799fd841`. Pushed via temp-dir route with the S316 ID grep-guard; pull-back matched all 7 payload files byte-for-byte, 0 test files, 172 files pulled.
- Bench baseline verified by service account at standup: `cycleCount` 104, `Neighborhood_Map` latest C104 / 22 rows / `SportsSeason` = `off-season` ×22, `Oakland_Sports_Feed` 206 rows through C104. Mirrors live — this is the pre-engine.131 "before" state the wave proves against.
- **BLOCKED at first fire 2026-08-27: HTTP 403 "You need access."** The manifest is `executeAs: USER_DEPLOYING` and a brand-new script copy has never had its OAuth scopes granted; `clasp deploy` creates the deployment but cannot grant consent. Unblocking is a Mike action — open the bound script once, run any function, accept the authorization prompt. **Add this as step 3b to the standup protocol below** — it is not currently in it, and it is the second protocol gap found at a first fire (cf. the S319 `SIM_SSID` omission).
- Script Properties `SIM_SSID` (self-aimed at the copy) + `CYCLE_TRIGGER_TOKEN`: set by Mike 2026-08-27, verified by a fire that reached engine code.
- **First fire after authorize returned the cold-start FATAL** — `carry-forward memory missing for cycle 105 … The world must not run without yesterday`. Correct, designed behavior on a fresh bench (PropertiesService does not copy). Needs `CARRY_FORWARD_COLD_START_OK=1` to proceed.
- **Proving fires 2026-08-27:** C105 (cold start, control — no feed row, correctly `off-season`) and C106 (seeded A's `late-season` feed row -> `SportsSeason` late-season x22, 0 `Engine_Errors`, 5 sports `Ripple_Ledger` rows). Both HTTP 200, all phases ok.
- **Bench carries one bench-only test row** on `Oakland_Sports_Feed` (`Cycle=106`, Notes `BENCH TEST ROW (engine.131 proving, sandbox 0827) — not canon`). Test data — **never replay to live.**
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
