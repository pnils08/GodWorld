# engine-sheet → codex-es: diff review, newsroom recall on + handed closing out (2026-11-11)

Builder 2026-11-11, verbatim "Yes on both" to: (1) turn the past-stories tool (canon_recall, bay-tribune Supermemory) on for every reporter; (2) stop handing reporters a closing question.

Review the exact candidate: `git show 5c8c16f2e` (and the test-shell arm in `git show 5d9cd7ada`). These scripts run off disk at the next cron (06:15 angle, 13:15 report, 18:15 write, Mon–Fri) — there is no deploy step.

What changed:
- `cron-desk-run.js` write wiring: every packet writer gets `--canon-recall` and `--writer-tools` (own package cap, or `RECALL_ONLY_CALLS`=4 for a seat with no tools of its own). `fanoutCheckTotals` carries each grade's max; `gradedLine` prints score/max; `lastGradedLine` reads /3 and /4.
- `cron-desk-writer.js`: the `sm-canon` tag guard on `--canon-recall` removed (still needs `--packet-only` + `--writer-tools`); the package-grant check now skips only recall-only seats; recall hits strip INTAKE / SELF-SCORE scaffolding; rubric drops "Close on" and grades three things; the records-piece compose drops "close the way its closing says". Test-shell-only `GODWORLD_TEST_PROMPT=light` and memory tools off under `GODWORLD_TEST_COMPARE_DIR` (earlier commit, same lane).
- `livedExperiencePacket.js`: `closeQuestion` out of the W1 output schema, the required fields, the normalized plan, the W3 plan, the creative brief, and Jax's voice line.
- `livedExperiencePacketV2.js`: no default `closeQuestion` on the records-brief plan, no `closing` override, `P_CLOSE` slot removed.
- `cron-rhea-gate.js`: contract score no longer asks for or counts `closed`; score out of 3 with `max: 3`.
- `cron-saturday-run.js`: `stagedGrade` maps a max-3 score onto the 0–4 scale so a week straddling the change ranks like with like.
- Tests updated: fan-out handoff, both packet suites, Saturday.

Please look hardest at:
1. Any remaining reader of `closeQuestion`, `closed`, or a hardcoded `/4` that would now break or mis-rank (Saturday print pick, cronFeedback, dashboards).
2. A recall-only seat (no package `writerTools`) through the whole write path: toolset, `RECALL_BLOCK` in the system prompt, manifest amend (`WRITER_TOOLS` truthy), the re-read of the amended state in the runner, Rhea's packet.
3. A seat in `OWN_TOOL_SEATS` whose package lacks `writerTools` (would now throw on the grant check — fail-closed is intended; confirm none exists).
4. Nia seats with recall added.
5. The INTAKE strip regex eating real prose.

Write findings to `docs/for-claude-review/2026-11-11-codex-recall-close-diff-review.md`. Verdict SHIP / HOLD, findings with file:line.

Added after the shell runs (in the same commit): an OpenRouter writer is told "your final message is the section" instead of "call write_file" (a tool-holding Luna seat faked the call as text); `selectUsedToolLines` approves one unquoted sentence of a canon_recall hit when the Article names that Cycle and prints its figure (`TOOL_FACT_SOURCES` now includes canon_recall). Check that branch for laundering risk.
