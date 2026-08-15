---
title: Sports Stat and Event Intake Plan
created: 2026-08-02
updated: 2026-08-03
type: plan
tags: [sports, engine, citizens, active]
sources:
  - Mike-direct 2026-08-02 — draft and register the engine.40 and engine.77 implementation plan
  - docs/research/2026-07-27-oakland-sports-feed-entry-dashboard.md
  - docs/plans/2026-07-30-oakland-sports-workspace.md
  - docs/OAKLAND_SPORTS_FEED.md
  - docs/SIMULATION_LEDGER.md
  - docs/research/2026-07-29-citizen-archive.md
  - docs/engine/ENGINE_REPAIR.md §engine.40 and §engine.77
  - schemas/SCHEMA_HEADERS.md §Oakland_Sports_Feed, §As_Roster, §Oaks_Roster, §LifeHistory_Log, §Ripple_Ledger, and §Simulation_Ledger
  - scripts/sportsFeedContract.js, scripts/sportsWorkspaceProjection.js, scripts/sportsFeedWriter.js, dashboard/sportsRoutes.js, and lib/sheets.js
  - phase04-events/generationalEventsEngine.js and phase05-citizens/applyGameNightMoments.js
  - docs/archive/horn-truesource.txt and scripts/buildPlayerIndex.js
  - https://developers.google.com/workspace/sheets/api/reference/rest/v4/spreadsheets/batchUpdate
pointers:
  - "[[../engine/ROLLOUT_PLAN]] — engine.40 and engine.77 rollout rows"
  - "[[../research/2026-07-27-oakland-sports-feed-entry-dashboard]] — adopted product and submission-envelope research"
  - "[[2026-07-30-oakland-sports-workspace]] — prerequisite Dashboard workspace and feed append boundary"
  - "[[../OAKLAND_SPORTS_FEED]] — active feed and roster contract"
  - "[[../SIMULATION_LEDGER]] — citizen Status, RoleType, and LifeHistory contract"
  - "[[../research/2026-07-29-citizen-archive]] — trade-away and future engine.90 handoff"
  - "[[../engine/ENGINE_REPAIR]] — retained engine.40 and engine.77 history"
---

# Sports Stat and Event Intake Plan

**Goal:** Extend the existing one-event Oakland Sports preview and confirmation
boundary so a verified stat capture can update one current roster line and a
verified injury, return, call-up, or trade-away can update the applicable roster
and citizen state while always recording the same event in the feed,
LifeHistory, `LifeHistory_Log`, and `Ripple_Ledger`.

**Architecture:** Keep the request-only signed submission envelope established
by [[2026-07-30-oakland-sports-workspace]]. Add pure stat and roster-event
mutation contracts to that envelope, bind every before/after value and source
snapshot into the preview token, and execute one confirmed event through one
server-side Google Sheets `spreadsheets.batchUpdate` request. That request is
validated as a unit and applies its subrequests atomically. The current roster
is the in-season stat-line store; `Oakland_Sports_Feed.Stats` remains
event-facing prose. A separately approved season-close tool may patch an
existing Tier-1 A's TrueSource file only from a complete, operator-verified
season line. No new Sheet tab is introduced.

**Terminal:** engine-sheet

**Builder review gate:** This registered draft does not authorize
implementation, Dashboard deployment, a live Sheet mutation, Drive write,
TrueSource ingest, service restart, or `clasp push`. Mike approves or amends
this plan before engine-sheet starts Wave 0.

## Scope lock

### Included

- `engine.40`: one-player, field-level current-stat updates for `As_Roster` and
  `Oaks_Roster`, sourced from reviewed manual entry or screenshot OCR.
- `engine.40`: an explicit season-close preview for an existing Tier-1 A's
  TrueSource card when a complete season row matches a verified table header.
- `engine.77`: existing-POPID injury, return, call-up, and trade-away events.
- One feed event and one mutation per preview and confirmation.
- Exact read-back, persistent metadata-only audit, global serialization, and
  fail-loud recovery.
- Existing current-state and downstream systems: health lifecycle,
  LifeHistory compression, Ripple consumers, household/bond/status gates, and
  the future `engine.90` archive handoff.

### Excluded

- Signings, releases, trades into Oakland, new citizen or POPID creation, and
  any event whose participant is absent from either the selected roster or
  `Simulation_Ledger`.
- Roster-row deletion, citizen archival, return from archive, or POPID
  allocation. Trade-away remains in `Simulation_Ledger` as `Traded` until the
  separately approved `engine.90` lifecycle exists.
- Autonomous screenshot capture, controller automation, blind OCR writes,
  multi-player batches, inferred values, or an LLM-required write path.
- Historical feed editing, stat backfill, career-total invention, or creation
  of a new TrueSource card.
- Direct household, bond, storyline, publication, Drive, Supermemory, Discord,
  or other memory mutation from the Dashboard confirmation.
- A new `Player_Season_Stats`, sports-intake, or application-log Sheet tab.

## Verified baseline and measure-twice findings

1. The source-built workspace already provides live feed/roster reads, exact
   POPID-backed name resolution, signed previews, a feature-gated one-row feed
   writer, idempotency audit, and read-back.
2. That writer is keyed by caller-supplied idempotency key. The existing
   workspace review proved that two sessions with different keys can race and
   append the same event. This plan must replace the per-key lock with one
   global sports-write lock before any mutation feature is enabled.
3. `As_Roster` contains two physical headers named `SO`: batting strikeouts at
   column O and pitching strikeouts at column T, with `SV` at S between them.
   The object reader collapses duplicate headers, so engine.40 must use a
   header-plus-row snapshot and internal stat keys rather than object-property
   lookup. `SV` at S and `WAR` at V remain read-only in this intake.
4. `As_Roster` and `Oaks_Roster` already hold Mike's handy current stat lines.
   They remain the live structured stores; feed `Stats` remains story/event
   detail and never becomes a hidden roster payload.
5. `docs/archive/horn-truesource.txt` verifies the hitter season header:
   `Year Team G AB R H 2B 3B HR RBI BB SO SB AVG OBP SLG`.
   `scripts/buildPlayerIndex.js` currently assumes an extra `CS` value by
   position even when that header is absent. Season-close work is blocked until
   parsing is header-driven and regression-tested.
