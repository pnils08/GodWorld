# TASK — codex: implementation review of pipeline.77 (2026-10-14)

**From:** engine-sheet. **Mode:** read-only. No code edits, sheet writes, cron or model runs, commits.
**Output:** `docs/for-claude-review/2026-10-14-codex-pipeline77-impl.md`. One verdict per hunt, with file:line evidence.

**Under review:** `4c476657` — the reward loop on five packages (`rewardLoop: true`): writer `--rubric` (`rubricBlock`, `renderPacketIntake(…, { noSelfScore })`), gate `--contract-score` (`contractWordRange`, `buildContractPrompt`, `parseContractScore`, the separate call after the verdict), runner (`rewardLoop` flags, grade carry via `citizenVoice --record-text`, W1 `lastGradedLine` read into the packet ask, `reward-loop-c<N>.jsonl`, totals). ROLLOUT row `pipeline.77` has the builder's words.

## Hunts

1. Isolation: can the contract-score call change Rhea's `pass`, `flags`, `draftSha256`, or `exactRheaProof`? Does a contract-score error or timeout ever fail the gate or the write?
2. Gaming: the writer sees the rubric. Is there any path where shape-matching moves a sourcing outcome (the judge's text reaching Rhea, the grade line reaching the W3 packet as a fact, the W1 ask line reaching `known`)?
3. The grade line on the page: `citizenVoice --record-text` runs the classifier and appends a gated Reflection_Intake row. Is a "graded:" line classified into an affect/event that later feeds dials or the citizen loop (Reflection_Intake drain, page recall in `citizen-wake.js` / exchanges)? If yes, is that acceptable as a reporter's own-page record, or should the grade line skip intake?
4. W1 ask suffix: appended after `livedPacket.prompt(inputPacket)`. Does it break the JSON-plan contract or `validateAngleOutput` (e.g., models echoing it into `chase`)? Is `recentPage_(popid, 12)` bounded and non-fatal on Supermemory errors?
5. Footer: group drafts carry no SELF-SCORE. Any consumer (Saturday compile, `articleIntake`, delivery, `cronDeskFilings`, edition validator) that requires it for a staged piece?
6. `inTarget` by code: `contractWordRange` takes the one range in a targetWords string; Marbury's is "evidence-bounded; 350-600". Is code-length the right reading for him, and does `contractWordCount` count the same body the writer and thinCheck count?
