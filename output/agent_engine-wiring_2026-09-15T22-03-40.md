Perfect. Now let me compile the complete wiring card. Let me verify all the data I've collected and create the final card.

Based on my investigation:

**Tab: Oakland_Sports_Feed** - has NO writers (all functions are READers)
- Writers: none
- Readers: 
  - `applySportsSeason.js::applySportsFeedTriggers_` (phase 2)
  - `applySportsSeason.js::deriveBaylightOpenings_` (phase 2)
  - `applySportsSeason.js::readOaklandFeedEntries_` (phase 2)
  - `diagnoseDashboardData.js::diagnoseDashboardData` (off-cycle utility)
  - `setupSportsFeedValidation.js::setupOaklandFeedOnly` (off-cycle utility)
  - `setupSportsFeedValidation.js::setupSportsFeedValidation` (off-cycle utility)

All in-engine reads are via `getSheetByName('Oakland_Sports_Feed')` which is a READ operation, not a WRITE.

Let me create the final card:

```
WIRING CARD — Oakland_Sports_Feed (tab)   map: 2026-09-15 / 183 files   

DEFINITION
  docs/engine/SHEETS_MANIFEST.md:95  **`Oakland_Sports_Feed`**: Interactive sports event intake. This is the live feed-tab precedent

PHASE POSITION
  production entry : Phase2-SportsSeason @ godWorldEngine2.js:288  — BEFORE Phase10-ExecuteIntents (:594)
  cycle-phases     : Phase2-SportsSeason @ godWorldEngine2.js:2037  — BEFORE Phase10-ExecuteIntents (:2329)

READERS & WRITE CLASSIFICATION

ENGINE PHASE READERS (Phase 2 — BEFORE executor):
  phase02-world-state/applySportsSeason.js:156  READ via getSheetByName()  → readOaklandFeedEntries_
  phase02-world-state/applySportsSeason.js:420  READ via getSheetByName()  → deriveBaylightOpenings_
  phase02-world-state/applySportsSeason.js:596  READ via getSheetByName()  → applySportsFeedTriggers_

OFF-CYCLE UTILITY READERS (not in engine phase flow):
  utilities/diagnoseDashboardData.js:6  READ via getSheetByName()  → diagnoseDashboardData (ad hoc Logger diagnostic)
  utilities/setupSportsFeedValidation.js:192  READ via getSheetByName()  → setupSportsFeedValidation (menu setup)
  utilities/setupSportsFeedValidation.js:232  READ via getSheetByName()  → setupOaklandFeedOnly (menu setup)

WRITE PATH
  None — Oakland_Sports_Feed has no engine writers. It is a read-only input tab.
  All reads are via getSheetByName() followed by getDataRange().getValues() — direct spreadsheet reads, not intents.

TAB MANIFEST
  Oakland_Sports_Feed  writers: none  readers: applySportsFeedTriggers_, deriveBaylightOpenings_, readOaklandFeedEntries_, diagnoseDashboardData, setupOaklandFeedOnly, setupSportsFeedValidation   manifest: SHEETS_MANIFEST.md:95

OTHER CODE REFERENCES (non-engine)
  lib/wakePerception.js:97  sheets.getRawSheetData('Oakland_Sports_Feed')  — external perception layer
  phase05-citizens/applyGameNightMoments.js:146  causeId: 'Oakland_Sports_Feed.gameNight'  — Ripple attribution
  phase05-citizens/generateCitizensEvents.js:1691  // S.sportsFeedEntries from Oakland_Sports_Feed
  phase05-citizens/generateCitizensEvents.js:3275  causeId: 'Oakland_Sports_Feed.gameNight'
  phase07-evening-media/sportsStreaming.js:6  // Sports content from Oakland_Sports_Feed via S.sportsFeedEntries
  phase10-persistence/compileHandoff.js:1643  loadSingleSportsFeed_(cache, SHEET_NAMES.OAKLAND_SPORTS_FEED, cycle)
  phase10-persistence/cycleExportAutomation.js:80  'Oakland_Sports_Feed'  — export list

OPEN WORK
  engine.202  Sports feed dead-field wiring + vocabulary surfaced in-tab. `processFeedSheet_` computes four per-hood numbers; the ONLY consumer repo-wide is `cityEveningSystems.js:420` and it reads `.traffic` alone — `retail`/`nightlife`/`communityEngagement` are computed every cycle and read by no
  engine.206  Sports as a CROSSOVER seed, not a lane (Mike-direct S446). Measured: of 20 slice builders only 5 read the sports feed — buildHal/Anthony/Tanya/Simon/PSlayer, all sports voices. Transit, economic, economic-food, civic-domain, civic-office, safety, health, faith, schools, environment, e
  engine.207b  **RULED S447 (builder): casino reading the first `game-result` row is FINE for now — close the defect framing.** The row previously said two of C107's three A's games "reach no wager, ever"; that was scoped to the casino and written as if absolute. **Corrected: the three games DO rea
  engine.210  **The feed is FORBIDDEN from moving the city and the switch has never been set.** `S.sportsSeason` — not the sentiment scalar — is the engine's real sports channel: read in 64 files across every phase (counted) (crisis spikes, promotions, bonds, nightlife, evening food, migration drif
  engine.212  **BUILT S451 — Crime_Metrics carries forward from last cycle (builder-direct 2026-09-13: a persistent ledger is never rebuilt from a literal.)**

  docs/plans/2026-05-22-sift-v2.md  (sports feed primary input for /sift v2 skill assessment)
  docs/plans/2026-06-23-citizen-perception-immersion-layer.md  (T1b AP-3: sports feed is safe true-first build for perception)
  docs/plans/2026-08-27-sports-coupling-restore.md  (C110 bench test on live C105 + Oakland_Sports_Feed C111 seed)
  docs/plans/2026-08-31-c105-chase-sessions.md  (G-PF26 sports-feed validation — missing comma @ E212)

HISTORY
  6b4a8701  codex: engine.203 preserve informative sports records and unify season parsing
  e9ce67a5  engine.131 T7: the sports zone follows the stadium (ships dark)
  2935a4a7  applySportsSeason: the city gets the real season back (engine.131, v3.1)
  55fef7c2  engine.89 Waves A-C: Oakland sports workspace, source-only [research-build]
  fa87075a  S328 engine.75: stale sports teams silenced + East Oakland canonized (both Mike-direct)
  4979eb6f  S302 sports-atmosphere gate — feed SeasonType no longer synthesizes city atmosphere

CRITICAL FINDING
  Oakland_Sports_Feed has ZERO writers in the engine. It is a live manual intake tab written only by Mike in the spreadsheet UI, never by any engine function. ALL access is read-only via getSheetByName() and getDataRange().getValues().

FILES OPENED
  docs/engine/SHEETS_MANIFEST.md
  phase02-world-state/applySportsSeason.js
  utilities/diagnoseDashboardData.js
  utilities/setupSportsFeedValidation.js
  phase01-config/godWorldEngine2.js
  docs/engine/ROLLOUT_PLAN.md
  docs/plans/ (search results from 123 files)
  lib/wakePerception.js
  phase05-citizens/applyGameNightMoments.js
  phase05-citizens/generateCitizensEvents.js
  phase07-evening-media/sportsStreaming.js
  phase10-persistence/compileHandoff.js
  phase10-persistence/cycleExportAutomation.js
```

---

## Coverage (measured by the harness, not claimed by the agent)

- engine phase files in repo: **132**
- opened by this run: **132** (100%)
- never opened: **0**


_agent=engine-wiring model=anthropic/claude-haiku-4.5 provider=openrouter turns=10 toolCalls=19 in=127673 out=3999_
_Any count in the report above that disagrees with this footer is the agent's claim, not a measurement._