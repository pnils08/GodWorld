# Brief for codex-rb — 2026-11-14 (research-build): the reporter test shell runs a whole day

Bounded coding plus a containment audit. Builder 2026-11-14: "Go" (to "codex makes the test shell run a whole day instead of only the evening write").
Row: pipeline.111 — `docs/plans/2026-11-10-stop-puppeting-the-newsroom.md` §The build that is owed, step 1.

## Goal

`scripts/testReporterWrite.sh` runs one reporter's **write** stage in `output/test-shell/<stamp>/`. Wanted: one command that runs the same reporter's **angle → report → write** in one shell folder — each stage the real `scripts/cron-desk-run.js` stage, nothing written outside the shell folder, no sheet row, no page line, no interview recorded on a citizen.

## Deliver — three files, nothing else

1. **New** `scripts/testReporterDay.sh` — the runner. `testReporterWrite.sh` stays as it is.
2. `docs/for-claude-review/2026-11-14-codex-reporter-day-shell.patch` — a unified diff against `scripts/cron-desk-run.js` (and `scripts/cron-desk-writer.js` / `scripts/cron-rhea-gate.js` only where a write site there needs it). **Not applied.**
3. `docs/for-claude-review/2026-11-14-codex-reporter-day-shell.md` — the report (§Report).

**Do not edit `cron-desk-run.js`, `cron-desk-writer.js` or `cron-rhea-gate.js` in place.** The crons run from this working tree: `cron-desk-run.js` fires Sat 07:15, 08:15, 09:15, 10:15, 11:15 and Sun 06:15, 09:15, 12:15. Build the patch from a copy; a patched copy may sit at `scripts/cron-desk-run.codex-day.js` while you test (same `__dirname`, so its requires resolve) and is deleted before you finish.

**Do not commit.** research-build applies the patch between fire times, runs it, and lands it.

## Shape of the runner

- Args `<desk> <persona> [cycle]`. Folder `output/test-shell/<stamp>-<persona>-day/` with `samples/ staged/ flagged/`.
- Seeds the folder with what the angle stage reads from the compare folder (the Cycle's slices, the fanout files) — not the persona's own stage files; this run produces those.
- Runs the three stages in order with `GODWORLD_TEST_COMPARE_DIR` set and `--no-gate`, each to its own log in the folder. A stage that leaves no artifact stops the run with the log tail. A seat that sits the day out is reported as a pass with its reason, exit 0.
- Prints the angle read, the asks with their answers, and the piece.
- Every new branch in the patch keys on the test-shell env var being set, so a scheduled run can never take it (same rule as `TEST_LIGHT`, `cron-desk-writer.js:243`).
- `NODE_OPTIONS` is passed through untouched: research-build prepends a write-guard preload with `--require`. Do not set or clear it.

## Report

- **A. The invocation.** For ONE seat, the exact command lines that reproduce what the 06:15 `--stage=angle --fanout`, 13:15 `--stage=report --fanout` and 18:15 `--stage=write --fanout` runs do for that seat: the `assign` object the fanout passes (name, popid, desk, beatDomain), the wake package, the packet contract. A direct `--desk X --persona Y` angle run takes the `!assign && PERSONA` branches (e.g. `cron-desk-run.js:1594`): say with file:line whether that gives the same seat context as the fanout, and if not, how the runner supplies it. Candidate to check: `--evaluate-package` + `--evaluation-tag` (`cron-desk-run.js:165–181`, `:1378`).
- **B. Every write site** reachable in the three stages for one seat, one table row each: file:line · what it writes · where · contained by (compare-folder redirect / existing `TEST_SHELL` guard / `--no-gate` / your patch / **NOT CONTAINED**). Include the child processes (`citizenVoice.js`, `cron-desk-writer.js`, `cron-rhea-gate.js`, `scanCitizenPages`, the slice builders, `canon-name-check.ensureLedgerSnapshot`, `nlm`), network writes (page adds to Supermemory, Sheets appends), and the model tool `memory_note`.
- **C. Three uncontained writes research-build found** — confirm or correct each from the code, and patch:
  1. `appendWireEntry` → `wirePath` (`cron-desk-run.js:2623–2632`) writes the live `output/production_log_c<N>.md`. The gaps entry was redirected (`:3433`); the wire entry was not.
  2. `refreshCitizenPages` (`:1550–1563`; called `:1594` on a direct `--persona` angle run, `:3705` on fanout) rebuilds the live page index and the live pulse and trends slices. The comment above it says the index must not move between angle and report; a shell angle run between 06:15 and 13:15 would move it under the live seats.
  3. `ensureLedgerSnapshot` (`:1591`, `:2963`, `:3472`) may rewrite the live ledger snapshot.
- **D. Interviews.** Asks carry `record: !NO_GATE` (`:521`). State, from reading `scripts/citizenVoice.js` (read only), whether `--no-gate` alone guarantees `citizenVoice.js --batch` writes nothing to a citizen's page, `Reflection_Intake` or any log; and the same for the angle call (`:2155`, `--pop --ask --json`).
- **E. What you ran and what you did not.** "Verified" only for what you ran or read.

## Off limits

- Edits to `scripts/citizenVoice.js`, `scripts/citizen-exchange.js`, `lib/**` (engine-sheet's files, request-only). If containment needs a change there, do not make it: name the file:line and the change in the report.
- `.claude/**`; any file not named under Deliver.
- **Run nothing that calls a model, Sheets, Supermemory, NotebookLM or Discord** (`AGENTS.md` §Deployment). You do not run the runner end to end. Offline only: `node --check`, `bash -n`, `node --test scripts/cron-desk-writer.test.js`, and any stubbed test you write. A test that only greps source text is not a test. research-build runs the real thing under the guard and reads the guard's log.

## When done

Leave the three files; the report's last line reads `DONE` or `BLOCKED: <what>`. If a step is blocked, stop and say so — do not substitute a different deliverable.