6. The active health engine lowercases Status before comparison and owns
   `injured`, `serious-condition`, `recovering`, `StatusStartCycle`, and
   `HealthCause`. Other current paths still compare `Active` exactly. This plan
   preserves owner-compatible write values and adds a casing regression matrix;
   it does not declare the wider Status-casing drift solved.
7. `Traded` means departed Oakland. Existing consumers stop daily life,
   careers, and new bonds for that citizen, but the row remains available. The
   future archive must run only after the trade's same-Cycle LifeHistory and
   Ripple consequences exist.
8. `spreadsheets.batchUpdate` validates all subrequests before application and
   applies them together atomically. This plan uses that API, not a sequence of
   independent `values.append` and `values.update` calls, for mutation events.

## Authority and storage decisions

| Information | Authority after this plan | Rule |
|---|---|---|
| Event facts and editorial context | `Oakland_Sports_Feed` | One compatible row per confirmed event |
| Current A's stat line | `As_Roster` | Only allowlisted physical stat columns may change |
| Current Oaks stat line | `Oaks_Roster` | Only allowlisted physical stat columns may change |
| Citizen current state | `Simulation_Ledger` | Exact POPID; applicable Status/RoleType and health fields only |
| Citizen lived event | `Simulation_Ledger.LifeHistory` plus `LifeHistory_Log` | Required for every engine.77 mutation |
| Attribution | `Ripple_Ledger` | Required citizen-scope row for every engine.77 mutation |
| Career season history | Existing Tier-1 A's TrueSource file | Explicit season-close only; never inferred from the roster subset |
| Preview envelope | Signed request token | No Sheet, file, browser-store, or external persistence before confirmation |
| Operational audit | `output/sports-intake/append-audit.jsonl` | Metadata, target hashes/ranges, and result only; no story or LifeHistory prose |

The roster's current stat line is intentionally a subset of a full TrueSource
season row. A season-close operation therefore requires a complete verified
line; it may not fill missing TrueSource fields from zeroes, averages, prior
years, or the roster subset.

## Submission envelope extension

The existing feed draft stays unchanged. A mutation is optional and has this
shape; all example identifiers and values are visibly synthetic:

```json
{
  "submissionId": "synthetic-generated-id",
  "participant": {
    "popid": "POP-XXXXX",
    "name": "Synthetic Non-Canon Player",
    "rosterSource": "As_Roster",
    "sourceRow": 0
  },
  "mutation": {
    "kind": "stat-line|roster-event|season-close",
    "action": "stat-capture|injury|return|call-up|trade-away|season-close",
    "changes": [
      {
        "field": "batting.hr",
        "before": "0",
        "after": "1"
      }
    ],
    "verification": {
      "source": "manual-verified|screenshot-verified",
      "confirmed": true
    }
  }
}
```

The signed preview binds:

- authenticated actor and CSRF value;
- submission ID and idempotency key;
- exact twenty-cell feed row;
- participant POPID, name, roster source, and physical source row;
- mutation kind, action, every before/after value, and verification source;
- hashes of the exact feed header/rows, selected raw roster row, selected
  `Simulation_Ledger` row, and exact log/Ripple headers; append row numbers are
  deliberately re-resolved inside the writer lock rather than signed;
- deterministic LifeHistory, log, and Ripple projections when applicable.

Any changed source hash produces `409 sports_source_changed`; the writer
performs no mutation.

## Track A — engine.40 stat intake

### Current-line field maps

Internal keys disambiguate physical columns without renaming the live headers.
Blank `after` values never erase a nonblank current value.

| Team | Internal keys and physical columns | Validation |
|---|---|---|
| A's batting | `batting.ab` I, `batting.avg` J, `batting.h` K, `batting.hr` L, `batting.rbi` M, `batting.sb` N, `batting.so` O | Counts are non-negative integers; AVG is a reviewed decimal from 0 through 1 |
| A's pitching | `pitching.ip` P, `pitching.era` Q, `pitching.wl` R, `pitching.so` T, `pitching.bb` U; current `SV` S and `WAR` V are displayed but not allowlisted for writes | IP uses baseball thirds `.0/.1/.2`; ERA is non-negative; W-L is whole-number `W-L`; counts are non-negative integers |
| Oaks | `basketball.ppg` I, `basketball.asst` J, `basketball.reb` K, `basketball.stl` L, `basketball.fgPct` M, `basketball.threePct` N | Per-game values are non-negative decimals; percentages are reviewed values from 0 through 100 with optional `%` preserved |

The preview shows unchanged, changed, blank-source, and invalid fields
separately. Confirmation updates only changed allowlisted fields. The writer
must not rewrite name, POPID, Tier, Position, Team, Salary, or the other sport's
stat columns through a stat capture.

### OCR and confirmation rule

Mike drives the controller and navigates to the stat screen. An assistant may
read the screenshot, but the extracted values are only a proposal:

```text
screenshot
  → field-keyed extraction
  → original-resolution recheck
  → current-roster before/after diff
  → Mike confirms every changed field
  → signed preview
  → atomic feed append + roster update
  → exact read-back
```

Zoomed or transformed screenshots are supporting views only. The
original-resolution screen is the final visual source because the feasibility
probe already showed zoom-induced AVG and games-played misreads.

### Feed representation

Add `stat-capture` to the controlled `EventType` vocabulary. A stat capture:

- requires one selected roster POPID;
- requires the matching citizen to be Active or recovering;
- requires a nonblank, operator-reviewed `Stats` summary for newsroom context;
- may carry a current-stat mutation but does not create an engine.77
  LifeHistory or Ripple row merely because a number changed;
- may use `EventTrigger=season-finale` when it is also the reviewed season-close
  event.

### Season-close TrueSource gate

Season close is explicit, never automatic. It is available only when:

1. the selected citizen is Tier 1, on `As_Roster`, and has an existing
   resolvable TrueSource text file;
2. Mike supplies the season year and a complete row matching a header found in
   that file;
3. the row was verified from the original screenshot and confirmed field by
   field;
4. a pure local patch preserves every byte outside `Yearly Stats` and
   `Career Totals`;
5. the before/after parser resolves the same POPID/name and the new season
   exactly once.

