# Adversarial Review — P Slayer on His Seat (Live 06:15 Wed 2026-11-25)

- **Reviewer:** Antigravity (`agy`)
- **Date:** 2026-11-25
- **Brief:** `docs/for-claude-review/2026-11-25-rb-brief-agy-pslayer-seat.md`
- **Targets inspected:** `.claude/agents/p-slayer/{SEAT,IDENTITY,LENS,RULES,SKILL}.md`, `docs/media/{P_SLAYER_CHARGE_BAG,voices/p_slayer}.md`, `scripts/{sportsRecord,buildPSlayerRecord,newsroomSourcing,sportsSubstrate,beatSliceKit,livedExperiencePacket,livedExperiencePacketV2,newsroomInterviewContract,reporterIdentity,cron-desk-run,cron-desk-writer,newsroom-fanout}.js`, `scripts/newsroom-wake-packages.json` (`PSLAYER-LEP2-2`), `output/sports/feed_live.json`, `output/world_summary_c{116,117}.md`, `output/test-shell/20261125-003809-p-slayer-day-today-1121449/`, and `output/research-build/2026-11-25-pslayer/test-day.md`
- **Verdict:** **SHIP-WITH-FIXES**

The core seat switch works cleanly: `SEAT.md` preserves his ten charge modes, Friction Pivot, `I Was Wrong`, first-person `I/we`, and both-clubs beat without legacy `P SLAYER HEAT` / `PREWRITE` boilerplate; `buildPSlayerRecord` + `newsroomSourcing` keep Tribune staff and ledger-less names out of W2; Maverick W2 interviews work cleanly with `ownLifeInterviewPacket`; and `buildPSlayerRecord` + `seatPacket` + `bareWrite` keep old scored-pick and rule-list prompts off W3. Four real code defects hit the live path (including the fatal `c116`/`c117` cycle split and dead W1 `rewardLoop`) and should be fixed.

---

## Findings

### 1. [HIGH] `cron-desk-writer.js` ignores the state file's cycle and crashes `cron-desk-run.js` on any split-cycle write (and can happen live)

- **Where:** `scripts/cron-desk-run.js:1447-1459, 3140, 3367-3369`, `scripts/cron-desk-writer.js:353-357, 1193-1194, 1636`, `output/test-shell/20261125-003809-p-slayer-day-today-1121449/write.log:26-38`
- **Mechanism (`input -> wrong output`):**
  1. `buildWriterArgs` (`cron-desk-run.js:1447-1459`) spawns `cron-desk-writer.js --desk sports --state-file ..._c116_...state.json` without passing `--cycle`.
  2. `cron-desk-writer.js:1193-1194` calls `detectCycle()` -> `getCurrentCycle()` (`:353-357`), taking the newest `world_summary_c{N}.md` on disk (`117`) while ignoring both the runner's `cycle` (`116`) and the injected Packet (`state.json` `manifest.cycle`).
  3. At `:1636`, `cron-desk-writer.js` calls `toolWriteFile({ path: 'sports_c' + cycle + '.md' })`, writing `sports_c117_p-slayer_...md` (`write.log:27`), while `cron-desk-run.js:3369` checks `draftPath` (`sports_c116_...md`) and crashes: `Fatal: writer produced no draft` (`write.log:38`).
- **Can this happen live?** Yes: if `/run-cycle` + `/build-world-summary` lands between the 06:15 W1 wake and the 18:15 W3 wake (or a delayed live W3 retry runs with `--stage=write --cycle=N` after `N+1` exists on disk), `cron-desk-run.js:3140` uses `--cycle` (`N`) while `cron-desk-writer.js:1193` uses `getCurrentCycle()` (`N+1`), failing `cron-desk-run.js:3369` identically (and shifting `CANON_RECALL_CYCLE` to `N+1`).

---

### 2. [HIGH] `PSLAYER-LEP2-2` omits `"writerTools"`, putting Grok in `RECALL_ONLY` prompt mode while still attaching all 7 tools to the API

