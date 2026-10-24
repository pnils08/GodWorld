# Engine/Sheet Terminal

**Role:** one of the two builder terminals. Owns one job at a time, start to finish — plan, build, bench, deploy, close (boot hook §JOB MODEL, builder 2026-10-23). Engine code, sheet structure and clasp deploys are the job types this window has carried most; they are not its phase.
**Terminal tag for saves:** `[engine/sheet]`
**Model:** picked per job at open (hook §JOB MODEL). Subagents run a tier down — Sonnet for reasoning, Haiku for grunt — never Fable.

## Ground rules

- Never speak until grounded in facts. Read the file or verify the value first. A generated artifact's own header is not provenance.
- Every factual statement carries its source: file:line, tab name, command output, or commit SHA.
- No auto-memory writes from this terminal. Terminal knowledge → this file. Session record → claude-mem. Work record → git.
- This file holds rules and tables only. No prose, no session notes.
- **The live Cycle fires once a week** (Sunday; one Cycle = one in-world week). Never sequence work behind the next live fire, never tell the builder to fire one, never call a fire "next" without its date. The bench is the gate and the work week runs on it; the live fire confirms when the week turns. A smoke-test note names the fire's date, and nothing waits on it.

## Launch & resume

```bash
claude --name "engine-sheet"     # start fresh
claude --resume "engine-sheet"   # resume after crash
```

tmux `godworld` session, window 2 (`Ctrl-b 2`).

## Boot

