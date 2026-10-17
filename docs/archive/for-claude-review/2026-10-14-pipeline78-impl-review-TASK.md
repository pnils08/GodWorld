# TASK — codex: implementation review of pipeline.78 (2026-10-14)

**From:** engine-sheet. **Mode:** read-only. No code edits, sheet writes, cron runs, commits.
**Output:** `docs/for-claude-review/2026-10-14-codex-pipeline78-impl.md`. One verdict per hunt, with file:line evidence.

**Under review:** the commit titled "pipeline.78" — `lib/articleIntake.js` (`parseStagedSidecar`, `isStagedSidecar`, `stagedSidecarNames`), and its use in `scripts/cron-saturday-run.js` (`loadStagedSet`, `entryByline`, duplicate-bytes skip), `scripts/newsroom-fanout.js` `stagedTally`, `scripts/preSaturdayCoverageSweep.js` `loadStagedStems`, `scripts/notebooklmDailyRouter.js`, `scripts/cron-desk-run.js` `yesterdaysFilings`. ROLLOUT row `pipeline.78`. This changes what reaches canon on Saturday 2026-10-17.

## Hunts

1. Completeness: any other reader of `output/cron-compare/staged/` that still assumes the plain sidecar name (grep `staged`, `.staged.`, `stagedAt`, `STAGED` across `scripts/`, `lib/`, `dashboard/`, crons)? `reconcileRheaDisposition.js:143` builds a plain sidecar path for a known base — does it need the suffix form?
2. Canon identity: suffixed stems become `X-HHMM`. Can that collide with a plain stem that legitimately ends in `-NNN`/`-NNNN` (model slugs, benchmark tags), in `articleCustomId`, the scorecard `byStem` maps, Citizen_Media_Usage `context`, storyline aggregation, or the curated/published sets (`published.has(e.stem)`)? Does `stagedSidecarNames` ever resolve a stem to the wrong sidecar?
3. Proof for suffixed filings: the root fallback verdict is now `<base>.rhea.json` — the LATEST run's verdict for that base, not the suffixed filing's. Confirm `verifyStagedProof` uses the sidecar's inline `rhea` proof first and that a stale root verdict can't pass a mismatched Article. Same for `stagedWritePacket` (root `<base>.state.json` is the latest run's Packet — does the contamination re-scan of an earlier suffixed filing read the wrong Packet?).
4. Double counting: the duplicate-bytes skip keys on `articleSha256`. Is a plain + suffixed pair with identical bytes possible from `uniqueDest`, and is any near-duplicate (same story, re-run) left that should be caught by a different key? Does `stagedTally` now over-count against `WEEKLY_CAP` in a way that blocks a seat?
5. Scope: Saturday sweeps only the current Cycle — confirm nothing (weekly digest, router window, coverage sweep) re-ingests the C108–C110 suffixed files.