The default command produces a local proposed text file and JSON verification
report only. A Drive update, Drive read-back, and
`ingestPlayerTrueSource.js --apply --player ...` are three separately approved
external actions. Unsupported pitcher, Oaks, or variant table headers fail
loud; they do not fall back to a guessed schema.

## Track B — engine.77 roster/state and life intake

### First-slice action matrix

All actions require one existing POPID that resolves uniquely in the selected
roster and `Simulation_Ledger`.

| Action | Preconditions | Atomic mutations | Explicit exclusions |
|---|---|---|---|
| `injury` | Current citizen state is Active or recovering; exact cause supplied | Feed `roster-move`; Status `injured` or `serious-condition`; `StatusStartCycle=Cycle`; reviewed `HealthCause`; LifeHistory + log + citizen Ripple | No RoleType inference; no Position overwrite; hospital lifecycle owns later transitions |
| `return` | Current state is injured, serious-condition, or recovering | Feed `roster-move`; Status `Active`; clear `StatusStartCycle` and `HealthCause`; LifeHistory + log + citizen Ripple | No career/position promotion inferred |
| `call-up` | Existing roster and ledger POPID; current Status Active; exact before/after Team, Position, and RoleType supplied | Feed `roster-move`; roster Team/Position; Status `Active`; exact RoleType; LifeHistory + log + citizen Ripple | No citizen creation, salary inference, or roster-row append |
| `trade-away` | Existing Oakland roster and ledger POPID; current Status Active; exact destination Team and RoleType supplied | Feed `roster-move`; roster Team and optional confirmed Position; Status `Traded`; exact RoleType; LifeHistory + log + citizen Ripple | No row deletion or archive move; engine.90 owns later departure archival |

Status values above are owner-compatible current outputs, not a claim that the
repository-wide casing drift is resolved. Tests must cover both title-case and
lowercase source rows and the health engine's lowercase transition keys.

### Deterministic life projection

The writer derives short factual text only from confirmed fields:

```text
C<cycle> — [SportsRoster] <canonical name> <confirmed action summary>
```

The corresponding seven-cell `LifeHistory_Log` row is:

```text
C<cycle> · POPID · canonical name ·
SportsRoster|source:sports|submission:<id>|action:<action> ·
confirmed action summary · neighborhood · cycle
```

The citizen Ripple row uses:

- `CauseType=sports`;
- `CauseId=<submissionId>`;
- `EffectType=roster-injury|roster-return|roster-call-up|roster-trade-away`;
- `TargetScope=citizen`;
- `TargetIds=<POPID>`;
- `SourceEngine=sportsFeedWriter.engine77`;
- `CycleStamp=C<cycle>`.

The feed `Notes` remain the richer operator-authored event account. The
deterministic life summary does not copy, paraphrase, or embellish that prose.

### Downstream boundary

The confirmation does not directly rewrite households, bonds, careers, or
storylines. Their existing Status, LifeHistory, and Ripple consumers observe
the confirmed state on the next Cycle. A trade-away hands archive eligibility
to `engine.90` only after the atomic event batch has passed read-back.

### Track B proof record (S369, 2026-08-14)

- Event: attended C103 Oaks injury, POP-01028 Wendell Carter Jr. (Oaks_Roster row 8), dashboard Injury mode, submission `sports-67ba5097-3c85-4e98-ae15-c726d93cdb32`.
- Verified read-back: feed row 203 (`roster-move`); Simulation_Ledger `Status=injured`, `StatusStartCycle=103`, `HealthCause=sprained ankle`; LifeHistory line `C103 — [SportsRoster] … entered injured status`; LifeHistory_Log 7-cell row; Ripple_Ledger `roster-injury` row (`SourceEngine=sportsFeedWriter.engine77`).
- Precursor repair: dashboard `dist/` + `node_modules/` had been missing since the 2026-08-11 wipe (API alive, UI dead) — `npm install` + `vite build`, pm2 restart.
- First attempt went through the game/note form → draft-only feed row 202 (`game-result`, mutation null; same failure class as S357). Stray row 202 left for hand-deletion in the Sheet.
- UX gap (Mike-direct): ~25 inputs for one event; intake form needs a slimming pass before unattended design work.

## Atomic writer and recovery contract

One process-global lock serializes every sports confirmation, regardless of
actor, preview token, submission ID, or idempotency key. Inside the lock:

1. Re-read the feed, selected raw roster row, selected citizen row,
   `LifeHistory_Log`, and `Ripple_Ledger`.
2. Revalidate exact headers, POPID plus roster/ledger first-and-last identity,
   before values, request hash, and source hashes; then re-resolve append
   targets.
3. Read every exact target cell with formula-visible rendering; reject formulas
   and retain hashed before/after transitions for the audit.
4. Build one `spreadsheets.batchUpdate` request using `appendCells` for feed and
   log rows and `updateCells` for the exact roster/citizen cells.
5. Send the request once. If request validation fails, none of its subrequests
   apply.
6. Re-read every affected sheet and verify the exact feed row, changed cells,
   LifeHistory suffix, log row, and Ripple row.
7. Record one success receipt containing hashes and resolved rows/ranges only.

If the API reports success but read-back is ambiguous or mismatched, the audit
records `uncertain`, the global writer disables further mutation attempts for
that process, and the route returns a safe 502. It never retries, deletes, or
rewrites canon automatically. Mike reviews the Sheet and chooses the repair.
A structured Google 4xx rejection proves that validation rejected the atomic
batch before application; it records `error`, burns that preview/idempotency
key, and does not latch later fresh confirmations.

The existing feed-only path also moves under this global lock before
deployment, closing the cross-session double-append finding in
[[2026-07-30-oakland-sports-workspace]].

## Acceptance criteria

1. The plan introduces no new Sheet tab and leaves historical rows untouched.
2. A preview performs zero Sheet, Drive, memory, publication, or messaging
   writes.
3. Every mutation resolves one exact POPID, canonical name, roster source, and
   raw physical row; ambiguous or missing identity fails.
4. The A's batting and pitching `SO` fields remain separately readable,
   previewable, and writable despite the duplicate physical headers.
5. Stat confirmation changes only explicitly confirmed allowlisted fields and
   appends exactly one `stat-capture` feed event.
6. Different preview tokens for the same source cannot confirm concurrently
   into duplicate feed rows.
