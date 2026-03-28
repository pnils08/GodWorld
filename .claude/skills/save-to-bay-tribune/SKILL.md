---
name: save-to-bay-tribune
description: Save published canon to the bay-tribune Supermemory container. Editions, supplementals, rosters, game results ONLY. Never session work, engine internals, or system content.
disable-model-invocation: true
---

# Save to Bay-Tribune

Save published world canon to the `bay-tribune` Supermemory container.

**This is THE WORLD.** Published editions, supplementals, rosters, game results. Content that agents read at boot and treat as real. If it goes here, it becomes canon.

**Do NOT use for:** Session work, bug notes, architecture decisions, engine internals, anything that reveals the simulation is a simulation. Those go to `mags` via `/save-to-mags`. Agents read bay-tribune — contamination breaks the fourth wall.

## Step 1: Verify Content is Canon

Before saving, confirm:
- [ ] This is a published edition, supplemental, roster update, or game result
- [ ] No engine language (ctx, phase, simulation, script, deploy)
- [ ] No builder/user references (Mike, the user, the maker)
- [ ] No session work (bug fixes, architecture notes, code decisions)

If ANY check fails, use `/save-to-mags` instead.

## Step 2: Format Content

```
[CANON:<type>:<date>]

<Content — edition text, roster data, game results, etc.>

[/CANON]
```

Types: `edition`, `supplemental`, `roster`, `game-result`, `canon-correction`

## Step 3: Save

```bash
source ~/.bashrc && curl -s -X POST "https://api.supermemory.ai/v3/documents" \
  -H "Authorization: Bearer $SUPERMEMORY_CC_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "content": "FORMATTED_CONTENT",
    "containerTags": ["bay-tribune"],
    "metadata": {"type": "TYPE", "date": "YYYY-MM-DD"}
  }'
```

## Step 4: Confirm

Print the returned document ID and confirm it saved to `bay-tribune`.
