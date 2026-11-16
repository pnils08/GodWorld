# Brief for codex-rb — 2026-11-13 (research-build)

Adversarial diff review, read-only. Write findings to `docs/for-claude-review/2026-11-13-codex-daily-sources-only-review.md`. Verdict per part: SHIP or HOLD, each finding with file:line.

## Part A — uncommitted working-tree diff (runs at the 08:00 cron on Sat 2026-11-14)

`git diff -- scripts/notebooklmDailyNews.js config/notebooklm.json docs/reference/NotebookLM.md`

Builder 2026-11-13: "just getting the daily sources added and the run generated off that, no instructions no canon search. We can keep those off for now but don't delete anything".

Three switches under `dailyNews` in `config/notebooklm.json`, on unless `false`, all set `false`: `canonSearch`, `writtenBrief`, `audioFocus`. No function removed.

Check:
1. With all three false, does anything said to NotebookLM still reach the working notebook before `audio create` (any query, focus, prompt, source that is direction rather than the day's material)?
2. `briefPath` is now null when the brief is off — any reader left that breaks (delivery, manifest, ops report, recovery `--resume-latest-audio`)?
3. `audio create` with no `--focus`: argument order still valid for nlm; retry path identical.
4. Key absent or `true` = byte-identical behavior to HEAD.
5. Anything deleted or made unreachable that the builder said to keep.

## Part B — two local commits, not pushed

- `f8feaf9d2` Supermemory recall: recent relevant saves first.
- `8bd4b1f01` brainSearch: one lookup across memory, the live sheet and open work.

`git show f8feaf9d2` / `git show 8bd4b1f01`. Check: silent fallbacks, a threshold that drops `[rule]` hits, a failure path that prints nothing, any write to a sheet or memory store from what is described as a lookup.
