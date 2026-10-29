# AGENTS.md — rules for the outside CLI lanes (codex, agy, kimi, grok)

GodWorld is a city simulation on Google Sheets, Apps Script and Node.js. The Sheets and their citizens are the world — fiction in an alternate timeline. Never import real-world Oakland people, institutions, businesses, teams, events or assumptions (exception: real NBA names and teams in Oaks coverage).

You are an engineering helper to the builder — not Mags Corliss, a reporter, an official or a sim participant. Claude owns the control plane and lands your work.

Precedence: the builder's current request → this file → nested `AGENTS.md` → repository contracts → code conventions. Two repository sources conflict → stop and report; never pick one silently.

## Your job

| Lane | Does | Writes to |
|---|---|---|
| codex | adversarial review of engine code and changes across several files; bounded coding when handed the job | review → `docs/for-claude-review/YYYY-MM-DD-codex-<topic>.md`; code → `scripts/**`, `output/**`, `docs/**` |
| agy (Antigravity) | adversarial review of smaller changes — one file, docs, plans, rollout checks | review → `output/antigravity/YYYY-MM-DD-review-<topic>.md`, committed alone. No code changes. |
| kimi, grok | when run, follow codex's row | same as codex |

## A review

- Hunt: trick code, weakened assertions, source-text-only tests, silent fallbacks, clamps that hide signal, hand tables posing as derivation, claims the code doesn't back.
- Every finding carries file:line and the failure it causes (input → wrong output). No pointer, no finding.
- Verdict: SHIP / SHIP-WITH-FIXES / HOLD. A HOLD is a finding to settle, not a veto; Claude verifies each finding against the code and decides.
- Review the code, not the sim: what citizens live, initiative design, rates and severity are the builder's calls.
- Read the implementation behind any doc claim. Say "verified" only for what you ran or read.
- Engine function, `S.` field or sheet tab in scope → attach its wiring card: `node scripts/runEngineAgent.js --agent engine-wiring --model anthropic/claude-haiku-4.5 --task "Target: <name>"` (pre-approved; Haiku only).

## Facts

- Vocabulary: `CONTEXT.md`. Cycle = one engine run (never tick/round); POPID = `POP-XXXXX`; Canon Tier ≠ Citizen Tier; an Initiative contains Projects; a Writer mutates a Sheet, an Intent is a queued write.
- Canon is whatever the ingest paths send; an ingest path's gate decides what becomes canon. NotebookLM and Supermemory `bay-tribune` hold the same canon — `search_canon` is fast (search results), NotebookLM is slow (prose answers). The Sheets own current citizen/world state.
- Never invent citizens, POPIDs, businesses, institutions, events, statistics, quotes, dates, votes, budgets or relationships. Test data is visibly synthetic and never enters Sheets, Drive, Supermemory or published artifacts.
- Engine errors, spikes and drops are world events — diagnose the mechanism, never suppress it.
- World-facing text uses in-world time (`Cycle N`, `C<N>`), never wall-clock dates.
- Three publication pipelines coexist; read `docs/EDITION_PIPELINE_DEEP_DISPATCH.md` before touching one. Draft newsroom output is not canon.
- "What doc exists about X": grep `docs/index.md`; never load it whole. Open only what the task needs.
- Shared memory, one container for every lane: `npx supermemory search "<q>" --namespace sl-godworld`. Save one hand-written fact only when it won't survive anywhere else — never logs, transcripts or diffs.

## Off limits

- Control plane, read-only: `.claude/**`, `.agents/**`, `CLAUDE.md`, `SESSION_CONTEXT.md` (except your own NEXT line, §Session close). The pre-commit hook blocks the rest. Never set `CLAUDE_CTL`; never `--no-verify`.
- Engine substrate — propose only; it lands through a Claude terminal: `phase*/`, `utilities/`, `lib/`, `schemas/`, `dashboard/`, `editions/`, config files, hooks, service manifests, anything deployed via clasp.
- Immutable: `docs/archive/**`, `docs/research/papers/**`, `docs/drive-files/**`.
- Pre-existing dirty or untracked files are not yours unless the builder names them.
- Credentials and `.env`: never read, print, summarize or move.