- **Where:** `scripts/newsroom-wake-packages.json:229-285`, `scripts/cron-desk-run.js:191, 3335-3344`, `scripts/cron-desk-writer.js:954-955, 1473-1484, 1596-1616`, `.claude/agents/p-slayer/SEAT.md:24-31`, `output/test-shell/20261125-003809-p-slayer-day-today-1121449/write.log:6`
- **Mechanism (`input -> wrong output`):**
  1. `p-slayer` sets `seatFile`, `seatMemory: true`, and `seatDossier: true` (`newsroom-wake-packages.json:282-284`), but omits `"writerTools"` (unlike Anthony, Hal, and Marbury).
  2. In `cron-desk-run.js:3335-3342`, `ownTools` evaluates to `0`, so `writerTools` falls back to `RECALL_ONLY_CALLS = 4` (`--writer-tools 4 --canon-recall`, logged at `write.log:6` as `writer tools ON: max 4 calls (canon_recall only)`).
  3. Because `'p-slayer'` is absent from `OWN_TOOL_SEATS` (`cron-desk-writer.js:954-955`), `RECALL_ONLY` evaluates to **`true`**. That suppresses all tool-use instructions except `RECALL_BLOCK` / `RECALL_KICKOFF` (`canon_recall` only, `:1473-1484, 1596`), directly contradicting `SEAT.md:24-31` (`memory_recall`, `dossier_read`, `ask_worker`, `sheet_read`, `citizen_lookup`, `canon_search`).
  4. Simultaneously, line `1610` ignores `RECALL_ONLY` when `TEST_SEAT` is true and binds all 7 tool schemas in `toolset` anyway (capped at `4` calls instead of `6`), while Grok called `0` tools in `tooltrace.json`.

---

### 3. [MEDIUM] `SEAT_FILE` forces `FREE_ANGLE = 'free-rows'` everywhere, disabling `rewardLoop` at W1 and truncating 58 of 66 live game-watchers

- **Where:** `scripts/cron-desk-run.js:221, 2268-2281`, `scripts/livedExperiencePacket.js:365-392`, `scripts/sportsRecord.js:73, 85`, `scripts/newsroomSourcing.js:285-297, 434`
- **Mechanism (`input -> wrong output`):**
  1. **Dead `rewardLoop` at live W1:** `cron-desk-run.js:221` unconditionally sets `FREE_ANGLE = TEST_ANGLE || (SEAT_FILE ? 'free-rows' : null);`. At `:2281`, `if (!FREE_ANGLE && ACTIVE_WAKE_PACKAGE && ACTIVE_WAKE_PACKAGE.rewardLoop ...)` is therefore **`false`** for every `seatFile` seat on the live 06:15 wake as well as the test shell. Despite `"rewardLoop": true` (`newsroom-wake-packages.json:231`), P Slayer never reads his last grade at W1.
  2. **Game-watcher truncation (`buildFreeAnglePacket` vs `buildPSlayerRecord`):** On live C117 (`sportsRecord.js` tested offline against `feed_live.json` + `simulation_ledger_snapshot.jsonl`), `buildPSlayerRecord(117)` resolves **17** named feed people (0 Tribune staff; ledger-less names like `Carmen Mesa` or typos like `TyJerome` cleanly yield `popid: null` and are skipped at `:73`), and `newsroomSourcing.buildPool` adds **66** game-watchers (`page-line`) for **83** total candidates. Because `sliceNamed` sits first (`newsroomSourcing.js:434`), `buildFreeAnglePacket` (`livedExperiencePacket.js:392`) applies `.slice(0, peopleCap || 12)` (`peopleCap: 25`), cutting W1's pool after the 17 feed figures + **8** game-watchers — dropping **58 of 66** game-watchers (and in C116, where `25` feed names filled `peopleCap`, **all** game-watchers would be truncated).
  3. **Stale beat-tab risk in `newsroomSourcing.street` (`newsroomSourcing.js:292`):** P Slayer's game-watcher lookup reads `rows(root, 'Oakland_Sports_Feed')` (`output/beats/Oakland_Sports_Feed.jsonl`, last dumped `2026-11-22`, 292 rows) rather than `feed_live.json` (which runs through row 296). Wait-free live rows added mid-week that carry a new `TeamsUsed` won't create `watch` highlights from `feed_live.json` if `Oakland_Sports_Feed.jsonl` is behind (here both C117 teams `A's` and `Oaks` already appeared earlier in `Oakland_Sports_Feed.jsonl`, so offline C117 still found 66). Also note multi-team comma cells (`"A's, Oaks"`) would push a literal combined string instead of splitting per team.

---

### 4. [MEDIUM] Old voice file (`voices/p_slayer.md`) still loaded; test-day Indiana deficit (`20` vs `19`) and Spurs `"final nine"` missed by `auditArticle`

