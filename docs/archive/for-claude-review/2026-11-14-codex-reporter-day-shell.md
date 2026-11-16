# Reporter day test shell — 2026-11-14

**Verdict: HOLD for application and live guarded run.** The runner and proposed cron diff are ready for research-build to apply and exercise. The cron source was not edited here. No model, Sheet, Supermemory, NotebookLM, Discord, or other network call was run.

## A. Invocation and seat context

Example seat read from `output/cron-compare/fanout-2026-11-13.json`: Cycle 115, fanout date `2026-11-13`.

```json
{
  "desk": "culture",
  "name": "Kai Marston",
  "popid": "POP-00158",
  "beatDomain": "CULTURE",
  "persona": "kai-marston",
  "wakePackage": "KAI-LEP2-1",
  "packetContract": "v2",
  "story": {
    "kind": "beat-arts",
    "angle": "Benji Dillon is rising — the acts and the rooms they play",
    "cycle": 115
  }
}
```

The saved fanout object also carries `approach`, `gridDay`, beat-slice facts and evidence, hooks, pulse, and the package key. The runner first applies `newsroomWakePackages.gateAssignments()` to the saved assignment, matching `runFanoutStage` at `scripts/cron-desk-run.js:3684-3690` and `scripts/newsroomWakePackages.js:116-129`. Its source file is copied into the shell. The exact resulting assignment is written to `assignment.json` and supplied to each stage.

The active package is `KAI-LEP2-1`, with packet contract `v2`; its selected routes are `meta-llama/llama-4-maverick` for angle and report, and `anthropic/claude-haiku-5.5` for write. The shell passes `--evaluate-package kai-marston --evaluation-tag <unique-tag> --no-gate` for each one-stage call. Package lookup and explicit evaluation behavior are implemented at `scripts/cron-desk-run.js:165-181` and `scripts/cron-desk-run.js:1377-1379`.

For a saved C115 assignment, the runner expands to these commands (with its generated shell path and tag substituted):

```bash
GODWORLD_TEST_COMPARE_DIR="$SHELL_DIR" node scripts/cron-desk-run.js --stage=angle --desk culture --persona kai-marston --cycle 115 --evaluate-package kai-marston --evaluation-tag "$TAG" --test-assignment "$SHELL_DIR/assignment.json" --no-gate
GODWORLD_TEST_COMPARE_DIR="$SHELL_DIR" node scripts/cron-desk-run.js --stage=report --desk culture --persona kai-marston --cycle 115 --evaluate-package kai-marston --evaluation-tag "$TAG" --test-assignment "$SHELL_DIR/assignment.json" --no-gate
GODWORLD_TEST_COMPARE_DIR="$SHELL_DIR" node scripts/cron-desk-run.js --stage=write --desk culture --persona kai-marston --cycle 115 --evaluate-package kai-marston --evaluation-tag "$TAG" --test-assignment "$SHELL_DIR/assignment.json" --no-gate
```

These execute the same stage functions called by the 06:15 angle, 13:15 report, and 18:15 write fanouts, for one seat. `runAngle`, `runReport`, and `runWrite` consume the `assign` object at `scripts/cron-desk-run.js:1576-1584`, `:2771-2777`, and `:2937-2948`; the patched dispatcher passes the shell assignment to those functions. A plain `--desk culture --persona kai-marston` call passes no `assign`: its `loadLane` has no `beatDomain`, W1 starts without the fanout `story` or `approach`, and its stage stem follows the direct-persona branch (`scripts/cron-desk-run.js:1580-1596`, `:1343-1350`). The test assignment restores the fanout seat context; `--evaluate-package` restores that seat's active package and routes.

## B. Reachable writes and containment

