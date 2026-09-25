# Adversarial Review: Council-Only Silent Initiative Decoupling (`civic.39`, `38e11ecd`)

**Date:** 2026-09-24  
**Reviewer:** Antigravity (Standing Adversarial Review Duty per `engine-sheet`)  
**Target Commit:** `38e11ecd` (`civic.39: a council-only silent initiative no longer blocks the Sunday close (initiative-silent warning)`)  
**Files Inspected:**
- [`scripts/validateTrackerUpdates.js`](file:///root/GodWorld/scripts/validateTrackerUpdates.js) (`validateRecords`, `isOwnerVoiceRecord`, lines 119–151)
- [`scripts/assembleDecisions.js`](file:///root/GodWorld/scripts/assembleDecisions.js) (`PROJECT_FILE_TO_INIT`, lines 63–69, 365)
- [`scripts/validateTrackerUpdates.test.js`](file:///root/GodWorld/scripts/validateTrackerUpdates.test.js) (lines 83–98)
- [`scripts/cron-civic-run.js`](file:///root/GodWorld/scripts/cron-civic-run.js) (`projectSeats`, `voiceSlug`, `runProjects`, lines 1239, 1516–1523, 2038–2099)
- [`scripts/civic-office-map.json`](file:///root/GodWorld/scripts/civic-office-map.json) (`projects` mapping)

---

## Verdict

**CLEAN PASS (VERIFIED RESILIENT):**  
Commit `38e11ecd` correctly distinguishes between genuine owner schema drift (the C100 defect where the owning director spoke with broken/missing writable fields, which remains a **HARD `initiative-dark`** violation) and non-owner advisory commentary (e.g. council or mayoral discourse on unowned or untended initiatives like C108 `INIT-007`, which correctly emits a **`initiative-silent` WARNING**). 

The voice source name mapping (`PROJECT_FILE_TO_INIT`), regex parser, and pipeline slug generators (`baylight_authority` vs `baylight`) are verified 100% congruent across all live and test paths. No real owner drift can slip through as a warning.

---

## Executive Summary

1. **The C108 Blocker:** In dry tick C108, the Sunday fold generated 5 work moves and 1 candidate proposal. However, three council/mayor statements mentioned `INIT-007` (Youth Apprenticeship) with empty tracker updates. Because `INIT-007` has no project director, no owner spoke and no writable fields were generated. Under legacy G-INIT1, any initiative with records lacking writable fields triggered a HARD `initiative-dark` failure, blocking the entire Sunday close.
2. **The `civic.39` Decoupling:** G-INIT1 now evaluates `const ownerSpoke = recs.some(r => isOwnerVoiceRecord(r, initId));`. If the owning director spoke with zero writable fields, it blocks as `initiative-dark` (HARD). If only non-owner seats (council/mayor) touched the initiative, it yields `initiative-silent` (WARNING), allowing the Sunday close to write back all progressing initiatives.
3. **Owner Identification:** Backed by the pipeline's canonical `PROJECT_FILE_TO_INIT` map (exported from [`scripts/assembleDecisions.js`](file:///root/GodWorld/scripts/assembleDecisions.js)), matching on the voice source file prefix extracted via regex.

---

## Detailed Audit Against Hunt Directives

### 1. Can a Real C100-Style Owner Drift Slip Through as a Warning?

**Finding: NO (Verified Hard-Gated).**

- **Mechanism Audited:** [`scripts/validateTrackerUpdates.js:129-140`](file:///root/GodWorld/scripts/validateTrackerUpdates.js#L129-L140)
  ```javascript
  for (const [initId, recs] of Object.entries(byInitiative)) {
    if (recs.some(r => hasWritableField(r.trackerUpdates))) continue;
    const ownerSpoke = recs.some(r => isOwnerVoiceRecord(r, initId));
    (ownerSpoke ? violations : warnings).push({ source: recs.map(r => r.source).join(' + '), code: ownerSpoke ? 'initiative-dark' : 'initiative-silent', ... });
  }
  ```
- **The C100 Regression Signature:** In C100, the project director for Stabilization Fund (`civic-project-stabilization-fund`) produced `stabilization_fund_c100.json` with nested `fields: {}` or missing writeback keys.
- **Verification:**
  1. *Nested Fields Drift:* If the owner wraps updates in `trackerUpdates.fields: {}`, line 88 of `validateTrackerUpdates.js` intercepts it in the per-statement pass:
     ```javascript
     if (tu.fields && typeof tu.fields === 'object') {
       violations.push({ source: src, code: 'nested-fields-schema', ... });
     }
     ```
     This check occurs *before* the aggregate check and is **unconditionally HARD**.
  2. *Zero-Writable Flat Updates:* If the owner emits flat updates without any `WRITEBACK_FIELDS` (`ImplementationPhase`, `MilestoneNotes`, `NextScheduledAction`, `NextActionCycle`, `VoteCycle`, `LastWorkCycle`, `LastWorkSeat`, `Status`), `isOwnerVoiceRecord(r, initId)` inspects `rec.source`. For `stabilization_fund_c100.json`, regex matches `m[1] = 'stabilization_fund'`. Since `PROJECT_FILE_TO_INIT['stabilization_fund'] === 'INIT-001'`, `ownerSpoke` evaluates to `true`.
  3. The violation is pushed to `violations` with code `'initiative-dark'`, causing `validateTrackerUpdates` to exit 1 and halting the close gate. Tested and verified in [`scripts/validateTrackerUpdates.test.js:94-98`](file:///root/GodWorld/scripts/validateTrackerUpdates.test.js#L94-L98) (`r7d`).

---

### 2. Voice Source Name Formats: `baylight_authority` vs `baylight`

**Finding: FULL CONGRUENCE ACROSS PRODUCER, LOADER, AND VALIDATOR.**

- **The Naming Discrepancy Question:** Does `baylight` ever appear as a voice filename or slug, potentially bypassing `PROJECT_FILE_TO_INIT['baylight_authority']`?
- **Audit of Producer Pipeline:**
  1. In [`scripts/cron-civic-run.js:1516`](file:///root/GodWorld/scripts/cron-civic-run.js#L1516):
     `const BAYLIGHT = { agentDir: 'civic-office-baylight-authority', initiative: 'INIT-006' };`
  2. In [`scripts/cron-civic-run.js:1239`](file:///root/GodWorld/scripts/cron-civic-run.js#L1239):
     `const voiceSlug = dir => dir.replace(/^civic-(office|project)-/, '').replace(/-/g, '_');`
     Executing `voiceSlug('civic-office-baylight-authority')` yields `'baylight_authority'`.
  3. In [`scripts/cron-civic-run.js:2088`](file:///root/GodWorld/scripts/cron-civic-run.js#L2088):
     `writeVoiceJson(slug, cycle, r.json)` writes to `output/civic-voice/baylight_authority_c<cycle>.json`.
  4. Inspection of disk confirms: `output/civic-voice/` contains `baylight_authority_c103.json` through `c107.json`. The string `baylight_c<cycle>.json` never exists in `civic-voice`.
- **Audit of Assembly & Decision Slugs:**
  1. [`scripts/assembleDecisions.js:57`](file:///root/GodWorld/scripts/assembleDecisions.js#L57): `INIT_TO_SLUG['INIT-006'] = 'baylight'` defines the *decision output directory* (`output/city-civic-database/initiatives/baylight/decisions_c<cycle>.json`).
  2. [`scripts/assembleDecisions.js:68`](file:///root/GodWorld/scripts/assembleDecisions.js#L68): `PROJECT_FILE_TO_INIT['baylight_authority'] = 'INIT-006'` defines the *voice file input map*.
  3. When `loadRecords(cycle)` parses decision files, `rec.source` is stamped as `decision:baylight`. In `isOwnerVoiceRecord`:
     ```javascript
     const m = /^voice:([^#]+?)(?:_c\d+\.json)?(?:#|$)/.exec(String(rec.source || ''));
     ```
     Because `rec.source` begins with `decision:`, `m` is `null`, returning `false`. This is intentional: decision files are aggregate assemblies, not owner voice emissions.
- **Regex Robustness:**
  Tested across all voice filename variants:
  - `voice:baylight_authority_c108.json#s1` $\rightarrow$ `m[1] = 'baylight_authority'` $\rightarrow$ `INIT-006` (MATCH)
  - `voice:oari_c108.json#OARI-1` $\rightarrow$ `m[1] = 'oari'` $\rightarrow$ `INIT-002` (MATCH)
  - `voice:stabilization_fund#SF-1` $\rightarrow$ `m[1] = 'stabilization_fund'` $\rightarrow$ `INIT-001` (MATCH)
  - `voice:council_d1_c108.json#s1` $\rightarrow$ `m[1] = 'council_d1'` $\rightarrow$ `undefined` (NON-OWNER)
  - `decision:baylight` $\rightarrow$ `null` (NON-OWNER)

---

### 3. Can a Silent Initiative Hide a Case That Should Block?

**Finding: NO (Failure Modes are Strictly Partitioned).**

Consider all permutations of voice and move presence:

| Scenario | Records Present | `hasWritableField` | `ownerSpoke` | Code | Action | Evaluation |
|---|---|---|---|---|---|---|
| **A. Owner spoke with drift (C100)** | Owner voice file with 0 writable fields | `false` | `true` | `initiative-dark` | **HARD BLOCK** | Correct: catches owner schema regression. |
| **B. Owner spoke + valid write** | Owner voice with `ImplementationPhase` / `MilestoneNotes` | `true` | `true` | None | **PROCEEDS** | Correct: tracker updated. |
| **C. Council work move landed** | Sunday fold stamps `LastWorkCycle` on decision record | `true` | `false` | None | **PROCEEDS** | Correct: `LastWorkCycle` is in `WRITEBACK_FIELDS`. |
| **D. Council debate only (C108 INIT-007)** | Council/mayor voice statements, no director, no moves | `false` | `false` | `initiative-silent` | **WARNING** | Correct: initiative sits untouched, close proceeds. |
| **E. Owner missing / pending** | Council mentions initiative, but owner seat hasn't run yet | `false` | `false` | `initiative-silent` | **WARNING** | Correct per `civic.39`: missing voice is pending next window, does not halt the week. |
| **F. Candidate proposal** | Move in `candidates_c<cycle>.json` | N/A | N/A | Checked by `validateCandidates` | **INDEPENDENT** | Correct: candidate validation runs via separate sub-routine. |

**No Concealed Failures:**  
An initiative that receives an `initiative-silent` warning produces **zero cell intents** to `Initiative_Tracker` in [`scripts/applyTrackerUpdates.js`](file:///root/GodWorld/scripts/applyTrackerUpdates.js). Because no write is attempted, it cannot corrupt sheet state or overwrite valid data with blanks.

---

## Test Verification

1. **`scripts/validateTrackerUpdates.test.js`**: 19/19 passed.
   - Verified that `r7b` (council-only `INIT-007`) passes with `initiative-silent` warning.
   - Verified that `r7c` (council voice + decision assembly) does not trigger `initiative-dark`.
   - Verified that `r7d` (owner voice file `oari_c108.json#OARI-1` with 0 writable fields) triggers HARD `initiative-dark`.
2. **`scripts/cron-civic-tick.test.js`**: 50/50 passed.
3. **`scripts/cron-civic-game.test.js`**: 54/54 passed.
4. **Full Suite**: Clean pass across all civic pipelines.
