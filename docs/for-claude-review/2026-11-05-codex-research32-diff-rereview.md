**Verdict: HOLD** — `fc54ef559` closes much of the `f974fbad6` review, but the fold still has answer-changing gaps: a hood card can be attributed to the wrong hood, a prior year's record can be called current, “Athletics” loses its first-move lookup, the brief can assert a false shared Cycle, and the final-round fallback can send unfinished tool-call text. Several named ceilings also change what a voice can tell the builder.

# Codex research.32 diff rereview — `fc54ef559` over `f974fbad6`

## Folded items

- **F16 club selection — PARTIAL.** `lib/personaProvider.js:240-247` now selects Oaks rows for an Oaks `RoleType`, closing the Adash example, but every role without the exact case-sensitive word `Oaks` defaults to A's rows. A citizen voice whose ledger role names neither club still gets A's events as “the club” in its brief (`lib/personaProvider.js:287-288`), so the stated “voice's own club” rule is not general.

- **F16 two-record sentence — NOT CLOSED.** `lib/personaProvider.js:287-288` removes the Vinnie-only “you stepping away” claim, but unconditionally says feed and ledger facts are “on the record at the same Cycle.” The same brief can include C110/C112 feed lines beside a C114 ledger snapshot (`lib/personaProvider.js:241-252,273-280`; `lib/discordLookups.test.js:27-33,59`); a voice can therefore tell the builder a disagreement is simultaneous when the cited events are older.

- **F16 global sports ordering — CLOSED.** The selected named and club rows are combined and sorted by numeric Cycle, then file position, before formatting (`lib/personaProvider.js:246-253`). This removes the previous generic-club-before-newer-named ordering error for the selected five rows.

- **F12 team row recency — CLOSED.** `newestFirst` orders by Cycle and file position, and `lookupTeam` now uses that result for both the record and the displayed rows (`lib/discordLookups.js:87-92,241-256`). An older row appended to the file no longer overrides a newer Cycle.

- **F12 prior-season label — NOT CLOSED.** `lib/discordLookups.js:247-253,398-401` decides “current” solely by equality of `SeasonType`. In an offline two-row input with a C120 `early-season` feature carrying `-` and a C68 `early-season` game carrying `5-1`, it prints plain `Record: 5-1 — from the C68 ...` under a C120 header. The stages have the same string one 52-Cycle year apart (`lib/personaProvider.js:411-413`), so the voice can present a previous year's standings as current.

- **F12 citizen sports name join — CLOSED for the cited case.** `nameKey` removes periods and `feedRowsNaming` sorts matching rows newest first (`lib/discordLookups.js:53-54,93-96`); the new fixture tests `Wendell Carter Jr.` against feed `Wendell Carter Jr` (`lib/discordLookups.test.js:185-189`).

- **F14 duplicate archive meaning — CLOSED.** `lookupBusiness` recognizes `canon-duplicate-of:BIZ-...` and reports `RETIRED RECORD` with a pointer instead of `CLOSED` (`lib/discordLookups.js:284-293,412-415`). The test uses the real-shaped Beth Jacob duplicate reason (`lib/discordLookups.test.js:56-58,148-152`).

- **F14 archived number date — CLOSED for an ExitCycle row.** `lookupBusiness` takes the archive's `ExitCycle` for `asOfCycle`, and the formatter calls those archived values numbers “as of its exit” (`lib/discordLookups.js:290-293,412-416`). The C108 duplicate fixture is no longer given the current C114 table stamp (`lib/discordLookups.test.js:148-150`).

- **F15 citizen/business card ownership — CLOSED for the original body-mention failure.** `canonHits` retains the writers' `popid`/`biz_id` metadata, and `canonFor` rejects a foreign stamped ID even if its body mentions the queried name (`lib/discordLookups.js:437-448,460-474`). A legacy unstamped card still uses name-in-title fallback, as the plan states.

- **F15 hood card fetch — REGRESSION in attribution.** The wrapper now fetches a `wd-neighborhood` card for each attached or tool-called hood (`lib/discordLookups.js:499-501,517,533-535`), but `withHoodCard` accepts any result whose **body** mentions the requested hood (`lib/discordLookups.js:210-218`) and ignores the card writer's `metadata.neighborhood` (`scripts/buildNeighborhoodCards.js:241-251`). In an offline stub, a result titled and stamped `Chinatown` with “West Oakland” in its prose was attached as West Oakland's card; that wrong card can supply the builder false hood facts. `f974fbad6` omitted the hood card, so this is new wrong attribution.

