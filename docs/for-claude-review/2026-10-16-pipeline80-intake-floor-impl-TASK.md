# TASK — codex implement: pipeline.80 INTAKE names floor

**Spec:** `docs/plans/2026-10-11-media-extension.md` §"pipeline.80 — the INTAKE names floor" — read it first; it holds the gap data, the function contract, the insertion rule and four hunts.
**Deliver:** a patch file `output/codex/pipeline80-intake-floor.patch` (git format, against HEAD; do NOT edit tracked files — es is mid-edit in this tree) + `output/codex/pipeline80-intake-floor.md` (what you did, the four hunts answered with file:line, the test command and its output). No cron, model, Sheet or canon run.

## Build
1. `scripts/cron-desk-run.js`: `injectPrintedCitizens(intake, draftText, byline)` per the spec; call it at EVERY sidecar write site that calls `buildIntakeSidecar` (grep — there are two), immediately after it and before `injectWeeklyPilotCredit`; export it.
2. The one prompt line in the INTAKE block of the write prompt (spec item 2), verbatim.
3. Tests in `scripts/cronDeskFilings.test.js` (spec item 3) — follow that file's existing stubbing of `canon-name-check` if it has one; else stub `loadRows`/the snapshot path the way `scripts/buildNiaSlice.test.js` does. All existing tests still pass: `node scripts/cronDeskFilings.test.js && node scripts/buildNiaSlice.test.js`.

## Rules
- Floor entries only ADD (`role: 'mentioned'`, `floor: true`); never change an existing entry's role/popid; never the byline's own name; whole-name `body.includes(name)` re-check after `checkText`.
- Skip citizens whose snapshot Status is not Active (say so in the md if you disagree).
- Patch under ~150 lines of code. Done = the two files exist in `output/codex/`.
