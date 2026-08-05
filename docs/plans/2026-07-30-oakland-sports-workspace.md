---
title: Oakland Sports Workspace Plan
created: 2026-07-30
updated: 2026-08-03
type: plan
tags: [sports, infrastructure, engine, active]
sources:
  - Mike-direct 2026-07-30 — repair the Dashboard Sports tab around The A's and The Oaks, their live feed/season state, and their roster ledgers
  - docs/research/2026-07-27-oakland-sports-feed-entry-dashboard.md
  - docs/OAKLAND_SPORTS_FEED.md
  - docs/DASHBOARD.md and 2026-07-30 source/runtime audit
  - schemas/SCHEMA_HEADERS.md §Oakland_Sports_Feed, §As_Roster, §Oaks_Roster
  - scripts/notebooklmDailyNews.js and docs/reference/notebookLM-CLI.md
  - docs/engine/ENGINE_REPAIR.md §engine.40, §engine.77
  - engine-sheet review verdict 2026-07-31 — Waves A–B verified; Wave C requires auth, compatibility, deployment-sequencing, and transport amendments
  - Mike-direct 2026-07-31 — proceed with the plan and optimize Wave C for the best browser UI experience
pointers:
  - "[[../engine/ROLLOUT_PLAN]] — engine.89 parent rollout"
  - "[[../research/2026-07-27-oakland-sports-feed-entry-dashboard]] — research basis"
  - "[[../OAKLAND_SPORTS_FEED]] — current feed and roster contract"
  - "[[2026-07-10-notebooklm-bridge-deploy]] — authoritative Daily News artifact contract"
  - "[[2026-07-20-headless-newsroom-pipeline]] — adjacent newsroom boundary"
  - "[[2026-07-05-game-night-connection-design]] — downstream citizen-event design"
  - "[[../engine/ENGINE_REPAIR]] — engine.40 and engine.77 sibling work"
---

# Oakland Sports Workspace Plan

**Goal:** Replace the stale packet-based Dashboard Sports tab with a
Cycle-aware workspace that reads the live `Oakland_Sports_Feed`, `As_Roster`,
and `Oaks_Roster`, presents The A's and The Oaks clearly, accepts structured
event drafts, previews their engine ripples, and appends one verified feed row
only through a disabled-by-default write boundary.

**Architecture:** Add dedicated sports contracts and projection helpers that
normalize the two Oakland teams without rewriting historical Sheet values.
Express routes expose live Sheet reads, a local non-canon NotebookLM inbox, and
a deterministic preview; React consumes those routes in a focused Oakland
workspace. The source-built writer can append and read back one feed row only
behind a disabled-by-default remote-browser security boundary; roster state,
citizen events, publication, Drive, and NotebookLM generation remain outside
that write.

**Terminal:** engine-sheet

**Independent reviewer:** Opus 5 reviews the corrected Waves A–B diff and the
complete Wave C source/security evidence before landing. The reviewer proposes
findings only; engine-sheet owns gated code changes and landing.

**Pointers:**

- Prior work: [[../research/2026-07-27-oakland-sports-feed-entry-dashboard]]
- Current contract: [[../OAKLAND_SPORTS_FEED]]
- Parent rollout: [[../engine/ROLLOUT_PLAN]] `engine.89`
- Sibling work: [[../engine/ENGINE_REPAIR]] `engine.40` and `engine.77`
- Related design: [[2026-07-05-game-night-connection-design]]

## Scope lock

### Team identity

| Internal ID | Dashboard label | New `Team` cell | Read-only legacy aliases |
|---|---|---|---|
| `as` | The A's | `A's` | none |
| `oaks` | The Oaks | `Oaks` | `NBA`, `Warriors` |

The aliases are compatibility reads only. New drafts and writes accept only
`as` or `oaks` and emit only `A's` or `Oaks`; their validators reject unknown
teams. The Apps Script compatibility reader logs and skips an unknown nonblank
`TeamsUsed` value while preserving prior free-text and NFL active-sport
detection. A legitimately blank value remains silent. This plan does not
rewrite historical feed rows.

### Authority map

| Information | Authority | Workspace behavior |
|---|---|---|
| Event facts and season/team state | `Oakland_Sports_Feed` | Live read, exact-Cycle event view, inherited state labeled with its source Cycle |
| A's players and current stat lines | `As_Roster` | Live roster surface and exact POPID-backed selection |
| Oaks players and current stat lines | `Oaks_Roster` | Live roster surface and exact POPID-backed selection |
| Citizen name resolution | `Simulation_Ledger` | Resolve and display existing citizens only; never mint a name or POPID |
| Published sports continuity | Published Bay Tribune artifacts | Read-only context through existing canon-safe paths |
| Daily NotebookLM listening brief | Completed local `output/notebooklm/daily/` artifacts | Optional, permanently labeled NOT CANON, provenance-only draft starter |
| Local player history | `output/player-index.json` | Optional context only; never substitutes for either live roster |

Version 1 may write only one `Oakland_Sports_Feed` row. Current-stat changes
remain `engine.40`; roster/team-state and LifeHistory mutations remain
`engine.77`; departed-player archival remains `engine.90`. This plan authorizes
no Edition, Dispatch, Supplemental, Drive, NotebookLM, Supermemory, Discord, or
other external write.

The approved follow-on [[2026-08-02-sports-stat-event-intake]] preserves this
feed compatibility boundary while extending the same Dashboard surface with
source-built engine.40 and engine.77 mutations. That owning plan controls the
duplicate-header-safe stat maps, four-action state matrix, atomic multi-ledger
writer, exact read-back, and deferred TrueSource season close. This plan remains
the deployment prerequisite for hostname, TLS/proxy, authentication, and the
base feed-write proof.

### Locked version-1 decisions

- One event is previewed and confirmed at a time. There is no multi-row Cycle
  commit.
- Feed and roster routes read through the live Sheet loader with a sports-route
  cache ceiling of 60 seconds. Responses expose cache age; a successful append
  bypasses or invalidates that cache before read-back.
