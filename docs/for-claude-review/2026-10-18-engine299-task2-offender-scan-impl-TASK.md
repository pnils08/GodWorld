# TASK — codex: build engine.299 Task 2, the offender scan (`deadBranchScan.js --offenders`)

Deliver a patch, not a commit: `output/codex/engine299-offenders-scan.patch` plus `output/codex/engine299-offenders-scan.md` (what it does, how you proved it, the first run's numbers). Do not commit, do not push. Sheet access is read-only. Run against the bench by `--sheet-id=1tByPpT8QIgJppabjpEdAqPlTjcq2RBSkL_QDrGk8YcA` (SANDBOX 1004) and once against live with no flag. No cron, model, bench fire or canon run. Report in one line when done.

**Plan:** `docs/plans/2026-10-18-event-engines-move-dials.md`, §The offenders (three kinds), Task 2, Acceptance 2, and §Reviews reconciled → Agreed A1–A4 (the settled exceptions).
**The builder's scope (2026-10-18):** "we aren't rebuilding any systems just cleaning up hardcoded events in the engines that don't fit how the sim works now." This is a report tool on an existing script. FIX, don't ADD. The only new files allowed are a test file and the output JSON.

## What to build

A new `--offenders` mode in `scripts/deadBranchScan.js`. Without the flag, the existing Scan 4 behaves byte-for-byte as now. The new mode writes `output/engine299/offenders.json` and prints a short summary. Exit 0 always, because it reports and does not gate.

1. **Inert lines, from the ledger (the ground truth).** Read `LifeHistory_Log` for `--cycle=<n>` (default: the highest Cycle present). Resolve each line's tag through `utilities/citizenDialMap.js`, using the same resolver Phase 9 uses (graded form first, then the bare map; see `nudgesForEvent_` / `gradedNudges_` / `baseTag_`). Count the lines that resolve to `{}` by tag and by source engine, plus their share of the Cycle's lines. Bare `{}` kinds are history and are never re-valued (builder 2026-09-13). The scan counts only lines **of the scanned Cycle**, never older cells.
2. **Inert lines, from the code (where to fix).** In the emitters still writing bare kinds (`phase04-events/generateGenericCitizenMicroEvent.js`, `phase05-citizens/runNeighborhoodEngine.js`, `phase05-citizens/generateMediaModeEvents.js`, `phase05-citizens/generateCivicModeEvents.js`, `phase04-events/generateGameModeMicroEvents.js`, plus any engine the ledger count names), list each string literal that is written as a tag and resolves to `{}`, with file:line. A heuristic is fine if the md says what it can miss. The ledger count is the measure, and this list is the pointer.
3. **Premise words.** Match `gentrif|displace(d|ment)|priced out|encampment|blight|crime rank|urban decay` (case-insensitive) over `phase*/`, `utilities/`, `lib/` and the live `Event_Content_Ledger` Text column (Active=yes). Exclude `output/`, `node_modules/` and `*.test.js`. Report comments separately from strings. **`decline` is not a premise word** (A1: a measured census shift is a fact).
4. **Life-event verbs in color pools.** Match divorce/divorced, promot*, laid off/layoff, married/wedding, gave birth/newborn, died/passed away/funeral, hospitaliz*, moved out/away in the pool text of the emitters above, `phase05-citizens/generateCitizensEvents.js`, and the live ECL Text. Owner engines are excluded: `householdFormationEngine`, `runCareerEngine`, `checkForPromotions`, `bondEngine`, `judicialLifecycle`, `migrationTrackingEngine`. A line that reads MaritalStatus for register (e.g. "a logistics call with an ex") is not an event. Mark it as allowed with that reason rather than hiding it.
5. **Allowlist, in the file, one reason per entry.** The scan reports allowed hits with their reason. It never drops them silently. Settled entries so far:
   - buildContractSeeds' code-sense "never displaced" comments.
   - `updateCrimeMetrics` enforcement-spillover "displacement".
   - Elena POP-00791's `tier1EssenceEvents.js` "anti-displacement" line. It is published canon, held for the builder.
   - `displacementmove`, until es's Task 4 rename lands.
   - `tier1EssenceEvents.js` 'Promotion' essence tags. These are authored Tier-1, not a color pool.
   - Hal Richmond POP-00799's "decline" voice note. This one is moot since `decline` is not matched.
6. **JSON shape.** `{ generatedAt, sheet: 'live'|'bench', cycle, inert: { total, share, byTag, byEngine, codeSites: [{file,line,tag}] }, premise: [{where, file|row, line, text, kind:'string'|'comment', allowed?, reason?}], lifeVerbs: [...same...], acceptanceEmpty: <bool> }`. `acceptanceEmpty` is true only when `inert.total` is 0 and no unallowed premise or life-verb hit remains.

## Prove it

- A test that runs the offender functions on fixtures, not a sheet. It must check that a bare `{}` line of the scanned Cycle is counted, an older-Cycle bare line is not, a graded line is not, a premise word in a string is caught, an allowlisted hit is reported as allowed, and `decline` is not caught.
- Run it with `node`. Also show the existing Scan 4 output is unchanged without the flag (diff the before/after stdout).
- The first real run against the bench (fired C112 on @43) and against live C111 goes in the md, with total, share and the top 5 tags and engines.

Done = the patch applies cleanly to HEAD (`git apply --check`) and the md exists.
