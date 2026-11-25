# Brief for agy — adversarial review: a seat-file interview wakes the citizen as their own cron

**From:** research-build · **Date:** 2026-11-25 · **Your output:** `output/antigravity/2026-11-25-review-interview-own-wake.md` · read-only on code and docs. **Live:** the newsroom crons read these files from disk; the next report stage (13:15) and the daily citizen wakes (07:30, 12:30, 21:30) use them.

## What changed (commit `c4260bb48`)

Builder (2026-11-25): "Why wouldn't the citizens wake as the Cron ?" Before: a seat-file reporter's interview built the citizen in `scripts/citizenVoice.js` with its own prompt (no lived event, day moments, card anchor, open tensions, the paper, opinions), on the reporter's report model, answering in a JSON form with word/phrase checks (`newsroomInterviewContract.validateInterviewOutput`, `directReactionIssues`).

Now:
- `lib/citizenWakePrompt.js` (new): `WAKE_FRAME`, `loadEditionSlice`, `buildVoicePrompts` moved out of `scripts/citizen-wake.js`; the only change is the part of day as a parameter (`wake`) instead of the script's `WAKE`. `scripts/citizen-wake.js` wraps it: `buildVoicePrompts(...args)` → `buildVoicePromptsFor(...args, WAKE)`.
- `scripts/citizenVoice.js` `wakeForInterview` + the `woke` branch in `voiceOne`: the wake's perception for one citizen, read-only, the reporter's question as the wake's question, DeepSeek v4 flash at 0.85, 340 tokens.
- `scripts/newsroomInterviewContract.js` `ownWakeClaims`: the reply text becomes the quote.
- `scripts/cron-desk-run.js` `collectQuoteAsks` / `runCitizenQuotePass`: `ownWake` on the ask; the reply read through `ownWakeClaims`.

## Attack these

1. **The citizen cron broke.** Is `scripts/citizen-wake.js` byte-for-byte the same in behavior: every caller of `buildVoicePrompts`, `WAKE_FRAME`, `loadEditionSlice`, the provocation seed, the question path (engine.338), the path `loadEditionSlice` resolves (`__dirname` moved from `scripts/` to `lib/`), anything else the moved block used from the script's scope (globals, `logLine`, state)?
2. **Not the same person.** Pieces the cron's wake hands a citizen that `wakeForInterview` does not, or hands differently (compare `citizen-wake.js` main ~L330–500): office title, lived event selection (`livedFor` with an empty state), owed pins in `c.life`, UNDOCKED show block, ripple line, day moments, the resonance `contextText`, `c.memReg`, the pool `c` shape from `citizenVoice`'s pool versus the wake's `buildPool` opts.
3. **Something spent or written that an interview must not.** Lived receipts, ripple consumption, owed journal, recall marks, tension state, the offered-names log — the interview must be read-only apart from the existing PRESS record (page doc, tension register, one Reflection_Intake row).
4. **The answer path.** `ownWakeClaims` → the W3 write packet (`livedExperiencePacketV2` ~L300–360: `approvedQuotes`, factIds empty), Rhea's quote checks, INTAKE quoted-source, the PRESS page record (`extractSpoken` on prose), usage credit. Anything that still expects `lived-context|direct-reaction`, fact ids, or the JSON form. A reply that is long (the wake's 340 tokens) or carries a stage direction.
5. **Puppeting.** The user line: `'<Reporter> from the Bay Tribune asks you: "<question>" Answer in your own words; if it has not happened to you, say so.'` — anything that puts words in their mouth. Builder: "puppeting means putting words in their mouth and telling them what to say".
6. **Scope.** Only seat-file seats (`SEAT_FILE`) get `ownWake`; non-seat-file seats and the reporter's own morning (`REPORTER_WAKE`) keep the old path. Records seats interview nobody.

Each finding: file:line, what is wrong, severity (high / medium / low). Verify every claim against the files before you write it. Do not propose a different goal or design.
