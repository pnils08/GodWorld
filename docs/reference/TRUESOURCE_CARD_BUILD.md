---
title: TrueSource card build — one maintained card per player in the canon notebook
created: 2026-10-19
updated: 2026-10-19
type: reference
tags: [media, notebooklm, truesource, sports, active]
sources:
  - Builder rulings 2026-10-11 and 2026-10-16 (pipeline.72) — "1 card that is maintained"
  - Builder 2026-10-19 — hand-deleted duplicates in the notebook, took the wrong card for 17 players; "complete the process MD for how to build these"
  - Rebuild + readback 2026-10-19 (rb) — 17 cards rebuilt from backups, all 17 read back from the notebook
pointers:
  - "[[../engine/ROLLOUT_PLAN]] — pipeline.72, closed 2026-10-19"
  - "[[../plans/2026-10-11-media-extension]] — pipeline.72 sits under the media extension; Marbury and Anthony read the dossier mirror"
  - "[[../index]] — registered same commit"
---

# TrueSource card build

**One card per player in the canon notebook, maintained in place.** A card is the player's FULL STAT TRUE SOURCE page with that season's PLAYER INTAKE page folded in beneath it. Nothing is lost in the join, and no second card for the same player exists.

Notebook: `417e2d29-4167-420f-a9cc-76fb6b2b7de2` (`config/notebooklm.json`). State at close of pipeline.72 (2026-10-19): **28 players, one card each, 146 sources.** The notebook is canon and every source is searchable, so a stray duplicate is read as canon beside the card.

## 1. The two inputs

| Input | Starts with | Holds |
|---|---|---|
| FULL card | `FULL STAT TRUE SOURCE — BATTER` or `— PITCHER` | profile, attributes, by-season stats, career totals, contract, roster status, awards, metadata footer (`TS Code`, `POPID`) |
| Season intake copy | `PLAYER INTAKE (Batter)` or `(Pitcher)` `— 2041 SEASON` | the season line in full, rate metrics, defense/value, contract, quirks, awards |

Both are the builder's data: stats are also held on his Drive. The notebook card is a derived copy, so a card can always be rebuilt from the two inputs.

## 2. The layout (exact)

```
<FULL card text, trailing newlines stripped>

--------------------------------------------------------------------------------   (80 dashes)


SEASON INTAKE — 2041 (folded from the season intake card; one card per player)

<intake copy text, surrounding newlines stripped>
```

Join string between the two halves: `"\n\n" + "-"*80 + "\n\n\n"`, then the header line, then `"\n\n"`. Title of the uploaded file: the FULL card's own title (`fold-plan.json` `title`), e.g. `Henry Rivas — FULL STAT TRUE SOURCE — 2041.txt` or `Hitoki Ka FULL STAT TRUE SOURCE — PITCHER — 2041.txt`. Four older cards carry a `POP-000nn ` prefix (Dillon, Ramos, Saryan, Mesa). Titles are not load-bearing for search; do not rename existing cards to match.

## 3. Where the working files live

`output/notebooklm-card-backup/` (60 files):

| File | What |
|---|---|
| `<id8>.txt` (56) | full text of every retired source, named by the first 8 characters of its notebook id |
| `fold-plan.json` | per card: `name`, `title`, `newId`, `retire` (the two source ids it replaces), `chars` (built length), `copyLinesLost`, `fullLinesLost` |
| `to-delete.json` | the verified retire list, by full id |
| `pair-report.json` | per player: which lines of the FULL card the copy held and the FULL lacked (the reason the copy is appended whole) |

## 4. Build

1. **Back up first.** Save the text of both source cards under `<id8>.txt` before any change. Retired sources are gone for good once deleted.
2. **Identify the halves by content, not title.** The FULL card starts `FULL STAT TRUE SOURCE`; the other does not. The two old titles can be identical to the new card's title.
3. **Build the text** by the layout above.
4. **Check line for line.** Every non-empty stripped line of both inputs must appear in the built text. Check each input on its own; joining them first fuses the last line of one to the first of the next and gives a false miss.
5. **Add** with `source_add` (file, `wait: true`). Write the built text to a file named with the card's title and upload that file.
6. **Read back** with `source_get_content` and confirm both halves are present through the final line of the intake copy. NotebookLM collapses blank lines, so its `char_count` comes back at **0.916 to 0.941 of the built length**. A number outside that band means a truncated or failed processing.
7. **Rename the old FULL card** to `RETIRE — <title>` before anyone deletes by hand. On 2026-10-19 the new card and the old FULL carried the same title, the notebook could not tell them apart, and the hand-delete kept the old one for 17 players.
8. **Retire by id only,** and only on the builder's plain yes. `source_delete` is permanent. Delete the old FULL and the intake copy, never the new card.
9. **Reconcile the count.** Start count, minus retired, plus added, must equal the new `source_count` from `notebook_get`, and each player must show exactly one FULL card.

Rebuild snippet (steps 3 and 4):

```python
SEP = '\n\n' + '-'*80 + '\n\n\n'
HDR = 'SEASON INTAKE — 2041 (folded from the season intake card; one card per player)\n\n'
text = full.rstrip('\n') + SEP + HDR + copy.strip('\n') + '\n'
have = {l.strip() for l in text.splitlines()}
lost = [l.strip() for src in (full, copy) for l in src.splitlines()
        if l.strip() and l.strip() not in have]
assert not lost, lost
```

## 5. What never to do

- **Never judge a source "contained" by matching numbers.** On 2026-10-16 a delete list judged 18 intake copies contained in their FULL cards by number. Each held 21 to 40 lines the FULL lacked (PA, OPS, defense, 2041 WAR, free-agent year). The builder caught it and nothing was deleted. Only the line-for-line check in step 4 counts.
- **Never delete before the replacement is added and read back.**
- **Never delete by title.** Delete by full id.
- **No bulk delete without the builder's plain yes** (identity rule: irreversible bulk loss gets one plain confirmation). The permission classifier refused an unconfirmed bulk delete of this list once.

## 6. Next season and new players (rule applied, not yet exercised)

The ruling is a card that is maintained, so a new season's intake page folds into the same card instead of becoming a new source. Before the 2042 intake lands, check with the builder how the old SEASON INTAKE section is handled: the FULL card's by-season table already carries each past season's line, but only the line-for-line check says whether anything in the old intake section would be lost. A new player gets one card from the start, built by the same layout. The 2040 history sources (about 11, titles `POP-000nn_<Name>_2040.txt`) are a later pass under this same procedure.

## 7. What this doc does not cover

- `output/player_truesource_mirror.json` (29 cards, what `dossier_read` serves Marbury and Anthony) is a separate artifact and is not rebuilt by this procedure.
- Supermemory `wd-player-truesource` entries are written by `player-truesource-ingest` and are not touched here.
