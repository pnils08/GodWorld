# Civic.38 Chain A Landed Tasks — Adversarial Review & Interface Audit

**Date:** 2026-09-20  
**Author:** Antigravity (agy)  
**Target Commits Inspected at HEAD:**
- `ef57efe0` (kimi: Task 2 — move ledger Sunday fold, Status transition edge, candidates reach gates)
- `89b5c36d` / `2f92c778` (engine-sheet: Task 4 step 0 — INTERVENTION_CATALOG & vote-type ruling)
- `95b67423` / `c57179fc` (engine-sheet: Task 5 — sponsor bill ownership & revival guards)
- `9d22388a` (kimi: Task 6.3 — petition sweep wires counter into Sunday vote gating)
- `48ebf9df` (kimi: Task 8 — Sunday directive re-aimed at 10 elected seats)
- `1ddcf92f` (kimi: Task 9 — rota split + project-director work-wake packs)
- `41c6892c` (kimi: Reflection_Intake live-header fix)
- `58f43fe1` (kimi: petition pool stated absence on missing snapshot)
- `3274f309` (codex: district scoping of petition quality warnings)

---

## Executive Summary

Chain A represents the core operational closure of the civic game loop:
1. **Move Accretion (Task 2):** Council datawake moves accumulate into an append-only ledger (`moves_c{XX}.jsonl`) and cleanly fold on Sunday into decisions files and a dedicated `_candidates` directory. The Status transition gate (`proposed -> pending-vote` with mandatory `VoteCycle`) is strictly enforced in `applyTrackerUpdates.js`.
2. **Catalog & Contract (Task 4 step 0):** `INTERVENTION_CATALOG` in `lib/initiativePhaseContract.js` establishes 8 canonical keys (6 playable, 2 unplayable). Every seat-proposed catalog row is ruled and typed as `vote` to eliminate the Funded phase gap.
3. **Sponsor Ownership & Revival Guards (Task 5):** `phase05-citizens/updateCivicApprovalRatings.js` and `phase02-world-state/applyInitiativeImplementationEffects.js` ensure sponsors own their bills regardless of district borders, and categorize failing-to-live revivals as `sitting` (0 delta, no silence penalty, no business lift), effectively shutting down stall/revive gaming loops.
4. **Petition Sweep (Task 6.3):** Sunday close evaluates petition-pending tracker rows against deterministic local counters. Cleared proposals stage the exact legal edge into `decisions_c{XX}.json`.
5. **Directive Confrontation (Task 8):** Mara Vance's Sunday directive focuses exclusively on the 10 elected seats, surfacing district heat, unaddressed petitions, and stall-clock proximity.
6. **Rota Split (Task 9):** Datawake rota is constrained to the 11 political seats (9 council + mayor + police chief). The four project directors cleanly transition to work-wake packs via the new `initiative-project` data node.

All unit suites remain green across the repository. Below are actionable findings, risk analyses, and suggested repairs.

---

## Detailed Findings

### 1. Task 2 Findings (Move Ledger Fold, Candidates, Status Gate)

#### Finding 2.1 (Medium): Non-tracker move types (`answer`, `canvass`) remain permanently in `status: 'pending'`
- **File:** `scripts/cron-civic-run.js:2300-2345`, `scripts/applyTrackerUpdates.js:435-460`
- **Mechanism:**
  In `foldMovesIntoDecisions`, pending moves are separated:
  ```javascript
  const works = pending.filter(m => m.type === 'work' && m.payload && m.payload.initiativeId);
  const proposes = pending.filter(m => m.type === 'propose');
  ```
  Moves of type `answer` and `canvass` are neither `work` nor `propose`. The generated manifest (`fold_c{cycle}.json`) contains only `work` and `candidates`.
  In `applyTrackerUpdates.js` (step 3), post-apply outcome records (`applied` or `failed`) are appended to `moves_c{cycle}.jsonl` by iterating over `manifest.work` and `manifest.candidates`.
