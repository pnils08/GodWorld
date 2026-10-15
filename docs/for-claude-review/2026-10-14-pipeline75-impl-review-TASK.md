# TASK — codex: implementation review of pipeline.75 (2026-10-14)

**From:** engine-sheet. **Mode:** read-only. No code edits, sheet writes, cron or model runs, commits.
**Output:** `docs/for-claude-review/2026-10-14-codex-pipeline75-impl.md`. One verdict per hunt, with file:line evidence.

**Under review:** `779b2063` (Tanya names + prose facts: `sportsSubstrate.js` resolveFeedPlayers `proseUnion`, `buildTanyaSlice.js`), `0eea9d98` (deterministic draft checks: `cron-desk-run.js` thinCheck / engineTermCheck / verbatimSliceRuns / angleCapHit / fanoutCheckTotals, `citizenVoice.js` --json `usage`), `242a27b7` + the forced-arm follow-up (`cron-desk-writer.js` `--tools-ab` / `--tools-forced`, test-only). ROLLOUT row `pipeline.75` has the builder's words. Acceptance for (1)+(2) is the unattended fan-out Thu 2026-10-15 06:15/18:15.

## Hunts

1. `proseUnion`: a prose-only name joins only when the ledger resolves it — but `resolvePlayer` falls back to a last-name match on sports-ish RoleType. Can a Notes fragment ("Jake London Square", "Game 5", a city name) or a non-subject surname resolve to the wrong player? Does any other caller of `resolveFeedPlayers` get the option by accident?
2. Tanya `proseAnchorFacts`: StoryAngle + Notes in sentence chunks <= 480 chars, max 4. Any path where Notes text reaches the writer as a quote Rhea would treat as an approved quote (Notes carry paraphrased speech: "Stanley shared that …")? Any packet filter (`PLANNING_SKIP_FACT`, the "do not … invent" filter in `livedExperiencePacket.js:378-387`) that drops a Notes chunk silently?
3. Checks placement: `thin`/`engine-term` set `pass = false` after the Rhea proof in `runWrite` only (not `runWake`). Is there any later code in `runWrite` (INTAKE sidecar, citizen arc, recap ledger, self-record) that keys on `pass` and now behaves differently for a Rhea-PASS draft flagged by a check? Is the flagged/ copy still produced and still delivered as flagged by `deliver-articles.js`?
4. `draftWordCount` uses `articleContamination.proseOnly`. Does proseOnly cut at a markdown `***` divider or a long `#` rule that a normal article body might contain mid-piece, undercounting a full article into "thin"?
5. `verbatimSliceRuns`: near-verbatim = one sentence holding >= 80% of an event's 4+ content words. Read it against Tamsin's Lives seat (`buildLivesSlice.js`) — her job is to report these events; confirm WARN-only cannot block her, and estimate false-positive shape on her packets.
6. `angleCapHit`: `citizenVoice` `lastCall` is module-level; in `--batch` mode the envelope is not used — any path where a stale `lastCall` from an earlier call is reported?
7. `--tools-ab`: confirm no scheduled caller can pass it (grep crontab, `cron-desk-run.js`, `newsroom-wake-packages.json`), that `memory_note` cannot write in this mode, and that `tool_choice: 'required'` is only sent on the first turn.