| Site | Writes | Containment in this patch/run |
|---|---|---|
| `cron-desk-run.js:2219-2225`, `:555-559`, `:2813-2832`, `:2760-2766`, `:3426`, `:3600` | Angle, asks, report packet, arc/story doc, and wake artifacts | `COMPARE` resolves to `GODWORLD_TEST_COMPARE_DIR` (`:44-50`); runner writes its assignment, logs, copied fanout, slices, and samples below `output/test-shell/<stamp>-<persona>-day-<pid>/`. |
| `cron-desk-run.js:1550-1561`; `scanCitizenPages.js:268-300`; `buildPulseSlice.js:229-234`; trends writer | Refreshes the live citizen-page index/meta and pulse/trends slices | Proposed early return in `refreshCitizenPages` skips the refresh for any test-shell stage. Fanout execution, which normally calls it at `cron-desk-run.js:3705`, is not selected by the test assignment path. |
| `canon-name-check.js:91-110`; `cron-desk-run.js:1591`, `:2963`, `:3472` | A stale snapshot may invoke `dumpLedger.js` and rewrite the live ledger snapshot | All three calls are skipped when `TEST_SHELL` is set. Existing snapshot files remain read inputs. |
| `buildCivicDomainSlice.js:1087-1093`; `beatSliceKit.js:317-322`; lazy Jax, sports, evening, economic, and beat loaders | Rebuild and persist a slice when the cache is absent or stale | Proposed `loadAngleSlice` reads the shell copy or invokes the builder in memory. Civic-domain load similarly uses its shell copy or builds in memory. The runner copies the selected fanout and `*_slice_c<N>.*` files. |
| `reporterWall.js:98-105`; calls at `cron-desk-run.js:1603-1606`, `:3044-3048` | `ensureReporterWall` can create/update a citizen page pointer through `ensurePagePointer_` | Proposed patch suppresses `ensureReporterWall` under `TEST_SHELL`. Kai's v2 packet path does not enter these legacy wall branches; if one is reached, the wall read remains read-only. |
| `cron-desk-run.js:2623-2632` | Wire entry in `output/production_log_c<N>.md` | **Confirmed uncontained in current source.** Proposed `wirePath` redirects both append and read to the shell's `production_log_c<N>.md`; the existing gaps redirect at `:3433-3434` already targets the shell. |
| `cron-desk-run.js:316-318`, `:3274`; Sheets helper below | `Citizen_Media_Usage` row | `recordBylineUsage` exits before loading Sheets when `TEST_SHELL` is set. |
| `cron-desk-run.js:521`, `:550-559`; `citizenVoice.js:56`, `:218-247`, `:272-282`, `:300-315` | Batch interview output; if `record` is true, page reflection/tension and `Reflection_Intake` | `--no-gate` makes asks `record: false`; batch forwards `!!entry.record && !DRY`. `voiceOne` performs all page/intake writes only in its `record` branch. The angle call at `cron-desk-run.js:2155-2163` has no `--record`; `citizenVoice` defaults `RECORD` false. This is verified from source, not by a live call. |
| `cron-desk-run.js:3212-3230` and `:3256-3268`; `cron-rhea-gate.js:859-862` | Gate verdict files, staged/flagged artifacts, or ungated sample artifacts | `--no-gate` bypasses the Rhea invocation and chooses `SAMPLES`, all below `COMPARE`. The writer's source draft, state, trace, meta and tool output also use `COMPARE_DIR` (`cron-desk-writer.js:52`, `:540-545`, `:1503-1509`, `:1586-1595`, `:1666-1672`), which inherits the shell env. |
| `cron-desk-run.js:3270-3275`, `:3353-3358`; `buildVoicesSlice.js:188-193`; Nia recap writer | Voices coverage file, byline row, or Nia recap ledger | Voices coverage runs only in the `pass` branch, which `--no-gate` bypasses; byline usage exits on `TEST_SHELL`; Nia recap is under `!NO_GATE`. |
| `cron-desk-writer.js:877-883`, `:948-958`, `:1498-1501` | `memory_note` can append to the writer's citizen page | Test shell makes `BYLINE_POPID` null (`:274`); this runner does not pass `--tools-ab`, so `abPop` is null and `memCtx` is null. The write handler then returns `unknown tool`, not `toolMemoryNote`. Tool `sheet_read`, citizen lookup, memory recall, and citizenVoice context reads can still perform external reads when the real shell is run; they do not write. |
| `cron-desk-run.js:2489-2520`; NotebookLM bridge | NotebookLM query; continuity brief file | Persona fanout W1 does not enter `runCanonResearch` (`:2214-2217`). The report file, if that non-persona path were used, would be under `COMPARE`; that path is outside this runner. |
| `newsroom-fanout.js` write path; `cron-desk-run.js:3674-3729` | Fanout creation/results and Discord failure notice | Runner reads a saved fanout and directly runs one stage; patched test assignment is disallowed with `--fanout`. No fanout rebuild, results file, or failure notification path is entered. |

The script's own persistent writes are limited to the newly created shell directory. The tested persona seat is a package-backed fanout seat. The source tree and other output files remain read inputs. The patch includes `--test-assignment` path validation requiring the file to sit under `GODWORLD_TEST_COMPARE_DIR`, and refuses that option without test-shell env, `--no-gate`, one stage, package evaluation, and tag.

## C. The three reported containment defects

1. **Wire entry:** confirmed. `appendWireEntry` used `wirePath`, which pointed to the live production log (`cron-desk-run.js:2623-2632`). The patch redirects that path under the shell.
2. **Page refresh:** confirmed. Direct persona angle refreshes at `:1594`; fanout angle refreshes at `:3705`. `refreshCitizenPages` calls a page dump and writes pulse/trends (`:1550-1561`). The patch disables the whole refresh in test-shell mode. Test stages use the existing page index and copied slices.
3. **Ledger snapshot:** confirmed. The three `ensureLedgerSnapshot` calls (`:1591`, `:2963`, `:3472`) can invoke `dumpLedger.js` (`canon-name-check.js:102-110`). The patch skips each under `TEST_SHELL`.

The containment audit also found (and the patch addresses) page-pointer creation by `ensureReporterWall` and lazy slice-loader persistence. Neither is made safe by `--no-gate` alone.

## D. Interview recording

`--no-gate` is sufficient to disable `citizenVoice --batch`'s recording writes for the report stage: ask construction sets `record: !NO_GATE` (`cron-desk-run.js:521`), batch preserves that as false (`citizenVoice.js:306-315`), and `voiceOne` gates page/tension and `Reflection_Intake` writes on `record` (`citizenVoice.js:218-282`). The W1 angle call has neither `--record` nor `--record-text` (`cron-desk-run.js:2155-2163`); `RECORD` defaults false (`citizenVoice.js:53-56`). Neither call records citizen pages, reflection rows, or the local tension log. `--no-gate` does **not** contain the other writes listed above; those require the proposed test-shell guards and redirects.

## E. Verification boundary

- Read the brief, source call paths, saved fanout, package config, citizenVoice recording branches, writer memory handler, and slice loader/write paths.
- `bash -n scripts/testReporterDay.sh` — PASS.
- `node --check /tmp/cron-desk-run.codex-day.js` — PASS on the proposed patched copy.
- `node --test scripts/cron-desk-writer.test.js` — PASS (1 test file).
- `patch --dry-run` against a temporary copy of `scripts/cron-desk-run.js` — PASS; the proposed diff applies cleanly.
- Did not run the day shell, any stage, any model, Sheet, Supermemory, NotebookLM, Discord, or network call. The contained runtime result is therefore **not yet verified**; research-build owns that guarded run after applying this patch.

DONE
