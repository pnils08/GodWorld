---
name: media-generator
description: Generate Tribune/Echo media from cycle context using Claude
triggers:
  - manual
  - after:godworld-sync
---

## Purpose

Generates media content (Tribune Pulse, Echo Op-Ed, Council Watch) from synced cycle data using Claude API with multi-agent voice routing.

## Routing Logic

| Condition | Agent(s) |
|-----------|----------|
| `conflictsDetected` | Continuity only |
| `chaosEvents >= 2` | Tribune + Echo + Continuity |
| `civicEvents >= 1` | Tribune + Continuity |
| Default (routine) | Tribune only |

## Voice Profiles

### Tribune (Balanced)
- Tone: Professional, factual, balanced
- Structure: Inverted pyramid, quotes, context
- Sources: Official data, ledgers

### Echo (Edgy)
- Tone: Skeptical, community-focused
- Structure: Opinion-forward, provocative
- Sources: Street-level, citizen reactions

### Continuity (Checker)
- Role: Verify names, timeline, arc consistency
- Output: Corrections before publish

## Required Config

```json
{
  "anthropic": {
    "apiKey": "sk-ant-..."
  },
  "godworld": {
    "dbPath": "./godworld/godworld.db",
    "mediaOutputPath": "./media"
  }
}
```

## Confidence Gate

Publish only if:
```
continuity_score >= 0.9 AND risk_score <= 0.4
```

Otherwise: save as draft for human review.

## Outputs

- `media/cycle-XX/tribune-pulse.md`
- `media/cycle-XX/echo-oped.md` (if high-tension)
- `media/cycle-XX/council-watch.md` (if civic votes)
- Updates `media_outputs` table with quality scores
