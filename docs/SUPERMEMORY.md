# Supermemory — How Mags Remembers

**Org:** P N ($9/mo, pnils08@gmail.com) | **Console:** console.supermemory.ai
**API base:** `https://api.supermemory.ai` | **Key:** `SUPERMEMORY_CC_API_KEY` in `.env` AND `.bashrc`

Legacy GodWorld org ($19/mo) is dead — 57k junk memories. Old API key (`sm_atk5...`) hits that org. Current key (`sm_AUt...`) hits PN. PM2 processes cache env at startup — always restart with `--update-env` after key changes.

---

## The Four Containers

### `mags` — The Brain

Mags' persistent memory. This is how she doesn't relearn the project every session.

**What goes in:** Session summaries, editorial decisions, project state, what's broken, architecture knowledge, family moments, conversations, everything Mags needs to carry forward.

**What does NOT go in:** Raw tool output, grep results, git status, temporary debugging. The old org had 57k junk memories from auto-capture — that's why PostToolUse hook is disabled.

**Who reads:** Mags at session boot (automatic), Discord bot on every message, Moltbook heartbeat.
**Who writes:** Session end (automatic), Discord bot, Moltbook.
**Plugin role:** `personalContainerTag` in config.

**How to use:** Search `mags` before acting when you need context from past sessions. Don't guess — search.

---

### `bay-tribune` — The Canon

The published world. Oakland's living history through journalism.

**What goes in:** Published editions, supplementals, rosters, coverage archive. Content that makes sense from inside the world — what a reporter would search in their own newspaper's archive.

**What does NOT go in:** Architecture docs, engine bugs, session work, code decisions, anything that reveals the simulation is a simulation. Agents and the Discord bot read this container. If it contains "editionIntake.js is broken" or "GodWorld is a city simulation engine," the fourth wall breaks.

**Who reads:** Mags at session boot (automatic), Discord bot (searches both `mags` + `bay-tribune`).
**Who writes:** Edition ingest script (`node scripts/ingestEdition.js`), reference file pushes.
**Plugin role:** `repoContainerTag` in config.

**How to use:** Search `bay-tribune` when you need current context about Oakland — what's been published about OARI, who was quoted in Fruitvale, what the A's roster looks like. Semantic search works: query "OARI dispatch" and get back all relevant chunks across editions.

**Contents (last audited S113, duplicates cleaned):**

| Content | Count | Description |
|---------|-------|-------------|
| Editions E83-E89 | ~14 docs | 7 Cycle Pulse editions (chunked by Supermemory) |
| Supplementals C83-C88 | ~10 docs | Fruitvale, tech landscape, housing, food scene, Baylight labor, education |
| Oakland A's Roster | 1 doc | 89 players — POPID, name, position, team, tier |

**Ingest after each edition:** `node scripts/ingestEdition.js <edition-file>`

---

### `super-memory` — General Purpose

**What goes in:** Anything that doesn't fit the other three containers. Codebase indexes (`/claude-supermemory:index`), general knowledge saves, experimental content. Safe dumping ground — not agent-facing, not canon, not personal.

**Who reads:** Nobody automatically. Search manually when needed.
**Who writes:** Reserved for future use — codebase indexing, general plugin saves.
**Plugin role:** None (not in config). Access via direct API only.

**Created S120.** Currently holds only the seed document. Available if we ever need to separate general indexed content from Mags' brain.

---

### `mara` — Mara's Private Container

**Who reads:** Mara only (claude.ai via her Supermemory MCP connection)
**Who writes:** Mara (claude.ai), one-time reference file pushes from Claude Code
**Purpose:** Persistent reference data for edition audits. Mara's knowledge sits above the simulation — she knows it's a simulation. Her container is hers.

**Isolation:** NOT in the Claude Code plugin config. The plugin only sees `mags` and `bay-tribune`. Mags cannot read or write `mara`. Only direct API calls or Mara's own MCP connection touch this container.

**Contents:**

| Document | Records | Description |
|----------|---------|-------------|
| Citizen Roster | 509 | ENGINE-mode citizens — POPID, name, age, neighborhood, role, tier, status |
| Tribune Staff | 29 | Bay Tribune journalists — POPID, name, role, tier |
| Chicago Citizens | 123 | Bulls players + city figures |
| Business Registry | 51 | BIZ_ID, name, sector, neighborhood, employees |
| Faith Organizations | 16 | Name, tradition, neighborhood, leader, POPID |

**Refresh:** `node scripts/buildMaraReference.js` after major ledger changes, then push via direct API.

---

## How It Works in Practice

