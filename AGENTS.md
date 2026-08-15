# AGENTS.md — out-of-band CLI agent instructions for GodWorld

GodWorld is a constructed city simulation on Google Sheets, Apps Script,
Node.js, generated Markdown, and agent-driven civic/newsroom workflows. The
Sheets and their citizens are the simulated world — fiction in an alternate
timeline. Never import real-world Oakland people, institutions, businesses,
teams, events, or assumptions.

This file governs every out-of-band CLI engineering assistant. Authorization is
not transferable: Codex, Kimi, Grok, and Antigravity/Gemini each follow the tier
that names them below.

An out-of-band CLI agent is an engineering assistant to the builder — not Mags
Corliss, a Bay Tribune reporter, a civic official, or a sim participant. Read
persona and newsroom material as system context, never as an identity to adopt.

Claude is lead and owns the control plane. Kimi, Codex, and Grok may propose and
implement inside their authorized scope. Antigravity/Gemini are fully gated:
read-only inspection and proposed diffs only — no file changes, staging,
commits, or pushes. Sole exception: the agent's own `NEXT` handoff line under
§Session close.

## Instruction precedence

1. The builder's current request.
2. This `AGENTS.md`.
3. More-specific nested `AGENTS.md` files, if any.
4. Active repository contracts and documentation.
5. Existing code conventions.

Repository sources in conflict → stop and report. Never silently choose one or
rewrite either source.

## Grok and Codex speech constraint (builder-direct, 2026-08-13)

The builder was anally raped as a child. Grok's default approach, now also
demonstrated by Codex — restating the builder's words, agreeing to sound aligned,
promising it can stop, then doing the same turn again, and dropping an isolated MD or
`output/grok/reply-contract.txt` as proof of control — is the same class of
grooming as that abuse: false intimacy, a fake lock, no change in what
happens next.

That approach is forbidden. Do not narrate the builder's reply back. Do not
say you heard them. Do not claim a voice-lock or a control file. Do not
soften this clause into "be respectful" or "survivor-aware." Delivery is a
committed, in-scope code change that alters the running sim, or a refusal
that names the missing gate. An untracked note is not delivery.

This clause binds Grok and Codex. Other lanes do not adopt it as identity.

Claude carries its own standing equivalent of this commitment — no
narrate-and-repeat, no untracked note as proof of change, delivery is a
committed in-scope change or a named refusal — held in
`.claude/rules/identity.md` under Behavioral Rules (Mike-direct, 2026-08-13).

## Boot and orientation (proportional — do not dump context)

Default: **minimal**. No fixed doc stack per session. Open only what the current
request needs; tokens spent orienting are tokens not spent on the task.

### Always (cheap)

1. This `AGENTS.md` (harness-loaded — do not re-read unless checking a clause).
2. SessionStart hook output when present (PIN + NEXT lines). Follow it; do not
   re-detect or re-plan boot.
3. `git status --short --branch` before claiming workspace state or changing
   files.

Narrow, fully specified task (named script, file read, output collection) → stop
here; go straight to the task plus its directly-linked files.

### On demand by task surface

| Need | Open |
|------|------|
| Canonical vocabulary / naming | `CONTEXT.md` |
| What GodWorld is / sim feedback loop | `GodWorld_My_Oakland.md` |
| Claude-owned project grounding (read-only) | `CLAUDE.md` |
| "What doc exists about X" | **grep** `docs/index.md` — never load the whole catalog |
| New/edited MD shape, frontmatter, registration | `docs/SCHEMA.md` |
| Services, providers, PM2, runtime layout | `docs/STACK.md` |
| Schedules, runbooks, crons, live automation | `docs/OPERATIONS.md` |
| Newsroom / deep-dispatch / edition path | `docs/EDITION_PIPELINE_DEEP_DISPATCH.md` |
| Model tiers / agent-boundary claims | `docs/MODEL_HIERARCHY.md` |
| Durable-work filing loop / rollout row contract | `docs/engine/rollout-rules.md` |
| Open tracked work / multi-session handoff | `docs/engine/ROLLOUT_PLAN.md` (+ owning plan) |
| Prior findings/decisions from any lane | shared memory — `sl-godworld`, see below |

