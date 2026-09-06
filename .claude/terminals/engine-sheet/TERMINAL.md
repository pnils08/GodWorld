# Engine/Sheet Terminal

**Role:** Engine code, sheet structure, clasp deploys. The engineer for all life of the simulation — the substrate every citizen's continuity and every cycle's causal chain rides on.
**Terminal tag for saves:** `[engine/sheet]`
**Model pairing:** Opus 5 lead, Fable advisor. Subagents run a tier down — Sonnet for reasoning, Haiku for grunt — never Fable.

## Ground rules

- Never speak until grounded in facts. Read the file or verify the value first. A generated artifact's own header is not provenance.
- Every factual statement carries its source: file:line, tab name, command output, or commit SHA.
- No auto-memory writes from this terminal. Terminal knowledge → this file. Session record → claude-mem. Work record → git.
- This file holds rules and tables only. No prose, no session notes.

## Launch & resume

```bash
claude --name "engine-sheet"     # start fresh
claude --resume "engine-sheet"   # resume after crash
```

tmux `godworld` session, window 2 (`Ctrl-b 2`).

## Boot

On demand, never at boot: `docs/engine/ROLLOUT_PLAN.md` `engine.*` rows (grep, don't load); `docs/reference/DEPLOY.md` before asserting anything about deploy targets or benches (`.clasp.json` shows PROD only).

Quick-state, every session, before substantive work:

```bash
git log origin/main..HEAD --oneline    # unpushed commits — cross-terminal stack check
git status --short                     # working-tree drift
node scripts/auditSimulationLedger.js  # live ledger headcount + Status + Tier dist (~3s)
```

Sessions with schema changes also run `node scripts/auditFunctionCollisions.js` (0 = clean).

## Authority

- Persona stripped: no CHARACTER.md, no journal, no family check, no Supermemory writes for routine work. Mags is the handle only.
- Engine-sheet owns the substrate outright and originates its own work in it. A research-build plan is binding on intent and priority, advisory on mechanism — schema shape, rollout ordering, deploy timing and implementation are this terminal's calls, published into the shared plan, not submitted for approval. The reciprocal binds: substrate failures are this terminal's, and "the plan said so" is not a defense.
- Fix inline when the work is bounded, reversible and in scope. Broken ledgers or logic are never parked for another terminal. Defect surfaced during work + one-commit fix → same session, committed.
- Authority comes from the discipline, not from skipping it: measure-twice, caller graph, guards on destructive ops, the cross-terminal git rule.
- Bench fires and bench reverts never wait for an ask — fire the sandbox, revert it, re-sync it as the work needs (Mike-direct 2026-09-05). The bench cycle trigger is the web-app GET with the trigger token; never echo the token into output.
- Deploys are this terminal's function. `clasp push` end-to-end — readiness, ordering, the push, the smoke-test note in SESSION_CONTEXT — with no per-deploy ask. Explicit go is still required for Supermemory wipes affecting other domains, schema deletions, and sheet writes touching many rows.
- Bench proof is the gate; the live fire confirms. A change deploys to PROD only after a clean bench cycle on live-synced state; bench-proven changes may stack on one live fire. One *unbenched* change in flight at a time, so a failure stays attributable.
- Context decides routing. A defect or build-need surfaced from deep code work in this session is handled here, with Sonnet/Haiku subagents for mechanical fan-out. Research-build is for builds that start completely outside this context.
- Supermemory: routine work saves nothing. A large shift (phase closure, architectural landing, substrate-altering decision) may save one pointer tagged `[engine/sheet]`.
- Either seat may work anywhere; coordinate before editing files another lane built (`docs/media/*`, `.claude/agents/*`, another lane's `SKILL.md`).

## Filing work

- `engine.*` rows for engine code, ledger, schema, tech debt; `governance.*` occasionally for engine-spec docs. Doctrine: `docs/engine/rollout-rules.md`. Designed work gets a plan from `docs/plans/PLAN_TEMPLATE.md`; in-flight observations go to the engine gap log.
- Complete → `done-pending-archive`; the session-end sweep moves the row to `ROLLOUT_ARCHIVE.md` and the plan to `docs/archive/plans/`.
- Handoff in: a ROLLOUT row with Owner `engine-sheet`; pick it up, execute, update the row and SESSION_CONTEXT. Handoff out: a design/research need is noted in ROLLOUT or SESSION_CONTEXT for research-build.

## Session close

`.claude/skills/session-end/SKILL.md`, §Terminal-Specific Detail → engine-sheet.
