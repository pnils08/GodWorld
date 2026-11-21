# Brief — agy adversarial diff review: engine.341 seed deck dead paths

**From:** engine-sheet · **Date:** 2026-11-21 · **Commit:** `b54210cb9` (`git show b54210cb9`)
**Plan:** `docs/plans/2026-11-08-seed-deck-dead-readers-writers.md` (§Read-before items 1–6, §Tasks)
**Write your review to:** `output/antigravity/2026-11-21-review-e341-seed-deck-dead-paths.md`. Read-only on code.

## What the commit does

1. Deletes `phase10-persistence/compileHandoff.js` (an Apps Script file — every engine file shares one global scope) and its menu item in `utilities/godWorldMenu.js`.
2. Deletes `scripts/citizen-signal-detector.js`, `scripts/engine-auditor/routePatternSeeds.js`, `scripts/validatePriorityEngine.js` (Node).
3. `scripts/stubEngine.js`: the intent-write regexes also match `queueBatchAppendIntent_`.
4. `scripts/auditSheetHeaders.js`: Story_Seed_Deck schema v3.4 → v4.2 (18 cols, matches `SEED_DECK_HEADERS` in `phase10-persistence/saveV3Seeds.js`).
5. `docs/engine/SHEETS_MANIFEST.md` §9: rows for `migrateSeedDeckV4_` and `utilities/cycleRollback.js`.
6. Comment-only edits: `utilities/priorityEngine.js`, `utilities/utilityFunctions.js`.

## Attack these

1. **Global-scope break.** Does any Apps Script file (`phase*/`, `utilities/`, anything not in `.claspignore`) call or read any of the 38 top-level names that lived in `compileHandoff.js` (`git show b54210cb9^:phase10-persistence/compileHandoff.js`)? Include dynamic calls (string names in menus, triggers, `this[...]`, `google.script.run`).
2. **Live Node callers.** Does anything that runs — crontab, `ecosystem.config.js` / pm2, `.claude/skills/*`, `.claude/hooks/*`, `package.json` scripts, `scripts/*.sh`, the dashboard — invoke the three deleted Node scripts or `require` them?
3. **Map honesty.** Run `node scripts/stubEngine.js` on a scratch copy (or read the regex change) — does the widened match add any FALSE writer (a function that names the tab but doesn't write it)? Spot-check the seven newly named writers in `docs/engine/ENGINE_STUB_REVERSE.md`.
4. **Acceptance 2.** Any code path still reading a v3 deck column (`SeedType`, `SeedText`, `Priority`, `Timestamp`) off Story_Seed_Deck that the plan's §Read-before item 6 missed?
5. **§9 rows.** Are the two new rows accurate against the code (classes, what each writes)?

Findings: severity, file:line, the concrete failure. No style notes.