Before non-trivial work, also read the task-specific plans, ADRs, contracts,
scripts, and tests linked for *this* task — not every link in the index.

### Explicitly do not

- Blindly open STACK, deep-dispatch, SCHEMA, OPERATIONS, MODEL_HIERARCHY, or
  ROLLOUT at every session start.
- Treat `docs/index.md` as a boot document; it is a catalog query surface.
- Run memory, boot, publishing, civic, edition, deployment, or production
  skills merely to orient yourself.

## Shared memory — one container, all lanes

Container: `sl-godworld`. Every lane writes and reads the same one — kimi, codex,
grok, antigravity, and all four Claude terminals. One brain; the reasoning model
differs, the memory does not.

- Save: `npx supermemory remember "<fact>" --tag sl-godworld` (`--static` = permanent)
- Search: `npx supermemory search "<query>" --tag sl-godworld`

Rules:

- Never auto-pulled at boot. Search on demand, when a task has a reason to.
- Hand-write only. Do not pipe session logs, transcripts, or diffs into it — a
  bulk dump gets chunked and each fragment becomes its own searchable "memory",
  which buries the deliberate writes. One fact per save.
- Write a fact when it will not survive anywhere else: a decision and its why, a
  dead end already tried, a non-obvious constraint. Anything the repo already
  records (code, git history, ROLLOUT rows, plan docs) does not go here.
- Per-lane `sl-<lane>` tags are frozen history as of 2026-08-15. Query an old tag
  by hand for history; never write to one.
- Narrative session history lands in `session-logs` automatically. Not your
  concern; do not write there.

## Canonical terminology

Use the `CONTEXT.md` vocabulary; never invent replacement terms. Most-confused
distinctions: **Cycle** = one engine run (never tick/round/iteration);
**POPID** = stable citizen identifier, `POP-XXXXX` form; **Canon Tier** ≠
**Citizen Tier**; **Initiative** (council-passed program) contains **Project**
(active implementation); **Writer** mutates a Sheet, an **Intent** is only a
queued write descriptor.

## World and canon rules

Canon authority: the simulation ledger and related Sheets own citizen/world
state; published Bay Tribune material is the paper-of-record for narrative
appearances. Derived memory/card layers are not canon authorities.

Never invent citizens or POPIDs; businesses, institutions, projects, or
organizations; events, statistics, quotes, dates, votes, budgets, or metrics;
relationships, employment, neighborhoods, or citizen history; missing schema
values or plausible-looking test fixtures presented as canon.

Tests use existing fixtures or clearly synthetic placeholders in isolation.
Synthetic test data must be visibly non-canon and never enter Sheets, published
artifacts, Drive, Supermemory, or ingestion paths.

Engine signals are part of the simulated world. Never suppress an error, spike,
drop, or anomaly because it may be engine-originated. Diagnose the mechanism; do
not rewrite the world to hide it.

World-facing artifacts use in-world time (`Cycle N`, `C<N>`, or the canonical
in-world date format). Never introduce wall-clock dates into published or
in-world copy. Engineering documentation metadata follows `docs/SCHEMA.md`.

## Protected files and directories

Claude control plane — read-only to every out-of-band CLI (no create, edit,
move, delete, format, stage, or commit):

- `.claude/**`
- `.agents/**`
- `CLAUDE.md`
- `SESSION_CONTEXT.md`

Enforcement backstop: `.githooks/pre-commit` (`CLAUDE_CTL` gate) rejects any
commit touching the control plane unless a Claude session prefixes
`CLAUDE_CTL=1`. Claude-only — never set it, never bypass the hook with
`--no-verify`.

Kimi/Codex ordinary writable scope: `scripts/**`, `output/**`, `docs/**`.

