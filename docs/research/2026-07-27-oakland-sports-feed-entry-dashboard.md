---
title: Oakland Sports Feed Entry Dashboard — research
created: 2026-07-27
updated: 2026-07-30
type: reference
tags: [research, sports, infrastructure, active]
sources:
  - Mike-direct 2026-07-27 and 2026-07-28 — make Oakland_Sports_Feed entry friendlier without losing story detail; connect As_Roster and Oaks_Roster; design toward citizen events
  - schemas/SCHEMA_HEADERS.md §Oakland_Sports_Feed, §As_Roster, §Oaks_Roster — current Sheet shapes
  - phase02-world-state/applySportsSeason.js — feed loading, team state, city and neighborhood effects
  - phase05-citizens/applyGameNightMoments.js — named-player LifeHistory path
  - phase05-citizens/generateCitizensEvents.js — watching-citizen game-night path
  - phase07-evening-media/sportsStreaming.js and storyHook.js — evening media and story-hook consumers
  - scripts/buildDeskPackets.js, buildWorldSummary.js, and preflightInputCheck.js — Node consumers and current input checks
  - dashboard/server.js and dashboard/src/App.jsx — current read-only Sports surface
  - docs/engine/ENGINE_REPAIR.md §engine.40 and §engine.77 — stat-intake and sports-event siblings
pointers:
  - "[[../OAKLAND_SPORTS_FEED]] — verified current contract and consumer map"
  - "[[../engine/ROLLOUT_PLAN]] — engine.89 workspace-plan pointer; engine.40 and engine.77 implementation siblings"
  - "[[../plans/2026-07-30-oakland-sports-workspace]] — engine.89 implementation plan"
  - "[[../plans/2026-07-05-game-night-connection-design]] — downstream game-night design history"
  - "[[index]] — research registration"
---

# Oakland Sports Feed Entry Dashboard — research

**Source:** Internal code, schema, dashboard, roster, and engine audit on
2026-07-27–28, triggered by Mike's request for a more user-friendly way to add
`Oakland_Sports_Feed` entries while preserving the quality of the story detail.

**What this addresses:** How to replace direct twenty-column entry with a
friendlier operator experience; how `As_Roster` and `Oaks_Roster` should support
that experience; what a feed entry changes today; and where a future
Sports Engine can turn an approved sports event into citizen state and memory.

**What it does:** `Oakland_Sports_Feed` is already more than a media notes table.
Its rows feed current-Cycle sports context, city sentiment, neighborhood effects,
named-player LifeHistory, watching-citizen events, evening media, story hooks,
world summaries, and desk packets. The current dashboard only reads generated
packets. It does not provide a Sheet-backed entry workspace, shared validation,
staging, preview, append, or read-back.

## Extraction — what is usable

- **Keep the detail; change the interaction.** `Notes`, `Stats`, and
  `StoryAngle` are not the problem. The burden comes from presenting event facts,
  team state, editorial intent, and engine controls as twenty peer columns.
- **Use the existing dashboard.** The authenticated React/Express dashboard
  already has a Sports tab, mobile layout, navigation, and live-Sheet support in
  the server process. Entry mode belongs beside the read-only viewer rather than
  in a new application.
- **Make Cycle and team workspace-level choices.** Select the Cycle and team
  once from a registry seeded by the A's and Oakland Oaks. Every event card
  inherits them, eliminating repeated entry while the compatibility mapper still
  writes the required exact `TeamsUsed` value on every Sheet row.
- **Use event templates with progressive disclosure.** A game result needs a
  record, streak, player mood, and perhaps statistics. A player feature needs
  names, notes, and a StoryAngle. A roster event needs the player and the
  proposed status change. No template should expose irrelevant fields.
- **Separate event facts from team state.** Record, streak, fan sentiment,
  franchise stability, economic footprint, community investment, and media
  profile describe a team across a Cycle. Show them in an inherited Team State
  panel and ask Mike only what changed.
- **Use both roster ledgers.** Player selection should come from `As_Roster` for
  the A's and `Oaks_Roster` for the Oaks. Store the exact canonical display name
  in `NamesUsed`; retain POPID and roster source in the staged submission so a
  future event writer can address the correct citizen.
- **Preview effects, not just cells.** Before confirmation, explain which
  newsroom, city, neighborhood, player, and citizen paths will fire—and which
  requested consequences are not implemented yet.
- **Share one deterministic validation contract.** The form, server, Sheet-row
  adapter, and preflight should use the same required fields, enums, name checks,
  and record/streak parsers.