- **Where:** `scripts/newsroom-wake-packages.json:229-285`, `scripts/reporterIdentity.js:85-90`, `output/test-shell/.../write.log:13`, `output/research-build/2026-11-25-pslayer/test-day.md:1, 3, 5, 7, 12-15`, `output/sports/feed_live.json` (`row 295`, `row 281`), `output/world_summary_c116.md:244, 344-345`, `scripts/livedExperiencePacketV2.js:802-813`
- **Mechanism (`input -> wrong output`):**
  1. **Old essence still injected (`seatEssence` omitted):** `write.log:13` logs `identity: sheetChars=286 essenceChars=294 voice=p_slayer.md`. `docs/media/voices/p_slayer.md:7` omits his Oaks expansion and dugout interviews while duplicating `SEAT.md:1`. Other old-path layers (`P SLAYER HEAT`, `P_SLAYER_CHARGE_BAG.md`, `loadPSlayerSlice`, `PREWRITE`, `FACTS_TAIL`, `limits`, `reviewProfile`) are cleanly stripped by `BEAT_BUILDERS['p-slayer']`, `FREE_ANGLE = 'free-rows'`, `bareWrite = true`, and `seatPacket()`.
  2. **Test-piece factual errors vs `auditArticle` and Rhea:**
     - **Indiana (`test-day.md:3`):** `"Indiana left us down 20 at the half"` is false. `feed_live.json` row 295 (`approvedFacts`) states `"Down 61-42 at the half and 82-62 after three... In Indiana a 19-point halftime hole was too much."` (`61-42 = 19` at half; `20` was after three). `auditArticle` returned `observations: []` because `20` matched unrelated `20` tokens in `approvedFacts`. Against `world_summary_c116.md:345` (`"61-42 halftime lead"`, though lines `:244, 344` also write `"20 down"`) or C117 (`row 295`), Rhea can flag the halftime deficit.
     - **Philadelphia (`test-day.md:3`):** `"down two after three and we poured 40 in the fourth"` matches `row 274` and `row 295` (`82-80`, scored `40`). Clean.
     - **San Antonio (`test-day.md:1`):** `"the Spurs took the final nine after we were tied at 90"` over-narrates `row 281` / `row 295` (`"tied 90-90 going into the fourth. ... The Oaks scored 27 in the fourth, lost the quarter by 9"` -> 36-27 quarter, not a 9-0 closing run; `"nine"` is a word token so `auditArticle` skips it).
     - **Seat context drop (`seatPacket`):** At W1 Haiku wrote `"halftime deficits against Indiana (19)"` accurately in `angleRead.plan.checks[0]`, **but** `seatPacket()` (`cron-desk-writer.js:1499`) only forwards `assignment.focus` (dropping `checks`), so Grok never saw Haiku's verification reminder.
  3. **W2 indirect paraphrase & `INTAKE` roles (`test-day.md:3, 5, 7, 12-15`):**
     - Grok wrote zero verbatim `"..."` quotation marks for Reaves, Shepard, and Hayward, so `renderPacketIntake` (`cron-desk-writer.js:502-504`) tagged all three as **`mentioned`** (`test-day.md:12-14`) — which matches `renderPacketIntake`'s rule when no quote opens matching the first 48 chars (`body.includes(quote.slice(0, 48))` is `false`). Because Grok still used indirect attributed speech (`"Shepard said it plain after the San Antonio game and again after Denver..."` — adding `"after the San Antonio game and again after Denver"`, which was not in Shepard's W2 quote; `"Reaves told me..."`; `"He said the role..."`), `auditArticle`'s `quotedSpans` regex caught nothing, whereas an adversarial Rhea pass checks whether Shepard's added game framing / indirect speech drifts from `approvedQuotes` (`cron-rhea-gate.js:535`). Meanwhile `cron-desk-writer.js:507-514` still emitted Reaves's quote on `CLAIM:` despite zero `quoted-source` entries.

---

### 5. [LOW] `sportsRecord.filedThisCycle` injects colleague headlines into `manifest.approvedFacts` and depends on `sports_` filename prefix