7. Injury and return use the existing health fields and remain visible to the
   active health lifecycle.
8. Call-up and trade-away require exact operator-confirmed RoleType and roster
   values; no role, team, salary, citizen, or POPID is invented.
9. Every engine.77 action applies the feed row, applicable roster/citizen
   state, LifeHistory, `LifeHistory_Log`, and `Ripple_Ledger` in one atomic API
   request.
10. A trade-away leaves the citizen row present as `Traded`; no archive or
    deletion happens in this plan.
11. Exact read-back proves all affected surfaces. Ambiguous read-back disables
    further writes and requires builder review.
12. Audit records contain no feed Notes, Stats, StoryAngle, HealthCause, or
    LifeHistory prose.
13. Season close cannot run from the roster subset. It requires a complete
    verified row and preserves the rest of the existing TrueSource file.
14. No Drive or Supermemory write occurs without separate current-conversation
    approval and read-back.
15. Focused tests, syntax checks, Dashboard build/visual checks, repository
    lint, `git diff --check`, and rollout lint pass before source landing.
16. [[../OAKLAND_SPORTS_FEED]], [[../SIMULATION_LEDGER]],
    [[2026-07-30-oakland-sports-workspace]], and this plan describe the same
    shipped boundary.

---

## Tasks

### Wave 0 — contract corrections and no-write projection

### Task 1: Make roster snapshots duplicate-header safe

- **Files:**
  - `lib/sheets.js` — modify
  - `scripts/sportsWorkspaceProjection.js` — modify
  - `scripts/sportsWorkspaceProjection.test.js` — modify
  - `dashboard/server.js` — modify
  - `dashboard/sportsRoutes.js` — modify
  - `dashboard/sportsRoutes.test.js` — modify
- **Steps:**
  1. Add a sports-only raw snapshot shape carrying headers, row arrays, and
     physical row numbers.
  2. Project the internal stat keys from fixed, header-validated positions;
     distinguish A's batting O/SO from pitching S/SO.
  3. Fail on missing, moved, or additional duplicate load-bearing headers.
- **Verify:** Synthetic raw fixtures prove both SO values survive independently
  and the current object-reader collapse cannot reach the write path.
- **Status:** [x] source complete — raw duplicate-header fixtures and route
  projections pass

### Task 2: Extend the pure sports mutation contract

- **Files:**
  - `scripts/sportsFeedContract.js` — modify
  - `scripts/sportsFeedContract.test.js` — modify
  - `utilities/setupSportsFeedValidation.js` — modify
- **Steps:**
  1. Add `stat-capture`, the mutation envelope, team stat maps, action matrix,
     field validators, and no-blank-overwrite rule.
  2. Validate one participant, existing POPID shape, one action, exact
     before/after values, and required verification.
  3. Add `stat-capture` to the Sheet validation source without changing the
     twenty-column feed shape.
  4. Keep feed-only drafts backwards compatible.
- **Verify:** Pure synthetic tests cover every allowed action and reject
  unknown fields, unsupported actions, multiple participants, blank erasure,
  guessed defaults, and legacy team aliases on new writes.
- **Status:** [x] source complete — all allowed actions pass and season-close
  remains reserved/fail-closed

### Task 3: Correct TrueSource season parsing before patching

- **Files:**
  - `scripts/buildPlayerIndex.js` — modify
  - `scripts/buildPlayerIndex.seasonStats.test.js` — create
- **Steps:**
  1. Make hitter season parsing header-driven so the verified no-`CS` Horn
     schema and any explicitly headed `CS` variant map correctly.
  2. Add a `require.main` guard and export only the pure parser needed by the
     season-close verifier.
  3. Keep unsupported or malformed headers fail-loud.
- **Verify:** The repository Horn fixture parses `.322 AVG`, `.391 OBP`, and
  `.598 SLG` in the correct fields; a synthetic headed-CS variant also passes.
- **Status:** [x] source complete — Horn and headed-CS parser fixtures pass;
  full dry run preserves the player-index baseline

### Wave A — engine.40 stat line and season close

### Task 4: Add stat-diff preview and confirmation UI

- **Files:**
  - `dashboard/sportsRoutes.js` — modify
  - `dashboard/sportsRoutes.test.js` — modify
  - `dashboard/src/components/SportsIntakeWorkspace.jsx` — modify
  - `dashboard/src/components/SportsWriteConfirmation.jsx` — modify
  - `dashboard/src/components/SportsRipplePreview.jsx` — modify
  - `dashboard/src/lib/sportsApi.js` — modify
- **Steps:**
  1. Add the `stat-capture` template with manual-verified and
     screenshot-verified provenance.
  2. Show current values, proposed values, validation, and changed-field count.
  3. Require a per-field review plus existing final confirmation; never accept
     an OCR blob as a write payload.
- **Verify:** Route and intercepted UI fixtures cover A's hitter, A's pitcher,
  Oaks, invalid numeric formats, no-op diffs, stale source, and mobile review.
- **Status:** [x] source complete — route fixtures and intercepted desktop/mobile
  review pass

### Task 5: Replace the feed append primitive with the atomic sports batch

- **Files:**
  - `lib/sheets.js` — modify
  - `scripts/sportsFeedWriter.js` — modify
  - `scripts/sportsFeedWriter.test.js` — modify
  - `dashboard/server.js` — modify
- **Steps:**
  1. Add the narrow `spreadsheets.batchUpdate` adapter required for
     `appendCells` and exact `updateCells`.
  2. Serialize all sports writes behind one global lock and bind the
     idempotency key inside the signed preview.
  3. Move feed-only and stat-mutation writes through the same atomic/read-back
     executor while retaining metadata-only audit.
- **Verify:** Fake-client tests prove all-or-none request construction, one
  append across different keys/tokens, exact stat-cell targeting, replay,
  conflict, stale preview, ambiguous read-back shutdown, and zero network.
- **Status:** [x] source complete — fake-client race, replay, exact-cell,
  multi-ledger, and uncertain-recovery cases pass

### Task 6: Build the Tier-1 A's season-close preview

- **Trigger:** Keep this task open until Mike updates the authoritative
  TrueSource and provides the resulting complete season-row/header contract.
  Do not infer that payload from `As_Roster`, which remains the current-season
  subset ledger.
