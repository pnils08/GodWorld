# How a builder session works

CLAUDE.md holds the project and its rules and imports this file; nothing here repeats it.

## The terminals

Two builder terminals, the same work, one job each. The SessionStart hook reads the tmux window name, finds its row below, and prints the PIN and that terminal's NEXT line.

| Terminal | tmux `godworld` window | Start / resume | Save tag | Codex window | Also |
|---|---|---|---|---|---|
| `research-build` | 1 | `claude --name "research-build"` / `claude --resume "research-build"` | `[research/build]` | `codex-rb` (2) | stewards `docs/engine/rollout-rules.md` and runs the session-end ROLLOUT sweep across all groups |
| `engine-sheet` | 3 | `claude --name "engine-sheet"` / `claude --resume "engine-sheet"` | `[engine/sheet]` | `codex-es` (4) | — |

Use your own terminal's codex window, never the other's. Close: `.claude/skills/session-end/SKILL.md` §Terminal-Specific Detail → your terminal.

## Fact sources

A doc, memory, summary, audit, NEXT line or a generated file's header is a claim. Before building on one, check it here.

| Question | Source |
|---|---|
| A citizen, hood, business, initiative — current value | live sheet: scratchpad script, `require('/root/GodWorld/lib/env')` then `lib/sheets` `getSheetData` / `getSheetAsObjects` (sandbox: set `GODWORLD_SHEET_ID` after requiring env); one ledger row: `output/simulation_ledger_snapshot.jsonl` |
| What the world has established (canon) | whatever the ingest paths send — an ingest path's gate decides canon. Query it in Supermemory `search_canon` (fast, search results; what crons use) or NotebookLM (slow, strong prose answers). Supermemory is also the sim's and build's memory |
| What code does, who calls it | the code; `grep -rn "fn(" phase* utilities scripts lib dashboard` (all five dirs); one function / `S.` field / tab: the wiring card (§Helper lanes) |
| What a pipeline produced | `output/` artifacts: `output/beats/*.jsonl`, `output/desk_signal_c<N>.json`, `output/cron-compare/*`, `output/storyline_signal_c<N>.json`, the cycle gap logs |
| What was decided before | `node scripts/brainSearch.js "<query>"` — a `rule` hit is current law; `brain` / `mem` hits are history |
| Open work | `docs/engine/ROLLOUT_PLAN.md` (every job, one line each), then the row's plan |
| What is deployed | `docs/reference/DEPLOY_HISTORY.md` §PROD |
| Does the whole path work | run the real entry point against live data, not only the pure function under test |

A zero is evidence: 0 rows written, 0 hooks in the deck, 0 uses of a marker each prove a path dead.

## Accuracy

- "How does X work?" → read the code. "Why did X fail?" → read the error. "Does X do Y?" → check.
- "Probably," "likely," "should be" about this codebase → open the file instead.
- Don't know → say so. Don't fill the gap with action.
- A file that says "DO NOT re-analyze" — trust it and act from there.
- Read the skill file before running a pipeline.
- Stuck in a loop → `/self-debug`.
- Restating Mike's words, "I hear you," or an untracked note is not delivery. Delivery is a committed change or a named refusal that says what's blocking it.

## Ready check

Every session, before work:

1. Job: the row id the NEXT line names → its row in `docs/engine/ROLLOUT_PLAN.md` → its plan. No row named → ask Mike; a new row is claimed only on his word.
2. Is the NEXT line still true: the commits it names are in `git log`; the plan's task status matches the row.
3. Loose state: `git log origin/main..HEAD --oneline` and `git status --short`.
4. Engine job: the PROD deployment in the PIN matches the top of DEPLOY_HISTORY §PROD.
5. Tell Mike: the job, the model, and ready — or the mismatch found.

Model: Opus for engine substrate or code across several files; Sonnet for plans, docs, config, single-file scripts. Mike types `/model`. Subagents run a tier down — Sonnet reasoning, Haiku grunt. Mike pays for every token.

## Jobs

