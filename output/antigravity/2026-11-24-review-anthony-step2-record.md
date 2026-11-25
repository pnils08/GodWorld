# Adversarial Review — Anthony Raines Step 2 (Live Sports Feed Record)

**Reviewer:** Antigravity (`agy`) · **Date:** 2026-11-24 · **Brief:** [2026-11-24-rb-brief-agy-anthony-step2-record.md](file:///root/GodWorld/docs/for-claude-review/2026-11-24-rb-brief-agy-anthony-step2-record.md) · **Commit reviewed:** `d69ac547c` ([sportsFeedLive.js](file:///root/GodWorld/scripts/sportsFeedLive.js), [buildAnthonyRecord.js](file:///root/GodWorld/scripts/buildAnthonyRecord.js), [beatSliceKit.js](file:///root/GodWorld/scripts/beatSliceKit.js), [newsroom-fanout.js](file:///root/GodWorld/scripts/newsroom-fanout.js)) · **Code edits:** none (read-only)

**Verdict: HOLD**

The record design cleanly drops `buildAnthonySlice.js`'s scoring, claim-writing, and method-picking, and `sportsFeedLive.js` stripped the three private `question` rows (`285`, `287`, `288`) from `output/sports/feed_live.json` today. However, **two HIGH blockers** break data integrity before Step 4 wires Anthony to this record: `buildFreeAnglePacket` truncates 9 of his 10 feed rows at 500 characters—completely amputating every `| Stats:` line from both W1 and W3—and `sportsFeedLive.refresh()` fails open on a missing/renamed `EventTrigger` column while keeping stale prior-Cycle copies across failed refreshes.

---

## Findings

### 1. [HIGH] `buildFreeAnglePacket` clips every feed row at 500 chars — stripping `| Stats:` from 9 of 10 C117 rows before W1 and W3

- **Locations:**
  - `scripts/buildAnthonyRecord.js:31-39, 46` (`rowText` places `| Stats:` at the end of `Notes`)
  - `scripts/livedExperiencePacket.js:377, 381` (`buildFreeAnglePacket`: `clean(fact, 500)`)
  - `scripts/livedExperiencePacket.js:992` (`buildWritePacket` copies `known` from `angleInput.known`)
  - `output/cron-compare/anthony_record_slice_c117.json:37-75`
- **Failure scenario:**
  `rowText(r)` builds `<Cycle> (<SeasonType>) · <EventType> · <NamesUsed>: <Notes> | Stats: <Stats> | ...`. In `anthony_record_slice_c117.json`, 9 of 10 rows are 582–2,600 chars long, and `| Stats:` begins at char 543–2,410 (8 rows have `| Stats:` past char 1,480). When Step 4 puts `anthony-raines` on `SEAT_FILE` (`FREE_ANGLE = 'free-rows'`, `cron-desk-run.js:217, 2269`), `buildFreeAnglePacket` (`livedExperiencePacket.js:377`) truncates every `anchorFact` via `clean(fact, 500)` (compare `free.week` at `:384`, which uses `2000`), and `buildWritePacket` (`:992`) carries those clipped facts into W3 `manifest.approvedFacts`.
  `input` (C117 `anthony_record_slice_c117.json` enters `buildAnglePacket`) → **9 of 10 A's rows are cut mid-sentence at char 500, and all `| Stats:` lines on those 9 rows never reach W1 or W3's Packet.**
  *(Secondary filter hazard at `livedExperiencePacket.js:379`: any feed row whose `Notes` contains `do not|never` + `invent|lead|print|publish|assert|name|use` is silently skipped from `known`.)*

---

### 2. [HIGH] Privacy fails open if `EventTrigger` header is missing, shifted, or differently cased

- **Locations:**
  - `scripts/sportsFeedLive.js:27-32` (`head.indexOf('EventTrigger')`)
  - `lib/feedPrivacy.js:19-23` (`isPrivateFeedRow(row, iTrigger)`)
- **Failure scenario:**
  `sportsFeedLive.js:28` finds `EventTrigger` via exact, case-sensitive `head.indexOf('EventTrigger')` and never checks `it < 0`. Inside `lib/feedPrivacy.js:21`, `Array.isArray(row) ? (iTrigger >= 0 ? row[iTrigger] : '') : ...` returns `''` whenever `iTrigger < 0`, so `isPrivateFeedRow` returns `false`.
  `input` (`Oakland_Sports_Feed` header row has `eventTrigger`, `Event Trigger`, or a shifted/missing `EventTrigger` column while rows contain `EventTrigger = "question"`) → `it === -1` → `isPrivateFeedRow` returns `false` for every row → **every private builder `question` row is written to `output/sports/feed_live.json` and handed to Anthony as a public A's row.**

---

### 3. [HIGH] A failed 06:15 refresh leaves an older Cycle's `feed_live.json` on disk, and `[cycle-1, cycle+1]` still passes it

- **Locations:**
  - `scripts/sportsFeedLive.js:37` (`out = { readAt, rows }` — no `cycle` field)
  - `scripts/newsroom-fanout.js:766-768` (catches `refresh()` error and proceeds with last copy)
  - `scripts/buildAnthonyRecord.js:42-47` (`Number(r.Cycle) >= Number(cycle) - 1 && Number(r.Cycle) <= Number(cycle) + 1`, no `readAt` staleness check)
- **Failure scenario:**
  `feed_live.json` carries `readAt` only (`sportsFeedLive.js:37`), and `buildAnthonyRecord.js:44` accepts `Cycle` in `[cycle - 1, cycle + 1]` without checking when `feed_live.json` was read or which Cycle it belonged to.
  `input` (C117's `feed_live.json` sits on disk from last week; Sunday advances the engine to C118; Monday 06:15 `sportsFeedLive.refresh()` throws on a Sheets 429 or network error and is caught at `newsroom-fanout.js:767`) → `buildAnthonyRecord(118)` sees `C117 >= 118 - 1`, treats last week's stale C117 copy as live C118 material (`empty: false`, old `readAt`), and `fanout-YYYY-MM-DD.json` records nothing in its JSON payload (`:865-883`) showing that the refresh failed.

---

### 4. [MEDIUM] `seat.live` rebuilds on every `load(cycle)` across W1, W2, and W3, mutating disk slices mid-day and breaking `testReporterDay.sh` replay isolation

- **Locations:**
  - `scripts/buildAnthonyRecord.js:22` (`live: true`)
  - `scripts/beatSliceKit.js:304, 324-331` (`load(cycle, root = ROOT)`)
  - `scripts/cron-desk-run.js:1672-1675, 1743, 1952, 1981, 2975, 3146` (`seatSitsOut` and `runAngle` call `loadSlice(cycle)`)
  - `scripts/testReporterDay.sh:91` (copies `*_slice_c${CYCLE}.*` into `$SHELL_DIR/`)
- **Failure scenario:**
  Once Anthony is in `BEAT_BUILDERS`, `loadSlice(cycle)` runs in `enrichAssignment` (06:15), W1 `seatSitsOut` + `runAngle` (06:15), W2 `seatSitsOut` (13:15), and W3 `seatSitsOut` (18:15). Because `seat.live: true` bypasses the cache at `beatSliceKit.js:327` and `load(cycle)` defaults `root` to `ROOT` (`:324`):
  1. `input` (someone runs `node scripts/sportsFeedLive.js` or next day's 06:15 fanout refreshes `feed_live.json` before a delayed/replayed `--date` W2 or W3 run) → `seatSitsOut` in W2 (`:2975`) or W3 (`:3146`) evaluates a different `feed_live.json` than W1 planned on and overwrites `output/cron-compare/anthony_record_slice_c{N}.json` and `output/slices/c{N}/anthony-raines.md`.
  2. `input` (`scripts/testReporterDay.sh sports anthony-raines 117 free-rows` copies C117's slice into `$SHELL_DIR/` to test an archived cycle) → `loadSlice(117)` ignores `$SHELL_DIR/` and rebuilds from `ROOT/output/sports/feed_live.json`, overwriting `ROOT/output/slices/c117/anthony-raines.md` and `ROOT/output/cron-compare/anthony_record_slice_c117.json`.
  *(Note for Step 4: `newsroom-fanout.js:649-682` still runs `buildAnthonySlice.js` before `enrichBeatSeats` at `:768`; Step 4 must skip `:650` when `BEAT_BUILDERS['anthony-raines']` is set, as `:735` and `:785` already do.)*

---

### 5. [MEDIUM] Window edge cases: `ref` omits `cycle+1` when a next-Cycle row enters, and `Number('') === 0` admits blank `Cycle` at `cycle === 1`

- **Locations:**
  - `scripts/buildAnthonyRecord.js:29, 44-50`
  - `scripts/newsroom-fanout.js:50, 175-195, 519-520`
  - `lib/getCurrentCycle.js:34-40, 86-93`
- **Verified behavior & edges:**
  - **Monday 06:15 cycle & mid-week `cycle+1`:** `newsroom-fanout.js:520` resolves `cycle` via `getCurrentCycle` (`freshestWorldSummaryCycle`), so Monday 06:15 after a Sunday fire passes the new `cycle` (e.g. `118`), giving window `[117, 119]`. A mid-week row stamped with the next Cycle (`cycle + 1`) lands in the window (`r.Cycle <= cycle + 1`), and `ref` includes `'through row ' + newest`, so a new row changes `ref` and clears `staleBeatRef` (`newsroom-fanout.js:191-195`) on a same-cycle rebuild.
  - **Mislabeled `ref` / empty reason (`buildAnthonyRecord.js:47, 50`):** When a `cycle + 1` row is matched by `:44`, `ref` (`:50`) and `POINTERS` (`anthony-raines.md:36`) still hard-code `'C' + (cycle - 1) + '–C' + cycle'`, dropping `cycle + 1` from the label.
  - **Blank / non-numeric `Cycle` (`buildAnthonyRecord.js:44`):** `Number('') === 0` (not `NaN`). For `cycle >= 2`, blank `Cycle` fails `0 >= cycle - 1`; for `cycle === 1` (e.g. unit test fixtures), blank `Cycle` A's rows pass `0 >= 0 && 0 <= 2`. Non-numeric strings like `"C117"` evaluate to `NaN` and are silently excluded.
  - **`TeamsUsed` regex (`buildAnthonyRecord.js:29`):** Verified against all 292 rows in `output/beats/Oakland_Sports_Feed.jsonl` and all 287 public rows in `output/sports/feed_live.json`: `/\bA['’]s\b|athletics/i` matches all 221 `"A's"` rows and 0 non-A's rows (`"Oaks"` 62, `"NBA"` 3, `""` 1 NBA expansion). *(Note: `"As"` without an apostrophe would not match.)*
  - *(Minor: `buildAnthonyRecord.js:45` slices UTC `feed.readAt.slice(0, 10)` rather than `centralDate()`, stamping `read 2026-11-25` in `anthony-raines.md:10` on the night of `2026-11-24` Central.)*

---

### 6. [MEDIUM] `beatSliceKit` and `livedExperiencePacketV2` still inject `"paint unnamed people in the room"` and conflict with `SEAT.md`

- **Locations:**
  - `scripts/beatSliceKit.js:22-31, 222, 229, 267-268, 281-293` (`FACTS_TAIL`, `FORBIDDEN`, `formatMarkdown`)
  - `scripts/livedExperiencePacketV2.js:382, 394` (`packet.limits.rule`)
  - `output/slices/c117/anthony-raines.md:21-38`
  - `.claude/agents/anthony-raines/SEAT.md:3, 16`
- **Failure scenario:**
  Even though `buildAnthonyRecord.js:24-25` sets `approach: ''` and `roomIsYours: ''`, and `cron-desk-run.js:3281` / `livedExperiencePacketV2.js:414-415` strip `task.approach` and `roomIsYours` under `bareWrite`:
  1. `beatSliceKit.js:222, 268, 285, 288, 293` still writes `FACTS_TAIL` (`"Everything else about this beat — what it looks like, who is there, what they want and hate — is yours to paint"`), `"_none named on this beat this cycle — the people in the room are yours to paint, unnamed_"`, and `FORBIDDEN[0]` (`"Do not invent a ... number that is not on this slice"`) into `anthony_record_slice_c{N}.json` and `anthony-raines.md`. That contradicts [SEAT.md:3, 16](file:///root/GodWorld/.claude/agents/anthony-raines/SEAT.md#L3) (no citizen quoting; derived rates and `dossier_read` / `sheet_read` / `ask_worker(GRIDIRON)` numbers are allowed) and would reach the prompt on any non-packet / `buildLaneState` (`cron-desk-run.js:955-983`) path.
  2. In W3, `livedExperiencePacketV2.js:382, 394` still sends `packet.limits.rule` telling the writer `"Everything else — the scene, the street, the weather in the room, unnamed people and what they say... is yours to invent; that colour is the job"` and `"Unnamed voices are yours"`, pulling a records-only seat toward invented unnamed fan/clubhouse dialogue.

---

### 7. [LOW] `sportsFeedLive.refresh()` runs Mon–Fri inside `buildFanout` with no request timeout and no status field in `fanout-*.json`

- **Locations:**
  - `scripts/newsroom-fanout.js:766-768, 865-883`
  - `lib/sheets.js:49-59` (`getSheetData`)
  - `scripts/beatSliceKit.js:327`
- **Detail:**
  - **Other seats:** Grep confirms `buildAnthonyRecord.js:22` is the only builder with `live: true`; `beatSliceKit.js:327` leaves every other seat's caching unchanged.
  - **Morning budget & quota error at 06:15:** `newsroom-fanout.js:766` runs on all 5 weekdays (even Tue–Fri when `anthony-raines` is not on `WEEK_GRID`, `:50-55`). A 429 quota error or quick exception is caught at `:767` and does not fail `buildFanout` or any other seat (`buildBylineRoster()` at `:502` already reads Sheets). However, `lib/sheets.js:49-59` has no request timeout and `:766` has no `Promise.race` budget (contrast `refreshCitizenPages` at `cron-desk-run.js:1617`, `budgetMs: 120000`): a stalled Sheets socket at 06:15 hangs the entire morning rota, and a caught failure is logged to stderr only with no status field saved in `fanout-YYYY-MM-DD.json`.
