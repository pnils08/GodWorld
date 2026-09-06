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

**This file is protocol + CURRENT pointers only.** Per-wave proving narrative and bench-write logs go to the wave's own plan doc (builder rule 2026-08-30) or to [[DEPLOY_HISTORY]] — a session that finds itself writing a paragraph here is writing in the wrong file.

**Bench:** `SANDBOX 0831` (stood up 2026-08-31) — copy of live post-C105. **RE-SYNCED FROM LIVE AT C105 2026-09-05 ~21:40 (S428, 79/79 tabs, 47,399 rows, read-back OK on the 5 biggest tabs) — the builder deleted the three script-property blobs first, so the bench is a clean C105 with NO bench-only rows; first fire is a groundhog cold-start off `Carry_Forward_Store` (no override needed). **engine.90 bench seed (S428 ~02:05): World_Config `popIdHighWater` 1106 / `citizenArchiveEnabled` 0 / `citizenArchiveTabLive` 1 + empty `Citizen_Archive` (62 cols; 81 tabs now) via `scripts/ensureCitizenArchive.js` — bench-only until the builder's live go (`--sheet=<live> --seed=1083 --apply --live`).** Code at **@60** (S428, engine.119: @58 = Wave A `3b8b51b4` requireTab_ + hospital-ledger retry; @59 = Wave B `saveCarryForwardBlob_` ring + ghost guard; @60 = + `carryForward` diag-emit). **Proofs: C106 on @58 clean — ok:true 155s, 131 phases, cycleCount 106, 0 Engine_Errors, all three Carry_Forward_Store keys @106 through the retry path, one Hospital_Ledger admit via `appendRowWithRetry_`, Cycle_Weather 106.** C107 on @60 + the ghost re-fire (cycleCount rolled back 107→106 on the bench, expect `carryForward` recoveries in the fire JSON) are the Wave B proof — see the plan changelog. Bench-only since the S428 sync: the C106+ memory and rows; never replay.** Prior trail: re-synced from live at C105 2026-09-05 ~18:15 (S427, 79 tabs, read-back OK; carried the new live `Neighborhood_Map.Scenes` col AI); **C106 + C107 fired clean on @56 (P3 proof — 0 errors, 12 wave rows, 68 exact label-pool + 254 venue lines strict, ten-hood hits in 7 of 10; Scenes readers calendar-gated and not exercised — unit-proven + no-throw; trail in [[DEPLOY_HISTORY]]), C108 + C109 clean on @57 (door guard; the three late hoods draw — ten of ten), cycle C109; that sync's bench-only rows (24 wave rows POP-01085+, feeder rows and ticks, C106–C109 memory) are gone with the S428 re-sync.** Earlier trail: re-synced from live at C105 2026-09-05 ~12:40 (S423, 79 tabs, read-back OK) — builder reset the script properties; C106 + C107 fired clean on @51 (engine.148 P1 proof: 12 wave rows, 0 errors); C108 on @52 (P2 proof: 22 Crime_Metrics rows refreshed, 0 errors); C109 @53 / C110 @54 / C111 @55 (P1c proof: room women 61→69 while the wave ran; the 8 rows minted on C111 all stayed Active), cycle **C111**. Bench-only since this sync: 36 wave rows POP-01085+, ~24 feeder rows and their EmergenceCount ticks — never replay. Neighborhood_Map AF–AH were seeded here first and replayed to live the same hour — NOT bench-only.** Prior trail (before this sync): cycle **C114** — re-synced from live at C105 (S419); C106–C108 fired on the synced state (S419), C109–C110 (S423, engine.134 T4–8 + civic.18 4c/4d proof), C111–C112 (S423, engine.131 T7 + engine.134 T2–3 proof), C113 (fired on @48 by a deploy-ID typo, no change under test), C114 (S423, engine.99 #9 ChildAreas proof; the column was seeded here first and replayed to live the same hour, so it is NOT bench-only). **Bench-only data since the sync — never replay:** Intake rows 4–9 (two engine.109 test households, Bell + Okafor) and the citizens/households they minted (POP-01085–01088, POP-01090–01092, HH-0107-I001, HH-0108-I001); Intake columns `Relation` (J) and `Sex` (K) — live self-arms `Relation` at its next fire; `Chaos_Cars` row `EventId=synt1s423` (S423, synthetic Tier-1 `ConsequenceFloorFired=TRUE` hit at C110 for the engine.11 T5.3 reader proof — never replay); `Oakland_Sports_Feed` row C111 / Oaks / mid-season (S423, the T7 opening trigger — never replay) and everything it moved (INIT-006 `operational`, Baylight profile lift, the C112 Santana turnover). Spreadsheet `18BOJmzlO7EoaEhvUsUaqLIZvgrTC1yltUYk_Gz3I3W8` / Apps Script `1_3PDs7CSUsYvjjcXWtYGKjpPd7ekiIsUKKLSwlMtj3ioQKV0ew8TAfPh` / web-app deployment `AKfycbxbfP2Wu6haP4HXUGLk9T4wlW4ixWPsnfZJ51G5wVFTbkhESbT4teJG2xvRowP3BygIkw`. Script Properties `SIM_SSID` + `CYCLE_TRIGGER_TOKEN` set, authorized (protocol step 3b done). **`CARRY_FORWARD_COLD_START_OK` — do not set**: the bench's `Carry_Forward_Store` sheet already carries real C105 carry-forward, so this is not a cold start (see [[DEPLOY_HISTORY]] for the read-back that proved it). Full per-wave trail: [[DEPLOY_HISTORY]] §Current sandbox.

**Live:** PROD **@60** (2026-09-06 ~01:35, S428) = repo HEAD engine tree, byte-identical (pull-back 0 differing, 166 files, 0 tests). **@60 = engine.119 Phase-11 remainder (3 files: the last 8 lazy creates → `requireTab_`, replay-safe ghost guard; [[DEPLOY_HISTORY]] §PROD @60). @59 = engine.119 (28 files: `requireTab_` ×25 sites — the cycle never creates a tab; `persistHospitalLedger_` + carry-forward mirror under retry; cycle-stamped carry-forward blobs in a 3-slot `Carry_Forward_Store` ring with a self-ghost guard; `carryForward` diag in the fire JSON; bench @58 C106 + @60 C107 + simulated-crash re-fire all clean — trail in [[DEPLOY_HISTORY]] §PROD @59). Live sheet write this session: `Business_Archive` tab created with `BIZ_ARCHIVE_HEADERS` (80 tabs now). Fifteen deploys @46–@60 are unsmoked on live.** @58 = engine.148 P3 door guard (`processAdvancementIntake.js` folds an authored hood to the map, throws on an off-map name naming the row; bench @57 C108 clean) over @57. @57 = engine.148 Phase 3 (texture pools by `EmployerCharacter` label, `Scenes` column — seeded live FIRST, 22/22; bench @56 C106/C107 clean) over @56. @56 = engine.148 P1c (World_Config `gcPoolFloorFemale` 120 / `gcPoolFloorMale` 40 self-arm on the next fire; wave draws the under-represented sex first; one-cycle seasoning; bench @53–@55 C109–C111 clean) over @55. @55 = engine.148 Phase 2 (WeatherZone / Adjacent / AttentionWeight columns AF–AH seeded on live FIRST — the loader throws on a blank; crisis weight earned; gender table + dead transit map deleted; bench @52 C108 clean) over @54. @54 = engine.148 Phase 1 (migration wave + floor dials on World_Config, feeder weights from the rank order, surfacing floor draw; bench @51 C106/C107 clean) over @53. @53 = engine.99 Finding #9 child areas (`canonNeighborhoodLoader.js`, `commuteFlowEngine.js`, `checkForPromotions.js`, `economicRippleEngine.js`, `v3NeighborhoodWriter.js`) over @52; @52 = engine.131 T7 lit + engine.134 Tasks 2–3 over @51; @51 = engine.134 Tasks 4–8 + civic.18 4c/4d over @50; @50 = engine.109 the household door; @49 engine.141; @48 engine.142; @47 civic.32; @46 engine.162 + civic.30/31. **No HELD files — repo HEAD == live.** **Fifteen deploys @46–@60 are unsmoked on live** — all bench-proven on live-synced C105 state; the builder's next fire (C106) smokes them together. Live sheet writes this session, applied + read back: `Business_Ledger` BIZ-00101 Sector → Services; `Neighborhood_Map` ChildAreas column (header + 10 authored cells). **S427 live write (2026-09-05 ~18:10, replayed to the bench by the re-sync): `Neighborhood_Map` grid 34 → 35 cols, col AI `Scenes` header + 22 authored cells from `scripts/fixtures/hood-scenes.json`, read back 22/22 — inert until the P3 code deploys.** T7 is live; Baylight opens when an Oaks `mid-season` feed row lands after C104. Proofs: `docs/plans/2026-08-02-neighborhood-truth-source-migration.md` §Changelog 2026-09-05, `docs/plans/2026-08-27-sports-coupling-restore.md` §T7 shipped, `docs/plans/2026-08-30-hood-identity-remainder-plan.md` §Changelog (S423). Full deploy ledger back to @1: [[DEPLOY_HISTORY]] §PROD deploy log.

**Recent PROD bumps** (last 5 — older → [[DEPLOY_HISTORY]] §PROD deploy log):

| PROD | Date | Wave | Plan |
|---|---|---|---|
| @58 | 2026-09-05 | engine.148 P3 door guard — Intake folds/refuses an authored hood | [[../plans/2026-09-05-hood-blind-engines-plan]] |
| @57 | 2026-09-05 | engine.148 P3 texture by place label + `Scenes` column | [[../plans/2026-09-05-hood-blind-engines-plan]] |
| @53 | 2026-09-05 | engine.99 #9 child areas are ledger truth | [[../plans/2026-08-02-neighborhood-truth-source-migration]] |
| @52 | 2026-09-05 | engine.131 T7 lit (option 2) + engine.134 T2–3 | [[../plans/2026-08-27-sports-coupling-restore]] |
| @51 | 2026-09-05 | engine.134 T4–8 + civic.18 4c/4d | [[../plans/2026-08-30-hood-identity-remainder-plan]] |
| @50 | 2026-09-04 | engine.109 household door | [[../plans/2026-08-16-new-life-intake]] |
| @49 | 2026-09-04 | engine.141 tracker readers retired | [[../plans/2026-08-31-c105-chase-sessions]] |
| @48 | 2026-09-04 | engine.142 dead-file delete batch | [[../plans/2026-08-31-c105-chase-sessions]] |

**Retired / contaminated sandboxes — never target these IDs** (full trail per ID: [[DEPLOY_HISTORY]] §Retired sandboxes):

| Sandbox | Spreadsheet ID | Why retired |
|---|---|---|
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
4. **Fire:** GET `https://script.google.com/macros/s/<deploymentId>/exec?token=<CYCLE_TRIGGER_TOKEN>`. Returns `{ok, ranMs, diag…}` JSON. **WARNING: any valid-token GET fires a FULL cycle — no ping mode.** Ask Mike for the Apps Script execution log when the JSON isn't enough.
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

## Changelog

- 2026-09-04 (S418, research-build) — Restructured to protocol + current-state only, per Mike-direct ("deploy.md needs to be a MD that is clear and concise + a changelog that serves it"). Full per-wave proving narrative (was ~250 lines of stacked history) relocated verbatim to new [[DEPLOY_HISTORY]]; added a §Current state section (bench/live one-liners + a 5-row recent-bumps table) and a retired-sandbox ID table replacing the full retired-sandbox prose. 366 lines → ~185 lines.
