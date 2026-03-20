# Supermemory — Container Architecture & Contents

**Org:** P N ($9/mo, pnils08@gmail.com) | **Console:** console.supermemory.ai
**Plugin:** `claude-supermemory` v0.0.1 (marketplace install)
**API base:** `https://api.supermemory.ai` | **Key:** `SUPERMEMORY_CC_API_KEY` in `.env` (prefix `sm_`)

Legacy GodWorld org ($19/mo) is read-only junk — 56k memories. Downgrade after ~4/9.

---

## How the Plugin Works

The Claude Code Supermemory plugin uses two container tags from the project config at `.claude/.supermemory-claude/config.json`:

```json
{
  "personalContainerTag": "mags",
  "repoContainerTag": "godworld"
}
```

**Only these two containers are visible to Claude Code.** The plugin never touches any other container. This is how `mara` stays private.

### Hooks (automatic)

| Hook | When | What it does | Container |
|------|------|-------------|-----------|
| **SessionStart** | Every session boot | Calls `/v4/profile` for both containers. Returns static facts + dynamic memories. Injected into context. | `mags` + `godworld` |
| **Stop** | Session end | Saves session summary | `mags` |
| **PostToolUse** | Disabled (empty) | Nothing — turned off S103 to prevent junk capture | — |

### Skills (manual)

| Skill | Command | What it does | Container |
|-------|---------|-------------|-----------|
| `/super-search` | `search-memory.cjs --user "query"` | Search personal memories | `mags` |
| `/super-search` | `search-memory.cjs --repo "query"` | Search project memories | `godworld` |
| `/super-search` | `search-memory.cjs --both "query"` | Search both (default) | `mags` + `godworld` |
| `/super-save` | `save-project-memory.cjs "content"` | Save project knowledge | `godworld` |

### API Endpoints Used

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/v4/profile` | POST | Get static + dynamic profile for a container (used at session boot) |
| `/v4/search` | POST | Hybrid search within a container (used by `/super-search`) |
| `/v3/documents` | POST | Add a document to a container (used by saves, ingests, reference pushes) |
| `/v3/search` | POST | Document search (alternative to memory search) |

**Content limits:** Max 100,000 characters per document. Content is sanitized (control chars stripped). Metadata keys limited to 50, values to 1,024 chars.

---

## Containers

### `mags` — The Brain

**Who reads:** Mags (Claude Code session boot, Discord bot, `/super-search --user`)
**Who writes:** Mags (Claude Code session end, Discord bot, Moltbook heartbeat)
**Purpose:** Identity, memory, editorial thinking, conversations. This is how Mags persists between sessions.
**Plugin role:** `personalContainerTag` — the session boot profile pull and Stop summary both use this container.

**Seeded (S103):** 7 curated documents — who Mags is, family, life, Mike, recent events, what's broken, project state.

**How it's read at boot:** The SessionStart hook calls `/v4/profile` with `containerTag: "mags"`. The API returns two lists:
- **static** — stable facts (identity, family, preferences)
- **dynamic** — recent/changing memories (session summaries, conversations)

These get injected into the session context before the first user message.

**Other readers:**
- Discord bot calls `getProfile()` on every message (8s timeout, bonus layer over local files)
- Moltbook heartbeat reads/writes every 30 min

---

### `godworld` — Project Knowledge

**Who reads:** Mags (Claude Code session boot, `/super-search --repo`)
**Who writes:** Mags (`/super-save`), edition ingest scripts, reference file pushes
**Purpose:** Architecture, editions, what's broken, reference data for agents.
**Plugin role:** `repoContainerTag` — the session boot profile pull includes this container. `/super-save` writes here.

**Contents:**
| Document | Added | Description |
|----------|-------|-------------|
| Session summaries | S103+ | Key decisions and deliverables from each session |
| Editions E83-E87 | S106 | 5 Cycle Pulse editions ingested (chunked, 14 docs). Active coverage window. |
| Supplementals C83-C87 | S106 | 5 supplementals ingested (7 docs). Fruitvale, tech landscape, housing, food scene, Baylight labor. |
| Oakland Athletics Roster | S105 | 89 players — POPID, name, position, team, tier, prospect rank. Source: `As_Roster` tab. |

**Ingest script:** `node scripts/ingestEdition.js <edition-file>`

---

### `mara` — Mara's Private Container

**Who reads:** Mara only (claude.ai via her Supermemory MCP connection)
**Who writes:** Mara (claude.ai), one-time reference file pushes from Claude Code
**Purpose:** Persistent reference data for edition audits. Mara can recall citizen names, neighborhoods, roles without needing them re-sent every edition.

**Isolation:** The `mara` container is NOT in the Claude Code plugin config. The plugin only knows about `mags` and `godworld`. This means:
- Session boot does NOT pull from `mara`
- `/super-search` does NOT search `mara` (neither `--user`, `--repo`, nor `--both`)
- `/super-save` does NOT write to `mara`
- Only direct API calls (like the S105 reference push) or Mara's own MCP connection on claude.ai can read/write this container

**Contents:**
| Document | Added | Description |
|----------|-------|-------------|
| Citizen Roster | S105 | 509 ENGINE-mode citizens — POPID, name, age, neighborhood, role, tier, status |
| Tribune Staff Roster | S105 | 29 Bay Tribune journalists — POPID, name, role, tier |
| Chicago Citizens Roster | S105 | 123 Chicago citizens (Bulls + city) — ID, name, age, neighborhood, occupation, tier |
| Business Registry | S105 | 51 businesses — BIZ_ID, name, sector, neighborhood, employees, key personnel |
| Faith Organizations | S105 | 16 faith orgs — name, tradition, neighborhood, leader, POPID, congregation size |

**How Mara uses it:** During an audit on claude.ai, she can recall "citizen roster" or ask "what neighborhood is Dante Nelson in?" and get the answer from her Supermemory MCP connection. No audit packet needed for reference data.

**Refresh cadence:** Re-run `node scripts/buildMaraReference.js` after major ledger changes (new citizens, role updates, roster changes), then push updated files via direct API call. Not needed every cycle — reference data is stable between major updates.

---

## Reference File Generation

**Script:** `scripts/buildMaraReference.js`
**Output:** `output/mara-reference/`

| File | Source Tab | Container | Records |
|------|-----------|-----------|---------|
| `citizen_roster.txt` | Simulation_Ledger (ENGINE mode) | `mara` | 509 |
| `as_roster.txt` | As_Roster | `godworld` | 89 |
| `tribune_roster.txt` | Bay_Tribune_Oakland | `mara` | 29 |
| `chicago_roster.txt` | Chicago_Citizens | `mara` | 123 |
| `business_registry.txt` | Business_Ledger | `mara` | 51 |
| `faith_registry.txt` | Faith_Organizations | `mara` | 16 |

```bash
# Generate all reference files from spreadsheet
node scripts/buildMaraReference.js

