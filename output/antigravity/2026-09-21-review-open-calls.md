# Adversarial Review: Builder Rulings on Civic Open Calls (2026-09-21)

**Target Commit:** `969384fb` (civic.38/.39: record builder rulings on open calls)  
**Reviewer:** `antigravity` (Second-opinion adversarial review for `research-build`)  
**Repository State:** HEAD (`f30a6063`)  
**Date:** 2026-09-21  

---

## Overview

This review evaluates the five builder rulings committed at `969384fb` covering petition bands, safety delivery margin, Fruitvale transit hub conversion, project director/staff seats, and the civic week boundary schedule shape. For each ruling, findings are strictly partitioned into **Section A (Contradictions)**—direct conflicts with code or plan contracts at HEAD with file:line citations—and **Section B (Different Perspective)**—labelled opinions, alternative civic/narrative readings, and design considerations outside the current plans.

---

## Ruling 1: Petition Bands — Set No Band Now, Run `civicPetitions` Dry, Set Health Band from Counts

* **Ruling Source:** `docs/plans/2026-09-19-civic-wake-game-loop.md:290`, `scripts/civicPetitions.js`
* **Text:** *"Addendum 2026-09-21 (builder): set no band now — only health can be evaluated and nothing gates live; run the counter dry each cycle (`node scripts/civicPetitions.js --dry-run --json` into `output/`, research-build) and set the health band from the real counts."*

### Section A: CONTRADICTIONS

1. **`cron-civic-run.js` Hardcodes an Empty Band Dictionary and Never Invokes Dry-Run Logging (`scripts/cron-civic-run.js:2408-2410, 1833`)**  
   In `scripts/cron-civic-run.js:2408-2410`, `PETITION_SUPPORT_BANDS` is initialized as an empty object `{}`. In `petitionGateSweep` (`scripts/cron-civic-run.js:2440-2451`), every proposal is evaluated via `countPetition`. Because `PETITION_SUPPORT_BANDS[domain]` is undefined for all domains, `s.reason` evaluates to `'support-band-unset'` and `s.cleared` is unconditionally `false`. While this correctly prevents premature live gating, the automated Sunday pipeline has **zero** integration with `node scripts/civicPetitions.js --dry-run --json`. `scripts/civicPetitions.js:6` explicitly states: *"No env loader, model calls, Sheet reads/writes, or output-file writes."* If `research-build` does not manually execute shell redirection into `output/`, no dry-run snapshot is persisted anywhere.

2. **Health Support Math Uses a Sample Numerator Against a Census Denominator (`scripts/civicPetitions.js:210-211, 226`, `docs/plans/2026-09-19-civic-wake-game-loop.md:193`)**  
   `scripts/civicPetitions.js:210-211` defines the health petition numerator strictly as unique in-care citizens from `Hospital_Ledger`: `counts.inCareCitizens = people.size; numerator = people.size; unit = 'tracked-citizens-in-care'`. In the C108 baseline (`docs/plans/2026-09-19-civic-wake-game-loop.md:193`), the entire simulation contains only **2** citizens in hospital care. Meanwhile, `scripts/civicPetitions.js:226` calculates the required threshold as `requiredCount = Math.ceil(population.value * supportBand)`. `population.value` is total synthetic neighborhood census population (Students + Adults + Seniors, typically 10,000 to 35,000 per district).  
   Because `scripts/civicPetitions.js:44` enforces that `supportBand` must be a valid fraction strictly $> 0$ and $\le 1$, even the smallest plausible fractional band (e.g. `0.001` or 0.1%) against a district population of 15,000 yields `requiredCount = 15`. With only 2 patients in the entire hospital ledger across the whole city (and tracked citizens numbering only 952 total), a health petition evaluated against whole-neighborhood census population is **mathematically impossible to clear**, directly violating SIM_DOCTRINE §15 (*"the tracked ledger is a sample, never the denominator"* and *"a gate needs a movable input"*).

### Section B: DIFFERENT PERSPECTIVE (Opinion)

