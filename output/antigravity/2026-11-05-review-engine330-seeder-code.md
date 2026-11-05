# Adversarial Code Review — `scripts/seedSandboxFeeds.js` + `scripts/seedSandboxFeeds.test.js`

- **Date:** 2026-11-05
- **Lane:** agy (Antigravity)
- **Targets:**
  - `scripts/seedSandboxFeeds.js`
  - `scripts/seedSandboxFeeds.test.js`
  - `docs/plans/2026-11-04-engine-330-sandbox-generic-feeds.md` (Tasks 2–5, A7–A12)
- **Verdict:** **SHIP-WITH-FIXES**

---

## Summary by Hunt Category

- **Path that can write to a sheet other than SANDBOX 1004:** **None found.** `checkTarget` (`scripts/seedSandboxFeeds.js:217-223`) enforces an exact allowlist of `SANDBOX_ID` (`1tByPpT8QIgJppabjpEdAqPlTjcq2RBSkL_QDrGk8YcA`) after refusing missing IDs, `LIVE_ID`, and both frozen baselines (`BASELINE_IDS`), and `main()` (`scripts/seedSandboxFeeds.js:236-255`) reads live tabs before switching `process.env.GODWORLD_SHEET_ID = target` once and verifying `properties.title === SANDBOX_TITLE` before any sandbox read or `sheets.appendRows` call (`:304`).
- **Rows an engine reader would reject or misread:** **3 findings** (Findings 1, 3, 4).
- **Skip gates / `--check` gates that misfire:** **2 findings** (Findings 2, 5).
- **Tests that pass without proving their claim:** **3 findings** (Findings 1, 2, 3).

---

## Findings

### Finding 1 — [HIGH] `buildSportsRows` (`scripts/seedSandboxFeeds.js:193`) + `scripts/seedSandboxFeeds.test.js:96, 103`: Blank `EventTrigger: ''` and `PlayerMood: ''` do NOT clear prior-cycle triggers or moods in `reduceFeedTeamState_`, and the test passes without proving A7

- **Code pointers:**
  - `scripts/seedSandboxFeeds.js:193`: `EventTrigger: '', PlayerMood: '', StoryAngle: '', Stats: ''`
  - `scripts/seedSandboxFeeds.test.js:96, 103`:
    ```js
    { Cycle: 114, SeasonType: 'early-season', EventType: 'roster-move', TeamsUsed: 'Oaks', NamesUsed: 'Gone Player', 'Team Record': '', EventTrigger: 'championship', PlayerMood: 'confident', Streak: 'W2', HomeNeighborhood: 'KONO' },
    ...
    assert('streak L1, trigger and mood blank', oaks.Streak === 'L1' && oaks.EventTrigger === '' && oaks.PlayerMood === '');
    ```
  - `phase02-world-state/applySportsSeason.js:951, 1004, 1015-1051, 1063-1105` (`processFeedSheet_` & `reduceFeedTeamState_`)
- **Failure (`input → wrong output`):**
  - `reduceFeedTeamState_` (`phase02-world-state/applySportsSeason.js:1065-1104`) scans all rows from row 1 up to `currentCycle` and only updates `ts.trigger` and `ts.playerMood` when the cell is non-blank and not `'-'`:
    ```js
    if (trigger && trigger !== '-') ts.trigger = trigger;       // :1098
    if (playerMood && playerMood !== '-') ts.playerMood = playerMood; // :1099
    ...
    ts.cycle = cycle;                                           // :1102
    ```
  - Given the exact test fixture in `scripts/seedSandboxFeeds.test.js:95-99` (where Cycle 114 has `EventTrigger: 'championship', PlayerMood: 'confident'`) followed by the seeded Cycle 115 `oaks` row (`EventTrigger: '', PlayerMood: ''`), `reduceFeedTeamState_` advances `ts.cycle` to `115` while **preserving `ts.trigger = 'championship'` and `ts.playerMood = 'confident'` from Cycle 114**.
  - When `processFeedSheet_` (`phase02-world-state/applySportsSeason.js:1004-1051`) runs for Cycle 115, `state.cycle === 115` passes the current-cycle gate (`:1004`), `state.playerMood === 'confident'` pushes `{ team: 'Oaks', trigger: 'player-energy', ..., playerMood: 'confident' }` (`:1030-1037`), and `triggerValue === 'championship'` pushes `{ team: 'Oaks', trigger: 'championship', ... }` (`:1040-1051`) into `S.sportsEventTriggers`.
  - The test at `scripts/seedSandboxFeeds.test.js:103` passes only because it checks `oaks.EventTrigger === '' && oaks.PlayerMood === ''` on the isolated row object instead of checking how `reduceFeedTeamState_` + `processFeedSheet_` reduce the row against `live`.