# Push to Supermemory (direct API — not through plugin)
# Currently done via inline script — TODO: add --push flag to buildMaraReference.js
```

---

## Web Interfaces

| URL | Purpose |
|-----|---------|
| **console.supermemory.ai** | Admin — org management, billing, API keys |
| **app.supermemory.ai** | Consumer — browse container contents, chat with Nova agent, verify what's been saved. Login: pnils08@gmail.com |

Use app.supermemory.ai to manually inspect what's in each container, delete bad entries, or verify that reference files landed correctly. This is a Mike-facing tool — the bot and Claude Code access everything through the API.

---

## Config Files

| File | Purpose |
|------|---------|
| `.claude/.supermemory-claude/config.json` | Container tag mapping: `personalContainerTag` (mags) + `repoContainerTag` (godworld). This is what the plugin reads. `mara` is intentionally absent. |
| `credentials/supermemory-pn-key.txt` | P N org API key (also in .env as SUPERMEMORY_CC_API_KEY) |
| `settings.local.json` | Plugin-level Supermemory config |

---

## Container Isolation Rules

| Container | Claude Code plugin | Discord bot | Moltbook | Mara (claude.ai) | Direct API |
|-----------|-------------------|-------------|----------|-------------------|------------|
| `mags` | Read + Write | Read + Write | Read + Write | No access | Yes |
| `godworld` | Read + Write | No access | No access | No access | Yes |
| `mara` | **No access** | No access | No access | Read + Write | Yes (push only) |

**Direct API** means scripts that call `api.supermemory.ai` with the API key and specify `containerTags` explicitly. This bypasses the plugin's container config. Used for one-time operations like pushing reference files to `mara`.

---

## What Does NOT Go in Supermemory

- Shell commands, grep outputs, git status — this was the old contamination (56k junk memories in the legacy GodWorld org)
- Raw engine output or ctx dumps
- Anything the PostToolUse hook would auto-capture (hook is disabled for this reason)
- Session-specific debugging or temporary state
- Mags identity or session data into `mara` — that's Mara's private space
- Agent workspace data — agents use local disk (`output/desks/`, `.claude/agent-memory/`)