- Preview tokens expire after 15 minutes and are signed with a stable
  server-side secret. They bind the authenticated actor, request hash,
  projected row, and source snapshots without persisting the envelope to a
  Sheet, file, browser store, or external service. Routine PM2 restarts must not
  silently invalidate an otherwise current preview; secret rotation may
  invalidate it explicitly.
- Team-state changes attach to the event that establishes them. An explicit
  `season-state` template is available when there is no event, but the server
  never creates a hidden final state row.
- Player current-stat changes are displayed but not editable in this workspace.
  They stay behind `engine.40`.

### Field policy

The shared contract must preserve the following current parser/dropdown values.
It may display friendlier labels, but it emits these exact values:

| Field | Version-1 rule |
|---|---|
| `Cycle` | Positive integer, builder-selected |
| `SeasonType` | `off-season`, `spring-training`, `preseason`, `early-season`, `mid-season`, `late-season`, `regular-season`, `playoffs`, `post-season`, `championship`, `finals`, `world-series` |
| `EventType` | `game-result`, `roster-move`, `player-feature`, `front-office`, `fan-civic`, `season-state`, `editorial-note` |
| `TeamsUsed` | `A's` or `Oaks` for new rows |
| `NamesUsed` | Exact roster/citizen names, comma-delimited; blank only when the event has no named participant |
| `Notes`, `Stats`, `StoryAngle` | Reviewed builder-authored text; never model-required or model-rewritten |
| `Team Record` | Whole-number wins and losses separated by `-` or `–`; required for `game-result` |
| `VideoGameDate`, `VideoGame` | Always blank; retained only for the twenty-column compatibility row |
| `PlayerMood` | blank, `confident`, `frustrated`, `hungry`, `reflective`, `dominant`, `uncertain`, `locked-in`, `quiet`, `electric` |
| `EventTrigger` | blank, `hot-streak`, `cold-streak`, `playoff-push`, `playoff-clinch`, `eliminated`, `championship`, `rivalry`, `home-opener`, `season-finale`, `trade-deadline`, `all-star`, `draft` |
| `HomeNeighborhood` | Blank or an exact existing Oakland neighborhood from the active validation list |
| `Streak` | Blank or full-string `W<n>` / `L<n>` |
| `FanSentiment` | blank, `electric`, `euphoric`, `high`, `confident`, `excited`, `neutral`, `moderate`, `uncertain`, `anxious`, `low`, `apathetic`, `disappointed`, `frustrated`, `angry`, `hostile` |
| `FranchiseStability` | blank, `stable`, `strong`, `growing`, `uncertain`, `unstable`, `crisis`, `relocating` |
| `EconomicFootprint` | blank, `growing`, `booming`, `stable`, `steady`, `shrinking`, `declining`, `uncertain` |
| `CommunityInvestment` | blank, `active`, `strong`, `heavy`, `moderate`, `growing`, `passive`, `minimal`, `declining`, `none`, `absent` |
| `MediaProfile` | blank, `local`, `regional`, `national`, `international` |

These vocabularies come from
`utilities/setupSportsFeedValidation.js` and the active parsers in
`phase02-world-state/applySportsSeason.js`. Any existing non-empty Sheet value
outside them is surfaced as legacy/unknown and preserved for reads; it is not
silently normalized into a new write.

## Verified baseline

- `dashboard/server.js` currently serves `GET /api/sports` from generated
  `sports_c*.json` and Chicago packets rather than the three live Oakland
  Sheets.
- The latest inspected sports packet contains 192 historical feed rows, has no
  packet Cycle, and carries digest keys `as` and `warriors`. The all-history
  fallback originates in `scripts/buildDeskPackets.js` when Cycle is empty.
- `dashboard/src/App.jsx` filters the digest to `Warriors`, so the current
  packet's Oaks/legacy state is hidden even while Oakland rows are dumped below.
- The Sports tab mixes Oakland and Chicago although Chicago has its own tab.
- Sports fetch failures are swallowed and leave a permanent loading state.
- The current built mobile surface has dense text, bottom-navigation overlap,
  and an object rendered as `[object Object]`.
- `output/player-index.json` has no Oaks roster and therefore cannot replace
  live `As_Roster` and `Oaks_Roster` reads.
- Current team names drift across `scripts/buildDeskPackets.js`,
  `utilities/setupSportsFeedValidation.js`,
  `phase02-world-state/applySportsSeason.js`, and
  `phase10-persistence/compileHandoff.js`.
- The Dashboard's current public authentication posture is not sufficient for
  a canon-bearing append route. It has one shared credential and no role model,
  so there is no write role to check. There is also no CSRF token, idempotency
  contract, or read-back proof.
- Existing dashboard validation is visual/generic; there are no focused sports
  route or component tests.

## Product surface

The repaired Sports tab is Oakland-only and has five compact surfaces:

1. **Oakland overview** — Cycle selector, feed/roster freshness, separate A's
   and Oaks state cards, and explicit empty/error/retry states.
2. **Cycle events** — exact-Cycle event cards. A Cycle with no rows is shown as
   empty, never silently replaced with full history.
3. **Team roster** — live team roster, current stat lines, injury/status fields,
   exact POPIDs, and roster-source freshness.
4. **Notebook Daily Inbox** — the latest completed daily brief artifacts,
   labeled NOT CANON, with citation count and freshness.
5. **Enter Sports Events** — event templates, roster-backed player selection,
   deterministic row preview, Ripple Preview, validation, and—only after the
   separate deployment gate—explicit confirmation.

Chicago remains on its existing dedicated tab. The Sports tab does not render
Chicago packets, NBA labels, or Warriors labels.

Entry labels map deterministically to existing `EventType` values:

| Friendly template | Emitted `EventType` |
|---|---|
| Game result | `game-result` |
| Injury/status, trade, signing, cut, or call-up | `roster-move` |
| Player milestone, feature, or community appearance | `player-feature` |
| Front-office or coaching event | `front-office` |
| Fan or civic event | `fan-civic` |
| Team/season state without another event | `season-state` |
| Builder story observation | `editorial-note` |

## API and projection contracts

Every new sports response uses the same fail-loud envelope:

```json
{
  "contractVersion": 1,
  "source": {
    "kind": "sheet|local-artifact|projection",
    "name": "Oakland_Sports_Feed",
    "fetchedAt": "engineering timestamp",
    "cycle": 119
  },
  "data": {},
  "warnings": [],
  "error": null
}
```

