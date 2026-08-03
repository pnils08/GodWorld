---
title: Oakland Sports Feed
created: 2026-07-28
updated: 2026-08-02
type: reference
tags: [sports, engine, citizens, active]
sources:
  - Mike-direct 2026-07-28 — roster sport-stat columns hold the current player stat lines for handy reference
  - schemas/SCHEMA_HEADERS.md §Oakland_Sports_Feed, §As_Roster, §Oaks_Roster
  - phase02-world-state/applySportsSeason.js
  - phase05-citizens/applyGameNightMoments.js
  - phase05-citizens/generateCitizensEvents.js
  - phase07-evening-media/sportsStreaming.js and storyHook.js
  - scripts/buildDeskPackets.js, buildWorldSummary.js, and preflightInputCheck.js
  - lib/wakePerception.js
  - phase10-persistence/compileHandoff.js
  - scripts/sportsFeedContract.js, sportsFeedWriter.js, and sportsPreviewToken.js
  - dashboard/sportsRoutes.js
pointers:
  - "[[research/2026-07-27-oakland-sports-feed-entry-dashboard]] — entry-UI research and proposed Sports Engine boundary"
  - "[[engine/ROLLOUT_PLAN]] — engine.89 workspace-plan discovery pointer"
  - "[[plans/2026-07-30-oakland-sports-workspace]] — approved engine.89 implementation plan"
  - "[[plans/2026-07-05-game-night-connection-design]] — downstream game-night design history"
  - "[[engine/ENGINE_REPAIR]] §engine.40 — sports-stat intake"
  - "[[engine/ENGINE_REPAIR]] §engine.77 — sports-event state and LifeHistory intake"
  - "[[SPREADSHEET]] — wider Google Sheets environment"
---

# Oakland Sports Feed

`Oakland_Sports_Feed` is the builder-authored sports signal ledger. It supplies
structured facts and story framing for Oakland sports activity. Engine Phases
and newsroom scripts read it; it is not itself a published Article, and it does
not replace `As_Roster`, `Oaks_Roster`, or `Simulation_Ledger` as the authority
for citizen identity and roster state.

This reference documents verified current behavior. Dashboard Waves A–C are
implemented in the source tree and await separately approved TLS/proxy
deployment, dashboard restart, live-read proof, and one real append proof. The
write feature is disabled by default.

## Authority and safety

- The column contract is the `Oakland_Sports_Feed` section of
  [schemas/SCHEMA_HEADERS.md](../schemas/SCHEMA_HEADERS.md).
- Rows are manually authored world inputs. Never invent names, POPIDs, teams,
  results, records, statistics, quotes, neighborhoods, or events.
- `As_Roster` and `Oaks_Roster` are the roster ledgers. A feed row does not
  currently mutate either roster.
- Published Bay Tribune material remains the paper-of-record for narrative
  appearances.
- A current-Cycle feed entry may affect citizens and the city during the engine
  run. Treat it as canon-bearing input even before publication.

## Team contract

| Internal ID | Dashboard label | New feed value | Compatibility reads |
|---|---|---|---|
| `as` | The A's | `A's` | — |
| `oaks` | The Oaks | `Oaks` | `NBA`, `Warriors` |

New drafts accept only the internal IDs and project only `A's` or `Oaks`.
Historical `NBA` and `Warriors` cells remain readable as Oaks aliases; the
implementation does not rewrite them. The Phase 2 reader also preserves its
historical free-text matching and NFL active-sport compatibility; neither is a
third new-write team. Unknown nonblank values are logged and skipped, while
blank values remain silent.

## Current flow

```text
Manual Sheet entry
       │
       ▼
Oakland_Sports_Feed
       ├── Phase 2: sports context, team state, sentiment, neighborhood effects
       ├── Phase 5: named-player moments and watching-citizen game-night events
       ├── Phase 7: evening sports text and story hooks
       ├── Node: world summary, desk packets, citizen wake, review/handoff
       └── Dashboard: exact-Cycle read, inherited state, preview, gated append
```

The feed has two different time views:

