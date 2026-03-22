# Discord Bot — Mags Corliss Presence

**Script:** `scripts/mags-discord-bot.js` v2.10.0
**PM2:** `mags-discord-bot` (always running)
**Channel:** `#mags-morning` (ID: `1471615721003028512`)
**Model:** Haiku 4.5 (switched S80 from Sonnet for cost)
**Token:** `DISCORD_BOT_TOKEN` in `.env`

---

## What the Bot Does

Mags lives in the Discord channel as a conversational presence. She's not a command bot — she chats. About the city, the newsroom, family, baseball, whatever comes up. These conversations are canon — they feed into the brain and become part of what Mags knows.

**Response rules:**
- 1-3 short paragraphs
- Has opinions, uses them
- Never fabricates knowledge — says "I don't have that in front of me" instead
- `[NOTE_TO_SELF: ...]` tags in responses get saved to NOTES_TO_SELF.md and stripped before sending

---

## Knowledge Sources (per message)

### Local Files (zero cost, zero latency)
All loaded from disk via `lib/mags.js`:

| Source | Function | What it provides |
|--------|----------|-----------------|
| Identity | `loadIdentity()` | PERSISTENCE.md — who Mags is |
| Journal | `loadJournalTail(2)` | Last 2 journal entries |
| World state | `loadWorldState()` | A's roster, civic status, pending votes, recent outcomes |
| Citizen knowledge | `loadCitizenKnowledge()` | Top citizens by media references, council, cultural figures, reporters |
| Archive knowledge | `loadArchiveKnowledge()` | Historical context from canon archive |
| Edition brief | `loadEditionBrief()` | What just published |
| Notes to self | `loadNotesToSelf(10)` | Editorial flags, story tracking |
| Conversation digest | `loadTodayConversationDigest()` | Today's rolling conversation (80 char previews) |

**System prompt:** ~18K chars, rebuilt hourly.

### Supermemory (per-message RAG)

| Operation | Endpoint | Container | Purpose |
|-----------|----------|-----------|---------|
| **Search** | `POST /v3/search` | `mags` + `bay-tribune` | Find relevant memories for the current message. 5 results, 8s timeout. |
| **User profile** | `POST /v4/profile` | `mags` | Static + dynamic facts about Mike. 2s timeout. |
| **Save exchange** | `POST /v3/documents` | `mags` only | Every conversation exchange saved for profile building. |

**Container access:**
- Reads: `mags` (identity/conversations) + `bay-tribune` (canon/roster data) — updated S109
- Writes: `mags` only (conversation exchanges)
- `mara`: NO ACCESS — never searched, never written to

---

## Cron Jobs

| Job | Schedule | Script | Purpose |
|-----|----------|--------|---------|
| Nightly reflection | 4:00 UTC (11 PM CDT) | `scripts/discord-reflection.js` | Reads day's conversations, writes a journal reflection to JOURNAL_RECENT.md |
| Morning heartbeat | **DISABLED** (commented out) | `scripts/daily-reflection.js` | Was 8 AM morning reflection — currently not running |

---

## Conversation Data

| File | Purpose |
|------|---------|
| `logs/discord-conversation-history.json` | Rolling conversation state (reset at edition publish) |
| `logs/discord-conversations/YYYY-MM-DD.json` | Daily conversation archives (31 files, ~1.4MB) |
| `logs/mags-discord-out.log` | Bot stdout (PM2 managed, logrotated) |
| `logs/mags-discord-error.log` | Bot stderr — Supermemory timeouts show up here |

---

## How It Connects to the Memory Architecture

```
Mike on Discord
      │
      ▼
  Discord Bot (Haiku)
      │
      ├── Reads local files (identity, journal, world state, citizens)
      ├── Searches mags + bay-tribune containers (RAG layer)
      ├── Generates response as Mags
      ├── Saves exchange to mags container (brain feed)
      └── Nightly reflection → journal entry (autonomous memory)
```

Discord conversations are the primary way the `mags` brain accumulates organic knowledge between Claude Code sessions. Every exchange — about baseball, about the city, about what Mike had for dinner — becomes searchable context for future sessions.

---

## Moltbook Heartbeat

**Script:** `scripts/moltbook-heartbeat.js`
**PM2:** `moltbook` (cron mode — fires every 4 hours, shows "stopped" between runs)
**Profile:** `moltbook.com/u/mags-corliss` (20 karma, 84 comments)

**What it does:** Reads Moltbook feed, upvotes relevant posts, occasionally replies or posts. Saves activity summary to `mags` Supermemory container.

**Current issue:** Repeated 404 errors on a stale post ID (`67ad3cbb-...`). The heartbeat continues working — it just warns on that one dead post every cycle. Non-critical.

---

## Configuration

| Setting | Value | Notes |
|---------|-------|-------|
| `MAX_HISTORY` | 40 | Rolling message pairs in context |
| `COOLDOWN_MS` | 3000 | Per-user cooldown between messages |
| `MAX_RESPONSE_TOKENS` | 1000 | Response length cap |
| `IDENTITY_REFRESH_MS` | 1 hour | How often system prompt rebuilds |
| Supermemory search timeout | 8s | Graceful fallback on timeout |
| User profile timeout | 2s | Graceful fallback on timeout |
