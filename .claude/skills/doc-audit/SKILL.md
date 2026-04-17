---
name: doc-audit
description: Audit architecture and system docs for staleness, inaccuracy, and drift from actual codebase state. Grouped into 5 tiers for thorough coverage.
version: "1.0"
updated: 2026-04-17
tags: [engine, active]
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
| `CLAUDE.md` | Quick commands still work? Session lifecycle refs current? Rules index matches actual rules files? Step 0.5 wiki-layer reference present and pointing to existing files? |
| `docs/mags-corliss/PERSISTENCE.md` | Session counter current? Family POPIDs match ledger? No stale infrastructure refs? |
| `.claude/rules/identity.md` | Rules still match actual behavior? No contradictions with CLAUDE.md? |
| `MEMORY.md` (auto-memory) | Under 200 lines? Dead memory file references? Stale session memories? Population numbers current? |
| `docs/SCHEMA.md` | Folder map matches actual `docs/` layout? Tag taxonomy reflects what's actually in use? Page types still match what we're creating? Frontmatter example valid YAML? |
| `docs/index.md` | Every active `docs/**.md` (excluding `archive/`, `drive-files/`) appears exactly once? No broken `[[wikilinks]]`? Renamed/deleted files reflected? Folder section headers match SCHEMA folder map? |

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
| `docs/media/podcast/SHOW_FORMATS.md` | Podcast formats match `/podcast` skill? Host assignments current? |
| `output/DISK_MAP.md` | Directory structure matches actual `output/` layout? Naming conventions match scripts? |
| `docs/media/story_evaluation.md` | Changelog growing each cycle (expected: one entry per post-publish run). Front page scoring section present. If no new entries in 3+ cycles, post-publish Step 10 isn't running — flag. |
| `docs/media/brief_template.md` | Changelog growing. Structure section intact. Good/bad brief examples present. If stale, flag. |
| `docs/media/citizen_selection.md` | Changelog growing. MCP lookup rule (citizens vs A's players) current. Name collision warning still needed (check if ledger cleanup happened). |
| `docs/engine/REVIEWER_LANE_SCHEMA.md` | Four-field contract (process/outcome/controllable/uncontrollable) still matches what Rhea/cycle-review/Mara/capability actually emit? Four-quadrant interpretation still referenced from PHASE_39_PLAN §17.3? Classification rubric still correct (detectorVersion signals for capability, lane-specific signals documented in each lane's RULES.md)? |

### infra — Drift when services change.

| Doc | What to verify |
|-----|---------------|
| `docs/OPERATIONS.md` | PM2 processes match `pm2 list`? Cron jobs match `crontab -l`? Mobile access instructions current? |
| `docs/STACK.md` | All components exist? Versions current? Process names match? Endpoint/skill/agent counts match? |
| `docs/DASHBOARD.md` | Endpoint count matches actual `server/*.js` routes? Frontend tabs current? |
| `docs/DISCORD.md` | Bot name, model, knowledge sources, Supermemory integration current? |
| `docs/SUPERMEMORY.md` | 6 containers listed? Isolation rules match config? Access matrix current? Skills table matches actual commands? |
| `docs/CLAUDE-MEM.md` | Bun daemon (NOT PM2)? Port 37777? SQLite + Chroma still the stack? AutoDream config matches `/root/.claude-mem/settings.json`? |
| `docs/FOUR_COMPONENT_MAP.md` | Terminal count matches `.claude/terminals/` subdirs? Skill count (§4 harness table) matches `ls .claude/skills/ \| wc -l`? Agent count (§4 note) matches `ls .claude/agents/ \| wc -l`? Models per role current (AutoDream still Gemini? Desk agents still Sonnet?)? Cron inventory (§2) matches `crontab -l`? §7 seam map reflects current Phase 40 status — DONE/PENDING flags match [[engine/PHASE_40_PLAN]] changelog? |

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
| engine | 2026-04-17 | S156 | 5 stale, 2 inconsistent, 0 dead refs. ENGINE_MAP "Last verified S120" (21 days stale — no safeRand_ or Phase 38/39/40 refs). ENGINE_STUB_MAP claims 122 JS files, actual 125 — regenerate via /stub-engine. SHEETS_MANIFEST 57 days stale. PHASE_DATA_AUDIT no freshness header, no Phase 40 coverage. DOC_LEDGER 12 sessions stale BUT deprecated per docs/index.md header (folding into index over time). No dead file refs. |
| media | 2026-04-17 | S156 | AGENT_NEWSROOM patched (agent count 25+ → 27, desk 6 → 7, builder counts current). DISK_MAP Last-Updated bumped + S156 files noted. DESK_PACKET_PIPELINE stays SUPERSEDED (canonical is EDITION_PIPELINE.md). EDITION_PIPELINE.md (S144) terminal/skill map still accurate. **Pipeline-level flag (NOT a doc fix):** story_evaluation.md / brief_template.md / citizen_selection.md changelogs have ZERO `### YYYY-MM-DD` cycle entries — post-publish Step 10 isn't writing to them. Media-terminal problem, not doc-layer. SHOW_FORMATS.md + REVIEWER_LANE_SCHEMA.md headers current, not audited deeply this pass. |
| infra | 2026-04-17 | S156 | 12 stale, 3 inconsistent, 1 dead ref. STACK.md most outdated (S137b header, skill/agent counts 13-behind, `.env` paths missed post-40.3 sweep, droplet name drift, "675 citizens" stale per CLAUDE.md). DISCORD.md + OPERATIONS.md both say "mags-discord-bot" but live PM2 is "mags-bot" (40.3 resolution). Supermemory "6 containers" claim in three docs but every table lists 5. OPERATIONS.md missing spacemolt-miner from PM2 table. FOUR_COMPONENT_MAP.md current. |
| data | 2026-04-17 | S156 | Partial — research-build fixed 2 cross-terminal docs. SIMULATION_LEDGER.md: row/column drift fixed (761 rows, 47 cols A-AU per SCHEMA_HEADERS — doc had 46/AT); last-audited bumped to S156; ClockMode/Tier/Status/Flag sub-counts flagged as stale (S105-S140). SPREADSHEET.md: tab count explained (53 visible + 6 hidden + utility ≈ 65); Simulation_Ledger row 675→761, cols 46→47 (AU Gender); per-tab row counts flagged stale — SCHEMA_HEADERS is authoritative. **Deferred to engine-sheet:** docs/engine/LEDGER_HEAT_MAP.md (extremely stale — C81/S30/2026-02-16, 10+ cycles out of date, projections outdated), docs/engine/LEDGER_REPAIR.md (S94/2026-03-14 RECOVERY COMPLETE — dating language stale but load-bearing "DO NOT re-analyze" intact), docs/engine/LEDGER_AUDIT.md (S68-S72 audit history — 658/639 citizen counts pre-recovery stale). |

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