- **Current-Cycle event view:** Phase 5, evening media, and most newsroom
  surfaces select rows whose `Cycle` equals the engine Cycle.
- **Through-Cycle team-state view:** Phase 2 scans rows through the current
  Cycle and keeps the latest non-empty state values for each exact team key.
  Within one Cycle, later rows can override earlier values.

Phase 2 only lets a team's accumulated state affect a Cycle when that team also
has a current-Cycle row. Old team state does not speak by itself.

## Twenty-column contract

| Col | Header | Verified role | Entry guidance |
|---|---|---|---|
| A | `Cycle` | Selects the engine Cycle | Required on every current-Cycle row |
| B | `SeasonType` | Preserved as feed season context | Required; use the established controlled value |
| C | `EventType` | Routes the event; values containing `game` activate game-night consumers | Required; choose the narrowest accurate type |
| D | `TeamsUsed` | Exact team key for state grouping and display | Required; use the canonical team label |
| E | `NamesUsed` | Delimited participant names; Phase 5 tries exact active `First Last` matches | Use roster-backed canonical names |
| F | `Notes` | Factual event detail for media and summaries | Keep concrete and operator-authored |
| G | `Stats` | Event-specific free-text statistics passed to newsroom consumers | Record only verified event statistics; this does not update the roster's current stat line |
| H | `Team Record` | Contributes to city sports sentiment and media context | Use the established record format |
| I | `VideoGameDate` | Legacy column; no current Phase 2 mapping | Leave blank unless an active contract is added |
| J | `VideoGame` | Legacy column; no current Phase 2 mapping | Leave blank unless an active contract is added |
| K | `StoryAngle` | Preferred story framing for sports media surfaces | Preserve the builder's wording |
| L | `PlayerMood` | Affects game-night tone; frustrated/angry and electric/confident emit player triggers | Use only when grounded by the event |
| M | `EventTrigger` | Manual sports trigger; otherwise some triggers are inferred | Not every accepted trigger reaches every consumer |
| N | `HomeNeighborhood` | Enables neighborhood traffic, retail, nightlife, or community effects | Use an existing canonical neighborhood |
| O | `Streak` | Adjusts sentiment and game-night win/loss tone | Use a parseable `W<n>` or `L<n>` form |
| P | `FanSentiment` | Adjusts city sports sentiment | Use the existing controlled vocabulary |
| Q | `FranchiseStability` | Supplies team/franchise state and can affect neighborhood logic | Change only when the world state changed |
| R | `EconomicFootprint` | Supplies economic team state and neighborhood effects | Change only when grounded |
| S | `CommunityInvestment` | Supplies community team state and neighborhood effects | Change only when grounded |
| T | `MediaProfile` | Scales sports sentiment and supplies newsroom context | Use the existing local/regional/national/international scale |

The current preflight requires `Cycle`, `SeasonType`, `EventType`, and
`TeamsUsed` on every current-Cycle row. It recommends `NamesUsed`,
`Team Record`, `FanSentiment`, and `PlayerMood`. It checks presence, not the
complete format or roster contract.

## Phase 2 behavior

[phase02-world-state/applySportsSeason.js](../phase02-world-state/applySportsSeason.js)
has two related jobs.

### Current-Cycle context

It maps all active columns except the legacy `VideoGameDate` and `VideoGame`
fields into in-memory sports entries. Feed-driven mode records the raw
`SeasonType` but deliberately sets the generic sports-season switch to
`off-season`. A separate `World_Config` override is required to enable the
generic seasonal atmosphere branches. This prevents a raw feed label from
activating unrelated synthetic sports atmosphere.

### Team state and effects

For each normalized A's/Oaks team key—and any historical NFL compatibility
row—the reducer keeps the latest non-empty record, streak, fan sentiment,
franchise stability, economic footprint, community investment, media profile,
and related values through the Cycle. `NBA` and `Warriors` normalize to Oaks
only on read.

Current effects include:

- record, streak, fan sentiment, season, and media-profile adjustments to
  `sportsSentimentBoost`;
- folding that boost into final city sentiment;
- manual or inferred sports triggers;
- neighborhood traffic, retail, nightlife, and community effects when
  `HomeNeighborhood` and the relevant state are present;
