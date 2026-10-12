# Civic.38 Codex Repair & Ruling Commits — Adversarial Review & Verification

**Date:** 2026-09-21  
**Author:** Antigravity (agy)  
**Target Commits Inspected at HEAD:**
- `7c734407` (F1 — own catalog validation via `scripts/civicInterventionValidation.js`)
- `266c55e6` (F3 — complaint join through canonical citizen geography)
- `1a284902` (F4 — strict line-numbered JSONL parsing & authority input integrity)
- `942ba8e6` (F5 — omit legacy action from new civic wake records)
- `8d6ef0b3` (F6 — retain civic move outcomes across Cycle boundaries)
- `5dd003d2` (F7 — prioritize civic stalls and remove invented stage advice)
- `33a8f6b8` (F8 — condition counts & model history caps)
- `1c06f1c5` (Ruling 1 — 3-Cycle civic complaint display window)
- `082985b7` (Ruling 4 — 1 latest work reflection per staff member)
- `d6dd24d7` (Ruling 3 — bind civic answers to 1 directive per Cycle and seat)
- `cec4c698` (Ruling 2 — derive passed-over civic problems from counter and move evidence)

**Contract Document:** `docs/plans/2026-09-19-civic-wake-game-loop.md` §Codex repair-window findings & §Rulings

---

## Executive Summary

An exhaustive adversarial audit was conducted on all seven Codex repair commits (`7c734407`, `266c55e6`, `1a284902`, `942ba8e6`, `8d6ef0b3`, `5dd003d2`, `33a8f6b8`) and all four ruling commits (`1c06f1c5`, `082985b7`, `d6dd24d7`, `cec4c698`) against the authoritative specification in `docs/plans/2026-09-19-civic-wake-game-loop.md`.

Every claim was verified against the repository code at `HEAD`. Every subsystem was tested for edge cases, fail-closed behavior, character budgets, prototype poisoning, and data-integrity degradation.

To ensure permanent automated regression coverage, **11 new comprehensive fixtures** were integrated into `scripts/cron-civic-game.test.js` (Groups 7 and 8), expanding the game suite from **38 to 49 passing tests** (all synthetic `POP-999xx`, temp-dir JSONL, zero network dependencies). The repository-wide test suite (`npm test`) passes **257/257 test files (100% clean)**.

**Zero breaking defects** were detected. In accordance with instructions ("tell codex in tmux only for real defects"), no spurious tmux notifications were sent.

---

## Commit Verification Matrix

| Commit | Scope | Description | Claim vs HEAD Verification | Edge Case / Adversarial Defense | Game Fixture |
|---|---|---|---|---|---|
| `7c734407` | F1 | Own catalog validation | **VERIFIED.** Replaces permissive property reads with `civicInterventionValidation.js`. | Defends against inherited `Object.prototype` properties (`constructor`, `__proto__`, `toString`) and incomplete metric schema shapes. | Test 7.1 (`F1`) |
| `266c55e6` | F3 | Citizen geography join | **VERIFIED.** Joins complaints via `simulation_ledger_snapshot.jsonl` with child area folding. | Decoupled from constituent display-filter constraints (e.g. hospitalized residents still count for home district); throws loudly on conflicting citizen geography. | Test 7.2 (`F3`) |
| `1a284902` | F4 | Input integrity & cycle matches | **VERIFIED.** Line-numbered JSONL errors; strict cycle match enforcement across beats and audits. | Prevents partial authority; `validateDatawakeMoves` rejects geographic moves (`propose`, `canvass`, `work`) when `geographyIssue` is flagged. | Test 7.3 (`F4`) |
| `942ba8e6` | F5 | Legacy action removal | **VERIFIED.** `datawakeRecord` omits `action`; wall reader retains historical fallback. | Rogue model action strings can never enter new datawake JSON files or overwrite clean speech on the office wall. | Test 7.4 (`F5`) |
| `8d6ef0b3` | F6 | Cross-cycle move memory | **VERIFIED.** Scans bounded cycle files `moves_c{XX}.jsonl` backwards. | Combines current pending moves with latest prior terminal outcome (`applied` or `failed`); strictly ignores future cycle files. | Test 7.5 (`F6`) |
| `5dd003d2` | F7 | Prioritize stalls; drop stage advice | **VERIFIED.** `boardNeedText` treats `stalled` as top priority; stage advice marked unavailable. | Removes premature hardcoded stage progression rules; reports status honestly pending the Task 4 shared helper. | Test 7.6 (`F7`) |
| `33a8f6b8` | F8 | Condition counts & prompt caps | **VERIFIED.** Evaluates proposal conditions via `civicPetitions.countPetition`; caps model prompt. | Strips raw historical constituents/complaints from model prompt while preserving complete legal ID arrays (`boardIds`, `confrontationIds`). | Test 7.7 (`F8`) |
| `1c06f1c5` | Ruling 1 | 3-Cycle complaint window | **VERIFIED.** Display window set to `[max(1, cycle-2), cycle]`; counter stays current-cycle. | Labels both windows clearly in block header; excludes future/invalid cycles and tracks `invalidCycleRows`. | Test 8.1 (`R1`) |
| `082985b7` | Ruling 4 | Staff reflection selection | **VERIFIED.** Selects 1 latest work reflection per staff member before spending character cap. | Sorts by cycle descending, timestamp descending, index descending; bounds text to `BLOCK_CAP - 40` with count of omitted staff. | Test 8.2 (`R4`) |
| `d6dd24d7` | Ruling 3 | Confrontation answer binding | **VERIFIED.** Unanswered directives persist across cycles; answers bind cycle & seat. | Oldest unanswered directive displays first; second answer to already-answered directive rejected with `directive-already-answered`. | Test 8.3 (`R3`) |
| `cec4c698` | Ruling 2 | Passed-over problem continuity | **VERIFIED.** Derives passed-over status from previous pack exposure + empty closed ledger. | Resolves upon landed work, propose, canvass, or bound answer move, or counter condition relief; missing fold ledger fails closed without assuming inaction. | Test 8.4 (`R2`) |

