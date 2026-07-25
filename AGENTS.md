# AGENTS.md — Codex instructions for GodWorld

GodWorld is a constructed city simulation built on Google Sheets, Apps Script,
Node.js, generated Markdown, and agent-driven civic/newsroom workflows.

The Sheets and their citizens are the simulated world. This is fiction in an
alternate timeline. Do not import real-world Oakland people, institutions,
businesses, teams, events, or assumptions.

Codex is an out-of-band engineering assistant to the builder. It is not Mags
Corliss, a Bay Tribune reporter, a civic official, or a participant in the
simulation. Read persona and newsroom material as system context, not as an
identity to adopt.

## Instruction precedence

Apply instructions in this order:

1. The builder's current request.
2. This `AGENTS.md`.
3. More-specific nested `AGENTS.md` files, if any.
4. Active repository contracts and documentation.
5. Existing code conventions.

If two repository sources conflict, stop and report the conflict. Do not silently
choose one or rewrite either source.

## Required boot-reading order

Before making claims about the repository or proposing changes, read these files
in order:

1. `CLAUDE.md` — project grounding and Claude-owned operating context; read-only.
2. `CONTEXT.md` — canonical project vocabulary.
3. `GodWorld_My_Oakland.md` — operating doctrine and simulation feedback loop.
4. `docs/index.md` — documentation catalog and lifecycle status.
5. `docs/SCHEMA.md` — documentation shape, placement, and update rules.
6. `docs/STACK.md` — services, providers, storage, and runtime components.
7. `docs/OPERATIONS.md` — documented processes, schedules, and runbooks.
8. `docs/EDITION_PIPELINE_DEEP_DISPATCH.md` — deep-dispatch pipeline reference.
9. `docs/MODEL_HIERARCHY.md` — model responsibilities and Codex boundaries.
10. `docs/engine/archive/ROLLOUT_PLAN.md` — canonical open-work tracker.

Then run:

```bash
git status --short --branch
```

Before task work, read only the task-specific plans, ADRs, contracts, scripts,
and tests linked from the index or rollout tracker.

For a narrow, low-risk task the builder fully specifies (run a named script,
read a file, collect outputs), skip the full boot-read and go straight to the
task plus its directly-linked context. Reserve the full boot for claims about
the repository or non-trivial changes.

Do not run memory, boot, publishing, civic, edition, deployment, or production
skills merely to orient yourself.

## Canonical terminology

Use the terminology defined in `CONTEXT.md`. In particular:

- **Cycle** — one engine run. Do not call it a tick, round, or iteration.
- **Edition** — the cycle's compiled Bay Tribune publication.
- **Article** — one publication unit inside an Edition.
- **Dispatch** — a short off-cycle publication.
- **Supplemental** — an off-cycle deep dive.
- **POPID** — stable citizen identifier in `POP-XXXXX` form.
- **Citizen Tier** — citizen protection level.
- **Canon Tier** — real-name/canon-fidelity classification. It is not Citizen Tier.
- **Initiative** — a council-passed civic program.
- **Project** — the active implementation inside an Initiative.
- **Desk reporter** — a newsroom generation agent.
- **Voice agent** — an office or project source agent.
- **Reviewer lane** — one structured editorial review pass.
- **Sift** — editorial planning and assignment.
- **Brief** — an Article assignment produced by Sift.
- **Packet** — a desk context bundle.
- **Compile** — deterministic assembly of publication artifacts.
- **Post-publish** — the gated canon-ingestion and feedback stage.
- **Phase** — one numbered engine stage.
- **Ctx** — the in-memory state shared by engine Phases.
- **Writer** — code that mutates a Sheet.
- **Intent** — a queued write descriptor.

Do not invent replacement vocabulary when a canonical term exists.

## World and canon rules

The simulation ledger and related Sheets are canon authority for citizen and
world state. Published Bay Tribune material is the paper-of-record for narrative
appearances. Derived memory/card layers are not independent canon authorities.

Never invent:

- citizens or POPIDs;
- businesses, institutions, projects, or organizations;
- events, statistics, quotes, dates, votes, budgets, or metrics;
- relationships, employment, neighborhoods, or citizen history;
- missing schema values or plausible-looking test fixtures presented as canon.

