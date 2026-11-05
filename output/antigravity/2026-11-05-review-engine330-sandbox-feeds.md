# Adversarial Review — `docs/plans/2026-11-04-engine-330-sandbox-generic-feeds.md`

- **Date:** 2026-11-05
- **Lane:** agy (Antigravity)
- **Target:** `docs/plans/2026-11-04-engine-330-sandbox-generic-feeds.md` (`engine.330` — Sandbox generic feed rows)
- **Verdict:** **SHIP-WITH-FIXES**

---

## 1. Settling P1–P3 from the Code

### P1 — `syncSandboxFromLive.js` clear behavior removes any sandbox rows below live's last row (`docs/plans/2026-11-04-engine-330-sandbox-generic-feeds.md:70`)
- **Status:** **PROVEN TRUE** (with a baseline-ID caveat for Task 2; see Finding 6).
- **Evidence:**
  - `scripts/syncSandboxFromLive.js:116-120` calls `api.spreadsheets.values.batchClear({ spreadsheetId: DEST, requestBody: { ranges: liveTabs.map(quoted) } })` with whole-tab ranges (`'TabName'`), wiping every cell on every grid tab before `api.spreadsheets.values.batchUpdate` (`scripts/syncSandboxFromLive.js:127-133`) writes live's rows starting at `'TabName'!A1`.
  - Any `SANDBOX-GENERIC` rows appended below live's last row on `Edition_Coverage_Ratings`, `Citizen_Media_Usage`, `Advancement_Intake1`, or `Oakland_Sports_Feed` are completely cleared on resync.

### P2 — `SANDBOX-GENERIC` Reporter and `sandbox-generic_` Context prefix break no reader; check `Tone` use (`applyEditionCoverageEffects.js:95`) and intake `Notes` built from `Context` (`mediaRoomIntake.js:517`) (`docs/plans/2026-11-04-engine-330-sandbox-generic-feeds.md:71`)
- **Status:** **PARTIAL FAIL — 2 defects found** (see Findings 4 & 5):
  1. **`Tone` column (`phase02-world-state/applyEditionCoverageEffects.js:95` & `phase07-evening-media/applyStorySeeds.js:1311-1320`):**
     - `applyEditionCoverageEffects.js:95`: `tone: toneCol !== -1 ? (row[toneCol] || '').toString().trim().toLowerCase() : 'neutral'`.
     - Because `Edition_Coverage_Ratings` has a `Tone` column (`toneCol === 5`, written by `scripts/rateEditionCoverage.js:629`), `toneCol !== -1` is true. Omitting `Tone` in Task 3 (`docs/plans/2026-11-04-engine-330-sandbox-generic-feeds.md:44`) leaves `row[toneCol]` blank, yielding `entry.tone = ''` (not `'neutral'`).
     - In `applyEditionCoverageEffects.js:249-250`, blank `entry.tone` increments `S.editionCoverage.byTone['']`.
     - In `applyEditionCoverageEffects.js:268-277` and `phase07-evening-media/applyStorySeeds.js:1311-1320`, any seeded domain with `|rating| >= 3` pushes a trigger with `tone: ''` and `reporter: 'SANDBOX-GENERIC'`, producing `SeedText`: `"Citywide reaction: mixed coverage of <DOMAIN> last cycle (rating +3 across 1 article (SANDBOX-GENERIC lead))."`
  2. **Intake `Notes` built from `Context` (`phase07-evening-media/mediaRoomIntake.js:517, 575-591`):**
     - `routeCitizenUsageToIntake_` (`mediaRoomIntake.js:517`) passes `u.context` (`sandbox-generic_c<N-1>_<slug>`) to `describeUsageContext_` (`mediaRoomIntake.js:575-591`).
     - At `mediaRoomIntake.js:579-584`, `var m = c.match(/^([a-z][a-z-]*)_c(\d+)_/i);` matches `sandbox-generic_c<N-1>_<slug>` (`m[1] = 'sandbox-generic'`, `m[2] = '<N-1>'`), stripping `<slug>` and writing `Notes = "Media usage C<N> (<usageType>): a Bay Tribune sandbox-generic desk piece, C<N-1>"` into `Advancement_Intake1!J` (`mediaRoomIntake.js:517, 535`).
     - No reader chokes on this string, **but** uppercase `SANDBOX-GENERIC` never appears in `Citizen_Media_Usage` or in the routed `Advancement_Intake1` row unless `Citizen_Media_Usage.Reporter` is also set or Acceptance 5 (`docs/plans/2026-11-04-engine-330-sandbox-generic-feeds.md:63`) matches case-insensitively (`/sandbox-generic/i`).