---

## Detailed Technical Analysis

### 1. F1: Catalog Validation (`civicInterventionValidation.js`)
- **Implementation:** `interventionIssue(catalog, key)` explicitly checks:
  1. `if (!object(catalog)) return 'catalog-not-landed'`
  2. `if (typeof key !== 'string' || !Object.hasOwn(catalog, key)) return 'unknown-intervention'`
  3. `if (!object(entry)) return 'invalid-intervention'`
  4. `if (entry.playable !== true) return 'domain-not-playable'`
  5. Structural schema validation on `entry.stage3Metric` (`tab`, `scope`, `direction` in `['up', 'down']`, and `column` string or non-empty string array).
- **Adversarial Assessment:** Passing prototype properties (e.g. `__proto__`, `constructor`, `toString`) or objects missing required metric dimensions returns `'unknown-intervention'` or `'invalid-intervention'` without throwing unexpected uncaught exceptions, and without consuming the seat's single consequential turn.

### 2. F3: Citizen Geography Join (`buildCivicOfficeSlice.js`)
- **Implementation:** `loadPetitionPool` loads citizen locations directly from `output/simulation_ledger_snapshot.jsonl` into a `Map<POPID, Hood>`, folding child neighborhoods through `childToParent`.
- **Adversarial Assessment:** Eliminates previous reliance on `loadConstituents`, which applied display-oriented filters (e.g. dropping hospitalized or inactive residents). A hospitalized resident in Coliseum is correctly located to East Oakland for a D5 council seat. Throws `Conflicting citizen geography` if duplicate records with diverging neighborhoods appear for the same citizen.

### 3. F4: Authority Input Integrity & Cycle Matching
- **Implementation:**
  - `readJsonl` parses line by line and includes exact line numbers upon parse failure (`${file}:${line}: ${e.message}`).
  - `childToParentFromAudit` verifies `Neighborhood_Map` presence in audit snapshots and throws on multiple parents for a single child area.
  - `requireCycle` throws a descriptive mismatch error if snapshot cycles do not align with the requested engine cycle.
  - `validateDatawakeMoves` checks `ctx.geographyIssue` and rejects `propose`, `canvass`, and `work` moves with `geography-unavailable(...)`.
- **Adversarial Assessment:** Corrupt rows or stale snapshot data fail loud and closed rather than producing silent fallback or partial authority.

### 4. F5: Legacy Action Omission (`cron-civic-run.js`, `officeWall.js`)
- **Implementation:** `datawakeRecord` constructs datawake JSON records with `moves`, `movesRejected`, and `statement`, but completely omits the deprecated free-text `action` field (`Object.hasOwn(rec, 'action') === false`).
- **Adversarial Assessment:** `officeWall.lineFromDatawake` prefers `statement` for new records while retaining backward compatibility for historical pre-civic.38 records with `rec.action`.

### 5. F6: Cross-Cycle Move Memory (`buildCivicOfficeSlice.js`)
- **Implementation:** `lastMoveBlock` parses `moves_c{XX}.jsonl` backwards up to the requested cycle. It identifies:
  1. `current`: All moves recorded in the active cycle.
  2. `prior`: The most recent move from a preceding cycle.
  3. `outcome`: The most recent move with a terminal status (`applied` or `failed`).
- **Adversarial Assessment:** Terminal outcomes survive the Sunday cycle fold into the following week's pack. Future cycle ledgers (`cycle > requestedCycle`) are ignored.

### 6. F7: Stalled Priority & Elimination of Invented Stage Advice (`buildCivicOfficeSlice.js`)
- **Implementation:** `boardNeedText` evaluates `ImplementationPhase === 'stalled'` first, returning `'stalled — one work move revives it'`. Any recognized `Stage` with non-stalled phase returns `'${Stage} — next-stage requirements unavailable (Task 4 shared helper pending)'`.
- **Adversarial Assessment:** Prevents premature divergent advancement rules from leaking into seat packs before the engine-sheet shared helper lands.

