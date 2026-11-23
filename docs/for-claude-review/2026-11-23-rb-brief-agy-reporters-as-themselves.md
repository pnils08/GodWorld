# Brief for agy — adversarial review: pipeline.111, six reporters wake as themselves (live)

**From:** research-build · **Date:** 2026-11-23 · **Your output:** `output/antigravity/2026-11-23-review-pipeline111-reporters.md` · read-only on code. This is LIVE on disk: Jordan Velez (business desk) wakes today, Mon 2026-11-23, 06:15 (plan) and 18:15 (write + gate). Attack his path first.

## The plan and the builder's words

`docs/plans/2026-11-21-reporters-wake-as-themselves.md` (rulings quoted there, verbatim). The shape: a reporter wakes with who they are (sheet line + canon bio), their beat, their tool list, and this Cycle's engine record; nothing tells them what to write; they pick the story.

## The diff

`git log --oneline 77eba5dd1^..acb6583e2 -- scripts .claude/agents docs/media/voices` (research-build commits tagged `pipeline.111`). Files: `scripts/cron-desk-run.js`, `cron-desk-writer.js`, `citizenVoice.js`, `cron-rhea-gate.js`, `newsroom-fanout.js`, `newsroomWakePackages.js`, `newsroom-wake-packages.json`, `testReporterDay.sh`, `beatSliceKit.js` (isMediaStaff), `buildLifestyleSlice.js`, `buildNeighborhoodSlice.js`, `buildArtsSlice.js`, `buildTrendsSlice.js`, new `buildFoodSlice.js`, new `buildEconomySlice.js`, their tests, `.claude/agents/{sharon-okafor,maria-keen,kai-marston,mason-ortega,celeste-tran,business-desk}/SEAT.md`.

## Attack these — each against the code

1. **One switch.** `SEAT_FILE` / `FREE_ANGLE` are set in `activateWakeContext` (cron-desk-run.js). Find any live path, at any of the three stages or in the fanout, where a seat-file seat still receives old coaching: a STANCE line, a bag file, the kickoff text, the rubric, `approach`, `roomIsYours`, a code-written angle or hook, the reward-loop "Plan this one so it does what the contract asks" line. Any code that reads SEAT_FILE/FREE_ANGLE before they are set.
2. **Jordan and Mason off the economic slice.** `BEAT_BUILDERS` gains `business-desk` and `mason-ortega`; the economic branches are gated on `!BEAT_BUILDERS[personaSlug]`; the fanout's economic enrichment skips them. Find a branch that still loads or injects `buildEconomicSlice` for either, or a place where the business desk now gets no record at all (persona slug vs desk; `enrichBeatSeats`; the stale-beat check).
3. **The morning plan.** `citizenVoice.js --seat-file` replaces the citizen-life prompt on the reporter's W1 call only. Confirm interviews never carry it. The new busy-provider retry in `generate()` (429 / 5xx, 5 s then 15 s): any path where a retried call can double a page write, an intake row or a recorded interview.
4. **The writer.** `--seat-file` system prompt and `seatPacket()` (strips limits, policy and the gate profile from what the writer is sent). Confirm the gate (`cron-rhea-gate.js`, `auditArticle`) reads the full Packet from disk, not the trimmed one; any check that now passes vacuously. `TEST_LIGHT`/`TEST_BARE` now true in live seat mode — every other effect of those flags in the writer.
5. **The six records.** Each builder: the cached JSON reused when `version` matches (a stale cache surviving a version bump?), `sitsOutWhenEmpty` and what a pass/sit-out does downstream, a throw on a missing world summary or texture file, sources that are not this Cycle, the people caps, `K.isMediaStaff` (MED flag) applied everywhere a person is added.
6. **The grade.** `parseContractScore`: a contract with no opening grades `opened` true. Any other consumer of `articleContract.opening` / `voice` / `closing` that breaks on the new profiles.
7. **Identity.** `--no-essence` (package `seatEssence:false`) through writer and citizenVoice; the validator's `seatFile` / `seatEssence` rules.
8. **Evening pack.** Maria and Kai left it at both attach points (the persona regex and `EVENING_SLUGS`); the fanout's evening enrichment. Any place they still receive it.

Each finding: file:line, the failure scenario, severity. Verify every claim against the code before you write it. Do not propose a different goal or a different design; this review is of what is built.
