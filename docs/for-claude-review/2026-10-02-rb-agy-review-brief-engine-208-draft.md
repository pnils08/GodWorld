# Review brief for agy — engine.208 fandom dial read-before + proposed cut

**From:** research-build, 2026-10-02 22:50. **Read-only review of a design document.** No code edits, no file edits other than your own output. **Write your review to:** `docs/research/2026-10-02-agy-engine-208-draft-review.md`. Delete this brief when you start.

**The document:** `docs/research/2026-10-02-engine-208-fandom-dial-read-before.md`.

**Read first, in this order:** the plan `docs/plans/2026-09-11-sports-as-a-lived-system.md` §0 (all ruling blocks), §4, Task 8, the 2026-09-27 changelog entry; `docs/research/2026-09-18-sports-intensity-and-game-day-economy.md` §6 (Q1–Q8 + rulings).

Adversarial, file:line evidence, severity-ranked. Hunt:

1. **Every code claim in §1.1.** Open the cited file:line and confirm the claim is what the code does. Specifically: `utilities/citizenMemory.js:33` is the only hardcoded dial list in `phase*/ utilities/ lib/`; a missing dial reads 50 in `newCitizen_`, `deserialize_` and `lib/citizenDials.js currentDials`; `describe_` throws or misrenders on a missing `PHRASE` entry; `baseTag_` in `utilities/citizenDialMap.js` strips a trailing `-Sports`; `EDITION_RE`/`EDITION_FX` is a citation on the named citizen, not a tone channel; `loadEventContentLedger.js` DSL fields carry no fandom/team/phase. Any claim the code does not support is a FIX.
2. **Re-litigation.** Does any sentence in §2 or §4 re-open a ruling recorded in plan §0/§4 or research §6? Quote the sentence and the ruling. The plan's sixth block (last entry sets the lens) supersedes research Q6 (summary row) — confirm the draft reads that the right way round.
3. **Texture as seed.** §1.2 says the 1,210 `[Sports]` lines are not a seed input. Check §2.3's seed formula uses none of them, directly or by proxy.
4. **Negative pole on day one.** Walk §2.2: for an Oaks losing week under Q3 (measured against an expansion expectation), does any citizen actually move down, or does Q3 neutralise every loss so the negative pole is dead at ship (engine.197's exact failure)? If dead, say what minimal rule would make it fire.
5. **Sim calls vs mechanism.** §4 lists four items as the builder's calls. Is each one genuinely a sim judgement, or is any of them a mechanism question the engineer should decide? Conversely, is there a sim judgement hidden inside §2 that is presented as mechanism?
6. **Feed claim.** `output/beats/Oakland_Sports_Feed.jsonl`, Cycles 107–109: confirm every A's game-result row carries `SeasonType` `playoffs` and that the round appears only in `Notes`. Confirm `SPORTS_PHASE_ALIASES_` in `phase02-world-state/applySportsSeason.js` maps `world-series` to `championship`.
7. **Acceptance dates.** §2.8 item 4 is a live read at first fold + 10 Cycles. Is there a bench-time check that would catch a one-blob outcome earlier? Name it or say there is none.

Verdict per finding: BLOCK / FIX / NOTE. End with one line: SHIP, SHIP-WITH-FIXES (list them), or HOLD.