- **Files:**
  - `scripts/sportsTrueSourceSeasonClose.js` — create
  - `scripts/sportsTrueSourceSeasonClose.test.js` — create
  - `scripts/buildPlayerIndex.js` — use the exported parser
- **Steps:**
  1. Default to local preview: accept an existing local TrueSource text file,
     expected content hash, POPID/name, season, and complete verified row.
  2. Insert or replace exactly one matching season row and recalculate Career
     Totals only when every required component is present.
  3. Emit a proposed `.txt` plus JSON verification report under
     `output/sports-intake/truesource-preview/`; do not contact Drive.
  4. Keep any Drive apply/read-back and Supermemory refresh behind separate
     explicit flags and builder approvals.
- **Verify:** The Horn fixture gains one synthetic non-canon season in a
  temporary copy, parses correctly, preserves all unrelated sections, and
  rejects duplicate years, incomplete rows, wrong hashes, unsupported headers,
  and non-Tier-1 scope.
- **Status:** [ ] open — deferred until the authoritative TrueSource update
  establishes the complete payload contract

### Wave B — engine.77 state, life, and Ripple

### Task 7: Add roster-event mutation previews

- **Files:**
  - `dashboard/sportsRoutes.js` — modify
  - `dashboard/sportsRoutes.test.js` — modify
  - `dashboard/src/components/SportsIntakeWorkspace.jsx` — modify
  - `dashboard/src/components/SportsWriteConfirmation.jsx` — modify
  - `dashboard/src/components/SportsRipplePreview.jsx` — modify
- **Steps:**
  1. Add action-specific injury, return, call-up, and trade-away fields.
  2. Show exact roster and citizen before/after values plus deterministic
     LifeHistory/log/Ripple projections.
  3. Display Tier and a trade-away warning that the citizen leaves Oakland and
     remains unarchived until engine.90.
- **Verify:** Synthetic fixtures cover all four actions, T1/T2 visibility,
  wrong-state rejection, absent ledger/roster identity, and forbidden
  signing/release/mint attempts.
- **Status:** [x] source complete — all four action previews, Citizen Tier,
  deterministic life/Ripple projections, and exclusions pass

### Task 8: Execute the atomic engine.77 batch

- **Files:**
  - `scripts/sportsFeedWriter.js` — modify
  - `scripts/sportsFeedWriter.test.js` — modify
  - `dashboard/sportsRoutes.js` — modify
  - `dashboard/sportsRoutes.test.js` — modify
- **Steps:**
  1. Project the feed append, applicable roster cells, citizen fields,
     LifeHistory suffix, LifeHistory log row, and Ripple row into one batch.
  2. Revalidate all target snapshots inside the global lock.
  3. Read back every target and enter fail-closed uncertain state on mismatch.
  4. Preserve the existing health lifecycle and leave archive/delete work out.
- **Verify:** Fake-client tests prove the exact request set for each action,
  no partial request on validation failure, owner-compatible Status casing,
  deterministic tags, no prose in audit, and trade-away without deletion.
- **Status:** [x] source complete — all four exact request sets and read-back
  surfaces pass without network

### Wave C — contract docs, review, and separately gated proof

### Task 9: Update active documentation and test the full source boundary

- **Files:**
  - `docs/OAKLAND_SPORTS_FEED.md` — modify
  - `docs/SIMULATION_LEDGER.md` — modify
  - `docs/DASHBOARD.md` — modify
  - `docs/plans/2026-07-30-oakland-sports-workspace.md` — modify
  - `docs/plans/2026-08-02-sports-stat-event-intake.md` — modify
  - `docs/engine/ROLLOUT_PLAN.md` — modify
  - `scripts/visual-qa.js` — modify
- **Steps:**
  1. Record the shipped stat maps, action matrix, atomic batch, casing
     compatibility, TrueSource gate, and engine.90 boundary.
  2. Run the validation matrix and obtain an independent source/security review.
  3. Obtain separate approval for deployment, one stat proving event, one
     engine.77 proving event, and any season-close Drive update.
- **Verify:** Documentation and source agree; all local checks pass; every live
  action has its own builder approval and exact read-back record.
- **Status:** [ ] in progress — source landed at `ce2a7d11`; independent review
  [[../reviews/2026-08-02-sports-intake-opus-review]] returned
  **FIX-BEFORE-DEPLOY**. Its source remediation landed in `1bbedbd9` and
  `5d82fc71`; Codex closed the remaining early-shift window in `ef69f4c8`.
  Private hostname/TLS transport and public-port restriction are deployed.
  The dashboard was restarted after reconciling the live 22-column A's roster;
  authenticated overview and both team workspaces now return 200, all 90 A's
  POPIDs resolve, and no A's middle-name cells are populated. Sports writes
  remain disabled and reject with 403. Remaining gates are remediation
  re-review, loopback/Secure-cookie write configuration, authenticated preview
  proof, and Mike's separate approval for each proving write. See Task 10.

### Task 10: Clear the independent-review fix list (engine-sheet)

Opened S349 from [[../reviews/2026-08-02-sports-intake-opus-review]]. Items 1–4
and their regression cases are source-landed; remediation re-review,
deployment, and proving-write approvals remain open.

- **Files:**
  - `scripts/sportsFeedWriter.js` — modify (items 1, 2, 3, 4, 7)
  - `scripts/sportsFeedContract.js` — modify (items 3-input-cap, 6)
  - `dashboard/server.js` / `dashboard/sportsRoutes.js` — modify (item 8)
  - the five sports test files — extend with a regression case per item
