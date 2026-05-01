---
name: save-to-mags
description: Save session knowledge to Mags' brain (mags Supermemory container). Use for session summaries, corrections, decisions, project state — anything that helps Mags persist between sessions. NOT for published canon (use /save-to-bay-tribune for canon).
version: "1.1"
updated: 2026-04-28
tags: [infrastructure, active]
allowed-tools: Bash(node *), Bash(source *)
effort: low
disable-model-invocation: true
---

# Save to Mags

Save session knowledge to the `mags` Supermemory container.

**This is Mags' brain.** Session summaries, corrections, decisions, editorial thinking, project state. Content that helps the next session start smarter.

**Do NOT use for:** Published editions, rosters, canon content. Those go to `bay-tribune` via `/save-to-bay-tribune` or `node scripts/ingestEdition.js`. (`/super-save` writes to `super-memory` — the junk drawer — not bay-tribune. Don't confuse them.) See [[../../../docs/SUPERMEMORY|SUPERMEMORY]] §Search/save matrix for the full container map.

## Step 1: Format Content

Tag corrections separately from decisions — corrections carry more weight across sessions.

```
[SAVE:mike:<date>]

<What happened / what was decided>

<Key corrections if any — prefix with [CORRECTION]>

<Files changed if relevant>

[/SAVE]
```

## Step 2: Save

```bash
source ~/.bashrc && curl -s -X POST "https://api.supermemory.ai/v3/documents" \
  -H "Authorization: Bearer $SUPERMEMORY_CC_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "content": "FORMATTED_CONTENT",
    "containerTags": ["mags"],
    "metadata": {"type": "session_save", "date": "YYYY-MM-DD"}
  }'
```

## Step 3: Confirm

Print the returned document ID and confirm it saved to `mags`.