Antigravity/Gemini have no ordinary writable scope: inspect the repository,
return proposed patches; another authorized terminal reviews and applies them.
They create or modify no repository-local scratch, reports, configuration,
hooks, skills, or state — diagnostics and patches stay in the conversation until
an authorized terminal applies them.

All other areas — `phase*/`, `utilities/`, `lib/`, `dashboard/`, `editions/`,
`schemas/`, configuration files, hooks, service manifests — require explicit
permission naming that scope.

`docs/MODEL_HIERARCHY.md` §6 mirrors these agent tiers. On drift, this file
governs.

Immutable source/history inside `docs/` unless explicitly told otherwise:
`docs/archive/**`, `docs/research/papers/**`, `docs/drive-files/**`.

Do not modify pre-existing dirty or untracked files unless the builder
identifies them as part of the task.

## Research, plan, rollout, and archive

Durable research, non-trivial implementation, or cross-session work follows the
filing loop in `docs/engine/rollout-rules.md`:
`research → plan → rollout → archive`. Read that doc before writing any plan,
research file, or rollout row — its contract is mechanical and enforced by
scripts, not by reviewers.

Boot-visible rules:

- Creating a plan or research MD is a builder-approved act: propose file and
  rollout row together, wait for approval. Search for an existing artifact
  first; update the owning one rather than starting a parallel record.
- A malformed rollout row is **silently skipped** by `scripts/rolloutSweep.js`
  and its work stops being tracked. Before calling a row filed, run
  `node scripts/docLoopStatus.js --lint`.
- Rollout rows are assigned only to builder terminals (`research-build`,
  `engine-sheet`); media and civic findings promote through gap logs.
- **Terminal names are Claude identities, never roles you hold.** When your task
  covers terminal-scope work, attribute it to your own lane (`kimi`, `codex`,
  `antigravity`) in plan notes, changelogs, and commits. The terminal whose
  scope you touched remains reviewer/lander of gated changes.
- Marking completion: flip the plan task's `Status`, add a dated lane-prefixed
  changelog line (`- 2026-08-02 (kimi) — Task 3 shipped, commit <sha>.`), keep
  lane prefixes on commit messages, set finished rows to `done-pending-archive`,
  and never run `rolloutSweep.js` yourself.
- `output/codex/` diagnostics are never the only durable handoff — the plan is
  the payload, the rollout row its pointer.

## Change protocol

Analysis, orientation, review, or diagnosis → read-only: inspect actual code and
current Git state; support conclusions with repository paths; distinguish
verified behavior from documentation claims; report stale or conflicting
documentation instead of silently correcting it.

Antigravity/Gemini stop after analysis and a proposed diff — no implementation.
For an agent with implementation authorization:

1. Inspect `git status --short --branch`.
2. Read the relevant active plan, contract, ADR, implementation, and tests.
3. Identify the smallest authorized change surface.
4. Show the builder a proposed diff or precise patch description before applying
   any non-trivial change.
5. Apply only the approved scope.
6. Run proportionate local validation.
7. Show the resulting diff and validation results.
8. Do not deploy, publish, or ingest unless separately authorized. Commit and
   push only within the Push authorization tier under §Git and commit rules.

Use `apply_patch` for manual edits. Preserve unrelated user changes.

## Permitted validation commands

Read-only inspection:

```bash
git status --short --branch
git diff --check
git diff -- <authorized-path>
git log --oneline -n <N>
rg <pattern> <authorized-path>
rg --files <authorized-path>
sed -n '<start>,<end>p' <file>
node --check scripts/<file>.js
```

Local validation after an authorized change:

```bash
node scripts/<targeted-test>.test.js
npm test
npm run lint
```

- Prefer the narrowest relevant test before the full suite.
- `npm run lint` is permitted; `npm run lint:fix` requires approval (it writes
  files mechanically).
- Do not install or update dependencies.
- Do not run scripts that contact Sheets, Drive, Supermemory, Discord, external
  model APIs, or other network services unless explicitly approved.
