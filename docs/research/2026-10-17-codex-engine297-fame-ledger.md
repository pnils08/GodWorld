---
title: engine.297 — Cultural Ledger fame pools patch and hunts
created: 2026-10-17
updated: 2026-10-17
type: reference
tags: [engine, review]
sources:
  - docs/research/2026-10-17-engine297-fame-ledger-impl-TASK.md
  - docs/plans/2026-10-16-celeste-dead-slice-legends-and-interview-guards.md
pointers:
  - output/codex/engine297-fame-ledger.patch — proposed implementation (landed 486ea61e with two engine-sheet fixes)
---

# Delivery

Patch against HEAD **3bfaa41407179719650ebc6099ed6d696c1c3e03**, built in a fresh git archive and applied to a second fresh archive for verification. No tracked workspace edits, commit, deploy, bench, Sheet operation, or cron invocation. Only the requested patch/report are delivered. Tests ran offline in the restricted sandbox; one existing absolute-import test attempted an OAuth connection and was blocked by DNS/network isolation, as detailed below.

Proposed files: `phase07-evening-media/buildEveningFamous.js`, `phase07-evening-media/culturalLedger.js`, `scripts/sportsWeekCity.test.js`. Diff: **166 insertions, 139 deletions**, including the moved existing classifier and tests; below the requested approximately 200 added lines. Engine code remains ES5. There are **42** removed literal names and **12** bucket identifiers.

## Implementation and boundaries

Post-patch line references in this section; H1–H4 otherwise reference original HEAD unless marked.

- `buildEveningFamous.js:46-84`: one cached Cultural_Ledger bucket read per ctx, Active status (trimmed/case-normalized), explicit FameCategory first, shared classifier for a blank category. All twelve arrays are bound at `:135-139`. No FameScore floor is added to this reader.
- Category aliases preserve the existing classifier vocabulary: curator/dancer → ARTISTS, activist/civic-figure → CIVIC, community-leader/cultural-leader/cultural-figure → CULTURAL_LEADERS, sports-figure → ATHLETES. Unknown/unmapped categories have no corresponding bucket and contribute no entry; blank names are not synthesized. Explicit unknown is not silently replaced with another category.
- `:64-79`: POP-linked homeNeighborhood comes from the current shared ctx.ledger row; an unresolved POP link yields empty homeNeighborhood, never the stale cultural-row hood. Non-POP links use the cultural row. No canon facts or traits are invented. The existing location chooser still determines the final sighting neighborhood; this patch does not make every non-athlete sighting occur at home.
- `culturalLedger.js:133-179`: the original nested classifyRole body is moved intact to file scope; registration still calls it at `:228`. No second classifier or changed registration rule. Repository search found no other function declaration with this name.
- `buildEveningFamous.js:242`: athletePool is exactly REAL_PLAYERS. **ATHLETES is populated but is not concatenated**, as expressly required by Task 9's protected A's path. The eleven other buckets retain their existing context branches. Empty means empty.
- The REAL_PLAYERS seed block, including its existing fame-bar bridge, SPORTS_LEGENDS predicate, and the selection/output block are byte-identical to HEAD. Existing context concatenations, deduplication, count, locations, venues, ripple emission, registration and output shapes are unchanged. No extra RNG draws are introduced; existing safeRand_ remains the RNG entry.
- Existing separate decay/status/registration reads are NOT consolidated: “one cached read” describes this new bucket reader, not total Cultural_Ledger reads throughout a Cycle. The new cache reads committed rows, not pending write intents.
- Reference block updated at `:557-572`. Engine-sheet still owns the plan's /stub-engine regeneration in the eventual landing commit; no generated map or control-plane change rides this patch.

## H1 — other readers and literal occurrences

**No external code can read these twelve local arrays directly:** their declarations and uses live inside buildEveningFamous_. External consumers read S.famousPeople/S.famousSightings, not ACTORS etc. However, the literal names are also present elsewhere; this patch is not a repo-wide deletion or citizen rename.

Search: case-sensitive fixed substrings, hidden and ignored files included, across every root `phase*/` directory plus `scripts/ lib/ .claude/ docs/`. Needles are all **12 original identifiers + 42 original names** extracted from HEAD's pool block. Command equivalent: `rg --hidden --no-ignore -n -F -f /tmp/engine297-terms.txt phase*/ scripts/ lib/ .claude/ docs/`. **1,865 matching lines in 410 files** in the inspected shared checkout (includes historical docs and concurrent/untracked review artifacts). Appendix A lists **every matching line and its matched terms**, grouped by file; common substrings CIVIC/BUSINESS intentionally include unrelated constants and prose.

Examples requiring distinction:
- `scripts/tierClassifier.js:52`, `scripts/articleContamination.js:141`, `scripts/work-wake-packages.json:7,19`, `scripts/civic-office-map.json:614`: Marcus Webb appears in independent naming/classification/work/office data, not as an imported sighting-pool variable.
- `scripts/integrateCelebrities.js:92-93`: four old names occur in parseCelebName examples; its actual population path reads Cultural_Ledger at `:134,202-238`.
- `phase05-citizens/generateCitizensEvents.js:2821`, `scripts/buildPulseSlice.js:79`, `lib/editionParser.js:438`: literal names are explanatory examples/comments.
- Tests, newsroom fixtures, identity files, and archived editions/research also retain these names; all occurrences are enumerated below. Removing them would exceed scope and could damage canon.
- The new test deliberately retains all 42 names as a forbidden-source assertion; it checks the engine source, not itself (`sportsWeekCity.test.js:414-416`, post-patch).

## H2 — feedback arithmetic and absence of a bound

**Yes, self-reinforcing fame remains unbounded in score.** A sighting re-registers its row (`buildEveningFamous.js:574-579`), writing LastSeenCycle and FameScore = prior + 5 + fameBonus (`culturalLedger.js:432-446`). Repeat same-Cycle registration also accumulates (`:382-389`). Decay subtracts **1 only when cycle − lastSeen > 10**, with positive existing fame (`:71-93`); regular sightings keep resetting that clock. There is no upper clamp here.

Arithmetic for one existing row starting at FameScore **25**, last seen at C0, one sighting each subsequent Cycle, neutral economic mood 50, no holiday/First Friday/Creation Day/sports bonus:

| Cycle offset | 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 |
|---|---|---|---|---|---|---|---|---|---|---|---|
| FameScore | 25 | 30 | 35 | 40 | 45 | 50 | 55 | 60 | 65 | 70 | 75 |
| Decay before sighting | — | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |

That is **+50 over ten Cycles**; +5n indefinitely under these assumptions. With no further sighting, a row last seen at C0 stays at 25 through C10 and first loses 1 at C11. Positive fameBonus increases growth; ordinary econ bonuses are +2 at mood ≥65 or −1 at ≤35 (`culturalLedger.js:243-245`).

This is not proportional FameScore weighting in the new buckets: their reader never reads FameScore, and the unchanged picker deduplicates by name before sampling (`buildEveningFamous.js:410-437`). Repeated concat entries are removed by that deduplication. The existing ≥25 fame bridge still admits Active linked citizens into REAL_PLAYERS/default selection regardless of their category's context (`:247-270`). Thus repeated exposure can maintain/raise fame, and the wider attention loop survives, even though a score of 75 does not itself give three times the picker tickets of 25. No cap, decay change, or new selection rule is introduced.

## H3 — ECL and separate fame seam

**Interfaces and predicates unchanged; later input values can change.** `loadEventContentLedger.js:89-92` still declares numeric fame/string culdomain. `generateCitizensEvents.js:2725-2735` still reads culturalStatusByPop_ and fires on **usageCount ≥8 OR culturalFame ≥25**, with weights 1.15/1.25/1.35 at the existing thresholds. ECL context still receives those values at `:3003-3004`. `culturalLedger.js:98-130` still provides the ≥25 cached map; moving classifyRole does not alter its output.

Phase 5 precedes Phase7-Famous (`godWorldEngine2.js:741,2456`), and fame intents persist at Phase10-ExecuteIntents (`:866,2561`). Different nightly sightings can therefore change **future** FameScore/readback and future ECL/event outcomes after persistence. “Unaffected” means no schema, classifier, threshold, ordering, or usageCount-branch change in this patch, not identical future world trajectories. The separate usageCount ruling remains open under §Open(b).

## H4 — exact sandbox proving seam, not executed

A calendar word alone does not force a rung. `utilities/sportsWeekRecord.js:335-341` maps **S.sportsCity.band = 'high' → playoffs**, **'top' → championship**. A championship lens plus quiet band returns empty; normal band returns regular-season. Phase2-SportsSeason initializes/derives sportsCity (`applySportsSeason.js:31,116`), so a pre-Phase2 injection can be overwritten.

For the engine-sheet **1004-only instrumented build**, inject the desired band immediately inside the Phase7-Famous wrapper at `godWorldEngine2.js:741` (or `:2456` for the replay entry), before buildEveningFamous_. Preserve the other sportsCity fields and restore the original band/object after the famous call. Use two separate fixture fires, band high and band top. This exercises the real sportsRung_ without altering every other engine's sports interpretation. Alternatively, the unit-test seam at `sportsWeekCity.test.js:326` already stubs sportsRung_ to championship; that proves the consumer, not actual band derivation.

A forced rung only admits legends; it does **not** guarantee a legend is randomly selected. For deterministic bench observation, the sandbox-only pickRandomSet_ stub at the builder's pick seam (`buildEveningFamous.js:435-437`) must capture the eligible pool and return one existing ledger-derived legend plus one existing cultural-bucket entry, respecting count and using no invented identity. Assert a nonempty actual legend row and Active cultural category first, observe resulting famousSightings + sighting ripple + registration intents, and verify Phase-10 readback. If either source is absent, report unavailable rather than insert a fallback name. The new fixture runs the real sportsRung_ with band top (`sportsWeekCity.test.js:377,384`, post-patch); existing five legends assertions remain unchanged. **Bench HOLD is not cleared by these unit tests.**

## Verified wiring card

Required read-only engine-wiring Haiku call completed after the restricted-network attempt failed; output was temporary (/tmp/engine297-wiring.md). Relevant pointers were checked directly; the card's unresolved/helper guesses and “orphaned” shorthand are not relied on.

- Definition: `phase07-evening-media/buildEveningFamous.js:45`; callers `phase01-config/godWorldEngine2.js:741,2456`; persistence follows at `:866,2561`.
- Inputs: context at `buildEveningFamous.js:60-80`; shared citizen rows at `:187-272`; cultural status cache at `culturalLedger.js:98-130`; new buckets at post-patch `buildEveningFamous.js:46-84`.
- RNG: `buildEveningFamous.js:54` → `utilities/safeRand.js:28-35`; no Math.random in the changed engine file.
- Selection: `buildEveningFamous.js:281-437`; venue read `:456-476`; ripple `:518-548`; outputs `:558-572`; register `:574-579`.
- Readers: `buildMediaPacket.js:304,431-439`; `mediaFeedbackEngine.js:597-619,662-663`; carry snapshot `phase09-digest/finalizeCycleState.js:363`.
- Writes: new reader queues/writes nothing; existing registration's FameScore intent at `culturalLedger.js:446`, LastSeenCycle at `:434`; existing decay intent at `:89`. No change to executor or schema.

## Validation commands and results

Preparation: two independent `git archive 3bfaa41407179719650ebc6099ed6d696c1c3e03` scratch copies; edited only the work copy with apply_patch; emitted a normal git unified diff. A third fresh archive received the delivered patch. Existing dependencies were reused, none installed.

```text
git apply --check --whitespace=error output/codex/engine297-fame-ledger.patch
# exit 0 against shared HEAD; no application to shared checkout
cd /tmp/engine297-verify
git apply --check --whitespace=error /root/GodWorld/output/codex/engine297-fame-ledger.patch
git apply /root/GodWorld/output/codex/engine297-fame-ledger.patch
node --check phase07-evening-media/buildEveningFamous.js
node --check phase07-evening-media/culturalLedger.js
node --check scripts/sportsWeekCity.test.js
# all exit 0; syntax checks produce no output
GODWORLD_ENV_FILE=/dev/null NODE_PATH=/root/GodWorld/node_modules node scripts/sportsWeekCity.test.js
# output below
```