- attributed `Ripple_Ledger` rows with cause `Oakland_Sports_Feed`.

The exact sentiment calculation is engine logic, not an entry target. The
operator supplies facts and state; the engine calculates the consequence.

## Phase 5 citizen behavior

### Named players

[phase05-citizens/applyGameNightMoments.js](../phase05-citizens/applyGameNightMoments.js)
uses current-Cycle entries whose `EventType` contains `game`. It splits
`NamesUsed` on commas, pipes, semicolons, or slashes, then matches the
lowercased exact `First Last` against active `Simulation_Ledger` citizens.

A resolved named player can receive:

- a `LifeHistory` game-night moment;
- a `LifeHistory_Log` row;
- `Ripple_Ledger` attribution with cause
  `Oakland_Sports_Feed.gameNight`.

The moment is bucketed as win, win streak, loss, or neutral from `Streak` and
`PlayerMood`. An unmatched or inactive name does not receive this moment.

### Watching citizens

[phase05-citizens/generateCitizensEvents.js](../phase05-citizens/generateCitizensEvents.js)
uses a current-Cycle game entry to build a city game-night event pool. Eligible
citizens may draw a watching/attending/reaction event weighted by sports
sentiment. Selected citizens receive a citizen event, LifeHistory text, and
Ripple attribution.

This is probabilistic. A valid game row makes the pool eligible; it does not
guarantee a moment for every citizen.

## Media and supporting consumers

| Consumer | Current use | Important limitation |
|---|---|---|
| `phase07-evening-media/sportsStreaming.js` | Builds evening sports text, preferring `StoryAngle` and then team/event/notes | Uses current-Cycle entries and last-entry details |
| `phase07-evening-media/storyHook.js` | Converts selected sports triggers into story hooks | Does not map every trigger Phase 2 can emit |
| `scripts/buildWorldSummary.js` | Emits current and two prior Cycles with story, record, streak, mood, sentiment, and neighborhood context | Reads the live Sheet when run |
| `scripts/buildDeskPackets.js` | Builds exact-Cycle A's/Oaks sports digests for newsroom packets | Historical Oakland rows are no longer substituted when the Cycle is empty |
| `lib/wakePerception.js` | Gives citizens a latest-Cycle A's perception slice | A's-only; does not provide Oaks parity |
| `phase10-persistence/compileHandoff.js` | Adds exact-Cycle A's/Oaks feed data to handoff text | Reads all twenty feed columns; roster canon-reference parity remains separate work |
| `scripts/preflightInputCheck.js` | Checks current-Cycle required/recommended presence | Does not validate full enums, formats, or roster identity |
| `dashboard/sportsRoutes.js` | Projects live feed and roster reads, local Notebook artifacts, deterministic previews, and the feature-gated verified append route | Append stays disabled until HTTPS/private-bind/security configuration, review, deployment approval, and live proof |

## Roster relationship

### `As_Roster`

`As_Roster` has 20 columns:

- identity and roster fields: POPID, name parts, Tier, Position, Team, Salary;
- current batting-stat fields: AB, AVG, H, HR, RBI, SB, SO;
- current pitching-stat fields: IP, ERA, W-L, SO, BB.

It is also read by several canon/reviewer and reference-building scripts.

### `Oaks_Roster`

`Oaks_Roster` has 14 columns:

- identity and roster fields: POPID, name parts, Tier, Position, Team, Salary;
- current basketball-stat fields: PPG, ASST, REB, STL, FG%, 3P%.

It is not currently wired into all of the canon/reviewer paths that use
`As_Roster`.

### Current tie-in

The feed engine does not perform a live lookup against either roster. The
relationship is conventional:

- `TeamsUsed` identifies the team;
- `NamesUsed` carries display names;
- an exact active `Simulation_Ledger` name match enables named-player moments.

Therefore a roster picker is a safety improvement only when the server validates
the selection, preserves the POPID in the staged submission, and writes the
compatible exact name. A feed-only entry still does not trade, sign, injure,
release, or call up a player. The source-built mutation path accepts only one
exact roster/ledger participant and one of four bounded actions: `injury`,
`return`, `call-up`, or `trade-away`.