Engineering timestamps describe fetch freshness and never enter world-facing
copy. A route failure returns a non-2xx status and a safe error code; it does
not masquerade as an empty successful result.

### Routes

- `GET /api/sports/overview?cycle=N` — exact-Cycle feed events, both teams'
  effective state, roster counts, freshness, and warnings.
- `GET /api/sports/workspace?cycle=N&team=as|oaks` — one normalized live
  roster, its current stat fields, team state, and valid event options.
- `GET /api/sports/notebook?limit=1..7` — completed local daily artifacts,
  newest first; no live NotebookLM request.
- `POST /api/sports/preview` — validates a draft, resolves existing citizens,
  returns the exact twenty-column row and downstream Ripple Preview, and writes
  nothing.
- `POST /api/sports/entries` — feature-gated confirm/append/read-back route.
- Existing `GET /api/sports` stays temporarily for Chicago or an unmigrated
  consumer, but gains explicit provenance/deprecation metadata and is not used
  by the repaired Oakland surface.

### Cycle and state rules

- Feed events are exact-Cycle. Missing Cycle data returns an empty list.
- Non-empty team-state fields may inherit from the latest prior row for that
  team. Every inherited field carries `sourceCycle` and `sourceRow`.
- Multiple same-Cycle state rows resolve by the latest Sheet row, with a
  warning when values conflict.
- Player selection stores the exact roster POPID and canonical name.
- Event `Stats` remain event facts. They never overwrite roster current-stat
  fields.

### NotebookLM boundary

The server reads only completed local artifacts produced by
`scripts/notebooklmDailyNews.js`:

```text
output/notebooklm/daily/c<Cycle>/<pack-hash>/
  manifest.json
  daily-brief.json
  daily-brief.md
```

The adapter exposes Cycle, artifact freshness, answer text, citation count, and
an optional allowlisted audio or Drive link. It strips notebook IDs, source IDs,
conversation IDs, and local paths. The UI always displays NOT CANON. “Start
draft” opens a blank event with artifact provenance; it does not copy a claim
into a feed field, infer a score/stat, or submit anything.

## Preview and write boundary

The flow is:

```text
draft
  → schema and team validation
  → roster/POPID resolution
  → exact twenty-column row projection
  → Ripple Preview
  → short-lived preview token
  → explicit confirm with idempotency key
  → server revalidation
  → one append
  → exact-range read-back
  → twenty-cell comparison
  → metadata-only local audit record
```

Preview tokens expire after 15 minutes and bind the authenticated actor, request
hash, projected row, and source snapshots. The token is signed and
restart-stable; confirmation still performs fresh server-side validation. The
write route refuses unless all of these hold:

1. a dedicated sports-write feature flag is enabled;
2. the approved transport mode is satisfied: loopback for tunnel-only use, or
   HTTPS behind an approved reverse proxy for remote-browser use;
3. dashboard authentication and the separate step-up sports-write capability
   both pass as the authorization controls; same-origin, CSRF, HTTPS, and
   loopback checks remain required transport/request-integrity attestations,
   not substitutes for authorization;
4. the preview token, explicit confirmation, and idempotency key are valid;
5. revalidation returns zero errors;
6. one append is performed through a single server-side writer;
7. the updated range is read back and all twenty cells match.

The audit log is `output/sports-intake/append-audit.jsonl` and contains metadata
only: actor identifier/hash, engineering timestamp, Cycle, team, event type,
row/range, request hash, idempotency key, result, and safe error code. It must
not duplicate story text or credentials. Replaying the same key and request
returns the prior result; reusing the key with a different request returns 409.

## Acceptance criteria

1. The Oakland Sports tab has distinct, consistently named surfaces for The
   A's and The Oaks.
2. New drafts and writes accept only those two teams and emit `A's` or `Oaks`;
   legacy NBA/Warriors values are read-only aliases.
3. Selecting a Cycle with no feed rows shows an intentional empty state rather
   than full feed history.
4. Each team state value shows whether it is current or inherited and the
   source Cycle.
5. Both roster panels read their live Sheet, show exact POPIDs, and display
   roster current-stat fields separately from feed-event `Stats`.
6. The Oakland surface displays no Chicago, NBA, or Warriors team labels.
7. All new sports APIs return the consistent versioned envelope, provenance,
   warnings, and fail-loud errors.
8. A route failure produces a useful error and retry control, not an endless
   spinner.
9. Notebook daily items remain visibly non-canon and stale-aware; opening one
   cannot directly write or silently populate event facts.
10. Each entry template presents only relevant questions and produces an exact
    twenty-cell `Oakland_Sports_Feed` row.
11. Preview resolves existing players/citizens and performs zero Sheet writes.
12. Ripple Preview accurately labels known Phase/newsroom consumers and marks
    `engine.40`/`engine.77` effects as unavailable sibling work.
13. With sports writes disabled, the entry route returns 403 and invokes no
    append helper.
14. Under a separately approved live-write proving run, one real event creates
    one row, reads it back exactly, and a repeated idempotency key cannot create
    a second row.
15. No roster, Simulation Ledger, LifeHistory, NotebookLM, Drive, publication,
    memory, or messaging write occurs through this feature.
16. Targeted tests, syntax checks, frontend build, accessibility/visual checks,
    `git diff --check`, and rollout lint pass.
17. [[../DASHBOARD]], [[../OAKLAND_SPORTS_FEED]], and the owning plan accurately
    describe the shipped behavior and remaining gates.

---

## Tasks

Implementation is divided into four reviewable waves. Waves A and B are
read-only. Wave C implements a writer that remains disabled by default. Wave D
proves and documents the result; production enablement is a separate builder
decision.

### Wave A — shared contracts and live read surface

### Task 1: Centralize the Oakland sports contract

- **Files:**
  - `scripts/sportsFeedContract.js` — create
- **Steps:**
  1. Define the twenty feed headers in canonical order, team IDs/display/Sheet
     values, read-only aliases, event types, required fields, and safe enums.
  2. Export pure normalization and validation functions with no Sheet or file
     access.