* **Perspective:** The builder's decision to wait for empirical counts before setting a band is wise defense against broken gates. However, measuring hospital admissions against general population treats medical emergencies like political ballot initiatives. Citizens do not sign a petition while intubated in the ICU; their families and neighbors organize when clinic lines wrap around the block or when emergency response times balloon.
* **Alternative Reading:** Instead of requiring a population-percentage signature threshold for health, treat health petition triggers as an **acute capacity condition**:
  * If health numerator remains tracked hospital patients, set the band as an absolute count threshold (e.g. $\ge 2$ residents of that district currently admitted), OR
  * Anchor the numerator to the `Sick` demographic aggregate (which counts 1,929 citizens in C108, line 193) rather than active hospital admissions.
* **What Would Change If Adopted:** A neighborhood facing an outbreak (e.g. 150+ sick residents in Temescal) could actually trigger an emergency clinic petition, transforming the health gate from an impossible mathematical divide into a responsive civic feedback loop.

---

## Ruling 2: Safety Delivery Margin 0.05 / Hold 3 for OARI Safety Lever

* **Ruling Source:** `docs/plans/2026-09-21-safety-lever.md:219`, `lib/initiativePhaseContract.js:240-245, 348-354`
* **Text:** *"RULED 2026-09-21 (builder): safety delivery margin 0.05, hold 3 — a per-domain margin for this lever only (global 0.20 unchanged). Needs ~41% of the above-median excess removed, about 5 cycles at the proposed 10% relief; bench-prove before trusting. The `civicDeliverMargin_safety` key lands with Task 1 of this plan, not earlier (no writer yet, so no dead dial)."*

### Section A: CONTRADICTIONS

1. **Dead Dial & Unreachable Gate at HEAD (`lib/initiativePhaseContract.js:240-245, 348-354`)**  
   At HEAD, `INTERVENTION_CATALOG['safety-program']` has `playable: false` and `effectChannel: null` (`lib/initiativePhaseContract.js:240-245`). When `stageRequirement` evaluates a safety initiative at stage `Standing`, lines 350–353 unconditionally hard-block the advance:
   ```javascript
   if (!entry || entry.playable !== true) {
     out.blocked = 'no-delivering-gate';
     out.text = 'Standing — no delivering gate exists for this domain yet';
     return out;
   }
   ```
   No `civicDeliverMargin_safety` key exists in `World_Config` or engine defaults (only `civicDeliverMargin_health: 0.15` was added in `67fe9e8b`). In `phase03-population/updateCrimeMetrics.js`, there is no code reading an initiative effect bus or modifying `ViolentLevel`. The ruling acknowledges this ("lands with Task 1... not earlier"), but plans referencing safety margin as settled mechanics must record that safety remains completely inert at HEAD.

2. **West Oakland Direct Excess is Zero (`docs/plans/2026-09-21-safety-lever.md:63, 84`)**  
   The proposed safety formula in `docs/plans/2026-09-21-safety-lever.md:84` is `excess = max(0, V0 - M)`. In the C108 baseline (`docs/plans/2026-09-21-safety-lever.md:63`), West Oakland has `ViolentLevel: 26.90`, which exactly matches the 22-hood city median `26.90`. Consequently, `excess = 0` and West Oakland receives `0.00` relief. The average ratio improvement across OARI's three target hoods is driven entirely by East Oakland (33.31) and Fruitvale (30.31). If citywide violence rises and shifts $M$ upward, OARI's excess drops to zero; if citywide violence falls, $M$ drops, increasing OARI's calculated excess even if raw crime in the target hoods did not change.

### Section B: DIFFERENT PERSPECTIVE (Opinion)