### P3 — Which `SeasonType`s carry no games, and `NamesUsed` validation vs the engine's living-citizen check (`applyGameNightMoments.js:189`) (`docs/plans/2026-11-04-engine-330-sandbox-generic-feeds.md:72`)
- **Status:** **SETTLED — 3 mismatches with Task 5** (see Findings 1 & 3):
  1. **Which `SeasonType`s carry no games:**
     - `phase02-world-state/applySportsSeason.js:520-531` (`SPORTS_PHASE_DEPTH_`) and `:499-518` (`SPORTS_PHASE_ALIASES_`) assign `depth = 0` **only** to `'off-season'` (plus blank/unrecognized values, which `canonicalSportsPhase_` maps to `'off-season'` at `:533-543`). Every other canonical phase (`'spring-training': 1`, `'preseason': 1`, `'early-season': 2`, `'regular-season': 2`, `'mid-season': 3`, `'late-season': 4`, `'post-season': 5`, `'playoffs': 5`, `'championship': 6`) has `depth >= 1` (`utilities/sportsWeekRecord.js:207-210`).
     - However, `utilities/sportsWeekRecord.js:35-43` (`sportsWeekForEntry_`) enforces a hard `EventType` ↔ `WeekRecord` invariant:
       - `WeekRecord: 'none'` (`week.gamesPlayed === 0`) **requires** `EventType === 'season-state'` (`'none requires season-state'`, `:41`).
       - `WeekRecord: 'H:W A:L'` (`week.gamesPlayed > 0`) **requires** `EventType === 'game-result'` (`'games require game-result'`, `:39`).
  2. **`NamesUsed` validation vs `applyGameNightMoments.js:189`:**
     - `phase05-citizens/applyGameNightMoments.js:79-91` (`parseNamesUsed_`) strips parenthetical position tags (`s.replace(/\([^)]*\)/g, ' ')`, `:82`) before splitting and matching `First + ' ' + Last` on `Simulation_Ledger` (`:192-196`).
     - `applyGameNightMoments.js:189` checks `function living(r) { return !/^(deceased|dead)$/i.test(String(iStatus >= 0 ? rows[r][iStatus] || '' : '').trim()); }`.
     - If Task 5 checks raw `NamesUsed` tokens (e.g., `"Arturo Ramos (SP)"`) against `Simulation_Ledger` without stripping `(...)`, every position-tagged player will fail the ledger check and be stripped.

---

## 2. Findings (Tasks 2–5 & Feed Facts Table)