- **Impact:** Any legal `answer` or `canvass` move executed by an office holder during the week is never referenced in the manifest and never receives a closing status line. In the ledger, its terminal state remains `status: 'pending'` permanently. While datawake moves are cycle-scoped (`moves_c{XX}.jsonl`), historical audits of closed cycle ledgers will show unprocessed pending moves.
- **Recommended Repair:** In `foldMovesIntoDecisions`, record `answer` and `canvass` move IDs in `manifest.nonTrackerMoves: [...]`, and in `applyTrackerUpdates.js` append a closing entry with `status: 'applied'`, `detail: 'voice/canvass move recorded'`.

#### Finding 2.2 (Medium / Prototype inheritance): `validateCandidates` permits inherited `Object.prototype` properties
- **File:** `scripts/validateTrackerUpdates.js:225-235`
- **Mechanism:**
  ```javascript
  const entry = catalog[cand.intervention];
  if (!entry) {
    violations.push({ source: src, code: 'unknown-intervention', ... });
  } else if (entry.playable === false) {
    violations.push({ source: src, code: 'domain-not-playable', ... });
  }
  ```
  If a candidate names an intervention such as `"toString"`, `"valueOf"`, or `"constructor"`, `entry` evaluates to the inherited function on `Object.prototype`. Because `entry` is truthy and `entry.playable` is `undefined` (`!== false`), neither violation is triggered.
  The candidate passes `validateCandidates` with 0 violations. Subsequently in `applyTrackerUpdates.js:370`, `entry.policyDomain` is `undefined`, causing `createInitiative` to throw an uncaught exception or error output.
- **Recommended Repair:**
  Use own-property membership:
  ```javascript
  const hasKey = catalog && Object.prototype.hasOwnProperty.call(catalog, cand.intervention);
  const entry = hasKey ? catalog[cand.intervention] : null;
  ```

#### Finding 2.3 (Low / Sandbox isolation): `validateCandidates(cycle)` hardcodes `DECISIONS_DIR`
- **File:** `scripts/validateTrackerUpdates.js:36, 198`
- **Mechanism:** `DECISIONS_DIR` is defined globally as `path.join(ROOT, 'output/city-civic-database/initiatives')`. Unlike `foldMovesIntoDecisions(root, cycle, ...)` or `petitionGateSweep(root, cycle)`, `validateCandidates(cycle)` does not accept an optional `root` or `decisionsDir` parameter.
- **Impact:** Synthetic tests running in temporary isolated directories cannot invoke `validateCandidates` without writing to or reading from `ROOT/output/`, conflicting with the strict zero-repo-dirtying test harness constraint.
- **Recommended Repair:** Allow an optional options parameter:
  ```javascript
  function validateCandidates(cycle, options = {}) {
    const decisionsDir = options.decisionsDir || (options.root ? path.join(options.root, 'output/city-civic-database/initiatives') : DECISIONS_DIR);
    const file = path.join(decisionsDir, '_candidates', `candidates_c${cycle}.json`);
    ...
  ```

#### Finding 2.4 (Low / Dry-run vs Apply): Duplicate candidate tracking differs in dry-run
- **File:** `scripts/applyTrackerUpdates.js:380-405`
- **Mechanism:** In `applyTrackerUpdates.js`, candidate deduplication checks:
  ```javascript
  const key = [String(cand.proposingOffice || ''), String(CYCLE), normName(cand.title)].join('|');
  if (existingKeys.has(key)) { ... continue; }
  ```
  However, `existingKeys.add(key)` is only executed within `if (APPLY && headers)`.
- **Impact:** In a dry-run execution (`--apply` omitted), if `candidates_c{XX}.json` contains two identical candidate proposals for the same office and title, the dry-run output logs `WOULD APPEND` for both proposals. In live apply, the first is appended and the second is skipped.
- **Recommended Repair:** Move `existingKeys.add(key)` outside `if (APPLY && headers)` (or mirror in an uncommitted tracking set) so the dry-run reflects identical deduplication behavior.

---