- **Where:** `scripts/sportsRecord.js:31-41, 56-61, 91-93`, `scripts/livedExperiencePacketV2.js:344, 802-813`
- **Mechanism (`input -> wrong output`):**
  - `filedThisCycle` (`sportsRecord.js:34`) reads `^sports_c<N>_([a-z-]+)_.*\.staged(-\d+)?\.md$` and inserts `'Filed this Cycle by <Colleague>: "<Headline>"'` via `facts.unshift` (`:59`). Currently all 8 seats in `SPORTS_NAMES` (`anthony-raines`, `p-slayer`, `hal-richmond`, `elliot-marbury`, `tanya-cruz`, `simon-leary`, `selena-grant`, `talia-finch`) have `assignment.desk: "sports"` in `newsroom-wake-packages.json`.
  - It passes **only the headline**, not the colleague's article body (no direct body-claim leak). However, putting colleague headlines into `packet.known` promotes them into `manifest.approvedFacts` (`livedExperiencePacketV2.js:344`), so any numbers in a colleague's staged headline (e.g. a column headline with `"0-9 to 8-1"`) automatically enter `auditArticle`'s `allowedNumbers` (`:803`).

---

## Remaining Audit Checks

- **Haiku W1 & Grok W3 (`Attack 5`):** `PSLAYER-LEP2-2` sets no `seatReasoning` (`newsroom-wake-packages.json:229-285`), Haiku made `0` tool calls at W1 (`angle.log:7`) despite naming `I Was Wrong` in `unverifiedLead`, and `seatPacket()` (`cron-desk-writer.js:1494-1505`) strips `reviewProfile`, `limits`, `signal.plan`, `excludedLeads`, `manifest` policy keys, and `output.preflight` cleanly for Grok. (Only `checks` loss + `RECALL_ONLY` tool prompt bug above interfere.)
- **`SEAT.md` craft comparison (`Attack 1`):** `.claude/agents/p-slayer/SEAT.md` cleanly retains all ten modes from `P_SLAYER_CHARGE_BAG.md` (`Hate the Move`, `I Was Wrong / I Was Right`, `Friction Pivot`, `Loss Hangover / Empty Win`, `Paper Cuts vs the Nerds`, `Superman We Asked Him to Be`, `We Still Believe / We're Done`, `Dugout Pulse`, `Breakout Feeling`, `Wire Dare`), the 7 charge states, first-person `I/we`, and adds both clubs + dugout/regulars interviews while intentionally dropping the legacy `PREWRITE:` block and explicit 400–700 word target from the seat file (`400-700` remains in `reviewProfile.articleContract` for grading).
- **W2 question path (`Attack 2`):** `cron-desk-run.js:541-545` + `scripts/newsroomInterviewContract.js:140-152` pass Haiku's planned per-citizen question verbatim plus only matching feed rows and that citizen's ledger profile (`Reaves`, `Shepard`, `Hayward` all landed `3/3` on `meta-llama/llama-4-maverick`).

---

## Recommended Fixes

1. Pass `--cycle` in [`buildWriterArgs`](file:///root/GodWorld/scripts/cron-desk-run.js#L1447-L1459) (or have [`cron-desk-writer.js`](file:///root/GodWorld/scripts/cron-desk-writer.js#L1193) read `arg('--cycle')` / `packetState.manifest` cycle before `detectCycle()`) so W3 cannot save under `N+1` while `cron-desk-run.js` expects `N`.
2. Add `"writerTools": { "maxToolCalls": 6 }` to `p-slayer` in [`newsroom-wake-packages.json`](file:///root/GodWorld/scripts/newsroom-wake-packages.json#L229-L285) (or include `'p-slayer'` / `SEAT_FILE` seats in [`OWN_TOOL_SEATS`](file:///root/GodWorld/scripts/cron-desk-writer.js#L954-L955)) so Grok sees the 7 tools `SEAT.md` describes instead of `RECALL_ONLY`.
3. Decouple W1 `rewardLoop` from `!FREE_ANGLE` (`cron-desk-run.js:2281`) and raise or bypass the `peopleCap` slice on `street` game-watchers in `buildFreeAnglePacket` (`livedExperiencePacket.js:392`) + align `newsroomSourcing.js:292` with `feed_live.json` (splitting comma-joined `TeamsUsed`).
4. Add `"seatEssence": false` to `p-slayer` in [`newsroom-wake-packages.json`](file:///root/GodWorld/scripts/newsroom-wake-packages.json#L229-L285), pass Haiku's `checks` inside `seatPacket()` (`cron-desk-writer.js:1499`), and keep colleague headlines in a background/reference list outside `manifest.approvedFacts` if you don't want their headline numbers widening `allowedNumbers`.
