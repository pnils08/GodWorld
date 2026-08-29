---
paths:
  - "phase*/**/*.js"
  - "scripts/*.js"
  - "lib/*.js"
  - ".claude/skills/run-cycle/**"
  - ".claude/skills/pre-flight/**"
---

# Engine Code Rules

The engine is production substrate: every citizen's continuity rides on it. Conservative defaults, empirical verification, caller-graph awareness, blast-radius awareness, reverse on evidence.

## Reference docs — consult before guessing

| Question | Doc |
|---|---|
| How a function works, what it reads/writes, phase order | `docs/engine/ENGINE_STUB_MAP.md` (condensed) → `docs/engine/ENGINE_MAP.md` (full) |
| Ledger columns, what writes a column, citizen fields | `docs/SIMULATION_LEDGER.md` + `docs/SCHEMA.md` |
| Which script reads/writes which tab; direct-write carve-outs by file | `docs/engine/SHEETS_MANIFEST.md` (§9 for carve-outs) |
| Open defects and builds | `docs/engine/ROLLOUT_PLAN.md` `engine.*` rows — grep them, don't load the plan |
| Designing any mechanic — a sim, not a data system | `docs/SIM_DOCTRINE.md` — read BEFORE design |
| What connects to what | `graphify query "..."` |
| Everything wired to ONE function / `S.` field / tab — callers at both entry points, position vs the Phase-10 executor, writers + readers, write path, open rows | spawn the `engine-wiring` subagent (`.claude/agents/engine-wiring/SKILL.md`); open every pointer on the card before cutting. Guests run it via `scripts/runEngineAgent.js` |
| Deploy targets, current sandbox, standup protocol | `docs/reference/DEPLOY.md` — read before asserting anything about benches. `.clasp.json` shows PROD only |

Load on demand, never at boot — `ENGINE_STUB_MAP` alone is ~86KB.

**Truth docs update in the same commit as the change.** Engine structure changed → regenerate STUB_MAP (`/stub-engine`) in that commit. Rows, columns or schema changed → `SIMULATION_LEDGER` + `SCHEMA_HEADERS` in that commit. A doc that will not true up cleanly is the signal the change is half-built.

## Measure twice, cut once

Before any destructive operation — delete, rename, migration, schema dedup, ROLLOUT triage:

1. READ the implementation end-to-end. Never act on an audit summary alone.
2. CALLER GRAPH — `grep -rn "fnName("` excluding definitions; count and classify call sites by phase. Search exported `process*_` names, not file names.
3. EMPIRICAL STATE — `Engine_Errors`, live row counts, git log of the touched files.
4. SHOW the triage, reasoning and cascading risks before touching code.
5. REVERSE when evidence contradicts the hypothesis.
6. DOCUMENT the findings in the commit message.
7. Multi-commit batches: re-run the audit between commits.

## Rules

- 100+ scripts with cascade dependencies. Phases run phase01 → phase11; each reads ctx fields earlier phases wrote. Check what reads and writes an affected field before editing. Engine files alias `ctx.summary` as `S` — search both spellings.
- Never `Math.random()`. `ctx.rng` only. Every former fallback site throws; a new fallback is a violation.
- Never write to sheets directly. Queue `ctx.writeIntents`; only `phase10-persistence/` executes them.
- `executePersistIntents_` runs once, at `Phase10-ExecuteIntents`, and ends with `clearAllIntents_`. An intent queued in any later phase is silently dropped. Phase-11 functions therefore write direct by structural necessity — a permanent carve-out class, never a migration target.
- Every direct write outside Phase 10 is listed by file and class in `docs/engine/SHEETS_MANIFEST.md` §9. A direct write not on that table is a bug.
- Pre-commit rejects `Math.random()`, sheet writes outside persistence, and engine language in media files. The post-write hook flags the same at edit time, plus unrecognised `ctx.summary` fields.
- No maintenance scripts for ledger work. Read and write through `lib/sheets.js` directly — scripts add conditional logic that silently skips rows.
- Verify after every write: read the live sheet back. Script output is not completion.
- A citizen mint is not finished until `node scripts/dumpLedger.js` refreshes `output/simulation_ledger_snapshot.jsonl`. `scripts/canon-name-check.js` reads that snapshot, not the sheet. Confirm with `require('./scripts/canon-name-check').checkText('<name>')`.
- Depth over speed. Correct and verified, not fast.
- `/tech-debt-audit` every 3-5 sessions; results in `docs/engine/tech_debt_audits/`.

## Health commands

| Command | Use |
|---|---|
| `/health` | 30s pulse — session start, after deploys |
| `/ctx-map` | field dependency map — before modifying a phase function |
| `/deploy` | clasp push + verify |
| `/pre-mortem` | full pre-cycle scan — before running a cycle |
| `/tech-debt-audit` | comprehensive code health |
| `/stub-engine` | regenerate the function reference map |
| `/doc-audit` | doc staleness after major changes |
| `graphify query "..."` | dependency trace from the persistent graph |
