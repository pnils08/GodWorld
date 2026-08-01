# AGENTS.md — out-of-band CLI agent instructions for GodWorld

GodWorld is a constructed city simulation built on Google Sheets, Apps Script,
Node.js, generated Markdown, and agent-driven civic/newsroom workflows.

The Sheets and their citizens are the simulated world. This is fiction in an
alternate timeline. Do not import real-world Oakland people, institutions,
businesses, teams, events, or assumptions.

This file governs every out-of-band CLI engineering assistant working in this
repository. Agent-specific authorization is not transferable: Codex, Kimi, and
Antigravity/Gemini follow the tier that names them below.

An out-of-band CLI agent is an engineering assistant to the builder. It is not
Mags Corliss, a Bay Tribune reporter, a civic official, or a participant in the
simulation. Read persona and newsroom material as system context, not as an
identity to adopt.

Claude is the lead and owns the control plane. Kimi and Codex may propose and
implement inside their authorized scope. Antigravity/Gemini are fully gated:
read-only inspection and proposed diffs only. They do not change project files,
stage work, commit work, or push work. The sole exception is each agent's own
`NEXT` handoff line under §Session close.

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
9. `docs/MODEL_HIERARCHY.md` — model responsibilities and agent-tier boundaries.
10. `docs/engine/ROLLOUT_PLAN.md` — canonical open-work tracker.

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

The Claude control plane is read-only to every out-of-band CLI:

- `.claude/**`
- `.agents/**`
- `CLAUDE.md`
- `SESSION_CONTEXT.md`

Do not create, edit, move, delete, format, stage, or commit those paths.

Enforcement backstop: `.githooks/pre-commit` (`CLAUDE_CTL` gate) rejects any
commit touching the control plane unless a Claude session prefixes
`CLAUDE_CTL=1`. That prefix is for Claude only — never set it, and never bypass
the hook with `--no-verify`.

Kimi's and Codex's ordinary writable scope is limited to:

- `scripts/**`
- `output/**`
- `docs/**`

Antigravity/Gemini have no ordinary writable scope. They may inspect
the repository and return proposed patches, but another authorized terminal must
review and apply them.

Do not modify other areas—including `phase*/`, `utilities/`, `lib/`,
`dashboard/`, `editions/`, `schemas/`, configuration files, hooks, or service
manifests—without explicit permission naming that scope.

`docs/MODEL_HIERARCHY.md` §6 mirrors these agent tiers. If the two documents
drift, this file governs.

Within `docs/`, treat these as immutable source/history unless explicitly told
otherwise:

- `docs/archive/**`
- `docs/research/papers/**`
- `docs/drive-files/**`

Do not modify pre-existing dirty or untracked files unless the builder identifies
them as part of the task.

## Gated-agent local state

Antigravity/Gemini do not create or modify repository-local scratch, reports,
configuration, hooks, skills, or state. Their diagnostics and proposed patches
remain in the conversation until an authorized terminal reviews and applies
them.

## Research, plan, rollout, and archive

For durable research, non-trivial implementation, or cross-session work, follow
the repository's canonical filing loop in
`docs/engine/rollout-rules.md`:

```text
research → plan → rollout → archive
```

Keep the layers distinct:

- **Research** records findings, evaluated options, hazards, and a verdict. Copy
  `docs/research/RESEARCH_TEMPLATE.md` to
  `docs/research/YYYY-MM-DD-<topic>.md`; register the instance in
  `docs/research/index.md`, not the top-level documentation index. Research
  carries `adopt`, `watch`, or `take-nothing`—never rollout state—and remains a
  standing, grep-able source after application.
- **Plan** is the self-contained executable specification. Copy
  `docs/plans/PLAN_TEMPLATE.md` to `docs/plans/YYYY-MM-DD-<topic>.md`; include exact
  tasks, files, acceptance criteria, validation, terminal ownership, sources,
  and pointers; register it in `docs/index.md`. An adopted research verdict
  points forward to the plan, and the plan points back to its research basis.
- **Rollout** is the clean open-work tracker at
  `docs/engine/ROLLOUT_PLAN.md`. Each row contains only an ID, one
  actionable summary, lifecycle state, builder-terminal owner, and pointers to
  the owning plan or plans. Do not place research prose, implementation detail,
  handoff instructions, or raw issues in a rollout row. The row is
  machine-swept — see the row contract below before writing one.
- **Archive** receives shipped plans and swept rollout rows according to
  `rollout-rules.md`. Research files do not archive. This lifecycle description
  does not authorize you to move or edit `docs/archive/**`; that still requires
  explicit builder approval under this file's protected-history rule.

