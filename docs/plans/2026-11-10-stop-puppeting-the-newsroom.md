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

## Open

| # | Item |
|---|---|
| A | **Luis Navarro** still takes the audit anomalies: his seat is built on them end to end (`INVESTIGATION-BRIEF-1`, `silenceClock`, the slice tests). Benching him broke the packet-quote-pool test, so he is active and unchanged. |
| B | **Jax Caldera** (freelance-firebrand) is an engine auditor by charter ("accountability pressure when the simulated record and the public story do not line up", `TWO_SIDED_DATA_AUDIT`, stink labels). Builder-authored seat; untouched pending his word. |
| C | Civic assignments are still handed down (one top-scored tracker row per seat) with `HOOK:` / `APPROACH:` lines. "They can see what's active and write about whatever they want" means the seat sees the cycle and picks. Not built. |
| D | Ines's C114 piece put an A's question to three citizens whose pages had nothing to do with it. The angle stage wrote those questions itself; no code told it to. Not changed. |
| E | `articleContract` and the reward-loop fields are now dead weight in the package file and the wake records. Left in place; the 2026-10-15 "every journalist is graded" ruling is superseded only as far as the contract score. |
| F | Read: tonight's 18:15 write (stories chosen 06:15 under the old assignments), Wed 11-11 06:15 angles, Thu 11-12 08:00 show. No outside review yet. |