### Finding 1 — [HIGH] Task 5: Copying `EventType` / "other columns" from the team's last live row breaks `sportsWeekForEntry_`, re-fires `EventTrigger`, and overrides `Streak = L1`
- **Plan claim:** `docs/plans/2026-11-04-engine-330-sandbox-generic-feeds.md:46` — *"Task 5 — `Oakland_Sports_Feed` rule: one row per active team for `Cycle = N`... `SeasonType = the team's last live one`, `Team Record = the team's last live W-L + 1-1` (blank if `SeasonType` has no games), `Streak = L1`, `WeekRecord = H:W A:L` (`none` when `SeasonType` has no games), `NamesUsed` copied from the team's last live row and filtered to citizens who are alive on `Simulation_Ledger`, other columns copied from the team's last live row, `Notes = SANDBOX-GENERIC`."*
- **Code evidence:**
  1. **`EventType` ↔ `WeekRecord` throw:** `utilities/sportsWeekRecord.js:38-41` (`sportsWeekForEntry_`):
     ```js
     if (week.gamesPlayed > 0 && eventType !== 'game-result') {
       throw new Error('games require game-result (got ' + (entry.eventType || 'blank') + ')');
     }
     if (week.gamesPlayed === 0 && eventType !== 'season-state') {
       throw new Error('none requires season-state (got ' + (entry.eventType || 'blank') + ')');
     }
     ```
     `phase02-world-state/applySportsSeason.js:277, 295-306` catches that error, **deletes `entry.weekRecord`** (`delete entry.weekRecord;` at `:296`), and queues a `Phase2-SportsSeason:WeekRecord` error to `Engine_Errors`.
     - **Input → wrong output:** If a team's last live row had `EventType = 'roster-move'`, `'player-feature'`, `'injury'`, `'breaking-news'`, or `'season-state'` (or `'game-result'` when seeding an `'off-season'` row with `WeekRecord = 'none'`), copying `EventType` from the last live row causes `readOaklandFeedEntries_` to strip `entry.weekRecord` and log an `Engine_Errors` row, failing Acceptance 3 (`docs/plans/2026-11-04-engine-330-sandbox-generic-feeds.md:61`).
     - **Fix:** Set `EventType = 'game-result'` whenever `WeekRecord = 'H:W A:L'` and `EventType = 'season-state'` whenever `WeekRecord = 'none'` (`SeasonType === 'off-season'`).
  2. **Copying `EventTrigger` re-fires one-shot triggers:** `phase02-world-state/applySportsSeason.js:1014-1051` reads `entry.eventTrigger` (`col[7]`, `:250`) and pushes championship, playoff-clinch, elimination, walk-off, or injury triggers into `S.sportsEventTriggers`.
     - **Input → wrong output:** If a team's last live row carried `EventTrigger = 'championship'` or `'playoff-clinch'`, copying "other columns" verbatim re-fires that trigger on Cycle `N`.
     - **Fix:** Always set `EventTrigger = ''` (and `HomeGame = ''` or `'Y'`, `GameResult = ''`) on generic rows.
  3. **Copied `PlayerMood` overrides `Streak = 'L1'` in `gameNightBucket_`:** `phase05-citizens/applyGameNightMoments.js:64-72`:
     ```js
     if (wins || /confident|energized|high/.test(mood)) return 'win';
     if (/^L\d+/.test(streak) || /frustrated|tense|slump|low|eliminated/.test(mood)) return 'loss';
     ```
     And `phase05-citizens/runHouseholdEngine.js:412-421` (`sportsNightMood_` checks `frustrated|slump|losing|tense|eliminated|low` in `mood` before `electric|winning|confident|hot|energized|high` and `/^W\d+/i.test(streak)`). Meanwhile, `utilities/sportsWeekRecord.js:72-77` (`sportsWeeklyResult_`, called by `phase05-citizens/casinoLedgerEngine.js:154`) sets `franchiseWon: weekly.firstResult === 'W'`, so `WeekRecord = 'H:W A:L'` always settles casino bets as a **win** (`firstResult === 'W'`).
     - **Input → wrong output:** If the team's last live row had `PlayerMood = 'confident'` or `'energized'`, `gameNightBucket_` classifies the week as `'win'` even though Task 5 sets `Streak = 'L1'`.

---

### Finding 2 — [HIGH] Task 5: Live `Team Record` cells are Date-coerced by Google Sheets or blank on non-game rows
- **Plan claim:** `docs/plans/2026-11-04-engine-330-sandbox-generic-feeds.md:46` — *"`Team Record = the team's last live W-L + 1-1` (blank if `SeasonType` has no games)"*
- **Code evidence:**
  - `phase02-world-state/applySportsSeason.js:407-433` (`sportsRecordText_`): Google Sheets auto-coerces strings like `4-1`, `7-2`, `10-3` into `Date` serials (`month = wins`, `day = losses`).
  - `lib/sheets.js:49-59` (`getSheetData`) calls `spreadsheets.values.get` with the default `valueRenderOption: 'FORMATTED_STRING'`, which returns date-formatted strings such as `"4/1/2026"` (or `""` / `"-"` on non-game rows like `injury` or `roster-move`).
  - Furthermore, `phase02-world-state/applySportsSeason.js:1063-1105` (`reduceFeedTeamState_`) walks all rows for the team and only updates `state.record` when a row has a valid `/^\d+-\d+(?:-\d+)?$/` record (`:1084-1095`), carrying the last valid `W-L` forward across rows where `Team Record` is blank.
