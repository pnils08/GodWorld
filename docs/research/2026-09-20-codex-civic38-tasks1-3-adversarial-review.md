---
title: Civic.38 Tasks 1 and 3 — Codex adversarial review
created: 2026-09-20
updated: 2026-09-20
type: reference
tags: [research, civic, active]
sources:
  - Kimi commit 8b07fc29; verified against HEAD through 3274f309
  - scripts/cron-civic-run.js
  - scripts/buildCivicOfficeSlice.js
  - output/antigravity/2026-09-20-adversarial-review-civic38-tasks1-3-6.md
pointers:
  - "[[plans/2026-09-19-civic-wake-game-loop]] — owning tasks and civic.38 rollout pointer"
  - "[[research/index]] — registration"
  - "[[research/2026-09-20-codex-civic38-game-loop-review]] — earlier design review"
---

# Civic.38 Tasks 1 and 3 — adversarial review

**Source:** Kimi's Task 1+3 implementation, followed through current HEAD rather than assuming its original diff is still the whole path. The pack differs from 8b07fc29 only by exporting loadTrackerRows; the cron has subsequently gained Tasks 2, 8, 9 and 6.3. Line pointers below refer to the inspected HEAD.

**What this addresses:** Whether a seat's legal choices and its evidence actually agree with civic.38 Tasks 1 and 3. This is a second review, not an implementation acceptance based on another lane's passing suite.

**Verdict: adopt the repairs below before treating Tasks 1+3 as complete.** Direct filing in docs/research is builder-authorized using the accepted-review pattern; that routing does not claim Kimi has fixed or accepted every finding. No new rollout row: findings feed the existing civic.38 tasks.

## Findings for Kimi

### F1 — HIGH: inherited catalog properties pass the move gate

`scripts/cron-civic-run.js:2159-2160` accepts any truthy `catalog[m.intervention]` and only refuses literal `playable === false`. With the actual landed catalog, synthetic proposals naming **constructor**, **toString**, or **__proto__** each returned one accepted move. None is a catalog entry. A malformed own entry lacking playable also passes. The menu at `scripts/buildCivicOfficeSlice.js:1003-1005` uses the same permissive boolean test.

**Repair:** require a string key, own-property membership, a non-array entry object, `playable === true`, and the required domain/type/metric shape. Use the same shared predicate in all readers. HEAD's later candidate validator repeats this gap (`scripts/validateTrackerUpdates.js:227-233`), as does the apply path (`scripts/applyTrackerUpdates.js:658-668`). The final createInitiative domain check (`scripts/createInitiative.js:97-100`) does reject the undefined domain from inherited methods, so this review does **not** claim a proven arbitrary Sheet append. The proven failure is accepting an impossible choice, consuming the seat's move and passing an invalid candidate through an earlier gate.

**Regression:** those three inherited keys and an own entry with absent/false playable must be rejected; actual health-service accepted; housing-program rejected; first valid move still survives other rejected entries.

### F2 — HIGH: actual reflection text is discarded in both new blocks

The Sheet calls its text field **ReflectionExcerpt**, column F (`schemas/SCHEMA_HEADERS.md:1140-1147`); the work-wake appender places the reflection there (`scripts/cron-work-wake.js:245-248`). The petition and working-city blocks read only Snippet/Text/snippet (`scripts/buildCivicOfficeSlice.js:908,952`). A canonical synthetic Civic row produced one complaint with `snippet: ''` and text `-  (C999)`; a canonical work row produced `SYNTHETIC:  (C999)`.

**Repair:** read ReflectionExcerpt first, preserving the canonical schema; retain legacy aliases only if a real input contract needs them. Cover both blocks with an actual dump-shaped fixture. Alias-only fixtures can pass while every real voice is blank.

### F3 — HIGH: petition geography drops child residents and reports missing geography as no complaints

`loadPetitionPool` obtains membership through `loadConstituents` (`scripts/buildCivicOfficeSlice.js:891-895`). That function compares the citizen's raw Neighborhood to the parent-hood set (`:247-262`), without folding child areas. A synthetic citizen in Coliseum is excluded from East Oakland despite the supplied ChildAreas map; the same citizen in East Oakland is included. The board's child fold at `:800` therefore disagrees with the petition pool.