- **Append safely.** V1 should be append-only, with one idempotency key per row,
  explicit confirmation, Sheet read-back, and the resulting row identity.
- **Keep prose assistance optional.** A later “turn this paragraph into draft
  fields” helper can be useful, but its output must pass through the same
  deterministic preview and confirmation gate.

## Verified current ripple

```text
Oakland_Sports_Feed
  ├─ Phase 2: current-Cycle sports context
  │    ├─ city sentiment + Ripple_Ledger attribution
  │    ├─ neighborhood traffic / retail / nightlife / community effects
  │    └─ sports triggers for Story_Hook_Deck
  ├─ Phase 5: EventType containing "game"
  │    ├─ exact named players → LifeHistory + LifeHistory_Log
  │    └─ selected watching citizens → citizen events + LifeHistory
  ├─ Phase 7: evening sports summary
  └─ Node consumers: world summary, desk packets, citizen wake, handoff/review
```

The reference [[../OAKLAND_SPORTS_FEED]] records the exact field and consumer
contracts. Four details materially shape the UI:

1. Current-Cycle event rows drive Phase 5 and media output.
2. Team state is reduced from rows through the current Cycle by exact team key;
   the latest non-empty value wins. Later rows in the same Cycle can therefore
   override earlier team state.
3. A named-player game-night moment requires an exact active
   `Simulation_Ledger` `First Last` match. `NamesUsed` does not currently carry a
   POPID.
4. A roster move in the feed does **not** currently update the roster,
   `Simulation_Ledger` status/role, or the player's LifeHistory. That missing
   dual write is the existing `engine.77` scope.

## Why twenty columns feel like too many

| Concern | Columns | Entry burden | Recommended treatment |
|---|---|---|---|
| Row identity | `Cycle`, `SeasonType`, `EventType`, `TeamsUsed` | Repeated on every row | Default/inherit at workspace or template level; write all four underneath |
| Participants | `NamesUsed` | Free-text names can miss canon or fail exact matching | Team-filtered roster multi-select |
| Story detail | `Notes`, `Stats`, `StoryAngle` | Valuable, event-specific content | Keep prominent; never rewrite silently |
| Legacy | `VideoGameDate`, `VideoGame` | Present in schema but unused by the current parser | Hide from normal entry; preserve blank compatibility cells |
| Event controls | `PlayerMood`, `EventTrigger`, `HomeNeighborhood` | Useful only for some events | Template-specific controls with effect explanations |
| Team state | `Team Record`, `Streak`, `FanSentiment`, `FranchiseStability`, `EconomicFootprint`, `CommunityInvestment`, `MediaProfile` | Mostly repeated context | Inherited Team State panel; show changed vs carried-forward values |

## Recommended experience: Cycle Sports Workspace

### 1. Product location and ledger boundary

The Cycle Sports Workspace should be a dedicated intake page inside the existing
authenticated dashboard, with `/sports/intake` as the intended route (or its
route-equivalent if the current single-page navigation remains state-based).
The existing Sports Feed view remains the read surface and gains a clear
**Enter Sports Events** action. Do not build a separate site, and do not squeeze
the complete intake workflow into the read-only feed panel.

The browser never holds Google Sheets credentials or writes a Sheet directly.
It submits a staged sports envelope to a narrowly scoped dashboard server
endpoint. The implementation plan should specify a two-step boundary:

1. **Preview:** validate and normalize the draft, resolve selected roster
   players, and return the human-readable ripple explanation plus the exact
   twenty-column compatibility row without writing.
2. **Confirm and write:** accept the reviewed envelope plus an idempotency key,
   revalidate it server-side, append it to `Oakland_Sports_Feed`, read the
   appended row back, and return its Sheet row identity. Any mismatch fails
   loud.

V1 confirmation writes only the feed ledger. It does not silently mutate either
roster or `Simulation_Ledger`. Verified current-stat updates remain in
`engine.40`; roster/status/LifeHistory/ripple mutations remain in `engine.77`;
permanent departures later hand off through `engine.90`.

```text
Dashboard Sports Feed ── Enter Sports Events ──> /sports/intake
                                                    │
                                          preview + validation
                                                    │
                                           explicit confirmation
                                                    │
                                      server append + read-back
                                                    │
                                       Oakland_Sports_Feed
```

### 2. Workspace header

- **Cycle** — default to the next/current working Cycle, always visible.
- **Team** — A's or Oakland Oaks, backed by stable internal identifiers; the
  adapter, not the operator, owns the exact compatibility label.
- **Season type** — inherited from the latest team state and visibly
  confirmable.
- **Existing rows** — display only rows for the selected Cycle; an empty Cycle
  must say it is empty.