- **Verify:** `node --check scripts/sportsFeedContract.js` → exit 0.
- **Status:** [x] complete — 2026-07-30

### Task 2: Lock contract behavior in tests

- **Files:**
  - `scripts/sportsFeedContract.test.js` — create
- **Steps:**
  1. Cover A's/Oaks normalization, legacy read aliases, unknown-team failure,
     header order, required fields, safe enums, and no invented defaults.
  2. Assert new-row projection never emits `NBA` or `Warriors`.
- **Verify:** `node scripts/sportsFeedContract.test.js` → all assertions pass.
- **Status:** [x] complete — 2026-07-30

### Task 3: Build the pure workspace projection

- **Files:**
  - `scripts/sportsWorkspaceProjection.js` — create
  - `scripts/sportsWorkspaceProjection.test.js` — create
- **Steps:**
  1. Project feed rows and both roster shapes into exact-Cycle events, effective
     team state, roster snapshots, freshness, and warnings.
  2. Cover empty Cycle, prior-state inheritance, same-Cycle conflicts, malformed
     POPIDs, missing rosters, and legacy aliases with synthetic non-canon data.
- **Verify:** `node scripts/sportsWorkspaceProjection.test.js` → all assertions
  pass.
- **Status:** [x] complete — 2026-07-30

### Task 4: Repair active team-contract drift

- **Files:**
  - `scripts/buildDeskPackets.js` — modify
  - `scripts/sportsFeedContract.test.js` — extend focused packet helpers
  - `utilities/setupSportsFeedValidation.js` — modify
  - `phase02-world-state/applySportsSeason.js` — modify
  - `phase10-persistence/compileHandoff.js` — modify
  - `scripts/applySportsSeasonTeamCompatibility.test.js` — create
- **Steps:**
  1. Replace new-output A's/Warriors assumptions with the shared A's/Oaks
     contract while retaining explicit legacy reads.
  2. Remove the empty-Cycle all-history fallback from Oakland packet projection;
     fail or return an explicitly empty Cycle surface.
  3. Add focused synthetic tests before changing consumers.
  4. Preserve the Apps Script reader's prior free-text team recognition and NFL
     active-sport detection. Log and skip unknown nonblank `TeamsUsed` values;
     keep genuinely blank values silent.
- **Verify:** targeted tests and `node --check` on each changed JavaScript file
  pass; an isolated synthetic Apps Script harness covers A's free text, Oaks,
  legacy NBA/Warriors, NFL, unknown nonblank, and blank values; no historical
  Sheet mutation occurs.
- **Status:** [x] complete — 2026-07-31 compatibility correction implemented
  and locally validated; Opus 5 re-review remains required before landing

### Task 5: Add dedicated live-read routes

- **Files:**
  - `dashboard/sportsRoutes.js` — create
  - `dashboard/server.js` — modify
- **Steps:**
  1. Read `Oakland_Sports_Feed`, `As_Roster`, and `Oaks_Roster` through the
     existing Sheet loader without changing generic `/api/players` or
     `/api/roster`.
  2. Register overview/workspace routes with validation, safe caching,
     provenance, warnings, and fail-loud error handling.
  3. Keep legacy `/api/sports` available but mark its source and deprecation.
- **Verify:** `node --check dashboard/sportsRoutes.js` and
  `node --check dashboard/server.js` → exit 0.
- **Status:** [x] complete — 2026-07-30

### Task 6: Test the live-read routes without Sheets

- **Files:**
  - `dashboard/sportsRoutes.test.js` — create
- **Steps:**
  1. Inject fake Sheet loaders and synthetic non-canon rows.
  2. Cover both teams, exact Cycle, empty result, malformed source data, loader
     failure, freshness, and no generic roster endpoint regression.
- **Verify:** `node dashboard/sportsRoutes.test.js` → all assertions pass with
  zero network calls.
- **Status:** [x] complete — 2026-07-30

### Task 7: Add the local Notebook Daily Inbox adapter

- **Files:**
  - `scripts/notebookDailyInbox.js` — create
  - `scripts/notebookDailyInbox.test.js` — create
  - `dashboard/sportsRoutes.js` — modify
- **Steps:**
  1. Read only complete local daily artifact directories and expose the
     allowlisted fields defined in this plan.
  2. Reject path traversal, incomplete manifests, canon-status drift, and
     malformed JSON; label all successful results NOT CANON.
  3. Register `GET /api/sports/notebook` without invoking NotebookLM.
- **Verify:** `node scripts/notebookDailyInbox.test.js` and
  `node dashboard/sportsRoutes.test.js` → all assertions pass.
- **Status:** [x] complete — 2026-07-30

### Task 8: Extract the Oakland Sports frontend

- **Files:**
  - `dashboard/src/App.jsx` — modify
  - `dashboard/src/components/SportsTab.jsx` — create
  - `dashboard/src/lib/sportsApi.js` — create
- **Steps:**
  1. Replace the packet/history rendering with the new API client and Oakland
     component; keep Chicago on its dedicated tab.
  2. Add loading, empty, stale, error, and retry states; render structured data
     deliberately so objects never stringify into the UI.
- **Verify:** dashboard frontend build passes.
- **Status:** [x] complete — 2026-07-30

### Task 9: Build overview and roster panels

- **Files:**
  - `dashboard/src/components/SportsOverview.jsx` — create
  - `dashboard/src/components/SportsRoster.jsx` — create
- **Steps:**
  1. Add accessible Cycle/team controls and side-by-side/stacked team cards.
  2. Show effective state provenance and live roster stat fields at usable
     desktop and mobile density.
- **Verify:** frontend build and synthetic desktop/mobile visual QA pass.
- **Status:** [x] complete — 2026-07-30

### Wave B — non-canon inbox and read-only preview

### Task 10: Build the Notebook Daily Inbox UI

- **Files:**
  - `dashboard/src/components/SportsNotebookInbox.jsx` — create
- **Steps:**
  1. Render artifact Cycle, freshness, citation count, short answer preview, and
     permanent NOT CANON treatment.
  2. Make “Start draft” carry provenance only and add safe optional link/audio
     handling.
- **Verify:** route tests and the synthetic UI fixture prove that starting a
  draft carries provenance only and that no write request is issued.