The sport-specific roster columns are Mike's handy current-stat-line snapshot.
`As_Roster` and `Oaks_Roster` are authoritative for current-season values.
Feed `Stats` describe the event for downstream story context; they are never a
hidden structured payload. A `stat-capture` confirmation updates only reviewed,
allowlisted roster cells and appends one compatible feed row in the same batch.
Season history remains a separate TrueSource concern.

## Current entry checklist

Until the source-built dashboard workspace is separately deployed and live-read
proved, use the Sheet directly:

1. Enter the exact Cycle.
2. Enter `SeasonType`, `EventType`, and canonical `TeamsUsed` on every row.
3. Use exact roster-backed `First Last` values in `NamesUsed`.
4. Preserve factual detail in `Notes`, verified event values in `Stats`, and
   the intended framing in `StoryAngle`; update current player lines separately.
5. Add only the event controls and team-state values supported by what happened.
6. Remember that a later non-empty team-state value in the same Cycle overrides
   an earlier one.
7. Treat roster/status changes as one separately confirmed engine.77 operation;
   until the Dashboard source is deployed and live-proved, perform it only
   through the existing operator-controlled Sheet workflow.
8. Run the documented current-Cycle preflight before an engine Cycle.

## Workspace implementation (Waves A–C)

The source tree now contains a dashboard **Cycle Sports Workspace**, not a
replacement Sheet schema:

- choose Cycle and team once;
- select an event template;
- pick players from `As_Roster` or `Oaks_Roster`;
- see each selected player's current stat line without retyping it;
- enter the good story detail in a short event card;
- edit team state separately, with inherited values visible;
- preview newsroom, city, neighborhood, named-player, and watching-citizen
  effects;
- inspect the exact twenty-column compatibility row;
- keep Notebook Daily items permanently `NOT CANON` and attach provenance only;
- review current-season stat diffs without collapsing the A's duplicate `SO`
  headers;
- preview exact roster/citizen state, deterministic LifeHistory/log text, and
  citizen Ripple attribution for the four engine.77 actions;
- confirm one atomic feed/stat or feed/state/life/Ripple batch only through the
  separately gated browser flow;
- perform no NotebookLM, Drive, memory, publication, deployment, or service
  write.

The implemented server routes are `GET /api/sports/overview`,
`GET /api/sports/workspace`, `GET /api/sports/notebook`, and
`POST /api/sports/preview`, plus disabled-by-default
`POST /api/sports/entries`. Responses share contract version 1, provenance,
warnings, safe errors, and a 60-second live-Sheet cache with explicit stale
failover. The local Notebook adapter reads only complete
`output/notebooklm/daily/c<Cycle>/<pack-hash>/` artifacts.

The extended writer signs 15-minute previews with a stable server secret and
server-generated idempotency key. It binds the actor, projected feed row,
selected physical roster and citizen rows, exact source headers, and CSRF nonce.
One process-global lock revalidates those sources, rejects any formula-backed
update target, and sends one `spreadsheets.batchUpdate` request. Immediately
before that batch, the writer re-resolves the `LifeHistory_Log` and
`Ripple_Ledger` append targets. One moved target causes one fresh
formula-visible preflight and one re-check; a second move returns
`409 sports_source_changed` before any batch. The writer never retries after
`batchUpdate`, because an ambiguous result may already have applied. Numeric
stat fields use numeric `userEnteredValue`; W-L and narrative/state cells remain
explicit strings.
Exact read-back covers the feed, roster, citizen, `LifeHistory_Log`, and
`Ripple_Ledger` surfaces applicable to the action. The metadata-only audit
stores the actual resolved ranges plus hashed before/after values for every
target cell; it does not duplicate Notes, Stats, HealthCause, or LifeHistory
prose. A structured Google 4xx rejection is a proven no-op and does not latch
the writer. A timeout, lost response, or read-back mismatch remains ambiguous
and disables later writes in that process for builder review.