- **Fix:**
  - In `reduceFeedTeamState_` (`phase02-world-state/applySportsSeason.js:1098`) and `processFeedSheet_` (`:1040`), `EventTrigger: 'none'` overwrites `ts.trigger` (`'none' !== '-'`) and is suppressed at `:1040` (`if (triggerValue && triggerValue !== 'none')`).
  - For `PlayerMood`, a neutral dropdown value from `PLAYER_MOOD_VALUES` (`utilities/setupSportsFeedValidation.js:124-125`, e.g., `'quiet'` or `'locked-in'`) overwrites `ts.playerMood` in `reduceFeedTeamState_` (`:1099`), fires neither branch of `processFeedSheet_` (`:1022-1037` only checks `frustrated`/`angry` and `electric`/`confident`), and does not override `Streak = 'L1'` in `gameNightBucket_` (`phase05-citizens/applyGameNightMoments.js:68-71`).

---

### Finding 2 — [HIGH] `buildUsageRows` (`scripts/seedSandboxFeeds.js:153-158`) + `scripts/seedSandboxFeeds.test.js:76, 88-89`: Skip gate matches in-progress `byline-landed` rows at `Cycle = N-1`, skipping usage seeding after any mid-week resync from live

- **Code pointers:**
  - `scripts/seedSandboxFeeds.js:27, 153-158`:
    ```js
    const BYLINE_TYPES = ['byline-landed', 'byline-published'];
    ...
    if (sandboxUsage.some(r => num(r.Cycle) === prev && BYLINE_TYPES.indexOf(type(r)) !== -1)) {
      return { rows: [], skipped: 'sandbox already has byline rows at C' + prev, source: null, dropped: [] };
    }
    const published = liveUsage.filter(r => type(r) === 'byline-published').map(r => num(r.Cycle)).filter(c => c !== null);
    ```
  - `scripts/seedSandboxFeeds.test.js:76, 88-89`:
    ```js
    { Cycle: 114, CitizenName: 'Luis Navarro', UsageType: 'byline-landed', Context: 'w', Processed: '' },
    ...
    const warm = s.buildUsageRows(live, live, ledger, 115);
    assert('sandbox with live N-1 bylines is not seeded', warm.rows.length === 0);
    ```
  - `docs/plans/2026-11-04-engine-330-sandbox-generic-feeds.md:45, 49` (Task 4 & Task 8)
