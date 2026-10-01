# Adversarial Code Review: Commit 7b403b5c (UNDOCKED Fixes & VoiceDir Routing)

**Date:** 2026-09-30  
**Reviewer:** Antigravity (Standing Adversarial Reviewer)  
**Target Commit:** `7b403b5c` (`UNDOCKED: brief sell/refuel schema fixed (item_id, no-arg refuel) in generator + 13 live briefs; holder passed adapter<-cron, standings resolve blank Holder from ledger; nia-rook-weekly reads nia-rook voice files (voiceDir) so the Saturday write no longer dies`)  
**Scope Inspected:**
- [`scripts/cron-desk-writer.js:246-252, 735, 772-774, 971`](file:///root/GodWorld/scripts/cron-desk-writer.js#L246-L252) (`VOICE_DIR` resolution, `AGENT_DIR`, `SKILL_PATH`, skill prompt assembly)
- [`scripts/persona-map.json:141-147`](file:///root/GodWorld/scripts/persona-map.json#L141-L147) (`nia-rook-weekly` mapping and `"voiceDir": "nia-rook"`)
- [`scripts/cron-undocked-run.js:285-286, 308-311`](file:///root/GodWorld/scripts/cron-undocked-run.js#L285-L286) (`--holder pilot.name` forwarded to `undockedEpisodeAdapter.js`, synchronous `undockedStandings.js` invocation)
- [`scripts/undockedEpisodeAdapter.js:257, 389-391, 448-465`](file:///root/GodWorld/scripts/undockedEpisodeAdapter.js#L448-L465) (`holder` argument plumbing, CLI argument loop, `assemble` fallback)
- [`scripts/undockedStandings.js:131-140`](file:///root/GodWorld/scripts/undockedStandings.js#L131-L140) (`Simulation_Ledger` fetch, header parsing, `First`/`Last` mapping fallback)
- [`scripts/undockedMissionBrief.js:44-45`](file:///root/GodWorld/scripts/undockedMissionBrief.js#L44-L45) & 12 files in `output/spacemolt-show/missions/*.txt` (Console command syntax corrections)
- [`scripts/buildNiaSlice.js:55-64, 168-179`](file:///root/GodWorld/scripts/buildNiaSlice.js#L55-L64) (`standingsLeader`, `standingsNote`, `buildNiaWeeklySlice` story angle integration)

---

## Executive Summary

| Finding | Target File & Line | Severity | Verdict | Summary |
|---|---|---|---|---|
| **F-01** | [`scripts/undockedEpisodeAdapter.js:448-465`](file:///root/GodWorld/scripts/undockedEpisodeAdapter.js#L448-L465) | **MEDIUM** | **WRONG-NAME RISK (CLI)** | Single global `holder` variable is reused across all paths. Calling `--all-three --holder <name>` or multiple `--episode` args with `--holder` incorrectly stamps the same holder name onto all episodes. |
| **F-02** | [`scripts/cron-undocked-run.js:285-286`](file:///root/GodWorld/scripts/cron-undocked-run.js#L285-L286) | **LOW-MEDIUM** | **DEFENSIVE DEFECT** | If `pilot.name` is ever `undefined` (e.g. malformed draw or alternate row), `execFileSync` stringifies it to the literal string `"undefined"`, populating `Holder: "undefined"` across staged JSON, feed, and standings while bypassing the blank-holder check. |
| **F-03** | [`scripts/undockedStandings.js:132-133`](file:///root/GodWorld/scripts/undockedStandings.js#L132-L133) | **MEDIUM** | **CRASH RISK / ROBUSTNESS** | `sheets.getSheetData('Simulation_Ledger')` is not validated for `null` or empty array before `led[0]` index access. If ledger read fails or returns empty, `h.indexOf` throws an unhandled `TypeError`, crashing `undockedStandings.js` and therefore failing the 20:30 cron at step 7. |
| **F-04** | [`scripts/undockedStandings.js:134-138`](file:///root/GodWorld/scripts/undockedStandings.js#L134-L138) | **LOW** | **EDGE CASE (LAST-WRITE-WINS)** | Loop over ledger rows overwrites `byPop[id]` on duplicate POPIDs without warning. If an uncleaned duplicate or placeholder row exists lower in the sheet, the later name wins silently. |
| **F-05** | [`scripts/undockedStandings.js:131, 137`](file:///root/GodWorld/scripts/undockedStandings.js#L131) | **LOW** | **SILENT FALLBACK FAILURE** | If `First` and `Last` are both blank in the ledger (or if pilot has been archived to `Citizen_Archive`), `byPop[id]` is empty/undefined, leaving `r[2]` unresolved. The dedicated `Name` column on `Simulation_Ledger` is not checked. |
| **F-06** | [`scripts/undockedStandings.js:131`](file:///root/GodWorld/scripts/undockedStandings.js#L131) | **LOW** | **PERFORMANCE / QUOTA DRAG** | `undockedStandings.js` patches missing holders in memory for the standings tab and sidecar, but does not backfill historical blank rows in `Undocked_Feed`. Thus `rows.some(r => !r[2])` will re-trigger a full `Simulation_Ledger` fetch on every nightly run. |
| **F-07** | [`scripts/cron-desk-writer.js:246-252, 971`](file:///root/GodWorld/scripts/cron-desk-writer.js#L246-L252) | **INFORMATIONAL** | **VALID FIX (COSMETIC DISCREPANCY)** | `voiceDir` cleanly solves the fatal missing agent folder crash at line 735 for `nia-rook-weekly`. Clean fallback to `PERSONA` when `voiceDir` is absent. Line 971 carries a minor cosmetic mismatch by still printing `.claude/agents/nia-rook-weekly` in the prompt banner. |
| **F-08** | [`scripts/undockedMissionBrief.js:44-45`](file:///root/GodWorld/scripts/undockedMissionBrief.js#L44-L45) | **INFORMATIONAL** | **VALID FIX** | Correctly aligns console cheatsheet text with Spacemolt schema (`item_id=`, no-arg / integer `refuel`). Cleanly propagated to all 12 mission briefs on disk. No regressions found. |

---

## Detailed Findings

### F-01: Global `holder` Reused Across Episodes in CLI Adapter Loop
- **File & Lines:** [`scripts/undockedEpisodeAdapter.js:448-465`](file:///root/GodWorld/scripts/undockedEpisodeAdapter.js#L448-L465)
- **Severity:** `MEDIUM`
- **Verdict:** `WRONG-NAME RISK (CLI / OPERATIONAL)`
- **Mechanism:**
  In `scripts/undockedEpisodeAdapter.js`, the argument parser initializes a single `let holder = null;` before looping through `process.argv`:
  ```javascript
  let paths = [];
  let holder = null;
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--episode') paths.push(argv[++i]);
    else if (argv[i] === '--holder') holder = argv[++i];
    else if (argv[i] === '--all-three') paths = paths.concat(threeEpisodePaths());
    ...
  }
  ...
  for (let i = 0; i < paths.length; i++) {
    const staged = await adaptEpisode(paths[i], holder);
    ...
  }
  ```
  If an operator runs `node scripts/undockedEpisodeAdapter.js --all-three --holder "Clarissa Dane"` or passes multiple `--episode` flags with a single `--holder`, `holder` is passed unconditionally to `adaptEpisode` for *every* path in `paths`.
  Inside `assemble(episode, byCategory, captains)`:
  ```javascript
  holder: episode.holder || castName(episode.popid),
  ```
  Because `episode.holder` is populated with `"Clarissa Dane"`, `castName` is bypassed for all episodes, incorrectly stamping Clarissa Dane's name onto episodes belonging to Milo Chen (POP-00688) and Jax Caldera (POP-00962).
- **Verification:** Verified against lines 448–465. In the daily cron (`cron-undocked-run.js`), only a single `--episode` is passed, so the daily run is unaffected. However, batch CLI invocation is vulnerable to cross-pilot name contamination.
- **Recommended Action:** Disallow `--holder` when `paths.length > 1` or when `--all-three` is present, or map holders per episode.

---

### F-02: `pilot.name` Undefined Coerced to `"undefined"` Literal String
- **File & Lines:** [`scripts/cron-undocked-run.js:285-286`](file:///root/GodWorld/scripts/cron-undocked-run.js#L285-L286)
- **Severity:** `LOW-MEDIUM`
- **Verdict:** `DEFENSIVE DEFECT / WRONG-NAME RISK`
- **Mechanism:**
  In `scripts/cron-undocked-run.js`:
  ```javascript
  execFileSync('node', [path.join(ROOT, 'scripts', 'undockedEpisodeAdapter.js'),
    '--episode', sidecar, '--holder', pilot.name], { cwd: ROOT, stdio: 'inherit', timeout: 300000 });
  ```
  If `pilot.name` is ever `undefined` (such as if a draw manifest row or alternate object is missing the `name` property), Node's `child_process.execFileSync` converts all argument elements to strings via `String(arg)`. In JavaScript, `String(undefined)` evaluates to the string `"undefined"`.
  In `scripts/undockedEpisodeAdapter.js`:
  ```javascript
  else if (argv[i] === '--holder') holder = argv[++i];
  ...
  if (holder) episode.holder = holder;
  ```
  The literal string `"undefined"` is truthy. It is assigned to `episode.holder`, written to `output/spacemolt-show/staged/*.json`, enqueued into `intake`, pushed to `Undocked_Feed`, and displayed on `Undocked_Standings`.
  Crucially, in `undockedStandings.js:131`:
  ```javascript
  if (rows.some(r => !r[2])) { ... }
  ```
  Because `r[2]` is the non-empty string `"undefined"`, `!r[2]` is `false`. The ledger lookup fallback will *not* trigger, cementing `"undefined"` as the pilot's permanent public name.
- **Verification:** Verified via Node execution: `execFileSync('node', ['...', '--holder', undefined])` yields `process.argv` receiving `["--holder", "undefined"]`.
- **Recommended Action:** Pass `pilot.name || ''` or omit `--holder` if `!pilot.name`.

---

### F-03: Unguarded `Simulation_Ledger` Fetch in Standings Recompute
- **File & Lines:** [`scripts/undockedStandings.js:132-133`](file:///root/GodWorld/scripts/undockedStandings.js#L132-L133)
- **Severity:** `MEDIUM`
- **Verdict:** `CRASH RISK / ROBUSTNESS DEFECT`
- **Mechanism:**
  In `scripts/undockedStandings.js`:
  ```javascript
  131: if (rows.some(r => !r[2])) {
  132:   const led = await sheets.getSheetData('Simulation_Ledger');
  133:   const h = led[0], iP = h.indexOf('POPID'), iF = h.indexOf('First'), iL = h.indexOf('Last');
  ```
  At line 127, the script explicitly guards the feed tab:
  `if (!feed || !feed.length) throw new Error(FEED_TAB + ' unreadable — refusing to compute');`
  However, at lines 132–133, `led` has no guard. If `sheets.getSheetData('Simulation_Ledger')` returns `null` or `[]` (due to an API glitch, permission issue, or blank response), `led[0]` evaluates to `undefined`. Line 133 then immediately throws:
  `TypeError: Cannot read properties of undefined (reading 'indexOf')`.
  Because `cron-undocked-run.js` line 310 executes `undockedStandings.js` synchronously with `execFileSync(..., { stdio: 'inherit', timeout: 300000 })`, this unhandled exception crashes `cron-undocked-run.js` at step 7, failing the 20:30 cron *after* the flight has completed and the feed row has been pushed.
- **Verification:** Verified against line 132–133.
- **Recommended Action:** Guard `led` with `if (led && led.length) { ... }` before reading `led[0]`.

---

### F-04: Duplicate POPID Resolution Overwrite (Last-Write-Wins)
- **File & Lines:** [`scripts/undockedStandings.js:134-138`](file:///root/GodWorld/scripts/undockedStandings.js#L134-L138)
- **Severity:** `LOW`
- **Verdict:** `EDGE CASE / SILENT OVERWRITE`
- **Mechanism:**
  ```javascript
  const byPop = {};
  for (let i = 1; i < led.length; i++) {
    const id = String(led[i][iP] || '').trim().toUpperCase();
    if (id) byPop[id] = (String(led[i][iF] || '').trim() + ' ' + String(led[i][iL] || '').trim()).trim();
  }
  ```
  If `Simulation_Ledger` contains duplicate entries for a `POPID` (e.g. unarchived legacy records or split records), `byPop[id]` assigns unconditionally. The last row in the ledger overwrites earlier rows without logging or validation. If the later row contains blank or dirty name fields, the corrupted entry wins.
- **Verification:** Standard JavaScript dictionary assignment pattern. In the current ledger snapshot (`output/simulation_ledger_snapshot.jsonl`), there are 0 duplicate POPIDs among active citizens, making this an edge case rather than an immediate live failure.
- **Recommended Action:** Only set `byPop[id]` if `!byPop[id]` or warn if duplicate is encountered.

---

### F-05: Blank First/Last Name Handling & Name Column Exclusion
- **File & Lines:** [`scripts/undockedStandings.js:131, 137`](file:///root/GodWorld/scripts/undockedStandings.js#L131)
- **Severity:** `LOW`
- **Verdict:** `EDGE CASE / SILENT FALLBACK FAILURE`
- **Mechanism:**
  1. **Both First and Last blank:** If a citizen row has empty `First` and `Last`, `byPop[id]` evaluates to `""`. At line 139: `rows.forEach(r => { if (!r[2] && byPop[r[1]]) r[2] = byPop[r[1]]; });`. Because `""` is falsy, `r[2]` remains empty `""`.
  2. **Dedicated Name Column Ignored:** `Simulation_Ledger` maintains an explicit `Name` column. If a record has `First`/`Last` missing but `Name` populated, line 133 ignores `Name` entirely.
  3. **Archived Citizens:** If a pilot who flew in an earlier cycle has since been archived (moved to `Citizen_Archive`), they no longer appear on `Simulation_Ledger`. Their POPID will not be found in `byPop`, leaving `r[2]` as `""`.
- **Verification:** Traced against ledger schema and line 137.

---

### F-06: Un-backfilled `Undocked_Feed` Causes Repetitive Ledger Fetches
- **File & Lines:** [`scripts/undockedStandings.js:131`](file:///root/GodWorld/scripts/undockedStandings.js#L131)
- **Severity:** `LOW`
- **Verdict:** `PERFORMANCE / QUOTA DRAG`
- **Mechanism:**
  `undockedStandings.js` was introduced to fix older feed rows that have blank `Holder` values. When `rows.some(r => !r[2])` is true, it fetches `Simulation_Ledger` and patches the standings array `rows`.
  However, it does *not* write the resolved names back to the `Undocked_Feed` sheet.
  Because historical rows in `Undocked_Feed` remain blank, `compute(feed)` will continue to produce rows where `!r[2]` is true on every single invocation. Consequently, every nightly 20:30 cron will make an unnecessary read of the ~1000-row `Simulation_Ledger` tab.
- **Recommended Action:** One-time backfill of the `Holder` column in `Undocked_Feed` tab, or cache ledger names locally.

---

### F-07: `voiceDir` Routing Verification & Prompt Header Discrepancy
- **File & Lines:** [`scripts/cron-desk-writer.js:246-252, 735, 971`](file:///root/GodWorld/scripts/cron-desk-writer.js#L246-L252)
- **Severity:** `INFORMATIONAL`
- **Verdict:** `VALID FIX (NO REGRESSION, MINOR COSMETIC DEFECT)`
- **Mechanism:**
  Commit `7b403b5c` added:
  ```javascript
  const VOICE_DIR = (() => {
    if (!PERSONA) return null;
    try { return (JSON.parse(fs.readFileSync(path.join(__dirname, 'persona-map.json'), 'utf8'))[PERSONA] || {}).voiceDir || null; }
    catch (_) { return null; }
  })();
  const AGENT_DIR = path.join(ROOT, '.claude', 'agents', VOICE_DIR || PERSONA || (DESK + '-desk'));
  const SKILL_PATH = path.join(AGENT_DIR, PERSONA ? 'IDENTITY.md' : 'SKILL.md');
  ```
  1. **Bug Fixed:** Prior to this commit, running `--persona nia-rook-weekly` crashed at line 735 (`if (!fs.existsSync(SKILL_PATH)) throw new Error('no SKILL.md for desk "' + DESK + '" at ' + SKILL_PATH);`) because `.claude/agents/nia-rook-weekly/IDENTITY.md` does not exist. Now, `VOICE_DIR` resolves to `"nia-rook"`, directing `AGENT_DIR` to `.claude/agents/nia-rook`, where `IDENTITY.md`, `LENS.md`, and `RULES.md` exist.
  2. **Undefined Safety:** If `PERSONA` is null or not in `persona-map.json`, `VOICE_DIR` cleanly evaluates to `null`. If `voiceDir` property is omitted, it evaluates to `null`. `VOICE_DIR || PERSONA || (DESK + '-desk')` safely falls back.
  3. **Cosmetic Mismatch (Line 971):**
     Line 971 constructs the prompt header:
     `'=== YOUR SKILL (.claude/agents/' + (PERSONA || (DESK + '-desk')) + ') ===\n\n' + skill +`
     It outputs `.claude/agents/nia-rook-weekly` instead of `.claude/agents/nia-rook` (the directory from which `skill` was actually read). This does not affect execution.

---

### F-08: Mission Brief Syntax Corrections
- **File & Lines:** [`scripts/undockedMissionBrief.js:44-45`](file:///root/GodWorld/scripts/undockedMissionBrief.js#L44-L45) & `output/spacemolt-show/missions/*.txt`
- **Severity:** `INFORMATIONAL`
- **Verdict:** `VALID FIX`
- **Mechanism:**
  Console cheatsheet updated to match Spacemolt MCP schema:
  - `spacemolt/sell item_id=<ore name lowercased...> quantity=<whole number>` replaces `item=`.
  - `spacemolt/refuel (no arguments; if fuel is still low, refuel quantity=<whole number>; quantity=all fails)` replaces `quantity=all`.
  All 12 brief text files in `output/spacemolt-show/missions/` were inspected and confirmed updated with exact match. Unit tests (`scripts/undockedMissionBrief.test.js`) pass cleanly with 15/15 checks.

---

## Cron Health & Impact Analysis

### 1. 20:30 Daily Flight Cron (`scripts/cron-undocked-run.js`)
- **Status:** **PASSING / UNBLOCKED**
- **Analysis:**
  - Flight launches cleanly.
  - Step 4 calls `undockedEpisodeAdapter.js` passing `--holder pilot.name`. `pilot.name` from `loadCast` is populated as a string for drawn cast members.
  - Step 5 gate sweeps staged episodes into `intake` with `Holder` populated.
  - Step 6 pushes approved rows to `Undocked_Feed` with `Holder` populated.
  - Step 7 recomputes standings and patches older flights.
  - **Residual Risk:** If Google Sheets API is degraded when `undockedStandings.js` attempts to read `Simulation_Ledger`, `cron-undocked-run.js` will abort at step 7 via `execFileSync`.

### 2. Saturday 10:15 Weekly Digest (`scripts/cron-desk-run.js --stage=write --desk undocked-digest --persona nia-rook-weekly`)
- **Status:** **PASSING / UNBLOCKED (CRITICAL REPAIR)**
- **Analysis:**
  - Wake 1 (08:15) builds weekly slice via `buildNiaWeeklySlice(cycle)` and reads `output/spacemolt-show/standings.json`. Because standings now carries resolved `Holder` names, `leader.Holder` is no longer blank, preventing malformed angle copy.
  - Wake 2 (09:15) collects citizen quotes.
  - Wake 3 (10:15) invokes `cron-desk-writer.js --desk undocked-digest --persona nia-rook-weekly`.
  - Thanks to `voiceDir: "nia-rook"`, `cron-desk-writer.js` successfully locates `.claude/agents/nia-rook/IDENTITY.md` and reads `IDENTITY.md`, `LENS.md`, and `RULES.md`.
  - Wake 3 no longer crashes at line 735. The write stage completes cleanly.
