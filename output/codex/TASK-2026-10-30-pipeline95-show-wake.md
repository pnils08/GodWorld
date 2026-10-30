# TASK 2026-10-30 — codex: adversarial review of pipeline.95 (UNDOCKED pilot knows they flew)

**Commit:** `0de8bdbc` — `git show 0de8bdbc`. Plan: `docs/plans/2026-10-16-undocked-crossover-the-city-knows-its-pilots.md` §6 (builder words verbatim, measured state, as built, rulings, proof).

**What it claims.** One switch, `ON` in `scripts/undockedShowRecord.js`, currently `false`, for three readers:
1. `cron-undocked-run.js` stage 8 `pageNights`: every applied night (intake `Applied=yes`) with no receipt in `output/spacemolt-show/paged.json` goes to the pilot's citizen page as a `type: 'show'` doc, keyed by the flown Cycle, daypart `UNDOCKED`, weekday and `pageRefOf(EpisodeId)`. The first run writes all 69 past nights (ruled).
2. `citizen-wake.js` and `citizenVoice.js`: a fenced "Your time on UNDOCKED" block read from disk. In the interview it rides only in the lived-context branch.
3. `lib/wakePerception.js`: `SHOW_RESERVE = 3` a Cycle, on top of owed's 6 (ruled). `owedFromShow` gives one mark per pilot per flown Cycle in the owed window; `showCandidates` takes the newest Cycle first. The show slot is checked ahead of owed in `selectWakeCitizen`, and the journal counts slot `show` apart from owed. `loadOwnPageReadback` drops `show` docs.

**Hunt.**
- Switch off: is every live output byte-identical to the parent commit? Cover the wake prompt, wake selection, journal lines, the interview prompt, the flight run and page recall.
- The journal and the reserve: can a pilot's mark be spent without the block in front of them, or shown and never spent? Can a show wake count against owed's 6, or the reverse? What happens when a pilot also holds an owed event, when the page key is taken (slot `repeat`), or when the journal can't be read?
- Ordering and window: does newest-first starve anyone in a way that changes what a citizen lives? Can a pilot be owed twice in one Cycle?
- The page stage: can a night be written twice, a receipt be lost, or two nights merge into one doc? What does a crash between the landed doc and the receipt write do? Is there a path where a failure here fails the night's run?
- Text: can a date, a POPID, an episode id or a runner note reach the page or the block? Do the clause rules claim anything the archive doesn't hold (the never-moved night, a night with no archive)?
- Every page reader: will a `show` doc be read as a citizen's own words anywhere (the newsroom index, family mentions, recall, desk tools)?
- Any assertion that can't fail.

**Known, not this build:** `lib/wakePerception.test.js` "snippet capped at 180" fails the same way on the parent commit.

Last-round rule: one review plus one re-review. **Write to:** `docs/for-claude-review/2026-10-30-codex-pipeline95-show-wake-review.md`, with a verdict of SHIP / SHIP-WITH-FIXES / HOLD and file:line plus input → wrong output for each finding. Register it in `docs/index.md` in the same commit. No code edits, no network calls, no live runs.