### Session Boot (automatic)
The plugin calls `/v4/profile` for both `mags` and `bay-tribune`. Returns static facts + recent dynamic memories. Injected into context before the first message.

### During a Session
- **Need past context?** Search `mags`: "What happened with the ledger recovery?" "What did we decide about citizen routing?"
- **Need world context?** Search `bay-tribune`: "What has Carmen written about OARI?" "Who lives in Fruitvale?"
- **Don't guess. Search.**

### Session End (automatic)
The Stop hook saves a session summary to `mags`. This is what the next session's boot profile pulls from.

### After Publishing an Edition
Run `node scripts/ingestEdition.js <edition-file>` to add the edition to `bay-tribune`. This is what makes the archive searchable.

---

## Plugin Config

File: `.claude/.supermemory-claude/config.json` (gitignored)

```json
{
  "personalContainerTag": "mags",
  "repoContainerTag": "mags"
}
```

Both point to `mags`. This means `/super-save` and `/super-search` both hit `mags` by default. Use `/save-to-bay-tribune` for canon saves.

### Hooks

| Hook | When | Container |
|------|------|-----------|
| **SessionStart** | Every boot | Reads `mags` + `bay-tribune` profiles |
| **Stop** | Session end | Writes summary to `mags` |
| **PostToolUse** | DISABLED | Was auto-capturing junk. Off since S103. |

### Skills

| Command | What it does | Container |
|---------|-------------|-----------|
| `/super-search --user "query"` | Search personal memory | `mags` |
| `/super-search --repo "query"` | Search repo memory | `mags` (repoContainerTag = mags) |
| `/super-search --both "query"` | Search both | `mags` + `mags` (same currently) |
| `/super-save "content"` | Save to repo memory | `mags` (repoContainerTag = mags) |
| `/save-to-mags "content"` | Save session work to Mags' brain | `mags` |
| `/save-to-bay-tribune "content"` | Save published canon — editions, rosters, game results ONLY | `bay-tribune` |

---

## API Quick Reference

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/v4/profile` | POST | Boot profile (static + dynamic) for a container |
| `/v4/search` | POST | Hybrid search within a container |
| `/v3/documents` | POST | Add a document to a container |
| `/v3/search` | POST | Document search with chunk content |
| `/v3/documents/list` | POST | List all items (page-based). containerTag filter IGNORED server-side — filter client-side. |
| `/v3/documents/:id` | GET | Get single document |
| `/v3/documents/:id` | DELETE | Delete single document |
| `/v3/container-tags/merge` | POST | Merge containers (admin only) |

**Content limits:** 100,000 chars per document. Metadata: 50 keys, 1,024 chars per value.

**Scoped API keys:** Can create keys locked to one container. Useful for preventing cross-contamination at the API level. Create at console.supermemory.ai.

---

## Access Matrix

| Container | Claude Code plugin | Discord bot | Moltbook | Mara (claude.ai) |
|-----------|-------------------|-------------|----------|-------------------|
| `mags` | Read + Write | Read + Write | Read + Write | No access |
| `bay-tribune` | Read (boot) + Write (via `/save-to-bay-tribune`) | Read | No access | No access |
| `super-memory` | No access (direct API only) | No access | No access | No access |
| `mara` | **No access** | No access | No access | Read + Write |

---

## Config Files

| File | Purpose |
|------|---------|
| `.claude/.supermemory-claude/config.json` | Plugin container mapping (gitignored) |
| `credentials/supermemory-pn-key.txt` | PN org API key backup |
| `~/.bashrc` | Shell env export — what PM2 and scripts read. Must `--update-env` on restart. |
| `.env` | Dotenv for Node scripts |

---

## Reference File Generation

**Script:** `scripts/buildMaraReference.js`
**Output:** `output/mara-reference/`

| File | Source Tab | Container | Records |
|------|-----------|-----------|---------|
| `citizen_roster.txt` | Simulation_Ledger (ENGINE) | `mara` | 509 |
| `as_roster.txt` | As_Roster | `bay-tribune` | 89 |
| `tribune_roster.txt` | Bay_Tribune_Oakland | `mara` | 29 |
| `chicago_roster.txt` | Chicago_Citizens | `mara` | 123 |
| `business_registry.txt` | Business_Ledger | `mara` | 51 |
| `faith_registry.txt` | Faith_Organizations | `mara` | 16 |

---

## Web Interfaces

| URL | Purpose |
|-----|---------|
| **console.supermemory.ai** | Admin — org management, billing, API keys, scoped key creation |
| **app.supermemory.ai** | Browse container contents, verify saves, delete bad entries |
