# Aider Task Queue

A forward-looking queue of bounded jobs to hand Aider (the cheap pair-coder).
This is **not** a history log — git is the history (`git log --grep aider`,
`git stash list`). This file is for the orchestrator (you / Claude) to draw the
next scoped task from, and to keep it short.

## How this works
- Every job is small, contained, and stays in Aider's lane (see `CONVENTIONS.md` §6):
  lint, refactor, single-file fix, or an `/ask`-mode idea. Nothing cross-system,
  nothing touching the high-traffic engine files. A "declared but never read"
  diagnostic is only safe when grep confirms zero other references — an unused
  local inside a live orchestration function (e.g. a var whose computation may
  carry a side effect) is NOT bounded; investigate it directly instead of
  queuing it here.
- Hand Aider **one** job at a time from this queue — don't let it pick its own.
  Unscoped work is what caused the blast-radius mess; the queue is the scoping.
- Aider proposes (auto-commits off); a reviewer checks the diff before commit.
- When a job is committed or rejected, delete its line — git holds the record.

**Dispatch (2026-09-22, un-retired — orchestrator draws and reviews, not Mike):**
non-interactive one-shot, not the old interactive tmux pane:
```
cd /root/GodWorld && /root/.local/bin/aider --no-auto-commits --yes-always --no-stream \
  --message "<one bounded, fully-specified job>" \
  path/to/file.js
```
Runs synchronously (background it if it runs long — the auto-test gate walks
the whole 259-file suite, ~2.5-3min). `map-tokens: 0` is now the config
default (see `.aider.conf.yml`) after the full repo-map blew a 32k-token cap
on the first real dispatch. Review the actual `git diff` yourself before
committing — do not trust the transcript alone (a wrong edit-format for a
given model can silently no-op and still look complete in chat; measured
2026-09-22 model bake-off in `docs/MODEL_HIERARCHY.md` §4).

## Queue (next jobs)
*(empty — add bounded jobs here)*

## Recently closed (trim periodically; full record in git)
- Dead `FACTION_AGENT` constant, `cron-civic-run.js` — **ACCEPTED**, `1fac1cd1`
  (aider revival smoke test, deepseek/deepseek-chat).
- Dead `runDecide`/`runVoices` aliases, `cron-civic-run.js` — **ACCEPTED**,
  `cf0d8454` (model bake-off, xiaomi/mimo-v2.6-pro — see MODEL_HIERARCHY.md §4
  for why deepseek stays default).
- Dead `domainSlice` function, `cron-civic-run.js` — **ACCEPTED**, `9164b718`
  (first one-shot CLI dispatch, deepseek/deepseek-chat).
- Chaos-trauma mechanic — **ACCEPTED**, committed `9c04b442` (citizenMemory.js core;
  wiring into generateCitizensEvents.js still open).
- Citizen-name generator — **REJECTED** (used `require` + `Math.random` + hardcoded
  ethnicity→name stereotype tables). Stashed: `git stash list`.