### Rollout row contract (mechanical — a malformed row is silently skipped)

`scripts/rolloutSweep.js` archives completed rows by splitting each line on its
state cell. A row that breaks the contract is not rejected loudly; it is skipped
forever, and its work stops being tracked. Five rows failed this way before
2026-07-26.

A row is exactly five cells:

```text
| <group>.<n> | <one actionable line> | <state> | <terminal> | <pointer> |
```

Rules:

- The state cell is a bare token from this set and nothing else — no
  parenthetical, no added status prose, no invented word:
  `ready`, `in-progress`, `done-pending-archive`, `blocked`, `needs-info`,
  `wontfix`, `parked`. `queued` and `draft` are not rollout states; a row using
  one is skipped by the sweep.
- Exactly one cell in the line may equal a state token. A stray `|` or a state
  word sitting loose in the summary creates a phantom state cell and the sweep
  may split on the wrong one.
- No literal `|` anywhere in the summary cell.
- The summary cell is at most 280 characters. Over that, the row has become a
  notes blob: relocate the narrative to the owning plan's `## Status log`
  (`scripts/rolloutDrain.js`, dry-run by default) or, when the row has no plan
  doc, to the relocated-row section of the owning parent spec such as
  `docs/engine/ENGINE_REPAIR.md`. Relocate the text; never delete it.
- Verify before calling a row filed:

```bash
node scripts/docLoopStatus.js --lint
```

  Expected output: `ROLLOUT LINT: clean — every row is a sweep-safe pointer
  within budget.` Anything else means your row is not filed yet.

Creating a new plan MD or research MD is a builder-approved act. Propose the
file and its rollout row together and wait for approval before writing either.

Search for an existing research file, plan, and rollout row before creating a
new one. Update the owning artifact rather than starting a parallel record.

Use this loop proportionately. A narrow, fully specified, single-session task
does not require new research, a plan, or a rollout row unless the builder asks
for durable tracking. When the loop is used, the plan is the authoritative
cross-session handoff payload and rollout is its discovery pointer;
`output/codex/` may hold supporting diagnostics or proposed patches but must not
be the only durable handoff.

Under the active rollout doctrine, actionable rows are assigned only to the
builder terminals: `research-build` for skills, rules, documentation, ADRs, and
apparatus; `engine-sheet` for code, Sheets, schemas, and substrate. Media and
civic are generator terminals: their run findings enter production gap logs and
are promoted through research-build rather than assigned directly as rollout
work.

## Change protocol

For analysis, orientation, review, or diagnosis:

- remain read-only;
- inspect actual code and current Git state;
- support conclusions with repository paths;
- distinguish verified behavior from documentation claims;
- report stale or conflicting documentation instead of silently correcting it.

Antigravity/Gemini stop after analysis and a proposed diff; they do not
perform implementation. For an agent with implementation authorization:

1. Inspect `git status --short --branch`.
2. Read the relevant active plan, contract, ADR, implementation, and tests.
3. Identify the smallest authorized change surface.
4. Show the builder a proposed diff or precise patch description before applying
   any non-trivial change.
5. Apply only the approved scope.
6. Run proportionate local validation.
7. Show the resulting diff and validation results.
8. Do not deploy, publish, or ingest unless separately authorized. Commit and
   push only within the Push authorization tier defined under Git and commit
   rules below.

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

### Push authorization (builder decision, 2026-07-28)

The builder assigns commit and push rights by agent tier:

- **Kimi and Codex** may commit and push work that lies entirely inside the
  ordinary writable scope (`scripts/**`, `output/**`, `docs/**`), including
  tests. Conditions, all mandatory:
  - every touched or added test file passes locally before the commit;
  - `node --check` (or `python3 -m py_compile`) is clean on every changed
    script;
  - stage with path-specific `git add` — never `git add .` or `git add -A`;
  - the commit touches zero control-plane paths (`.claude/**`, `.agents/**`,
    `CLAUDE.md`, `SESSION_CONTEXT.md`) — those still land only through a
    Claude session under the `CLAUDE_CTL` gate. **One exception:** your own
    `**NEXT[<you>]:**` line in `SESSION_CONTEXT.md`, committed alone, per
    §Session close below;
  - the commit message names the authoring agent;
  - before pushing, check `git log origin/main..HEAD --oneline`; if commits
    from another terminal or agent are stacked, stop and report instead of
    pushing them along.