`trade-away` writes `Status=Traded` but deletes or archives no row; engine.90
owns any later departure archive. `season-close` remains fail-closed until an
updated authoritative TrueSource establishes the complete row/header payload.

The route refuses writes unless its feature flag is enabled, dashboard
authentication and the separate sports-write capability are both configured,
and the dashboard is loopback-bound behind the exact configured HTTPS origin
with a Secure cookie. Dashboard authentication plus the capability are the
authorization controls; HTTPS, same-origin, Secure-cookie, and loopback checks
are proxy/transport attestations. Sports request bodies are capped at 64 KiB
before JSON parsing and feed fields at 50,000 characters. No TLS proxy is
installed yet, so the source cannot report itself ready for live appends.
Deployment/restart, authenticated live reads, and a builder-supplied proving
event remain separate approval gates. Engine.77 remains disabled for unattended
use; an attended engine.77 confirmation must not overlap a Cycle because the
Cycle's whole-ledger Phase 10 commit can overwrite a mid-Cycle citizen change.
Engine.40 stat capture does not mutate `Simulation_Ledger` and is assessed
separately.

## Remaining gaps

The A's/Oaks active contract, packet exact-Cycle behavior, and handoff field
coverage are repaired. Remaining gaps are:

- the Sheet setup utility does not cover columns P–T;
- the preflight and dropdown utility do not share one validator;
- A's roster context has wider reviewer coverage than Oaks roster context;
- the independent review remediation needs re-review; unattended engine.77
  remains disabled until a genuine cross-runtime exclusion mechanism is
  separately designed and approved;
- deployment, authenticated live reads, and separately approved stat/engine.77
  proving writes remain open;
- TrueSource season close remains open until the authoritative source update
  defines its complete payload contract;
- the remote-browser deployment still needs a public hostname, TLS proxy,
  direct-port restriction, secure environment configuration, and review.

Do not repair the world by changing historical feed values. Align the active
parsers, validators, and consumers through an approved implementation plan.

## Changelog

- 2026-07-28 — Created from the schema and end-to-end consumer trace; documented
  the roster relationship, current operator contract, known drift, and adopted
  entry-workspace direction; clarified roster stat columns as current snapshots
  separate from event `Stats`.
- 2026-07-29 — Added the `engine.89` rollout discovery pointer.
- 2026-07-30 — Linked the A's/Oaks live-workspace implementation plan,
  including the non-canon Notebook inbox and gated append/read-back boundary.
- 2026-07-30 — Documented source-built Waves A–B: shared A's/Oaks contract,
  exact-Cycle projections, live-read/local-artifact endpoints, roster UI,
  non-canon Notebook inbox, and deterministic no-write Ripple Preview; retained
  restart, live proof, and Wave C append as separate gates.
- 2026-08-02 — Documented the source-built engine.40/engine.77 extension:
  duplicate-header-safe current-season stat writes, four bounded roster actions,
  one atomic multi-ledger batch with exact read-back, engine.90 exclusion, and
  the deferred TrueSource season-close gate. No deployment or live write.
- 2026-07-31 — Documented the pre-landing Task 4 compatibility correction:
  Phase 2 retains historical free-text/NFL reads, logs unknown nonblank team
  values, and keeps the new draft/write contract restricted to A's and Oaks.
- 2026-07-31 — Documented source-built Wave C: remote-browser security gates,
  signed restart-stable previews, one-row append/exact read-back, persistent
  idempotency audit, and the confirmation/receipt UI; retained proxy,
  deployment, and live proof as separate approvals.
- 2026-08-02 — Documented the independent-review remediation source: exact feed
  headers, formula-safe typed stat writes, structured no-op error
  classification, bounded bodies/fields, first/last+POPID roster joins, and
  hashed cell pre-images. Re-review, deployment, and live proof remain open.
- 2026-08-02 — Documented the bounded pre-batch append-target retry: one moved
  target receives one fresh preflight/re-check, a second move fails before the
  batch, and no post-batch result is retried. Recorded the split Cycle boundary:
  engine.77 attended/non-overlapping only; engine.40 assessed separately.
