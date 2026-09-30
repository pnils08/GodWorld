# Adversarial Diff Review: Commit df3173cd (engine.273 Wave 1 Holiday Table)

**Date:** 2026-09-30  
**Reviewer:** Antigravity (Standing Adversarial Reviewer)  
**Target Commit:** [`df3173cd`](file:///root/GodWorld/phase02-world-state/getSimHoliday.js) (`engine.273 wave 1: one holiday table, First Friday every 4th week, Creation Day one form, month names out of output`)  
**Specification:** [`docs/plans/2026-09-29-sim-holiday-calendar.md`](file:///root/GodWorld/docs/plans/2026-09-29-sim-holiday-calendar.md) § '#### Task 2 design' and 'Wave 1 build scope'  
**Baseline Compared:** `df3173cd^:phase02-world-state/getSimHoliday.js`  

---

## Executive Summary & Verdict Table

| # | Hunt Target | File & Line | Status | Verdict | Summary |
|---|---|---|---|---|---|
| **F-01** | Table metadata drift | [`phase02-world-state/getSimHoliday.js:6-22`](file:///root/GodWorld/phase02-world-state/getSimHoliday.js#L6-L22) | **CONTRADICTED** | **SHIP** | All 15 rows (10 kept + 5 held) exactly match the old metadata across `name`, `priority`, `neighborhood`, and `type`. Spaced labels correctly added. |
| **F-02** | Lingering `S.monthName` | [`phase01-config/advanceSimulationCalendar.js:180-195`](file:///root/GodWorld/phase01-config/advanceSimulationCalendar.js#L180-L195) | **CONTRADICTED** | **SHIP** | Completely removed from engine writer. Zero remaining readers in `phase*`, `utilities/`, `lib/`, `scripts/`, or `dashboard/`. |
| **F-03** | Engine timing readers of `cal.month` | [`phase04-events/generationalEventsEngine.js:931`](file:///root/GodWorld/phase04-events/generationalEventsEngine.js#L931), [`phase06-analysis/economicRippleEngine.js:435`](file:///root/GodWorld/phase06-analysis/economicRippleEngine.js#L435), [`phase07-evening-media/mediaFeedbackEngine.js:243`](file:///root/GodWorld/phase07-evening-media/mediaFeedbackEngine.js#L243) | **CONTRADICTED** | **SHIP** | Intended design. Month index (1–12) retained as internal rhythm key for timing curves as specified in plan §Task 2. |
| **F-04** | Unmigrated reader of `baseContext.month` | [`scripts/buildDeskFolders.js:253`](file:///root/GodWorld/scripts/buildDeskFolders.js#L253) | **CONFIRMED** | **HOLD** | Missed reader of `bc.month`. Evaluates to `undefined`, formatting header as `**Cycle N** \|  2026 \| Season` instead of canonical `cycleRef`. |
| **F-05** | Old First Friday position list | [`phase02-world-state/getSimHoliday.js:43-45`](file:///root/GodWorld/phase02-world-state/getSimHoliday.js#L43-L45) | **CONTRADICTED** | **SHIP** | Hardcoded array `[1, 6, 10, ...]` completely excised. Engine and Node readers share `isFirstFridayCycle_` (`pos % 4 === 2`). |
| **F-06** | Lingering `cycleOfYear === 48` | [`phase01-config/advanceSimulationCalendar.js:145`](file:///root/GodWorld/phase01-config/advanceSimulationCalendar.js#L145), [`scripts/buildDeskPackets.js:103`](file:///root/GodWorld/scripts/buildDeskPackets.js#L103) | **CONTRADICTED** | **SHIP** | Replaced with unified flag check `holiday === 'CreationDay'`. Dead helper `isCreationDay_` deleted. Zero lingering instances. |
| **F-07** | Stale `Cycle_Packet` 'Month:' parser | [`phase10-persistence/compileHandoff.js:684`](file:///root/GodWorld/phase10-persistence/compileHandoff.js#L684) | **CONFIRMED** | **HOLD** | `compileHandoff.js` parses removed `Month:` line from `Cycle_Packet`, emitting degraded `Month: n/a` in `Handoff_Output`. |
| **F-08** | Broken `holiday=<flag>` parser on Christmas | [`scripts/buildSeasonFeelSlice.js:50`](file:///root/GodWorld/scripts/buildSeasonFeelSlice.js#L50) | **CONFIRMED** | **HOLD** | Parses `world_summary_c{cycle}.md` using `/holiday=Holiday/i.test(md)`. Broken on C51 because `buildWorldSummary.js` now prints `holiday=Christmas`. |
| **F-09** | Silent fallbacks in calendar advancement | [`phase01-config/advanceSimulationCalendar.js:135-141`](file:///root/GodWorld/phase01-config/advanceSimulationCalendar.js#L135-L141), [`phase10-persistence/buildCyclePacket.js:106`](file:///root/GodWorld/phase10-persistence/buildCyclePacket.js#L106) | **CONTRADICTED** | **SHIP** | `typeof` fallbacks removed; fail-loud error added in `buildCyclePacket_` if `S.holidayLabel` is missing. |
| **F-10** | Source-text-only test assertion | [`scripts/simHolidayCalendar.test.js:129-134`](file:///root/GodWorld/scripts/simHolidayCalendar.test.js#L129-L134) | **CONFIRMED** | **HOLD** | Test 8 reads `buildCyclePacket.js` source text via `fs.readFileSync` and runs regex instead of executing `buildCyclePacket_` in VM. |
| **F-11** | Stale test fixture masking broken consumer | [`scripts/buildSeasonFeelSlice.test.js:8`](file:///root/GodWorld/scripts/buildSeasonFeelSlice.test.js#L8) | **CONFIRMED** | **HOLD** | Test passes only because it uses hardcoded pre-wave-1 fixture `holiday=Holiday` and does not assert `feel.context.holiday`. |
| **F-12** | Pre-wave-1 warning paths safety | [`scripts/buildDeskPackets.js:84-96`](file:///root/GodWorld/scripts/buildDeskPackets.js#L84-L96), [`scripts/buildWorldSummary.js:186-191`](file:///root/GodWorld/scripts/buildWorldSummary.js#L186-L191) | **CONTRADICTED** | **SHIP** | Safe, fail-soft transition handling: emits `console.warn` without throwing, preserves verbatim flag text, and assigns active priority. |

---

## Detailed Findings

### F-01: Table Metadata Drift Check
- **Files & Lines:** [`phase02-world-state/getSimHoliday.js:6-22`](file:///root/GodWorld/phase02-world-state/getSimHoliday.js#L6-L22) vs `df3173cd^:phase02-world-state/getSimHoliday.js:140-181`
- **Status:** `CONTRADICTED (0 drift)`
- **Verdict:** `SHIP`
- **Analysis:**
  Every kept and held row was audited against the baseline `metadata` map:
  - Pos 1 (`NewYear`): `major`, `Downtown`, `celebration` — MATCH
  - Pos 7 (`Valentine`): `minor`, `null`, `romance`, label `"Valentine's"` — MATCH
  - Pos 12 (`SpringEquinox`, held): `minor`, `null`, `seasonal`, label `"Spring Equinox"` — MATCH
  - Pos 15 (`Easter`): `major`, `null`, `religious` — MATCH
  - Pos 19 (`MothersDay`): `minor`, `null`, `family`, label `"Mother's Day"` — MATCH
  - Pos 25 (`FathersDay`): `minor`, `null`, `family`, label `"Father's Day"` — MATCH
  - Pos 26 (`SummerSolstice`, held): `minor`, `Lake Merritt`, `seasonal`, label `"Summer Solstice"` — MATCH
  - Pos 33 (`BackToSchool`, held): `minor`, `null`, `civic`, label `"Back to School"` — MATCH
  - Pos 38 (`FallEquinox`, held): `minor`, `null`, `seasonal`, label `"Fall Equinox"` — MATCH
  - Pos 44 (`Halloween`): `major`, `Temescal`, `celebration` — MATCH
  - Pos 47 (`Thanksgiving`): `major`, `null`, `family` — MATCH
  - Pos 48 (`CreationDay`): `major`, `Oakland`, `godworld`, label `"Creation Day"` — MATCH
  - Pos 50 (`Hanukkah`, held): `cultural`, `null`, `religious` — MATCH
  - Pos 51 (`Holiday`): `major`, `null`, `celebration`, label `"Christmas"` — MATCH
  - Pos 52 (`NewYearsEve`): `major`, `Downtown`, `celebration`, label `"New Year's Eve"` — MATCH
  Exactly 15 rows exist in `SIM_HOLIDAYS`. No priorities, neighborhoods, or event types were altered.

---

### F-02 & F-03: `S.monthName` and `cal.month` Readers
- **Files & Lines:**
  - [`phase01-config/advanceSimulationCalendar.js:180-195`](file:///root/GodWorld/phase01-config/advanceSimulationCalendar.js#L180-L195)
  - [`phase04-events/generationalEventsEngine.js:265, 931-1382, 1693`](file:///root/GodWorld/phase04-events/generationalEventsEngine.js#L931)
  - [`phase06-analysis/economicRippleEngine.js:221, 435, 506, 521, 806, 832`](file:///root/GodWorld/phase06-analysis/economicRippleEngine.js#L435)
  - [`phase07-evening-media/mediaRoomIntake.js:201, 682`](file:///root/GodWorld/phase07-evening-media/mediaRoomIntake.js#L682)
  - [`phase07-evening-media/mediaFeedbackEngine.js:124, 243-247, 323`](file:///root/GodWorld/phase07-evening-media/mediaFeedbackEngine.js#L243)
  - [`phase10-persistence/recordWorldEventsv25.js:67`](file:///root/GodWorld/phase10-persistence/recordWorldEventsv25.js#L67)
- **Status:** `CONTRADICTED`
- **Verdict:** `SHIP`
- **Analysis:**
  - `S.monthName` was written in `advanceSimulationCalendar.js:212` prior to `df3173cd`. The writer and the `monthNames` array were completely deleted. Repo-wide inspection found 0 remaining readers of `monthName` or `S.monthName`.
  - Readers of `cal.month` / `S.month` persist across Phase 4, Phase 6, Phase 7, and Phase 10. This is **not a bug**; it is the deliberate design contract documented in `docs/plans/2026-09-29-sim-holiday-calendar.md:154-155`:
    > *"Months: English names leave output; the month index stays as a rhythm key. Deliberate departure from §Task 1 outcome's 'rekey to cycle-of-year or season ranges'... S.simMonth / S.month (1–12, derived from year position) keep driving the timing curves — climate, academic calendar, economy and media gates, generational month gates, faith — whose values do not change in this build..."*

---

### F-04: Unmigrated Reader of `baseContext.month` in `buildDeskFolders.js`
- **File & Line:** [`scripts/buildDeskFolders.js:253`](file:///root/GodWorld/scripts/buildDeskFolders.js#L253)
- **Status:** `CONFIRMED`
- **Severity:** `LOW`
- **Verdict:** `HOLD`
- **Analysis:**
  In `scripts/buildDeskPackets.js:560`, `baseContext` dropped `month` and added `cycleRef`. In `scripts/buildInitiativeWorkspaces.js:72` and `scripts/buildVoiceWorkspaces.js:406`, the briefing header generator was updated:
  ```javascript
  md += `**Cycle ${cycle}** | ${baseContext.cycleRef || ''} | ${baseContext.season || ''}\n\n`;
  ```
  However, `scripts/buildDeskFolders.js:253` still has the unmigrated line:
  ```javascript
  md += `**Cycle ${cycle}** | ${bc.month || ''} ${bc.simYear || ''} | ${bc.season || ''}\n\n`;
  ```
  Since `base_context.json` no longer contains `month`, `bc.month` is `undefined`, silently collapsing to empty string and producing:
  `**Cycle 110** |  2026 | Spring` (double space / leading space before year, omitting `cycleRef` like `Y3C6`).
- **Remediation:** Update line 253 to use `bc.cycleRef || ''` identical to `buildVoiceWorkspaces.js`.

---

### F-05 & F-06: First Friday Cadence & Creation Day Unification
- **Files & Lines:**
  - [`phase02-world-state/getSimHoliday.js:33-45`](file:///root/GodWorld/phase02-world-state/getSimHoliday.js#L33-L45)
  - [`phase01-config/advanceSimulationCalendar.js:141-145`](file:///root/GodWorld/phase01-config/advanceSimulationCalendar.js#L141-L145)
  - [`scripts/buildDeskPackets.js:48, 102-103`](file:///root/GodWorld/scripts/buildDeskPackets.js#L48)
- **Status:** `CONTRADICTED`
- **Verdict:** `SHIP`
- **Analysis:**
  - The old 12-element list `[1, 6, 10, 14, 18, 23, 27, 31, 36, 40, 45, 49]` was deleted everywhere. The new cadence `cycleOfYear % 4 === 2` produces exactly 13 First Fridays, none of which collide with kept holidays. Node scripts load the same `isFirstFridayCycle_` via `module.exports`.
  - Creation Day is now evaluated exclusively as `holiday === 'CreationDay'`. The legacy condition `cycleOfYear === 48` was eliminated from `advanceSimulationCalendar.js`, `buildDeskPackets.js`, and `getSimHoliday.js` (`isCreationDay_` helper deleted).

---

### F-07: Stale `Cycle_Packet` 'Month:' Line Parser in `compileHandoff.js`
- **File & Line:** [`phase10-persistence/compileHandoff.js:684`](file:///root/GodWorld/phase10-persistence/compileHandoff.js#L684)
- **Status:** `CONFIRMED`
- **Severity:** `LOW`
- **Verdict:** `HOLD`
- **Analysis:**
  In `phase10-persistence/compileHandoff.js:684`:
  ```javascript
  lines.push('Season: ' + parsePacketField_(packet, 'Season'));
  lines.push('Month: ' + parsePacketField_(packet, 'Month'));
  ```
  `parsePacketField_` scans `packetText` from `Cycle_Packet` for a line starting with `'Month:'`. In `df3173cd`, `phase10-persistence/buildCyclePacket.js:102` stopped emitting `Month: <cal.month> (<MonthName>)`.
  As a result, `parsePacketField_(packet, 'Month')` returns `'n/a'`, writing `Month: n/a` into `Handoff_Output`. While `compileHandoff` is an off-cycle menu script that does not throw, the parser is stale.
- **Remediation:** Remove line 684 or replace it with `CycleRef: parsePacketField_(packet, 'CycleRef')`.

---

### F-08: Broken `holiday=<flag>` Consumer on Christmas (`buildSeasonFeelSlice.js`)
- **File & Line:** [`scripts/buildSeasonFeelSlice.js:50`](file:///root/GodWorld/scripts/buildSeasonFeelSlice.js#L50)
- **Status:** `CONFIRMED`
- **Severity:** `MEDIUM`
- **Verdict:** `HOLD`
- **Analysis:**
  In `scripts/buildSeasonFeelSlice.js:50`:
  ```javascript
  const holiday = /holiday=Holiday/i.test(md);
  ```
  This parses the `**Calendar context:**` line of `output/world_summary_c{cycle}.md`.
  Prior to commit `df3173cd`, `buildWorldSummary.js` printed the engine flag literal:
  `... Winter, holiday=Holiday | ...`
  In `df3173cd`, `buildWorldSummary.js:204` was changed to print the human label:
  `... Winter, holiday=Christmas | ...`
  Because `holidayLabel` for `Holiday` is `'Christmas'`, `/holiday=Holiday/i` will evaluate to `false` for Cycle 51 (Christmas). This breaks downstream callers expecting `feel.context.holiday` to be true on Christmas cycles (`buildEnvironmentSlice.js` and `buildCivicDomainSlice.js`).
- **Remediation:** Update regex to `/holiday=(?:Holiday|Christmas)\b/i.test(md)` or `/holiday=(?!none\b)[^|\n]+/i.test(md)`.

---

### F-09: Silent Fallback Audit
- **Files & Lines:**
  - [`phase01-config/advanceSimulationCalendar.js:135-141`](file:///root/GodWorld/phase01-config/advanceSimulationCalendar.js#L135-L141)
  - [`phase10-persistence/buildCyclePacket.js:106`](file:///root/GodWorld/phase10-persistence/buildCyclePacket.js#L106)
  - [`scripts/buildDeskPackets.js:545`](file:///root/GodWorld/scripts/buildDeskPackets.js#L545)
- **Status:** `CONTRADICTED`
- **Verdict:** `SHIP`
- **Analysis:**
  Commit `df3173cd` removed several defensive fallbacks in favor of fail-loud behavior:
  - `typeof getSimHoliday_ === 'function'` and `typeof isFirstFridayCycle_ === 'function'` checks were removed. Missing functions now throw immediately.
  - In `buildCyclePacket.js:106`, `if (!S.holidayLabel) throw new Error(...)` was added.
  - In `buildDeskPackets.js:545`, an empty `Simulation_Calendar` sheet now throws `throw new Error('Simulation_Calendar is empty')` instead of falling back to default dummy strings.

---

### F-10 & F-11: Test Rigor & Source-Text-Only Tests
- **Files & Lines:**
  - [`scripts/simHolidayCalendar.test.js:129-134`](file:///root/GodWorld/scripts/simHolidayCalendar.test.js#L129-L134)
  - [`scripts/buildSeasonFeelSlice.test.js:8`](file:///root/GodWorld/scripts/buildSeasonFeelSlice.test.js#L8)
- **Status:** `CONFIRMED`
- **Severity:** `LOW`
- **Verdict:** `HOLD`
- **Analysis:**
  - **F-10:** Test 8 in `scripts/simHolidayCalendar.test.js` is a **source-text-only test**:
    ```javascript
    test('packet calendar source has no month line or English month lookup', () => {
      const packet = fs.readFileSync(path.join(root, 'phase10-persistence/buildCyclePacket.js'), 'utf8');
      const calendar = packet.split("lines.push('--- CALENDAR ---');")[1].split("lines.push('');")[0];
      assert(!/lines\.push\('Month:|January|.../.test(calendar));
      assert(!packet.includes('getMonthName_Packet_'));
    });
    ```
    It performs static regex checks against file contents rather than executing `buildCyclePacket_` in a VM context with mock `ctx.summary` to inspect the generated `lines` array. Tests 1–7 are rigorous runtime executions, but Test 8 is purely static.
  - **F-11:** `scripts/buildSeasonFeelSlice.test.js:8` uses a hardcoded synthetic string `SimYear 2, Month 12, Day 3, Winter, holiday=Holiday` and does not assert `feel.context.holiday`, masking the Christmas parsing failure identified in F-08.
- **Remediation:** In Wave 2 or test refinement, execute `buildCyclePacket_` in VM for calendar output verification, and update `buildSeasonFeelSlice.test.js` with the new header format (`holiday=Christmas`).

---

### F-12: Safety of the Pre-Wave-1 Warning Paths
- **Files & Lines:**
  - [`scripts/buildDeskPackets.js:84-96`](file:///root/GodWorld/scripts/buildDeskPackets.js#L84-L96)
  - [`scripts/buildWorldSummary.js:186-191`](file:///root/GodWorld/scripts/buildWorldSummary.js#L186-L191)
- **Status:** `CONTRADICTED (Safe)`
- **Verdict:** `SHIP`
- **Analysis:**
  - When repository scripts run against sheets holding pre-wave-1 engine data (e.g. `BlackHistoryMonth`, `PresidentsDay`), both `buildDeskPackets.js` (`holidayRowForFlag`) and `buildWorldSummary.js` (`emitHeader`) intercept unmapped flags, print `console.warn(...)`, and use the raw flag name verbatim as label.
  - In `buildDeskPackets.js`, `holiday: { name: flag, priority: 'active' }` is returned safely without throwing.
  - In `buildWorldSummary.js`, `holiday=${holidayFlag}` is rendered, and `routePatternSeeds.js:502` (`/holiday=([^|\n]+?)\s*(?:\||\n|$)/`) correctly parses multi-word or legacy flags without error.
  - The warning paths are non-blocking, non-destructive, and explicitly verified by `simHolidayCalendar.test.js:119-127`.

---

## Action Items for Claude / Engine-Sheet Review

1. **Fix `scripts/buildDeskFolders.js:253` (F-04):** Replace `${bc.month || ''} ${bc.simYear || ''}` with `${bc.cycleRef || ''}`.
2. **Fix `scripts/buildSeasonFeelSlice.js:50` (F-08):** Update regex to `/holiday=(?:Holiday|Christmas)\b/i.test(md)` so Christmas is recognized from new world summary headers.
3. **Clean `phase10-persistence/compileHandoff.js:684` (F-07):** Remove or migrate the dead `Month:` packet parser line.
4. **Upgrade `scripts/simHolidayCalendar.test.js:129` (F-10):** Run `buildCyclePacket_` in VM rather than regexing source code.