If the citizen snapshot is absent, `loadConstituents` returns []; the pool then reports `available: true` and **No Civic complaints from your turf on the record** (`:919-925`). This is an unsupported negative claim, confirmed by a fixture containing a real-format reflection but no citizen file. Stale snapshots are also accepted without checking their meta Cycle. Missing names and non-active statuses exclude otherwise identifiable residents; those are constituent-display policies, not geographic join requirements.

**Repair:** join Reflection_Intake POPID to a Cycle-qualified citizen snapshot with the same sheet-sourced child resolver as the board; do not require a display name for membership. Mark unavailable/incomplete geography explicitly and count unlocated rows. Keep official-holder exclusion. Resolve district territory once so a neighborhoods override in `turfHoods` (`:77-83`) cannot disagree with the move gate's districtMap lookup (`cron-civic-run.js:2119-2123`). Current C108 canonical parent territory matches; the override/cache-drift risk is conditional, not a claim of a current district reassignment.

### F4 — MEDIUM: malformed or stale evidence becomes an authoritative empty/current board

`readJsonl` drops malformed lines and treats every read exception as absent (`scripts/buildCivicOfficeSlice.js:738-743`). A file containing only `{broken` returned []; `boardBlock` then calls that an empty board (`:824-829`). Partial corruption silently shrinks boardIds and removes work authority. Neither tracker nor reflection readers check beats/meta.json (`:770-771,882,932`). `loadAudit` falls back to undated engine_audit.json without validating its Cycle (`:279-281`), and `childToParentFromAudit` quietly accepts missing schema or overwrites conflicting parent links (`:749-760`).

**Repair:** distinguish missing, corrupt, stale, and valid-empty inputs; validate the audit/beat Cycle and parent-map schema before using them for authority. Never silently discard broken lines in an authority input. Refuse affected moves with a diagnostic while preserving speech. Conflicting maps must not select a parent by iteration order.

### F5 — MEDIUM: the retired free-text action still reaches the position wall

Removing action from the requested output shape did not remove its live reader. `scripts/cron-civic-run.js:2651` stores arbitrary `j.action` and `:2663` records the result through `positionWallRecordDatawake` (`:87-98`). `scripts/officeWall.js:186-194` appends it as `action:`. The number gate now examines only numberMoved (`cron-civic-run.js:2624`); the closed move gate never examines this legacy field.

**Repair:** drop newly generated legacy action at the record boundary, or render only accepted structured moves as explicitly pending intentions. Preserve historical records. This is a continuity-channel bypass, **not** a tracker write or a reason to ground ordinary statements. Kimi's captured orphaned checkDatawakeMove consumer does not cover this still-live officeWall consumer.

### F6 — MEDIUM: last move memory disappears at the Cycle boundary

`lastMoveBlock` reads only moves_c{currentCycle}.jsonl (`scripts/buildCivicOfficeSlice.js:835-866`). On the next Cycle, a prior Sunday's applied/failed move disappears behind **the week starts clean**. This loses the outcome exactly when Task 3.0 needs it. Within one Cycle, sorting ascending and clipping the text can show oldest events first. The passed-over-problem part of Task 3.0 is also unimplemented.

**Repair:** find the seat's latest prior event across bounded Cycle files, preserve current pending events and latest terminal outcome, and state when prior evidence is unavailable. Build unresolved problem continuity from identified prior evidence, never invented history. Fixture: C998 failed move + no C999 file must show failure in the C999 pack.

### F7 — MEDIUM: future stage advice is locally hardcoded and prioritizes Stage over stalled phase

`boardNeedText` embeds stage rules (`scripts/buildCivicOfficeSlice.js:776-786`) rather than using the plan's shared stage helper. `{Stage:'Standing', ImplementationPhase:'stalled'}` returns **work keeps it standing**; the stalled branch is unreachable for every recognized Stage. Standing's two-distinct-seat work condition and losing-clock requirements are absent from this text. These are staged-contract defects: current tracker rows have not yet received the Task 4 Stage fields.

**Repair:** keep stalled/revival state authoritative and consume the shared engine-compatible next-requirement helper when Task 4 lands. Test each Stage with normal, stalled and invalid combinations. Until the helper exists, label stage advice unavailable instead of asserting a replacement rule.