- **Status:** [x] complete — 2026-07-30

### Task 11: Build intake templates and Ripple Preview

- **Files:**
  - `dashboard/src/components/SportsIntakeWorkspace.jsx` — create
  - `dashboard/src/components/SportsRipplePreview.jsx` — create
  - `dashboard/sportsRoutes.js` — modify
  - `dashboard/sportsRoutes.test.js` — modify
- **Steps:**
  1. Add relevant-field templates for game result, injury/status, roster move,
     milestone, and season-state update.
  2. Resolve roster/citizen identity server-side and return the exact
     compatibility row plus affected current consumers.
  3. Label unavailable `engine.40`/`engine.77` effects rather than simulating
     writes.
- **Verify:** route tests and synthetic visual QA prove preview performs zero
  append calls and displays the exact twenty-cell row.
- **Status:** [x] complete — 2026-07-30

### Wave C — disabled-by-default append boundary

The builder selected **remote browser** on 2026-07-31 for the best entry
experience, then selected private Tailscale access on 2026-08-03 instead of a
purchased public domain. The source boundary therefore requires all of these
before it reports itself configured:

- an HTTPS private origin set by `SPORTS_WRITE_ORIGIN`;
- a loopback-only dashboard listener via `DASHBOARD_BIND_HOST`;
- trusted-proxy handling limited to loopback;
- a Secure, HttpOnly, SameSite=Strict dashboard cookie via
  `DASHBOARD_COOKIE_SECURE`;
- configured dashboard authentication via `DASHBOARD_USER` and
  `DASHBOARD_PASS`;
- separate `SPORTS_PREVIEW_TOKEN_SECRET` and `SPORTS_WRITE_CAPABILITY` secrets;
- the disabled-by-default `SPORTS_WRITE_ENABLED` feature flag.

Tailscale Serve now provides private HTTPS at
`https://godworld.tail6d8700.ts.net`, and UFW exposes no direct `3001/tcp` rule.
The dashboard still needs its loopback/Secure-cookie sports-write environment
configuration and restart before the source can report itself configured.

Both modes use a dedicated step-up sports-write capability because the current
single dashboard credential has no roles. The capability is not stored in the
browser and is never returned by an API. The write feature flag remains off
until the chosen transport and capability are locally tested and separately
deployed.

### Opus 5 review gate

Before engine-sheet lands Waves A–B, Opus 5 reviews the final diff and focused
test evidence for:

1. preserved free-text team recognition and NFL active-sport compatibility;
2. one fail-loud log for unknown nonblank `TeamsUsed`, with blank rows silent;
3. no accidental expansion of the two-team new-write contract;
4. an explicit source-only versus coordinated `clasp push` decision that does
   not silently carry the live-push-pending `engine.88` batch.

Before Wave C lands, Opus 5 reviews the amended implementation for:

1. a real step-up write-capability primitive rather than a nonexistent role
   check;
2. an explicit builder-selected loopback or remote-browser transport mode;
3. no write path over public plain HTTP;
4. signed preview tokens surviving a routine PM2 restart while still expiring
   and binding actor, request hash, projected row, and source snapshots;
5. deterministic disabled, replay, conflict, and read-back-mismatch tests with
   zero network or live Sheet calls.

The review verdict is recorded in this plan's status log. Approval of source
does not authorize restart, `clasp push`, feature-flag enablement, or a live
append.

### Current Opus 5 review packet

Review the final source diff in these groups:

1. **Team compatibility:** `phase02-world-state/applySportsSeason.js` and
   `scripts/applySportsSeasonTeamCompatibility.test.js`.
2. **Append/idempotency:** `lib/sheets.js`, `scripts/sportsFeedWriter.js`, and
   `scripts/sportsFeedWriter.test.js`.
3. **Token/security/routes:** `scripts/sportsPreviewToken.js`,
   `scripts/sportsPreviewToken.test.js`, `dashboard/sportsRoutes.js`,
   `dashboard/sportsRoutes.test.js`, and `dashboard/server.js`.
4. **Browser experience:** `dashboard/src/lib/sportsApi.js`,
   `SportsIntakeWorkspace.jsx`, `SportsWriteConfirmation.jsx`, `SportsTab.jsx`,
   and the Wave C fixture additions in `scripts/visual-qa.js`.

Expected evidence:

- seven focused suites pass with no network calls;
- all changed backend/script files pass `node --check`;
- the Vite production build passes with 1,587 modules;
- intercepted visual/accessibility QA passes 24/24 and exercises preview,
  confirmation, verified receipt, and mobile clearance;
- rollout lint and `git diff --check` are clean;
- targeted module-aware ESLint is clean; the root config gap is recorded below;
- `SPORTS_WRITE_ENABLED` remains off, no proxy is installed, no service was
  restarted, no `clasp push` occurred, and no live Sheet call or append ran.

Requested verdict: approve the source for engine-sheet landing or return
actionable findings. TLS/proxy selection, deployment, feature enablement, and a
real proving event remain builder gates even after source approval.

### Task 12: Add one detailed append primitive and sports writer

- **Files:**
  - `lib/sheets.js` — modify
  - `scripts/sportsFeedWriter.js` — create
  - `scripts/sportsFeedWriter.test.js` — create
- **Steps:**
  1. Add the smallest detailed append helper needed to return `updatedRange`
     without changing existing callers.
  2. Implement revalidation, one append, exact-range read-back, twenty-cell
     comparison, idempotency result handling, and metadata-only audit output.
  3. Test with injected fake Sheet and audit stores only.
- **Verify:** `node scripts/sportsFeedWriter.test.js` and syntax checks pass with
  zero network calls.
- **Status:** [x] complete — 2026-07-31 fake-only writer tests pass; source is
  disabled and undeployed

### Task 13: Gate the write route

- **Files:**
  - `dashboard/server.js` — modify
  - `dashboard/sportsRoutes.js` — modify
  - `dashboard/sportsRoutes.test.js` — modify
  - `dashboard/src/components/SportsIntakeWorkspace.jsx` — modify
  - `dashboard/src/components/SportsWriteConfirmation.jsx` — create
  - `dashboard/src/lib/sportsApi.js` — modify
  - `scripts/sportsPreviewToken.js` — create
  - `scripts/sportsPreviewToken.test.js` — create
