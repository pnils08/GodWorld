# Adversarial Review — Anthony Raines Step 3 (Tools)

**Reviewer:** Antigravity (`agy`) · **Date:** 2026-11-24 · **Brief:** [2026-11-24-rb-brief-agy-anthony-step3-tools.md](file:///root/GodWorld/docs/for-claude-review/2026-11-24-rb-brief-agy-anthony-step3-tools.md) · **Commit reviewed:** `19b287b62` ([gridiron.js](file:///root/GodWorld/scripts/gridiron.js), [cron-desk-writer.js](file:///root/GodWorld/scripts/cron-desk-writer.js), [cron-desk-run.js](file:///root/GodWorld/scripts/cron-desk-run.js), [newsroomWakePackages.js](file:///root/GodWorld/scripts/newsroomWakePackages.js)) · **Code edits:** none (read-only)

**Verdict: HOLD**

`dossier_read` (backed by `output/gridiron/cards.json` via `gridiron.cardFor` / `cardLines`), `As_Player_Data` on `sheet_read`, and `--seat-dossier` / `seatDossier` wiring make Anthony's seat tools reachable in W1 and W3, and `gridironCards.js` strips all `MAKING` metadata cleanly (0 leaks across all 28 cards). However, **three HIGH blockers** affect Marbury's legacy path, Rhea age checks, and `selectUsedToolLines` promotion of card facts before Step 4 turns `seatDossier` on.

---

## Findings

### 1. [HIGH] `toolDossierRead` switches 21 overlapping players to `cards.json`, breaking Elliot Marbury's derived-rate contract and injecting ratings/contracts into Marbury and Hal Richmond

- **Locations:**
  - `scripts/cron-desk-writer.js:666, 830-862, 1434, 1455, 1459`
  - `scripts/gridiron.js:295-321` (`cardLines`)
  - `scripts/buildMarburySlice.js:85-100` (`rateLine`, still reads `output/player_truesource_mirror.json`)
  - `scripts/newsroom-wake-packages.json:390, 405, 411-412, 474, 476-478`
- **Failure scenario:**
  21 of the 28 players in `output/player_truesource_mirror.json` also exist in `output/gridiron/cards.json` (`Arturo Ramos`, `Danny Horn`, `Benji Dillon`, `Desmond Morton`, `Ernesto Quintero`, `Vladimir Gonzalez`, etc.). `buildMarburySlice.js:99` still reads `player_truesource_mirror.json` for Marbury's slice, while `toolDossierRead` (`cron-desk-writer.js:830-839`) now answers from `cards.json` first.
  `input` (Elliot Marbury runs his legacy wake and calls `dossier_read("Danny Horn")` for a peer, told at `:1455, 1459` that `dossier_read` returns `"the rates already worked from them... Do no arithmetic on it"`) → `Danny Horn`'s card in `cards.json` has `rates: []`, so `cardLines` outputs **zero derived hitter rates (`AB per HR`, `AB per SO`)** while returning `ratings (0-100)`, `contract`, `awards`, and `2042` ages forbidden by Marbury's `canonBlockers` (`newsroom-wake-packages.json:411-412`) and Hal's `canonBlockers` (`:474, 476, 478`). *(For pitchers, `cardLines` omits `K/BB` when `p.rates` lacks it.)*
  *(Verified harmless on `lines[].src`: `'tool:dossier_read:' + hit.name + ... + ' (team card)'` at `cron-desk-writer.js:835` matches `TOOL_FACT_SOURCES` at `livedExperiencePacketV2.js:625` and `appendToolFacts` at `:776`.)*

---

### 2. [HIGH] Card `2042` ages disagree with `Simulation_Ledger` `BirthYear` on 15 of 25 matched players—triggering HIGH-severity Rhea contradictions

- **Locations:**
  - `scripts/gridiron.js:302` (`'age ' + f.Age + ' (2042)'`)
  - `scripts/cron-rhea-gate.js:520-522, 523-527, 726, 747`
  - `scripts/canon-name-check.js:195` (`profilesFor` emits `born: <BirthYear>`)
  - `output/gridiron/cards.json` vs `output/simulation_ledger_snapshot.jsonl`
- **Failure scenario:**
  Cross-checking all 28 players in `output/gridiron/cards.json` against `output/simulation_ledger_snapshot.jsonl` (`2042 - BirthYear`), **15 players disagree by 1–2 years**: `Arturo Ramos` (27 vs 26), `Desmond Morton` (25 vs 24), `Frank Reyna` (22 vs 21), `Henry Rivas` (30 vs 29), `Isley Kelley` (34 vs 33), `John Ellis` (26 vs 25), `Jose Colon` (27 vs 28), `Kevin Clark` (22 vs 21), `Marco Fabregas` (24 vs 22), `Pablo Almanzar` (23 vs 24), `Sergio Aybar` (23 vs 22), `Sidney Tumolo` (26 vs 24), `Vladimir Gonzalez` (28 vs 26), `Benji Dillon` (39 vs 38), `Vinnie Keane` (37 vs 39).
  Rhea receives `profilesFor(nameCheck.verified)` (`born: <BirthYear>`) with the rule `"any age ... claim contradicting these is HIGH-severity misrepresentation"` (`cron-rhea-gate.js:520-522`), and **never receives `cards.json` or `manifest.approvedFacts`** (`:523-527, 726`).
  `input` (Anthony reads `dossier_read("Arturo Ramos")` → `age 27 (2042)` and writes `"27-year-old Arturo Ramos"`) → Rhea compares `27` against `Simulation_Ledger` `born: 2016` (26 in 2042) → **HIGH-severity contradiction flag fails the gate.**

---

### 3. [HIGH] `selectUsedToolLines` skips card ratings, pitches, career, roster status, and single-year contracts—causing `auditArticle` to flag valid card numbers as `UNAPPROVED_NUMBER`

- **Locations:**
  - `scripts/livedExperiencePacketV2.js:677, 725-735, 774, 831` (`selectUsedToolLines`, `appendToolFacts`, `auditArticle`)
  - `scripts/gridiron.js:295-321` (`cardLines`)
  - `scripts/cron-desk-writer.js:1682-1702`
- **Failure scenario:**
  In `selectUsedToolLines` (`livedExperiencePacketV2.js:725-734`), every `tool:dossier_read:*` line requires `anchor = (text.match(/\b(19|20)\d{2}\b/) || [])[0]` (`:726`) and requires one sentence/line in the draft to contain `anchor` plus `>= 2` numbers from that tool line (`:731-732`).
  Across all 28 cards in `output/gridiron/cards.json`:
  - `ratings`, `pitches`, `career`, `roster status`, and `quirks` lines contain **no 4-digit year** → `anchor` is `null` → skipped at `:729` (13 of 28 `ratings` lines also exceed 500 chars, 517–588 chars, and are truncated at `:677, :774`).
  - `contract` lines match only the first year (`2042`), so citing `$8.2M` in `2043` (`!u.includes('2042')`) or citing one figure (`2042 $8.2M`, only 1 non-year number `< 2`) fails `:731-732`.
  - `profile` lines match `2042`, so citing `age 27` or `91 overall` without `"2042"` in the same sentence fails `:731`.
  `input` (Anthony calls `dossier_read("Arturo Ramos")` in W3 and cites `93 mph fastball`, `85 stamina`, `2.79 career ERA`, or `2043 $8.2M`) → `selectUsedToolLines` drops those lines from `manifest.approvedFacts` → **`auditArticle` logs `UNAPPROVED_NUMBER` observations on valid `dossier_read` figures.**

---

### 4. [MEDIUM] Three active `cards.json` / `As_Player_Data` players have no POPID and exist in no canon-name table

- **Locations:**
  - `output/gridiron/cards.json` (`Bobby Hendricks`, `Norman Kirkland`, `Tommy Fry` — `popid: null`)
  - `scripts/canon-name-check.js:55-82, 131-147`
  - `scripts/capability-reviewer/assertCanonNamesNotInvented.js:125-165`
  - `scripts/cron-rhea-gate.js:487-505, 616, 726`
- **Failure scenario:**
  `Bobby Hendricks`, `Norman Kirkland`, and `Tommy Fry` are active A's players in `cards.json` (`As_Player_Data`) with `popid: null`, and are absent from `output/simulation_ledger_snapshot.jsonl`, `output/desk-packets/truesource_reference.json`, and `output/world_summary_c117.md`.
  `input` (Anthony cites `Bobby Hendricks` from `dossier_read` or `As_Player_Data`) → `assertCanonNamesNotInvented` (`tier: blocking`, checks only `Simulation_Ledger`, `Civic_Office_Ledger`, `As_Roster`, `Bay_Tribune_Oakland`, `truesource_reference.json`) fails if `As_Roster` lacks them, and `--backend=api` Rhea (`no tools`, `cron-rhea-gate.js:749`) receives `NOT IN LEDGER` with no mention in `world_summary_c{N}.md`.
  *(Verified clean on `MAKING` stripping: across all 28 `cards.json` players, `cardLines` emits 0 `MAKING` strings and 0 quote marks; `cron-rhea-gate.js:155-156, 517-519` also explicitly exempts sports-game OVR/attribute terms.)*

---

### 5. [MEDIUM] `cardFor` hides duplicate exact names, misses feed spelling variants (falling back to a mirror list missing 7 card players), and rejects coaches/staff

- **Locations:**
  - `scripts/gridiron.js:283-294, 314` (`cardFor`, `cardLines`)
  - `scripts/cron-desk-writer.js:830-862` (`toolDossierRead`)
- **Failure scenario:**
  1. **Duplicate exact names (`gridiron.js:289`):** `all.find(...)` returns the first exact match without checking for multiple exact matches across teams (`As` / future `Oaks`) or active/inactive folders.
  2. **Feed spelling mismatch (`cron-desk-writer.js:840-851`):** If a feed/legacy spelling differs from `cards.json` (e.g. `"Vinnie Keene"` vs `"Vinnie Keane"`), `cardFor` returns `null`, falling back to `player_truesource_mirror.json` (`:840-862`), whose `"No dossier for ... Dossiers on file: ..."` message lists only the mirror's 28 names and omits `cards.json`-only players (`Kevin Clark`, `Giancarlo Hernandez`, `Bobby Hendricks`, etc.).
  3. **Non-players / coaches (`gridiron.js:286`):** `cardFor` scans `t.players || []` only and ignores `t.staff`. Asking `dossier_read("Deacon Seymour")` or `"Mike Paulson"` falls through to the mirror and returns `"No dossier for ..."` instead of pointing to `ask_worker(GRIDIRON)`.
  4. **Zero-season prospect with `season` (`gridiron.js:314`):** `dossier_read({ player: "Bobby Hendricks", season: "2041" })` ends with `"seasons on file: "` (empty list).

---

### 6. [MEDIUM] W1 `dossier_read` facts do not carry to W3, forcing duplicate tool spend under the 6-call cap

- **Locations:**
  - `scripts/cron-desk-run.js:1685, 1708, 1717, 1720, 2408, 3299`
  - `scripts/cron-desk-writer.js:254, 1003, 1061-1065, 1600-1602, 1682-1702`
  - `scripts/newsroom-wake-packages.json:353`
- **Verified wiring:**
  - W1 (`seatMorningPlan`, `cron-desk-run.js:1708`) returns `W.toolDossierRead(input).text`; `openRouterToolLoop` (`:1061`, `keepResults` unset) and `SEAT_MORNING_TRACE` (`:1720`) / `angle.json` (`:2408` `morningTools: [{ tool, input, resultChars }]`) do **not** expect `{ text, lines }`.
  - W3 (`TEST_SEAT`, `cron-desk-writer.js:1003, 1600, 1602`) executes `execOpenRouterTool` → `toolDossierRead(input)` returning `{ text, lines }`, stored into `trace` via `keepResults: true` (`:1065`).
- **Failure scenario:**
  Unlike `ask_worker` (`workerAnswers` rides from `angle.json` into W3 at `cron-desk-run.js:3299`), W1 `dossier_read` lines do **not** ride into W3 `manifest.approvedFacts`. With `SEAT_MORNING_CALLS = 6` and W3 `maxToolCalls = 6` (`newsroom-wake-packages.json:353`, hard-capped at `8` by `cron-desk-writer.js:254`) shared across 7 tools (`dossier_read`, `canon_recall`, `canon_search`, `sheet_read`, `citizen_lookup`, `ask_worker`, `memory_recall`), researching a multi-player trade in W1 forces W3 to re-spend scarce calls on the same `dossier_read` lookups or emit `UNAPPROVED_NUMBER` in `auditArticle`.

---

### 7. [MEDIUM] `As_Player_Data` is open to every reporter on the shared allowlist, and an unfiltered `sheet_read` truncates at 10 of 28 players

- **Locations:**
  - `scripts/cron-desk-writer.js:373-376, 660, 812-814, 886, 903-905`
  - `scripts/gridironCards.js:240-258` (`TAB_HEADERS`, `tabRows`)
- **Failure scenario:**
  1. **Allowlist scope (`:812-814`):** `As_Player_Data` sits on `SHEET_READ_ALLOWLIST` unconditionally (unlike `Cultural_Ledger` at `:814, 886`), exposing `2042` ratings/contracts to seats barred from citing them (`elliot-marbury`, `hal-richmond`, `trevor-shimizu`, civic seats), while `OPENROUTER_TOOLS`'s `sheet_read` description (`:660`) still omits `As_Player_Data`.
  2. **Unfiltered read (`:903-905`):** `As_Player_Data` has 29 rows (header + 28 players) × 54 columns = **14,602 chars**. Calling `sheet_read({ tab: 'As_Player_Data' })` with no `match` bypasses the `data.length > 40` hint (`29 <= 40`) and hits `cap(..., 6000)` (`:905`), cutting off mid-row on `Henry Rivas` and returning only the **first 10 of 28 players** alphabetically—so an unfiltered `Board Scan` misses 18 players. *(Also: `newsroomWakePackages.test.js` has no test yet for `seatDossier` validation.)*
