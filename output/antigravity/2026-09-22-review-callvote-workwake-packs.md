# Adversarial Review: Commit 51fdee28 — Baylight/DA Work-Wake Packs & INIT-003 Call-Vote Escape Hatch

**Target Commit:** `51fdee28` (kimi: game-loop amendment — Baylight/DA work-wake packs + the call-vote escape hatch)  
**Reviewer:** `antigravity` (Engine-sheet builder-authorized standing review duty, civic.38/.39)  
**Repository State:** HEAD (`217fffba`)  
**Date:** 2026-09-22  

---

## Executive Summary

Commit `51fdee28` lands two builder-ruled game-loop amendments from 2026-09-21:
1. **Work-Wake Packages (`scripts/work-wake-packages.json`):**
   - `proj-baylight`: Keisha Ramos (`POP-00041`, `STAFF-BAYLIGHT`, `INIT-006`, sports domain non-playable, Thursday duty).
   - `district-attorney`: Clarissa Dane (`POP-00143`, `DA-01`, justice beat: `civic-office` + `crime-metrics`, Tue+Thu duty).
2. **The `call-vote` Move (Escape Hatch for `INIT-003` & Unbanded Domains):**
   - Implemented in `MOVE_TYPES`, `validateDatawakeMoves`, and `callVoteEligibility` in `scripts/cron-civic-run.js`.
   - Schedules a vote for petition-pending rows (`Status: proposed`, blank `VoteCycle`) whose domain counter reports `domain-rules-deferred`.
   - Restricted to the Mayor (citywide) or the district council seat whose district contains one of the initiative's affected neighborhoods.
   - Folded via Sunday deterministic close `callVoteSweep` into `decisions_c<cycle>.json` (`Status: pending-vote`, `ImplementationPhase: vote-scheduled`, `VoteCycle: cycle + 1`) and joined to `manifest.callVotes` for post-apply move-ledger outcome resolution in `scripts/applyTrackerUpdates.js`.
   - 13 new test cases added to `scripts/cron-civic-tick.test.js` (suite passes 35/35; game suite passes 54/54).

The mechanism correctly addresses the core requirement of unblocking `INIT-003` (Fruitvale Transit Hub) without inventing synthetic petition rules. However, an adversarial code audit against the running engine reveals **one critical multi-day duty bug**, **one operational scheduler bottleneck**, and **four integration/exception risks**.

---

## Ranked Findings by Consequence

---

### Finding 1 (CRITICAL): The Once-Per-Cycle `wokenCycle` Filter Nullifies Multi-Day Duty Days (`["tue", "thu"]`)

