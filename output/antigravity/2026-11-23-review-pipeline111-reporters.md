# Adversarial Review — `pipeline.111`, six reporters wake as themselves (`77eba5dd1^..acb6583e2`)

Scope: commits `77eba5dd1^..acb6583e2` (plus uncommitted working-tree edits on `scripts/buildEconomySlice.js` [`ECONOMY-SLICE-2`] and `scripts/buildNeighborhoodSlice.js` [`HOOD-SLICE-6`]), plan [`2026-11-21-reporters-wake-as-themselves.md`](file:///root/GodWorld/docs/plans/2026-11-21-reporters-wake-as-themselves.md), per [`2026-11-23-rb-brief-agy-reporters-as-themselves.md`](file:///root/GodWorld/docs/for-claude-review/2026-11-23-rb-brief-agy-reporters-as-themselves.md). Read-only review; checked offline against `output/beats/meta.json` (`cycle: 117`), `output/cron-compare/economy_slice_c117.json`, and 8 offline test suites (no Sheets reads, no model calls, no code edits).

---

## Findings

### 1. W1 `pass: true` crashes W3 (`runWrite`) before the `angle.pass` check
- **Severity:** High
- **Where:** `scripts/cron-desk-run.js:2902-2903`, `scripts/cron-desk-run.js:3063-3077`
- **Failure scenario:** All six `SEAT_FILE` reporters run with `FREE_ANGLE = 'free-rows'`, whose W1 schema invites `pass: true` when nothing on the record is a piece they want to write (`scripts/livedExperiencePacket.js:412`, `:648-652`). When a reporter passes at W1 (`angle.json` carries `"pass": true`), `runReport` (`cron-desk-run.js:2902-2903`) returns early **without writing `packet.json`**. At W3 (`18:15`), `runWrite` executes `requireUnspentArtifact(packetPath, 'packet', 'report', stem)` at `:3065` **before** reading `anglePath` (`:3076`) and checking `if (angle && angle.pass)` (`:3077`).
- **Concrete input → wrong output:** Jordan Velez (`business-desk`) returns `{"pass": true, "why": "..."}` at `06:15` (`runAngle`). At `runReport`, `cron-desk-run.js:2903` logs `[report] business-desk passed the day at the angle stage — nothing to report.` and writes no `business_c117_business-desk_packet-v2_packet.json`. At `18:15` (`runWrite`), `:3065` throws `Error: no packet artifact at output/cron-compare/business_c117_business-desk_packet-v2_packet.json — run --stage=report first`, marking `business-desk` `FAILED` in `fanout-*.write.results.json` and firing the Discord failure alert; `:3077` is unreachable.

---

### 2. `--no-essence` (`seatEssence: false`) injects `"You are an ordinary person, not a writer."` into W1 `REPORTER_WAKE`
- **Severity:** Medium
- **Where:** `scripts/citizenVoice.js:206-210`, `lib/wakePerception.js:161-170`
- **Failure scenario:** In `citizenVoice.js:207-209`, when `--no-essence` is passed (from `ACTIVE_WAKE_PACKAGE.seatEssence === false` via `cron-desk-run.js:2240`) or a seat's voice file has no `## Essence`, `written` is `''`. Line `:208` computes `const station = written ? '' : stationLine(c, !!ownFeed) + ' ';` without checking `REPORTER_WAKE`. `lib/wakePerception.js:167-169` returns `'You are an ordinary person, not a writer.'` (or `'People in this city know your name... You are not a writer.'`).
- **Concrete input → wrong output:** Run `citizenVoice.js --pop=POP-00164 --seat-file=.claude/agents/celeste-tran/SEAT.md --no-essence ...` on a `seatEssence: false` package → W1 system prompt begins `"You are Celeste Tran, ... You are an ordinary person, not a writer. Your temperament: ..."` immediately above `SEAT.md`'s reporter instructions. (Currently no active package sets `seatEssence: false`, so the live six are unaffected until a package uses the switch.)

---

### 3. Working-tree `buildEconomySlice.js` (`ECONOMY-SLICE-2`) breaks `sitsOutWhenEmpty`, and `PEOPLE_CAP = 25` can crowd out casino bettors
- **Severity:** High (empty-record regression in working tree) / Low (people ordering)
- **Where:** `scripts/buildEconomySlice.js:34`, `:85-86`, `:103-144`, `:166` (working tree `ECONOMY-SLICE-2`; `HEAD` `7482c334d` `ECONOMY-SLICE-1` did not have `:85-86`); `scripts/buildEconomySlice.test.js:72`
- **Failure scenario:**
  1. In working-tree `scripts/buildEconomySlice.js:85-86`, `facts.push({ text: 'All ' + rows.length + ' businesses by sector, C' + cycle + ': ' + sectorLine + ' — the rest of the ledger is on Business_Ledger', ... })` runs unconditionally even when `rows.length === 0`. Consequently `facts.length` is always `>= 1`, making `if (!facts.length && !people.length) return K.emptySlice(...)` at `:166` unreachable (`sitsOutWhenEmpty` can never trigger). `scripts/buildEconomySlice.test.js:72` only asserted `econ.sitsOutWhenEmpty === true` without running `buildEconomySlice` on an empty dump.
  2. Working-tree `PEOPLE_CAP` was reduced from `40` to `25` (`:34`), and `Employment_Roster` workers on moved/negative-growth businesses (`:103-108`) are added before `Casino_Ledger` settled/placed wagers (`:133-144`) and `WORK_LINE` citizens (`:164`). On live C117 (`output/cron-compare/economy_slice_c117.json`), `4` casino people fit within `25`; in a cycle with `>= 25` workers at moved/negative-growth businesses, `people` saturates at `25` before reaching any casino bettor, leaving `0` casino bettors in Jordan's W1 `exposure.candidates` / W2 interviews.
- **Concrete input → wrong output:** Call `buildEconomySlice(CYCLE, { root })` on an empty beat dump (`Business_Ledger: []`, `Casino_Ledger: []`, `Neighborhood_Map: []`, `City_Treasury: []`, `LifeHistory_Log: []`, no `world_summary`) → returns `{ empty: false, facts: [{ text: 'All 0 businesses by sector, C117:  — the rest of the ledger is on Business_Ledger', ... }], ... }` instead of `empty: true`, so `seatSitsOut` never sits Jordan out.

---

### 4. `W.enrichAssignment` returning `assign` on empty slice breaks `enrichBeatSeats` drop and re-exposes Maria and Kai to `eveningEnrich`
- **Severity:** Medium
- **Where:** `scripts/beatSliceKit.js:353-357`, `scripts/newsroom-fanout.js:463-469`, `:773-779`, `scripts/buildEveningSlice.js:45-86`, `:1028-1037`
- **Failure scenario:** All six new-mold builders export `W.enrichAssignment` from `beatSliceKit.js:353-357` (`return slice ? assignmentFromSlice(slice, assign) : assign;`). Unlike `buildLivesSlice` and `buildVoicesSlice` (which override `enrichAssignment` to return `null` on empty), `W.enrichAssignment` returns the original `assign` object without `beatSlice: true` when `load()` returns `null`. Downstream in `newsroom-fanout.js`:
  1. `enrichBeatSeats` (`:464`) checks `if (next === null)` to drop empty seats — dead code for these six seats, so the empty seat stays in `fanout-*.json` carrying its raw `desk_signal` seed (`:578`).
  2. For Maria (`maria-keen`) and Kai (`kai-marston`), `buildEveningSlice.js:45-86` (`EVENING_CONSUMERS`) and `isEveningConsumer` (`:1028-1037`) still list both slugs. `newsroom-fanout.js:773-777` guards `eveningEnrich` only on `if (assignments[i].beatSlice) continue;` (not `!BEAT_BUILDERS[assignments[i].persona]`, unlike `economicEnrich` at `:731`). When either seat's beat slice is empty, `assignments[i].beatSlice` is falsy, so `eveningEnrich` attaches `eveningSlice: true`, `EVENING_APPROACH`, and `MARIA_GROUND_BAG.md` / `KAI_ARTS_BAG.md` onto their fanout assignment (and any direct caller of `buildEveningSlice.enrichAssignment` still enriches them).
- **Concrete input → wrong output:** `buildFanout` on a cycle where `buildArtsSlice.load(cycle)` returns `null` → `enrichBeatSeats` keeps Kai with `beatSlice` unset; `eveningEnrich` (`newsroom-fanout.js:777`) rewrites Kai's assignment with `eveningSlice: true, bag: 'arts', approach: 'Evening-life approach ...'`. (At W1 `runAngle`, `seatSitsOut` later skips Kai before `runAngle` uses it.)

---

### 5. `buildTrendsSlice.js` `pulse` voices bypass `PEOPLE_CAP` and `K.isMediaStaff`
- **Severity:** Medium
- **Where:** `scripts/buildTrendsSlice.js:115-120`, `:149-156`, `:203-210`
- **Failure scenario:** `add()` (`:149-156`) enforces `id === SEAT.popid || K.isMediaStaff(profiles, id) || people.some(...) || people.length >= PEOPLE_CAP` (`40`). However, the `pulse` voice loop (`:204-209`) pushes directly to `people` without checking `people.length >= PEOPLE_CAP`, `K.isMediaStaff(profiles, v.popid)`, or `v.popid === SEAT.popid` (relying solely on `buildPulseSlice.js:111`'s `ClockMode === 'MEDIA'` check). Similarly, `talkedAbout` (`:115-119`) pushes directly to `people` without `people.length >= PEOPLE_CAP` or `popid === SEAT.popid` (though `notHers` checks `isMediaStaff` and `people.length <= 3` there).
- **Concrete input → wrong output:** In a cycle where `talkedAbout` (3) + `undocked` (`12`) + `game-night` (`8`) + `shared` (`12`) + multi-popid `talkedAbout` reach `38-40` citizens and `pulse` holds `3` theme voices, `buildTrendsSlice` emits `people.length` up to `43 > PEOPLE_CAP (40)` (all kept at W1 since `buildFreeAnglePacket` slices by `prewrite.peopleCap = 40`). If a citizen in `pulse` has `MED (y/n) = y` without `ClockMode = MEDIA`, `:207` also adds staff to `people`.

---

### 6. Missing `world_summary` / `neighborhood_texture` files silently drop facts in 4 builders; cache/baseline checks
- **Severity:** Low
- **Where:** `scripts/buildNeighborhoodSlice.js:35-37`, `scripts/buildFoodSlice.js:79-80`, `scripts/buildTrendsSlice.js:157-158`, `scripts/buildEconomySlice.js:111-112` (HEAD `:93-94`), vs `scripts/buildLifestyleSlice.js:35-38`; `scripts/beatSliceKit.js:324-330`; `scripts/buildNeighborhoodSlice.js:77-82`; `scripts/buildFoodSlice.js:49-76`; `scripts/buildTrendsSlice.js:129-145`
- **Failure scenario:**
  1. `buildLifestyleSlice.js:37` throws on missing `output/world_summary_c{N}.md`, whereas `buildNeighborhoodSlice.js:37` (`neighborhood_texture_c{N}.md`), `buildFoodSlice.js:80` (`economic-event`), `buildTrendsSlice.js:158` (`Evening Texture`, `City sentiment`, `game-night-texture`), and `buildEconomySlice.js:112` (`economic-event`) check `fs.existsSync(...)` and silently build without those sections when the file is absent.
  2. `W.load` (`beatSliceKit.js:324-330`) returns any non-empty cached JSON whose `version === seat.version`. Version bumps invalidate stale caches (e.g. `ARTS-SLICE-2` on disk vs `ARTS-SLICE-3` in `buildArtsSlice.js`; `FOOD-SLICE-3` vs `FOOD-SLICE-4`), but re-running `dumpBeatTabs.js` or regenerating `world_summary_c{N}.md` on the same cycle without bumping `seat.version` serves the older cached `*_slice_c{N}.json`.
  3. Unlike `buildTrendsSlice.js:59` (`Number(prevCul.vs) === Number(cycle) - 1`), `buildNeighborhoodSlice.js:77-82`, `buildFoodSlice.js:49-76`, `buildEconomySlice.js:60-86`, and `buildTrendsSlice.js:129-145` (`Neighborhood_Demographics`) do not verify `Number(prev.vs) === Number(cycle) - 1` (they label `since C${prev.vs}` / `vs C${prev.vs}`, except `buildEconomySlice.js:85-86` labels `C${cycle}` / `vs prev/`).
- **Concrete input → wrong output:** Run `buildTrendsSlice.buildTrendsSlice(117)` when `output/world_summary_c117.md` is missing → succeeds with `0` Evening Texture TV/movie/streaming/mood/game-night lines instead of failing loud.

---

### 7. Fanout `applyWakePackageGate` re-attaches `approach` in `fanout-*.json`; `sharon-okafor` keeps `EVENING_SLUGS` in `runAngle`
- **Severity:** Low (does not reach W1/W3 LLM prompts in 3-stage mode, but pollutes artifacts)
- **Where:** `scripts/newsroom-fanout.js:258-261`, `:850`; `scripts/cron-desk-run.js:1716-1719`, `:1834-1870`, `:1908`, `:2346-2359`
- **Failure scenario:**
  1. In `newsroom-fanout.js:850`, `applyWakePackageGate` runs **after** `enrichBeatSeats` (`:760`) and overwrites each assignment's `approach` (`''` on the six slices) with `approachFor(approachMap, value.assignment.desk, key)` from `desk-approach-map.json`. In `cron-desk-run.js`, `FREE_ANGLE = 'free-rows'` causes `buildFreeAnglePacket` (`livedExperiencePacket.js:433`) to ignore `approach`, `:2313` nulls `approach` in `angle.json`, and `:3191` (`bareWrite`) passes `approach: null` to W3, so the model does not see it.
  2. `cron-desk-run.js:1716-1719` still includes `'sharon-okafor': 1` in `EVENING_SLUGS`, so `runAngle` executes `:1834-1870` (loading `buildEveningSlice`, writing `eveningSlice` into `angle.json` at `:2346-2359`, and setting `approach` to `EVENING_APPROACH` + `SHARON_LIFESTYLE_BAG.md`, which `:1908` `beatSlice.approach || approach` keeps until `:2313` clears it). Because `selectTypedSlice` (`:1915`) reads `beatSlice` first when non-empty, `buildFreeAnglePacket` sees `buildLifestyleSlice`, not `eveningSlice`.

---

### 8. Minor / edge-case findings in legacy `--wake`, `renderPacketIntake`, `citizenVoice` retry, and `cron-desk-run`
- **Severity:** Low
- **Where & failure scenario:**
  - `scripts/cron-desk-run.js:714-715`, `:3579-3627` (`runWake`): `--wake` never calls `activateWakeContext`, so `SEAT_FILE` stays `null`; invoking `--wake --desk business --persona business-desk` or `--wake --desk culture --persona mason-ortega` still hits `buildLaneState` (`:714-715`) and loads `buildEconomicSlice` plus `STANCE` / bag files. (Live scheduled runs use `--stage=... --fanout`, not `--wake`.)
  - `scripts/cron-desk-run.js:2311` + `scripts/cron-desk-writer.js:507`: `own-pick` sets `story.hood = null`, so `packet.signal.hood` is `null` and `renderPacketIntake` (`:507`) never emits a `HOOD:` line in `## INTAKE`, leaving `sidecar.intake.hoods = []`.
  - `scripts/cron-desk-run.js:3303-3304`: `bareReviewProfile` (`:3941-3944`) strips `articleContract`, so `writePacket.reviewProfile.articleContract` is `undefined` and `.wake.json` records `targetWords: null` instead of `'evidence-bounded'` (`thinCheck` still applies `THIN_WORDS = 150`).
  - `scripts/citizenVoice.js:119-121`: `generate()` retries on `code === 429 || code >= 500` using `Number(j && j.error && j.error.code)` only; if OpenRouter returns HTTP `429`/`5xx` with JSON whose `error.code` is non-numeric or omitted (without failing `r.json()`), `r.status` is not consulted and it breaks without retrying. (Does not double any write: `generate()` runs at `:235` before `:246-324`.)
  - `scripts/cron-desk-writer.js:1589-1631`: if `--seat-file` were ever invoked with `--provider anthropic`, `TOOLS` (`read_file`/`glob`/`grep`/`search_world`/`write_file`) would not match `SEAT.md`'s four OpenRouter tools (`canon_recall`, `canon_search`, `citizen_lookup`, `sheet_read`). All six packages route via `openrouter`.

---

## Checked Clean

- **One switch & W1/W3 prompt isolation (Attack 1 & Attack 4):**
  - `activateWakeContext` (`cron-desk-run.js:190-220`) sets `SEAT_FILE` and `FREE_ANGLE = 'free-rows'` before any read in `runAngle` (`:1660`), `runReport` (`:2886`), and `runWrite` (`:3056`).
  - `cron-desk-run.js:2198` skips the reward-loop `"Plan this one so it does what the contract asks"` line when `FREE_ANGLE` is set.
  - `cron-desk-writer.js:255-259`, `:467`, `:1358-1367`, `:1454-1467`, `:1536`, `:1563`: `TEST_SEAT` sends only `whoBlock + TEST_SEAT_BOOT` + filing line as `system`, `'Cycle ' + cycle + '.\n\n' + seatPacket()` as `user`, suppresses `rubricBlock` (`TEST_LIGHT`), `firebrandHeat`, `SEAT_TOOL_FRAMES`, `SKILL`/`IDENTITY`/`LENS`/`RULES`, and exposes `OPENROUTER_TOOLS.concat([CANON_RECALL_TOOL])` (with `'Cultural_Ledger'` added to `SHEET_READ_ALLOWLIST` at `:810`).
  - `seatPacket()` (`cron-desk-writer.js:1454-1466`) trims only an in-memory copy for `kickoff`; `stateFile` on disk retains the full `writePacket`, and `cron-rhea-gate.js:428-436` passes that full on-disk `packet` to `livedExperiencePacketV2.auditArticle`. `auditArticle` (`livedExperiencePacketV2.js:765-848`) passes identically (`errors: []`, lexical `observations` deferred to Rhea).
- **Jordan & Mason off `buildEconomicSlice` in 3-stage/fanout (Attack 2):**
  - `newsroom-fanout.js:731` (`if (!isBusinessDesk(assignments[i]) || BEAT_BUILDERS[assignments[i].persona]) continue;`) and `cron-desk-run.js:1822, 1826, 2045` (`!BEAT_BUILDERS[personaSlug]`) skip `buildEconomicSlice` for both `business-desk` and `mason-ortega`.
  - Jordan's Monday C117 path verified offline (`economy_slice_c117.json` -> `activateWakeContext` -> `newsroomSourcing.buildPool` -> `buildAnglePacket` -> `buildWritePacket({ bare: true })` -> `auditArticle`): `25` candidates, `69` W1 `known` claims, `0` `approach`/`roomIsYours` leakage.
- **Morning plan & busy-provider retry (Attack 3):**
  - `cron-desk-run.js` passes `--seat-file` only on W1 (`:2239`), never on W2 (`:577`), W3 (`:3131`), or `--record-text` (`:3494`, `:3508`, `:3704`).
  - `citizenVoice.js:104-133` (`generate()`) retries `429`/`>= 500` inside `generate()` before returning to `voiceOne` (`:235`), so `:246-324` (page write, tension register, `Reflection_Intake` append) executes at most once and never on failure.
- **Contract grade without `opening`/`voice`/`closing` (Attack 6):**
  - `cron-rhea-gate.js:349` forces `opened: true` when `articleContract.opening` is absent (`3/3` max); `cron-rhea-gate.js:442` falls back to `wakePackage.reviewProfile` when `bareReviewProfile` stripped `articleContract` from `packet.reviewProfile`. `buildContractPrompt` (`:329-330`), `cronFeedback.js:100-104`, `cron-saturday-run.js:139-151`, and `livedExperiencePacketV2.js:244` handle omitted `opening`/`voice`/`closing` without error (note `cronFeedback.js:101-103` still counts `opened: true` in `the opening` denominator `of`).
- **Package validator & Maria/Kai `buildLaneState` (Attack 7 & Attack 8):**
  - `newsroomWakePackages.js:66-72` validates `seatFile` path and existence and restricts `seatEssence` to `false` on `seatFile` seats.
  - `cron-desk-run.js:1005-1006` and `:1716-1719` (`EVENING_SLUGS`) hold only `sharon-okafor`.
- **Offline tests run:** All 8 offline suites run against current disk state passed (`newsroomWakePackages.test.js`, `beatSlices.test.js`, `buildEconomySlice.test.js`, `cronDeskFanoutHandoff.test.js`, `cronRheaPersonaGate.test.js`, `newsroom-fanout-beat-stale.test.js`, `livedExperiencePacketV2.test.js`, `cron-desk-writer.test.js`).

---

Verdict: HOLD