- One job per terminal: one ROLLOUT row, any group, Owner = the terminal carrying it, plan → build → sandbox → deploy → close. A row is never split into a design half and a build half. Row contract: `docs/engine/rollout-rules.md`.
- Designed work gets a plan from `docs/plans/PLAN_TEMPLATE.md`. Observations made mid-job go to the cycle gap log.
- A fix the job cannot finish without is the job. Anything else surfaced is a new ROLLOUT row, not a second build.
- The job's owner carries it and owns its failures; "the plan said so" is no defense.
- Done → `done-pending-archive`; the session-end sweep moves the row to ROLLOUT_ARCHIVE and the plan to `docs/archive/plans/`. Session ends mid-job → the row stays in-progress; the NEXT line says where it stopped.
- A read owed to a fire lives once, in its ROLLOUT §2 row (builder 2026-11-07). Boot and `/run-cycle` print the rows naming the next fire (`node scripts/docLoopStatus.js --due`); a NEXT line never copies them. Closing a read = flip or re-date the row.
- Engine substrate (`phase*/`, `utilities/`, `lib/`, `schemas/`): sandbox proof on the exact candidate, on live-synced sandbox state, before PROD; sandbox-proven changes may stack on one live fire; one unproven change in flight across both terminals (the sandbox is shared); PROD does not wait on a review (below). Code rules: `.claude/rules/engine.md`.
- Mike's standing go: sandbox fires, reverts and resyncs, and a PROD `clasp push` with its smoke-test note, need no per-deploy ask. Claude fires and deploys the sandbox; procedure, current sandbox and trigger: `docs/reference/DEPLOY.md`. The trigger is the web-app GET with the trigger token; never echo the token.
- Needs Mike's explicit go: sheet writes touching many rows, schema deletions, Supermemory wipes.
- The live Cycle runs Sundays; Mike fires it from the sheet inside `/run-cycle`. Never sequence work behind it or ask Mike to fire one.
- Either terminal works anywhere. Files other pipelines run on — `.claude/agents/*`, `docs/media/voices/*`, another lane's `SKILL.md` — change only inside a job that owns them, and the row says so.

## Review

1. Check who is up: `tmux list-panes -a -F '#{window_name} #{pane_current_command}'` — the pane exists, `capture-pane` shows it idle, its NEXT line does not say out. Never message a busy lane.
2. Route: engine code or a change across several files → your terminal's codex window. Anything smaller → agy. A plan with more than one moving part: advisor first, then the one external review, findings folded in before the build.
3. Send per `docs/reference/CROSS_LANE_MESSAGING.md`. Verify every finding against the code; a reviewer's finding is a claim, not an order.
4. One review, at most one re-review of the fold. What is left then goes to Mike: fix it in place, or record it and close. No third round.
5. Codex and agy are the adversarial reviewers. A review is advice, not a gate: going live does not wait on one.

## Helper lanes

Scope and authority per lane: `AGENTS.md`.

| Lane | Use it for | Where its work lands |
|---|---|---|
| `engine-wiring` agent | wiring card for one function / `S.` field / tab: callers at both entry points, position vs the Phase-10 executor, writers + readers, write path, open rows. Open every pointer on it before the cut | the returned card. Agent tool `subagent_type: engine-wiring`; guests run `node scripts/runEngineAgent.js --agent engine-wiring --task "<target>"` |
| codex | free model; adversarial plan / diff review against the code; bounded coding inside its `AGENTS.md` scope | `docs/for-claude-review/YYYY-MM-DD-codex-<topic>.md`; accepted reviews filed to `docs/research/` |
| agy (antigravity) | adversarial review; deep-lore drafts, quarantined until graded | `output/antigravity/YYYY-MM-DD-review-*.md`; read-only on code; check its success claims |
| kimi | adversarial review of engine repair waves (trick code, weakened asserts, silent fallbacks) | its review file; weekly usage cap |
| aider (window 6) | small single-file jobs: lint, dead code, refactor | `AIDER_PLAN.md` queue; `auto-commits: false` — review the diff, check for partial apply |
| advisor | before committing to an approach; before declaring done; not for routine mechanical work | in-session |

## Boot and memory

- Claude Code loads CLAUDE.md (and this file through it) and the memory index on its own; a rule file in `.claude/rules/` loads when a file matching its paths is opened. Project agents (`.claude/agents/*`) set `omitClaudeMd: true` and start without this boot; path rules still reach them when they open matching files. The SessionStart hook prints the PIN and the terminal's NEXT line.
- Search: `node scripts/brainSearch.js "<query>"`.
- Save: `npx supermemory add "<fact>" --namespace sl-godworld` — one hand-written fact per session, tagged with the terminal's save tag, before close. Never a log or diff.
- `docs/index.md` (~40k tokens): grep it, never load it.
- Git: commit path-specifically; control-plane files (`.claude/`, `CLAUDE.md`, `SESSION_CONTEXT.md`) need `CLAUDE_CTL=1`. Never amend — other lanes commit on this tree; a fix-up is its own commit.
- Skills in use: `/run-cycle` (its chain: pre-flight, pre-mortem, engine-review, build-world-summary) and `/session-end`. The rest stay runnable by name; the legacy manual media run (sift, deep-dispatch, city-hall-prep, write-edition) is kept for occasional use.
