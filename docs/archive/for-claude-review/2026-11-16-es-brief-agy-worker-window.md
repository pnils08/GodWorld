# Brief to agy — worker wake: hand the current state, history by tool (pipeline.110)

Read-only review. Write your findings to `output/antigravity/2026-11-16-review-worker-window.md`. Do not edit code, do not run any model, do not run the cron.

## What happened

Mon 2026-11-16 a city worker (the Emergency Management Director) woke on the worker template handed 30,939 characters of records, most of them crisis-arc rows back to Cycle 69. She spent all six tool calls and her page took a half sentence as her statement. Builder's words on it: "thats way too much dropped on it, having a tool to search for history, AI wont read that much and will assume if the packet leaves room to assume".

## What changed (uncommitted, in the working tree — `git diff scripts/workerWake.js scripts/cron-civic-run.js scripts/workerWake.test.js`)

1. `scripts/workerWake.js` `recordKit` takes `ctx.window` (Cycles of each by-Cycle tab handed; unset = every Cycle, today's live behaviour). Not switched on.
2. `scripts/workerWake.js` `sheetRead` (the worker's `sheet_read` tool): newest Cycle first on a tab with a Cycle column; `from_cycle` / `to_cycle` parameters.
3. `scripts/cron-civic-run.js` `workerReplyVerdict`: a reply that ends on a tool call is not saved as a statement.

## The prints (no model call)

`output/engine-sheet/2026-11-16-worker-window-print.{EMERG-DIR,EMS-DIR}.{all,w2,w1}.md` — what each would wake with today (`all`), at two Cycles (`w2`) and at one (`w1`).

## Questions

1. For each block in each print: at `w1` and `w2`, is anything that is still true about the city *now* dropped? Read the tab's own columns (the live sheets are mirrored in `output/beats/*.jsonl`; `Event_Arc_Ledger` is not mirrored — read its columns from the code that writes it, `grep -rn "Event_Arc_Ledger" phase* utilities lib`). A row's Cycle column may be when it was written, not whether it is still in force.
2. Does any block, at any window, leave the worker room to assume something the sheet does not say (a column dropped, a title that claims more or less than its rows)?
3. The three code changes: any path where they fail silently, hand the wrong rows, or break an existing caller of `sheetRead`, `recordKit` or the runner (`grep -rn` all five dirs: `phase* utilities scripts lib dashboard`).

Each finding: file:line, what is wrong, the evidence. No proposals for what the worker should say or do.
