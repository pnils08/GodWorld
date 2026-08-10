# ENGINE_REPAIR Row 35 — wake-selection / identity-load trace (kimi, 2026-08-10)

Row 35 said the selection path was **NOT YET TRACED — do that FIRST, it may relocate the fix.**
Traced on main @ `d75bff7`. The prediction holds: the remaining fix is **not** in
`lib/wakePerception.js`'s gate at all. It lives in the writer-state profile path and in
snapshot ops. The gate split Row 35 asked Mike to confirm is **already implemented**.

## The selection path, end to end

1. **Origin — POPIDs are engine-attached, gate-free.** `scripts/buildWorldSummary.js`
   `extractPopids(r.TargetIds, r.CauseDetail)` (L764–792, L814) + arc-event citizens
   (L915–925) put POPIDs on desk_signal lane entries (`entry.popids`). The fanout
   assignment carries them as `story.popids`.
2. **Selection — `collectQuoteAsks` has no deviation gate** (`cron-desk-run.js:297`).
   `story.popids` fill the pool first, lane `popids` as fallback (L343–347). Only filters:
   `QUOTE_CITIZEN_CAP` and the 72h rest cap (L311, waived rather than running quoteless).
   A sub-threshold citizen is asked simply because the engine attached them to the story —
   correct under universal protagonism.
3. **Identity load — gates already disabled on every picked-citizen path.**
   `citizenVoice.js --batch` builds `buildPool({ shapedMin: 0, lifeMinChars: 0 })`
   (L225/262/283); `citizen-exchange.js` the same (L416/427). A picked citizen loads full
   identity (age from BirthYear, occ from RoleType with the S300 `Occupation`→`RoleType`
   alias at wakePerception L385–388, salience-weighted life tail) regardless of deviation.
4. **Rotation selector — the gate's proper home.** `citizen-wake.js:249` calls
   `buildPool()` with defaults (`SHAPED_MIN=60`, `LIFE_MIN_CHARS=25`, wakePerception
   L26–27, L397/400). The 705-citizen exclusion governs **unprompted wake rotation only**.

**Conclusion on the Row 35 design question:** "SHAPED_MIN should govern who gets picked
for an unprompted wake only, never whether a picked citizen loads their own record" —
that is exactly the current code. The C102 Tomas Renteria failure predates the landed
fixes (Task 2.5.3 §3 `citizenBrief`, S361 `profilesForPopids`, `shapedMin:0` batch pool).
No Mike decision needed on the gate; the row's residual is three concrete gaps below.

## Residual gaps (the real remaining work)

### R1 — Assignment-citizen profile block is still name-keyed (the S361 fix never reached it)

`citizenBrief(story.citizens)` (`cron-desk-run.js:1486–1491`, feeding the writer's
`### YOUR ASSIGNMENT` block at L368 and L1095) strips POPIDs off the citizen strings,
then round-trips **names** through `profilesFor(names)`. Directly below, the S361 lane
path (L713–724) already uses POPID-keyed `profilesForPopids` with the comment that says
why: *"a name round-trip is exactly where a typo'd feed row loses the person."*

The assignment surface — the people most likely to be quoted — never got the same
treatment. Any name mismatch (ledger double-space, `Name` col vs `First Last`, feed
typo) silently yields no profile line, reopening the invented-bio class on precisely the
highest-risk surface. `story.popids` is already in hand (used at L343).

**Fix shape:** `citizenBrief` keys by `story.popids` via `profilesForPopids`, falling
back to names only when a citizen string carries no POPID. Small, `scripts/`-only.

### R2 — Snapshot freshness guard missing in cron-desk-run

`cron-civic-run.js:388–394` has the S252/S329 pattern: read
`simulation_ledger_snapshot.meta.json`, refresh via `dumpLedger.js` when cycle-mismatched,
throw if still stale. `cron-desk-run.js` has **no equivalent** — `profilesFor` /
`profilesForPopids` read `output/simulation_ledger_snapshot.jsonl` however old it is
(`canon-name-check.js:27,57`). Row 35's S361 note: 931 rows / Aug 5 vs 940 live; the
S360 canon-drift mints (POP-01047..01055) postdate the snapshot, so those citizens have
no profile lines on any desk-writer state, name-keyed or POPID-keyed. `dumpLedger.js`
still has no cron (droplet ops, not repo).

**Fix shape:** port the civic-run freshness block (better: shared helper) into the
desk-run wakes before the first `citizenBrief` / `profilesForPopids` call; droplet-side,
decide whether `dumpLedger.js` gets a cron entry or stays wake-triggered.

### R3 — Catch swallows hide the degradation when it happens

- `cron-desk-run.js:1489` — `catch (_) { /* no snapshot -> names only */ }`
- `cron-desk-run.js:723` — `catch (_) { /* resolver unavailable — entries still render without profiles */ }`
- `canon-name-check.js:61` — missing snapshot → empty rows (fail-loud for the name gate,
  silently degrading for profiles)

When the resolver fails, the writer prompt ships names-only and nothing says so — the
C102 failure mode returns silently. **Fix shape:** log a `[profiles]` line on every wake
(resolved N/M, missing POPIDs named), and stamp `profilesResolved: N/M` into the report
packet so the Rhea gate can see a degraded wake instead of discovering it in prose.

## What Row 35 can mark done on next update

- "How a sub-threshold citizen enters the ask list" — **traced** (this doc): engine-attached
  `story.popids` → `collectQuoteAsks`, no deviation gate anywhere on the picked-citizen path.
- "Design intent to confirm with Mike" — **already satisfied in code**; selector (gated,
  citizen-wake L249) is split from loader (ungated, citizenVoice L262/283, exchange L416/427).
  No contradiction with the universal-protagonism doctrine on the voice path.
- Remaining: R1 + R2 + R3 above, all `scripts/`-side plus one droplet ops question
  (`dumpLedger` cron). Suggest the row restate its open work as R1–R3 and drop the
  gate-redesign framing.

## Caveats

- Code verified on main @ `d75bff7`. The C102 artifacts (`output/cron-compare/*packet.json`,
  `*.state.md`) are droplet-local — the 2-of-4 profile-block count is Row 35's S361
  evidence, not re-verified here.
- No live-sheet reads performed; snapshot row counts are as recorded at S361.