```text
┌─ Cycle Sports Workspace ─────────────────────────────────────┐
│ Cycle N        Team: Oakland Oaks        Season: [inherited] │
├─ Team State ─────────────────────────────────────────────────┤
│ Record · Streak · Fans · Franchise · Economy · Community     │
│ each value marked inherited / changed / unset                │
├─ Events ─────────────────────────────────────────────────────┤
│ [Game result card]  [Player feature card]  [+ Add event]     │
├─ Ripple Preview ─────────────────────────────────────────────┤
│ Newsroom ✓  City ✓  Neighborhood —  Named players ✓          │
└────────────────────────────────────── [Review exact rows] ────┘
```

### 3. Team State panel

Show the last accepted state for the selected team:

- team record and streak;
- fan sentiment;
- franchise stability;
- economic footprint;
- community investment;
- media profile.

Each value is visibly marked **inherited**, **changed**, or **unset**. The
workspace writes the changed state onto the relevant event row or an explicit
`season-state` row. It must not guess a new value.

### 4. Event cards

| Template | First fields shown | Conditional/advanced fields |
|---|---|---|
| Game result | result/notes, opponent context in prose, named players, record, streak, StoryAngle | stats, player mood, home neighborhood, trigger |
| Roster event | player, move type, what happened, StoryAngle | proposed team/status/role, effective Cycle; staged consequence only until `engine.77` |
| Injury/return | player, what happened, expected status, StoryAngle | player mood, neighborhood/community context |
| Player feature/community | player(s), notes, StoryAngle | stats, home neighborhood, community investment |
| Front office/franchise | notes, StoryAngle | franchise stability, economic footprint, fan sentiment, media profile |
| Season state/editorial | season type, notes | record, streak, team-state fields |
| Stat capture | player(s), current roster line, proposed updated line | changed fields, source, and verification state; later `engine.40` input |

The card labels should speak in operator language—“What happened?”, “Who was
involved?”, “What should the sports desk notice?”—while help text names the exact
Sheet field where useful.

### 5. Ripple Preview

Before confirmation, render a plain-language checklist:

- **Newsroom:** whether `StoryAngle`, notes, statistics, record, and mood will
  enter world summaries, desk packets, or evening media.
- **City:** the prospective record/streak/fan/media contribution to city
  sentiment.
- **Neighborhood:** which traffic, retail, nightlife, or community effect is
  eligible when `HomeNeighborhood` is present.
- **Named players:** whether each exact name resolves to an active citizen and
  is eligible for a game-night LifeHistory moment.
- **Watching citizens:** whether the event is eligible to seed the Cycle's
  game-night citizen pool.
- **Not yet automatic:** roster/status/role mutation and non-game sports-event
  LifeHistory until the `engine.77` contract ships.

Preview is explanatory, not a simulation guarantee: random citizen selection
and other Phase conditions still apply.

### 6. Review and confirmation

The final review shows:

- human-readable event cards;
- errors versus warnings;
- the exact twenty-column compatibility rows;
- inherited values that will be written;
- one explicit confirmation action.

V1 remains append-only. Corrections continue through the existing Sheet until a
separately audited edit/delete contract exists.

## Roster integration

The two roster ledgers are structurally different:

- `As_Roster` has identity, contract, and current batting/pitching stat columns.
- `Oaks_Roster` has identity, contract, and current basketball-stat columns.

The entry UI needs only a normalized projection:

```text
teamId · rosterSource · POPID · First · Middle · Last · displayName
· Tier · Position · Team · Salary · sport-specific stats
```

The raw ledgers remain authoritative for their own roster fields. The UI should
not force them into one physical schema. A normalized read model can present one
consistent player picker and preserve team-specific statistics behind the
player detail panel.

Mike's intent for those sport-specific columns is to keep each player's current
stat line handy. Selecting a player should therefore reveal a read-only
**Current Stat Line** beside the event form. `Oakland_Sports_Feed.Stats` remains
the event-specific detail used by media consumers; it is not a replacement for,
or automatic update to, the roster's current line. A proposed stat-line change
must be shown as a field-level before/after diff and confirmed separately. V1
can display the current line without writing it.

Current asymmetry matters: several canon/reviewer scripts read `As_Roster`, but
the equivalent `Oaks_Roster` context is not wired into those paths. The feed
itself does not look up either roster. Adding an Oaks picker without aligning
server-side validation and reviewer context would make the form appear safer
than the downstream system actually is.

## Future Sports Engine boundary

