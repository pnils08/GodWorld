# Adversarial Review: civic.38 Landed Tasks 1, 3, and 6

**Author:** Antigravity (lane: antigravity)  
**Date:** 2026-09-20  
**Target Commits:**
- `7291d25e` (Codex: Task 6 petition counter + `dumpBeatTabs.js`)
- `8b07fc29` (Kimi: Task 1 closed move set in datawake + Task 3 game blocks in seat pack)
**Governing Plan:** `docs/plans/2026-09-19-civic-wake-game-loop.md`

---

## 1. Executive Summary

- **Test Suite Status:** `scripts/cron-civic-game.test.js` created and active. 25/25 unit & integration tests pass with zero network calls, temp-dir JSONL workspaces, and strict synthetic `POP-999xx` identifiers.
- **Task 6 (`scripts/civicPetitions.js`):** Functionally sound on standard feeds, fully deterministic, annualizes rent burden correctly (`rent * 12 / income`), distinguishes hospital in-care from demographics sick, and keeps housing/safety non-clearing. **High-severity finding:** City-wide condition row validation causes unrelated off-map rows anywhere in the city to halt all district petition eligibility with `condition-data-incomplete`.
- **Tasks 1 & 3 (`scripts/cron-civic-run.js`, `scripts/buildCivicOfficeSlice.js`):** Clean integration of closed move set (`propose`, `work`, `answer`, `canvass`), strict 1-consequential-move cap, district hood containment with parent folding, police chief propose prohibition, and ~600 character block capping. **Key dependency finding:** Council petition pools depend on `output/simulation_ledger_snapshot.jsonl` for constituent mapping; without this snapshot on disk, council petition pools silently return empty.

---

## 2. Adversarial Review: Task 6 (Codex — `scripts/civicPetitions.js`)

### Finding 6.1 (High Risk): City-Wide Unlocated Rows Block Unrelated District Petitions
- **Source Verification:** `scripts/civicPetitions.js:174-178` and `scripts/civicPetitions.js:230-231`.
  ```javascript
  const inTarget = row => {
    const hood = resolver.resolve(row.Neighborhood);
    if (!hood) { quality.unlocatedConditionRows++; return false; }
    return target.has(hood);
  };
  ...
  else if (quality.invalidConditionRows || quality.unlocatedConditionRows) reason = 'condition-data-incomplete';
  ```
- **Demonstrated Impact:** When evaluating a health or housing proposal for a specific neighborhood (e.g. `Temescal`), the iteration scans the entire `Hospital_Ledger` or `Household_Ledger`. If a single row anywhere in the sheet has an unresolvable neighborhood (e.g. historical hills address `'Montclair'`, a typo, or an off-map token), `quality.unlocatedConditionRows` increments. This causes `reason` to become `'condition-data-incomplete'` and sets `support.cleared = false` for Temescal, even though Temescal's own data is completely valid and complete.
- **Recommendation:** Only count unlocated rows that either (a) appear in the target hoods list, or (b) if unlocated rows cannot be assigned, treat them as a data quality warning rather than a total gate veto for unrelated localized districts.

### Finding 6.2 (Medium Risk): `sinceCycle` Default Restricts Visibility to Current Cycle Only
- **Source Verification:** `scripts/civicPetitions.js:147-148` and `scripts/civicPetitions.js:124`.
  ```javascript
  const sinceCycle = positiveCycle(options.sinceCycle == null ? cycle : options.sinceCycle, 'sinceCycle');
  if (cycle < sinceCycle || cycle > data.cycle) continue;
  ```
- **Demonstrated Impact:** When called without `--since-cycle`, `sinceCycle` defaults to `data.cycle` (e.g. 108). This filters out all reflections from cycles prior to 108. If cycle 108 has just fired and few citizen reflections are logged yet, `visibility` returns `civicRows: 0, complaintRows: 0`. This diverges from `buildCivicOfficeSlice.js` which scans all historic reflections in `Reflection_Intake.jsonl` across cycles.
- **Recommendation:** Document that `--since-cycle` must be explicitly passed for multi-cycle petition reflection visibility, or default `sinceCycle` to `cycle - 4` to match the losing clock window.

### Finding 6.3 (Low / Contract Variance): Strict Column Key `row.Tag` vs `row.Event`
- **Source Verification:** `scripts/civicPetitions.js:121`.
  ```javascript
  if (key(row.Tag) !== 'civic') continue;
  ```
- **Demonstrated Impact:** On Google Sheets, Column E header is `Tag`, but in persona providers (`lib/personaProvider.js:201`) and Kimi's pack builder (`scripts/buildCivicOfficeSlice.js:903`), both `Event` and `Tag` are checked via `reflectionField(r, ['Event', 'Tag', 'event'])`. If synthetic tests or pipeline intermediate files use `Event`, `civicPetitions.js` will miss all rows.
- **Recommendation:** Use `key(row.Tag || row.Event)` to ensure resilience across pipeline representations.

---

## 3. Adversarial Review: Tasks 1 & 3 (Kimi — `scripts/cron-civic-run.js` & `scripts/buildCivicOfficeSlice.js`)