```text
1. ripple — one per franchise-week, signed
  ok  C110 shape: one SPORTS_WEEK, positive, under 15, city-wide (two away games)
  ok  a home losing playoff week: one negative ripple at the venue
  ok  the word alone (no games) files no sports ripple
  ok  two franchises can each file one (ids differ); the Oaks small week files none under .15
1b. engine.206 — the game-week ripple names the bars the week moved
  ok  home week: the SPORTS_WEEK ripple carries the venue hoods' bars (Jack London + Downtown, not Uptown) and its text names them
  ok  home week: the ledger row is business-scoped with those ids, at the primary venue
  ok  away week: every moved bar (no franchise home) rides the citywide ripple, weighted mean pp
  ok  under .15 (the Oaks' small week): no ripple, so no bars named — one gate both ways
  ok  a carried ripple stays hood-scoped (the bars were named the week it happened)
  ok  no bars moved (S.sportsWeekBars absent): the ripple files hood-scoped with its plain text, as before
2. economy label — one label, one owner (engine.281 (d))
  ok  top + above expectation: stable → booming
  ok  high + above: stable → strong, strong stays
  ok  a bad high week steps strong down one
  ok  a bad week below high moves nothing
  ok  weak and struggling are never lifted
  ok  no week (override / quiet) leaves the label
  ok  drift owns it: applies the week rule, publishes to S.worldPopulation.economy, no championship-word boost
  ok  updateWorldPopulation_ derives no label of its own
  ok  the phase word is not read
3. shock monitor
  ok  no simMonth read
  ok  thresholds keyed on the band
4. venue consumers
  ok  hood writer: a full home week = the old championship mods at the venue
  ok  hood writer: the word with an away week moves no stadium hood
  ok  hood writer: the Oaks at Baylight, scaled by home volume .1
  ok  game night gates on games played (S.sportsWeek g > 0)
  ok  evening: no sportsNeighborhoodEffects read; crowd at the venue by home volume
  ok  crisis: no Jack London/Downtown fallback literal
  ok  bonds: the rivalry hoods are S.sportsZones, not a literal
5. phase-word tests left in the converted numeric files
  ok  no unexpected word test in a converted numeric file
     exempt word tests left: phase05-citizens/bondEngine.js:1207 phase06-analysis/applyShockMonitor.js:142 phase06-analysis/applyShockMonitor.js:146 phase06-analysis/applyShockMonitor.js:323
6. engine.281 (a1) — media, bonds, nightlife, food, migration on the band
  ok  media C110: high band → playoffs payloads (hope .2, buzz .24+.15, trend .35); label stays championship_fever
  ok  media C110: no city sentiment lift below the top band
  ok  media: a top-band LOSING week adds no hope and no sentiment, still the coverage
  ok  media: a top-band winning week under a playoffs lens takes the top payload (hope .3, sentiment +.1)
  ok  media: the championship word with no games moves no number
  ok  media: elevated → late-season payloads (hope .1 on a win, no buzz)
  ok  no numeric payload left under a phase word in the a1 files
  ok  bonds: rivalry heat, new-bond cap and confront threshold read the band
  ok  nightlife: volume +3/+2 and the 3-spot floor on band top/high
  ok  food: stadium-hood lean 3/2/1 and four restaurants on band top/high/elevated
  ok  migration: drift tier from the band, the lede keeps the lens, a Maker override wins
7. engine.281 (a2) — sportsRung_ and the ladder sites
  ok  rung: band top/high/elevated → championship/playoffs/late-season, whatever the lens
  ok  rung: a ruled lens on a normal band is an ordinary game week, on a quiet one no rung (Q1)
  ok  rung: an unruled lens passes through below elevated; no lens reads off-season
  ok  rung: C110 as typed (championship lens, band high) → playoffs
  ok  every a2 file reads the rung once, beside its lens
  ok  no numeric payload left under a lens word test in the a2 files
  ok  season weights: a feed week reads the rung, a Maker-declared season keeps its word
  ok  generic citizens: the stadium-hood weight reads S.sportsZones, not a literal pair
  ok  engine.296: a retired MLB-origin citizen is an A's legend in the championship pool, with its home hood
  ok  engine.296: no hardcoded legend survives (Warriors / Rodriguez / MVP Davis)
  ok  engine.296: an active player the ledger calls a legend is sighted as a legend; other players stay players
  ok  engine.296: a retired NBA row and a traded MLB row are not legends
  ok  engine.296: no retired MLB rows → no legends, no literal fallback
engine.297 — synthetic, non-canon Cultural_Ledger buckets
  ok  engine.297: all twelve Active categories enter their bucket
  ok  engine.297: sightings, registration and ripples use only ledger names
  ok  engine.297: unchanged weighting admits eleven buckets; cultural ATHLETES is not a generic fallback
  ok  engine.297: bucket read is cached per ctx
  ok  engine.297: blank category uses shared classifier and linked current hood
  ok  engine.297: explicit category wins; unlinked uses row hood; inactive is excluded
  ok  engine.297: unresolved POP link does not fall back to stale cultural hood
  ok  engine.297: empty musician bucket contributes no name
  ok  engine.297: empty ledger has no literal fallback
  ok  engine.297: none of the 42 former literal names survives in source

63 passed, 0 failed
```

The focused count is **63/63**, up from **53/53** before this patch (10 new assertions in the same test file). The full suite file count remains **290**; adding assertions does not add test files.

```text
cd /tmp/engine297-work
GODWORLD_LEDGER_FAILS=0 npm test
Running 290 test files (offline default)
...
✗ 7/290 test files failed (146.93s)
  - scripts/cron-civic-tick.test.js
  - scripts/employerSuccess.test.js
  - scripts/fireGuard.test.js
  - scripts/ingestEdition.test.js
  - scripts/notebooklmSourceInventory.test.js
  - scripts/rateEditionCoverage.test.js
  - scripts/undockedMintAccount.test.js
```

**283/290 passed, not 290/290.** All seven failing files were rerun in the unpatched HEAD archive and exited 1 there too (`GODWORLD_ENV_FILE=/dev/null GODWORLD_LEDGER_FAILS=0 NODE_PATH=/root/GodWorld/node_modules node scripts/<file>.test.js`). Their failures are outside the three-file patch:
- cron-civic-tick: “orBatch is importable…” child spawn denied (EPERM).
- fireGuard: subprocess phase-order scan returns no slot-count output.
- ingestEdition: subprocess does not reach its stubbed ingest loop/rerun diagnostics.
- rateEditionCoverage: subprocess resolution checks fail.
- notebooklmSourceInventory: test hardcodes /root/GodWorld/output/codex; scratch returns its own output/codex (`:17`).
- undockedMintAccount: existing-cast-credentials existence assertion fails in a clean archive (`:23`); no credentials copied/read.
- employerSuccess: relative Sheet mock is installed at `:529-540`, but wakePerception uses absolute /root/GodWorld/lib/sheets. The full-run OAuth attempt failed with EAI_AGAIN before any Sheet access. Baseline with env disabled also fails. This is not a successful live or isolation test.

The full run preceded a comment-only apostrophe cleanup; the delivered patch was subsequently applied fresh, syntax-checked, and focused-tested. Selection/output and REAL_PLAYERS/SPORTS_LEGENDS blocks compare byte-for-byte equal to HEAD; the extracted classifier body compares equal after removing its old two-space nesting. No full-suite-green, bench, production or live Sheet claim is made.

## Appendix A — exhaustive H1 hits

Each entry gives the path, then every matching line with the exact search terms found. This is the original shared-checkout search snapshot, not the patched scratch tree. Historical sources are evidence only, never active instructions.