- **Steps:**
  1. Resolve the builder's loopback-only versus remote-browser transport
     decision and record the exact authorized deployment surface.
  2. Enforce the feature flag, dashboard authentication, dedicated step-up
     write capability, selected transport, same-origin, CSRF, signed preview
     token, confirmation, idempotency, and request-hash checks. Treat auth plus
     capability as authorization; treat proxy/origin checks as attestations.
  3. Keep confirmation unavailable in the UI while the feature flag is off.
  4. Return safe status codes for expired preview, conflict, read-back mismatch,
     and disabled writes.
- **Verify:** tests prove disabled mode returns 403 with zero append calls and
  replay/conflict behavior is deterministic; a routine simulated process
  restart does not invalidate a still-current signed preview.
- **Status:** [x] complete — 2026-07-31 remote-browser source boundary and
  confirmation/receipt UI are locally validated; TLS/proxy deployment remains
  gated in Task 15

### Wave D — QA, documentation, and separately gated rollout

### Task 14: Add sports-specific visual and accessibility coverage

- **Files:**
  - `scripts/visual-qa.js` — modify
- **Steps:**
  1. Add desktop/mobile checks for both teams, empty/error/stale states, roster
     readability, bottom-nav clearance, focus order, labels, and contrast.
  2. Add a fixture proving structured stats never render as
     `[object Object]`.
- **Verify:** route/unit tests, frontend build, and local synthetic visual QA
  pass; no component test runner or new dependency was added.
- **Status:** [x] complete — 2026-07-31; Wave C visual flow passes 24/24

### Task 15: Close documentation and deployment gates

- **Files:**
  - `docs/DASHBOARD.md` — modify
  - `docs/OAKLAND_SPORTS_FEED.md` — modify
  - `docs/plans/2026-07-30-oakland-sports-workspace.md` — modify
  - `docs/engine/ROLLOUT_PLAN.md` — modify
- **Steps:**
  1. Record the shipped endpoints, sources, cache behavior, UI, write-off
     default, security checks, and remaining sibling work.
  2. Run all local gates below and show the builder the final diff before any
     commit.
  3. Obtain separate approval before restart/deploy and before a single live
     append proving run; record only the verified result. Treat the Apps Script
     source and Dashboard server as separate deployments.
- **Verify:** documentation/link checks and rollout lint pass; deployment and
  live-write gates remain explicit.
- **Status:** [ ] in progress — Waves A–C are source-built and the approved
  engine.40/engine.77 follow-on remediation landed through `5d82fc71` and
  `ef69f4c8`. Private hostname/TLS transport and direct-port restriction are
  deployed. The dashboard was restarted after reconciling the live 22-column
  A's roster, and authenticated overview plus both team workspaces pass with
  sports writes disabled. The original Opus review is complete; remediation
  re-review, loopback/Secure-cookie write configuration, authenticated preview
  proof, separately approved live append/proving writes, and archive gates
  remain. Engine.77 proving must be attended and must not overlap a Cycle.

## Validation matrix

| Gate | Command or proof | Expected result |
|---|---|---|
| Shared contract | `node scripts/sportsFeedContract.test.js` | All assertions pass |
| Projection | `node scripts/sportsWorkspaceProjection.test.js` | All assertions pass |
| Notebook adapter | `node scripts/notebookDailyInbox.test.js` | All assertions pass; no network |
| Apps Script compatibility | `node scripts/applySportsSeasonTeamCompatibility.test.js` | Free text/NFL preserved; unknown logs; blank silent |
| Preview token | `node scripts/sportsPreviewToken.test.js` | Restart-stable, expiring, actor/CSRF-bound |
| Writer | `node scripts/sportsFeedWriter.test.js` | All assertions pass; fake Sheet only |
| Routes | `node dashboard/sportsRoutes.test.js` | Read/preview/write-gate cases pass |
| Syntax | `node --check` on every changed script/server file | Exit 0 |
| Frontend | Existing dashboard build/test commands after inspecting `dashboard/package.json` | Exit 0 |
| Dashboard ESM lint | Root ESLint binary with `sourceType=module` on new dashboard `.js` files | Exit 0 |
| Visual/a11y | Existing local visual QA with sports fixtures | No sports-specific violations |
| Repository | `git diff --check` | No whitespace errors |
| Rollout | `node scripts/docLoopStatus.js --lint` | `ROLLOUT LINT: clean` |
| Live read | Separately approved authenticated local probe | Two live teams and current source freshness |
| Live append | Separately approved single real event | One exact row, exact read-back, idempotent replay |

## Deployment and rollback

1. Opus 5 reviews the corrected Waves A–B diff and complete Wave C source
   evidence; engine-sheet resolves any findings before landing.
2. Build and inspect desktop/mobile output before any dashboard restart.
3. Private hostname/TLS transport is deployed through Tailscale Serve and
   direct public port `3001` is restricted. Engine-sheet still binds the
   dashboard to loopback, enables the Secure cookie, and keeps
   `SPORTS_WRITE_ENABLED=false` in a separately approved runtime restart.
4. With separate builder approval, deploy/restart and prove authenticated live
   read and preview endpoints through HTTPS.
5. Do not `clasp push` `phase02-world-state/applySportsSeason.js` as an
   incidental part of the Dashboard release. The current Apps Script source
   also carries the live-push-pending `engine.88` batch; engine-sheet must
   coordinate that combined push explicitly or leave both changes source-only.
6. Keep the append feature flag off until the authentication/write controls and
   fake-store tests have been reviewed.
7. With separate builder approval and a real builder-supplied event, enable the
   flag for one append/read-back/idempotency proof, then decide whether it stays
   enabled.

Rollback disables the sports-write flag first, restores the prior frontend route
consumer if necessary, and leaves the appended canon row untouched pending
builder review. Never “repair” a bad proving row by silently deleting or
rewriting it.

## Resolved deployment decision

The private-project transport is Tailscale Serve at
`https://godworld.tail6d8700.ts.net`; no purchased domain or public reverse
proxy is required. This resolves the hostname/TLS/direct-port question but does
not authorize the sports-write runtime restart or a live write.