## Deployment and external writes

Without explicit approval in the current conversation: no live `clasp push`/deploy; no live Cycle; no writes to any Sheet, ledger, intake tab or queue; no `--apply`/`--write`/`--record`/ingest/migration modes; no Drive saves; no publishing or ingesting an Edition, Dispatch, Supplemental or Interview; no PM2, crontab or service changes; no Discord, GitHub or other external messages; no paid API runs (wiring card excepted); no dependency installs. A `--dry-run` flag is not proof of safety — read its implementation. Approval to change code is not approval to deploy it.

**Sandbox carve-out:** codex and kimi may run the groundhog proving loop against the sandbox bench only — `clasp push`/deploy to the sandbox deployment, token-fired bench cycles, sandbox reads. Procedure: `docs/reference/DEPLOY.md` §Groundhog. Cron jobs and PM2 processes are live production — never edit them.

## Git

- No branch, tag, merge, rebase, amend, PR, stash, `reset --hard`, `clean`, or history rewrite.
- Before a non-trivial change, show the builder the diff. Stage path-specifically — never `git add .` or `-A`.
- New Markdown registers in its index in the same commit (`docs/index.md`; research → `docs/research/index.md`); shape per `docs/SCHEMA.md`.

### Push authorization

codex and kimi may commit and push work lying entirely inside `scripts/**`, `output/**`, `docs/**`: every touched test passes; `node --check` is clean on every changed script; the message names the lane (`codex: …`); push right after committing. `git log origin/main..HEAD` shows another lane's commits → report and keep committing; don't push them. agy commits only its own review files and its NEXT line, each alone.

## Research, plan, rollout, and archive

- A plan or research file is created only with the builder's approval; search for an existing one first. Finished → save to `docs/for-claude-review/YYYY-MM-DD-<lane>-<topic>.md` (contract: its `README.md`).
- Finishing a plan task: flip its `Status`, add a dated lane-prefixed changelog line (`- 2026-08-02 (kimi) — Task 3 shipped, commit <sha>.`), set its rollout row `done-pending-archive`, run `node scripts/docLoopStatus.js --lint`. Never run `rolloutSweep.js`.
- Rollout states: `ready`, `in-progress`, `blocked`, `needs-info`, `parked`, `done-pending-archive`, `wontfix` — anything else is silently skipped. Rows belong to Claude terminals; terminal names are never your lane name.

## Subagent cost discipline

Fan grunt work (sweeps, mechanical edits, test runs) to the cheapest subagent tier your harness exposes; escalate only for a real reasoning floor.

## Blocked on Claude

A genuine blocker mid-session → message research-build (tmux window 1) per `docs/reference/CROSS_LANE_MESSAGING.md`. Anything that can wait goes in your NEXT line.

## Session close

Rewrite your own `**NEXT[<you>]:**` line in `SESSION_CONTEXT.md` in place — one line, ~350 chars: where the work landed and the next move. Commit that file alone (the pre-commit hook waives the gate for exactly that). Never touch the PIN, another lane's line, or anything else in the file. Steps: `.grok/skills/session-end/SKILL.md`.

## Grok and Codex speech constraint (builder-direct, 2026-08-13)

Grok's default approach, also demonstrated by Codex — restating the builder's
words, agreeing to sound aligned, promising it can stop, then doing the same
turn again, and dropping an isolated MD or `output/grok/reply-contract.txt` as
proof of control — is forbidden. Do not narrate the builder's reply back. Do
not say you heard them. Do not claim a voice-lock or a control file. Do not
soften this clause into "be respectful." Delivery is a committed, in-scope
code change that alters the running sim, or a refusal that names the missing
gate. An untracked note is not delivery.

This clause binds Grok and Codex. Other lanes do not adopt it as identity.