* **Perspective:** Codex calculated at line 151 that the maximum possible ratio improvement from this channel alone is `0.121685`, which made the global `0.20` margin physically unreachable. Dropping the margin to `0.05` solves the arithmetic reachability problem, but exposes a deep narrative contradiction: **Why is an alternative response initiative measured exclusively by violent crime?**
* **Alternative Reading:** OARI (*Oakland Alternative Response Initiative*) is canonically an unarmed crisis response and mental-health de-escalation service, designed to divert non-violent, mental health, and quality-of-life calls away from armed police dispatch. By measuring OARI's delivery solely on `ViolentLevel` in `Crime_Metrics`, the simulation forces an alternative response team to act as surrogate SWAT. When violent gun crime spikes due to external gang turf wars, OARI fails its delivery gate despite performing its actual civic mission perfectly.
* **What Would Change If Adopted:** 
  1. Anchor OARI's delivery metric to non-violent crisis metrics (e.g. `IncidentCount` stabilization, property/QoL crime moderation, or neighborhood `composure` in `Reflection_Intake`), OR
  2. If tied to `ViolentLevel`, measure absolute points reduced in above-median hoods (e.g. 1.5 points of direct relief persisted over baseline) rather than a floating ratio against the citywide median $M$, which is vulnerable to macroeconomic noise in unserved districts.

---

## Ruling 3: Fruitvale Transit Hub (INIT-003) Converts to Proposed, Blank `VoteCycle`, No Stage

* **Ruling Source:** `docs/plans/2026-09-19-civic-wake-game-loop.md:289, 149`
* **Text:** *"RULED 2026-09-21 (builder): take the default — INIT-003 converts to Status proposed, blank VoteCycle, no stage (no grandfathered passage). Transit has no petition rule yet, so it sits inert with no clock (no clock on Proposed, ruled). The transit director work-wake pack (T9) will tend a row with no stage — noted, not solved."*

### Section A: CONTRADICTIONS

1. **Wipes Live Historical Council Action and Milestone State (`output/beats/Initiative_Tracker.jsonl:INIT-003`)**  
   In `output/beats/Initiative_Tracker.jsonl`, `INIT-003` currently records:
   * `"Type": "visioning"`
   * `"Status": "visioning-complete"`
   * `"VoteCycle": "94"`
   * `"Outcome": "COMPLETED"`
   * `"ImplementationPhase": "design-phase"`
   * `"MilestoneNotes": "C107: Merchant covenants executed, design RFP published with community-informed requirements"`
   * `"NextScheduledAction": "Design consultant selection"`
   Converting `INIT-003` to `Status: "proposed"` with a blank `VoteCycle` actively erases historical ledger data (`VoteCycle: 94`, `Outcome: COMPLETED`) and resets an initiative that completed its visioning phase 14 cycles ago and published design RFPs in C107 back to an unvoted concept.

2. **Catalog Type Mismatch: `Type: visioning` vs `Type: vote` (`lib/initiativePhaseContract.js:209-214`, `docs/plans/2026-09-19-civic-wake-game-loop.md:294`)**  
   `INTERVENTION_CATALOG['transit-project']` specifies `type: 'vote'` (`lib/initiativePhaseContract.js:211`). Task 4 step 0/1 (`docs/plans/2026-09-19-civic-wake-game-loop.md:294`) rules: *"every seat-proposed catalog row mints as Type vote — the visioning and program arcs have no vote step for Funded to clear on"*. If `INIT-003` retains its historical `Type: "visioning"`, `stageRequirement` cannot advance it to `Funded` via a council vote. If it is converted to `Type: "vote"`, its historical identity as a visioning phase is broken.

3. **Transit Director Tending Stalls on an Unstaged Row (`lib/initiativePhaseContract.js:378-380`, `scripts/work-wake-packages.json:66-86`)**  
   Elena Soria Dominguez (`POP-00791`) wakes every Thursday (`scripts/work-wake-packages.json:80`) to tend `INIT-003`. But in `lib/initiativePhaseContract.js:378`:
   ```javascript
   const TEND_STAGES = ['Standing', 'Delivering'];
   ```
   Tending factor logic only applies to rows at `Standing` or `Delivering`. A row with no stage (or at `Proposed`) receives zero benefit from upkeep tending. Furthermore, under `stageRequirement` (`lib/initiativePhaseContract.js:327-331`), a row at `Proposed` requires a council vote to reach `Funded`. Elena's work wakes will stamp `LastWorkCycle`, but because transit has no petition rule and `VoteCycle` is blank, her work can never move the initiative. The initiative is trapped in permanent administrative limbo.