- **Steps:**
  1. **Item 1** — enforce exact `Oakland_Sports_Feed` header layout in the
     write path (same `exactHeaders` guard the other four surfaces use), so a
     column insert/reorder fails loud instead of writing one column off with a
     green read-back.
  2. **Item 2** — stop `updateCells` from silently replacing formulas: read
     the before-image with an unformatted/formula-visible value render and
     refuse to overwrite a formula cell; write numeric stat fields as numbers,
     not `stringValue`.
  3. **Item 3** — distinguish provably-no-op failures (structured 4xx from
     `batchUpdate`, which validates all subrequests before applying) from
     genuinely uncertain ones (lost response/timeout); only the latter latches.
     Add a draft field length cap upstream + fix the ineffective route-level
     body limit (item 8 of the review — the global `express.json()` already
     parsed the body).
  4. **Item 4** — RULED retry-on-shift, NOT a cross-runtime lock — with the
     Codex correction folded in (see §Engine-sheet rulings; the original
     fail-closed premise was disproved). Re-resolve LifeHistory_Log /
     Ripple_Ledger append targets **strictly before `batchUpdate`**; retry ONCE
     on a moved target; **never retry an ambiguous post-batch result** (a
     post-batch retry can double-apply). Narrow the precondition hash so a
     routine engine append can't 409 every pending preview. Contained to the
     writer — no engine-side change, no trigger scope. **Does NOT make
     engine.77 safe to run during a cycle:** the ledger snapshot→Phase 10
     commit clobber is outside the writer's reach, so engine.77 stays gated to
     attended, non-overlapping runs.
  5. **Item 5 (before first live proof)** — check whether `As_Roster.Middle`
     is populated for any player; reconcile the roster `First Middle Last`
     join against the ledger's `First Last`.
  6. **Items 6–9 (hardening, take with the above)** — `hasOwnProperty`
     allowlist check; audit records capture the pre-image of every written
     cell; document that same-origin/HTTPS are proxy attestations and the real
     controls are dashboard auth + capability header.
- **Verify:** a regression test per item in the existing fake-only harnesses;
  full sports suite + dashboard build green; no live write.
- **Status:** [x] source complete — items 1–3 and 5–9 LANDED `1bbedbd9`
  (verified by engine-sheet; the item-1 regression was added there after
  mutation testing exposed the fix as uncovered). Item 4 now re-checks append
  targets strictly before the batch, performs at most one retargeted preflight,
  and returns a safe pre-batch 409 on a second move; post-batch ambiguity is
  never retried. The original implementation landed as `5d82fc71`; the
  before-first-formula-read shift regression and recheck landed as `ef69f4c8`.
  Item 5 still gates the first live proof. engine.77 is gated to attended
  non-overlapping runs on canon-safety grounds (ledger clobber path); engine.40
  stat capture is assessable separately. No live write is authorized.

## Engine-sheet rulings on the review gate (2026-08-02, S349)

Codex asked for two design confirmations before closing the remediation. Both
ruled here; the reasoning is recorded because both were close calls.

**1. Item 4 (concurrent-cycle false `uncertain`) — RULED: build retry-on-shift
in the writer; do NOT build a cross-runtime lock.** (Supersedes the earlier
"authorize a shared-lock design" position, which Codex proposed and this session
initially confirmed. Reversed after sizing the actual exposure — recorded rather
than quietly changed.)

