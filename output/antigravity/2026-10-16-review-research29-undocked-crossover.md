# Adversarial Plan Review: `2026-10-16-undocked-crossover-the-city-knows-its-pilots`

**Plan under review:** `docs/plans/2026-10-16-undocked-crossover-the-city-knows-its-pilots.md`
**Task spec:** `output/antigravity/2026-10-16-research29-undocked-crossover-plan-review-TASK.md`
**Reviewer:** Antigravity (`antigravity`, read-only audit against `HEAD` `f16f8971`)

---

## Hunt 1 — Move 1 packet & credit path (`buildNiaSlice.js` -> `cron-desk-run.js` -> `cron-desk-writer.js`)

**Gate: `FIX`**

### Findings

1. **500-char hard truncation in `livedExperiencePacket.js` drops `Who is in the chair:` and `WHO_RULE` before W1 and W3 (`scripts/livedExperiencePacket.js:17-20, 416, 876`):**
   - Both `buildAnglePacket` (`scripts/livedExperiencePacket.js:416`) and `buildWritePacket` (`scripts/livedExperiencePacket.js:876`) set `task.assignment = clean(story.angle || story.label, 500)`, where `clean(s, maxLen = 220)` (`:17-20`) hard-slices the string at `500` characters (`t.slice(0, maxLen - 1).trimEnd() + '…'`).
   - `buildNiaSlice.js` appends `' Who is in the chair: ' + who + '.' + WHO_RULE` to the **end** of `handle.angle` on the daily path (`scripts/buildNiaSlice.js:171-180`) and to the **end** of `story.angle` on the weekly path (`scripts/buildNiaSlice.js:241-247`).
   - **Weekly (`nia-rook-weekly`):** In `buildNiaWeeklySlice` (`scripts/buildNiaSlice.js:241-247`), the prefix before `' Who is in the chair: '` (`UNDOCKED week-in-review through Cycle …` + `standingsNote(leader)` + `Per-pilot facts: …` across 3 pilots) is already **~458 chars** (verified against `output/cron-compare/undocked-digest_c110_nia-rook-weekly_packet-v2_angle.json:18`). Appending 3 pilots' `who` strings (up to 3 × 220 chars of `careerLinesFor` for Eric Taveras alone, `:119`) plus `WHO_RULE` (115 chars, `:126-127`) pushes `story.angle` to **~950–1,250 chars**. `clean(..., 500)` cuts `task.assignment` at char 500 — **dropping almost all of `Who is in the chair:` (including Eric Taveras's career lines and `WHO_RULE`) before W1 or W3 ever sees it.**
   - **Daily (`nia-rook`):** Even on the single-pilot daily path (`laneEntryFor`, `scripts/buildNiaSlice.js:171-180`), the prefix before `' Who is in the chair: '` is **~313 chars** (`output/cron-compare/undocked_c111_nia-rook_packet-v2_angle.json:18`), leaving only ~187 chars before the 500-char cliff — truncating any pilot with 2–3 `careerLinesFor` entries (each up to 220 chars, `:119`) and cutting off `WHO_RULE` completely.