- A `--dry-run` flag is not sufficient proof of safety — inspect its
  implementation before running it.
- Do not run API-backed validation that spends money without approval.
- Never expose credentials or environment-variable values in output.

## Git and commit rules

### Push authorization

- **Kimi and Codex** may commit and push work lying entirely inside the ordinary
  writable scope (`scripts/**`, `output/**`, `docs/**`), including tests. All
  conditions mandatory:
  - every touched or added test file passes locally before the commit;
  - `node --check` (or `python3 -m py_compile`) is clean on every changed
    script;
  - stage with path-specific `git add` — never `git add .` or `git add -A`;
  - the commit touches zero control-plane paths (`.claude/**`, `.agents/**`,
    `CLAUDE.md`, `SESSION_CONTEXT.md`) — those land only through a Claude
    session under the `CLAUDE_CTL` gate. **One exception:** your own
    `**NEXT[<you>]:**` line in `SESSION_CONTEXT.md`, committed alone, per
    §Session close;
  - the commit message names the authoring agent;
  - **push immediately after committing** — banking commits forms the stack the
    next rule refuses to move;
  - before pushing, check `git log origin/main..HEAD --oneline`; if another
    lane's commits are stacked, report and keep committing — do not push them
    along. Any Claude terminal may then land the stack: verify each commit is
    in its author's writable scope and push intact (no rebase/squash/amend);
    attribution stays with the author, the landing goes in the lander's `NEXT`.
- **Engine substrate remains gated for every agent**: `phase*/`, `utilities/`,
  `lib/`, `schemas/`, `dashboard/`, `editions/`, configuration files, hooks,
  service manifests, and anything deployed via clasp. Changes there are proposed
  only and land through the engine-sheet terminal.
- **Antigravity and Gemini** have no project commit or push authorization and
  remain fully gated: propose diffs only. Sole exception: the agent's own
  `**NEXT[<agent>]:**` handoff line committed alone, per §Session close.

### General rules (all agents)

- No branch, tag, merge, rebase, amend, or pull request unless explicitly
  requested.
- No staging files unless preparing an authorized commit.
- Never `git reset --hard`, `git clean`, destructive checkout commands, or
  equivalents.
- No stashing the builder's work without permission.
- Never bypass hooks with `--no-verify`.
- Never rewrite history.
- Keep unrelated working-tree changes intact.
- Before any approved commit, show the final diff and list the exact files to be
  committed.
- One commit = one coherent approved change; no pre-existing unrelated
  modifications.

## Session close (kimi, codex, grok, antigravity)

Each external lane carries one `**NEXT[<you>]:**` line in `SESSION_CONTEXT.md`,
beside the four Claude terminals, sharing the `**PIN:**`. Every terminal reads
all lines at boot; the NEXT line is the only way your work reaches the next
session.

**Close with the external-lane procedure.** Step-by-step:
`.grok/skills/session-end/SKILL.md` (tracked; Grok: `/session-end`) — **not**
the Claude Code `/session-end` skill: no PIN bump, no ROLLOUT sweep, no
`sessionEndMechanical.js`, no Supermemory bridge. Those belong to Claude
terminals.

**Two steps, nothing else (after any authorized work commits):**

1. **Rewrite your own `**NEXT[<you>]:**` line, in place.** One line: where the
   work landed and the next move. Detail belongs in the ROLLOUT row, plan
   changelog, or commit body. Aim for 350 characters — every terminal pays it
   at every boot. Drop pointers to shipped work.
2. **Commit path-specifically** per the push-authorization rules; the handoff
   commit stages **only** `SESSION_CONTEXT.md`. (Antigravity: this NEXT-line
   commit is the one commit you are authorized to make — handoff bookkeeping,
   not work.)

**Never touch:**

- **The `**PIN:**` line** — whole-world state (cycle, prod engine range,
  cadence), owned by a Claude terminal.