**CORRECTION (Codex, same session — this ruling's original premise was WRONG).**
The first version of this ruling asserted a concurrent collision "fails closed:
writes refused, canon never corrupted," and rested the whole proportionality
argument on it. Codex traced the implementation and disproved it. The trace,
verified by engine-sheet before accepting:

1. `phase01-config/initSimulationLedger.js:43` snapshots the ENTIRE
   `Simulation_Ledger` into `ctx.ledger.rows` at cycle start.
2. An engine.77 confirmation mutates citizen fields (Status, RoleType,
   LifeHistory) on the live sheet mid-cycle.
3. `phase10-persistence/commitSimulationLedger.js:25` queues the whole in-memory
   body back over rows 2..N at Phase 10.

So a sports write that lands after the snapshot and passes its own read-back is
**silently reverted** by the cycle's own commit — while its feed row,
`LifeHistory_Log` row and `Ripple_Ledger` row survive on other tabs. The event
is recorded in three places and the citizen-state change is gone. **That is
canon divergence, not a false latch.** The original ruling was reasoned from an
unverified premise; the discipline that should have caught it is tracing the
commit path before asserting a failure mode.

**Split boundary (the corrected shape).** Exposure differs by track:
- **engine.77 (roster/state + life events)** mutates `Simulation_Ledger` → in
  the clobber path → **must not run unattended, and an attended run must not
  overlap a cycle.** This is a canon-safety rule now, not annoyance avoidance.
- **engine.40 (stat capture)** writes `As_Roster` / `Oaks_Roster` only, never
  `Simulation_Ledger` → outside this clobber path → assessable separately on
  its own merits.

**Why not a lock.** Apps Script and Node share no lock primitive — `LockService`
is GAS-only, and a lock cell in a sheet is not atomic (both sides can read
"free" in the same instant). The result would look like a lock and give false
confidence. It would also make the ENGINE depend on the DASHBOARD writer, which
it has no knowledge of today — a permanent cross-boundary coupling bought to
defend a few minutes a week.

**Proportionality decides it.** The engine fires weekly (Sunday) for a few
minutes; a confirmation is a manual click at a time Mike controls. The overlap
window is narrow and operator-controlled, so the corrected ruling defers a
cross-runtime lock for attended use. It does **not** fail closed: engine.77
overlap remains forbidden because the Phase 10 ledger commit can silently
revert the citizen change.

**Ruling (corrected):**
1. Build retry-on-shift for append drift **strictly before `batchUpdate`**.
   NEVER retry an ambiguous post-batch result — a post-batch retry can double-
   apply, which is the one thing worse than latching.
2. Do NOT build a fake Sheet-cell lock or a cross-runtime broker now. That part
   of the original reasoning stands: `LockService` is GAS-only, a lock cell is
   not atomic, and the result would give false confidence.
3. **engine.77 stays disabled for unattended use**, and attended runs must not
   overlap a cycle — enforced as a canon-safety rule, not a habit.
4. **Unattended engine.77 enablement is itself a real-lock revisit trigger** —
   the moment nobody is watching the clock, the operator control disappears and
   a genuine exclusion mechanism has to exist.
5. Additional revisit triggers, unchanged: the engine becomes continuous rather
   than a weekly fire, or a second writer gains write access.

**Escalation flag — cleared for NOW, re-armed on enablement.** The retry-on-shift
work is contained entirely within the writer, so there is no cross-boundary call
for Mike today. But the clobber path means the lock question returns the moment
engine.77 is enabled unattended, and at that point it IS the
`godWorldEngine2.js`/trigger-scope decision ADR-0016 §7 covers. Recorded so the
next session inherits the trigger instead of re-deriving it.

**2. Item 7 (audit pre-images) — CONFIRMED: retain hashes, do not store
plaintext.** The tension is real: a hash proves *that* a cell differed but
cannot tell you *what to restore*. Storing plaintext canon pre-images, however,
breaks a deliberate existing design — the writer tests assert audit records
never carry HealthCause/LifeHistory prose — and would put canon in a second,
weaker-protected place. **The recovery path is the sheet's own revision
history, not the audit file.** That store already exists, costs nothing, and was
proven this session: the S349 engine.83 revert reconstructed 76 exact
pre-session cell values from spreadsheet revision 33355. The audit's job is to
say *something moved and here is the range*; Drive's job is to say *here is what
it was*. Recorded so a future session doesn't re-open this as a gap.

## Validation matrix

| Gate | Command or proof | Expected result |
|---|---|---|
| Shared contract | `node scripts/sportsFeedContract.test.js` | Existing feed cases plus mutation cases pass |
| Projection | `node scripts/sportsWorkspaceProjection.test.js` | Raw duplicate-header fixtures pass |
| TrueSource parser | `node scripts/buildPlayerIndex.seasonStats.test.js` | Header-driven stat fields pass |
| Writer | `node scripts/sportsFeedWriter.test.js` | Atomic request/replay/race/recovery cases pass; no network |
| Routes | `node dashboard/sportsRoutes.test.js` | Preview and disabled/write cases pass |
| Season close | Deferred until authoritative TrueSource update | Task 6 remains open and fail-closed |
| Syntax | `node --check` on every changed backend/script file | Exit 0 |
| Repository lint | `npm run lint` | Exit 0 |
| Frontend | Existing Dashboard build command | Exit 0 |
| Visual/accessibility | `node scripts/visual-qa.js --sports-fixture` | Stat and roster-event flows pass |
| Repository | `git diff --check` | No whitespace errors |
| Rollout | `node scripts/docLoopStatus.js --lint` | `ROLLOUT LINT: clean` |
| Live stat proof | Separately approved one-player event | One feed row plus exact allowlisted roster changes |
| Live event proof | Separately approved one roster event | Feed, state, LifeHistory/log, and Ripple all match |
| TrueSource proof | Separately approved Tier-1 A's season close | Drive patch/read-back and parser proof; optional ingest separately approved |

## Deployment and rollback

1. Land and review source with all write flags off.
2. Deploy only after [[2026-07-30-oakland-sports-workspace]] completes its
   hostname, TLS/proxy, authenticated-read, and base feed-write gates.
3. Keep stat and roster-event mutation capabilities independently disabled.
4. Prove one stat event, inspect all affected cells, then decide whether the
   stat capability stays enabled.
5. Prove one non-terminal engine.77 event—injury or return first—inspect feed,
   ledger, LifeHistory/log, and Ripple, then decide whether call-up and
   trade-away may be enabled.
6. Do not use trade-away as the first live proof and do not combine a proving
   run with a Drive update, service change, `clasp push`, or engine Cycle.

Rollback disables mutation capabilities first. Source rollback restores the
prior feed-only route but never deletes or rewrites a confirmed Sheet row.
Any read-back mismatch remains a builder-reviewed canon repair, not an automatic
compensation.

## Resolved decisions

- One event and one participant per confirmation.
- Request-only signed envelope; metadata-only audit.
- No new Sheet tab.
- Current rosters are the in-season stat stores; feed Stats is narrative.
- `stat-capture` is a new feed event type.
- Screenshot extraction is proposal-only; original-resolution review is
  mandatory.
- Engine.77 first slice is injury, return, call-up, and trade-away only.
- One atomic Google Sheets batch carries all effects of a confirmation.
- Trade-away precedes but does not perform engine.90 archival.
- Season close is explicit, existing-card-only, Tier-1 A's-only, and separately
  approved for Drive and memory writes.

## Status log

- 2026-08-02 — Tasks 1–5 and 7–8 are source-complete. Focused tests, parser
  dry run, syntax, Dashboard build, repository lint, diff check, rollout lint,
  and synthetic browser QA pass; the full visual report is 27/27 with desktop,
  tablet, mobile, stat, engine.77, horizontal-fit, and accessibility checks.
  No service restart, deployment, Sheet/Drive/memory write, or live proof was
  performed. Task 9 remains open for deployment/proof gates.
- 2026-08-02 — Engine-sheet and Claude independently reviewed and landed the
  exact 23-file source batch as `ce2a7d11`; `14d68f16` reconciled the engine.40
  and engine.77 rollout rows to `in-progress`. Review confirmed the live write
  boundary remains cold and all reviewed tests/builds pass without a live
  Sheet write. Deployment and proving events remain separately gated.
- 2026-08-02 — The repository-wide 118-file runner reached every sports suite,
  and all sports suites passed. Fourteen unrelated legacy test files remained
  red: credential/network smoke tests cannot reach Google in this local
  environment; nested-subprocess wrappers lose captured grandchild stdout in
  this harness even though the same commands pass directly; and the existing
  C94 retired-anchor integration still expects one downweight but observes
  zero. None touches the sports source, but the full repository command is not
  globally green.
- 2026-08-02 — Mike confirmed `As_Roster` and `Oaks_Roster` are authoritative
  for current-season stats. Task 6 remains open and deliberately fail-closed:
  define season-close only after the authoritative TrueSource update exposes
  the complete row/header contract; do not derive it from the roster subset.
- 2026-08-02 — Task 10 remediation pass locally green for exact feed headers,
  formula-visible preflight, typed numeric stat writes, structured 4xx no-op
  classification, 64 KiB request/50,000-character field caps, middle-name-safe
  POPID+first/last joins, prototype-safe allowlists, hashed per-cell pre-images,
  and audit permissions. Full-log precondition hashes were narrowed to exact
  headers and append targets now resolve inside the writer lock. Strict
  Apps-Script↔Node Cycle exclusion remains a builder decision; no deployment,
  service action, or live write occurred. **Superseded later the same session:**
  attended engine.77 uses the non-overlap gate; genuine exclusion returns as a
  design requirement only before unattended enablement.
- 2026-08-02 — Task 10 item 4 source complete: one pre-batch append-target
  shift receives one retargeted formula-visible preflight and re-check; a
  second shift fails 409 with zero batches, and post-batch ambiguity remains
  non-retryable. Synthetic simultaneous and asymmetric shifts pass, and
  weakening the retry-exhaustion guard makes the regression test fail. No
  deployment, service action, or live write occurred.
- 2026-08-03 — Current state reconciled after `5d82fc71`: Task 10 source work is
  complete and locally verified. Task 9 remains open for remediation re-review,
  parent-workspace deployment/authenticated-read gates, item 5's live roster
  check, and separately approved proving writes. Engine.77 remains attended
  and non-overlapping with a Cycle; unattended enablement re-arms the genuine
  exclusion-design gate. No deployment or live write occurred.
- 2026-08-03 — Codex closed the early append-shift window in `ef69f4c8`, then
  deployed private Tailscale HTTPS and removed the public IPv4/IPv6 `3001`
  rules. Private health and login checks passed; unauthenticated sports access
  remained `401`, and the builder verified Chromebook access. The
  loopback/Secure-cookie sports-write restart, authenticated sports proof,
  live-roster check, and every proving write remain open. No Sheet write
  occurred.
- 2026-08-03 — Codex reconciled the live A's `A:V` roster schema, moved the
  writable pitching SO/BB map to T/U, kept SV/WAR read-only, restarted only the
  dashboard, and proved private authenticated overview/A's/Oaks reads. The
  write policy reported disabled and the write route returned 403; no Sheet
  write occurred. The live middle-name check found 0 of 90 populated and all
  90 POPIDs resolved.
- 2026-08-02 — Drafted and registered from the adopted sports workspace
  research, the source-built engine.89 boundary, the current roster/feed/health
  implementations, and engine.90 archive research. No implementation,
  deployment, service action, Sheet write, Drive write, or memory write
  performed.

## Changelog

- 2026-08-02 — Initial registered draft combining engine.40 and engine.77,
  choosing duplicate-header-safe roster storage, atomic multi-ledger writes,
  four bounded roster actions, and an explicit Tier-1 A's season-close gate.
- 2026-08-02 (engine-sheet) — Codex source landed at `ce2a7d11` after review.
- 2026-08-02 (engine-sheet) — Task 9 independent review done: FIX-BEFORE-DEPLOY. Task 10 opened for the fix list.
- 2026-08-02 (engine-sheet) — Codex remediation landed (1bbedbd9); item-1 regression added after mutation exposed it uncovered. Item 4 + 7 ruled — see §Engine-sheet rulings.
- 2026-08-02 (engine-sheet, Mike-direct) — Item 4 REVERSED to retry-on-shift; cross-runtime lock rejected on proportionality. Escalation flag cleared; Task 10 is now a contained writer fix.
- 2026-08-02 (Codex) — Task 10 remediation source advanced through items 1–3
  and 5–9; item 4 remained open at the cross-system lock boundary. Superseded
  later the same session by the corrected split boundary and bounded retry.
- 2026-08-02 (Codex, accepted by engine-sheet) — **Item-4 ruling CORRECTED.**
  Codex disproved its fail-closed premise via the ledger snapshot→commit trace;
  a mid-cycle engine.77 write is silently reverted by Phase 10 while its feed /
  LifeHistory_Log / Ripple rows survive = canon divergence. Split boundary
  adopted: engine.77 gated (canon-safety), engine.40 assessable separately.
  Retry-on-shift confined to strictly-pre-batch. See §Engine-sheet rulings.
- 2026-08-02 (Codex) — Implemented the bounded strictly-pre-batch item-4
  retry with actual-row audit remapping and simultaneous/asymmetric race
  regressions; post-batch paths remain single-attempt.
- 2026-08-03 (Codex) — Reconciled the active plan to pushed commit `5d82fc71`:
  Task 10 source-complete; Task 9 remains in progress through remediation
  re-review, deployment/authenticated-read, live-roster, and proving-write
  gates. Frontmatter transitioned `draft → active` to match adoption and
  in-progress rollout state.
- 2026-08-03 (Codex) — Closed the early append-shift window in `ef69f4c8` and
  recorded private Tailscale transport deployment; retained remediation
  re-review, runtime restart, authenticated sports proof, live-roster, and
  proving-write gates.
- 2026-08-03 (Codex) — Reconciled the A's 22-column roster contract and
  completed the dashboard restart, authenticated live-read, disabled-write,
  and middle-name/POPID proofs; retained re-review, secure write configuration,
  authenticated preview, and proving-write gates.
- 2026-08-06 (engine-sheet, S357, Mike-go "clear to deploy sports") — Remediation
  re-review PASSED: diff 1bbedbd9..ef69f4c8 read end-to-end; item-4 boundary
  matches the corrected ruling (one bounded strictly-pre-batch retarget, second
  move throws sports_source_changed, preflight re-runs post-retarget, post-batch
  single-attempt audit remap); retargetAppendRange digit-replace safely scoped by
  sheet-prefix strip; full writer suite green. Secure-write configuration DONE:
  SPORTS_WRITE_ENABLED/ORIGIN + preview/capability secrets (0600 env, never
  echoed), DASHBOARD_BIND_HOST=127.0.0.1 (ss-verified loopback-only),
  DASHBOARD_COOKIE_SECURE=true; authenticated policy probe returns
  featureEnabled:true configured:true reasonCode:null; unauth requests 401.
  REMAINING: authenticated preview + one approved proof — attended, Mike at
  https://godworld.tail6d8700.ts.net sports workspace (direct :3001 and plain
  http login no longer work by design).
- 2026-08-07 (engine-sheet, S357) — PROVING WRITE LANDED: attended cycle-103 Oaks game-result through preview→confirm→atomic append (feed row 202, full 20-col envelope, audit journal result:success, idempotency key recorded). Capability key rotated post-proof. engine.40 + engine.89 gates ALL CLEAR → done-pending-archive. engine.77 still needs a roster-EVENT proof (this one carried mutationAction null).
- 2026-08-14 (engine-sheet, S369) — ROSTER-EVENT PROOF LANDED (§Track B proof record): attended C103 injury, POP-01028, all five write targets read-back verified. engine.77 → done-pending-archive; unattended still gated on exclusion design.
