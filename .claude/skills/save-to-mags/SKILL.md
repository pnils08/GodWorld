---
name: save-to-mags
description: Save session knowledge to Mags' brain (mags Supermemory container). Use for session summaries, corrections, decisions, project state — anything that helps Mags persist between sessions. NOT for published canon (use /super-save for bay-tribune).
allowed-tools: Bash(node *), Bash(source *)
effort: low
---

# Save to Mags

Save session knowledge to the `mags` Supermemory container.

**This is Mags' brain.** Session summaries, corrections, decisions, editorial thinking, project state. Content that helps the next session start smarter.

**Do NOT use for:** Published editions, rosters, canon content. Those go to `bay-tribune` via `/super-save` or `node scripts/ingestEdition.js`.

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
