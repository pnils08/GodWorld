# Brief for agy — adversarial review: a seat-file reporter interviews whom it picks

**From:** research-build · **Date:** 2026-11-25 · **Your output:** `output/antigravity/2026-11-25-review-interview-restriction-out.md` · read-only on code and docs. **This is live:** the newsroom crons read these files from disk; the next 06:15 morning run uses them.

## What changed (commit `91385f174`)

Builder's words (2026-11-25): "take the restriction out, keep the cap, we also dont want to have interviews that arent hitting citizens that 'lived the experince' either but if it chases a different angle we dont want to punish them either". Before: a reporter could interview only citizens in a code-built pool; a plan naming anyone else was rejected (W1) or dropped/thrown (W2).

Now, for seats on a seat file (`ACTIVE_WAKE_PACKAGE.seatFile` → `FREE_ANGLE = 'free-rows'`):
- `scripts/livedExperiencePacket.js` — `buildFreeAnglePacket`: targets schema + rule (any citizen, popid from the record or `citizen_lookup`, question + basis "what in their life ties them to the story"; up to four asked). `validateAngleOutput`: for a free input, a target outside the supplied candidates passes unless `reporterPickRefusal` refuses it (not on the ledger snapshot, not Active, the reporter, `MED (y/n)` = y). `reporterPickCandidate` builds the W2 candidate (`sourceKind: 'reporter-pick'`). `evidenceFor` returns no evidence row for it.
- `scripts/livedExperiencePacketV2.js` — exports `reporterPickCandidate`.
- `scripts/cron-desk-run.js` — `runAngle`: `reporterPicks` written on the angle artifact; `collectQuoteAsks`: picks re-checked and added to `packetCandidates`. `QUOTE_CITIZEN_CAP` (4) unchanged. Seat-file seats ask only whom their plan names (`plannedPops`, pre-existing).
- `scripts/cron-desk-writer.js` — `renderPacketIntake` quotedIn: an answer under 25 characters is matched whole (regression from `225ca7bee`).
- Tests: `scripts/livedPacketFreeAngle.test.js`, `scripts/newsroomWakePackages.test.js`.

## Attack these

1. **A path still restricted.** Any place a pick outside the pool is still rejected, dropped, thrown or silently skipped between W1 plan → angle artifact → W2 asks → citizenVoice batch → W3 write → Rhea gate → INTAKE/usage credit (e.g. the W3 packet's interview list, the gate's name or intake checks, `livedExperiencePacketV2.buildReportPacket`, `interviewContract.ownLifeInterviewPacket`, `isLedgerFillCandidate`, `prepareInterviewPacket`). Trace one pick end to end.
2. **Puppeting added.** Any line in the new plan rule or the interview packet that tells the reporter whom to pick or tells the citizen what to say. The builder's definition: "puppeting means putting words in their mouth and telling them what to say".
3. **Punishing the angle.** Anything that grades, flags or downweights a pick or a story outside the record (reward loop, Rhea, the writer's audit, SELF-SCORE).
4. **"Lived the experience."** Does a pick get its own life in the W2 packet (`ownLifeInterviewPacket`) and room to say it did not happen to them? Does a pick get an evidence row or a claim that the record places them in the story (it must not)?
5. **Breakage.** Records seats (`sourcing: records`) still interview nobody; non-seat-file seats keep the old pool and old W1 rule; a plan with zero candidates and zero targets still validates; a pick named in lowercase; a pick also in the pool; the cap.
6. **The writer change.** `quotedIn` for an answer under 25 characters matched whole: false positives (a short common phrase in the body)?

Each finding: file:line, what is wrong, severity (high / medium / low). Verify every claim against the files before you write it. Do not propose a different goal or design.
