# Cron feedback reaches the builder (pipeline.109)

**Row:** pipeline.109 · **Owner:** research-build · **Opened:** 2026-11-09 · **State:** in-progress

## Why

Builder 2026-11-09: "does the journal and the missing data feedback from the crons make it to you or an agent that creates rollout rows?" → no. "sounds like a good idea" (one daily list at boot) · 2026-11-10: "go on your code review and repairs, enhancements".

Verified 2026-11-09, before the change:

| What a cron records | Where it went | Who read it |
|---|---|---|
| What the reporter's packet lacked (`task.creativeBrief.missing` in `output/cron-compare/*_angle.json`; 27 distinct in 7 days) | the angle file | nothing |
| The grade and what fell short (`contractScore`, `gradeRecord` in `*.wake.json`; the opening failed 8 of 32) | the reporter's own page | the reporter |
| Gate findings on held drafts (`flagged/*.flags.json`; 4 in 7 days) | the daily ops report | nobody: `nlm download report` was called with `--no-progress`, an option it does not have, so every poll exited on usage and a report that had rendered was logged "did not render within 15 minutes" on every run |
| Varek's audit points (`output/civis-journal/civis_journal_c<N>.json` `findings[].selected`) | his page, Discord with the Pulse, the daily news once, Mags's search | no builder session |
| A week with no journal (C113, C114) | stderr; the hand-written gap log (G-EC40, G-EC34) | whoever ran the cycle |

The SessionStart hook printed the PIN, NEXT, due reads and the review inbox. No cron feedback.

## What changed

1. **`scripts/cronFeedback.js`** — reads the five records above off disk for the last 7 days (`--days`), writes `output/cron-feedback.md`, and with `--boot` prints a six-line digest. No model call, no sheet, writes only its own file. Files no row.
2. **SessionStart hook** prints the digest after the review inbox (5 s timeout; silent on failure).
3. **Ops report** (`notebooklmDailyNews.js` `createOpsReport`): the bad option is gone; a render NotebookLM marks failed stops the poll; a timeout reports the last download error. The report now reaches Discord each morning as designed.
4. **Varek's journal** (`civisJournal.js`): C113 and C114 lost their entries to one gate line each ("Oaks/Paulson exceeds one line", "repeats a sentence from an earlier entry"; "one lead and two or three carried findings", "private identifier or machine vocabulary") after one draft per route. The gate is unchanged. A writer whose entry fails is shown the entry and the gate's objections and rewrites it, up to twice, before the fallback route is tried. Every entry the gate turned back is kept in `output/civis-journal-failed/civis_journal_c<N>.failed.json` (outside `output/civis-journal`, which Mags's canon search reads). `runCycle.js` Step 5.58's retry rule still matches the first-draft stderr line.

## Tasks

| # | Task | Status |
|---|---|---|
| 1 | `cronFeedback.js` + test | done |
| 2 | Hook prints the digest | done |
| 3 | Ops report download fixed | done — read the 08:00 log for `Daily ops report:` |
| 4 | Journal repair round + kept failed entries + test | done — first live use is the next Cycle's Step 5.58 |
| 5 | Read the digest at the next boot of either terminal | open |

## Not in this job

- The digest ranks nothing and proposes nothing. Which lacks become rows is the builder's call.
- Some `missing` lines are the slice builder's standing guard text, not a fresh lack (e.g. "No invented seasons or franchise history beyond packet + feed"). Not filtered: separating the two is a judgment about each seat's packet.
