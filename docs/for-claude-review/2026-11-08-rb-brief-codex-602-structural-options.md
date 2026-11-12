# Brief to codex-rb — 602 citizens with dice-written family facts: structural options (propose only)

Date: 2026-11-08. From: research-build. Builder asked for this to go to codex. Propose only: no code, no sheet writes, no page writes, nothing run against live.

## The problem

- A script run in April wrote marital status and child counts from age-bracket dice onto about 602 citizens (`lib/citizenDerivation.js` `deriveMaritalStatus` / `deriveNumChildren`). `phase05-citizens/processAdvancementIntake.js` ~1170–1183 still copies the same dice onto non-household arrivals.
- Wake writers read a bare `NumChildren > 0` (`lib/wakePerception.js` `loadFamily`, ~217–300) and render "you have N child(ren)". Citizens then wrote pages, and those pages went into memory and dials (Reflection_Intake rows are drained into DialState and marked applied).
- Elias Varek (Tier 1, Founder of Civis Systems, BirthYear 2003, single, NumChildren 1, no linked child, no spouse) now has daughter pages. The builder authored him as a young bachelor billionaire with a moral compass; the voice read the bare count as a father with no moral compass.
- Read-only counts from `output/simulation_ledger_snapshot.jsonl` (1018 Active): child count above linked kids 415 (Tier 1: 10, Tier 2: 31, Tier 3: 77, Tier 4: 297); married with no spouse linked 463 (Tier 1: 12, Tier 2: 13, Tier 3: 85, Tier 4: 353). 51 Tier 1–2 rows hold at least one open spot (they include authored people: council, journalists, A's legends, faith leaders, the mayor).
- Live LifeHistory_Log (Cycles 103–114, 26,830 rows) holds 6 Birth events; of 506 rows with a count above linked kids, 502 have no Birth event. Births before C103 may be compressed away, so this does not prove those counts were dice.
- Wake pages written from bench runs (Cycles 119/126/116) also reached real citizens' pages (`node -e` argv drops `--dry-run`; see `docs/plans/2026-11-08-how-kids-are-minted.md` §bench bleed).

## Builder's rules (verbatim where quoted)

- "we never edit, cause the distinction matters." No citizen row, page, dial, ledger cell or sheet is touched by hand or by script. Only engine code going forward.
- "the life happened… it's not a sim, it's not data, it's a world, these are lives." Varek's daughter, spoken in his own pages, is a lived event. Withdrawn and not to be re-proposed: one-cell corrections, page edits, hiding the count at read time, a read guard that ignores unbacked counts.
- Rejected plans (see the plan doc, builder's words section): editing the rows/pages; hiding or scrubbing the claim; the lottery alone at 1% (supply 272 pool citizens against 1,556 open spots).
- Builder's standing rulings already on file: an experience stands, errors included; WHO a citizen is (authored self) is canon and "we never let a citizen's self drift" (2026-09-28; the Villanueva identity cells were corrected and ruled correct); a bug is an event; off-camera family (a count with no child row) is allowed by design; named persons with no ledger row are forbidden; engine drift over static backfill; initiatives are in-world, written by crons from their own slice, the engine does not tell crons what to do (2026-09-23).
- Builder's complaint: every offer so far is a code edit, with no idea that uses how his project works. He wants a structural idea built on the world's own mechanisms.

## Existing mechanisms to build on (verify each in code before using it)

- Family lottery (engine.304, `processAdvancementIntake.js` ~2168–2300): 1% of citizens with open spots per Cycle, tier-weighted 10/5/2/1; links one Generic_Citizens pool citizen as a Family row; the wake names them; the citizen's own words bring them to the ledger.
- Builder question door (engine.338b, live on PROD @179): a sports-feed row poses a question to one citizen; the next owed wake carries it; the answer lands in the citizen's own words. v1 scoped to former players (`docs/plans/2026-11-07-former-player-next-chapter.md`).
- Canon retraction (`scripts/cron-saturday-run.js` `retractFromStore`, `retractionIds`): written for articles and canon violations; coverage of citizen pages is unverified.
- Desks that report lives: Tamsin Pruitt (Lives), Ines Sorensen (Voices); Story_Seed_Deck / Story_Hook_Deck.
- Life events: `phase04-events/generationalEventsEngine.js` (birth raises NumChildren on the parent only, off-sample by design), LifeHistory_Log, Lived_Events.

## Ask

Give at least three structurally different options, none a variant of the rejected ones, that make the 602 current lives make sense in canon and in memory without editing any row, page, dial or ledger cell. For each: what new world event or mechanism exists; which existing code it extends (file and line); what it writes and where; whether it touches an existing citizen row, page or dial (it must not); what a citizen, the paper and the dials see afterward; what it does for Varek specifically and for a widowed senior with a young kid; cost and risk; what you could not verify. Say which you would pick and why. Also say whether the Tier 1–2 authored people (51) are a separate case under the "authored self is canon" ruling. Do not write the options as scrubbing, hiding, a hand correction or a lottery-rate change in new words.

Reply file: `docs/for-claude-review/2026-11-08-codex-602-structural-options.md`. Verify every claim against the code; mark what you read versus what you inferred.