- **F2 two entities per kind — CLOSED within the stated cap.** `detectEntities` collects up to two distinct citizens, hoods, teams and businesses, and `recordsForMessage` formats each one (`lib/discordLookups.js:306-336,529-539`). The comparison fixtures cover two hoods and two teams (`lib/discordLookups.test.js:173-182`).

- **F2 period in a detected name — CLOSED for the cited case.** The message and ledger names go through `nameKey` before the regex, so `Wendell Carter Jr.` is detected (`lib/discordLookups.js:309-320`; `lib/discordLookups.test.js:176-178`).

- **F2 Athletics false positive — REGRESSION.** Removing the bare `athletics` team token prevents the school-program false positive, but `detectEntities('How are the Athletics?')` now yields no team (`lib/discordLookups.js:327-328`); `resolveTeam('Athletics')` still recognizes the A's if called explicitly (`lib/discordLookups.js:224-227`). This exact team alias received an automatic lookup in `f974fbad6` (`git show f974fbad6:lib/discordLookups.js`, lines 292-293). On Sonnet's optional first tool call (`scripts/mags-discord-bot.js:556-558`), the builder can get a standings answer without the standings record attached.

- **F6 ledger field filter — CLOSED for valid rows.** `lib/mags.js:755-764` parses a ledger row, deletes only `LifeHistory`, then matches on the remaining serialized fields. Neighborhood, employer and income columns after `LifeHistory` stay searchable; the old cut-at-field regression is removed.

- **F7 ledger snapshot stamp — CLOSED when present.** `lib/mags.js:742-746,764,817-818` reads `simulation_ledger_snapshot.meta.json` and uses that Cycle for ledger ranking and the displayed ledger tag. It no longer borrows the beats stamp.

- **F7 unstamped number label — PARTIAL.** The lookup formatter says `unstamped — Cycle unknown` or `?` instead of `Cnull` (`lib/discordLookups.js:52,359,372,398,413`), but `searchDisk` omits the ledger Cycle entirely when the ledger meta is missing (`lib/mags.js:817-818`). A generic `search_world` result can still show ledger ages/fields without telling the voice that the dump is unstamped.

- **F4 partial-row fallback — CLOSED.** `pickJsonl` now skips a JSONL file unless one row itself carries all terms; it no longer serves a first-term row as a misleading file-level hit (`lib/mags.js:748-769,786-795`). This narrows results that were previously labelled partial in `f974fbad6`, but preserves the valid all-term row path.

- **F10 missing population cell — CLOSED.** The hood lookup withholds total, share and watch-bar verdict unless all three population components parse (`lib/discordLookups.js:175-192,373-379`). A missing Adults cell no longer becomes zero in a spoken denominator (`lib/discordLookups.test.js:190-193`).

- **F11 missing census tab — PARTIAL.** `beatOrNull` distinguishes an absent file from an empty census and the formatter says `source unavailable` (`lib/discordLookups.js:50-51,380,427-433`). An existing but unreadable or malformed file still becomes `[]` through `readJsonl` (`lib/discordLookups.js:38-43`), then the voice says `no rows on record` (`lib/discordLookups.js:198-206,381-389`). The prior finding covered unreadable as well as missing input; only the missing-file case is closed.

- **Bot final-text fold — NOT CLOSED and answer-changing.** `scripts/mags-discord-bot.js:563-570,589-601` saves any text emitted alongside an earlier `tool_use` as `lastText`, then substitutes it when the final round has no text. If the prior text was “Let me check that,” the bot returns and persists that unfinished pre-result line after the tool result arrives; if every tool round contained only tool blocks, `lastText` is empty and the original empty-payload failure remains. The fold does not guarantee a substantive reply to the builder.

- **Attached-record trust fence — CLOSED for the stated boundary.** `recordsForMessage` wraps the assembled feed/card/canon blocks with `memoryFence.wrap(..., 'city-records')` before the bot appends them to its system prompt (`lib/discordLookups.js:524-539`; `scripts/mags-discord-bot.js:528-533`). The card-ownership issue above remains a factual provenance problem inside that data fence.