- **Failure (`input → wrong output`):**
  - Task 4 (`docs/plans/2026-11-04-engine-330-sandbox-generic-feeds.md:45`) specifies copying *"the byline rows (`byline-landed`, `byline-published`) of the latest live Cycle with `byline-published` rows (a whole week; live's in-progress week has landed rows only)"*.
  - During the week on live (when live's `World_Config.cycleCount` is `prev = N - 1`, e.g., `114`), `scripts/cron-desk-run.js:309-335` writes `byline-landed` rows at `Cycle = 114` to live `Citizen_Media_Usage` before the Saturday edition publishes any `byline-published` rows.
  - When `syncSandboxFromLive.js` runs in Task 8 (`docs/plans/2026-11-04-engine-330-sandbox-generic-feeds.md:49`), the sandbox receives live's `World_Config.cycleCount = 114` (`N = 115`, `prev = 114`) **and** live's `Citizen_Media_Usage` containing those in-progress `Cycle = 114` `byline-landed` rows.
  - When `seedSandboxFeeds.js` then runs for `N = 115` (`prev = 114`), `scripts/seedSandboxFeeds.js:153` sees those in-progress `byline-landed` rows in `sandboxUsage` (because `BYLINE_TYPES` includes `'byline-landed'`) and immediately returns `{ rows: [], skipped: 'sandbox already has byline rows at C114' }`.
  - As a result, on any mid-week resync from live (`N = liveCycleCount + 1`), `scripts/seedSandboxFeeds.js:156-158` is unreachable dead code and **zero `byline-published` rows (and zero `SANDBOX-GENERIC` usage rows) exist at `C<N-1>`**.
  - In `scripts/seedSandboxFeeds.test.js:76, 88-89`, the test fixture has only 1 in-progress `byline-landed` row at `Cycle: 114` (and 0 `byline-published` rows, which is why `:80` asserts `u.source === 113`), yet `:88-89` asserts `warm.rows.length === 0` when seeding for `N = 115`, codifying the exact mid-week skip bug as a passing test.
- **Fix:**
  - Gate the skip check at `scripts/seedSandboxFeeds.js:153` on `sandboxUsage` already having `'byline-published'` (or `r.Reporter === MARKER`) rows at `Cycle = prev` (i.e. a completed or already-seeded week), and when seeding `prev` over an in-progress week that already has partial `byline-landed` rows on `sandboxUsage`, skip or deduct the `(CitizenName, 'byline-landed')` pairs already present at `prev` so no reporter's landed byline is double-counted.

---

### Finding 3 — [MEDIUM] `buildSportsRows` (`scripts/seedSandboxFeeds.js:89-102, 186-200`) + `scripts/seedSandboxFeeds.test.js:95-105`: Last-row-only lookup for `SeasonType` / static columns, `isNoGamePhase` mismatch with `canonicalSportsPhase_`, and `'0-0'` record clobber

- **Code pointers:**
  - `scripts/seedSandboxFeeds.js:89-102, 186-200`:
    ```js
    function isNoGamePhase(seasonType) {
      const s = String(seasonType || '').trim().toLowerCase();
      return !s || s === 'off-season';
    }
    function parseWinLoss(v) {
      const s = String(v || '').trim();
      let m = /^(\d+)-(\d+)(?:-\d+)?$/.exec(s);
      if (m) return { w: Number(m[1]), l: Number(m[2]) };
      ...
    }
    ...
    const last = teamRows[teamRows.length - 1];
    const seasonType = String(last.SeasonType || '').trim();
    const out = {
      Cycle: N, SeasonType: seasonType, TeamsUsed: last.TeamsUsed,
      HomeNeighborhood: last.HomeNeighborhood, FanSentiment: last.FanSentiment,
      FranchiseStability: last.FranchiseStability, EconomicFootprint: last.EconomicFootprint,
      CommunityInvestment: last.CommunityInvestment, MediaProfile: last.MediaProfile,
      ...
    };
    ```
  - `phase02-world-state/applySportsSeason.js:533-543` (`canonicalSportsPhase_`), `:1083-1103` (`reduceFeedTeamState_`), `:1126-1135` (`parseWinPercentage_`)
- **Failure (`input → wrong output`):**
  1. **Blank/dash `SeasonType` or static columns on `teamRows[teamRows.length - 1]`:** Unlike `reduceFeedTeamState_` (`phase02-world-state/applySportsSeason.js:1096-1101`), which walks rows carrying forward the last non-blank, non-dash `seasonType`, `fanSentiment`, and `mediaProfile` (`if (seasonType && seasonType !== '-') ts.seasonType = seasonType;`), `buildSportsRows` (`scripts/seedSandboxFeeds.js:186-192`) reads `SeasonType` and the 6 static columns only from `teamRows[teamRows.length - 1]`.
     - If a team's last live row is a supplemental/note row with blank `SeasonType = ''`, `isNoGamePhase('')` returns `true` and seeds an `'off-season'` row (`WeekRecord: 'none'`) for an active in-season team.
     - If `last.SeasonType` is `'-'` (or any string unrecognized by `SPORTS_PHASE_DEPTH_` / `SPORTS_PHASE_ALIASES_`), `isNoGamePhase` (`:89-92`) returns `false` and seeds a `'game-result'` row (`WeekRecord: 'H:W A:L'`), while `canonicalSportsPhase_` (`applySportsSeason.js:533-543`) maps that `SeasonType` to `'off-season'` (depth `0`), causing `S.sportsSeason` to evaluate to `'off-season'` on a game-phase row (failing Acceptance 3, `docs/plans/2026-11-04-engine-330-sandbox-generic-feeds.md:60`).
     - In `scripts/seedSandboxFeeds.test.js:95-96, 105`, `HomeNeighborhood: 'KONO'` is placed directly on the last row (`live[1]`) while `FanSentiment`..`MediaProfile` are `undefined` on both rows, so the test never exercises carry-forward when the last row is a sparse `roster-move` row.
  2. **Filler `'0-0'` record clobbers played `W-L`:** In `reduceFeedTeamState_` (`phase02-world-state/applySportsSeason.js:1059-1060, 1092-1095, 1133`), `parseWinPercentage_('0-0')` returns `null` (`total === 0`) specifically so a filler `'0-0'` on a non-game row cannot clobber an earlier played record. In `scripts/seedSandboxFeeds.js:97-98, 200`, `parseWinLoss('0-0')` returns `{ w: 0, l: 0 }` (truthy), stopping the backward scan at `'0-0'` and seeding `Team Record = '1-1'` over a played record.
- **Fix:**
  - Walk backward across `teamRows` for the last non-blank, non-`'-'` `SeasonType` and static columns (`HomeNeighborhood`, `FanSentiment`, `FranchiseStability`, `EconomicFootprint`, `CommunityInvestment`, `MediaProfile`).
  - Match `canonicalSportsPhase_` (`applySportsSeason.js:499-543`) in `isNoGamePhase` so any unrecognized/`'-'` phase is treated identically by the seeder and the engine.
  - In `buildSportsRows` (`:200`), prefer the last valid played record (`wl.w + wl.l > 0`) and only fall back to `0-0` if no played record exists since the team's last `off-season` row.

---

### Finding 4 — [LOW] `ledgerIndexes` (`scripts/seedSandboxFeeds.js:107-119`) vs `buildNameIndex_` (`phase05-citizens/processAdvancementIntake.js:440-442, 502, 554`) and `applyTierLadderState_` (`:1446-1447, 1459`): Deceased-citizen homonym passes seeder check but is rejected as ambiguous by the engine

- **Code pointers:**
  - `scripts/seedSandboxFeeds.js:110-117`:
    ```js
    ledgerRows.forEach(r => {
      if (!isLiving(r)) return;
      const first = String(r.First || '').trim(), last = String(r.Last || '').trim();
      if (!first && !last) return;
      byGameKey.add(gameNightNameKey(first + ' ' + last));
      const k = normalizeCitizenName(first) + ' ' + normalizeCitizenName(last);
      (byNorm[k] = byNorm[k] || []).push(first + ' ' + last);
    });
    ```
  - `phase05-citizens/processAdvancementIntake.js:356-366, 440-442, 502, 554-558` (`buildNameIndex_` & `processMediaUsage_`) and `:1446-1447, 1459` (`applyTierLadderState_`)
- **Failure (`input → wrong output`):**
  - `ledgerIndexes` (`scripts/seedSandboxFeeds.js:111`) skips `!isLiving(r)` rows **before** populating `byNorm`.
  - In `processMediaUsage_` (`phase05-citizens/processAdvancementIntake.js:441`), `buildNameIndex_(ledgerRows, lFirstCol, lLastCol, null, 0)` indexes **all** `Simulation_Ledger` rows regardless of `Status` (`filterFn = null`), and skips any name with `ledgerHits.length > 1` (`:502, 554`). `applyTierLadderState_` (`:1447, 1459`) likewise counts `keyCount[kk]` across all `Simulation_Ledger` rows regardless of `Status`.
  - If `Simulation_Ledger` has one `Active` citizen and one `Deceased` citizen with the same normalized `First + ' ' + Last`, `buildUsageRows` (`scripts/seedSandboxFeeds.js:164`) sees `hits.length === 1` and seeds the row, which `processMediaUsage_` (`:554`) and `applyTierLadderState_` (`:1459`) then skip as ambiguous (`2 ledger rows`).
- **Fix:**
  - Populate `byNorm` across all `Simulation_Ledger` rows (storing `{ name, living: isLiving(r) }`), and in `buildUsageRows` (`:164`) require `hits.length === 1 && hits[0].living`.

---

### Finding 5 — [LOW] `--check` mode (`scripts/seedSandboxFeeds.js:295-299`): Checks whether the builders produced new rows (`p[2].length`), not whether the sandbox feeds have rows for Cycle `N`

- **Code pointers:**
  - `scripts/seedSandboxFeeds.js:18, 289-299`:
    ```js
    const plan = [
      ['Edition_Coverage_Ratings', sbr.Edition_Coverage_Ratings.header, ratings.rows],
      ['Citizen_Media_Usage', sbr.Citizen_Media_Usage.header, usage.rows],
      ['Oakland_Sports_Feed', sbr.Oakland_Sports_Feed.header, sports.rows]
    ];

    if (check) {
      const missing = plan.filter(p => p[2].length).map(p => p[0]);
      console.log(missing.length ? '\nCHECK: missing rows for C' + N + ' on ' + missing.join(', ') : '\nCHECK: seeded for C' + N);
      process.exit(missing.length ? 1 : 0);
    }
    ```
  - `docs/plans/2026-11-04-engine-330-sandbox-generic-feeds.md:43` (Task 2: *"--check (exits non-zero when the Cycle's rows are missing)"*)
- **Failure (`input → wrong output`):**
  - `--check` exits `0` whenever `ratings.rows`, `usage.rows`, and `sports.rows` are empty arrays (`missing.length === 0`).
  - If a builder returns `rows: []` because live had no qualifying source rows or all candidate rows were dropped (e.g., `buildUsageRows` at `:157` `'live has no published week'` or all names dropped at `:164`; `buildSportsRows` at `:185` `'no live rows, skipped'`), `p[2].length` is `0` even though the sandbox tab has **zero** rows for `Cycle = N - 1` / `Cycle = N`. `--check` then prints `CHECK: seeded for C<N>` and exits `0`.
  - Conversely, if the sandbox already has 5 of 6 rating domains (or 1 of 2 sports teams) for Cycle `N`, `--check` reports the tab as missing without distinguishing partial presence from an empty tab.
- **Fix:**
  - Have `--check` also fail (`exit 1`) if any of the three sandbox tabs has 0 existing rows for its target Cycle (`Cycle = N - 1` on `Edition_Coverage_Ratings`, `Cycle = N - 1` published/seeded bylines on `Citizen_Media_Usage`, `Cycle = N` for each team in `TEAMS` on `Oakland_Sports_Feed`).