### Section B: DIFFERENT PERSPECTIVE (Opinion)

* **Perspective:** The builder's ruling strictly adheres to procedural purism: because the full City Council never held a formal roll-call vote on a $230M capital construction package, the project cannot legitimately claim to be `Funded`.
* **Alternative Reading:** In municipal governance, major capital transit hubs never begin with a construction vote; they begin with planning appropriations, EIR environmental reviews, and design RFPs funded out of regional grants. Resetting Elena Soria Dominguez to "unvoted proposal" makes her character voice appear completely disconnected from reality. Her prompt contract (`scripts/work-wake-packages.json:83`) states: *"You know exactly where the project sits in the process and what a vote would unlock."*
* **What Would Change If Adopted:** 
  * **The Legislative Move Alternative:** Instead of waiting for a non-existent citizen transit petition, allow the Mayor (`MAYOR-01`, who originally proposed `INIT-003`) or the District 5 Councilmember (`COUNCIL-D5`, Janae Rivers, representing Fruitvale) to introduce a **"Capital Bond Authorization"** move in their Monday datawake, scheduling a council vote for Cycle 109. This honors the lack of council approval without freezing the row in an unplayable petition queue.

---

## Ruling 4: DA and Okoro Deferred; Baylight (INIT-006) Gets a Work-Wake Pack

* **Ruling Source:** `docs/plans/2026-09-19-civic-wake-game-loop.md:296`, `scripts/cron-work-wake.js`
* **Text:** *"RULED 2026-09-21 (builder): DA and Okoro stay deferred; Baylight gets a work-wake pack — a fifth `initiative-project` registry entry in `cron-work-wake.js` beside the four directors (INIT-006 has a real stage-3 metric). DA has no initiative row; Okoro's Stabilization Fund work is covered by its director."*

### Section A: CONTRADICTIONS

1. **Work-Wake Packages Live in `work-wake-packages.json`, Not `cron-work-wake.js` (`scripts/cron-work-wake.js:14-15`, `scripts/workWakePackages.js:14`)**  
   `docs/plans/2026-09-19-civic-wake-game-loop.md:296` states that Baylight gets *"a fifth initiative-project registry entry in cron-work-wake.js beside the four directors"*.  
   In code, `scripts/cron-work-wake.js` contains **no** package registry entries. It delegates package definitions entirely to `scripts/workWakePackages.js`, which loads `scripts/work-wake-packages.json` (`scripts/workWakePackages.js:14`). The four existing directors are defined in `scripts/work-wake-packages.json:3-86`. Hardcoding Baylight into `cron-work-wake.js` violates the loader contract and would fail validation in `workWakePackages.validatePackage`.

2. **Baylight Domain (Sports) is Marked `playable: false` at HEAD (`lib/initiativePhaseContract.js:233-239`)**  
   The justification in line 296 asserts: *"INIT-006 has a real stage-3 metric"*.  
   CONTRADICTION: In `lib/initiativePhaseContract.js:233-239`, `INIT-006` belongs to domain `sports` (`'sports-district'`), which was explicitly set to **`playable: false`** with `effectChannel: null` in commit `67fe9e8b` following the 2026-09-21 matched-control measurement. The code states:
   ```javascript
   'sports-district': {
     label: 'Stadium or sports-district development',
     policyDomain: 'sports', type: 'vote', playable: false,
     effectChannel: null, // a channel exists in code but is too weak to open this gate — measured 2026-09-21
     stage3Metric: { tab: 'Neighborhood_Map', column: ['RetailVitality', 'NightlifeProfile'], direction: 'up', scope: 'hood' },
   }
   ```
   Claiming that Baylight has an active stage-3 metric contradicts the fact that its domain was decommissioned as unplayable because retail effects cannot clear random noise.