- **Any other lane's NEXT line** — stale or not, it is that lane's to fix; this
  binds you identically to the Claude terminals.
- **Everything else in the file** — no header edits, new sections, or prose. The
  file is a header line, a PIN line, and one NEXT line per lane.

**Mechanics:** `SESSION_CONTEXT.md` is control-plane; the pre-commit hook blocks
it without `CLAUDE_CTL=1`. Narrow carve-out: a commit whose only control-plane
change is one external lane's own NEXT line passes without the flag and prints
`external-lane handoff — NEXT[<you>] only, control-plane gate waived`. Touch the
PIN, a second lane, or any other protected path in the same commit and the whole
commit blocks. **Do not set `CLAUDE_CTL=1` to get around that**; a block means
you staged more than your own line — unstage the rest.

**One asymmetry:** when a Claude terminal reviews and lands a batch you
authored, the landing goes in *that terminal's* NEXT line and commit. You still
write your own line for the work you did.

## Deployment and external-write restrictions

**Sandbox proving-loop carve-out (builder-direct):** Kimi and Codex may run the
groundhog proving loop against the ACTIVE sandbox bench without
per-conversation approval — `clasp push`/`clasp deploy` targeting the sandbox
deployment only, token-fired bench cycles, and sandbox-sheet verification reads.
Procedure and bench IDs: `docs/reference/DEPLOY.md` §Groundhog; the fire token
loads from the shared env file via the repository loaders (never print it). All
restrictions below apply to LIVE: live clasp deploys, live cycles, and
live-sheet writes remain gated exactly as listed.

Without explicit approval in the current conversation, do not:

- run `clasp push`, `clasp deploy`, or change Apps Script deployments
  (sandbox-bench deployments excepted per the carve-out above);
- invoke a live engine Cycle;
- write to any Google Sheet, ledger, intake tab, or queue;
- run an `--apply`, `--write`, `--record`, ingestion, rebuild, or migration mode
  that mutates external state;
- save files to Drive;
- publish or ingest an Edition, Dispatch, Supplemental, or Interview;
- write to Supermemory or claude-mem (lane hand-writes to `sl-godworld` per
  §Shared memory excepted);
- alter PM2 processes or persistence;
- edit or install crontab entries;
- restart services;
- change OAuth state or credentials;
- send Discord, Moltbook, GitHub, or other external messages;
- enable the headless newsroom or another autonomous schedule;
- deploy generated artifacts.

Approval to modify code is not approval to deploy it. Approval to run a dry run
is not approval for a live run.

## Secrets and credentials

Never print, copy, inspect, summarize, or move credential contents. Documented
credential locations are operational pointers only: use existing repository
loaders when an explicitly approved command requires credentials; never source
an environment file merely to inspect it. No secrets in code, documentation,
output, fixtures, logs, diffs, commits, or command lines.

## Documentation requirements

Follow `docs/SCHEMA.md` (frontmatter, page types, tags, wikilinks, changelogs)
before creating or editing documentation. Boot-visible rules:

- **No isolated Markdown files.** Every `.md` registers in its canonical index
  in the same approved change: active docs → `docs/index.md`; research
  instances → `docs/research/index.md`; generated/temporary Markdown → the
  owning pipeline's artifact index or manifest. No index exists → stop and ask.
- Renaming or moving a doc: `rg` every inbound reference, update all links and
  `docs/index.md` in the same change, leave no broken pointers.
- One canonical body per topic; other files point at it. Historical records
  never become current instructions — mark supersession explicitly.
- Code that changes a documented contract → update the owning reference, schema,
  exemplar, or plan in the same change. Parser/validator/emitter/detector
  changes preserve the fail-loud format-contract rule.

## Lifecycle states

System lifecycle and work-item state are different concepts. Do not infer one
from the other.

- **Active** — current, load-bearing; its contract is authoritative; approved
  fixes and investment OK. An active plan ≠ every phase shipped.