- `.claude/agent-memory/culture-desk/memory_culture-desk.md`: 6 [Muralist Dante Reyes]; 7 [Gallery Owner Mei Chen].
- `.claude/agent-memory/freelance-firebrand/memory_freelance-firebrand.md`: 82 [Marcus Webb]; 86 [Marcus Webb]; 99 [Marcus Webb].
- `.claude/agent-memory/kai-marston/memory_kai-marston.md`: 11 [Muralist Dante Reyes].
- `.claude/agent-memory/letters-desk/memory_letters-desk.md`: 51 [Marcus Webb]; 96 [Marcus Webb].
- `.claude/agent-memory/mayor/memory_mayor.md`: 197 [Marcus Webb].
- `.claude/agent-memory/rhea-morgan/memory_rhea-morgan.md`: 45 [Marcus Webb].
- `.claude/agent-memory/stabilization-fund/memory_stabilization-fund.md`: 95 [Marcus Webb]; 98 [Marcus Webb].
- `.claude/agents/carmen-delaine/IDENTITY.md`: 24 [CIVIC].
- `.claude/agents/city-clerk/RULES.md`: 44 [Marcus Webb]; 113 [Marcus Webb]; 137 [Marcus Webb].
- `.claude/agents/civic-desk/RULES.md`: 9 [CIVIC]; 73 [CIVIC].
- `.claude/agents/civic-office-okoro/IDENTITY.md`: 57 [Marcus Webb].
- `.claude/agents/civic-office-okoro/LENS.md`: 31 [Marcus Webb]; 42 [Marcus Webb].
- `.claude/agents/civic-project-health-center/RULES.md`: 278 [Marcus Webb].
- `.claude/agents/civic-project-stabilization-fund/IDENTITY.md`: 3 [Marcus Webb]; 7 [Marcus Webb].
- `.claude/agents/civic-project-stabilization-fund/LENS.md`: 11 [Marcus Webb]; 19 [Marcus Webb].
- `.claude/agents/civic-project-stabilization-fund/RULES.md`: 90 [Marcus Webb]; 130 [Marcus Webb]; 140 [Marcus Webb]; 156 [Marcus Webb]; 328 [Marcus Webb].
- `.claude/agents/civic-project-stabilization-fund/SKILL.md`: 3 [Marcus Webb].
- `.claude/agents/freelance-firebrand/IDENTITY.md`: 97 [CIVIC].
- `.claude/agents/freelance-firebrand/RULES.md`: 97 [CIVIC].
- `.claude/agents/luis-navarro/IDENTITY.md`: 24 [CIVIC].
- `.claude/hookify.clockmode-media-guard.local.md`: 9 [CIVIC].
- `.claude/hooks/civic-gate-guard.sh`: 80 [CIVIC]; 82 [CIVIC]; 85 [CIVIC]; 86 [CIVIC]; 87 [CIVIC]; 88 [CIVIC].
- `.claude/hooks/pre-compact-hook.sh`: 82 [CIVIC].
- `.claude/skills/city-hall-prep/SKILL.md`: 58 [Marcus Webb].
- `.claude/skills/desk-review/SKILL.md`: 50 [BUSINESS].
- `.claude/skills/dispatch/SKILL.md`: 42 [Marin Tao, Brody Kale]; 185 [BUSINESS]; 195 [BUSINESS].
- `.claude/skills/doc-audit/SKILL.md`: 167 [CIVIC]; 168 [CIVIC]; 169 [CIVIC]; 201 [CIVIC]; 202 [CIVIC].
- `.claude/skills/interview/SKILL.md`: 134 [CIVIC]; 139 [CIVIC]; 245 [BUSINESS].
- `.claude/skills/podcast-desk/SKILL_archive.md`: 71 [CIVIC].
- `.claude/skills/podcast/SKILL.md`: 102 [CIVIC].
- `.claude/skills/post-publish/SKILL.md`: 106 [BUSINESS]; 165 [Marin Tao, Brody Kale]; 169 [Brody Kale]; 190 [BUSINESS]; 192 [BUSINESS]; 267 [BUSINESS]; 271 [BUSINESS]; 285 [BUSINESS]; 564 [BUSINESS]; 586 [Marin Tao, Brody Kale].
- `.claude/skills/sift/SKILL.md`: 228 [CIVIC]; 237 [CIVIC]; 238 [CIVIC]; 244 [CIVIC]; 250 [CIVIC]; 256 [CIVIC]; 278 [CIVIC, BUSINESS]; 281 [CIVIC]; 297 [CIVIC]; 443 [CIVIC]; 445 [BUSINESS]; 462 [CIVIC]; 481 [CIVIC, BUSINESS]; 570 [CIVIC]; 583 [CIVIC].
- `.claude/skills/write-edition/SKILL_archive.md`: 157 [CIVIC]; 158 [BUSINESS].
- `.claude/skills/write-edition/SKILL.md`: 71 [BUSINESS]; 219 [CIVIC, BUSINESS]; 221 [CIVIC]; 228 [CIVIC]; 232 [BUSINESS]; 242 [BUSINESS]; 249 [BUSINESS]; 256 [BUSINESS]; 260 [CIVIC]; 270 [BUSINESS]; 273 [BUSINESS]; 305 [CIVIC].
- `.claude/skills/write-supplemental/SKILL_archive.md`: 189 [CIVIC].
- `.claude/skills/write-supplemental/SKILL.md`: 16 [BUSINESS]; 23 [BUSINESS]; 24 [BUSINESS]; 26 [BUSINESS]; 253 [CIVIC]; 254 [CIVIC]; 405 [BUSINESS]; 421 [BUSINESS]; 444 [BUSINESS]; 448 [BUSINESS]; 461 [BUSINESS]; 463 [BUSINESS]; 473 [BUSINESS].
- `docs/adr/0006-parser-validator-format-contracts.md`: 31 [BUSINESS]; 65 [BUSINESS].
- `docs/adr/0007-cross-layer-canon-authority-precedence.md`: 133 [BUSINESS].
- `docs/archive/AUDIT_TRACKER.md`: 449 [JOURNALISTS]; 471 [Tara Ellison].
- `docs/archive/BRANCH_HANDOFF.md`: 40 [ACTORS]; 201 [CIVIC].
- `docs/archive/CIVIC_INITIATIVE_v1.5_UPGRADE.md`: 16 [CIVIC].
- `docs/archive/for-claude-review/2026-10-15-codex-undocked-spacemolt-crossover.md`: 82 [CIVIC].
- `docs/archive/for-claude-review/2026-10-16-codex-celeste-usage-legends-review-TASK.md`: 11 [ACTORS, MUSICIANS, STREAMERS, AUTHORS, CIVIC, BUSINESS, ARTISTS, CULTURAL_LEADERS, Marcus Webb, Councilwoman Rivera].
- `docs/archive/for-claude-review/2026-10-16-codex-celeste-usage-legends-review.md`: 39 [ACTORS, Lena Cross, Evan Morello, Sage Vienta, Marcus Duval, Nina Reyes]; 40 [MUSICIANS, Rico Valez, Marin Tao, Jade Orion, Theo Banks, Celeste Moon]; 41 [STREAMERS, Pixel Pete, GameGirl Gia, NightOwl Nate]; 42 [AUTHORS, Claire Ashford, Marcus Webb]; 43 [CIVIC, Councilwoman Rivera]; 44 [BUSINESS]; 45 [ARTISTS]; 46 [CULTURAL_LEADERS]; 48 [Sienna Vale, Lumi Crest, Pixel Pete].
- `docs/archive/plans/2026-04-16-phase-40-1-session-log-interface.md`: 142 [CIVIC].
- `docs/archive/plans/2026-04-25-canon-fidelity-rollout.md`: 79 [Marcus Webb]; 263 [Marcus Webb].
- `docs/archive/plans/2026-04-27-world-data-unified-ingest-rebuild.md`: 134 [BUSINESS]; 144 [BUSINESS]; 150 [Marcus Webb]; 353 [Rico Valez, Marin Tao, Dax Monroe]; 354 [Nila James, Tara Ellison]; 358 [BUSINESS]; 368 [Marcus Webb]; 486 [BUSINESS]; 487 [Nila James, Tara Ellison].
- `docs/archive/plans/2026-04-30-bay-tribune-unified-ingest-rebuild.md`: 84 [Marin Tao, Brody Kale]; 243 [Marin Tao, Brody Kale]; 290 [Marin Tao]; 300 [Marin Tao].
- `docs/archive/plans/2026-04-30-dispatch-gap-followups.md`: 34 [Marin Tao, Brody Kale]; 37 [Marin Tao, Brody Kale]; 38 [Marin Tao]; 73 [BUSINESS]; 90 [Marin Tao]; 91 [Marin Tao, Brody Kale]; 100 [Marin Tao, Brody Kale]; 131 [Marin Tao, Brody Kale]; 132 [BUSINESS, Marin Tao]; 140 [BUSINESS]; 142 [BUSINESS]; 151 [BUSINESS]; 160 [Brody Kale]; 161 [Brody Kale]; 163 [Marin Tao]; 167 [Marin Tao]; 168 [Marin Tao]; 171 [Marin Tao]; 172 [Marin Tao]; 188 [Marin Tao, Brody Kale].
- `docs/archive/plans/2026-05-03-c93-gap-triage-execution.md`: 82 [CIVIC, BUSINESS]; 194 [BUSINESS]; 195 [BUSINESS].
- `docs/archive/plans/2026-05-24-canon-3-cross-layer-citizen-drift.md`: 282 [BUSINESS]; 310 [BUSINESS].
- `docs/archive/plans/2026-06-15-story-seed-deck-engine-emergence.md`: 126 [CIVIC]; 231 [CIVIC]; 416 [CIVIC]; 459 [CIVIC]; 461 [CIVIC]; 470 [CIVIC].
- `docs/archive/plans/2026-06-20-c98-gap-log-triage.md`: 83 [Marcus Webb]; 222 [CIVIC].
- `docs/archive/plans/2026-06-21-c99-gap-log-triage.md`: 266 [CIVIC].
- `docs/archive/plans/2026-07-05-c100-gap-log-triage.md`: 68 [CIVIC].
- `docs/archive/plans/2026-07-06-content-ledger-auto-authoring.md`: 102 [CIVIC].
- `docs/archive/plans/2026-07-11-oakland-hospital.md`: 54 [CIVIC].
- `docs/archive/plans/2026-07-20-weather-transit-citizen-coupling.md`: 80 [CIVIC]; 86 [CIVIC]; 133 [CIVIC].
- `docs/archive/plans/2026-08-07-office-holder-position-wall.md`: 26 [CIVIC].
- `docs/archive/plans/2026-08-15-civic-office-lived-packets.md`: 33 [CIVIC].
- `docs/archive/plans/2026-08-21-published-canon-bond-mint.md`: 51 [Claire Ashford]; 125 [Claire Ashford]; 135 [Claire Ashford]; 329 [Claire Ashford]; 337 [Claire Ashford].
- `docs/archive/plans/2026-09-01-education-career-connection.md`: 184 [CIVIC].
- `docs/archive/PROJECT_STATUS.md`: 158 [CIVIC].
- `docs/archive/ROLLOUT_PLAN_backup_S147.md`: 324 [CIVIC].
- `docs/archive/STORY_NARRATIVE_ENHANCEMENT_PLAN.md`: 542 [CIVIC].
- `docs/archive/TIER_7_ROADMAP.md`: 30 [CIVIC]; 31 [CIVIC]; 32 [CIVIC]; 33 [CIVIC]; 304 [CIVIC]; 307 [CIVIC].
- `docs/canon/INSTITUTIONS.md`: 345 [Marin Tao, Brody Kale].
- `docs/concepts/routing-rationale.md`: 83 [CIVIC].
- `docs/EDITION_PIPELINE.md`: 106 [BUSINESS]; 121 [BUSINESS]; 124 [Marin Tao, Brody Kale]; 126 [BUSINESS]; 166 [BUSINESS]; 315 [CIVIC]; 319 [BUSINESS].
- `docs/engine/archive/ENGINE_REPAIR.md`: 53 [CIVIC]; 55 [CIVIC, Rico Valez]; 92 [CIVIC]; 153 [CIVIC].
- `docs/engine/archive/INTAKE_REDESIGN_PLAN.md`: 147 [JOURNALISTS, CIVIC].
- `docs/engine/archive/INTAKE_REDESIGN.md`: 41 [JOURNALISTS]; 83 [Marin Tao].
- `docs/engine/archive/PHASE_24_PLAN.md`: 52 [CIVIC]; 55 [CIVIC]; 96 [CIVIC]; 99 [CIVIC]; 105 [CIVIC]; 180 [CIVIC].
- `docs/engine/archive/phase19_agent_personas.md`: 208 [Marcus Webb].
- `docs/engine/DOCUMENTATION_LEDGER.md`: 130 [Marcus Webb]; 148 [BUSINESS].
- `docs/engine/ENGINE_COUPLING_MAP.md`: 168 [CIVIC]; 191 [CIVIC]; 196 [CIVIC]; 206 [CIVIC, BUSINESS]; 227 [CIVIC]; 298 [CIVIC]; 310 [BUSINESS]; 324 [CIVIC].
- `docs/engine/ENGINE_MAP.md`: 10 [CIVIC]; 11 [BUSINESS]; 16 [BUSINESS]; 17 [CIVIC]; 104 [CIVIC]; 136 [CIVIC]; 333 [CIVIC]; 335 [CIVIC]; 352 [CIVIC]; 353 [CIVIC].
- `docs/engine/EVENT_SYSTEM_MAP.md`: 16 [CIVIC]; 49 [CIVIC]; 53 [CIVIC].
- `docs/engine/LEDGER_AUDIT.md`: 22 [CIVIC]; 58 [CIVIC]; 153 [CIVIC]; 304 [CIVIC]; 535 [Sage Vienta, Dax Monroe, Kato Rivers].
- `docs/engine/LEDGER_HEAT_MAP.md`: 198 [CIVIC]; 376 [CIVIC].
- `docs/engine/LEDGER_REPAIR.md`: 101 [CIVIC]; 155 [CIVIC]; 224 [CIVIC].
- `docs/engine/PHASE_DATA_AUDIT.md`: 313 [CIVIC].
- `docs/engine/ROLLOUT_ARCHIVE.md`: 702 [BUSINESS]; 747 [BUSINESS]; 752 [Marin Tao]; 1216 [BUSINESS]; 1221 [CIVIC]; 1294 [CIVIC]; 1327 [CIVIC]; 1355 [CIVIC]; 1571 [CIVIC]; 1717 [BUSINESS]; 1749 [BUSINESS]; 1757 [BUSINESS]; 1791 [BUSINESS]; 1809 [BUSINESS]; 1927 [BUSINESS].
- `docs/engine/ROLLOUT_PLAN.md`: 98 [Marin Tao]; 113 [Marcus Duval, Nina Reyes, Pixel Pete].
- `docs/engine/SHEETS_MANIFEST.md`: 35 [BUSINESS]; 63 [CIVIC].
- `docs/for-claude-review/2026-10-08-codex-engine286-plan-review-and-proofs.md`: 74 [CIVIC]; 105 [CIVIC]; 171 [CIVIC]; 195 [CIVIC]; 196 [CIVIC]; 205 [CIVIC].
- `docs/for-claude-review/2026-10-08-codex-engine286-read-and-plan.md`: 53 [CIVIC]; 58 [CIVIC]; 60 [CIVIC]; 108 [CIVIC]; 110 [CIVIC]; 114 [CIVIC]; 118 [CIVIC]; 187 [CIVIC]; 195 [CIVIC]; 212 [CIVIC].
- `docs/for-claude-review/2026-10-08-engine286-codex-plan-review-and-proofs-TASK.md`: 20 [CIVIC].
- `docs/for-claude-review/2026-10-09-codex-engine286-task6-civic-role.md`: 29 [CIVIC]; 82 [CIVIC]; 86 [CIVIC].
- `docs/for-claude-review/2026-10-10-codex-engine214-plan-review.md`: 37 [BUSINESS]; 39 [CIVIC, BUSINESS]; 74 [CIVIC].
- `docs/for-claude-review/2026-10-10-codex-engine288-impl-review.md`: 20 [BUSINESS].
- `docs/for-claude-review/2026-10-10-engine288-impl-review-TASK.md`: 7 [BUSINESS].
- `docs/research/2026-10-17-engine297-fame-ledger-impl-TASK.md`: 8 [ACTORS, MUSICIANS, ATHLETES, INFLUENCERS, JOURNALISTS, CHEFS, STREAMERS, AUTHORS, CIVIC, BUSINESS, ARTISTS, CULTURAL_LEADERS]; 9 [ATHLETES].
- `docs/index.md`: 160 [BUSINESS]; 203 [CIVIC]; 237 [CIVIC]; 238 [CIVIC]; 239 [CIVIC]; 283 [CIVIC]; 392 [CIVIC]; 419 [CIVIC].
- `docs/mags-corliss/JOURNAL_RECENT.md`: 770 [BUSINESS].
- `docs/mags-corliss/JOURNAL.md`: 1539 [Sage Vienta, Dax Monroe, Kato Rivers]; 1707 [Marcus Webb]; 2155 [CIVIC]; 4394 [Marin Tao, Brody Kale]; 5003 [Marin Tao, Brody Kale]; 5596 [BUSINESS]; 5778 [CIVIC]; 6770 [BUSINESS].
- `docs/mags-corliss/NEWSROOM_MEMORY.md`: 82 [CIVIC]; 89 [CIVIC, BUSINESS].
- `docs/mags-corliss/SESSION_HISTORY.md`: 15 [BUSINESS]; 80 [BUSINESS]; 87 [Marin Tao, Brody Kale]; 115 [BUSINESS]; 116 [BUSINESS]; 178 [CIVIC, BUSINESS]; 575 [Councilwoman Rivera, Community Director Hayes]; 636 [Community Director Hayes, Gallery Owner Mei Chen]; 750 [CIVIC]; 928 [CIVIC]; 1033 [CIVIC]; 1095 [CIVIC]; 1148 [CIVIC]; 1584 [CIVIC, BUSINESS].
- `docs/mara-vance/AGENT_INVENTORY.md`: 130 [Marcus Webb].
- `docs/mara-vance/AUDIT_TEMPLATE.md`: 189 [CIVIC]; 192 [BUSINESS].
- `docs/mara-vance/CIVIC_GOVERNANCE_MASTER_REFERENCE.md`: 425 [CIVIC]; 426 [CIVIC]; 430 [CIVIC]; 466 [CIVIC].
- `docs/mara-vance/CIVIC_VETO_IMPLEMENTATION.md`: 159 [CIVIC]; 174 [CIVIC]; 187 [CIVIC]; 293 [CIVIC].
- `docs/mara-vance/INITIATIVE_TRACKER_CONTRACT.md`: 14 [CIVIC].
- `docs/mara-vance/INITIATIVE_TRACKER_VOTER_LOGIC.md`: 7 [CIVIC].
- `docs/mara-vance/OPERATING_MANUAL.md`: 434 [CIVIC]; 437 [BUSINESS].
- `docs/mara-vance/README.md`: 10 [CIVIC]; 25 [CIVIC]; 26 [CIVIC]; 28 [CIVIC]; 54 [CIVIC]; 67 [CIVIC].
- `docs/media/AGENT_NEWSROOM.md`: 156 [Marcus Webb].
- `docs/media/ARTICLE_INDEX_BY_POPID.md`: 1294 [Nina Reyes]; 1844 [Evan Morello]; 1852 [Marin Tao]; 1866 [Nila James]; 1871 [Lena Cross]; 1882 [Jade Orion]; 1895 [Theo Banks]; 1904 [Nina Reyes]; 1906 [Nina Reyes]; 1909 [Derek Obi]; 1913 [Jordan Steele]; 1917 [Rowan Pierce]; 1922 [Tara Ellison]; 2065 [Rico Valez]; 2513 [Dax Monroe]; 2519 [Kato Rivers]; 2524 [Sage Vienta].
- `docs/media/brief_template_v2_exemplar.md`: 30 [CIVIC, BUSINESS]; 177 [CIVIC, BUSINESS].
- `docs/media/brief_template_v2.md`: 133 [CIVIC]; 135 [BUSINESS]; 243 [CIVIC]; 267 [CIVIC].
- `docs/media/citizen_selection.md`: 123 [BUSINESS].
- `docs/media/CITIZENS_BY_ARTICLE.md`: 63 [Lena Cross]; 263 [Nila James]; 391 [Jade Orion]; 437 [Dax Monroe]; 454 [Lena Cross]; 455 [Jade Orion]; 561 [Lena Cross]; 562 [Celeste Moon]; 563 [Jade Orion]; 651 [Lena Cross]; 745 [Dax Monroe]; 746 [Lena Cross]; 747 [Nila James]; 748 [Nina Reyes]; 883 [Lena Cross]; 925 [CIVIC]; 930 [CIVIC]; 949 [Lena Cross]; 1100 [JOURNALISTS]; 1112 [Nila James]; 1174 [Lena Cross]; 1188 [Nila James]; 1426 [Lena Cross]; 1555 [Lena Cross]; 1560 [Lena Cross]; 1565 [Lena Cross]; 1571 [Lena Cross]; 1625 [Lena Cross]; 1685 [Lena Cross]; 1694 [Lena Cross]; 1726 [Lena Cross]; 1799 [Lena Cross]; 1806 [Lena Cross]; 1912 [Lena Cross]; 1922 [Lena Cross]; 1982 [Jade Orion]; 2009 [Celeste Moon]; 2291 [Lena Cross]; 2320 [Nila James]; 2329 [Nina Reyes]; 2405 [Jade Orion]; 2418 [Lena Cross]; 2460 [Lena Cross]; 2639 [Lena Cross]; 2659 [Lena Cross].
- `docs/media/DESK_PACKET_PIPELINE.md`: 126 [CIVIC]; 309 [CIVIC, BUSINESS].
- `docs/media/dispatch_schema.md`: 104 [CIVIC, BUSINESS]; 119 [CIVIC]; 145 [CIVIC]; 238 [CIVIC].
- `docs/media/DRIVE_MANIFEST.md`: 30 [CIVIC]; 33 [CIVIC]; 129 [JOURNALISTS]; 349 [BUSINESS]; 353 [BUSINESS]; 354 [BUSINESS]; 356 [BUSINESS]; 359 [BUSINESS]; 362 [BUSINESS].
- `docs/media/EDITION_FORMAT_TEMPLATE.txt`: 42 [CIVIC]; 72 [BUSINESS]; 120 [BUSINESS]; 139 [CIVIC]; 148 [CIVIC]; 155 [BUSINESS].
- `docs/media/examples/dispatch_c94_worked_example.json`: 31 [CIVIC]; 48 [CIVIC]; 142 [CIVIC].
- `docs/media/examples/dispatch_canonical_example.json`: 31 [CIVIC]; 74 [CIVIC].
- `docs/media/MEDIA_INTAKE_V2.2_HANDOFF.md`: 112 [CIVIC]; 114 [JOURNALISTS]; 124 [CIVIC]; 141 [CIVIC]; 149 [JOURNALISTS]; 167 [CIVIC].
- `docs/media/MEDIA_ROOM_HANDOFF.md`: 92 [CIVIC]; 318 [CIVIC]; 362 [CIVIC]; 365 [JOURNALISTS].
- `docs/media/MEDIA_ROOM_STYLE_GUIDE.md`: 383 [Theo Banks]; 384 [Evan Morello]; 385 [Marin Tao]; 386 [Kato Rivers]; 387 [Dax Monroe]; 388 [Rico Valez]; 389 [Lena Cross]; 390 [Sage Vienta]; 391 [Nila James]; 392 [Jade Orion]; 393 [Rowan Pierce]; 394 [Tara Ellison].
- `docs/media/production_log_template.md`: 276 [CIVIC, BUSINESS].
- `docs/media/sift_triage_vocabulary.md`: 67 [CIVIC].
- `docs/media/TIME_CANON_ADDENDUM.md`: 70 [Kato Rivers]; 73 [Kato Rivers]; 101 [CIVIC]; 106 [BUSINESS].
- `docs/plans/2026-04-26-non-edition-publishing-pipeline.md`: 192 [BUSINESS].
- `docs/plans/2026-05-07-engine-routing-foundation.md`: 98 [CIVIC]; 100 [BUSINESS]; 153 [CIVIC]; 217 [CIVIC]; 439 [BUSINESS]; 545 [CIVIC].
- `docs/plans/2026-05-22-c94-gap-log-triage.md`: 198 [BUSINESS]; 289 [BUSINESS].
- `docs/plans/2026-05-22-sift-v2.md`: 83 [CIVIC, BUSINESS]; 86 [CIVIC, BUSINESS]; 177 [CIVIC, BUSINESS]; 178 [CIVIC]; 207 [CIVIC, BUSINESS]; 270 [CIVIC, BUSINESS].
- `docs/plans/2026-05-30-citizen-lifecycle-fame-system.md`: 34 [CIVIC]; 46 [CIVIC]; 53 [CIVIC]; 55 [CIVIC]; 68 [CIVIC]; 88 [CIVIC]; 89 [CIVIC]; 115 [Dax Monroe]; 129 [CIVIC]; 136 [CIVIC]; 141 [CIVIC]; 151 [CIVIC].
- `docs/plans/2026-05-31-life-event-generation.md`: 82 [CIVIC]; 86 [CIVIC]; 101 [CIVIC].
- `docs/plans/2026-06-16-tier1-character-voice-agents.md`: 54 [CIVIC].
- `docs/plans/2026-06-19-living-city-full-population-coverage.md`: 209 [CIVIC].
- `docs/plans/2026-06-21-tier1-dial-essence-backfill.md`: 118 [CIVIC, Marcus Webb].
- `docs/plans/2026-06-24-engine-output-canon-coverage.md`: 50 [BUSINESS].
- `docs/plans/2026-06-29-citizen-signal-detector-build.md`: 127 [CIVIC]; 149 [CIVIC].
- `docs/plans/2026-06-30-central-generator-atmospheric-expansion.md`: 44 [CIVIC]; 51 [CIVIC]; 88 [CIVIC]; 108 [CIVIC]; 142 [CIVIC]; 143 [CIVIC].
- `docs/plans/2026-07-03-sift-deep-dispatch-reconcile.md`: 51 [CIVIC].
- `docs/plans/2026-07-12-entity-protagonism.md`: 98 [BUSINESS].
- `docs/plans/2026-07-18-event-pools-design.md`: 62 [Claire Ashford]; 207 [CIVIC]; 251 [CIVIC]; 252 [CIVIC].
- `docs/plans/2026-07-20-headless-newsroom-pipeline.md`: 375 [CIVIC].
- `docs/plans/2026-07-27-employment-living-system.md`: 136 [BUSINESS].
- `docs/plans/2026-07-31-citizen-memory-perception.md`: 159 [CIVIC]; 192 [CIVIC]; 194 [CIVIC]; 200 [CIVIC]; 201 [CIVIC]; 291 [CIVIC]; 292 [CIVIC]; 293 [CIVIC]; 296 [CIVIC]; 298 [CIVIC]; 304 [CIVIC]; 306 [CIVIC]; 309 [CIVIC]; 310 [CIVIC].
- `docs/plans/2026-08-04-newsroom-canon-flow.md`: 39 [BUSINESS].
- `docs/plans/2026-08-07-civic-solo-seats.md`: 27 [CIVIC]; 28 [CIVIC].
- `docs/plans/2026-08-07-spacemolt-game-show.md`: 275 [Theo Banks]; 276 [Celeste Moon]; 277 [Councilwoman Rivera]; 286 [Claire Ashford].
- `docs/plans/2026-08-09-three-wake-lived-packet-pilot.md`: 38 [CIVIC]; 364 [CIVIC]; 756 [CIVIC].
- `docs/plans/2026-08-16-new-life-intake.md`: 171 [Lumi Crest]; 189 [Councilwoman Rivera]; 209 [Lumi Crest]; 211 [Councilwoman Rivera].
- `docs/plans/2026-08-17-ledger-trueup-sweep.md`: 72 [CIVIC].
- `docs/plans/2026-08-20-s344-human-story-template-pressure-test.md`: 246 [BUSINESS].
- `docs/plans/2026-08-21-citizen-archive.md`: 184 [BUSINESS].
- `docs/plans/2026-08-29-employment-system-cascade.md`: 74 [CIVIC]; 78 [CIVIC]; 86 [CIVIC]; 92 [CIVIC]; 95 [CIVIC]; 137 [CIVIC]; 327 [CIVIC]; 336 [CIVIC].
- `docs/plans/2026-08-30-hood-identity-remainder-plan.md`: 36 [BUSINESS].
- `docs/plans/2026-08-31-c105-chase-sessions.md`: 119 [CIVIC]; 266 [CIVIC]; 285 [CIVIC]; 292 [CIVIC]; 320 [CIVIC]; 356 [CIVIC].
- `docs/plans/2026-09-02-bloodline-ascent.md`: 142 [Jade Orion]; 161 [CIVIC]; 432 [CIVIC]; 434 [CIVIC]; 435 [CIVIC].
- `docs/plans/2026-09-07-beat-slices-from-sheets-plan.md`: 92 [CIVIC]; 395 [Marcus Webb]; 404 [Marcus Webb]; 405 [Marcus Webb]; 406 [Jade Orion, Theo Banks]; 475 [CIVIC]; 479 [BUSINESS]; 485 [CIVIC].
- `docs/plans/2026-09-10-inactivity-is-regression.md`: 406 [BUSINESS].
- `docs/plans/2026-09-11-sports-as-a-lived-system.md`: 460 [BUSINESS]; 461 [CIVIC]; 473 [CIVIC]; 482 [CIVIC]; 483 [CIVIC]; 486 [CIVIC].
- `docs/plans/2026-09-13-run-cycle-packages-the-world.md`: 72 [Rico Valez, GameGirl Gia]; 162 [CIVIC]; 219 [CIVIC, BUSINESS]; 256 [CIVIC, BUSINESS]; 258 [BUSINESS]; 264 [CIVIC, BUSINESS]; 266 [BUSINESS]; 272 [BUSINESS].
- `docs/plans/2026-09-19-civic-wake-game-loop.md`: 32 [CIVIC]; 249 [CIVIC]; 565 [CIVIC].
- `docs/plans/2026-09-21-care-and-justice-system.md`: 735 [BUSINESS]; 767 [BUSINESS]; 777 [CIVIC]; 781 [BUSINESS]; 1248 [CIVIC]; 1252 [CIVIC]; 1292 [CIVIC]; 1294 [CIVIC]; 1341 [CIVIC]; 1391 [CIVIC]; 1400 [CIVIC]; 1403 [CIVIC].
- `docs/plans/2026-09-21-civic-sunday-stage-machine.md`: 14 [CIVIC].
- `docs/plans/2026-09-22-initiative-budget-disbursement.md`: 14 [CIVIC]; 172 [CIVIC].
- `docs/plans/2026-09-24-initiatives-in-the-world.md`: 62 [CIVIC].
- `docs/plans/2026-09-26-future-build-ideas.md`: 186 [CIVIC].
- `docs/plans/2026-10-03-citizen-pages-drive-canon.md`: 51 [Jade Orion].
- `docs/plans/2026-10-08-engine-286-game-of-life-events.md`: 70 [CIVIC]; 160 [CIVIC]; 204 [CIVIC]; 278 [CIVIC].
- `docs/plans/2026-10-10-engine-214-mood-per-hood.md`: 40 [CIVIC, BUSINESS]; 124 [CIVIC, BUSINESS]; 152 [BUSINESS]; 157 [BUSINESS]; 158 [BUSINESS].
- `docs/plans/2026-10-11-media-extension.md`: 54 [CIVIC]; 273 [CIVIC]; 334 [Lena Cross, Marin Tao, Rowan Pierce]; 340 [CIVIC]; 370 [CIVIC]; 457 [Tara Ellison]; 458 [Tara Ellison]; 463 [Lena Cross]; 464 [Lena Cross]; 475 [Marin Tao]; 476 [Marin Tao]; 490 [Lena Cross, Rico Valez, Marin Tao, Rowan Pierce]; 498 [Marin Tao].
- `docs/plans/2026-10-16-celeste-dead-slice-legends-and-interview-guards.md`: 9 [Marin Tao, Dax Monroe]; 34 [Marin Tao, Dax Monroe]; 60 [Marin Tao]; 61 [ACTORS, MUSICIANS, ATHLETES, INFLUENCERS, JOURNALISTS, CHEFS, STREAMERS, AUTHORS, CIVIC, BUSINESS, ARTISTS, CULTURAL_LEADERS]; 70 [Sienna Vale, Lumi Crest, Pixel Pete].
- `docs/PRODUCT_VISION_GRILLME.md`: 37 [CIVIC].
- `docs/PRODUCT_VISION.md`: 18 [CIVIC].
- `docs/reference/DEPLOY_HISTORY.md`: 241 [CIVIC]; 243 [CIVIC]; 272 [CIVIC]; 280 [CIVIC]; 296 [CIVIC]; 306 [CIVIC]; 408 [CIVIC]; 612 [BUSINESS]; 614 [BUSINESS]; 621 [BUSINESS]; 622 [CIVIC]; 630 [BUSINESS]; 647 [BUSINESS]; 684 [CIVIC, BUSINESS]; 686 [CIVIC]; 902 [CIVIC]; 939 [CIVIC].
- `docs/reference/GODWORLD_REFERENCE.md`: 64 [CIVIC]; 222 [CIVIC].
- `docs/RESEARCH.md`: 16 [CIVIC]; 601 [Marcus Webb].
- `docs/research/2026-06-01-initiative-tracker-state.md`: 14 [CIVIC].
- `docs/research/2026-06-29-citizen-event-depth-audit.md`: 30 [CIVIC]; 42 [CIVIC].
- `docs/research/2026-07-07-simulation-narrative-open-items.md`: 65 [BUSINESS].
- `docs/research/2026-07-11-desk-slice-fork.md`: 93 [BUSINESS].
- `docs/research/2026-08-07-voice-project-agents-social-wall-review.md`: 90 [Marcus Webb]; 101 [CIVIC]; 102 [CIVIC]; 146 [CIVIC]; 197 [CIVIC]; 198 [CIVIC].
- `docs/research/2026-08-14-civic-seat-change-election.md`: 17 [CIVIC]; 147 [CIVIC]; 171 [CIVIC]; 177 [CIVIC].
- `docs/research/2026-08-16-sunday-city-hall-invite.md`: 45 [CIVIC]; 68 [Marcus Webb].
- `docs/research/2026-08-30-education-system.md`: 95 [CIVIC].
- `docs/research/2026-09-10-kimi-business-lane-lifecycle.md`: 19 [BUSINESS]; 40 [BUSINESS]; 56 [BUSINESS]; 77 [BUSINESS].
- `docs/research/2026-09-13-approval-polls-interviews.md`: 48 [CIVIC].
- `docs/research/2026-09-15-kimi-civic-lane.md`: 33 [CIVIC]; 35 [CIVIC]; 44 [CIVIC]; 50 [CIVIC]; 59 [CIVIC]; 86 [CIVIC].
- `docs/research/2026-09-15-kimi-sports-lane.md`: 72 [CIVIC].
- `docs/research/2026-09-19-kimi-initiative-stage-voting-and-wake-incentives.md`: 124 [CIVIC].
- `docs/research/2026-09-21-batch-cost-and-model-variety.md`: 17 [CIVIC].
- `docs/research/2026-09-21-batch-inference-options.md`: 16 [CIVIC].
- `docs/research/2026-09-21-codex-civic38-stall-clock-review.md`: 122 [CIVIC].
- `docs/research/2026-09-30-kimi-task6-cut.md`: 38 [CIVIC]; 50 [CIVIC].
- `docs/research/2026-09-30-kimi-task6b-diff.md`: 66 [CIVIC].
- `docs/research/2026-10-01-kimi-sourcing-modes-civis-journal-review.md`: 55 [CIVIC]; 100 [CIVIC]; 154 [CIVIC].
- `docs/research/2026-10-02-agy-task10-slices-diff.md`: 36 [CIVIC].
- `docs/research/2026-10-02-engine-208-fandom-dial-read-before.md`: 52 [CIVIC].
- `docs/research/2026-10-03-agy-pulse-c109-recount.md`: 15 [Marin Tao]; 16 [Rico Valez]; 17 [Lena Cross]; 18 [Dax Monroe]; 19 [Sage Vienta].
- `docs/research/2026-10-03-kimi-pipeline70-diff-review.md`: 48 [Lena Cross].
- `docs/research/2026-10-04-codex-engine206-card-review.md`: 39 [CIVIC].
- `docs/research/2026-10-04-codex-engine94-b3-reseam-review.md`: 24 [CIVIC]; 47 [CIVIC].
- `docs/research/2026-10-04-codex-engine94-b3-v2-review.md`: 22 [CIVIC]; 32 [CIVIC].
- `docs/research/2026-10-08-codex-engine94-b3-v3-diff-review.md`: 77 [CIVIC].
- `docs/research/2026-10-08-engine-286-event-engines-read-before.md`: 29 [CIVIC]; 55 [CIVIC].
- `docs/research/2026-10-11-engine286-task2-impl-review-TASK.md`: 7 [CIVIC].
- `docs/research/ripple-traces/crime-chaos.md`: 72 [BUSINESS].
- `docs/research/ripple-traces/economy.md`: 29 [BUSINESS]; 31 [BUSINESS]; 89 [BUSINESS].
- `docs/research/sift_v2_dryrun_c94.md`: 57 [CIVIC].
- `docs/SIMULATION_LEDGER.md`: 29 [CIVIC]; 130 [CIVIC]; 196 [CIVIC].
- `docs/WORKFLOWS.md`: 71 [CIVIC].
- `lib/editionParser.js`: 43 [BUSINESS]; 438 [Marin Tao].
- `lib/editionParser.test.js`: 50 [CIVIC].
- `lib/initiativePhaseContract.js`: 413 [CIVIC].
- `lib/initiativePhaseContract.test.js`: 71 [CIVIC]; 78 [CIVIC]; 112 [CIVIC]; 174 [CIVIC]; 175 [CIVIC]; 176 [CIVIC]; 255 [CIVIC]; 259 [CIVIC]; 301 [CIVIC]; 679 [CIVIC]; 687 [CIVIC]; 690 [CIVIC]; 693 [CIVIC]; 695 [CIVIC].
- `phase01-config/engine94SheetContract.js`: 136 [CIVIC]; 631 [CIVIC]; 700 [CIVIC]; 701 [CIVIC]; 725 [CIVIC]; 738 [CIVIC]; 739 [CIVIC]; 745 [CIVIC].
- `phase01-config/godWorldEngine2.js`: 1345 [CIVIC].
- `phase02-world-state/applyCityDynamics.js`: 1183 [BUSINESS]; 1185 [CIVIC]; 1196 [BUSINESS].
- `phase02-world-state/applyEditionCoverageEffects.js`: 124 [CIVIC]; 304 [CIVIC]; 305 [CIVIC]; 310 [CIVIC]; 350 [CIVIC].
- `phase02-world-state/applyInitiativeImplementationEffects.js`: 144 [CIVIC]; 180 [CIVIC].
- `phase02-world-state/calendarChaosWeights.js`: 42 [BUSINESS]; 48 [CIVIC]; 83 [CIVIC]; 102 [CIVIC]; 124 [CIVIC]; 138 [CIVIC]; 152 [BUSINESS]; 187 [BUSINESS]; 195 [BUSINESS]; 225 [BUSINESS]; 233 [BUSINESS]; 240 [BUSINESS]; 298 [BUSINESS]; 304 [BUSINESS]; 308 [CIVIC]; 365 [BUSINESS]; 371 [CIVIC].
- `phase02-world-state/calendarStorySeeds.js`: 72 [CIVIC]; 88 [CIVIC]; 121 [CIVIC]; 237 [CIVIC]; 326 [CIVIC]; 357 [CIVIC].
- `phase02-world-state/updateTransitMetrics.js`: 68 [ACTORS]; 536 [CIVIC]; 649 [ACTORS]; 730 [ACTORS]; 801 [ACTORS]; 815 [ACTORS]; 916 [ACTORS]; 935 [ACTORS].
- `phase03-population/deriveDemographicDrift.js`: 79 [ACTORS]; 149 [ACTORS]; 310 [ACTORS].
- `phase03-population/generateCrisisBuckets.js`: 136 [CIVIC]; 173 [CIVIC]; 336 [CIVIC]; 533 [CIVIC].
- `phase03-population/generateCrisisSpikes.js`: 38 [CIVIC]; 158 [CIVIC]; 243 [CIVIC]; 435 [CIVIC]; 446 [CIVIC].
- `phase03-population/updateCrimeMetrics.js`: 46 [ACTORS]; 389 [ACTORS]; 497 [ACTORS]; 498 [ACTORS]; 525 [ACTORS]; 526 [ACTORS]; 558 [ACTORS]; 559 [ACTORS]; 563 [ACTORS]; 574 [ACTORS]; 575 [ACTORS]; 582 [ACTORS]; 604 [ACTORS]; 615 [ACTORS]; 632 [ACTORS].
- `phase04-events/chaosCarsEngine.js`: 585 [CIVIC]; 1124 [BUSINESS]; 1125 [BUSINESS]; 1135 [BUSINESS].
- `phase04-events/chaosCarsEngine.test.js`: 239 [BUSINESS]; 240 [BUSINESS].
- `phase04-events/generationalEventsEngine.js`: 500 [CIVIC]; 502 [CIVIC].
- `phase04-events/worldEventsEngine.js`: 103 [BUSINESS]; 109 [CIVIC]; 110 [CIVIC]; 113 [CIVIC]; 114 [CIVIC]; 189 [CIVIC].
- `phase05-citizens/applyBusinessDynamics.js`: 660 [BUSINESS]; 666 [BUSINESS].
- `phase05-citizens/applyNamedCitizenSpotlight.js`: 115 [CIVIC].
- `phase05-citizens/civicInitiativeEngine.js`: 707 [CIVIC]; 2838 [CIVIC]; 2839 [CIVIC]; 2877 [CIVIC]; 2878 [CIVIC]; 3002 [AUTHORS]; 3272 [CIVIC]; 3716 [CIVIC]; 3958 [CIVIC]; 3964 [CIVIC]; 3965 [CIVIC]; 3966 [CIVIC]; 3971 [CIVIC]; 4005 [CIVIC]; 4007 [CIVIC]; 4029 [CIVIC]; 4050 [CIVIC]; 4065 [CIVIC]; 4075 [CIVIC]; 4190 [CIVIC]; 4296 [CIVIC]; 4357 [CIVIC].
- `phase05-citizens/educationCareerEngine.js`: 413 [CIVIC]; 415 [CIVIC]; 418 [CIVIC]; 539 [CIVIC]; 632 [BUSINESS].
- `phase05-citizens/generateCitizensEvents.js`: 2363 [CIVIC]; 2365 [CIVIC]; 2688 [CIVIC]; 2821 [Marcus Webb].
- `phase05-citizens/generateCivicModeEvents.js`: 5 [CIVIC]; 6 [CIVIC]; 10 [CIVIC]; 98 [CIVIC]; 103 [CIVIC]; 397 [CIVIC]; 483 [CIVIC]; 521 [CIVIC].
- `phase05-citizens/generationalWealthEngine.js`: 614 [CIVIC]; 785 [CIVIC]; 839 [BUSINESS]; 997 [CIVIC]; 1015 [CIVIC]; 1180 [CIVIC]; 1828 [BUSINESS]; 1943 [BUSINESS]; 1958 [CIVIC]; 1966 [CIVIC]; 1973 [CIVIC]; 3249 [BUSINESS].
- `phase05-citizens/processAdvancementIntake.js`: 874 [CIVIC]; 1071 [CIVIC]; 1107 [CIVIC]; 1115 [CIVIC]; 1306 [CIVIC]; 1430 [CIVIC]; 2177 [BUSINESS]; 2179 [BUSINESS].
- `phase05-citizens/runCareerEngine.js`: 95 [BUSINESS]; 109 [CIVIC]; 374 [CIVIC]; 1492 [BUSINESS]; 1736 [BUSINESS].
- `phase05-citizens/runCivicRoleEngine.js`: 41 [CIVIC]; 50 [CIVIC]; 51 [CIVIC]; 52 [CIVIC]; 53 [CIVIC]; 57 [CIVIC]; 131 [CIVIC]; 136 [CIVIC]; 137 [CIVIC]; 184 [CIVIC]; 185 [CIVIC]; 186 [CIVIC]; 187 [CIVIC]; 309 [CIVIC]; 310 [CIVIC]; 402 [CIVIC]; 444 [CIVIC]; 482 [CIVIC]; 483 [CIVIC].
- `phase05-citizens/updateCivicApprovalRatings.js`: 272 [CIVIC]; 282 [CIVIC]; 395 [CIVIC]; 626 [CIVIC]; 627 [CIVIC]; 662 [CIVIC]; 663 [CIVIC]; 856 [CIVIC]; 857 [CIVIC]; 927 [CIVIC]; 928 [CIVIC]; 974 [CIVIC]; 975 [CIVIC]; 1180 [CIVIC]; 1448 [CIVIC]; 1518 [CIVIC]; 1614 [CIVIC].
- `phase06-analysis/applyCivicLoadIndicator.js`: 255 [CIVIC]; 358 [CIVIC]; 421 [CIVIC].
- `phase06-analysis/applyShockMonitor.js`: 269 [CIVIC].
- `phase06-analysis/economicRippleEngine.js`: 11 [BUSINESS]; 54 [BUSINESS]; 88 [BUSINESS]; 89 [BUSINESS]; 402 [BUSINESS]; 407 [BUSINESS]; 586 [BUSINESS]; 598 [CIVIC]; 612 [BUSINESS]; 613 [BUSINESS]; 646 [CIVIC]; 650 [CIVIC, BUSINESS]; 660 [BUSINESS]; 661 [CIVIC]; 668 [BUSINESS]; 672 [BUSINESS]; 673 [CIVIC]; 674 [BUSINESS]; 675 [BUSINESS]; 1077 [BUSINESS]; 1101 [BUSINESS]; 1102 [BUSINESS]; 1180 [BUSINESS]; 1184 [BUSINESS]; 1185 [BUSINESS].
- `phase06-analysis/prePublicationValidation.js`: 393 [CIVIC].
- `phase06-analysis/prioritizeEvents.js`: 101 [CIVIC]; 171 [CIVIC]; 410 [CIVIC].
- `phase07-evening-media/applyStorySeeds.js`: 97 [CIVIC, BUSINESS]; 329 [CIVIC]; 333 [BUSINESS]; 455 [CIVIC]; 457 [BUSINESS]; 606 [CIVIC]; 613 [BUSINESS]; 614 [CIVIC]; 631 [BUSINESS]; 720 [BUSINESS]; 796 [CIVIC]; 803 [CIVIC]; 812 [CIVIC]; 831 [CIVIC]; 836 [CIVIC]; 879 [CIVIC]; 910 [CIVIC]; 936 [CIVIC]; 973 [CIVIC]; 979 [CIVIC]; 986 [CIVIC]; 1084 [CIVIC]; 1089 [CIVIC]; 1100 [BUSINESS]; 1107 [BUSINESS]; 1114 [BUSINESS]; 1147 [BUSINESS]; 1353 [BUSINESS]; 1357 [BUSINESS]; 1565 [CIVIC]; 1569 [CIVIC]; 1571 [BUSINESS]; 1572 [BUSINESS]; 1605 [CIVIC]; 1607 [CIVIC]; 1625 [CIVIC].
- `phase07-evening-media/buildContractSeeds.js`: 35 [CIVIC]; 53 [CIVIC]; 62 [CIVIC]; 239 [CIVIC].
- `phase07-evening-media/buildContractSeeds.test.js`: 96 [CIVIC]; 197 [CIVIC]; 208 [CIVIC]; 212 [CIVIC].
- `phase07-evening-media/buildEveningFamous.js`: 16 [ATHLETES]; 92 [ACTORS]; 93 [Lena Cross]; 94 [Evan Morello]; 95 [Sage Vienta]; 96 [Marcus Duval]; 97 [Nina Reyes]; 100 [MUSICIANS]; 101 [Rico Valez]; 102 [Marin Tao]; 103 [Jade Orion]; 104 [Theo Banks]; 105 [Celeste Moon]; 108 [ATHLETES]; 109 [Dax Monroe]; 110 [Kato Rivers]; 111 [Nila James]; 112 [Jordan Steele]; 113 [Malik Torres]; 116 [INFLUENCERS]; 117 [Sienna Vale]; 118 [Brody Kale]; 119 [Lumi Crest]; 120 [Zara Kim]; 123 [JOURNALISTS]; 124 [Tara Ellison]; 125 [Rowan Pierce]; 126 [Derek Obi]; 129 [CHEFS]; 130 [Carmen Dreel]; 131 [Mason Tril]; 132 [Sofia Nguyen]; 135 [STREAMERS]; 136 [Pixel Pete]; 137 [GameGirl Gia]; 138 [NightOwl Nate]; 141 [AUTHORS]; 142 [Claire Ashford]; 143 [Marcus Webb]; 146 [CIVIC]; 147 [Councilwoman Rivera]; 148 [Advocate Simmons]; 149 [Community Director Hayes]; 152 [BUSINESS]; 153 [Tech CEO Warren]; 154 [Venture Kate Lin]; 161 [ARTISTS]; 162 [Gallery Owner Mei Chen]; 163 [Muralist Dante Reyes]; 164 [Sculptor Alma Vasquez]; 165 [Photographer Kai Tanaka]; 168 [CULTURAL_LEADERS]; 169 [Heritage Director Rosa Martinez]; 170 [Festival Organizer James Williams]; 171 [Cultural Ambassador Li Wei]; 182 [ATHLETES]; 183 [ATHLETES]; 275 [ATHLETES]; 284 [ACTORS, MUSICIANS]; 301 [CHEFS]; 307 [ACTORS, MUSICIANS, INFLUENCERS]; 312 [ACTORS, MUSICIANS]; 319 [ARTISTS]; 320 [MUSICIANS, INFLUENCERS]; 327 [AUTHORS, CIVIC, CULTURAL_LEADERS]; 345 [MUSICIANS, AUTHORS, ARTISTS]; 352 [CIVIC, CULTURAL_LEADERS]; 359 [JOURNALISTS]; 366 [MUSICIANS, INFLUENCERS, STREAMERS]; 369 [ACTORS, JOURNALISTS, CIVIC]; 383 [ACTORS, MUSICIANS, STREAMERS]; 387 [INFLUENCERS]; 394 [CHEFS, BUSINESS]; 397 [JOURNALISTS, CIVIC]; 404 [INFLUENCERS]; 407 [ACTORS, AUTHORS]; 591 [ACTORS, MUSICIANS, ATHLETES]; 593 [INFLUENCERS, JOURNALISTS, CHEFS]; 594 [STREAMERS, AUTHORS, CIVIC, BUSINESS]; 595 [ARTISTS]; 596 [CULTURAL_LEADERS]; 602 [ATHLETES]; 610 [CIVIC, CULTURAL_LEADERS]; 611 [CHEFS]; 612 [ACTORS, MUSICIANS, INFLUENCERS]; 613 [MUSICIANS, INFLUENCERS, ARTISTS]; 614 [AUTHORS, CIVIC, CULTURAL_LEADERS]; 615 [ATHLETES]; 616 [ATHLETES]; 617 [MUSICIANS, AUTHORS, ARTISTS]; 618 [CIVIC, CULTURAL_LEADERS].
- `phase07-evening-media/culturalLedger.js`: 611 [ACTORS, MUSICIANS].
- `phase07-evening-media/domainTracker.js`: 63 [CIVIC]; 64 [CIVIC]; 65 [CIVIC]; 66 [CIVIC]; 89 [BUSINESS]; 90 [BUSINESS]; 164 [CIVIC]; 213 [CIVIC]; 216 [CIVIC]; 294 [CIVIC]; 295 [BUSINESS]; 308 [CIVIC].
- `phase07-evening-media/mediaFeedbackEngine.js`: 367 [CIVIC]; 373 [BUSINESS].
- `phase07-evening-media/mediaRoomIntake.js`: 856 [CIVIC]; 858 [JOURNALISTS]; 926 [CIVIC]; 938 [JOURNALISTS]; 1329 [CIVIC]; 1335 [JOURNALISTS].
- `phase07-evening-media/parseMediaRoomMarkdown.js`: 248 [CIVIC]; 251 [JOURNALISTS]; 417 [CIVIC].
- `phase07-evening-media/storyHook.js`: 106 [CIVIC]; 109 [BUSINESS]; 112 [CIVIC]; 113 [CIVIC]; 119 [BUSINESS]; 175 [CIVIC]; 179 [BUSINESS]; 218 [CIVIC]; 508 [CIVIC]; 702 [CIVIC]; 748 [CIVIC]; 775 [CIVIC]; 784 [CIVIC]; 809 [CIVIC]; 816 [CIVIC]; 832 [BUSINESS]; 837 [CIVIC]; 855 [CIVIC]; 886 [CIVIC]; 908 [CIVIC]; 965 [CIVIC]; 1101 [BUSINESS]; 1110 [BUSINESS]; 1138 [CIVIC]; 1344 [BUSINESS].
- `phase07-evening-media/textureTriggers.js`: 165 [CIVIC]; 167 [CIVIC]; 169 [CIVIC]; 193 [BUSINESS]; 266 [CIVIC]; 268 [CIVIC].
- `phase08-v3-chicago/applyDomainCooldowns.js`: 21 [CIVIC]; 97 [CIVIC]; 99 [CIVIC]; 264 [CIVIC].
- `phase08-v3-chicago/v3DomainWriter.js`: 22 [CIVIC]; 23 [BUSINESS]; 32 [CIVIC]; 44 [BUSINESS]; 58 [CIVIC]; 60 [BUSINESS]; 234 [CIVIC]; 240 [CIVIC]; 272 [CIVIC]; 274 [CIVIC]; 294 [BUSINESS]; 318 [CIVIC]; 319 [CIVIC]; 325 [BUSINESS]; 326 [BUSINESS]; 378 [CIVIC]; 380 [BUSINESS]; 428 [CIVIC]; 430 [BUSINESS].
- `phase09-digest/applyCycleWeight.js`: 144 [CIVIC].
- `phase09-digest/finalizeCycleState.js`: 718 [BUSINESS]; 725 [BUSINESS]; 776 [ACTORS].
- `phase10-persistence/buildCyclePacket.js`: 24 [CIVIC]; 131 [CIVIC]; 133 [CIVIC]; 565 [CIVIC]; 571 [CIVIC].
- `phase10-persistence/compileHandoff.js`: 86 [CIVIC]; 361 [CIVIC]; 744 [CIVIC]; 1177 [CIVIC]; 1187 [JOURNALISTS].
- `phase10-persistence/recordWorldEventsv3.js`: 13 [CIVIC]; 14 [CIVIC]; 18 [CIVIC]; 21 [CIVIC]; 110 [CIVIC]; 111 [CIVIC]; 112 [CIVIC]; 113 [CIVIC]; 138 [BUSINESS]; 139 [BUSINESS]; 140 [BUSINESS]; 166 [CIVIC]; 174 [CIVIC]; 175 [CIVIC]; 176 [CIVIC]; 204 [CIVIC]; 209 [BUSINESS].
- `phase10-persistence/saveV3Seeds.js`: 39 [CIVIC].
- `scripts/__fixtures__/newsroom/s344/jax_c103_story.md`: 5 [Sage Vienta].
- `scripts/_compile_c97.js`: 110 [BUSINESS]; 122 [CIVIC]; 123 [CIVIC]; 124 [CIVIC]; 125 [CIVIC]; 126 [CIVIC]; 130 [BUSINESS]; 137 [CIVIC]; 153 [BUSINESS]; 189 [CIVIC]; 191 [BUSINESS]; 195 [BUSINESS].
- `scripts/activityObservationsCarry.test.js`: 228 [CIVIC]; 284 [BUSINESS]; 286 [BUSINESS]; 307 [BUSINESS]; 308 [BUSINESS]; 312 [BUSINESS].
- `scripts/addInitiativeAuthorshipColumns.js`: 25 [AUTHORS]; 47 [AUTHORS]; 48 [AUTHORS]; 52 [AUTHORS]; 55 [AUTHORS]; 82 [AUTHORS]; 85 [AUTHORS].
- `scripts/addInitiativeAuthorshipColumns.test.js`: 6 [AUTHORS]; 26 [AUTHORS].
- `scripts/addMayoralVetoColumns.js`: 26 [CIVIC]; 96 [CIVIC]; 103 [CIVIC]; 190 [CIVIC]; 200 [CIVIC]; 203 [CIVIC]; 218 [CIVIC]; 226 [CIVIC]; 262 [CIVIC].
- `scripts/applyApprovalCeilingConfig.js`: 29 [CIVIC]; 81 [CIVIC]; 91 [CIVIC]; 93 [CIVIC]; 97 [CIVIC]; 108 [CIVIC]; 109 [CIVIC]; 114 [CIVIC]; 198 [CIVIC]; 210 [CIVIC].
- `scripts/applyApprovalCeilingConfig.test.js`: 21 [CIVIC]; 43 [CIVIC].
- `scripts/applyTrackerUpdates.js`: 850 [CIVIC].
- `scripts/articleContamination.js`: 141 [Marcus Webb].
- `scripts/articleContamination.test.js`: 120 [Marcus Webb].
- `scripts/auditCanonDrift.js`: 296 [BUSINESS].
- `scripts/auditCanonDrift.test.js`: 119 [BUSINESS]; 123 [BUSINESS].
- `scripts/auditSheetHeaders.js`: 83 [CIVIC]; 85 [BUSINESS].
- `scripts/beatSliceKit.js`: 397 [BUSINESS].
- `scripts/beatSlices.test.js`: 133 [CIVIC]; 134 [CIVIC]; 135 [CIVIC]; 139 [CIVIC].
- `scripts/biasFold.test.js`: 85 [Marcus Webb]; 89 [Marcus Webb]; 92 [Marcus Webb]; 97 [Marcus Webb]; 101 [Marcus Webb]; 106 [Marcus Webb]; 107 [Marcus Webb]; 112 [Marcus Webb]; 117 [Marcus Webb]; 148 [Marcus Webb]; 153 [Marcus Webb].
- `scripts/biasReadback.test.js`: 24 [Marcus Webb]; 26 [Marcus Webb]; 37 [Marcus Webb]; 39 [Marcus Webb]; 41 [Marcus Webb]; 43 [Marcus Webb]; 45 [Marcus Webb]; 47 [Marcus Webb]; 49 [Marcus Webb]; 51 [Marcus Webb]; 53 [Marcus Webb]; 60 [Marcus Webb]; 62 [Marcus Webb]; 65 [Marcus Webb]; 67 [Marcus Webb]; 73 [Marcus Webb]; 74 [Marcus Webb]; 75 [Marcus Webb]; 77 [Marcus Webb].
- `scripts/buildAnthonySlice.test.js`: 238 [CIVIC]; 245 [CIVIC].
- `scripts/buildBusinessCards.js`: 541 [BUSINESS].
- `scripts/buildCivicDomainSlice.js`: 17 [CIVIC]; 257 [CIVIC]; 266 [CIVIC]; 280 [CIVIC]; 288 [CIVIC]; 456 [CIVIC]; 830 [CIVIC]; 921 [CIVIC]; 923 [CIVIC]; 975 [CIVIC]; 979 [CIVIC]; 1061 [CIVIC]; 1076 [CIVIC]; 1085 [CIVIC]; 1125 [CIVIC].
- `scripts/buildCivicDomainSlice.test.js`: 49 [CIVIC]; 113 [CIVIC]; 223 [CIVIC]; 233 [CIVIC]; 237 [CIVIC]; 312 [CIVIC]; 313 [CIVIC]; 314 [CIVIC]; 316 [CIVIC]; 321 [CIVIC]; 332 [CIVIC]; 383 [CIVIC].
- `scripts/buildDecisionQueue.js`: 72 [Marcus Webb]; 79 [Marcus Webb].
- `scripts/buildDeskFolders.js`: 309 [BUSINESS].
- `scripts/buildDeskPackets.js`: 656 [ACTORS].
- `scripts/buildEconomicSlice.js`: 19 [BUSINESS]; 82 [BUSINESS]; 184 [BUSINESS]; 194 [BUSINESS]; 417 [BUSINESS]; 438 [BUSINESS]; 468 [BUSINESS]; 693 [BUSINESS]; 872 [BUSINESS].
- `scripts/buildEconomicSlice.test.js`: 76 [CIVIC]; 79 [BUSINESS]; 80 [BUSINESS]; 82 [CIVIC]; 83 [CIVIC]; 86 [CIVIC]; 211 [BUSINESS].
- `scripts/buildEveningSlice.test.js`: 131 [Claire Ashford]; 133 [Claire Ashford]; 139 [Claire Ashford].
- `scripts/buildHalSlice.test.js`: 174 [CIVIC]; 181 [CIVIC].
- `scripts/buildInitiativePackets.js`: 46 [CIVIC]; 160 [CIVIC]; 269 [CIVIC].
- `scripts/buildInitiativeWorkspaces.js`: 27 [CIVIC]; 187 [CIVIC].
- `scripts/buildJaxSlice.js`: 86 [CIVIC]; 450 [CIVIC]; 666 [CIVIC]; 735 [CIVIC].
- `scripts/buildJaxSlice.test.js`: 151 [CIVIC]; 152 [CIVIC]; 154 [CIVIC]; 173 [CIVIC]; 181 [CIVIC]; 198 [CIVIC].
- `scripts/buildMaraReference.js`: 256 [BUSINESS].
- `scripts/buildNeighborhoodCards.js`: 8 [BUSINESS]; 64 [BUSINESS]; 562 [BUSINESS]; 565 [BUSINESS]; 566 [BUSINESS].
- `scripts/buildPhotoIndex.test.js`: 68 [CIVIC]; 93 [BUSINESS]; 115 [CIVIC]; 127 [BUSINESS].
- `scripts/buildPSlayerSlice.test.js`: 164 [CIVIC]; 171 [CIVIC].
- `scripts/buildPulseSlice.js`: 79 [Lena Cross].
- `scripts/buildSimonSlice.js`: 160 [CIVIC].
- `scripts/buildSimonSlice.test.js`: 69 [CIVIC]; 76 [CIVIC]; 116 [CIVIC]; 123 [CIVIC].
- `scripts/buildTanyaSlice.test.js`: 64 [CIVIC]; 71 [CIVIC].
- `scripts/buildVoiceWorkspaces.js`: 42 [CIVIC]; 52 [CIVIC]; 639 [CIVIC]; 644 [CIVIC]; 649 [CIVIC].
- `scripts/buildWorldSummary.js`: 753 [CIVIC]; 781 [CIVIC]; 782 [BUSINESS].
- `scripts/buildWorldSummary.test.js`: 240 [CIVIC]; 429 [CIVIC]; 483 [CIVIC].
- `scripts/canon_check.js`: 5 [CIVIC].
- `scripts/capability-reviewer/assertCitizensAttachedToPolicy.js`: 6 [CIVIC]; 26 [CIVIC, BUSINESS]; 32 [CIVIC].
- `scripts/capability-reviewer/assertThreeLayerCoverageOnFrontPage.js`: 23 [CIVIC]; 89 [CIVIC]; 112 [CIVIC].
- `scripts/capability-reviewer/parseEdition.js`: 41 [CIVIC]; 42 [BUSINESS]; 69 [BUSINESS]; 257 [BUSINESS].
- `scripts/capability-reviewer/parseEdition.test.js`: 5 [BUSINESS]; 170 [CIVIC]; 171 [BUSINESS].
- `scripts/careerStage.test.js`: 79 [CIVIC]; 104 [CIVIC]; 159 [CIVIC]; 177 [CIVIC]; 179 [CIVIC]; 212 [CIVIC]; 240 [CIVIC].
- `scripts/chaosCarsMagnitudeReport.js`: 15 [BUSINESS].
- `scripts/checkSupplementalTriggers.js`: 34 [CIVIC]; 66 [CIVIC]; 95 [CIVIC].
- `scripts/citizen-signal-detector.js`: 181 [CIVIC].
- `scripts/cityRevenue.test.js`: 316 [CIVIC]; 353 [BUSINESS].
- `scripts/civic-office-map.json`: 614 [Marcus Webb].
- `scripts/civicApprovalCeiling.test.js`: 231 [CIVIC]; 538 [CIVIC]; 660 [Marcus Webb]; 661 [Marcus Webb]; 692 [Marcus Webb]; 695 [Marcus Webb]; 699 [Marcus Webb]; 700 [CIVIC]; 701 [CIVIC]; 730 [CIVIC]; 738 [CIVIC, Marcus Webb]; 742 [Marcus Webb]; 744 [Marcus Webb]; 761 [CIVIC]; 762 [Marcus Webb]; 764 [CIVIC, Marcus Webb]; 769 [Marcus Webb]; 776 [Marcus Webb]; 778 [CIVIC]; 780 [CIVIC]; 783 [Marcus Webb]; 791 [CIVIC]; 792 [CIVIC, Marcus Webb]; 795 [Marcus Webb]; 798 [Marcus Webb]; 801 [Marcus Webb]; 812 [CIVIC].
- `scripts/civicApprovalState.test.js`: 144 [CIVIC]; 147 [CIVIC]; 148 [CIVIC]; 150 [CIVIC]; 200 [CIVIC]; 311 [CIVIC]; 317 [CIVIC].
- `scripts/civicMustDecide.js`: 178 [CIVIC]; 181 [CIVIC].
- `scripts/civicRoleEclPool.js`: 7 [CIVIC].
- `scripts/constructionRippleTyping.test.js`: 47 [CIVIC]; 48 [CIVIC]; 52 [BUSINESS]; 63 [BUSINESS]; 70 [BUSINESS]; 73 [CIVIC].
- `scripts/createInitiative.js`: 13 [AUTHORS]; 87 [AUTHORS]; 206 [AUTHORS].
- `scripts/crisisNaming.test.js`: 379 [CIVIC].
- `scripts/cron-civic-gate.js`: 49 [CIVIC]; 106 [CIVIC]; 184 [CIVIC]; 200 [CIVIC]; 316 [CIVIC]; 418 [CIVIC]; 419 [CIVIC].
- `scripts/cron-civic-run.js`: 60 [CIVIC]; 61 [CIVIC]; 76 [CIVIC]; 427 [CIVIC]; 805 [CIVIC]; 816 [CIVIC]; 1050 [CIVIC]; 1099 [CIVIC]; 1100 [CIVIC]; 1226 [CIVIC]; 1227 [CIVIC]; 1605 [CIVIC]; 1623 [CIVIC]; 1624 [CIVIC]; 1702 [CIVIC]; 1705 [CIVIC]; 1997 [CIVIC]; 2028 [CIVIC]; 2038 [CIVIC]; 2102 [CIVIC]; 2126 [CIVIC]; 2127 [CIVIC]; 2192 [CIVIC]; 2299 [CIVIC]; 2302 [CIVIC]; 2321 [CIVIC]; 2365 [CIVIC]; 2366 [CIVIC]; 2369 [CIVIC]; 3336 [CIVIC]; 3360 [CIVIC]; 3411 [CIVIC]; 3412 [CIVIC]; 3442 [CIVIC]; 3455 [CIVIC]; 3778 [CIVIC]; 3903 [CIVIC].
- `scripts/cron-civic-week-carry.test.js`: 45 [CIVIC].
- `scripts/cron-desk-run.js`: 322 [CIVIC]; 655 [BUSINESS]; 658 [BUSINESS]; 912 [CIVIC]; 916 [CIVIC]; 920 [CIVIC]; 1922 [BUSINESS]; 1991 [CIVIC].
- `scripts/cron-saturday-run.js`: 315 [Claire Ashford].
- `scripts/cronSaturdayRun.test.js`: 260 [CIVIC].
- `scripts/cycleWeightSignalOrder.test.js`: 55 [CIVIC, BUSINESS].
- `scripts/djDirect.js`: 400 [CIVIC, BUSINESS]; 684 [CIVIC, BUSINESS].
- `scripts/economicInputs.test.js`: 18 [CIVIC]; 99 [CIVIC]; 100 [CIVIC]; 102 [CIVIC]; 103 [CIVIC]; 104 [BUSINESS]; 105 [BUSINESS]; 106 [BUSINESS]; 107 [BUSINESS]; 110 [BUSINESS].
- `scripts/economicMoodCarry.test.js`: 39 [BUSINESS].
- `scripts/economicPhaseOwnership.test.js`: 57 [BUSINESS].
- `scripts/educationLoop.test.js`: 71 [CIVIC]; 84 [CIVIC]; 88 [CIVIC].
- `scripts/emitFormatContractSections.js`: 3 [BUSINESS]; 31 [BUSINESS]; 44 [BUSINESS]; 160 [BUSINESS]; 422 [CIVIC]; 654 [BUSINESS]; 745 [BUSINESS]; 794 [BUSINESS]; 868 [BUSINESS]; 944 [BUSINESS].
- `scripts/emitFormatContractSections.test.js`: 27 [CIVIC]; 45 [BUSINESS]; 65 [CIVIC]; 185 [CIVIC]; 258 [BUSINESS].
- `scripts/employerSuccess.test.js`: 20 [CIVIC]; 153 [CIVIC].
- `scripts/engine-auditor/bayTribuneRoster.js`: 73 [CIVIC]; 74 [CIVIC]; 75 [CIVIC]; 76 [CIVIC]; 172 [CIVIC].
- `scripts/engine-auditor/detectMathImbalances.test.js`: 158 [CIVIC].
- `scripts/engine-auditor/detectRepeatingEvents.js`: 20 [CIVIC]; 35 [CIVIC].
- `scripts/engine-auditor/detectRepeatingEvents.test.js`: 193 [CIVIC].
- `scripts/engine-auditor/detectWritebackDrift.test.js`: 31 [CIVIC]; 47 [CIVIC].
- `scripts/engine-auditor/routePatternSeeds.decay.test.js`: 33 [CIVIC].
- `scripts/engine-auditor/routePatternSeeds.js`: 210 [CIVIC]; 214 [CIVIC]; 221 [CIVIC]; 227 [BUSINESS]; 624 [CIVIC]; 626 [CIVIC]; 633 [CIVIC].
- `scripts/engine94SheetContract.test.js`: 14 [CIVIC]; 125 [CIVIC].
- `scripts/engineAuditor.js`: 409 [CIVIC]; 427 [CIVIC].
- `scripts/enrichCitizenProfiles.js`: 109 [CIVIC].
- `scripts/extractBondsFromWakes.js`: 29 [Lena Cross]; 30 [Celeste Moon].
- `scripts/extractExemplars.js`: 22 [CIVIC]; 23 [CIVIC]; 24 [BUSINESS]; 43 [CIVIC]; 49 [CIVIC]; 52 [BUSINESS]; 118 [CIVIC].
- `scripts/fundDisbursement.test.js`: 35 [CIVIC]; 289 [CIVIC].
- `scripts/generate-edition-pdf.js`: 126 [CIVIC]; 273 [CIVIC]; 793 [BUSINESS].
- `scripts/generate-edition-pdf.section-normalize.test.js`: 65 [CIVIC]; 66 [CIVIC]; 98 [CIVIC]; 119 [CIVIC]; 123 [CIVIC]; 129 [CIVIC]; 133 [CIVIC]; 154 [CIVIC]; 157 [CIVIC]; 168 [CIVIC]; 172 [CIVIC]; 173 [CIVIC].
- `scripts/gradeEdition.js`: 38 [CIVIC]; 39 [CIVIC]; 40 [BUSINESS]; 127 [CIVIC]; 147 [BUSINESS].
- `scripts/hoodEconomyCarry.test.js`: 53 [BUSINESS].
- `scripts/hoodIncome.test.js`: 170 [CIVIC]; 192 [CIVIC]; 194 [CIVIC]; 223 [Marcus Webb].
- `scripts/hospitalIncomePersistence.test.js`: 717 [CIVIC].
- `scripts/householdIntake.test.js`: 78 [CIVIC].
- `scripts/householdReconcile.test.js`: 525 [BUSINESS].
- `scripts/ingestCivicWiki.js`: 246 [CIVIC].
- `scripts/ingestEdition.js`: 78 [BUSINESS]; 102 [BUSINESS].
- `scripts/ingestEditionWiki.js`: 189 [CIVIC, BUSINESS]; 257 [Marin Tao]; 268 [BUSINESS]; 270 [CIVIC, BUSINESS].
- `scripts/ingestPublishedEntities.canon-drift.test.js`: 269 [BUSINESS].
- `scripts/ingestPublishedEntities.js`: 6 [BUSINESS]; 22 [BUSINESS]; 51 [BUSINESS]; 357 [Marin Tao]; 412 [BUSINESS]; 429 [BUSINESS]; 454 [BUSINESS]; 457 [BUSINESS]; 610 [BUSINESS]; 1132 [BUSINESS]; 1133 [BUSINESS]; 1141 [BUSINESS]; 1177 [BUSINESS]; 1202 [BUSINESS]; 1207 [BUSINESS]; 1219 [BUSINESS]; 1339 [BUSINESS]; 1494 [BUSINESS].
- `scripts/ingestPublishedEntities.parser-sanity.test.js`: 12 [BUSINESS]; 39 [BUSINESS]; 47 [BUSINESS]; 55 [BUSINESS]; 68 [BUSINESS]; 82 [BUSINESS]; 108 [BUSINESS]; 114 [BUSINESS]; 125 [BUSINESS]; 141 [BUSINESS]; 158 [BUSINESS]; 170 [BUSINESS]; 176 [BUSINESS]; 190 [BUSINESS]; 203 [BUSINESS]; 212 [BUSINESS]; 223 [BUSINESS].
- `scripts/ingestPublishedEntities.sentinel.test.js`: 3 [BUSINESS]; 36 [BUSINESS]; 41 [BUSINESS]; 52 [BUSINESS].
- `scripts/integrateCelebrities.js`: 92 [Dax Monroe, Sculptor Alma Vasquez]; 93 [Gallery Owner Mei Chen, Festival Organizer James Williams].
- `scripts/integrityWear.test.js`: 261 [CIVIC].
- `scripts/judicialLifecycle.test.js`: 410 [CIVIC]; 414 [CIVIC]; 419 [CIVIC]; 422 [CIVIC]; 643 [CIVIC].
- `scripts/lib.editionParser.article-table.test.js`: 66 [CIVIC]; 87 [CIVIC]; 103 [CIVIC]; 166 [CIVIC]; 175 [CIVIC]; 176 [CIVIC]; 211 [CIVIC]; 226 [CIVIC]; 242 [CIVIC]; 250 [CIVIC]; 251 [CIVIC]; 262 [CIVIC]; 265 [CIVIC]; 275 [CIVIC]; 282 [CIVIC]; 326 [CIVIC]; 333 [CIVIC]; 337 [CIVIC]; 339 [CIVIC]; 340 [CIVIC]; 341 [CIVIC].
- `scripts/livedExperiencePacket.js`: 654 [CIVIC]; 685 [CIVIC]; 822 [CIVIC].
- `scripts/livedExperiencePacket.test.js`: 203 [CIVIC]; 209 [CIVIC].
- `scripts/migrations/s320_edu_media_civic.js`: 14 [CIVIC].
- `scripts/mintCanonBonds.js`: 10 [Claire Ashford]; 74 [CIVIC]; 75 [BUSINESS].
- `scripts/mintCanonBonds.test.js`: 186 [BUSINESS].
- `scripts/newsroom-digest.js`: 89 [CIVIC]; 90 [CIVIC]; 91 [CIVIC]; 92 [CIVIC].
- `scripts/newsroom-fanout-stink.test.js`: 23 [CIVIC]; 28 [CIVIC]; 45 [CIVIC].
- `scripts/newsroom-fanout.js`: 308 [CIVIC]; 392 [CIVIC]; 824 [CIVIC].
- `scripts/newsroom-wake-packages.json`: 82 [CIVIC]; 142 [CIVIC].
- `scripts/newsroomSourcing.js`: 17 [CIVIC]; 190 [CIVIC]; 191 [CIVIC].
- `scripts/newsroomWakePackages.test.js`: 86 [CIVIC]; 515 [CIVIC]; 516 [CIVIC]; 520 [BUSINESS]; 532 [CIVIC]; 555 [BUSINESS].
- `scripts/notebooklmCanonSources.json`: 384 [BUSINESS]; 392 [CIVIC].
- `scripts/notebooklmDailyRouter.js`: 330 [CIVIC]; 349 [CIVIC].
- `scripts/notebooklmDailyRouter.test.js`: 215 [CIVIC].
- `scripts/notebooklmHeadlessEval.test.js`: 279 [CIVIC]; 286 [CIVIC].
- `scripts/officeWall.js`: 6 [CIVIC]; 80 [CIVIC]; 88 [CIVIC]; 91 [CIVIC]; 120 [CIVIC]; 150 [CIVIC]; 239 [CIVIC].
- `scripts/ownerDoor.test.js`: 3 [AUTHORS]; 41 [AUTHORS]; 106 [CIVIC]; 178 [BUSINESS]; 253 [CIVIC].
- `scripts/perHoodDynamics.test.js`: 205 [CIVIC]; 206 [CIVIC]; 207 [CIVIC].
- `scripts/persona-map.json`: 36 [CIVIC]; 42 [CIVIC].
- `scripts/preflightDeskCheck.js`: 133 [CIVIC]; 136 [CIVIC]; 148 [CIVIC]; 150 [CIVIC].
- `scripts/provocationBank.test.js`: 20 [Marcus Webb].
- `scripts/rateEditionCoverage.js`: 7 [CIVIC, BUSINESS]; 75 [CIVIC]; 76 [CIVIC]; 77 [CIVIC]; 85 [CIVIC]; 115 [CIVIC]; 116 [BUSINESS]; 124 [CIVIC]; 125 [CIVIC]; 210 [CIVIC]; 224 [BUSINESS]; 226 [CIVIC, BUSINESS]; 227 [CIVIC, BUSINESS]; 418 [CIVIC]; 513 [CIVIC]; 659 [CIVIC].
- `scripts/rateEditionCoverage.test.js`: 93 [CIVIC]; 97 [CIVIC]; 101 [CIVIC].
- `scripts/rollbackMayoralVetoColumns.js`: 24 [CIVIC]; 39 [CIVIC]; 107 [CIVIC].
- `scripts/scanCitizenPages.js`: 21 [CIVIC].
- `scripts/scanCitizenPages.test.js`: 9 [CIVIC].
- `scripts/sentimentRestingLevel.test.js`: 89 [CIVIC, BUSINESS]; 90 [CIVIC, BUSINESS]; 91 [CIVIC, BUSINESS].
- `scripts/storyHookCarryEnrichment.test.js`: 42 [BUSINESS]; 43 [CIVIC]; 44 [CIVIC]; 72 [BUSINESS]; 74 [CIVIC].
- `scripts/storyHookRouting.test.js`: 7 [CIVIC]; 8 [BUSINESS]; 44 [BUSINESS]; 47 [BUSINESS]; 50 [BUSINESS]; 58 [CIVIC]; 63 [CIVIC]; 70 [BUSINESS]; 71 [BUSINESS]; 100 [CIVIC]; 102 [CIVIC]; 103 [CIVIC]; 111 [CIVIC]; 123 [BUSINESS]; 124 [BUSINESS]; 125 [CIVIC]; 128 [BUSINESS]; 130 [CIVIC, BUSINESS].
- `scripts/tierClassifier.js`: 52 [Marcus Webb]; 58 [BUSINESS]; 161 [CIVIC]; 176 [CIVIC]; 178 [CIVIC].
- `scripts/tierLadderState.test.js`: 61 [CIVIC]; 63 [CIVIC]; 106 [CIVIC].
- `scripts/transitCauses.test.js`: 170 [CIVIC]; 303 [CIVIC].
- `scripts/unlivedFold.test.js`: 157 [Marcus Webb].
- `scripts/validateEdition.councilBleed.test.js`: 29 [CIVIC].
- `scripts/validateEdition.js`: 943 [BUSINESS]; 964 [BUSINESS]; 977 [CIVIC]; 1152 [Marcus Webb]; 1231 [BUSINESS].
- `scripts/verifyNamesIndexParse.js`: 55 [BUSINESS]; 57 [CIVIC, BUSINESS].
- `scripts/wipeWorldDataSnapshots.js`: 67 [BUSINESS].
- `scripts/work-wake-packages.json`: 7 [Marcus Webb]; 19 [Marcus Webb].

