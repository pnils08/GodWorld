---
name: doc-audit
description: Audit architecture and system docs for staleness, inaccuracy, and drift from actual codebase state. Checks file counts, script references, API endpoints, column numbers, and cross-doc consistency.
effort: high
---

# /doc-audit — Architecture Doc Freshness Audit

## Usage
`/doc-audit` — Full audit of all architecture docs
`/doc-audit [filename]` — Audit one specific doc

## What This Audits

The 15 active architecture docs in `docs/` (not archive, not media voices, not journal):

| Doc | What to verify |
|-----|---------------|
| `ARCHITECTURE_VISION.md` | Still reflects current direction? Superseded by PRODUCT_VISION.md? |
| `CLAUDE-MEM.md` | Port 37777 still correct? PM2 process name? SQLite + Chroma still the stack? |
| `DASHBOARD.md` | 31 API endpoints — verify count against actual `server/*.js` routes |
| `DISCORD.md` | Bot name, features, Haiku model, local files + Supermemory RAG still accurate? |
| `EDITION_PIPELINE.md` | 27 steps — verify against CLAUDE.md pipeline and skill files |
| `OPERATIONS.md` | PM2 processes, cron jobs, health checks — verify against `pm2 list` and crontab |
| `PRODUCT_VISION.md` | Direction doc — check if rollout has diverged |
| `SIMULATION_LEDGER.md` | 675 citizens, 46 columns, column numbers — verify against live sheet schema |
| `SPREADSHEET.md` | 65 tabs — verify count, check for new/deleted tabs |
| `STACK.md` | Full stack view — verify all components still exist and versions current |
| `SUPERMEMORY.md` | 3 containers, isolation rules — verify against actual container state |
| `WORKFLOWS.md` | 6 workflows — verify commands, file lists, rules still match reality |
| `WORLD_MEMORY.md` | Archive system — verify paths and scripts exist |
| `RESEARCH.md` | Active questions — any answered? Findings log — any graduated to rollout but not marked? |
| `STACK.md` | PM2 process names + status, file counts (158 engine files), endpoint counts (40), skill count (25), agent count (23), plugin list, Supermemory container state, automation section (scheduled agents, AutoDream, hooks, hookify rules) |

Also check engine docs:

| Doc | What to verify |
|-----|---------------|
| `engine/ENGINE_MAP.md` | Function list — verify against actual godWorldEngine2.js call order |
| `engine/ENGINE_STUB_MAP.md` | Field dependencies — run `node scripts/ctxMap.js` and compare |
| `engine/ROLLOUT_PLAN.md` | Open items — any completed but not marked? Stale priorities? |
| `engine/SHEETS_MANIFEST.md` | Sheet names — verify against actual spreadsheet tabs |
| `engine/PHASE_DATA_AUDIT.md` | ctx.summary fields — verify against current code |

## How to Audit Each Doc

### Step 1: Verify claims against reality

For each doc, extract every **verifiable claim** and check it:

- **File counts** (e.g., "153 engine files") → `find phase*/ utilities/ lib/ -name "*.js" | wc -l`
- **Script references** (e.g., "run `node scripts/foo.js`") → verify the script exists
- **API endpoint counts** → grep route definitions in server code
- **Column numbers** → compare against `schemas/SCHEMA_HEADERS.md`
- **Process names** → `pm2 list`
- **Plugin/skill/agent counts** → count directories
- **Container names** → check Supermemory config
- **Tab counts** → count via sheets API or SHEETS_MANIFEST.md
- **ClockMode counts** → check against MEMORY.md or ledger query
- **Pipeline step counts** → compare EDITION_PIPELINE.md vs CLAUDE.md vs skill files

### Step 2: Cross-doc consistency

Check that docs agree with each other:

- CLAUDE.md pipeline steps = EDITION_PIPELINE.md steps = write-edition SKILL.md steps
- ENGINE_MAP.md function list = godWorldEngine2.js actual call order
- SIMULATION_LEDGER.md column count = MEMORY.md column count
- SUPERMEMORY.md container rules = MEMORY.md container rules
- WORKFLOWS.md commands = CLAUDE.md quick commands
- ROLLOUT_PLAN.md completed phases = actual feature state

### Step 3: Detect staleness

Flag docs that reference:
- Session numbers more than 10 sessions old without updates
- "Not started" items that ARE started
- "DONE" items that were reverted or broken
- Dates more than 30 days old in "last updated" fields
- Scripts, files, or directories that no longer exist

## Output Format

```
DOC AUDIT — [date]
================================================

STALE (needs update):
1. [doc] — [what's wrong] — [what's true now]
2. [doc] — [claim: "X"] — [reality: "Y"]

INCONSISTENT (docs disagree):
3. [doc1] says X, [doc2] says Y — [which is correct]

MISSING (not documented):
4. [thing] exists but isn't in any doc

DEAD REFERENCES (doc points to something that doesn't exist):
5. [doc] references [path/script/tab] — doesn't exist

================================================
Docs audited: N
Stale: N | Inconsistent: N | Missing: N | Dead refs: N
```

## When to Run

- Every 5 sessions as periodic maintenance
- After major refactoring or new feature work
- Before onboarding someone new to the project
- When a doc feels wrong but you're not sure what changed