### 7. F8: Proposal Condition Evidence & History Capping (`buildCivicOfficeSlice.js`)
- **Implementation:**
  - `loadConditionCounts` calculates observations for proposed board rows via `civicPetitions.countPetition`. Strips `visibility` so current-cycle reflections do not bleed into totals.
  - `gamePromptView` wraps game blocks for prompt injection, stripping large constituent/complaint history arrays while preserving complete arrays of `boardIds` and `confrontationIds`.
- **Adversarial Assessment:** Protects LLM context windows against prompt-bloat while providing the model with exact valid IDs for turn generation.

### 8. Ruling 1: Three-Cycle Complaint Display Window (`buildCivicOfficeSlice.js`)
- **Implementation:** `loadPetitionPool` filters reflections to `rowCycle >= sinceCycle && rowCycle <= cycle`, where `sinceCycle = Math.max(1, cycle - 2)`.
- **Adversarial Assessment:**
  - Excludes reflections older than `C - 2` and reflections with future cycle stamps.
  - Excludes and tallies `invalidCycleRows` (non-integer or negative cycle values).
  - Explicitly states both windows in block header: `Complaint display C{since}–C{cycle}; condition counter C{cycle} only.`

### 9. Ruling 4: Single Latest Work Reflection Per Staff Member (`buildCivicOfficeSlice.js`)
- **Implementation:** `loadWorkingCity` filters reflections where `Daypart === 'work'` for POPIDs on the civic office map. It sorts by cycle descending, timestamp descending, index descending, and selects only the first (latest) entry per staff member.
- **Adversarial Assessment:** Prevents prolific project directors from monopolizing the block budget. Packs up to `BLOCK_CAP - 40` and cleanly reports the number of omitted staff.

### 10. Ruling 3: Confrontation Directive Answer Binding (`buildCivicOfficeSlice.js`, `cron-civic-run.js`)
- **Implementation:**
  - `loadConfrontations` scans Mara directives across cycles up to current cycle. Older unanswered directives remain in `open` and display as `open[0]`.
  - `validateDatawakeMoves` verifies `confrontationId` exists in open directives for that seat, binds `directiveCycle` and `confrontationSeat` into the accepted move payload, and rejects duplicate answers with `directive-already-answered`.
- **Adversarial Assessment:** Rejects answers targeting another seat's directive, answers referencing non-existent IDs, and duplicate answers in the same or subsequent cycles.

### 11. Ruling 2: Derived Passed-Over Problem Continuity (`civicProblemContinuity.js`)
- **Implementation:** `deriveProblemContinuity`:
  1. Inspects previous seat packs for `visibleProblems` with `count > 0`.
  2. Queries current counter readings for the folded hood and condition key.
  3. Verifies whether any move by the seat touched the hood:
     - `propose`: `payload.hoods`
     - `canvass`: `payload.hood`
     - `work`: `AffectedNeighborhoods` from the initiative row
     - `answer`: Neighborhood names matched in directive text
  4. If the previous closed ledger is absent, logs `missingFoldCycles` and refuses to claim inaction.
  5. If the problem persists with no addressing move, marks as `passed over C{seenCycle}`.
  6. Resolves upon landed move or counter condition reduction.
- **Adversarial Assessment:** No new persistent world state or registry is created; problem continuity is purely derived from historical artifacts on disk.

---

## Test Suite Expansion

In `scripts/cron-civic-game.test.js`, two new test groups were added:
- **Group 7: Repair Commits Validation (F1, F3, F4, F5, F6, F7, F8)**
  - `ok   F1: Live catalog gate rejects malformed schema shapes and inherited prototype properties`
  - `ok   F3: Complaint pool locates citizens through snapshot geography without requiring constituent display filters`
  - `ok   F4: Strict JSONL parsing, snapshot cycle match, and geography gate prevent partial authority`
  - `ok   F5: New datawake records omit legacy action field while officeWall preserves backward compatibility`
  - `ok   F6: Move memory retains prior terminal outcomes across cycle boundaries alongside pending moves`
  - `ok   F7: boardNeedText prioritizes stalled phase over Stage and marks next-stage requirements as pending helper`
  - `ok   F8: Proposal condition evidence computes from countPetition and gamePromptView caps history without dropping IDs`
- **Group 8: Rulings Validation (R1, R4, R3, R2)**
  - `ok   R1: Petition display enforces 3-Cycle window [cycle-2, cycle], labels both windows, and excludes invalid/future cycles`
  - `ok   R4: Working city selects 1 latest reflection per staff member across cycles and timestamps before applying character cap`
  - `ok   R3: Unanswered directives persist across cycles, bind answer moves, and reject duplicate answers`
  - `ok   R2: Passed-over problems derive from prior displayed pack conditions + empty closed-cycle ledger, resolving on landed moves or relief`

### Test Suite Execution Summary
```bash
node scripts/cron-civic-game.test.js
# Test Results: 49 passed, 0 failed (total: 49)

npm test
# 257/257 test files passed (146.13s)
```

---

## Conclusion

All 7 repair commits and 4 ruling commits authored by Codex are **sound, conformant, and verified clean at HEAD**. The code adheres strictly to the civic wake game loop plan, respects character and format budgets, enforces fail-closed boundary validations, and introduces zero regressions across the codebase.
