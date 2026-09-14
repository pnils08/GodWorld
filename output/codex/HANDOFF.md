# Codex simulation repair handoff

Updated 2026-09-14. Builder-requested checkpoint, not a claim that the sim is fixed.

## Current direction and authority

Mike's current instruction is **"tell codex to take the lead and fix the sim."** This is broader than the earlier one-file reviews and ten-hood defect. Codex chooses and reviews repairs; engine-sheet is the hands-on partner for substrate edits, commits, bench builds and readbacks. Ask Mike directly in the Codex pane for genuinely necessary decisions. Do not ask him to re-scope the whole job again.

**All fires are held. No deployment, resync, or fire was performed in this repair session. engine.214 is unaccepted for firing.** The latest steering authorizes Codex to run the specific live-to-sandbox reset below when ready; it does not direct an immediate fire. Mike rejected leaving hood names and constants in the engine; use ledger truth and World_Config. The previous engine.214 LAND review only assessed that earlier implementation against its earlier specification, not this broader requirement.

The existing PIN and engine-sheet NEXT still describe Mags leading and firing engine.214. Those lines are stale against Mike's current direction; Codex must not edit them. The owning plan and rollout now record the changed direction. Only NEXT[codex] is ours to update.

## Committed repair: engine.217

**Commit `9189addf`**, authored/landed by engine-sheet under Codex direction, is local and unpushed. Five paths only:

- `phase08-v3-chicago/v3Integration.js`
- `scripts/economicPhaseOwnership.test.js`
- `docs/plans/2026-09-13-run-cycle-packages-the-world.md` (Task 7)
- `docs/engine/ROLLOUT_PLAN.md` (engine.217, in-progress)
- `docs/index.md`

The economy ran in Phase 6 and again in Phase 8. C107 logs show 54.01 then 59.01 (`output/execution_log_c107.txt:150`, `:168`). Removing the economy registry entry and its scheduled call from v3Integration leaves Phase6-EconomicRipple the sole scheduled owner. The compatibility wrapper and all other integration modules remain. No economic coefficient or neighborhood membership was changed.

The second calculation also overwrote intervening migration feedback: `applyMigrationDrift.js:498` changes city mood and `:531-538` changes neighborhood mood. Therefore acceptance is preservation of **post-migration** economic state through Phase 8, not equality with the earlier Phase-6 economy log value.

Verified locally:

```sh
node scripts/economicPhaseOwnership.test.js
node scripts/hoodIdentityRemainder.test.js
node phase09-digest/finalizeCycleState.test.js
node --check scripts/economicPhaseOwnership.test.js
node --check phase08-v3-chicago/v3Integration.js
git diff --check
```

Six two-Cycle scenarios pass in both real scheduler entry points; the test parses their actual calls and runs real economy, migration, and integration. The same final test fails all six against `75b45b5b`'s v3Integration. Neighborhood suite 38/38, carry suite all pass, ES5 Acorn parse passes. ROLLOUT lint reports 24 pre-existing unrelated violations; engine.217 itself conforms.

## Next repair: hospital income loss is erased

**Not implemented.** `scripts/hospitalIncomePersistence.test.js` is a new, untracked Codex file. Preserve it. Syntax passes; current result is **10 controls pass, 6 regression cases fail**.

An initial offline probe using the existing hoodIncome harness and real Career/floor code produced **91,500 → 86,925 → 91,500**. The standalone regression uses a different clearly synthetic profile and produces **96,800 → 91,960 → 96,800**. Same defect; do not confuse the differing fixture values with live citizens.

The test drives real `runCareerEngine_`, `calculateCitizenIncomes_`, `applyTrackedEmployerFloor_`, and `applyUntrackedJobReference_`, in production order. It covers hospitalized and critical workers for UNTRACKED, SELF_EMPLOYED, and a synthetic BIZ employer. It intends to round-trip ledger rows and repeat the following Cycle. The first-cycle floor currently restores the lost income, so all six cases fail there. Healthy corrections, a different admission's old marker, recovery, and blank-employer pay cuts are controls. No synthetic data leaves the VM.

Mechanism and source pointers:

- `phase05-citizens/runCareerEngine.js:924-951`: after two Cycles in hospital/critical status, income is cut once and LifeHistory gains `[IncomeHit A<StatusStartCycle>]`.
- `phase01-config/godWorldEngine2.js:360`, `:385` (second entry `:2105`, `:2130`): Career precedes GenerationalWealth.
- `phase05-citizens/generationalWealthEngine.js:132`, `:138`: tracked and untracked floors run after Career; writes at `:639` and `:853` restore the reference.
- `applyOwnerDraw_` runs after both floors (`:143`); its separate treatment of owners has not been repaired or proven here.

**The next step I would take:** finish the smallest hospital exception, prove it in memory against this regression, then give engine-sheet the exact substrate patch. Proposed design, not yet applied: a shared pure predicate checks hospitalized/critical Status, a positive finite StatusStartCycle, and the exact current-admission `[IncomeHit A<n>]` marker in LifeHistory. Both income floors skip such a row. Do not globally disable floors, cap raises, invent a new pay scale, exempt all hospital admissions regardless of a recorded loss, or change owner draws in this cut. Recovery would restore normal floor eligibility. Check the actual status-transition and LifeHistory compression paths before finalizing the predicate: the current test does not exercise compression or hospital transitions.

Run the test before/after, retain the controls, and run the existing `scripts/hoodIncome.test.js` suite. No engine.218 row or hospital plan addition has been made yet. Update the owning employment plan/rollout with the concrete cut and readback before landing; don't commit a failing regression as completed work.

Required Haiku wiring runs were performed:

- `output/agent_engine-wiring_2026-09-14T05-37-42.md`: neighborhood/city dynamics card, completed; verify its claims because some names/lines are wrong.
- `output/agent_engine-wiring_2026-09-14T05-39-20.md`: duplicate economy investigation; turn limit reached before final card. Task 7 supplies a manually verified wiring card.
- `output/agent_engine-wiring_2026-09-14T05-51-48.md`: hospital/floor investigation; also reached its limit without a final card. Its tool reads are not a completed card. Supply the verified card from the actual sources above before presenting the hospital patch; do not count the harness success/coverage label as proof.

## Income evidence: retain the corrected conclusion

Engine-sheet's evidence is `output/codex/g-ec82-income-trace.md`; current config dump is `output/codex/world_config_readonly_2026-09-14.json` (127 keys).

All eight C107 jumps recompute exactly to the new job reference. New catalog bands and profile-based band positioning deployed between C106 and C107. This is evidence of a catalog correction, not proof of an arbitrary doubling bug. Do not impose an income cap to hide it.

I rejected engine-sheet's initial claim that layoffs re-floor: both real layoff paths clear EmployerBizId (`runCareerEngine.js:321`, `:1462`), and floors exclude blank employers. The report was corrected. The "93 at reference" census does not prove 93 citizens cannot lose income. Hospital loss is separately reproduced; owner re-floor/draw interaction remains to investigate. C107 has two hospitalized citizens, one newly admitted; no claim that the synthetic failure has already affected either live row.

## Bench proof: proposal needs correction before execution

`output/codex/engine217-bench-build-proposal.md` is engine-sheet's proposal, **not approved instructions**. Its baseline captures are in `output/codex/baseline-c107/`.