The form should first create a proposed **sports submission envelope**, then a
deterministic adapter should produce the legacy feed row. The zero/`XXXXX`
values below are visibly non-canon shape placeholders:

```json
{
  "submissionId": "generated-id",
  "cycle": 0,
  "teamId": "as-or-oaks",
  "eventType": "controlled-event-type",
  "participants": [
    {
      "popid": "POP-XXXXX",
      "name": "Canonical First Last",
      "rosterSource": "As_Roster-or-Oaks_Roster",
      "proposedRosterMutation": null,
      "proposedStatLineMutation": null
    }
  ],
  "facts": {
    "notes": "operator-authored",
    "stats": "operator-authored-or-verified-capture",
    "teamRecord": "operator-authored",
    "streak": "operator-authored"
  },
  "editorial": {
    "storyAngle": "operator-authored"
  },
  "state": {
    "seasonType": "controlled-value",
    "playerMood": "controlled-value",
    "eventTrigger": "controlled-value",
    "homeNeighborhood": "canonical-value",
    "fanSentiment": "controlled-value",
    "franchiseStability": "controlled-value",
    "economicFootprint": "controlled-value",
    "communityInvestment": "controlled-value",
    "mediaProfile": "controlled-value"
  }
}
```

This envelope is a proposed interface, not a new canon store. Its eventual
storage—staged local JSON, a dedicated Sheet intake tab, or request-only
payload—must be chosen in the implementation plan.

The future Sports Engine can consume an approved envelope in four lanes:

1. **Feed lane:** map and append the compatible `Oakland_Sports_Feed` row.
2. **Stat-line lane:** compare verified new values with the selected player's
   current roster line and update only the explicitly confirmed stat fields.
3. **Roster/state lane:** for approved trades, injuries, call-ups, signings, and
   releases, update the correct roster plus the citizen's status/role.
4. **Life lane:** create the matching LifeHistory and Ripple attribution so a
   state change is also something the citizen experienced.

The UI must not implement lanes 2–4 ad hoc. Roster/citizen state requires the
fail-loud dual-write contract already called for by `engine.77`; stat-line
comparison and verified capture join through sibling `engine.40`.

## Known contract drift to resolve before build

- **Team identity:** validation and several packet/handoff consumers still say
  `Warriors`; the canonical roster is `Oaks_Roster`. The active-sport detector
  recognizes `nba` but not the `Oaks` name.
- **Roster parity:** A's players reach more canon/reviewer helpers than Oaks
  players.
- **Validation split:** preflight checks presence only, while the Sheet setup
  utility defines partial dropdowns and allows invalid values.
- **Missing field validation:** the setup utility configures the legacy first
  fifteen columns, not `FanSentiment` through `MediaProfile`.
- **Legacy columns:** `VideoGameDate` and `VideoGame` remain in the row but have
  no current Phase 2 effect.
- **History fallback:** `buildDeskPackets.js` substitutes all historical Oakland
  rows when the selected Cycle is empty.
- **Handoff truncation:** `compileHandoff.js` carries only the first ten legacy
  fields and still labels Oakland as “A's / Warriors.”
- **Trigger reach:** `applySportsSeason.js` can emit player-energy and
  player-frustration triggers that `storyHook.js` does not map.
- **Season semantics:** feed-driven mode preserves raw `SeasonType` as context
  but deliberately holds generic sports-atmosphere branches off unless the
  separate config override enables them.

These are implementation prerequisites, not a reason to rewrite existing story
details or historical rows.

## Alternatives evaluated

- **Direct Sheet cleanup only:** improves dropdowns but does not reduce the
  conceptual burden, explain ripples, or provide safe append verification.
- **Conversational bot as the primary interface:** convenient for prose but
  hides missing structured fields and makes canon correction harder.
- **A separate sports application:** duplicates authentication, Sheet access,
  navigation, and mobile work already present in the dashboard.
- **One universal roster schema:** loses sport-specific stats and creates an
  unnecessary migration. A normalized read model is sufficient.
- **Immediate generalized Sports Engine:** crosses into roster, citizen, and
  engine-substrate changes before the entry contract is proven.

## Not applicable / hazard

- This is separate from Discord citizen agents and SpaceMolt.
- Authentication alone does not authorize canon writes. The sports endpoint
  needs an allowlist, server validation, explicit confirmation, idempotency,
  read-back, and audit.
- Do not make an LLM part of the required entry path.
- Do not silently “improve” Mike's records, stats, names, moods, or StoryAngle.
- Do not invent opponents, players, teams, neighborhoods, statistics, or
  outcomes.