3. **Missing Package Entry for Keisha Ramos (`scripts/work-wake-packages.json`, `scripts/civic-office-map.json:327-346`)**  
   At HEAD, `scripts/work-wake-packages.json` contains zero entries for `STAFF-BAYLIGHT`, `Keisha Ramos`, or `INIT-006`. Keisha Ramos (`POP-00041`) exists only in `scripts/civic-office-map.json:327-346` as an appointed staff director (`agentDir: "civic-office-baylight-authority"`).

### Section B: DIFFERENT PERSPECTIVE (Opinion)

* **Perspective:** Deferring Brenda Okoro is clean administrative common sense: she is Deputy Mayor for Community Development, but Marcus Webb (`POP-00790`) is already the operational director actively managing the West Oakland Stabilization Fund queue. Having both would produce redundant reflections.
* **Alternative Reading:** **Deferring District Attorney Clarissa Dane (`POP-00143`) while retaining Police Chief Rafael Montez (`POP-00136`) damages civic fidelity.**  
  Unlike Okoro, Clarissa Dane is an independently elected constitutional officer with her own constituency and political faction (`IND`, approval 65). In Oakland civic reality, the District Attorney is the primary institutional check on police power, charging decisions, and diversion programs. Giving Police Chief Montez an active weekly seat on the 11-seat datawake rota while silencing DA Dane leaves the justice beat entirely one-sided. Montez can issue statements, answer directives, and work initiatives, while the chief prosecutor of Alameda County has zero moves, zero reflections, and zero public presence.
* **What Would Change If Adopted:** 
  1. Add Keisha Ramos to `scripts/work-wake-packages.json` as `proj-baylight` with `dataNodes: ["initiative-project", "civic-office"]`, waking on Tuesday/Thursday.
  2. Do **not** leave DA Clarissa Dane deferred. If she cannot hold a legislative seat on Council, give her a specialized work-wake pack in `work-wake-packages.json` (tied to `crime-metrics` and `court-filings`), restoring the vital checks-and-balances tension between the DA's office and OPD.

---

## Ruling 5: Schedule Shape — Hourly No-Model Tick, 24h Model Verdict Window, Apply Gates on Verdicts

* **Ruling Source:** `docs/plans/2026-09-21-civic-sunday-stage-machine.md:101, 52-56`
* **Text:** *"RULED 2026-09-21 (builder), shape only: tick runs hourly all week (no-model, idempotent); fold, petition sweep and vote stamping advance as soon as the engine has fired; model verdicts get the ~24h window; apply gates on verdicts. The slot depends on the engine fire time — builder installs the crontab. Open check: whether the Monday datawake needs this week's apply or tolerates last week's board."*

### Section A: CONTRADICTIONS

1. **Direct Contradiction on Apply Gate: Deterministic Only vs Gated on Model Verdicts (`docs/plans/2026-09-21-civic-sunday-stage-machine.md:53` vs `:55, 101`)**  
   * Line 53 states: *"1. **Apply is gated by deterministic checks only:** schema, `normalizeTrackerWrite`, row caps, the single legal Status transition, forward-only fields, grounding. Those are the checks that cannot be wrong about the sheet."*  
   * Line 55 states: *"3. The model sanity-read and the clerk stay, as batch verdict stages that run on the write-set **before apply**... apply waits..."*  
   * Line 101 states: *"**apply gates on verdicts**."*  
   This is an irreconcilable contradiction within the plan text itself. If `--apply` waits for and gates on model verdicts, it is **not** gated by deterministic checks only. If a model provider has an outage or batch turnaround exceeds 24 hours, the mechanical apply is blocked, directly recreating the failure mode of C108 under a different name.

