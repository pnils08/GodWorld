# TASK — codex: implementation review of pipeline.74 (2026-10-14)

**From:** engine-sheet. **Mode:** read-only. No code edits, sheet writes, cron runs or commits.
**Output:** `docs/for-claude-review/2026-10-14-codex-pipeline74-impl.md`. One verdict per hunt, with file:line evidence.

**Under review:** commit `c9d59d24`: `scripts/cron-desk-run.js` (angle cap), `scripts/buildTanyaSlice.js` (+ test), `scripts/buildPSlayerSlice.js` (+ test), `scripts/newsroom-wake-packages.json` (noah-tan write model). The ROLLOUT `pipeline.74` row carries the evidence (`logs/newsroom-fanout.log` 1030–1618, `output/cron-compare/tanya_slice_c111.json`). Acceptance is the unattended fan-out Thu 2026-10-15 06:15.

## Hunts

1. Angle cap 700 → 1600 (packet mode only). Is there any other cap between the model and `validateAngleOutput` (citizenVoice `--max-tokens` parsing, `--batch` maxTokens, an OpenRouter-side limit per model) that still cuts a v4-flash plan? Does any downstream consumer assume a W1 plan under ~2,800 chars (the chase is clipped to 700 in `reporterChaseText`; check `focus`/`why`/`interpretation`/`targets`/`checks` paths into the W2 packet and the angle.json artifact)?
2. The rb read named a second cause: a 616-token ```json-fenced output. The log shows it was Rachel Torres's resample and it passed. Confirm or refute: is there any fenced shape `parseJsonObject` (`scripts/livedExperiencePacket.js:453`) rejects that a complete plan can take (leading prose before the fence, a trailing note after it, two fences)?
3. Tanya label: a record with no digit labels from `row.storyAngle`. Any row where the record is digitless but the season is live (preseason `0-0`? a `-` mid-season row), or where StoryAngle is a placeholder ("Open space to cover A's players/team", C111) that would now become the assignment because `score()` ranks it top? Is the label still the right field for `angle`/`hookLine`, or does a packet consumer (`livedExperiencePacketV2` sideline-dispatch brief) expect the record string?
4. P Slayer `story.citizens` → "Name (POP-x)". Every reader of `story.citizens` for a P Slayer assignment (cron-desk-run `citizenBrief`, the W2 packet, Rhea gate, markdown at `buildPSlayerSlice.js:736`, dashboards): did any parse the old "Name — role, hood" shape or need role/hood that is now gone? POPIDs are stripped from writer-facing surfaces — confirm no new path prints a POPID into prose.
5. Noah Tan write → `x-ai/grok-4.3`. Does the write stage read per-model settings (temperature, max tokens, reasoning flags, Rhea gate model pairing) keyed on the model string that grok-4.3 lacks for this seat? Any test pinning noah-tan's model?
