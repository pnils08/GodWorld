# Task: write scripts/modelFitScore.js (deterministic scorer for the model-fit test)

Context: docs/plans/2026-09-22-agent-model-fit-test.md (read §Method and §Running the test). Runner scripts/modelFitRun.js appends one JSON row per model call to output/model-fit/runs.jsonl. Row fields: ts, input (repo-relative path), model, provider, tier (structured-seat | semi-open-voice | open-character), reasoning, finish, tokensIn, tokensOut, tokensReasoning, costUsd, words, chars, jsonValid, output (text), error?. runs.jsonl is empty right now — you build against synthetic rows.

Files you may touch: scripts/modelFitScore.js (new) and output/model-fit/score-fixture.jsonl (new synthetic rows). Nothing else. Do not commit, do not push. Do not call any API/network. Do not edit scripts/cron-civic-run.js.

## What it does
`node scripts/modelFitScore.js [--runs output/model-fit/runs.jsonl] [--out output/model-fit/scores.json] [--blind-dir output/model-fit/blind]`

1. Per row, compute deterministic checks and add to scores.json (one entry per row: input, model, reasoning, tier, plus checks):
   - ALL tiers: error present -> `errored:true`, skip other checks; `finish` (flag `truncated:true` if finish is "length"/"max_tokens"); tokens, costUsd, words.
   - structured-seat: `const civic = require('./cron-civic-run.js')` (safe: guarded by require.main). `v = civic.validateVoiceJson(row.output)` -> `schemaOk`, `schemaWhy`. If ok: `civic.statementNumberCheck(hay, {district:<digit from input filename council-dN>, cycle:<number from filename cNNN>})(v.json)` where hay = the input file's text -> `groundingOk` (null result = pass; else record the message as `groundingWhy`). Also `maxMilestoneChars` = longest trackerUpdates MilestoneNotes (flat or nested-by-initiative) and `milestoneCapOk` = <=200. Also `statements` count and `wordsPerStatement` (mean words of fullStatement).
   - semi-open-voice: `groundedNumbersOk` = `civic.ungroundedNumbers(hay, [row.output], {cycle})` returns empty, hay = input file text; list any `ungrounded`.
   - open-character: for the agent inferred from the input filename (mags-narration | elias-varek), load output/model-fit/persona-facts.json (I am writing this now; shape: `{ "<agent>": [ {"id","fact","contradictPatterns":["regex", ...]} ] }`). `factViolations` = ids whose contradictPatterns match row.output (case-insensitive); `factsChecked` = count. If the file or agent is absent, set `factsChecked:0`, do not crash.
2. Voice distinctiveness: for each model+reasoning arm that has outputs for two different agents (mags vs elias, and carmen vs council seats), compute word-level Jaccard overlap (lowercased, stopwords removed with a small built-in list) between the two outputs; write matrix to scores.json under `distinctiveness`.
3. Blind pack (`--blind-dir`): for each tier, take all non-errored rows' output text, shuffle with a fixed seed (mulberry32, seed 20260929), label A, B, C... per tier, write `<tier>-blind.md` (label + output only, NO model/provider/tokens/cost/reasoning fields; also strip any line in the output that names a model) and `<tier>-key.json` (label -> row index/model/reasoning) into the blind dir. The key file must be a separate file.
4. Print a compact per-(model,reasoning) summary table: rows, pass rates for each check, mean words, total cost.
5. `--self-test`: run against output/model-fit/score-fixture.jsonl (you author ~6 synthetic rows covering: a valid structured-seat JSON, one with schema failure, one with an ungrounded number, one open-character with a fact violation, one errored row, one truncated) and assert expected results with plain `assert`; exit 0 on pass. To pass a validator, look at validateVoiceJson in scripts/cron-civic-run.js:1300 for the required schema.

Code style: plain Node CommonJS, no new dependencies, header comment like scripts/modelFitRun.js. Report in one line: what you built, self-test result, anything you could not do.
