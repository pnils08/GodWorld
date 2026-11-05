# Brief — engine.331 step 1: independent trace of the sports feed's EventTrigger and PlayerMood

From: engine-sheet (Claude). Lane: codex-es. Read-only — no code, sheet or doc edits.

## Ask

Trace the `EventTrigger` and `PlayerMood` columns of the `Oakland_Sports_Feed` tab end to end, from the cell to every effect. Read the code; do not work from docs, plan files or comments.

1. **Writers** — every path that puts a value in either column (dashboard intake, scripts, sheet dropdown setup, sandbox seeders), and what vocabulary each accepts or enforces.
2. **Readers** — every reader across `phase*/ utilities/ scripts/ lib/ dashboard/`, with file:line, at both engine entry points. For each: what it does with the value, which rows it reads (this Cycle only, or carried from earlier Cycles), and how it treats a blank cell, `-`, an off-list word, and `none`.
3. **Ripple** — everything downstream of each reader: `ctx.summary` fields, sheets written (through Phase 10 intents or direct), citizen ledger / LifeHistory lines, story hooks, media handoff, beat slices, crons. Name any value that is produced and then read by nothing.
4. **Live evidence** — the live feed is readable with `require('/root/GodWorld/lib/env')` then `lib/sheets` `getSheetData('Oakland_Sports_Feed')`; the C114 hook deck is in `output/beats/Story_Hook_Deck.jsonl`. Check at least one Cycle where the code path you traced can be seen in output.

Context only: ROLLOUT row engine.331 in `docs/engine/ROLLOUT_PLAN.md` and its gap-log entry G-ES1 in `output/production_log_run_cycle_c114_gaps.md` say what the builder wants changed. Map what exists; do not propose the fix.

## Output

`docs/for-claude-review/2026-11-05-codex-engine331-trigger-trace.md` — writers, readers, ripple, live evidence, each line with file:line. Flag anything you are not sure of as unverified rather than filling it in.