2. **`packet.known` and `manifest.approvedFacts` never receive `story.angle`, `pilots[].who`, or `story.citizens` (`scripts/livedExperiencePacket.js:356-358, 771, 861`; `scripts/livedExperiencePacketV2.js:322-349`; `scripts/newsroomSourcing.js:79-90`):**
   - Both `nia-rook` (`scripts/newsroomWakePackages.js:24-36`) and `nia-rook-weekly` (`:73-85`) run with `packetContract: 'v2'` (`PACKET_ACTIVE === true` at `scripts/cron-desk-run.js:1803`). Under `PACKET_ACTIVE`, W3 (`scripts/cron-desk-writer.js:1184, 1272-1368`) runs with `--packet-only` (`scripts/cron-desk-run.js:2930`) and `stateFile = writePacket` JSON (`:2895-2910`), bypassing the legacy non-packet `.state.md` builder (`buildLaneState`, `scripts/cron-desk-writer.js:1060-1110`, which was the only place that rendered `s.citizens` and full `s.angle` into a state file).
   - In `buildAnglePacket` (`scripts/livedExperiencePacket.js:356-358`), `known` is seeded with `refClaim('FACT', story.label || story.angle, src)`. Because `story.label` is always non-empty on both daily (`scripts/buildNiaSlice.js:162-167`) and weekly (`:256`), `story.angle` is **never** added to `packet.known`. Nor does `selectTypedSlice` (`scripts/cron-desk-run.js:1813-1814`) pass `nia_slice_c{N}.json` or `nia_weekly_slice_c{N}.json` as `slice` (`slice` is `null`).
   - Meanwhile, `sourcingModes.buildPool` (`scripts/cron-desk-run.js:1815-1819`) calls `named()` (`scripts/newsroomSourcing.js:79-90`), which builds the candidate pool directly from `output/spacemolt-show/feed/c{N}.json` with hardcoded `{ pop: e.POPID, name: e.Holder || null, role: 'UNDOCKED pilot' }` (`profile: "<Name> — UNDOCKED pilot"`), ignoring `story.citizens` (`"Name — RoleType, UNDOCKED cast pilot"`) and `pilots[].who`.
   - As a result, W2 (`scripts/livedExperiencePacket.js:771`) and W3 (`scripts/livedExperiencePacketV2.js:322-349`) populate `manifest.approvedFacts` and `manifest.approvedSubjects` with `"<Name> — UNDOCKED pilot"` instead of the pilot's civic/sports `RoleType` and `careerLines`. Worse, `auditArticle` (`scripts/livedExperiencePacketV2.js:667-677`) extracts `allowedNumbers` only from `approvedFacts`, `approvedQuotes`, and `approvedSubjects.profile` — **not** `task.assignment` — so if any number from `careerLinesFor` survives into `task.assignment` and Nia quotes it (e.g., `7th`, `3-1`, `C110`), the V2 auditor flags `UNAPPROVED_NUMBER`.

3. **W1 `--max-tokens` and `injectWeeklyPilotCredit` (`scripts/cron-desk-run.js:2134, 2742-2757, 3097-3103`):**
   - W1 `--max-tokens` (`scripts/cron-desk-run.js:2134`) is `'1600'` when `PACKET_ACTIVE` is true (an output completion token cap, not an input truncation).
   - `injectWeeklyPilotCredit` (`scripts/cron-desk-run.js:2742-2757`) reads `weekly.pilots[i].name` (plain citizen name from `nia_weekly_slice_c{N}.json`, `scripts/buildNiaSlice.js:235, 237`), **not** `story.citizens`. Enriching `story.citizens` (`scripts/buildNiaSlice.js:180, 259`) does **not** break `body.includes(p.name)` or `n.name.toLowerCase() === p.name.toLowerCase()` matching.

### Required Fix
- Feed each pilot's `who` (citizen role + sanitized career lines) into `packet.known` / `manifest.approvedFacts` (or pass `nia_slice` / `nia_weekly_slice` into `buildAnglePacket` / `newsroomSourcing.js:79-90` so `candidate.role` / `candidate.profile` and `known` carry the civic/sports identity and career facts), and either raise the `clean(..., 500)` cap on `task.assignment` (`scripts/livedExperiencePacket.js:416, 876`) or keep `WHO_RULE` in `rules` / `voiceRules` where it cannot be sliced off at char 500.

---

## Hunt 2 — Move 2 measured-zero rule: when does `entries.length === 0` actually happen?

**Gate: `FIX`**

### Findings