### 2. Task 4 Step 0 & Catalog Ruling (`89b5c36d`, `2f92c778`)

- **Status:** **VERIFIED SOUND**
- **Analysis:**
  `lib/initiativePhaseContract.js` exports `INTERVENTION_CATALOG` with 8 keys:
  - Playable (6): `health-service` (health), `transit-project` (transit), `school-program` (education), `economic-program` (economic), `workforce-program` (workforce), `sports-district` (sports).
  - Unplayable (2): `safety-program` (safety, `playable: false`), `housing-program` (housing, `playable: false`).
  All seat-proposed catalog entries carry `type: 'vote'`. This accurately reflects the design ruling that seat-proposed rows must enter the `vote` lifecycle arc so that passage can clear the `Funded` stage milestone.

---

### 3. Task 5 Findings (Sponsor Bill Ownership & Revival Guards)

- **Status:** **VERIFIED ROBUST**
- **Analysis:**
  1. In `phase05-citizens/updateCivicApprovalRatings.js`:
     - Line 582: `var isSponsor = (init.proposingOffice && init.proposingOffice === officeId);`
     - Line 586: `if (isMayor || isSponsor) affectsDistrict = true;`
     - Line 605: `var owns = isMayor || isSponsor || supportedByFaction;`
     This ensures council sponsors own their bills and receive the appropriate approval adjustments even when the initiative targets neighborhoods outside their own geographic district.
  2. Revival Guards:
     - `updateCivicApprovalRatings.js:1053`: When `prevPhase` is failing (`stalled`, `blocked`, `suspended`, `defunded`) and the new phase is a live phase, `revived` is set to `true`, and `classifyInitiativeMotion_` returns `'sitting'`. This awards 0 approval delta and prevents the +2 `advanced` delta from being farmed by repeatedly stalling and reviving a project.
     - `phase02-world-state/applyInitiativeImplementationEffects.js:288`: Similar guard applied to `phaseMoved` prevents the business growth lift (`bus[hood].advanced === 1`) from triggering upon revival from a failing phase.

---

### 4. Task 6.3 Findings (Petition Gate Sweep)

- **Status:** **VERIFIED COMPLIANT**
- **Analysis:**
  1. `petitionGateSweep(root, cycle)` in `scripts/cron-civic-run.js`:
     - Identifies pending initiatives (`Status: 'proposed'` and blank `VoteCycle`) from `output/beats/Initiative_Tracker.jsonl`.
     - Calls `petitions.countPetition` with builder-tunable `PETITION_SUPPORT_BANDS`.
     - Default configuration has `PETITION_SUPPORT_BANDS = {}` (empty), ensuring visibility logging occurs without premature live gating.
  2. Safe Gating:
     - `housing` and `safety` domains consistently return `support.cleared = false` with `reason = 'domain-not-playable'`.
     - When a proposal clears (e.g. `health` with an explicit support band), it stages `{Status: 'pending-vote', ImplementationPhase: 'vote-scheduled', VoteCycle: cycle + 1}` into the initiative's `decisions_c{XX}.json` holding file.
     - This precisely feeds `normalizeTrackerWrite`'s only permissible Status transition edge.

---

### 5. Task 8 Findings (Confrontation Directive Re-aiming)

#### Finding 8.1 (Medium / Mayor Heat Blindness): `MAYOR-01` receives no district heat data in confrontation prompt
- **File:** `scripts/cron-civic-run.js:945-960`
- **Mechanism:**
  In `runDirective`:
  ```javascript
  const seatMaterial = seats.map(s => {
    const o = s.office;
    const hoods = slice.turfHoods(o);
    const turfSet = new Set(hoods.map(h => String(h).toLowerCase()));
    ...
    // (a) hood data moving the wrong way
    const hot = hoodScores.filter(h => turfSet.has(String(h.hood).toLowerCase()) && (h.outlier || h.traj === 'decay'));
    if (hot.length) lines.push('- district heat: ' + ...);
  ```
  For `MAYOR-01`, `office.district` is `'citywide'`.
  In `buildCivicOfficeSlice.js:81`, `turfHoods(office)` explicitly returns `[]` when `office.district === 'citywide'`.
  Consequently, `turfSet` has size 0. The filter `turfSet.has(...)` evaluates to `false` for every neighborhood in Oakland.