Roster current-stat writes, team/roster state mutation, LifeHistory
emission, structured NotebookLM extraction, Chicago redesign, historical row
editing, and autonomous submission are scope amendments that require their
own plan change and builder approval.

## Status log

- 2026-07-30 — Plan drafted from the live dashboard/code audit and the adopted
  Oakland sports-entry research. No implementation, deployment, NotebookLM
  invocation, or external write performed.
- 2026-07-30 — Waves A–B implemented: shared contract/projection tests,
  A's/Oaks consumer drift repairs, versioned live-read/local-artifact routes,
  deterministic no-write preview, and the responsive Oakland Sports Desk.
  Synthetic visual QA passed 22/22 checks across desktop, tablet, mobile, both
  roster views, empty/stale/error states, preview, nav clearance, and
  accessibility. No dashboard restart, live Sheet probe, NotebookLM invocation,
  or external write was performed. Wave C remains unstarted.
- 2026-07-31 — Engine-sheet review independently reran the four focused suites
  and authenticated route probes, confirmed the legacy aliases against live
  feed history, and accepted the Waves A–B architecture. Task 4 was reopened
  before landing for unknown/free-text/NFL Apps Script compatibility. Wave C
  moved to `needs-info`: the current shared dashboard credential has no roles,
  the transport posture needs a builder decision, signed previews must survive
  routine PM2 restarts, and any Apps Script push must be coordinated with the
  live-push-pending `engine.88` batch. No deployment or external write was
  performed.
- 2026-07-31 — Applied the reopened Task 4 correction in source: restored
  free-text team reads and historical NFL activation, added one fail-loud log
  for unknown nonblank `TeamsUsed` with blank values silent, and added an
  isolated synthetic Apps Script regression harness. The clasp disposition
  remains source-only; Opus 5 re-review is pending before landing.
- 2026-07-31 — Mike selected the remote-browser product path and cleared the
  plan to proceed. Wave C is source-built with detailed append/read-back,
  metadata-only pending/success/error audit records, persistent idempotency,
  signed restart-stable previews, HTTPS/origin/CSRF/write-capability gates,
  source revalidation, cache invalidation, and a separate confirmation/receipt
  UI. Focused fake-only tests pass; intercepted visual/a11y QA passes 24/24 on
  desktop and mobile. No proxy was installed, no service restarted, no feature
  flag enabled, and no live Sheet write occurred. Opus 5 review and the
  hostname/proxy deployment decision remain open.
- 2026-07-31 — Validation note: the repository-wide `npm run lint` command
  still parses most `.js` as CommonJS and its existing module override names
  only `dashboard/server.js` and `dashboard/vite.config.js`; it therefore
  rejects the new ESM route/test/API files at parse time. The same files pass
  targeted ESLint with `sourceType=module`. No `.eslintrc.json` change was made
  because configuration is outside this plan's named source surface.

- 2026-07-31 — **Opus 5 review verdict: APPROVE the source for engine-sheet
  landing, conditional on finding 1 below.** Evidence independently re-run, not
  accepted from this log: seven focused suites pass with zero network calls;
  thirteen changed backend/script files pass `node --check`; the Vite build
  transforms 1,587 modules; `node scripts/visual-qa.js --sports-fixture` passes
  24/24. Gate 1 (team compatibility) verified empirically against the live feed,
  which holds exactly four distinct `TeamsUsed` values — `A's` (165 rows,
  C40–103), blank (7 rows, C87), `NBA` (8 rows, C84–92), `Oaks` (20 rows,
  C93–103). No NFL and no unknown values exist, so the fail-loud log is silent
  in production. Replaying the carried team state at C102/C103/C104 under the
  pre-change separate `NBA`/`Oaks` buckets versus the post-change merged bucket
  produces zero field differences, so the alias merge does not regress the
  `engine.75` stale-team fix. Gate 2 holds: one log per unknown nonblank value,
  blanks silent. Gate 3 traced rather than inferred — `normalizeDraftTeam`
  requires an exact case-sensitive `TEAM_CONFIG` key, legacy aliases are
  reachable only through the read-path `normalizeTeam`, and the Apps Script
  `normalizeOaklandFeedTeam_` has no import path to the writer. Wave C security
  reviewed: HMAC preview tokens are keyed from environment and therefore survive
  a PM2 restart, the signature is verified before `JSON.parse`, comparisons are
  constant-time, the capability never leaves component state, and the routes
  register after the auth guard so an unconfigured dashboard fails closed. The
  reusable-token/client-supplied-idempotency-key replay path is closed
  indirectly but genuinely: a second append re-reads live, the new row changes
  the untruncated exact-Cycle `projection.events`, and `sourceHash` mismatch
  returns 409.
- 2026-07-31 — Review findings. **(1) Found and fixed during review:**
  `npm run lint` exited 1 with three parse errors — `dashboard/sportsRoutes.js`,
  `dashboard/sportsRoutes.test.js`, and `dashboard/src/lib/sportsApi.js` are ESM
  but were absent from the `overrides.files` list in `.eslintrc.json`, taking
  the repo lint gate from green to red. Three entries added to the existing
  overrides array (`dashboard/src/lib/*.js` covers the API module);
  `npx eslint . --ext .js --max-warnings 50` now exits 0. **(2)**
  `express.json({ limit: '64kb' })` on the sports POST
  routes is inert because `dashboard/server.js` line 97 already registers a
  global `express.json()` at the 100kb default, which parses the body first.
  **(3)** `scripts/buildDeskPackets.js` gains a new throw path —
  `filterFeedRowsForCycle` raises when `getCurrentCycle()` is not a positive
  integer where `filterByCycle` previously returned an empty array. Fail-loud is
  defensible; confirm it is intended. **(4)** `compileHandoff.js` was already
  exact-Cycle before this change (`entryCycle !== cycle`); the diff corrects a
  stale doc comment and adds ten state columns. The exact-Cycle behavioural
  change belongs to `buildDeskPackets.js` alone. **(5)** The digest key rename
  `warriors` to `oaks` has no remaining consumer in any `.js`, `.jsx`, agent, or
  media doc. **(6)** Default-mode `visual-qa.js` fails one serious
  `color-contrast` check on pre-existing dashboard chrome
  ("GODWORLD ENGINE v3.1", "Neighborhoods", "Council") — not sports components,
  out of scope. **(7)** Residual low risk accepted: merging the `NBA` alias into
  the `Oaks` bucket means a pre-C93 row could fill a field no `Oaks` row ever
  fills. Not present in current data.
