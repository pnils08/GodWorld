# Brief to agy — the reporter template draft, adversarial review (pipeline.110)

Read-only review. Write your findings to `output/antigravity/2026-11-17-review-reporter-template.md`. Do not edit code, docs or sheets, do not run any model, do not run a cron, the engine or a desk wake. Reading live sheets through `lib/sheets` (`require('/root/GodWorld/lib/env')` first), reading `output/`, and running unit tests (`node scripts/run-tests.js` or `node --test <file>`) is allowed.

## What is under review

A **draft** — nothing is built from it. `docs/reference/AGENT_BOOT_TEMPLATES.md` §4 Reporter (commit `f8b5c63a8`): the template every named newsroom reporter would wake on, cut from an approved roster. Read with it:

- §0 (what holds for every template) and §3 (the worker template, already live on 14 city workers — the reporter draft borrows its reader, memory search and question path).
- The roster: `docs/research/2026-11-17-reporter-records-roster.md` (26 reporters; what each reads today; their lead/shared records and worker reports, each approved by the builder).
- The builder's rulings: `docs/plans/2026-11-10-role-citizens-wake-as-themselves.md`, the "Reporter rulings" block under the Task 9 table.

The builder's standard for this build, his words: "the media has been writing decent so this is a very cautious build in that we dont make them worse."

Code the draft names: `scripts/cron-desk-writer.js` (tools, `toolSheetRead` ~845, stance lines ~1250-1290, cascade rule ~1332), `scripts/cron-desk-run.js` (wake path, evening routing ~994, ~1690), `scripts/newsroom-fanout.js` (`WEEK_GRID` ~49, `BEAT_BUILDERS` ~433), `scripts/newsroomWakePackages.js`, `scripts/build*Slice.js`, `scripts/buildCivicDomainSlice.js:537-551`, `scripts/workerWake.js` (`recordKit`, `record_read`, `neighborhoodRead`, the question path ~545), `scripts/cron-rhea-gate.js` (~109-131, ~502-533), `scripts/livedExperiencePacketV2.js:798`, `scripts/reporterIdentity.js`. Baseline output: Monday 2026-11-16's seven pieces (`output/cron-compare/staged/*c116*.staged.md`, `logs/newsroom-fanout.log`).

## Questions

1. **What would make a piece worse.** Walk one reporter's three wakes (angle → report → write) on the draft against what runs today. Name every place a part the writer depends on today (a packet field, an approved-quote or approved-number list, a slice section the prompt or the gate reads, the stale-slice check, the budget, the delivery) is removed or changed by the draft and not replaced. file:line for today's dependency.
2. **The gate.** Rhea checks quotes against `manifest.approvedQuotes` and the write path flags numbers the packet does not hold. With the pack built from roster records and a worker's answer from `call_worker`: what does the gate read, where would each come from, and which pieces would fail or flag that pass today?
3. **The records part (§4 part 5).** Is "lead whole, shared cut to the roster's named part, whole where the row names none" buildable from the roster as written, row by row? Which rows name a cut that no column or filter on the live sheet can make? Which packs, at Cycle 116, would be the largest, in characters?
4. **The worker call.** `workerWake.js` takes a question and who asks. What would a `call_worker` from inside a reporter's tool loop cost (a full worker wake: model, tools, page write)? Can it run without writing? Any path where a worker's answer is saved as the worker's weekly report or moves a dial?
5. **The beat line and the written part.** The draft takes the beat from each folder's `SKILL.md` description and keeps the voice file's `## Essence`. Read all 26: which beat lines carry build talk, and which Essences carry voice direction (how to open, close, what to say) that §0 rules out?
6. **Contradictions.** Anything in §4 that contradicts §0, §3, the roster, or the recorded rulings; anything stated as built that is not.
7. **Trick code / silent paths in what the draft relies on.** A reader that returns empty on an error the writer reads as "none" (e.g. the `Civic_Ledger` read in `buildCivicDomainSlice.js:262`), a cap that cuts without saying so, a filter that matches nothing.

Each finding: file:line or doc section, what is there, the evidence. No proposals for what a reporter should write or what the sim should do.
