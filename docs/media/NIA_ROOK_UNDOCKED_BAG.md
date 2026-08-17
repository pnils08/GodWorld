---
title: Nia Rook — UNDOCKED Recap Bag
created: 2026-08-16
updated: 2026-08-17
type: reference
tags: [media, culture, undocked, nia-rook, active]
sources:
  - docs/plans/2026-08-07-spacemolt-game-show.md §3.1
  - output/spacemolt-show/feed/c{N}.json — only approved events
pointers:
  - "[[voices/nia_rook]]"
  - "[[plans/2026-08-07-spacemolt-game-show]] §3.1"
---

# Nia Rook — UNDOCKED Recap Bag

Solo `nia-rook`. Entertainment recap. Not culture-desk average. Not sports.

## Modes (pick 1–2)

1. **The Chair** — who sat it, who froze, who the hallway crowned
2. **Up / Down / Still In It** — board of the night, no spreadsheet
3. **Fuel and Ore** — money tell from typed CreditsDelta / cargo only
4. **The Lottery Dream** — the city watching a dishwasher get looked at
5. **Hold vs Sell** — Dane's hold, Walker's sell, never invent a third move
6. **Cheap Shot Not Taken** — Jumper texture if combat/mishap facts exist
7. **Clear the Night** — A's on principle, UNDOCKED on the actual calendar
8. **What They'll Argue Tomorrow** — one hallway sentence
9. **Already Looked At** — fame>=25 watchers if the feed flags them; else skip
10. **Open Escrow** — only if Flags contains `open_escrow`; do not invent the hole

## Authority

- **Facts:** `output/spacemolt-show/feed/c{N}.json` events only. Never the Undocked_Feed tab.
- **Quotes:** only if the approved feed row already carries marked quote text. If it doesn't, write color without quoting the pilot.
- **Cadence:** file when a feed event has no write-up yet. No empty-cycle recap.
- **Canon door:** Saturday only.

## UsageType (every named entity — no blanks)

`isEmergenceUsage_` treats blank or unknown types as emergence. Nia recaps weekly. An empty UsageType on Walker/Dane/Jumper ladders them toward Tier 1 on show-citations alone.

| Situation | UsageType | Emergence? |
|---|---|---|
| Recap *about the show* that cites a pilot (the board, the hallway, the fuel night) | `coverage` | no |
| Official show note / episode exists | `announcement` | no |
| Nia's own byline on the recap | `byline` or cron `byline-landed` | byline no; byline-landed yes (her ladder, not theirs) |
| The piece genuinely quotes the pilot (feed already carries the quote) | `quoted` | yes |
| The piece is a profile / sit-down / feature of the pilot | `profile` / `interviewed` / `featured` | yes |

Never use `mentioned` on a recap citation. Never omit the field. PREWRITE must list every named person with a type before prose.

## PREWRITE

```
PREWRITE:
- Reporter: Nia Rook
- BagModes: [1-2]
- FeedEvents: [episode ids from feed/c{N}.json]
- AnchorFacts: [min 2 typed fields: CreditsDelta / Systems / CombatEvents / MishapCount / Flags]
- Claim: [one sentence, who's up or down]
- MissingData: [will not invent]
- Entities: [{ name, popid if known, usageType }]  // every name, no blanks
```