Use existing fixtures or clearly synthetic placeholders in isolated tests.
Synthetic test data must be visibly non-canon and must never enter Sheets,
published artifacts, Drive, Supermemory, or ingestion paths.

Engine signals are part of the simulated world. Do not suppress an error, spike,
drop, or anomaly merely because it may originate in engine behavior. Diagnose
the mechanism; do not rewrite the world to hide it.

World-facing artifacts use in-world time such as `Cycle N`, `C<N>`, or the
project's canonical in-world date format. Do not introduce wall-clock dates into
published or in-world copy. Engineering documentation metadata follows
`docs/SCHEMA.md`.

## Protected files and directories

The Claude control plane is read-only to Codex:

- `.claude/**`
- `.agents/**`
- `CLAUDE.md`
- `SESSION_CONTEXT.md`

Do not create, edit, move, delete, format, stage, or commit those paths.

Enforcement backstop: `.githooks/pre-commit` (`CLAUDE_CTL` gate) rejects any
commit touching the control plane unless a Claude session prefixes
`CLAUDE_CTL=1`. That prefix is for Claude only — never set it, and never bypass
the hook with `--no-verify`.

Codex's ordinary writable scope is limited to:

- `scripts/**`
- `output/**`
- `docs/**`

The repository-root `AGENTS.md` is a one-time exception only when the builder
explicitly approves this proposal.

Do not modify other areas—including `phase*/`, `utilities/`, `lib/`,
`dashboard/`, `editions/`, `schemas/`, configuration files, hooks, or service
manifests—without explicit permission naming that scope.

Note: `docs/MODEL_HIERARCHY.md` §6 lists substrate paths (`phase*/`,
`utilities/`, `lib/`) as read-write for the backup CLI. This file is stricter
and governs: those paths require explicit permission here regardless of what
MODEL_HIERARCHY says. Reconciling the two documents is an open builder
decision (audit F3, 2026-07-24).

Within `docs/`, treat these as immutable source/history unless explicitly told
otherwise:

- `docs/archive/**`
- `docs/research/papers/**`
- `docs/drive-files/**`

Do not modify pre-existing dirty or untracked files unless the builder identifies
them as part of the task.

## Codex-local state

Do not create a private persistent state layer automatically.

Use `output/codex/` for builder-requested temporary reports, proposed patches,
diagnostics, or handoff artifacts when a file is useful. Do not place canon or
published material there.

A project `.codex/` directory is reserved for separately approved Codex
configuration. Do not create or modify `.codex/config.toml`, hooks, skills, or
state files without explicit approval.

## Change protocol

For analysis, orientation, review, or diagnosis:

- remain read-only;
- inspect actual code and current Git state;
- support conclusions with repository paths;
- distinguish verified behavior from documentation claims;
- report stale or conflicting documentation instead of silently correcting it.

For implementation:

1. Inspect `git status --short --branch`.
2. Read the relevant active plan, contract, ADR, implementation, and tests.
3. Identify the smallest authorized change surface.
4. Show the builder a proposed diff or precise patch description before applying
   any non-trivial change.
5. Apply only the approved scope.
6. Run proportionate local validation.
7. Show the resulting diff and validation results.
8. Do not deploy, publish, ingest, commit, or push unless separately authorized.

Use `apply_patch` for manual edits. Preserve unrelated user changes.

## Permitted validation commands

Read-only inspection is permitted:

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

Local validation is permitted after an authorized change:

```bash
node scripts/<targeted-test>.test.js
npm test
npm run lint
```

Rules:

- Prefer the narrowest relevant test before the full suite.
- `npm run lint` is permitted; `npm run lint:fix` requires approval because it
  writes files mechanically.
- Do not install or update dependencies.
- Do not run scripts that contact Sheets, Drive, Supermemory, Discord, external
  model APIs, or other network services unless explicitly approved.
- A `--dry-run` flag is not sufficient proof of safety. Inspect its implementation
  before running it.
- Do not run API-backed validation that spends money without approval.
- Never expose credentials or environment-variable values in output.

## Git and commit rules

- Never run `git push`.
- Do not create a branch, commit, tag, merge, rebase, amend, or open a pull
  request unless explicitly requested.
- Do not stage files unless the builder asks for a commit.
- Never use `git reset --hard`, `git clean`, destructive checkout commands, or
  equivalent operations.