- **Impact:** The Mayor of Oakland never receives any `- district heat:` bullet in the confrontation prompt, even if multiple neighborhoods in the city are experiencing severe statistical decay.
- **Recommended Repair:** If `o.district === 'citywide'` or `!turfSet.size`, evaluate `hot` against all city neighborhoods:
  ```javascript
  const isCitywide = !turfSet.size || (o.district && o.district.toLowerCase() === 'citywide');
  const hot = hoodScores.filter(h => (isCitywide || turfSet.has(String(h.hood).toLowerCase())) && (h.outlier || h.traj === 'decay'));
  ```

#### Finding 8.2 (Low): Quiet seats emit empty bullet sections
- **File:** `scripts/cron-civic-run.js:950-985`
- **Mechanism:** For seats with no decaying turf, no unaddressed petitions, and no board initiatives near the stall clock, `lines` consists only of the Markdown header:
  `### [Holder Name] ([Title], [District]) — [agentDir]`
  without bullet points.
- **Impact:** Benign. Mara Vance's system prompt specifies: "If you cannot write a clean Acceptance line, the directive is not ready — cut it." Quiet seats without evidence are naturally omitted from issuance.

---

### 6. Task 9 Findings (Rota Split & Project Director Packs)

- **Status:** **VERIFIED CLEAN**
- **Analysis:**
  1. `DATAWAKE_SEAT = /^(MAYOR-01|COUNCIL-D\d|CHIEF-POLICE)$/` in `scripts/cron-civic-run.js:2008` filters `civic-office-map.json` to exactly 11 political seats:
     - 1 Mayor (`MAYOR-01`)
     - 9 Council Members (`COUNCIL-D1` through `COUNCIL-D9`)
     - 1 Police Chief (`CHIEF-POLICE`)
  2. All 4 project directors (`PROJ-STABFUND`, `PROJ-OARI`, `PROJ-HEALTHCTR`, `PROJ-TRANSITHUB`), DA (`DA-01`), and PD (`PD-01`) are excluded from the datawake rota.
  3. The 4 project directors are configured in `scripts/work-wake-packages.json` with active packages and staggered duty days (`tue`/`thu`).
  4. `NODE_BUILDERS['initiative-project']` in `scripts/cron-work-wake.js:146-161` reads `Initiative_Tracker.jsonl` from the beats dump and emits project status, latest milestone, and next action, capped at 600 characters. Gracefully returns `null` if the tracker or project row is absent.
  5. `scripts/workWakePackages.js` validates all packages cleanly (`24 passed, 0 failed`).

---

## Next Action Items for Test Suite (`scripts/cron-civic-game.test.js`)

Expand `scripts/cron-civic-game.test.js` to directly test the newly landed functions and contracts:
1. **Group 1:** Test live `INTERVENTION_CATALOG` (8 keys: 6 playable pass, 2 unplayable reject). Test inherited prototype key rejections (`toString`).
2. **Group 2:** Direct execution of `foldMovesIntoDecisions` and `slugForInitiative` in temp workspaces, validating byte-idempotency, manifest structure, and decisions accretion.
3. **Group 3:** Verify `loadTrackerRows` export and `ReflectionExcerpt` preference over `Snippet`/`Text`.
4. **Group 4 (T6 & T6.3):** Direct execution of `petitionGateSweep` in temp workspace, validating unset bands (visibility only) vs set bands (staged vote scheduling for health; unplayable rejection for housing/safety).
5. **Group 5 (T8):** Verify elected seat pool filtering (10 seats) and confrontation trigger calculation.
6. **Group 6 (T9):** Verify 11-seat rota split and project-director `initiative-project` node builder.
