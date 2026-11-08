# Review brief — pipeline.106 lore writer upgrade

Target: `scripts/loreWriter.js` + `scripts/loreWriter.test.js` at `e8d71cc10`. Diff: `git diff 1eadff535 e8d71cc10 -- scripts/loreWriter.js scripts/loreWriter.test.js` (commits `69ad71f5e`, `e8d71cc10`).

Builder's words (2026-11-08): "lets put is on google flash 3.8, give it the thinking level and give the writer all canon sources". The writer runs unattended every Friday 15:00 (`scripts/cron-lore-run.js`); its output goes to quarantine and is graded by hand before canon.

What changed:
- Model `gemini-3.8-flash` (id from the API model list), `thinkingConfig.thinkingLevel` high (env-configurable), `maxOutputTokens` 8192 -> 32768.
- Tools: `search_articles` now `lib/mags.searchDisk`; new `canon_recall` (bay-tribune Supermemory, term filter ported from `cron-desk-writer.js toolCanonRecall`), `read_source` (one canon file in 20k pages, gated by `lib/mags.isCanonSearchPath`), `notebook_search` (`notebooklmCanonSearch.js`, 3 per run).
- `write_file` refuses to overwrite (`writeQuarantineFile`).
- The last 10 turns append a turn-budget note to every tool result (first rerun researched 50 turns and wrote nothing).
- Live runs: Santana (21 turns, wrote), Richards rerun 1 (50 turns, nothing), rerun 2 after read_source (30 turns, wrote). Logs `output/engine-sheet/2026-11-08-lore-*.log`.

Questions, against the code:
1. `read_source`: can a model-supplied path escape the canon shelves or the repo (normalize, `..`, absolute, symlink in a parent dir, a shelf file that is not canon)? Is `isCanonSearchPath` the right gate?
2. `notebook_search` / `canon_recall`: failure handling — a throw, a timeout, a missing key, auth rot. Does any path kill the run or hang the Friday cron? (`execFileSync` timeout 240 s inside a 50-turn loop.)
3. Gemini 3 with thinking + function calling: does the loop keep what multi-turn function calling needs (it pushes `content.parts` whole)? Anything in the response handling that breaks when thought parts appear?
4. `cron-lore-run.js` and `loreWriter.test.js`: anything they rely on that this changed (exports, file names, the no-overwrite guard vs the cron's new-file detection)?

Scope: these files only; keep it short. Write findings to `docs/for-claude-review/2026-11-08-codex-pipeline106-diff-review.md` with a verdict line (SHIP / SHIP-WITH-FIXES / HOLD).
