---
name: doc-audit
description: Audit architecture and system docs for staleness, inaccuracy, and drift from actual codebase state. Grouped into 5 tiers for thorough coverage.
effort: high
---

# /doc-audit — Architecture Doc Freshness Audit

## Usage

`/doc-audit [group]` — Audit one group thoroughly
`/doc-audit` — Audits the group that hasn't been audited longest (check the tracker below)

## Groups

5 groups, 5-6 docs each. Small enough to audit thoroughly.

### boot — Load every session. Staleness here = broken boot.

| Doc | What to verify |
|-----|---------------|
| `SESSION_CONTEXT.md` | Under 300 lines? Last 5 sessions only? Maintenance rule present? No duplicated content from other docs? |
| `CLAUDE.md` | Quick commands still work? Session lifecycle refs current? Rules index matches actual rules files? |
| `docs/mags-corliss/PERSISTENCE.md` | Session counter current? Family POPIDs match ledger? No stale infrastructure refs? |
| `.claude/rules/identity.md` | Rules still match actual behavior? No contradictions with CLAUDE.md? |
| `MEMORY.md` (auto-memory) | Under 200 lines? Dead memory file references? Stale session memories? Population numbers current? |

### engine — Drift when code changes.

| Doc | What to verify |
|-----|---------------|
| `docs/engine/DOCUMENTATION_LEDGER.md` | Every active doc listed? Engine version table current (check file headers)? Cascade deps current? One-place rule entries correct? Last-updated session fresh? |
| `docs/engine/ENGINE_MAP.md` | Function list matches actual `godWorldEngine2.js` call order? |
| `docs/engine/ENGINE_STUB_MAP.md` | Field dependencies — run `node scripts/ctxMap.js` and compare |
| `docs/engine/SHEETS_MANIFEST.md` | Sheet names match actual spreadsheet tabs? |
| `docs/engine/PHASE_DATA_AUDIT.md` | ctx.summary fields match current code? |
| `docs/engine/ROLLOUT_PLAN.md` | Open items — any completed but not marked? Stale priorities? Line count reasonable? |

### media — Drift when pipeline or reporters change.

| Doc | What to verify |
|-----|---------------|
| `docs/EDITION_PIPELINE.md` | Terminal count, step count, reporter list, civic voice list match current skill files? Inputs table current? |
| `docs/media/AGENT_NEWSROOM.md` | Reporter count, names, desk assignments match `.claude/agents/` directories? |
| `docs/media/DESK_PACKET_PIPELINE.md` | Pipeline stages match `buildDeskFolders.js` and `buildDeskPackets.js`? |
| `docs/media/SHOW_FORMATS.md` | Podcast formats match `/podcast` skill? Host assignments current? |
| `output/DISK_MAP.md` | Directory structure matches actual `output/` layout? Naming conventions match scripts? |

### infra — Drift when services change.

| Doc | What to verify |
|-----|---------------|
| `docs/OPERATIONS.md` | PM2 processes match `pm2 list`? Cron jobs match `crontab -l`? Mobile access instructions current? |
| `docs/STACK.md` | All components exist? Versions current? Process names match? Endpoint/skill/agent counts match? |
| `docs/DASHBOARD.md` | Endpoint count matches actual `server/*.js` routes? Frontend tabs current? |
| `docs/DISCORD.md` | Bot name, model, knowledge sources, Supermemory integration current? |
| `docs/SUPERMEMORY.md` | 6 containers listed? Isolation rules match config? Access matrix current? Skills table matches actual commands? |
| `docs/CLAUDE-MEM.md` | Bun daemon (NOT PM2)? Port 37777? SQLite + Chroma still the stack? AutoDream config matches `/root/.claude-mem/settings.json`? |

### data — Drift when sheets change.

| Doc | What to verify |
|-----|---------------|
| `docs/SIMULATION_LEDGER.md` | Citizen count, column count (46), column numbers match live sheet? ClockMode counts current? |
| `docs/SPREADSHEET.md` | Tab count matches actual spreadsheet? New/deleted tabs since last audit? |
| `docs/engine/LEDGER_HEAT_MAP.md` | Bloat rankings still accurate? Dead column inventory current? |
| `docs/engine/LEDGER_REPAIR.md` | Column reference (A-AT) still accurate? Recovery history complete? |
| `docs/engine/LEDGER_AUDIT.md` | Audit history complete? No stale tracking entries? |

---

## Audit Tracker

Update this after each audit. `/doc-audit` with no argument picks the oldest.

| Group | Last Audited | Session | Notes |
|-------|-------------|---------|-------|
| boot | — | — | Never audited as group |
| engine | — | — | Never audited as group |
| media | — | — | Never audited as group |
| infra | — | — | Never audited as group |
| data | — | — | Never audited as group |

---

## How to Audit

### Step 1: Verify claims against reality

For each doc, extract every **verifiable claim** and check it:

- **File counts** → `find` / `ls` / `wc -l`
- **Script references** → verify the script exists
- **API endpoint counts** → grep route definitions in server code
- **Column numbers** → compare against live sheet or schema
- **Process names** → `pm2 list`
- **Container names** → check Supermemory config
- **Tab counts** → SHEETS_MANIFEST or sheets API
- **Line counts** → `wc -l` (boot group especially)

### Step 2: Cross-doc consistency

Check that docs in the group agree with docs they reference:

- ENGINE_MAP function list = godWorldEngine2.js actual call order
- DOCUMENTATION_LEDGER one-place rule = where content actually lives
- EDITION_PIPELINE reporter list = `.claude/agents/` actual directories
- SUPERMEMORY container rules = MEMORY.md container rules
- SESSION_CONTEXT session count = PERSISTENCE session counter

### Step 3: Detect staleness

Flag docs that reference:
- Session numbers more than 10 sessions old without updates
- "Not started" items that ARE started
- "DONE" items that were reverted or broken
- Dates more than 30 days old in "last updated" fields
- Scripts, files, or directories that no longer exist
- Counts that don't match reality (endpoints, containers, tabs, citizens)

### Step 4: Update tracker

After the audit, update the tracker table in this file with the date, session, and any notes.

---

## Output Format

```
DOC AUDIT — [group] — [date]
================================================

STALE (needs update):
1. [doc] — [what's wrong] — [what's true now]

INCONSISTENT (docs disagree):
2. [doc1] says X, [doc2] says Y — [which is correct]

DEAD REFERENCES (doc points to something that doesn't exist):
3. [doc] references [path/script/tab] — doesn't exist

================================================
Docs audited: N
Stale: N | Inconsistent: N | Dead refs: N
Next group due: [group name]
```

## When to Run

- `/doc-audit boot` — after any session that changes boot files
- `/doc-audit engine` — after engine code changes or deploys
- `/doc-audit media` — after edition pipeline changes
- `/doc-audit infra` — after service/infrastructure changes
- `/doc-audit data` — after sheet structure changes or ledger maintenance
- `/doc-audit` — every 5 sessions, rotates to oldest group
