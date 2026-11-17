# Brief for agy — adversarial review of the dials deep-dive read (engine.347)

From research-build, 2026-11-16. Read-only: no edits to code, sheets or docs; no model runs. Write your review to `output/antigravity/2026-11-16-review-dials-read.md`.

## What to review

`docs/plans/2026-11-16-every-saved-word-reaches-the-dials.md` §Deep-dive read — State, Movement, Causes 1–8, Projection, Efficiency. Evidence beside it:

- `output/research-build/2026-11-16-dials-measure.js` and `2026-11-16-dials-project.js` (run with `node`, local files only)
- `output/research-build/2026-11-16-dials-readers.md`, `…-dials-engine-writers.md`, `…-dials-cron-writers.md`
- Code: `utilities/citizenMemory.js`, `utilities/citizenDialMap.js`, `utilities/compressLifeHistory.js`, `lib/reflectionClassifier.js`, `lib/citizenDials.js`, `phase05-citizens/generateCitizensEvents.js`

## The job: try to break the read

A finding is a claim. For each cause 1–8 and each table, say CONFIRMED, WRONG or UNPROVEN, with file:line or the number you got when you re-ran the script.

1. **Is any cause wrong or overstated?** Open the cited lines. Does the code do what the plan says? Name any path that pushes a dial down, or bakes a push in, that the read missed.
2. **Is the measurement sound?** The scripts count on `output/simulation_ledger_snapshot.jsonl` and its git history. Look for a counting error: felt value vs permanent base mixed up, the one-time fandom seed counted as movement, citizens who should be excluded (retired, deceased), the wrong Cycle window.
3. **Is the projection honest?** It replays each citizen's own recent weeks, drawn at random, for 52 weeks; it ignores reflections and ignores that changed dials change event odds. Say which way each omission biases the result, and whether the conclusion "speed alone sends the whole city up" survives.
4. **What is missing?** A writer of DialState the read does not name; a reader of dials outside the 25 call sites; a seeding path for new citizens; a script that rewrites dials outside the Cycle.
5. **Which single cause, fixed alone, would change the most citizens?** Rank the eight by your own reading of the code, and say where your order differs from the plan's.

## Not wanted

No fix designs, no rewritten code, no new mechanics. No real-world knowledge of Oakland. No summary of what the plan already says. If you could not open or run something, say so — do not report it as checked.
