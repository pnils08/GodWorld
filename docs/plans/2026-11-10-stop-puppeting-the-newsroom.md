# Stop puppeting the newsroom (pipeline.110)

**Row:** pipeline.110 · **Owner:** research-build · **Opened:** 2026-11-10 · **State:** in-progress

## Why

Builder 2026-11-10, after the first show made from the articles themselves (transcript: `output/notebooklm/daily/c115/68f51dde275b/transcript.txt`; 0:28 "official data completely detaches from reality", 10:56 the A's title set against citizens it "hasn't touched"):

- "It's media not engine auditors, I don't need numbers I can see already and that get added to canon already as a world summary, they supposed to be covering the 'city' not the engine output."
- "These are reasoning LLMs that don't need you to tell them what to say, they need to be told the agent they are via a persona and memory, they can write about whatever they want, they can see what's active … they aren't cheap models, give them space to be a journalist agent. Stop puppeting the crons."
- "The only thing Rhea gates is names, engine data cited, and canon conflicts, she has zero ability to gate a cron that I'm giving autonomy."

Read from the code, 2026-11-10:

| Where | What it did |
|---|---|
| `cron-desk-writer.js` `rubricBlock` | Handed every writer "WHAT A GOOD ONE LOOKS LIKE": purpose, voice, "Open on", "Close on", length, "graded yes/no on four things" |
| `newsroom-wake-packages.json` `reviewProfile.articleContract` | 18 of 28 seats closed on a form of "the record still needed" / "an unanswered accountability question" / "what remains unknown"; most opened on "a Packet-backed fact" |
| `cron-rhea-gate.js` contract score | A model judged opened / closed / purpose / length and wrote "graded: N/4 — what fell short" onto the reporter's own page every night (C115 week: the opening "failed" 8 of 32, each time for opening on a person) |
| `cron-desk-run.js` thin check | Held a piece on length alone (Mason Ortega C114, 119 words) |
| `buildCivicDomainSlice.js` | Civic assignments scored the engine's audit anomalies highest (Trevor, Angela, Luis at C115); seat hooks read "needs a clear accounting", "accountability question", "question with a visible clock"; Lila was handed the citywide illness figures as an anchor |
| `cron-desk-run.js` civic angle ask | "state the one record-backed claim, identify what remains unestablished, and name the next record … to pursue" |

## Done 2026-11-10

1. `rubricBlock` returns nothing: the writer is handed no script.
2. Contract score off in the gate (`CONTRACT_SCORE` false; `--contract-only` exits). No "graded:" line reaches a reporter's page. Rhea's verdict on names, engine data and canon is untouched.
3. A short piece is logged, not held.
4. Engine-audit anomalies score 0 as an assignment for every civic seat except Luis (open, below). Lila's citywide figures stay on the packet and out of the writer's anchors.
5. Civic angle ask: "What do you want to write this cycle, and which named resident, if any, do you want to hear from?" plus the no-invention line.
6. Civic seat hooks/approaches and the 18 contracts' purpose / opening / closing reworded away from accounting, gaps and warnings. With 1 and 2 the contracts reach neither writer nor grader; the wording is what a later reader of the file finds.

7. `cron-desk-writer.js` writer prompts: the system line no longer tells a reporter with no interview "your job is the record made plain: the line, the vote, the figure, what it shows and what it does not", nor everyone else that the job is "street grain … dirt at a Packet-named place"; the compose instruction no longer says "Open the way packet.reviewProfile.articleContract.opening says … close the way its closing says", "Do not stage a scene, a street, a bar or a room", "Open on a named interviewed person … in a body, doing something", "If you cannot write the life, stop". Left: who they are, that names/numbers/quotes/events are never invented, no real-world Oakland, the INTAKE footer.

Why the newsroom was not "the same model as a CLI with the same tools" (read 2026-11-10): 12 of 27 seats write on Grok 4.3 / GPT Luna / Haiku, 14 on Sonnet 5.5, 1 on Opus; 12 seats have no tools and the other 15 are capped at 6 tool calls; each seat is handed one assignment and one typed Packet and writes in a single pass "built ONLY from" it.

## Reverted the same day: my own instructions (builder 11-10)

"They embody what I built and the instructions you force on them change what they boot as, like why should Lila get a beat on a person when her job is the health system?" Items 4 (Lila's citywide figures withheld) and 6 (seat hooks, approaches and 18 contracts reworded toward "a resident or a place") above were research-build replacing one forced script with another, against the persona files (`.claude/agents/lila-mezran/`: "health clusters, clinic human cost, public health"). Undone: `buildCivicDomainSlice.js` is back to its text before 2026-11-10 except that an engine-audit anomaly is not handed to a seat as its assignment (Luis excepted, open A); `newsroom-wake-packages.json` is back to what was built, with the `opening` and `closing` lines removed from every seat (54 lines) and nothing put in their place. Standing from Done: 1, 2, 3, 5, 7. Shell run after the revert (civic / lila-mezran, 1,078 words): she writes the health system again — the hood counts, the hospital ledger, the 6% watch bar her slice carries — on the angle she chose that morning.

## Test shell (builder 11-10: "make a test shell")

`scripts/testReporterWrite.sh <desk> <persona> [cycle]` copies one reporter's stage files and the cycle's slices into `output/test-shell/<stamp>/` and runs the real write stage there with `--no-gate` (`GODWORLD_TEST_COMPARE_DIR`, honored by `cron-desk-run.js`, `cron-desk-writer.js`, `cron-rhea-gate.js`; no sheet row, no page line). One writer call.

**First run, 2026-11-10 12:18, civic / trevor-shimizu, new instructions:** 932 words, headline "Eight stations rose together on an ordinary weekday, and no single row explains it"; prints the tab name `Transit_Metrics`, an eight-row table of ridership and on-time figures, "the sheet shows the stack but does not weigh it", and closes "what changed in the city that no single station row can name?". **The script removal alone did not change this piece.** Two causes still standing: (1) the angle was chosen at 06:15 under the old ask ("…with no single cause on the record"), and the write follows the angle; (2) what the seat is handed is rows of figures, so rows are what it has to write about. The shell runs the write stage only; it does not yet run angle → report → write.

## The build that is owed (builder 2026-11-10, verbatim)

"Like Jax is literally the accountability journalist, why would they all be written that way? And they have their own persona so how does telling them what to write fit that? And I have PANDA and other sports data systems for them to cover athletes and they get stuck doing what you want them to do, let them decide if what is given is what they want to cover."

Reading: (1) Jax keeps his charter; he is the one accountability seat. Open item B closes: untouched on purpose. (2) No other seat is an accountability or audit seat. The packages show why they read that way: Jax's was the first one built (2026-08-10, codex, "ship ADR-0017 Jax wake package"), and Carmen, P Slayer, Jordan, Kai, Rachel (same day), Luis and Trevor (08-12) and the rest were made from the same template. (3) A reporter is its persona plus its memory. The angle stage shows the reporter what the cycle holds and what it can look up (canon search, sheet read, player dossiers / PANDA / TrueSource, citizen pages), and the reporter decides what, if anything in it, is its story. Nothing is assigned.

Order of work, each step run in the test shell and the piece read before anything goes live:

| # | Step |
|---|---|
| 1 | Test shell runs a seat's whole day: angle → report → write (today it runs write only) |
| 2 | One seat's angle stage: persona + memory + "here is the cycle" + its lookups; no assignment, no hook, no approach line; it picks or passes |
| 3 | Read that piece with the builder. Then seat by seat |

## Standing word on who decides (builder 2026-11-10)

"I'm providing all the tools for this to happen autonomously, sim behavior rests with me but sim cohesiveness doesn't and there are enough ways for agents to address this without waiting on a human."

Behavior (what the world should do: rates, severity, what a seat or an initiative is) is the builder's. Cohesiveness (a number no citizen produces, a loop that feeds nothing back, a constant standing in for a system, two figures that contradict) is found, written down, fixed through the normal path and reported, without stopping to ask. research.33 runs on that word.

## Open

| # | Item |
|---|---|
| A | **Luis Navarro** still takes the audit anomalies: his seat is built on them end to end (`INVESTIGATION-BRIEF-1`, `silenceClock`, the slice tests). Benching him broke the packet-quote-pool test, so he is active and unchanged. |
| B | closed 2026-11-10: Jax is the accountability journalist by the builder's design and stays as he is. |
| C | Civic assignments are still handed down (one top-scored tracker row per seat) with `HOOK:` / `APPROACH:` lines. "They can see what's active and write about whatever they want" means the seat sees the cycle and picks. Not built. |
| D | Ines's C114 piece put an A's question to three citizens whose pages had nothing to do with it. The angle stage wrote those questions itself; no code told it to. Not changed. |
| E | `articleContract` and the reward-loop fields are now dead weight in the package file and the wake records. Left in place; the 2026-10-15 "every journalist is graded" ruling is superseded only as far as the contract score. |
| G | **Transit is a formula, and Trevor's piece described the formula** (builder 11-10: "Trevor is telling you the transit system sucks and he can't cover it"). Read in `phase02-world-state/updateTransitMetrics.js` `calculateStationMetrics_`: ridership = `transitCityRiders` (one citywide dial) × the station's share (residents, workers, retail per hood) × switches (weekend-dominant Cycle × `transitWeekendMult` 0.6, game day, events, holiday hood, First Friday) × a 0.9–1.1 draw. No citizen boards a train. C114 was a weekend-dominant Cycle and C115 a weekday, so all eight stations rose together by about 58% — the switch flipping, which is what "no single row explains it" was looking at. An engine finding for the builder and engine-sheet; not a story, and no row is opened without the builder's word. |
| H | **The requirement behind all of it** (builder 11-10): "If the work doesn't feed back to you it's a broken loop … my news is overrun with how poorly coded the sim is. I'll never get what I'm asking for until the engine loops a city and no ledger is running off hardcoded numbers to appease me as a trick." Three of the day's four gloom pieces read against the code: **transit** (item G, formula); **the fund** — `civicDisburseTranche` 400000 (`phase01-config/engine94SheetContract.js:192`, read at `applyInitiativeImplementationEffects.js:982`): a fund in disbursement is debited a set $400,000 a Cycle whatever is paid out. **Corrected 2026-11-10 by research.33:** tracked households in need are paid real grants out of it (`householdFormationEngine.js` `planFundDisbursement_`), but the debit ignores their sum — at C109 two grants came to $81,188 against a $400,000 debit — which is Carmen's "$7 million moved, two households named"; **health** — `updateNeighborhoodDemographics.js:238` `expectedSick = totalPop * illnessRate * envelopeShare`: a hood's sick count is its population times the city rate times a share, no sick person behind it, which is Lila's "counted by the hundred and named by no one". Business headcount (`applyBusinessDynamics.js`) not read. The audit is filed: [[../research/2026-11-10-engine-figures-citizen-or-formula]]. |
| I | **The gap is the join between the whole city and the tracked few, not the formulas** (builder 11-10, correcting items G/H as worded; his words are quoted in [[../research/2026-11-10-engine-figures-citizen-or-formula]] §How to read). Three joins: crons are not told which figures are whole-city and which are the tracked 1,064; no query returns "none tracked in this situation — bring one into focus" (reporters used to invent the person instead; the engine's `Intake` is not this — it records a named person a story already established); tracked lives and the city figure for the same thing do not meet. **Not a blocker for the media** (builder 11-10, later: "no media outlet is getting an interview for every story so it's not that big of an issue, you don't have to interview someone in a bed, you can interview someone in the hood … the KONO health crisis isn't a health crisis, it's just the highest sick rate in the city"). Some hood is always highest; what turned a ranking into a crisis at C115 was the reporter's own morning angle, not her assignment (she was handed Howard Travis feeling like himself again, score 80; Chinatown was not among her candidates). Earlier, builder 11-10: "idk if this is the answer, more instructions doesn't help … It's about the persona and the harness not a list of instructions. So not sure the answer." Telling crons the scale in a preamble is ruled out as a fix. |
| F | Read: tonight's 18:15 write (stories chosen 06:15 under the old assignments), Wed 11-11 06:15 angles, Thu 11-12 08:00 show. No outside review yet. |