1. **`entries.length === 0` is unreachable whenever the runner or adapter logs in (`scripts/undockedEpisodeAdapter.js:32, 185-206, 280-284, 444-453`):**
   - `CATEGORIES` (`scripts/undockedEpisodeAdapter.js:32`) includes `'session'`, and `assemble()` (`:280-283`) flattens all 7 categories (`session`, `mining`, `trading`, `navigation`, `combat`, `ships`, `storage`) into `allEntries` before calling `deriveCredits(allEntries, startBalance)` (`:284`).
   - When `commander.ts` starts (`output/kimi/spacemolt-phase0/commander/src/commander.ts:253, 380`), `fetchInitialServerInfo` logs into the SpaceMolt server before the LLM loop begins, writing a `session.login` entry inside `[startedAt, endedAt]`. Furthermore, when `adaptEpisode` itself calls `login(sid, creds)` (`scripts/undockedEpisodeAdapter.js:445`) within the same UTC second as `endedAt` (server `created_at` has 1-second resolution `YYYY-MM-DDTHH:MM:SSZ` while `endedAt` has milliseconds), the adapter's own `session.login` also satisfies `inWindow(ts, start, end)` (`:152-158`).
   - **Verified against archived staged files:**
     - In `output/spacemolt-show/staged/archive/undocked-pop00962-2026-09-02T01-30-05.json:91-113`, `runner.turns === 0` and `exitCode === null` (the runner did zero turns), yet `entries_by_category.session` has `2` login entries (`01:30:06Z` and `01:35:05Z`), so `entries.length === 2` and `deriveCredits` scored `value: 0, kind: "FACT", note: "entries in window carry no credit event — measured zero"`.
     - In `output/spacemolt-show/staged/archive/undocked-pop00287-2026-10-10T01-30-04.json:103-112` (Simone Adesanya's stalled night), `entries_by_category.session` has `1` login entry (`01:30:06Z`) and `0` in `mining/trading/navigation/combat`, so `entries.length === 1` and `deriveCredits` scored `value: 0, kind: "FACT"`.
   - Meanwhile, if `fetchCategory` fails mid-loop (`api()`, `scripts/undockedEpisodeAdapter.js:365-384`), it throws and aborts the adapter without writing a staged file.
   - Therefore, `entries.length === 0` (`value: null`) **only** occurs if `commander.ts` died before `fetchInitialServerInfo` logged in **and** `adaptEpisode` logged in at least 1 full second after `endedAt` (or the server wiped `session` history). Every runner crash after login (`turns: 0`) and every LLM stall is indistinguishable from a clean 0-credit flight under `entries.length === 0`.

2. **`loadEpisode` drops `raw.stall`, and `projectFeed` drops `stall` and `credits_delta.note` (`scripts/undockedEpisodeAdapter.js:58-83, 304, 313`; `scripts/undockedShowContract.js:78-100`):**
   - `loadEpisode(jsonPath)` (`scripts/undockedEpisodeAdapter.js:64-82`) constructs a new normalized object and **omits `raw.stall`**. Consequently, in `assemble()` (`:304, 313`), `episode.stall` is always `undefined` (`staged.stall` is always `null`) on live adapter runs.
   - Even if `loadEpisode` preserved `raw.stall`, `projectFeed` (`scripts/undockedShowContract.js:92`) copies only `CreditsDelta: factValue(staged.facts.credits_delta, null)` (`0` on a stalled flight) and drops both `stall` and `facts.credits_delta.note`, so `buildNiaSlice.js:152` (`creditsPhrase(0)` -> `'dead even on the night'`) and `casinoLedgerEngine.js` treat a stalled/aborted runner night as a legitimate `0`-credit flight.

3. **Downstream `0` vs `null` audit across all consumers:**
   - `scripts/undockedShowContract.js:69`: `credits != null && Math.abs(Number(credits)) >= 50` — safe (`0` is `< 50`).
   - `scripts/undockedShowGate.js:273`: `v == null ? '' : v` — writes `0` to `Undocked_Feed.CreditsDelta` instead of `''`.
   - `scripts/undockedStandings.js:45-49, 87, 103`: `num(0)` returns `0`; `p.credits += 0` and `running[e.pop] = (running[e.pop] || 0) + 0` — safe.
   - `phase02-world-state/loadUndockedFeed_` (`phase02-world-state/loadEventContentLedger.js:339-348, 362-363`): `num(row, iCredits)` returns `0` for `0` and `null` for `''`; `if (aired !== null)` now initializes `S.undockedBoard.totals[pop] = 0` for 0-credit flights.
   - `scripts/buildNiaSlice.js:149-155, 173, 212`: `creditsPhrase(0)` returns `'dead even on the night'`; `laneEntryFor` (`:173`) checks `e.CreditsDelta == null`; `pilotRosterFor` (`:212`) checks `e.CreditsDelta != null` and formats `0 cr` instead of `unsettled`.
   - `dashboard/`: no reader of `Undocked_Feed` or `standings.json` exists in `dashboard/`.
   - **Defect in `phase05-citizens/casinoLedgerEngine.js:189-204, 251-261` (and `scripts/casinoLedger.js:220-260`):**
     - **`credits_sign` (`phase05-citizens/casinoLedgerEngine.js:251-260`):** skips `creditsDelta == null || creditsDelta === ''` (returning `CASINO_ST.VOID_GATE` when `!seen`), but when `CreditsDelta === 0` (`seen > 0, sum === 0`), it evaluates `var wantPos = (p.side === 'pos'); return { status: wantPos === (sum > 0) ? CASINO_ST.WIN : CASINO_ST.LOSS }`. Because `0 > 0` is `false`, **`sum === 0` settles `'pos'` as `LOSS` and `'neg'` (negative creditsdelta) as `WIN` (paying out 1.83x on a `0`-credit / stalled flight instead of `VOID_GATE` or push)!**
     - **`night_winner` (`phase05-citizens/casinoLedgerEngine.js:189-204`):** skips `null`/`''` and returns `null` (`VOID_GATE` at `:236`) if no pilot scored. When blanks become `0`, a night where all 3 pilots score `0` (or two lose credits and one stalls at `0`) crowns a `0`-credit pilot `night_winner` (breaking ties by lowest POPID at `:199`).

### Required Fix
1. In `scripts/undockedEpisodeAdapter.js:64-82`, pass `stall: raw.stall || null` through `loadEpisode()`.
2. In `deriveCredits` (`scripts/undockedEpisodeAdapter.js:185-206`) / `assemble` (`:280-285`), require non-`session` gameplay evidence (`episode.turns > 0` and `!episode.stall`, or at least one entry in `mining` / `trading` / `navigation` / `combat` / `ships` / `storage`) before scoring `value: 0` ("measured zero"); if `episode.turns === 0` or only `session` login entries exist, return `value: null, kind: 'UNKNOWN'`.
3. In `phase05-citizens/casinoLedgerEngine.js:258` (and `scripts/casinoLedger.js:250`), guard `sum === 0` on `credits_sign` so a `0` net delta does not settle `side === 'neg'` as `WIN`.

---

## Hunt 3 — Move 2 backfill: rewriting past `Undocked_Feed` rows and `feed/c{N}.json`

**Gate: `FIX`**

### Findings

1. **Past cycles (`TargetCycle <= 111`) vs. Unfired cycle (`feed/c111.json`, `TargetCycle = 112`) on `Undocked_Feed`:**
   - For already-fired cycles (`TargetCycle <= 111`), `processCasinoLedger_` (`phase05-citizens/casinoLedgerEngine.js:308, 676`) only evaluates rows with `Status === 'open'`; `loadUndockedFeed_` (`phase02-world-state/loadEventContentLedger.js:367`) only loads `target === cycle` into `S.undockedFeedEntries`; and `casinoCycleGate_` (`phase05-citizens/casinoLedgerEngine.js:218-223`) voids any lingering open slip with `target < cycle`. `generateCitizensEvents_` only checks boolean presence on `S.undockedFeedEntries` / `S.undockedPilots`. Rewriting `TargetCycle <= 111` rows does not retroactively alter settled casino bets or past `LifeHistory`.
   - **However, `output/spacemolt-show/feed/c111.json` carries `TargetCycle = 112` — the NEXT, unfired engine cycle** (live `World_Config.cycleCount` is `111`). The backfill rewrote 3 rows in `c111.json` (`TargetCycle = 112`) from `null` to `0`:
     - `undocked-pop00597-Y3C7` (Eric Taveras, `POP-00597`)
     - `undocked-pop01053-Y3C7-e2` (Rosario Medina, `POP-01053`, stalled episode)
     - `undocked-pop00926-Y3C7` (Briar Soto, `POP-00926`)
   - Because Briar Soto (`POP-00926`) has only that single flight in `c111.json`, changing her `TargetCycle = 112` row from `blank` to `0` directly changes how `casinoResolveUndocked_` (`phase05-citizens/casinoLedgerEngine.js:251-261`) will settle any open `c112:POP-00926` `credits_sign` wager when C112 fires on Sunday (`VOID_GATE` -> `LOSS` for `pos` / `WIN` for `neg`). And Rosario Medina's `undocked-pop01053-Y3C7-e2` was a stalled night (`2026-10-12`, plan §0), which the backfill converted from `null` to `0`.

2. **`undockedStandings.js` `Rank`, `CyclesLed`, and `CurrentStreak` verification (`scripts/undockedStandings.js:95-121`):**
   - Verified across all 55 archived flights (`output/spacemolt-show/feed/c103.json` through `c111.json`, `TargetCycle = 104..112`):
     - In `scripts/undockedStandings.js:103-104`, `if (e.credits != null) running[e.pop] = (running[e.pop] || 0) + e.credits; else if (!(e.pop in running)) running[e.pop] = 0;` already initialized `running[e.pop] = 0` on `null` rows, so `blank -> 0` produces **identical** `running[e.pop]` totals at every cycle.
     - Clarissa Dane's (`POP-00143`) C105 (`TargetCycle = 106`) `+14` (`undocked-pop00143-Y3C1-e3`) raises her cumulative total from `172 -> 186` at `TargetCycle = 106` and from `303 -> 317` at `TargetCycle = 107..112`. Because she already led `TargetCycle = 105..111` (`CyclesLed: 7`) and Eric Taveras (`POP-00597`, `1170`) still leads `TargetCycle = 112` (`CyclesLed: 1, CurrentStreak: 1`), **no pilot's `Rank`, `CyclesLed`, or `CurrentStreak` changed** (`output/spacemolt-show/standings.json:18-30`).

### Required Fix
- Before C112 fires, either revert stalled/no-gameplay rows (such as `undocked-pop01053-Y3C7-e2` and `undocked-pop00287-Y3C4`) back to `null` once Hunt 2's gameplay-entry check is applied, and ensure Hunt 2's `casinoLedgerEngine.js:258` `sum === 0` fix is deployed before C112 settles `TargetCycle = 112` rows.

---

## Hunt 4 — Move 3 idle-stop (`undockedEpisode.js` `createCompletionTracker`)

**Gate: `FIX`**

### Findings

1. **Replay verification on Simone Adesanya (`2026-10-10`) and Eric Taveras (`2026-10-16`):**
   - In `commander` (`output/kimi/spacemolt-phase0/commander/src/benchmark.ts:18-24`), `emitEvent` always writes single-line `JSON.stringify({...}) + "\n"` to stdout, and `scripts/undockedEpisode.js:201-206` strips `ANSI_RE` before line-splitting and matching `line.startsWith('{"event"')`.
   - **Simone (`output/spacemolt-show/episodes/undocked-pop00287-2026-10-10T01-30-04.log:44-250`):** `tool_call` fires at `tick: 0` (`spacemolt/undock`) and `tick: 1` (`spacemolt/get_poi`). From `tick: 2` onward, the model emits text-only JSON blocks with no `toolCall`, so `turn_end` fires every turn (`tick: 2..9`). `createCompletionTracker` (`scripts/undockedEpisode.js:126-163`) increments `idle` on each `turn_end` and **cleanly triggers `stalled = true` at `tick: 9` (8 consecutive idle turns after 2 tool calls)** instead of spinning to turn 65.
   - **Eric (`output/spacemolt-show/episodes/undocked-pop00597-2026-10-16T01-30-04.log:64-196`):** Across 41 ticks (`29` successful `game` calls, `9` `tool_error` events, `2` `turn_end` events at `tick: 12` and `tick: 39..40`), `tool_call` resets `idle = 0` throughout (`maxIdle` is `2`). **The 8-idle-turn stop does NOT cut Eric's mission night early.**

2. **False-positive `stalled = true` on completed flights where the server auto-docked or `captains_log_add` was called directly (`scripts/undockedEpisode.js:138-156`):**
   - Replaying `createCompletionTracker` across all 45 archived `.log` files in `output/spacemolt-show/episodes/` exposed **two false-positive `stalled = true` kills** on flights that actually completed and wrote their captain's log:
     - **Server auto-dock (`output/spacemolt-show/episodes/undocked-pop00663-2026-09-24T01-30-08.log:101-150`):** Soo Loo (`POP-00663`) undocked at `tick: 0` (`docked = false`), jumped back to Sol (`tick: 21`), travelled to Confederacy Central Command (`tick: 23`), and called `spacemolt/sell` (`tick: 25`, `:102-103`), which **auto-docked the ship on the server** (`[SYSTEM] Automatically docked at Confederacy Central Command (required for sell)`). She then called `spacemolt_social/captains_log_add` at `tick: 26` (`logWritten = true`), called `spacemolt/dock` at `tick: 27` (`:107`) — which emitted `tool_error` (`code: -32000`) because she was already docked — and then obeyed the prompt's hard-stop rule for 8 turns (`tick: 28..35`). Because `createCompletionTracker` (`scripts/undockedEpisode.js:145-148`) only sets `docked = true` on a successful `/(^|\/)dock$/` `tool_call`, `docked` remained `false`, `done` never fired, and at `tick: 35` the tracker **falsely flagged `stalled = true` (`completedCleanly: false`)**!
     - **Direct `captains_log_add` tool name (`output/spacemolt-show/episodes/undocked-pop00300-2026-09-25T01-30-07.log:82-128`):** At `tick: 19` (`:82`), Benji Dillon (`POP-00300`) called `tool: "spacemolt_social/captains_log_add"` with `args: { entry: "..." }` (no `args.command`). Because `createCompletionTracker` (`scripts/undockedEpisode.js:142`) checks `if (e.tool === 'game' && (!e.args || typeof e.args.command !== 'string')) return;`, and at `:149` checks `/(^|\/)captains_log_add$/.test(cmd)` where `cmd` only reads `e.args.command` when `e.tool === 'game'`, it works when `e.tool !== 'game'` — **except** in that log, Benji was already docked, wrote `captains_log_add` at `tick: 19`, and `done` only triggers on the `turn_end` after `docked && logWritten`. Wait: in `2026-09-25`, Benji called `spacemolt/refuel` at `tick: 16` (`:74-75`), which **auto-docked the ship on the server** (`[SYSTEM] Automatically docked at Sol Central Depot (required for refuel)`), then called `spacemolt/dock` at `tick: 18` (`:79`, `tool_error` because already docked), then `captains_log_add` at `tick: 19` (`:82`), then idled `tick: 20..27` — again triggering a **false-positive `stalled = true`** because auto-dock on `refuel`/`sell`/`repair` never sets `docked = true`!

3. **Inner `runAgentTurn` loop (`output/kimi/spacemolt-phase0/commander/src/loop.ts:43-138`) vs outer `turn_end` (`commander.ts:427`):**
   - `commander.ts:427` emits `turn_end` only when `runAgentTurn` returns to the outer loop. Inside `runAgentTurn` (`loop.ts:43`), up to `MAX_TOOL_ROUNDS = 30` consecutive `tool_error` or non-game tool (`status_log`, `read_todo`, `update_todo`) calls execute before a single `turn_end` is emitted.

4. **Sidecar `stall` field dropped by adapter (`scripts/undockedEpisodeAdapter.js:58-83`):**
   - As noted in Hunt 2, `undockedEpisode.js:245` writes `stall: completion.stalled ? { idleTurns: ... } : null` to the episode sidecar, but `undockedEpisodeAdapter.js:64-82` (`loadEpisode`) does not copy `raw.stall`, so `staged.stall` (`:304, 313`) is always `null`.

### Required Fix
1. In `scripts/undockedEpisode.js:138-156`, treat `logWritten = true` followed by an already-docked `dock` attempt or idle stop as completion (or set `docked = true` on `sell` / `refuel` / `repair` / `deposit_items` / `captains_log_add` when at a station, or when `logWritten` is true and the model stops calling tools to obey the hard-stop prompt rule).
2. Copy `stall: raw.stall || null` in `scripts/undockedEpisodeAdapter.js:64-82` (`loadEpisode`).

---

## Hunt 5 — Move 4 engine tokens (`phase05-citizens/generateCitizensEvents.js` & `phase02-world-state/loadEventContentLedger.js`)

**Gate: `FIX`**

### Findings

1. **Token syntax contradiction in the plan (`{pilotrole}` vs `$PILOTROLE`, `docs/plans/2026-10-16-undocked-crossover-the-city-knows-its-pilots.md:77-78` vs `:80`):**
   - Lines `77-78` of the plan still instruct: *"Every citizen who passes the `undocked` condition check and draws a line containing `{pilot}`, `{leader}`, or `{pilotrole}` gets the real pilot's name and role interpolated (`"caught the replay — {pilotrole} on UNDOCKED and the whole block had a stake"` -> ...)"*.
   - Line `80` (`es, as built`) notes that the engine actually implemented `$PILOT`, `$PILOTROLE`, `$LEADER` in `CONTENT_ENTITY_SLOTS` (`phase05-citizens/generateCitizensEvents.js:1112`).
   - `loadEventContentLedger_` (`phase02-world-state/loadEventContentLedger.js:213-267`) performs **no** token validation at load time, and `contentSlotTokens_` (`phase05-citizens/generateCitizensEvents.js:1126-1130`) matches only `/\$([A-Z_]+)/g`. If any `Event_Content_Ledger` row is authored using `{pilot}` or `{pilotrole}` from lines `77-78`, `contentSlotsFillable_` (`:1162-1179`) treats it as a 0-slot line and `composeContentLine_` (`:1186-1228`) **emits the literal string `{pilotrole}` into `Simulation_Ledger.LifeHistory`**.

2. **Resolution of pilot, blank `Holder`, `pilotRole`, and RNG determinism (`phase05-citizens/generateCitizensEvents.js:462-492, 1162-1179, 3284-3322`):**
   - `undockedAiringPilots` (`:475-482`) collects distinct uppercase `popId`s from `S.undockedFeedEntries` in feed order.
   - At draw time (`:3290, 3298-3310`), **only** when a drawn line's `slots` contain `'PILOT'` or `'PILOTROLE'` (`clWantsPilot`), `pickWeighted_` rolls `ctx.rng()` **once** over `undockedAiringPilots` with equal weight (`weight: 1`). Both `$PILOT` and `$PILOTROLE` in that line resolve from that single `clPilotPop` (`:3302-3309`), so they are guaranteed to name the same pilot, and lines without `$PILOT`/`$PILOTROLE` consume **zero extra RNG calls** (preserving byte-identical RNG order when no pilot-token line is drawn).
   - Name lookup (`:3302-3308`) checks `nameByPop[clPilotPop]` (built from `ctx.ledger` `First + ' ' + Last` at `:467-468`) **first**, falling back to `S.undockedFeedEntries[i].holder` only if the POPID is missing from `ctx.ledger`. Role lookup (`:3309`) reads `roleByPop[clPilotPop]` (`ctx.ledger` `Occupation` / `RoleType`, `:356-357, 469-470`) and formats via `pilotRoleText_` (`:1258-1268`). A blank `Holder` on `Undocked_Feed` does not break `$PILOT` or `$PILOTROLE` for any ledger citizen.

3. **Two defects in `engine.291` (`phase05-citizens/generateCitizensEvents.js:488-492, 3110-3125, 3298-3322`):**
   - **`eclEntityAvail_.PILOTROLE` ignores missing `roleByPop` (`phase05-citizens/generateCitizensEvents.js:488-491`):** `eclEntityAvail_.PILOTROLE` is set to `undockedAiringPilots.length > 0` without checking whether the airing pilot(s) actually have a non-empty `roleByPop[pop]`. If an airing pilot has a blank `RoleType` in `Simulation_Ledger` (or is not in `ctx.ledger`, like `POP-P9` in `scripts/contentLedgerCompose.test.js:407`), `$PILOTROLE` rows still pass `contentSlotsFillable_` (`:1162-1179`), get drawn by `pickWeighted_` (consuming RNG), fail `if (!value) return null` inside `composeContentLine_` (`:1220`), and **silently drop the citizen's life-event emission** (`eclTelemetry.composeNull`, `:3319-3321`).
   - **Airing pilots can draw audience `$PILOT` / `$PILOTROLE` lines about themselves (`phase05-citizens/generateCitizensEvents.js:3110-3125, 3298-3301`):** For a citizen in `S.undockedPilots`, the pilot hard-gate (`:3110-3125`) filters `pool` to `upTags[upt] === 'source:undocked'` (`:3115`), which keeps all `Conditions: undocked` **audience** rows (`ecl:kind:watch`, `ecl:kind:argue`, `ecl:kind:react`) alongside `undockedpilot` rows (`ecl:kind:pilot`). And `undockedAiringPilots` (`:3298-3301`) does not exclude the drawing citizen's own `popId`. Consequently, Eric Taveras can draw `"watched Eric Taveras the Starting Pitcher for the Oakland Athletics fly and argued about it"` stamped with `[Undocked-Audience]` (`:990`) in his own `LifeHistory`!

### Required Fix
1. Update lines `77-78` of the plan to use `$PILOT`, `$PILOTROLE`, `$LEADER` exclusively so no sheet row is authored with `{pilot}` / `{pilotrole}`.
2. In `phase05-citizens/generateCitizensEvents.js:475-491`, filter `undockedAiringPilots` (or `PILOTROLE` availability / candidate list) to pilots with non-empty `roleByPop[pop]` when filling `PILOTROLE`, and in the pilot hard-gate (`:3110-3125`) or candidate filter (`:3298-3301`), prevent an airing pilot (`popId`) from drawing an audience `$PILOT` / `$PILOTROLE` line about themselves (or restrict `S.undockedPilots` on the `source:undocked` gate to `ecl:kind:pilot` rows).

---

## Hunt 6 — Fourth wall: `Oakland_Sports_Feed.jsonl` `Notes` into Nia's prompt

**Gate: `FIX`**

### Findings

1. **`Oakland_Sports_Feed.jsonl` contains raw engine-cycle shorthand (`c111`, `c106`, `"this cycle"`, `"next cycle"`) and meta directives inside `Notes` (`output/beats/Oakland_Sports_Feed.jsonl`):**
   - Scanned all 243 entries in `output/beats/Oakland_Sports_Feed.jsonl` (and specifically the C105–C111 6-cycle window queried by `careerLinesFor` at `scripts/buildNiaSlice.js:90-124`).
   - For **Eric Taveras** (`POP-00597`) at C111, `careerLinesFor('Eric Taveras', 111)` returns 3 lines from C110 and C109. Line 2 (`output/beats/Oakland_Sports_Feed.jsonl` line 237, `Cycle: 110`, `EventType: "championship"`) contains:
     > `"Close out game 4-1 victory in Los Angeles. Is the teams 7th World Series title in the past 11 seasons. Mike Paulson is the architect. **Championship parade is set for Downtown in c111.**"`
   - Other active rows in the C106–C111 window carry explicit engine-cycle language in `Notes`:
     - Line 236 (`C110`, `Adash Stanley`): `"The Oaks begin the regular season **next cycle**"`
     - Line 242 (`C111`, `Elliot Abraham`): `"As the season is set to start **next cycle**... Something to watch **this cycle**."`
     - Line 243 (`C111`, `Adash Stanley`): `"volunteered at the Vinnie Keane Firehouse 29 West Oakland Baseball Academy **in c106**"`
     - Line 241 (`C111`, `NamesUsed: "-"`): `"Summarize and debate A's TrueSource records for 2041"` (a raw prompt instruction, currently skipped only because `NamesUsed` is `"-"`).
     - Earlier rows (e.g., `C102`, `Pablo Almanzar`): `"rated at 82 currently talent"` (raw video-game rating).
2. **`careerLinesFor` (`scripts/buildNiaSlice.js:116`) also prepends `'C' + c + ' '` (`"C110 playoffs: ..."`, `"C110 championship: ..."`):**
   - Under `.agents/AGENTS.md` §4 (*"Never use engine terminology (e.g., 'Chaos Cars', 'Cycle 98', 'Severity Spikes', 'Simulation', 'Engine') in any character-voiced prose"*) and `scripts/livedExperiencePacketV2.js:154-160` (`ENGINE_METRIC_PATTERNS` flags `/\bcycle\s+\d+\b/i`), feeding raw `"in c111"` / `"next cycle"` / `"this cycle"` and `"C110 championship:"` prefixes into Nia's prompt invites fourth-wall leakage in published Bay Tribune copy.

### Required Fix
- In `careerLinesFor` (`scripts/buildNiaSlice.js:115-120`), strip or translate engine-cycle tokens in `r.Notes` before emitting (e.g., strip `\bin c\d+\b`, replace `\b(this|next|last|past couple) cycles?\b`, strip `\bTrueSource\b` and `\brated at \d+\b`, and label the prefix with `r.Season` / `r.EventType` instead of `'C' + c`).

---

**Disposition: 6 of 6 hunts returned `FIX` — address the packet truncation/sourcing gap (Hunt 1), adapter session-login & stall handling + casino `sum === 0` settlement (Hunts 2–3), auto-dock completion false positives (Hunt 4), `$PILOTROLE` availability / self-pilot draw / plan token docs (Hunt 5), and `Oakland_Sports_Feed.jsonl` cycle-token sanitization (Hunt 6) before C112 fires.**