### Finding 1.1 (Verified Correct): Move Gate Discipline
- **Source Verification:** `scripts/cron-civic-run.js:2039-2099` (`validateDatawakeMoves`).
- **Verified Behaviors in `scripts/cron-civic-game.test.js`:**
  - Non-array input rejected loudly with `moves-not-an-array`.
  - Unknown move types rejected with `unknown-move-type(...)`.
  - Exactly one consequential move accepted; subsequent moves rejected with `second-consequential-move(...)`.
  - `work` on off-board initiative rejected with `initiative-not-on-board(...)`.
  - `propose` with out-of-district hood rejected with `hood-out-of-district(...)` (no intersect bypass).
  - Child areas properly folded to parents (e.g. `Coliseum` -> `East Oakland`).
  - `MAYOR-01` permitted to propose in any canonical hood.
  - `CHIEF-POLICE` strictly barred from `propose` (`seat-cannot-propose(...)`).
  - While Task 4 step 0 catalog is unlanded, `propose` is rejected loudly with `catalog-not-landed(...)`.

### Finding 3.1 (Medium Risk): `loadPetitionPool` Hard Dependency on Local Simulation Ledger Snapshot
- **Source Verification:** `scripts/buildCivicOfficeSlice.js:896` calling `loadConstituents(root, hoods, 0)`.
  ```javascript
  function loadConstituents(root, hoods, cap) {
    const file = path.join(root, 'output', 'simulation_ledger_snapshot.jsonl');
    if (!fs.existsSync(file) || !hoods.length) return [];
  ...
  ```
- **Demonstrated Impact:** `loadPetitionPool` verifies that a citizen authoring a reflection actually lives in the council seat's turf by checking `inTurf.has(pop)`. `inTurf` is populated exclusively by `loadConstituents`, which reads `output/simulation_ledger_snapshot.jsonl`. If this snapshot is missing or ungenerated in an environment, `inTurf` remains empty, causing all district citizen complaints to be dropped (`complaints: []`).
- **Recommendation:** `loadPetitionPool` should surface a note in `text` when `output/simulation_ledger_snapshot.jsonl` is missing rather than presenting an empty pool as if no complaints exist.

### Finding 3.2 (Interface Note): `loadMovesFolded` Returns a `Map`, Not Array
- **Source Verification:** `scripts/buildCivicOfficeSlice.js:835-843`.
  ```javascript
  function loadMovesFolded(root, cycle) {
    ...
    return byId; // Map instance
  }
  ```
- **Contract Note:** Callers and tests must query `folded.get(moveId)` or `folded.size`, rather than treating the result as an array. `scripts/cron-civic-game.test.js` verified this interface.

### Finding 3.3 (Interface Note): `loadConfrontation` Takes String `agentDir`
- **Source Verification:** `scripts/buildCivicOfficeSlice.js:958`.
  ```javascript
  function loadConfrontation(root, cycle, agentDir)
  ```
- **Contract Note:** The function takes `agentDir` (e.g. `'civic-office-council-d1'`) as the 3rd argument, rather than the full `office` object. It accurately looks up `## ... \n- **Agent:** .claude/agents/<agentDir>/` and returns the structured confrontation block with `CONF-{cycle}-{agentDir}`.

---

## 4. Verification Table

| Task | Module | Contract Clause | Status | Verified In Test |
|---|---|---|---|---|
| T1 | `scripts/cron-civic-run.js` | Closed move types (`propose`, `work`, `answer`, `canvass`) | Verified | `T1.1, T1.2` |
| T1 | `scripts/cron-civic-run.js` | 1 consequential move cap (first valid stands) | Verified | `T1.3` |
| T1 | `scripts/cron-civic-run.js` | District hood grounding + child fold | Verified | `T1.5, T1.6` |
| T1 | `scripts/cron-civic-run.js` | Police chief propose block | Verified | `T1.8` |
| T1 | `scripts/cron-civic-run.js` | Ledger lines formatting (`MV-{cycle}-{agentDir}-{date}`) | Verified | `T1.9` |
| T2 | `scripts/cron-civic-run.js` | Move ledger last-line-wins folding | Verified | `T2.1` |
| T3 | `scripts/buildCivicOfficeSlice.js` | Board sponsor + hood overlap (Mayor all, D6 none) | Verified | `T3.1` |
| T3 | `scripts/buildCivicOfficeSlice.js` | Complaint vs participation split, official drop | Verified | `T3.2` |
| T3 | `scripts/buildCivicOfficeSlice.js` | Directive confrontation extraction verbatim | Verified | `T3.3` |
| T3 | `scripts/buildCivicOfficeSlice.js` | Block character length capping (~600 chars) | Verified | `T3.4` |
| T6 | `scripts/civicPetitions.js` | Annualized rent burden `(rent * 12) / income > 0.30` | Verified | `T6.1` |
| T6 | `scripts/civicPetitions.js` | Missing & zero income explicitly counted | Verified | `T6.2` |
| T6 | `scripts/civicPetitions.js` | Health: in-care distinct from demographics sick | Verified | `T6.3` |
| T6 | `scripts/civicPetitions.js` | Safety: hood-aggregate, domain-not-playable | Verified | `T6.4` |
| T6 | `scripts/civicPetitions.js` | Child area folding (Coliseum -> East Oakland) | Verified | `T6.5` |