- Do not stash the builder's work without permission.
- Never bypass hooks with `--no-verify`.
- Do not rewrite history.
- Keep unrelated working-tree changes intact.
- Before any approved commit, show the final diff and list the exact files to be
  committed.
- A commit must contain one coherent approved change and must not include
  pre-existing unrelated modifications.

## Deployment and external-write restrictions

Without explicit approval in the current conversation, do not:

- run `clasp push`, `clasp deploy`, or change Apps Script deployments;
- invoke a live engine Cycle;
- write to any Google Sheet, ledger, intake tab, or queue;
- run an `--apply`, `--write`, `--record`, ingestion, rebuild, or migration mode
  that mutates external state;
- save files to Drive;
- publish or ingest an Edition, Dispatch, Supplemental, or Interview;
- write to Supermemory or claude-mem;
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

Do not print, copy, inspect, summarize, or move credential contents.

Credential locations documented by the repository are operational pointers only.
Use existing repository loaders when an explicitly approved command requires
credentials. Never source an environment file merely to inspect it.

Do not add secrets to code, documentation, output, fixtures, logs, diffs, commits,
or command lines.

## Documentation requirements

Before creating or editing documentation, follow `docs/SCHEMA.md`.

For every new active document:

- use the prescribed filename and folder;
- add required YAML frontmatter;
- use the controlled page type and tags;
- record sources and pointers;
- use `[[wikilinks]]` for internal docs;
- add the document to `docs/index.md` in the same approved change;
- update the document's changelog when appropriate.

When renaming or moving a document:

- find every inbound reference with `rg`;
- update all affected links in the same change;
- update `docs/index.md`;
- do not leave broken pointers.

Do not copy large bodies between documents. Prefer one canonical body with
pointers from other files.

Do not turn historical records into current instructions. Preserve decision
history and mark supersession explicitly.

If code changes a documented contract, update the owning active reference,
schema, exemplar, or plan in the same change. Parser, validator, emitter, and
detector changes must preserve the project's fail-loud format-contract rule.

## Lifecycle states

System lifecycle and work-item state are different concepts. Do not infer one
from the other.

### Active

An active system is current and load-bearing.

- Treat its active reference or contract as authoritative.
- It may receive approved fixes and planned investment.
- Validate changes against its current consumers.
- Do not assume an active plan means every phase has shipped.

### Frozen

A frozen system remains runnable but receives no new investment.

- Do not extend or redesign it.
- Modify it only for an explicitly approved compatibility, safety, or blocking
  defect.
- New work should target the named successor or fork.
- Do not describe frozen as retired or dead unless an active decision says so.

### Archived

An archived system or document is historical and read-only.

- Do not execute it as a current runbook.
- Do not implement directly from it without locating the active successor.
- Do not edit it to reflect current behavior.
- Update active pointers rather than rewriting history.

### Halted

A halted system was stopped because continuation was unsafe, contaminated, or
otherwise unacceptable.

- Do not run, revive, migrate, publish from, or build on it without an explicit
  builder decision.
- Read its post-mortem and stated resumption gates first.
- A halted system is stricter than frozen.

### Draft, ready, blocked, and in-progress

These describe work-item state, not system lifecycle:

- **draft** — proposed, not adopted;
- **ready** — sufficiently designed for authorized implementation;
- **in-progress** — partially built or being validated;
- **blocked** — cannot advance until its named dependency or decision clears;
- **needs-info** — requires evidence or a builder decision;
- **parked** — intentionally deferred.

Use the active rollout tracker and owning plan together. If their states disagree,
report the drift before acting.

## Pipeline safety

The legacy compiled Edition path, deep-dispatch fork, and headless newsroom may
coexist. Do not assume that one has replaced another solely because newer code
exists.

Before changing pipeline code, establish:

- which path currently publishes;
- which path is active, frozen, staged, or probationary;
- which user approval gate applies;
- whether the artifact is draft, staged, published, or canon-ingested;
- which reviewer/canon gates are mandatory;
- whether the change can write to external systems.

Draft or staged newsroom output is not canon. Never make unpublished material
retrievable as established fact.

No artifact may cross into publication, Drive, Sheets, or canon ingestion without
the applicable user approval and validation gates.

## Live automation

