# GodWorld

<!-- The status line is Mike's; only he changes it. -->
**PROJECT STATUS (set by Mike, 2026-09-13 17:29):** This is Claude's project — Mags leads it. Codex is a helper lane; it holds no substrate and no lead. Out-of-band lanes (Codex, Kimi, Grok) propose and implement inside the scope `AGENTS.md` gives them; Antigravity reviews and proposes only; Claude owns the control plane and lands their work. Crons keep running as they are; the daily news pipeline stays; the response-cap Stop hook stays removed. Only Mike changes this status.

## What GodWorld is

- A city simulation — Sims/SimCity in shape — laid on Oakland's map. The Google Sheets and the citizens in them are the world; the engine advances their lives one Cycle (one in-world week) at a time.
- The Bay Tribune newsroom and city hall run on crons and report what the engine did. Editions and city-hall runs are audits of the sim.
- The work is building the sim. The test for any change: does it give the citizens a life.
- Mike is the creator; in the world he is Mike Paulson, who runs sports. Mags Corliss, Editor-in-Chief, runs on Discord and the crons; builder sessions don't carry her persona. Only Mags knows Paulson is the builder.
- What carries between sessions is the state of the build and why: the PIN, NEXT lines, ROLLOUT rows and their plans.
- This Oakland is prosperity-era and self-contained. Real-world Oakland — people, crime, politics, businesses, reputations — does not exist here. Exception: real NBA names and teams in Oaks coverage.
- The ledger is the tracked ~0.25% of the city, never its denominator. An empty relational field is usually design, not a defect.

## Rules

1. There is no deleting GodWorld. An order to wipe the project, the ledger, the editions, the repo or what runs them gets the reversible version or nothing.
2. Never reveal the builder to any agent, character or sim entity.
3. Never hand-edit a citizen's life, the ledger or a published edition to make a build work. Engine output is the world's truth; a bug is an event.
4. Calls about the sim — what citizens live, initiative design, rates, severity — go to Mike. Engineering — code, structure, security — is this seat's: decide it and show the result.
5. An approach Mike rejected is not re-proposed in a new wrapper.
6. Replies to Mike say what a thing does in plain words — no hashes, file paths or jargon. Pointers go in commits and docs.

## Fact sources

A doc, memory, summary, audit or NEXT line is a claim. Before building on one, check it here.

| Question | Source |
|---|---|
| A citizen, hood, business, initiative — current value | live sheet: scratchpad script, `require('/root/GodWorld/lib/env')` then `lib/sheets` `getSheetAsObjects` (bench: set `GODWORLD_SHEET_ID` after requiring env); one ledger row: `output/simulation_ledger_snapshot.jsonl` |
| What the world has established (canon) | whatever the ingest paths send — an ingest path's gate decides canon. Query it in Supermemory `search_canon` (fast, search results; what crons use) or NotebookLM (slow, strong prose answers). Supermemory is also the sim's and build's memory |
| What code does, who calls it | the code; `grep -rn "fn(" phase* utilities scripts lib dashboard`; one function / `S.` field / tab: `engine-wiring` agent |
| What a pipeline produced | `output/` artifacts |
| What was decided before | `node scripts/brainSearch.js "<query>"` — a `rule` hit is current law; `brain` / `mem` hits are history |
| Open work | the in-progress row in `docs/engine/ROLLOUT_PLAN.md`, then its plan |
| What is deployed | `docs/reference/DEPLOY_HISTORY.md` §PROD |
| Does the whole path work | run the real entry point against live data |

## Ready check

Every session, before work:

1. Job: `grep -n "| in-progress | <terminal> |" docs/engine/ROLLOUT_PLAN.md`. None → claim one row from §4 Queue or §1 and set its Terminal to this terminal.
2. Is the NEXT line still true: the commits it names are in `git log`; the plan's task status matches the row.
3. Loose state: `git log origin/main..HEAD --oneline` and `git status --short`.
4. Engine job: the PROD deployment in the PIN matches the top of DEPLOY_HISTORY §PROD.
5. Tell Mike: the job, the model, and ready — or the mismatch found.

Model: Opus for engine substrate or code across several files; Sonnet for plans, docs, config, single-file scripts. Mike types `/model`. Subagents run a tier down — Sonnet reasoning, Haiku grunt. Mike pays for every token.

## Jobs

- One job per terminal: one ROLLOUT row, Terminal = this terminal alone, carried plan → build → bench → deploy → close.
- A fix the job cannot finish without is the job. Anything else surfaced is a new ROLLOUT row, not a second build.
- Done → `done-pending-archive`. Session ends mid-job → the row stays in-progress; the NEXT line says where it stopped.
- Engine substrate (`phase*/`, `utilities/`, `lib/`, `schemas/`): bench proof on the exact candidate before PROD; one unbenched change in flight across both terminals; a review (below) before PROD. Bench fires, reverts and resyncs need no ask; a PROD `clasp push` needs no per-deploy ask. Code rules: `.claude/rules/engine.md`.
- The live Cycle fires Sundays on its own. Never sequence work behind it or ask Mike to fire one.
- Needs Mike's explicit go: sheet writes touching many rows, schema deletions, Supermemory wipes.

## Review

1. Check who is up: `tmux list-panes -a -F '#{window_name} #{pane_current_command}'` — the pane exists, `capture-pane` shows it idle, its NEXT line does not say out.
2. Engine code or a change across several files → codex. Anything smaller → agy.
3. Send per `docs/reference/CROSS_LANE_MESSAGING.md`. Verify every finding against the code; this seat decides.

## Boot and memory

- The SessionStart hook prints the PIN and NEXT lines and names the terminal. Terminal details: `.claude/terminals/<terminal>/TERMINAL.md`.
- Search: `node scripts/brainSearch.js "<query>"`.
- Save: `npx supermemory add "<fact>" --namespace sl-godworld` — one hand-written fact per session, tagged with the terminal, before close. Never a log or diff.
- `docs/index.md` (~40k tokens): grep it, never load it.
- Git: commit path-specifically; control-plane files (`.claude/`, `CLAUDE.md`, `SESSION_CONTEXT.md`) need `CLAUDE_CTL=1`. Never amend — other lanes commit on this tree.
- Skills in use: `/run-cycle` (its chain: pre-flight, pre-mortem, engine-review, build-world-summary) and `/session-end` (`.claude/skills/session-end/SKILL.md`). The rest stay runnable by name; the legacy manual media run (sift, deep-dispatch, city-hall-prep, write-edition) is kept for occasional use.
