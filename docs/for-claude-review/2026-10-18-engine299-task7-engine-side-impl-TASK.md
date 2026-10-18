# TASK — codex: engine.299 Task 7 engine side, real-Oakland premise out of the move text

Deliver a patch, not a commit: `output/codex/engine299-task7-engine.patch` plus `output/codex/engine299-task7-engine.md` (each change with file:line, the reader graph for every string you change, how you proved it). Do not commit, do not push. No Sheet write, cron, model, bench fire or canon run. Report in one line when done.

**Plan:** `docs/plans/2026-10-18-event-engines-move-dials.md`, Task 7 and §Reviews reconciled → Agreed A4. The baseline hit list is `output/engine299/offenders.json` → `premise`, filtered to the four files below.
**The builder's scope (2026-10-18):** "we aren't rebuilding any systems just cleaning up hardcoded events in the engines that don't fit how the sim works now." Same night, the builder also ruled **no engine-words gate**: ledger terms, column names, IDs and metric names are never contamination (`DisplacementRisk`, `MigrationReason`, enum values and comments may stay). The target is the **premise in text that reaches a citizen's history, a story hook, a desk or a sheet cell people read.**
**The rule:** `docs/SIM_DOCTRINE.md` §14 says income comes from the job and the hood follows income. The intra-city move is income fit: what the household earns against what the hood costs. It is never displacement, gentrification or being priced out.

## Keep — do not change

- The move mechanism, its lanes, thresholds, odds and who moves. `DisplacementRisk` stays a Simulation_Ledger column (AL), with the same values and the same readers (`generateCitizensEvents.js:369`, `scripts/buildInitiativePackets.js:321-348`, `scripts/queryLedger.js`). Rates and severity are the builder's dials (SIM_DOCTRINE). If you think a number is wrong, report it in the md and do not change it.
- `MIGRATION_REASONS` enum values written to `MigrationReason`. Existing rows carry 'displaced', and `:516` plus `scripts/migrationRelocation.test.js:310` read it. If you propose a new value, the md must list every reader and the history rows that keep the old one. Do not change it in the patch.
- `ensureCrimeMetrics.js` crime modifiers (West Oakland 1.2 / 0.85 etc.). Those are rate calls for the builder, so put them in the md for §6 only.

## Change

1. **`phase05-citizens/migrationTrackingEngine.js` narrative phrases** (around :796-801): 'displaced from <hood> (risk n/10)' and 'priced out of <hood>' become income-fit wording. Name the move as what the row says, e.g. moved from <hood> to <dest> where the rent fits the household's income, or the budget no longer fit <hood>. Wording is your proposal, with no invented facts and no hardship premise. Trace where `phrase` lands (LifeHistory cell, LifeHistory_Log, hooks, Ripple_Ledger) and list it.
2. **Story hooks** (around :1025-1060): FORCED_MIGRATION "at severe displacement risk in <hood>" and MASS_EXODUS "<hood> mass displacement risk: n residents planning to leave". Reword the descriptions to income fit, e.g. "n households in <hood> weighing a move to a hood that fits their income". Report every reader of these `hookType` names (storyHook, buildContractSeeds, world summary, desk packets) before proposing a rename. If a reader keys on the name, keep the name and change only the description.
3. **`phase06-analysis/applyMigrationDrift.js:253-256`** factor labels 'severe-weather-displacement', 'chaos-displacement', 'high-chaos-displacement'. Trace where `factors` lands. If it reaches readable text, rename to the physical cause (e.g. 'severe-weather-outflow', 'chaos-outflow'). If it is internal only, report and leave it.
4. **`utilities/ensureCrimeMetrics.js:106`** East Oakland `character: 'east flatlands, the Baylight frontier'` contradicts canon: Baylight is the harbor waterfront by Jack London / West Oakland, council D2. Replace with a character drawn from `docs/canon/INSTITUTIONS.md` §Neighborhoods (or Neighborhood_Map) for East Oakland, citing the line you used. Trace where `character` lands.
5. Comments in the four files: fix only those that are now false (e.g. `neighborhoodTrajectoryEngine.js:31` if the hook text changes). Lineage notes stay.

## For the builder (in the md)

List every reader of the 'displaced' MigrationReason value, of `DisplacementRisk`, and of the FORCED_MIGRATION / MASS_EXODUS hook types, with file:line. Whether the displacement-risk lane itself stays (as income-fit mechanics) or is cut is the builder's call. This list is what such a cut would touch. Change nothing on that lane.

## Prove it

- `node --check` on every changed file. Run the existing tests that touch these files (`scripts/migrationRelocation.test.js` and any the grep finds), plus `npm test` if it runs in your sandbox. Report subprocess-EPERM failures as environment, as before.
- Re-run `node scripts/deadBranchScan.js --offenders` (live, read-only) and report the premise count for the four files before and after.
- `git apply --check` against HEAD.

Done = the patch applies and the md exists.