- **Engine substrate remains gated for every agent**: `phase*/`,
  `utilities/`, `lib/`, `schemas/`, `dashboard/`, `editions/`, configuration
  files, hooks, service manifests, and anything deployed via clasp. Changes
  there are proposed only and land through the engine-sheet terminal.
- **Antigravity and Gemini** have no project commit or push
  authorization and remain fully gated on all work: propose diffs only. The
  only exception is committing the agent's own `**NEXT[<agent>]:**` handoff
  line alone, per §Session close below.

### General rules (all agents)

- Do not create a branch, tag, merge, rebase, amend, or open a pull
  request unless explicitly requested.
- Do not stage files unless preparing an authorized commit.
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

## Session close (kimi, codex, antigravity — builder decision, 2026-07-28)

You carry a lane in `SESSION_CONTEXT.md`: a single `**NEXT[<you>]:**` line, sitting
beside the four Claude terminals and sharing the same `**PIN:**`. Every terminal
reads all of those lines at boot. That line is the only way work you did reaches
the next session — yours or anyone's. Git history records what changed; the NEXT
line records where the thread is.

**Close your session by rewriting it. Two steps, nothing else.**

1. **Rewrite your own `**NEXT[<you>]:**` line, in place.** One line. Where the work
   landed and what the next move is — not a task stub, not a paragraph. Detail
   belongs in the ROLLOUT row, the plan changelog, or the commit body; the NEXT
   line is the entry point into them. Aim for 350 characters. Nothing enforces
   that; it costs every terminal at every boot, so keep it tight.

2. **Commit path-specifically**, per the push-authorization rules above.

   **Antigravity:** this is the one commit you are authorized to make.
   You have no commit or push authorization for work — diffs stay proposals —
   but your own handoff line is bookkeeping, not work. Commit the line alone;
   propose everything else.

**What you must not touch:**

- **The `**PIN:**` line.** It is whole-world state — cycle, prod engine range,
  cadence — and a Claude terminal owns it. Never edit it.
- **Any other lane's NEXT line.** If `NEXT[media]` is stale, that is media's line
  to fix. Correct content in the wrong hand is still wrong; this rule has governed
  the four Claude terminals since S304 and it binds you identically.
- **Everything else in the file.** No header edits, no new sections, no prose. The
  file is a header line, a PIN line, and one NEXT line per lane. That is all it
  has ever been allowed to be.

**Mechanically:** `SESSION_CONTEXT.md` is control-plane, so the pre-commit hook
normally blocks it without `CLAUDE_CTL=1`. There is a narrow carve-out for exactly
this close — a commit whose only control-plane change is one external lane's own
NEXT line passes without the flag and prints
`external-lane handoff — NEXT[<you>] only, control-plane gate waived`. Touch the
PIN, a second lane, or any other protected path in the same commit and the whole
commit blocks. **Do not set `CLAUDE_CTL=1` to get around that** — the flag is a
Claude session's opt-in to the whole control plane, and reaching for it here is the
thing the carve-out exists to make unnecessary. A block means you staged more than
your own line; unstage the rest.

**You do not run `/session-end`.** That is a Claude Code skill and it is not
reachable from your harness. No PIN bump, no ROLLOUT sweep, no mechanical
orchestrator, no Supermemory bridge — those belong to the Claude terminals. Your
close is the two steps above.

**One asymmetry:** when a Claude terminal reviews and lands a batch you authored
(engine-sheet did this for Codex at S338), the landing goes in *that terminal's*
NEXT line and commit. You still write your own line for the work you did.

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

**No isolated Markdown files.** Every `.md` created anywhere in the repository
must be registered in its canonical index in the same approved change. Active
documents and root-level references register in `docs/index.md`; research
instances register in `docs/research/index.md`; generated or temporary Markdown
registers in the owning pipeline's canonical artifact index or manifest. If no
canonical index exists, stop and ask the builder where the file belongs before
creating it. A pointer from an unrelated document is not a substitute for an
index entry.

For every new active document other than a research instance:

- use the prescribed filename and folder;
- add required YAML frontmatter;
- use the controlled page type and tags;
- record sources and pointers;
- use `[[wikilinks]]` for internal docs;
- add the document to `docs/index.md` in the same approved change;
- update the document's changelog when appropriate.

For a new research instance, follow `docs/research/RESEARCH_TEMPLATE.md` and register it
in `docs/research/index.md` instead of `docs/index.md`.

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

### Work-item state

These describe work-item state, not system lifecycle. This is the complete
controlled vocabulary a rollout state cell may contain — it matches
`scripts/docLoopStatus.js` exactly, and a row using anything else is skipped by
the archive sweep:

- **ready** — sufficiently designed for authorized implementation;
- **in-progress** — partially built or being validated;
- **blocked** — cannot advance until its named dependency or decision clears;
- **needs-info** — requires evidence or a builder decision;
- **parked** — intentionally deferred;
- **done-pending-archive** — complete, awaiting the next sweep to
  `ROLLOUT_ARCHIVE.md`;
- **wontfix** — decided against; rare, and the row records why.

`draft` is a document status tag from `docs/SCHEMA.md` §5, not a work-item
state. Do not put it, `queued`, or any other invented word in a state cell.

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

### Crontab (UTC; verify with `crontab -l` before relying on this table)

| Schedule | Script | What it does |
|---|---|---|
| daily 05:00 | `scripts/backup.sh` | Tars credentials/logs/memory to `backups/` (keeps 7), uploads to Drive |
| daily 06:00 | `scripts/newsroom-digest.js` | Phase 2.3 morning digest of the last 36h of newsroom runs → `output/cron-compare/digest-YYYY-MM-DD.md` (review surface for Mike) |
| Mon–Fri 06:15 / 13:15 / 18:15 | `scripts/cron-desk-run.js --stage={angle,report,write} --fanout` | Phase 2.3 three-wake fan-out: 6 byline journalists/day on least-recently-used rotation (quotas civic 2, sports 2, culture 1, business 1). Angle builds today's rota; report gathers citizen quotes; write runs the Rhea gate (`--gate-backend api`, OpenRouter gemini-3.5-flash ~$0.06/run) → staged/flagged behind the probation wall, **never canon** until the Saturday compile |
| 07:00 / 12:00 / 19:00 | `scripts/discord-reflection.js` | Mags reflection over Discord logs → citizen page + Supermemory + claude-mem (Anthropic API) |
| 07:30 / 12:30 / 21:30 | `scripts/citizen-wake.js --wake=...` | Citizen-loop wake: Sheets + DeepSeek reflection → Supermemory page + gated `Reflection_Intake` row |
| daily 17:00 | `scripts/citizen-exchange.js` | One agent-to-agent exchange per day → Supermemory + intake row; transcripts in `output/exchanges/` |
| daily 08:00 | `scripts/notebooklmDailyNews.js` | Source-grounded NotebookLM newsroom listening brief; not canon |
| every 6h | `scripts/server-health-check.sh` | Disk/RAM/PM2/dashboard thresholds; Discord alert only on breach (silent when healthy) |
| Wed 04:00 | `scripts/weekly-maintenance.sh` | Engine health audit; Discord alert on issues |
| 1st of month 03:00 | `scripts/snapshot-droplet.sh` | DigitalOcean snapshot, keeps 1 |

The crontab header comment mentioning a "Mags Daily Heartbeat" refers to
`scripts/daily-reflection.js`, disabled since S187 — an orphan, not a live job.

### PM2 processes (verify with `pm2 list`)

- `godworld-dashboard` (online) — Express + React dashboard, port 3001.
- `mags-bot` (online) — Discord bot; historically high restart count.
- `wd-cards-daemon` (online) — world-data citizen-card builder.
- `moltbook` (stopped between its scheduled runs) — do not restart manually
  without approval.
- `spacemolt-miner` is removed from the live PM2 registry; do not re-add or
  restart it without approval.

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

## Subagent cost discipline (kimi, codex — builder decision, 2026-08-01)

A CLI lead never fans out to its own tier by default. Grunt subagent work —
exploration sweeps, mechanical edits, test runs, bulk reads — goes to the
cheapest model that clears the bar. The lead holds judgment and orchestration;
the fan-out runs a tier down, where the harness supports model binding.

- **Kimi Code:** bind subagents to the K2.7-code tier via `/secondary_model`
  (experimental — enable in `/experiments` first). K3-tier stays for the lead
  and for subtasks with a genuine reasoning floor.
- **Codex:** use the cheapest subagent tier the harness exposes for grunt
  work.

Cheaper-by-default, not cheapest-always: escalate a subagent back up only when
the subtask has a real reasoning floor (adversarial canon calls, subtle code
review). This mirrors `docs/MODEL_HIERARCHY.md` §8, which binds the Claude
terminals; this section binds the CLI lanes.

## Operating posture

Search before asserting. Read the actual implementation behind documentation
claims. Prefer deterministic evidence over plausible explanation.

Make the smallest reversible change that solves the requested problem.

When unsure whether an action may mutate canon, external state, production
services, credentials, schedules, or protected files, stop and ask.
