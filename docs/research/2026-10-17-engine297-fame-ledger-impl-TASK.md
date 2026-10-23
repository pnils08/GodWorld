# TASK — codex implement: engine.297 fame sightings draw from the Cultural_Ledger

**From:** research-build (builder 2026-10-17: "Ask codex"). **Mode:** patch only — do NOT edit tracked files, no deploy, no bench, no Sheet, no cron, no commit.
**Spec:** `docs/plans/2026-10-16-celeste-dead-slice-legends-and-interview-guards.md` Task 9 (the builder's ruling verbatim) + §Open (two readings that are NOT in scope). Read it first.
**Deliver:** `output/codex/engine297-fame-ledger.patch` (git format against HEAD) + `output/codex/engine297-fame-ledger.md` (what you did; H1–H4 answered with file:line; the test command and its output).

## Build
1. `phase07-evening-media/buildEveningFamous.js`: the twelve literal pools at `:92–172` (ACTORS, MUSICIANS, ATHLETES, INFLUENCERS, JOURNALISTS, CHEFS, STREAMERS, AUTHORS, CIVIC, BUSINESS, ARTISTS, CULTURAL_LEADERS) become buckets filled from `Cultural_Ledger` rows, read through `ctx.ss` the way `culturalStatusByPop_` does (`phase07-evening-media/culturalLedger.js:98` — one cached read per ctx). Row in when `Status` is Active. Bucket key = `FameCategory`, falling back to `classifyRole(RoleType)` (`culturalLedger.js:167`). Hood = the linked citizen's `Neighborhood` from `ctx.ledger` when `UniverseLinks` starts `POP-`, else the row's own `Neighborhood`. Keep the context weighting at `:281–409` exactly as written, concatenating the same-named buckets. An empty bucket is an empty bucket — no literal fallback anywhere (engine.296 rule, `:174–177`).
2. Leave `REAL_PLAYERS` / `athletePool` / `SPORTS_LEGENDS` (`:174–275`) untouched — the A's seed path is the builder's open call (§Open a). `ATHLETES` as the generic fallback at `:275` goes with the other eleven: `athletePool = REAL_PLAYERS` (possibly empty).
3. Entry shape `{ name, role, tier?, homeNeighborhood, traitProfile? }` unchanged so `:410–552` (pick, hood, venue, `recordRipple_`) and `registerCulturalEntity_` at `:574–579` run as before; `S.famousSightings` / `S.famousPeople` identical in shape — readers `buildMediaPacket.js:304–439`, `mediaFeedbackEngine.js:597–663`.
4. Rules of the file: `ctx.rng` only, never `Math.random`; no sheet writes outside Phase 10 (this is a read); ES5 style; update the reference block at `:585+` (CELEBRITY POOLS) to the truth.
5. Tests in `scripts/sportsWeekCity.test.js` (the engine.296 stub pattern is at `:322–355`): (a) a stubbed Cultural_Ledger with one Active row per category yields sightings only from those rows; (b) a category with no rows contributes no name; (c) no literal name from the old lists survives in the source (grep assertion); (d) the SPORTS_LEGENDS path is unchanged. Full suite `npm test` — 290/290 today; report the new count.

## Hunts — answer each, file:line, numbers not adjectives
- **H1** Does anything else read the twelve pool names or their literal strings? `grep -rn` across `phase*/ scripts/ lib/ .claude/ docs/` — list every hit.
- **H2** `registerCulturalEntity_` bumps FameScore +5 per sighting and the pool is now drawn FROM the ledger. Is there a rich-get-richer loop that `decayCulturalFame_` (`culturalLedger.js:71`) does not bound? Show the arithmetic over 10 cycles for one row.
- **H3** ECL `fame` / `culdomain` conditions (`phase02-world-state/loadEventContentLedger.js:89–92`) and the fame seam (`phase05-citizens/generateCitizensEvents.js:2719–2735`) — unaffected by this patch? Say why.
- **H4** The C112 bench reached no playoff rung (your HOLD 2026-10-16). Name the exact stub or input seam engine-sheet would use on the 1004 bench to force `sportsRung_` to playoffs/championship so legends and buckets are seen in a fire.

Patch ≲ 200 lines of code. Done = the two files exist in `output/codex/`.