- 2026-07-31 — **New Wave C gate item, required before `SPORTS_WRITE_ENABLED`
  is ever flipped on — concurrent double-append is reachable.** The sequential
  replay path is closed, and the UI is safe on its own: the idempotency key
  rotates per preview token rather than per click
  (`SportsWriteConfirmation.jsx` lines 112–123), the submit handler returns
  early while `submitting`, and the button is disabled, so a double-click reuses
  one key and the writer's per-key lock returns the replayed result. The hole is
  cross-session. Two browser sessions that each build a preview for the same
  event against an unchanged feed receive two different preview tokens but
  **identical** `sourceHash` values, because the hash covers feed and roster
  state, not the token. If both confirm before either append lands, both pass
  revalidation, and `createSportsFeedWriter`'s lock map is keyed by
  `idempotencyKey` — two different keys never serialize — so two identical rows
  append. A fake-only suite cannot surface this. Fix before enablement: bind the
  idempotency key into the signed preview payload, or serialize the writer on
  the feed sheet rather than on the key. Not a source-landing blocker; the
  append path is unreachable while the flag is off.
- 2026-07-31 — Zero-live-write gate verified directly rather than accepted:
  `SPORTS_WRITE_ENABLED`, `SPORTS_WRITE_ORIGIN`, `SPORTS_PREVIEW_TOKEN_SECRET`,
  `SPORTS_WRITE_CAPABILITY`, `DASHBOARD_BIND_HOST`, and
  `DASHBOARD_COOKIE_SECURE` are all unset in `/root/.config/godworld/.env`, so
  `buildWritePolicy` reports both `featureEnabled: false` and
  `configured: false`. The append path is closed twice over. No service was
  restarted and no `clasp push` was run during review. `dashboard/dist` was
  rebuilt to verify the 1,587-module claim; it is gitignored
  (`dashboard/.gitignore:2`) and dirtied no tracked file.
- 2026-07-31 — Gate 4 disposition: **source-only, no `clasp push`.**
  `phase02-world-state/applySportsSeason.js` is Apps Script and must land as
  source in this commit; pushing it would carry the live-push-pending
  `engine.88` batch. The push stays a separate coordinated engine-sheet action.
  Source approval authorizes no restart, no feature-flag enablement, no TLS or
  proxy deployment, and no live append.
- 2026-08-03 — Current state reconciled with the owning
  [[2026-08-02-sports-stat-event-intake]] plan: independent-review remediation
  landed through `5d82fc71` and all local sports/build/visual gates are green.
  This parent remains open for remediation re-review, hostname/TLS/proxy and
  authenticated-live-read deployment, and separately approved proving writes.
  Engine.77 remains attended and non-overlapping with a Cycle; nothing was
  deployed or written live.
- 2026-08-03 — Private remote-browser transport deployed through Tailscale
  Serve at `https://godworld.tail6d8700.ts.net`; Chromebook access, HTTPS
  health, login reachability, unauthenticated sports `401`, and removal of the
  public IPv4/IPv6 `3001` rules were verified. No PM2 restart, sports feature
  enablement, or external write occurred.
- 2026-08-03 — Dashboard restart and private authenticated live-read proof
  completed after reconciling the A's roster from the stale 20-column contract
  to live `A:V`. Overview, A's workspace, and Oaks workspace returned 200;
  sports writes remained disabled and the write route returned 403. No Sheet
  write occurred.

## Changelog

- 2026-07-30 — Initial draft for `engine.89`; fixed team scope to The A's and
  The Oaks, made live Sheets authoritative, added the non-canon Notebook Daily
  Inbox, and specified preview plus disabled-by-default append/read-back gates.
- 2026-07-30 — Recorded completion of Waves A–B and sports-specific synthetic
  QA; kept Wave C, deployment, authenticated live proof, and archive closure
  open.
- 2026-07-31 — Applied the engine-sheet review amendments: reopened the Apps
  Script compatibility edge, replaced the nonexistent write-role assumption
  with a dedicated capability, made transport a builder gate, required
  restart-stable signed previews, and recorded the `engine.88` clasp sequencing
  hazard.
- 2026-07-31 — Added Opus 5 as the independent review pass after the reopened
  Task 4 correction and before Wave C, with explicit compatibility, security,
  restart, deployment-sequencing, and zero-live-write review gates.
- 2026-07-31 — Completed the reopened Task 4 source correction and regression
  harness without changing the strict two-team new-write contract.
- 2026-07-31 — Implemented Wave C source for the selected remote-browser path:
  restart-stable signed previews, real write capability, exact append/read-back,
  persistent idempotency audit, secure confirmation, and verified receipt;
  retained TLS/proxy, deployment, and live proof as separate gates.
- 2026-08-02 — Linked the approved engine.40/engine.77 follow-on without
  rewriting this plan's version-1 history; deployment and live proof remain
  prerequisites owned here.
- 2026-08-02 — Clarified the independent-review security boundary: dashboard
  authentication plus the sports-write capability are authorization controls;
  HTTPS, same-origin, Secure-cookie, CSRF, and loopback checks remain mandatory
  transport/request-integrity attestations.
- 2026-08-03 — Reconciled the parent plan after the engine.40/engine.77 review
  remediation landed through `5d82fc71`; retained remediation re-review,
  deployment/authenticated-read, proving-write, and archive gates.
- 2026-08-03 (Codex) — Recorded private Tailscale HTTPS deployment and public
  `3001` restriction; retained the loopback/Secure-cookie restart,
  authenticated sports proof, proving-write, and archive gates.
- 2026-08-03 (Codex) — Reconciled the live A's 22-column contract, restarted
  the dashboard, and completed authenticated overview/A's/Oaks plus
  disabled-write proof; retained re-review, secure write configuration,
  authenticated preview, proving-write, and archive gates.
