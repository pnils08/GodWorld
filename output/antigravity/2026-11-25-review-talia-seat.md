# Adversarial Review — Talia Finch on Her Seat File (`84839ec34`)

- **Reviewer:** Antigravity (`agy`)
- **Date:** 2026-11-25
- **Brief:** `docs/for-claude-review/2026-11-25-rb-brief-agy-talia-seat.md`
- **Commit reviewed:** `84839ec34` (`pipeline.111 Task 34: Talia Finch on her seat file`), compared against P Slayer (`602e52a9d`, `66ff03dc7`)
- **Files inspected:** `.claude/agents/talia-finch/{SEAT,IDENTITY,LENS,RULES,SKILL}.md`, `docs/media/voices/talia_finch.md`, `scripts/buildTaliaRecord.js`, `scripts/buildPSlayerRecord.js`, `scripts/buildOaksGroundSlice.js`, `scripts/sportsRecord.js`, `scripts/sportsFeedLive.js`, `lib/feedPrivacy.js`, `scripts/beatSliceKit.js`, `scripts/sportsSubstrate.js`, `scripts/newsroomSourcing.js`, `scripts/newsroomWakePackages.js`, `scripts/newsroom-wake-packages.json`, `scripts/newsroom-fanout.js`, `scripts/cron-desk-run.js`, `scripts/cron-desk-writer.js`, `scripts/workerAsk.js`, `scripts/gridiron.js`, `scripts/reporterIdentity.js`, `scripts/desk-approach-map.json`, `scripts/persona-map.json`, `lib/mags.js`, `output/simulation_ledger_snapshot.jsonl` (`POP-00592`), `output/sports/feed_live.json`, `archive/ARTICLE_INDEX.jsonl`, `archive/articles/c43_chicago_midnight-the-bar-had_chicago-sports-branch-cycle-43-coverage.txt`, `archive/editions/THE CYCLE PULSE _ EDITION 76 JUNE _ WEEK 3 _ JUNETEENTH.txt`, `editions/cycle_pulse_edition_{83,84,85,86,87,89,90}.txt`
- **Verdict:** **SHIP-WITH-FIXES**

---

## Findings

### 1. [MEDIUM] `docs/media/voices/talia_finch.md` (`## Essence`) still injects `"not in the arena"` / `"no fans yet"` ahead of `SEAT.md` at W1 and W3

- **Where:** `scripts/newsroom-wake-packages.json:1298-1355` (`talia-finch`), `docs/media/voices/talia_finch.md:5-7`, `.claude/agents/talia-finch/SEAT.md:3`, `scripts/reporterIdentity.js:25-36, 80-94`, `scripts/cron-desk-run.js:1708-1710`, `scripts/cron-desk-writer.js:1408, 1414`
- **What is wrong:** `talia-finch` (`TALIA-OAKS-2`) omits `"seatEssence": false`. Because `.claude/agents/talia-finch/LENS.md:7`, `RULES.md:13`, and `SKILL.md:14` still point to `docs/media/voices/talia_finch.md`, both `seatMorningPlan` (`cron-desk-run.js:1708-1710`) and `cron-desk-writer.js:1408, 1414` prepend `voices/talia_finch.md` `## Essence` to `whoBlock` ahead of `SEAT.md`:
  > `"Covers the Oaks the way Maria Keen covers Oakland — block by block, face by face. An expansion team has no fans yet, only people deciding whether to become fans, and that decision happens in bars and on BART platforms, not in the arena. She's the one there when it happens. First-person observer, physically present in every piece."`
  The `"not in the arena"` rule directly narrows `SEAT.md:3` (`"which story is yours, where you go and who you talk to is yours"`), and `"An expansion team has no fans yet"` repeats a stale C103 premise. (Same omitted-`seatEssence` path noted on P Slayer; here `voices/talia_finch.md` adds an explicit location ban.)

---

### 2. [MEDIUM] `beatSliceKit.enrichAssignment` returns `assign` instead of `null` on an empty slice, keeping `talia-finch` in `fanout.json` with a generic sports seed on an Oaks-quiet week