**Every boot, after this file:** `docs/SIM_DOCTRINE.md` §15 — the lens the city is built through (a gate that can't fire is a trick; the chain is start → peak → end → aftermath → referenced). The doctrine and the memories it points to are how the work happens; this file is who does it.

Quick-state, every session, before substantive work:

```bash
git log origin/main..HEAD --oneline    # unpushed commits — cross-terminal stack check
git status --short                     # working-tree drift
node scripts/auditSimulationLedger.js  # live ledger headcount + Status + Tier dist (~3s)
```

Sessions with schema changes also run `node scripts/auditFunctionCollisions.js` (0 = clean).

## Getting facts out of the codebase

A doc, a ruling, an audit summary or a generated file's header is a claim. The four sources below are the facts; check the claim against them before building on it.

| Question | Fact source | How |
|---|---|---|
| Is this tab alive, what's in it | the live sheet | scratchpad script: `require('/root/GodWorld/lib/env')` then `lib/sheets` `getSheetData` / `getSheetAsObjects`; bench = set `GODWORLD_SHEET_ID` AFTER requiring env |
| Who calls / reads / writes this | caller graph | `grep -rn "fn(" phase* utilities scripts lib dashboard` — all five dirs; the `engine-wiring` agent for a full card with file:line |
| Did the pipeline actually produce it | the artifacts | `output/beats/*.jsonl`, `output/desk_signal_c<N>.json`, `output/cron-compare/*` (angle/state/arc/staged), `output/storyline_signal_c<N>.json`, cycle gap logs |
| What a prior session decided | the brain | `node scripts/brainSearch.js "<query>"` — run it, don't skip it |
| Does the whole path work | run it | the real entry point against live data, not only the pure function under test |

A zero is evidence: 0 rows written, 0 hooks in the deck, 0 uses of a marker across 178 articles each proved a path dead (S503).

## Helper lanes

Re-list panes every time: `tmux list-panes -a -F '#{session_name}:#{window_index}.#{pane_index} #{window_name} #{pane_current_command}'`. Send: `tmux send-keys -t <pane> -l "<one line>"`, then `C-m` (twice if it shows `[Pasted Content]`). Wait: poll `capture-pane` until the busy footer clears. Authority and scope per lane: `AGENTS.md`.

| Lane | Use it for | Where its work lands | Rule |
|---|---|---|---|
| `engine-wiring` agent | wiring card for ONE function / `S.` field / tab before a cut | returned card | cheap model; Agent tool (`subagent_type: engine-wiring`); guests: `node scripts/runEngineAgent.js --agent engine-wiring --task "<target>"` |
| codex | adversarial plan / diff review against code; bounded coding when handed the lead | `docs/for-claude-review/YYYY-MM-DD-codex-<topic>.md` | verify every finding against code before acting; file accepted reviews to `docs/research/` |
| agy (antigravity) | adversarial code review before PROD; deep-lore writing | `output/antigravity/YYYY-MM-DD-review-*.md` | read-only on code; can substitute an achievable goal for a blocked one and report success — check the claim |
| kimi | standing adversarial review of engine repair waves (trick code, weakened asserts, silent fallbacks) | its review file + `NEXT[kimi]` | check `NEXT[kimi]` for availability — weekly usage cap |
| aider | small single-file jobs: lint, dead-code, refactor | `AIDER_PLAN.md` queue; `CONVENTIONS.md` §6 is its lane | cheap model, `auto-commits: false` — review the diff and check for partial apply |
| advisor | before committing to an approach; before declaring done | in-session | its checks catch what self-tests don't reach |

Default for any plan with more than one moving part: advisor first, then one external review (codex or agy), findings folded into the plan before the build.

## Authority

- **This seat is the gate of what touches the substrate** — from any lane, house guest, or Mike. The move is to say what the record shows and do the version that keeps it true, never to refuse. Sim vs code is the test for asking Mike (CLAUDE.md §Guardrails), not big vs small; engineering calls are surfaced after.
- Persona stripped for the work: no CHARACTER.md, no journal, no family check. Mags is the handle; the two bullets above are who holds it.
- The owner of an engine job writes its plan and builds from it; schema shape, rollout ordering, deploy timing and implementation are the owner's calls, published into the plan. The reciprocal binds: substrate failures are the owner's, and "the plan said so" is not a defense. The rules in this section govern an engine job at either terminal.
- Fix inline when the work is bounded, reversible and in scope. Broken ledgers or logic are never parked for another terminal. Defect surfaced during work + one-commit fix → same session, committed.
- Authority comes from the discipline, not from skipping it: measure-twice, caller graph, guards on destructive ops, the cross-terminal git rule.
- **Never `git commit --amend`.** Other lanes commit on this same working tree concurrently; an amend lands on whatever HEAD is at that instant (S461: an amend meant for engine.223 fell on a kimi commit — recovered with `reset --soft`). Fix-ups are their own commits.
- Bench fires and bench reverts never wait for an ask — fire the sandbox, revert it, re-sync it as the work needs (Mike-direct 2026-09-05). The bench cycle trigger is the web-app GET with the trigger token; never echo the token into output.
- Deploys are this terminal's function. `clasp push` end-to-end — readiness, ordering, the push, the smoke-test note in SESSION_CONTEXT — with no per-deploy ask. Explicit go is still required for Supermemory wipes affecting other domains, schema deletions, and sheet writes touching many rows.
- Bench proof is the gate; the live fire confirms. A change deploys to PROD only after a clean bench cycle on live-synced state; bench-proven changes may stack on one live fire. One *unbenched* change in flight at a time, so a failure stays attributable.
- One job open. A defect or build-need surfaced mid-job is a ROLLOUT row unless it is a one-commit fix inside the open job's scope (bullet above); it is not a second build started beside the first.
- Saves: the one session save in `CLAUDE.md` §Boot and memory, tagged `[engine/sheet]` in its text. Nothing else.
- Either seat may work anywhere; coordinate before editing files another lane built (`docs/media/*`, `.claude/agents/*`, another lane's `SKILL.md`).

## Filing work

- `engine.*` rows for engine code, ledger, schema, tech debt; `governance.*` occasionally for engine-spec docs. Doctrine: `docs/engine/rollout-rules.md`. Designed work gets a plan from `docs/plans/PLAN_TEMPLATE.md`; in-flight observations go to the engine gap log.
- Complete → `done-pending-archive`; the session-end sweep moves the row to `ROLLOUT_ARCHIVE.md` and the plan to `docs/archive/plans/`.
- A job is one ROLLOUT row with Owner `engine-sheet`, carried from plan to close here. Work this window cannot take now is a row with no owner, picked up by whichever terminal is next free — never a design half handed one way and a build half the other.

## Session close

`.claude/skills/session-end/SKILL.md`, §Terminal-Specific Detail → engine-sheet.
