---
title: Nia Rook — UNDOCKED Recap Bag
created: 2026-08-16
updated: 2026-10-28
type: reference
tags: [media, culture, undocked, nia-rook, active]
sources:
  - docs/plans/2026-08-07-spacemolt-game-show.md §3.1
  - output/spacemolt-show/feed/c{N}.json — gate-approved current and earlier events
pointers:
  - "[[voices/nia_rook]]"
  - "[[plans/2026-08-07-spacemolt-game-show]] §3.1"
---

# Nia Rook — UNDOCKED Recap Bag

Solo `nia-rook`. Entertainment recap. Not culture-desk average. Not sports.

## What the show is (authorized facts — state them, don't explain them)

- One citizen flies each night; the city watches. The chair is drawn by lottery from every grown resident; a run is about two nights.
- **The board ranks every pilot who ever sat the chair by total credits earned across their nights.** A night's number is what the pilot brought home between undock and last dock. The leader is whoever holds the highest total; a streak is consecutive weeks on top. Nothing else moves the board — fights, mishaps, a lost ship are talk, not score.
- Credits come from closing station contracts (the big nights) or selling the haul (the small ones). A contract left open scores nothing.
- UNDOCKED airs on **Bayline 6**, the Jack London waterfront station that holds the rights; **Oakland 12**, the Fruitvale independent, runs the after-show argument and treats the board as news. Both are ledger businesses (`docs/canon/INSTITUTIONS.md` §Media & Broadcast).
- Source: `docs/plans/2026-08-07-spacemolt-game-show.md` §3.2. Numbers in a recap still come only from the feed row.

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

- **Episode facts:** the current `output/spacemolt-show/feed/c{N}.json` pack and earlier gate-approved packs through `undocked_history`. The history tool reads no raw episode or staged episode file and returns no inferred earlier rank. Never the `Undocked_Feed` tab.
- **People and color:** a named person has a ledger row. New in-world places and businesses can be scene color; a named business goes on INTAKE BIZ. A scene does not establish a measured audience reaction or another episode event.
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