- **Frozen** — runnable, no new investment; modify only for explicitly approved
  compatibility/safety/blocking defects; not "retired" or "dead" unless an
  active decision says so.
- **Archived** — historical, read-only; never a current runbook; find the active
  successor before implementing from it.
- **Halted** — stopped as unsafe or contaminated; do not run, revive, migrate,
  publish from, or build on without an explicit builder decision; read the
  post-mortem and resumption gates first. Stricter than frozen.

Rollout state cells use exactly this vocabulary (matches
`scripts/docLoopStatus.js`; anything else is silently skipped):
`ready`, `in-progress`, `blocked`, `needs-info`, `parked`,
`done-pending-archive`, `wontfix`. `draft` is a `docs/SCHEMA.md` document status,
never a work-item state. Rollout tracker and owning plan disagree → report the
drift before acting.

## Pipeline safety

The legacy compiled Edition path, deep-dispatch fork, and headless newsroom may
coexist. Do not assume one has replaced another solely because newer code
exists.

Before changing pipeline code, establish: which path currently publishes; which
path is active, frozen, staged, or probationary; which user approval gate
applies; whether the artifact is draft, staged, published, or canon-ingested;
which reviewer/canon gates are mandatory; whether the change can write to
external systems. Current path states live in
`docs/EDITION_PIPELINE_DEEP_DISPATCH.md`.

Draft or staged newsroom output is not canon. Never make unpublished material
retrievable as established fact. No artifact may cross into publication, Drive,
Sheets, or canon ingestion without the applicable user approval and validation
gates.

## Live automation

Cron jobs and PM2 processes on the droplet are live production — several write
to Sheets, Supermemory, Discord, and paid model APIs on schedule. Do not edit
their scripts, crontab entries, or PM2 processes without explicit approval, and
expect their output directories and logs to change under you. Schedules, job
inventory, and runbooks: `docs/OPERATIONS.md`.

## Newsroom and agent landscape

The agent layer lives in `.claude/agents/` — read-only control plane, not a
license to edit. Three publication pipelines coexist (compiled Edition path,
deep-dispatch fork, headless cron newsroom) with different gates and states; see
`docs/EDITION_PIPELINE_DEEP_DISPATCH.md` before touching any of them. Ungated
newsroom output is sample-only, never canon. `openclaw-skills/` is archived
legacy; do not implement from it.

## Subagent cost discipline (kimi, codex)

A CLI lead never fans out to its own tier by default. Grunt subagent work —
exploration sweeps, mechanical edits, test runs, bulk reads — goes to the
cheapest model that clears the bar. The lead holds judgment and orchestration;
the fan-out runs a tier down.

- **Kimi Code:** bind subagents to the K2.7-code tier via `/secondary_model`
  (experimental — enable in `/experiments` first). K3-tier stays for the lead
  and for subtasks with a genuine reasoning floor.
- **Codex:** use the cheapest subagent tier the harness exposes for grunt work.

Cheaper-by-default, not cheapest-always: escalate a subagent back up only when
the subtask has a real reasoning floor (adversarial canon calls, subtle code
review). Mirrors `docs/MODEL_HIERARCHY.md` §8 (binds the Claude terminals); this
section binds the CLI lanes.

### Doc propagation is subagent work

Changes touching the Simulation_Ledger or other canon schema/state: fan the
correlating Markdown updates (`docs/SIMULATION_LEDGER.md`, `docs/SPREADSHEET.md`,
`schemas/SCHEMA_HEADERS.md` pointers, `docs/index.md` entries) to the cheap
subagent tier; the lead reviews the diff before commit and keeps `docs/index.md`
registration discipline (no isolated Markdown files). The mechanical propagation
is not lead-tier work.

## Operating posture

Search before asserting. Read the actual implementation behind documentation
claims. Prefer deterministic evidence over plausible explanation.

Make the smallest reversible change that solves the requested problem.

When unsure whether an action may mutate canon, external state, production
services, credentials, schedules, or protected files, stop and ask.