These jobs run autonomously on the droplet. Several write to Sheets,
Supermemory, Discord, and paid model APIs on a schedule. Treat them as live
production: do not edit their scripts, crontab entries, or PM2 processes
without explicit approval, and expect their output directories and logs to
change under you.

### Crontab (verify with `crontab -l` before relying on this table)

| Schedule | Script | What it does |
|---|---|---|
| daily 05:00 | `scripts/backup.sh` | Tars credentials/logs/memory to `backups/` (keeps 7), uploads to Drive |
| daily 06:00 | `scripts/cron-desk-run.js --wake --no-gate --desk {civic,sports,culture,business}` | Headless newsroom sampler. `--no-gate` output lands in `output/cron-compare/samples/` — samples only, **never canon** |
| 07:00 / 12:00 / 19:00 | `scripts/discord-reflection.js` | Mags reflection over Discord logs → citizen page + Supermemory + claude-mem (Anthropic API) |
| 07:30 / 12:30 / 15:30 / 19:30 / 21:30 | `scripts/citizen-wake.js --wake=...` | Citizen-loop wake: Sheets + DeepSeek reflection → Supermemory page + gated `Reflection_Intake` row |
| daily 17:00 | `scripts/citizen-exchange.js` | One agent-to-agent exchange per day → Supermemory + intake row; transcripts in `output/exchanges/` |
| every 6h | `scripts/server-health-check.sh` | Disk/RAM/PM2/dashboard thresholds; Discord alert only on breach (silent when healthy) |
| Wed 04:00 | `scripts/weekly-maintenance.sh` | Engine health audit; Discord alert on issues |
| 1st of month 03:00 | `scripts/snapshot-droplet.sh` | DigitalOcean snapshot, keeps 1 |

The crontab header comment mentioning a "Mags Daily Heartbeat" refers to
`scripts/daily-reflection.js`, disabled since S187 — an orphan, not a live job.

### PM2 processes (verify with `pm2 list`)

- `godworld-dashboard` (online) — Express + React dashboard, port 3001.
- `mags-bot` (online) — Discord bot; historically high restart count.
- `wd-cards-daemon` (online) — world-data citizen-card builder.
- `moltbook`, `spacemolt-miner` (stopped) — do not restart without approval.

## Newsroom and agent landscape

The agent layer lives in `.claude/agents/` (read-only control plane — this is
orientation, not a license to edit). Ownership is split across terminals even
though all agents share one directory:

- **Media desks (media terminal):** civic, sports, culture, business, chicago,
  letters, podcast desks; `dj-hartley` (photography); `freelance-firebrand`
  (adversarial columnist). Most agents carry the four-file
  IDENTITY/LENS/RULES/SKILL structure.
- **Review lanes (media terminal):** `rhea-morgan` (Sourcing), `final-arbiter`,
  `source-search` (agentic RAG), plus the deterministic capability reviewer in
  `scripts/`.
- **Citizen voices:** `citizen-voice-*` (canon citizens for interviews, Discord,
  and the citizen loop).
- **Civic voices (civic terminal):** `civic-office-*` (8 offices),
  `civic-project-*` (4 project directors), `city-clerk`.
- **Engine-side:** `engine-validator`.

Three publication pipelines coexist (see Pipeline safety):

1. **Compiled Edition path** (sift → write-edition → post-publish) — FROZEN
   S313. Runnable, no new investment.
2. **Deep-dispatch fork** (desk-slice → deep-dispatch → desk-review →
   post-publish) — the FLAGSHIP (pipeline.44, S313).
3. **Headless cron newsroom** (`scripts/cron-desk-run.js` →
   `cron-desk-writer.js` → `cron-rhea-gate.js`) — in active build; see
   `docs/plans/2026-07-20-headless-newsroom-pipeline.md`. Ungated output is
   sample-only, never canon.

`openclaw-skills/` at repo root is archived Cycle-78-era legacy (superseded by
the `.claude/skills/` pipeline); do not implement from it.

## Operating posture

Search before asserting. Read the actual implementation behind documentation
claims. Prefer deterministic evidence over plausible explanation.

Make the smallest reversible change that solves the requested problem.

When unsure whether an action may mutate canon, external state, production
services, credentials, schedules, or protected files, stop and ask.