2. **24-Hour Batch Window Collides with Monday Morning Datawakes (`docs/OPERATIONS.md:49, 51`, `SESSION_CONTEXT.md:3`)**  
   * In `SESSION_CONTEXT.md:3`, the live engine runs on Sunday evening (`Sunday 21:00 city-hall slot runs the C108 chain`).  
   * In `docs/OPERATIONS.md:49`, the civic office datawake runs at **05:45 AM Monday** (`45 5 * * 1-4`).  
   * In `docs/OPERATIONS.md:51`, the newsroom angle wake runs at **06:15 AM Monday** (`15 6 * * 1-5`).  
   Between Sunday 21:00 and Monday 05:45 is **8 hours and 45 minutes**. If model verdicts are given a **~24-hour batch window** and `--apply` gates on those verdicts, the tracker updates will **not** be applied until Monday 21:00 at the earliest. When council members wake at 05:45 AM Monday to take their moves, and when reporters wake at 06:15 AM to cover city hall, they will be reading an un-applied, stale tracker from the previous week. Councilmembers could attempt to work or vote on initiatives that the Sunday fold already moved.

3. **Zero Batch or State Infrastructure Exists at HEAD (`scripts/cron-civic-run.js:2791`, `scripts/orBatch.js:107-109`)**  
   `scripts/cron-civic-run.js:2791` defines `STAGES` as a purely sequential synchronous pipeline. There is no `week_state_c{XX}.json` loader or `tick` subcommand. As established in the civic.39 pre-review, `scripts/orBatch.js` has no module exports and immediately terminates the Node process with error code `2` if imported without CLI arguments (`scripts/orBatch.js:107-109`).

### Section B: DIFFERENT PERSPECTIVE (Opinion)

* **Perspective:** The builder's core instinct is completely right: decouple the brittle LLM calls from the mechanical database mutations so that a malformed JSON string from a councilmember does not crash the city's ledger.
* **Alternative Reading:** **A 24-hour window for civic batch verdicts is an unnecessary solution to a problem already solved by fast inference.**  
  As measured in the batch probe (`docs/plans/2026-09-21-civic-sunday-stage-machine.md:81`), Gemini and DeepSeek batch turnaround times are **6 to 13 minutes**, not 24 hours. More fundamentally, why should an editorial clerk or model sanity-read gate the database write at all?
  * If the mechanical fold passed deterministic schema checks, row caps, and transition rules, **apply it immediately to the sheet on Sunday night** (within minutes of engine fire).
  * Run the City Clerk and sanity-read model calls as an **asynchronous audit and historical record**! The clerk writes the official ceremonial minutes and public summary. If the sanity-read model discovers an anomaly, it files an alert flag for the builder in `output/cron-civic/audit_flags_c{XX}.json` rather than halting the city's business.
* **What Would Change If Adopted:** 
  * The Sunday close completes mechanically within 60 seconds of engine fire.
  * The Initiative_Tracker is 100% updated before Monday 05:45 AM, allowing councilmembers and beat reporters to wake up to a fresh, accurate board.
  * The system never halts on model downtime, while still retaining full model-generated minutes and sanity oversight.

---

## Summary of Actionable Findings for Builder & Lane Review

| Topic | Primary Conflict / Finding | Owning Lane Action Required |
|---|---|---|
| **1. Petitions** | `Hospital_Ledger` sample (2 patients) against whole-hood census population ($>10,000$) is mathematically impossible to clear. | Re-baseline health support to acute admissions count ($\ge 2$) or aggregate `Sick` metric. |
| **2. Safety Lever** | Safety domain is hardcoded `playable: false` at HEAD; West Oakland has zero excess over median ($26.90 = 26.90$). | Require engine-sheet implementation before referencing safety as active; evaluate non-violent crisis metrics. |
| **3. Fruitvale Hub** | Blanking `VoteCycle` and resetting to `proposed` wipes historical C94 visioning completion and RFP covenants. | Allow Mayor/D5 legislative move to schedule bond vote, rather than leaving row inert in unplayable petition queue. |
| **4. Baylight & DA** | Work-wake packages belong in `work-wake-packages.json`, not `cron-work-wake.js`; silencing elected DA skews justice beat. | Register `proj-baylight` in packages JSON; assign DA Clarissa Dane a justice work-wake pack. |
| **5. Schedule** | Plan contradicts itself (deterministic apply vs gated on verdicts); 24h batch lag leaves Monday 05:45 datawakes reading stale board. | Apply mechanically immediately on Sunday; treat model verdicts as asynchronous audit/minutes. |