- Intended isolated code: PROD `c37d85ea` plus only `9189addf:phase08-v3-chicago/v3Integration.js`. Build in scratch, preserve the shared tree, exclude engine.214 byte-for-byte. Only applyCityDynamics and v3Integration currently differ from PROD under engine paths.
- Active sandbox 0908 sheet: `1FFpUs98L0wrEcfAaQy6-Ir2xYiCq9baCc0SzqzAMrtM`; deployment is @30 containing engine.214, **unfired**. Sheet remains bench-only C111. Resolve current script/deployment IDs from `docs/reference/DEPLOY.md` before doing anything.
- Engine-sheet's earlier live→sandbox resync was rejected by its automatic approval classifier as `[Modify Shared Resources]`; it did not run. Latest steering corrects the diagnosis: the `--apply` operation itself is rejected, not command chaining, and its existing `Bash(node *)` permission does not solve it. Do not change permissions or disguise commands. The script overwrites sandbox tabs; live is its read-only source.
- **Latest authorized route:** Mike will not run terminal commands or sign acceptance; the engineering lanes own execution and verification. Codex may run `node scripts/syncSandboxFromLive.js 1FFpUs98L0wrEcfAaQy6-Ir2xYiCq9baCc0SzqzAMrtM --apply` from its own pane when ready, using Codex's normal sandbox/approval controls, or direct one honest retry in engine-sheet and read the exact response. This is explicit current authorization for the named sandbox reset, not authority to disable controls. It has NOT been run. Review the remaining implementation of the sync script before execution (already read through the batched clear/write section); verify truncated cells are understood and the five-largest-tab readback completes. Engine-sheet then independently reads sandbox cycleCount 107 before any build. Do not ask Mike to run the command.
- A possible safer alternative, **not yet directed**, is a structural once-per-Cycle proof on existing C111 bench state, explicitly not a live-equivalent rehearsal. It would avoid resync but needs an updated proof declaration and coordination with engine-sheet before any fire.
- Correct the proposal's readback: C108 starts from unchanged C107 carried mood 59.01. This cut cannot retroactively alter C108's starting state. C109 should read C108's final post-migration mood, not necessarily its Phase-6 completion-log mood.
- Correct the proposal's observability claim: economy per-hood values are not printed by the existing completion log. `buildCyclePacket.js:671-690` assembles them but KEEP_SECTIONS (`:767-773`) removes them. That filter was a deliberate consumer contract, not a license to re-enable all sections. A real per-hood readback needs an explicit diagnostic/readout path.
- Correct the deployment recipe: explicitly pin the actual created version with `clasp deploy -i ... -V <version>` and read it back; don't assume @31 or rely on bare deploy. Codex must never set `CLAUDE_CTL=1`; that flag is Claude-only, even if it appears in the partner's recipe.

## Remaining causal repairs, not completed

1. **Neighborhood economic carry:** Phase 2 reads `S.neighborhoodEconomies` (`applyCityDynamics.js:98`), but producer runs Phase 6 and finalizeCycleState does not serialize it. The current economic branches are disconnected across Cycles. Establish the post-migration range, then add a bounded carry and real next-Cycle behavior proof. Don't activate thresholds only with extreme synthetic values and claim live behavior.
2. **Neighborhood truth source:** engine.214 still embeds five authored clusters, 12 anchors, weights, capacities and place-name branches. Its 22-key test does not solve this. The standing ADRs are 0015 (World_Config tunables) and 0016 (ledger entity truth). Roster, character, weather, adjacency, scenes and structural profiles already have sheet accessors; read them before inventing a new table or graph rule.
3. **Media feedback duplicate:** Phase 7 and Phase 8 call it; audit intervening inputs and consequences before copying engine.217's removal.
4. Existing health/QoL, sports coupling, illness config, and citizen loop gaps are leads in ROLLOUT/C107 evidence. Follow actual causes; do not equate completing reports with repairing the sim.

## Resume mechanics and workspace ownership

Read current AGENTS and Git state. At checkpoint HEAD is `9189addf`, ahead of origin/main by four commits: `29ba3d75`, `f30b8000`, `75b45b5b`, `9189addf`. Subsequent Codex handoff commits may add to that stack. Do not push the mixed stack from Codex. No staged paths at checkpoint. Many pre-existing runtime output changes and `scripts/notebooklmCanonSources.json` are unrelated; preserve them.

Engine-sheet is a Claude session. Last pane was `%71`, but resolve it live. Read `docs/reference/CROSS_LANE_MESSAGING.md`. Confirm an idle **empty** prompt before literal send-keys, wait one second, then C-m; verify receipt. Mike sometimes types into that pane during our work: never append to or submit his unfinished input. Substrate changes are applied by this partner only after the concrete patch and tests are ready.

Earlier bounded review artifacts remain in `output/codex/`: `pipeline69-plan-review.md`, `engine214-cut-review.md`, `engine214-confirm.md`. Their scopes and historical verdicts do not supersede the current broad repair direction.