- **Where:** `scripts/beatSliceKit.js:357-361`, `scripts/buildTaliaRecord.js:27-31`, `scripts/newsroom-fanout.js:469-475, 582-586`, `scripts/cron-desk-run.js:1684-1690`
- **What is wrong:** In `buildFanout` (`newsroom-fanout.js:582-586`), `talia-finch` shifts a seed from `lanes.sports` (typically an A's story) before `enrichBeatSeats` runs. When `buildTaliaRecord` returns `{ empty: true }` (verified locally on C125: `{ empty: true, reason: 'no row for the Oaks on the sports feed for C124–C125' }`), `load()` returns `null`, and `beatSliceKit.js:360` returns `assign` unchanged rather than `null` (verified locally: `enrichAssignment({ persona: 'talia-finch' }, 125, root)` returns `{ persona: 'talia-finch' }`). `newsroom-fanout.js:470` (`if (next === null)`) therefore does not drop her from `assignments`, leaving her in `fanout.json` with the generic `lanes.sports` seed. At wake time, `cron-desk-run.js:1684-1690` (`seatSitsOut`) checks `mod.sitsOutWhenEmpty === true && !mod.loadSlice(cycle)` and sits her out at angle, report, and write, so she will not file on the A's seed — only the fanout manifest still carries her as assigned instead of dropped. (Shared with `buildPSlayerRecord` and `buildAnthonyRecord`.)

---

### 3. [LOW] `scripts/sportsSubstrate.js:421` (`DELIVERY_WRITERS`) still names `oaks_ground_slice_c{N}.json`

- **Where:** `scripts/sportsSubstrate.js:421`, `scripts/buildTaliaRecord.js:10, 18`
- **What is wrong:** `buildTaliaRecord.js` writes `output/cron-compare/talia_record_slice_c{N}.json` (`artifact: 'talia_record'`), while `sportsSubstrate.js:421` still checks `'cron-compare/oaks_ground_slice_c{N}.json'` (same stale slice filename pattern as `'P Slayer'` at `:417` and `'Anthony Raines'` at `:415`). `slices/c{N}/talia-finch.md` and `sports_c{N}_talia-finch_packet-v2_packet.json` still match.

---

### 4. [LOW] Shared `newsroomSourcing.js` and `gridiron.js` routing quirks on Talia's path

- **Where:** `scripts/newsroomSourcing.js:298-305`, `scripts/gridiron.js:185, 206, 210, 218`, `scripts/cron-desk-writer.js:823-825, 899`
- **What is wrong:**
  1. `newsroomSourcing.js:300` reads `rows(root, 'Oakland_Sports_Feed')` (`output/beats/Oakland_Sports_Feed.jsonl`) rather than `output/sports/feed_live.json` (same as P Slayer at `:292`). If a live mid-week Oaks row introduces a new `TeamsUsed` string before `dumpBeatTabs` runs, `newsroomSourcing` will not derive a `watch` highlight for it. (`Oaks` already exists in the beats file, so C117 works.)
  2. `gridiron.js:218` checks `['GIA-RECORD', 'GIA-ROSTER', 'GIA-OAKS']` in order. Any `ask_worker(GRIDIRON, ...)` question that asks about Oaks coverage using words matching `GIA-RECORD` (`printed|published|wrote|written|article|column|piece|headline|byline|covered|coverage`, `:206`) routes to `GIA-RECORD` (Christine Nakamura, whose `printedRecord` at `:185` excludes `/chicago|skyline|bulls/i`) instead of `GIA-OAKS` (Jade Soy). Questions about the Oaks' roster, games, or stats without those print keywords route to Jade Soy.
  3. Shared `sheet_read` (`cron-desk-writer.js:823-825, 899`) exposes 12 allowlisted tabs (plus `Cultural_Ledger` on `TEST_SEAT`) while `SEAT.md:27` names the 3 beat-relevant tabs (`Oakland_Sports_Feed`, `Business_Ledger`, `Neighborhood_Map`); harmless shared schema.

*(Note: Shared `seatFile` / `FREE_ANGLE` / `ownLifeInterviewPacket` / `contractScore` findings affecting all seat-file seats are documented separately in `output/antigravity/2026-11-25-review-interview-restriction-out.md`.)*

---

## Verified Clean Against Remaining Brief Checks

1. **Puppeting (Attack 1):**
   - `.claude/agents/talia-finch/SEAT.md` contains no forced story, opening, or closing; her seven craft ways (`The Same Room`, `The Regulars`, `The Unsaid Question`, `The Object`, `What You Count`, `Keeping a Name Out`, `Your Camera`) are explicitly `"used as the story asks"`, and `"which story is yours, where you go and who you talk to is yours"`.
   - `cron-desk-run.js:937-939` (`STANCE: Oaks ground...`) is inside `buildLaneState`, which runs only when `!PACKET_ACTIVE` (`:3325-3327`).
   - `scripts/desk-approach-map.json:12` is overwritten by `buildTaliaRecord.enrichAssignment` (`beatSliceKit.js:348`), omitted at W1 (`buildFreeAnglePacket`), and nulled at W3 (`bareWrite`, `cron-desk-run.js:3301`).
   - `scripts/persona-map.json:158` (`note`) is never injected into prompts.
   - `cron-desk-writer.js:1414-1415` (`TEST_SEAT`) bypasses `IDENTITY`/`LENS`/`RULES`, `firebrandHeat`, `cascadeRateRule`, `TYPED PACKET OUTPUT CONTRACT`, `SEAT_TOOL_FRAMES`, `RECALL_BLOCK`, and `rubricBlock`; `seatPacket()` (`:1502-1514`) strips `reviewProfile`, `limits`, `signal.plan`, `excludedLeads`, and `manifest` policy keys.
   - `BEAT_BUILDERS['talia-finch'] = 'buildTaliaRecord'` (`cron-desk-run.js:80`, `newsroom-fanout.js:452`) bypasses `buildOaksGroundSlice.js`.

2. **Canon conflicts (Attack 2):**
   - `SEAT.md:1` matches `POP-00592` `CitizenBio` in `output/simulation_ledger_snapshot.jsonl` verbatim (with `"Sports, Bay Tribune. "` prepended). `POP-00592` is `Status: "Active"`, `Neighborhood: "Jack London"`, `Tier: "4"`, `MaritalStatus: "single"`, `OrginCity: "Chicago"`, `RoleType: "Journalist - The Oakland Oaks Ground Reporter"`.
   - Archive verified: `"nightlife and fan energy"` at Chicago bureau matches C43 (`archive/articles/c43_chicago_midnight-the-bar-had_chicago-sports-branch-cycle-43-coverage.txt:113`); `"Romano's on 35th"`, `"Calhoun's Tap"`, `"tamale truck at 35th and Halsted"` appear across C83–C90 (`editions/cycle_pulse_edition_{83..90}.txt`); `"Wrote Adash Stanley as a nineteen-year-old in Chicago before he was an Oaks player"` matches C76 (`archive/editions/THE CYCLE PULSE _ EDITION 76 JUNE _ WEEK 3 _ JUNETEENTH.txt:217-227`); relocation to Oakland for the expansion Oaks matches C106–C116 in `archive/ARTICLE_INDEX.jsonl`.

3. **Tools (Attack 3):**
   - All six tools named in `SEAT.md:22-28` (`citizen_lookup`, `memory_recall`, `canon_recall`, `canon_search`, `sheet_read` for `Oakland_Sports_Feed`/`Business_Ledger`/`Neighborhood_Map`, `ask_worker` including `GRIDIRON`) are bound and executed at both W1 (`seatMorningPlan`, `cron-desk-run.js:1705-1736`) and W3 (`cron-desk-writer.js:823-825, 960, 1011-1027, 1584-1587, 1618-1622`; `newsroomWakePackages.js:15`; `cron-desk-run.js:3348, 3358-3365`). `dossier_read` (`seatDossier`) is neither named in `SEAT.md` nor bound in her toolset. `lib/mags.js` `searchDisk` (`canon_search`) ranks `editions/` and `archive/articles/` at tier 1.

4. **Wiring parity vs P Slayer (Attack 4):**
   - `WEEK_GRID[4]` (`newsroom-fanout.js:53`), `BEAT_BUILDERS` (`cron-desk-run.js:80`, `newsroom-fanout.js:452`), `BEAT_NAME_RE` (`cron-desk-run.js:86`), `beatSlugForName` (`cron-desk-run.js:106`), `WRITER_TOOLS_SEATS` (`newsroomWakePackages.js:15`), `OWN_TOOL_SEATS` (`cron-desk-writer.js:960`), `newsroomSourcing.js:298-305` (`/on the sports feed/`), `sitsOutWhenEmpty = true` (`buildTaliaRecord.js:27`), `roomIsYours: ''` (`buildTaliaRecord.js:22`), and `--cycle` forwarding in `buildWriterArgs` (`cron-desk-run.js:1447-1459`) are all wired. `seatDossier` is intentionally omitted (Oaks have no team cards in `gridiron.js`).

5. **The record (`buildTaliaRecord(117)`) (Attack 5):**
   - Verified locally against `output/sports/feed_live.json` (`288` public rows; `sportsFeedLive.js:33` strips private `EventTrigger === 'question'` rows via `lib/feedPrivacy.js`): `buildTaliaRecord(117)` returns `empty: false`, `11` facts (`2` C117 colleagues' staged headlines — Anthony Raines and Selena Grant — plus all `9` public Oaks rows across C116 rows 279–286 and C117 rows 292–295), and `8` resolved Oaks players/coaches/execs (`POP-00592` and Tribune staff excluded; unresolvable names skipped). `newsroomSourcing.buildPool` returns `21` candidates (`8` `slice-row` + `13` `page-line`, all within `peopleCap: 25`).

6. **Gate profile (`talia-finch-oaks-v2`) (Attack 6):**
   - `newsroom-wake-packages.json:1326-1349` removes `voice`/`opening`/`closing` from `articleContract`, clears `textureConditions: []`, and drops the non-fact `Chicago` and `the A's as the subject` blockers. Remaining `canonBlockers` are fact/canon checks (real-world imports, unsupported roster/game events, unsupported stats/numbers/salaries, fabricated player/coach/FO quotes, invented citizen lives for feed-only NBA names, collective fan sentiment as measured fact). Removing `engine or simulation vocabulary; real-world calendar dates (YYYY-MM-DD)` matches P Slayer's v2 profile (`cron-rhea-gate.js:208` still scans `"simulation"`/`"simulated"` deterministically).

- **Local tests run and passed:** `scripts/newsroomWakePackages.test.js`, `scripts/newsroomSourcing.test.js`, `scripts/beatSlices.test.js`.
