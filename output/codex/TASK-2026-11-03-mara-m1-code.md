# Review the Mara M1 build (civic.47) — the exact candidate

Read-only: edit no code, commit nothing, push nothing. Write one file:
`docs/for-claude-review/2026-11-03-codex-mara-m1-code-review.md` — first line `VERDICT: PASS` or `VERDICT: HOLD`, then findings (severity, file:line, input → wrong output).

The builder approved the design (plan `docs/plans/2026-10-31-civic-autonomy.md` §M1, as folded after your two design reviews, plus the 2026-11-03 Changelog entries; one build note in item 10: the weekday reader reads AUTO files only). Nothing is on main yet; the live crons run main.

The candidate:
- Diff against `46d977c97`: `output/codex/mara-m1/change.diff` (16 files: `scripts/cron-civic-run.js`, `scripts/buildCivicOfficeSlice.js`, `scripts/buildInitiativePackets.js`, `scripts/cron-desk-writer.js`, new `scripts/maraDirective.js`, `scripts/maraPromises.js`, `scripts/maraMemory.js`, `scripts/maraM1.test.js`, updated tests `cron-civic-tick`, `cron-civic-game`, `civicReviewFixes`, and five director `RULES.md` files).
- The full tree with the change applied: `/tmp/claude-0/-root-GodWorld/c629e98a-39bc-4b80-8176-91a337bf5a0a/scratchpad/wt-mara` (a git worktree; run tests there if you like — read-only on the live repo).
- Proof run on C114 inputs, real Sol call, dry commit (nothing written to memory or the promise record): `output/codex/mara-m1/proof_*` (the AUTO directive, the manifest, the staged writes). Billed /bin/bash.16.
- Tests: all 25 civic suites plus `cron-desk-writer.test.js` and the new `maraM1.test.js` pass in the worktree.

Check against the code:
1. Does each M1 item work as built — roster and evidence, block validation and Not directing, the promise record (sources, fields, normalization, identity, status relations), staged writes and the commit receipt/resume, the tool loop changes (other callers unchanged?), Sol default + fallback + friction check, the projects-stage Mara trigger and maraAnswer route, prep's per-seat extraction, the initiative-packet copy, the confrontation window, the weekday line, the removed decision-demand line, the director RULES?
2. Anything that breaks a downstream reader on the live Sunday chain, the weekday datawake, the hourly tick, or the gate.
3. Anything in the brief, prompt or proof output that still forces a crisis or must-act frame, or that puts out-of-world material in front of a cron.
4. Weak or missing tests for the items above.