## Named ceilings and their effect on the voice

- **F3 disk query `Vinnie Keane retire` — bounded for the exact named message.** The plan now says the C114 line reaches the voice through the citizen lookup rather than disk (`docs/plans/2026-11-05-discord-voices-lookups.md:97-98,122-126`); `detectEntities` finds the full name and the citizen lookup carries feed rows (`lib/discordLookups.js:316-320,529-539,93-96`). This ceiling changes an answer when the builder uses only `Keane` or another unrecognized reference: the attach is absent and Sonnet can skip search (`scripts/mags-discord-bot.js:556-558`).

- **F2 unforced Sonnet first move — VOICE IMPACT.** `scripts/mags-discord-bot.js:525-533,556-558` still sends `tool_choice: auto` and allows an immediate answer. For small talk or an unrecognized name, `detectEntities` produces no blocks (`lib/discordLookups.js:309-337,529-539`); the voice may answer the builder from its boot context without a current lookup. The plan explicitly accepts this at `docs/plans/2026-11-05-discord-voices-lookups.md:99`, but it is an answer-grounding limit, not only robustness.

- **F4 one JSONL row per file — VOICE IMPACT on keyword search.** `lib/mags.js:748-769,803-819` shows only one matching row from a sports-feed file. Team and citizen lookups show up to six and four rows respectively (`lib/discordLookups.js:93-96,255-257`), but Sonnet can answer after `search_world` alone and never invoke them (`scripts/mags-discord-bot.js:556-558,563-590`). A question comparing two same-Cycle games can therefore reach the voice as one game and produce an incomplete reply.

- **F5 one text line — VOICE IMPACT.** `lib/mags.js:771-783,807-819` still shows only one line of a file whose query terms may be on different lines. The prior review's concrete file has Vinnie on one line and a different person's retirement on another (`editions/cycle_pulse_edition_82.txt:340,342`); the voice can see a file hit without the disambiguating line and connect the wrong event to Vinnie.

- **F7 previous beats removed — VOICE IMPACT beyond illness.** `lib/mags.js:614-620` excludes all `output/beats/prev/` rows, while the neighborhood lookup exposes only prior **Sick/share** movement (`lib/discordLookups.js:174-193,376-379`). A builder question about last Cycle's unemployment, school quality or active-business value cannot get that prior table row through either route; the accepted ceiling changes what the voice can substantiate.

- **F7 no manifest/hash check — CONDITIONAL VOICE IMPACT.** `lib/discordLookups.js:38-58,427-434` reads each dump independently and never validates the beat manifest's row counts/hashes or `prev/meta.json`. If a table is partial or a prior dump is stale, `lookupNeighborhood` can rank from a partial set or label that stale prior Sick count with the current meta's `prevCycle` (`lib/discordLookups.js:174-193,376-379`). The resulting spoken rank or trend is wrong, so this ceiling is a truth condition, though no current corrupt dump was observed.

- **F2 inexact business name — VOICE IMPACT in the logged query.** `detectEntities` still requires the full business name (`lib/discordLookups.js:329-334`), and `lookupBusiness` still requires exact name or BIZ_ID (`lib/discordLookups.js:265-282`). “West Oakland academy” attaches the hood but not `Firehouse 29 West Oakland Baseball Academy`; Sonnet may answer without searching (`scripts/mags-discord-bot.js:528-533,556-558`). The plan's proposed `lookup_business` fallback would also return not found for that partial name (`docs/plans/2026-11-05-discord-voices-lookups.md:105`).

- **Engine-wiring/replay receipt — verification ceiling only.** The plan says the wiring card and replay ran in research-build (`docs/plans/2026-11-05-discord-voices-lookups.md:106`); this rereview independently read source and ran the offline lookup suite, not those network/bench receipts. The receipt's absence here does not itself change a voice reply.

## Verification boundary

`SUPERMEMORY_CC_API_KEY= node lib/discordLookups.test.js` passed 64/64 offline checks, with the memory key blank so the suite made no Supermemory network request. I used read-only synthetic probes for the Athletics alias, a same-label record 52 Cycles apart, and a foreign neighborhood card returned by a stubbed search. I did not run a model, Discord, PM2, Sheets, Supermemory network request, the wiring card, or a live Cycle. The plan's harness claims are reported as its claims, not independently verified here.
