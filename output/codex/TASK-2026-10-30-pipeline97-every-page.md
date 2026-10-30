# TASK 2026-10-30 — codex: adversarial diff review, pipeline.97

Commit `a6d7e979` (one commit). Review the diff: `git show a6d7e979`.

**What it claims.** Builder ruling: every citizen page is available to the media; Ines (Voices) and Tamsin (Lives) see all of it. Before: the collector (`scripts/scanCitizenPages.js`) turned away the citizens' debate pages; Ines read only morning–night / work / CONVO, Tamsin only morning–night / work. The change:
- `scripts/scanCitizenPages.js` — `DEBATE` in `SLOT_RE` and `DAY_SPLIT_RE`. **Live now, no switch** (the index is append-only). NIGHTLY, PRESS-graded-*, office statements and smoke docs stay out on purpose.
- `scripts/buildLivesSlice.js` — `EVERY_PAGE` (false) switch; `pageSlot` / `pageText` / `slotWord`; `ownPageLines(…, every)` returns `where`. With the switch: any slot the collector admits, text through `citizenText` (strips `TENSION[c<N>]:`).
- `scripts/buildVoicesSlice.js` — roster, empty reason, ref, `pagesForPicks` take `everyPage` (default the switch); approach text follows the switch.

The switch flips after this review. Plan: `docs/plans/2026-10-03-citizen-pages-drive-canon.md` §6 (measured table of what is turned away and why, and of each reader before/after).

**Hunt.**
- Switch-off identity: with `EVERY_PAGE` false, is every output of both slices byte-identical to before `a6d7e979` (roster lines, `pageVoices` labels, empty reasons, ref, approach)? Name a fixture where it is not.
- Switch-on: does any page text reach a writer with an engine tag still in it (`TENSION[`, `TENSION-RESOLVED[`, a JSON `"quote":` envelope, `filed:`/`graded:` lines)? Read `citizenText` and name an input it misses. MEDIA citizens must stay out of both seats.
- Every other reader of `output/citizen_pages/index.jsonl` once DEBATE rows land: letters (`checkLetterEligibility.js` PAGE_CITE_RE / `screenPageStance`), Rhea page lines (`cron-rhea-gate.js`), Pulse (`buildPulseSlice.js`), street sourcing (`newsroomSourcing.js`). Does a debate row break, double-count or mis-attribute anything? (A debate page is the citizen's words in a debate — read `scripts/citizen-exchange.js` `recordParticipant` for what it holds.)
- Call sites: `cron-desk-run.js` and `newsroom-fanout.js` call `pagesForPicks` / `loadSlice` / `enrichAssignment` — does any pass opts that now collide with `everyPage`, or rely on the old `slotWord` output?
- Tests: weakened assertions, a regex that accepts either branch, a fixture that cannot fail.

**Out of scope.** Whether Ines or Tamsin should cover journalists, and what they pick — the builder's call. Other reporters' search (`lib/mags.js searchDisk`) — reported to the builder, not this build. Pages merged before pipeline.96.

**Write to:** `docs/for-claude-review/2026-10-30-codex-pipeline97-every-page-review.md`, verdict SHIP / SHIP-WITH-FIXES / HOLD, each finding with file:line and input → wrong output. Register it in `docs/index.md` in the same commit. No code edits, no network calls, no live runs.