### F8 — MEDIUM: Task 3 condition counts and effective pack caps are missing

`buildGameBlocks` (`scripts/buildCivicOfficeSlice.js:1011-1032`) never calls civicPetitions or includes condition results for live proposals, although Task 3.2 requires them. Only `.text` strings are clipped. Full complaints, participation, moves and board arrays are serialized into the prompt (`scripts/cron-civic-run.js:2063`; pack fields `buildCivicOfficeSlice.js:866,925,1022-1028`), so historical intake can make the model input grow without the claimed block cap. The intervention menu is uncapped too. A complete boardIds set is necessary for authority; unbounded narrative history is not.

**Repair:** add local counter summaries with explicit unavailable states, preserve the complete compact legal-ID set, and bound the model-visible samples while exposing total counts and source windows. Choose/document reflection recency once; do not silently mix the counter's current-Cycle default with lifetime pack counts. Working-city selection should select latest per staff member rather than permitting one person to fill all four slots.

## What held up under the stronger read

- Mixed local/out-of-district proposal hoods are rejected individually (`cron-civic-run.js:2162-2165`); a local hood cannot carry an unauthorized one through. Supplied valid child links fold before authority checks.
- Work requires membership of the exact boardIds Set; the police chief cannot propose; unknown move types and second consequential moves receive individual rejections (`:2143-2183`). Rejections are logged and persisted without dropping an otherwise usable statement (`:2642-2665`).
- Local C108 board membership from the actual dumped rows and parent map: D1 INIT-001/002/007; D2 INIT-006; D3 INIT-002/003/007; D4 empty; D5 INIT-002/007; D6 empty; D7 INIT-005; D8/D9 empty. This verifies the existing overlap, not future sponsor/territory changes.
- Missing Reflection_Intake itself produces stated absence. Officials are excluded from the citizen pool. The missing constituent snapshot is the distinct F3 failure.
- Current directive parsing identifies agent paths and preserves the Address line up to the block cap (`buildCivicOfficeSlice.js:975-985`). It does not carry the full Why/Acceptance/Silence-consequence block or an untruncated long demand. `answer.confrontationId` is unchecked, but no inspected Task 1 path grants an engine reward for it; binding it to a live confrontation is an integration concern, not a demonstrated extra-move exploit.

## Task 6 follow-up — agy finding 6.1 repaired

Confirmed at the pre-fix `civicPetitions.js:174-178,230`: unmappable care rows incremented a citywide warning that vetoed every health district; invalid hospital columns were examined before target membership. Housing already returned domain-not-playable, so the report's claim of a housing eligibility veto was overstated.

Builder-requested repair landed in **3274f309**: map/select district before care validation; count invalid target rows and unlocated input rows separately; omit bad rows from signatures without vetoing valid support. Housing identities are validated after geographic selection. Missing population still blocks, below-band still fails, housing/safety still never clear. A new regression failed on the unchanged counter with `false !== true`; all **15 counter tests** pass after the fix, plus syntax checks and rollout lint. No external write or live Cycle ran.

Agy 6.2 is a documented configurable recency choice, not grounds to silently invent a four-Cycle default. Agy 6.3's Event alias is unnecessary for the canonical beats contract, whose header is Tag; this does not excuse F2's failure to read ReflectionExcerpt.

## Evidence and scope

Read-only probes evaluated the actual MOVE_TYPES/loadInterventionCatalog/hoodAuthorityReason/validateDatawakeMoves source slice in a Node VM with its actual local catalog, district map and hood cache; no cron startup, env loading, model or network call. Pack helpers ran directly against temporary synthetic POP-999xx/clearly synthetic rows. Probe outputs verified F1–F4 and F7; remaining findings trace explicit producers/consumers. No Kimi file was edited. Reproduction inputs and observed results are specified under each finding so the receiving lane can turn them into durable tests.

**Ignited plans:** none; repairs remain in [[plans/2026-09-19-civic-wake-game-loop]]. Housing lever design is separately requested, not bundled into these repairs.

## Changelog

- 2026-09-20 (codex) — Filed stronger HEAD review with eight actionable findings and verified Task 6.1 regression repair; current task ownership preserved.
