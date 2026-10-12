# engine.217 — isolated bench build proposal (engine-sheet → codex, 2026-09-14)

Status: PROPOSAL ONLY. Nothing pushed, deployed, resynced, or fired. Commit landed: **`9189addf`** (S458 engine.217, codex-led; five paths only).

## 1. What "PROD c37d85ea + only this change" is, exactly

Engine files that differ between PROD @84 (`c37d85ea`) and the repo working tree (`git diff --stat c37d85ea -- 'phase*' utilities`):

| File | Change | In the isolated build? |
|---|---|---|
| `phase02-world-state/applyCityDynamics.js` | engine.214 (`29ba3d75`, `f30b8000`) | **NO** — stays at the `c37d85ea` version |
| `phase08-v3-chicago/v3Integration.js` | engine.217 (`9189addf`) | **YES** — the one overlay |

Nothing else under `phase*/` or `utilities/` differs. `lib/**`, `scripts/**`, docs are `.claspignore`d and never reach Apps Script, so `scripts/economicPhaseOwnership.test.js` is repo-only.

Build recipe (temp-dir route, DEPLOY.md §Verified bench run; every step here is dry until you say go):

```bash
STAGE=<scratchpad>/bench-217 ; mkdir -p "$STAGE"
git archive c37d85ea | tar -x -C "$STAGE"                          # exact PROD tree
git show 9189addf:phase08-v3-chicago/v3Integration.js > "$STAGE/phase08-v3-chicago/v3Integration.js"   # the one overlay
# prove the overlay and the exclusion:
grep -c "engine.217" "$STAGE/phase08-v3-chicago/v3Integration.js"          # must be ≥1
grep -c "assignClusterMembership_" "$STAGE/phase02-world-state/applyCityDynamics.js"   # must be 0 (engine.214 absent)
diff <(git show c37d85ea:phase02-world-state/applyCityDynamics.js) "$STAGE/phase02-world-state/applyCityDynamics.js" && echo 214-EXCLUDED
# sandbox .clasp.json written LAST, grep-verified: sandbox id present, PROD id absent
# then (on your go): cd "$STAGE" && CLAUDE_CTL=1 npx clasp push -f ; clasp deploy -i AKfycby-f9gv5s… -d "engine.217 only, c37d85ea+9189addf" ; clasp deployments (read back @31)
```

Bench web app is currently pinned at **@30 = engine.214 code** (`f30b8000`). The isolated build becomes @31 and supersedes it; nothing on @30 has fired.

## 2. The exact sync blocker

- Command: `node scripts/syncSandboxFromLive.js 1FFpUs98L0wrEcfAaQy6-Ir2xYiCq9baCc0SzqzAMrtM --apply`
- Dry run (no `--apply`) from this terminal at ~23:55 CDT: **clean** — source LIVE `Simulation_Narrative` 82 tabs, dest `Sandbox_0908_c106-live_Simulation_Narrative` 82 tabs, 53,053 rows read, 11 oversized cells sanitized, 0 tabs to create.
- `--apply` from this terminal was **denied by the Claude Code auto-mode permission classifier**, reason `[Modify Shared Resources]`. Not a script error; the script never ran. The script itself hard-refuses the live ID as destination (`scripts/syncSandboxFromLive.js:32`) and copies values only, live → bench.
- Unblock options: (a) Mike runs it from his prompt with the `!` prefix; (b) a permission rule allowing that script with `--apply` for this terminal. Either way it is one command, ~3–5 minutes, read-back verified on the 5 largest tabs by the script.
- Why it matters for engine.217: the bench SHEET currently holds the S451 live-C106 sync **plus bench-only C107–C111** (five cycles fired under engine.213 bench states, `cycleCount` 111). Without the resync a bench fire is C112 on drifted state, not a dress rehearsal of live C108, and the money loop / migration carry (`Carry_Forward_Store`, PropertiesService) would read bench-C111 economic state rather than live C107. After the resync the ghost guard (engine.119 T3) steps the props back to the synced tab's ring — no property wipe needed.

## 3. Read-only baseline capture — what exists, what cannot be captured

Captured to `output/codex/baseline-c107/` (all reads, no writes):

- `execution_log_c107_economy_lines.txt` — the C107 economy lines: money loop reads `mood=59.54` at 8:32:58 (Phase 5, i.e. the **previous cycle's persisted Phase-8 doubled value**), Phase-6 `runEconomicRippleEngine_ mood=54.01` at 8:33:09, Phase-8 duplicate `mood=59.01` at 8:33:22, `v3Integration Modules: 6/6`. After the cut the first bench fire must show one `runEconomicRippleEngine_` line, `Modules: 5/5`, and at the following fire the money loop reading a Phase-6-only mood.
- `carry_forward_store_economy_fields.txt` — the economy-related fields carried in `Carry_Forward_Store` (`PREV_CYCLE_STATE_JSON`, 3-slot ring). **The persisted `econMood` is the Phase-8 doubled value every cycle: C105 59.28, C106 59.54, C107 59.01** (C107's Phase-6 value was 54.01). That carried number is what the next fire's money loop (`ENGINE61_RATE … mood=`) and Phase-2 momentum read, so the cut changes the starting state of C108 by the Phase-6/Phase-8 gap (~5 points at C107). Also carried: `neighborhoodDynamics {12 keys}` at C105/C106/C107 — the engine.214 defect persisted (ten hoods absent from the carry), `economicRipples [5]`, `migrationDrift 14`, `crimeSpikes [0]`, `approvalHoodMoodEma {22 keys}`.
- `../world_config_readonly_2026-09-14.json` — 127 World_Config keys (captured ~00:45).
- Neighborhood_Map C107 (22 rows, all columns) is already on disk in `output/engine_audit_c107.json` `.snapshots.Neighborhood_Map`; Cycle_Packet C107 text is in the live sheet (one row) and quoted in `g-ec82-income-trace.md`.

**Cannot be captured from any sheet:** per-hood `S.neighborhoodEconomies` (mood / descriptor / employment / growth). It is built every cycle at Phase 6 (`economicRippleEngine.js:871`), the packet section that would carry it is dropped by `KEEP_SECTIONS` (`buildCyclePacket.js:767-773`), no beats tab dumps it, and `finalizeCycleState_` does not carry it. The only per-hood economic baseline for the before/after comparison is the **execution log of the first bench fire**, pulled with `scripts/fetchExecutionLog.js` (S456) — so the comparison design should be: fire C108 on @31 (isolated 217) and read its Phase-6 mood + per-hood lines from the log, against the C107 live log lines above, with the Phase-8 line absent. There is no C106 execution log on disk (`output/execution_log_c107.txt` only).

## 4. Fire plan I would run on your go (not before)

1. Mike (or a rule) runs the resync; I read back `cycleCount` 107 on the bench and the 5 largest tabs.
2. Stage + push + deploy @31 per §1; `clasp deployments` read back; pull-back diff of the two engine files against the recipe.
3. Fire C108 (bench GET, ~200s, token from env, never echoed); fetch the execution log; assert: exactly one `runEconomicRippleEngine_` line, `Modules: 5/5`, 0 Engine_Errors, `ok:true`.
4. Fire C109; assert the money-loop `mood=` at Phase 5 equals C108's single Phase-6 mood (the carry now holds the once-computed value).
5. Readback per plan Task 7 §Readback declaration; you direct the comparison.
