# Cultural-figure ledger gap — exact scope for engine-sheet

Binding direction (Mike-direct 2026-08-15, recorded in
`docs/plans/2026-08-07-spacemolt-game-show.md` changelog): every CUL-* figure
gets full ledger citizenship — compatible Oakland neighborhood, pay, BIZ-ID
employer where available, living status. They live, not just appear.

**Correction (research-build, 2026-08-15):** kimi's original version of this
doc enumerated via Supermemory wd-cultural cards (43 figures found, `metadata.popid`
as link status) and flagged a drift against the live sheet's 46, deferring to
"sheet authoritative." Cross-checked directly against the live `Cultural_Ledger`
sheet (`lib/sheets.getSheetAsObjects`, UniverseLinks column H) rather than
trusting either count as-is. Result: **the compiled Supermemory cards were
stale relative to the sheet**, not just short by 3 rows.

- The "wire-only (5)" bucket was entirely wrong — **Vinnie Keane, Travis Coles,
  Eric Taveras, Jade Orion, and Steve Conrad are all already fully linked**
  in the live sheet (UniverseLinks populated). Their compiled cards hadn't
  picked up the link. Acting on the original doc would have touched Vinnie
  Keane's (POP-00001) row for no reason.
- Henry Rivas and Danny Horn, filed under "no ledger row found," are also
  already linked in the live sheet (kimi's own footnote had correctly flagged
  uncertainty on both; the bucket assignment was wrong).
- Three figures were missing from the Supermemory sweep entirely: **Arturo
  Ramos and Deacon Seymour** (both already linked, so no scope impact) and
  **Muralist Dante Reyes** (CUL-CEF9BF70, unlinked — this one *was* missing
  work and would have been dropped from the mint scope silently).

Lesson for the project generally, not just this doc: compiled Supermemory
cards are a downstream snapshot of the sheet (`buildCulturalCards.js`), not
the source of truth — this is the canon-authority-model doctrine
(`project_canon-authority-model.md`: Sheets = truth, Supermemory = cards)
showing up as a real, consequential drift, not just theory.

The two lists below are read directly off the live sheet (46 rows total, all
46 accounted for) and are what engine-sheet should act on.

## Already linked (25) — no work

Darrin Davis→POP-00021, Dax Monroe→POP-00769, Derek Obi→POP-00543,
Evan Morello→POP-00536, Jose Colon→POP-00599, Kato Rivers→POP-00770,
Lena Cross→POP-00539, Marcus Webb→POP-00790, Marin Tao→POP-00537,
Mark Aitken→POP-00003, Nila James→POP-00538, Rico Valez→POP-00632,
Rowan Pierce→POP-00545, Sage Vienta→POP-00771, Tara Ellison→POP-00546,
Vladimir Gonzalez→POP-00598, Vinnie Keane→POP-00001, Travis Coles→POP-00533,
Eric Taveras→POP-00597, Jade Orion→POP-00540, Steve Conrad→POP-00124,
Henry Rivas→POP-00024, Danny Horn→POP-00022, Arturo Ramos→POP-00025,
Deacon Seymour→POP-00528.

## Full mint needed (21) — no POPID link, no ledger row

Name | CUL-ID | FameCategory | CityTier
---|---|---|---
Theo Banks | CUL-6A0BC6CC | musician | National
Nina Reyes | CUL-B60D00F6 | actor | National
Jordan Steele | CUL-DC4EA635 | athlete | Local
Brody Kale | CUL-905CBDE8 | influencer | National
Community Director Hayes | CUL-21B70831 | community-leader | Local
Celeste Moon | CUL-732EA822 | musician | Regional
Councilwoman Rivera | CUL-5F7A348B | civic-figure | Regional
Sculptor Alma Vasquez | CUL-0E82EF6C | artist | Regional
**Pixel Pete** | CUL-BEF5B8CE | streamer | Regional
**GameGirl Gia** | CUL-1CFF5139 | streamer | Local
Gallery Owner Mei Chen | CUL-BA80115F | curator | Regional
Muralist Dante Reyes | CUL-CEF9BF70 | artist | Regional
Sienna Vale | CUL-EBD601D2 | influencer | Local
Photographer Kai Tanaka | CUL-2F15E066 | artist | Local
Festival Organizer James Williams | CUL-9738B2EA | community-leader | Local
Heritage Director Rosa Martinez | CUL-065F46DC | unknown | Regional
Claire Ashford | CUL-C13B0483 | author | Local
Lumi Crest | CUL-66EDE7C6 | influencer | Local
Cultural Ambassador Li Wei | CUL-66AA3FD9 | unknown | Local
Advocate Simmons | CUL-EEC72E06 | activist | Local
Marcus Duval | CUL-3D28D67B | actor | Local

**Pixel Pete and GameGirl Gia are the UNDOCKED-adjacent pair — mint these two first**, per the binding direction.

## Notes for the mint

- Role-prefixed names ("Advocate Simmons", "Gallery Owner Mei Chen",
  "Photographer Kai Tanaka") suggest these were generated as texture figures —
  the mint gives them first-class citizen rows; check for naming-canon
  collisions on title vs. ledger name conventions.
- Tier assignment is engine-sheet's call; nothing in `Cultural_Ledger`
  (including `CityTier`, which is fame-reach — National/Regional/Local — not
  the Simulation_Ledger's Tier-1..4 protection tier) carries a formal tier.
- Re-run `buildCulturalCards.js --apply --wipe-old` after the mint so the
  Supermemory cards stop lagging the sheet for these rows too.

## Changelog

- 2026-08-15 (kimi) — Original enumeration via Supermemory wd-cultural cards, 4-query hybrid sweep (43 figures, 16/5/22 split).
- 2026-08-15 (research-build) — Corrected against the live `Cultural_Ledger` sheet directly. All 5 "wire-only" figures already linked; Henry Rivas + Danny Horn already linked; Arturo Ramos + Deacon Seymour + Muralist Dante Reyes missing from the original sweep entirely (Dante Reyes genuinely needs the mint). Corrected split: 25 already-linked / 21 full-mint.