- **Input → wrong output:** If `scripts/seedSandboxFeeds.js` reads only the team's very last row or splits `Team Record` on `'-'` without handling blank non-game rows and Sheets `M/D/YYYY` date-formatted strings, `Team Record + 1-1` produces `NaN-NaN` or `"2026-NaN"`, causing `parseWinLoss_` (`applySportsSeason.js:435-445`) to return `null`.
- **Fix:** Walk backward across the team's live rows (matching `reduceFeedTeamState_`, `applySportsSeason.js:1063-1105`) to find the last valid `W-L` (parsing both `^\d+-\d+$` and Sheets date-coerced `^(\d{1,2})\/(\d{1,2})(?:\/\d{2,4})?$`), add `1` win and `1` loss, and prefix with `'10-3` or write via `RAW` if needed so Sheets does not re-coerce `1..12` wins into a date.

---

### Finding 3 — [HIGH] Task 5 / P3: Filtering `NamesUsed` against `Simulation_Ledger` without stripping position tags drops every player
- **Plan claim:** `docs/plans/2026-11-04-engine-330-sandbox-generic-feeds.md:46` — *"`NamesUsed` copied from the team's last live row and filtered to citizens who are alive on `Simulation_Ledger`"*
- **Code evidence:**
  - `phase05-citizens/applyGameNightMoments.js:79-91`:
    ```js
    function parseNamesUsed_(raw) {
      var s = String(raw || '').trim();
      if (!s) return [];
      s = s.replace(/\([^)]*\)/g, ' ');
      var parts = s.split(/[,|;\/]+|\.\s+(?=[A-Z])/);
      return parts.map(gameNightNameKey_).filter(Boolean);
    }
    ```
  - Live `Oakland_Sports_Feed` `NamesUsed` cells include parenthesized position tags (e.g., `"Arturo Ramos (SP), Mark Aitken (3B)"`) or period-separated clauses (`setupSportsFeedValidation.js:244`).
  - Also, if the team's very last live row was an `'injury'` or `'season-state'` row with an empty `NamesUsed` (or naming only a traded/injured player), copying only from the last row instead of the last row with non-empty living `NamesUsed` yields `NamesUsed = ''`.
- **Input → wrong output:** Checking raw comma-split tokens like `"Arturo Ramos (SP)"` against `Simulation_Ledger` `First + ' ' + Last` matches 0 citizens, resulting in `NamesUsed = ''` and 0 game-night `LifeHistory` lines, failing Acceptance 3 (`docs/plans/2026-11-04-engine-330-sandbox-generic-feeds.md:61`).
- **Fix:** Parse `NamesUsed` with the exact `parseNamesUsed_` / `gameNightNameKey_` logic from `phase05-citizens/applyGameNightMoments.js:79-91`, filter against `Simulation_Ledger` rows where `Status` is active/living (`!/^(deceased|dead|traded|inactive|retired)$/i`), and if the team's very last live row yields 0 living names during an active season, fall back to the team's most recent live row with at least one living citizen in `NamesUsed`.

---

### Finding 4 — [HIGH] Task 4: `Citizen_Media_Usage` has no skip/idempotency guard, can pick a `family-own-words` Cycle with 0 bylines, and can collide on `Context`
- **Plan claim:** `docs/plans/2026-11-04-engine-330-sandbox-generic-feeds.md:45` — *"Task 4 — `Citizen_Media_Usage` rule: copy the last live `Cycle`'s byline rows (`byline-landed`, `byline-published`) with `Cycle = N-1`, `Context = sandbox-generic_c<N-1>_<slug>`, `Processed = ''`, `Routed = ''`. Names must match one ledger citizen."* And `:32`: *"written once per fire (no Cycle gate)"*.
- **Code evidence:**
  1. **Missing idempotency / duplicate-row gate on re-run:**
     - `phase05-citizens/processAdvancementIntake.js:476` processes every row where `Processed !== 'Y'`.
     - `phase05-citizens/processAdvancementIntake.js:1364-1393` (`earnedCitationsByKey_`) counts **every** `'byline-published'` row in `Citizen_Media_Usage` across the entire tab regardless of `Processed` or `Cycle` (`if (ut === 'byline-published') slot.published++;` at `:1386`).
     - **Input → wrong output:** If `--apply` is run twice for the same `--cycle N` (the exact test in Acceptance 4, `docs/plans/2026-11-04-engine-330-sandbox-generic-feeds.md:62`), or if live already wrote `Cycle = N-1` byline rows before `syncSandboxFromLive.js` ran, Task 4 appends duplicate `Cycle = N-1` rows, doubling `UsageCount` increments (`processAdvancementIntake.js:585`), doubling `MEDIA_PUBLISHED_WORTH` (`2x`) in `earnedCitationsByKey_` (`:1386`), and routing duplicate rows into `Advancement_Intake1` (`phase07-evening-media/mediaRoomIntake.js:477`).
     - **Fix:** Skip seeding `Citizen_Media_Usage` for `Cycle = N-1` if `Citizen_Media_Usage` on the sandbox already contains `byline-landed` / `byline-published` rows for `Cycle = N-1` (and include `Citizen_Media_Usage` in Acceptance 4's idempotency check and Task 2's `--check` mode).
  2. **"Last live `Cycle`'s byline rows" lookup trap:**
     - `lib/citizenPage.js:127-135` appends `UsageType = 'family-own-words'` rows to `Citizen_Media_Usage` mid-week before the Saturday edition publishes.
     - **Input → wrong output:** If the seeder finds `max(Cycle)` across all rows of `Citizen_Media_Usage` first and then filters to `byline-landed` / `byline-published`, any newer `family-own-words` row causes the filter to return 0 rows.
     - **Fix:** Compute the latest live `Cycle` **among rows whose `UsageType` is `'byline-landed'` or `'byline-published'`** (excluding legacy `'byline'`, which `isEmergenceUsage_` ignores at `processAdvancementIntake.js:42, 274-276, 488-492`).
  3. **Multiple articles by the same reporter in the same live Cycle:**
     - `scripts/cron-desk-run.js:322-333` and `scripts/ingestPublishedEntities.js:1032-1047` write one row per article per reporter. If a reporter has two `byline-landed` rows in the source Cycle and `<slug>` is built only from `CitizenName`, both rows receive the identical `Context = sandbox-generic_c<N-1>_<slug>`. Include a row index or source-context suffix in `<slug>`.
  4. **Name normalization across the 3 readers:**
     - `processMediaUsage_` (`processAdvancementIntake.js:499-502, 554`) uses `normalizeCitizenName_` (stripping diacritics/punctuation) and **skips** any name with `ledgerHits.length > 1`.
     - `routeCitizenUsageToIntake_` (`phase07-evening-media/mediaRoomIntake.js:1113-1123`) uses `normalizeCitizenName_` and picks the **first** ledger hit.
     - `decayMediaAttention_` (`processAdvancementIntake.js:1523, 1568`) matches `Citizen_Media_Usage` names against `Simulation_Ledger` using raw `.trim().toLowerCase()` (without `normalizeCitizenName_`).
     - **Fix:** Enforce `ledgerHits.length === 1` under `normalizeCitizenName_` and write the ledger's exact canonical `First + ' ' + Last` into `CitizenName`.

---

### Finding 5 — [MEDIUM] Task 2, Task 3, Task 4 & Acceptance 5: `SANDBOX-GENERIC` marker inconsistency and blank `Tone`
- **Plan claims:**
  - `docs/plans/2026-11-04-engine-330-sandbox-generic-feeds.md:43`: *"every row carries `SANDBOX-GENERIC`"*
  - `docs/plans/2026-11-04-engine-330-sandbox-generic-feeds.md:44`: *"Task 3 — `Edition_Coverage_Ratings` rule: ... `Cycle = N-1`, `ArticleCount = 1`, `Reporter = SANDBOX-GENERIC`, `Processed = ''`"* (omits `Tone`, col F)
  - `docs/plans/2026-11-04-engine-330-sandbox-generic-feeds.md:45`: *"Task 4 — `Citizen_Media_Usage` rule: ... `Context = sandbox-generic_c<N-1>_<slug>`"* (omits `Reporter`, col E)
  - `docs/plans/2026-11-04-engine-330-sandbox-generic-feeds.md:63`: *"5. Running `syncSandboxFromLive.js` after a seeded run leaves no `SANDBOX-GENERIC` row on any of the four tabs."*
- **Code evidence:**
  - `Edition_Coverage_Ratings` has 7 columns (`Cycle, Domain, Rating, ArticleCount, Reporter, Tone, Processed`; `scripts/rateEditionCoverage.js:623-630`, `phase02-world-state/applyEditionCoverageEffects.js:56-62`). Leaving col F (`Tone`) blank sets `entry.tone = ''` (`applyEditionCoverageEffects.js:95`) and emits `"mixed coverage ... (SANDBOX-GENERIC lead)"` in `Story_Seed_Deck` (`phase07-evening-media/applyStorySeeds.js:1311-1318`).
  - `Citizen_Media_Usage` has 7 columns (`Cycle, CitizenName, UsageType, Context, Reporter, Processed, Routed`; `phase07-evening-media/mediaRoomIntake.js:440-446`). Task 4 writes lowercase `sandbox-generic_c<N-1>_<slug>` in `Context`, and `routeCitizenUsageToIntake_` (`mediaRoomIntake.js:517, 579-584`) rewrites that into lowercase `"Media usage C<N> (<usageType>): a Bay Tribune sandbox-generic desk piece, C<N-1>"` in `Advancement_Intake1!J`.
- **Input → wrong output:** A case-sensitive check for `SANDBOX-GENERIC` on `Citizen_Media_Usage` and `Advancement_Intake1` matches 0 rows even before `syncSandboxFromLive.js` runs, making Acceptance 5 vacuous for 2 of the 4 tabs.
- **Fix:** In Task 3, explicitly set `Tone = 'positive'` (`rating > 0`), `'negative'` (`rating < 0`), or `'neutral'` (`rating === 0`). In Task 4 / Acceptance 5, either set `Reporter = 'SANDBOX-GENERIC'` on `Citizen_Media_Usage` (`Reporter` is never read by any engine consumer of `Citizen_Media_Usage`) or specify case-insensitive `/sandbox-generic/i` across all four tabs.

---

### Finding 6 — [MEDIUM] Task 2: Live and Frozen-Baseline Write-Path Hazards (`lib/sheets.js` & multiple baseline IDs)
- **Plan claim:** `docs/plans/2026-11-04-engine-330-sandbox-generic-feeds.md:43, 81` — *"refuses the live ID and the frozen baseline copy; writes sandbox only"* / *"One process is fine if the script reads every live input into memory first, sets the target once, prints it with the sheet title, never sets it back, and refuses both the live ID and `1orX0qlIQloaM5gqCRJa3LHdkwajIufmcbCTHUWHda4E`."*
- **Code evidence:**
  1. **Second frozen baseline copy exists in the repo:**
     - `docs/reference/DEPLOY.md:61` lists `1orX0qlIQloaM5gqCRJa3LHdkwajIufmcbCTHUWHda4E` (`BASELINE-1004-C112`).
     - `output/engine-sheet/2026-10-19-reset-from-baseline-c112.js:6` uses a **different** frozen baseline spreadsheet ID: `1Mbz-sE13iu1RU4qo-rzsczjjPRKAU-KSfnQnrJNXCgA` (`BASELINE-1004-C112b`).
     - `docs/reference/DEPLOY.md:106-119` lists 12 retired/contaminated sandbox IDs.
     - **Input → wrong output:** Refusing only `LIVE_ID` and `1orX0qlIQloaM5gqCRJa3LHdkwajIufmcbCTHUWHda4E` still allows `--sheet-id 1Mbz-sE13iu1RU4qo-rzsczjjPRKAU-KSfnQnrJNXCgA` to mutate `BASELINE-1004-C112b`.
  2. **Ordering of reads vs `process.env.GODWORLD_SHEET_ID` switch (`lib/sheets.js:36-42`):**
     - `lib/sheets.js:36-42` (`getSpreadsheetId()`) reads `process.env.GODWORLD_SHEET_ID` dynamically on every call.
     - Tasks 3, 4, and 5 must read **both** the live sheet (to compute the 8-Cycle ratings median, last Cycle's byline rows, and last sports rows) **and** the sandbox sheet (to check `Simulation_Ledger` living citizens on the sandbox and to check whether `Cycle = N-1` / `Cycle = N` rows already exist on the sandbox for idempotency and `--check`).
     - **Input → wrong output:** If the script checks existing `Cycle = N-1` / `Cycle = N` rows before switching `process.env.GODWORLD_SHEET_ID` to the sandbox ID, it checks live instead of the sandbox; if `SANDBOX_ID` is not validated before the switch, `lib/sheets.js` falls back to `LIVE_ID`.
- **Fix:**
  1. Capture `const LIVE_ID = process.env.GODWORLD_SHEET_ID` immediately after `require('../lib/env')`.
  2. Refuse `LIVE_ID`, both baseline IDs (`1orX0qlIQloaM5gqCRJa3LHdkwajIufmcbCTHUWHda4E` and `1Mbz-sE13iu1RU4qo-rzsczjjPRKAU-KSfnQnrJNXCgA`), and any sheet whose `spreadsheets.get` title does not contain `'SANDBOX'` (or starts with `'BASELINE'`, mirroring `output/engine-sheet/2026-10-19-reset-from-baseline-c112.js:14-18`).
  3. Read live feeds while `GODWORLD_SHEET_ID === LIVE_ID`, then set `process.env.GODWORLD_SHEET_ID = sandboxId` once, verify connection/title via `sheets.testConnection()`, read the **sandbox** tabs (`Simulation_Ledger`, `Edition_Coverage_Ratings`, `Citizen_Media_Usage`, `Oakland_Sports_Feed`) for the skip gates and `--check`, and only then call `appendRows` on the sandbox.

---

### Finding 7 — [LOW] Task 3: Ambiguity in "live's last 8 Cycles" when live `Edition_Coverage_Ratings` has cycle gaps
- **Plan claim:** `docs/plans/2026-11-04-engine-330-sandbox-generic-feeds.md:44, 80` — *"every domain appearing in ≥4 of live's last 8 `Cycle`s gets its median `Rating`"* / *"At C114 on live: CRIME (8/8, median −2)..."*
- **Code evidence:**
  - As documented in `docs/reference/DEPLOY.md:153`, live `Edition_Coverage_Ratings` can have unrated Cycles (e.g., ratings stopped at C111 when live was at C113).
- **Input → wrong output:** If the seeder filters live rows by `rowCycle >= N - 8 && rowCycle <= N - 1` instead of taking the last 8 distinct rated `Cycle` values present in live's `Edition_Coverage_Ratings`, a 2-to-3 Cycle rating gap on live shrinks the sample window and drops domains below the `>= 4` appearance threshold.
- **Fix:** Define "live's last 8 Cycles" as the 8 highest distinct `Cycle` numbers present in live's `Edition_Coverage_Ratings` (with `Cycle < N`).

---

### Finding 8 — [LOW] Feed Facts Table (`docs/plans/2026-11-04-engine-330-sandbox-generic-feeds.md:31-36`): Inexact `file:line` and behavior claims
1. **`Edition_Coverage_Ratings` row (`:31`):**
   - **Claim:** *"Drives: city sentiment boost ±0.20 (`applyCityDynamics.js:1805`)"*.
   - **Code:** `phase02-world-state/applyEditionCoverageEffects.js:297` clamps the initial boost to `±0.20`, then `:304-318` compounds it with `S.civicVoiceSentiment` and re-clamps `S.editionSentimentBoost` to **`±0.25`** (`:318`) before `phase02-world-state/applyCityDynamics.js:1805` reads it.
   - **Omitted reader:** `phase07-evening-media/applyStorySeeds.js:199-203` + `utilities/priorityEngine.js:165-233` (`loadCoverageStateForDomain_` / `computeCoverageMultiplier_`) also reads `Edition_Coverage_Ratings` directly for lookback Cycles `N-3..N-1` (ignoring `Processed`) to apply `0.7x` saturation / `1.3x` crisis multipliers to story seeds.
2. **`Citizen_Media_Usage` row (`:32`):**
   - **Claim:** *"Empty feed: fewer than 2 rows → return"* (`phase05-citizens/processAdvancementIntake.js:377`).
   - **Code:** `if (usageData.length < 2) return results;` at `processAdvancementIntake.js:377` checks the `getDataRange().getValues()` array length, which includes the header row (`usageData[0]`). `usageData.length < 2` means **0 data rows** (1 data row = `usageData.length === 2`, which runs).
   - **Claim:** *"Live writer: ... `scripts/ingestPublishedEntities.js:946`"*.
   - **Code:** `:946` is a section comment; `processBylinePublished` is at `scripts/ingestPublishedEntities.js:965-1069` and the `Citizen_Media_Usage` append is at `:1050-1056`. (In-engine, `phase07-evening-media/mediaRoomIntake.js:281-364` also appends to `Citizen_Media_Usage` from `Citizen_Usage_Intake`.)
3. **`Advancement_Intake1` row (`:33`):**
   - **Claim:** *"Live writer: engine itself (`godWorldEngine2.js:1577`, emergence/family/owner promotions)"*.
   - **Code:** Since `engine.304` (`phase05-citizens/processAdvancementIntake.js:174-180`), `checkFamilyMatchPromotions_` no longer writes directly to `Advancement_Intake1`; it sets `Status = 'Family'` on `Generic_Citizens` (`:1847`), which only queues to `Advancement_Intake1` later if promoted via `checkEmergencePromotions_` (`:1997`). Also note phase ordering: `Phase5-Advancement` (`phase01-config/godWorldEngine2.js:668`) runs **before** `Phase11-MediaIntake` (`godWorldEngine2.js:879`), so usage rows routed to `Advancement_Intake1` in Phase 11 of fire `N` remain on `Advancement_Intake1` after fire `N` (matching Acceptance 3, `:61`) and are consumed/cleared by `processAdvancementRows_` on fire `N+1`.
4. **`Oakland_Sports_Feed` row (`:34`):**
   - **Claim:** *"Gate: `Cycle = N` only (`applySportsSeason.js:237`); re-read every fire, no `Processed` flag. Drives: season state, sentiment boost (needs a `WeekRecord`)..."*
   - **Code:** `phase02-world-state/applySportsSeason.js:219-236` reads **all prior rows (`cycle < currentCycle`)** every fire into `ctx._sportsWeekHistory` and `ctx._sportsLensHistory` (used for the 8-game-week trailing expectation baseline at `utilities/sportsWeekRecord.js:110-128`, trailing intensity median at `applySportsSeason.js:352-395`, and quiet-week `sportsAftermathShare_` at `applySportsSeason.js:968-993` — which produces a non-zero sentiment boost even on cycles without a current-Cycle `WeekRecord`). `deriveBaylightOpenings_` (`applySportsSeason.js:652-690`) and `reduceFeedTeamState_` (`:951, 1063-1106`) likewise scan rows `<= currentCycle`.
   - **Claim:** *"Live writer: hand entry; dashboard append (`dashboard/sportsRoutes.js:1286`)"*.
   - **Code:** `dashboard/sportsRoutes.js:1286` is the response string `'Oakland sports verified append'`; the sheet append call is at `dashboard/sportsRoutes.js:1254-1258`.