- Do not expose draft or staged submissions as established canon.
- A roster-event card must say “state change not automatic” until the dual-write
  engine exists.

## Decisions and remaining questions

Adopted design decisions:

- dedicated `/sports/intake` workspace inside the existing dashboard, not a new
  app or an oversized form inside the read-only feed;
- server-owned preview/confirm/append/read-back boundary; the browser never
  writes the Sheet directly;
- Cycle/team workspace with multiple draft event cards;
- append-only v1;
- both rosters behind one normalized player picker;
- selected-player current stat lines visible by default, with updates staged as
  a separate explicit diff;
- team state inherited visibly and changed explicitly;
- deterministic validation and Ripple Preview before confirm;
- submission envelope as the boundary to future event/stat engines;
- legacy twenty-column row retained as the compatibility target.

Questions for the implementation plan:

- Which exact values become controlled enums, and which remain reviewed free
  text?
- Should a confirmation append one event at a time or a reviewed Cycle batch
  with per-row idempotency?
- Should current rows be read live from the Sheet or from a refreshed read
  model?
- Where, if anywhere, should pre-confirmation submission envelopes persist?
- Does v1 create an explicit final `season-state` row per team, or attach state
  changes to the last relevant event card?
- Which roster-event mutations are safe for the first `engine.77` slice?
- Which current-stat fields and verification sources are safe for the first
  `engine.40` roster-update slice?

**Verdict:** `adopt` — build the existing dashboard into a Cycle Sports
Workspace. Preserve the story-rich fields, reduce entry to relevant event
questions, normalize both roster ledgers for selection, show downstream effects,
and map approved submissions deterministically to the existing twenty-column
row. Treat Sports Engine state/LifeHistory writes and stat OCR as linked sibling
work, not hidden side effects of the first UI.

**Ignited plans:** [[../plans/2026-07-30-oakland-sports-workspace]]
(`engine.89`) owns the dashboard/live endpoints, Notebook Daily Inbox, preview,
and gated feed append. `engine.40` stat capture and `engine.77` roster/state and
LifeHistory writes remain implementation siblings.

---

## Applications (living)

- 2026-07-27 — Initial boundary: sports entry is independent from Discord
  citizen and SpaceMolt work.
- 2026-07-28 — Deep trace established the Cycle Sports Workspace, normalized
  dual-roster picker, Ripple Preview, compatibility-row adapter, and future
  Sports Engine boundary.
- 2026-07-28 — Mike clarified that the sport-specific roster columns are the
  handy current stat lines; the UI direction now displays them as the player
  snapshot and separates any update from event `Stats`.
- 2026-07-29 — Promoted the workspace-plan handoff to rollout discovery at
  `engine.89`; preserved `engine.40` and `engine.77` as implementation siblings.
- 2026-07-29 — Adopted a dedicated dashboard intake route with server-side
  preview, explicit confirmation, append, and read-back to
  `Oakland_Sports_Feed`.
- 2026-07-30 — Ignited the implementation plan with the fixed A's/Oaks team
  contract, live-Sheet reads, non-canon Notebook inbox, and write security gate.
- 2026-07-30 — Applied Waves A–B: shared contracts/projections, A's/Oaks drift
  repairs, versioned read/local-artifact routes, roster UI, non-canon inbox,
  deterministic no-write preview, and synthetic visual/accessibility coverage.
  Wave C and deployment remain open in the owning plan.
- 2026-07-31 — Applied Wave C in source for the selected remote-browser path:
  signed restart-stable previews, explicit write capability, exact one-row
  append/read-back, persistent idempotency audit, and confirmation/receipt UI.
  Review, TLS/proxy deployment, and live proof remain open in the owning plan.

---

## Changelog

- 2026-07-27 — Initial extraction from the dashboard, feed validator,
  desk-packet, and live-packet audit.
- 2026-07-28 — Expanded through the engine Phases, newsroom consumers,
  `As_Roster`, `Oaks_Roster`, stat/event rollout siblings, and current contract
  drift; added the implementation-facing UI design and the current-stat-line
  boundary.
- 2026-07-29 — Added explicit rollout pointers for the active planning thread.
- 2026-07-29 — Fixed the product location and verified ledger-write boundary
  for the future implementation plan.
- 2026-07-30 — Linked the approved `engine.89` implementation plan and retained
  `engine.40`/`engine.77` as explicit sibling work.
- 2026-07-30 — Recorded the locally validated Waves A–B application and kept
  external writes and sibling engines outside the applied verdict.
- 2026-07-31 — Recorded the locally validated Wave C source application while
  retaining review, TLS/proxy deployment, and live append proof as plan gates.