* **Files & Lines:**
  * [`scripts/cron-work-wake.js:217-220`](file:///root/GodWorld/scripts/cron-work-wake.js#L217-L220)
  * [`scripts/work-wake-packages.json:161`](file:///root/GodWorld/scripts/work-wake-packages.json#L161)
  * [`scripts/workWakePackages.js:85-94`](file:///root/GodWorld/scripts/workWakePackages.js#L85-L94)

#### Mechanism
In `scripts/work-wake-packages.json`, `district-attorney` (Clarissa Dane, `POP-00143`), `med-examiner` (`POP-00142`), and `ems-director` (`POP-00141`) are configured with:
```json
"dutyDays": ["tue", "thu"]
```
The commit message for `51fdee28` specifically records:
> *"district-attorney (Dane POP-00143, justice beat: civic-office + crime-metrics, kimi-k2, tue+thu)"*

However, in `scripts/cron-work-wake.js:217-220`, package selection is filtered by:
```javascript
const woken = (state && state.wokenCycle) || {};
const due = registry.duePackages(packages, opts.day || dayAbbrev(), (state && state.recent) || [])
  .filter(({ value }) => Number(woken[value.popid]) !== Number(cycle));
```
And upon a successful wake (`scripts/cron-work-wake.js:306`):
```javascript
state.wokenCycle = Object.assign({}, state.wokenCycle, { [pkg.popid]: cycle });
```

#### Consequence
In GodWorld, an engine Cycle is a weekly unit spanning Sunday to Sunday. Both Tuesday and Thursday of any given week operate on the **exact same cycle number** (e.g. Cycle 108).
1. When Clarissa Dane (`POP-00143`) wakes on Tuesday of Cycle 108, `state.wokenCycle['POP-00143']` is set to `108`.
2. When Thursday of Cycle 108 arrives, `cron-work-wake.js` runs. `selectDue` checks `Number(woken['POP-00143']) !== 108`.
3. Because `woken['POP-00143'] === 108`, **she is immediately discarded**.
4. The exact same lockout affects the Medical Examiner and EMS Director.

The second day in `dutyDays: ["tue", "thu"]` is **completely dead code**. No citizen can ever wake more than once per cycle. If two wakes per week are intended, the filter must track `wokenDay` or `[cycle, dayAbbrev].join(':')` rather than a bare `cycle`.

---

### Finding 2 (HIGH): Scheduled Crontab Bottleneck Prevents Director Rota Cadence

* **Files & Lines:**
  * [`scripts/cron-work-wake.js:210`](file:///root/GodWorld/scripts/cron-work-wake.js#L210)
  * [`scripts/work-wake-packages.json:1`](file:///root/GodWorld/scripts/work-wake-packages.json#L1)
  * [`docs/OPERATIONS.md:67`](file:///root/GodWorld/docs/OPERATIONS.md#L67)

#### Mechanism
`scripts/work-wake-packages.json` line 1 documents the architectural intent:
> *"dutyDays staggered across the work-wake Tue/Thu window so two directors wake each day."*

With the addition of `proj-baylight` on Thursday, there are now 5 directors:
- **Tuesday:** `proj-stabilization-fund` (Webb), `proj-oari` (Tran-Muñoz). Total Tuesday active packs = 7.
- **Thursday:** `proj-health-center` (Chen-Ramirez), `proj-transit-hub` (Dominguez), `proj-baylight` (Ramos). Total Thursday active packs = 8.

However, the crontab entry runs without arguments:
```bash
18 20 * * 2,4 /usr/bin/node /root/GodWorld/scripts/cron-work-wake.js >> /root/GodWorld/logs/cron-work-wake.log 2>&1
```
And `cron-work-wake.js` defines:
```javascript
const LIMIT = Number(arg('limit', null)) || 1;
...
return { picks: due.slice(0, opts.limit || 1), note: due.length ? 'rota' : 'nothing due' };
```

#### Consequence
In production, `cron-work-wake.js` wakes exactly **1 citizen on Tuesday** and **1 citizen on Thursday**—a maximum of 2 citizens per cycle across all 10 active packages.
- "Two directors wake each day" never happens.
- Because non-directors (ME, EMS, DA, Athletes) share the same LRU due-queue, directors will regularly be starved of shifts. A project director may wait 4–5 cycles between work wakes.
- Once directors' shifts file work moves (commit `217fffba`) to tend initiatives against the 12-cycle untended stall clock, this starvation directly creates artificial stall pressure.

**Recommendation:** Update crontab or `LIMIT` default to wake all due packages, or set `--limit=4` (or separate director rota from civic/sports wakes).

---

### Finding 3 (HIGH): Unhandled Exceptions in `callVoteEligibility` Risk Crashing Live Datawakes

* **Files & Lines:**
  * [`scripts/cron-civic-run.js:2167-2170`](file:///root/GodWorld/scripts/cron-civic-run.js#L2167-L2170)
  * [`scripts/civicPetitions.js:144`](file:///root/GodWorld/scripts/civicPetitions.js#L144)

#### Mechanism
In `scripts/cron-civic-run.js:2167`, `callVoteEligibility` calls `countPetition` without exception handling:
```javascript
const res = require('./civicPetitions').countPetition({ policyDomain: domain, hoods }, ctx.petitionData,
  { supportBand: PETITION_SUPPORT_BANDS[domain] != null ? PETITION_SUPPORT_BANDS[domain] : undefined });
const why = res && res.support && res.support.reason;
if (why !== 'domain-rules-deferred') return 'call-vote-not-a-deferred-domain(' + initId + ' — counter says ' + (why || 'unknown') + ')';
return null;
```
In contrast, the Sunday sweep in `callVoteSweep` (`scripts/cron-civic-run.js:2580-2586`) wraps this in a guarded block:
```javascript
let res;
try {
  res = petitions.countPetition({ policyDomain: domain, hoods }, data, ...);
} catch (e) {
  log('call-vote: ' + initId + ' recount failed (non-fatal): ' + e.message);
  continue;
}
```

If `civicPetitions.countPetition` throws (for instance, if `policyDomain` contains an untracked string, or if `data` is missing an expected demographic or crime metric property), `callVoteEligibility` does not catch it.

#### Consequence
Because `validateDatawakeMoves` executes synchronously inside `runDatawake()`, an unhandled throw in `callVoteEligibility` crashes the entire datawake process for that seat, aborting the run before any moves or statements can be posted to the ledger.

**Recommendation:** Wrap `countPetition` in `callVoteEligibility` with `try { ... } catch (e) { return 'call-vote-counter-error(' + e.message + ')'; }`.

---

### Finding 4 (MEDIUM): Domain Bypass in `civicPetitions.js` Neutralizes Any Future `PETITION_SUPPORT_BANDS` for Non-Health Domains

* **Files & Lines:**
  * [`scripts/civicPetitions.js:227-230`](file:///root/GodWorld/scripts/civicPetitions.js#L227-L230)
  * [`scripts/cron-civic-run.js:2474`](file:///root/GodWorld/scripts/cron-civic-run.js#L2474)

#### Mechanism
In `scripts/civicPetitions.js`:
```javascript
let reason = 'eligible';
if (['housing', 'safety'].includes(domain)) reason = 'domain-not-playable';
else if (domain !== 'health') reason = 'domain-rules-deferred';
else if (supportBand == null) reason = 'support-band-unset';
```
The check `else if (domain !== 'health') reason = 'domain-rules-deferred'` executes **before** checking `supportBand`.

#### Consequence
Even if an operator or future commit configures `PETITION_SUPPORT_BANDS = { transit: 0.05 }`, `civicPetitions.countPetition` will still return `domain-rules-deferred`. The petition sweep will not gate on the transit band, and the `call-vote` escape hatch will remain wide open regardless of the band setting.

**Recommendation:** When petition rules are implemented for additional domains, `civicPetitions.js` must be updated concurrently; `PETITION_SUPPORT_BANDS` alone is completely inert for non-health domains.

---

### Finding 5 (MEDIUM): Board Need Text Informs Agent "Signatures Move It" While Prompt Forbids It

* **Files & Lines:**
  * [`scripts/buildCivicOfficeSlice.js:819`](file:///root/GodWorld/scripts/buildCivicOfficeSlice.js#L819)
  * [`scripts/cron-civic-run.js:2080`](file:///root/GodWorld/scripts/cron-civic-run.js#L2080)

#### Mechanism
For unstaged rows such as `INIT-003` (until converted) or any legacy proposed row, `boardStageView` in `buildCivicOfficeSlice.js` generates:
```javascript
const text = phase === 'stalled' ? 'stalled — one work move revives it'
  : String(row.Status || '') === 'proposed' && !String(row.VoteCycle || '').trim()
    ? 'petition-pending — signatures move it to a vote'
    : String(row.NextScheduledAction || '').trim() || 'advance or hold';
```
In the seat's datawake prompt, the board displays:
`- INIT-003 Fruitvale Transit Hub [design-phase] — petition-pending — signatures move it to a vote`

Simultaneously, the prompt instructions state:
> *"call-vote names a petition-pending row (proposed, no vote scheduled) whose domain has no petition rule..."*

#### Consequence
The model receives directly contradictory cues: the board description explicitly tells the agent that "signatures move it to a vote," while the rules state `call-vote` is for rows where no petition rule exists. LLMs adhering strictly to the board's reported state are likely to assume signatures are actively being collected, thereby failing to call the vote.

**Recommendation:** In `boardStageView`, check if `countPetition` returns `domain-rules-deferred`, and render `'petition-pending — no signature rule; eligible for call-vote'` instead.

---

### Finding 6 (LOW): Competing Same-Week `call-vote` Moves Leave Dangling `pending` Moves in Ledger

* **Files & Lines:**
  * [`scripts/cron-civic-run.js:2549`](file:///root/GodWorld/scripts/cron-civic-run.js#L2549)
  * [`scripts/applyTrackerUpdates.js:726-730`](file:///root/GodWorld/scripts/applyTrackerUpdates.js#L726-L730)

#### Mechanism
In `callVoteSweep`:
```javascript
const byInit = new Map();
for (const m of calls) if (!byInit.has(m.payload.initiativeId)) byInit.set(m.payload.initiativeId, m);
```
If two seats file a `call-vote` on the same initiative in the same cycle (e.g. Mayor and D3 Councilmember filed during batch or concurrent datawakes), `byInit` only retains the first move.
Only the retained move ID is placed in `manifest.callVotes[initId] = m.moveId`.

In `applyTrackerUpdates.js:726-730`:
```javascript
for (const [initId, id] of Object.entries(manifest.callVotes || {})) {
  const ok = writeOutcome[initId];
  lines.push({ moveId: id, cycle: CYCLE, status: ok === true ? 'applied' : 'failed', ... });
}
```

#### Consequence
Only the winning `moveId` has an outcome appended to `moves_c<cycle>.jsonl`. The second move is never marked `applied` or `failed`, remaining orphaned in `pending` status indefinitely in that cycle's ledger.

---

## Pre-Requisite Check: State of `INIT-003` at HEAD

At the time commit `51fdee28` landed, `INIT-003` in `output/beats/Initiative_Tracker.jsonl` had the following state:
```json
{
  "InitiativeID": "INIT-003",
  "Status": "visioning-complete",
  "ImplementationPhase": "design-phase",
  "VoteCycle": "94",
  "PolicyDomain": "transit"
}
```
Under this live state, any attempt by an agent to use `call-vote` on `INIT-003` would immediately be rejected by `callVoteEligibility`:
`call-vote-row-not-petition-pending(INIT-003 — Status=visioning-complete, VoteCycle=94)`

The `call-vote` escape hatch is strictly dependent on the upcoming **six-row initiative conversion** (resetting `INIT-003` to `Status: proposed` and blank `VoteCycle`) to become operationally usable.

---

## Conclusion & Verdict

Commit `51fdee28` is cleanly engineered and fully validated by unit tests (35/35 in `cron-civic-tick.test.js`, 54/54 in `cron-civic-game.test.js`). The escape hatch logic is well-contained and respects the single legal `Status` transition gate.

However:
1. **The `wokenCycle` filter must be amended** if Clarissa Dane, Jonas Patel, and Narang are ever to fulfill their designated `["tue", "thu"]` shifts.
2. **The work-wake crontab/runner limit must be scaled up** so directors are not starved of tending their initiatives.
3. **`callVoteEligibility` should be wrapped in `try / catch`** to prevent datawake crashes on unexpected metric/domain anomalies.
