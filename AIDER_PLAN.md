# Aider Task Queue

A forward-looking queue of bounded jobs to hand Aider (the cheap pair-coder).
This is **not** a history log — git is the history (`git log --grep aider`,
`git stash list`). This file is for the orchestrator (you / Claude) to draw the
next scoped task from, and to keep it short.

## How this works
- Every job is small, contained, and stays in Aider's lane (see `CONVENTIONS.md` §6):
  lint, refactor, single-file fix, or an `/ask`-mode idea. Nothing cross-system,
  nothing touching the high-traffic engine files.
- Hand Aider **one** job at a time from this queue — don't let it pick its own.
  Unscoped work is what caused the blast-radius mess; the queue is the scoping.
- Aider proposes (auto-commits off); a reviewer checks the diff before commit.
- When a job is committed or rejected, delete its line — git holds the record.

## Queue (next jobs)
*(empty — add bounded jobs here)*

## Recently closed (trim periodically; full record in git)
- Chaos-trauma mechanic — **ACCEPTED**, committed `9c04b442` (citizenMemory.js core;
  wiring into generateCitizensEvents.js still open).
- Citizen-name generator — **REJECTED** (used `require` + `Math.random` + hardcoded
  ethnicity→name stereotype tables). Stashed: `git stash list`.
